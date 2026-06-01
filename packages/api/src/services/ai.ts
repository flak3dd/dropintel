import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Product, MarketData } from '../types.js';

function getClient(): GoogleGenerativeAI {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is not set');
  return new GoogleGenerativeAI(key);
}

export async function analyseProductMargin(
  product: Product,
  supplierPrice: number,
  shippingCost: number,
  marketPrice: number,
  platform: string
): Promise<string> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const cogs = supplierPrice + shippingCost;
    const platformFees: Record<string, number> = {
      ebay_au: 0.13,
      amazon_au: 0.15,
      shopify: 0.02,
      etsy: 0.065,
      woocommerce: 0.029,
    };
    const platformFee = marketPrice * (platformFees[platform] ?? 0.13);
    const paymentFee = marketPrice * 0.029;
    const netProfit = marketPrice - cogs - platformFee - paymentFee;
    const netMargin = ((netProfit / marketPrice) * 100).toFixed(1);

    const prompt = `You are a dropshipping expert. Analyse this product's market opportunity and margin:

Product: ${product.title}
Category: ${product.category}
Supplier cost: $${supplierPrice} AUD
Shipping cost: $${shippingCost} AUD
Total COGS: $${cogs.toFixed(2)} AUD
Selling price on ${platform}: $${marketPrice} AUD
Net margin: ${netMargin}%

Provide a concise 2-3 sentence analysis covering:
1. Whether this is a good dropshipping opportunity
2. Key risk factors or advantages
3. A specific recommendation

Be direct and practical. No markdown, just plain text.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    return 'AI analysis unavailable. Please check GOOGLE_API_KEY configuration.';
  }
}

export interface WinningProductScore {
  product_id: string;
  title: string;
  score: number;
  reasons: string[];
}

export async function findWinningProducts(
  products: Product[],
  marketDataMap: Map<string, MarketData[]>
): Promise<WinningProductScore[]> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const productSummaries = products
      .slice(0, 10)
      .map((p) => {
        const md = marketDataMap.get(p.id) ?? [];
        const topMd = md[0];
        return `- ${p.title} (${p.category}): market price $${topMd?.market_price ?? 'N/A'}, search volume ${topMd?.search_volume ?? 0}/mo, trend: ${topMd?.trend_direction ?? 'unknown'}`;
      })
      .join('\n');

    const prompt = `You are a dropshipping expert. Score these products 0-100 for winning potential:

${productSummaries}

Return ONLY a JSON array (no markdown) in this format:
[{"product_title": "...", "score": 85, "reasons": ["reason1", "reason2"]}]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());

    return products.slice(0, 10).map((p, i) => ({
      product_id: p.id,
      title: p.title,
      score: parsed[i]?.score ?? 50,
      reasons: parsed[i]?.reasons ?? [],
    }));
  } catch {
    return products.slice(0, 10).map((p) => ({
      product_id: p.id,
      title: p.title,
      score: 50,
      reasons: ['AI scoring unavailable'],
    }));
  }
}

export async function generateProductReport(
  product: Product,
  analysis: string
): Promise<string> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Write a comprehensive dropshipping opportunity report for:

Product: ${product.title}
Category: ${product.category}
Description: ${product.description}
Analysis: ${analysis}

Format as markdown with sections: Executive Summary, Market Opportunity, Supplier Considerations, Recommended Strategy, Risk Assessment. Keep it under 500 words.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return `# ${product.title} — Product Report\n\nAI report generation unavailable. Please configure GOOGLE_API_KEY.`;
  }
}
