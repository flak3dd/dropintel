import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { query, queryOne } from '../services/db.js';
import {
  createShopifyProduct, updateShopifyProduct, archiveShopifyProduct,
  testShopifyConnection, buildShopifyPayload, getShopifyProduct,
} from '../services/shopify.js';
import type { Product, MarginAnalysis } from '../types.js';

interface ShopifyListing {
  id: string;
  product_id: string;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  shopify_handle: string | null;
  status: string;
  selling_price: number | null;
  shopify_url: string | null;
  published_at: string | null;
  last_synced: string;
  created_at: string;
}

export async function shopifyRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /api/shopify/status — connection health check
  fastify.get('/api/shopify/status', async (_req, reply) => {
    const result = await testShopifyConnection();
    return reply.send(result);
  });

  // GET /api/shopify/listings — all listings with product info
  fastify.get('/api/shopify/listings', async (_req, reply) => {
    const rows = await query<ShopifyListing & { title: string; category: string }>(
      `SELECT sl.*, p.title, p.category
       FROM shopify_listings sl
       JOIN products p ON p.id = sl.product_id
       ORDER BY sl.created_at DESC`
    );
    return reply.send(rows);
  });

  // GET /api/shopify/listing/:productId — listing status for a product
  fastify.get('/api/shopify/listing/:productId', async (req, reply) => {
    const { productId } = req.params as { productId: string };
    const listing = await queryOne<ShopifyListing>(
      `SELECT * FROM shopify_listings WHERE product_id = $1`,
      [productId]
    );
    return reply.send(listing ?? { status: 'not_listed' });
  });

  // POST /api/shopify/launch/:productId — single-click launch to Shopify
  fastify.post('/api/shopify/launch/:productId', async (req, reply) => {
    const { productId } = req.params as { productId: string };
    const body = req.body as {
      selling_price?: number;
      status?: 'draft' | 'active';
      compare_at_price?: number;
    };

    // Load product
    const product = await queryOne<Product>(
      `SELECT * FROM products WHERE id = $1`, [productId]
    );
    if (!product) return reply.status(404).send({ error: 'Product not found' });

    // Check for existing listing
    const existing = await queryOne<ShopifyListing>(
      `SELECT * FROM shopify_listings WHERE product_id = $1`, [productId]
    );
    if (existing?.shopify_product_id) {
      return reply.status(409).send({
        error: 'Already listed on Shopify',
        listing: existing,
      });
    }

    // Determine selling price — use provided, or best margin analysis, or fallback
    let sellingPrice = body.selling_price;
    if (!sellingPrice) {
      const margin = await queryOne<MarginAnalysis>(
        `SELECT * FROM margin_analyses WHERE product_id = $1 ORDER BY net_margin_pct DESC LIMIT 1`,
        [productId]
      );
      sellingPrice = Number(margin?.selling_price) || 29.99;
    }

    // Build and push to Shopify
    const payload = buildShopifyPayload({
      title: product.title,
      description: product.description,
      category: product.category,
      tags: (product.tags as unknown as string[]) ?? [],
      images: (product.images as unknown as string[]) ?? [],
      sellingPrice,
      compareAtPrice: body.compare_at_price,
      sku: `DI-${product.source_id ?? product.id.slice(0, 8).toUpperCase()}`,
      source: product.source,
      status: body.status ?? 'draft',
    });

    try {
      const shopifyProduct = await createShopifyProduct(payload);
      const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/https?:\/\//, '').replace(/\/$/, '');
      const shopifyUrl = `https://${domain}/products/${shopifyProduct.handle}`;
      const adminUrl = `https://${domain}/admin/products/${shopifyProduct.id}`;
      const variantId = shopifyProduct.variants?.[0]?.id?.toString() ?? null;
      const now = new Date().toISOString();

      // Store listing record
      await query(
        `INSERT INTO shopify_listings
           (product_id, shopify_product_id, shopify_variant_id, shopify_handle,
            status, selling_price, shopify_url, published_at, last_synced)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          productId,
          shopifyProduct.id.toString(),
          variantId,
          shopifyProduct.handle,
          shopifyProduct.status,
          sellingPrice,
          shopifyUrl,
          shopifyProduct.status === 'active' ? now : null,
          now,
        ]
      );

      return reply.status(201).send({
        success: true,
        shopify_product_id: shopifyProduct.id.toString(),
        shopify_url: shopifyUrl,
        admin_url: adminUrl,
        handle: shopifyProduct.handle,
        status: shopifyProduct.status,
        selling_price: sellingPrice,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: 'Failed to create Shopify product',
        detail: (err as Error).message,
      });
    }
  });

  // PATCH /api/shopify/listing/:productId — update price or status on Shopify
  fastify.patch('/api/shopify/listing/:productId', async (req, reply) => {
    const { productId } = req.params as { productId: string };
    const body = req.body as { selling_price?: number; status?: 'draft' | 'active' | 'archived' };

    const listing = await queryOne<ShopifyListing>(
      `SELECT * FROM shopify_listings WHERE product_id = $1`, [productId]
    );
    if (!listing?.shopify_product_id) {
      return reply.status(404).send({ error: 'No Shopify listing found for this product' });
    }

    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.selling_price) {
      updates.variants = [{ id: listing.shopify_variant_id, price: body.selling_price.toFixed(2) }];
    }

    try {
      const updated = await updateShopifyProduct(listing.shopify_product_id, updates as never);

      await query(
        `UPDATE shopify_listings SET
           status = $1,
           selling_price = COALESCE($2, selling_price),
           last_synced = NOW(),
           published_at = CASE WHEN $1 = 'active' AND published_at IS NULL THEN NOW() ELSE published_at END
         WHERE product_id = $3`,
        [updated.status, body.selling_price ?? null, productId]
      );

      return reply.send({ success: true, status: updated.status, listing });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // DELETE /api/shopify/listing/:productId — archive on Shopify
  fastify.delete('/api/shopify/listing/:productId', async (req, reply) => {
    const { productId } = req.params as { productId: string };

    const listing = await queryOne<ShopifyListing>(
      `SELECT * FROM shopify_listings WHERE product_id = $1`, [productId]
    );
    if (!listing?.shopify_product_id) {
      return reply.status(404).send({ error: 'No Shopify listing found' });
    }

    try {
      await archiveShopifyProduct(listing.shopify_product_id);
      await query(
        `UPDATE shopify_listings SET status = 'archived', last_synced = NOW() WHERE product_id = $1`,
        [productId]
      );
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // POST /api/shopify/sync/:productId — re-sync from Shopify
  fastify.post('/api/shopify/sync/:productId', async (req, reply) => {
    const { productId } = req.params as { productId: string };

    const listing = await queryOne<ShopifyListing>(
      `SELECT * FROM shopify_listings WHERE product_id = $1`, [productId]
    );
    if (!listing?.shopify_product_id) {
      return reply.status(404).send({ error: 'No Shopify listing found' });
    }

    try {
      const shopifyProduct = await getShopifyProduct(listing.shopify_product_id);
      const price = Number(shopifyProduct.variants?.[0]?.price ?? listing.selling_price);

      await query(
        `UPDATE shopify_listings SET status = $1, selling_price = $2, last_synced = NOW() WHERE product_id = $3`,
        [shopifyProduct.status, price, productId]
      );

      return reply.send({ success: true, status: shopifyProduct.status, selling_price: price });
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
