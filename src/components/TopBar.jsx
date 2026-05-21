import { useEffect, useState } from 'react'
import { initials, ROLES } from '../constants'

// Pulsing dot animation injected once
const STYLE_ID = 'topbar-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes tb-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: .5; transform: scale(.75); }
    }
    @keyframes tb-fadein {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(s)
}

export default function TopBar({ profile, onAvatarClick }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const name     = (profile?.name && profile.name !== 'Utilisateur') ? profile.name : ''
  const role     = profile?.role || 'employe'
  const roleInfo = ROLES[role] || ROLES.employe
  const letters  = name ? initials(name) : '?'

  return (
    <header style={S.bar}>
      {/* Logo gauche */}
      <div style={S.logo}>
        <span style={S.logoStar}>✦</span>
        <span style={S.logoText}>Aria</span>
      </div>

      {/* Badge animé centre */}
      <div style={{ ...S.badge, opacity: mounted ? 1 : 0, animation: mounted ? 'tb-fadein .4s ease' : 'none' }}>
        <span style={S.dot} />
        <span style={S.badgeText}>En ligne</span>
      </div>

      {/* Avatar droite */}
      <button style={S.avatarBtn} onClick={onAvatarClick} title={name || 'Profil'}>
        <div style={{ ...S.avatar, background: roleInfo.color }}>
          {letters}
        </div>
      </button>
    </header>
  )
}

const S = {
  bar: {
    height: 56,
    background: '#ffffff',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 50,
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    flex: '0 0 auto',
  },
  logoStar: {
    fontSize: 18,
    background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: 1,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-.4px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: 99,
    padding: '4px 10px',
    transition: 'opacity .3s',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#10B981',
    flexShrink: 0,
    animation: 'tb-pulse 2s ease-in-out infinite',
    display: 'block',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 600,
    color: '#059669',
    letterSpacing: '.1px',
  },
  avatarBtn: {
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '.5px',
    boxShadow: '0 2px 8px rgba(0,0,0,.15)',
    fontFamily: 'inherit',
    transition: 'transform .15s, box-shadow .15s',
  },
}
