import { useQuery } from '@tanstack/react-query'
import { X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import * as flowApi from '@/api/flow'

interface ExecutionLogPanelProps {
  workflowId: number
  onClose: () => void
}

export function ExecutionLogPanel({ workflowId, onClose }: ExecutionLogPanelProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['flow-executions', workflowId],
    queryFn: () => flowApi.getExecutions(workflowId),
    refetchInterval: 5000,
  })

  const executions = data?.data || []

  return (
    <div className="absolute bottom-0 left-52 right-0 h-64 border-t bg-card flex flex-col z-10">
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/50">
        <h3 className="text-xs font-medium">Execution Logs</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : executions.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No executions yet
          </div>
        ) : (
          <div className="divide-y">
            {executions.map((exec: flowApi.WorkflowExecution) => (
              <div key={exec.id} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Execution #{exec.id}</span>
                  <Badge
                    variant={
                      exec.status === 'completed' ? 'default' :
                      exec.status === 'failed' ? 'destructive' : 'secondary'
                    }
                    className="text-[10px] h-5"
                  >
                    {exec.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {exec.started_at && (
                    <span>Started: {new Date(exec.started_at).toLocaleString()}</span>
                  )}
                  {exec.completed_at && (
                    <span className="ml-3">
                      Completed: {new Date(exec.completed_at).toLocaleString()}
                    </span>
                  )}
                </div>
                {exec.error && (
                  <div className="mt-1 text-destructive bg-destructive/10 rounded px-2 py-1">
                    {exec.error}
                  </div>
                )}
                {Array.isArray(exec.logs) && exec.logs.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {(exec.logs as Array<{ time: string; message: string; level: string }>).map((log, i) => (
                      <div key={i} className="flex gap-2 text-[10px]">
                        <span className="text-muted-foreground shrink-0">{log.time}</span>
                        <span className={
                          log.level === 'error' ? 'text-destructive' :
                          log.level === 'warn' ? 'text-amber-500' : ''
                        }>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
