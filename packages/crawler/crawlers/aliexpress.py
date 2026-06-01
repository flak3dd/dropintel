"""AliExpress product crawler using Playwright."""
import re
import time
from typing import Optional

from .base import BaseCrawler, RawProduct


class AliExpressCrawler(BaseCrawler):
    """Scrapes AliExpress search results for trending products."""

    BASE_URL = "https://www.aliexpress.com/wholesale?SearchText={query}"

    def __init__(self):
        super().__init__("aliexpress")

    def crawl(self, query: str = "trending products", limit: int = 50) -> list[RawProduct]:
        """Use Playwright to crawl AliExpress search results."""
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("[aliexpress] playwright not installed, using mock data")
            return self._mock_products()

        products: list[RawProduct] = []
        url = self.BASE_URL.format(query=query.replace(" ", "+"))

        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    locale="en-AU",
                )
                page = context.new_page()

                try:
                    page.goto(url, wait_until="networkidle", timeout=30000)
                    time.sleep(2)

                    # Scroll to load more products
                    for _ in range(3):
                        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        time.sleep(1)

                    items = page.query_selector_all("[class*='product-card'], [class*='search-card'], [class*='item']")

                    for item in items[:limit]:
                        try:
                            title_el = item.query_selector("[class*='title'], h3, h2, [class*='name']")
                            price_el = item.query_selector("[class*='price'], [class*='Amount']")
                            orders_el = item.query_selector("[class*='order'], [class*='sold']")
                            rating_el = item.query_selector("[class*='rating'], [class*='star']")
                            seller_el = item.query_selector("[class*='seller'], [class*='store']")
                            img_el = item.query_selector("img")
                            link_el = item.query_selector("a")

                            title = title_el.inner_text().strip() if title_el else ""
                            if not title or len(title) < 5:
                                continue

                            price_text = price_el.inner_text() if price_el else "0"
                            price = self._clean_price(price_text)

                            orders_text = orders_el.inner_text() if orders_el else "0"
                            orders = self._clean_int(orders_text)

                            rating_text = rating_el.inner_text() if rating_el else "0"
                            try:
                                rating = float(re.search(r"[\d.]+", rating_text).group()) if re.search(r"[\d.]+", rating_text) else 0.0
                            except Exception:
                                rating = 0.0

                            seller = seller_el.inner_text().strip() if seller_el else ""
                            img_url = img_el.get_attribute("src") if img_el else ""

                            href = link_el.get_attribute("href") if link_el else ""
                            source_id = re.search(r"/(\d+)\.html", href or "")
                            source_id_str = source_id.group(1) if source_id else f"ae-{len(products)}"

                            # Estimate AUD market price (typically 3-5x supplier)
                            market_price = price * 4.0 if price > 0 else 30.0
                            shipping = 3.5

                            trend = "rising" if orders > 1000 else ("stable" if orders > 100 else "declining")

                            products.append(RawProduct(
                                source="aliexpress",
                                source_id=source_id_str,
                                title=title[:200],
                                description="",
                                category=self._guess_category(title),
                                images=[img_url] if img_url else [],
                                supplier_price=price,
                                shipping_cost=shipping,
                                market_price=market_price,
                                orders_count=orders,
                                rating=rating,
                                seller_name=seller,
                                trend_direction=trend,
                            ))
                        except Exception as e:
                            print(f"[aliexpress] item parse error: {e}")
                            continue

                except Exception as e:
                    print(f"[aliexpress] page error: {e}")
                finally:
                    browser.close()

        except Exception as e:
            print(f"[aliexpress] browser error: {e}")

        if not products:
            return self._mock_products()

        self._products = products
        return products

    def _guess_category(self, title: str) -> str:
        title_lower = title.lower()
        if any(w in title_lower for w in ["phone", "charger", "earbuds", "bluetooth", "usb", "cable", "led"]):
            return "Electronics"
        if any(w in title_lower for w in ["garden", "plant", "home", "kitchen", "organiser", "storage"]):
            return "Home & Garden"
        if any(w in title_lower for w in ["pet", "dog", "cat", "animal"]):
            return "Pet Supplies"
        if any(w in title_lower for w in ["fitness", "yoga", "gym", "exercise", "workout"]):
            return "Fitness"
        if any(w in title_lower for w in ["beauty", "skin", "makeup", "hair", "face", "serum"]):
            return "Beauty"
        return "General"

    def _mock_products(self) -> list[RawProduct]:
        """Return mock data when playwright is unavailable."""
        return [
            RawProduct(
                source="aliexpress",
                source_id="mock-ae-001",
                title="Magnetic Wireless Charger 15W Fast Charging Pad",
                category="Electronics",
                supplier_price=8.50,
                shipping_cost=3.20,
                market_price=34.99,
                orders_count=5420,
                rating=4.8,
                seller_name="TechGadgets Store",
                trend_direction="rising",
                search_volume=18500,
            ),
            RawProduct(
                source="aliexpress",
                source_id="mock-ae-002",
                title="LED Fairy String Lights Solar Outdoor Waterproof",
                category="Home & Garden",
                supplier_price=7.80,
                shipping_cost=3.50,
                market_price=29.99,
                orders_count=8900,
                rating=4.6,
                seller_name="HomeDecor Direct",
                trend_direction="rising",
                search_volume=28600,
            ),
        ]
