// Props:
//   dlc  — string "JJ/MM/AAAA" ou null
//   size — 'sm' | 'md' (défaut 'md')
//   showIcon — boolean (défaut true)

import { dlcStatus, dlcDays, dlcColor } from '../../constants'

const LABELS = {
  ok:      (n) => 'OK',
  warn:    (n) => `J-${n}`,
  critical:(n) => `J-${n}`,
  expired: (n) => 'Expiré',
  unknown: (n) => '—',
}

const ICONS = {
  ok:       '✓',
  warn:     '⚠',
  critical: '⚠',
  expired:  '✕',
  unknown:  '—',
}

export default function DlcPill({ dlc, size = 'md', showIcon = true }) {
  if (!dlc) return null

  const st    = dlcStatus(dlc)
  const n     = dlcDays(dlc)
  const color = dlcColor(st)
  const label = LABELS[st]?.(n) ?? '—'
  const icon  = ICONS[st]

  const sm = size === 'sm'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sm ? 3 : 4,
        padding: sm ? '2px 7px' : '3px 9px',
        borderRadius: 99,
        background: `${color}16`,
        color,
        border: `1px solid ${color}30`,
        fontSize: sm ? 10 : 11.5,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        fontFamily: "'DM Sans','Inter',sans-serif",
      }}
    >
      {showIcon && (
        <span style={{ fontSize: sm ? 9 : 11, lineHeight: 1 }}>{icon}</span>
      )}
      {label}
    </span>
  )
}
