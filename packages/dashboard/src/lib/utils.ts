import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(val: number | string | null | undefined): string {
  if (val == null || val === '') return 'N/A';
  const n = Number(val);
  if (isNaN(n)) return 'N/A';
  return `$${n.toFixed(2)}`;
}

export function formatPct(val: number | string | null | undefined): string {
  if (val == null || val === '') return 'N/A';
  const n = Number(val);
  if (isNaN(n)) return 'N/A';
  return `${n.toFixed(1)}%`;
}

export function verdictColor(verdict: string | null | undefined): string {
  switch (verdict) {
    case 'excellent': return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'good': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    case 'marginal': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'poor': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
}

export function trendIcon(direction: string | null | undefined): string {
  switch (direction) {
    case 'rising': return '↑';
    case 'declining': return '↓';
    default: return '→';
  }
}

export function trendColor(direction: string | null | undefined): string {
  switch (direction) {
    case 'rising': return 'text-green-400';
    case 'declining': return 'text-red-400';
    default: return 'text-slate-400';
  }
}

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    ebay_au: 'eBay AU',
    amazon_au: 'Amazon AU',
    shopify: 'Shopify',
    etsy: 'Etsy',
    woocommerce: 'WooCommerce',
    aliexpress: 'AliExpress',
    cjdropshipping: 'CJDropshipping',
  };
  return labels[platform] ?? platform;
}
