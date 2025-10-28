import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: "standalone",
  
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
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
