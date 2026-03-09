import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Edit,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { client } from '@/api/client'
import { cn } from '@/lib/utils'

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'] as const

const MARKET_COLORS: Record<string, string> = {
  USStock: 'bg-blue-500',
  Crypto: 'bg-orange-500',
  IndianStock: 'bg-green-500',
  Forex: 'bg-purple-500',
  Futures: 'bg-red-500',
}

interface Indicator {
  id: number
  name: string
  code: string
  description?: string
  type: 'custom' | 'community'
  is_active?: boolean
}

interface SymbolSuggestion {
  market: string
  symbol: string
  name?: string
  value: string
}

export default function IndicatorAnalysisPage() {
  const queryClient = useQueryClient()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [currentSymbol, setCurrentSymbol] = useState('AAPL')
  const [currentMarket, setCurrentMarket] = useState('USStock')
  const [timeframe, setTimeframe] = useState<string>('1D')
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [searchSymbol, setSearchSymbol] = useState('')
  const [symbolSuggestions, setSymbolSuggestions] = useState<SymbolSuggestion[]>([])
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set())
  const [customCollapsed, setCustomCollapsed] = useState(false)
  const [communityCollapsed, setCommunityCollapsed] = useState(false)
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null)
  const [editorName, setEditorName] = useState('')
  const [editorCode, setEditorCode] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Fetch custom indicators
  const { data: customIndicators = [] } = useQuery({
    queryKey: ['my-indicators'],
    queryFn: async () => {
      const res = await client.get('/api/indicator/list')
      return (res.data?.data || []) as Indicator[]
    },
  })

  // Fetch community indicators
  const { data: communityIndicators = [] } = useQuery({
    queryKey: ['community-indicators'],
    queryFn: async () => {
      const res = await client.get('/api/indicator/community')
      return (res.data?.data || []) as Indicator[]
    },
  })

  // Load K-line chart (TradingView widget or custom chart)
  useEffect(() => {
    if (!chartContainerRef.current) return
    const container = chartContainerRef.current
    // Clear previous
    container.innerHTML = ''

    // Load kline data from API
    const fetchKline = async () => {
      try {
        const res = await client.get('/api/indicator/kline', {
          params: { market: currentMarket, symbol: currentSymbol, timeframe, limit: 500 }
        })
        const data = res.data?.data
        if (data && data.length > 0) {
          const last = data[data.length - 1]
          setCurrentPrice(last.close || 0)
          const first = data[0]
          if (first.close) setPriceChange(((last.close - first.close) / first.close * 100))
        }
      } catch { /* handled by chart component */ }
    }
    fetchKline()

    // TradingView lightweight chart placeholder
    const msg = document.createElement('div')
    msg.className = 'flex items-center justify-center h-full text-muted-foreground'
    msg.innerHTML = `
      <div class="text-center">
        <div class="text-4xl mb-2">📈</div>
        <div class="text-lg font-medium">${currentSymbol} (${currentMarket})</div>
        <div class="text-sm">Timeframe: ${timeframe}</div>
        <div class="text-xs mt-2 opacity-60">Chart rendering — integrate TradingView widget or lightweight-charts here</div>
      </div>
    `
    container.appendChild(msg)
  }, [currentSymbol, currentMarket, timeframe])

  // Symbol search
  const handleSymbolSearch = useCallback((keyword: string) => {
    setSearchSymbol(keyword)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!keyword || keyword.length < 1) { setSymbolSuggestions([]); return }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await client.get('/api/market/symbols/search', { params: { keyword, limit: 20 } })
        const items = (res.data?.data || []) as Array<{ market: string; symbol: string; name?: string }>
        setSymbolSuggestions(items.map(i => ({ ...i, value: `${i.market}:${i.symbol}` })))
      } catch { setSymbolSuggestions([]) }
    }, 300)
  }, [])

  const selectSymbol = (value: string) => {
    if (value === '__add__') return
    const [market, symbol] = value.split(':')
    setCurrentMarket(market)
    setCurrentSymbol(symbol)
    setSearchSymbol('')
    setSymbolSuggestions([])
  }

  const toggleIndicator = (indicator: Indicator, type: string) => {
    const key = `${type}-${indicator.id}`
    setActiveIndicators(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleCreateIndicator = () => {
    setEditingIndicator(null)
    setEditorName('')
    setEditorCode('// Write your indicator code here\n// Available: close, open, high, low, volume arrays\n')
    setShowEditorModal(true)
  }

  const handleEditIndicator = (indicator: Indicator) => {
    setEditingIndicator(indicator)
    setEditorName(indicator.name)
    setEditorCode(indicator.code || '')
    setShowEditorModal(true)
  }

  const saveIndicator = async () => {
    try {
      if (editingIndicator) {
        await client.put(`/api/indicator/${editingIndicator.id}`, { name: editorName, code: editorCode })
        toast.success('Indicator updated')
      } else {
        await client.post('/api/indicator/create', { name: editorName, code: editorCode })
        toast.success('Indicator created')
      }
      queryClient.invalidateQueries({ queryKey: ['my-indicators'] })
      setShowEditorModal(false)
    } catch { toast.error('Failed to save') }
  }

  const deleteIndicator = async (indicator: Indicator) => {
    try {
      await client.delete(`/api/indicator/${indicator.id}`)
      toast.success('Indicator deleted')
      queryClient.invalidateQueries({ queryKey: ['my-indicators'] })
    } catch { toast.error('Failed to delete') }
  }

  const priceChangeClass = priceChange >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={`${currentMarket}:${currentSymbol}`} onValueChange={selectSymbol}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <Input
                  placeholder="Search symbols..."
                  value={searchSymbol}
                  onChange={e => handleSymbolSearch(e.target.value)}
                  className="mb-2"
                />
              </div>
              {symbolSuggestions.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn('text-[10px] text-white px-1', MARKET_COLORS[s.market])}>
                      {s.market}
                    </Badge>
                    <span className="font-medium">{s.symbol}</span>
                    {s.name ? <span className="text-xs text-muted-foreground">{s.name}</span> : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeframes */}
        <div className="flex gap-0.5">
          {TIMEFRAMES.map(tf => (
            <Button
              key={tf}
              variant={timeframe === tf ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>

        {/* Current price */}
        {currentSymbol && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="font-bold text-lg">{currentSymbol}</span>
            <Badge variant="secondary">{currentMarket}</Badge>
            <span className="font-bold text-lg">{currentPrice.toFixed(2)}</span>
            <span className={cn('text-sm font-medium', priceChangeClass)}>
              {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Chart area */}
        <div className="flex-1 relative">
          <div ref={chartContainerRef} className="absolute inset-0 bg-background" />
        </div>

        {/* Indicators panel */}
        <div className="w-72 border-l flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="font-medium text-sm">Indicators</span>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {/* My indicators */}
              <div className="mb-3">
                <div
                  className="flex items-center justify-between cursor-pointer px-2 py-1.5 rounded hover:bg-muted"
                  onClick={() => setCustomCollapsed(!customCollapsed)}
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    {customCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>My Indicators ({customIndicators.length})</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); handleCreateIndicator() }}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {!customCollapsed && (
                  <div className="space-y-1 mt-1">
                    {customIndicators.map(ind => {
                      const key = `custom-${ind.id}`
                      const isActive = activeIndicators.has(key)
                      return (
                        <div
                          key={key}
                          className={cn('flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-muted group', isActive && 'bg-primary/10')}
                          onClick={() => toggleIndicator(ind, 'custom')}
                        >
                          <span className="flex-1 truncate">{ind.name}</span>
                          <div className="hidden group-hover:flex items-center gap-0.5">
                            <TooltipProvider>
                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={e => { e.stopPropagation(); handleEditIndicator(ind) }}>
                                  <Edit className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                              </TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={e => { e.stopPropagation(); deleteIndicator(ind) }}>
                                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                                </button>
                              </TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                        </div>
                      )
                    })}
                    {customIndicators.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-3">
                        No custom indicators yet.
                        <button className="text-primary ml-1" onClick={handleCreateIndicator}>Create one</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Community indicators */}
              <div>
                <div
                  className="flex items-center justify-between cursor-pointer px-2 py-1.5 rounded hover:bg-muted"
                  onClick={() => setCommunityCollapsed(!communityCollapsed)}
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    {communityCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>Community ({communityIndicators.length})</span>
                  </div>
                </div>
                {!communityCollapsed && (
                  <div className="space-y-1 mt-1">
                    {communityIndicators.map(ind => {
                      const key = `community-${ind.id}`
                      const isActive = activeIndicators.has(key)
                      return (
                        <div
                          key={key}
                          className={cn('flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer hover:bg-muted', isActive && 'bg-primary/10')}
                          onClick={() => toggleIndicator(ind, 'community')}
                        >
                          <span className="flex-1 truncate">{ind.name}</span>
                          <div className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                        </div>
                      )
                    })}
                    {communityIndicators.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-3">No community indicators</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Editor Modal */}
      <Dialog open={showEditorModal} onOpenChange={setShowEditorModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIndicator ? 'Edit Indicator' : 'Create Indicator'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editorName} onChange={e => setEditorName(e.target.value)} placeholder="My Indicator" />
            </div>
            <div>
              <Label>Code</Label>
              <Textarea
                value={editorCode}
                onChange={e => setEditorCode(e.target.value)}
                className="font-mono text-sm min-h-[300px]"
                placeholder="// Write indicator code..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditorModal(false)}>Cancel</Button>
            <Button onClick={saveIndicator} disabled={!editorName}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
