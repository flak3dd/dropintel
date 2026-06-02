'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, TrendingUp, Truck, Calculator, Bookmark, ShoppingBag,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Command Centre', icon: LayoutDashboard },
  { href: '/products', label: 'Product Discovery', icon: Package },
  { href: '/market', label: 'Market Intelligence', icon: TrendingUp },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/margins', label: 'Margin Analyser', icon: Calculator },
  { href: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { href: '/settings', label: 'Shopify', icon: ShoppingBag },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            DI
          </div>
          <span className="text-slate-100 font-semibold text-base">DropIntel</span>
        </div>
        <p className="text-slate-500 text-xs mt-1">Market Intelligence</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-indigo-500/15 text-indigo-400 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs">v1.0.0 · AU Market Focus</p>
      </div>
    </aside>
  );
}
