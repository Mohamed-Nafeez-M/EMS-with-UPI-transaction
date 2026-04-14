// frontend/src/pages/PaymentPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, AlertCircle, ArrowLeft, Loader } from 'lucide-react'

// ── Your UPI ID and display name — change these two values ──────────────────
const UPI_ID   = 'nafeezm155@oksbi'       // ← replace with your real UPI ID
const UPI_NAME = 'MOHAMED NAFEEZ M'         // ← replace with your name / college name
// ────────────────────────────────────────────────────────────────────────────

// Builds a UPI deep-link QR URL that pre-fills amount when scanned
// upi://pay?pa=<id>&pn=<name>&am=<amount>&cu=INR
const buildQrUrl = (amount) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=` +
  encodeURIComponent(
    `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR`
  )

export default function PaymentPage() {
  const { eventId }   = useParams()
  const { user }      = useAuth()
  const navigate      = useNavigate()

  const [event,       setEvent]       = useState(null)
  const [utr,         setUtr]         = useState('')
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [toast,       setToast]       = useState(null)
  const [success,     setSuccess]     = useState(false)

  // ── Load event details ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await axios.get(`/api/events/${eventId}`)
        setEvent(res.data)
      } catch {
        showToast('Could not load event details.', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const trimmed = utr.trim()
    if (!/^\d{12}$/.test(trimmed)) {
      showToast('UTR must be exactly 12 digits.', 'error')
      return
    }

    setSubmitting(true)
    try {
      await axios.post('/api/payments/submit-payment', {
        userId:  user.id,
        eventId: Number(eventId),
        utr:     trimmed,
      })
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed. Please try again.'
      showToast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="payment-page">
        <div className="payment-card success-card">
          <div className="success-icon-wrap">
            <CheckCircle size={48} strokeWidth={1.5} />
          </div>
          <h2>Payment Submitted!</h2>
          <p className="success-sub">
            Your UTR has been received. Our team will verify your payment and
            confirm your registration shortly. Check your email for updates.
          </p>
          <div className="success-utr-box">
            <span className="success-utr-label">UTR Submitted</span>
            <span className="success-utr-value">{utr}</span>
          </div>
          <button className="btn-primary full-w" onClick={() => navigate('/events')}>
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="payment-page center">
        <Loader size={32} className="spin" />
      </div>
    )
  }

  // ── Dynamic QR: built from event.price once event is loaded ───────────────
  const eventPrice = Number(event?.price) || 0
  const qrUrl      = buildQrUrl(eventPrice)   // ← amount baked into QR

  // ── Main payment page ─────────────────────────────────────────────────────
  return (
    <div className="payment-page">

      {/* Toast */}
      {toast && (
        <div className={`pay-toast pay-toast--${toast.type}`}>
          {toast.type === 'error'
            ? <AlertCircle size={16} />
            : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="payment-card">

        {/* Back link */}
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="pay-header">
          <span className="pay-badge">Secure Payment</span>
          <h1 className="pay-title">{event?.title ?? 'Event Payment'}</h1>
          <div className="pay-price">
            ₹{eventPrice}
            <span className="pay-price-label">one-time fee</span>
          </div>
        </div>

        <div className="pay-divider" />

        {/* QR section */}
        <div className="qr-section">
          <p className="qr-instruction">
            Scan the QR code below with any UPI app — the amount
            <strong> ₹{eventPrice}</strong> will be pre-filled automatically.
            After paying, enter the 12-digit UTR from your payment app.
          </p>

          <div className="qr-frame">
            <img
              src={qrUrl}
              alt={`UPI QR for ₹${eventPrice}`}
              className="qr-img"
            />
            {/* Amount chip shown below QR so student can verify before scanning */}
            <div className="qr-amount-chip">
              ₹{eventPrice} · {UPI_ID}
            </div>
            <span className="qr-label">Scan &amp; Pay via UPI</span>
          </div>
        </div>

        <div className="pay-divider" />

        {/* UTR input */}
        <div className="utr-section">
          <label className="utr-label" htmlFor="utr-input">
            Enter UTR / Reference Number
          </label>
          <input
            id="utr-input"
            type="text"
            inputMode="numeric"
            maxLength={12}
            placeholder="e.g. 123456789012"
            value={utr}
            onChange={e => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
            className="utr-input"
          />
          <span className="utr-hint">
            {utr.length}/12 digits
            {utr.length === 12 && <span className="utr-ok"> ✓ Ready to submit</span>}
          </span>
        </div>

        {/* Submit */}
        <button
          className="btn-primary full-w pay-submit"
          onClick={handleSubmit}
          disabled={submitting || utr.length !== 12}
        >
          {submitting
            ? <><Loader size={16} className="spin" /> Submitting…</>
            : `Submit Payment · ₹${eventPrice}`}
        </button>

        <p className="pay-footnote">
          After submission, our admin team will verify your UTR and confirm
          your registration within a few hours.
        </p>
      </div>

      <style>{`
        /* ── Page wrapper ─────────────────────────────────── */
        .payment-page {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 32px 16px 64px;
        }
        .payment-page.center { align-items: center; }

        /* ── Card ─────────────────────────────────────────── */
        .payment-card {
          background: var(--bg-white);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          padding: 36px 32px;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 0;
          animation: slideUp 0.35s cubic-bezier(0.4,0,0.2,1);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Back button ──────────────────────────────────── */
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          padding: 0;
          margin-bottom: 20px;
          cursor: pointer;
          transition: var(--transition);
        }
        .back-btn:hover { color: var(--primary); }

        /* ── Header ───────────────────────────────────────── */
        .pay-header { margin-bottom: 20px; }
        .pay-badge {
          display: inline-block;
          background: var(--primary-bg);
          color: var(--primary);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .06em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: var(--radius-full);
          margin-bottom: 10px;
        }
        .pay-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.3;
          margin-bottom: 10px;
        }
        .pay-price {
          font-size: 32px;
          font-weight: 800;
          color: var(--primary);
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .pay-price-label {
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
        }

        /* ── Divider ──────────────────────────────────────── */
        .pay-divider {
          height: 1px;
          background: var(--border);
          margin: 20px 0;
        }

        /* ── QR section ───────────────────────────────────── */
        .qr-section { display: flex; flex-direction: column; gap: 14px; }
        .qr-instruction {
          font-size: 13.5px;
          color: var(--text-muted);
          line-height: 1.65;
        }
        .qr-frame {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: var(--bg);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
        }
        .qr-img {
          width: 200px;
          height: 200px;
          border-radius: 8px;
          border: 2px solid var(--border-strong);
        }
        /* Amount chip shown under QR image */
        .qr-amount-chip {
          background: var(--primary);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: var(--radius-full);
          letter-spacing: 0.03em;
        }
        .qr-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        /* ── UTR section ──────────────────────────────────── */
        .utr-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }
        .utr-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .utr-input {
          width: 100%;
          padding: 12px 14px;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 2px;
          font-family: 'DM Mono', 'Courier New', monospace;
          border: 1.5px solid var(--border-strong);
          border-radius: var(--radius);
          background: var(--bg);
          color: var(--text);
          outline: none;
          transition: var(--transition);
        }
        .utr-input:focus {
          border-color: var(--primary);
          box-shadow: var(--shadow-glow);
          background: var(--bg-white);
        }
        .utr-hint {
          font-size: 12px;
          color: var(--text-light);
        }
        .utr-ok { color: var(--success); font-weight: 600; }

        /* ── Submit button ────────────────────────────────── */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--primary);
          color: #fff;
          border: none;
          border-radius: var(--radius);
          font-size: 15px;
          font-weight: 600;
          padding: 13px 24px;
          cursor: pointer;
          transition: var(--transition);
        }
        .btn-primary:hover:not(:disabled) { background: var(--primary-dark); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .full-w { width: 100%; }
        .pay-submit { margin-bottom: 12px; }

        .pay-footnote {
          font-size: 12px;
          color: var(--text-light);
          text-align: center;
          line-height: 1.55;
        }

        /* ── Toast ────────────────────────────────────────── */
        .pay-toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: var(--radius);
          font-size: 14px;
          font-weight: 500;
          z-index: 9999;
          box-shadow: var(--shadow-lg);
          animation: slideDown .25s ease;
          white-space: nowrap;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .pay-toast--success { background: #166534; color: #fff; }
        .pay-toast--error   { background: #991b1b; color: #fff; }

        /* ── Success card ─────────────────────────────────── */
        .success-card { align-items: center; text-align: center; gap: 16px; padding: 48px 32px; }
        .success-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--success-bg);
          color: var(--success);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .success-card h2 { font-size: 22px; font-weight: 700; color: var(--text); }
        .success-sub { font-size: 14px; color: var(--text-muted); line-height: 1.65; max-width: 340px; }
        .success-utr-box {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }
        .success-utr-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
        .success-utr-value { font-family: 'DM Mono', monospace; font-size: 20px; font-weight: 700; letter-spacing: 2px; color: var(--primary); }

        /* ── Spinner ──────────────────────────────────────── */
        .spin { animation: rotate 1s linear infinite; }
        @keyframes rotate { to { transform: rotate(360deg); } }

        /* ── Responsive ───────────────────────────────────── */
        @media (max-width: 520px) {
          .payment-card { padding: 24px 18px; }
          .pay-price { font-size: 26px; }
        }
      `}</style>
    </div>
  )
}