'use client';
import { useEffect, useState } from 'react';
import {
  getThreads, getSuppliers, createThread,
  type SupplierThread, type Supplier,
} from '@/lib/api';
import { MessageThread } from '@/components/MessageThread';
import { MessageSquare, Plus, X, Circle } from 'lucide-react';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-400',
  replied: 'text-green-400',
  closed: 'text-slate-500',
  ordered: 'text-purple-400',
};

type FilterTab = 'all' | 'open' | 'replied' | 'closed';

export default function InboxPage() {
  const [threads, setThreads] = useState<SupplierThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [composeOpen, setComposeOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const loadThreads = () => {
    setLoading(true);
    getThreads().then(setThreads).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadThreads();
    getSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  const filtered = threads.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'replied') return t.status === 'replied';
    return t.status === filter;
  });

  const unreadTotal = threads.filter((t) => (t.unread_count ?? 0) > 0).length;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left panel */}
      <div className="w-80 shrink-0 flex flex-col border-r border-slate-800 bg-slate-900">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-slate-100 font-semibold text-base flex items-center gap-2">
              Inbox
              {unreadTotal > 0 && (
                <span className="bg-indigo-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{unreadTotal}</span>
              )}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">{threads.length} conversations</p>
          </div>
          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Plus size={13} />
            New
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex px-3 pt-2 gap-1 border-b border-slate-800 pb-2">
          {(['all', 'open', 'replied', 'closed'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${filter === tab ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {tab === 'replied' ? 'Awaiting Reply' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
              No conversations yet.
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors ${selected === t.id ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {(t.unread_count ?? 0) > 0 && (
                        <Circle size={7} className="fill-indigo-400 text-indigo-400 shrink-0" />
                      )}
                      <span className="text-slate-200 text-xs font-semibold truncate">{t.supplier_name}</span>
                    </div>
                    {t.product_title && (
                      <p className="text-slate-500 text-xs truncate mt-0.5">{t.product_title}</p>
                    )}
                    <p className="text-slate-400 text-xs truncate mt-0.5">{t.subject}</p>
                    {t.last_message_preview && (
                      <p className="text-slate-600 text-xs truncate mt-0.5">{t.last_message_preview}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-slate-600 text-xs">{relativeTime(t.last_message_at)}</p>
                    <span className={`text-xs capitalize mt-1 block ${STATUS_COLORS[t.status] ?? 'text-slate-500'}`}>{t.status}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {selected ? (
          <MessageThread
            threadId={selected}
            onStatusChange={() => loadThreads()}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Select a conversation to view</p>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <ComposeModal
          suppliers={suppliers}
          onClose={() => setComposeOpen(false)}
          onCreated={(id) => {
            loadThreads();
            setSelected(id);
            setComposeOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ComposeModal({
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
  const [supplierId, setSupplierId] = useState(defaultSupplierId ?? '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!supplierId || !subject.trim() || !body.trim()) {
      setError('All fields are required.');
      return;
    }
    setSending(true);
    try {
      const thread = await createThread({ supplier_id: supplierId, subject: subject.trim(), body: body.trim() });
      onCreated(thread.id);
    } catch {
      setError('Failed to create thread.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-slate-100 font-semibold">New Message</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select a supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Inquiry: Pricing for Product X"
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
