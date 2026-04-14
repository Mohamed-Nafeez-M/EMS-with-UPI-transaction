// frontend/src/pages/Events.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'                          // ← ADDED
import { useAuth } from '../context/AuthContext'
import { Calendar, MapPin, Users, Plus, Edit2, Trash2, X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

const categoryBadgeClass = (cat) => {
  const map = { Lecture: 'badge-lecture', Workshop: 'badge-workshop', Cultural: 'badge-cultural', Competition: 'badge-competition', Sports: 'badge-sports', Seminar: 'badge-seminar' }
  return map[cat] || 'badge-upcoming'
}

const CATEGORIES = ['Lecture', 'Workshop', 'Cultural', 'Competition', 'Sports', 'Seminar', 'Other']

const emptyForm = { title: '', description: '', date: '', venue: '', category: '', capacity: 100, organizer: '', status: 'upcoming', price: 0 }

const TOAST_BG = {
  success: '#166534',
  error:   '#991b1b',
  info:    '#1e40af',
}

export default function Events() {
  const { user, selectedRole } = useAuth()
  const isAdmin = selectedRole === 'admin'
  const navigate = useNavigate()                                         // ← ADDED

  const [events, setEvents] = useState([])
  const [myRegIds, setMyRegIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  // REMOVED: const [razorpayKey, setRazorpayKey] = useState('')
  // REMOVED: const [processingPayment, setProcessingPayment] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = async () => {
    try {
      const [evRes, regRes] = await Promise.all([
        axios.get('/api/events'),
        axios.get('/api/registrations/my'),
        // REMOVED: axios.get('/api/config/razorpay-key') — Razorpay key no longer needed
      ])
      setEvents(evRes.data.events || evRes.data)
      const registrations = regRes.data.registrations || regRes.data
      setMyRegIds(new Set(registrations.map(r => r.event_id)))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditEvent(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (ev) => {
    setEditEvent(ev)
    setForm({
      title: ev.title, description: ev.description || '', venue: ev.venue,
      date: ev.date?.slice(0, 16), category: ev.category || '', capacity: ev.capacity,
      organizer: ev.organizer || '', status: ev.status, price: ev.price || 0
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        capacity: Number(form.capacity) || 100,
        date: form.date ? new Date(form.date).toISOString() : form.date
      }
      if (editEvent) {
        await axios.put(`/api/events/${editEvent.id}`, payload)
        showToast('Event updated!')
      } else {
        await axios.post('/api/events', payload)
        showToast('Event created!')
      }
      setShowModal(false)
      load()
    } catch (err) {
      showToast(err.response?.data?.error || 'Error saving event', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this event?")) return
    try {
      await axios.delete(`/api/events/${id}`)
      showToast("Event deleted")
      load()
    } catch (err) {
      const msg = err.response?.data?.error || "Error deleting event"
      if (err.response?.status === 400) {
        const doCancel = confirm(`${msg}\n\nWould you like to cancel the event instead?`)
        if (doCancel) {
          try {
            const event = events.find(e => e.id === id)
            const payload = { title: event.title, description: event.description, date: new Date(event.date).toISOString(), venue: event.venue, category: event.category, capacity: event.capacity, organizer: event.organizer, price: event.price, status: "cancelled" }
            await axios.put(`/api/events/${id}`, payload)
            showToast("Event has been cancelled")
            load()
          } catch (cancelErr) {
            showToast(cancelErr.response?.data?.error || "Error cancelling event", "error")
          }
        }
      } else {
        showToast(msg, "error")
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // handleRegister — MODIFIED
  //
  // REMOVED: All Razorpay logic (create-order, Razorpay SDK, verify-payment,
  //          handle-payment-failure, razorpayKey check, processingPayment state)
  //
  // ADDED:   For paid events → navigate to /payment/:eventId
  //          For free events → direct registration (unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  const handleRegister = async (eventId) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    if (parseInt(event.price) > 0) {
      // ── Paid event: redirect to manual payment page ──────────────────────
      navigate(`/payment/${eventId}`)
    } else {
      // ── Free event: register directly (unchanged) ────────────────────────
      try {
        await axios.post('/api/registrations', { event_id: eventId })
        setMyRegIds(p => new Set([...p, eventId]))
        showToast('Registered successfully!')
      } catch (err) {
        showToast(err.response?.data?.error || 'Registration failed', 'error')
      }
    }
  }

  const handleCancel = async (eventId) => {
    try {
      await axios.delete(`/api/registrations/${eventId}`)
      setMyRegIds(p => { const n = new Set(p); n.delete(eventId); return n })
      showToast('Registration cancelled')
    } catch { showToast('Error cancelling', 'error') }
  }

  const filtered = events.filter(ev => {
    const matchCat = filter === 'all' || ev.category === filter
    const matchSearch = ev.title.toLowerCase().includes(search.toLowerCase()) || ev.venue?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const ToastIcon = toast?.type === 'success' ? CheckCircle : toast?.type === 'info' ? Info : AlertCircle

  return (
    <div className="animate-in">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: TOAST_BG[toast.type] || TOAST_BG.error,
          color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', fontSize: '0.875rem', fontWeight: 500
        }}>
          <ToastIcon size={16} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--navy-dark)' }}>Events</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.2rem' }}>Browse and manage campus events</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> Create Event
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ maxWidth: 240 }}
          placeholder="Search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              padding: '0.4rem 0.9rem', borderRadius: '20px', border: '1.5px solid',
              fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              borderColor: filter === cat ? 'var(--navy)' : 'var(--border)',
              background:  filter === cat ? 'var(--navy)' : 'white',
              color:       filter === cat ? 'white' : 'var(--text-muted)'
            }}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading events...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No events found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filtered.map(ev => {
            const isRegistered = myRegIds.has(ev.id)
            const isFull = parseInt(ev.registration_count) >= parseInt(ev.capacity)
            const isPast = new Date(ev.date) < new Date()
            return (
              <div key={ev.id} className="event-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span className={`badge ${categoryBadgeClass(ev.category)}`}>{ev.category || 'Event'}</span>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button onClick={() => openEdit(ev)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.5rem', lineHeight: 1.4 }}>{ev.title}</h3>
                {ev.description && (
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '0.875rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ev.description}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <Calendar size={13} /> {formatDate(ev.date)} · {formatTime(ev.date)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} /> {ev.venue}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    <Users size={13} /> {ev.registration_count} / {ev.capacity} registered
                  </span>
                  {parseInt(ev.price) > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: '#059669', fontWeight: 500 }}>
                      ₹{ev.price}
                    </span>
                  )}
                </div>
                {/* Capacity bar */}
                <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '4px', marginBottom: '1rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: isFull ? '#ef4444' : 'var(--navy)', width: `${Math.min(100, (ev.registration_count / ev.capacity) * 100)}%`, borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                {!isAdmin && !isPast && (
                  isRegistered ? (
                    <button className="btn-outline" onClick={() => handleCancel(ev.id)} style={{ marginTop: 'auto', borderColor: '#ef4444', color: '#ef4444' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444' }}>
                      ✓ Registered · Cancel
                    </button>
                  ) : (
                    <button
                      className="btn-primary"
                      onClick={() => handleRegister(ev.id)}
                      disabled={isFull}
                      style={{
                        marginTop: 'auto',
                        background: isFull ? '#9ca3af' : 'var(--navy)',
                        cursor: isFull ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {/* REMOVED: processingPayment state — button no longer shows "Processing..." */}
                      {isFull ? 'Full' : parseInt(ev.price) > 0 ? `Pay ₹${ev.price}` : 'Register'}
                    </button>
                  )
                )}
                {isPast && <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 'auto' }}>Event completed</p>}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal (unchanged) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 600 }}>{editEvent ? 'Edit Event' : 'Create Event'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Date & Time *</label>
                  <input type="datetime-local" className="form-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Select</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Venue *</label>
                <input className="form-input" value={form.venue} onChange={e => setForm(p => ({ ...p, venue: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Capacity</label>
                  <input type="number" className="form-input" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} min={1} />
                </div>
                <div>
                  <label className="form-label">Price (₹)</label>
                  <input type="number" className="form-input" value={form.price || 0} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} min={0} />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Organizer</label>
                <input className="form-input" value={form.organizer} onChange={e => setForm(p => ({ ...p, organizer: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editEvent ? 'Update Event' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}