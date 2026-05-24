import { NAV_ITEMS, ROLES, initials } from '../constants'

export default function Sidebar({ page, setPage, alertDlc, alertCmd, user, profile, onLogout }) {
  const name     = profile?.name || user?.email?.split('@')[0] || '?'
  const role     = profile?.role || 'employe'
  const roleInfo = ROLES[role] || ROLES.employe
  const letters  = name ? initials(name) : '?'

  return (
    <aside style={S.sidebar}>
      {/* Logo */}
      <div style={S.logoWrap}>
        <div style={S.logoInner}>
          <span style={S.logoStar}>✦</span>
          <span style={S.logoText}>Aria</span>
        </div>
        <div style={S.logoSub}>Cuisine Pro</div>
      </div>

      {/* Nav */}
      <nav style={S.nav}>
        <div style={S.navLabel}>Navigation</div>
        {NAV_ITEMS.map(item => {
          const badge  = item.k === 'stock' ? alertDlc : item.k === 'commandes' ? alertCmd : 0
          const active = page === item.k
          return (
            <button
              key={item.k}
              onClick={() => setPage(item.k)}
              style={{
                ...S.item,
                ...(active ? S.itemActive : {}),
              }}
            >
              {/* Left active bar */}
              <div style={{ ...S.activeBar, opacity: active ? 1 : 0 }} />

              <span style={S.itemIcon}>{item.emoji}</span>
              <span style={{ ...S.itemLabel, color: active ? '#fff' : '#94A3B8' }}>{item.label}</span>

              {badge > 0 && (
                <span style={S.badge}>{badge > 99 ? '99+' : badge}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={S.footer}>
        <div style={S.footerInner}>
          <div style={{ ...S.avatar, background: roleInfo.color }}>
            {letters}
          </div>
          <div style={S.userInfo}>
            <div style={S.userName}>{name}</div>
            <div style={{ ...S.userRole, color: roleInfo.color }}>
              {roleInfo.icon} {roleInfo.label}
            </div>
          </div>
          <button style={S.logoutBtn} onClick={onLogout} title="Déconnexion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

const S = {
  sidebar: {
    width: 260,
    minWidth: 260,
    background: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
  logoWrap: {
    padding: '22px 18px 14px',
    borderBottom: '1px solid rgba(255,255,255,.06)',
    flexShrink: 0,
  },
  logoInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  logoStar: {
    fontSize: 20,
    color: '#3B82F6',
    lineHeight: 1,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 800,
    color: '#F8FAFC',
    letterSpacing: '-.5px',
  },
  logoSub: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: 500,
    letterSpacing: '.4px',
    textTransform: 'uppercase',
    paddingLeft: 28,
  },
  nav: {
    padding: '12px 10px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flexShrink: 0,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '.8px',
    padding: '0 8px',
    marginBottom: 4,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 10px 9px 14px',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    cursor: 'pointer',
    position: 'relative',
    transition: 'background .15s',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  itemActive: {
    background: 'rgba(37,99,235,.18)',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    background: '#2563EB',
    borderRadius: '0 3px 3px 0',
    transition: 'opacity .15s',
  },
  itemIcon: {
    fontSize: 17,
    lineHeight: 1,
    flexShrink: 0,
    width: 22,
    textAlign: 'center',
  },
  itemLabel: {
    fontSize: 13.5,
    fontWeight: 500,
    flex: 1,
    transition: 'color .15s',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 99,
    background: '#EF4444',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    flexShrink: 0,
  },
  footer: {
    borderTop: '1px solid rgba(255,255,255,.06)',
    padding: '12px 10px',
    flexShrink: 0,
  },
  footerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 10,
    background: 'rgba(255,255,255,.04)',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    letterSpacing: '.5px',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  userName: {
    fontSize: 12.5,
    fontWeight: 600,
    color: '#F1F5F9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  logoutBtn: {
    width: 30,
    height: 30,
    border: 'none',
    background: 'rgba(255,255,255,.06)',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#64748B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background .15s, color .15s',
    fontFamily: 'inherit',
  },
}
