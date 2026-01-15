import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/core/toaster';
import type { CreateCaptureRequestPayload } from '@/app/(scalekit)/source-and-snap/lib/types';

export interface ScanVisualStyleGuideOptions {
  url: string;
  name: string;
  customerId: string;
  visualStyleGuideId?: string; // If provided, will update existing guide instead of creating new one
  onProgress?: (progress: number) => void;
  openCaptureViewer?: boolean; // Whether to open capture viewer in new window (default: true)
}

export interface ScanVisualStyleGuideResult {
  visualStyleGuideId: string;
  captureId: string;
  success: boolean;
  errors: string[];
}

/**
 * Reusable function to scan a website and create/update a visual style guide
 * This function handles:
 * 1. Creating/updating visual style guide
 * 2. Creating capture request
 * 3. Capturing screenshot
 * 4. Extracting colors, fonts, and logos
 */
export async function scanVisualStyleGuide(
  options: ScanVisualStyleGuideOptions,
  createCaptureRequestFn: (
    payload: CreateCaptureRequestPayload
  ) => Promise<{ web_screenshot_capture_request_id: string }>
): Promise<ScanVisualStyleGuideResult> {
  const {
    url,
    name,
    customerId,
    visualStyleGuideId,
    onProgress,
    openCaptureViewer = true,
  } = options;
  const errors: string[] = [];

  const supabase = createClient();
  console.log('=== SCAN & CREATE STARTED ===');
  console.log('URL:', url);
  console.log('Name:', name);
  console.log('Customer ID:', customerId);
  console.log('Visual Style Guide ID:', visualStyleGuideId || 'NEW');

  onProgress?.(0);

  try {
    let finalVisualStyleGuideId: string;

    if (visualStyleGuideId) {
      // Update existing guide
      console.log('Updating existing visual style guide...');
      const { data: existingGuide, error: fetchError } = await supabase
        .from('visual_style_guides')
        .select('visual_style_guide_id, customer_id')
        .eq('visual_style_guide_id', visualStyleGuideId)
        .single();

      if (fetchError || !existingGuide) {
        throw new Error(
          'Visual style guide not found: ' + (fetchError?.message || 'Unknown error')
        );
      }

      // Verify customer matches
      if (existingGuide.customer_id !== customerId) {
        throw new Error('Visual style guide customer does not match');
      }

      const { error: updateError } = await supabase
        .from('visual_style_guides')
        .update({
          name: name.trim(),
          description: `Visual style guide for ${name.trim()}`,
        })
        .eq('visual_style_guide_id', visualStyleGuideId);

      if (updateError) {
        throw new Error('Failed to update visual style guide: ' + updateError.message);
      }

      finalVisualStyleGuideId = visualStyleGuideId;
      console.log('✓ Updated visual style guide:', finalVisualStyleGuideId);
    } else {
      // Create new guide
      console.log('Step 1: Creating empty visual style guide...');
      const { data: guideData, error: guideError } = await supabase
        .from('visual_style_guides')
        .insert({
          customer_id: customerId,
          name: name.trim(),
          description: `Visual style guide for ${name.trim()}`,
          imagery_guidelines: 'Analyzing website for imagery guidelines...',
        })
        .select('visual_style_guide_id')
        .single();

      if (guideError || !guideData) {
        throw new Error(
          'Failed to create visual style guide: ' + (guideError?.message || 'Unknown error')
        );
      }

      finalVisualStyleGuideId = guideData.visual_style_guide_id;
      console.log('✓ Created visual style guide:', finalVisualStyleGuideId);
    }

    onProgress?.(10);

    // Step 2: Create capture request in web_screenshot_capture_requests table
    console.log('Step 2: Creating capture request...');
    const captureRequest = await createCaptureRequestFn({
      requested_url: url,
      device_profile_id: null,
      full_page: true,
      include_source: true,
      block_tracking: true,
    });

    if (!captureRequest || !captureRequest.web_screenshot_capture_request_id) {
      throw new Error('Failed to create capture request');
    }

    console.log('✓ Capture request created:', captureRequest.web_screenshot_capture_request_id);
    onProgress?.(20);

    // Step 3: Call capture-web-screenshot edge function
    console.log('Step 3: Invoking capture-web-screenshot edge function...');
    const { data: functionData, error: functionError } = await supabase.functions.invoke(
      'capture-web-screenshot',
      {
        body: {
          web_screenshot_capture_request_id: captureRequest.web_screenshot_capture_request_id,
        },
      }
    );

    if (functionError) {
      console.error('Edge function error:', functionError);
      throw new Error(functionError.message || 'Failed to capture screenshot');
    }

    if (!functionData?.success || !functionData.capture_id) {
      throw new Error(functionData?.message || 'Failed to capture screenshot');
    }

    const captureId = functionData.capture_id;
    console.log('✓ Screenshot captured successfully!');
    console.log('Capture ID:', captureId);
    onProgress?.(50);

    // Step 4: Open a new window with the capture viewer (if requested)
    if (openCaptureViewer) {
      console.log('Step 4: Opening capture viewer in new window...');
      const captureViewerUrl = `/source-and-snap/captures/${captureId}`;
      window.open(captureViewerUrl, '_blank');
    }
    onProgress?.(60);

    // Step 5: Call extract-colors function with the capture ID
    console.log('Step 5: Calling extract-colors function...');
    const colorsResult = await Promise.allSettled([
      supabase.functions.invoke('extract-colors', {
        body: {
          web_screenshot_capture_id: captureId,
          visual_style_guide_id: finalVisualStyleGuideId,
        },
      }),
    ]);

    if (colorsResult[0].status === 'rejected' || colorsResult[0].value?.error) {
      const error =
        colorsResult[0].status === 'rejected'
          ? colorsResult[0].reason
          : colorsResult[0].value.error;
      console.error('Colors extraction error:', error);
      errors.push(
        `Colors extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } else {
      console.log('✓ Colors extracted successfully');
    }
    onProgress?.(80);

    // Step 6: Call extract-fonts and extract-logos
    console.log('Step 6: Calling extract-fonts and extract-logos...');
    const [fontsResult, logosResult] = await Promise.allSettled([
      supabase.functions.invoke('extract-fonts', {
        body: {
          web_screenshot_capture_id: captureId,
          visual_style_guide_id: finalVisualStyleGuideId,
        },
      }),
      supabase.functions.invoke('extract-logos', {
        body: {
          visual_style_guide_id: finalVisualStyleGuideId,
          starting_url: url, // Still using URL for logos until extract-logos is updated
        },
      }),
    ]);

    if (fontsResult.status === 'rejected' || fontsResult.value?.error) {
      const error =
        fontsResult.status === 'rejected' ? fontsResult.reason : fontsResult.value.error;
      errors.push(
        `Fonts extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Fonts extraction error:', error);
    } else {
      console.log('✓ Fonts extracted successfully');
    }

    if (logosResult.status === 'rejected' || logosResult.value?.error) {
      const error =
        logosResult.status === 'rejected' ? logosResult.reason : logosResult.value.error;
      errors.push(
        `Logos extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Logos extraction error:', error);
    } else {
      console.log('✓ Logos extracted successfully');
    }

    onProgress?.(100);

    console.log('=== SCAN & CREATE COMPLETED ===');

    return {
      visualStyleGuideId: finalVisualStyleGuideId,
      captureId,
      success: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('=== SCAN & CREATE ERROR ===');
    console.error('Error details:', error);
    throw error;
  }
}
