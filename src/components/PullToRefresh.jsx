import { useRef, useState, useCallback } from 'react'

const THRESHOLD  = 72
const MAX_PULL   = 110
const RESISTANCE = 0.42

const STYLE_ID = 'ptr-keyframes'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = '@keyframes ptr-spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(s)
}

// status: 'idle' | 'pulling' | 'release' | 'refreshing'

export default function PullToRefresh({ onRefresh, children }) {
  const [status, setStatus] = useState('idle')
  const [pullY,  setPullY]  = useState(0)

  const containerRef = useRef(null)
  const startYRef    = useRef(null)   // null = gesture ignored
  const activeRef    = useRef(false)

  const onTouchStart = useCallback(e => {
    if (!containerRef.current) return
    // Only arm if already at very top of scroll container
    if (containerRef.current.scrollTop > 2) {
      startYRef.current = null
      return
    }
    startYRef.current = e.touches[0].clientY
    activeRef.current = false
  }, [])

  const onTouchMove = useCallback(e => {
    if (startYRef.current === null) return
    if (!containerRef.current) return

    const scrollTop = containerRef.current.scrollTop
    const deltaY    = e.touches[0].clientY - startYRef.current

    // Cancel if user scrolled down or is pulling up
    if (scrollTop > 2 || deltaY <= 0) {
      startYRef.current = null
      activeRef.current = false
      return
    }

    activeRef.current = true
    const visual = Math.min(deltaY * RESISTANCE, MAX_PULL)
    setPullY(visual)
    setStatus(visual >= THRESHOLD ? 'release' : 'pulling')

    if (deltaY > 0 && scrollTop <= 0) e.preventDefault()
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (!activeRef.current) return
    activeRef.current = false

    if (status === 'release') {
      setStatus('refreshing')
      setPullY(48)
      try { await onRefresh() } finally {
        setStatus('idle')
        setPullY(0)
      }
    } else {
      setStatus('idle')
      setPullY(0)
    }
    startYRef.current = null
  }, [status, onRefresh])

  const show   = status !== 'idle' || pullY > 0
  const passed = pullY >= THRESHOLD

  return (
    <div style={S.outer}>
      {/* Indicator — transparent, icon only */}
      <div style={{
        ...S.indicator,
        height:   show ? Math.max(pullY, status === 'refreshing' ? 48 : 0) : 0,
        opacity:  show ? 1 : 0,
        transition: (status === 'refreshing' || status === 'idle')
          ? 'height .25s ease, opacity .2s ease'
          : 'none',
      }}>
        {show && (
          <div style={S.inner}>
            {status === 'refreshing' ? (
              <span style={{ fontSize:20, color:'#2563EB', display:'inline-block', animation:'ptr-spin .8s linear infinite', lineHeight:1 }}>✦</span>
            ) : (
              <span style={{
                fontSize: 18, color: passed ? '#2563EB' : '#94A3B8',
                display: 'inline-block', lineHeight: 1,
                transition: 'transform .22s ease, color .18s ease',
                transform: passed ? 'rotate(180deg)' : 'none',
              }}>↓</span>
            )}
          </div>
        )}
      </div>

      {/* Scrollable area — this is the scroll container we track */}
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
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
    willChange: 'height',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    WebkitOverflowScrolling: 'touch',
    position: 'relative',
  },
}
