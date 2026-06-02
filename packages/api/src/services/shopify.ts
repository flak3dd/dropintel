/**
 * Shopify Admin API service.
 * Uses the REST Admin API (2024-10) to create/update/manage products.
 *
 * Required env vars:
 *   SHOPIFY_STORE_DOMAIN  — e.g. my-store.myshopify.com
 *   SHOPIFY_ACCESS_TOKEN  — Admin API access token (starts with shpat_)
 */

export interface ShopifyProductPayload {
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  status: 'draft' | 'active' | 'archived';
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

export interface ShopifyVariant {
  price: string;
  compare_at_price?: string;
  sku?: string;
  inventory_management?: 'shopify' | null;
  inventory_quantity?: number;
  fulfillment_service?: string;
  requires_shipping?: boolean;
  weight?: number;
  weight_unit?: string;
}

export interface ShopifyImage {
  src?: string;
  alt?: string;
}

export interface ShopifyProductResponse {
  id: number;
  title: string;
  handle: string;
  status: string;
  variants: Array<{ id: number; price: string }>;
  admin_graphql_api_id: string;
}

function getConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/https?:\/\//, '').replace(/\/$/, '');
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!domain || !token) {
    throw new Error('Shopify not configured. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN in .env');
  }
  return { domain, token };
}

async function shopifyFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const { domain, token } = getConfig();
  const url = `https://${domain}/admin/api/2024-10${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** Create a new product on Shopify. Returns the created product. */
export async function createShopifyProduct(
  payload: ShopifyProductPayload
): Promise<ShopifyProductResponse> {
  const data = await shopifyFetch('/products.json', {
    method: 'POST',
    body: JSON.stringify({ product: payload }),
  }) as { product: ShopifyProductResponse };
  return data.product;
}

/** Update an existing Shopify product. */
export async function updateShopifyProduct(
  shopifyProductId: string,
  payload: Partial<ShopifyProductPayload>
): Promise<ShopifyProductResponse> {
  const data = await shopifyFetch(`/products/${shopifyProductId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: payload }),
  }) as { product: ShopifyProductResponse };
  return data.product;
}

/** Get a single Shopify product by ID. */
export async function getShopifyProduct(shopifyProductId: string): Promise<ShopifyProductResponse> {
  const data = await shopifyFetch(`/products/${shopifyProductId}.json`) as { product: ShopifyProductResponse };
  return data.product;
}

/** Archive (soft-delete) a Shopify product. */
export async function archiveShopifyProduct(shopifyProductId: string): Promise<void> {
  await shopifyFetch(`/products/${shopifyProductId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ product: { id: shopifyProductId, status: 'archived' } }),
  });
}

/** Check if Shopify credentials are configured and valid. */
export async function testShopifyConnection(): Promise<{ connected: boolean; shop?: string; error?: string }> {
  try {
    const { domain } = getConfig();
    const data = await shopifyFetch('/shop.json') as { shop: { name: string; domain: string } };
    return { connected: true, shop: data.shop.name };
  } catch (err) {
    return { connected: false, error: (err as Error).message };
  }
}

/** Build a Shopify product payload from a DropIntel product + pricing data. */
export function buildShopifyPayload(opts: {
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  images: string[];
  sellingPrice: number;
  compareAtPrice?: number;
  sku?: string;
  source?: string;
  status?: 'draft' | 'active';
}): ShopifyProductPayload {
  const {
    title, description, category, tags, images,
    sellingPrice, compareAtPrice, sku, source, status = 'draft',
  } = opts;

  return {
    title,
    body_html: description
      ? `<p>${description.replace(/\n/g, '</p><p>')}</p>`
      : `<p>${title}</p>`,
    vendor: source ? source.charAt(0).toUpperCase() + source.slice(1) : 'DropIntel',
    product_type: category ?? '',
    tags: tags.join(', '),
    status,
    variants: [
      {
        price: sellingPrice.toFixed(2),
        compare_at_price: compareAtPrice ? compareAtPrice.toFixed(2) : undefined,
        sku: sku ?? undefined,
        inventory_management: 'shopify',
        inventory_quantity: 99,
        fulfillment_service: 'manual',
        requires_shipping: true,
      },
    ],
    images: images.slice(0, 10).map((src) => ({ src, alt: title })),
  };
}
