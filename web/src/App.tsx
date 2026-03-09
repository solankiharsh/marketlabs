import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import LoginPage from '@/pages/login/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import { lazy, Suspense } from 'react'

// Lazy-loaded pages
const AIAnalysisPage = lazy(() => import('@/pages/ai-analysis/AIAnalysisPage'))
const IndicatorAnalysisPage = lazy(() => import('@/pages/indicator-analysis/IndicatorAnalysisPage'))
const TradingAssistantPage = lazy(() => import('@/pages/trading-assistant/TradingAssistantPage'))
const PortfolioPage = lazy(() => import('@/pages/portfolio/PortfolioPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const BillingPage = lazy(() => import('@/pages/billing/BillingPage'))
const CommunityPage = lazy(() => import('@/pages/community/CommunityPage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))
const UserManagePage = lazy(() => import('@/pages/user-manage/UserManagePage'))
const FlowIndex = lazy(() => import('@/pages/flow/FlowIndex'))
const FlowEditor = lazy(() => import('@/pages/flow/FlowEditor'))
const ScannerIndex = lazy(() => import('@/pages/scanner/ScannerIndex'))
const ScannerDetail = lazy(() => import('@/pages/scanner/ScannerDetail'))
const ScannerCreate = lazy(() => import('@/pages/scanner/ScannerCreate'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ai-analysis" element={<LazyPage><AIAnalysisPage /></LazyPage>} />
            <Route path="/indicator-analysis" element={<LazyPage><IndicatorAnalysisPage /></LazyPage>} />
            <Route path="/indicator-community" element={<LazyPage><CommunityPage /></LazyPage>} />
            <Route path="/trading-assistant" element={<LazyPage><TradingAssistantPage /></LazyPage>} />
            <Route path="/portfolio" element={<LazyPage><PortfolioPage /></LazyPage>} />
            <Route path="/profile" element={<LazyPage><ProfilePage /></LazyPage>} />
            <Route path="/billing" element={<LazyPage><BillingPage /></LazyPage>} />

            {/* Flow Editor */}
            <Route path="/flow" element={<LazyPage><FlowIndex /></LazyPage>} />
            <Route path="/flow/:id" element={<LazyPage><FlowEditor /></LazyPage>} />

            {/* Scanner */}
            <Route path="/scanner" element={<LazyPage><ScannerIndex /></LazyPage>} />
            <Route path="/scanner/create" element={<LazyPage><ScannerCreate /></LazyPage>} />
            <Route path="/scanner/:id" element={<LazyPage><ScannerDetail /></LazyPage>} />

            {/* Admin */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute permission="admin">
                  <LazyPage><SettingsPage /></LazyPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-manage"
              element={
                <ProtectedRoute permission="admin">
                  <LazyPage><UserManagePage /></LazyPage>
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  )
}
