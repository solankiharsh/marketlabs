import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Settings, Eye, EyeOff, ExternalLink, Loader2, Check, Wallet, HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import * as settingsApi from '@/api/settings'

interface SettingsItem {
  key: string
  type: 'text' | 'password' | 'select' | 'boolean' | 'number'
  default?: string
  description?: string
  options?: { value: string; label: string }[]
  link?: string
  link_text?: string
}

interface SettingsGroup {
  title?: string
  icon?: string
  items: SettingsItem[]
  order?: number
}

const GROUP_ICONS: Record<string, string> = {
  ai: '🤖', exchange: '💱', notification: '🔔', general: '⚙️', security: '🔒', data: '📊',
}

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, Record<string, string>>>({})
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({})
  const [openRouterBalance, setOpenRouterBalance] = useState<Record<string, unknown> | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  const { data: schema = {}, isLoading: loadingSchema } = useQuery({
    queryKey: ['settings-schema'],
    queryFn: async () => {
      const res = await settingsApi.getSettingsSchema()
      return (res.data?.data || {}) as Record<string, SettingsGroup>
    },
  })

  const { data: savedValues = {} } = useQuery({
    queryKey: ['settings-values'],
    queryFn: async () => {
      const res = await settingsApi.getSettingsValues()
      return (res.data?.data || {}) as Record<string, Record<string, string>>
    },
  })

  useEffect(() => {
    if (Object.keys(savedValues).length > 0) setValues(savedValues)
  }, [savedValues])

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.saveSettings(values),
    onSuccess: () => toast.success('Settings saved'),
    onError: () => toast.error('Failed to save'),
  })

  const queryBalance = async () => {
    setBalanceLoading(true)
    try {
      const res = await settingsApi.getOpenRouterBalance()
      setOpenRouterBalance(res.data?.data || null)
    } catch { toast.error('Failed to query balance') }
    setBalanceLoading(false)
  }

  const updateValue = (group: string, key: string, val: string) => {
    setValues(prev => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [key]: val },
    }))
  }

  const getValue = (group: string, key: string) => values[group]?.[key] || ''

  if (loadingSchema) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  const sortedGroups = Object.entries(schema).sort(([, a], [, b]) => (a.order || 99) - (b.order || 99))

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" /> Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure API keys, model settings, and system preferences</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
          Save Settings
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={sortedGroups.map(([k]) => k)} className="space-y-2">
        {sortedGroups.map(([groupKey, group]) => (
          <AccordionItem key={groupKey} value={groupKey} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <span>{GROUP_ICONS[groupKey] || '⚙️'}</span>
                <span className="font-medium">{group.title || groupKey}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {/* OpenRouter balance card for AI group */}
              {groupKey === 'ai' && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium flex items-center gap-1.5">
                        <Wallet className="h-4 w-4" /> OpenRouter Balance
                      </span>
                      <Button size="sm" variant="outline" onClick={queryBalance} disabled={balanceLoading}>
                        {balanceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Query Balance'}
                      </Button>
                    </div>
                    {openRouterBalance ? (
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Used</div>
                          <div className="font-bold text-red-500">${(openRouterBalance.usage as number)?.toFixed(4)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Remaining</div>
                          <div className="font-bold text-green-500">
                            {(openRouterBalance.limit_remaining as number | null) !== null ? `$${(openRouterBalance.limit_remaining as number)?.toFixed(4)}` : '∞'}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Limit</div>
                          <div className="font-bold">
                            {(openRouterBalance.limit as number | null) !== null ? `$${(openRouterBalance.limit as number)?.toFixed(2)}` : '∞'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Click "Query Balance" to fetch account info</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.items.map(item => (
                  <div key={item.key}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Label className="text-sm">{item.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                      {item.description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                            <TooltipContent className="max-w-xs"><p>{item.description}</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-0.5">
                          <ExternalLink className="h-3 w-3" /> {item.link_text || 'Get Key'}
                        </a>
                      )}
                    </div>

                    {item.type === 'password' ? (
                      <div className="relative">
                        <Input
                          type={passwordVisible[item.key] ? 'text' : 'password'}
                          value={getValue(groupKey, item.key)}
                          onChange={e => updateValue(groupKey, item.key, e.target.value)}
                          placeholder={item.default ? `Default: ${item.default}` : ''}
                        />
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                          onClick={() => setPasswordVisible(p => ({ ...p, [item.key]: !p[item.key] }))}
                        >
                          {passwordVisible[item.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : item.type === 'select' ? (
                      <Select value={getValue(groupKey, item.key)} onValueChange={v => updateValue(groupKey, item.key, v)}>
                        <SelectTrigger><SelectValue placeholder={item.default || 'Select...'} /></SelectTrigger>
                        <SelectContent>
                          {(item.options || []).map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : item.type === 'boolean' ? (
                      <Switch
                        checked={getValue(groupKey, item.key) === 'true'}
                        onCheckedChange={v => updateValue(groupKey, item.key, String(v))}
                      />
                    ) : item.type === 'number' ? (
                      <Input
                        type="number"
                        value={getValue(groupKey, item.key)}
                        onChange={e => updateValue(groupKey, item.key, e.target.value)}
                        placeholder={item.default ? `Default: ${item.default}` : ''}
                      />
                    ) : (
                      <Input
                        value={getValue(groupKey, item.key)}
                        onChange={e => updateValue(groupKey, item.key, e.target.value)}
                        placeholder={item.default ? `Default: ${item.default}` : ''}
                      />
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
