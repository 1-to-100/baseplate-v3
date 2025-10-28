import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// ==========================================
// CONTENT SECURITY POLICY (CSP) Configuration
// ==========================================

/**
 * Build Content Security Policy directives
 * 
 * CSP Implementation Strategy:
 * 1. Start with Report-Only mode to identify violations
 * 2. Move to Enforcement mode after testing
 * 3. Consider nonce-based CSP for stricter security (future enhancement)
 * 
 * Current approach balances security with functionality for:
 * - MUI/Emotion inline styles
 * - Google Tag Manager
 * - Mapbox maps
 * - Supabase backend
 * - Auth0/Cognito auth providers
 * - TipTap editor HTML content
 */
function buildCSP(): string {
  const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  // Extract domains from full URLs
  const getHostname = (url: string) => {
    try {
      return url ? new URL(url).hostname : '';
    } catch {
      return '';
    }
  };

  const backendDomain = getHostname(backendApiUrl);
  const supabaseDomain = getHostname(supabaseUrl);

  const directives = [
    // Default policy: only load resources from same origin
    "default-src 'self'",

    // Scripts: Allow self, GTM, and inline scripts
    // Note: 'unsafe-inline' and 'unsafe-eval' needed for GTM and Next.js dev mode
    // For stricter security, consider nonce-based CSP (see Phase 3)
    [
      "script-src 'self'",
      "'unsafe-inline'", // Required for GTM, MUI, and Next.js
      "'unsafe-eval'", // Required for GTM and Next.js dev mode
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      isDevelopment ? "http://localhost:*" : "", // Next.js dev server
    ].filter(Boolean).join(' '),

    // Styles: Allow inline styles for MUI/Emotion
    // Note: MUI Joy UI requires 'unsafe-inline' for runtime style injection
    [
      "style-src 'self'",
      "'unsafe-inline'", // Required for MUI/Emotion
      "https://fonts.googleapis.com", // If using Google Fonts
    ].filter(Boolean).join(' '),

    // Images: Allow self, data URIs, HTTPS, and specific domains
    [
      "img-src 'self'",
      "data:",
      "blob:",
      "https:", // Allow all HTTPS images (needed for Mapbox tiles, user avatars, etc.)
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://*.mapbox.com",
    ].filter(Boolean).join(' '),

    // Fonts: Allow self-hosted fonts and data URIs
    [
      "font-src 'self'",
      "data:",
      "https://fonts.gstatic.com", // If using Google Fonts
    ].filter(Boolean).join(' '),

    // Connect (AJAX/WebSocket): Allow API calls
    [
      "connect-src 'self'",
      // Supabase
      supabaseDomain ? `https://${supabaseDomain}` : "",
      supabaseDomain ? `wss://${supabaseDomain}` : "",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      // Backend API
      backendDomain ? `https://${backendDomain}` : "",
      backendDomain ? `http://${backendDomain}` : "",
      // Mapbox
      "https://api.mapbox.com",
      "https://events.mapbox.com",
      "https://*.tiles.mapbox.com",
      // Google Analytics / GTM
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://analytics.google.com",
      // Auth providers
      "https://*.auth0.com",
      "https://*.us.auth0.com",
      "https://cognito-identity.*.amazonaws.com",
      "https://cognito-idp.*.amazonaws.com",
      // Development
      isDevelopment ? "http://localhost:*" : "",
      isDevelopment ? "ws://localhost:*" : "",
      isDevelopment ? "wss://localhost:*" : "",
    ].filter(Boolean).join(' '),

    // Frames: Allow same origin (for Storybook) but deny external embedding
    "frame-src 'self'",

    // Workers: Allow blob URIs (needed for Mapbox)
    "worker-src 'self' blob:",

    // Child sources: Allow blob URIs (needed for Mapbox)
    "child-src 'self' blob:",

    // Object/Embed: Deny plugins (Flash, Java, etc.)
    "object-src 'none'",

    // Media: Allow same origin
    "media-src 'self' data: blob:",

    // Base URI: Prevent base tag injection
    "base-uri 'self'",

    // Form actions: Only allow same origin
    "form-action 'self'",

    // Frame ancestors: Prevent clickjacking (redundant with X-Frame-Options)
    "frame-ancestors 'self'",

    // Upgrade insecure requests in production
    isProduction ? "upgrade-insecure-requests" : "",
  ].filter(Boolean);

  return directives.join('; ');
}

const nextConfig: NextConfig = {
  output: "standalone",
  
  async headers() {
    const cspDirectives = buildCSP();
    
    // Toggle between Report-Only and Enforcement mode
    // Start with Report-Only to monitor violations without breaking functionality
    const USE_CSP_REPORT_ONLY = process.env.CSP_REPORT_ONLY !== 'false';
    
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          // ==========================================
          // CONTENT SECURITY POLICY (CSP) - CRITICAL!
          // ==========================================
          
          // Phase 1: Report-Only Mode (recommended to start)
          // Monitors violations without blocking - check browser console
          ...(USE_CSP_REPORT_ONLY ? [{
            key: 'Content-Security-Policy-Report-Only',
            value: cspDirectives
          }] : []),
          
          // Phase 2: Enforcement Mode (enable after testing)
          // Set CSP_REPORT_ONLY=false to enforce
          ...(!USE_CSP_REPORT_ONLY ? [{
            key: 'Content-Security-Policy',
            value: cspDirectives
          }] : []),
          
          // ==========================================
          // CORE SECURITY HEADERS (Always Applied)
          // ==========================================
          
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          
          // Control clickjacking - SAMEORIGIN allows your internal iframes (Storybook)
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          
          // Control referrer information leakage
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          
          // Legacy XSS protection (deprecated but still useful for older browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          
          // Control DNS prefetching (privacy)
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on' // Keep 'on' for performance with external resources (Mapbox, GTM)
          },
          
          // ==========================================
          // PRODUCTION-ONLY HEADERS
          // ==========================================
          
          // Enforce HTTPS in production only (breaks localhost in dev)
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : []),
          
          // ==========================================
          // PERMISSIONS POLICY (Privacy & Security)
          // ==========================================
          
          {
            key: 'Permissions-Policy',
            value: [
              // Deny dangerous features
              'geolocation=()',
              'microphone=()', 
              'camera=()',
              'payment=()',
              'usb=()',
              'serial=()',
              'bluetooth=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
              'ambient-light-sensor=()',
              
              // Allow for same origin (your app)
              'fullscreen=(self)',
              'picture-in-picture=(self)',
              'autoplay=(self)',
              'encrypted-media=(self)',
            ].join(', ')
          },
          
          // ==========================================
          // CROSS-ORIGIN POLICIES (OAuth Compatible)
          // ==========================================
          
          // Allow OAuth popups (Auth0, Cognito) - CRITICAL for your auth flows
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          
          // Less strict COEP for external resources (Mapbox, GTM, etc.)
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none' // Required for external integrations
          },
          
          // Control cross-origin resource policy
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin' // Allow external resources like Mapbox tiles
          }
        ]
      }
    ];
  }
};

export default nextConfig;
