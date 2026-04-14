import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Calendar, Users, ClipboardList, LogOut,
  ShieldCheck, Settings, GraduationCap, RefreshCw, CreditCard,  // ← CreditCard added
} from 'lucide-react'

export default function Layout() {
  const { user, logout, hasRole, selectedRole, selectRole } = useAuth()
  const navigate = useNavigate()

  const isAdmin = selectedRole === 'admin'
  const canSwitch = hasRole('admin') && hasRole('student')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchRole = async () => {
    const next = isAdmin ? 'student' : 'admin'
    try {
      await selectRole(next)
      navigate(next === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      console.error('Role switch failed:', err)
    }
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ...(isAdmin ? [
      { to: '/admin',            icon: Settings,     label: 'Admin Panel' },
      { to: '/admin/payments',   icon: CreditCard,   label: 'Payments' },   // ← ADDED
    ] : []),
    { to: '/events', icon: Calendar, label: 'Events' },
    ...(isAdmin ? [
      { to: '/students',      icon: Users,       label: 'Students' },
      { to: '/verify-ticket', icon: ShieldCheck, label: 'Verify Ticket' },
    ] : []),
    { to: '/registrations', icon: ClipboardList, label: 'Registrations' },
  ]

  const RolePill = () => (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 600,
      background: isAdmin ? 'rgba(59,91,219,0.25)' : 'rgba(5,150,105,0.2)',
      color: isAdmin ? '#93c5fd' : '#6ee7b7',
      border: `1px solid ${isAdmin ? 'rgba(147,197,253,0.25)' : 'rgba(110,231,183,0.25)'}`,
      marginTop: '2px',
    }}>
      {isAdmin ? <ShieldCheck size={10} /> : <GraduationCap size={10} />}
      {isAdmin ? 'Admin' : 'Student'}
    </div>
  )

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 800, color: '#0f2166', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(245,158,11,0.3)',
            }}>
              P
            </div>
            <h1 style={{ fontFamily: '"DM Serif Display", serif', color: '#ffffff', fontSize: '1.25rem', fontWeight: 400, letterSpacing: '0.01em' }}>
              PTU EMS
            </h1>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.72rem', marginTop: '0.15rem', paddingLeft: '0.1rem', letterSpacing: '0.02em' }}>
            Puducherry Technological University
          </p>
        </div>

        {/* Nav */}
        <nav style={{ padding: '1.25rem 0.875rem', flex: 1 }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem', paddingLeft: '0.75rem' }}>
            Navigation
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.875rem',
                borderRadius: '10px',
                marginBottom: '0.2rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.5)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))'
                  : 'transparent',
                borderLeft: isActive ? '3px solid rgba(245,158,11,0.8)' : '3px solid transparent',
                transition: 'all 0.18s ease',
                letterSpacing: '-0.01em',
              })}
              onMouseEnter={e => {
                const active = e.currentTarget.style.borderLeft.includes('245,158,11')
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                }
              }}
              onMouseLeave={e => {
                const active = e.currentTarget.style.borderLeft.includes('245,158,11')
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                }
              }}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + role switcher + logout */}
        <div style={{ padding: '1rem 0.875rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.6rem 0.875rem', marginBottom: '0.5rem',
            background: 'rgba(255,255,255,0.06)', borderRadius: '10px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.15))',
              border: '1.5px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem', flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <RolePill />
            </div>
          </div>

          {canSwitch && (
            <button
              onClick={handleSwitchRole}
              title={`Switch to ${isAdmin ? 'Student' : 'Admin'}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                width: '100%', padding: '0.55rem 0.875rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.55)', fontSize: '0.84rem',
                borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: 500, transition: 'all 0.18s', letterSpacing: '-0.01em',
                marginBottom: '0.35rem',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
              }}
            >
              <RefreshCw size={14} />
              Switch to {isAdmin ? 'Student' : 'Admin'}
            </button>
          )}

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              width: '100%', padding: '0.55rem 0.875rem',
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: '0.84rem',
              borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
              fontWeight: 500, transition: 'all 0.18s', letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.12)'
              e.currentTarget.style.color = '#fca5a5'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
            }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content animate-in">
        <Outlet />
      </main>
    </div>
  )
}