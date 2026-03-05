'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getStrategies,
  getStrategyDetail,
  getStrategyPositions,
  getStrategyTrades,
  startStrategy,
  stopStrategy,
  type StrategyItem,
} from '@/lib/api';
import { StrategyListPanel } from '@/components/trading-assistant/StrategyListPanel';
import { StrategyDetailPanel } from '@/components/trading-assistant/StrategyDetailPanel';
import { CreateStrategyModal } from '@/components/create-strategy/CreateStrategyModal';

export default function TradingAssistantPage() {
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadStrategies = useCallback(() => {
    setLoading(true);
    getStrategies()
      .then(setStrategies)
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  const handleSelectStrategy = (id: number | null) => {
    setSelectedId(id);
  };

  const handleCreateSuccess = () => {
    setCreateOpen(false);
    loadStrategies();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0">
      <div className="w-[35%] min-w-[280px] max-w-[400px] flex flex-col border-r border-border bg-card overflow-hidden">
        <StrategyListPanel
          strategies={strategies}
          loading={loading}
          selectedId={selectedId}
          onSelect={handleSelectStrategy}
          onCreateClick={() => setCreateOpen(true)}
          onRefresh={loadStrategies}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col bg-bg-primary overflow-hidden">
        <StrategyDetailPanel
          strategyId={selectedId}
          onRefresh={loadStrategies}
        />
      </div>
      <CreateStrategyModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
