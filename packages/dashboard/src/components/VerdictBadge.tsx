import { cn, verdictColor } from '@/lib/utils';

interface Props {
  verdict: string | null | undefined;
  className?: string;
}

export function VerdictBadge({ verdict, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize',
        verdictColor(verdict),
        className
      )}
    >
      {verdict ?? 'N/A'}
    </span>
  );
}
