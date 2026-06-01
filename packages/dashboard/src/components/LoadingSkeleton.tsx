import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  rows?: number;
}

export function LoadingSkeleton({ className, rows = 5 }: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}
