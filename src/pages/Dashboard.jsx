import { dlcStatus } from '../constants'

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const critique = (item) => {
  const s = parseFloat(item.seuil_min)
  return isNaN(s) ? item.q <= 2 : item.q <= s
}

export default function Dashboard({ user, stock = [], scanLog = [], prixHist = [], fournisseurs = [], setPage, profile }) {
  const expired  = stock.filter(i => dlcStatus(i.dlc) === 'expired').length
  const critical = stock.filter(i => dlcStatus(i.dlc) === 'critical').length
  const ruptures = stock.filter(critique).length
  const hasAlert = expired > 0 || critical > 0 || ruptures > 0

  const recent = scanLog.slice(0, 3)

  const firstName = profile?.display_name
    || (profile?.name && profile.name !== 'Utilisateur' ? profile.name.split(' ')[0] : null)
    || (profile === null ? '…' : 'Chef')
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const dateStr  = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const dateLabel = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div style={S.page}>

      {/* ── 1. Header ── */}
      <div style={S.header}>
        <div style={S.greeting}>{greeting}, {firstName} 👋</div>
        <div style={S.date}>{dateLabel}</div>
      </div>

      {/* ── 2. Urgences du jour ── */}
      <div
        style={{
          ...S.card,
          borderLeft: `4px solid ${hasAlert ? '#EF4444' : '#10B981'}`,
          background:  hasAlert ? '#FFF8F8' : '#F0FDF4',
          cursor: hasAlert ? 'pointer' : 'default',
        }}
        onClick={() => hasAlert && setPage?.('stock')}
      >
        <div style={S.cardTitle}>Urgences du jour</div>

        {!hasAlert ? (
          <div style={S.allGood}>✅ Tout est bon pour aujourd'hui</div>
        ) : (
          <div style={S.badges}>
            {expired > 0 && (
              <button
                style={{ ...S.badge, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}
                onClick={e => { e.stopPropagation(); setPage?.('stock') }}
              >
                🚨 {expired} expiré{expired > 1 ? 's' : ''}
              </button>
            )}
            {critical > 0 && (
              <button
                style={{ ...S.badge, background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A' }}
                onClick={e => { e.stopPropagation(); setPage?.('etiquettes') }}
              >
                ⚠️ {critical} à consommer vite
              </button>
            )}
            {ruptures > 0 && (
              <button
                style={{ ...S.badge, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA' }}
                onClick={e => { e.stopPropagation(); setPage?.('stock') }}
              >
                📉 {ruptures} en rupture
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 3. Dernières réceptions ── */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Dernières réceptions</span>
          <button style={S.seeAll} onClick={() => setPage?.('reception')}>Voir tout →</button>
        </div>

        {recent.length === 0 ? (
          <div style={S.empty}>Aucune réception enregistrée.</div>
        ) : (
          <div style={S.recentList}>
            {recent.map(s => (
              <div key={s.id} style={S.recentRow}>
                <span style={S.recentIcon}>
                  {s.conf === 'conforme' ? '✅' : s.conf === 'non_conforme' ? '❌' : '⚠️'}
                </span>
                <span style={S.recentFour}>{s.four || 'Fournisseur'}</span>
                <span style={S.recentMeta}>{s.nb} pdt</span>
                {s.total != null && (
                  <span style={S.recentTotal}>{Number(s.total).toFixed(0)} €</span>
                )}
                <span style={S.recentDate}>{s.date_scan || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

const S = {
  page: {
    width:       '100%',
    overflowX:   'hidden',
    padding:     '16px 16px 80px',
    boxSizing:   'border-box',
    display:     'flex',
    flexDirection:'column',
    gap:          12,
    fontFamily:   F,
    maxWidth:     600,
    margin:       '0 auto',
  },
  header: {
    background:   '#fff',
    borderRadius:  16,
    padding:       '20px 20px',
    border:        '1px solid #F1F5F9',
    boxShadow:     '0 1px 4px rgba(0,0,0,.04)',
  },
  greeting: {
    fontSize:   24,
    fontWeight:  800,
    color:       '#0F172A',
    lineHeight:  1.2,
  },
  date: {
    fontSize:  13,
    color:     '#94A3B8',
    marginTop:  4,
    fontWeight: 400,
  },
  card: {
    width:        '100%',
    background:   '#fff',
    border:       '1px solid #E2E8F0',
    borderRadius:  16,
    padding:       '16px 18px',
    boxSizing:     'border-box',
    boxShadow:     '0 1px 4px rgba(0,0,0,.04)',
  },
  cardHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:    12,
  },
  cardTitle: {
    fontSize:      11,
    fontWeight:     700,
    color:          '#94A3B8',
    textTransform:  'uppercase',
    letterSpacing:  '.6px',
    marginBottom:    12,
  },
  allGood: {
    fontSize:   14,
    fontWeight:  600,
    color:       '#059669',
  },
  badges: {
    display:   'flex',
    flexWrap:  'wrap',
    gap:        8,
  },
  badge: {
    padding:    '7px 13px',
    borderRadius: 99,
    fontSize:   13,
    fontWeight:  600,
    cursor:     'pointer',
    fontFamily:  F,
  },
  seeAll: {
    fontSize:   12,
    fontWeight:  600,
    color:       '#2563EB',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    padding:     0,
    fontFamily:  F,
    flexShrink:  0,
  },
  recentList: {
    display:       'flex',
    flexDirection: 'column',
    gap:            10,
  },
  recentRow: {
    display:    'flex',
    alignItems: 'center',
    gap:         8,
    overflow:   'hidden',
  },
  recentIcon: {
    fontSize:   16,
    flexShrink:  0,
  },
  recentFour: {
    flex:         1,
    fontSize:     13.5,
    fontWeight:    600,
    color:         '#0F172A',
    overflow:     'hidden',
    textOverflow: 'ellipsis',
    whiteSpace:   'nowrap',
  },
  recentMeta: {
    fontSize:  12,
    color:     '#94A3B8',
    flexShrink: 0,
  },
  recentTotal: {
    fontSize:   13,
    fontWeight:  700,
    color:       '#0F172A',
    fontFamily: "'DM Mono',monospace",
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
