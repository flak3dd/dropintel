'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, ExternalLink, RefreshCw, Check, Loader2, ChevronDown, Archive } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface Listing {
  status: 'not_listed' | 'draft' | 'active' | 'archived';
  shopify_url?: string;
  shopify_product_id?: string;
  selling_price?: number;
  last_synced?: string;
}

interface Props {
  productId: string;
  suggestedPrice?: number;
  compact?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  not_listed: 'bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white',
  draft:      'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40',
  active:     'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/40',
  archived:   'bg-slate-600/40 text-slate-400 border border-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  not_listed: 'Launch to Shopify',
  draft:      'On Shopify (Draft)',
  active:     'Live on Shopify',
  archived:   'Archived',
};

export function ShopifyLaunchButton({ productId, suggestedPrice, compact = false }: Props) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [priceInput, setPriceInput] = useState(suggestedPrice?.toFixed(2) ?? '');
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/shopify/listing/${productId}`)
      .then(r => r.json())
      .then(setListing)
      .catch(() => setListing({ status: 'not_listed' }))
      .finally(() => setLoading(false));
  }, [productId]);

  async function launch(status: 'draft' | 'active' = 'draft') {
    setLaunching(true);
    setError(null);
    setShowPriceModal(false);
    try {
      const res = await fetch(`${API}/api/shopify/launch/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selling_price: parseFloat(priceInput) || suggestedPrice || 29.99,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Already listed — refresh
          const l = await fetch(`${API}/api/shopify/listing/${productId}`).then(r => r.json());
          setListing(l);
          return;
        }
        throw new Error(data.detail || data.error || 'Launch failed');
      }
      setListing({ status: data.status, shopify_url: data.shopify_url, selling_price: data.selling_price });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLaunching(false);
    }
  }

  async function activate() {
    setLaunching(true);
    setError(null);
    try {
      await fetch(`${API}/api/shopify/listing/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      setListing(prev => prev ? { ...prev, status: 'active' } : prev);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLaunching(false);
      setShowMenu(false);
    }
  }

  async function archive() {
    setLaunching(true);
    setError(null);
    try {
      await fetch(`${API}/api/shopify/listing/${productId}`, { method: 'DELETE' });
      setListing(prev => prev ? { ...prev, status: 'archived' } : prev);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLaunching(false);
      setShowMenu(false);
    }
  }

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 bg-slate-800 text-slate-500 text-sm ${compact ? '' : 'w-full justify-center'}`}>
        <Loader2 size={13} className="animate-spin" />
        <span>Checking…</span>
      </div>
    );
  }

  const status = listing?.status ?? 'not_listed';

  // Not listed — show launch button
  if (status === 'not_listed' || status === 'archived') {
    return (
      <div className={`${compact ? 'inline-block' : 'w-full'}`}>
        {showPriceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPriceModal(false)}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Set Selling Price</h3>
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 mb-4">
                <span className="text-slate-400 text-sm">AUD $</span>
                <input
                  autoFocus
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={priceInput}
                  onChange={e => setPriceInput(e.target.value)}
                  className="bg-transparent text-slate-100 text-sm outline-none flex-1"
                  onKeyDown={e => e.key === 'Enter' && launch('draft')}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => launch('draft')}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg py-2 transition-colors"
                >
                  Launch as Draft
                </button>
                <button
                  onClick={() => launch('active')}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg py-2 transition-colors"
                >
                  Publish Now
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowPriceModal(true)}
          disabled={launching}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
            ${compact ? '' : 'w-full justify-center'}
            ${STATUS_STYLES.not_listed}
            disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {launching ? <Loader2 size={13} className="animate-spin" /> : <ShoppingBag size={13} />}
          <span>{launching ? 'Launching…' : (status === 'archived' ? 'Re-launch' : 'Launch to Shopify')}</span>
        </button>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>
    );
  }

  // Already listed — show status + actions menu
  return (
    <div className={`relative ${compact ? 'inline-block' : 'w-full'}`}>
      <div className={`inline-flex rounded-lg overflow-hidden ${compact ? '' : 'w-full'}`}>
        {/* Status pill */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium ${STATUS_STYLES[status]}`}>
          {status === 'active' ? <Check size={13} /> : <ShoppingBag size={13} />}
          <span>{STATUS_LABELS[status]}</span>
          {listing?.selling_price && (
            <span className="text-xs opacity-70 ml-1">${Number(listing.selling_price).toFixed(2)}</span>
          )}
        </div>

        {/* Dropdown trigger */}
        <button
          onClick={() => setShowMenu(v => !v)}
          className={`px-2 py-1.5 border-l border-black/20 hover:bg-white/10 transition-colors ${STATUS_STYLES[status]}`}
        >
          <ChevronDown size={13} />
        </button>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div className="absolute top-full mt-1 right-0 z-40 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden w-48 text-sm">
          {listing?.shopify_url && (
            <a
              href={listing.shopify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-700 text-slate-200 transition-colors"
              onClick={() => setShowMenu(false)}
            >
              <ExternalLink size={13} className="text-slate-400" />
              View on Shopify
            </a>
          )}
          {status === 'draft' && (
            <button
              onClick={activate}
              className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-slate-700 text-green-400 transition-colors"
            >
              <Check size={13} />
              Publish (Go Live)
            </button>
          )}
          {status === 'active' && (
            <button
              onClick={() => { setLaunching(true); fetch(`${API}/api/shopify/listing/${productId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({status:'draft'}) }).then(() => { setListing(p => p ? {...p, status:'draft'} : p); }).finally(() => { setLaunching(false); setShowMenu(false); }); }}
              className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-slate-700 text-yellow-400 transition-colors"
            >
              <ShoppingBag size={13} />
              Set to Draft
            </button>
          )}
          <button
            onClick={() => { setShowMenu(false); const p = window.prompt('New price (AUD):', listing?.selling_price?.toString()); if (p) { fetch(`${API}/api/shopify/listing/${productId}`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({selling_price:parseFloat(p)})}).then(() => setListing(prev => prev ? {...prev, selling_price: parseFloat(p)} : prev)); } }}
            className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-slate-700 text-blue-400 transition-colors"
          >
            <RefreshCw size={13} />
            Update Price
          </button>
          <button
            onClick={archive}
            className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-red-900/30 text-red-400 transition-colors border-t border-slate-700"
          >
            <Archive size={13} />
            Archive
          </button>
        </div>
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
