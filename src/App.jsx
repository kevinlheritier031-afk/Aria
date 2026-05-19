import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { supabase, signOut, getSession, fetchStock, fetchFournisseurs, fetchScans, fetchPrix } from './lib/supabase'
import { NAV_ITEMS, ROLES, initials, dlcStatus, isCritique } from './constants'

// Pages — lazy-loaded for code-splitting
const Auth        = lazy(() => import('./pages/Auth'))
const Dashboard   = lazy(() => import('./pages/Dashboard'))
const Stock       = lazy(() => import('./pages/Stock'))
const Reception   = lazy(() => import('./pages/Reception'))
const Commandes   = lazy(() => import('./pages/Commandes'))
const Haccp       = lazy(() => import('./pages/Haccp'))
const AriaPage    = lazy(() => import('./pages/Aria'))
const Recettes    = lazy(() => import('./pages/Recettes'))
const MiseEnPlace = lazy(() => import('./pages/MiseEnPlace'))
const Business    = lazy(() => import('./pages/Business'))
const Equipe      = lazy(() => import('./pages/Equipe'))

const KNOWN_PAGES = new Set(NAV_ITEMS.map(i => i.k))

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
  const [pulling,    setPulling]    = useState(false)
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

// ─── PageSpinner (Suspense fallback) ─────────────────────────────────────────

function PageSpinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:200 }}>
      <div style={{ fontSize:26, color:'#2563EB', animation:'spin .8s linear infinite' }}>✦</div>
    </div>
  )
}

// ─── NotFoundPage ─────────────────────────────────────────────────────────────

function NotFoundPage({ setPage }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:14, padding:40, textAlign:'center' }}>
      <div style={{ fontSize:52 }}>🔍</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#0F172A' }}>Page introuvable</div>
      <div style={{ fontSize:14, color:'#94A3B8' }}>Cette section n'existe pas ou n'est plus disponible.</div>
      <button
        onClick={() => setPage('dashboard')}
        style={{ padding:'10px 22px', background:'#2563EB', color:'#fff', border:'none', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer' }}
      >
        ← Retour au tableau de bord
      </button>
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

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user,         setUser]         = useState(null)
  const [profile,      setProfile]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [page,         setPage]         = useState('dashboard')
  const [navSource,    setNavSource]    = useState(null)
  const [stock,        setStock]        = useState([])
  const [scanLog,      setScanLog]      = useState([])
  const [prixHist,     setPrixHist]     = useState([])
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

  const handleLogin = (u) => {
    setUser(u)
    setProfile(u.user_metadata)
    loadData(u.id)
  }

  const handleLogout = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }

  const setPageFromDashboard = useCallback((p) => { setPage(p); setNavSource('dashboard') }, [])
  const setPageClear         = useCallback((p) => { setPage(p); setNavSource(null) }, [])
  const handleBack           = useCallback(() => { setPage('dashboard'); setNavSource(null) }, [])

  const alertDlc = stock.filter(i => ['critical', 'expired'].includes(dlcStatus(i.dlc))).length
  const alertCmd = stock.filter(i => isCritique(i)).length

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{ position:'relative', width:60, height:60 }}>
          <div className="loading-ring" />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, color:'#2563EB' }}>✦</div>
        </div>
        <p style={{ color:'#94A3B8', fontSize:13, fontWeight:500, letterSpacing:'.3px', margin:0 }}>Chargement…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <Suspense fallback={null}>
        <Auth onLogin={handleLogin} />
      </Suspense>
    )
  }

  return (
    <div className="shell">
      <Sidebar
        page={page}
        setPage={setPageClear}
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
            <Suspense fallback={<PageSpinner />}>
            {page === 'dashboard' && (
              <Dashboard
                stock={stock}
                scanLog={scanLog}
                prixHist={prixHist}
                fournisseurs={fournisseurs}
                setPage={setPageFromDashboard}
              />
            )}
            {page === 'reception' && (
              <Reception
                scanLog={scanLog}
                setScanLog={setScanLog}
                stock={stock}
                setStock={setStock}
                user={user}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'stock' && (
              <Stock
                stock={stock}
                setStock={setStock}
                fournisseurs={fournisseurs}
                user={user}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'commandes' && (
              <Commandes
                stock={stock}
                fournisseurs={fournisseurs}
                setFournisseurs={setFournisseurs}
                prixHist={prixHist}
                setPrixHist={setPrixHist}
                user={user}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'recettes' && (
              <Recettes
                stock={stock}
                user={user}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'mise_en_place' && (
              <MiseEnPlace
                stock={stock}
                setStock={setStock}
                user={user}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'haccp' && (
              <Haccp
                user={user}
                scanLog={scanLog}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'business' && (
              <Business
                user={user}
                profile={profile}
                stock={stock}
                fournisseurs={fournisseurs}
                prixHist={prixHist}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'equipe' && (
              <Equipe
                user={user}
                profile={profile}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {page === 'aria' && (
              <AriaPage
                stock={stock}
                fournisseurs={fournisseurs}
                scanLog={scanLog}
                user={user}
                profile={profile}
                fromDashboard={navSource === 'dashboard'}
                onBack={handleBack}
              />
            )}
            {!KNOWN_PAGES.has(page) && <NotFoundPage setPage={setPageClear} />}
            </Suspense>
          </main>
        </PullToRefresh>

        <BottomNav page={page} setPage={setPageClear} alertDlc={alertDlc} alertCmd={alertCmd} />
      </div>
    </div>
  )
}
