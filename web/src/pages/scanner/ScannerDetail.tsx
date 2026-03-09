import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Plus, Trash2, Copy, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import * as scannerApi from '@/api/scanner'

const MARKETS = ['USStock', 'Crypto', 'IndianStock', 'Forex', 'Futures']

export default function ScannerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const strategyId = Number(id)

  const [newSourceSymbol, setNewSourceSymbol] = useState('')
  const [newMarket, setNewMarket] = useState('USStock')
  const [newSymbol, setNewSymbol] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')

  const { data, isLoading } = useQuery({
    queryKey: ['scanner-strategy', strategyId],
    queryFn: () => scannerApi.getStrategy(strategyId),
    enabled: !!strategyId,
  })

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['scanner-logs', strategyId],
    queryFn: () => scannerApi.getWebhookLogs(strategyId),
    enabled: !!strategyId,
  })

  const addMappingMutation = useMutation({
    mutationFn: (mappingData: Partial<scannerApi.SymbolMapping>) =>
      scannerApi.addSymbolMapping(strategyId, mappingData),
    onSuccess: () => {
      toast.success('Symbol mapping added')
      queryClient.invalidateQueries({ queryKey: ['scanner-strategy', strategyId] })
      setNewSourceSymbol('')
      setNewSymbol('')
      setNewQuantity('1')
    },
  })

  const removeMappingMutation = useMutation({
    mutationFn: (mappingId: number) => scannerApi.removeSymbolMapping(strategyId, mappingId),
    onSuccess: () => {
      toast.success('Mapping removed')
      queryClient.invalidateQueries({ queryKey: ['scanner-strategy', strategyId] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const strategy = data?.data
  if (!strategy) return null

  const webhookUrl = `${window.location.origin}/api/scanner/webhook/${strategy.webhook_id}`
  const mappings = strategy.mappings || []
  const logs = logsData?.data || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/scanner')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{strategy.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
              {strategy.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-sm text-muted-foreground">{strategy.market_type} / {strategy.strategy_type}</span>
          </div>
        </div>
      </div>

      {/* Webhook URL */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Webhook URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="text-xs font-mono" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl)
                toast.success('Copied to clipboard')
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            POST JSON payloads to this URL. Supports ChartInk, TradingView, and generic formats.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="symbols">
        <TabsList>
          <TabsTrigger value="symbols">Symbol Mappings ({mappings.length})</TabsTrigger>
          <TabsTrigger value="logs">Webhook Logs ({logs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="symbols" className="space-y-4">
          {/* Add mapping form */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-5 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Source Symbol</Label>
                  <Input
                    value={newSourceSymbol}
                    onChange={(e) => setNewSourceSymbol(e.target.value)}
                    placeholder="AAPL"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Market</Label>
                  <Select value={newMarket} onValueChange={setNewMarket}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Symbol</Label>
                  <Input
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="AAPL"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    if (!newSourceSymbol || !newSymbol) {
                      toast.error('Source symbol and symbol are required')
                      return
                    }
                    addMappingMutation.mutate({
                      source_symbol: newSourceSymbol,
                      market: newMarket,
                      symbol: newSymbol,
                      quantity: Number(newQuantity) || 1,
                    })
                  }}
                  disabled={addMappingMutation.isPending}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mappings list */}
          {mappings.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No symbol mappings. Add symbols to map scanner alerts to orders.
            </div>
          ) : (
            <div className="border rounded-md">
              <div className="grid grid-cols-5 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                <span>Source</span>
                <span>Market</span>
                <span>Symbol</span>
                <span>Qty</span>
                <span></span>
              </div>
              <Separator />
              {mappings.map((m: scannerApi.SymbolMapping) => (
                <div key={m.id} className="grid grid-cols-5 gap-2 px-3 py-2 text-xs items-center border-b last:border-0">
                  <span className="font-mono">{m.source_symbol}</span>
                  <span>{m.market}</span>
                  <span className="font-mono">{m.symbol}</span>
                  <span>{m.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeMappingMutation.mutate(m.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </div>
          <ScrollArea className="h-96">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No webhook logs yet
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log: scannerApi.WebhookLog) => (
                  <Card key={log.id}>
                    <CardContent className="py-3 px-4 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <Badge variant={log.status === 'processed' ? 'default' : 'destructive'} className="text-[10px] h-5">
                          {log.status}
                        </Badge>
                      </div>
                      {log.symbols_processed && (
                        <div>Symbols: <span className="font-mono">{log.symbols_processed}</span></div>
                      )}
                      <div>Orders queued: {log.orders_queued}</div>
                      {log.error && (
                        <div className="text-destructive mt-1">{log.error}</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
