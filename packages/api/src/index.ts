import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const loaded = config({ path: resolve(__dir, '../../../.env') });
if (loaded.error || !process.env.DATABASE_URL) config({ path: resolve(__dir, '../../.env') });

import Fastify from 'fastify';
import { productsRoutes } from './routes/products.js';
import { suppliersRoutes } from './routes/suppliers.js';
import { marketRoutes } from './routes/market.js';
import { marginsRoutes } from './routes/margins.js';
import { watchlistRoutes } from './routes/watchlist.js';
import { reportsRoutes } from './routes/reports.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { shopifyRoutes } from './routes/shopify.js';

const fastify = Fastify({ logger: true });

// CORS
fastify.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (request.method === 'OPTIONS') {
    await reply.status(204).send();
  }
});

// Register routes
await fastify.register(productsRoutes);
await fastify.register(suppliersRoutes);
await fastify.register(marketRoutes);
await fastify.register(marginsRoutes);
await fastify.register(watchlistRoutes);
await fastify.register(reportsRoutes);
await fastify.register(dashboardRoutes);
await fastify.register(shopifyRoutes);

// Health check
fastify.get('/health', async () => ({ status: 'ok', service: 'dropintel-api' }));

const port = parseInt(process.env.PORT ?? '3002', 10);

try {
  await fastify.listen({ port, host: '0.0.0.0' });
  console.log(`DropIntel API running on port ${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
