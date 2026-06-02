const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// Typed API helpers
export async function getDashboardMetrics() {
  return apiFetch<{
    total_products: number;
    avg_net_margin: number;
    watchlist_count: number;
    trending_count: number;
  }>('/api/dashboard/metrics');
}

export async function getDashboardFeed() {
  return apiFetch<ProductWithMarket[]>('/api/dashboard/feed');
}

export async function getProducts(params?: {
  category?: string;
  source?: string;
  min_margin?: string;
  search?: string;
}) {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  return apiFetch<ProductWithMarket[]>(`/api/products${qs}`);
}

export async function getProduct(id: string) {
  return apiFetch<{
    product: Product;
    prices: SupplierPrice[];
    market_data: MarketData[];
    margin: MarginAnalysis | null;
  }>(`/api/products/${id}`);
}

export async function analyseProduct(id: string) {
  return apiFetch<MarginAnalysis>(`/api/products/${id}/analyse`, { method: 'POST' });
}

export async function getSuppliers() {
  return apiFetch<Supplier[]>('/api/suppliers');
}

export async function compareSuppliers(productId: string) {
  return apiFetch<SupplierPrice[]>(`/api/suppliers/compare?productId=${productId}`);
}

export async function getSupplier(id: string) {
  return apiFetch<{ supplier: Supplier; products: Product[] }>(`/api/suppliers/${id}`);
}

export async function getTrending() {
  return apiFetch<ProductWithMarket[]>('/api/market/trending');
}

export async function getOpportunities() {
  return apiFetch<ProductWithMarket[]>('/api/market/opportunities');
}

export async function getMarketAnalysis(productId: string) {
  return apiFetch<{
    product: Product;
    market_data: MarketData[];
    similar_products: ProductWithMarket[];
  }>(`/api/market/${productId}`);
}

export async function getMargins() {
  return apiFetch<(MarginAnalysis & { product_title: string; product_category: string })[]>('/api/margins');
}

export async function getTopMargins() {
  return apiFetch<(MarginAnalysis & { product_title: string; product_category: string })[]>('/api/margins/top');
}

export async function calculateMargin(data: {
  supplier_price: number;
  shipping_cost: number;
  selling_price: number;
  platform?: string;
  ad_spend?: number;
}) {
  return apiFetch<MarginCalculation>('/api/margins/calculate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWatchlist() {
  return apiFetch<WatchlistItemFull[]>('/api/watchlist');
}

export async function addToWatchlist(productId: string, notes?: string) {
  return apiFetch<WatchlistItem>('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, notes }),
  });
}

export async function updateWatchlistItem(id: string, data: { stage?: string; notes?: string }) {
  return apiFetch<WatchlistItem>(`/api/watchlist/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeFromWatchlist(id: string) {
  return apiFetch<void>(`/api/watchlist/${id}`, { method: 'DELETE' });
}

export async function getReports() {
  return apiFetch<Report[]>('/api/reports');
}

export async function generateReport(productId: string) {
  return apiFetch<Report>('/api/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function deleteReport(id: string) {
  return apiFetch<void>(`/api/reports/${id}`, { method: 'DELETE' });
}

// ── Messaging ──────────────────────────────────────────────────────────────

export async function getThreads() {
  return apiFetch<SupplierThread[]>('/api/threads');
}

export async function getThread(id: string) {
  return apiFetch<{ thread: SupplierThread; messages: SupplierMessage[] }>(`/api/threads/${id}`);
}

export async function getSupplierThreads(supplierId: string) {
  return apiFetch<SupplierThread[]>(`/api/suppliers/${supplierId}/threads`);
}

export async function createThread(data: {
  supplier_id: string;
  product_id?: string;
  subject: string;
  body: string;
  sent_via?: string;
}) {
  return apiFetch<SupplierThread>('/api/threads', { method: 'POST', body: JSON.stringify(data) });
}

export async function replyToThread(id: string, body: string, direction: 'outbound' | 'inbound', sent_via?: string) {
  return apiFetch<SupplierMessage>(`/api/threads/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body, direction, sent_via }),
  });
}

export async function updateThreadStatus(id: string, status: string) {
  return apiFetch<SupplierThread>(`/api/threads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteThread(id: string) {
  return apiFetch<void>(`/api/threads/${id}`, { method: 'DELETE' });
}

export async function sendThreadEmail(id: string, body: string) {
  return apiFetch<{ sent: boolean; mailto?: string }>(`/api/threads/${id}/send-email`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function getOrders() {
  return apiFetch<(PurchaseOrder & { supplier_name: string; item_count: number })[]>('/api/orders');
}

export async function getOrder(id: string) {
  return apiFetch<PurchaseOrder & { supplier_name: string; items: PurchaseOrderItem[] }>(`/api/orders/${id}`);
}

export async function createOrder(data: {
  supplier_id: string;
  items: Array<{
    product_id: string;
    product_title: string;
    sku?: string;
    quantity: number;
    unit_price: number;
    shipping_cost?: number;
  }>;
  notes?: string;
  shipping_address?: Record<string, string>;
  thread_id?: string;
}) {
  return apiFetch<PurchaseOrder>('/api/orders', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateOrder(id: string, data: {
  status?: string;
  tracking_number?: string;
  tracking_url?: string;
  notes?: string;
  expected_ship_date?: string;
}) {
  return apiFetch<PurchaseOrder>(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteOrder(id: string) {
  return apiFetch<void>(`/api/orders/${id}`, { method: 'DELETE' });
}

export async function sendOrder(id: string) {
  return apiFetch<PurchaseOrder>(`/api/orders/${id}/send`, { method: 'POST' });
}

export async function confirmOrder(id: string) {
  return apiFetch<PurchaseOrder>(`/api/orders/${id}/confirm`, { method: 'POST' });
}

export async function addOrderItem(poId: string, item: {
  product_id: string;
  product_title: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  shipping_cost?: number;
}) {
  return apiFetch<PurchaseOrderItem>(`/api/orders/${poId}/items`, { method: 'POST', body: JSON.stringify(item) });
}

export async function removeOrderItem(poId: string, itemId: string) {
  return apiFetch<void>(`/api/orders/${poId}/items/${itemId}`, { method: 'DELETE' });
}

// Types
export interface Product {
  id: string;
  source: string;
  source_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  images: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProductWithMarket extends Product {
  net_margin_pct?: number;
  verdict?: string;
  market_price?: number;
  trend_direction?: string;
  search_volume?: number;
  supplier_price?: number;
  shipping_cost?: number;
  net_profit?: number;
  monthly_sales_estimate?: number;
  competitor_count?: number;
  trend_data?: TrendPoint[];
}

export interface Supplier {
  id: string;
  name: string;
  platform: string;
  country: string | null;
  rating: number | null;
  review_count: number;
  response_time_hours: number | null;
  ships_from: string | null;
  ships_to: string[];
  certifications: string[];
  categories: string[];
  url: string | null;
  verified: boolean;
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_wechat: string | null;
  contact_notes: string | null;
  last_contacted: string | null;
  created_at: string;
}

export interface SupplierThread {
  id: string;
  supplier_id: string;
  product_id: string | null;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  // joined fields
  supplier_name?: string;
  contact_email?: string;
  contact_whatsapp?: string;
  product_title?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
}

export interface SupplierMessage {
  id: string;
  thread_id: string;
  direction: 'outbound' | 'inbound';
  body: string;
  sender_name: string | null;
  read: boolean;
  sent_via: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  thread_id: string | null;
  status: string;
  currency: string;
  subtotal: number;
  shipping_total: number;
  total: number;
  shipping_address: Record<string, string>;
  notes: string | null;
  expected_ship_date: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  supplier_name?: string;
  contact_email?: string;
  contact_whatsapp?: string;
  item_count?: number;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  product_id: string;
  product_title: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  shipping_cost: number;
  total: number;
  notes: string | null;
}

export interface SupplierPrice {
  id: string;
  product_id: string;
  supplier_id: string;
  supplier_price: number | null;
  shipping_cost: number | null;
  processing_days: number | null;
  shipping_days: number | null;
  moq: number;
  bulk_tiers: BulkTier[];
  currency: string;
  last_checked: string;
  supplier_name: string;
  supplier_platform: string;
  supplier_rating: number;
  total_cost?: number;
}

export interface BulkTier {
  qty: number;
  price: number;
}

export interface MarketData {
  id: string;
  product_id: string;
  platform: string;
  market_price: number | null;
  competitor_count: number | null;
  avg_reviews: number | null;
  best_seller_rank: number | null;
  monthly_sales_estimate: number | null;
  search_volume: number | null;
  trend_direction: string | null;
  trend_data: TrendPoint[];
  scraped_at: string;
}

export interface TrendPoint {
  month: string;
  volume: number;
}

export interface MarginAnalysis {
  id: string;
  product_id: string;
  supplier_price: number | null;
  shipping_cost: number | null;
  platform_fee_pct: number | null;
  payment_fee_pct: number | null;
  ad_spend_estimate: number | null;
  return_rate_pct: number | null;
  selling_price: number | null;
  gross_profit: number | null;
  gross_margin_pct: number | null;
  net_profit: number | null;
  net_margin_pct: number | null;
  roi_pct: number | null;
  break_even_units: number | null;
  verdict: string | null;
  ai_analysis: string | null;
  created_at: string;
}

export interface MarginCalculation {
  supplier_price: number;
  shipping_cost: number;
  platform_fee_pct: number;
  payment_fee_pct: number;
  ad_spend_estimate: number;
  return_rate_pct: number;
  selling_price: number;
  gross_profit: number;
  gross_margin_pct: number;
  net_profit: number;
  net_margin_pct: number;
  roi_pct: number;
  break_even_units: number;
  verdict: string;
}

export interface WatchlistItem {
  id: string;
  product_id: string;
  notes: string | null;
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface WatchlistItemFull extends WatchlistItem {
  product_title: string;
  product_category: string;
  product_source: string;
  trend_direction: string | null;
  net_margin_pct: number | null;
  verdict: string | null;
}

export interface Report {
  id: string;
  report_type: string;
  title: string;
  content: string | null;
  product_id: string | null;
  created_at: string;
}
