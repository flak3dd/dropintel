# DropIntel

> AI-powered dropshipping market intelligence platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Fastify](https://img.shields.io/badge/Fastify-5-green)](https://fastify.dev)
[![Gemini](https://img.shields.io/badge/Gemini-2.5-blue)](https://ai.google.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue)](https://postgresql.org)

DropIntel helps dropshippers find winning products, compare supplier prices, analyse market demand, and calculate real profit margins — all from one dashboard.

## Features

- **Product Discovery** — track products across AliExpress, CJdropshipping, Amazon AU, Etsy
- **Supplier Price Comparison** — compare all suppliers for any product side-by-side
- **Market Intelligence** — search volume, trend direction, competitor count per platform
- **Margin Analyser** — real-time margin calculator with platform fee breakdowns (eBay, Amazon, Shopify, Etsy)
- **AI Analysis** — Gemini-powered winning product scores and profit recommendations
- **Watchlist** — Kanban pipeline: Watching → Testing → Scaling → Dropped
- **Opportunity Feed** — products ranked by net margin and rising trend

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, Tailwind CSS, TypeScript |
| Backend | Fastify 5, TypeScript, Node 22 |
| AI | Google Gemini 2.5 Flash Lite |
| Database | PostgreSQL 17 |
| Crawler | Python, Playwright |

## Quick Start

```bash
git clone https://github.com/flak3dd/dropintel
cd dropintel
cp .env.example .env
# Add your GOOGLE_API_KEY

createdb dropintel
psql dropintel -f packages/db/schema.sql
psql dropintel -f packages/db/seed.sql

npm install
npm run dev  # starts API on :3002, dashboard on :3001
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products with filters |
| GET | `/api/products/:id` | Product + prices + market data |
| POST | `/api/products/:id/analyse` | AI margin analysis |
| GET | `/api/suppliers/compare?productId=` | Price comparison table |
| GET | `/api/market/trending` | Trending products |
| GET | `/api/market/opportunities` | High-margin rising products |
| POST | `/api/margins/calculate` | Instant margin calculator |
| GET | `/api/margins/top` | Top 10 by net margin |
| GET | `/api/dashboard/metrics` | Platform KPIs |

## Platform Fee Reference

| Platform | Fee | Notes |
|---|---|---|
| eBay AU | 13.0% | Final value fee |
| Amazon AU | 15.0% | Referral fee |
| Etsy | 6.5% | Transaction fee |
| Shopify | 2.0% | Payment processing |
| WooCommerce | 2.9% | Payment processing |

## Margin Formula

```
Net Profit = Selling Price − Supplier Cost − Shipping − Platform Fee − Payment Fee
Net Margin = Net Profit / Selling Price × 100
ROI = Net Profit / (Supplier Cost + Shipping) × 100
```
