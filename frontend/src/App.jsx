import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth }    from './store/AuthContext'
import { ThemeProvider }            from './store/ThemeContext'
import DashboardLayout              from './components/layout/DashboardLayout'
import { LoginPage, RegisterPage }  from './components/auth/AuthPages'
import OverviewPage                 from './pages/OverviewPage'
import SalesPage                    from './pages/SalesPage'
import { ProductsPage, CustomersPage, ProfitPage, RegionsPage, ForecastPage } from './pages/AnalyticsPages'
import UploadPage                   from './pages/UploadPage'
import ReportsPage                  from './pages/ReportsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index        element={<OverviewPage />} />
        <Route path="sales"     element={<SalesPage />} />
        <Route path="products"  element={<ProductsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="profit"    element={<ProfitPage />} />
        <Route path="regions"   element={<RegionsPage />} />
        <Route path="forecast"  element={<ForecastPage />} />
        <Route path="upload"    element={<UploadPage />} />
        <Route path="reports"   element={<ReportsPage />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
