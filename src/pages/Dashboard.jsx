import { useState, useEffect } from 'react'
import { dlcStatus } from '../constants'

const F  = "'Plus Jakarta Sans','Inter',sans-serif"
const FM = "'DM Mono','JetBrains Mono',monospace"

const critique = (item) => {
  const s = parseFloat(item.seuil_min)
  return isNaN(s) ? item.q <= 2 : item.q <= s
}

const AVATAR_COLORS = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EC4899','#0EA5E9','#F97316']
function fourColor(nom) {
  let n = 0
  for (const c of (nom || '')) n += c.charCodeAt(0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

// ── Typing dots ────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center', height:22 }}>
      {[0,1,2].map(i => (
        <div
          key={i}
          style={{
            width:8, height:8, borderRadius:'50%',
            background:'#2563EB',
            animation:`aria-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ user, stock = [], scanLog = [], prixHist = [], fournisseurs = [], setPage, profile }) {
  const [ariaMsg,     setAriaMsg]     = useState('')
  const [ariaLoading, setAriaLoading] = useState(true)

  // Stats
  const expired  = stock.filter(i => dlcStatus(i.dlc) === 'expired').length
  const critical = stock.filter(i => dlcStatus(i.dlc) === 'critical').length
  const ruptures = stock.filter(critique).length
  const allGood  = expired === 0 && critical === 0 && ruptures === 0
  const lastScan = scanLog[0]
  const recent   = scanLog.slice(0, 3)

  // Identity
  const prenom = profile?.display_name?.split(' ')[0]
    || (profile?.name && profile.name !== 'Utilisateur' ? profile.name.split(' ')[0] : null)
    || (profile === null ? '…' : null)

  const hour      = new Date().getHours()
  const greeting  = hour < 18 ? 'Bonjour' : 'Bonsoir'
  const dateStr   = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const dateLabel = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  // Aria message du jour (once per session)
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    fetch('/api/aria-summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expired,
        critical,
        ruptures,
        lastScan: lastScan ? { four: lastScan.four, date: lastScan.date_scan } : null,
      }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (!cancelled) { setAriaMsg(d.reply || ''); setAriaLoading(false) } })
      .catch(() => { if (!cancelled) { setAriaMsg('Bonne journée de service ! Vos données sont à jour.'); setAriaLoading(false) } })
    return () => { cancelled = true }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Shortcuts
  const shortcuts = [
    { k:'stock',      label:'Stock',      emoji:'📦', bg:'#EFF6FF', color:'#2563EB' },
    { k:'reception',  label:'Réceptions', emoji:'🚚', bg:'#F0FDF4', color:'#16A34A' },
    { k:'etiquettes', label:'DLC',        emoji:'🏷️', bg:'#FFF7ED', color:'#F97316' },
    { k:'commandes',  label:'Commandes',  emoji:'🛒', bg:'#FDF4FF', color:'#9333EA' },
  ]

  return (
    <>
      <style>{`
        @keyframes aria-dot {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.35; }
          40%            { transform: scale(1);    opacity: 1;    }
        }
        *, *::before, *::after { box-sizing: border-box; }
      `}</style>

      <div style={S.page}>

        {/* ── 1. Header dégradé ── */}
        <div style={S.hero}>
          <div style={S.heroRow}>
            <div>
              <div style={S.heroGreeting}>
                {greeting}{prenom ? `, ${prenom}` : ''} 👋
              </div>
              <div style={S.heroDate}>{dateLabel}</div>
            </div>
            <div style={S.heroOrb}>✦</div>
          </div>
        </div>

        {/* ── 2. Aria message du jour ── */}
        <div style={S.ariaCard}>
          <div style={S.ariaHeader}>
            <div style={S.ariaAvatar}>✦</div>
            <div>
              <div style={S.ariaName}>Aria</div>
              <div style={S.ariaSub}>Intelligence cuisine</div>
            </div>
          </div>
          {ariaLoading
            ? <TypingDots />
            : <div style={S.ariaText}>{ariaMsg}</div>
          }
        </div>

        {/* ── 3. Urgences du jour ── */}
        <div style={S.card}>
          <div style={S.cardTitle}>Urgences du jour</div>

          {allGood ? (
            <div style={S.allGood}>✅ Tout est bon pour aujourd'hui !</div>
          ) : (
            <div style={S.badges}>
              {/* Expirés */}
              <button
                style={{
                  ...S.badge,
                  background:  expired > 0 ? '#FEF2F2' : '#F0FDF4',
                  color:       expired > 0 ? '#EF4444' : '#16A34A',
                  borderColor: expired > 0 ? '#FECACA' : '#BBF7D0',
                }}
                onClick={() => setPage?.('stock')}
              >
                {expired > 0 ? '⚠️' : '✅'} {expired > 0 ? `${expired} expiré${expired > 1 ? 's' : ''}` : 'Expirés OK'}
              </button>

              {/* J-3 */}
              <button
                style={{
                  ...S.badge,
                  background:  critical > 0 ? '#FFF7ED' : '#F0FDF4',
                  color:       critical > 0 ? '#F97316' : '#16A34A',
                  borderColor: critical > 0 ? '#FED7AA' : '#BBF7D0',
                }}
                onClick={() => setPage?.('etiquettes')}
              >
                {critical > 0 ? '🕐' : '✅'} {critical > 0 ? `${critical} J-3` : 'DLC OK'}
              </button>

              {/* Ruptures */}
              <button
                style={{
                  ...S.badge,
                  background:  ruptures > 0 ? '#FEF2F2' : '#F0FDF4',
                  color:       ruptures > 0 ? '#DC2626' : '#16A34A',
                  borderColor: ruptures > 0 ? '#FECACA' : '#BBF7D0',
                }}
                onClick={() => setPage?.('stock')}
              >
                {ruptures > 0 ? '📦' : '✅'} {ruptures > 0 ? `${ruptures} rupture${ruptures > 1 ? 's' : ''}` : 'Stock OK'}
              </button>
            </div>
          )}
        </div>

        {/* ── 4. Raccourcis rapides ── */}
        <div style={S.card}>
          <div style={S.cardTitle}>Accès rapide</div>
          <div style={S.shortcuts}>
            {shortcuts.map(s => (
              <button key={s.k} style={S.shortcutBtn} onClick={() => setPage?.(s.k)}>
                <div style={{ ...S.shortcutIcon, background: s.bg }}>
                  <span style={{ fontSize:26 }}>{s.emoji}</span>
                </div>
                <span style={{ ...S.shortcutLabel, color: s.color }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. Dernières réceptions ── */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Dernières réceptions</span>
            <button style={S.seeAll} onClick={() => setPage?.('reception')}>Voir tout →</button>
          </div>

          {recent.length === 0 ? (
            <div style={S.empty}>Aucune réception enregistrée.</div>
          ) : (
            <div>
              {recent.map((s, idx) => {
                const col = fourColor(s.four)
                return (
                  <div
                    key={s.id}
                    style={{
                      ...S.recentRow,
                      borderBottom:  idx < recent.length - 1 ? '1px solid #F1F5F9' : 'none',
                      paddingBottom: idx < recent.length - 1 ? 10 : 0,
                      marginBottom:  idx < recent.length - 1 ? 10 : 0,
                    }}
                  >
                    <div style={{ ...S.recentAvatar, background:`${col}1A`, color:col }}>
                      {(s.four || 'F').charAt(0).toUpperCase()}
                    </div>
                    <span style={S.recentFour}>{s.four || 'Fournisseur'}</span>
                    <span style={S.recentNb}>{s.nb} pdt</span>
                    {s.total != null && (
                      <span style={S.recentTotal}>{Number(s.total).toFixed(0)} €</span>
                    )}
                    <span style={S.recentDate}>{s.date_scan || ''}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    display:       'flex',
    flexDirection: 'column',
    gap:            12,
    padding:        '16px 16px 80px',
    overflowX:     'hidden',
    boxSizing:     'border-box',
    width:         '100%',
    maxWidth:       600,
    margin:        '0 auto',
    fontFamily:     F,
  },

  // ── Hero ──
  hero: {
    background:   'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
    borderRadius:  20,
    padding:       24,
    boxSizing:    'border-box',
    boxShadow:    '0 4px 20px rgba(37,99,235,.3)',
  },
  heroRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    gap:             12,
  },
  heroGreeting: {
    fontSize:   24,
    fontWeight:  800,
    color:       '#fff',
    lineHeight:  1.25,
  },
  heroDate: {
    fontSize:   13,
    color:      'rgba(255,255,255,.75)',
    marginTop:   5,
    fontWeight:  400,
  },
  heroOrb: {
    width:          44,
    height:         44,
    borderRadius:  '50%',
    background:    'rgba(255,255,255,.18)',
    border:        '1.5px solid rgba(255,255,255,.3)',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    fontSize:       20,
    color:          '#fff',
    flexShrink:     0,
  },

  // ── Aria card ──
  ariaCard: {
    background:   '#fff',
    border:       '1px solid #E2E8F0',
    borderLeft:   '4px solid #2563EB',
    borderRadius:  16,
    padding:       16,
    boxSizing:    'border-box',
    boxShadow:    '0 2px 12px rgba(37,99,235,.08)',
  },
  ariaHeader: {
    display:    'flex',
    alignItems: 'center',
    gap:         10,
    marginBottom:10,
  },
  ariaAvatar: {
    width:          32,
    height:         32,
    borderRadius:  '50%',
    background:    '#2563EB',
    color:          '#fff',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    fontSize:       15,
    fontWeight:     700,
    flexShrink:     0,
  },
  ariaName: {
    fontSize:  14,
    fontWeight: 700,
    color:     '#2563EB',
    lineHeight: 1.2,
  },
  ariaSub: {
    fontSize:  11.5,
    color:     '#94A3B8',
    marginTop:  1,
  },
  ariaText: {
    fontSize:   14,
    color:      '#334155',
    lineHeight: 1.65,
  },

  // ── Generic card ──
  card: {
    background:   '#fff',
    border:       '1px solid #E2E8F0',
    borderRadius:  16,
    padding:       16,
    boxSizing:    'border-box',
    boxShadow:    '0 2px 12px rgba(0,0,0,.05)',
    width:        '100%',
  },
  cardTitle: {
    fontSize:      11,
    fontWeight:     700,
    color:          '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: '.6px',
    marginBottom:   12,
    display:       'block',
  },
  cardHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:    12,
  },

  // ── Urgences ──
  allGood: {
    fontSize:     14,
    fontWeight:    600,
    color:         '#16A34A',
    background:   '#F0FDF4',
    padding:       '10px 14px',
    borderRadius:  10,
    textAlign:    'center',
  },
  badges: {
    display:  'flex',
    flexWrap: 'wrap',
    gap:       8,
  },
  badge: {
    padding:      '7px 13px',
    borderRadius:  99,
    fontSize:      13,
    fontWeight:     600,
    cursor:        'pointer',
    fontFamily:     F,
    border:        '1px solid',
    background:    'none',
  },

  // ── Shortcuts ──
  shortcuts: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                  10,
  },
  shortcutBtn: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:             8,
    padding:         14,
    borderRadius:    16,
    border:         '1px solid #F1F5F9',
    background:     '#FAFAFA',
    cursor:         'pointer',
    fontFamily:      F,
  },
  shortcutIcon: {
    width:          56,
    height:         56,
    borderRadius:  '50%',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
  },
  shortcutLabel: {
    fontSize:  12,
    fontWeight: 600,
    textAlign: 'center',
  },

  // ── See all ──
  seeAll: {
    fontSize:  12,
    fontWeight: 600,
    color:     '#2563EB',
    background:'none',
    border:    'none',
    cursor:    'pointer',
    padding:    0,
    fontFamily: F,
    flexShrink: 0,
  },

  // ── Recent list ──
  recentRow: {
    display:    'flex',
    alignItems: 'center',
    gap:         10,
    overflow:   'hidden',
  },
  recentAvatar: {
    width:          36,
    height:         36,
    borderRadius:  '50%',
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    fontSize:       15,
    fontWeight:     700,
    flexShrink:     0,
  },
  recentFour: {
    flex:         1,
    fontSize:     13.5,
    fontWeight:    500,
    color:         '#0F172A',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  recentNb: {
    fontSize:  12,
    color:     '#94A3B8',
    flexShrink: 0,
  },
  recentTotal: {
    fontSize:   13,
    fontWeight:  700,
    color:       '#2563EB',
    fontFamily:  FM,
    flexShrink:  0,
  },
  recentDate: {
    fontSize:   11.5,
    color:      '#94A3B8',
    flexShrink:  0,
    whiteSpace: 'nowrap',
  },

  empty: {
    color:     '#94A3B8',
    fontSize:   13,
    textAlign: 'center',
    padding:   '12px 0',
  },
}
