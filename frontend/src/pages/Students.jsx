import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Users, Search, Filter } from 'lucide-react'

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const ROLE_OPTIONS = [
  { value: 'student', label: 'Students' },
  { value: 'admin', label: 'Admins' },
  { value: 'all', label: 'All Users' },
]

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('student')

  // Fetch from backend whenever filter changes (search is client-side for speed)
  const fetchStudents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { role: roleFilter }
      const res = await axios.get('/api/students', { params })
      setStudents(res.data)
    } catch (err) {
      console.error('Failed to load users:', err)
      setError(err.response?.data?.error || 'Failed to load users. Are you logged in as Admin?')
    } finally {
      setLoading(false)
    }
  }, [roleFilter])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Client-side search filter on top of fetched data
  const filtered = students.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q) ||
      (s.student_id || '').toLowerCase().includes(q)
    )
  })

  const roleLabel = ROLE_OPTIONS.find((r) => r.value === roleFilter)?.label || 'Users'

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--navy-dark)' }}>
            {roleFilter === 'all' ? 'All Users' : roleFilter === 'admin' ? 'Admins' : 'Students'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {roleFilter === 'all' ? 'All registered accounts' : `Registered ${roleLabel.toLowerCase()}`}
          </p>
        </div>
        <div style={{
          background: 'var(--navy)', color: 'white', padding: '0.6rem 1.1rem',
          borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.875rem', fontWeight: 600,
        }}>
          <Users size={16} /> {filtered.length} {roleLabel}
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: 220, maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by name, email, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role filter pills */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setRoleFilter(opt.value); setSearch('') }}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.8rem',
                fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                transition: 'all 0.15s',
                borderColor: roleFilter === opt.value ? 'var(--navy)' : 'var(--border)',
                background: roleFilter === opt.value ? 'var(--navy)' : 'white',
                color: roleFilter === opt.value ? 'white' : 'var(--text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          borderRadius: '10px', padding: '0.9rem 1.1rem', marginBottom: '1.25rem',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading {roleLabel.toLowerCase()}...
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Student ID</th>
                <th>Department</th>
                <th>Roles</th>
                <th>Registrations</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem' }}>
                    {search ? `No results for "${search}"` : `No ${roleLabel.toLowerCase()} found.`}
                  </td>
                </tr>
              ) : filtered.map((s) => {
                const roles = Array.isArray(s.roles) ? s.roles : [s.roles || 'student']
                return (
                  <tr key={s.id}>
                    {/* Name + Email */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: roles.includes('admin') ? 'linear-gradient(135deg,#1e3a8a,#3b5bdb)' : 'var(--navy)',
                          color: 'white', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {s.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {s.student_id || '—'}
                    </td>

                    {/* Department */}
                    <td>{s.department || '—'}</td>

                    {/* Roles badges */}
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {roles.map((r) => (
                          <span key={r} style={{
                            padding: '0.15rem 0.55rem', borderRadius: '20px', fontSize: '0.75rem',
                            fontWeight: 600,
                            background: r === 'admin' ? '#dbeafe' : '#d1fae5',
                            color: r === 'admin' ? '#1e40af' : '#065f46',
                          }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Registration count */}
                    <td>
                      <span style={{
                        background: '#e0e9ff', color: 'var(--navy)', padding: '0.2rem 0.6rem',
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                      }}>
                        {s.registration_count}
                      </span>
                    </td>

                    {/* Joined */}
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}