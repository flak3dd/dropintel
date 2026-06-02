'use client';
import { useEffect, useState } from 'react';
import {
  getOrders, getOrder, getSuppliers, getProducts,
  createOrder, updateOrder, deleteOrder, sendOrder, confirmOrder,
  addOrderItem, removeOrderItem,
  type PurchaseOrder, type PurchaseOrderItem, type Supplier, type ProductWithMarket,
} from '@/lib/api';
import { ClipboardList, Plus, X, ChevronRight, Truck, CheckCircle, Trash2 } from 'lucide-react';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  sent: 'bg-blue-500/15 text-blue-300',
  confirmed: 'bg-green-500/15 text-green-300',
  processing: 'bg-yellow-500/15 text-yellow-300',
  shipped: 'bg-purple-500/15 text-purple-300',
  delivered: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-red-500/15 text-red-300',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<(PurchaseOrder & { supplier_name: string; item_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const loadOrders = () => {
    setLoading(true);
    getOrders().then(setOrders).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
    getSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  const metrics = {
    total: orders.length,
    draft: orders.filter((o) => o.status === 'draft').length,
    inProgress: orders.filter((o) => ['sent', 'confirmed', 'processing', 'shipped'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    totalValue: orders.reduce((sum, o) => sum + Number(o.total), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Purchase Orders</h1>
          <p className="text-slate-400 text-sm mt-1">Manage supplier orders and track shipments</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} />
          Create Order
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Orders', value: metrics.total },
          { label: 'Draft', value: metrics.draft },
          { label: 'In Progress', value: metrics.inProgress },
          { label: 'Delivered', value: metrics.delivered },
          { label: 'Total Value', value: `A$${metrics.totalValue.toFixed(2)}` },
        ].map((m) => (
          <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-500 text-xs">{m.label}</p>
            <p className="text-slate-100 font-bold text-xl mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-800 rounded-lg animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">No purchase orders yet.</p>
          <p className="text-xs mt-1">Click "Create Order" to get started.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">PO Number</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-center px-4 py-3">Items</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(o.id)}
                >
                  <td className="px-4 py-3 font-mono text-slate-200 text-xs">{o.po_number}</td>
                  <td className="px-4 py-3 text-slate-300">{o.supplier_name}</td>
                  <td className="px-4 py-3 text-center text-slate-400">{o.item_count}</td>
                  <td className="px-4 py-3 text-right text-slate-200 font-medium">A${Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[o.status] ?? 'bg-slate-700 text-slate-300'}`}>
                        {o.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">{relativeTime(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <ChevronRight size={14} className="text-slate-600 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PO Detail Modal */}
      {selected && (
        <PODetailModal
          poId={selected}
          onClose={() => setSelected(null)}
          onUpdated={loadOrders}
        />
      )}

      {/* Create Order Wizard */}
      {createOpen && (
        <CreateOrderWizard
          suppliers={suppliers}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            loadOrders();
            setSelected(id);
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ── PO Detail Modal ──────────────────────────────────────────────────────────

function PODetailModal({
  poId,
  onClose,
  onUpdated,
}: {
  poId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [po, setPo] = useState<(PurchaseOrder & { supplier_name: string; items: PurchaseOrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = () => {
    getOrder(poId).then((data) => {
      setPo(data);
      setTracking(data.tracking_number ?? '');
      setTrackingUrl(data.tracking_url ?? '');
      setNotes(data.notes ?? '');
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [poId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAction(action: 'send' | 'confirm') {
    if (!po) return;
    setSaving(true);
    try {
      if (action === 'send') await sendOrder(po.id);
      if (action === 'confirm') await confirmOrder(po.id);
      showToast(`Order ${action === 'send' ? 'sent' : 'confirmed'}`);
      load();
      onUpdated();
    } catch {
      showToast('Action failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTracking() {
    if (!po) return;
    setSaving(true);
    try {
      await updateOrder(po.id, { tracking_number: tracking, tracking_url: trackingUrl, notes, status: tracking ? 'shipped' : undefined });
      showToast('Tracking saved.');
      load();
      onUpdated();
    } catch {
      showToast('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!po || po.status !== 'draft') return;
    if (!confirm('Delete this draft order?')) return;
    await deleteOrder(po.id);
    onUpdated();
    onClose();
  }

  async function handleRemoveItem(itemId: string) {
    if (!po) return;
    await removeOrderItem(po.id, itemId);
    load();
    onUpdated();
  }

  if (loading || !po) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-8 animate-pulse">
          <div className="h-8 bg-slate-800 rounded w-1/3 mb-4" />
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-800 rounded" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative">
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm z-10">{toast}</div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-slate-100 font-bold text-lg font-mono">{po.po_number}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[po.status] ?? 'bg-slate-700 text-slate-300'}`}>
                {po.status}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">{po.supplier_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {po.status === 'draft' && (
              <>
                <button
                  onClick={() => handleAction('send')}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg disabled:opacity-40"
                >
                  <Truck size={12} />
                  Send to Supplier
                </button>
                <button onClick={handleDelete} className="text-red-500 hover:text-red-400 p-1">
                  <Trash2 size={15} />
                </button>
              </>
            )}
            {po.status === 'sent' && (
              <button
                onClick={() => handleAction('confirm')}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg disabled:opacity-40"
              >
                <CheckCircle size={12} />
                Mark Confirmed
              </button>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Line items */}
          <div>
            <h3 className="text-slate-300 font-medium text-sm mb-3">Line Items</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left pb-2">Product</th>
                  <th className="text-center pb-2">Qty</th>
                  <th className="text-right pb-2">Unit</th>
                  <th className="text-right pb-2">Shipping</th>
                  <th className="text-right pb-2">Total</th>
                  {po.status === 'draft' && <th className="pb-2" />}
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-800/50">
                    <td className="py-2.5">
                      <p className="text-slate-200">{item.product_title}</p>
                      {item.sku && <p className="text-slate-600">SKU: {item.sku}</p>}
                    </td>
                    <td className="py-2.5 text-center text-slate-300">{item.quantity}</td>
                    <td className="py-2.5 text-right text-slate-300">A${Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2.5 text-right text-slate-400">A${Number(item.shipping_cost).toFixed(2)}</td>
                    <td className="py-2.5 text-right text-slate-200 font-medium">A${Number(item.total).toFixed(2)}</td>
                    {po.status === 'draft' && (
                      <td className="py-2.5 pl-2">
                        <button onClick={() => handleRemoveItem(item.id)} className="text-slate-600 hover:text-red-400">
                          <X size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-3 space-y-1 text-xs text-right">
              <div className="flex justify-end gap-6 text-slate-400">
                <span>Subtotal</span>
                <span>A${Number(po.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-6 text-slate-400">
                <span>Shipping</span>
                <span>A${Number(po.shipping_total).toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-6 text-slate-200 font-bold text-sm border-t border-slate-800 pt-1 mt-1">
                <span>Grand Total</span>
                <span>A${Number(po.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tracking */}
          <div>
            <h3 className="text-slate-300 font-medium text-sm mb-3">Tracking</h3>
            <div className="space-y-2">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Tracking number"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="Tracking URL (optional)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-slate-300 font-medium text-sm mb-2">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={handleSaveTracking}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Create Order Wizard ──────────────────────────────────────────────────────

interface WizardItem {
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  shipping_cost: number;
}

function CreateOrderWizard({
  suppliers,
  onClose,
  onCreated,
  defaultSupplierId,
}: {
  suppliers: Supplier[];
  onClose: () => void;
  onCreated: (id: string) => void;
  defaultSupplierId?: string;
}) {
  const [step, setStep] = useState(1);
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? '');
  const [items, setItems] = useState<WizardItem[]>([]);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<ProductWithMarket[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Add item state
  const [addProductId, setAddProductId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(0);
  const [addShipping, setAddShipping] = useState(0);

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
  }, []);

  const filteredProducts = products.filter((p) =>
    !productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase())
  );

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const shippingTotal = items.reduce((s, i) => s + i.shipping_cost, 0);
  const total = subtotal + shippingTotal;

  function addItem() {
    const product = products.find((p) => p.id === addProductId);
    if (!product || addQty < 1 || addPrice <= 0) return;
    setItems((prev) => [...prev, {
      product_id: product.id,
      product_title: product.title,
      quantity: addQty,
      unit_price: addPrice,
      shipping_cost: addShipping,
    }]);
    setAddProductId('');
    setAddQty(1);
    setAddPrice(0);
    setAddShipping(0);
  }

  async function handleSubmit() {
    if (!supplierId || items.length === 0) {
      setError('Select a supplier and add at least one item.');
      return;
    }
    setSubmitting(true);
    try {
      const order = await createOrder({ supplier_id: supplierId, items, notes });
      onCreated(order.id);
    } catch {
      setError('Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-slate-100 font-semibold">Create Purchase Order</h2>
            <p className="text-slate-500 text-xs mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Step 1: Supplier */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-slate-300 font-medium">Select Supplier</h3>
              <div className="grid gap-2">
                {suppliers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSupplierId(s.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${supplierId === s.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}
                  >
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{s.name}</p>
                      <p className="text-slate-500 text-xs">{s.platform} · {s.country ?? 'Unknown'}</p>
                    </div>
                    {supplierId === s.id && <CheckCircle size={16} className="text-indigo-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Add products */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-slate-300 font-medium">Add Products</h3>
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              {/* Add item form */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                <select
                  value={addProductId}
                  onChange={(e) => {
                    setAddProductId(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    if (p?.supplier_price) setAddPrice(p.supplier_price);
                    if (p?.shipping_cost) setAddShipping(p.shipping_cost);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select product...</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-500 text-xs">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={addQty}
                      onChange={(e) => setAddQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs">Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={addPrice}
                      onChange={(e) => setAddPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs">Shipping</label>
                    <input
                      type="number"
                      step="0.01"
                      value={addShipping}
                      onChange={(e) => setAddShipping(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={addItem}
                  disabled={!addProductId || addQty < 1 || addPrice <= 0}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Add Item
                </button>
              </div>

              {items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs font-medium">{items.length} item(s) added</p>
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-slate-200 text-xs line-clamp-1">{item.product_title}</p>
                        <p className="text-slate-500 text-xs">{item.quantity}x @ A${item.unit_price.toFixed(2)}</p>
                      </div>
                      <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-slate-300 font-medium">Review & Submit</h3>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Supplier</span>
                  <span className="text-slate-200">{suppliers.find((s) => s.id === supplierId)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Items</span>
                  <span className="text-slate-200">{items.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-200">A${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Shipping</span>
                  <span className="text-slate-200">A${shippingTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-700 pt-2 mt-2">
                  <span className="text-slate-300">Total</span>
                  <span className="text-slate-100">A${total.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes for this order..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between px-5 pb-5 pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={() => step > 1 ? setStep((s) => s - 1) : onClose()}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => {
                if (step === 1 && !supplierId) { setError('Please select a supplier.'); return; }
                if (step === 2 && items.length === 0) { setError('Add at least one item.'); return; }
                setError('');
                setStep((s) => s + 1);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
