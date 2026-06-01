'use client';
import { useEffect, useState } from 'react';
import { getTrending, getOpportunities, type ProductWithMarket } from '@/lib/api';
import { formatCurrency, formatPct } from '@/lib/utils';
import { VerdictBadge } from '@/components/VerdictBadge';
import { TrendBadge } from '@/components/TrendBadge';
import { SparkLine } from '@/components/SparkLine';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const CATEGORY_COLORS: Record<string, string> = {
  'Electronics': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'Home & Garden': 'bg-green-500/20 text-green-300 border-green-500/30',
  'Pet Supplies': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Fitness': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'Beauty': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
};

export default function MarketIntelligence() {
  const [trending, setTrending] = useState<ProductWithMarket[]>([]);
  const [opportunities, setOpportunities] = useState<ProductWithMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'trending' | 'opportunities'>('trending');

  useEffect(() => {
    Promise.all([getTrending(), getOpportunities()])
      .then(([t, o]) => { setTrending(t); setOpportunities(o); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Category heatmap from trending
  const categoryMap: Record<string, { count: number; avgVolume: number }> = {};
  trending.forEach((p) => {
    const cat = p.category ?? 'Other';
    if (!categoryMap[cat]) categoryMap[cat] = { count: 0, avgVolume: 0 };
    categoryMap[cat].count++;
    categoryMap[cat].avgVolume += p.search_volume ?? 0;
  });
  Object.keys(categoryMap).forEach((cat) => {
    categoryMap[cat].avgVolume = Math.round(categoryMap[cat].avgVolume / categoryMap[cat].count);
  });
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1].avgVolume - a[1].avgVolume);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Market Intelligence</h1>
        <p className="text-slate-400 text-sm mt-1">Trending products and high-margin opportunities</p>
      </div>

      {/* Category Heatmap */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Category Heatmap</h2>
        <div className="flex flex-wrap gap-2">
          {categoryEntries.map(([cat, data]) => (
            <div key={cat} className={`px-3 py-2 rounded-lg border text-sm font-medium ${CATEGORY_COLORS[cat] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>
              {cat}
              <span className="ml-2 text-xs opacity-70">{data.avgVolume.toLocaleString()}/mo avg</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {(['trending', 'opportunities'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t === 'opportunities' ? 'High Margin (>30%)' : 'All Trending'}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(tab === 'trending' ? trending : opportunities).map((p) => (
            <MarketCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function MarketCard({ product }: { product: ProductWithMarket }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-sm font-medium leading-snug line-clamp-2">{product.title}</p>
          <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs border ${CATEGORY_COLORS[product.category ?? ''] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {product.category}
          </span>
        </div>
        <TrendBadge direction={product.trend_direction} className="shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div><p className="text-slate-500">Market Price</p><p className="text-slate-200 font-bold">{formatCurrency(product.market_price)}</p></div>
        <div><p className="text-slate-500">Search Volume</p><p className="text-slate-200 font-bold">{product.search_volume?.toLocaleString() ?? 'N/A'}/mo</p></div>
        <div><p className="text-slate-500">Competitors</p><p className="text-slate-200 font-bold">{product.competitor_count ?? 'N/A'}</p></div>
        <div><p className="text-slate-500">Est. Sales</p><p className="text-slate-200 font-bold">{product.monthly_sales_estimate?.toLocaleString() ?? 'N/A'}/mo</p></div>
      </div>

      {product.net_margin_pct != null && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-slate-500 text-xs">Net Margin</span>
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold text-sm">{formatPct(product.net_margin_pct)}</span>
            {product.verdict && <VerdictBadge verdict={product.verdict} />}
          </div>
        </div>
      )}

      {product.trend_data && product.trend_data.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <SparkLine data={product.trend_data} width={200} height={30} color="#6366f1" />
        </div>
      )}
    </div>
  );
}
