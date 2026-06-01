import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import { analyseProductMargin } from '../services/ai.js';
import type { Product, ProductPrice, MarketData, MarginAnalysis, Supplier } from '../types.js';

export async function productsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/products
  fastify.get('/api/products', async (request, reply) => {
    const { category, source, min_margin, search } = request.query as Record<string, string>;

    let sql = `
      SELECT DISTINCT p.*, ma.net_margin_pct, ma.verdict,
        md.market_price, md.trend_direction
      FROM products p
      LEFT JOIN margin_analyses ma ON ma.product_id = p.id
      LEFT JOIN market_data md ON md.product_id = p.id AND md.platform = 'amazon_au'
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let idx = 1;

    if (category) {
      sql += ` AND p.category ILIKE $${idx++}`;
      params.push(`%${category}%`);
    }
    if (source) {
      sql += ` AND p.source = $${idx++}`;
      params.push(source);
    }
    if (min_margin) {
      sql += ` AND ma.net_margin_pct >= $${idx++}`;
      params.push(parseFloat(min_margin));
    }
    if (search) {
      sql += ` AND (p.title ILIKE $${idx} OR p.description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ' ORDER BY p.created_at DESC';

    const rows = await query(sql, params);
    return reply.send(rows);
  });

  // GET /api/products/:id
  fastify.get('/api/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await queryOne<Product>('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) return reply.status(404).send({ error: 'Product not found' });

    const prices = await query<ProductPrice & { supplier_name: string; supplier_platform: string; supplier_rating: number }>(
      `SELECT pp.*, s.name as supplier_name, s.platform as supplier_platform, s.rating as supplier_rating
       FROM product_prices pp
       JOIN suppliers s ON s.id = pp.supplier_id
       WHERE pp.product_id = $1`,
      [id]
    );

    const marketData = await query<MarketData>(
      'SELECT * FROM market_data WHERE product_id = $1 ORDER BY scraped_at DESC',
      [id]
    );

    const margin = await queryOne<MarginAnalysis>(
      'SELECT * FROM margin_analyses WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    return reply.send({ product, prices, market_data: marketData, margin });
  });

  // POST /api/products/:id/analyse
  fastify.post('/api/products/:id/analyse', async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await queryOne<Product>('SELECT * FROM products WHERE id = $1', [id]);
    if (!product) return reply.status(404).send({ error: 'Product not found' });

    const price = await queryOne<ProductPrice>(
      'SELECT * FROM product_prices WHERE product_id = $1 ORDER BY supplier_price ASC LIMIT 1',
      [id]
    );

    const marketRow = await queryOne<MarketData>(
      "SELECT * FROM market_data WHERE product_id = $1 AND platform = 'amazon_au' LIMIT 1",
      [id]
    );

    const supplierPrice = Number(price?.supplier_price ?? 10);
    const shippingCost = Number(price?.shipping_cost ?? 5);
    const marketPrice = Number(marketRow?.market_price ?? 30);

    const aiText = await analyseProductMargin(product, supplierPrice, shippingCost, marketPrice, 'ebay_au');

    const PLATFORM_FEES: Record<string, number> = {
      ebay_au: 0.13, amazon_au: 0.15, shopify: 0.02, etsy: 0.065, woocommerce: 0.029,
    };
    const platformFeePct = (PLATFORM_FEES['ebay_au'] ?? 0.13) * 100;
    const paymentFeePct = 2.9;
    const cogs = supplierPrice + shippingCost;
    const fee = marketPrice * (PLATFORM_FEES['ebay_au'] ?? 0.13);
    const payment = marketPrice * 0.029;
    const grossProfit = marketPrice - cogs;
    const netProfit = marketPrice - cogs - fee - payment;
    const grossMarginPct = (grossProfit / marketPrice) * 100;
    const netMarginPct = (netProfit / marketPrice) * 100;
    const roiPct = cogs > 0 ? (netProfit / cogs) * 100 : 0;
    const breakEvenUnits = netProfit > 0 ? Math.ceil(10 / netProfit) : 99;

    let verdict = 'poor';
    if (netMarginPct >= 35) verdict = 'excellent';
    else if (netMarginPct >= 25) verdict = 'good';
    else if (netMarginPct >= 15) verdict = 'marginal';

    const saved = await queryOne<MarginAnalysis>(
      `INSERT INTO margin_analyses (product_id, supplier_price, shipping_cost, platform_fee_pct, payment_fee_pct,
        ad_spend_estimate, return_rate_pct, selling_price, gross_profit, gross_margin_pct,
        net_profit, net_margin_pct, roi_pct, break_even_units, verdict, ai_analysis)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [id, supplierPrice, shippingCost, platformFeePct, paymentFeePct,
        0, 5.0, marketPrice, grossProfit.toFixed(2), grossMarginPct.toFixed(2),
        netProfit.toFixed(2), netMarginPct.toFixed(2), roiPct.toFixed(2), breakEvenUnits, verdict, aiText]
    );

    return reply.send(saved);
  });
}
