/**
 * WLD Price History API
 * GET /api/data/wld-price
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../lib/db';
import {
  verifyApiAuth,
  sendUnauthorized,
  parseDateParam,
  parseIntParam,
} from '../../lib/api-auth';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication
  if (!verifyApiAuth(req)) {
    return sendUnauthorized(res);
  }

  try {
    // Parse query parameters
    const fromDate = parseDateParam(req.query.from);
    const toDate = parseDateParam(req.query.to);
    const limit = parseIntParam(req.query.limit, 100, 1, 1000);
    const offset = parseIntParam(req.query.offset, 0, 0, 1000000);

    // Build SQL query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (fromDate) {
      conditions.push(`date >= $${paramIndex++}`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`date <= $${paramIndex++}`);
      params.push(toDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM wld_price_history
      ${whereClause}
    `;

    const countResult = await query<{ total: string }>(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Get data
    const dataSql = `
      SELECT
        date,
        symbol,
        close_price,
        created_at,
        updated_at
      FROM wld_price_history
      ${whereClause}
      ORDER BY date DESC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++}
    `;

    const dataResult = await query(dataSql, [...params, limit, offset]);

    // Format response
    return res.status(200).json({
      data: dataResult.rows,
      meta: {
        total,
        limit,
        offset,
        count: dataResult.rows.length,
      },
      filters: {
        from: fromDate?.toISOString().split('T')[0] || null,
        to: toDate?.toISOString().split('T')[0] || null,
      },
    });
  } catch (error) {
    console.error('Error fetching WLD price data:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
