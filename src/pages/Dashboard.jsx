import { useMemo } from 'react'
import { CAT_ICON, CAT_COLOR, dlcStatus, dlcDays, fdate } from '../constants'

const critique = (item) => {
  const s = parseFloat(item.seuil_min)
  return isNaN(s) ? item.q <= 2 : item.q <= s
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, sub, onClick }) {
  return (
    <button style={{ ...S.kpi, borderTop: `3px solid ${color}` }} onClick={onClick}>
      <div style={{ ...S.kpiIcon, background: `${color}15`, color }}>{icon}</div>
      <div style={S.kpiRight}>
        <div style={{ ...S.kpiValue, color }}>{value}</div>
        <div style={S.kpiLabel}>{label}</div>
        {sub && <div style={S.kpiSub}>{sub}</div>}
      </div>
    </button>
  )
}

// ── DLC Status Cell ───────────────────────────────────────────────────────────

function DlcCell({ label, count, color, bg }) {
  return (
    <div style={{ ...S.dlcCell, background: bg, borderColor: `${color}33` }}>
      <div style={{ ...S.dlcCount, color }}>{count}</div>
      <div style={S.dlcLabel}>{label}</div>
    </div>
  )
}

// ── Bar Chart ─────────────────────────────────────────────────────────────────

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={S.chart}>
      {data.map(({ cat, count }) => (
        <div key={cat} style={S.bar}>
          <div style={S.barTrack}>
            <div style={{
              ...S.barFill,
              height: `${Math.round((count / max) * 100)}%`,
              background: CAT_COLOR[cat] || '#94A3B8',
            }} />
          </div>
          <div style={S.barIcon}>{CAT_ICON[cat] || '📦'}</div>
          <div style={S.barCount}>{count}</div>
        </div>
      ))}
    </div>
  )
}

// ── Alert Row ─────────────────────────────────────────────────────────────────

function AlertRow({ icon, text, color, bg }) {
  return (
    <div style={{ ...S.alertRow, background: bg, borderLeft: `3px solid ${color}` }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ ...S.alertText, color }}>{text}</span>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard({ user, stock = [], scanLog = [], prixHist = [], fournisseurs = [], setPage, profile }) {
  const stats = useMemo(() => {
    const byStatus = { ok: 0, warn: 0, critical: 0, expired: 0, unknown: 0 }
    stock.forEach(i => { byStatus[dlcStatus(i.dlc)] = (byStatus[dlcStatus(i.dlc)] || 0) + 1 })

    const byCat = {}
    stock.forEach(i => { byCat[i.cat || 'autre'] = (byCat[i.cat || 'autre'] || 0) + 1 })
    const catData = Object.entries(byCat)
      .map(([cat, count]) => ({ cat, count }))
      .sort((a, b) => b.count - a.count)

    const critiques = stock.filter(critique)
    const dlcAlerts = stock.filter(i => ['critical','expired'].includes(dlcStatus(i.dlc)))

    const prixAlerts = []
    const byProd = {}
    prixHist.forEach(p => {
      if (!byProd[p.prod]) byProd[p.prod] = []
      byProd[p.prod].push(p)
    })
    Object.entries(byProd).forEach(([prod, prix]) => {
      if (prix.length >= 2) {
        const sorted = [...prix].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
        const last = sorted[0].px, prev = sorted[1].px
        if (last > prev * 1.1) prixAlerts.push({ prod, last, prev, four: sorted[0].four })
      }
    })

    return { byStatus, catData, critiques, dlcAlerts, prixAlerts }
  }, [stock, prixHist])

  const recent = [...scanLog].slice(0, 5)

  const rawName   = profile?.display_name || (profile?.name && profile.name !== 'Utilisateur' ? profile.name : null) || null
  const firstName = rawName?.split(' ')[0] || (profile === null ? '…' : 'Chef')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div style={S.page}>
      {/* Hero */}
      <div style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroDot} />
          <div style={S.heroContent}>
            <div style={S.heroGreeting}>{greeting}, {firstName} 👋</div>
            <div style={S.heroSub}>Voici votre cuisine aujourd'hui — {fdate()}</div>
            <div style={S.heroStats}>
              <div style={S.heroStat}>
                <span style={S.heroStatVal}>{stock.length}</span>
                <span style={S.heroStatLbl}>produits</span>
              </div>
              <div style={S.heroStatDivider} />
              <div style={S.heroStat}>
                <span style={{ ...S.heroStatVal, color: stats.dlcAlerts.length > 0 ? '#FCA5A5' : '#86EFAC' }}>{stats.dlcAlerts.length}</span>
                <span style={S.heroStatLbl}>alertes DLC</span>
              </div>
              <div style={S.heroStatDivider} />
              <div style={S.heroStat}>
                <span style={{ ...S.heroStatVal, color: stats.critiques.length > 0 ? '#FCD34D' : '#86EFAC' }}>{stats.critiques.length}</span>
                <span style={S.heroStatLbl}>à commander</span>
              </div>
            </div>
          </div>
          <div style={S.heroOrb}>✦</div>
        </div>
      </div>

      {/* Mode Kiosque */}
      <button onClick={() => window.open(`/kiosque?id=${user?.id}`, '_blank')} style={S.kioskBtn}>
        <span style={{ fontSize:22 }}>🖥️</span>
        <div style={{ flex:1, textAlign:'left' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1D4ED8' }}>Mode Kiosque</div>
          <div style={{ fontSize:12, color:'#3B82F6', marginTop:1 }}>Affichage public des allergènes</div>
        </div>
        <span style={{ fontSize:14, color:'#2563EB' }}>→</span>
      </button>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        <KpiCard label="En stock" value={stock.length} icon="📦" color="#2563EB"
          sub={`${Object.keys(Object.fromEntries(stock.map(i => [i.cat, 1]))).length} catégories`}
          onClick={() => setPage?.('stock')} />
        <KpiCard label="Alertes DLC" value={stats.dlcAlerts.length} icon="⚠️" color="#EF4444"
          sub={stats.byStatus.expired > 0 ? `${stats.byStatus.expired} expirés` : 'Aucun expiré'}
          onClick={() => setPage?.('stock')} />
        <KpiCard label="À commander" value={stats.critiques.length} icon="🛒" color="#F59E0B"
          sub="Sous seuil minimum"
          onClick={() => setPage?.('commandes')} />
        <KpiCard label="Scans" value={scanLog.length} icon="📷" color="#10B981"
          sub={scanLog.length > 0 ? `Dernier : ${scanLog[0]?.date_scan || '—'}` : 'Aucun scan'}
          onClick={() => setPage?.('reception')} />
      </div>

      {/* DLC Grid + Alerts */}
      <div style={S.midRow}>
        <div style={S.card}>
          <div style={S.cardTitle}>Statuts DLC</div>
          <div style={S.dlcGrid}>
            <DlcCell label="OK" count={stats.byStatus.ok} color="#10B981" bg="#ECFDF5" />
            <DlcCell label="J-7" count={stats.byStatus.warn} color="#F59E0B" bg="#FFFBEB" />
            <DlcCell label="J-3" count={stats.byStatus.critical} color="#EF4444" bg="#FEF2F2" />
            <DlcCell label="Expirés" count={stats.byStatus.expired} color="#7F1D1D" bg="#FEF2F2" />
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Alertes prioritaires</div>
          {stats.dlcAlerts.length === 0 && stats.critiques.length === 0 && stats.prixAlerts.length === 0 ? (
            <div style={S.empty}>✅ Aucune alerte</div>
          ) : (
            <div style={S.alertList}>
              {stats.byStatus.expired > 0 && (
                <AlertRow icon="🚨" color="#EF4444" bg="#FEF2F2"
                  text={`${stats.byStatus.expired} produit(s) expiré(s) — à retirer du stock`} />
              )}
              {stats.byStatus.critical > 0 && (
                <AlertRow icon="⚠️" color="#F59E0B" bg="#FFFBEB"
                  text={`${stats.byStatus.critical} produit(s) DLC J-3 ou moins`} />
              )}
              {stats.critiques.map(i => (
                <AlertRow key={i.id} icon="📉" color="#6366F1" bg="#EEF2FF"
                  text={`${i.nom} : stock bas (${i.q} ${i.u})`} />
              )).slice(0, 3)}
              {stats.prixAlerts.map(a => (
                <AlertRow key={a.prod} icon="💸" color="#F59E0B" bg="#FFFBEB"
                  text={`${a.prod} : hausse de prix chez ${a.four} (+${Math.round((a.last/a.prev - 1)*100)}%)`} />
              )).slice(0, 2)}
            </div>
          )}
        </div>
      </div>

      {/* Bar chart + Recent receptions */}
      <div style={S.bottomRow}>
        <div style={S.card}>
          <div style={S.cardTitle}>Stock par catégorie</div>
          {stats.catData.length === 0
            ? <div style={S.empty}>Aucun produit en stock</div>
            : <BarChart data={stats.catData} />
          }
        </div>

        <div style={S.card}>
          <div style={S.cardTitle}>Dernières réceptions</div>
          {recent.length === 0
            ? <div style={S.empty}>Aucune réception</div>
            : (
              <div style={S.recentList}>
                {recent.map(s => (
                  <div key={s.id} style={S.recentRow}>
                    <div style={{
                      ...S.recentBadge,
                      background: s.conf === 'conforme' ? '#ECFDF5' : s.conf === 'non_conforme' ? '#FEF2F2' : '#FFFBEB',
                      color: s.conf === 'conforme' ? '#10B981' : s.conf === 'non_conforme' ? '#EF4444' : '#F59E0B',
                    }}>
                      {s.conf === 'conforme' ? '✓' : s.conf === 'non_conforme' ? '✗' : '?'}
                    </div>
                    <div style={S.recentInfo}>
                      <div style={S.recentFour}>{s.four || 'Fournisseur inconnu'}</div>
                      <div style={S.recentMeta}>{s.date_scan} · {s.nb} produit{s.nb !== 1 ? 's' : ''}</div>
                    </div>
                    {s.total != null && (
                      <div style={S.recentTotal}>{Number(s.total).toFixed(2)} €</div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const S = {
  page: { padding: 24, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: F, maxWidth: 1200, margin: '0 auto' },

  hero: {
    background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 45%, #3B82F6 100%)',
    borderRadius: 20,
    padding: '28px 28px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(37,99,235,.35), 0 2px 8px rgba(37,99,235,.2)',
  },
  heroInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 },
  heroDot: {
    position: 'absolute', inset: 0, zIndex: 0,
    background: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,.08) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  heroContent: { display: 'flex', flexDirection: 'column', gap: 6 },
  heroGreeting: { fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,.72)', fontWeight: 400 },
  heroStats: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 },
  heroStat: { display: 'flex', flexDirection: 'column', gap: 1 },
  heroStatVal: { fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'DM Mono',monospace", lineHeight: 1 },
  heroStatLbl: { fontSize: 11, color: 'rgba(255,255,255,.65)', fontWeight: 500 },
  heroStatDivider: { width: 1, height: 32, background: 'rgba(255,255,255,.2)', borderRadius: 1 },
  heroOrb: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(255,255,255,.15)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, color: '#fff',
    flexShrink: 0,
    border: '1.5px solid rgba(255,255,255,.25)',
  },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 },
  kpi: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '16px 18px',
    borderRadius: 16,
    cursor: 'pointer',
    border: 'none',
    borderTop: '3px solid',
    textAlign: 'left',
    background: '#fff',
    boxShadow: '0 2px 12px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)',
    transition: 'transform .15s, box-shadow .15s',
    fontFamily: F,
  },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  kpiRight: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  kpiValue: { fontSize: 26, fontWeight: 800, lineHeight: 1, fontFamily: "'DM Mono',monospace" },
  kpiLabel: { fontSize: 12, fontWeight: 500, color: '#475569' },
  kpiSub:   { fontSize: 11, color: '#94A3B8' },

  midRow:    { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 14 },
  bottomRow: { display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 14 },

  card: {
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    padding: '18px 20px',
    boxShadow: '0 2px 12px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)',
  },
  cardTitle: { fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.6px' },

  dlcGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  dlcCell: { borderRadius: 12, padding: '12px 14px', border: '1px solid', textAlign: 'center' },
  dlcCount: { fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono',monospace", lineHeight: 1 },
  dlcLabel: { fontSize: 11, color: '#64748B', fontWeight: 500, marginTop: 2 },

  alertList: { display: 'flex', flexDirection: 'column', gap: 8 },
  alertRow:  { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: '0 10px 10px 0' },
  alertText: { fontSize: 12.5, fontWeight: 500, lineHeight: 1.3 },

  chart: { display: 'flex', alignItems: 'flex-end', gap: 10, height: 100, paddingBottom: 4 },
  bar:   { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', background: '#F1F5F9', borderRadius: '8px 8px 0 0', overflow: 'hidden' },
  barFill:  { width: '100%', borderRadius: '8px 8px 0 0', transition: 'height .4s ease', minHeight: 4 },
  barIcon:  { fontSize: 16 },
  barCount: { fontSize: 11, color: '#64748B', fontWeight: 600 },

  recentList: { display: 'flex', flexDirection: 'column', gap: 10 },
  recentRow:  { display: 'flex', alignItems: 'center', gap: 12 },
  recentBadge: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  recentInfo: { flex: 1, minWidth: 0 },
  recentFour: { fontSize: 13, fontWeight: 600, color: '#0F172A' },
  recentMeta: { fontSize: 11.5, color: '#94A3B8' },
  recentTotal: { fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: "'DM Mono',monospace" },

  empty: { color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' },

  kioskBtn: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
    border: '1.5px solid #BFDBFE',
    background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)',
    fontFamily: F, width: '100%',
    boxShadow: '0 2px 8px rgba(37,99,235,.1)',
  },
}
