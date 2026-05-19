import { useState } from 'react'
import { signOut } from '../lib/supabase'
import { ROLES, initials } from '../constants'

const MENU_ITEMS = [
  { icon: '🏪', label: 'Mon établissement', desc: 'Informations du restaurant' },
  { icon: '🔔', label: 'Notifications',     desc: 'Alertes et rappels'         },
  { icon: '📤', label: 'Exporter',          desc: 'HACCP, stock, scans'        },
]

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, role, size = 56 }) {
  const roleInfo = ROLES[role] || ROLES.employe
  const bg = roleInfo.color
  const letters = name ? initials(name) : '?'
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: Math.round(size * .38),
      fontWeight: 700,
      letterSpacing: '.5px',
      flexShrink: 0,
      boxShadow: `0 4px 14px ${bg}55`,
    }}>
      {letters}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function Stat({ value, label, color = '#2563EB' }) {
  return (
    <div style={S.stat}>
      <div style={{ ...S.statValue, color }}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  )
}

// ── Confirm logout ────────────────────────────────────────────────────────────

function ConfirmLogout({ onConfirm, onCancel, loading }) {
  return (
    <div style={S.confirmBox}>
      <div style={S.confirmText}>Voulez-vous vraiment vous déconnecter ?</div>
      <div style={S.confirmBtns}>
        <button style={S.cancelBtn} onClick={onCancel} disabled={loading}>Annuler</button>
        <button style={{ ...S.logoutConfirmBtn, opacity: loading ? .6 : 1 }} onClick={onConfirm} disabled={loading}>
          {loading ? 'Déconnexion…' : 'Déconnecter'}
        </button>
      </div>
    </div>
  )
}

// ── ProfileSheet ──────────────────────────────────────────────────────────────

export default function ProfileSheet({ user, profile, stock = [], scanLog = [], onClose, onLogout }) {
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [loggingOut, setLoggingOut]       = useState(false)

  const name     = profile?.name || user?.email?.split('@')[0] || '?'
  const email    = user?.email || ''
  const role     = profile?.role || 'employe'
  const roleInfo = ROLES[role] || ROLES.employe

  const nbStock    = stock.length
  const nbScans    = scanLog.length
  const nbConf     = scanLog.filter(s => s.conforme === true || s.conforme === 'true').length

  async function handleLogout() {
    setLoggingOut(true)
    await signOut()
    setLoggingOut(false)
    onLogout?.()
  }

  return (
    <>
      {/* Backdrop */}
      <div style={S.backdrop} onClick={onClose} />

      {/* Sheet */}
      <div style={S.sheet}>
        {/* Handle */}
        <div style={S.handle} />

        {/* Header */}
        <div style={S.sheetHeader}>
          <div style={S.identity}>
            <Avatar name={name} role={role} size={56} />
            <div style={S.identityText}>
              <div style={S.userName}>{name}</div>
              <div style={S.userEmail}>{email}</div>
              <div style={{ ...S.roleBadge, background: `${roleInfo.color}18`, color: roleInfo.color }}>
                {roleInfo.icon} {roleInfo.label}
              </div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Stats */}
        <div style={S.statsRow}>
          <Stat value={nbStock}  label="Produits"  color="#2563EB" />
          <div style={S.statDivider} />
          <Stat value={nbScans}  label="Scans"     color="#6366F1" />
          <div style={S.statDivider} />
          <Stat value={nbConf}   label="Conformes" color="#10B981" />
        </div>

        {/* Menu */}
        <div style={S.menu}>
          {MENU_ITEMS.map(item => (
            <button key={item.label} style={S.menuItem} disabled>
              <span style={S.menuIcon}>{item.icon}</span>
              <div style={S.menuText}>
                <span style={S.menuLabel}>{item.label}</span>
                <span style={S.menuDesc}>{item.desc}</span>
              </div>
              <span style={S.menuBientot}>Bientôt</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={S.divider} />

        {/* Logout */}
        <div style={S.footer}>
          {confirmLogout
            ? <ConfirmLogout onConfirm={handleLogout} onCancel={() => setConfirmLogout(false)} loading={loggingOut} />
            : (
              <button style={S.logoutBtn} onClick={() => setConfirmLogout(true)}>
                <span>⏻</span>
                <span>Déconnexion</span>
              </button>
            )
          }
        </div>
      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.4)',
    backdropFilter: 'blur(2px)',
    zIndex: 200,
    animation: 'fadeIn .18s ease',
  },
  sheet: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 520,
    background: '#ffffff',
    borderRadius: '20px 20px 0 0',
    zIndex: 201,
    boxShadow: '0 -8px 40px rgba(15,23,42,.15)',
    animation: 'slideUp .22s ease',
    paddingBottom: 'env(safe-area-inset-bottom)',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
  handle: {
    width: 36,
    height: 4,
    background: '#E2E8F0',
    borderRadius: 99,
    margin: '12px auto 0',
  },
  sheetHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 20px 16px',
  },
  identity: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  identityText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  },
  userName: {
    fontSize: 17,
    fontWeight: 700,
    color: '#0F172A',
    lineHeight: 1.2,
  },
  userEmail: {
    fontSize: 12.5,
    color: '#94A3B8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 99,
    fontSize: 11.5,
    fontWeight: 600,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  closeBtn: {
    width: 30,
    height: 30,
    border: 'none',
    background: '#F1F5F9',
    borderRadius: 99,
    cursor: 'pointer',
    color: '#94A3B8',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: 'inherit',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    margin: '0 20px 20px',
    background: '#F8FAFC',
    borderRadius: 12,
    padding: '14px 0',
    border: '1px solid #E2E8F0',
  },
  stat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '.5px',
  },
  statDivider: {
    width: 1,
    height: 32,
    background: '#E2E8F0',
  },
  menu: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0 12px',
    gap: 2,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '13px 12px',
    borderRadius: 10,
    border: 'none',
    background: 'none',
    cursor: 'not-allowed',
    width: '100%',
    textAlign: 'left',
    fontFamily: 'inherit',
    opacity: .85,
    transition: 'background .15s',
  },
  menuIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
    flexShrink: 0,
  },
  menuText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#0F172A',
  },
  menuDesc: {
    fontSize: 12,
    color: '#94A3B8',
  },
  menuBientot: {
    fontSize: 10.5,
    fontWeight: 600,
    color: '#94A3B8',
    background: '#F1F5F9',
    padding: '2px 7px',
    borderRadius: 99,
    whiteSpace: 'nowrap',
  },
  divider: {
    height: 1,
    background: '#E2E8F0',
    margin: '12px 0',
  },
  footer: {
    padding: '0 20px 20px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px',
    border: '1.5px solid #FECACA',
    borderRadius: 10,
    background: '#FEF2F2',
    color: '#DC2626',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s',
  },
  confirmBox: {
    padding: '16px',
    background: '#FEF2F2',
    borderRadius: 12,
    border: '1px solid #FECACA',
  },
  confirmText: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: 500,
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmBtns: {
    display: 'flex',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    border: '1.5px solid #E2E8F0',
    borderRadius: 8,
    background: '#fff',
    color: '#475569',
    fontSize: 13.5,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  logoutConfirmBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: 8,
    background: '#EF4444',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity .15s',
  },
}
