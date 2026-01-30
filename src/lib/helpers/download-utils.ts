/**
 * Fetches a file from a URL and returns it as a Blob.
 * @param url - URL of the file to fetch
 * @returns Promise resolving to the file Blob
 */
export async function fetchFileAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Converts a base64 data URL to a Blob.
 * @param dataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @returns Blob representation of the data
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',');
  const mimeMatch = header?.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

  if (!base64Data) {
    throw new Error('Invalid data URL format: expected "data:<mime>;base64,<data>"');
  }

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

/**
 * Triggers a file download in the browser.
 * @param blob - The blob to download
 * @param filename - Name of the file to download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
