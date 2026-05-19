// Props:
//   value    — number | string affiché en grand
//   label    — titre de la KPI
//   sub      — sous-titre optionnel
//   icon     — emoji ou string
//   color    — couleur principale (#hex)
//   bg       — couleur de fond (#hex) — défaut dérivé de color
//   trend    — 'up' | 'down' | null
//   trendVal — string affiché à côté de la flèche (ex: "+12%")
//   onClick  — callback optionnel

export default function KpiCard({ value, label, sub, icon, color = '#2563EB', bg, trend, trendVal, onClick }) {
  const background = bg || `${color}12`
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      style={{
        ...S.card,
        background,
        border: `1px solid ${color}20`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Icon */}
      <div style={{ ...S.iconWrap, background: `${color}18`, color }}>
        {icon}
      </div>

      {/* Content */}
      <div style={S.body}>
        <div style={{ ...S.value, color }}>{value}</div>

        <div style={S.labelRow}>
          <span style={S.label}>{label}</span>
          {trend && (
            <span style={{
              ...S.trend,
              color: trend === 'up' ? '#10B981' : '#EF4444',
              background: trend === 'up' ? '#ECFDF5' : '#FEF2F2',
            }}>
              {trend === 'up' ? '↑' : '↓'}{trendVal ? ` ${trendVal}` : ''}
            </span>
          )}
        </div>

        {sub && <div style={S.sub}>{sub}</div>}
      </div>

      {/* Arrow if clickable */}
      {onClick && <div style={{ ...S.arrow, color: `${color}60` }}>›</div>}
    </Tag>
  )
}

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const S = {
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 18px',
    borderRadius: 14,
    fontFamily: F,
    border: 'none',
    textAlign: 'left',
    width: '100%',
    transition: 'transform .15s, box-shadow .15s',
    boxSizing: 'border-box',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  value: {
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1,
    fontFamily: "'DM Mono','JetBrains Mono',monospace",
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: '#475569',
  },
  trend: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: 99,
  },
  sub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  arrow: {
    fontSize: 22,
    fontWeight: 300,
    flexShrink: 0,
    lineHeight: 1,
  },
}
