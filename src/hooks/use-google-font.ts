'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  isFontLoaded,
  isFontLoading,
  loadGoogleFont,
  loadGoogleFonts,
} from '@/lib/helpers/font-loader';

/** Font loading status enum */
export enum FontStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

interface UseGoogleFontReturn {
  /** Load a single font and track its status (silent failure - never throws) */
  loadFont: (fontFamily: string) => Promise<void>;
  /** Load multiple fonts at once (silent failure - never throws) */
  loadFonts: (fontFamilies: string[]) => Promise<void>;
  /** Get the loading status of a specific font */
  getStatus: (fontFamily: string) => FontStatus;
  /** Whether any fonts are currently loading */
  isLoading: boolean;
  /** Map of font family to its current status */
  fontsStatus: Record<string, FontStatus>;
}

/**
 * Hook to manage Google Font loading for typography styles
 *
 * @param fontFamilies - Array of font family names to load on mount (from DB)
 * @returns Object with loadFont function, status getter, and loading state
 *
 * @example
 * // Load fonts from DB typography styles
 * const fonts = typographyStyles.map(s => s.font_family).filter(Boolean);
 * const { loadFont, loadFonts, getStatus, isLoading } = useGoogleFont(fonts);
 *
 * // Load a new font when user selects it (silent failure)
 * await loadFont('Raleway');
 *
 * // Load multiple fonts when dropdown opens
 * await loadFonts(['Inter', 'Roboto', 'Open Sans']);
 */
export function useGoogleFont(fontFamilies: string[] = []): UseGoogleFontReturn {
  const [fontsStatus, setFontsStatus] = useState<Record<string, FontStatus>>({});
  const loadedOnMountRef = useRef(false);

  // Get unique, non-empty font families
  const uniqueFonts = useMemo(() => {
    return [...new Set(fontFamilies)].filter((f): f is string => Boolean(f));
  }, [fontFamilies]);

  // Load fonts from DB on mount (only once)
  useEffect(() => {
    if (loadedOnMountRef.current || uniqueFonts.length === 0) {
      return;
    }

    loadedOnMountRef.current = true;

    // Set initial loading status
    const initialStatus: Record<string, FontStatus> = {};
    uniqueFonts.forEach((font) => {
      if (isFontLoaded(font)) {
        initialStatus[font] = FontStatus.LOADED;
      } else if (isFontLoading(font)) {
        initialStatus[font] = FontStatus.LOADING;
      } else {
        initialStatus[font] = FontStatus.LOADING;
      }
    });
    setFontsStatus(initialStatus);

    // Load all fonts (silent failure)
    loadGoogleFonts(uniqueFonts).then(() => {
      setFontsStatus((prev) => {
        const updated = { ...prev };
        uniqueFonts.forEach((font) => {
          updated[font] = isFontLoaded(font) ? FontStatus.LOADED : FontStatus.ERROR;
        });
        return updated;
      });
    });
  }, [uniqueFonts]);

  // Load a single font on demand (silent failure - never throws)
  const loadFont = useCallback(async (fontFamily: string): Promise<void> => {
    if (!fontFamily) return;

    // Already loaded
    if (isFontLoaded(fontFamily)) {
      setFontsStatus((prev) => ({ ...prev, [fontFamily]: FontStatus.LOADED }));
      return;
    }

    // Set loading status
    setFontsStatus((prev) => ({ ...prev, [fontFamily]: FontStatus.LOADING }));

    try {
      await loadGoogleFont(fontFamily);
      setFontsStatus((prev) => ({ ...prev, [fontFamily]: FontStatus.LOADED }));
    } catch {
      // Silent failure - log but don't throw
      console.warn(`Failed to load font: ${fontFamily}`);
      setFontsStatus((prev) => ({ ...prev, [fontFamily]: FontStatus.ERROR }));
    }
  }, []);

  // Load multiple fonts at once (for dropdown open)
  const loadFonts = useCallback(async (fonts: string[]): Promise<void> => {
    const uniqueToLoad = [...new Set(fonts)].filter(
      (f): f is string => Boolean(f) && !isFontLoaded(f) && !isFontLoading(f)
    );

    if (uniqueToLoad.length === 0) return;

    // Set loading status for all
    setFontsStatus((prev) => {
      const updated = { ...prev };
      uniqueToLoad.forEach((font) => {
        updated[font] = FontStatus.LOADING;
      });
      return updated;
    });

    // Load all fonts (silent failure)
    await loadGoogleFonts(uniqueToLoad);

    // Update status based on results
    setFontsStatus((prev) => {
      const updated = { ...prev };
      uniqueToLoad.forEach((font) => {
        updated[font] = isFontLoaded(font) ? FontStatus.LOADED : FontStatus.ERROR;
      });
      return updated;
    });
  }, []);

  // Get status of a specific font
  const getStatus = useCallback(
    (fontFamily: string): FontStatus => {
      if (isFontLoaded(fontFamily)) return FontStatus.LOADED;
      if (isFontLoading(fontFamily)) return FontStatus.LOADING;
      return fontsStatus[fontFamily] || FontStatus.IDLE;
    },
    [fontsStatus]
  );

  // Check if any fonts are currently loading
  const isLoading = useMemo(() => {
    return Object.values(fontsStatus).some((status) => status === FontStatus.LOADING);
  }, [fontsStatus]);

  return {
    loadFont,
    loadFonts,
    getStatus,
    isLoading,
    fontsStatus,
  };
}
