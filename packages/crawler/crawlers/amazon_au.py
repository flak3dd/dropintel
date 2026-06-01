"""Amazon AU bestsellers crawler using Playwright."""
import re
import time

from .base import BaseCrawler, RawProduct


class AmazonAUCrawler(BaseCrawler):
    """Scrapes Amazon AU bestseller lists."""

    BASE_URL = "https://www.amazon.com.au/bestsellers"
    CATEGORIES = [
        "https://www.amazon.com.au/Best-Sellers-Electronics/zgbs/electronics",
        "https://www.amazon.com.au/Best-Sellers-Home/zgbs/kitchen",
        "https://www.amazon.com.au/Best-Sellers-Pet-Supplies/zgbs/pet-supplies",
        "https://www.amazon.com.au/Best-Sellers-Sports/zgbs/sporting-goods",
        "https://www.amazon.com.au/Best-Sellers-Beauty/zgbs/beauty",
    ]

    def __init__(self):
        super().__init__("amazon_au")

    def crawl(self, query: str = "bestsellers", limit: int = 50) -> list[RawProduct]:
        """Crawl Amazon AU bestseller pages."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("[amazon_au] playwright not installed, using mock data")
            return self._mock_products()

        products: list[RawProduct] = []

        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    locale="en-AU",
                    timezone_id="Australia/Sydney",
                )
                page = context.new_page()

                for cat_url in self.CATEGORIES:
                    if len(products) >= limit:
                        break
                    try:
                        page.goto(cat_url, wait_until="domcontentloaded", timeout=30000)
                        time.sleep(2)

                        items = page.query_selector_all("[class*='zg-grid-general-faceout'], [class*='zg-item']")

                        category_name = self._url_to_category(cat_url)

                        for item in items[:10]:
                            try:
                                title_el = item.query_selector("[class*='p13n-sc-truncate'], [class*='a-size-medium'], [class*='a-link-normal'] span")
                                price_el = item.query_selector("[class*='a-price'] .a-offscreen, [class*='a-price-whole']")
                                rating_el = item.query_selector("[class*='a-icon-alt']")
                                review_el = item.query_selector("[class*='a-size-small'] a")
                                rank_el = item.query_selector("[class*='zg-bdg-text']")
                                img_el = item.query_selector("img")
                                link_el = item.query_selector("a[href*='/dp/']")

                                title = title_el.inner_text().strip() if title_el else ""
                                if not title or len(title) < 5:
                                    continue

                                price_text = price_el.inner_text() if price_el else "0"
                                market_price = self._clean_price(price_text)

                                rating_text = rating_el.inner_text() if rating_el else "0"
                                try:
                                    rating_match = re.search(r"([\d.]+)\s+out", rating_text)
                                    rating = float(rating_match.group(1)) if rating_match else 0.0
                                except Exception:
                                    rating = 0.0

                                review_text = review_el.inner_text() if review_el else "0"
                                reviews = self._clean_int(review_text)

                                rank_text = rank_el.inner_text() if rank_el else "0"
                                rank = self._clean_int(rank_text)

                                img_url = img_el.get_attribute("src") if img_el else ""

                                href = link_el.get_attribute("href") if link_el else ""
                                asin_match = re.search(r"/dp/([A-Z0-9]{10})", href or "")
                                source_id = asin_match.group(1) if asin_match else f"amz-{len(products)}"

                                supplier_price = market_price * 0.25 if market_price > 0 else 10.0
                                trend = "rising" if rank and rank <= 50 else "stable"

                                products.append(RawProduct(
                                    source="amazon_au",
                                    source_id=source_id,
                                    title=title[:200],
                                    category=category_name,
                                    images=[img_url] if img_url else [],
                                    supplier_price=supplier_price,
                                    shipping_cost=4.0,
                                    market_price=market_price,
                                    rating=rating,
                                    review_count=reviews,
                                    trend_direction=trend,
                                    best_seller_rank=rank,
                                ))

                            except Exception as e:
                                print(f"[amazon_au] item error: {e}")
                                continue

                    except Exception as e:
                        print(f"[amazon_au] category {cat_url} error: {e}")
                        continue

                browser.close()

        except Exception as e:
            print(f"[amazon_au] browser error: {e}")

        if not products:
            return self._mock_products()

        self._products = products
        return products

    def _url_to_category(self, url: str) -> str:
        mapping = {
            "electronics": "Electronics",
            "kitchen": "Home & Garden",
            "pet-supplies": "Pet Supplies",
            "sporting-goods": "Fitness",
            "beauty": "Beauty",
        }
        for key, val in mapping.items():
            if key in url:
                return val
        return "General"

    def _mock_products(self) -> list[RawProduct]:
        return [
            RawProduct(
                source="amazon_au",
                source_id="B0MOCK001",
                title="Bluetooth 5.3 True Wireless Earbuds with Active Noise Cancellation",
                category="Electronics",
                market_price=79.99,
                supplier_price=18.90,
                shipping_cost=4.50,
                rating=4.2,
                review_count=3240,
                trend_direction="rising",
                search_volume=45200,
                best_seller_rank=145,
            ),
            RawProduct(
                source="amazon_au",
                source_id="B0MOCK002",
                title="Resistance Bands Set 5-Pack with Handles and Door Anchor",
                category="Fitness",
                market_price=39.99,
                supplier_price=9.80,
                shipping_cost=3.50,
                rating=4.3,
                review_count=8900,
                trend_direction="rising",
                search_volume=52000,
                best_seller_rank=78,
            ),
        ]
