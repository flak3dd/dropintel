CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  country VARCHAR(100),
  rating NUMERIC(3,2),
  review_count INTEGER DEFAULT 0,
  response_time_hours INTEGER,
  ships_from VARCHAR(100),
  ships_to JSONB DEFAULT '["AU","US","GB","CA"]',
  certifications JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',
  url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(200),
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(200),
  subcategory VARCHAR(200),
  images JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_price NUMERIC(10,2),
  shipping_cost NUMERIC(10,2),
  processing_days INTEGER,
  shipping_days INTEGER,
  moq INTEGER DEFAULT 1,
  bulk_tiers JSONB DEFAULT '[]',
  currency VARCHAR(10) DEFAULT 'AUD',
  last_checked TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  market_price NUMERIC(10,2),
  competitor_count INTEGER,
  avg_reviews NUMERIC(6,1),
  best_seller_rank INTEGER,
  monthly_sales_estimate INTEGER,
  search_volume INTEGER,
  trend_direction VARCHAR(20),
  trend_data JSONB DEFAULT '[]',
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS margin_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_price NUMERIC(10,2),
  shipping_cost NUMERIC(10,2),
  platform_fee_pct NUMERIC(5,2),
  payment_fee_pct NUMERIC(5,2),
  ad_spend_estimate NUMERIC(10,2),
  return_rate_pct NUMERIC(5,2) DEFAULT 5.0,
  selling_price NUMERIC(10,2),
  gross_profit NUMERIC(10,2),
  gross_margin_pct NUMERIC(5,2),
  net_profit NUMERIC(10,2),
  net_margin_pct NUMERIC(5,2),
  roi_pct NUMERIC(5,2),
  break_even_units INTEGER,
  verdict VARCHAR(20),
  ai_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  notes TEXT,
  stage VARCHAR(50) DEFAULT 'watching',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
