import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';
import type { Supplier, ProductPrice, Product } from '../types.js';

export async function suppliersRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/suppliers
  fastify.get('/api/suppliers', async (_request, reply) => {
    const rows = await query<Supplier>('SELECT * FROM suppliers ORDER BY rating DESC');
    return reply.send(rows);
  });

  // GET /api/suppliers/compare?productId=
  fastify.get('/api/suppliers/compare', async (request, reply) => {
    const { productId } = request.query as { productId?: string };
    if (!productId) return reply.status(400).send({ error: 'productId is required' });

    const rows = await query(
      `SELECT pp.*, s.name as supplier_name, s.platform as supplier_platform,
              s.rating as supplier_rating, s.ships_from, s.verified,
              (pp.supplier_price + pp.shipping_cost) as total_cost
       FROM product_prices pp
       JOIN suppliers s ON s.id = pp.supplier_id
       WHERE pp.product_id = $1
       ORDER BY total_cost ASC`,
      [productId]
    );
    return reply.send(rows);
  });

  // GET /api/suppliers/:id
  fastify.get('/api/suppliers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const supplier = await queryOne<Supplier>('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (!supplier) return reply.status(404).send({ error: 'Supplier not found' });

    const products = await query(
      `SELECT p.*, pp.supplier_price, pp.shipping_cost, pp.moq
       FROM products p
       JOIN product_prices pp ON pp.product_id = p.id
       WHERE pp.supplier_id = $1`,
      [id]
    );

    return reply.send({ supplier, products });
  });
}
