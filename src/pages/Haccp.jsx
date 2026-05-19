import { useState, useEffect } from 'react'
import { fetchTemperatures, insertTemperature } from '../lib/supabase'
import { uid, fdate, ftime } from '../constants'

const ZONES = [
  { k:'frigo',           l:'Réfrigération',       icon:'🧊', norm:'≤ 4°C',          check: v => v <= 4,  min:-30, max:30  },
  { k:'etuve',           l:'Étuve / Bain-marie',  icon:'♨️', norm:'≥ 63°C',         check: v => v >= 63, min:30,  max:120 },
  { k:'reception',       l:'Réception froide',    icon:'📦', norm:'≤ 8°C',           check: v => v <= 8,  min:-30, max:30  },
  { k:'refroidissement', l:'Refroidissement',     icon:'❄️', norm:'≤ 10°C en < 2h', check: v => v <= 10, min:-30, max:40  },
  { k:'plat_chaud',      l:'Plat chaud (service)',icon:'🍽️', norm:'≥ 63°C',         check: v => v >= 63, min:30,  max:120 },
]

const TABS = [
  { k:'temperatures', l:'Températures', emoji:'🌡️' },
  { k:'nettoyage',    l:'Nettoyage',    emoji:'🧹'  },
  { k:'rapports',     l:'Rapports',     emoji:'📊'  },
]

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const S = {
  page:       { padding:20, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:800, margin:'0 auto' },
  backBtn:    { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F },
  title:      { fontSize:22, fontWeight:700, color:'#0F172A', margin:0 },

  tabs:       { display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3 },
  tab:        { flex:1, padding:'8px 6px', border:'none', background:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:5 },
  tabActive:  { background:'#fff', color:'#0F172A', boxShadow:'0 1px 3px rgba(0,0,0,.08)' },

  kpiRow:     { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 },
  kpi:        { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4, alignItems:'center' },
  kpiNum:     { fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace" },
  kpiLabel:   { fontSize:11, color:'#64748B', fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' },

  card:       { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 20px' },
  cardTitle:  { fontSize:12, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 },

  zoneGrid:   { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16 },
  zoneBtn:    { display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 8px', border:'1.5px solid #E2E8F0', borderRadius:10, background:'#F8FAFC', cursor:'pointer', fontFamily:F, transition:'all .15s' },
  zoneBtnAct: { borderColor:'#2563EB', background:'#EFF6FF' },

  tempRow:    { display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' },
  tempInput:  { fontSize:32, fontWeight:800, width:100, border:'2px solid #E2E8F0', borderRadius:12, padding:'10px 14px', fontFamily:"'DM Mono',monospace", color:'#0F172A', background:'#F8FAFC', outline:'none', textAlign:'center', boxSizing:'border-box' },
  tempUnit:   { fontSize:22, fontWeight:700, color:'#64748B' },

  input:      { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:13.5, fontFamily:F, background:'#F8FAFC', outline:'none', boxSizing:'border-box', color:'#0F172A' },
  saveBtn:    { width:'100%', padding:'12px', background:'#2563EB', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F },

  relRow:     { display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid #F8FAFC' },
  relInfo:    { flex:1, minWidth:0 },
  relZone:    { fontSize:13.5, fontWeight:600, color:'#0F172A' },
  relMeta:    { fontSize:11.5, color:'#94A3B8' },
  relNote:    { fontSize:11.5, color:'#64748B', fontStyle:'italic', marginTop:1 },
  relRight:   { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 },

  scanRow:    { display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F8FAFC' },
  scanDot:    { width:10, height:10, borderRadius:'50%', flexShrink:0 },
  scanInfo:   { flex:1 },
  scanFour:   { fontSize:13.5, fontWeight:600, color:'#0F172A' },
  scanMeta:   { fontSize:11.5, color:'#94A3B8' },
  scanTotal:  { fontSize:13, fontWeight:700, color:'#0F172A', fontFamily:"'DM Mono',monospace", flexShrink:0 },

  empty:      { color:'#94A3B8', textAlign:'center', padding:'30px 0', fontSize:13 },
  badge:      { fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:99, display:'inline-flex', alignItems:'center' },
  btn:        { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', border:'none', fontFamily:F },
  btnSm:      { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 12px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', border:'none', fontFamily:F },
}

// ── Conformité indicator ───────────────────────────────────────────────────────

function TempIndicator({ value, zone }) {
  if (value === '' || isNaN(Number(value))) return null
  const v = Number(value)
  const ok = zone.check(v)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, flex:1, background: ok ? '#ECFDF5' : '#FEF2F2', border:`1px solid ${ok ? '#A7F3D0' : '#FECACA'}` }}>
      <span style={{ fontSize:20 }}>{ok ? '✅' : '⚠️'}</span>
      <div>
        <div style={{ fontSize:15, fontWeight:700, color: ok ? '#059669' : '#DC2626' }}>{v} °C</div>
        <div style={{ fontSize:12, color: ok ? '#059669' : '#DC2626' }}>
          {ok ? 'Conforme' : 'Non conforme'} — norme : {zone.norm}
        </div>
      </div>
    </div>
  )
}

// ── Alert banner ───────────────────────────────────────────────────────────────

function AlertBanner({ releves }) {
  const recent = releves.filter(r => {
    if (r.conforme !== false) return false
    const dt = new Date(r.created_at)
    return (Date.now() - dt) < 24 * 3600 * 1000
  })
  if (recent.length === 0) return null
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background:'#FEF2F2', border:'1.5px solid #FECACA', borderRadius:12 }}>
      <span style={{ fontSize:20, flexShrink:0 }}>🚨</span>
      <div>
        <div style={{ fontWeight:700, color:'#DC2626', fontSize:14, marginBottom:4 }}>
          {recent.length} non-conformité{recent.length > 1 ? 's' : ''} dans les dernières 24h
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {recent.slice(0, 3).map(r => {
            const z = ZONES.find(z => z.k === r.contexte) || { l: r.contexte, icon:'🌡️' }
            return (
              <div key={r.id} style={{ fontSize:12, color:'#991B1B' }}>
                {z.icon} {z.l} — {r.valeur}°C (norme : {z.norm}) à {r.created_at?.slice(11,16)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Relevé row ─────────────────────────────────────────────────────────────────

function RelRow({ rel }) {
  const zone = ZONES.find(z => z.k === rel.contexte) || { l: rel.contexte || '—', icon:'🌡️', norm:'' }
  const ok   = rel.conforme === true
  const nc   = rel.conforme === false
  return (
    <div style={S.relRow}>
      <span style={{ fontSize:20 }}>{zone.icon}</span>
      <div style={S.relInfo}>
        <div style={S.relZone}>{zone.l}</div>
        <div style={S.relMeta}>
          {rel.created_at ? new Date(rel.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
        </div>
        {rel.note && <div style={S.relNote}>{rel.note}</div>}
      </div>
      <div style={S.relRight}>
        <div style={{ fontSize:18, fontWeight:800, fontFamily:"'DM Mono',monospace", color: nc ? '#DC2626' : '#0F172A' }}>
          {rel.valeur}°C
        </div>
        <span style={{ ...S.badge, background: ok ? '#ECFDF5' : nc ? '#FEF2F2' : '#F8FAFC', color: ok ? '#059669' : nc ? '#DC2626' : '#94A3B8' }}>
          {ok ? '✓ Conforme' : nc ? '⚠ Non conforme' : '—'}
        </span>
      </div>
    </div>
  )
}

// ── Rapport card ───────────────────────────────────────────────────────────────

function RapportCard({ rapport }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(rapport.date).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
  return (
    <div style={{ ...S.card, padding:'14px 16px', marginBottom:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Rapport HACCP</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{date}</div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ ...S.btnSm, background:'#F1F5F9', color:'#475569' }}
        >
          {expanded ? 'Réduire' : 'Lire'}
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop:12, fontSize:13, color:'#0F172A', lineHeight:1.7, whiteSpace:'pre-wrap', borderTop:'1px solid #E2E8F0', paddingTop:12 }}>
          {rapport.contenu}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Haccp({ user, scanLog = [], fromDashboard = false, onBack }) {
  const [tab,        setTab]        = useState('temperatures')
  const [zone,       setZone]       = useState('frigo')
  const [valeur,     setValeur]     = useState('')
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [releves,    setReleves]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [rapports,   setRapports]   = useState([])
  const [generating, setGenerating] = useState(false)
  const [filterZone, setFilterZone] = useState('all')

  const currentZone = ZONES.find(z => z.k === zone) || ZONES[0]

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    fetchTemperatures(user.id).then(({ data }) => {
      if (data) setReleves(data)
      setLoading(false)
    })
  }, [user])

  async function handleSave() {
    const v = Number(valeur)
    if (isNaN(v)) return
    setSaving(true)
    const conforme = currentZone.check(v)
    const rel = {
      id: uid(), user_id: user.id,
      valeur: v, contexte: zone, conforme,
      note: note.trim() || null,
      created_at: new Date().toISOString(),
    }
    await insertTemperature(rel)
    setReleves(rs => [rel, ...rs])
    setValeur('')
    setNote('')
    setSaving(false)
  }

  async function handleGenerateReport() {
    setGenerating(true)
    try {
      const total  = releves.length
      const nc     = releves.filter(r => r.conforme === false)
      const conf   = releves.filter(r => r.conforme === true).length
      const ncList = nc.slice(0, 8).map(r => {
        const z = ZONES.find(z => z.k === r.contexte) || { l: r.contexte }
        return `${z.l}: ${r.valeur}°C (norme: ${z.norm})`
      })
      const scanNc = scanLog.filter(s => s.conf === 'non_conforme').length

      const message = [
        `Génère un rapport HACCP professionnel et synthétique en français pour la date du ${fdate()}.`,
        `Données températures : ${total} relevés au total — ${conf} conformes, ${nc.length} non conformes.`,
        nc.length > 0 ? `Non-conformités : ${ncList.join('; ')}.` : 'Aucune non-conformité température.',
        `Réceptions : ${scanLog.length} au total, ${scanNc} non conformes.`,
        `Structure souhaitée : 1) Bilan de conformité 2) Points critiques identifiés 3) Actions correctives recommandées 4) Conclusion générale.`,
        `Sois précis, professionnel et concis (15-25 lignes max).`,
      ].join(' ')

      const res  = await fetch('/api/aria', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ message, userId: user.id }) })
      const data = await res.json()

      if (data.reply) {
        setRapports(prev => [{
          id:      uid(),
          date:    new Date().toISOString(),
          contenu: data.reply,
          stats:   { total, conf, nc: nc.length },
        }, ...prev])
        setTab('rapports')
      }
    } catch (e) {
      alert('Erreur lors de la génération : ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  const stats = {
    total: releves.length,
    conf:  releves.filter(r => r.conforme === true).length,
    nconf: releves.filter(r => r.conforme === false).length,
  }

  const filteredReleves = filterZone === 'all'
    ? releves
    : releves.filter(r => r.contexte === filterZone)

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={S.title}>HACCP</h1>
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          style={{ ...S.btnSm, background: generating ? '#F1F5F9' : '#EFF6FF', color: generating ? '#94A3B8' : '#2563EB', opacity: generating ? .7 : 1 }}
        >
          {generating ? '⟳ Génération…' : '✦ Générer rapport'}
        </button>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.k} style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}) }} onClick={() => setTab(t.k)}>
            <span>{t.emoji}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      {/* ── Températures ──────────────────────────────────────────────────── */}

      {tab === 'temperatures' && (
        <>
          {/* Alert banner */}
          <AlertBanner releves={releves} />

          {/* KPIs */}
          <div style={S.kpiRow}>
            <div style={S.kpi}>
              <span style={{ ...S.kpiNum, color:'#0F172A' }}>{stats.total}</span>
              <span style={S.kpiLabel}>Relevés</span>
            </div>
            <div style={{ ...S.kpi, background:'#ECFDF5' }}>
              <span style={{ ...S.kpiNum, color:'#10B981' }}>{stats.conf}</span>
              <span style={S.kpiLabel}>Conformes</span>
            </div>
            <div style={{ ...S.kpi, background: stats.nconf > 0 ? '#FEF2F2' : undefined }}>
              <span style={{ ...S.kpiNum, color: stats.nconf > 0 ? '#EF4444' : '#94A3B8' }}>{stats.nconf}</span>
              <span style={S.kpiLabel}>Non conformes</span>
            </div>
          </div>

          {/* Saisie */}
          <div style={S.card}>
            <div style={S.cardTitle}>Nouveau relevé</div>

            {/* Zone selector — 2 colonnes pour 5 zones */}
            <div style={{ ...S.zoneGrid, gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16 }}>
              {ZONES.map(z => (
                <button
                  key={z.k}
                  style={{ ...S.zoneBtn, ...(zone === z.k ? S.zoneBtnAct : {}) }}
                  onClick={() => setZone(z.k)}
                >
                  <span style={{ fontSize:20 }}>{z.icon}</span>
                  <span style={{ fontSize:11.5, fontWeight:600, color: zone === z.k ? '#2563EB' : '#0F172A', textAlign:'center', lineHeight:1.3 }}>{z.l}</span>
                  <span style={{ fontSize:10, color:'#94A3B8' }}>{z.norm}</span>
                </button>
              ))}
            </div>

            {/* Temp input + indicator */}
            <div style={S.tempRow}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input
                  style={S.tempInput}
                  type="number" step="0.1"
                  value={valeur}
                  onChange={e => setValeur(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && valeur !== '' && handleSave()}
                  placeholder="0.0"
                  autoFocus
                />
                <span style={S.tempUnit}>°C</span>
              </div>
              <TempIndicator value={valeur} zone={currentZone} />
            </div>

            <input
              style={{ ...S.input, marginTop:10 }}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Note optionnelle (ex : frigo n°2, sonde étalonnée…)"
            />

            <button
              style={{ ...S.saveBtn, opacity: saving || valeur === '' ? .6 : 1, marginTop:14 }}
              onClick={handleSave}
              disabled={saving || valeur === ''}
            >
              {saving ? 'Enregistrement…' : '+ Enregistrer ce relevé'}
            </button>
          </div>

          {/* Historique */}
          <div style={S.card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ ...S.cardTitle, marginBottom:0 }}>Historique</div>
              <select
                onChange={e => setFilterZone(e.target.value)}
                value={filterZone}
                style={{ fontSize:12, border:'1px solid #E2E8F0', borderRadius:7, padding:'4px 8px', fontFamily:F, color:'#475569', cursor:'pointer', outline:'none' }}
              >
                <option value="all">Toutes zones</option>
                {ZONES.map(z => <option key={z.k} value={z.k}>{z.l}</option>)}
              </select>
            </div>
            {loading
              ? <div style={S.empty}>Chargement…</div>
              : filteredReleves.length === 0
                ? <div style={S.empty}>Aucun relevé enregistré.</div>
                : filteredReleves.map(r => <RelRow key={r.id} rel={r} />)
            }
          </div>
        </>
      )}

      {/* ── Nettoyage ─────────────────────────────────────────────────────── */}

      {tab === 'nettoyage' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Placeholder card */}
          <div style={{ ...S.card, textAlign:'center', padding:'48px 32px' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🧹</div>
            <div style={{ fontSize:17, fontWeight:700, color:'#0F172A', marginBottom:8 }}>
              Plan de nettoyage personnalisé
            </div>
            <div style={{ fontSize:14, color:'#64748B', maxWidth:340, margin:'0 auto 20px', lineHeight:1.6 }}>
              Créez des plans de nettoyage par zone, des check-lists quotidiennes et assurez la traçabilité complète de vos opérations d'hygiène.
            </div>
            <div style={{ display:'inline-flex', gap:3, padding:'5px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:99, fontSize:12, fontWeight:600, color:'#92400E', marginBottom:20 }}>
              Bientôt disponible
            </div>
          </div>

          {/* Aria generate button — désactivé */}
          <div style={{ ...S.card, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>✦ Générer avec Aria</div>
              <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
                Aria créera un plan de nettoyage adapté à votre type d'établissement et vos zones de travail.
              </div>
            </div>
            <button
              disabled
              style={{ ...S.btn, background:'#F1F5F9', color:'#94A3B8', cursor:'not-allowed', whiteSpace:'nowrap', padding:'10px 14px', fontSize:13 }}
            >
              Bientôt disponible
            </button>
          </div>

          {/* Zones preview */}
          <div style={S.card}>
            <div style={S.cardTitle}>Zones à planifier</div>
            {[
              { icon:'🍳', l:'Zone de cuisson',      desc:'Fours, plaques, friteuses, grils' },
              { icon:'🔪', l:'Zone de découpe',       desc:'Plans de travail, planches, couteaux' },
              { icon:'🧊', l:'Zone froide',           desc:'Chambres froides, réfrigérateurs, congélateurs' },
              { icon:'🚿', l:'Zone de plonge',        desc:'Bacs, égouttoirs, surfaces de lavage' },
              { icon:'🗄️', l:'Zone de stockage sec',  desc:'Étagères, palettes, zones de réserve' },
            ].map((z, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < 4 ? '1px solid #F8FAFC' : 'none' }}>
                <span style={{ fontSize:22 }}>{z.icon}</span>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'#0F172A' }}>{z.l}</div>
                  <div style={{ fontSize:11.5, color:'#94A3B8' }}>{z.desc}</div>
                </div>
                <span style={{ ...S.badge, marginLeft:'auto', background:'#F1F5F9', color:'#94A3B8' }}>À venir</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rapports ──────────────────────────────────────────────────────── */}

      {tab === 'rapports' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Generate + export row */}
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              style={{ ...S.btn, flex:1, background:'#2563EB', color:'#fff', opacity: generating ? .7 : 1 }}
            >
              {generating ? '⟳ Génération en cours…' : '✦ Générer rapport HACCP'}
            </button>
            <button
              disabled
              title="Bientôt disponible"
              style={{ ...S.btn, background:'#F1F5F9', color:'#94A3B8', cursor:'not-allowed', padding:'10px 14px', fontSize:13 }}
            >
              📄 Export PDF
            </button>
          </div>

          {/* Export placeholder info */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10 }}>
            <span style={{ fontSize:16 }}>💡</span>
            <span style={{ fontSize:13, color:'#92400E' }}>L'export PDF sera disponible prochainement. Vous pourrez imprimer vos rapports pour les contrôles officiels.</span>
          </div>

          {/* Rapports list */}
          {rapports.length === 0 ? (
            <div style={{ ...S.card, textAlign:'center', padding:'40px 24px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#0F172A', marginBottom:6 }}>Aucun rapport généré</div>
              <div style={{ fontSize:13, color:'#94A3B8' }}>Cliquez sur "Générer rapport HACCP" pour créer votre premier rapport.</div>
            </div>
          ) : (
            rapports.map(r => <RapportCard key={r.id} rapport={r} />)
          )}

          {/* Conformité réceptions */}
          <div style={S.card}>
            <div style={S.cardTitle}>Conformité des réceptions ({scanLog.length})</div>
            {scanLog.length === 0 ? (
              <div style={S.empty}>Aucune réception enregistrée.</div>
            ) : (
              <>
                <div style={{ display:'flex', gap:12, marginBottom:14 }}>
                  {[
                    { l:'Conformes',    count: scanLog.filter(s => s.conf === 'conforme').length,     color:'#10B981', bg:'#ECFDF5' },
                    { l:'À vérifier',  count: scanLog.filter(s => s.conf === 'a_verifier').length,   color:'#F59E0B', bg:'#FFFBEB' },
                    { l:'Non conf.',   count: scanLog.filter(s => s.conf === 'non_conforme').length,  color:'#EF4444', bg:'#FEF2F2' },
                  ].map(k => (
                    <div key={k.l} style={{ flex:1, textAlign:'center', background: k.bg, borderRadius:10, padding:'8px 0' }}>
                      <div style={{ fontSize:18, fontWeight:800, color: k.color, fontFamily:"'DM Mono',monospace" }}>{k.count}</div>
                      <div style={{ fontSize:10, fontWeight:600, color: k.color, textTransform:'uppercase', letterSpacing:.3 }}>{k.l}</div>
                    </div>
                  ))}
                </div>
                {scanLog.slice(0, 10).map(s => {
                  const conf  = s.conf === 'conforme'
                  const nconf = s.conf === 'non_conforme'
                  return (
                    <div key={s.id} style={S.scanRow}>
                      <div style={{ ...S.scanDot, background: conf ? '#10B981' : nconf ? '#EF4444' : '#F59E0B' }} />
                      <div style={S.scanInfo}>
                        <div style={S.scanFour}>{s.four || 'Fournisseur inconnu'}</div>
                        <div style={S.scanMeta}>
                          {s.date_scan} {s.heure} · {s.nb} produit{s.nb !== 1 ? 's' : ''} ·{' '}
                          {conf ? 'Conforme' : nconf ? 'Non conforme' : 'À vérifier'}
                        </div>
                      </div>
                      {s.total != null && <span style={S.scanTotal}>{Number(s.total).toFixed(2)} €</span>}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
