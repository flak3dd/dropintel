import type { FastifyInstance } from 'fastify';
import { query, queryOne } from '../services/db.js';

export async function ordersRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/orders
  fastify.get('/api/orders', async (_request, reply) => {
    const rows = await query(
      `SELECT po.*, s.name as supplier_name, s.contact_email,
              COUNT(poi.id)::int as item_count
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       LEFT JOIN purchase_order_items poi ON poi.po_id = po.id
       GROUP BY po.id, s.name, s.contact_email
       ORDER BY po.created_at DESC`
    );
    return reply.send(rows);
  });

  // GET /api/orders/:id
  fastify.get('/api/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const po = await queryOne(
      `SELECT po.*, s.name as supplier_name, s.contact_email, s.contact_whatsapp
       FROM purchase_orders po
       JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`,
      [id]
    );
    if (!po) return reply.status(404).send({ error: 'Order not found' });

    const items = await query(
      `SELECT * FROM purchase_order_items WHERE po_id = $1 ORDER BY id`,
      [id]
    );

    return reply.send({ ...po, items });
  });

  // POST /api/orders
  fastify.post('/api/orders', async (request, reply) => {
    const { supplier_id, items, notes, shipping_address, thread_id } = request.body as {
      supplier_id: string;
      items: Array<{
        product_id: string;
        product_title: string;
        sku?: string;
        quantity: number;
        unit_price: number;
        shipping_cost?: number;
        notes?: string;
      }>;
      notes?: string;
      shipping_address?: object;
      thread_id?: string;
    };

    if (!supplier_id || !items || items.length === 0) {
      return reply.status(400).send({ error: 'supplier_id and items are required' });
    }

    const poNumRow = await queryOne<{ nextval: string }>(
      `SELECT nextval('po_number_seq')::text`
    );
    const year = new Date().getFullYear();
    const poNumber = `PO-${year}-${String(poNumRow?.nextval ?? '1').padStart(4, '0')}`;

    let subtotal = 0;
    let shippingTotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unit_price;
      shippingTotal += item.shipping_cost ?? 0;
    }
    const total = subtotal + shippingTotal;

    const po = await queryOne<{ id: string }>(
      `INSERT INTO purchase_orders (po_number, supplier_id, thread_id, status, subtotal, shipping_total, total, notes, shipping_address)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8)
       RETURNING *`,
      [poNumber, supplier_id, thread_id ?? null, subtotal, shippingTotal, total, notes ?? null, JSON.stringify(shipping_address ?? {})]
    );

    if (!po) return reply.status(500).send({ error: 'Failed to create order' });

    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price;
      await query(
        `INSERT INTO purchase_order_items (po_id, product_id, product_title, sku, quantity, unit_price, shipping_cost, total, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [po.id, item.product_id, item.product_title, item.sku ?? null, item.quantity, item.unit_price, item.shipping_cost ?? 0, lineTotal, item.notes ?? null]
      );
    }

    const full = await queryOne(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id WHERE po.id = $1`,
      [po.id]
    );

    return reply.status(201).send(full);
  });

  // PATCH /api/orders/:id
  fastify.patch('/api/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, tracking_number, tracking_url, notes, expected_ship_date } = request.body as {
      status?: string;
      tracking_number?: string;
      tracking_url?: string;
      notes?: string;
      expected_ship_date?: string;
    };

    const po = await queryOne(
      `UPDATE purchase_orders
       SET status = COALESCE($2, status),
           tracking_number = COALESCE($3, tracking_number),
           tracking_url = COALESCE($4, tracking_url),
           notes = COALESCE($5, notes),
           expected_ship_date = COALESCE($6::date, expected_ship_date),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status ?? null, tracking_number ?? null, tracking_url ?? null, notes ?? null, expected_ship_date ?? null]
    );

    if (!po) return reply.status(404).send({ error: 'Order not found' });
    return reply.send(po);
  });

  // DELETE /api/orders/:id
  fastify.delete('/api/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const po = await queryOne<{ status: string }>(`SELECT status FROM purchase_orders WHERE id = $1`, [id]);
    if (!po) return reply.status(404).send({ error: 'Order not found' });
    if (po.status !== 'draft') return reply.status(400).send({ error: 'Only draft orders can be deleted' });

    await query(`DELETE FROM purchase_orders WHERE id = $1`, [id]);
    return reply.status(204).send();
  });

  // POST /api/orders/:id/send
  fastify.post('/api/orders/:id/send', async (request, reply) => {
    const { id } = request.params as { id: string };
    const po = await queryOne(
      `UPDATE purchase_orders SET status = 'sent', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!po) return reply.status(404).send({ error: 'Order not found' });
    return reply.send(po);
  });

  // POST /api/orders/:id/confirm
  fastify.post('/api/orders/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string };
    const po = await queryOne(
      `UPDATE purchase_orders SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!po) return reply.status(404).send({ error: 'Order not found' });
    return reply.send(po);
  });

  // POST /api/orders/:id/items
  fastify.post('/api/orders/:id/items', async (request, reply) => {
    const { id } = request.params as { id: string };
    const po = await queryOne<{ status: string }>(`SELECT status FROM purchase_orders WHERE id = $1`, [id]);
    if (!po) return reply.status(404).send({ error: 'Order not found' });
    if (po.status !== 'draft') return reply.status(400).send({ error: 'Can only add items to draft orders' });

    const { product_id, product_title, sku, quantity, unit_price, shipping_cost, notes } = request.body as {
      product_id: string;
      product_title: string;
      sku?: string;
      quantity: number;
      unit_price: number;
      shipping_cost?: number;
      notes?: string;
    };

    const lineTotal = quantity * unit_price;
    const item = await queryOne(
      `INSERT INTO purchase_order_items (po_id, product_id, product_title, sku, quantity, unit_price, shipping_cost, total, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, product_id, product_title, sku ?? null, quantity, unit_price, shipping_cost ?? 0, lineTotal, notes ?? null]
    );

    // Recalculate totals
    await query(
      `UPDATE purchase_orders
       SET subtotal = (SELECT COALESCE(SUM(total), 0) FROM purchase_order_items WHERE po_id = $1),
           shipping_total = (SELECT COALESCE(SUM(shipping_cost), 0) FROM purchase_order_items WHERE po_id = $1),
           total = (SELECT COALESCE(SUM(total + shipping_cost), 0) FROM purchase_order_items WHERE po_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    return reply.status(201).send(item);
  });

  // DELETE /api/orders/:id/items/:itemId
  fastify.delete('/api/orders/:id/items/:itemId', async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const po = await queryOne<{ status: string }>(`SELECT status FROM purchase_orders WHERE id = $1`, [id]);
    if (!po) return reply.status(404).send({ error: 'Order not found' });
    if (po.status !== 'draft') return reply.status(400).send({ error: 'Can only remove items from draft orders' });

    await query(`DELETE FROM purchase_order_items WHERE id = $1 AND po_id = $2`, [itemId, id]);

    // Recalculate totals
    await query(
      `UPDATE purchase_orders
       SET subtotal = (SELECT COALESCE(SUM(total), 0) FROM purchase_order_items WHERE po_id = $1),
           shipping_total = (SELECT COALESCE(SUM(shipping_cost), 0) FROM purchase_order_items WHERE po_id = $1),
           total = (SELECT COALESCE(SUM(total + shipping_cost), 0) FROM purchase_order_items WHERE po_id = $1),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    return reply.status(204).send();
  });
}
