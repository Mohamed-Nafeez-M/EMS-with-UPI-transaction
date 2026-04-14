import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import {
  Users, Calendar, DollarSign, CheckCircle, TrendingUp,
  UserCheck, Edit2, Trash2, Search, ShieldCheck, GraduationCap,
} from 'lucide-react'

// ─── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const styles = {
    admin: { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' },
    student: { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
      ...(styles[role] || { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }),
    }}>
      {role === 'admin' ? <ShieldCheck size={11} /> : <GraduationCap size={11} />}
      {role}
    </span>
  )
}

// ─── Role Checkboxes for edit modal ───────────────────────────────────────────
const RoleCheckboxes = ({ value = [], onChange, disableSelf }) => {
  const toggle = (role) => {
    let next = value.includes(role) ? value.filter(r => r !== role) : [...value, role]
    // Always keep at least one role
    if (next.length === 0) return
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {['admin', 'student'].map(role => (
        <label
          key={role}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            cursor: disableSelf ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem', fontWeight: 500, color: '#374151',
            padding: '0.5rem 1rem',
            border: `2px solid ${value.includes(role) ? '#1e3a8a' : '#e2e8f0'}`,
            borderRadius: '8px',
            background: value.includes(role) ? '#eff6ff' : '#fafafa',
            transition: 'all 0.15s',
            opacity: disableSelf ? 0.6 : 1,
          }}
        >
          <input
            type="checkbox"
            checked={value.includes(role)}
            onChange={() => !disableSelf && toggle(role)}
            disabled={disableSelf}
            style={{ accentColor: '#1e3a8a', width: 14, height: 14 }}
          />
          {role === 'admin' ? <ShieldCheck size={14} color="#1e3a8a" /> : <GraduationCap size={14} color="#059669" />}
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </label>
      ))}
    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter state — frontend + backend search
  const [searchInput, setSearchInput] = useState('')   // what's typed
  const [userSearch, setUserSearch] = useState('')     // debounced, sent to API
  const [userRole, setUserRole] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userPagination, setUserPagination] = useState(null)

  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', roles: ['student'], department: '', student_id: '' })
  const [toast, setToast] = useState(null)

  // Debounce search: wait 300ms after user stops typing before hitting API
  useEffect(() => {
    const timer = setTimeout(() => {
      setUserSearch(searchInput)
      setUserPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/events/stats/overview')
      setStats(response.data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: userPage,
        limit: 10,
        search: userSearch,
        role: userRole,
      })
      const response = await axios.get(`/api/auth/users?${params}`)
      setUsers(response.data.users)
      setUserPagination(response.data.pagination)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }, [userPage, userSearch, userRole])

  useEffect(() => {
    loadStats()
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // When role filter changes, reset to page 1
  const handleRoleFilter = (role) => {
    setUserRole(role)
    setUserPage(1)
  }

  const handleEditUser = (u) => {
    setEditingUser(u)
    const roles = Array.isArray(u.roles) ? u.roles : [u.roles || 'student']
    setEditForm({ name: u.name, email: u.email, roles, department: u.department || '', student_id: u.student_id || '' })
  }

  const handleSaveUser = async () => {
    if (editForm.roles.length === 0) {
      showToast('User must have at least one role', 'error')
      return
    }
    try {
      await axios.put(`/api/auth/users/${editingUser.id}`, editForm)
      showToast('User updated successfully')
      setEditingUser(null)
      loadUsers()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update user', 'error')
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return
    try {
      await axios.delete(`/api/auth/users/${userId}`)
      showToast('User deleted successfully')
      loadUsers()
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error')
    }
  }

  const statCards = stats ? [
    { icon: Calendar, title: 'Total Events', value: stats.events.total_events, color: 'var(--primary)', bg: 'var(--primary-bg)' },
    { icon: Users, title: 'Total Registrations', value: stats.registrations.total_registrations, color: '#059669', bg: '#d1fae5' },
    { icon: DollarSign, title: 'Total Revenue', value: `₹${stats.registrations.total_revenue || 0}`, color: '#d97706', bg: '#fef3c7' },
    { icon: CheckCircle, title: 'Paid Registrations', value: stats.registrations.paid_registrations, color: '#7c3aed', bg: '#ede9fe' },
    { icon: UserCheck, title: 'Checked In', value: stats.registrations.checked_in_registrations, color: '#0369a1', bg: '#dbeafe' },
    { icon: TrendingUp, title: 'Avg Event Price', value: `₹${Math.round(stats.events.avg_price || 0)}`, color: '#be185d', bg: '#fce7f3' },
  ] : []

  if (loading) {
    return <div className="loading"><span className="spinner" />Loading dashboard...</div>
  }

  return (
    <div className="animate-in">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage users, events, and system statistics</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          {statCards.map(({ icon: Icon, title, value, color, bg }) => (
            <div key={title} className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: bg }}>
                <Icon size={22} color={color} />
              </div>
              <div className="stat-content">
                <h3>{value}</h3>
                <p>{title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Management Section */}
      <div className="section">
        <div className="section-header">
          <h2>User Management</h2>
          <p>Manage system users and their roles</p>
        </div>

        {/* ── Filters ── */}
        <div className="filters">
          {/* Search: real-time, debounced 300ms */}
          <div className="search-input">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by name, email or student ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Role filter */}
          <select
            value={userRole}
            onChange={(e) => handleRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Department</th>
                <th>Student ID</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No users found
                  </td>
                </tr>
              ) : users.map(u => {
                const roles = Array.isArray(u.roles) ? u.roles : [u.roles || 'student']
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{u.email}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {roles.map(r => <RoleBadge key={r} role={r} />)}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{u.department || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.student_id || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => handleEditUser(u)} title="Edit user">
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          title="Delete user"
                          disabled={u.id === user?.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {userPagination && userPagination.pages > 1 && (
          <div className="pagination">
            <button
              className="btn-secondary"
              onClick={() => setUserPage(p => Math.max(1, p - 1))}
              disabled={userPage === 1}
            >
              Previous
            </button>
            <span>Page {userPage} of {userPagination.pages}</span>
            <button
              className="btn-secondary"
              onClick={() => setUserPage(p => Math.min(userPagination.pages, p + 1))}
              disabled={userPage === userPagination.pages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User</h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveUser() }}>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
                </div>

                {/* Multi-role checkboxes */}
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Roles
                    {editingUser.id === user?.id && (
                      <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(cannot change your own roles)</span>
                    )}
                  </label>
                  <RoleCheckboxes
                    value={editForm.roles}
                    onChange={(roles) => setEditForm({ ...editForm, roles })}
                    disableSelf={editingUser.id === user?.id}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
                    Select one or both roles. Users with both roles will be prompted to choose on login.
                  </p>
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input type="text" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Student ID</label>
                  <input type="text" value={editForm.student_id} onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard