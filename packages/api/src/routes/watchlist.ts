import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import type { WatchlistItem } from '../types.js';

export async function watchlistRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/watchlist
  fastify.get('/api/watchlist', async (_request, reply) => {
    const rows = await query(
      `SELECT w.*, p.title as product_title, p.category as product_category,
              p.source as product_source, md.trend_direction, ma.net_margin_pct, ma.verdict
       FROM watchlist w
       JOIN products p ON p.id = w.product_id
       LEFT JOIN market_data md ON md.product_id = p.id AND md.platform = 'amazon_au'
       LEFT JOIN margin_analyses ma ON ma.product_id = p.id
       ORDER BY w.updated_at DESC`
    );
    return reply.send(rows);
  });

  // POST /api/watchlist
  fastify.post('/api/watchlist', async (request, reply) => {
    const body = request.body as { product_id: string; notes?: string; stage?: string };
    if (!body.product_id) return reply.status(400).send({ error: 'product_id is required' });

    const existing = await queryOne(
      'SELECT id FROM watchlist WHERE product_id = $1',
      [body.product_id]
    );
    if (existing) return reply.status(409).send({ error: 'Product already in watchlist' });

    const row = await queryOne<WatchlistItem>(
      `INSERT INTO watchlist (product_id, notes, stage) VALUES ($1, $2, $3) RETURNING *`,
      [body.product_id, body.notes ?? null, body.stage ?? 'watching']
    );
    return reply.status(201).send(row);
  });

  // PATCH /api/watchlist/:id
  fastify.patch('/api/watchlist/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { notes?: string; stage?: string };

    const row = await queryOne<WatchlistItem>(
      `UPDATE watchlist SET notes = COALESCE($1, notes), stage = COALESCE($2, stage), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [body.notes ?? null, body.stage ?? null, id]
    );
    if (!row) return reply.status(404).send({ error: 'Watchlist item not found' });
    return reply.send(row);
  });

  // DELETE /api/watchlist/:id
  fastify.delete('/api/watchlist/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await query('DELETE FROM watchlist WHERE id = $1', [id]);
    return reply.status(204).send();
  });
}
