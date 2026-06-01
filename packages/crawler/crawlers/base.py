"""Base crawler class for DropIntel scrapers."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RawProduct:
    source: str
    source_id: str
    title: str
    description: str = ""
    category: str = ""
    subcategory: str = ""
    images: list = field(default_factory=list)
    tags: list = field(default_factory=list)
    # Pricing
    supplier_price: float = 0.0
    shipping_cost: float = 3.5
    # Market data
    market_price: float = 0.0
    orders_count: int = 0
    rating: float = 0.0
    review_count: int = 0
    seller_name: str = ""
    # Market
    trend_direction: str = "stable"
    search_volume: int = 0
    competitor_count: int = 0
    best_seller_rank: int = 0


class BaseCrawler(ABC):
    """Abstract base class for DropIntel product crawlers."""

    def __init__(self, source_name: str):
        self.source_name = source_name
        self._products: list[RawProduct] = []

    @abstractmethod
    def crawl(self, query: str = "trending", limit: int = 50) -> list[RawProduct]:
        """Crawl the source and return raw products."""
        pass

    def get_products(self) -> list[RawProduct]:
        return self._products

    def _clean_price(self, price_str: str) -> float:
        """Extract a float from a price string like '$12.99' or 'AU$12.99'."""
        cleaned = "".join(c for c in price_str if c.isdigit() or c == ".")
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def _clean_int(self, s: str) -> int:
        """Extract integer from strings like '1,234 orders' or '4.8'."""
        cleaned = "".join(c for c in s if c.isdigit())
        try:
            return int(cleaned)
        except ValueError:
            return 0
