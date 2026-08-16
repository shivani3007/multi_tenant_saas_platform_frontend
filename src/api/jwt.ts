/** Minimal JWT payload reader — used only to learn `exp`. Never for trust decisions. */

interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  // Handle non-ASCII claims correctly.
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Epoch-ms expiry of an access token, or `null` if it isn't a JWT or has no `exp`.
 * A `null` here means "we can't know" — the caller falls back to reactive 401 handling.
 */
export function getTokenExpiry(token: string): number | null {
  const payload = decodeJwt(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}
