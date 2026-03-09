import type { Node } from '@xyflow/react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface ConfigPanelProps {
  node: Node
  onUpdateData: (data: Record<string, unknown>) => void
  onClose: () => void
}

const MARKETS = ['USStock', 'Crypto', 'IndianStock', 'Forex', 'Futures']

export function ConfigPanel({ node, onUpdateData, onClose }: ConfigPanelProps) {
  const data = node.data as Record<string, unknown>
  const nodeType = node.type || ''

  const update = (key: string, value: unknown) => {
    onUpdateData({ [key]: value })
  }

  return (
    <div className="w-72 border-l bg-card flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Configure Node</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {/* Label */}
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={(data.label as string) || ''}
              onChange={(e) => update('label', e.target.value)}
              className="h-8 text-xs"
              placeholder="Node label"
            />
          </div>

          <Separator />

          {/* Market selector (for nodes that have market) */}
          {hasField(nodeType, 'market') && (
            <div className="space-y-1">
              <Label className="text-xs">Market</Label>
              <Select value={(data.market as string) || 'USStock'} onValueChange={(v) => update('market', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Symbol */}
          {hasField(nodeType, 'symbol') && (
            <div className="space-y-1">
              <Label className="text-xs">Symbol</Label>
              <Input
                value={(data.symbol as string) || ''}
                onChange={(e) => update('symbol', e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g., AAPL"
              />
            </div>
          )}

          {/* Action BUY/SELL */}
          {hasField(nodeType, 'action') && (
            <div className="space-y-1">
              <Label className="text-xs">Action</Label>
              <Select value={(data.action as string) || 'BUY'} onValueChange={(v) => update('action', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity */}
          {hasField(nodeType, 'quantity') && (
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input
                type="number"
                value={(data.quantity as number) || 0}
                onChange={(e) => update('quantity', Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Order Type */}
          {hasField(nodeType, 'orderType') && (
            <div className="space-y-1">
              <Label className="text-xs">Order Type</Label>
              <Select value={(data.orderType as string) || 'market'} onValueChange={(v) => update('orderType', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price (for limit orders) */}
          {hasField(nodeType, 'price') && (
            <div className="space-y-1">
              <Label className="text-xs">Price</Label>
              <Input
                type="number"
                step="0.01"
                value={(data.price as number) || ''}
                onChange={(e) => update('price', Number(e.target.value))}
                className="h-8 text-xs"
                placeholder="For limit orders"
              />
            </div>
          )}

          {/* Schedule Type (Start node) */}
          {nodeType === 'start' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Schedule Type</Label>
                <Select value={(data.scheduleType as string) || 'daily'} onValueChange={(v) => update('scheduleType', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="interval">Interval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Time</Label>
                <Input
                  value={(data.time as string) || '09:15'}
                  onChange={(e) => update('time', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="HH:MM"
                />
              </div>
            </>
          )}

          {/* Condition fields */}
          {hasField(nodeType, 'condition') && (
            <div className="space-y-1">
              <Label className="text-xs">Condition</Label>
              <Input
                value={(data.condition as string) || ''}
                onChange={(e) => update('condition', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Threshold */}
          {hasField(nodeType, 'threshold') && (
            <div className="space-y-1">
              <Label className="text-xs">Threshold</Label>
              <Input
                type="number"
                step="0.01"
                value={(data.threshold as number) || ''}
                onChange={(e) => update('threshold', Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Min Available (Fund Check) */}
          {nodeType === 'fundCheck' && (
            <div className="space-y-1">
              <Label className="text-xs">Min Available</Label>
              <Input
                type="number"
                value={(data.minAvailable as number) || 0}
                onChange={(e) => update('minAvailable', Number(e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Time fields */}
          {hasField(nodeType, 'startTime') && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Start Time</Label>
                <Input
                  value={(data.startTime as string) || '09:15'}
                  onChange={(e) => update('startTime', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Time</Label>
                <Input
                  value={(data.endTime as string) || '15:30'}
                  onChange={(e) => update('endTime', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {/* Target Time */}
          {hasField(nodeType, 'targetTime') && (
            <div className="space-y-1">
              <Label className="text-xs">Target Time</Label>
              <Input
                value={(data.targetTime as string) || ''}
                onChange={(e) => update('targetTime', e.target.value)}
                className="h-8 text-xs"
                placeholder="HH:MM"
              />
            </div>
          )}

          {/* Message (Telegram, Log) */}
          {hasField(nodeType, 'message') && (
            <div className="space-y-1">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={(data.message as string) || ''}
                onChange={(e) => update('message', e.target.value)}
                className="text-xs min-h-[60px]"
                placeholder="Message template..."
              />
            </div>
          )}

          {/* Delay */}
          {nodeType === 'delay' && (
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Value</Label>
                <Input
                  type="number"
                  value={(data.delayValue as number) || 5}
                  onChange={(e) => update('delayValue', Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Unit</Label>
                <Select value={(data.delayUnit as string) || 'seconds'} onValueChange={(v) => update('delayUnit', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Variable */}
          {nodeType === 'variable' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Variable Name</Label>
                <Input
                  value={(data.variableName as string) || ''}
                  onChange={(e) => update('variableName', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operation</Label>
                <Select value={(data.operation as string) || 'set'} onValueChange={(v) => update('operation', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="get">Get</SelectItem>
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="subtract">Subtract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input
                  value={(data.value as string) || ''}
                  onChange={(e) => update('value', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {/* Math Expression */}
          {nodeType === 'mathExpression' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Expression</Label>
                <Input
                  value={(data.expression as string) || ''}
                  onChange={(e) => update('expression', e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder='e.g., {{ltp}} * {{qty}}'
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Output Variable</Label>
                <Input
                  value={(data.outputVariable as string) || ''}
                  onChange={(e) => update('outputVariable', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {/* HTTP Request */}
          {nodeType === 'httpRequest' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={(data.method as string) || 'GET'} onValueChange={(v) => update('method', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">URL</Label>
                <Input
                  value={(data.url as string) || ''}
                  onChange={(e) => update('url', e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Body</Label>
                <Textarea
                  value={(data.body as string) || ''}
                  onChange={(e) => update('body', e.target.value)}
                  className="text-xs font-mono min-h-[60px]"
                />
              </div>
            </>
          )}

          {/* Output Variable (for data nodes) */}
          {hasField(nodeType, 'outputVariable') && nodeType !== 'mathExpression' && (
            <div className="space-y-1">
              <Label className="text-xs">Output Variable</Label>
              <Input
                value={(data.outputVariable as string) || ''}
                onChange={(e) => update('outputVariable', e.target.value)}
                className="h-8 text-xs"
                placeholder="Variable name to store result"
              />
            </div>
          )}

          {/* Log Level */}
          {nodeType === 'log' && (
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={(data.level as string) || 'info'} onValueChange={(v) => update('level', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Order ID */}
          {hasField(nodeType, 'orderId') && (
            <div className="space-y-1">
              <Label className="text-xs">Order ID</Label>
              <Input
                value={(data.orderId as string) || ''}
                onChange={(e) => update('orderId', e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder='Use {{variable}} syntax'
              />
            </div>
          )}

          {/* Underlying (Options nodes) */}
          {hasField(nodeType, 'underlying') && (
            <div className="space-y-1">
              <Label className="text-xs">Underlying</Label>
              <Input
                value={(data.underlying as string) || ''}
                onChange={(e) => update('underlying', e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Interval (History node) */}
          {nodeType === 'history' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Interval</Label>
                <Select value={(data.interval as string) || '1d'} onValueChange={(v) => update('interval', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1m', '5m', '15m', '30m', '1h', '1d'].map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Days</Label>
                <Input
                  type="number"
                  value={(data.days as number) || 30}
                  onChange={(e) => update('days', Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {/* Price Alert specific */}
          {nodeType === 'priceAlert' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Condition</Label>
                <Select value={(data.condition as string) || 'above'} onValueChange={(v) => update('condition', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above</SelectItem>
                    <SelectItem value="below">Below</SelectItem>
                    <SelectItem value="crosses_above">Crosses Above</SelectItem>
                    <SelectItem value="crosses_below">Crosses Below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(data.price as number) || ''}
                  onChange={(e) => update('price', Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}

          {/* Price Condition fields */}
          {nodeType === 'priceCondition' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Field</Label>
                <Select value={(data.field as string) || 'ltp'} onValueChange={(v) => update('field', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ltp', 'open', 'high', 'low', 'change_percent'].map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operator</Label>
                <Select value={(data.operator as string) || '>'} onValueChange={(v) => update('operator', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['>', '<', '==', '>=', '<='].map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(data.value as number) || ''}
                  onChange={(e) => update('value', Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

/** Helper to determine which fields a node type has */
function hasField(nodeType: string, field: string): boolean {
  const fieldMap: Record<string, string[]> = {
    market: [
      'placeOrder', 'smartOrder', 'optionsOrder', 'optionsMultiOrder', 'splitOrder',
      'closePositions', 'positionCheck', 'priceCondition', 'priceAlert',
      'getQuote', 'getDepth', 'history', 'openPosition', 'expiry',
      'symbol', 'optionSymbol', 'syntheticFuture', 'optionChain',
      'subscribeLtp', 'subscribeQuote', 'subscribeDepth',
    ],
    symbol: [
      'placeOrder', 'smartOrder', 'splitOrder', 'positionCheck', 'priceCondition', 'priceAlert',
      'getQuote', 'getDepth', 'history', 'openPosition', 'expiry', 'symbol',
      'subscribeLtp', 'subscribeQuote', 'subscribeDepth',
    ],
    action: ['placeOrder', 'smartOrder', 'splitOrder'],
    quantity: ['placeOrder', 'smartOrder', 'splitOrder', 'optionsOrder'],
    orderType: ['placeOrder', 'smartOrder', 'splitOrder', 'optionsOrder'],
    price: ['placeOrder', 'smartOrder', 'splitOrder', 'priceAlert'],
    condition: ['positionCheck'],
    threshold: ['positionCheck'],
    startTime: ['timeWindow'],
    targetTime: ['timeCondition', 'waitUntil'],
    message: ['telegramAlert', 'log'],
    outputVariable: [
      'getQuote', 'getDepth', 'getOrderStatus', 'history', 'openPosition', 'expiry',
      'intervals', 'multiQuotes', 'symbol', 'optionSymbol', 'orderBook', 'tradeBook',
      'positionBook', 'syntheticFuture', 'optionChain', 'holidays', 'timings',
      'subscribeLtp', 'subscribeQuote', 'subscribeDepth',
      'holdings', 'funds', 'margin', 'httpRequest',
    ],
    orderId: ['modifyOrder', 'cancelOrder', 'getOrderStatus'],
    underlying: ['optionsOrder', 'optionsMultiOrder', 'optionSymbol', 'syntheticFuture', 'optionChain'],
  }
  return (fieldMap[field] || []).includes(nodeType)
}
