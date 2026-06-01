'use client';
import type { TrendPoint } from '@/lib/api';

interface Props {
  data: TrendPoint[];
  color?: string;
  width?: number;
  height?: number;
}

export function SparkLine({ data, color = '#6366f1', width = 80, height = 30 }: Props) {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} />;
  }

  const volumes = data.map((d) => d.volume);
  const min = Math.min(...volumes);
  const max = Math.max(...volumes);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.volume - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
