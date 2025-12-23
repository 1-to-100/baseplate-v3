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
  };
  logLevel: keyof typeof LogLevel;
  auth: { strategy: keyof typeof AuthStrategy };
  supabase: { url?: string; anonKey?: string };
}

export const config = {
  site: {
    name: 'Baseplate',
    description: '',
    colorScheme: 'light',
    themeColor: '#090a0b',
    primaryColor: 'palatinateBlue',
    url: getSiteURL(),
  },
  logLevel: LogLevel.ALL,
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
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
} satisfies Config;
