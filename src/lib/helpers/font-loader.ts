import WebFont from 'webfontloader';

// Track loaded fonts to prevent duplicate requests
const loadedFonts = new Set<string>();
const loadingFonts = new Map<string, Promise<void>>();

// System fonts that don't need to be loaded from Google Fonts
const SYSTEM_FONTS = new Set([
  'arial',
  'helvetica',
  'georgia',
  'times new roman',
  'times',
  'courier new',
  'courier',
  'verdana',
  'trebuchet ms',
  'comic sans ms',
  'impact',
  'system-ui',
  'sans-serif',
  'serif',
  'monospace',
]);

// Map of programmatic names to Google Fonts display names
const FONT_NAME_MAP: Record<string, string> = {
  open_sans: 'Open Sans',
  source_sans_pro: 'Source Sans Pro',
  pt_serif: 'PT Serif',
  playfair_display: 'Playfair Display',
  times_new_roman: 'Times New Roman',
};

/**
 * Normalize font family name for Google Fonts API
 * Converts programmatic names (e.g., "open_sans") to display names (e.g., "Open Sans")
 */
function normalizeFontName(fontFamily: string): string {
  const trimmed = fontFamily.trim();

  // Check if we have a direct mapping
  const mapped = FONT_NAME_MAP[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  // If it contains underscores, convert to title case with spaces
  if (trimmed.includes('_')) {
    return trimmed
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Return as-is (already properly formatted like "Inter", "Raleway")
  return trimmed;
}

/**
 * Check if a font is a system font that doesn't need loading
 */
function isSystemFont(fontFamily: string): boolean {
  const normalized = normalizeFontName(fontFamily).toLowerCase();
  return SYSTEM_FONTS.has(normalized);
}

/**
 * Load a Google Font dynamically using webfontloader
 * @param fontFamily - The font family name (e.g., "Raleway", "Open Sans", "open_sans")
 * @returns Promise that resolves when font is loaded, rejects on error
 */
export function loadGoogleFont(fontFamily: string): Promise<void> {
  // Normalize the font name for Google Fonts API
  const normalizedName = normalizeFontName(fontFamily);

  // Skip system fonts
  if (isSystemFont(fontFamily)) {
    return Promise.resolve();
  }

  // Use original name as cache key to handle both formats
  const cacheKey = fontFamily;

  // Already loaded (check both original and normalized)
  if (loadedFonts.has(cacheKey) || loadedFonts.has(normalizedName)) {
    return Promise.resolve();
  }

  // Already loading - return existing promise
  const existingPromise = loadingFonts.get(cacheKey) || loadingFonts.get(normalizedName);
  if (existingPromise) {
    return existingPromise;
  }

  // Start loading with normalized name
  const loadPromise = new Promise<void>((resolve, reject) => {
    WebFont.load({
      google: {
        // Use normalized name for Google Fonts API
        // Format: "Font Name:weight1,weight2,..."
        families: [`${normalizedName}:300,400,500,600,700`],
      },
      active: () => {
        // Mark both original and normalized as loaded
        loadedFonts.add(cacheKey);
        loadedFonts.add(normalizedName);
        loadingFonts.delete(cacheKey);
        resolve();
      },
      inactive: () => {
        loadingFonts.delete(cacheKey);
        reject(new Error(`Failed to load font: ${normalizedName}`));
      },
      timeout: 5000,
    });
  });

  loadingFonts.set(cacheKey, loadPromise);
  return loadPromise;
}

/**
 * Load multiple Google Fonts at once
 * @param fontFamilies - Array of font family names
 * @returns Promise that resolves when all fonts are loaded (failures are logged but don't reject)
 */
export async function loadGoogleFonts(fontFamilies: string[]): Promise<void> {
  const uniqueFonts = [...new Set(fontFamilies)].filter((font) => font && !isSystemFont(font));

  if (uniqueFonts.length === 0) {
    return;
  }

  const results = await Promise.allSettled(uniqueFonts.map((font) => loadGoogleFont(font)));

  // Log any failures but don't throw
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.warn(`Failed to load font "${uniqueFonts[index]}":`, result.reason);
    }
  });
}

/**
 * Check if a font has been loaded
 * @param fontFamily - The font family name to check
 * @returns true if font is loaded, false otherwise
 */
export function isFontLoaded(fontFamily: string): boolean {
  if (isSystemFont(fontFamily)) return true;
  const normalized = normalizeFontName(fontFamily);
  return loadedFonts.has(fontFamily) || loadedFonts.has(normalized);
}

/**
 * Check if a font is currently loading
 * @param fontFamily - The font family name to check
 * @returns true if font is loading, false otherwise
 */
export function isFontLoading(fontFamily: string): boolean {
  const normalized = normalizeFontName(fontFamily);
  return loadingFonts.has(fontFamily) || loadingFonts.has(normalized);
}

/**
 * Get the normalized Google Fonts display name for a font family
 * @param fontFamily - The font family name (can be programmatic like "open_sans")
 * @returns The normalized display name (e.g., "Open Sans")
 */
export { normalizeFontName };
