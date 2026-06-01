"""Market analyzer: estimates competitor count, price range, and trend direction."""
from dataclasses import dataclass
from .base import RawProduct


@dataclass
class MarketAnalysis:
    product_id: str
    competitor_count: int
    avg_market_price: float
    min_market_price: float
    max_market_price: float
    trend_direction: str
    trend_score: float  # 0-1, higher = more trending
    search_volume: int
    monthly_sales_estimate: int


class MarketAnalyzer:
    """Analyzes market conditions for a product."""

    TREND_THRESHOLDS = {
        "high_orders": 5000,
        "rising_rank": 100,
        "low_rank": 300,
    }

    def analyze(self, product: RawProduct, similar_products: list[RawProduct] | None = None) -> MarketAnalysis:
        """Estimate market metrics for a product."""
        similar = similar_products or []

        # Competitor count estimation
        if similar:
            competitor_count = len(similar) * 20
        else:
            competitor_count = self._estimate_competitors(product)

        # Price range
        prices = [p.market_price for p in similar if p.market_price > 0]
        prices.append(product.market_price)
        prices = [p for p in prices if p > 0]

        avg_price = sum(prices) / len(prices) if prices else product.market_price
        min_price = min(prices) if prices else product.market_price * 0.7
        max_price = max(prices) if prices else product.market_price * 1.3

        # Trend analysis
        trend_direction, trend_score = self._analyze_trend(product)

        # Sales estimate
        monthly_sales = self._estimate_sales(product, trend_score)

        return MarketAnalysis(
            product_id=product.source_id,
            competitor_count=competitor_count,
            avg_market_price=avg_price,
            min_market_price=min_price,
            max_market_price=max_price,
            trend_direction=trend_direction,
            trend_score=trend_score,
            search_volume=product.search_volume or self._estimate_search_volume(product),
            monthly_sales_estimate=monthly_sales,
        )

    def _estimate_competitors(self, product: RawProduct) -> int:
        """Estimate competitor count based on category and price."""
        base_counts = {
            "Electronics": 400,
            "Home & Garden": 280,
            "Pet Supplies": 200,
            "Fitness": 350,
            "Beauty": 320,
        }
        base = base_counts.get(product.category, 250)
        # Adjust by price — cheaper products have more competition
        if product.market_price < 20:
            return int(base * 1.5)
        elif product.market_price > 80:
            return int(base * 0.6)
        return base

    def _analyze_trend(self, product: RawProduct) -> tuple[str, float]:
        """Determine trend direction and score."""
        score = 0.5  # Default neutral

        if product.orders_count > self.TREND_THRESHOLDS["high_orders"]:
            score += 0.2
        elif product.orders_count > 1000:
            score += 0.1

        if product.best_seller_rank and product.best_seller_rank <= self.TREND_THRESHOLDS["rising_rank"]:
            score += 0.2
        elif product.best_seller_rank and product.best_seller_rank > self.TREND_THRESHOLDS["low_rank"]:
            score -= 0.1

        if product.rating >= 4.5:
            score += 0.1
        elif product.rating < 3.5:
            score -= 0.15

        score = max(0.0, min(1.0, score))

        if score >= 0.65:
            return "rising", score
        elif score >= 0.4:
            return "stable", score
        else:
            return "declining", score

    def _estimate_sales(self, product: RawProduct, trend_score: float) -> int:
        """Estimate monthly sales."""
        if product.orders_count > 0:
            # Assume orders_count is cumulative over ~6 months
            return int(product.orders_count / 6)
        base = 500
        return int(base * trend_score * 2)

    def _estimate_search_volume(self, product: RawProduct) -> int:
        """Rough search volume estimation."""
        base_volumes = {
            "Electronics": 25000,
            "Home & Garden": 15000,
            "Pet Supplies": 18000,
            "Fitness": 30000,
            "Beauty": 35000,
        }
        base = base_volumes.get(product.category, 10000)
        if product.orders_count > 5000:
            return int(base * 1.5)
        return base
