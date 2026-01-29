-- =============================================================================
-- SOURCE & SNAP FEATURE - CREATE SCHEMA
-- =============================================================================
-- This file creates all tables, constraints, indexes, triggers, and 
-- default values required for the Source & Snap feature.
-- 
-- This file does NOT include Row Level Security (RLS) policies.
-- See source-and-snap-rls-policies.sql for RLS setup.
-- =============================================================================
-- Includes:
-- - Device Profile Options (System-scoped)
-- - Web Screenshot Capture Requests (Customer-scoped)
-- - Web Screenshot Captures (Customer-scoped)
-- =============================================================================

-- =============================================================================
-- SECTION 1: OPTION TABLES (System Scope)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- options_device_profiles: System-wide device profiles for standardized captures
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.options_device_profiles (
  options_device_profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programmatic_name text NOT NULL,
  display_name text NOT NULL,
  viewport_width integer NOT NULL DEFAULT 1440,
  viewport_height integer NOT NULL DEFAULT 900,
  device_pixel_ratio numeric NOT NULL DEFAULT 1,
  user_agent text,
  is_mobile boolean NOT NULL DEFAULT false,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT options_device_profiles_programmatic_name_uk UNIQUE (programmatic_name),
  CONSTRAINT options_device_profiles_viewport_width_ck CHECK (viewport_width > 0),
  CONSTRAINT options_device_profiles_viewport_height_ck CHECK (viewport_height > 0),
  CONSTRAINT options_device_profiles_device_pixel_ratio_ck CHECK (device_pixel_ratio > 0),
  CONSTRAINT options_device_profiles_display_name_ck CHECK (char_length(display_name) > 0)
);

COMMENT ON TABLE public.options_device_profiles IS 
  'System-wide device profiles used to standardize capture viewports and rendering behavior (e.g., Desktop 1440x900, Mobile 390x844). Administrators can add or update profiles to ensure consistent benchmarking across captures.';

COMMENT ON COLUMN public.options_device_profiles.options_device_profile_id IS 
  'Primary key for the device profile option. Referenced by requests and captures; system-scoped.';

COMMENT ON COLUMN public.options_device_profiles.programmatic_name IS 
  'Stable internal name for the profile (e.g., desktop_1440_900). Used by integrations and API clients to reference a profile deterministically.';

COMMENT ON COLUMN public.options_device_profiles.display_name IS 
  'Human-friendly display name for the profile (e.g., Desktop 1440x900). Shown in the UI device selector.';

COMMENT ON COLUMN public.options_device_profiles.viewport_width IS 
  'Viewport width in pixels used by the renderer. Used to configure Playwright/Browserless viewport.';

COMMENT ON COLUMN public.options_device_profiles.viewport_height IS 
  'Height used for viewport captures; full-page may ignore this for final height.';

COMMENT ON COLUMN public.options_device_profiles.device_pixel_ratio IS 
  'Device pixel ratio (DPR) to simulate for high-DPI screens. Controls scaling and screenshot resolution.';

COMMENT ON COLUMN public.options_device_profiles.user_agent IS 
  'Optional custom user agent string to use for the capture. If null, system default user-agent will be used.';

COMMENT ON COLUMN public.options_device_profiles.is_mobile IS 
  'Indicates whether the profile should emulate a mobile device (touch, mobile viewport defaults). Helps the UI categorize profiles.';

COMMENT ON COLUMN public.options_device_profiles.description IS 
  'Optional longer description explaining intent for the profile (best use cases). Editable by system administrators only.';

COMMENT ON COLUMN public.options_device_profiles.sort_order IS 
  'Numeric ordering for UI lists of device profiles. Lower numbers appear first.';

COMMENT ON COLUMN public.options_device_profiles.is_active IS 
  'Whether this profile is currently active and selectable by users. Administrators can deactivate outdated profiles.';

-- =============================================================================
-- SECTION 2: PRIMARY TABLES (Customer Scope)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- web_screenshot_capture_requests: Queued and historical capture requests
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.web_screenshot_capture_requests (
  web_screenshot_capture_request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  requested_by_user_id uuid NOT NULL,
  requested_url text NOT NULL,
  device_profile_id uuid,
  full_page boolean NOT NULL DEFAULT false,
  include_source boolean NOT NULL DEFAULT false,
  block_tracking boolean NOT NULL DEFAULT false,
  status character varying NOT NULL DEFAULT 'queued',
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT web_screenshot_capture_requests_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT web_screenshot_capture_requests_requested_by_user_id_fkey
    FOREIGN KEY (requested_by_user_id) REFERENCES public.users(user_id)
    ON DELETE RESTRICT,

  CONSTRAINT web_screenshot_capture_requests_device_profile_id_fkey
    FOREIGN KEY (device_profile_id) REFERENCES public.options_device_profiles(options_device_profile_id)
    ON DELETE SET NULL,

  CONSTRAINT web_screenshot_capture_requests_requested_url_ck
    CHECK (char_length(requested_url) > 0),

  CONSTRAINT web_screenshot_capture_requests_status_ck
    CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'canceled'))
);

COMMENT ON TABLE public.web_screenshot_capture_requests IS 
  'Stores queued and historical requests to capture screenshots and optional source assets for public web pages. Each row represents a user-initiated capture job with requested options, status, timestamps, and any error information returned by the processing pipeline.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.web_screenshot_capture_request_id IS 
  'Primary key for the capture request record. Generated using PostgreSQL gen_random_uuid(); used to link to resulting capture artifact.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.customer_id IS 
  'Foreign key referencing the customer (workspace) that owns this capture request. Determines where resulting artifacts are stored/visible.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.requested_by_user_id IS 
  'Foreign key referencing the user who initiated the capture request. Used for permissions and activity feeds.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.requested_url IS 
  'The public URL submitted for capture. Must be validated before enqueue. Should be normalized/validated by edge function prior to insert when possible.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.device_profile_id IS 
  'Reference to the chosen device profile controlling viewport, user agent, and scaling. If null, a system default profile is used.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.full_page IS 
  'If true, request a full-page screenshot (scroll-and-stitch or full-page capture); otherwise capture viewport only. Controls Browserless fullPage argument.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.include_source IS 
  'If true, the capture process should also save HTML and extracted CSS assets alongside the screenshot. May increase job time and storage usage.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.block_tracking IS 
  'If true, instruct the renderer to block common tracking scripts and third-party requests for a cleaner render. Implemented by Browserless request interception rules.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.status IS 
  'Current state of the job: queued, in_progress, completed, failed, canceled. Used by UI to display job progress; consider indexing for queries.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.queued_at IS 
  'Timestamp when the request was accepted and queued by the system. Set by edge function on insert.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.started_at IS 
  'Timestamp when the worker (Browserless) began processing the job. Populated by job orchestration when execution begins.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.finished_at IS 
  'Timestamp when the job finished (success or failure). Used to compute durations and SLA metrics.';

COMMENT ON COLUMN public.web_screenshot_capture_requests.error_message IS 
  'Human-readable error details captured when a job fails. Truncate or summarize long third-party errors; may include structured JSON if needed.';

-- -----------------------------------------------------------------------------
-- web_screenshot_captures: Processed capture artifacts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.web_screenshot_captures (
  web_screenshot_capture_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  options_device_profile_id uuid,
  page_title text,
  screenshot_storage_path text NOT NULL,
  screenshot_width integer,
  screenshot_height integer,
  screenshot_size_bytes bigint,
  html_size_bytes integer,
  raw_html text,
  raw_css text,
  css_size_bytes integer,
  capture_meta jsonb DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  web_screenshot_capture_request_id uuid NOT NULL,

  CONSTRAINT web_screenshot_captures_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customers(customer_id)
    ON DELETE CASCADE,

  CONSTRAINT web_screenshot_captures_options_device_profile_id_fkey
    FOREIGN KEY (options_device_profile_id) REFERENCES public.options_device_profiles(options_device_profile_id)
    ON DELETE SET NULL,

  CONSTRAINT web_screenshot_captures_web_screenshot_capture_request_id_fkey
    FOREIGN KEY (web_screenshot_capture_request_id) REFERENCES public.web_screenshot_capture_requests(web_screenshot_capture_request_id)
    ON DELETE CASCADE,

  CONSTRAINT web_screenshot_captures_screenshot_width_ck CHECK (screenshot_width >= 0),
  CONSTRAINT web_screenshot_captures_screenshot_height_ck CHECK (screenshot_height >= 0),
  CONSTRAINT web_screenshot_captures_screenshot_size_bytes_ck CHECK (screenshot_size_bytes >= 0),
  CONSTRAINT web_screenshot_captures_html_size_bytes_ck CHECK (html_size_bytes >= 0),
  CONSTRAINT web_screenshot_captures_css_size_bytes_ck CHECK (css_size_bytes >= 0)
);

COMMENT ON TABLE public.web_screenshot_captures IS 
  'Holds the processed capture artifacts produced when a capture request completes successfully: screenshot storage location, captured page metadata, optional raw HTML/CSS, sizes, and capture timestamp. Each record links back to the originating request and the owning customer.';

COMMENT ON COLUMN public.web_screenshot_captures.web_screenshot_capture_id IS 
  'Primary key for the capture artifact record. Used to reference artifacts from viewers and exports.';

COMMENT ON COLUMN public.web_screenshot_captures.customer_id IS 
  'Customer (workspace) that owns this artifact; duplicates value from request to simplify queries. Denormalized for query performance.';

COMMENT ON COLUMN public.web_screenshot_captures.options_device_profile_id IS 
  'The device profile used for this capture (snapshot of options_device_profiles at capture time). Stored to record exact settings used even if profile later changes.';

COMMENT ON COLUMN public.web_screenshot_captures.page_title IS 
  'The HTML document title captured from the page at render time. Used for display in Capture Viewer and lists.';

COMMENT ON COLUMN public.web_screenshot_captures.screenshot_storage_path IS 
  'Path/URL to the stored high-quality PNG screenshot in S3 Storage. Used by UI to load zoomable image. Prefer signed URLs generated at access time for security.';

COMMENT ON COLUMN public.web_screenshot_captures.screenshot_width IS 
  'Width in pixels of the captured screenshot image. Populated by processing job for viewer scaling calculations.';

COMMENT ON COLUMN public.web_screenshot_captures.screenshot_height IS 
  'Height in pixels of the captured screenshot image. Full-page captures may have very large heights.';

COMMENT ON COLUMN public.web_screenshot_captures.screenshot_size_bytes IS 
  'File size in bytes of the screenshot PNG. Useful for storage and export metrics.';

COMMENT ON COLUMN public.web_screenshot_captures.html_size_bytes IS 
  'Size in bytes of the stored HTML file. Helps estimate storage consumption.';

COMMENT ON COLUMN public.web_screenshot_captures.raw_html IS 
  'The raw HTML captured and stored if include_source was true. May be null when include_source=false or when capture failed to collect HTML.';

COMMENT ON COLUMN public.web_screenshot_captures.raw_css IS 
  'Raw CSS captured from the page (concatenated) if include_source was true. May contain pointers to multiple files in JSON exports but stored as a single pointer here.';

COMMENT ON COLUMN public.web_screenshot_captures.css_size_bytes IS 
  'Size in bytes of the stored CSS file(s). Null when no CSS captured.';

COMMENT ON COLUMN public.web_screenshot_captures.capture_meta IS 
  'Structured metadata produced during capture: user-agent, final URL after redirects, HTTP status, response headers summary, and optional extracted tokens (e.g., primary colors, font families). Used to store extensible attributes without altering schema; small extracts of design tokens may be stored here.';

COMMENT ON COLUMN public.web_screenshot_captures.captured_at IS 
  'Timestamp when the page was rendered and assets were collected. For ordering captures in UI and history.';

COMMENT ON COLUMN public.web_screenshot_captures.web_screenshot_capture_request_id IS 
  'Foreign key linking back to the originating capture request. Keeps the historical relationship; ON DELETE behavior can be chosen by product needs.';

-- =============================================================================
-- SECTION 3: INDEXES FOR PERFORMANCE
-- =============================================================================

-- Device profile indexes
CREATE INDEX IF NOT EXISTS options_device_profiles_programmatic_name_idx
  ON public.options_device_profiles (programmatic_name);

CREATE INDEX IF NOT EXISTS options_device_profiles_is_active_idx
  ON public.options_device_profiles (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS options_device_profiles_sort_order_idx
  ON public.options_device_profiles (sort_order);

CREATE INDEX IF NOT EXISTS options_device_profiles_is_mobile_idx
  ON public.options_device_profiles (is_mobile);

-- Capture request indexes
CREATE INDEX IF NOT EXISTS web_screenshot_capture_requests_customer_id_idx
  ON public.web_screenshot_capture_requests (customer_id);

CREATE INDEX IF NOT EXISTS web_screenshot_capture_requests_requested_by_user_id_idx
  ON public.web_screenshot_capture_requests (requested_by_user_id);

CREATE INDEX IF NOT EXISTS web_screenshot_capture_requests_device_profile_id_idx
  ON public.web_screenshot_capture_requests (device_profile_id);

CREATE INDEX IF NOT EXISTS web_screenshot_capture_requests_status_idx
  ON public.web_screenshot_capture_requests (status);

CREATE INDEX IF NOT EXISTS web_screenshot_capture_requests_queued_at_idx
  ON public.web_screenshot_capture_requests (queued_at DESC);

CREATE INDEX IF NOT EXISTS web_screenshot_capture_requests_finished_at_idx
  ON public.web_screenshot_capture_requests (finished_at DESC) WHERE finished_at IS NOT NULL;

-- Capture artifact indexes
CREATE INDEX IF NOT EXISTS web_screenshot_captures_customer_id_idx
  ON public.web_screenshot_captures (customer_id);

CREATE INDEX IF NOT EXISTS web_screenshot_captures_options_device_profile_id_idx
  ON public.web_screenshot_captures (options_device_profile_id);

CREATE INDEX IF NOT EXISTS web_screenshot_captures_web_screenshot_capture_request_id_idx
  ON public.web_screenshot_captures (web_screenshot_capture_request_id);

CREATE INDEX IF NOT EXISTS web_screenshot_captures_captured_at_idx
  ON public.web_screenshot_captures (captured_at DESC);

CREATE INDEX IF NOT EXISTS web_screenshot_captures_created_at_idx
  ON public.web_screenshot_captures (created_at DESC);

-- =============================================================================
-- SECTION 4: TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Note: The update_updated_at_column() function should already exist in the database.
-- If it doesn't, it will need to be created separately.

DROP TRIGGER IF EXISTS update_options_device_profiles_updated_at ON public.options_device_profiles;
CREATE TRIGGER update_options_device_profiles_updated_at
  BEFORE UPDATE ON public.options_device_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_web_screenshot_capture_requests_updated_at ON public.web_screenshot_capture_requests;
CREATE TRIGGER update_web_screenshot_capture_requests_updated_at
  BEFORE UPDATE ON public.web_screenshot_capture_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_web_screenshot_captures_updated_at ON public.web_screenshot_captures;
CREATE TRIGGER update_web_screenshot_captures_updated_at
  BEFORE UPDATE ON public.web_screenshot_captures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- SECTION 5: DEFAULT DEVICE PROFILES (SEED DATA)
-- =============================================================================

-- Insert default device profiles for common viewport sizes
-- Uses ON CONFLICT DO NOTHING to allow re-running the script safely

INSERT INTO public.options_device_profiles (
  programmatic_name,
  display_name,
  viewport_width,
  viewport_height,
  device_pixel_ratio,
  is_mobile,
  description,
  sort_order,
  is_active
) VALUES
  -- Desktop Profiles
  (
    'desktop_1920_1080',
    'Desktop 1920x1080',
    1920,
    1080,
    1,
    false,
    'Standard Full HD desktop resolution. Most common desktop viewport size.',
    10,
    true
  ),
  (
    'desktop_1440_900',
    'Desktop 1440x900',
    1440,
    900,
    1,
    false,
    'Common laptop resolution. Good for testing mid-size desktop layouts.',
    20,
    true
  ),
  (
    'desktop_1366_768',
    'Desktop 1366x768',
    1366,
    768,
    1,
    false,
    'Most common laptop resolution worldwide. Useful for baseline testing.',
    30,
    true
  ),
  (
    'desktop_1280_720',
    'Desktop 1280x720',
    1280,
    720,
    1,
    false,
    'HD desktop resolution. Smaller desktop viewport for compact layouts.',
    40,
    true
  ),
  (
    'desktop_2560_1440',
    'Desktop 2560x1440',
    2560,
    1440,
    2,
    false,
    'High-DPI QHD desktop resolution. Retina/high-DPI display simulation.',
    50,
    true
  ),
  (
    'desktop_3840_2160',
    'Desktop 3840x2160 (4K)',
    3840,
    2160,
    2,
    false,
    '4K UHD desktop resolution. High-end desktop and large display testing.',
    60,
    true
  ),
  -- Tablet Profiles
  (
    'tablet_ipad_pro_12_9',
    'iPad Pro 12.9"',
    1024,
    1366,
    2,
    false,
    'iPad Pro 12.9-inch portrait orientation. High-DPI tablet viewport.',
    70,
    true
  ),
  (
    'tablet_ipad_pro_12_9_landscape',
    'iPad Pro 12.9" Landscape',
    1366,
    1024,
    2,
    false,
    'iPad Pro 12.9-inch landscape orientation. High-DPI tablet viewport.',
    80,
    true
  ),
  (
    'tablet_ipad',
    'iPad',
    768,
    1024,
    2,
    false,
    'Standard iPad portrait orientation. Common tablet viewport size.',
    90,
    true
  ),
  (
    'tablet_ipad_landscape',
    'iPad Landscape',
    1024,
    768,
    2,
    false,
    'Standard iPad landscape orientation. Common tablet viewport size.',
    100,
    true
  ),
  (
    'tablet_android_10',
    'Android Tablet 10"',
    800,
    1280,
    1.5,
    false,
    'Standard Android 10-inch tablet portrait orientation.',
    110,
    true
  ),
  (
    'tablet_android_10_landscape',
    'Android Tablet 10" Landscape',
    1280,
    800,
    1.5,
    false,
    'Standard Android 10-inch tablet landscape orientation.',
    120,
    true
  ),
  -- Mobile Profiles
  (
    'mobile_iphone_14_pro_max',
    'iPhone 14 Pro Max',
    430,
    932,
    3,
    true,
    'iPhone 14 Pro Max portrait orientation. Latest flagship iPhone with high-DPI display.',
    130,
    true
  ),
  (
    'mobile_iphone_14_pro_max_landscape',
    'iPhone 14 Pro Max Landscape',
    932,
    430,
    3,
    true,
    'iPhone 14 Pro Max landscape orientation. Latest flagship iPhone with high-DPI display.',
    140,
    true
  ),
  (
    'mobile_iphone_13_pro',
    'iPhone 13 Pro',
    390,
    844,
    3,
    true,
    'iPhone 13 Pro portrait orientation. Common flagship iPhone viewport.',
    150,
    true
  ),
  (
    'mobile_iphone_13_pro_landscape',
    'iPhone 13 Pro Landscape',
    844,
    390,
    3,
    true,
    'iPhone 13 Pro landscape orientation. Common flagship iPhone viewport.',
    160,
    true
  ),
  (
    'mobile_iphone_12',
    'iPhone 12',
    390,
    844,
    3,
    true,
    'iPhone 12 portrait orientation. Popular iPhone model viewport.',
    170,
    true
  ),
  (
    'mobile_iphone_se',
    'iPhone SE',
    375,
    667,
    2,
    true,
    'iPhone SE portrait orientation. Smaller iPhone viewport for compact devices.',
    180,
    true
  ),
  (
    'mobile_android_pixel_7',
    'Android Pixel 7',
    412,
    915,
    2.625,
    true,
    'Google Pixel 7 portrait orientation. Common Android flagship viewport.',
    190,
    true
  ),
  (
    'mobile_android_pixel_7_landscape',
    'Android Pixel 7 Landscape',
    915,
    412,
    2.625,
    true,
    'Google Pixel 7 landscape orientation. Common Android flagship viewport.',
    200,
    true
  ),
  (
    'mobile_android_samsung_galaxy_s21',
    'Samsung Galaxy S21',
    360,
    800,
    3,
    true,
    'Samsung Galaxy S21 portrait orientation. Popular Android device viewport.',
    210,
    true
  ),
  (
    'mobile_android_samsung_galaxy_s21_landscape',
    'Samsung Galaxy S21 Landscape',
    800,
    360,
    3,
    true,
    'Samsung Galaxy S21 landscape orientation. Popular Android device viewport.',
    220,
    true
  ),
  (
    'mobile_android_generic',
    'Android Generic',
    360,
    640,
    2,
    true,
    'Generic Android mobile portrait orientation. Baseline mobile viewport.',
    230,
    true
  ),
  (
    'mobile_android_generic_landscape',
    'Android Generic Landscape',
    640,
    360,
    2,
    true,
    'Generic Android mobile landscape orientation. Baseline mobile viewport.',
    240,
    true
  )
ON CONFLICT (programmatic_name) DO NOTHING;

