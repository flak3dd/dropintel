import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import type { DashboardMetrics } from '../types.js';

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/dashboard/metrics
  fastify.get('/api/dashboard/metrics', async (_request, reply) => {
    const [totalProducts, avgMargin, watchlistCount, trendingCount] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM products'),
      queryOne<{ avg: string }>('SELECT AVG(net_margin_pct)::numeric(5,2)::text as avg FROM margin_analyses'),
      queryOne<{ count: string }>('SELECT COUNT(*)::text as count FROM watchlist'),
      queryOne<{ count: string }>(
        "SELECT COUNT(DISTINCT product_id)::text as count FROM market_data WHERE trend_direction = 'rising'"
      ),
    ]);

    const metrics: DashboardMetrics = {
      total_products: parseInt(totalProducts?.count ?? '0'),
      avg_net_margin: parseFloat(avgMargin?.avg ?? '0'),
      watchlist_count: parseInt(watchlistCount?.count ?? '0'),
      trending_count: parseInt(trendingCount?.count ?? '0'),
    };

    return reply.send(metrics);
  });

  // GET /api/dashboard/feed
  fastify.get('/api/dashboard/feed', async (_request, reply) => {
    const rows = await query(
      `SELECT p.*, ma.net_margin_pct, ma.net_profit, ma.verdict, ma.ai_analysis,
              md.market_price, md.search_volume, md.trend_direction,
              pp.supplier_price, pp.shipping_cost
       FROM products p
       JOIN margin_analyses ma ON ma.product_id = p.id
       JOIN market_data md ON md.product_id = p.id AND md.platform = 'amazon_au'
       LEFT JOIN LATERAL (
         SELECT supplier_price, shipping_cost FROM product_prices
         WHERE product_id = p.id ORDER BY supplier_price ASC LIMIT 1
       ) pp ON true
       WHERE ma.verdict IN ('excellent', 'good')
       ORDER BY ma.net_margin_pct DESC NULLS LAST
       LIMIT 12`
    );
    return reply.send(rows);
  });
}
