'use client';
import { useEffect, useRef, useState } from 'react';
import {
  getThread, replyToThread, updateThreadStatus, sendThreadEmail,
  type SupplierThread, type SupplierMessage,
} from '@/lib/api';
import { X, Send, Mail, MessageSquare, ChevronDown } from 'lucide-react';

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

const STATUS_OPTIONS = ['open', 'replied', 'closed', 'ordered'];
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  replied: 'bg-green-500/15 text-green-300 border-green-500/30',
  closed: 'bg-slate-700 text-slate-400 border-slate-600',
  ordered: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
};

const VIA_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'platform', label: 'Platform Note' },
];

interface Props {
  threadId: string;
  onClose?: () => void;
  onStatusChange?: (status: string) => void;
}

export function MessageThread({ threadId, onClose, onStatusChange }: Props) {
  const [thread, setThread] = useState<SupplierThread | null>(null);
  const [messages, setMessages] = useState<SupplierMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [via, setVia] = useState('email');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getThread(threadId)
      .then(({ thread, messages }) => {
        setThread(thread);
        setMessages(messages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function showToast(type: 'ok' | 'err', text: string) {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSend() {
    if (!body.trim() || !thread) return;
    setSending(true);
    try {
      const msg = await replyToThread(threadId, body.trim(), 'outbound', via);
      setMessages((prev) => [...prev, msg]);
      setBody('');
      setThread((t) => t ? { ...t, status: 'open', last_message_at: new Date().toISOString() } : t);
    } catch {
      showToast('err', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  async function handleSendEmail() {
    if (!body.trim()) return;
    setSending(true);
    try {
      const result = await sendThreadEmail(threadId, body.trim());
      if (result.sent) {
        showToast('ok', 'Email sent successfully.');
        const msg = await replyToThread(threadId, body.trim(), 'outbound', 'email');
        setMessages((prev) => [...prev, msg]);
        setBody('');
      } else if (result.mailto) {
        window.open(result.mailto, '_blank');
        showToast('ok', 'Opened mailto link in email client.');
      }
    } catch {
      showToast('err', 'Failed to send email.');
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!thread) return;
    try {
      await updateThreadStatus(threadId, newStatus);
      setThread((t) => t ? { ...t, status: newStatus } : t);
      onStatusChange?.(newStatus);
    } catch {
      showToast('err', 'Failed to update status.');
    }
    setStatusOpen(false);
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-950 animate-pulse">
        <div className="h-16 bg-slate-800 border-b border-slate-700" />
        <div className="flex-1 p-6 space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <p className="text-slate-500">Thread not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 min-h-0 relative">
      {/* Toast */}
      {toast && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-800 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-100 font-semibold text-sm truncate">{thread.supplier_name}</span>
            {thread.product_title && (
              <span className="text-slate-500 text-xs">· {thread.product_title}</span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{thread.subject}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${STATUS_COLORS[thread.status] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}
            >
              {thread.status}
              <ChevronDown size={11} />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 min-w-[120px]">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 capitalize ${s === thread.status ? 'text-indigo-400 font-medium' : 'text-slate-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">No messages yet.</div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.direction === 'outbound' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'}`}>
              <p className="text-xs font-medium mb-1 opacity-70">
                {msg.sender_name ?? (msg.direction === 'outbound' ? 'You' : 'Supplier')}
                <span className="ml-2 font-normal opacity-60">{relativeTime(msg.created_at)}</span>
                <span className="ml-2 opacity-50">via {msg.sent_via}</span>
              </p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={12} className="text-slate-500" />
          <span className="text-slate-500 text-xs">Via:</span>
          <div className="flex gap-1">
            {VIA_OPTIONS.map((v) => (
              <button
                key={v.value}
                onClick={() => setVia(v.value)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${via === v.value ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSend}
              disabled={!body.trim() || sending}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-colors"
            >
              <Send size={13} />
              Send
            </button>
            {via === 'email' && (
              <button
                onClick={handleSendEmail}
                disabled={!body.trim() || sending}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs font-medium rounded-xl transition-colors"
              >
                <Mail size={13} />
                Email
              </button>
            )}
          </div>
        </div>
        <p className="text-slate-600 text-xs mt-1.5">⌘+Enter to send</p>
      </div>
    </div>
  );
}
