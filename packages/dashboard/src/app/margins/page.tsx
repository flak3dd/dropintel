'use client';
import { useEffect, useState } from 'react';
import { getMargins, calculateMargin, type MarginAnalysis, type MarginCalculation } from '@/lib/api';
import { formatCurrency, formatPct, platformLabel } from '@/lib/utils';
import { VerdictBadge } from '@/components/VerdictBadge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const PLATFORM_FEES = [
  { platform: 'ebay_au', label: 'eBay AU', fee: 13.0 },
  { platform: 'amazon_au', label: 'Amazon AU', fee: 15.0 },
  { platform: 'shopify', label: 'Shopify', fee: 2.0 },
  { platform: 'etsy', label: 'Etsy', fee: 6.5 },
  { platform: 'woocommerce', label: 'WooCommerce', fee: 2.9 },
];

export default function MarginsPage() {
  const [margins, setMargins] = useState<(MarginAnalysis & { product_title: string; product_category: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculator state
  const [supplierPrice, setSupplierPrice] = useState(10);
  const [shippingCost, setShippingCost] = useState(3);
  const [sellingPrice, setSellingPrice] = useState(40);
  const [platform, setPlatform] = useState('ebay_au');
  const [adSpend, setAdSpend] = useState(0);
  const [calcResult, setCalcResult] = useState<MarginCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    getMargins().then(setMargins).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCalc = () => {
    setCalculating(true);
    calculateMargin({ supplier_price: supplierPrice, shipping_cost: shippingCost, selling_price: sellingPrice, platform, ad_spend: adSpend })
      .then(setCalcResult)
      .catch(console.error)
      .finally(() => setCalculating(false));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Margin Analyser</h1>
        <p className="text-slate-400 text-sm mt-1">Analyse profitability across all products and platforms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-200 mb-3">All Products by Margin</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Product</th>
                    <th className="text-right px-4 py-3">Cost</th>
                    <th className="text-right px-4 py-3">Price</th>
                    <th className="text-right px-4 py-3">Net Margin</th>
                    <th className="text-right px-4 py-3">ROI</th>
                    <th className="text-left px-4 py-3">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-4"><LoadingSkeleton rows={10} /></td></tr>
                  ) : margins.map((m) => (
                    <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-slate-200 text-sm font-medium line-clamp-1">{m.product_title}</p>
                        <p className="text-slate-500 text-xs">{m.product_category}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">
                        {formatCurrency((m.supplier_price ?? 0) + (m.shipping_cost ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatCurrency(m.selling_price)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-green-400 font-bold">{formatPct(m.net_margin_pct)}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatPct(m.roi_pct)}</td>
                      <td className="px-4 py-3"><VerdictBadge verdict={m.verdict} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Quick Calculator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-semibold text-slate-200 mb-4">Quick Calculator</h2>
            <div className="space-y-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Supplier Price (AUD)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none" value={supplierPrice} onChange={(e) => setSupplierPrice(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Shipping Cost (AUD)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none" value={shippingCost} onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Selling Price (AUD)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none" value={sellingPrice} onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Platform</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORM_FEES.map((p) => <option key={p.platform} value={p.platform}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Ad Spend (AUD)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm outline-none" value={adSpend} onChange={(e) => setAdSpend(parseFloat(e.target.value) || 0)} />
              </div>

              <button onClick={handleCalc} disabled={calculating} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                {calculating ? 'Calculating...' : 'Calculate'}
              </button>

              {calcResult && (
                <div className="mt-2 space-y-2 pt-3 border-t border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-xs">Verdict</span>
                    <VerdictBadge verdict={calcResult.verdict} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Net Margin</span>
                    <span className="text-green-400 font-bold text-sm">{formatPct(calcResult.net_margin_pct)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Net Profit</span>
                    <span className="text-slate-300 text-sm">{formatCurrency(calcResult.net_profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">ROI</span>
                    <span className="text-slate-300 text-sm">{formatPct(calcResult.roi_pct)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Break Even</span>
                    <span className="text-slate-300 text-sm">{calcResult.break_even_units} units</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Platform Fee Reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="text-base font-semibold text-slate-200 mb-3">Platform Fees</h2>
            <div className="space-y-2">
              {PLATFORM_FEES.map((p) => (
                <div key={p.platform} className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">{p.label}</span>
                  <span className="text-slate-300 text-xs font-medium">{p.fee}%</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Payment (PayPal/Stripe)</span>
                  <span className="text-slate-300 text-xs font-medium">2.9%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
