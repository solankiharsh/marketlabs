import { create } from 'zustand'

interface FlowWorkflowState {
  selectedNodeId: string | null
  showExecutionLogs: boolean
  setSelectedNodeId: (id: string | null) => void
  setShowExecutionLogs: (show: boolean) => void
}

export const useFlowWorkflowStore = create<FlowWorkflowState>((set) => ({
  selectedNodeId: null,
  showExecutionLogs: false,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setShowExecutionLogs: (show) => set({ showExecutionLogs: show }),
}))
