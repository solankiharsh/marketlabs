'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPortfolioPositions,
  getPortfolioSummary,
  getMonitors,
  getPortfolioGroups,
  deletePosition,
} from '@/lib/api';
import type { PortfolioPosition, PortfolioMonitor, PortfolioSummaryData } from '@/lib/api/portfolio-types';
import { PortfolioSummary } from '@/components/ai-analysis/PortfolioSummary';
import { PositionsList } from '@/components/ai-analysis/PositionsList';
import { AIMonitorsSection } from '@/components/ai-analysis/AIMonitorsSection';
import { AddPositionModal } from '@/components/ai-analysis/AddPositionModal';
import { AddMonitorModal } from '@/components/ai-analysis/AddMonitorModal';
import { toast } from 'sonner';

const REFRESH_INTERVAL_MS = 30000;

export function AssetPoolTab() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummaryData>({});
  const [monitors, setMonitors] = useState<PortfolioMonitor[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addPositionOpen, setAddPositionOpen] = useState(false);
  const [addMonitorOpen, setAddMonitorOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [pos, sum, mon, grp] = await Promise.all([
        getPortfolioPositions(isRefresh),
        getPortfolioSummary(isRefresh),
        getMonitors(),
        getPortfolioGroups(),
      ]);
      setPositions(Array.isArray(pos) ? pos : []);
      setSummary((typeof sum === 'object' && sum ? sum : {}) as PortfolioSummaryData);
      setMonitors(Array.isArray(mon) ? mon : []);
      setGroups(Array.isArray(grp) ? grp : []);
      setLastSync(new Date());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [load]);

  const handleDeletePosition = async (id: number) => {
    try {
      await deletePosition(id);
      toast.success('Position removed');
      load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-text-muted">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortfolioSummary
        summary={summary}
        positions={positions}
        lastSync={lastSync}
        onRefresh={() => load(true)}
        isRefreshing={refreshing}
      />
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-7">
          <PositionsList
            positions={positions}
            groups={groups}
            onAddClick={() => setAddPositionOpen(true)}
            onDelete={handleDeletePosition}
          />
        </div>
        <div className="lg:col-span-3">
          <AIMonitorsSection
            monitors={monitors}
            onAddClick={() => setAddMonitorOpen(true)}
            onRefresh={() => load(true)}
          />
        </div>
      </div>

      <AddPositionModal
        open={addPositionOpen}
        onClose={() => setAddPositionOpen(false)}
        onSuccess={() => load(true)}
      />
      <AddMonitorModal
        open={addMonitorOpen}
        onClose={() => setAddMonitorOpen(false)}
        onSuccess={() => load(true)}
        positions={positions}
      />
    </div>
  );
}
