import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Workflow, Trash2, Play, Pause, MoreVertical, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import * as flowApi from '@/api/flow'

export default function FlowIndex() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [importFile, setImportFile] = useState<HTMLInputElement | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['flow-workflows'],
    queryFn: flowApi.getWorkflows,
  })

  const createMutation = useMutation({
    mutationFn: flowApi.createWorkflow,
    onSuccess: (res) => {
      if (res?.data?.id) {
        navigate(`/flow/${res.data.id}`)
      }
      queryClient.invalidateQueries({ queryKey: ['flow-workflows'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: flowApi.deleteWorkflow,
    onSuccess: () => {
      toast.success('Workflow deleted')
      queryClient.invalidateQueries({ queryKey: ['flow-workflows'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? flowApi.deactivateWorkflow(id) : flowApi.activateWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-workflows'] })
    },
  })

  const handleCreate = () => {
    createMutation.mutate({ name: 'Untitled Workflow' })
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await flowApi.importWorkflow(data)
      if (res?.data?.id) {
        navigate(`/flow/${res.data.id}`)
      }
      queryClient.invalidateQueries({ queryKey: ['flow-workflows'] })
      toast.success('Workflow imported')
    } catch {
      toast.error('Failed to import workflow')
    }
    e.target.value = ''
  }

  const handleExport = async (id: number) => {
    try {
      const res = await flowApi.exportWorkflow(id)
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workflow-${id}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export workflow')
    }
  }

  const workflows = data?.data || []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Workflow className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Flow Workflows</h1>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={(el) => setImportFile(el)}
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={() => importFile?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Workflow className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No workflows yet</p>
            <p className="text-sm mb-4">Create your first visual strategy workflow</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf: flowApi.Workflow) => (
            <Card key={wf.id} className="group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <Link to={`/flow/${wf.id}`} className="flex-1">
                  <CardTitle className="text-base hover:text-primary transition-colors">
                    {wf.name}
                  </CardTitle>
                </Link>
                <div className="flex items-center gap-1">
                  <Badge variant={wf.is_active ? 'default' : 'secondary'}>
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toggleMutation.mutate({ id: wf.id, active: wf.is_active })}
                      >
                        {wf.is_active ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" /> Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" /> Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(wf.id)}>
                        <Download className="mr-2 h-4 w-4" /> Export
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this workflow?')) {
                            deleteMutation.mutate(wf.id)
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <Link to={`/flow/${wf.id}`}>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {wf.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Updated {new Date(wf.updated_at).toLocaleDateString()}
                  </p>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
