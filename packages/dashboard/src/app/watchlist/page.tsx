'use client';
import { useEffect, useState } from 'react';
import { getWatchlist, updateWatchlistItem, removeFromWatchlist, type WatchlistItemFull } from '@/lib/api';
import { formatPct } from '@/lib/utils';
import { VerdictBadge } from '@/components/VerdictBadge';
import { TrendBadge } from '@/components/TrendBadge';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { Trash2 } from 'lucide-react';

const STAGES = ['watching', 'testing', 'scaling', 'dropped'] as const;
type Stage = typeof STAGES[number];

const STAGE_COLORS: Record<Stage, string> = {
  watching: 'border-slate-600 bg-slate-800/30',
  testing: 'border-yellow-500/30 bg-yellow-500/5',
  scaling: 'border-green-500/30 bg-green-500/5',
  dropped: 'border-red-500/20 bg-red-500/5',
};

const STAGE_LABELS: Record<Stage, string> = {
  watching: 'Watching',
  testing: 'Testing',
  scaling: 'Scaling',
  dropped: 'Dropped',
};

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItemFull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWatchlist().then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const moveItem = async (id: string, stage: Stage) => {
    try {
      await updateWatchlistItem(id, { stage });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, stage } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (id: string) => {
    try {
      await removeFromWatchlist(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const byStage = (stage: Stage) => items.filter((i) => i.stage === stage);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Product Watchlist</h1>
        <p className="text-slate-400 text-sm mt-1">Track products through your testing and scaling pipeline</p>
      </div>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className={`rounded-xl border p-4 ${STAGE_COLORS[stage]}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-200">{STAGE_LABELS[stage]}</h2>
                <span className="text-xs text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">
                  {byStage(stage).length}
                </span>
              </div>

              <div className="space-y-3">
                {byStage(stage).map((item) => (
                  <WatchlistCard key={item.id} item={item} stages={STAGES} currentStage={stage} onMove={moveItem} onRemove={removeItem} />
                ))}

                {byStage(stage).length === 0 && (
                  <div className="text-slate-600 text-xs text-center py-6 border border-dashed border-slate-700 rounded-lg">
                    No products
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
  item, stages, currentStage, onMove, onRemove
}: {
  item: WatchlistItemFull;
  stages: readonly Stage[];
  currentStage: Stage;
  onMove: (id: string, stage: Stage) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-1">
        <p className="text-slate-200 text-xs font-medium leading-snug line-clamp-2 flex-1">{item.product_title}</p>
        <button
          onClick={() => onRemove(item.id)}
          className="text-slate-700 hover:text-red-400 transition-colors shrink-0"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">{item.product_category}</span>
        {item.net_margin_pct && (
          <span className="text-green-400 text-xs font-bold">{formatPct(item.net_margin_pct)}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <TrendBadge direction={item.trend_direction} className="text-xs" />
        {item.verdict && <VerdictBadge verdict={item.verdict} />}
      </div>

      {item.notes && (
        <p className="text-slate-500 text-xs leading-snug border-t border-slate-800 pt-2">{item.notes}</p>
      )}

      {/* Move buttons */}
      <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800">
        {stages.filter((s) => s !== currentStage).map((s) => (
          <button
            key={s}
            onClick={() => onMove(item.id, s)}
            className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition-colors capitalize"
          >
            → {s}
          </button>
        ))}
      </div>
    </div>
  );
}
