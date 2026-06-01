import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import { generateProductReport } from '../services/ai.js';
import type { Report, Product, MarginAnalysis } from '../types.js';

export async function reportsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/reports
  fastify.get('/api/reports', async (_request, reply) => {
    const rows = await query<Report>('SELECT * FROM reports ORDER BY created_at DESC');
    return reply.send(rows);
  });

  // POST /api/reports/generate
  fastify.post('/api/reports/generate', async (request, reply) => {
    const body = request.body as { product_id: string; report_type?: string };
    if (!body.product_id) return reply.status(400).send({ error: 'product_id is required' });

    const product = await queryOne<Product>('SELECT * FROM products WHERE id = $1', [body.product_id]);
    if (!product) return reply.status(404).send({ error: 'Product not found' });

    const margin = await queryOne<MarginAnalysis>(
      'SELECT * FROM margin_analyses WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
      [body.product_id]
    );

    const analysisText = margin?.ai_analysis ?? `Net margin: ${margin?.net_margin_pct ?? 'N/A'}%`;
    const content = await generateProductReport(product, analysisText);

    const report = await queryOne<Report>(
      `INSERT INTO reports (report_type, title, content, product_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        body.report_type ?? 'product_analysis',
        `${product.title} — Opportunity Report`,
        content,
        body.product_id,
      ]
    );

    return reply.status(201).send(report);
  });

  // DELETE /api/reports/:id
  fastify.delete('/api/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await query('DELETE FROM reports WHERE id = $1', [id]);
    return reply.status(204).send();
  });
}
