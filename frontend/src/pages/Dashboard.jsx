import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { Calendar, Ticket, Users, TrendingUp, MapPin, ArrowRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#1e2a6a', '#e8a020', '#2a9d8f', '#e76f51', '#264653', '#a8dadc']

const categoryBadgeClass = (cat) => {
  const map = {
    Lecture: 'badge-lecture', Workshop: 'badge-workshop', Cultural: 'badge-cultural',
    Competition: 'badge-competition', Sports: 'badge-sports', Seminar: 'badge-seminar',
  }
  return map[cat] || 'badge-upcoming'
}

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Dashboard() {
  // Use selectedRole (the active session role) instead of user.role
  const { user, selectedRole } = useAuth()
  const isAdmin = selectedRole === 'admin'

  const [stats, setStats] = useState(null)
  const [myRegs, setMyRegs] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const [s, up] = await Promise.all([
            axios.get('/api/students/stats'),
            axios.get('/api/events/upcoming'),
          ])
          setStats(s.data)
          setUpcoming((up.data.events || up.data).slice(0, 3))
        } else {
          const [regs, up] = await Promise.all([
            axios.get('/api/registrations/my'),
            axios.get('/api/events/upcoming'),
          ])
          setMyRegs(regs.data.registrations || regs.data)
          setUpcoming((up.data.events || up.data).slice(0, 3))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#9ca3af' }}>
      Loading dashboard...
    </div>
  )

  return (
    <div className="animate-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--navy-dark)', letterSpacing: '-0.02em' }}>
          Welcome, {user?.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Here's your PTU events overview.
        </p>
      </div>

      {/* Admin Stats */}
      {isAdmin && stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
            {[
              { label: 'Total Events', value: stats.totalEvents, sub: 'Across all time', icon: Calendar, color: '#1e2a6a' },
              { label: 'Total Registrations', value: stats.totalRegistrations, sub: 'Total tickets issued', icon: Ticket, color: '#e8a020' },
              { label: 'Registered Students', value: stats.totalStudents, sub: 'Active student accounts', icon: Users, color: '#2a9d8f' },
              { label: 'Upcoming Events', value: stats.upcomingEvents, sub: 'Scheduled in the future', icon: TrendingUp, color: '#e76f51' },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{label}</p>
                    <p style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--navy-dark)', lineHeight: 1 }}>{value}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{sub}</p>
                  </div>
                  <div style={{ background: `${color}15`, padding: '0.6rem', borderRadius: '10px' }}>
                    <Icon size={20} color={color} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="stat-card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--navy-dark)' }}>Top Events by Registration</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.topEvents} margin={{ top: 0, right: 0, bottom: 20, left: -20 }}>
                  <XAxis dataKey="title" tick={{ fontSize: 11 }} tickFormatter={t => t.length > 12 ? t.slice(0, 12) + '…' : t} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(val) => [val, 'Registrations']} labelFormatter={l => l} />
                  <Bar dataKey="count" fill="#1e2a6a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="stat-card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--navy-dark)' }}>Registration Capacity</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={stats.capacityData.map(d => ({
                      ...d,
                      fillPct: d.capacity > 0 ? Math.round((d.registered / d.capacity) * 100) : 0,
                      shortTitle: d.title.length > 14 ? d.title.slice(0, 14) + '…' : d.title,
                    }))}
                    dataKey="fillPct"
                    nameKey="shortTitle"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={30}
                    label={({ fillPct }) => `${fillPct}%`}
                    labelLine
                  >
                    {stats.capacityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val, name) => [`${val}% filled`, name]} />
                  <Legend
                    formatter={(value) => <span style={{ fontSize: '0.75rem', color: '#374151' }}>{value}</span>}
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Student Stats */}
      {!isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem', maxWidth: 560 }}>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--navy)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>My Registrations</p>
              <Ticket size={18} color="var(--navy)" />
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--navy-dark)', margin: '0.5rem 0' }}>{myRegs.length}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Events you're attending</p>
          </div>
          <div className="stat-card" style={{ borderLeft: '4px solid var(--gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Upcoming Events</p>
              <Calendar size={18} color="var(--gold)" />
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--navy-dark)', margin: '0.5rem 0' }}>{upcoming.length}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available to register</p>
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Upcoming Events */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy-dark)' }}>Upcoming Events</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Events happening soon on campus</p>
            </div>
            <Link to="/events" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No upcoming events.</p>
          ) : upcoming.map(ev => (
            <div key={ev.id} className="event-card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--navy)', maxWidth: '80%' }}>{ev.title}</h4>
                <span className={`badge ${categoryBadgeClass(ev.category)}`}>{ev.category}</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Calendar size={12} />{formatDate(ev.date)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <MapPin size={12} />{ev.venue}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* My Schedule */}
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--navy-dark)' }}>My Schedule</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Events you are registered for</p>
            </div>
            <Link to="/registrations" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 600, textDecoration: 'none' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {myRegs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <Ticket size={40} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No registrations yet</p>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1rem' }}>You haven't registered for any events.</p>
              <Link to="/events">
                <button className="btn-primary">Browse Events</button>
              </Link>
            </div>
          ) : myRegs.slice(0, 3).map(reg => (
            <div key={reg.id} className="event-card" style={{ marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--navy)' }}>{reg.title}</h4>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Calendar size={12} />{formatDate(reg.date)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <MapPin size={12} />{reg.venue}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}