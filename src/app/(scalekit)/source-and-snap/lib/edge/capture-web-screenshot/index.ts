/// <reference lib="deno.ns" />
/// <reference lib="dom" />

// Import Supabase client
import { createClient } from '@supabase/supabase-js';
// Import Puppeteer for browser automation
import puppeteer, { type HTTPRequest } from 'puppeteer';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CaptureRequest {
  web_screenshot_capture_request_id: string;
  customer_id: string;
  requested_by_user_id: string;
  requested_url: string;
  device_profile_id: string | null;
  full_page: boolean;
  include_source: boolean;
  block_tracking: boolean;
  status: string;
}

interface DeviceProfile {
  options_device_profile_id: string;
  viewport_width: number;
  viewport_height: number;
  device_pixel_ratio: number;
  user_agent: string | null;
  is_mobile: boolean;
}

interface BrowserlessScreenshotResponse {
  screenshot: string; // Base64 encoded PNG
  html?: string;
  css?: string;
  title?: string;
  finalUrl?: string;
  width?: number;
  height?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Store request ID in outer scope for error handling
  let requestId: string | undefined;

  try {
    console.log('=== CAPTURE WEB SCREENSHOT STARTED ===');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with auth context
    // This ensures RLS policies are enforced for all operations including Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Extract token and authenticate user
    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'You must be signed in to use this function',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Authenticated user:', user.id);

    // Verify auth.uid() is accessible (needed for Storage RLS)
    // The Authorization header passed to createClient should ensure auth.uid() is set
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting session:', sessionError);
    } else if (session) {
      console.log('Session verified:', {
        hasSession: true,
        userId: session.user.id,
        matchesUser: session.user.id === user.id,
      });
    } else {
      console.warn('No session found - this may cause Storage RLS issues');
    }

    // Parse request body
    const body = await req.json();
    const { web_screenshot_capture_request_id } = body;

    if (!web_screenshot_capture_request_id) {
      return new Response(
        JSON.stringify({ error: 'web_screenshot_capture_request_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing capture request:', web_screenshot_capture_request_id);

    // Store request ID for error handling
    requestId = web_screenshot_capture_request_id;

    // Fetch the capture request
    const { data: captureRequest, error: requestError } = await supabase
      .from('web_screenshot_capture_requests')
      .select('*')
      .eq('web_screenshot_capture_request_id', web_screenshot_capture_request_id)
      .maybeSingle();

    if (requestError) {
      console.error('Error fetching capture request:', requestError);
      throw new Error(`Failed to fetch capture request: ${requestError.message}`);
    }

    if (!captureRequest) {
      throw new Error('Capture request not found');
    }

    // Verify user has access to this customer (RLS check)
    // This ensures the user context is properly set for subsequent operations
    const { data: canAccess, error: accessError } = await supabase.rpc('can_access_customer', {
      target_customer_id: captureRequest.customer_id,
    });

    if (accessError) {
      console.error('Error checking customer access:', accessError);
      throw new Error(`Failed to verify customer access: ${accessError.message}`);
    }

    if (!canAccess) {
      throw new Error('You do not have permission to access this customer');
    }

    console.log('Customer access verified for:', captureRequest.customer_id);

    // Get user record to verify customer context
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('customer_id, user_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (userRecordError) {
      console.error('Error fetching user record:', userRecordError);
    } else if (userRecord) {
      console.log('User record:', {
        customer_id: userRecord.customer_id,
        user_id: userRecord.user_id,
        request_customer_id: captureRequest.customer_id,
        match: userRecord.customer_id === captureRequest.customer_id,
      });
    } else {
      console.warn('User record not found for auth_user_id:', user.id);
    }

    // Update request status to in_progress
    await supabase
      .from('web_screenshot_capture_requests')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('web_screenshot_capture_request_id', web_screenshot_capture_request_id);

    // Fetch device profile if specified
    let deviceProfile: DeviceProfile | null = null;
    if (captureRequest.device_profile_id) {
      const { data: profile, error: profileError } = await supabase
        .from('options_device_profiles')
        .select('*')
        .eq('options_device_profile_id', captureRequest.device_profile_id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching device profile:', profileError);
      } else if (profile) {
        deviceProfile = profile as DeviceProfile;
      }
    }

    // Default device profile if none specified
    const viewportWidth = deviceProfile?.viewport_width ?? 1440;
    const viewportHeight = deviceProfile?.viewport_height ?? 900;
    const devicePixelRatio = deviceProfile?.device_pixel_ratio ?? 1;
    const userAgent = deviceProfile?.user_agent ?? null;
    const isMobile = deviceProfile?.is_mobile ?? false;

    // Browserless API configuration
    // Connect to Browserless via WebSocket endpoint
    // Set BROWSERLESS_TOKEN as environment variable (BROWSERLESS_URL is optional)
    const browserlessToken =
      Deno.env.get('BROWSERLESS_TOKEN') || Deno.env.get('PUPPETEER_BROWSERLESS_IO_KEY') || '';
    const browserlessWsUrl = Deno.env.get('BROWSERLESS_WS_URL') || 'wss://chrome.browserless.io';

    if (!browserlessToken) {
      throw new Error(
        'BROWSERLESS_TOKEN or PUPPETEER_BROWSERLESS_IO_KEY environment variable is required'
      );
    }

    console.log('Taking screenshot of:', captureRequest.requested_url);
    console.log('Viewport:', `${viewportWidth}x${viewportHeight}`, 'DPR:', devicePixelRatio);

    // Connect to Browserless via WebSocket
    // Add defaultViewport: null to prevent viewport conflicts
    let browser;
    let page;
    let isIntentionallyDisconnecting = false;

    try {
      browser = await puppeteer.connect({
        browserWSEndpoint: `${browserlessWsUrl}?token=${browserlessToken}`,
        defaultViewport: null, // Use the viewport we set manually
      });

      // Check if browser is connected
      if (!browser.isConnected()) {
        throw new Error('Failed to establish browser connection');
      }

      page = await browser.newPage();

      // Set up error handlers to catch unexpected disconnection
      // Only log as error if we're not intentionally disconnecting
      browser.on('disconnected', () => {
        if (!isIntentionallyDisconnecting) {
          console.warn('Browser disconnected unexpectedly - this may be handled by retry logic');
        }
      });

      page.on('error', (error: Error) => {
        console.error('Page error:', error);
      });

      page.on('pageerror', (error: Error) => {
        console.error('Page error event:', error);
      });
    } catch (connectionError) {
      console.error('Failed to connect to browser:', connectionError);
      throw new Error(
        `Failed to connect to Browserless: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`
      );
    }

    try {
      // Set viewport
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: devicePixelRatio,
      });

      // Set user agent if specified
      if (userAgent) {
        await page.setUserAgent(userAgent);
      }

      // Block tracking if requested
      if (captureRequest.block_tracking) {
        await page.setRequestInterception(true);
        page.on('request', (request: HTTPRequest) => {
          const url = request.url();
          const resourceType = request.resourceType();
          if (
            resourceType === 'image' &&
            (url.includes('doubleclick') ||
              url.includes('google-analytics') ||
              url.includes('googletagmanager') ||
              url.includes('facebook') ||
              url.includes('analytics'))
          ) {
            request.abort();
          } else {
            request.continue();
          }
        });
      }

      // Navigate to URL with retry logic
      let response;
      let navigationAttempts = 0;
      const maxNavigationAttempts = 3;

      while (navigationAttempts < maxNavigationAttempts) {
        try {
          // Check if browser is still connected before navigation
          if (!browser.isConnected()) {
            throw new Error('Browser disconnected before navigation');
          }

          // Use networkidle2 instead of networkidle0 for better reliability
          // networkidle2 waits for no more than 2 network connections for 500ms
          // This is more lenient and less likely to timeout
          response = await page.goto(captureRequest.requested_url, {
            waitUntil: 'networkidle2',
            timeout: 60000,
          });
          break; // Success, exit retry loop
        } catch (navError) {
          navigationAttempts++;
          const errorMessage =
            navError instanceof Error ? navError.message : 'Unknown navigation error';

          if (
            errorMessage.includes('browser has disconnected') ||
            errorMessage.includes('Target closed')
          ) {
            if (navigationAttempts >= maxNavigationAttempts) {
              throw new Error(
                `Navigation failed after ${maxNavigationAttempts} attempts: ${errorMessage}`
              );
            }
            console.warn(
              `Navigation attempt ${navigationAttempts} failed, retrying...`,
              errorMessage
            );

            // Try to reconnect if browser disconnected
            try {
              await page.close();
            } catch (closeError) {
              // Ignore close errors
            }

            // Reconnect browser
            try {
              browser = await puppeteer.connect({
                browserWSEndpoint: `${browserlessWsUrl}?token=${browserlessToken}`,
                defaultViewport: null,
              });
              page = await browser.newPage();

              // Re-setup viewport and user agent
              await page.setViewport({
                width: viewportWidth,
                height: viewportHeight,
                deviceScaleFactor: devicePixelRatio,
              });

              if (userAgent) {
                await page.setUserAgent(userAgent);
              }

              // Re-setup request interception if needed
              if (captureRequest.block_tracking) {
                await page.setRequestInterception(true);
                page.on('request', (request: HTTPRequest) => {
                  const url = request.url();
                  const resourceType = request.resourceType();
                  if (
                    resourceType === 'image' &&
                    (url.includes('doubleclick') ||
                      url.includes('google-analytics') ||
                      url.includes('googletagmanager') ||
                      url.includes('facebook') ||
                      url.includes('analytics'))
                  ) {
                    request.abort();
                  } else {
                    request.continue();
                  }
                });
              }

              // Wait a bit before retrying
              await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (reconnectError) {
              throw new Error(
                `Failed to reconnect browser: ${reconnectError instanceof Error ? reconnectError.message : 'Unknown error'}`
              );
            }
          } else {
            // Other navigation errors, don't retry
            throw navError;
          }
        }
      }

      const finalUrl = page.url();
      const pageTitle = await page.title();

      // Wait a bit for any dynamic content
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Take screenshot
      const screenshot = (await page.screenshot({
        fullPage: captureRequest.full_page,
        type: 'png',
      })) as Uint8Array;

      // Extract HTML and CSS if requested
      let htmlContent: string | null = null;
      let cssContent: string | null = null;

      if (captureRequest.include_source) {
        htmlContent = await page.content();

        // Extract CSS from stylesheets
        cssContent = await page.evaluate(() => {
          const stylesheets = Array.from(document.styleSheets);
          let cssText = '';
          stylesheets.forEach((sheet) => {
            try {
              const rules = Array.from(sheet.cssRules || []);
              rules.forEach((rule) => {
                cssText += rule.cssText + '\n';
              });
            } catch (e) {
              // Cross-origin stylesheets may throw errors
            }
          });
          return cssText;
        });
      }

      // Calculate page height
      const pageHeight = captureRequest.full_page
        ? await page.evaluate(() =>
            Math.max(
              document.body.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.clientHeight,
              document.documentElement.scrollHeight,
              document.documentElement.offsetHeight
            )
          )
        : viewportHeight;

      // Convert screenshot to buffer
      const screenshotBuffer = screenshot;
      const screenshotWidth = viewportWidth * devicePixelRatio;
      const screenshotHeight = pageHeight * devicePixelRatio;

      // Generate storage path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${captureRequest.web_screenshot_capture_request_id}-${timestamp}.png`;
      const storagePath = `${captureRequest.customer_id}/${filename}`;

      // Verify auth context is properly set for Storage
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      console.log('Preparing to upload screenshot:', {
        storagePath,
        customerId: captureRequest.customer_id,
        fileSize: screenshotBuffer.byteLength,
        authenticated: !!user,
        userId: user?.id,
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        sessionMatchesUser: session?.user?.id === user?.id,
      });

      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }

      // Verify the user_id() function returns the correct value
      const { data: currentUserId, error: userIdError } = await supabase.rpc('user_id');
      console.log('Current user_id() RPC result:', {
        currentUserId,
        userIdError: userIdError?.message,
        matchesAuthUser: currentUserId === userRecord?.user_id,
      });

      // Verify we can access the bucket before uploading
      const { data: bucketInfo, error: bucketError } = await supabase.storage
        .from('screenshots')
        .list(captureRequest.customer_id, {
          limit: 1,
        });

      if (bucketError) {
        console.error('Error accessing screenshots bucket:', bucketError);
        console.error('Bucket error details:', {
          message: bucketError.message,
          name: bucketError.name,
          error: JSON.stringify(bucketError, null, 2),
        });
      } else {
        console.log('Bucket access verified, can list files in customer directory');
      }

      // Upload screenshot to Supabase Storage
      console.log('Uploading screenshot to storage path:', storagePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(storagePath, screenshotBuffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        console.error('Upload error details:', {
          message: uploadError.message,
          name: uploadError.name,
          error: JSON.stringify(uploadError, null, 2),
        });

        // Try to get more info about the user context
        const { data: sessionData } = await supabase.auth.getSession();
        console.error('Current session:', {
          hasSession: !!sessionData?.session,
          userId: sessionData?.session?.user?.id,
        });

        throw new Error(`Failed to upload screenshot: ${uploadError.message}`);
      }

      console.log('Screenshot uploaded successfully:', uploadData);

      // Store the storage path (not a public URL since bucket is private)
      // Client will generate signed URLs when needed
      const screenshotStoragePath = storagePath;

      // Calculate file sizes
      const screenshotSizeBytes = screenshotBuffer.byteLength;
      const htmlSizeBytes = htmlContent ? new TextEncoder().encode(htmlContent).length : null;
      const cssSizeBytes = cssContent ? new TextEncoder().encode(cssContent).length : null;

      // Prepare capture metadata
      const captureMeta = {
        userAgent: userAgent || 'default',
        finalUrl: finalUrl || captureRequest.requested_url,
        viewportWidth,
        viewportHeight,
        devicePixelRatio,
        isMobile,
        fullPage: captureRequest.full_page,
        blockTracking: captureRequest.block_tracking,
        capturedAt: new Date().toISOString(),
      };

      // Create capture record
      const { data: captureRecord, error: captureError } = await supabase
        .from('web_screenshot_captures')
        .insert({
          customer_id: captureRequest.customer_id,
          web_screenshot_capture_request_id: captureRequest.web_screenshot_capture_request_id,
          options_device_profile_id: captureRequest.device_profile_id,
          page_title: pageTitle,
          screenshot_storage_path: screenshotStoragePath,
          screenshot_width: screenshotWidth,
          screenshot_height: screenshotHeight,
          screenshot_size_bytes: screenshotSizeBytes,
          html_size_bytes: htmlSizeBytes,
          raw_html: htmlContent,
          raw_css: cssContent,
          css_size_bytes: cssSizeBytes,
          capture_meta: captureMeta,
          captured_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (captureError) {
        console.error('Error creating capture record:', captureError);
        throw new Error(`Failed to create capture record: ${captureError.message}`);
      }

      // Update request status to completed
      await supabase
        .from('web_screenshot_capture_requests')
        .update({
          status: 'completed',
          finished_at: new Date().toISOString(),
        })
        .eq('web_screenshot_capture_request_id', web_screenshot_capture_request_id);

      console.log('=== CAPTURE WEB SCREENSHOT COMPLETED ===');

      // Generate a signed URL for the response (valid for 1 hour)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('screenshots')
        .createSignedUrl(storagePath, 3600);

      const screenshotUrl = signedUrlData?.signedUrl || storagePath;

      return new Response(
        JSON.stringify({
          success: true,
          capture_id: captureRecord.web_screenshot_capture_id,
          screenshot_url: screenshotUrl,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } finally {
      // Clean up: close page and browser connection
      // Mark that we're intentionally disconnecting to avoid false error logs
      isIntentionallyDisconnecting = true;

      try {
        if (page && !page.isClosed()) {
          await page.close().catch((err: unknown) => console.warn('Error closing page:', err));
        }
      } catch (pageError) {
        console.warn('Error closing page:', pageError);
      }

      try {
        if (browser && browser.isConnected()) {
          browser.disconnect();
        }
      } catch (browserError) {
        console.warn('Error disconnecting browser:', browserError);
      }
    }
  } catch (error) {
    console.error('Error in capture-web-screenshot:', error);

    // Try to update request status to failed if we have the request ID
    // Note: requestId is captured in the outer scope
    try {
      if (typeof requestId !== 'undefined') {
        // Use service role key for error updates (bypasses RLS)
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (serviceRoleKey) {
          const adminSupabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);

          await adminSupabase
            .from('web_screenshot_capture_requests')
            .update({
              status: 'failed',
              finished_at: new Date().toISOString(),
              error_message:
                error instanceof Error ? error.message.substring(0, 1000) : 'Unknown error',
            })
            .eq('web_screenshot_capture_request_id', requestId);
        }
      }
    } catch (updateError) {
      console.error('Failed to update request status:', updateError);
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to capture screenshot',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
