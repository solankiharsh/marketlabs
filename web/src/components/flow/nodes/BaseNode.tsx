import { memo, type ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'

export type NodeCategory = 'trigger' | 'action' | 'condition' | 'data' | 'streaming' | 'risk' | 'utility'

interface BaseNodeProps {
  category: NodeCategory
  selected?: boolean
  icon: ReactNode
  title: string
  subtitle?: string
  hasInput?: boolean
  hasOutput?: boolean
  hasConditionalOutputs?: boolean
  children?: ReactNode
  className?: string
  minWidth?: number
}

const categoryStyles: Record<NodeCategory, { border: string; iconBg: string }> = {
  trigger: { border: 'border-l-green-500', iconBg: 'bg-green-500/20 text-green-600' },
  action: { border: 'border-l-blue-500', iconBg: 'bg-blue-500/20 text-blue-600' },
  condition: { border: 'border-l-amber-500', iconBg: 'bg-amber-500/20 text-amber-600' },
  data: { border: 'border-l-purple-500', iconBg: 'bg-purple-500/20 text-purple-600' },
  streaming: { border: 'border-l-cyan-500', iconBg: 'bg-cyan-500/20 text-cyan-600' },
  risk: { border: 'border-l-red-500', iconBg: 'bg-red-500/20 text-red-600' },
  utility: { border: 'border-l-gray-400', iconBg: 'bg-gray-400/20 text-gray-500' },
}

export const BaseNode = memo(function BaseNode({
  category,
  selected,
  icon,
  title,
  subtitle,
  hasInput = false,
  hasOutput = true,
  hasConditionalOutputs = false,
  children,
  className,
  minWidth = 120,
}: BaseNodeProps) {
  const styles = categoryStyles[category]

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card border-l-2 shadow-sm',
        styles.border,
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
      style={{ minWidth }}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!top-0 !h-3 !w-3 !-translate-y-1/2 !rounded-full !border-2 !border-background !bg-muted-foreground"
        />
      )}

      <div className="p-2">
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className={cn('flex h-5 w-5 items-center justify-center rounded', styles.iconBg)}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium leading-tight">{title}</div>
            {subtitle && <div className="truncate text-[9px] text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {children && <div className="space-y-1">{children}</div>}
      </div>

      {hasConditionalOutputs ? (
        <>
          <Handle type="source" position={Position.Bottom} id="true"
            className="!bottom-0 !h-3 !w-3 !translate-y-1/2 !rounded-full !border-2 !border-background !bg-green-500"
            style={{ left: '25%' }} />
          <Handle type="source" position={Position.Bottom} id="false"
            className="!bottom-0 !h-3 !w-3 !translate-y-1/2 !rounded-full !border-2 !border-background !bg-red-500"
            style={{ left: '75%' }} />
        </>
      ) : hasOutput ? (
        <Handle type="source" position={Position.Bottom}
          className="!bottom-0 !h-3 !w-3 !translate-y-1/2 !rounded-full !border-2 !border-background !bg-muted-foreground" />
      ) : null}
    </div>
  )
})

export function NodeDataRow({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex items-center justify-between rounded bg-muted/50 px-1.5 py-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-[10px] font-medium font-mono">{value ?? '-'}</span>
    </div>
  )
}

export function NodeBadge({ variant, children }: { variant: 'buy' | 'sell' | 'default'; children: ReactNode }) {
  return (
    <span className={cn(
      'rounded px-1 py-0.5 text-[9px] font-semibold',
      variant === 'buy' && 'bg-green-500/20 text-green-600',
      variant === 'sell' && 'bg-red-500/20 text-red-600',
      variant === 'default' && 'bg-muted text-muted-foreground',
    )}>{children}</span>
  )
}
