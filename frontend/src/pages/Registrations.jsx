import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Calendar, MapPin, Ticket, X, CheckCircle } from 'lucide-react'

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

const categoryBadgeClass = (cat) => {
  const map = { Lecture: 'badge-lecture', Workshop: 'badge-workshop', Cultural: 'badge-cultural', Competition: 'badge-competition', Sports: 'badge-sports', Seminar: 'badge-seminar' }
  return map[cat] || 'badge-upcoming'
}

export default function Registrations() {
  const { user, selectedRole } = useAuth()
  const isAdmin = selectedRole === 'admin'
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    try {
      const res = await axios.get(isAdmin ? '/api/registrations' : '/api/registrations/my')
      setData(res.data.registrations || res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCancel = async (eventId) => {
    if (!confirm('Cancel this registration?')) return
    try {
      await axios.delete(`/api/registrations/${eventId}`)
      showToast('Registration cancelled')
      load()
    } catch { showToast('Error cancelling', 'error') }
  }

  const filtered = data.filter(r => {
    const text = isAdmin
      ? `${r.student_name} ${r.student_email} ${r.event_title} ${r.department}`.toLowerCase()
      : `${r.title} ${r.venue}`.toLowerCase()
    return text.includes(search.toLowerCase())
  })

  return (
    <div className="animate-in">
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: toast.type === 'success' ? '#166534' : '#991b1b',
          color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '0.875rem', fontWeight: 500
        }}>
          <CheckCircle size={16} />{toast.msg}
        </div>
      )}

      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--navy-dark)' }}>
          {isAdmin ? 'All Registrations' : 'My Registrations'}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          {isAdmin ? 'View all student event registrations' : 'Events you have registered for'}
        </p>
      </div>

      <div style={{ maxWidth: 360, marginBottom: '1.5rem' }}>
        <input
          className="form-input"
          placeholder={isAdmin ? 'Search by student or event...' : 'Search events...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Ticket size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>No registrations found</p>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{isAdmin ? 'No registrations yet.' : 'You haven\'t registered for any events yet.'}</p>
        </div>
      ) : isAdmin ? (
        // Admin table view
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department</th>
                <th>Event</th>
                <th>Event Date</th>
                <th>Registered On</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.student_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.student_email}</div>
                    {r.student_id && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.student_id}</div>}
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{r.department || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', maxWidth: 200 }}>{r.event_title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                      <MapPin size={11} />{r.event_venue}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {formatDate(r.event_date)}<br />
                    <span style={{ fontSize: '0.78rem' }}>{formatTime(r.event_date)}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDate(r.registered_at)}</td>
                  <td>
                    <span style={{
                      background: r.status === 'confirmed' ? '#d1fae5' : '#fef2f2',
                      color: r.status === 'confirmed' ? '#065f46' : '#991b1b',
                      padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600
                    }}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Student card view
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(r => (
            <div key={r.id} className="stat-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className={`badge ${categoryBadgeClass(r.category)}`}>{r.category || 'Event'}</span>
                <button onClick={() => handleCancel(r.event_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '2px' }}
                  title="Cancel registration"
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}>
                  <X size={16} />
                </button>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.75rem', lineHeight: 1.4 }}>{r.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  <Calendar size={13} /> {formatDate(r.date)} · {formatTime(r.date)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  <MapPin size={13} /> {r.venue}
                </span>
              </div>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={14} color="#10b981" />
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>Confirmed</span>
                <span style={{ fontSize: '0.78rem', color: '#9ca3af', marginLeft: 'auto' }}>Registered {formatDate(r.registered_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}