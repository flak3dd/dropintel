'use client';
import { useEffect, useState } from 'react';
import { getSuppliers, compareSuppliers, type Supplier, type SupplierPrice } from '@/lib/api';
import { formatCurrency, platformLabel } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Star, MapPin, Clock, CheckCircle, X } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareModal, setCompareModal] = useState<string | null>(null);

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Supplier Directory</h1>
        <p className="text-slate-400 text-sm mt-1">Compare suppliers by platform, rating, and shipping</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} supplier={s} onCompare={() => setCompareModal(s.id)} />
          ))}
        </div>
      )}

      {compareModal && (
        <CompareModal supplierId={compareModal} onClose={() => setCompareModal(null)} />
      )}
    </div>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  aliexpress: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  cjdropshipping: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  spocket: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  dsers: 'bg-green-500/15 text-green-300 border-green-500/30',
};

function SupplierCard({ supplier, onCompare }: { supplier: Supplier; onCompare: () => void }) {
  const stars = Math.round(supplier.rating ?? 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-slate-200 font-semibold text-sm">{supplier.name}</h3>
            {supplier.verified && (
              <CheckCircle size={14} className="text-green-400 shrink-0" />
            )}
          </div>
          <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded border ${PLATFORM_COLORS[supplier.platform] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {platformLabel(supplier.platform)}
          </span>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} className={i < stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-700'} />
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-0.5">{supplier.review_count.toLocaleString()} reviews</p>
        </div>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        {supplier.country && (
          <div className="flex items-center gap-2 text-slate-400">
            <MapPin size={12} />
            <span>{supplier.country}</span>
          </div>
        )}
        {supplier.response_time_hours && (
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={12} />
            <span>Responds in {supplier.response_time_hours}h</span>
          </div>
        )}
        {supplier.ships_from && (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-slate-500">Ships from:</span>
            <span>{supplier.ships_from}</span>
          </div>
        )}
      </div>

      {supplier.categories && supplier.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {supplier.categories.slice(0, 3).map((cat) => (
            <span key={cat} className="px-1.5 py-0.5 bg-slate-800 text-slate-500 text-xs rounded">{cat}</span>
          ))}
        </div>
      )}

      <button
        onClick={onCompare}
        className="w-full mt-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-lg border border-indigo-500/20 transition-colors"
      >
        View Products & Prices
      </button>
    </div>
  );
}

function CompareModal({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof import('@/lib/api').getSupplier>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@/lib/api').then(({ getSupplier }) =>
      getSupplier(supplierId).then(setData).catch(console.error).finally(() => setLoading(false))
    );
  }, [supplierId]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{data?.supplier.name ?? 'Loading...'}</h2>
            <p className="text-slate-500 text-xs">{data?.products.length ?? 0} products available</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? <LoadingSkeleton rows={5} /> : data?.products.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No products found for this supplier</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2">Supplier Price</th>
                  <th className="text-right py-2">Shipping</th>
                  <th className="text-center py-2">MOQ</th>
                </tr>
              </thead>
              <tbody>
                {data?.products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/50">
                    <td className="py-3">
                      <p className="text-slate-200 text-sm line-clamp-1">{p.title}</p>
                      <p className="text-slate-500 text-xs">{p.category}</p>
                    </td>
                    <td className="py-3 text-right text-slate-300">{formatCurrency((p as unknown as Record<string, unknown>)['supplier_price'] as number)}</td>
                    <td className="py-3 text-right text-slate-300">{formatCurrency((p as unknown as Record<string, unknown>)['shipping_cost'] as number)}</td>
                    <td className="py-3 text-center text-slate-400">{(p as unknown as Record<string, unknown>)['moq'] as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
