import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, signIn, signUp, signOut, getSession, fetchStock, fetchFournisseurs, fetchScans, fetchPrix } from './lib/supabase'
import { NAV_ITEMS, ROLES, initials, dlcStatus, isCritique, checkPwd, pwdScore, pwdStrengthColor, pwdStrengthLabel } from './constants'

// ─── Auth Screen ──────────────────────────────────────────────────────────────

function AuthScreen({ setUser, setProfile, onDataLoaded }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('employe')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const score = pwdScore(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { data, error } = await signIn({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setUser(data.session.user)
      setProfile(data.session.user.user_metadata)
      onDataLoaded(data.session.user.id)
    } else {
      if (score < 2) { setError('Mot de passe trop faible'); setLoading(false); return }
      const { data, error } = await signUp({ email, password, name, role })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.session) {
        setUser(data.session.user)
        setProfile(data.session.user.user_metadata)
        onDataLoaded(data.session.user.id)
      } else {
        setMode('login')
        setError('Confirmez votre email puis connectez-vous.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">✦</span>
          <span className="auth-logo-text">Aria</span>
        </div>
        <p className="auth-subtitle">Gestion de cuisine professionnelle</p>

        <div className="auth-tabs">
          <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError('') }}>Connexion</button>
          <button className={`auth-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => { setMode('signup'); setError('') }}>Créer un compte</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Prénom &amp; Nom</label>
              <input className="input" type="text" placeholder="Jean Dupont" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="chef@restaurant.fr" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div className="input-wrap">
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" className="input-eye" onClick={() => setShowPwd(v => !v)}>{showPwd ? '🙈' : '👁️'}</button>
            </div>
            {mode === 'signup' && password.length > 0 && (
              <div className="pwd-meter">
                <div className="pwd-bar">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="pwd-seg" style={{ background: i <= score ? pwdStrengthColor(score) : 'var(--border)' }} />
                  ))}
                </div>
                <span className="pwd-label" style={{ color: pwdStrengthColor(score) }}>{pwdStrengthLabel(score)}</span>
              </div>
            )}
          </div>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Rôle</label>
              <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                {Object.entries(ROLES).filter(([k]) => k !== 'superadmin').map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ page, setPage, alertDlc, alertCmd, user, profile, onLogout }) {
  const roleInfo = ROLES[profile?.role] || ROLES.employe
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">✦</span>
        <span className="sidebar-logo-text">Aria</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const badge = item.k === 'stock' ? alertDlc : item.k === 'commandes' ? alertCmd : 0
          return (
            <button
              key={item.k}
              className={`sidebar-item${page === item.k ? ' active' : ''}`}
              onClick={() => setPage(item.k)}
            >
              <span className="sidebar-item-icon">{item.emoji}</span>
              <span className="sidebar-item-label">{item.label}</span>
              {badge > 0 && <span className="badge badge-danger sidebar-badge">{badge}</span>}
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{profile?.name ? initials(profile.name) : '?'}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{profile?.name || user?.email}</span>
            <span className="sidebar-user-role" style={{ color: roleInfo.color }}>{roleInfo.icon} {roleInfo.label}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout} title="Déconnexion">⏻</button>
      </div>
    </aside>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ page, profile, onLogout }) {
  const item = NAV_ITEMS.find(n => n.k === page)
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="topbar-icon">{item?.emoji}</span>
        <span>{item?.label || 'Aria'}</span>
      </div>
      <div className="topbar-actions">
        <div className="avatar avatar-sm">{profile?.name ? initials(profile.name) : '?'}</div>
        <button className="topbar-logout" onClick={onLogout} title="Déconnexion">⏻</button>
      </div>
    </header>
  )
}

// ─── PullToRefresh ────────────────────────────────────────────────────────────

function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const THRESHOLD = 70

  function onTouchStart(e) { startY.current = e.touches[0].clientY }
  async function onTouchEnd(e) {
    const delta = e.changedTouches[0].clientY - startY.current
    if (delta > THRESHOLD && !refreshing) {
      setRefreshing(true)
      await onRefresh()
      setRefreshing(false)
    }
    setPulling(false)
  }
  function onTouchMove(e) {
    const delta = e.touches[0].clientY - startY.current
    setPulling(delta > 20)
  }

  return (
    <div className="ptr-wrap" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {(pulling || refreshing) && (
        <div className="ptr-indicator">{refreshing ? '⟳' : '↓'}</div>
      )}
      {children}
    </div>
  )
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

function BottomNav({ page, setPage, alertDlc, alertCmd }) {
  return (
    <nav className="bnav">
      {NAV_ITEMS.map(item => {
        const badge = item.k === 'stock' ? alertDlc : item.k === 'commandes' ? alertCmd : 0
        return (
          <button
            key={item.k}
            className={`bnav-item${page === item.k ? ' active' : ''}`}
            onClick={() => setPage(item.k)}
          >
            <span className="bnav-icon">{item.emoji}</span>
            {badge > 0 && <span className="badge badge-danger bnav-badge">{badge}</span>}
            <span className="bnav-label">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Page Placeholders ────────────────────────────────────────────────────────

function PagePlaceholder({ title, icon }) {
  return (
    <div className="page-placeholder">
      <div className="page-placeholder-icon">{icon}</div>
      <h2 className="page-placeholder-title">{title}</h2>
      <p className="page-placeholder-sub">Module en cours de développement</p>
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [stock, setStock] = useState([])
  const [scanLog, setScanLog] = useState([])
  const [prixHist, setPrixHist] = useState([])
  const [fournisseurs, setFournisseurs] = useState([])

  const loadData = useCallback(async (userId) => {
    const [s, f, sc, p] = await Promise.all([
      fetchStock(userId),
      fetchFournisseurs(userId),
      fetchScans(userId),
      fetchPrix(userId),
    ])
    if (s.data) setStock(s.data)
    if (f.data) setFournisseurs(f.data)
    if (sc.data) setScanLog(sc.data)
    if (p.data) setPrixHist(p.data)
  }, [])

  useEffect(() => {
    getSession().then(session => {
      if (session?.user) {
        setUser(session.user)
        setProfile(session.user.user_metadata)
        loadData(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setProfile(session.user.user_metadata)
        loadData(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setStock([])
        setScanLog([])
        setPrixHist([])
        setFournisseurs([])
      }
    })

    return () => subscription.unsubscribe()
  }, [loadData])

  const handleLogout = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }

  const alertDlc = stock.filter(i => ['critical', 'expired'].includes(dlcStatus(i.dlc))).length
  const alertCmd = stock.filter(i => isCritique(i)).length

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">✦</div>
        <p>Chargement…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthScreen
        setUser={setUser}
        setProfile={setProfile}
        onDataLoaded={loadData}
      />
    )
  }

  const sharedProps = { stock, scanLog, prixHist, fournisseurs, user, profile, loadData }

  return (
    <div className="shell">
      <Sidebar
        page={page}
        setPage={setPage}
        alertDlc={alertDlc}
        alertCmd={alertCmd}
        user={user}
        profile={profile}
        onLogout={handleLogout}
      />

      <div className="shell-main">
        <TopBar page={page} profile={profile} onLogout={handleLogout} />

        <PullToRefresh onRefresh={() => loadData(user.id)}>
          <main className="shell-content">
            {page === 'dashboard'  && <PagePlaceholder title="Dashboard"  icon="📊" />}
            {page === 'reception'  && <PagePlaceholder title="Réception"  icon="📷" />}
            {page === 'stock'      && <PagePlaceholder title="Stock"      icon="📦" />}
            {page === 'commandes'  && <PagePlaceholder title="Commandes"  icon="🛒" />}
            {page === 'haccp'      && <PagePlaceholder title="HACCP"      icon="✅" />}
            {page === 'aria'       && <PagePlaceholder title="Aria IA"    icon="🤖" />}
          </main>
        </PullToRefresh>

        <BottomNav page={page} setPage={setPage} alertDlc={alertDlc} alertCmd={alertCmd} />
      </div>
    </div>
  )
}
