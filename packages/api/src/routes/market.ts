import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import type { MarketData, Product } from '../types.js';

export async function marketRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/market/trending
  fastify.get('/api/market/trending', async (_request, reply) => {
    const rows = await query(
      `SELECT p.*, md.market_price, md.search_volume, md.trend_direction,
              md.monthly_sales_estimate, md.competitor_count, md.trend_data
       FROM products p
       JOIN market_data md ON md.product_id = p.id
       WHERE md.trend_direction IN ('rising','stable')
       ORDER BY md.search_volume DESC NULLS LAST
       LIMIT 20`
    );
    return reply.send(rows);
  });

  // GET /api/market/opportunities
  fastify.get('/api/market/opportunities', async (_request, reply) => {
    const rows = await query(
      `SELECT p.*, md.market_price, md.search_volume, md.trend_direction,
              ma.net_margin_pct, ma.verdict, ma.net_profit
       FROM products p
       JOIN market_data md ON md.product_id = p.id AND md.platform = 'amazon_au'
       JOIN margin_analyses ma ON ma.product_id = p.id
       WHERE md.trend_direction = 'rising'
         AND ma.net_margin_pct > 30
       ORDER BY ma.net_margin_pct DESC`
    );
    return reply.send(rows);
  });

  // GET /api/market/:productId
  fastify.get('/api/market/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string };

    const product = await queryOne<Product>('SELECT * FROM products WHERE id = $1', [productId]);
    if (!product) return reply.status(404).send({ error: 'Product not found' });

    const marketData = await query<MarketData>(
      'SELECT * FROM market_data WHERE product_id = $1 ORDER BY scraped_at DESC',
      [productId]
    );

    const similar = await query(
      `SELECT p.title, md.market_price, md.competitor_count, md.trend_direction
       FROM products p
       JOIN market_data md ON md.product_id = p.id
       WHERE p.category = $1 AND p.id != $2
       LIMIT 5`,
      [product.category, productId]
    );

    return reply.send({ product, market_data: marketData, similar_products: similar });
  });
}
