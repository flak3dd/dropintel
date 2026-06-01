import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import type { MarginAnalysis, MarginCalculation } from '../types.js';

const PLATFORM_FEES: Record<string, number> = {
  ebay_au: 0.13,
  amazon_au: 0.15,
  shopify: 0.02,
  etsy: 0.065,
  woocommerce: 0.029,
};

function computeMargin(
  supplierPrice: number,
  shippingCost: number,
  sellingPrice: number,
  platform: string,
  adSpend = 0,
  returnRatePct = 5.0
): MarginCalculation {
  const fee = sellingPrice * (PLATFORM_FEES[platform] ?? 0.13);
  const payment = sellingPrice * 0.029;
  const cogs = supplierPrice + shippingCost;
  const grossProfit = sellingPrice - cogs;
  const netProfit = sellingPrice - cogs - fee - payment - adSpend;
  const grossMarginPct = (grossProfit / sellingPrice) * 100;
  const netMarginPct = (netProfit / sellingPrice) * 100;
  const roiPct = cogs > 0 ? (netProfit / cogs) * 100 : 0;
  const breakEvenUnits = netProfit > 0 ? Math.ceil(100 / netProfit) : 999;

  let verdict = 'poor';
  if (netMarginPct >= 35) verdict = 'excellent';
  else if (netMarginPct >= 25) verdict = 'good';
  else if (netMarginPct >= 15) verdict = 'marginal';

  return {
    supplier_price: supplierPrice,
    shipping_cost: shippingCost,
    platform_fee_pct: (PLATFORM_FEES[platform] ?? 0.13) * 100,
    payment_fee_pct: 2.9,
    ad_spend_estimate: adSpend,
    return_rate_pct: returnRatePct,
    selling_price: sellingPrice,
    gross_profit: parseFloat(grossProfit.toFixed(2)),
    gross_margin_pct: parseFloat(grossMarginPct.toFixed(2)),
    net_profit: parseFloat(netProfit.toFixed(2)),
    net_margin_pct: parseFloat(netMarginPct.toFixed(2)),
    roi_pct: parseFloat(roiPct.toFixed(2)),
    break_even_units: breakEvenUnits,
    verdict,
  };
}

export async function marginsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/margins
  fastify.get('/api/margins', async (_request, reply) => {
    const rows = await query(
      `SELECT ma.*, p.title as product_title, p.category as product_category
       FROM margin_analyses ma
       JOIN products p ON p.id = ma.product_id
       ORDER BY ma.net_margin_pct DESC NULLS LAST`
    );
    return reply.send(rows);
  });

  // GET /api/margins/top
  fastify.get('/api/margins/top', async (_request, reply) => {
    const rows = await query(
      `SELECT ma.*, p.title as product_title, p.category as product_category
       FROM margin_analyses ma
       JOIN products p ON p.id = ma.product_id
       ORDER BY ma.net_margin_pct DESC NULLS LAST
       LIMIT 10`
    );
    return reply.send(rows);
  });

  // POST /api/margins/calculate
  fastify.post('/api/margins/calculate', async (request, reply) => {
    const body = request.body as {
      supplier_price: number;
      shipping_cost: number;
      selling_price: number;
      platform?: string;
      ad_spend?: number;
      return_rate_pct?: number;
    };

    if (!body.supplier_price || !body.shipping_cost || !body.selling_price) {
      return reply.status(400).send({ error: 'supplier_price, shipping_cost, selling_price are required' });
    }

    const result = computeMargin(
      body.supplier_price,
      body.shipping_cost,
      body.selling_price,
      body.platform ?? 'ebay_au',
      body.ad_spend ?? 0,
      body.return_rate_pct ?? 5.0
    );

    return reply.send(result);
  });
}
