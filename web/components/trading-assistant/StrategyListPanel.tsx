'use client';

import { useState, useMemo } from 'react';
import { Plus, FolderOpen, Circle, MoreVertical, ChevronDown, ChevronRight } from 'lucide-react';
import type { StrategyItem } from '@/lib/api';

type GroupBy = 'strategy' | 'symbol';

interface StrategyListPanelProps {
  strategies: StrategyItem[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  onCreateClick: () => void;
  onRefresh: () => void;
}

interface Group {
  key: string;
  label: string;
  items: StrategyItem[];
  runningCount: number;
}

function getStrategyName(s: StrategyItem): string {
  return (s as Record<string, unknown>).strategy_name as string ?? (s.name as string) ?? 'Strategy';
}

function getSymbol(s: StrategyItem): string {
  return (s.symbol as string) ?? '—';
}

function getStatus(s: StrategyItem): string {
  return (s.status as string) ?? 'stopped';
}

export function StrategyListPanel({
  strategies,
  loading,
  selectedId,
  onSelect,
  onCreateClick,
}: StrategyListPanelProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('strategy');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo((): Group[] => {
    if (groupBy === 'strategy') {
      const byName = new Map<string, StrategyItem[]>();
      for (const s of strategies) {
        const name = (s as Record<string, unknown>).group_base_name as string ?? getStrategyName(s);
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(s);
      }
      return Array.from(byName.entries()).map(([key, items]) => ({
        key,
        label: key,
        items,
        runningCount: items.filter((i) => getStatus(i) === 'running').length,
      }));
    }
    const bySymbol = new Map<string, StrategyItem[]>();
    for (const s of strategies) {
      const sym = getSymbol(s);
      if (!bySymbol.has(sym)) bySymbol.set(sym, []);
      bySymbol.get(sym)!.push(s);
    }
    return Array.from(bySymbol.entries()).map(([key, items]) => ({
      key,
      label: key,
      items,
      runningCount: items.filter((i) => getStatus(i) === 'running').length,
    }));
  }, [strategies, groupBy]);

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border shrink-0">
        <h2 className="font-semibold text-text-primary">Strategy List</h2>
        <button
          type="button"
          onClick={onCreateClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-primary text-sm font-medium hover:bg-accent-primary/30"
        >
          <Plus className="h-4 w-4" />
          Create Strategy
        </button>
      </div>
      <div className="flex gap-1 p-2 border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => setGroupBy('strategy')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium ${
            groupBy === 'strategy'
              ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
              : 'text-text-muted border border-transparent hover:bg-bg-elevated hover:text-text-primary'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          Strategy
        </button>
        <button
          type="button"
          onClick={() => setGroupBy('symbol')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium ${
            groupBy === 'symbol'
              ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
              : 'text-text-muted border border-transparent hover:bg-bg-elevated hover:text-text-primary'
          }`}
        >
          <Circle className="h-4 w-4" />
          Symbol
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="text-sm text-text-muted py-4">Loading...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No strategies. Create one to get started.</p>
        ) : (
          <ul className="space-y-1">
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.key);
              return (
                <li key={group.key} className="rounded-lg border border-border bg-bg-secondary/50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(group.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-elevated/50"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />
                    )}
                    <FolderOpen className="h-4 w-4 text-text-muted shrink-0" />
                    <span className="font-medium text-text-primary truncate flex-1">{group.label}</span>
                    <span className="text-xs text-text-muted shrink-0">{group.items.length} symbols</span>
                    <span
                      className={`text-xs shrink-0 ${
                        group.runningCount > 0 ? 'text-green-500' : 'text-text-muted'
                      }`}
                    >
                      {group.runningCount} Running
                    </span>
                  </button>
                  {!isCollapsed && (
                    <ul className="border-t border-border">
                      {group.items.map((s) => {
                        const sid = s.id as number;
                        const status = getStatus(s);
                        const isSelected = selectedId === sid;
                        const symbol = getSymbol(s);
                        return (
                          <li key={sid} className="group">
                            <button
                              type="button"
                              onClick={() => onSelect(sid)}
                              className={`w-full flex items-center gap-2 px-3 py-2 pl-8 text-left text-sm border-l-2 ${
                                isSelected
                                  ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                                  : 'border-transparent hover:bg-bg-elevated/50 text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  status === 'running'
                                    ? 'bg-green-500'
                                    : status === 'error'
                                      ? 'bg-red-500'
                                      : 'bg-text-muted'
                                }`}
                                aria-hidden
                              />
                              <span className="truncate flex-1">{symbol}</span>
                              <span
                                className={`text-xs shrink-0 ${
                                  status === 'running' ? 'text-green-500' : 'text-text-muted'
                                }`}
                              >
                                {status}
                              </span>
                              <MoreVertical className="h-4 w-4 text-text-muted shrink-0 opacity-60 group-hover:opacity-100" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
