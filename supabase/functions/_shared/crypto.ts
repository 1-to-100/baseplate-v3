/**
 * Timing-safe comparison utilities for webhook signature verification.
 *
 * Avoids leaking information (including input length) through timing
 * side-channels by always iterating over the longer input and folding
 * the length difference into the result.
 */

// Cache the native implementation lookup (undefined = not checked yet)
let _nativeTimingSafeEqual: ((a: Uint8Array, b: Uint8Array) => boolean) | null | undefined = undefined

/**
 * Constant-time byte array comparison.
 * Tries node:crypto.timingSafeEqual first, falls back to XOR loop.
 * Does NOT early-return on length mismatch — length difference is folded
 * into the comparison result.
 */
export async function timingSafeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  // Try native implementation once
  if (_nativeTimingSafeEqual === undefined) {
    try {
      const mod = await import('node:crypto')
      if (typeof mod.timingSafeEqual === 'function') {
        _nativeTimingSafeEqual = (x: Uint8Array, y: Uint8Array) => mod.timingSafeEqual(x, y)
      } else {
        _nativeTimingSafeEqual = null
      }
    } catch {
      _nativeTimingSafeEqual = null
    }
  }

  // Native timingSafeEqual requires equal lengths, so only use it when lengths match
  if (_nativeTimingSafeEqual && a.byteLength === b.byteLength) {
    try {
      return _nativeTimingSafeEqual(a, b)
    } catch {
      // Fall through to manual comparison
    }
  }

  // Manual constant-time comparison — safe for unequal lengths
  const maxLen = Math.max(a.byteLength, b.byteLength)
  let result = a.byteLength ^ b.byteLength // non-zero if lengths differ
  for (let i = 0; i < maxLen; i++) {
    result |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }

  return result === 0
}

/**
 * Constant-time string comparison. Encodes to UTF-8 bytes then delegates
 * to timingSafeEqual.
 */
export async function secureCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder()
  return timingSafeEqual(encoder.encode(a), encoder.encode(b))
}
