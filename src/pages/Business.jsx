import { useState, useEffect } from 'react'
import { fetchCouverts, insertCouvert, fetchRecettes } from '../lib/supabase'
import { uid, fdate } from '../constants'

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const SERVICES = [
  { k:'midi',   l:'Midi',   icon:'☀️'  },
  { k:'soir',   l:'Soir',   icon:'🌙'  },
  { k:'brunch', l:'Brunch', icon:'🥐'  },
  { k:'autre',  l:'Autre',  icon:'🍽️' },
]

const JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']

const LOGICIELS = [
  { nom:'Sage',       logo:'🟢', desc:'Sage 50cloud, Sage 100 — PME et ETI' },
  { nom:'Cegid',      logo:'🔵', desc:'Cegid Quadra, Cegid Loop — expert-comptable' },
  { nom:'EBP',        logo:'🟠', desc:'EBP Compta, EBP Gestion Commerciale' },
  { nom:'Pennylane',  logo:'🟣', desc:'Pennylane — comptabilité SaaS tout-en-un' },
  { nom:'QuickBooks', logo:'🟡', desc:'QuickBooks Online — TPE et indépendants' },
]

const S = {
  page:       { padding:20, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:860, margin:'0 auto' },
  backBtn:    { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F },
  row:        { display:'flex', alignItems:'center', gap:8 },
  rowBetween: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  tabs:       { display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3 },
  tab:        { flex:1, padding:'8px 10px', border:'none', background:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F },
  tabActive:  { background:'#fff', color:'#0F172A', boxShadow:'0 1px 3px rgba(0,0,0,.08)' },
  card:       { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 20px' },
  cardTitle:  { fontSize:12, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 },
  kpiRow:     { display:'grid', gap:12 },
  kpi:        { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4, alignItems:'center' },
  kpiNum:     { fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace" },
  kpiLabel:   { fontSize:11, color:'#64748B', fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' },
  input:      { width:'100%', border:'1.5px solid #E2E8F0', borderRadius:9, padding:'9px 12px', fontSize:14, fontFamily:F, outline:'none', background:'#F8FAFC', color:'#0F172A', boxSizing:'border-box' },
  btn:        { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', border:'none', fontFamily:F },
  btnSm:      { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 12px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', border:'none', fontFamily:F },
  badge:      { display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600 },
  empty:      { color:'#94A3B8', textAlign:'center', padding:'28px 0', fontSize:13 },
  divider:    { height:1, background:'#E2E8F0', margin:'8px 0' },
}

// ── Utils ──────────────────────────────────────────────────────────────────────

function parseFrDate(str) {
  if (!str) return null
  const [d, m, y] = str.split('/')
  const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  return isNaN(dt) ? null : dt
}

function startOfWeek() {
  const now = new Date()
  const dow = now.getDay()
  const start = new Date(now)
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))
  start.setHours(0, 0, 0, 0)
  return start
}

// ── ServiceSelector ────────────────────────────────────────────────────────────

function ServiceSelector({ value, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
      {SERVICES.map(s => (
        <button
          key={s.k}
          type="button"
          onClick={() => onChange(s.k)}
          style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 6px', border:`1.5px solid ${value === s.k ? '#2563EB' : '#E2E8F0'}`, borderRadius:10, background: value === s.k ? '#EFF6FF' : '#F8FAFC', cursor:'pointer', fontFamily:F, transition:'all .12s' }}
        >
          <span style={{ fontSize:22 }}>{s.icon}</span>
          <span style={{ fontSize:12, fontWeight:600, color: value === s.k ? '#2563EB' : '#0F172A' }}>{s.l}</span>
        </button>
      ))}
    </div>
  )
}

// ── MargeGauge ─────────────────────────────────────────────────────────────────

function MargeGauge({ reelle, cible }) {
  if (reelle === null) return null
  const ok      = reelle >= cible
  const danger  = reelle < cible - 10
  const color   = danger ? '#EF4444' : ok ? '#10B981' : '#F59E0B'
  const bgColor = danger ? '#FEF2F2' : ok ? '#ECFDF5' : '#FFFBEB'
  const pct     = Math.min(Math.max(reelle, 0), 100)

  return (
    <div style={{ ...S.card, border:`1.5px solid ${danger ? '#FECACA' : ok ? '#A7F3D0' : '#FDE68A'}`, background: bgColor }}>
      <div style={S.rowBetween}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>
            {danger ? '⚠️ Marge sous objectif' : ok ? '✅ Marge conforme' : '⚡ Marge limite'}
          </div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
            Objectif : ≥ {cible}% · Réelle : {reelle.toFixed(1)}%
          </div>
        </div>
        <div style={{ fontSize:28, fontWeight:900, color, fontFamily:"'DM Mono',monospace" }}>
          {reelle.toFixed(1)}%
        </div>
      </div>
      <div style={{ marginTop:12, height:10, background:'#E2E8F0', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: color, borderRadius:99, transition:'width .4s' }} />
      </div>
      <div style={{ ...S.rowBetween, marginTop:4 }}>
        <span style={{ fontSize:10, color:'#94A3B8' }}>0%</span>
        <span style={{ fontSize:10, color: color, fontWeight:600 }}>Cible {cible}%</span>
        <span style={{ fontSize:10, color:'#94A3B8' }}>100%</span>
      </div>
    </div>
  )
}

// ── Onglet Couverts ────────────────────────────────────────────────────────────

function TabCouverts({ user }) {
  const [couverts,  setCouverts]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [form,      setForm]      = useState({ date: fdate(), service:'midi', nb:'', note:'' })

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    fetchCouverts(user.id).then(({ data }) => {
      if (data) setCouverts(data)
      setLoading(false)
    })
  }, [user])

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    const nb = parseInt(form.nb)
    if (!nb || nb <= 0) { alert('Nombre de couverts requis'); return }
    setSaving(true)
    const rec = { id: uid(), user_id: user.id, date: form.date, service: form.service, nb_couverts: nb, observations: form.note.trim() || null, created_at: new Date().toISOString() }
    await insertCouvert(rec)
    setCouverts(c => [rec, ...c])
    setForm(p => ({ ...p, nb:'', note:'' }))
    setSaving(false)
  }

  // Stats
  const weekStart    = startOfWeek()
  const thisWeek     = couverts.filter(c => { const dt = parseFrDate(c.date); return dt && dt >= weekStart })
  const totalWeek    = thisWeek.reduce((s, c) => s + (c.nb_couverts || 0), 0)
  const avgPerDay    = thisWeek.length > 0 ? Math.round(totalWeek / Math.max(1, new Set(thisWeek.map(c => c.date)).size)) : 0

  const byService = {}
  couverts.forEach(c => { byService[c.service] = (byService[c.service] || 0) + (c.nb_couverts || 0) })
  const topService = Object.entries(byService).sort((a, b) => b[1] - a[1])[0]

  const byDow = {}
  couverts.forEach(c => {
    const dt = parseFrDate(c.date)
    if (!dt) return
    const d = dt.getDay()
    byDow[d] = (byDow[d] || 0) + (c.nb_couverts || 0)
  })
  const topDow = Object.entries(byDow).sort((a, b) => b[1] - a[1])[0]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* KPIs */}
      <div style={{ ...S.kpiRow, gridTemplateColumns:'repeat(3,1fr)' }}>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#2563EB' }}>{totalWeek}</span>
          <span style={S.kpiLabel}>Cette semaine</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#10B981' }}>{avgPerDay}</span>
          <span style={S.kpiLabel}>Moy. / jour</span>
        </div>
        <div style={S.kpi}>
          <span style={{ fontSize:20 }}>{topService ? SERVICES.find(s => s.k === topService[0])?.icon || '—' : '—'}</span>
          <span style={{ ...S.kpiLabel, marginTop:2 }}>
            {topService ? `${SERVICES.find(s => s.k === topService[0])?.l || topService[0]} (${topService[1]})` : 'Aucun'}
          </span>
        </div>
      </div>

      {/* Jours les plus chargés */}
      {Object.keys(byDow).length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Jours les plus chargés (tous services)</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {Object.entries(byDow).sort((a, b) => b[1] - a[1]).map(([dow, total]) => (
              <div key={dow} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, background:'#F1F5F9', borderRadius:10, padding:'8px 14px', minWidth:56 }}>
                <span style={{ fontSize:14, fontWeight:800, color:'#0F172A', fontFamily:"'DM Mono',monospace" }}>{total}</span>
                <span style={{ fontSize:11, color:'#94A3B8', fontWeight:500 }}>{JOURS[parseInt(dow)]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire */}
      <div style={S.card}>
        <div style={S.cardTitle}>Nouveau service</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Date</label>
              <input style={S.input} type="text" placeholder="JJ/MM/AAAA" value={form.date} onChange={e => f('date', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Couverts</label>
              <input style={{ ...S.input, fontSize:20, fontWeight:800, fontFamily:"'DM Mono',monospace", textAlign:'center' }} type="number" min="1" placeholder="0" value={form.nb} onChange={e => f('nb', e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Service</label>
            <ServiceSelector value={form.service} onChange={v => f('service', v)} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Observations</label>
            <input style={S.input} placeholder="Groupe, événement, météo…" value={form.note} onChange={e => f('note', e.target.value)} />
          </div>
          <button style={{ ...S.btn, background:'#2563EB', color:'#fff', opacity: saving ? .7 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : '+ Enregistrer le service'}
          </button>
        </div>
      </div>

      {/* Historique */}
      <div style={S.card}>
        <div style={S.cardTitle}>Historique des services</div>
        {loading ? <div style={S.empty}>Chargement…</div>
        : couverts.length === 0 ? <div style={S.empty}>Aucun service enregistré.</div>
        : couverts.slice(0, 30).map(c => {
          const svc = SERVICES.find(s => s.k === c.service) || { icon:'🍽️', l: c.service }
          return (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F8FAFC' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{svc.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:600, color:'#0F172A' }}>
                  {svc.l} · {c.date}
                </div>
                {c.observations && <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:1 }}>{c.observations}</div>}
              </div>
              <div style={{ fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace", color:'#0F172A' }}>
                {c.nb_couverts}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Onglet Marges ──────────────────────────────────────────────────────────────

function TabMarges({ user }) {
  const [recettes,     setRecettes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [margeCible,   setMargeCible_]  = useState(() => parseFloat(localStorage.getItem('aria_marge_cible') || '70'))
  const [caParCouvert, setCaParCouvert_]= useState(() => parseFloat(localStorage.getItem('aria_ca_couvert') || ''))
  const [rapport,      setRapport]      = useState(null)
  const [generating,   setGenerating]   = useState(false)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    fetchRecettes(user.id).then(({ data }) => {
      if (data) setRecettes(data)
      setLoading(false)
    })
  }, [user])

  function setMargeCible(v) { setMargeCible_(v); localStorage.setItem('aria_marge_cible', v) }
  function setCaParCouvert(v) { setCaParCouvert_(v); localStorage.setItem('aria_ca_couvert', v) }

  const recettesAvecCout = recettes.filter(r => r.cout_estime > 0 && r.nb_personnes > 0)
  const totalCout        = recettesAvecCout.reduce((s, r) => s + r.cout_estime, 0)
  const totalCouverts    = recettesAvecCout.reduce((s, r) => s + r.nb_personnes, 0)
  const coutMoyen        = totalCouverts > 0 ? totalCout / totalCouverts : null

  const ca = parseFloat(caParCouvert)
  const margeReelle = (coutMoyen && ca > 0)
    ? Math.round(((ca - coutMoyen) / ca) * 1000) / 10
    : null

  async function handleRapport() {
    setGenerating(true)
    setRapport(null)
    try {
      const lines = [
        `Génère une analyse de rentabilité et de marges pour ma cuisine.`,
        `Marge brute cible : ${margeCible}%.`,
        coutMoyen  ? `Coût matière moyen par couvert (${recettesAvecCout.length} recettes analysées) : ${coutMoyen.toFixed(2)} €.` : 'Aucun coût matière disponible.',
        ca > 0     ? `CA moyen par couvert : ${ca.toFixed(2)} €.` : 'CA non renseigné.',
        margeReelle !== null ? `Marge brute calculée : ${margeReelle}%. ${margeReelle < margeCible ? '⚠️ SOUS l\'objectif.' : '✅ Conforme à l\'objectif.'}` : '',
        `Recettes avec coût renseigné :`,
        ...recettesAvecCout.slice(0, 8).map(r => `  • ${r.nom} — ${(r.cout_estime / r.nb_personnes).toFixed(2)} €/couvert (${r.nb_personnes} pers.)`),
        `Donne-moi 3-5 recommandations concrètes pour optimiser mes marges.`,
      ].filter(Boolean)

      const res  = await fetch('/api/aria', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message: lines.join(' '), userId: user.id }) })
      const data = await res.json()
      setRapport(data.reply || 'Analyse non disponible.')
    } catch (e) {
      setRapport('Erreur lors de la génération : ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Paramètres */}
      <div style={S.card}>
        <div style={S.cardTitle}>Paramètres de marge</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span>Marge brute cible</span>
              <span style={{ ...S.badge, background:'#EFF6FF', color:'#2563EB', fontSize:13, fontWeight:800 }}>{margeCible}%</span>
            </label>
            <input
              type="range" min="0" max="100" step="1"
              value={margeCible}
              onChange={e => setMargeCible(parseInt(e.target.value))}
              style={{ width:'100%', accentColor:'#2563EB' }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94A3B8', marginTop:2 }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:6, display:'block' }}>
              CA moyen par couvert (€)
            </label>
            <input
              style={{ ...S.input, fontSize:18, fontWeight:700, fontFamily:"'DM Mono',monospace" }}
              type="number" step="0.01" min="0" placeholder="Ex: 28.00"
              value={caParCouvert}
              onChange={e => setCaParCouvert(e.target.value)}
            />
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>Prix de vente moyen HT par couvert</div>
          </div>
        </div>
      </div>

      {/* Indicateur marge */}
      <MargeGauge reelle={margeReelle} cible={margeCible} />

      {/* KPIs coût */}
      <div style={{ ...S.kpiRow, gridTemplateColumns:'repeat(3,1fr)' }}>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#0F172A', fontSize:18 }}>
            {coutMoyen ? `${coutMoyen.toFixed(2)} €` : '—'}
          </span>
          <span style={S.kpiLabel}>Coût / couvert</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#0F172A', fontSize:18 }}>
            {ca > 0 ? `${ca.toFixed(2)} €` : '—'}
          </span>
          <span style={S.kpiLabel}>CA / couvert</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color: margeReelle !== null && margeReelle < margeCible ? '#EF4444' : '#10B981', fontSize:18 }}>
            {margeReelle !== null ? `${margeReelle.toFixed(1)}%` : '—'}
          </span>
          <span style={S.kpiLabel}>Marge réelle</span>
        </div>
      </div>

      {/* Recettes avec coût */}
      <div style={S.card}>
        <div style={{ ...S.rowBetween, marginBottom:14 }}>
          <div style={{ ...S.cardTitle, marginBottom:0 }}>
            Coût matière par recette ({recettesAvecCout.length}/{recettes.length})
          </div>
          {loading && <span style={{ fontSize:12, color:'#94A3B8' }}>Chargement…</span>}
        </div>
        {recettesAvecCout.length === 0 ? (
          <div style={S.empty}>
            {loading ? 'Chargement…' : 'Aucune recette avec coût estimé. Renseignez les coûts dans le module Recettes.'}
          </div>
        ) : (
          recettesAvecCout.map(r => {
            const coutCouvert = r.cout_estime / r.nb_personnes
            const margeRec    = ca > 0 ? ((ca - coutCouvert) / ca * 100) : null
            const ok          = margeRec !== null && margeRec >= margeCible
            return (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F8FAFC' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'#0F172A' }}>{r.nom}</div>
                  <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:1 }}>
                    {r.nb_personnes} pers. · coût total {r.cout_estime.toFixed(2)} €
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16, fontWeight:800, fontFamily:"'DM Mono',monospace", color:'#0F172A' }}>
                    {coutCouvert.toFixed(2)} €<span style={{ fontSize:11, color:'#94A3B8', fontWeight:400 }}>/couv.</span>
                  </div>
                  {margeRec !== null && (
                    <span style={{ ...S.badge, background: ok ? '#ECFDF5' : '#FEF2F2', color: ok ? '#059669' : '#DC2626' }}>
                      {margeRec.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Rapport Aria */}
      <div style={{ ...S.card, border:'1px solid #BFDBFE', background:'#EFF6FF' }}>
        <div style={{ ...S.rowBetween, marginBottom: rapport ? 12 : 0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#1E40AF' }}>✦ Analyse Aria</div>
            <div style={{ fontSize:12, color:'#3B82F6', marginTop:2 }}>Recommandations personnalisées pour optimiser vos marges</div>
          </div>
          <button
            onClick={handleRapport}
            disabled={generating}
            style={{ ...S.btnSm, background:'#2563EB', color:'#fff', opacity: generating ? .7 : 1, flexShrink:0 }}
          >
            {generating ? '⟳ Génération…' : 'Analyser'}
          </button>
        </div>
        {rapport && (
          <div style={{ fontSize:13, color:'#1E40AF', lineHeight:1.7, whiteSpace:'pre-wrap', borderTop:'1px solid #BFDBFE', paddingTop:12 }}>
            {rapport}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Onglet Comptabilité ────────────────────────────────────────────────────────

function TabCompta() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Placeholder principal */}
      <div style={{ ...S.card, textAlign:'center', padding:'48px 32px' }}>
        <div style={{ fontSize:52, marginBottom:16 }}>📑</div>
        <div style={{ fontSize:17, fontWeight:700, color:'#0F172A', marginBottom:8 }}>
          Intégration comptabilité
        </div>
        <div style={{ fontSize:14, color:'#64748B', maxWidth:360, margin:'0 auto 20px', lineHeight:1.6 }}>
          Synchronisez automatiquement vos données Aria avec votre logiciel comptable : facturation fournisseurs, coûts matières, récapitulatifs de CA.
        </div>
        <span style={{ display:'inline-flex', gap:4, padding:'5px 14px', background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:99, fontSize:12, fontWeight:600, color:'#92400E' }}>
          Bientôt disponible
        </span>
      </div>

      {/* Logiciels prévus */}
      <div style={S.card}>
        <div style={S.cardTitle}>Logiciels compatibles prévus</div>
        {LOGICIELS.map((l, i) => (
          <div key={l.nom} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 0', borderBottom: i < LOGICIELS.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
            <span style={{ fontSize:24, flexShrink:0 }}>{l.logo}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{l.nom}</div>
              <div style={{ fontSize:12, color:'#94A3B8' }}>{l.desc}</div>
            </div>
            <span style={{ ...S.badge, background:'#F1F5F9', color:'#94A3B8' }}>À venir</span>
          </div>
        ))}
      </div>

      {/* Ce qui sera synchronisé */}
      <div style={S.card}>
        <div style={S.cardTitle}>Données synchronisées</div>
        {[
          { icon:'📦', titre:'Achats fournisseurs',   desc:'Bons de réception, montants HT/TTC, TVA par taux' },
          { icon:'🍽️', titre:'Coûts matières',        desc:'Food cost par recette, par service, par période' },
          { icon:'💶', titre:'Récapitulatif CA',       desc:'CA par service depuis les saisies couverts' },
          { icon:'📊', titre:'Écarts de marge',        desc:'Rapport marge réelle vs objectif par semaine' },
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom: i < 3 ? '1px solid #F8FAFC' : 'none' }}>
            <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize:13.5, fontWeight:600, color:'#0F172A' }}>{item.titre}</div>
              <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:1 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Business({ user, profile, stock, fournisseurs, prixHist, fromDashboard, onBack }) {
  const [tab, setTab] = useState('couverts')

  const TABS = [
    { k:'couverts', l:'Couverts',      emoji:'🍽️' },
    { k:'marges',   l:'Marges',        emoji:'📈' },
    { k:'compta',   l:'Comptabilité',  emoji:'📑' },
  ]

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}

      <div style={S.rowBetween}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0 }}>Business & Gestion</h2>
          <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>
            {profile?.name ? `${profile.name} · ` : ''}{new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>
      </div>

      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.k} style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}), display:'flex', alignItems:'center', justifyContent:'center', gap:5 }} onClick={() => setTab(t.k)}>
            <span>{t.emoji}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      {tab === 'couverts' && <TabCouverts user={user} />}
      {tab === 'marges'   && <TabMarges   user={user} />}
      {tab === 'compta'   && <TabCompta />}
    </div>
  )
}
