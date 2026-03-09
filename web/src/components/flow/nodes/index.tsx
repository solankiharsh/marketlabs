/**
 * All Flow Node Components — MarketLabs
 * Ported from OpenAlgo with MarketLabs market adaptations.
 *
 * Markets: USStock, Crypto, IndianStock, Forex, Futures
 */

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import {
  Clock, Calendar, CalendarDays, Timer, Bell, Globe,
  ShoppingCart, Zap, Layers, Split, Scissors, Pencil, X, XCircle, DoorClosed,
  Briefcase, DollarSign, TrendingUp, Clock3, Clock4, GitMerge, GitBranch, Ban,
  BarChart3, BookOpen, FileText, History, MapPin, CalendarRange, Timer as TimerIcon,
  List, Tag, Hash, Book, Activity, BarChart, Landmark, CalendarCheck, Clock12,
  Radio, RadioTower, Unplug, Wifi,
  Shield, Wallet, Calculator,
  Send, Pause, Hourglass, FileTerminal, Variable, Sigma, Globe2,
} from 'lucide-react'
import { BaseNode, NodeDataRow, NodeBadge } from './BaseNode'

// =============================================================================
// TRIGGER NODES
// =============================================================================

export const StartNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  const scheduleType = (d.scheduleType as string) || 'daily'
  const icons: Record<string, typeof Clock> = { once: Calendar, daily: Clock, weekly: CalendarDays, interval: Timer }
  const Icon = icons[scheduleType] || Clock
  return (
    <BaseNode category="trigger" selected={selected} icon={<Icon className="h-3 w-3" />}
      title="Start" subtitle={scheduleType} hasOutput>
      <NodeDataRow label="Time" value={(d.time as string) || '09:15'} />
    </BaseNode>
  )
})
StartNode.displayName = 'StartNode'

export const PriceAlertNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="trigger" selected={selected} icon={<Bell className="h-3 w-3" />}
      title="Price Alert" subtitle={(d.market as string) || 'USStock'} hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
      <NodeDataRow label="Condition" value={d.condition as string} />
      <NodeDataRow label="Price" value={d.price as number} />
    </BaseNode>
  )
})
PriceAlertNode.displayName = 'PriceAlertNode'

export const WebhookTriggerNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="trigger" selected={selected} icon={<Globe className="h-3 w-3" />}
      title="Webhook" subtitle="Trigger" hasOutput>
      {d.webhookId ? <NodeDataRow label="ID" value={d.webhookId as string} /> : null}
    </BaseNode>
  )
})
WebhookTriggerNode.displayName = 'WebhookTriggerNode'

// =============================================================================
// ACTION NODES
// =============================================================================

export const PlaceOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<ShoppingCart className="h-3 w-3" />}
      title="Place Order" subtitle={(d.market as string) || 'USStock'} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
      <div className="flex items-center justify-between">
        <NodeBadge variant={(d.action as string) === 'SELL' ? 'sell' : 'buy'}>{(d.action as string) || 'BUY'}</NodeBadge>
        <span className="text-[10px] text-muted-foreground">Qty: <span className="font-mono font-medium">{(d.quantity as number) || 0}</span></span>
      </div>
    </BaseNode>
  )
})
PlaceOrderNode.displayName = 'PlaceOrderNode'

export const SmartOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<Zap className="h-3 w-3" />}
      title="Smart Order" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
      <NodeDataRow label="Position Size" value={d.positionSize as number} />
    </BaseNode>
  )
})
SmartOrderNode.displayName = 'SmartOrderNode'

export const OptionsOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<Layers className="h-3 w-3" />}
      title="Options Order" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Underlying" value={d.underlying as string} />
      <NodeDataRow label="Type" value={`${d.optionType || 'CE'} ${d.offset || 'ATM'}`} />
    </BaseNode>
  )
})
OptionsOrderNode.displayName = 'OptionsOrderNode'

export const OptionsMultiOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<Layers className="h-3 w-3" />}
      title="Options Multi" subtitle={(d.strategy as string) || 'custom'} hasInput hasOutput>
      <NodeDataRow label="Underlying" value={d.underlying as string} />
      <NodeDataRow label="Legs" value={(d.legs as unknown[])?.length || 0} />
    </BaseNode>
  )
})
OptionsMultiOrderNode.displayName = 'OptionsMultiOrderNode'

export const BasketOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<Split className="h-3 w-3" />}
      title="Basket Order" hasInput hasOutput>
      <NodeDataRow label="Orders" value={(d.orders as unknown[])?.length || 0} />
    </BaseNode>
  )
})
BasketOrderNode.displayName = 'BasketOrderNode'

export const SplitOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<Scissors className="h-3 w-3" />}
      title="Split Order" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
      <NodeDataRow label="Split" value={`${d.quantity || 0} / ${d.splitSize || 1}`} />
    </BaseNode>
  )
})
SplitOrderNode.displayName = 'SplitOrderNode'

export const ModifyOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<Pencil className="h-3 w-3" />}
      title="Modify Order" hasInput hasOutput>
      <NodeDataRow label="Order ID" value={d.orderId as string} />
    </BaseNode>
  )
})
ModifyOrderNode.displayName = 'ModifyOrderNode'

export const CancelOrderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<X className="h-3 w-3" />}
      title="Cancel Order" hasInput hasOutput>
      <NodeDataRow label="Order ID" value={d.orderId as string} />
    </BaseNode>
  )
})
CancelOrderNode.displayName = 'CancelOrderNode'

export const CancelAllOrdersNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="action" selected={selected} icon={<XCircle className="h-3 w-3" />}
    title="Cancel All" subtitle="Orders" hasInput hasOutput />
))
CancelAllOrdersNode.displayName = 'CancelAllOrdersNode'

export const ClosePositionsNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="action" selected={selected} icon={<DoorClosed className="h-3 w-3" />}
      title="Close Positions" subtitle={(d.market as string) || 'All'} hasInput hasOutput />
  )
})
ClosePositionsNode.displayName = 'ClosePositionsNode'

// =============================================================================
// CONDITION NODES
// =============================================================================

export const PositionCheckNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="condition" selected={selected} icon={<Briefcase className="h-3 w-3" />}
      title="Position Check" hasInput hasConditionalOutputs>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
      <NodeDataRow label="Check" value={d.condition as string} />
    </BaseNode>
  )
})
PositionCheckNode.displayName = 'PositionCheckNode'

export const FundCheckNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="condition" selected={selected} icon={<DollarSign className="h-3 w-3" />}
      title="Fund Check" hasInput hasConditionalOutputs>
      <NodeDataRow label="Min Available" value={d.minAvailable as number} />
    </BaseNode>
  )
})
FundCheckNode.displayName = 'FundCheckNode'

export const PriceConditionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="condition" selected={selected} icon={<TrendingUp className="h-3 w-3" />}
      title="Price Condition" hasInput hasConditionalOutputs>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
      <NodeDataRow label="Condition" value={`${d.field || 'ltp'} ${d.operator || '>'} ${d.value || 0}`} />
    </BaseNode>
  )
})
PriceConditionNode.displayName = 'PriceConditionNode'

export const TimeWindowNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="condition" selected={selected} icon={<Clock3 className="h-3 w-3" />}
      title="Time Window" hasInput hasConditionalOutputs>
      <NodeDataRow label="Range" value={`${d.startTime || '09:15'} - ${d.endTime || '15:30'}`} />
    </BaseNode>
  )
})
TimeWindowNode.displayName = 'TimeWindowNode'

export const TimeConditionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="condition" selected={selected} icon={<Clock4 className="h-3 w-3" />}
      title="Time Condition" subtitle={(d.conditionType as string) || 'custom'} hasInput hasConditionalOutputs>
      <NodeDataRow label="Time" value={d.targetTime as string} />
    </BaseNode>
  )
})
TimeConditionNode.displayName = 'TimeConditionNode'

export const AndGateNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="condition" selected={selected} icon={<GitMerge className="h-3 w-3" />}
    title="AND Gate" hasInput hasOutput />
))
AndGateNode.displayName = 'AndGateNode'

export const OrGateNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="condition" selected={selected} icon={<GitBranch className="h-3 w-3" />}
    title="OR Gate" hasInput hasOutput />
))
OrGateNode.displayName = 'OrGateNode'

export const NotGateNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="condition" selected={selected} icon={<Ban className="h-3 w-3" />}
    title="NOT Gate" hasInput hasConditionalOutputs />
))
NotGateNode.displayName = 'NotGateNode'

// =============================================================================
// DATA NODES
// =============================================================================

export const GetQuoteNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<BarChart3 className="h-3 w-3" />}
      title="Get Quote" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
GetQuoteNode.displayName = 'GetQuoteNode'

export const GetDepthNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<BookOpen className="h-3 w-3" />}
      title="Get Depth" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
GetDepthNode.displayName = 'GetDepthNode'

export const GetOrderStatusNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<FileText className="h-3 w-3" />}
      title="Order Status" hasInput hasOutput>
      <NodeDataRow label="Order ID" value={d.orderId as string} />
    </BaseNode>
  )
})
GetOrderStatusNode.displayName = 'GetOrderStatusNode'

export const HistoryNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<History className="h-3 w-3" />}
      title="History" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
      <NodeDataRow label="Interval" value={d.interval as string} />
    </BaseNode>
  )
})
HistoryNode.displayName = 'HistoryNode'

export const OpenPositionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<MapPin className="h-3 w-3" />}
      title="Open Position" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
OpenPositionNode.displayName = 'OpenPositionNode'

export const ExpiryNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<CalendarRange className="h-3 w-3" />}
      title="Expiry" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
ExpiryNode.displayName = 'ExpiryNode'

export const IntervalsNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="data" selected={selected} icon={<TimerIcon className="h-3 w-3" />}
    title="Intervals" hasInput hasOutput />
))
IntervalsNode.displayName = 'IntervalsNode'

export const MultiQuotesNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<List className="h-3 w-3" />}
      title="Multi Quotes" hasInput hasOutput>
      <NodeDataRow label="Symbols" value={(d.symbols as unknown[])?.length || 0} />
    </BaseNode>
  )
})
MultiQuotesNode.displayName = 'MultiQuotesNode'

export const SymbolNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<Tag className="h-3 w-3" />}
      title="Symbol Info" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
SymbolNode.displayName = 'SymbolNode'

export const OptionSymbolNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<Hash className="h-3 w-3" />}
      title="Option Symbol" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Underlying" value={d.underlying as string} />
      <NodeDataRow label="Type" value={`${d.optionType || 'CE'} ${d.offset || 'ATM'}`} />
    </BaseNode>
  )
})
OptionSymbolNode.displayName = 'OptionSymbolNode'

export const OrderBookNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="data" selected={selected} icon={<Book className="h-3 w-3" />}
    title="Order Book" hasInput hasOutput />
))
OrderBookNode.displayName = 'OrderBookNode'

export const TradeBookNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="data" selected={selected} icon={<Activity className="h-3 w-3" />}
    title="Trade Book" hasInput hasOutput />
))
TradeBookNode.displayName = 'TradeBookNode'

export const PositionBookNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="data" selected={selected} icon={<BarChart className="h-3 w-3" />}
    title="Position Book" hasInput hasOutput />
))
PositionBookNode.displayName = 'PositionBookNode'

export const SyntheticFutureNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<Landmark className="h-3 w-3" />}
      title="Synthetic Future" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Underlying" value={d.underlying as string} />
    </BaseNode>
  )
})
SyntheticFutureNode.displayName = 'SyntheticFutureNode'

export const OptionChainNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="data" selected={selected} icon={<Layers className="h-3 w-3" />}
      title="Option Chain" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Underlying" value={d.underlying as string} />
    </BaseNode>
  )
})
OptionChainNode.displayName = 'OptionChainNode'

export const HolidaysNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="data" selected={selected} icon={<CalendarCheck className="h-3 w-3" />}
    title="Holidays" hasInput hasOutput />
))
HolidaysNode.displayName = 'HolidaysNode'

export const TimingsNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="data" selected={selected} icon={<Clock12 className="h-3 w-3" />}
    title="Timings" hasInput hasOutput />
))
TimingsNode.displayName = 'TimingsNode'

// =============================================================================
// STREAMING NODES
// =============================================================================

export const SubscribeLTPNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="streaming" selected={selected} icon={<Radio className="h-3 w-3" />}
      title="Subscribe LTP" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
SubscribeLTPNode.displayName = 'SubscribeLTPNode'

export const SubscribeQuoteNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="streaming" selected={selected} icon={<RadioTower className="h-3 w-3" />}
      title="Subscribe Quote" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
SubscribeQuoteNode.displayName = 'SubscribeQuoteNode'

export const SubscribeDepthNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="streaming" selected={selected} icon={<Wifi className="h-3 w-3" />}
      title="Subscribe Depth" subtitle={(d.market as string)} hasInput hasOutput>
      <NodeDataRow label="Symbol" value={d.symbol as string} />
    </BaseNode>
  )
})
SubscribeDepthNode.displayName = 'SubscribeDepthNode'

export const UnsubscribeNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="streaming" selected={selected} icon={<Unplug className="h-3 w-3" />}
      title="Unsubscribe" subtitle={(d.streamType as string) || 'all'} hasInput hasOutput />
  )
})
UnsubscribeNode.displayName = 'UnsubscribeNode'

// =============================================================================
// RISK NODES
// =============================================================================

export const HoldingsNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="risk" selected={selected} icon={<Shield className="h-3 w-3" />}
    title="Holdings" hasInput hasOutput />
))
HoldingsNode.displayName = 'HoldingsNode'

export const FundsNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="risk" selected={selected} icon={<Wallet className="h-3 w-3" />}
    title="Funds" hasInput hasOutput />
))
FundsNode.displayName = 'FundsNode'

export const MarginNode = memo(({ selected }: NodeProps) => (
  <BaseNode category="risk" selected={selected} icon={<Calculator className="h-3 w-3" />}
    title="Margin" hasInput hasOutput />
))
MarginNode.displayName = 'MarginNode'

// =============================================================================
// UTILITY NODES
// =============================================================================

export const TelegramAlertNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="utility" selected={selected} icon={<Send className="h-3 w-3" />}
      title="Telegram Alert" hasInput hasOutput>
      {d.message ? <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{String(d.message)}</div> : null}
    </BaseNode>
  )
})
TelegramAlertNode.displayName = 'TelegramAlertNode'

export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="utility" selected={selected} icon={<Pause className="h-3 w-3" />}
      title="Delay" hasInput hasOutput>
      <NodeDataRow label="Wait" value={`${d.delayValue || 5} ${d.delayUnit || 'seconds'}`} />
    </BaseNode>
  )
})
DelayNode.displayName = 'DelayNode'

export const WaitUntilNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="utility" selected={selected} icon={<Hourglass className="h-3 w-3" />}
      title="Wait Until" hasInput hasOutput>
      <NodeDataRow label="Time" value={d.targetTime as string} />
    </BaseNode>
  )
})
WaitUntilNode.displayName = 'WaitUntilNode'

export const LogNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="utility" selected={selected} icon={<FileTerminal className="h-3 w-3" />}
      title="Log" subtitle={(d.level as string) || 'info'} hasInput hasOutput>
      {d.message ? <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{String(d.message)}</div> : null}
    </BaseNode>
  )
})
LogNode.displayName = 'LogNode'

export const VariableNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="utility" selected={selected} icon={<Variable className="h-3 w-3" />}
      title="Variable" subtitle={(d.operation as string) || 'set'} hasInput hasOutput>
      <NodeDataRow label="Name" value={d.variableName as string} />
    </BaseNode>
  )
})
VariableNode.displayName = 'VariableNode'

export const MathExpressionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="utility" selected={selected} icon={<Sigma className="h-3 w-3" />}
      title="Math" hasInput hasOutput>
      {d.expression ? <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">{String(d.expression)}</div> : null}
    </BaseNode>
  )
})
MathExpressionNode.displayName = 'MathExpressionNode'

export const HttpRequestNode = memo(({ data, selected }: NodeProps) => {
  const d = data as Record<string, unknown>
  return (
    <BaseNode category="utility" selected={selected} icon={<Globe2 className="h-3 w-3" />}
      title="HTTP Request" subtitle={(d.method as string) || 'GET'} hasInput hasOutput>
      {d.url ? <div className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">{String(d.url)}</div> : null}
    </BaseNode>
  )
})
HttpRequestNode.displayName = 'HttpRequestNode'

// =============================================================================
// NODE TYPE REGISTRY (for React Flow)
// =============================================================================

export const nodeTypes = {
  // Triggers
  start: StartNode,
  priceAlert: PriceAlertNode,
  webhook: WebhookTriggerNode,
  // Actions
  placeOrder: PlaceOrderNode,
  smartOrder: SmartOrderNode,
  optionsOrder: OptionsOrderNode,
  optionsMultiOrder: OptionsMultiOrderNode,
  basketOrder: BasketOrderNode,
  splitOrder: SplitOrderNode,
  modifyOrder: ModifyOrderNode,
  cancelOrder: CancelOrderNode,
  cancelAllOrders: CancelAllOrdersNode,
  closePositions: ClosePositionsNode,
  // Conditions
  positionCheck: PositionCheckNode,
  fundCheck: FundCheckNode,
  priceCondition: PriceConditionNode,
  timeWindow: TimeWindowNode,
  timeCondition: TimeConditionNode,
  andGate: AndGateNode,
  orGate: OrGateNode,
  notGate: NotGateNode,
  // Data
  getQuote: GetQuoteNode,
  getDepth: GetDepthNode,
  getOrderStatus: GetOrderStatusNode,
  history: HistoryNode,
  openPosition: OpenPositionNode,
  expiry: ExpiryNode,
  intervals: IntervalsNode,
  multiQuotes: MultiQuotesNode,
  symbol: SymbolNode,
  optionSymbol: OptionSymbolNode,
  orderBook: OrderBookNode,
  tradeBook: TradeBookNode,
  positionBook: PositionBookNode,
  syntheticFuture: SyntheticFutureNode,
  optionChain: OptionChainNode,
  holidays: HolidaysNode,
  timings: TimingsNode,
  // Streaming
  subscribeLtp: SubscribeLTPNode,
  subscribeQuote: SubscribeQuoteNode,
  subscribeDepth: SubscribeDepthNode,
  unsubscribe: UnsubscribeNode,
  // Risk
  holdings: HoldingsNode,
  funds: FundsNode,
  margin: MarginNode,
  // Utilities
  telegramAlert: TelegramAlertNode,
  delay: DelayNode,
  waitUntil: WaitUntilNode,
  log: LogNode,
  variable: VariableNode,
  mathExpression: MathExpressionNode,
  httpRequest: HttpRequestNode,
}
