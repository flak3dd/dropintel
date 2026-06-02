'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  getProducts, getProduct, compareSuppliers, calculateMargin, analyseProduct,
  type ProductWithMarket, type SupplierPrice, type MarketData, type MarginAnalysis, type MarginCalculation,
} from '@/lib/api';
import { formatCurrency, formatPct, verdictColor, platformLabel } from '@/lib/utils';
import { VerdictBadge } from '@/components/VerdictBadge';
import { TrendBadge } from '@/components/TrendBadge';
import { SparkLine } from '@/components/SparkLine';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Search, X, ChevronDown } from 'lucide-react';
import { ShopifyLaunchButton } from '@/components/ShopifyLaunchButton';

const CATEGORIES = ['Electronics', 'Home & Garden', 'Pet Supplies', 'Fitness', 'Beauty'];
const SOURCES = ['aliexpress', 'cjdropshipping', 'amazon', 'etsy'];
const TRENDS = ['rising', 'stable', 'declining'];

export default function ProductDiscovery() {
  const [products, setProducts] = useState<ProductWithMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [minMargin, setMinMargin] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getProducts({ search: search || undefined, category: category || undefined, source: source || undefined, min_margin: minMargin || undefined })
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, source, minMargin]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Product Discovery</h1>
        <p className="text-slate-400 text-sm mt-1">Search and filter products from all sources</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-slate-500" />
          <input
            className="bg-transparent text-slate-200 text-sm outline-none flex-1 placeholder:text-slate-500"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={12} className="text-slate-500" /></button>}
        </div>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">All Sources</option>
          {SOURCES.map((s) => <option key={s} value={s}>{platformLabel(s)}</option>)}
        </select>

        <input
          type="number"
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none w-40"
          placeholder="Min Margin %"
          value={minMargin}
          onChange={(e) => setMinMargin(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-right px-4 py-3">Supplier Cost</th>
                <th className="text-right px-4 py-3">Market Price</th>
                <th className="text-right px-4 py-3">Net Margin</th>
                <th className="text-left px-4 py-3">Trend</th>
                <th className="text-left px-4 py-3">Verdict</th>
                <th className="text-left px-4 py-3">Shopify</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-4"><LoadingSkeleton rows={8} /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">No products found</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-slate-200 font-medium text-sm line-clamp-1">{p.title}</p>
                        <p className="text-slate-500 text-xs">{p.category}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-400 text-xs capitalize">{platformLabel(p.source)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(p.supplier_price)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(p.market_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-400 font-bold">{formatPct(p.net_margin_pct)}</span>
                    </td>
                    <td className="px-4 py-3"><TrendBadge direction={p.trend_direction} /></td>
                    <td className="px-4 py-3"><VerdictBadge verdict={p.verdict} /></td>
                    <td className="px-4 py-3">
                      <ShopifyLaunchButton
                        productId={p.id}
                        suggestedPrice={p.market_price ? Number(p.market_price) * 0.9 : undefined}
                        compact
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(selected === p.id ? null : p.id)}
                        className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"
                      >
                        Details <ChevronDown size={12} className={selected === p.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selected && <ProductDetailModal productId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ProductDetailModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'suppliers' | 'market' | 'calculator'>('overview');
  const [data, setData] = useState<Awaited<ReturnType<typeof getProduct>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProduct(productId).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [productId]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 line-clamp-1">{data?.product.title ?? 'Loading...'}</h2>
            <p className="text-slate-500 text-xs mt-0.5">{data?.product.category} · {data?.product.source}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1"><X size={18} /></button>
        </div>

        <div className="flex border-b border-slate-800">
          {(['overview', 'suppliers', 'market', 'calculator'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors capitalize ${tab === t ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {t === 'calculator' ? 'Margin Calc' : t}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? <LoadingSkeleton rows={4} /> : data && (
            <>
              {tab === 'overview' && <OverviewTab product={data.product} margin={data.margin} />}
              {tab === 'suppliers' && <SuppliersTab prices={data.prices} />}
              {tab === 'market' && <MarketTab marketData={data.market_data} />}
              {tab === 'calculator' && <CalculatorTab product={data.product} defaultPrice={data.market_data[0]?.market_price} defaultSupplier={(data.prices[0]?.supplier_price ?? 0) + (data.prices[0]?.shipping_cost ?? 0)} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ product, margin }: { product: ProductWithMarket; margin: MarginAnalysis | null }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-300 text-sm leading-relaxed">{product.description ?? 'No description available.'}</p>
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">{tag}</span>
          ))}
        </div>
      )}
      {margin && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-2">
          <h3 className="text-slate-200 font-medium text-sm">Latest Analysis</h3>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-slate-500">Net Margin</p><p className="text-green-400 font-bold">{formatPct(margin.net_margin_pct)}</p></div>
            <div><p className="text-slate-500">Net Profit</p><p className="text-slate-300">{formatCurrency(margin.net_profit)}</p></div>
            <div><p className="text-slate-500">ROI</p><p className="text-slate-300">{formatPct(margin.roi_pct)}</p></div>
          </div>
          {margin.ai_analysis && <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-700 pt-2 mt-2">{margin.ai_analysis}</p>}
        </div>
      )}
    </div>
  );
}

function SuppliersTab({ prices }: { prices: SupplierPrice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-800">
            <th className="text-left py-2">Supplier</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2">Shipping</th>
            <th className="text-right py-2">Total</th>
            <th className="text-center py-2">MOQ</th>
            <th className="text-center py-2">Days</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((p) => (
            <tr key={p.id} className="border-b border-slate-800/50">
              <td className="py-3">
                <p className="text-slate-200 font-medium">{p.supplier_name}</p>
                <p className="text-slate-500 text-xs">{platformLabel(p.supplier_platform)} · ★ {p.supplier_rating}</p>
              </td>
              <td className="py-3 text-right text-slate-300">{formatCurrency(p.supplier_price)}</td>
              <td className="py-3 text-right text-slate-300">{formatCurrency(p.shipping_cost)}</td>
              <td className="py-3 text-right font-bold text-indigo-400">
                {formatCurrency((p.supplier_price ?? 0) + (p.shipping_cost ?? 0))}
              </td>
              <td className="py-3 text-center text-slate-400">{p.moq}</td>
              <td className="py-3 text-center text-slate-400">{(p.processing_days ?? 0) + (p.shipping_days ?? 0)}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketTab({ marketData }: { marketData: MarketData[] }) {
  return (
    <div className="space-y-4">
      {marketData.map((md) => (
        <div key={md.id} className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-200 font-medium">{platformLabel(md.platform)}</h3>
            <TrendBadge direction={md.trend_direction} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-slate-500">Market Price</p><p className="text-slate-200 font-bold">{formatCurrency(md.market_price)}</p></div>
            <div><p className="text-slate-500">Competitors</p><p className="text-slate-200 font-bold">{md.competitor_count ?? 'N/A'}</p></div>
            <div><p className="text-slate-500">Search Volume</p><p className="text-slate-200 font-bold">{md.search_volume?.toLocaleString() ?? 'N/A'}/mo</p></div>
          </div>
          {md.trend_data && md.trend_data.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-slate-500 text-xs mb-2">Search Trend</p>
              <SparkLine data={md.trend_data} width={200} height={40} color="#6366f1" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CalculatorTab({ product, defaultPrice, defaultSupplier }: { product: ProductWithMarket; defaultPrice?: number | null; defaultSupplier?: number }) {
  const [sellingPrice, setSellingPrice] = useState(defaultPrice ?? 30);
  const [supplierCost, setSupplierCost] = useState(defaultSupplier ?? 10);
  const [platform, setPlatform] = useState('ebay_au');
  const [adSpend, setAdSpend] = useState(0);
  const [result, setResult] = useState<MarginCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  const handleCalc = () => {
    setCalculating(true);
    calculateMargin({ supplier_price: supplierCost * 0.7, shipping_cost: supplierCost * 0.3, selling_price: sellingPrice, platform, ad_spend: adSpend })
      .then(setResult)
      .catch(console.error)
      .finally(() => setCalculating(false));
  };

  useEffect(() => { handleCalc(); }, []);

  const PLATFORMS = ['ebay_au', 'amazon_au', 'shopify', 'etsy', 'woocommerce'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Selling Price (AUD)</label>
          <input
            type="number"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Total Supplier Cost (AUD)</label>
          <input
            type="number"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
            value={supplierCost}
            onChange={(e) => setSupplierCost(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Platform</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {PLATFORMS.map((p) => <option key={p} value={p}>{platformLabel(p)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">Ad Spend (AUD)</label>
          <input
            type="number"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none"
            value={adSpend}
            onChange={(e) => setAdSpend(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <button
        onClick={handleCalc}
        disabled={calculating}
        className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {calculating ? 'Calculating...' : 'Calculate Margin'}
      </button>

      {result && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-200 font-medium text-sm">Results</h3>
            <VerdictBadge verdict={result.verdict} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><p className="text-slate-500">Gross Margin</p><p className="text-slate-200 font-bold">{formatPct(result.gross_margin_pct)}</p></div>
            <div><p className="text-slate-500">Net Margin</p><p className="text-green-400 font-bold text-base">{formatPct(result.net_margin_pct)}</p></div>
            <div><p className="text-slate-500">Net Profit</p><p className="text-slate-200 font-bold">{formatCurrency(result.net_profit)}</p></div>
            <div><p className="text-slate-500">ROI</p><p className="text-slate-200 font-bold">{formatPct(result.roi_pct)}</p></div>
            <div><p className="text-slate-500">Break Even</p><p className="text-slate-200 font-bold">{result.break_even_units} units</p></div>
            <div><p className="text-slate-500">Platform Fee</p><p className="text-slate-200 font-bold">{formatPct(result.platform_fee_pct)}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
