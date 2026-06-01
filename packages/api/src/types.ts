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
  created_at: string;
}

export interface ProductPrice {
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

export interface WatchlistItem {
  id: string;
  product_id: string;
  notes: string | null;
  stage: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  report_type: string;
  title: string;
  content: string | null;
  product_id: string | null;
  created_at: string;
}

export interface DashboardMetrics {
  total_products: number;
  avg_net_margin: number;
  watchlist_count: number;
  trending_count: number;
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
