#!/usr/bin/env python3
"""DropIntel ingest CLI runner.

Usage:
    python3 ingest.py --crawl --analyse --stats
    python3 ingest.py --crawl --source aliexpress --query "pet supplies"
    python3 ingest.py --analyse --platform ebay_au
    python3 ingest.py --stats
"""
import argparse
import os
import sys

from dotenv import load_dotenv

# Load .env from monorepo root (two levels up)
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
# Also try local .env
load_dotenv()


def cmd_crawl(source: str = "all", query: str = "trending products", limit: int = 50) -> None:
    from crawlers.aliexpress import AliExpressCrawler
    from crawlers.amazon_au import AmazonAUCrawler
    from crawlers.market_analyzer import MarketAnalyzer
    from pipeline.db_sync import sync_products

    analyzer = MarketAnalyzer()
    all_products = []

    if source in ("all", "aliexpress"):
        print(f"[ingest] crawling AliExpress: {query}")
        crawler = AliExpressCrawler()
        products = crawler.crawl(query=query, limit=limit)
        print(f"[ingest] AliExpress: {len(products)} products")
        all_products.extend(products)

    if source in ("all", "amazon_au"):
        print("[ingest] crawling Amazon AU bestsellers")
        crawler = AmazonAUCrawler()
        products = crawler.crawl(limit=limit)
        print(f"[ingest] Amazon AU: {len(products)} products")
        all_products.extend(products)

    print(f"[ingest] analysing market data for {len(all_products)} products")
    analyses = {}
    for p in all_products:
        analysis = analyzer.analyze(p)
        analyses[p.source_id] = analysis

    print("[ingest] syncing to database")
    sync_products(all_products, analyses)


def cmd_analyse(platform: str = "ebay_au") -> None:
    from pipeline.margin_engine import run_margin_analysis
    print(f"[ingest] running margin analysis for platform: {platform}")
    run_margin_analysis(platform)


def cmd_stats() -> None:
    import psycopg2
    from psycopg2.extras import RealDictCursor

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) as n FROM products")
            print(f"Products: {cur.fetchone()['n']}")
            cur.execute("SELECT COUNT(*) as n FROM suppliers")
            print(f"Suppliers: {cur.fetchone()['n']}")
            cur.execute("SELECT COUNT(*) as n FROM product_prices")
            print(f"Price records: {cur.fetchone()['n']}")
            cur.execute("SELECT COUNT(*) as n FROM market_data")
            print(f"Market data records: {cur.fetchone()['n']}")
            cur.execute("SELECT COUNT(*) as n FROM margin_analyses")
            print(f"Margin analyses: {cur.fetchone()['n']}")
            cur.execute("SELECT AVG(net_margin_pct) as avg FROM margin_analyses")
            row = cur.fetchone()
            avg = float(row["avg"]) if row["avg"] else 0
            print(f"Avg net margin: {avg:.1f}%")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="DropIntel ingest CLI")
    parser.add_argument("--crawl", action="store_true", help="Run crawlers")
    parser.add_argument("--analyse", action="store_true", help="Run margin analysis")
    parser.add_argument("--stats", action="store_true", help="Print DB stats")
    parser.add_argument("--source", default="all", choices=["all", "aliexpress", "amazon_au"])
    parser.add_argument("--query", default="trending products", help="Search query for crawlers")
    parser.add_argument("--limit", type=int, default=50, help="Max products per source")
    parser.add_argument("--platform", default="ebay_au", help="Platform for margin analysis")

    args = parser.parse_args()

    if not any([args.crawl, args.analyse, args.stats]):
        parser.print_help()
        sys.exit(1)

    if not os.environ.get("DATABASE_URL"):
        print("ERROR: DATABASE_URL is not set")
        sys.exit(1)

    if args.crawl:
        cmd_crawl(source=args.source, query=args.query, limit=args.limit)

    if args.analyse:
        cmd_analyse(platform=args.platform)

    if args.stats:
        cmd_stats()


if __name__ == "__main__":
    main()
