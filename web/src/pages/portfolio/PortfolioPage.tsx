import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, RefreshCw, Wallet, TrendingUp, TrendingDown, BarChart2,
  Trophy, AlertTriangle, Loader2, Grid, FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import * as portfolioApi from '@/api/portfolio'
import { cn } from '@/lib/utils'

interface Position {
  id: number
  symbol: string
  market: string
  quantity: number
  avg_cost: number
  current_price?: number
  market_value?: number
  pnl?: number
  pnl_percent?: number
  group_name?: string
}

interface Summary {
  total_market_value: number
  total_cost: number
  total_pnl: number
  total_pnl_percent: number
  position_count: number
  today_pnl?: number
  today_change?: number
}

function formatNumber(n: number | undefined) {
  if (n === undefined || n === null) return '0.00'
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PortfolioPage() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'grid' | 'group'>('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ symbol: '', market: 'USStock', quantity: '', avg_cost: '', group_name: '' })

  const { data: summary = {} as Summary } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: async () => {
      const res = await portfolioApi.getPortfolioSummary()
      return (res.data?.data || {}) as Summary
    },
  })

  const { data: positions = [], isLoading: loadingPositions, refetch: refetchPositions } = useQuery({
    queryKey: ['portfolio-positions'],
    queryFn: async () => {
      const res = await portfolioApi.getPositions()
      return (res.data?.data || []) as Position[]
    },
  })

  const addMutation = useMutation({
    mutationFn: () => portfolioApi.addPosition({
      symbol: addForm.symbol, market: addForm.market,
      quantity: Number(addForm.quantity), avg_cost: Number(addForm.avg_cost),
      group_name: addForm.group_name || undefined,
    }),
    onSuccess: () => {
      toast.success('Position added')
      queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] })
      setShowAddModal(false)
      setAddForm({ symbol: '', market: 'USStock', quantity: '', avg_cost: '', group_name: '' })
    },
    onError: () => toast.error('Failed to add position'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => portfolioApi.deletePosition(id),
    onSuccess: () => {
      toast.success('Position removed')
      queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] })
    },
  })

  const profitCount = positions.filter(p => (p.pnl || 0) >= 0).length
  const lossCount = positions.filter(p => (p.pnl || 0) < 0).length
  const bestPerformer = positions.reduce((best, p) => (!best || (p.pnl_percent || 0) > (best.pnl_percent || 0) ? p : best), null as Position | null)
  const worstPerformer = positions.reduce((worst, p) => (!worst || (p.pnl_percent || 0) < (worst.pnl_percent || 0) ? p : worst), null as Position | null)

  // Group positions
  const grouped = positions.reduce<Record<string, Position[]>>((acc, p) => {
    const g = p.group_name || 'Ungrouped'
    if (!acc[g]) acc[g] = []
    acc[g].push(p)
    return acc
  }, {})

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* Summary cards - Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
            <div>
              <div className="text-sm text-muted-foreground">Total Value</div>
              <div className="text-xl font-bold">${formatNumber(summary.total_market_value)}</div>
              {summary.today_change !== undefined && (
                <div className={cn('text-xs', summary.today_change >= 0 ? 'text-green-500' : 'text-red-500')}>
                  Today: {summary.today_change >= 0 ? '+' : ''}${formatNumber(summary.today_change)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><BarChart2 className="h-5 w-5" /></div>
            <div>
              <div className="text-sm text-muted-foreground">Total Cost</div>
              <div className="text-xl font-bold">${formatNumber(summary.total_cost)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', summary.total_pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10')}>
              {summary.total_pnl >= 0 ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total P&L</div>
              <div className={cn('text-xl font-bold', summary.total_pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
                {summary.total_pnl >= 0 ? '+' : ''}${formatNumber(summary.total_pnl)}
                <span className="text-sm ml-1">({summary.total_pnl_percent >= 0 ? '+' : ''}{summary.total_pnl_percent?.toFixed(2)}%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><BarChart2 className="h-5 w-5 text-blue-500" /></div>
            <div>
              <div className="text-sm text-muted-foreground">Positions</div>
              <div className="text-xl font-bold">
                {summary.position_count}
                <span className="text-sm ml-2 font-normal">
                  (<span className="text-green-500">{profitCount}</span>/<span className="text-red-500">{lossCount}</span>)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary cards - Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn('p-1.5 rounded', summary.today_pnl && summary.today_pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10')}>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Today P&L</div>
              <div className={cn('font-bold', (summary.today_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500')}>
                {(summary.today_pnl || 0) >= 0 ? '+' : ''}${formatNumber(summary.today_pnl || 0)}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded bg-yellow-500/10"><Trophy className="h-4 w-4 text-yellow-500" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Best</div>
              {bestPerformer ? (
                <div className="font-bold text-green-500">{bestPerformer.symbol} +{bestPerformer.pnl_percent?.toFixed(2)}%</div>
              ) : <div className="font-bold">-</div>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-1.5 rounded bg-red-500/10"><AlertTriangle className="h-4 w-4 text-red-500" /></div>
            <div>
              <div className="text-xs text-muted-foreground">Worst</div>
              {worstPerformer ? (
                <div className="font-bold text-red-500">{worstPerformer.symbol} {worstPerformer.pnl_percent?.toFixed(2)}%</div>
              ) : <div className="font-bold">-</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart2 className="h-4 w-4" /> Positions
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-7 w-7"
                onClick={() => setViewMode('grid')}><Grid className="h-3.5 w-3.5" /></Button>
              <Button variant={viewMode === 'group' ? 'default' : 'ghost'} size="icon" className="h-7 w-7"
                onClick={() => setViewMode('group')}><FolderOpen className="h-3.5 w-3.5" /></Button>
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => refetchPositions()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {loadingPositions ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : positions.length === 0 ? (
          <Card><CardContent className="text-center py-12 text-muted-foreground">
            No positions. Add your first position to track your portfolio.
          </CardContent></Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {positions.map(p => <PositionCard key={p.id} position={p} onDelete={() => deleteMutation.mutate(p.id)} />)}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">{group} ({items.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map(p => <PositionCard key={p.id} position={p} onDelete={() => deleteMutation.mutate(p.id)} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Position Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Position</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Symbol</Label>
                <Input value={addForm.symbol} onChange={e => setAddForm(p => ({ ...p, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" />
              </div>
              <div>
                <Label>Market</Label>
                <Select value={addForm.market} onValueChange={v => setAddForm(p => ({ ...p, market: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USStock">US Stock</SelectItem>
                    <SelectItem value="Crypto">Crypto</SelectItem>
                    <SelectItem value="IndianStock">Indian Stock</SelectItem>
                    <SelectItem value="Forex">Forex</SelectItem>
                    <SelectItem value="Futures">Futures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={addForm.quantity} onChange={e => setAddForm(p => ({ ...p, quantity: e.target.value }))} placeholder="10" />
              </div>
              <div>
                <Label>Avg Cost</Label>
                <Input type="number" step="0.01" value={addForm.avg_cost} onChange={e => setAddForm(p => ({ ...p, avg_cost: e.target.value }))} placeholder="150.00" />
              </div>
            </div>
            <div>
              <Label>Group (optional)</Label>
              <Input value={addForm.group_name} onChange={e => setAddForm(p => ({ ...p, group_name: e.target.value }))} placeholder="Tech, Crypto, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!addForm.symbol || !addForm.quantity || !addForm.avg_cost}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PositionCard({ position, onDelete }: { position: Position; onDelete: () => void }) {
  const pnl = position.pnl || 0
  const pnlPercent = position.pnl_percent || 0
  const fmt = (n: number | undefined) => {
    if (n === undefined || n === null) return '0.00'
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return (
    <Card className="relative group">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-bold">{position.symbol}</span>
            <Badge variant="secondary" className="ml-2 text-[10px]">{position.market}</Badge>
          </div>
          <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Qty:</span> {position.quantity}</div>
          <div><span className="text-muted-foreground">Avg:</span> ${position.avg_cost.toFixed(2)}</div>
          {position.current_price ? <div><span className="text-muted-foreground">Price:</span> ${position.current_price.toFixed(2)}</div> : null}
          {position.market_value ? <div><span className="text-muted-foreground">Value:</span> ${fmt(position.market_value)}</div> : null}
        </div>
        <div className={cn('mt-2 font-bold text-right', pnl >= 0 ? 'text-green-500' : 'text-red-500')}>
          {pnl >= 0 ? '+' : ''}${fmt(pnl)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
        </div>
      </CardContent>
    </Card>
  )
}
