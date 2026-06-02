'use client';
import { useEffect, useState } from 'react';
import { getSuppliers, compareSuppliers, getSupplierThreads, createThread, createOrder, getProducts, type Supplier, type SupplierPrice, type SupplierThread, type ProductWithMarket } from '@/lib/api';
import { formatCurrency, platformLabel } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { MessageThread } from '@/components/MessageThread';
import { Star, MapPin, Clock, CheckCircle, X, MessageSquare, Package } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareModal, setCompareModal] = useState<string | null>(null);
  const [composeSupplier, setComposeSupplier] = useState<Supplier | null>(null);
  const [orderSupplier, setOrderSupplier] = useState<Supplier | null>(null);
  const [composeThread, setComposeThread] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductWithMarket[]>([]);

  useEffect(() => {
    getSuppliers().then(setSuppliers).catch(console.error).finally(() => setLoading(false));
    getProducts().then(setProducts).catch(console.error);
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
            <SupplierCard
              key={s.id}
              supplier={s}
              onCompare={() => setCompareModal(s.id)}
              onMessage={() => setComposeSupplier(s)}
              onOrder={() => setOrderSupplier(s)}
            />
          ))}
        </div>
      )}

      {compareModal && (
        <CompareModal supplierId={compareModal} onClose={() => setCompareModal(null)} />
      )}

      {/* Compose message modal */}
      {composeSupplier && !composeThread && (
        <QuickComposeModal
          supplier={composeSupplier}
          onClose={() => setComposeSupplier(null)}
          onCreated={(threadId) => {
            setComposeSupplier(null);
            setComposeThread(threadId);
          }}
        />
      )}

      {/* Open the thread after composing */}
      {composeThread && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl h-[80vh] overflow-hidden flex flex-col">
            <MessageThread threadId={composeThread} onClose={() => setComposeThread(null)} />
          </div>
        </div>
      )}

      {/* Quick order modal */}
      {orderSupplier && (
        <QuickOrderModal
          supplier={orderSupplier}
          products={products}
          onClose={() => setOrderSupplier(null)}
          onCreated={() => setOrderSupplier(null)}
        />
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

function SupplierCard({ supplier, onCompare, onMessage, onOrder }: { supplier: Supplier; onCompare: () => void; onMessage: () => void; onOrder: () => void }) {
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

      <div className="flex gap-2 mt-2">
        <button
          onClick={onMessage}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
        >
          <MessageSquare size={12} />
          Message
        </button>
        <button
          onClick={onOrder}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
        >
          <Package size={12} />
          Create Order
        </button>
      </div>
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

// ── Quick Compose Modal ──────────────────────────────────────────────────────

function QuickComposeModal({
  supplier,
  onClose,
  onCreated,
}: {
  supplier: Supplier;
  onClose: () => void;
  onCreated: (threadId: string) => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!subject.trim() || !body.trim()) { setError('Subject and message are required.'); return; }
    setSending(true);
    try {
      const thread = await createThread({ supplier_id: supplier.id, subject: subject.trim(), body: body.trim() });
      onCreated(thread.id);
    } catch {
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-slate-100 font-semibold">Message {supplier.name}</h2>
            {supplier.contact_email && <p className="text-slate-500 text-xs mt-0.5">{supplier.contact_email}</p>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Inquiry about pricing and MOQ"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Write your message..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Quick Order Modal ─────────────────────────────────────────────────────────

function QuickOrderModal({
  supplier,
  products,
  onClose,
  onCreated,
}: {
  supplier: Supplier;
  products: ProductWithMarket[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const product = products.find((p) => p.id === productId);
    if (!product || qty < 1 || price <= 0) { setError('Select a product, set quantity and price.'); return; }
    setSubmitting(true);
    try {
      await createOrder({
        supplier_id: supplier.id,
        items: [{ product_id: product.id, product_title: product.title, quantity: qty, unit_price: price, shipping_cost: shipping }],
        notes,
      });
      onCreated();
    } catch {
      setError('Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-slate-100 font-semibold">New Order — {supplier.name}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1">Product</label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const p = products.find((x) => x.id === e.target.value);
                if (p?.supplier_price) setPrice(p.supplier_price);
                if (p?.shipping_cost) setShipping(p.shipping_cost);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1">Qty</label>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1">Unit Price (A$)</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1">Shipping (A$)</label>
              <input type="number" step="0.01" value={shipping} onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
            {submitting ? 'Creating...' : 'Create Draft Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
