/**
 * Runtime theme configuration fetching utilities
 * Loads theme.json and assets.json from public folder (later it will be fetched from supabase) with caching
 */

import { deepMerge } from '@/lib/helpers/object-helpers';
import { logger } from '@/lib/default-logger';
import type { ThemeConfig, AssetsConfig, BrandConfig } from './theme-config';
import { DEFAULT_THEME_CONFIG, DEFAULT_ASSETS_CONFIG } from './theme-config';

let themeConfigCache: ThemeConfig | null = null;
let assetsConfigCache: AssetsConfig | null = null;
let fetchPromise: Promise<BrandConfig> | null = null;

/**
 * Fetch theme configuration from public/brand/theme.json
 */
async function fetchThemeConfig(): Promise<ThemeConfig> {
  try {
    const response = await fetch('/brand/theme.json', {
      cache: 'no-store', // Allow hot-swapping without rebuild
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch theme.json: ${response.status}`);
    }

    const config: ThemeConfig = await response.json();
    logger.info('Theme configuration loaded successfully');
    return config;
  } catch (error) {
    logger.warn('Failed to load theme.json, using default theme', error);
    return DEFAULT_THEME_CONFIG;
  }
}

/**
 * Fetch assets configuration from public/brand/assets.json
 */
async function fetchAssetsConfig(): Promise<AssetsConfig> {
  try {
    const response = await fetch('/brand/assets.json', {
      cache: 'no-store', // Allow hot-swapping without rebuild
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assets.json: ${response.status}`);
    }

    const config: AssetsConfig = await response.json();
    logger.info('Assets configuration loaded successfully');
    return config;
  } catch (error) {
    logger.warn('Failed to load assets.json, using default assets', error);
    return DEFAULT_ASSETS_CONFIG;
  }
}

/**
 * Fetch both theme and assets configuration
 * Uses singleton pattern to ensure only one fetch happens
 */
export async function fetchBrandConfig(): Promise<BrandConfig> {
  // If already cached, return cached values
  if (themeConfigCache && assetsConfigCache) {
    return {
      theme: themeConfigCache,
      assets: assetsConfigCache,
    };
  }

  // If fetch is in progress, wait for it
  if (fetchPromise) {
    return fetchPromise;
  }

  // Start new fetch
  fetchPromise = (async () => {
    const [theme, assets] = await Promise.all([fetchThemeConfig(), fetchAssetsConfig()]);

    // Cache the results
    themeConfigCache = theme;
    assetsConfigCache = assets;

    return { theme, assets };
  })();

  try {
    return await fetchPromise;
  } finally {
    // Clear the promise after completion
    fetchPromise = null;
  }
}

/**
 * Get cached theme config (returns null if not yet loaded)
 */
export function getCachedThemeConfig(): ThemeConfig | null {
  return themeConfigCache;
}

/**
 * Get cached assets config (returns null if not yet loaded)
 */
export function getCachedAssetsConfig(): AssetsConfig | null {
  return assetsConfigCache;
}

/**
 * Clear the cache (useful for hot-reloading in development)
 */
export function clearBrandConfigCache(): void {
  themeConfigCache = null;
  assetsConfigCache = null;
  fetchPromise = null;
  logger.info('Brand configuration cache cleared');
}

/**
 * Reload brand configuration (clears cache and refetches)
 */
export async function reloadBrandConfig(): Promise<BrandConfig> {
  clearBrandConfigCache();
  return fetchBrandConfig();
}

/**
 * Merge custom theme config with defaults
 */
export function mergeThemeConfig(customConfig: Partial<ThemeConfig>): ThemeConfig {
  return deepMerge(DEFAULT_THEME_CONFIG, customConfig);
}

/**
 * Merge custom assets config with defaults
 */
export function mergeAssetsConfig(customConfig: Partial<AssetsConfig>): AssetsConfig {
  return deepMerge(DEFAULT_ASSETS_CONFIG, customConfig);
}
