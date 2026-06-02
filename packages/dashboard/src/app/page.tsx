'use client';
import { useEffect, useState } from 'react';
import { getDashboardMetrics, getDashboardFeed, getTrending, type ProductWithMarket } from '@/lib/api';
import { formatCurrency, formatPct } from '@/lib/utils';
import { VerdictBadge } from '@/components/VerdictBadge';
import { TrendBadge } from '@/components/TrendBadge';
import { CardSkeleton, LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Package, TrendingUp, Bookmark, BarChart2 } from 'lucide-react';
import { ShopifyLaunchButton } from '@/components/ShopifyLaunchButton';

interface Metrics {
  total_products: number;
  avg_net_margin: number;
  watchlist_count: number;
  trending_count: number;
}

export default function CommandCentre() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [feed, setFeed] = useState<ProductWithMarket[]>([]);
  const [trending, setTrending] = useState<ProductWithMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardMetrics(), getDashboardFeed(), getTrending()])
      .then(([m, f, t]) => {
        setMetrics(m);
        setFeed(f);
        setTrending(t.slice(0, 6));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Command Centre</h1>
        <p className="text-slate-400 text-sm mt-1">Your dropshipping intelligence overview</p>
      </div>

      {/* Metrics Bar */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Package size={20} className="text-indigo-400" />}
            label="Products Tracked"
            value={metrics?.total_products.toLocaleString() ?? '0'}
          />
          <MetricCard
            icon={<BarChart2 size={20} className="text-green-400" />}
            label="Avg Net Margin"
            value={formatPct(metrics?.avg_net_margin)}
            highlight
          />
          <MetricCard
            icon={<Bookmark size={20} className="text-yellow-400" />}
            label="In Watchlist"
            value={metrics?.watchlist_count.toString() ?? '0'}
          />
          <MetricCard
            icon={<TrendingUp size={20} className="text-blue-400" />}
            label="Trending Now"
            value={metrics?.trending_count.toString() ?? '0'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Opportunity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Top Opportunities</h2>
          {loading ? (
            <LoadingSkeleton rows={6} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {feed.map((p) => (
                <OpportunityCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-200 mb-3">Trending Products</h2>
            {loading ? (
              <LoadingSkeleton rows={6} />
            ) : (
              <div className="space-y-2">
                {trending.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-600 text-xs w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs truncate">{p.title}</p>
                      <p className="text-slate-500 text-xs">{p.category}</p>
                    </div>
                    <TrendBadge direction={p.trend_direction} className="text-xs" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, highlight }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${highlight ? 'text-green-400' : 'text-slate-100'}`}>
        {value}
      </p>
    </div>
  );
}

function OpportunityCard({ product }: { product: ProductWithMarket }) {
  const supplierCost = (product.supplier_price ?? 0) + (product.shipping_cost ?? 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-sm font-medium leading-snug line-clamp-2">{product.title}</p>
          <p className="text-slate-500 text-xs mt-0.5">{product.category}</p>
        </div>
        <VerdictBadge verdict={product.verdict} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-slate-500">Cost</p>
          <p className="text-slate-300 font-medium">{formatCurrency(supplierCost)}</p>
        </div>
        <div>
          <p className="text-slate-500">Market</p>
          <p className="text-slate-300 font-medium">{formatCurrency(product.market_price)}</p>
        </div>
        <div>
          <p className="text-slate-500">Margin</p>
          <p className="text-green-400 font-bold">{formatPct(product.net_margin_pct)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <TrendBadge direction={product.trend_direction} className="text-xs" />
        <span className="text-slate-500 text-xs capitalize">{product.source}</span>
      </div>
      <div className="mt-3">
        <ShopifyLaunchButton
          productId={product.id}
          suggestedPrice={product.market_price ? Number(product.market_price) * 0.9 : undefined}
        />
      </div>
    </div>
  );
}
