import { BOTTOM_NAV_ITEMS } from '../constants'

// Keyframe for top-bar slide-in injected once
const STYLE_ID = 'bnav-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes bnav-bar-in {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }
  `
  document.head.appendChild(s)
}

export default function BottomNav({ page, setPage, alertDlc, alertCmd }) {
  return (
    <nav style={S.nav}>
      {BOTTOM_NAV_ITEMS.map(item => {
        const badge  = item.k === 'stock' ? alertDlc : item.k === 'commandes' ? alertCmd : 0
        const active = page === item.k

        return (
          <button
            key={item.k}
            onClick={() => setPage(item.k)}
            style={{
              ...S.item,
              color: active ? '#2563EB' : '#94A3B8',
            }}
          >
            {active && <div style={S.topBar} />}

            {/* Icon + badge wrapper */}
            <div style={S.iconWrap}>
              {item.k === 'aria' ? (
                <span style={{ ...S.icon, ...S.ariaOrb }}>{`${item.emoji}︎`}</span>
              ) : (
                <span style={{ ...S.icon, fontSize: active ? 22 : 20, transition: 'font-size .15s' }}>
                  {item.emoji}
                </span>
              )}
              {badge > 0 && (
                <span style={S.badge}>{badge > 99 ? '99+' : badge}</span>
              )}
            </div>

            <span style={{ ...S.label, fontWeight: (item.k === 'aria' && active) ? 700 : 500 }}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const S = {
  nav: {
    height: 64,
    background: '#ffffff',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'stretch',
    flexShrink: 0,
    paddingBottom: 'env(safe-area-inset-bottom)',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
  item: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'color .15s',
    padding: '0 2px',
    fontFamily: 'inherit',
    WebkitTapHighlightColor: 'transparent',
    WebkitAppearance: 'none',
    appearance: 'none',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: 3,
    background: '#2563EB',
    borderRadius: '0 0 4px 4px',
    animation: 'bnav-bar-in .2s ease',
    transformOrigin: 'center',
  },
  iconWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    lineHeight: 1,
    display: 'block',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 99,
    background: '#EF4444',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    border: '1.5px solid #fff',
    lineHeight: 1,
  },
  ariaOrb: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#2563EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 1,
    flexShrink: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '.1px',
  },
}
