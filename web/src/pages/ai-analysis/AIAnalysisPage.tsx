import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Star, Plus, X, Zap, History,
  ChevronUp, ChevronDown, Bot, Loader2, Calendar, Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { client } from '@/api/client'
import * as fastAnalysisApi from '@/api/fastAnalysis'
import * as globalMarketApi from '@/api/globalMarket'
import { subscribeToWatchlist, onPriceUpdate, unsubscribePrices, type PriceUpdate } from '@/utils/socket'
import { cn } from '@/lib/utils'

// --- Types ---
interface WatchlistItem {
  market: string
  symbol: string
  name?: string
}

interface MarketIndex {
  symbol: string
  flag: string
  price: number
  change: number
}

interface HeatmapItem {
  name: string
  name_en?: string
  symbol?: string
  value: number
  price?: number
}

interface CalendarEvent {
  id: string
  date: string
  time: string
  country: string
  name: string
  name_en: string
  importance: string
  actual?: string
  forecast?: string
}

interface AnalysisResult {
  symbol: string
  market: string
  decision: string
  confidence: number
  summary: string
  technical_analysis?: string
  fundamental_analysis?: string
  risk_assessment?: string
  entry_price?: number
  target_price?: number
  stop_loss?: number
  timeframe?: string
  created_at?: string
}

// --- Market constants ---
const MARKET_COLORS: Record<string, string> = {
  USStock: 'bg-blue-500',
  Crypto: 'bg-orange-500',
  IndianStock: 'bg-green-500',
  Forex: 'bg-purple-500',
  Futures: 'bg-red-500',
}

const MARKET_NAMES: Record<string, string> = {
  USStock: 'US',
  Crypto: 'Crypto',
  IndianStock: 'India',
  Forex: 'Forex',
  Futures: 'Futures',
}

const HEATMAP_TYPES = ['crypto', 'commodities', 'sectors', 'forex', 'india'] as const

function formatPrice(p: number | undefined) {
  if (!p) return '--'
  return p >= 1000 ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.toFixed(2)
}

function formatNum(n: number | undefined) {
  if (n === undefined || n === null) return '--'
  return n.toFixed(2)
}

// --- Component ---
export default function AIAnalysisPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [heatmapType, setHeatmapType] = useState<typeof HEATMAP_TYPES[number]>('crypto')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [addMarket, setAddMarket] = useState('USStock')
  const [addSymbol, setAddSymbol] = useState('')
  const [searchResults, setSearchResults] = useState<WatchlistItem[]>([])
  const [searching, setSearching] = useState(false)
  const [watchlistPrices, setWatchlistPrices] = useState<Record<string, { price: number; change: number }>>({})
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Fetch watchlist
  const { data: watchlistData, refetch: refetchWatchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await client.get('/api/market/watchlist/get')
      return (res.data?.data || []) as WatchlistItem[]
    },
  })
  const watchlist = watchlistData || []

  // Fetch market sentiment
  const { data: sentimentData } = useQuery({
    queryKey: ['market-sentiment'],
    queryFn: async () => {
      const res = await globalMarketApi.getMarketSentiment()
      return res.data?.data || {}
    },
    staleTime: 60000,
  })

  // Fetch market overview (indices)
  const { data: overviewData, isLoading: loadingIndices } = useQuery({
    queryKey: ['market-overview'],
    queryFn: async () => {
      const res = await globalMarketApi.getMarketOverview()
      return res.data?.data || {}
    },
    staleTime: 60000,
  })

  // Fetch heatmap
  const { data: heatmapData, isLoading: loadingHeatmap } = useQuery({
    queryKey: ['market-heatmap'],
    queryFn: async () => {
      const res = await globalMarketApi.getMarketHeatmap()
      return res.data?.data || {}
    },
    staleTime: 60000,
  })

  // Fetch calendar
  const { data: calendarData, isLoading: loadingCalendar } = useQuery({
    queryKey: ['economic-calendar'],
    queryFn: async () => {
      const res = await globalMarketApi.getEconomicCalendar()
      return (res.data?.data || []) as CalendarEvent[]
    },
    staleTime: 300000,
  })

  // Fetch analysis history
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['analysis-history'],
    queryFn: async () => {
      const res = await fastAnalysisApi.getAllAnalysisHistory({ page: 1, pagesize: 50 })
      return (res.data?.data?.items || res.data?.data || []) as AnalysisResult[]
    },
    enabled: showHistoryModal,
  })

  const indices = (overviewData as Record<string, unknown>)?.indices as MarketIndex[] || []
  const fearGreed = (sentimentData as Record<string, unknown>)?.fearGreed as number | undefined
  const vix = (sentimentData as Record<string, unknown>)?.vix as number | undefined
  const dxy = (sentimentData as Record<string, unknown>)?.dxy as number | undefined
  const currentHeatmap = ((heatmapData as Record<string, HeatmapItem[]>)?.[heatmapType] || []) as HeatmapItem[]
  const calendar = calendarData || []

  // WebSocket: subscribe to watchlist prices
  useEffect(() => {
    if (watchlist.length === 0) return
    const symbols = watchlist.map(s => ({ market: s.market, symbol: s.symbol }))
    subscribeToWatchlist(symbols)
    onPriceUpdate((updates: PriceUpdate[]) => {
      setWatchlistPrices(prev => {
        const next = { ...prev }
        for (const u of updates) {
          next[`${u.market}:${u.symbol}`] = { price: u.price, change: u.changePercent }
        }
        return next
      })
    })
    return () => { unsubscribePrices() }
  }, [watchlist])

  // Also fetch REST prices
  useEffect(() => {
    if (watchlist.length === 0) return
    client.get('/api/market/watchlist/prices', {
      params: { watchlist: JSON.stringify(watchlist.map(s => ({ market: s.market, symbol: s.symbol }))) }
    }).then(res => {
      const prices = res.data?.data || {}
      setWatchlistPrices(prev => ({ ...prev, ...prices }))
    }).catch(() => {})
  }, [watchlist])

  // Search symbols
  const handleSymbolSearch = useCallback((keyword: string) => {
    setAddSymbol(keyword)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!keyword || keyword.length < 1) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await client.get('/api/market/symbols/search', { params: { market: addMarket, keyword } })
        setSearchResults((res.data?.data || []) as WatchlistItem[])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 300)
  }, [addMarket])

  // Add to watchlist
  const addToWatchlist = useCallback(async (item: WatchlistItem) => {
    try {
      await client.post('/api/market/watchlist/add', { market: item.market || addMarket, symbol: item.symbol })
      toast.success(`${item.symbol} added to watchlist`)
      refetchWatchlist()
      setShowAddModal(false)
      setSearchResults([])
      setAddSymbol('')
    } catch { toast.error('Failed to add') }
  }, [addMarket, refetchWatchlist])

  // Remove from watchlist
  const removeFromWatchlist = useCallback(async (item: WatchlistItem) => {
    try {
      await client.post('/api/market/watchlist/remove', { symbol: item.symbol })
      refetchWatchlist()
    } catch { toast.error('Failed to remove') }
  }, [refetchWatchlist])

  // Fast analysis
  const startFastAnalysis = useCallback(async () => {
    if (!selectedSymbol) return
    const [market, symbol] = selectedSymbol.split(':')
    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisResult(null)
    try {
      const res = await fastAnalysisApi.fastAnalyze({ market, symbol })
      setAnalysisResult(res.data?.data as AnalysisResult)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { msg?: string } } }
      setAnalysisError(err?.response?.data?.msg || 'Analysis failed')
    }
    setAnalyzing(false)
  }, [selectedSymbol])

  // Heatmap cell style
  const getHeatmapStyle = (value: number) => {
    const intensity = Math.min(Math.abs(value) / 10, 1)
    if (value >= 0) return { backgroundColor: `rgba(34, 197, 94, ${0.15 + intensity * 0.55})` }
    return { backgroundColor: `rgba(239, 68, 68, ${0.15 + intensity * 0.55})` }
  }

  const getFearGreedColor = (val?: number) => {
    if (!val) return 'text-muted-foreground'
    if (val <= 25) return 'text-red-500'
    if (val <= 45) return 'text-orange-500'
    if (val <= 55) return 'text-yellow-500'
    if (val <= 75) return 'text-green-400'
    return 'text-green-600'
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto p-4">
      {/* Top: Market Indicators Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Sentiment */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border text-sm">
            <span className="text-muted-foreground text-xs">Fear/Greed</span>
            <span className={cn('font-bold', getFearGreedColor(fearGreed as number))}>{fearGreed ?? '--'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border text-sm">
            <span className="text-muted-foreground text-xs">VIX</span>
            <span className="font-bold">{vix ? formatNum(vix) : '--'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border text-sm">
            <span className="text-muted-foreground text-xs">DXY</span>
            <span className="font-bold">{dxy ? formatNum(dxy) : '--'}</span>
          </div>
        </div>

        {/* Indices marquee */}
        <div className="flex-1 overflow-hidden">
          {loadingIndices ? (
            <span className="text-muted-foreground text-sm">Loading indices...</span>
          ) : indices.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {indices.map(idx => (
                <div key={idx.symbol} className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                  <span>{idx.flag}</span>
                  <span className="font-medium">{idx.symbol}</span>
                  <span className="text-muted-foreground">{formatPrice(idx.price)}</span>
                  <span className={cn('text-xs', idx.change >= 0 ? 'text-green-500' : 'text-red-500')}>
                    {idx.change >= 0 ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />}
                    {Math.abs(idx.change).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Main three-column layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: Heatmap + Calendar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-auto hidden lg:flex">
          {/* Heatmap */}
          <Card className="flex-shrink-0">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex gap-1 flex-wrap">
                {HEATMAP_TYPES.map(t => (
                  <Button key={t} variant={heatmapType === t ? 'default' : 'ghost'} size="sm" className="text-xs h-6 px-2"
                    onClick={() => setHeatmapType(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {loadingHeatmap ? (
                <div className="text-muted-foreground text-sm text-center py-4">Loading...</div>
              ) : currentHeatmap.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {currentHeatmap.slice(0, 12).map((item, i) => (
                    <div key={i} className="rounded p-1.5 text-center text-xs" style={getHeatmapStyle(item.value)}>
                      <div className="font-medium truncate">{item.name_en || item.name}</div>
                      {item.price ? <div className="text-[10px] opacity-70">{formatPrice(item.price)}</div> : null}
                      <div className="font-bold">{item.value >= 0 ? '+' : ''}{formatNum(item.value)}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-4">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Economic Calendar */}
          <Card className="flex-1 min-h-0">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Economic Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <ScrollArea className="h-[300px]">
                {loadingCalendar ? (
                  <div className="text-muted-foreground text-sm text-center py-4">Loading...</div>
                ) : calendar.length > 0 ? (
                  <div className="space-y-1.5">
                    {calendar.slice(0, 10).map(evt => (
                      <div key={evt.id} className="text-xs flex items-center gap-1.5 py-1 border-b border-border/50">
                        <span className="text-muted-foreground w-10 shrink-0">{evt.time || '--:--'}</span>
                        <span className="font-medium flex-1 truncate">{evt.name_en || evt.name}</span>
                        <span className="text-muted-foreground">{evt.actual || evt.forecast || '--'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm text-center py-4">No events</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Center: Analysis */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2">
            <Select value={selectedSymbol || ''} onValueChange={v => {
              if (v === '__add__') { setShowAddModal(true); return }
              setSelectedSymbol(v)
            }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a symbol..." />
              </SelectTrigger>
              <SelectContent>
                {watchlist.map(s => (
                  <SelectItem key={`${s.market}:${s.symbol}`} value={`${s.market}:${s.symbol}`}>
                    <span className="flex items-center gap-2">
                      <Badge variant="secondary" className={cn('text-[10px] text-white px-1', MARKET_COLORS[s.market])}>
                        {MARKET_NAMES[s.market] || s.market}
                      </Badge>
                      <span className="font-medium">{s.symbol}</span>
                      {s.name ? <span className="text-muted-foreground text-xs">{s.name}</span> : null}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="__add__">
                  <span className="flex items-center gap-1 text-primary">
                    <Plus className="h-3 w-3" /> Add Symbol
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={startFastAnalysis} disabled={!selectedSymbol || analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Analyze
            </Button>
            <Button variant="outline" onClick={() => { setShowHistoryModal(true); refetchHistory() }}>
              <History className="h-4 w-4 mr-1" /> History
            </Button>
          </div>

          {/* Analysis Result */}
          <Card className="flex-1 min-h-0 overflow-auto">
            <CardContent className="p-4">
              {!analysisResult && !analyzing && !analysisError && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <Bot className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium mb-2">AI Analysis</h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Select a symbol from your watchlist and click Analyze for AI-powered market insights.
                  </p>
                </div>
              )}

              {analyzing && (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Analyzing {selectedSymbol}...</p>
                </div>
              )}

              {analysisError && (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <div className="text-red-500 mb-4 text-lg">Analysis Error</div>
                  <p className="text-muted-foreground mb-4">{analysisError}</p>
                  <Button variant="outline" onClick={startFastAnalysis}>Retry</Button>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold">{analysisResult.symbol}</h2>
                      <Badge variant="secondary">{analysisResult.market}</Badge>
                      <Badge className={cn(
                        analysisResult.decision === 'BUY' ? 'bg-green-500' :
                        analysisResult.decision === 'SELL' ? 'bg-red-500' : 'bg-yellow-500',
                        'text-white'
                      )}>
                        {analysisResult.decision}
                      </Badge>
                    </div>
                    {analysisResult.confidence ? (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Confidence</div>
                        <div className="text-lg font-bold">{analysisResult.confidence}%</div>
                      </div>
                    ) : null}
                  </div>

                  {/* Price targets */}
                  {(analysisResult.entry_price || analysisResult.target_price || analysisResult.stop_loss) && (
                    <div className="grid grid-cols-3 gap-3">
                      {analysisResult.entry_price ? (
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground">Entry</div>
                          <div className="font-bold">${formatPrice(analysisResult.entry_price)}</div>
                        </div>
                      ) : null}
                      {analysisResult.target_price ? (
                        <div className="bg-green-500/10 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground">Target</div>
                          <div className="font-bold text-green-600">${formatPrice(analysisResult.target_price)}</div>
                        </div>
                      ) : null}
                      {analysisResult.stop_loss ? (
                        <div className="bg-red-500/10 rounded-lg p-3 text-center">
                          <div className="text-xs text-muted-foreground">Stop Loss</div>
                          <div className="font-bold text-red-600">${formatPrice(analysisResult.stop_loss)}</div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Summary */}
                  {analysisResult.summary && (
                    <div>
                      <h3 className="font-semibold mb-2">Summary</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysisResult.summary}</p>
                    </div>
                  )}

                  {/* Detailed sections */}
                  {analysisResult.technical_analysis && (
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-1.5">
                        <Activity className="h-4 w-4" /> Technical Analysis
                      </h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysisResult.technical_analysis}</p>
                    </div>
                  )}
                  {analysisResult.fundamental_analysis && (
                    <div>
                      <h3 className="font-semibold mb-2">Fundamental Analysis</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysisResult.fundamental_analysis}</p>
                    </div>
                  )}
                  {analysisResult.risk_assessment && (
                    <div>
                      <h3 className="font-semibold mb-2">Risk Assessment</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysisResult.risk_assessment}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Watchlist */}
        <div className="w-60 flex-shrink-0 hidden md:block">
          <Card className="h-full">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Watchlist
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddModal(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <ScrollArea className="h-[calc(100vh-280px)]">
                {watchlist.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No symbols yet</p>
                    <Button size="sm" onClick={() => setShowAddModal(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Symbol
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {watchlist.map(stock => {
                      const key = `${stock.market}:${stock.symbol}`
                      const priceData = watchlistPrices[key]
                      const isActive = selectedSymbol === key
                      return (
                        <div
                          key={key}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group hover:bg-muted/50',
                            isActive && 'bg-muted'
                          )}
                          onClick={() => setSelectedSymbol(key)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{stock.symbol}</div>
                            <div className="text-[10px] text-muted-foreground">{stock.name || MARKET_NAMES[stock.market]}</div>
                          </div>
                          {priceData ? (
                            <div className="text-right">
                              <div className="text-xs font-medium">{formatPrice(priceData.price)}</div>
                              <div className={cn('text-[10px]', priceData.change >= 0 ? 'text-green-500' : 'text-red-500')}>
                                {priceData.change >= 0 ? '+' : ''}{formatNum(priceData.change)}%
                              </div>
                            </div>
                          ) : null}
                          <button
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                            onClick={e => { e.stopPropagation(); removeFromWatchlist(stock) }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Stock Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Symbol to Watchlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs value={addMarket} onValueChange={v => { setAddMarket(v); setSearchResults([]); setAddSymbol('') }}>
              <TabsList className="w-full">
                <TabsTrigger value="USStock">US Stock</TabsTrigger>
                <TabsTrigger value="Crypto">Crypto</TabsTrigger>
                <TabsTrigger value="IndianStock">India</TabsTrigger>
                <TabsTrigger value="Forex">Forex</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Input
                placeholder="Search symbol or enter directly..."
                value={addSymbol}
                onChange={e => handleSymbolSearch(e.target.value)}
              />
              <Button onClick={() => addSymbol && addToWatchlist({ market: addMarket, symbol: addSymbol.toUpperCase() })} disabled={!addSymbol}>
                Add
              </Button>
            </div>
            {searching && <div className="text-sm text-muted-foreground">Searching...</div>}
            {searchResults.length > 0 && (
              <ScrollArea className="max-h-60">
                <div className="space-y-1">
                  {searchResults.map(r => (
                    <div
                      key={`${r.market}-${r.symbol}`}
                      className="flex items-center justify-between px-3 py-2 rounded cursor-pointer hover:bg-muted"
                      onClick={() => addToWatchlist(r)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.symbol}</span>
                        {r.name ? <span className="text-sm text-muted-foreground">{r.name}</span> : null}
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Analysis History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {(historyData || []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No analysis history yet</p>
            ) : (
              <div className="space-y-3">
                {(historyData || []).map((item, i) => (
                  <Card key={i} className="cursor-pointer hover:bg-muted/30" onClick={() => { setAnalysisResult(item); setShowHistoryModal(false) }}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{item.market}</Badge>
                        <span className="font-medium">{item.symbol}</span>
                        <Badge className={cn(
                          item.decision === 'BUY' ? 'bg-green-500' :
                          item.decision === 'SELL' ? 'bg-red-500' : 'bg-yellow-500',
                          'text-white text-xs'
                        )}>
                          {item.decision}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.confidence}%
                        {item.created_at ? <span className="ml-2">{new Date(item.created_at).toLocaleDateString()}</span> : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
