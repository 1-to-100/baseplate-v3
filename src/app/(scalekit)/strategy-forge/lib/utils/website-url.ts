/**
 * Normalize a website URL to an absolute URL (with https:// if no protocol).
 * Use for links that must open the third-party site, not the current app.
 */
export function toAbsoluteWebsiteUrl(website: string): string {
  const trimmed = website.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}
