import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Play, Pause, Trash2, MoreVertical, FolderOpen, BarChart2,
  ChevronDown, ChevronRight, Loader2, Bot, Clock, DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import * as strategyApi from '@/api/strategy'
import { cn } from '@/lib/utils'

interface Strategy {
  id: number
  strategy_name: string
  strategy_type: string
  status: 'running' | 'stopped' | 'error'
  trading_config?: {
    symbol?: string
    market?: string
    timeframe?: string
  }
  exchange_config?: {
    exchange_id?: string
  }
  indicator_config?: {
    indicator_name?: string
  }
  created_at?: string
  updated_at?: string
}

interface TradeRecord {
  id: number
  symbol: string
  side: string
  quantity: number
  price: number
  pnl?: number
  created_at: string
}

interface AIDecision {
  id: number
  symbol: string
  decision: string
  reason: string
  confidence: number
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-green-500',
  stopped: 'bg-gray-400',
  error: 'bg-red-500',
}

export default function TradingAssistantPage() {
  const queryClient = useQueryClient()
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [groupBy, setGroupBy] = useState<'strategy' | 'symbol'>('strategy')
  const [detailTab, setDetailTab] = useState('positions')

  // Fetch strategies
  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const res = await strategyApi.getStrategyList()
      return (res.data?.data || []) as Strategy[]
    },
  })

  // Fetch trades for selected
  const { data: trades = [] } = useQuery({
    queryKey: ['strategy-trades', selectedStrategy?.id],
    queryFn: async () => {
      if (!selectedStrategy) return []
      const res = await strategyApi.getStrategyTrades(selectedStrategy.id)
      return (res.data?.data || []) as TradeRecord[]
    },
    enabled: !!selectedStrategy,
  })

  // Fetch positions for selected
  const { data: positions = [] } = useQuery({
    queryKey: ['strategy-positions', selectedStrategy?.id],
    queryFn: async () => {
      if (!selectedStrategy) return []
      const res = await strategyApi.getStrategyPositions(selectedStrategy.id)
      return (res.data?.data || []) as TradeRecord[]
    },
    enabled: !!selectedStrategy,
  })

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['strategy-notifications', selectedStrategy?.id],
    queryFn: async () => {
      if (!selectedStrategy) return []
      const res = await strategyApi.getStrategyNotifications({ id: selectedStrategy.id, limit: 50 })
      return (res.data?.data || []) as AIDecision[]
    },
    enabled: !!selectedStrategy,
  })

  // Mutations
  const startMutation = useMutation({
    mutationFn: (id: number) => strategyApi.startStrategy(id),
    onSuccess: () => { toast.success('Strategy started'); queryClient.invalidateQueries({ queryKey: ['strategies'] }) },
    onError: () => toast.error('Failed to start'),
  })

  const stopMutation = useMutation({
    mutationFn: (id: number) => strategyApi.stopStrategy(id),
    onSuccess: () => { toast.success('Strategy stopped'); queryClient.invalidateQueries({ queryKey: ['strategies'] }) },
    onError: () => toast.error('Failed to stop'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => strategyApi.deleteStrategy(id),
    onSuccess: () => {
      toast.success('Strategy deleted')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      if (selectedStrategy) setSelectedStrategy(null)
    },
    onError: () => toast.error('Failed to delete'),
  })

  // Group strategies
  const grouped = (() => {
    const groups: Record<string, Strategy[]> = {}
    const ungrouped: Strategy[] = []
    for (const s of strategies) {
      const key = groupBy === 'strategy' ? s.strategy_name : (s.trading_config?.symbol || 'Unknown')
      if (key) {
        if (!groups[key]) groups[key] = []
        groups[key].push(s)
      } else {
        ungrouped.push(s)
      }
    }
    return { groups, ungrouped }
  })()

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const runningCount = strategies.filter(s => s.status === 'running').length
  const stoppedCount = strategies.filter(s => s.status === 'stopped').length

  return (
    <div className="flex h-full">
      {/* Left: Strategy List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Strategies</h2>
            <Button size="sm" onClick={() => toast.info('Create strategy dialog — coming soon')}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Group by:</span>
            <div className="flex gap-0.5">
              <Button variant={groupBy === 'strategy' ? 'default' : 'ghost'} size="sm" className="h-6 text-xs"
                onClick={() => setGroupBy('strategy')}>
                <FolderOpen className="h-3 w-3 mr-1" /> Strategy
              </Button>
              <Button variant={groupBy === 'symbol' ? 'default' : 'ghost'} size="sm" className="h-6 text-xs"
                onClick={() => setGroupBy('symbol')}>
                <BarChart2 className="h-3 w-3 mr-1" /> Symbol
              </Button>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            {runningCount > 0 && <Badge variant="secondary" className="bg-green-500/10 text-green-600">{runningCount} Running</Badge>}
            {stoppedCount > 0 && <Badge variant="secondary">{stoppedCount} Stopped</Badge>}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No strategies yet</p>
              <Button size="sm" className="mt-3">
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Strategy
              </Button>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(grouped.groups).map(([name, items]) => (
                <div key={name} className="mb-2">
                  <div
                    className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
                    onClick={() => toggleGroup(name)}
                  >
                    <div className="flex items-center gap-1.5 text-sm">
                      {collapsedGroups[name] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      <span className="font-medium">{name}</span>
                      <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          const ids = items.map(i => i.id)
                          strategyApi.batchStartStrategies({ strategy_ids: ids }).then(() => {
                            toast.success('All started'); queryClient.invalidateQueries({ queryKey: ['strategies'] })
                          })
                        }}>
                          <Play className="h-3.5 w-3.5 mr-2" /> Start All
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const ids = items.map(i => i.id)
                          strategyApi.batchStopStrategies({ strategy_ids: ids }).then(() => {
                            toast.success('All stopped'); queryClient.invalidateQueries({ queryKey: ['strategies'] })
                          })
                        }}>
                          <Pause className="h-3.5 w-3.5 mr-2" /> Stop All
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500" onClick={() => {
                          const ids = items.map(i => i.id)
                          strategyApi.batchDeleteStrategies({ strategy_ids: ids }).then(() => {
                            toast.success('All deleted'); queryClient.invalidateQueries({ queryKey: ['strategies'] })
                          })
                        }}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete All
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {!collapsedGroups[name] && items.map(item => (
                    <StrategyListItem
                      key={item.id}
                      strategy={item}
                      isSelected={selectedStrategy?.id === item.id}
                      onSelect={() => setSelectedStrategy(item)}
                      onStart={() => startMutation.mutate(item.id)}
                      onStop={() => stopMutation.mutate(item.id)}
                      onDelete={() => deleteMutation.mutate(item.id)}
                    />
                  ))}
                </div>
              ))}
              {grouped.ungrouped.map(item => (
                <StrategyListItem
                  key={item.id}
                  strategy={item}
                  isSelected={selectedStrategy?.id === item.id}
                  onSelect={() => setSelectedStrategy(item)}
                  onStart={() => startMutation.mutate(item.id)}
                  onStop={() => stopMutation.mutate(item.id)}
                  onDelete={() => deleteMutation.mutate(item.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: Strategy Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedStrategy ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Select a strategy to view details</p>
            </div>
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{selectedStrategy.strategy_name}</h2>
                  <Badge className={cn('text-white', STATUS_COLORS[selectedStrategy.status])}>
                    {selectedStrategy.status}
                  </Badge>
                  {selectedStrategy.strategy_type === 'PromptBasedStrategy' && (
                    <Badge variant="secondary"><Bot className="h-3 w-3 mr-1" /> AI</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedStrategy.status === 'stopped' ? (
                    <Button size="sm" onClick={() => startMutation.mutate(selectedStrategy.id)}>
                      <Play className="h-3.5 w-3.5 mr-1" /> Start
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => stopMutation.mutate(selectedStrategy.id)}>
                      <Pause className="h-3.5 w-3.5 mr-1" /> Stop
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                {selectedStrategy.trading_config?.symbol && (
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {selectedStrategy.trading_config.symbol}</span>
                )}
                {selectedStrategy.trading_config?.timeframe && (
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {selectedStrategy.trading_config.timeframe}</span>
                )}
                {selectedStrategy.exchange_config?.exchange_id && (
                  <span className="flex items-center gap-1">{selectedStrategy.exchange_config.exchange_id}</span>
                )}
              </div>
            </div>

            {/* Tabs: Positions, Trades, AI Decisions */}
            <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-2 w-fit">
                <TabsTrigger value="positions">Positions</TabsTrigger>
                <TabsTrigger value="trades">Trades</TabsTrigger>
                <TabsTrigger value="decisions">AI Decisions</TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="flex-1 overflow-auto px-4 pb-4">
                {positions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">No open positions</div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {positions.map(p => (
                      <Card key={p.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{p.symbol}</span>
                            <Badge variant={p.side === 'buy' ? 'default' : 'destructive'}>{p.side}</Badge>
                            <span className="text-sm text-muted-foreground">Qty: {p.quantity}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">${p.price.toFixed(2)}</div>
                            {p.pnl !== undefined && (
                              <div className={cn('text-sm', p.pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
                                {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trades" className="flex-1 overflow-auto px-4 pb-4">
                {trades.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">No trade records</div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {trades.map(t => (
                      <Card key={t.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{t.symbol}</span>
                            <Badge variant={t.side === 'buy' ? 'default' : 'destructive'}>{t.side}</Badge>
                            <span className="text-sm text-muted-foreground">Qty: {t.quantity} @ ${t.price.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            {t.pnl !== undefined && (
                              <div className={cn('font-medium', t.pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
                                {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="decisions" className="flex-1 overflow-auto px-4 pb-4">
                {notifications.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">No AI decisions yet</div>
                ) : (
                  <div className="space-y-2 mt-2">
                    {notifications.map(d => (
                      <Card key={d.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge>{d.decision}</Badge>
                              <span className="font-medium">{d.symbol}</span>
                              <span className="text-sm text-muted-foreground">{d.confidence}%</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{d.reason}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}

function StrategyListItem({ strategy, isSelected, onSelect, onStart, onStop, onDelete }: {
  strategy: Strategy
  isSelected: boolean
  onSelect: () => void
  onStart: () => void
  onStop: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn('flex items-center justify-between px-2 py-2 rounded cursor-pointer hover:bg-muted ml-4', isSelected && 'bg-muted')}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0">
        {strategy.trading_config?.symbol && (
          <span className="text-sm font-medium truncate">{strategy.trading_config.symbol}</span>
        )}
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_COLORS[strategy.status])} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {strategy.status === 'stopped' ? (
            <DropdownMenuItem onClick={onStart}><Play className="h-3.5 w-3.5 mr-2" /> Start</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onStop}><Pause className="h-3.5 w-3.5 mr-2" /> Stop</DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-500" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
