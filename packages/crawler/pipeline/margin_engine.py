"""Margin calculation engine for DropIntel."""
import json
import os
from dataclasses import dataclass

import psycopg2
from psycopg2.extras import RealDictCursor


PLATFORM_FEES = {
    "ebay_au": 0.13,
    "amazon_au": 0.15,
    "shopify": 0.02,
    "etsy": 0.065,
    "woocommerce": 0.029,
}

PAYMENT_FEE = 0.029


@dataclass
class MarginResult:
    supplier_price: float
    shipping_cost: float
    selling_price: float
    platform: str
    platform_fee_pct: float
    payment_fee_pct: float
    gross_profit: float
    gross_margin_pct: float
    net_profit: float
    net_margin_pct: float
    roi_pct: float
    break_even_units: int
    verdict: str


def calculate_margin(
    supplier_price: float,
    shipping_cost: float,
    selling_price: float,
    platform: str = "ebay_au",
    ad_spend: float = 0.0,
    return_rate_pct: float = 5.0,
) -> MarginResult:
    """Calculate full margin breakdown for a product."""
    platform_fee_rate = PLATFORM_FEES.get(platform, 0.13)
    fee = selling_price * platform_fee_rate
    payment = selling_price * PAYMENT_FEE
    cogs = supplier_price + shipping_cost
    gross_profit = selling_price - cogs
    net_profit = selling_price - cogs - fee - payment - ad_spend
    gross_margin = (gross_profit / selling_price * 100) if selling_price > 0 else 0
    net_margin = (net_profit / selling_price * 100) if selling_price > 0 else 0
    roi = (net_profit / cogs * 100) if cogs > 0 else 0
    break_even = max(1, int(100 / net_profit)) if net_profit > 0 else 999

    if net_margin >= 35:
        verdict = "excellent"
    elif net_margin >= 25:
        verdict = "good"
    elif net_margin >= 15:
        verdict = "marginal"
    else:
        verdict = "poor"

    return MarginResult(
        supplier_price=supplier_price,
        shipping_cost=shipping_cost,
        selling_price=selling_price,
        platform=platform,
        platform_fee_pct=platform_fee_rate * 100,
        payment_fee_pct=PAYMENT_FEE * 100,
        gross_profit=round(gross_profit, 2),
        gross_margin_pct=round(gross_margin, 2),
        net_profit=round(net_profit, 2),
        net_margin_pct=round(net_margin, 2),
        roi_pct=round(roi, 2),
        break_even_units=break_even,
        verdict=verdict,
    )


def run_margin_analysis(platform: str = "ebay_au") -> None:
    """Calculate margins for all products in the DB that don't have analyses yet."""
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """SELECT p.id as product_id, pp.supplier_price, pp.shipping_cost, md.market_price
                   FROM products p
                   JOIN product_prices pp ON pp.product_id = p.id
                   JOIN market_data md ON md.product_id = p.id
                   LEFT JOIN margin_analyses ma ON ma.product_id = p.id
                   WHERE ma.id IS NULL
                   ORDER BY p.created_at DESC"""
            )
            rows = cur.fetchall()

        analysed = 0
        for row in rows:
            if not row["supplier_price"] or not row["market_price"]:
                continue
            result = calculate_margin(
                float(row["supplier_price"]),
                float(row["shipping_cost"] or 0),
                float(row["market_price"]),
                platform,
            )
            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO margin_analyses (product_id, supplier_price, shipping_cost,
                       platform_fee_pct, payment_fee_pct, ad_spend_estimate, return_rate_pct,
                       selling_price, gross_profit, gross_margin_pct, net_profit, net_margin_pct,
                       roi_pct, break_even_units, verdict)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (
                        row["product_id"],
                        result.supplier_price, result.shipping_cost,
                        result.platform_fee_pct, result.payment_fee_pct,
                        0.0, 5.0, result.selling_price,
                        result.gross_profit, result.gross_margin_pct,
                        result.net_profit, result.net_margin_pct,
                        result.roi_pct, result.break_even_units,
                        result.verdict,
                    ),
                )
                conn.commit()
                analysed += 1

        print(f"[margin_engine] analysed {analysed} products on {platform}")
    finally:
        conn.close()
