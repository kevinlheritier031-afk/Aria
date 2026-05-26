// Horizontal bar chart — stock par catégorie ou toute donnée clé/valeur
//
// Props:
//   data      — [{ label, value, color, icon, bg }]
//   unit      — string affiché après la valeur (ex: "produits")
//   showValue — boolean (défaut true)
//   height    — hauteur de chaque barre en px (défaut 36)
//   animate   — boolean, animation width au montage (défaut true)

import { useEffect, useState } from 'react'

const STYLE_ID = 'barchart-kf'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes bar-grow { from { width: 0 } }
  `
  document.head.appendChild(s)
}

function Bar({ item, pct, unit, showValue, height, animate, delay }) {
  const [ready, setReady] = useState(!animate)
  useEffect(() => {
    if (!animate) return
    const t = setTimeout(() => setReady(true), delay)
    return () => clearTimeout(t)
  }, [animate, delay])

  return (
    <div style={S.row}>
      {/* Label */}
      <div style={S.labelCol}>
        {item.icon && <span style={S.icon}>{item.icon}</span>}
        <span style={S.labelText}>{item.label}</span>
      </div>

      {/* Bar track */}
      <div style={S.track}>
        <div
          style={{
            ...S.fill,
            width: ready ? `${pct}%` : '0%',
            background: item.color || '#2563EB',
            height,
            transition: animate ? `width .5s cubic-bezier(.4,0,.2,1) ${delay}ms` : 'none',
            minWidth: item.value > 0 ? 6 : 0,
          }}
        />
      </div>

      {/* Value */}
      {showValue && (
        <div style={S.valueCol}>
          <span style={{ ...S.value, color: item.color || '#0F172A' }}>{item.value}</span>
          {unit && <span style={S.unit}> {unit}</span>}
        </div>
      )}
    </div>
  )
}

export default function BarChart({ data = [], unit = '', showValue = true, height = 10, animate = true }) {
  if (data.length === 0) {
    return <div style={S.empty}>Aucune donnée</div>
  }

  const max = Math.max(...data.map(d => d.value), 1)

  return (
    <div style={S.chart}>
      {data.map((item, i) => (
        <Bar
          key={item.label}
          item={item}
          pct={Math.round((item.value / max) * 100)}
          unit={unit}
          showValue={showValue}
          height={height}
          animate={animate}
          delay={i * 60}
        />
      ))}
    </div>
  )
}

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const S = {
  chart: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontFamily: F,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  labelCol: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    width: 110,
    flexShrink: 0,
    minWidth: 0,
  },
  icon: {
    fontSize: 15,
    lineHeight: 1,
    flexShrink: 0,
  },
  labelText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  track: {
    flex: 1,
    background: '#F1F5F9',
    borderRadius: 99,
    overflow: 'hidden',
    height: 10,
    display: 'flex',
    alignItems: 'center',
  },
  fill: {
    borderRadius: 99,
    transition: 'width .5s cubic-bezier(.4,0,.2,1)',
  },
  valueCol: {
    width: 52,
    flexShrink: 0,
    textAlign: 'right',
  },
  value: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'DM Mono','JetBrains Mono',monospace",
  },
  unit: {
    fontSize: 11,
    color: '#94A3B8',
  },
  empty: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    padding: '16px 0',
    fontFamily: F,
  },
}
