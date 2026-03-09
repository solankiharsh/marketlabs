import { useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type OnConnect,
  Panel,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import * as flowApi from '@/api/flow'
import { useFlowWorkflowStore } from '@/stores/flowWorkflowStore'
import { nodeTypes } from '@/components/flow/nodes'
import { NodePalette } from '@/components/flow/panels/NodePalette'
import { ConfigPanel } from '@/components/flow/panels/ConfigPanel'
import { ExecutionLogPanel } from '@/components/flow/panels/ExecutionLogPanel'

export default function FlowEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const workflowId = Number(id)
  const nameRef = useRef<HTMLInputElement>(null)

  const {
    selectedNodeId,
    setSelectedNodeId,
    showExecutionLogs,
    setShowExecutionLogs,
  } = useFlowWorkflowStore()

  const { data: workflowData, isLoading } = useQuery({
    queryKey: ['flow-workflow', workflowId],
    queryFn: () => flowApi.getWorkflow(workflowId),
    enabled: !!workflowId,
  })

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    if (workflowData?.data) {
      const wf = workflowData.data
      setNodes((wf.nodes || []) as Node[])
      setEdges((wf.edges || []) as Edge[])
      if (nameRef.current) {
        nameRef.current.value = wf.name || 'Untitled Workflow'
      }
    }
  }, [workflowData, setNodes, setEdges])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds))
    },
    [setEdges]
  )

  const saveMutation = useMutation({
    mutationFn: () =>
      flowApi.updateWorkflow(workflowId, {
        name: nameRef.current?.value || 'Untitled Workflow',
        nodes,
        edges,
      }),
    onSuccess: () => toast.success('Workflow saved'),
    onError: () => toast.error('Failed to save workflow'),
  })

  const executeMutation = useMutation({
    mutationFn: () => flowApi.executeWorkflow(workflowId),
    onSuccess: () => {
      toast.success('Workflow execution started')
      setShowExecutionLogs(true)
    },
    onError: () => toast.error('Failed to execute workflow'),
  })

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 100,
      }

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: type.replace(/Node$/, '').replace(/([A-Z])/g, ' $1').trim() },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [setNodes]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  const updateNodeData = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
      )
    },
    [setNodes]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Node Palette (left) */}
      <NodePalette />

      {/* Canvas (center) */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap />

          <Panel position="top-left" className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-md p-2 border shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => navigate('/flow')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Input
              ref={nameRef}
              defaultValue={workflowData?.data?.name || 'Untitled Workflow'}
              className="w-48 h-8 text-sm"
            />
          </Panel>

          <Panel position="top-right" className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => executeMutation.mutate()}
              disabled={executeMutation.isPending}
            >
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Config Panel (right) */}
      {selectedNode && (
        <ConfigPanel
          node={selectedNode}
          onUpdateData={(data) => updateNodeData(selectedNode.id, data)}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Execution Logs (bottom drawer) */}
      {showExecutionLogs && (
        <ExecutionLogPanel
          workflowId={workflowId}
          onClose={() => setShowExecutionLogs(false)}
        />
      )}
    </div>
  )
}
