'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Check, X, ExternalLink, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface Listing {
  id: string;
  title: string;
  category: string;
  status: string;
  selling_price: number;
  shopify_url: string;
  last_synced: string;
}

const STATUS_BADGE: Record<string, string> = {
  draft:    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  active:   'bg-green-500/20 text-green-300 border border-green-500/30',
  archived: 'bg-slate-600/40 text-slate-400 border border-slate-600',
};

export default function ShopifySettings() {
  const [status, setStatus] = useState<{ connected: boolean; shop?: string; error?: string } | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState(process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN || '');
  const [token, setToken] = useState('');
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/shopify/status`).then(r => r.json()).catch(() => ({ connected: false, error: 'API unreachable' })),
      fetch(`${API}/api/shopify/listings`).then(r => r.json()).catch(() => []),
    ]).then(([s, l]) => {
      setStatus(s);
      setListings(Array.isArray(l) ? l : []);
    }).finally(() => setLoading(false));
  }, []);

  async function testConnection() {
    setTesting(true);
    const res = await fetch(`${API}/api/shopify/status`).then(r => r.json()).catch(() => ({ connected: false, error: 'API error' }));
    setStatus(res);
    setTesting(false);
  }

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Shopify Integration</h1>
        <p className="text-slate-400 text-sm mt-1">Connect your Shopify store to launch products with one click</p>
      </div>

      {/* Connection status */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">Store Connection</h2>
          <button
            onClick={testConnection}
            disabled={testing}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <RefreshCw size={11} className={testing ? 'animate-spin' : ''} />
            Test
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 size={14} className="animate-spin" /> Checking…</div>
        ) : status?.connected ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">Connected — {status.shop}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-red-400 text-sm">Not connected</span>
            {status?.error && <span className="text-slate-500 text-xs">— {status.error}</span>}
          </div>
        )}

        {/* Setup instructions */}
        {!status?.connected && (
          <div className="mt-4 space-y-3">
            <p className="text-slate-400 text-xs">Add these to your <code className="text-blue-400">.env</code> file:</p>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1">
              <p><span className="text-slate-500"># Your store URL</span></p>
              <p className="text-green-400">SHOPIFY_STORE_DOMAIN=<span className="text-slate-200">your-store.myshopify.com</span></p>
              <p className="mt-2"><span className="text-slate-500"># Admin API access token (starts with shpat_)</span></p>
              <p className="text-green-400">SHOPIFY_ACCESS_TOKEN=<span className="text-slate-200">shpat_xxxxxxxxxxxxxxxxxxxx</span></p>
            </div>
            <div className="flex items-start gap-2 text-slate-400 text-xs">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-yellow-400" />
              <span>Get your access token: Shopify Admin → Settings → Apps → Develop apps → Create app → Admin API scopes: <code className="text-blue-400">write_products, read_products</code></span>
            </div>
            <a
              href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs"
            >
              Shopify docs — Create a custom app <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>

      {/* Active listings */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-200">
            Shopify Listings
            <span className="ml-2 text-slate-500 font-normal">{listings.length}</span>
          </h2>
          {status?.connected && (
            <a
              href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_DOMAIN ?? ''}/admin/products`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              Manage in Shopify <ExternalLink size={11} />
            </a>
          )}
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <ShoppingBag size={28} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No products launched to Shopify yet.</p>
            <p className="text-xs mt-1">Use the <strong className="text-slate-400">Launch to Shopify</strong> button on any product.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr className="text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Price</th>
                <th className="text-right px-5 py-3">Last Synced</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {listings.map(l => (
                <tr key={l.id} className="border-t border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-slate-200 font-medium line-clamp-1">{l.title}</p>
                    <p className="text-slate-500 text-xs">{l.category}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[l.status] ?? STATUS_BADGE.archived}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">
                    ${Number(l.selling_price).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500 text-xs">
                    {new Date(l.last_synced).toLocaleDateString('en-AU')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {l.shopify_url && (
                      <a href={l.shopify_url} target="_blank" rel="noopener noreferrer"
                        className="text-slate-400 hover:text-slate-200">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* API scopes reference */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Required Shopify API Scopes</h2>
        <div className="space-y-1.5 text-sm">
          {[
            ['write_products', 'Create and update product listings'],
            ['read_products', 'Read product details and variants'],
            ['write_inventory', 'Manage inventory levels (optional)'],
          ].map(([scope, desc]) => (
            <div key={scope} className="flex items-center gap-3">
              <Check size={13} className="text-green-400 flex-shrink-0" />
              <code className="text-blue-400 text-xs">{scope}</code>
              <span className="text-slate-500 text-xs">— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
