import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, ShieldCheck, GraduationCap } from 'lucide-react'

// ─── Role Selection Modal ─────────────────────────────────────────────────────
function RolePickerModal({ availableRoles, onSelect, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '2.25rem 2.5rem',
        maxWidth: 400, width: '100%',
        boxShadow: '0 32px 72px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '14px',
          background: 'linear-gradient(135deg, #1e3a8a, #3b5bdb)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <ShieldCheck size={26} color="#fff" />
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
          Select Your Role
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
          You have multiple roles. Choose how you'd like to continue this session.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {availableRoles.includes('admin') && (
            <button
              onClick={() => onSelect('admin')}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem', borderRadius: '12px',
                border: '2px solid #1e3a8a', background: 'linear-gradient(135deg, #1e3a8a, #3b5bdb)',
                color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
                transition: 'opacity 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <ShieldCheck size={20} />
              <div style={{ textAlign: 'left' }}>
                <div>Continue as Admin</div>
                <div style={{ fontSize: '0.775rem', fontWeight: 400, opacity: 0.8 }}>
                  Access admin dashboard & management tools
                </div>
              </div>
            </button>
          )}
          {availableRoles.includes('student') && (
            <button
              onClick={() => onSelect('student')}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '1rem 1.25rem', borderRadius: '12px',
                border: '2px solid #e2e8f0', background: '#f8fafc',
                color: '#0f172a', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
                transition: 'background 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <GraduationCap size={20} color="#1e3a8a" />
              <div style={{ textAlign: 'left' }}>
                <div>Continue as Student</div>
                <div style={{ fontSize: '0.775rem', fontWeight: 400, color: '#64748b' }}>
                  View events, register, and manage your tickets
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Login Page ───────────────────────────────────────────────────────────────
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rolePickerState, setRolePickerState] = useState(null) // { availableRoles }
  const [roleLoading, setRoleLoading] = useState(false)

  const { login, selectRole } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { requireRoleSelection, availableRoles } = await login(email, password)

      if (requireRoleSelection) {
        // Show role picker modal — don't navigate yet
        setRolePickerState({ availableRoles })
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelect = async (role) => {
    setRoleLoading(true)
    try {
      await selectRole(role)
      navigate(role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Role selection failed')
      setRolePickerState(null)
    } finally {
      setRoleLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Role Picker Modal */}
      {rolePickerState && (
        <RolePickerModal
          availableRoles={rolePickerState.availableRoles}
          onSelect={handleRoleSelect}
          loading={roleLoading}
        />
      )}

      <div style={{ width: '100%', maxWidth: 440, padding: '1rem', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '16px',
            background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
            fontSize: '1.5rem', fontWeight: 800, color: '#0f2166'
          }}>P</div>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', color: '#ffffff', fontSize: '2.4rem', fontWeight: 400, letterSpacing: '0.01em' }}>
            PTU EMS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem', fontSize: '0.875rem', letterSpacing: '0.01em' }}>
            Puducherry Technological University
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '2.5rem 2.75rem',
          boxShadow: '0 32px 72px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Welcome back
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Sign in to access your PTU events account
          </p>

          {error && (
            <div className="alert-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.1rem' }}>
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="student@ptu.edu.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0,
                    transition: 'color 0.15s', display: 'flex', alignItems: 'center'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#64748b'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '0.875rem', justifyContent: 'center', fontSize: '1rem' }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--navy)', fontWeight: 700, textDecoration: 'none' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}