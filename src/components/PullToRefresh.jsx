import { useRef, useState, useCallback } from 'react'

const THRESHOLD  = 72   // px to trigger refresh
const MAX_PULL   = 110  // max visual pull distance
const RESISTANCE = 0.45 // friction factor

// Keyframes injected once
const STYLE_ID = 'ptr-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes ptr-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes ptr-fadein {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `
  document.head.appendChild(s)
}

// status: 'idle' | 'pulling' | 'release' | 'refreshing'

export default function PullToRefresh({ onRefresh, children }) {
  const [status,  setStatus]  = useState('idle')
  const [pullY,   setPullY]   = useState(0)

  const containerRef = useRef(null)
  const startYRef    = useRef(0)
  const startScrollRef = useRef(0)
  const activeRef    = useRef(false)

  const onTouchStart = useCallback(e => {
    if (!containerRef.current) return
    startYRef.current     = e.touches[0].clientY
    startScrollRef.current = containerRef.current.scrollTop
    activeRef.current     = false
  }, [])

  const onTouchMove = useCallback(e => {
    if (!containerRef.current) return
    const scrollTop = containerRef.current.scrollTop
    const deltaY    = e.touches[0].clientY - startYRef.current

    // Only activate when at very top and pulling down
    if (scrollTop > 2 || deltaY <= 0) {
      activeRef.current = false
      return
    }

    activeRef.current = true

    // Apply resistance
    const visual = Math.min(deltaY * RESISTANCE, MAX_PULL)
    setPullY(visual)

    if (visual >= THRESHOLD) {
      setStatus('release')
    } else {
      setStatus('pulling')
    }

    // Prevent native scroll bounce on iOS
    if (deltaY > 0 && scrollTop <= 0) {
      e.preventDefault()
    }
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (!activeRef.current) return

    if (status === 'release') {
      setStatus('refreshing')
      setPullY(52) // hold indicator open during refresh
      try {
        await onRefresh()
      } finally {
        setStatus('idle')
        setPullY(0)
      }
    } else {
      setStatus('idle')
      setPullY(0)
    }
    activeRef.current = false
  }, [status, onRefresh])

  const showIndicator = status !== 'idle' || pullY > 0
  const passed        = pullY >= THRESHOLD

  return (
    <div style={S.outer}>
      {/* Pull indicator */}
      <div
        style={{
          ...S.indicator,
          height: showIndicator ? Math.max(pullY, status === 'refreshing' ? 52 : 0) : 0,
          opacity: showIndicator ? 1 : 0,
          transition: status === 'refreshing' || status === 'idle'
            ? 'height .25s ease, opacity .2s ease'
            : 'none',
        }}
      >
        {showIndicator && (
          <div style={S.indicatorInner}>
            {status === 'refreshing' ? (
              <>
                <div style={S.spinner} />
                <span style={S.indicatorText}>Actualisation…</span>
              </>
            ) : (
              <>
                <div style={{
                  ...S.arrow,
                  transform: `rotate(${passed ? 180 : 0}deg)`,
                  color: passed ? '#2563EB' : '#94A3B8',
                }}>
                  ↓
                </div>
                <span style={{ ...S.indicatorText, color: passed ? '#2563EB' : '#64748B' }}>
                  {passed ? 'Relâcher pour actualiser' : 'Tirer pour actualiser'}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div
        ref={containerRef}
        style={S.scroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

const S = {
  outer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  indicator: {
    overflow: 'hidden',
    background: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    willChange: 'height',
  },
  indicatorInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    animation: 'ptr-fadein .15s ease',
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
  },
  arrow: {
    fontSize: 18,
    lineHeight: 1,
    transition: 'transform .2s ease, color .2s ease',
    display: 'block',
    userSelect: 'none',
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2.5px solid #E2E8F0',
    borderTopColor: '#2563EB',
    borderRadius: '50%',
    animation: 'ptr-spin .7s linear infinite',
    flexShrink: 0,
  },
  indicatorText: {
    fontSize: 13,
    fontWeight: 500,
    transition: 'color .2s ease',
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
  },
}
