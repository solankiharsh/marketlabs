'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  User,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai-analysis', label: 'AI Asset Analysis', icon: Sparkles },
  { href: '/indicator-analysis', label: 'Indicator Analysis', icon: LineChart },
  { href: '/indicator-market', label: 'Indicator Market', icon: ShoppingBag },
  { href: '/my-profile', label: 'My Profile', icon: User },
  { href: '/membership', label: 'Membership', icon: CreditCard },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ collapsed, onCollapsedChange, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const linkClass = (href: string) => {
    const isActive = href === '/' ? pathname === '/' || pathname === '/dashboard' : pathname?.startsWith(href);
    return cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/30'
        : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary border border-transparent'
    );
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-card transition-all duration-200 lg:static lg:z-auto',
          collapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg text-accent-primary">
              <BarChart3 className="h-6 w-6" />
              MarketLabs
            </Link>
          )}
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className="rounded p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary hidden lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={linkClass(item.href)}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
