import DOMPurify, { Config as DOMPurifyConfig } from 'dompurify';

// Custom type for DOMPurify config with ALLOWED_ATTR as object
type SanitizeConfig = Omit<DOMPurifyConfig, 'ALLOWED_ATTR'> & {
  ALLOWED_ATTR: Record<string, string[]>;
};

/**
 * Sanitize HTML for notification content (strict policy)
 * Use this for user notifications, comments, etc.
 *
 * This function protects against XSS attacks by allowing only safe HTML tags
 * and attributes while stripping dangerous content like scripts and event handlers.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeNotificationHTML = (html: string): string => {
  if (typeof window === 'undefined') {
    // Server-side rendering - return empty or handle differently
    return '';
  }

  const config: SanitizeConfig = {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'ol',
      'ul',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'a',
      'span',
      'div',
    ],
    ALLOWED_ATTR: {
      a: ['href', 'target', 'rel'],
      span: ['style'],
      div: ['style'],
      '*': ['class'],
    },
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  };

  return DOMPurify.sanitize(html, config as unknown as DOMPurifyConfig);
};

/**
 * Sanitize HTML for rich text editor content (permissive policy)
 * Use this for article content, rich text fields, etc.
 *
 * This allows more HTML features needed for rich text editing while still
 * protecting against XSS attacks.
 *
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering
 */
export const sanitizeEditorHTML = (html: string): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const config: SanitizeConfig = {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'ol',
      'ul',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'a',
      'img',
      'video',
      'code',
      'pre',
      'blockquote',
      'span',
      'div',
      'sub',
      'sup',
    ],
    ALLOWED_ATTR: {
      a: ['href', 'target', 'rel', 'class', 'style'],
      img: ['src', 'alt', 'width', 'height', 'style', 'class'],
      video: ['src', 'controls', 'width', 'max-width', 'style', 'class'],
      span: ['style', 'class'],
      div: ['style', 'class'],
      code: ['class'],
      pre: ['class'],
      blockquote: ['class', 'style'],
      h1: ['id', 'class', 'style'],
      h2: ['id', 'class', 'style'],
      h3: ['id', 'class', 'style'],
      h4: ['id', 'class', 'style'],
      h5: ['id', 'class', 'style'],
      h6: ['id', 'class', 'style'],
      '*': ['class'],
    },
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ADD_ATTR: ['target'],
  };

  return DOMPurify.sanitize(html, config as unknown as DOMPurifyConfig);
};

/**
 * Generic sanitization for simple text with minimal formatting
 * Alias for sanitizeNotificationHTML
 */
export const sanitizeHTML = sanitizeNotificationHTML;
