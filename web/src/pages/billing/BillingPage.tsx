import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Wallet, Crown, Loader2, QrCode, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import * as billingApi from '@/api/billing'
import { cn } from '@/lib/utils'

interface Plan {
  price_usd: number
  credits_once: number
  credits_monthly?: number
}

interface UsdtOrder {
  id: string
  amount_usdt: number
  chain: string
  address: string
  status: 'pending' | 'confirmed' | 'expired'
  qr_url?: string
}

export default function BillingPage() {
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [usdtOrder, setUsdtOrder] = useState<UsdtOrder | null>(null)

  const { data: plansData } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const res = await billingApi.getMembershipPlans()
      return (res.data?.data || {}) as { billing: Record<string, unknown>; plans: Record<string, Plan> }
    },
  })

  const billing = plansData?.billing || {} as Record<string, unknown>
  const plans = plansData?.plans || {
    monthly: { price_usd: 9.9, credits_once: 1000 },
    yearly: { price_usd: 79.9, credits_once: 15000 },
    lifetime: { price_usd: 199.9, credits_once: 0, credits_monthly: 2000 },
  } as Record<string, Plan>

  const isVip = !!(billing.is_vip)
  const credits = (billing.credits as number) || 0

  const buy = async (plan: string) => {
    setPurchasing(plan)
    try {
      const res = await billingApi.createUsdtOrder(plan)
      const order = res.data?.data as UsdtOrder
      if (order) {
        setUsdtOrder(order)
      } else {
        toast.error('Failed to create order')
      }
    } catch {
      toast.error('Failed to initiate purchase')
    }
    setPurchasing(null)
  }

  const copyAddress = () => {
    if (usdtOrder?.address) {
      navigator.clipboard.writeText(usdtOrder.address)
      toast.success('Address copied')
    }
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5" /> Billing</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and credits</p>
      </div>

      {/* Current status */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Credits</div>
              <div className="text-2xl font-bold">{credits.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">VIP Status</div>
              <div className="flex items-center gap-2">
                {isVip ? (
                  <Badge className="bg-yellow-500 text-white"><Crown className="h-3 w-3 mr-1" /> VIP</Badge>
                ) : (
                  <Badge variant="secondary">Free</Badge>
                )}
                {!!(billing as Record<string, unknown>).vip_expires_at && (
                  <span className="text-sm text-muted-foreground">
                    Expires: {new Date((billing as Record<string, unknown>).vip_expires_at as string).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-lg mb-1">Monthly</h3>
            <div className="text-3xl font-bold mb-1">${plans.monthly?.price_usd}</div>
            <div className="text-sm text-muted-foreground mb-4">/ month</div>
            <div className="text-sm text-green-500 font-medium mb-4">+{plans.monthly?.credits_once} credits</div>
            <Button className="w-full" onClick={() => buy('monthly')} disabled={purchasing === 'monthly'}>
              {purchasing === 'monthly' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Subscribe
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardContent className="p-6 text-center">
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">Best Value</Badge>
            <h3 className="font-bold text-lg mb-1 mt-2">Yearly</h3>
            <div className="text-3xl font-bold mb-1">${plans.yearly?.price_usd}</div>
            <div className="text-sm text-muted-foreground mb-4">/ year</div>
            <div className="text-sm text-green-500 font-medium mb-4">+{plans.yearly?.credits_once} credits</div>
            <Button className="w-full" onClick={() => buy('yearly')} disabled={purchasing === 'yearly'}>
              {purchasing === 'yearly' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Subscribe
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-lg mb-1">Lifetime</h3>
            <div className="text-3xl font-bold mb-1">${plans.lifetime?.price_usd}</div>
            <div className="text-sm text-muted-foreground mb-4">one time</div>
            <div className="text-sm text-green-500 font-medium mb-4">+{plans.lifetime?.credits_monthly} credits/month</div>
            <Button className="w-full" onClick={() => buy('lifetime')} disabled={purchasing === 'lifetime'}>
              {purchasing === 'lifetime' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Purchase
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* USDT Payment Modal */}
      <Dialog open={!!usdtOrder} onOpenChange={() => setUsdtOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">USDT Payment</DialogTitle>
          </DialogHeader>
          {usdtOrder && (
            <div className="space-y-4 text-center">
              <div className="text-3xl font-bold">{usdtOrder.amount_usdt} USDT</div>
              <Badge variant="secondary">{usdtOrder.chain}</Badge>

              {usdtOrder.qr_url ? (
                <div className="mx-auto w-48 h-48 border rounded-lg overflow-hidden">
                  <img src={usdtOrder.qr_url} alt="QR Code" className="w-full h-full" />
                </div>
              ) : (
                <div className="mx-auto w-48 h-48 border rounded-lg flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
              )}

              <div className="text-sm">
                <div className="text-muted-foreground mb-1">Send to address:</div>
                <div className="flex items-center gap-2 justify-center">
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">{usdtOrder.address}</code>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copyAddress}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className={cn('text-sm font-medium',
                usdtOrder.status === 'pending' ? 'text-yellow-500' :
                usdtOrder.status === 'confirmed' ? 'text-green-500' : 'text-red-500'
              )}>
                Status: {usdtOrder.status}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
