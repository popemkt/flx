import { QueryClientProvider } from '@tanstack/react-query'
import { ReactFlowProvider } from '@xyflow/react'
import { queryClient } from '@/lib/query-client'
import { AppShell } from '@/components/layout/app-shell'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <AppShell />
      </ReactFlowProvider>
    </QueryClientProvider>
  )
}
