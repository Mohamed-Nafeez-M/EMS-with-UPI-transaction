import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
});
const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('ems_token'))
  const [selectedRole, setSelectedRole] = useState(localStorage.getItem('ems_selected_role'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const stored = localStorage.getItem('ems_user')
      if (stored) {
        try {
          const u = JSON.parse(stored)
          // Ensure roles is always an array
          u.roles = Array.isArray(u.roles) ? u.roles : [u.roles || 'student']
          setUser(u)
        } catch {}
      }
    }
    setLoading(false)
  }, [])

  // Persist token + headers
  const _applyToken = (t) => {
    setToken(t)
    localStorage.setItem('ems_token', t)
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`
  }

  // Persist user
  const _applyUser = (u) => {
    u.roles = Array.isArray(u.roles) ? u.roles : [u.roles || 'student']
    setUser(u)
    localStorage.setItem('ems_user', JSON.stringify(u))
  }

  /**
   * login — returns { requireRoleSelection, availableRoles }
   * Caller (Login page) should show role picker modal when requireRoleSelection is true.
   */
  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password })
    const { token: t, user: u, requireRoleSelection, availableRoles } = res.data

    _applyToken(t)
    _applyUser(u)

    return { user: u, requireRoleSelection, availableRoles }
  }

  /**
   * selectRole — called after login when user has multiple roles.
   * Gets a fresh token with selectedRole embedded.
   */
  const selectRole = async (role) => {
    const res = await axios.post('/api/auth/select-role', { selectedRole: role })
    const { token: t, user: u } = res.data

    _applyToken(t)
    _applyUser(u)
    setSelectedRole(role)
    localStorage.setItem('ems_selected_role', role)

    return role
  }

  const register = async (data) => {
    const res = await axios.post('/api/auth/register', data)
    const { token: t, user: u } = res.data
    _applyToken(t)
    _applyUser(u)
    setSelectedRole('student')
    localStorage.setItem('ems_selected_role', 'student')
    return u
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setSelectedRole(null)
    localStorage.removeItem('ems_token')
    localStorage.removeItem('ems_user')
    localStorage.removeItem('ems_selected_role')
    delete axios.defaults.headers.common['Authorization']
  }

  // Helper: does current user have a specific role?
  const hasRole = (role) => {
    if (!user) return false
    const roles = Array.isArray(user.roles) ? user.roles : [user.roles]
    return roles.includes(role)
  }

  // The role active in this session
  const activeRole = selectedRole || (user?.roles?.[0] ?? 'student')

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      selectedRole: activeRole,
      login, selectRole, register, logout, hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
