import { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Search, CheckCircle, XCircle, User, Mail,
         Calendar, MapPin, CreditCard, LogIn } from 'lucide-react';

// Simple inline toast
function Toast({ msg, type }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
      background: isSuccess ? '#065f46' : '#7f1d1d',
      color: 'white', padding: '0.85rem 1.25rem', borderRadius: '10px',
      fontSize: '0.875rem', fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      {isSuccess ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {msg}
    </div>
  );
}

const VerifyTicket = () => {
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3500);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setCheckedIn(false);
    try {
      const response = await axios.get(`/api/registrations/verify/${ticketId.trim()}`);
      setResult(response.data);
      // Reflect already-checked-in state from DB
      if (response.data?.ticket?.status === 'checked_in') {
        setCheckedIn(true);
      }
    } catch (err) {
      setError('Failed to verify ticket. Please try again.');
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    try {
      await axios.post('/api/registrations/check-in', { ticketId: result.ticket.ticketId });
      setCheckedIn(true);
      setResult(prev => ({
        ...prev,
        ticket: { ...prev.ticket, status: 'checked_in' }
      }));
      showToast('Student successfully checked in!', 'success');
    } catch (err) {
      const data = err.response?.data || {};
      const msg = data.detail
        ? `Check-in failed: ${data.detail}`
        : data.error || 'Check-in failed';
      if (data.alreadyCheckedIn) {
        setCheckedIn(true);
        showToast('Already checked in.', 'error');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  const alreadyCheckedIn = checkedIn || result?.ticket?.status === 'checked_in';

  return (
    <div className="animate-in">
      <Toast msg={toast.msg} type={toast.type} />

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--navy-dark)', letterSpacing: '-0.03em' }}>
          Verify Ticket
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>
          Validate student event tickets by entering the ticket ID
        </p>
      </div>

      <div style={{ maxWidth: 520 }}>
        <div className="stat-card" style={{ padding: '2rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '12px',
              background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={22} color="var(--primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy-dark)' }}>Ticket Verification</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter a ticket ID to verify its validity</p>
            </div>
          </div>

          {/* Search form */}
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Ticket ID</label>
              <input
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder="Enter ticket ID..."
                className="form-input"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '0.95rem' }}
            >
              {loading
                ? <><span className="spinner" style={{ width: 17, height: 17, borderWidth: 2 }} /> Verifying...</>
                : <><Search size={16} /> Verify Ticket</>}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="alert-error" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
              <XCircle size={16} />{error}
            </div>
          )}

          {/* Result card */}
          {result && (
            <div style={{
              marginTop: '1.5rem', borderRadius: '12px', overflow: 'hidden',
              border: `1.5px solid ${result.valid ? (alreadyCheckedIn ? '#93c5fd' : '#6ee7b7') : '#fca5a5'}`,
              background: result.valid ? (alreadyCheckedIn ? '#eff6ff' : '#f0fdf4') : '#fef2f2'
            }}>
              {/* Status banner */}
              <div style={{
                padding: '0.875rem 1.25rem',
                background: !result.valid
                  ? 'linear-gradient(135deg, #7f1d1d, #dc2626)'
                  : alreadyCheckedIn
                    ? 'linear-gradient(135deg, #0369a1, #0ea5e9)'
                    : 'linear-gradient(135deg, #065f46, #059669)',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}>
                {!result.valid
                  ? <><XCircle size={18} color="white" /><span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Invalid or Expired Ticket</span></>
                  : alreadyCheckedIn
                    ? <><CheckCircle size={18} color="white" /><span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Already Checked In</span></>
                    : <><CheckCircle size={18} color="white" /><span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Valid Ticket</span></>
                }
              </div>

              {/* Ticket details */}
              {result.valid && result.ticket && (
                <div style={{ padding: '1.25rem' }}>
                  {[
                    { icon: User,     label: 'Name',       value: result.ticket.userName },
                    { icon: Mail,     label: 'Email',      value: result.ticket.userEmail },
                    { icon: Calendar, label: 'Event',      value: result.ticket.eventName },
                    { icon: Calendar, label: 'Date',       value: new Date(result.ticket.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    { icon: MapPin,   label: 'Venue',      value: result.ticket.eventVenue },
                    { icon: User,     label: 'Department', value: result.ticket.department || 'N/A' },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                        <Icon size={14} color="var(--text-muted)" />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>{label}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{value}</span>
                    </div>
                  ))}

                  {/* Payment status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.08)', marginBottom: '1rem' }}>
                    <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                      <CreditCard size={14} color="var(--text-muted)" />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 80, flexShrink: 0 }}>Payment</span>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 700,
                      color: result.ticket.paymentStatus === 'paid' ? '#059669' : '#d97706',
                      background: result.ticket.paymentStatus === 'paid' ? '#d1fae5' : '#fef3c7',
                      padding: '2px 8px', borderRadius: '20px'
                    }}>
                      {result.ticket.paymentStatus}
                    </span>
                  </div>

                  {/* Check In button / Already Checked In badge */}
                  {alreadyCheckedIn ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      padding: '0.75rem', borderRadius: '10px',
                      background: '#dbeafe', color: '#0369a1',
                      fontSize: '0.875rem', fontWeight: 700,
                    }}>
                      <CheckCircle size={16} /> Already Checked In
                    </div>
                  ) : (
                    <button
                      onClick={handleCheckIn}
                      disabled={checkInLoading}
                      style={{
                        width: '100%', padding: '0.8rem', borderRadius: '10px',
                        border: 'none', cursor: checkInLoading ? 'not-allowed' : 'pointer',
                        background: 'linear-gradient(135deg, #1e3a8a, #3b5bdb)',
                        color: 'white', fontSize: '0.925rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        opacity: checkInLoading ? 0.7 : 1,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      {checkInLoading
                        ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Checking In...</>
                        : <><LogIn size={16} /> Check In Student</>
                      }
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyTicket;