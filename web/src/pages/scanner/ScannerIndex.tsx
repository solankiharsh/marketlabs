import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Radar, Trash2, MoreVertical, Power, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import * as scannerApi from '@/api/scanner'

export default function ScannerIndex() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['scanner-strategies'],
    queryFn: scannerApi.getStrategies,
  })

  const deleteMutation = useMutation({
    mutationFn: scannerApi.deleteStrategy,
    onSuccess: () => {
      toast.success('Strategy deleted')
      queryClient.invalidateQueries({ queryKey: ['scanner-strategies'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: scannerApi.toggleStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scanner-strategies'] }),
  })

  const strategies = data?.data || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Scanner Strategies</h1>
        </div>
        <Button size="sm" onClick={() => navigate('/scanner/create')}>
          <Plus className="h-4 w-4 mr-2" />
          New Strategy
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : strategies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Radar className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No scanner strategies</p>
            <p className="text-sm mb-4">Create a webhook-based scanner strategy</p>
            <Button onClick={() => navigate('/scanner/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Strategy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((s: scannerApi.ScannerStrategy) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <Link to={`/scanner/${s.id}`} className="flex-1">
                  <CardTitle className="text-base hover:text-primary transition-colors">
                    {s.name}
                  </CardTitle>
                </Link>
                <div className="flex items-center gap-1">
                  <Badge variant={s.is_active ? 'default' : 'secondary'}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleMutation.mutate(s.id)}>
                        {s.is_active ? (
                          <><PowerOff className="mr-2 h-4 w-4" /> Deactivate</>
                        ) : (
                          <><Power className="mr-2 h-4 w-4" /> Activate</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this strategy?')) deleteMutation.mutate(s.id)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <Link to={`/scanner/${s.id}`}>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Market:</span>
                      <span className="font-medium text-foreground">{s.market_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium text-foreground">{s.strategy_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Webhook:</span>
                      <code className="text-xs bg-muted px-1 rounded">{s.webhook_id.slice(0, 12)}...</code>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
