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
  logo_type_option_ids?: string[]  // Array of logo type IDs to save to (if not provided, saves to all active types)
  all_logo_urls?: string[]  // All generated logos to store as presets
}

interface PresetLogo {
  id: string
  url: string
  storage_path: string
}

interface SaveGeneratedLogoResponse {
  storage_path: string
  signed_url: string
  logo_asset_id: string
  preset_logos?: PresetLogo[]  // All stored preset logos with signed URLs
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    console.log('=== SAVE GENERATED LOGO STARTED ===')

    // Parse request body
    const body: SaveGeneratedLogoRequest = await req.json()
    const { visual_style_guide_id, logo_url, logo_type_option_id, logo_type_option_ids, all_logo_urls } = body

    if (!visual_style_guide_id || !logo_url) {
      throw new ApiError('Both visual_style_guide_id and logo_url are required', 400)
    }

    console.log('Visual Style Guide ID:', visual_style_guide_id)
    console.log('Logo URL length:', logo_url.length)
    console.log('All logo URLs count:', all_logo_urls?.length || 0)

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

    // Fetch ALL active logo type options to set the logo for all of them
    const { data: logoTypes, error: logoTypesError } = await supabase
      .from('logo_type_options')
      .select('logo_type_option_id, programmatic_name, display_name')
      .eq('is_active', true)

    if (logoTypesError) {
      console.error('Error fetching logo types:', logoTypesError)
      throw new ApiError(`Failed to fetch logo types: ${logoTypesError.message}`, 500)
    }

    if (!logoTypes?.length) {
      throw new ApiError('No active logo types found in database', 500)
    }

    // Filter logo types if specific IDs are provided
    const filteredLogoTypes = logo_type_option_ids && logo_type_option_ids.length > 0
      ? logoTypes.filter(lt => logo_type_option_ids.includes(lt.logo_type_option_id))
      : logoTypes

    if (!filteredLogoTypes?.length) {
      throw new ApiError('No matching logo types found for provided IDs', 400)
    }

    console.log(`Found ${filteredLogoTypes.length} logo types to update (filtered from ${logoTypes.length} total)`)

    // Download the image from the URL (DALL-E or Supabase signed URL)
    console.log('Downloading image from URL...')
    console.log('URL preview:', logo_url.substring(0, 100) + '...')
    
    let imageBuffer: ArrayBuffer
    try {
      const imageResponse = await fetch(logo_url)

      if (!imageResponse.ok) {
        console.error('Image download failed:', imageResponse.status, imageResponse.statusText)
        throw new ApiError(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`, 500)
      }

      const imageBlob = await imageResponse.blob()
      imageBuffer = await imageBlob.arrayBuffer()
      console.log('Image downloaded, size:', imageBuffer.byteLength)
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      throw new ApiError(`Failed to fetch image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`, 500)
    }
    
    if (!imageBuffer || imageBuffer.byteLength === 0) {
      throw new ApiError('Downloaded image is empty', 500)
    }

    const timestamp = Date.now()
    const logoAssetIds: string[] = []

    // Upload image ONCE to a shared location (not per logo type)
    const sharedStoragePath = `${visual_style_guide_id}/shared/${timestamp}-generated-logo.png`
    
    console.log('Uploading to shared storage path:', sharedStoragePath)
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(sharedStoragePath, imageBuffer, {
          contentType: 'image/png',
          upsert: true,
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new ApiError(`Failed to upload image: ${uploadError.message}`, 500)
      }
    } catch (storageError) {
      console.error('Storage error:', storageError)
      if (storageError instanceof ApiError) throw storageError
      throw new ApiError(`Storage upload failed: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`, 500)
    }
    
    console.log('Image uploaded successfully')

    // Get signed URL for the shared image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('logos')
      .createSignedUrl(sharedStoragePath, 6 * 60 * 60) // 6 hours

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new ApiError('Failed to create signed URL', 500)
    }

    const sharedSignedUrl = signedUrlData.signedUrl
    console.log('Signed URL created for shared image')

    // Collect old storage paths to delete (only unique paths that are different from the new shared path)
    const oldPathsToDelete: string[] = []

    // Create/update logo_assets for filtered logo types, all pointing to the SAME shared file
    for (const logoType of filteredLogoTypes) {
      const logoTypeOptionId = logoType.logo_type_option_id
      console.log(`Processing logo type: ${logoType.display_name || logoType.programmatic_name} (${logoTypeOptionId})`)

      try {
        // Check if a logo already exists for this type
        const { data: existingLogo, error: queryError } = await supabase
          .from('logo_assets')
          .select('logo_asset_id, storage_path')
          .eq('visual_style_guide_id', visual_style_guide_id)
          .eq('logo_type_option_id', logoTypeOptionId)
          .maybeSingle()

        if (queryError) {
          console.error(`Error querying existing logo for ${logoTypeOptionId}:`, queryError)
          continue
        }

        if (existingLogo) {
          // Collect old file path for deletion (if different from new shared path)
          if (existingLogo.storage_path && existingLogo.storage_path !== sharedStoragePath) {
            const cleanOldPath = existingLogo.storage_path.trim().startsWith('/')
              ? existingLogo.storage_path.trim().slice(1)
              : existingLogo.storage_path.trim()

            if (cleanOldPath && !oldPathsToDelete.includes(cleanOldPath)) {
              oldPathsToDelete.push(cleanOldPath)
            }
          }

          // Update existing logo to point to shared file
          const { error: updateError } = await supabase
            .from('logo_assets')
            .update({
              is_vector: false,
              svg_text: null,
              file_blob: null,
              storage_path: sharedStoragePath,
              file_url: sharedSignedUrl,
            })
            .eq('logo_asset_id', existingLogo.logo_asset_id)

          if (updateError) {
            console.error(`Error updating logo asset ${existingLogo.logo_asset_id}:`, updateError)
          } else {
            logoAssetIds.push(existingLogo.logo_asset_id)
            console.log(`Updated logo asset: ${existingLogo.logo_asset_id}`)
          }
        } else {
          // Create new logo pointing to shared file
          const { data: newLogo, error: createError } = await supabase
            .from('logo_assets')
            .insert({
              visual_style_guide_id,
              customer_id: customerId,
              logo_type_option_id: logoTypeOptionId,
              is_default: false,
              is_vector: false,
              is_circular_crop: false,
              circular_safe_area: null,
              width: null,
              height: null,
              svg_text: null,
              file_blob: null,
              storage_path: sharedStoragePath,
              file_url: sharedSignedUrl,
              created_by_user_id: null,
            })
            .select('logo_asset_id')
            .single()

          if (createError) {
            console.error(`Error creating logo asset for ${logoTypeOptionId}:`, createError)
          } else if (newLogo) {
            logoAssetIds.push(newLogo.logo_asset_id)
            console.log(`Created logo asset: ${newLogo.logo_asset_id}`)
          }
        }
      } catch (err) {
        console.error(`Error processing logo type ${logoTypeOptionId}:`, err)
        continue
      }
    }

    // Delete old files from storage (batch delete)
    if (oldPathsToDelete.length > 0) {
      console.log('Deleting old logo files:', oldPathsToDelete.length)
      await supabase.storage.from('logos').remove(oldPathsToDelete)
    }

    console.log(`Created/updated ${logoAssetIds.length} logo assets (all pointing to same shared file)`)

    // Store all preset logos if provided
    let presetLogos: PresetLogo[] = []
    
    if (all_logo_urls && all_logo_urls.length > 0) {
      console.log('Storing all preset logos...')
      
      // First, delete any existing presets for this guide
      const presetsPrefix = `${visual_style_guide_id}/presets/`
      const { data: existingPresets } = await supabase.storage
        .from('logos')
        .list(`${visual_style_guide_id}/presets`)
      
      if (existingPresets && existingPresets.length > 0) {
        const pathsToDelete = existingPresets.map(f => `${presetsPrefix}${f.name}`)
        await supabase.storage.from('logos').remove(pathsToDelete)
        console.log('Deleted existing presets:', pathsToDelete.length)
      }

      // Upload all preset logos in parallel
      const uploadPromises = all_logo_urls.map(async (url, index) => {
        try {
          // Download the image
          const imgResponse = await fetch(url)
          if (!imgResponse.ok) {
            console.error(`Failed to download preset ${index}:`, imgResponse.status)
            return null
          }
          
          const imgBlob = await imgResponse.blob()
          const imgBuffer = await imgBlob.arrayBuffer()
          
          // Generate preset storage path
          const presetPath = `${visual_style_guide_id}/presets/${timestamp}-preset-${index}.png`
          
          // Upload to storage
          const { error: presetUploadError } = await supabase.storage
            .from('logos')
            .upload(presetPath, imgBuffer, {
              contentType: 'image/png',
              upsert: true,
            })
          
          if (presetUploadError) {
            console.error(`Failed to upload preset ${index}:`, presetUploadError)
            return null
          }
          
          // Get signed URL
          const { data: presetSignedData } = await supabase.storage
            .from('logos')
            .createSignedUrl(presetPath, 6 * 60 * 60)
          
          if (!presetSignedData?.signedUrl) {
            return null
          }
          
          return {
            id: `preset-${index}`,
            url: presetSignedData.signedUrl,
            storage_path: presetPath,
          }
        } catch (err) {
          console.error(`Error processing preset ${index}:`, err)
          return null
        }
      })
      
      const results = await Promise.all(uploadPromises)
      presetLogos = results.filter((r): r is PresetLogo => r !== null)
      console.log('Stored preset logos:', presetLogos.length)
    }

    console.log('=== SAVE GENERATED LOGO COMPLETE ===')

    const response: SaveGeneratedLogoResponse = {
      storage_path: sharedStoragePath,
      signed_url: sharedSignedUrl,
      logo_asset_id: logoAssetIds[0] || '',
      preset_logos: presetLogos.length > 0 ? presetLogos : undefined,
    }

    return createSuccessResponse(response)

  } catch (error) {
    console.error('Error in save-generated-logo:', error)
    return createErrorResponse(error)
  }
})
