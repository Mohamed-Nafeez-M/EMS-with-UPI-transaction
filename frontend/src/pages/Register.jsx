import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertCircle } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', student_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: 500, padding: '1rem', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.1rem',
            boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
            fontSize: '1.3rem', fontWeight: 800, color: '#0f2166'
          }}>P</div>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', color: '#ffffff', fontSize: '2.2rem', fontWeight: 400 }}>PTU EMS</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.4rem', fontSize: '0.875rem' }}>Puducherry Technological University</p>
        </div>

        <div style={{
          background: 'white', borderRadius: '20px', padding: '2.5rem 2.75rem',
          boxShadow: '0 32px 72px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem', letterSpacing: '-0.02em', color: '#0f172a' }}>
            Create Account
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Register as a student to access PTU events
          </p>

          {error && (
            <div className="alert-error">
              <AlertCircle size={16} />{error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange} required placeholder="Your name" />
              </div>
              <div>
                <label className="form-label">Student ID</label>
                <input className="form-input" name="student_id" value={form.student_id} onChange={handleChange} placeholder="CS2021001" />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Email address *</label>
              <input className="form-input" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="student@ptu.edu.in" />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Department</label>
              <select className="form-input" name="department" value={form.department} onChange={handleChange}>
                <option value="">Select department</option>
                {['CSE','ECE','IT','EEE','EIE','Mechatronics','Mechanical Engineering','Civil Engineering','Chemical Engineering'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Min 6 characters" minLength={6} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '1rem' }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...</>
              ) : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--navy)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
