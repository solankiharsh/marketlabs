import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react'

// =============================================================================
// TRIGGER NODE DATA TYPES
// =============================================================================

export interface StartNodeData {
  label?: string
  scheduleType: 'once' | 'daily' | 'weekly' | 'interval'
  time: string
  days?: number[]
  intervalValue?: number
  intervalUnit?: 'seconds' | 'minutes' | 'hours'
  marketHoursOnly?: boolean
}

export interface PriceAlertNodeData {
  label?: string
  symbol: string
  market: string
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below'
  price: number
  ltp?: number
}

export interface WebhookNodeData {
  label?: string
  webhookId?: string
  webhookUrl?: string
}

// =============================================================================
// ACTION NODE DATA TYPES
// =============================================================================

export interface PlaceOrderNodeData {
  label?: string
  symbol: string
  market: string
  action: 'BUY' | 'SELL'
  quantity: number
  orderType: 'market' | 'limit'
  price?: number
  ltp?: number
}

export interface SmartOrderNodeData {
  label?: string
  symbol: string
  market: string
  action: 'BUY' | 'SELL'
  quantity: number
  positionSize: number
  orderType: 'market' | 'limit'
  price?: number
  ltp?: number
}

export interface OptionsOrderNodeData {
  label?: string
  underlying: string
  market: string
  expiryDate: string
  offset: string
  optionType: 'CE' | 'PE'
  action: 'BUY' | 'SELL'
  quantity: number
  orderType: 'market' | 'limit'
  price?: number
  ltp?: number
}

export interface OptionsMultiOrderNodeData {
  label?: string
  strategy: 'iron_condor' | 'straddle' | 'strangle' | 'bull_call_spread' | 'bear_put_spread' | 'custom'
  underlying: string
  market: string
  expiryDate: string
  legs: Array<{
    offset: string
    optionType: 'CE' | 'PE'
    action: 'BUY' | 'SELL'
    quantity: number
  }>
  orderType: 'market' | 'limit'
}

export interface BasketOrderNodeData {
  label?: string
  orders: Array<{
    symbol: string
    market: string
    action: 'BUY' | 'SELL'
    quantity: number
    orderType: 'market' | 'limit'
    price?: number
  }>
}

export interface SplitOrderNodeData {
  label?: string
  symbol: string
  market: string
  action: 'BUY' | 'SELL'
  quantity: number
  splitSize: number
  orderType: 'market' | 'limit'
  delayMs?: number
}

export interface ModifyOrderNodeData {
  label?: string
  orderId: string
  newQuantity?: number
  newPrice?: number
}

export interface CancelOrderNodeData {
  label?: string
  orderId: string
}

export interface CancelAllOrdersNodeData {
  label?: string
}

export interface ClosePositionsNodeData {
  label?: string
  market?: string
}

// =============================================================================
// CONDITION NODE DATA TYPES
// =============================================================================

export interface PositionCheckNodeData {
  label?: string
  symbol: string
  market: string
  condition: 'exists' | 'not_exists' | 'quantity_above' | 'quantity_below' | 'pnl_above' | 'pnl_below'
  threshold?: number
}

export interface FundCheckNodeData {
  label?: string
  minAvailable: number
}

export interface PriceConditionNodeData {
  label?: string
  symbol: string
  market: string
  field: 'ltp' | 'open' | 'high' | 'low' | 'change_percent'
  operator: '>' | '<' | '==' | '>=' | '<='
  value: number
}

export interface TimeWindowNodeData {
  label?: string
  startTime: string
  endTime: string
  days?: number[]
}

export interface TimeConditionNodeData {
  label?: string
  conditionType: 'entry' | 'exit' | 'custom'
  targetTime: string
  operator: '==' | '>=' | '<='
}

export interface AndGateNodeData {
  label?: string
}

export interface OrGateNodeData {
  label?: string
}

export interface NotGateNodeData {
  label?: string
}

// =============================================================================
// DATA NODE DATA TYPES
// =============================================================================

export interface GetQuoteNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface GetDepthNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface GetOrderStatusNodeData {
  label?: string
  orderId: string
  outputVariable?: string
}

export interface HistoryNodeData {
  label?: string
  symbol: string
  market: string
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d'
  days: number
  outputVariable?: string
}

export interface OpenPositionNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface ExpiryNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface IntervalsNodeData {
  label?: string
  outputVariable?: string
}

export interface MultiQuotesNodeData {
  label?: string
  symbols: Array<{ symbol: string; market: string }>
  outputVariable?: string
}

export interface SymbolNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface OptionSymbolNodeData {
  label?: string
  underlying: string
  market: string
  expiryDate: string
  offset: string
  optionType: 'CE' | 'PE'
  outputVariable?: string
}

export interface OrderBookNodeData {
  label?: string
  outputVariable?: string
}

export interface TradeBookNodeData {
  label?: string
  outputVariable?: string
}

export interface PositionBookNodeData {
  label?: string
  outputVariable?: string
}

export interface SyntheticFutureNodeData {
  label?: string
  underlying: string
  market: string
  expiryDate: string
  outputVariable?: string
}

export interface OptionChainNodeData {
  label?: string
  underlying: string
  market: string
  expiryDate: string
  strikeCount?: number
  outputVariable?: string
}

export interface HolidaysNodeData {
  label?: string
  year?: number
  outputVariable?: string
}

export interface TimingsNodeData {
  label?: string
  date?: string
  outputVariable?: string
}

// =============================================================================
// STREAMING NODE DATA TYPES
// =============================================================================

export interface SubscribeLTPNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface SubscribeQuoteNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface SubscribeDepthNodeData {
  label?: string
  symbol: string
  market: string
  outputVariable?: string
}

export interface UnsubscribeNodeData {
  label?: string
  symbol?: string
  market?: string
  streamType: 'ltp' | 'quote' | 'depth' | 'all'
}

// =============================================================================
// RISK NODE DATA TYPES
// =============================================================================

export interface HoldingsNodeData {
  label?: string
  outputVariable?: string
}

export interface FundsNodeData {
  label?: string
  outputVariable?: string
}

export interface MarginNodeData {
  label?: string
  positions: Array<{
    symbol: string
    market: string
    action: 'BUY' | 'SELL'
    quantity: number
  }>
  outputVariable?: string
}

// =============================================================================
// UTILITY NODE DATA TYPES
// =============================================================================

export interface TelegramAlertNodeData {
  label?: string
  message: string
}

export interface DelayNodeData {
  label?: string
  delayValue?: number
  delayUnit?: 'seconds' | 'minutes' | 'hours'
}

export interface WaitUntilNodeData {
  label?: string
  targetTime: string
}

export interface LogNodeData {
  label?: string
  message: string
  level: 'info' | 'warn' | 'error'
}

export interface VariableNodeData {
  label?: string
  variableName: string
  operation: 'set' | 'get' | 'add' | 'subtract' | 'multiply' | 'divide'
  value: string | number
}

export interface MathExpressionNodeData {
  label?: string
  expression: string
  outputVariable: string
}

export interface HttpRequestNodeData {
  label?: string
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  outputVariable?: string
}

// =============================================================================
// NODE TYPE CONSTANTS
// =============================================================================

export const NODE_TYPES = {
  START: 'start',
  PRICE_ALERT: 'priceAlert',
  WEBHOOK: 'webhook',
  PLACE_ORDER: 'placeOrder',
  SMART_ORDER: 'smartOrder',
  OPTIONS_ORDER: 'optionsOrder',
  OPTIONS_MULTI_ORDER: 'optionsMultiOrder',
  BASKET_ORDER: 'basketOrder',
  SPLIT_ORDER: 'splitOrder',
  MODIFY_ORDER: 'modifyOrder',
  CANCEL_ORDER: 'cancelOrder',
  CANCEL_ALL_ORDERS: 'cancelAllOrders',
  CLOSE_POSITIONS: 'closePositions',
  POSITION_CHECK: 'positionCheck',
  FUND_CHECK: 'fundCheck',
  PRICE_CONDITION: 'priceCondition',
  TIME_WINDOW: 'timeWindow',
  TIME_CONDITION: 'timeCondition',
  AND_GATE: 'andGate',
  OR_GATE: 'orGate',
  NOT_GATE: 'notGate',
  GET_QUOTE: 'getQuote',
  GET_DEPTH: 'getDepth',
  GET_ORDER_STATUS: 'getOrderStatus',
  HISTORY: 'history',
  OPEN_POSITION: 'openPosition',
  EXPIRY: 'expiry',
  INTERVALS: 'intervals',
  MULTI_QUOTES: 'multiQuotes',
  SYMBOL: 'symbol',
  OPTION_SYMBOL: 'optionSymbol',
  ORDER_BOOK: 'orderBook',
  TRADE_BOOK: 'tradeBook',
  POSITION_BOOK: 'positionBook',
  SYNTHETIC_FUTURE: 'syntheticFuture',
  OPTION_CHAIN: 'optionChain',
  HOLIDAYS: 'holidays',
  TIMINGS: 'timings',
  SUBSCRIBE_LTP: 'subscribeLtp',
  SUBSCRIBE_QUOTE: 'subscribeQuote',
  SUBSCRIBE_DEPTH: 'subscribeDepth',
  UNSUBSCRIBE: 'unsubscribe',
  HOLDINGS: 'holdings',
  FUNDS: 'funds',
  MARGIN: 'margin',
  TELEGRAM_ALERT: 'telegramAlert',
  DELAY: 'delay',
  WAIT_UNTIL: 'waitUntil',
  LOG: 'log',
  VARIABLE: 'variable',
  MATH_EXPRESSION: 'mathExpression',
  HTTP_REQUEST: 'httpRequest',
} as const

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomNode = ReactFlowNode<any>
export type CustomEdge = ReactFlowEdge
