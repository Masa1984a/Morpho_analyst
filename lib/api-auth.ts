/**
 * API Authentication Utility
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Verify API authentication
 */
export function verifyApiAuth(req: VercelRequest): boolean {
  const authHeader = req.headers.authorization;
  const apiSecret = process.env.API_SECRET;

  if (!apiSecret) {
    console.error('API_SECRET is not configured');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const expectedAuth = `Bearer ${apiSecret}`;
  return authHeader === expectedAuth;
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(res: VercelResponse): void {
  res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Parse date query parameter
 */
export function parseDateParam(param: string | string[] | undefined): Date | null {
  if (!param || Array.isArray(param)) {
    return null;
  }

  const date = new Date(param);
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Parse integer query parameter
 */
export function parseIntParam(
  param: string | string[] | undefined,
  defaultValue: number,
  min: number,
  max: number
): number {
  if (!param || Array.isArray(param)) {
    return defaultValue;
  }

  const parsed = parseInt(param, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, min), max);
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
