/**
 * Morpho Earn History API
 * GET /api/data/earn
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyApiAuth(req)) {
    return sendUnauthorized(res);
  }

  try {
    const fromDate = parseDateParam(req.query.from);
    const toDate = parseDateParam(req.query.to);
    const limit = parseIntParam(req.query.limit, 100, 1, 1000);
    const offset = parseIntParam(req.query.offset, 0, 0, 1000000);

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (fromDate) {
      conditions.push(`day >= $${paramIndex++}`);
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push(`day <= $${paramIndex++}`);
      params.push(toDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) as total
      FROM morpho_earn_history
      ${whereClause}
    `;

    const countResult = await query<{ total: string }>(countSql, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const dataSql = `
      SELECT
        day,
        vault_address,
        vault_symbol,
        vault_asset,
        vault_asset_symbol,
        conversion_rate,
        delta_assets,
        delta_shares,
        total_shares,
        tvl_usd,
        created_at,
        updated_at
      FROM morpho_earn_history
      ${whereClause}
      ORDER BY day DESC, vault_address ASC
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++}
    `;

    const dataResult = await query(dataSql, [...params, limit, offset]);

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
    console.error('Error fetching earn data:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
