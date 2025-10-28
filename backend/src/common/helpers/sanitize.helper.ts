import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * This is used for notification content, user-generated content, etc.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for storage and rendering
 */
export function sanitizeNotificationHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // DOMPurify with safe defaults - removes scripts, event handlers, and dangerous protocols
  // Using minimal config to avoid TypeScript type issues with complex configurations
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'a', 'span', 'div'
    ],
    ALLOW_DATA_ATTR: false,
  } as any);

  return typeof sanitized === 'string' ? sanitized : '';
}

/**
 * Sanitize HTML for rich text editor content (more permissive)
 * Use this for article content, templates, etc.
 * 
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for storage and rendering
 */
export function sanitizeEditorHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // DOMPurify with more permissive settings for rich text editor
  // Using minimal config to avoid TypeScript type issues with complex configurations
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img', 'video', 'code', 'pre', 'blockquote', 
      'span', 'div', 'sub', 'sup'
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  } as any);

  return typeof sanitized === 'string' ? sanitized : '';
}

/**
 * Generic sanitization alias
 */
export const sanitizeHTML = sanitizeNotificationHTML;

