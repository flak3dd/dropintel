import { cn, trendIcon, trendColor } from '@/lib/utils';

interface Props {
  direction: string | null | undefined;
  className?: string;
}

export function TrendBadge({ direction, className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-medium', trendColor(direction), className)}>
      <span>{trendIcon(direction)}</span>
      <span className="capitalize">{direction ?? 'Unknown'}</span>
    </span>
  );
}
