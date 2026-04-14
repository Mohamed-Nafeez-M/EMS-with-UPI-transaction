import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Events from './pages/Events'
import Students from './pages/Students'
import Registrations from './pages/Registrations'
import VerifyTicket from './pages/VerifyTicket'
import AdminDashboard from './pages/AdminDashboard'
import PaymentPage from './pages/PaymentPage'
import AdminPayments from './pages/AdminPayments'

/**
 * ProtectedRoute
 * - adminOnly: user must have 'admin' in their roles array
 *   AND their selectedRole for this session must be 'admin'
 */
const ProtectedRoute = ({ children, adminOnly }) => {
  const { user, selectedRole, loading, hasRole } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        Loading...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (adminOnly) {
    // Must have admin role and have selected admin for this session
    if (!hasRole('admin') || selectedRole !== 'admin') {
      return <Navigate to="/dashboard" replace />
    }
  }

  return children
}

const AppRoutes = () => {
  const { user, selectedRole } = useAuth()

  // Redirect logged-in users to the right home based on their active role
  const homeRoute = user
    ? (selectedRole === 'admin' ? '/admin' : '/dashboard')
    : '/login'

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeRoute} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={homeRoute} replace /> : <Register />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to={homeRoute} replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
        <Route path="events" element={<Events />} />
        <Route path="students" element={<ProtectedRoute adminOnly><Students /></ProtectedRoute>} />
        <Route path="registrations" element={<Registrations />} />
        <Route path="verify-ticket" element={<ProtectedRoute adminOnly><VerifyTicket /></ProtectedRoute>} />
        <Route path="payment/:eventId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="admin/payments" element={<ProtectedRoute adminOnly><AdminPayments /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={homeRoute} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}