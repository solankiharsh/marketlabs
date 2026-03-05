'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex h-14 items-center gap-2 border-b border-border bg-card/95 px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-display font-bold text-accent-primary">MarketLabs</span>
        </div>
        <TopBar />
        <main className={cn('flex-1 px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3')}>
          {children}
        </main>
      </div>
    </div>
  );
}
