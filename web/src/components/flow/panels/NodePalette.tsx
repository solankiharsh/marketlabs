import { useState } from 'react'
import {
  Clock, Bell, Globe, ShoppingCart, Zap, Layers, Split, Scissors, Pencil, X, XCircle, DoorClosed,
  Briefcase, DollarSign, TrendingUp, Clock3, Clock4, GitMerge, GitBranch, Ban,
  BarChart3, BookOpen, FileText, History, MapPin, CalendarRange, Timer,
  List, Tag, Hash, Book, Activity, BarChart, Landmark, CalendarCheck, Clock12,
  Radio, RadioTower, Wifi, Unplug,
  Shield, Wallet, Calculator,
  Send, Pause, Hourglass, FileTerminal, Variable, Sigma, Globe2,
  ChevronDown, ChevronRight, Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface NodeDef {
  type: string
  label: string
  icon: React.ReactNode
}

interface NodeGroup {
  label: string
  color: string
  nodes: NodeDef[]
}

const nodeGroups: NodeGroup[] = [
  {
    label: 'Triggers',
    color: 'text-green-600',
    nodes: [
      { type: 'start', label: 'Start', icon: <Clock className="h-3.5 w-3.5" /> },
      { type: 'priceAlert', label: 'Price Alert', icon: <Bell className="h-3.5 w-3.5" /> },
      { type: 'webhook', label: 'Webhook', icon: <Globe className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Actions',
    color: 'text-blue-600',
    nodes: [
      { type: 'placeOrder', label: 'Place Order', icon: <ShoppingCart className="h-3.5 w-3.5" /> },
      { type: 'smartOrder', label: 'Smart Order', icon: <Zap className="h-3.5 w-3.5" /> },
      { type: 'optionsOrder', label: 'Options Order', icon: <Layers className="h-3.5 w-3.5" /> },
      { type: 'optionsMultiOrder', label: 'Options Multi', icon: <Layers className="h-3.5 w-3.5" /> },
      { type: 'basketOrder', label: 'Basket Order', icon: <Split className="h-3.5 w-3.5" /> },
      { type: 'splitOrder', label: 'Split Order', icon: <Scissors className="h-3.5 w-3.5" /> },
      { type: 'modifyOrder', label: 'Modify Order', icon: <Pencil className="h-3.5 w-3.5" /> },
      { type: 'cancelOrder', label: 'Cancel Order', icon: <X className="h-3.5 w-3.5" /> },
      { type: 'cancelAllOrders', label: 'Cancel All', icon: <XCircle className="h-3.5 w-3.5" /> },
      { type: 'closePositions', label: 'Close Positions', icon: <DoorClosed className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Conditions',
    color: 'text-amber-600',
    nodes: [
      { type: 'positionCheck', label: 'Position Check', icon: <Briefcase className="h-3.5 w-3.5" /> },
      { type: 'fundCheck', label: 'Fund Check', icon: <DollarSign className="h-3.5 w-3.5" /> },
      { type: 'priceCondition', label: 'Price Condition', icon: <TrendingUp className="h-3.5 w-3.5" /> },
      { type: 'timeWindow', label: 'Time Window', icon: <Clock3 className="h-3.5 w-3.5" /> },
      { type: 'timeCondition', label: 'Time Condition', icon: <Clock4 className="h-3.5 w-3.5" /> },
      { type: 'andGate', label: 'AND Gate', icon: <GitMerge className="h-3.5 w-3.5" /> },
      { type: 'orGate', label: 'OR Gate', icon: <GitBranch className="h-3.5 w-3.5" /> },
      { type: 'notGate', label: 'NOT Gate', icon: <Ban className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Data',
    color: 'text-purple-600',
    nodes: [
      { type: 'getQuote', label: 'Get Quote', icon: <BarChart3 className="h-3.5 w-3.5" /> },
      { type: 'getDepth', label: 'Get Depth', icon: <BookOpen className="h-3.5 w-3.5" /> },
      { type: 'getOrderStatus', label: 'Order Status', icon: <FileText className="h-3.5 w-3.5" /> },
      { type: 'history', label: 'History', icon: <History className="h-3.5 w-3.5" /> },
      { type: 'openPosition', label: 'Open Position', icon: <MapPin className="h-3.5 w-3.5" /> },
      { type: 'expiry', label: 'Expiry', icon: <CalendarRange className="h-3.5 w-3.5" /> },
      { type: 'intervals', label: 'Intervals', icon: <Timer className="h-3.5 w-3.5" /> },
      { type: 'multiQuotes', label: 'Multi Quotes', icon: <List className="h-3.5 w-3.5" /> },
      { type: 'symbol', label: 'Symbol Info', icon: <Tag className="h-3.5 w-3.5" /> },
      { type: 'optionSymbol', label: 'Option Symbol', icon: <Hash className="h-3.5 w-3.5" /> },
      { type: 'orderBook', label: 'Order Book', icon: <Book className="h-3.5 w-3.5" /> },
      { type: 'tradeBook', label: 'Trade Book', icon: <Activity className="h-3.5 w-3.5" /> },
      { type: 'positionBook', label: 'Position Book', icon: <BarChart className="h-3.5 w-3.5" /> },
      { type: 'syntheticFuture', label: 'Synthetic Future', icon: <Landmark className="h-3.5 w-3.5" /> },
      { type: 'optionChain', label: 'Option Chain', icon: <Layers className="h-3.5 w-3.5" /> },
      { type: 'holidays', label: 'Holidays', icon: <CalendarCheck className="h-3.5 w-3.5" /> },
      { type: 'timings', label: 'Timings', icon: <Clock12 className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Streaming',
    color: 'text-cyan-600',
    nodes: [
      { type: 'subscribeLtp', label: 'Subscribe LTP', icon: <Radio className="h-3.5 w-3.5" /> },
      { type: 'subscribeQuote', label: 'Subscribe Quote', icon: <RadioTower className="h-3.5 w-3.5" /> },
      { type: 'subscribeDepth', label: 'Subscribe Depth', icon: <Wifi className="h-3.5 w-3.5" /> },
      { type: 'unsubscribe', label: 'Unsubscribe', icon: <Unplug className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Risk',
    color: 'text-red-600',
    nodes: [
      { type: 'holdings', label: 'Holdings', icon: <Shield className="h-3.5 w-3.5" /> },
      { type: 'funds', label: 'Funds', icon: <Wallet className="h-3.5 w-3.5" /> },
      { type: 'margin', label: 'Margin', icon: <Calculator className="h-3.5 w-3.5" /> },
    ],
  },
  {
    label: 'Utilities',
    color: 'text-gray-500',
    nodes: [
      { type: 'telegramAlert', label: 'Telegram Alert', icon: <Send className="h-3.5 w-3.5" /> },
      { type: 'delay', label: 'Delay', icon: <Pause className="h-3.5 w-3.5" /> },
      { type: 'waitUntil', label: 'Wait Until', icon: <Hourglass className="h-3.5 w-3.5" /> },
      { type: 'log', label: 'Log', icon: <FileTerminal className="h-3.5 w-3.5" /> },
      { type: 'variable', label: 'Variable', icon: <Variable className="h-3.5 w-3.5" /> },
      { type: 'mathExpression', label: 'Math Expression', icon: <Sigma className="h-3.5 w-3.5" /> },
      { type: 'httpRequest', label: 'HTTP Request', icon: <Globe2 className="h-3.5 w-3.5" /> },
    ],
  },
]

export function NodePalette() {
  const [search, setSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(nodeGroups.map((g) => g.label))
  )

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const filteredGroups = nodeGroups
    .map((group) => ({
      ...group,
      nodes: group.nodes.filter((n) =>
        n.label.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((group) => group.nodes.length > 0)

  return (
    <div className="w-52 border-r bg-card flex flex-col">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredGroups.map((group) => (
            <div key={group.label} className="mb-1">
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-medium hover:bg-accent"
              >
                {expandedGroups.has(group.label) ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span className={group.color}>{group.label}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{group.nodes.length}</span>
              </button>
              {expandedGroups.has(group.label) && (
                <div className="ml-2 space-y-0.5">
                  {group.nodes.map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(e) => onDragStart(e, node.type)}
                      className={cn(
                        'flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-grab',
                        'hover:bg-accent active:cursor-grabbing transition-colors'
                      )}
                    >
                      <span className={group.color}>{node.icon}</span>
                      <span>{node.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
