import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import * as scannerApi from '@/api/scanner'

const MARKETS = ['USStock', 'Crypto', 'IndianStock', 'Forex', 'Futures']

export default function ScannerCreate() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [marketType, setMarketType] = useState('USStock')
  const [strategyType, setStrategyType] = useState('intraday')
  const [startTime, setStartTime] = useState('09:30')
  const [endTime, setEndTime] = useState('16:00')
  const [squareoffTime, setSquareoffTime] = useState('15:50')
  const [defaultAction, setDefaultAction] = useState('BUY')
  const [defaultOrderType, setDefaultOrderType] = useState('market')

  const createMutation = useMutation({
    mutationFn: scannerApi.createStrategy,
    onSuccess: (res) => {
      toast.success('Strategy created')
      if (res?.data?.id) navigate(`/scanner/${res.data.id}`)
    },
    onError: () => toast.error('Failed to create strategy'),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    createMutation.mutate({
      name,
      market_type: marketType,
      strategy_type: strategyType,
      start_time: startTime,
      end_time: endTime,
      squareoff_time: squareoffTime,
      default_action: defaultAction,
      default_order_type: defaultOrderType,
    })
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/scanner')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create Scanner Strategy</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategy Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Strategy Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Scanner Strategy" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Market</Label>
                <Select value={marketType} onValueChange={setMarketType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MARKETS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Strategy Type</Label>
                <Select value={strategyType} onValueChange={setStrategyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intraday">Intraday</SelectItem>
                    <SelectItem value="positional">Positional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Squareoff</Label>
                <Input type="time" value={squareoffTime} onChange={(e) => setSquareoffTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Action</Label>
                <Select value={defaultAction} onValueChange={setDefaultAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Default Order Type</Label>
                <Select value={defaultOrderType} onValueChange={setDefaultOrderType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Strategy'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
