"""Upsert crawled products, prices, and market data into PostgreSQL."""
import json
import os
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor

from crawlers.base import RawProduct
from crawlers.market_analyzer import MarketAnalysis


def get_connection():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def upsert_supplier(conn, source: str, seller_name: str) -> str:
    """Get or create a supplier record. Returns supplier UUID."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM suppliers WHERE name = %s AND platform = %s",
            (seller_name or f"{source}_default", source),
        )
        row = cur.fetchone()
        if row:
            return str(row["id"])

        cur.execute(
            """INSERT INTO suppliers (name, platform, country, ships_from, categories, verified)
               VALUES (%s, %s, %s, %s, %s, %s)
               RETURNING id""",
            (
                seller_name or f"{source}_default",
                source,
                "China",
                "China",
                json.dumps(["General"]),
                False,
            ),
        )
        row = cur.fetchone()
        conn.commit()
        return str(row["id"])


def upsert_product(conn, product: RawProduct) -> str:
    """Upsert a product and return its UUID."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            "SELECT id FROM products WHERE source = %s AND source_id = %s",
            (product.source, product.source_id),
        )
        row = cur.fetchone()

        if row:
            product_id = str(row["id"])
            cur.execute(
                """UPDATE products SET title = %s, category = %s, tags = %s, updated_at = NOW()
                   WHERE id = %s""",
                (product.title, product.category, json.dumps(product.tags), product_id),
            )
        else:
            cur.execute(
                """INSERT INTO products (source, source_id, title, description, category, images, tags)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   RETURNING id""",
                (
                    product.source,
                    product.source_id,
                    product.title,
                    product.description,
                    product.category,
                    json.dumps(product.images),
                    json.dumps(product.tags),
                ),
            )
            product_id = str(cur.fetchone()["id"])

        conn.commit()
        return product_id


def upsert_price(conn, product_id: str, supplier_id: str, product: RawProduct) -> None:
    """Upsert price record."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM product_prices WHERE product_id = %s AND supplier_id = %s",
            (product_id, supplier_id),
        )
        row = cur.fetchone()
        if row:
            cur.execute(
                """UPDATE product_prices SET supplier_price = %s, shipping_cost = %s,
                   last_checked = NOW() WHERE product_id = %s AND supplier_id = %s""",
                (product.supplier_price, product.shipping_cost, product_id, supplier_id),
            )
        else:
            cur.execute(
                """INSERT INTO product_prices (product_id, supplier_id, supplier_price, shipping_cost,
                   processing_days, shipping_days, moq)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (product_id, supplier_id, product.supplier_price, product.shipping_cost, 2, 12, 1),
            )
        conn.commit()


def upsert_market_data(conn, product_id: str, product: RawProduct, analysis: MarketAnalysis) -> None:
    """Upsert market data record."""
    # Build trend data (last 5 months)
    base_volume = analysis.search_volume
    now = datetime.now()
    trend_data = []
    for i in range(4, -1, -1):
        month_dt = now.replace(day=1) - timedelta(days=i * 30)
        month_str = month_dt.strftime("%Y-%m")
        factor = 1.0 + (0.05 * (4 - i)) if analysis.trend_direction == "rising" else (1.0 - (0.02 * (4 - i)) if analysis.trend_direction == "declining" else 1.0)
        trend_data.append({"month": month_str, "volume": int(base_volume * factor)})

    platform = "amazon_au" if product.source == "amazon_au" else "aliexpress"

    with conn.cursor() as cur:
        cur.execute(
            "SELECT id FROM market_data WHERE product_id = %s AND platform = %s",
            (product_id, platform),
        )
        row = cur.fetchone()
        if row:
            cur.execute(
                """UPDATE market_data SET market_price = %s, competitor_count = %s,
                   avg_reviews = %s, best_seller_rank = %s, monthly_sales_estimate = %s,
                   search_volume = %s, trend_direction = %s, trend_data = %s, scraped_at = NOW()
                   WHERE product_id = %s AND platform = %s""",
                (
                    product.market_price, analysis.competitor_count, product.rating,
                    product.best_seller_rank, analysis.monthly_sales_estimate,
                    analysis.search_volume, analysis.trend_direction, json.dumps(trend_data),
                    product_id, platform,
                ),
            )
        else:
            cur.execute(
                """INSERT INTO market_data (product_id, platform, market_price, competitor_count,
                   avg_reviews, best_seller_rank, monthly_sales_estimate, search_volume,
                   trend_direction, trend_data)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (
                    product_id, platform, product.market_price, analysis.competitor_count,
                    product.rating, product.best_seller_rank, analysis.monthly_sales_estimate,
                    analysis.search_volume, analysis.trend_direction, json.dumps(trend_data),
                ),
            )
        conn.commit()


def sync_products(products: list[RawProduct], analyses: dict[str, MarketAnalysis]) -> None:
    """Sync all products, prices, and market data to the database."""
    conn = get_connection()
    try:
        synced = 0
        for product in products:
            try:
                supplier_id = upsert_supplier(conn, product.source, product.seller_name)
                product_id = upsert_product(conn, product)
                upsert_price(conn, product_id, supplier_id, product)
                if product.source_id in analyses:
                    upsert_market_data(conn, product_id, product, analyses[product.source_id])
                synced += 1
            except Exception as e:
                print(f"[db_sync] error syncing {product.title[:40]}: {e}")
                conn.rollback()
        print(f"[db_sync] synced {synced}/{len(products)} products")
    finally:
        conn.close()
