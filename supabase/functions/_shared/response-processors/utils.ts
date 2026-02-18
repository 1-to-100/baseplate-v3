/**
 * Shared utilities for response processors.
 */

/**
 * Strips markdown code fences from LLM JSON output.
 * Handles: ```json\n...\n``` , ```\n...\n``` , and clean JSON.
 *
 * Extracted from extract-colors/extract-fonts where this logic was duplicated.
 */
export function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();

  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    } else {
      const closingIndex = cleaned.indexOf('```', 3);
      if (closingIndex !== -1) {
        cleaned = cleaned.substring(3, closingIndex);
      } else {
        cleaned = cleaned.substring(3);
      }
    }

    const lastBackticks = cleaned.lastIndexOf('```');
    if (lastBackticks !== -1 && lastBackticks > 0) {
      cleaned = cleaned.substring(0, lastBackticks);
    }

    cleaned = cleaned.trim();
  }

  return cleaned;
}
