export function getSiteURL(): string {
  // Get URL from environment variables, filtering out empty strings
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  
  let url = siteUrl || vercelUrl || 'http://localhost:3000';
  
  // Remove trailing slashes before processing
  url = url.replace(/\/+$/, '');
  
  // Make sure to include `https://` when not localhost and doesn't already have a protocol
  if (!url.includes('://')) {
    url = url.includes('localhost') ? `http://${url}` : `https://${url}`;
  }
  
  // Validate URL before returning
  try {
    const urlObj = new URL(url);
    // Ensure trailing slash for consistency
    return urlObj.href.endsWith('/') ? urlObj.href : `${urlObj.href}/`;
  } catch (error) {
    // If URL is invalid, fall back to localhost
    console.warn(`Invalid site URL configuration: "${url}". Falling back to localhost.`);
    return 'http://localhost:3000/';
  }
}
