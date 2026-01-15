import { createClient } from "@/lib/supabase/client";
import type { ApiResult } from "../types";

const BUCKET_NAME = "logos";
const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

export interface StoredPresetLogo {
  id: string;
  url: string;
  storagePath: string;
}

/**
 * List preset logo files for a visual style guide
 */
export async function listLogoPresets(
  guideId: string
): Promise<ApiResult<string[]>> {
  const supabase = createClient();

  const { data: presetFiles, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${guideId}/presets`);

  if (error) {
    return { ok: false, error: error.message };
  }

  const pngFiles = (presetFiles || [])
    .filter((file) => file.name.endsWith(".png"))
    .map((file) => `${guideId}/presets/${file.name}`);

  return { ok: true, data: pngFiles };
}

/**
 * Get signed URLs for preset logos
 */
export async function getLogoPresetSignedUrls(
  guideId: string
): Promise<ApiResult<StoredPresetLogo[]>> {
  const supabase = createClient();

  // List preset files
  const { data: presetFiles, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${guideId}/presets`);

  if (listError) {
    return { ok: false, error: listError.message };
  }

  if (!presetFiles || presetFiles.length === 0) {
    return { ok: true, data: [] };
  }

  // Generate signed URLs for each preset file
  const presets: StoredPresetLogo[] = [];

  for (const [index, file] of presetFiles
    .filter((f) => f.name.endsWith(".png"))
    .entries()) {
    const storagePath = `${guideId}/presets/${file.name}`;
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signedData?.signedUrl) {
      presets.push({
        id: `preset-${index}`,
        url: signedData.signedUrl,
        storagePath,
      });
    }
  }

  return { ok: true, data: presets };
}

/**
 * Get a signed URL for a storage path
 */
export async function getLogoSignedUrl(
  storagePath: string
): Promise<ApiResult<string>> {
  const supabase = createClient();

  // Clean the path
  const cleanPath = storagePath.trim().startsWith("/")
    ? storagePath.trim().slice(1)
    : storagePath.trim();

  if (!cleanPath) {
    return { ok: false, error: "Storage path is empty" };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(cleanPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      error: error?.message || "Failed to create signed URL",
    };
  }

  return { ok: true, data: data.signedUrl };
}

/**
 * Upload a file to logo storage
 */
export async function uploadLogoFile(
  storagePath: string,
  file: File
): Promise<ApiResult<string>> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: storagePath };
}

/**
 * Delete a file from logo storage
 */
export async function deleteLogoFile(
  storagePath: string
): Promise<ApiResult<boolean>> {
  const supabase = createClient();

  const cleanPath = storagePath.trim().startsWith("/")
    ? storagePath.trim().slice(1)
    : storagePath.trim();

  if (!cleanPath) {
    return { ok: false, error: "Storage path is empty" };
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([cleanPath]);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: true };
}

/**
 * Check if the logos bucket exists (and try to create if not)
 */
export async function ensureLogoBucketExists(): Promise<ApiResult<boolean>> {
  const supabase = createClient();

  const { error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list("", { limit: 1 });

  if (
    listError &&
    (listError.message.includes("not found") ||
      listError.message.includes("Bucket not found"))
  ) {
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: false,
        allowedMimeTypes: [
          "image/svg+xml",
          "image/png",
          "image/jpeg",
          "image/jpg",
        ],
      }
    );

    if (createError) {
      return { ok: false, error: "Failed to access storage bucket" };
    }
  } else if (listError) {
    return { ok: false, error: listError.message };
  }

  return { ok: true, data: true };
}
