import { useCallback, useEffect, useState } from 'react';
import { getLogoSignedUrl } from '../api/logo_storage';
import type { LogoAsset } from '../types';

const SIGNED_URL_REFRESH_MS = 30 * 60 * 1000; // Refresh every 30 minutes to stay well ahead of 6h expiry

/**
 * Hook to manage signed URLs for logo assets
 * Handles URL generation, caching, periodic refresh, and error recovery
 */
export function useLogoSignedUrls(logos: LogoAsset[] | undefined) {
  const [logoImageUrls, setLogoImageUrls] = useState<Record<string, string>>({});
  const [isGeneratingUrls, setIsGeneratingUrls] = useState(false);

  const addCacheBust = useCallback((url: string): string => {
    return `${url}${url.includes('?') ? '&' : '?'}ts=${Date.now()}`;
  }, []);

  const getSignedUrl = useCallback(async (storagePath: string): Promise<string> => {
    const result = await getLogoSignedUrl(storagePath);
    if (!result.ok) {
      throw new Error(result.error);
    }
    return result.data;
  }, []);

  /**
   * Refresh the signed URL for a specific logo (e.g., after an image load error)
   */
  const refreshLogoUrl = useCallback(
    async (logo: LogoAsset) => {
      if (!logo.storage_path) return;

      try {
        const signedUrl = await getSignedUrl(logo.storage_path);
        const cacheBusted = addCacheBust(signedUrl);
        setLogoImageUrls((prev) => ({
          ...prev,
          [String(logo.logo_asset_id)]: cacheBusted,
        }));
      } catch (error) {
        console.error('Failed to refresh logo URL:', error);
      }
    },
    [getSignedUrl, addCacheBust]
  );

  /**
   * Get the display URL for a logo, with fallbacks
   */
  const getLogoDisplayUrl = useCallback(
    (logo: LogoAsset): string | undefined => {
      const logoId = String(logo.logo_asset_id);
      const generatedUrl = logoImageUrls[logoId];
      return generatedUrl || logo.file_url || undefined;
    },
    [logoImageUrls]
  );

  useEffect(() => {
    let isCancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const buildUrlForLogo = async (
      logo: LogoAsset
    ): Promise<{ logoId: string; url: string | null }> => {
      const logoId = String(logo.logo_asset_id);

      // Priority: file_url > storage_path (signed URL) > file_blob
      if (logo.file_url) {
        return { logoId, url: logo.file_url };
      }

      if (logo.storage_path) {
        try {
          const signedUrl = await getSignedUrl(logo.storage_path);
          return { logoId, url: signedUrl };
        } catch (error) {
          console.warn(`Failed to generate signed URL for logo ${logoId}:`, {
            error: error instanceof Error ? error.message : String(error),
            storagePath: logo.storage_path,
          });
        }
        return { logoId, url: null };
      }

      if (logo.file_blob) {
        return { logoId, url: logo.file_blob };
      }

      return { logoId, url: null };
    };

    const generateImageUrls = async () => {
      if (!logos || logos.length === 0) {
        setLogoImageUrls({});
        return;
      }

      setIsGeneratingUrls(true);

      // Process logos in parallel for better performance
      const urlPromises = logos.map(buildUrlForLogo);

      const results = await Promise.all(urlPromises);
      const urlMap: Record<string, string> = {};

      for (const { logoId, url } of results) {
        if (url) {
          urlMap[logoId] = addCacheBust(url);
        }
      }

      if (!isCancelled) {
        setLogoImageUrls(urlMap);
        setIsGeneratingUrls(false);
      }
    };

    generateImageUrls();
    // Refresh signed URLs periodically so they don't expire in the UI
    intervalId = setInterval(generateImageUrls, SIGNED_URL_REFRESH_MS);

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [logos, addCacheBust, getSignedUrl]);

  return {
    logoImageUrls,
    isGeneratingUrls,
    refreshLogoUrl,
    getLogoDisplayUrl,
    getSignedUrl,
  };
}
