import { downloadZip } from 'client-zip';
import { downloadBlob } from './download-utils';

// Re-export download utilities for convenience
export { fetchFileAsBlob, dataUrlToBlob, downloadBlob } from './download-utils';

export interface ZipFileEntry {
  filename: string;
  data: Blob | string; // Blob or string content
}

/**
 * Creates a zip file from an array of file entries and triggers a download.
 * Uses client-zip for minimal bundle size (~2.6KB gzipped).
 * @param files - Array of files to include in the zip
 * @param zipFilename - Name of the zip file to download
 */
export async function createZipFromFiles(
  files: ZipFileEntry[],
  zipFilename: string
): Promise<void> {
  // Convert to client-zip format
  const zipEntries = files.map((file) => ({
    name: file.filename,
    input: file.data,
  }));

  // Generate the zip as a blob
  const blob = await downloadZip(zipEntries).blob();

  // Trigger download
  downloadBlob(blob, zipFilename);
}
