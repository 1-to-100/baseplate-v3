import { AuthStrategy } from '@/lib/auth/strategy';
import { getSiteURL } from '@/lib/get-site-url';
import { LogLevel } from '@/lib/logger';
import type { ColorScheme, PrimaryColor } from '@/styles/theme/types';

export interface Config {
  site: {
    name: string;
    description: string;
    colorScheme: ColorScheme;
    primaryColor: PrimaryColor;
    themeColor: string;
    url: string;
    apiUrl?: string;
    version?: string;
  };
  logLevel: keyof typeof LogLevel;
  auth: { strategy: keyof typeof AuthStrategy };
  auth0: { secret?: string; baseUrl?: string; issuerBaseUrl?: string; clientId?: string; clientSecret?: string };
  cognito: { identityPoolId?: string; userPoolClientId?: string; userPoolId?: string };
  supabase: { url?: string; anonKey?: string };
  mapbox: { apiKey?: string };
  gtm?: { id?: string };
}

export const config = {
  site: {
    name: 'Baseplate',
    description: '',
    colorScheme: 'light',
    themeColor: '#090a0b',
    primaryColor: 'palatinateBlue',
    url: getSiteURL(),
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    version: process.env.NEXT_PUBLIC_SITE_VERSION,
  },
  logLevel: (process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof LogLevel) || LogLevel.ALL,
  auth: { 
    strategy: (() => {
      const envStrategy = process.env.NEXT_PUBLIC_AUTH_STRATEGY;
      const validStrategies = Object.values(AuthStrategy) as string[];
      if (envStrategy && validStrategies.includes(envStrategy)) {
        return envStrategy as keyof typeof AuthStrategy;
      }
      return AuthStrategy.CUSTOM;
    })(),
  },
  auth0: {
    secret: process.env.AUTH0_SECRET,
    baseUrl: process.env.AUTH0_BASE_URL,
    issuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
  },
  cognito: {
    identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID,
    userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
    userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  mapbox: { apiKey: process.env.NEXT_PUBLIC_MAPBOX_API_KEY },
  gtm: { id: process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID },
} satisfies Config;
