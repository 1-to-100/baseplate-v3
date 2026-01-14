import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors } from '../_shared/cors.ts'
import { ApiError, createErrorResponse, createSuccessResponse } from '../_shared/errors.ts'
import { createServiceClient } from '../_shared/supabase.ts'

// Purpose: Solves the CORS issue when saving AI-generated logos.
// Problem it solves: When DALL-E generates logos, it returns temporary URLs. Browsers can't download these URLs directly due to CORS restrictions.
// How it works:
// Receives request with visual_style_guide_id, logo_url (DALL-E URL), and optional logo_type_option_id
// Downloads the image server-side (lines 79-89) - bypasses CORS since it runs on Supabase edge
// Uploads to Supabase Storage (lines 95-107) at path: {guideId}/{logoTypeId}/{timestamp}-generated-logo.png
// Creates a signed URL for display (lines 109-119)
// Creates or updates the logo asset in the database (lines 121-192)
// Returns the storage_path, signed_url, and logo_asset_id

interface SaveGeneratedLogoRequest {
  visual_style_guide_id: string
  logo_url: string
  logo_type_option_id?: string
}

interface SaveGeneratedLogoResponse {
  storage_path: string
  signed_url: string
  logo_asset_id: string
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    console.log('=== SAVE GENERATED LOGO STARTED ===')

    // Parse request body
    const body: SaveGeneratedLogoRequest = await req.json()
    const { visual_style_guide_id, logo_url, logo_type_option_id } = body

    if (!visual_style_guide_id || !logo_url) {
      throw new ApiError('Both visual_style_guide_id and logo_url are required', 400)
    }

    console.log('Visual Style Guide ID:', visual_style_guide_id)
    console.log('Logo URL length:', logo_url.length)

    const supabase = createServiceClient()

    // Verify visual style guide exists and get customer_id
    const { data: visualGuide, error: guideError } = await supabase
      .from('visual_style_guides')
      .select('visual_style_guide_id, customer_id')
      .eq('visual_style_guide_id', visual_style_guide_id)
      .maybeSingle()

    if (guideError || !visualGuide) {
      throw new ApiError('Visual style guide not found', 404)
    }

    const customerId = visualGuide.customer_id
    console.log('Customer ID:', customerId)

    // Note: JWT verification disabled - no user access check
    // In production, you should enable JWT verification and check user.customer_id === customerId

    // Determine logo type option ID
    let finalLogoTypeOptionId = logo_type_option_id

    if (!finalLogoTypeOptionId) {
      // Find primary logo type or first available
      const { data: logoTypes, error: logoTypesError } = await supabase
        .from('logo_type_options')
        .select('logo_type_option_id, programmatic_name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (logoTypesError || !logoTypes?.length) {
        throw new ApiError('No logo types available', 500)
      }

      // Try to find primary, otherwise use first
      const primaryType = logoTypes.find(t => 
        t.programmatic_name?.toLowerCase().includes('primary')
      )
      finalLogoTypeOptionId = primaryType?.logo_type_option_id || logoTypes[0].logo_type_option_id
    }

    console.log('Logo Type Option ID:', finalLogoTypeOptionId)

    // Download the image from the DALL-E URL (server-side, no CORS issues)
    console.log('Downloading image from DALL-E URL...')
    const imageResponse = await fetch(logo_url)

    if (!imageResponse.ok) {
      throw new ApiError(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`, 500)
    }

    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()
    console.log('Image downloaded, size:', imageBuffer.byteLength)

    // Generate storage path
    const timestamp = Date.now()
    const storagePath = `${visual_style_guide_id}/${finalLogoTypeOptionId}/${timestamp}-generated-logo.png`

    // Upload to Supabase storage
    console.log('Uploading to storage:', storagePath)
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new ApiError(`Failed to upload to storage: ${uploadError.message}`, 500)
    }

    // Get signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('logos')
      .createSignedUrl(storagePath, 6 * 60 * 60) // 6 hours

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new ApiError('Failed to create signed URL', 500)
    }

    const signedUrl = signedUrlData.signedUrl
    console.log('Signed URL created')

    // Check if a logo already exists for this type
    const { data: existingLogo } = await supabase
      .from('logo_assets')
      .select('logo_asset_id, storage_path')
      .eq('visual_style_guide_id', visual_style_guide_id)
      .eq('logo_type_option_id', finalLogoTypeOptionId)
      .maybeSingle()

    let logoAssetId: string

    if (existingLogo) {
      console.log('Updating existing logo asset:', existingLogo.logo_asset_id)

      // Delete old file from storage if it exists
      if (existingLogo.storage_path && existingLogo.storage_path !== storagePath) {
        const cleanOldPath = existingLogo.storage_path.trim().startsWith('/')
          ? existingLogo.storage_path.trim().slice(1)
          : existingLogo.storage_path.trim()

        if (cleanOldPath) {
          await supabase.storage.from('logos').remove([cleanOldPath])
        }
      }

      // Update existing logo
      const { error: updateError } = await supabase
        .from('logo_assets')
        .update({
          is_vector: false,
          svg_text: null,
          file_blob: null,
          storage_path: storagePath,
          file_url: signedUrl,
        })
        .eq('logo_asset_id', existingLogo.logo_asset_id)

      if (updateError) {
        throw new ApiError(`Failed to update logo asset: ${updateError.message}`, 500)
      }

      logoAssetId = existingLogo.logo_asset_id
    } else {
      console.log('Creating new logo asset')

      // Create new logo
      const { data: newLogo, error: createError } = await supabase
        .from('logo_assets')
        .insert({
          visual_style_guide_id,
          customer_id: customerId,
          logo_type_option_id: finalLogoTypeOptionId,
          is_default: false,
          is_vector: false,
          is_circular_crop: false,
          circular_safe_area: null,
          width: null,
          height: null,
          svg_text: null,
          file_blob: null,
          storage_path: storagePath,
          file_url: signedUrl,
          created_by_user_id: null,
        })
        .select('logo_asset_id')
        .single()

      if (createError || !newLogo) {
        throw new ApiError(`Failed to create logo asset: ${createError?.message}`, 500)
      }

      logoAssetId = newLogo.logo_asset_id
    }

    console.log('Logo asset ID:', logoAssetId)
    console.log('=== SAVE GENERATED LOGO COMPLETE ===')

    const response: SaveGeneratedLogoResponse = {
      storage_path: storagePath,
      signed_url: signedUrl,
      logo_asset_id: logoAssetId,
    }

    return createSuccessResponse(response)

  } catch (error) {
    console.error('Error in save-generated-logo:', error)
    return createErrorResponse(error)
  }
})
