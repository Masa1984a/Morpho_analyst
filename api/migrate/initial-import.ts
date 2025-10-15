/**
 * Manual Initial Data Import API Endpoint
 * Can be triggered manually to import existing JSON data
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { migrate } from '../../scripts/migrate-data';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Simple authentication check
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.MIGRATION_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting initial data migration...');
    await migrate();

    return res.status(200).json({
      success: true,
      message: 'Initial data migration completed successfully',
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Migration error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date().toISOString(),
    });
  }
}
