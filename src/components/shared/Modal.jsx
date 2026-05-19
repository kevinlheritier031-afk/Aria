// Modal réutilisable — bottom sheet sur mobile, dialog centré sur desktop
//
// Props:
//   open      — boolean
//   onClose   — callback fermeture
//   title     — string
//   children  — contenu principal
//   footer    — node JSX optionnel (boutons d'action)
//   maxWidth  — px (défaut 520)
//   noPadding — boolean (défaut false) — retire le padding du body

import { useEffect } from 'react'

const STYLE_ID = 'modal-shared-kf'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes modal-fade    { from{opacity:0}            to{opacity:1}           }
    @keyframes modal-sheet   { from{transform:translateY(100%)} to{transform:translateY(0)} }
    @keyframes modal-scale   { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }

    @media (min-width: 640px) {
      .modal-shared-inner {
        border-radius: 18px !important;
        animation: modal-scale .18s cubic-bezier(.4,0,.2,1) !important;
        bottom: auto !important;
        max-height: 85vh !important;
      }
    }
  `
  document.head.appendChild(s)
}

export default function Modal({ open, onClose, title, children, footer, maxWidth = 520, noPadding = false }) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={S.backdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        className="modal-shared-inner"
        style={{ ...S.sheet, maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle — mobile only */}
        <div style={S.handle} aria-hidden="true" />

        {/* Header */}
        <div style={S.header}>
          <h2 style={S.title}>{title}</h2>
          <button
            style={S.closeBtn}
            onClick={onClose}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ ...S.body, ...(noPadding ? { padding: 0 } : {}) }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={S.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.45)',
    backdropFilter: 'blur(3px)',
    WebkitBackdropFilter: 'blur(3px)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    fontFamily: F,
    animation: 'modal-fade .18s ease',
  },
  sheet: {
    background: '#ffffff',
    borderRadius: '20px 20px 0 0',
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 -8px 40px rgba(15,23,42,.18)',
    animation: 'modal-sheet .22s cubic-bezier(.4,0,.2,1)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    position: 'relative',
    bottom: 0,
  },
  handle: {
    width: 36,
    height: 4,
    background: '#E2E8F0',
    borderRadius: 99,
    margin: '12px auto 0',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 14px',
    borderBottom: '1px solid #F1F5F9',
    flexShrink: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0F172A',
    margin: 0,
    lineHeight: 1.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    border: 'none',
    background: '#F1F5F9',
    borderRadius: '50%',
    cursor: 'pointer',
    color: '#94A3B8',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontFamily: F,
    transition: 'background .15s, color .15s',
  },
  body: {
    padding: '18px 20px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  footer: {
    padding: '14px 20px',
    borderTop: '1px solid #F1F5F9',
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
}
