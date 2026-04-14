// frontend/src/pages/AdminPayments.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import { CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from 'lucide-react'

const fmt = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const STATUS_META = {
  pending:  { label: 'Pending',  color: '#92400e', bg: '#fef3c7', icon: Clock },
  approved: { label: 'Approved', color: '#065f46', bg: '#d1fae5', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#991b1b', bg: '#fee2e2', icon: XCircle },
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending
  const Icon = m.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600,
      color: m.color, background: m.bg,
    }}>
      <Icon size={12} />
      {m.label}
    </span>
  )
}

export default function AdminPayments() {
  const [payments,    setPayments]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [actionId,    setActionId]    = useState(null)   // id currently being approved/rejected
  const [toast,       setToast]       = useState(null)   // { msg, type }
  const [filter,      setFilter]      = useState('all')  // 'all' | 'pending' | 'approved' | 'rejected'

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/payments')
      setPayments(res.data.payments || [])
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load payments.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (id, status) => {
    setActionId(id)
    try {
      const res = await axios.patch(`/api/payments/${id}/status`, { status })
      const updated = res.data.payment
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: updated.status } : p))
      showToast(`Payment #${id} ${status}.`, 'success')
    } catch (err) {
      showToast(err.response?.data?.error || 'Action failed.', 'error')
    } finally {
      setActionId(null)
    }
  }

  const visible = filter === 'all' ? payments : payments.filter(p => p.status === filter)

  const counts = payments.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 20px', borderRadius: 'var(--radius)',
          background: toast.type === 'error' ? '#991b1b' : '#166534',
          color: '#fff', fontSize: 14, fontWeight: 500,
          zIndex: 9999, boxShadow: 'var(--shadow-lg)',
          whiteSpace: 'nowrap', animation: 'fadeIn .2s ease',
        }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Payments
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Review and verify student payment submissions
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', background: 'var(--bg-white)',
            fontSize: 13, fontWeight: 500, color: 'var(--text-muted)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { key: 'pending',  label: 'Pending',  color: '#92400e', bg: '#fef3c7' },
          { key: 'approved', label: 'Approved', color: '#065f46', bg: '#d1fae5' },
          { key: 'rejected', label: 'Rejected', color: '#991b1b', bg: '#fee2e2' },
        ].map(({ key, label, color, bg }) => (
          <div key={key} style={{
            background: 'var(--bg-white)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 6px' }}>
              {label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {counts[key] || 0}
            </p>
            <div style={{ marginTop: 6, height: 3, borderRadius: 9999, background: bg, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 9999, background: color,
                width: payments.length ? `${((counts[key] || 0) / payments.length) * 100}%` : '0%',
                transition: 'width .4s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: filter === f ? 'var(--primary)' : 'var(--border)',
              background: filter === f ? 'var(--primary-bg)' : 'var(--bg-white)',
              color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: filter === f ? 600 : 400, cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && counts[f] ? ` (${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-white)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Loading payments…</p>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock size={32} style={{ opacity: .3, marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No {filter !== 'all' ? filter : ''} payments found.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['ID', 'User', 'Event ID', 'UTR', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '11px 16px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '.05em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: i < visible.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* ID */}
                  <td style={{ padding: '13px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    #{p.id}
                  </td>

                  {/* User */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {p.user_name || `User #${p.user_id}`}
                    </div>
                    {p.user_email && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.user_email}
                      </div>
                    )}
                  </td>

                  {/* Event ID */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {p.event_title || `Event #${p.event_id}`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      ID: {p.event_id}
                    </div>
                  </td>

                  {/* UTR */}
                  <td style={{ padding: '13px 16px' }}>
                    <code style={{
                      fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                      letterSpacing: '1.5px', color: 'var(--primary)',
                      background: 'var(--primary-bg)',
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      {p.utr}
                    </code>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '13px 16px' }}>
                    <StatusBadge status={p.status} />
                  </td>

                  {/* Date */}
                  <td style={{ padding: '13px 16px', color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {fmt(p.created_at)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '13px 16px' }}>
                    {p.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => updateStatus(p.id, 'approved')}
                          disabled={actionId === p.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 'var(--radius)',
                            border: '1px solid #a7f3d0',
                            background: actionId === p.id ? '#f0fdf4' : '#d1fae5',
                            color: '#065f46', fontSize: 12, fontWeight: 600,
                            cursor: actionId === p.id ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition)',
                            opacity: actionId === p.id ? .6 : 1,
                          }}
                          onMouseEnter={e => { if (actionId !== p.id) e.currentTarget.style.background = '#a7f3d0' }}
                          onMouseLeave={e => e.currentTarget.style.background = actionId === p.id ? '#f0fdf4' : '#d1fae5'}
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                        <button
                          onClick={() => updateStatus(p.id, 'rejected')}
                          disabled={actionId === p.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', borderRadius: 'var(--radius)',
                            border: '1px solid #fca5a5',
                            background: actionId === p.id ? '#fff5f5' : '#fee2e2',
                            color: '#991b1b', fontSize: 12, fontWeight: 600,
                            cursor: actionId === p.id ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition)',
                            opacity: actionId === p.id ? .6 : 1,
                          }}
                          onMouseEnter={e => { if (actionId !== p.id) e.currentTarget.style.background = '#fca5a5' }}
                          onMouseLeave={e => e.currentTarget.style.background = actionId === p.id ? '#fff5f5' : '#fee2e2'}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-light)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
                             to   { opacity: 1; transform: translateX(-50%) translateY(0); } }
      `}</style>
    </div>
  )
}
