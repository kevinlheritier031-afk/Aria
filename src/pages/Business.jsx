import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { fetchCouverts, insertCouvert, fetchRecettes } from '../lib/supabase'
import { uid, fdate } from '../constants'
import BarChart from '../components/shared/BarChart'

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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
  const [formErr,   setFormErr]   = useState('')
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
    setFormErr('')
    const nb = parseInt(form.nb)
    if (!nb || nb <= 0) { setFormErr('Veuillez saisir un nombre de couverts valide'); return }
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

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dd  = String(d.getDate()).padStart(2, '0')
    const mm  = String(d.getMonth() + 1).padStart(2, '0')
    const yy  = d.getFullYear()
    const key = `${dd}/${mm}/${yy}`
    const total = couverts.filter(c => c.date === key).reduce((s, c) => s + (c.nb_couverts || 0), 0)
    const label = d.toLocaleDateString('fr-FR', { weekday:'short' }) + ' ' + d.getDate()
    return { label, value: total, color: total > 0 ? '#2563EB' : '#CBD5E1' }
  })

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

      {/* Derniers 7 jours */}
      <div style={S.card}>
        <div style={S.cardTitle}>Derniers 7 jours</div>
        <BarChart data={last7} unit="couverts" height={12} />
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
          {formErr && (
            <div style={{ padding:'7px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12.5, color:'#DC2626' }}>
              {formErr}
            </div>
          )}
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

// ── Onglet Menus ──────────────────────────────────────────────────────────────

function TabMenus({ user }) {
  const [menus,   setMenus]   = useState([])
  const [loading, setLoading] = useState(true)
  const [editId,  setEditId]  = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({ nom:'', prix_vente:'', cout_matiere:'' })
  const [margeCible] = useState(() => { try { return parseFloat(localStorage.getItem('aria_marge_cible') || '70') } catch { return 70 } })

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    supabase.from('menus').select('*').eq('etablissement_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMenus(data); setLoading(false) })
  }, [user?.id])

  const pf = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function calcMarge(pv, cm) {
    const p = parseFloat(pv), c = parseFloat(cm) || 0
    if (!p || p <= 0) return null
    return ((p - c) / p) * 100
  }

  async function saveMenu() {
    const pv = parseFloat(form.prix_vente)
    if (!form.nom.trim() || !pv || pv <= 0) return
    setSaving(true)
    const payload = { nom: form.nom.trim(), prix_vente: pv, cout_matiere: parseFloat(form.cout_matiere) || 0 }
    if (editId) {
      const { data } = await supabase.from('menus').update(payload).eq('id', editId).select().single()
      if (data) setMenus(p => p.map(m => m.id === editId ? data : m))
      setEditId(null)
    } else {
      const { data } = await supabase.from('menus')
        .insert({ ...payload, etablissement_id: user.id, actif: true })
        .select().single()
      if (data) setMenus(p => [...p, data])
    }
    setForm({ nom:'', prix_vente:'', cout_matiere:'' })
    setSaving(false)
  }

  async function toggleActif(m) {
    const { data } = await supabase.from('menus').update({ actif: !m.actif }).eq('id', m.id).select().single()
    if (data) setMenus(p => p.map(x => x.id === m.id ? data : x))
  }

  async function deleteMenu(id) {
    await supabase.from('menus').delete().eq('id', id)
    setMenus(p => p.filter(m => m.id !== id))
  }

  function startEdit(m) {
    setEditId(m.id)
    setForm({ nom: m.nom, prix_vente: String(m.prix_vente), cout_matiere: String(m.cout_matiere || '') })
  }

  const actifs    = menus.filter(m => m.actif)
  const avgPrix   = actifs.length ? actifs.reduce((s, m) => s + m.prix_vente, 0) / actifs.length : null
  const prevMarge = form.prix_vente ? calcMarge(form.prix_vente, form.cout_matiere) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ ...S.kpiRow, gridTemplateColumns:'repeat(3,1fr)' }}>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#2563EB' }}>{menus.length}</span>
          <span style={S.kpiLabel}>Menus total</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#10B981' }}>{actifs.length}</span>
          <span style={S.kpiLabel}>Actifs</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, fontSize:16, color:'#7C3AED' }}>{avgPrix ? `${avgPrix.toFixed(0)} €` : '—'}</span>
          <span style={S.kpiLabel}>Prix moy.</span>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Carte des menus ({menus.length})</div>
        {loading ? <div style={S.empty}>Chargement…</div>
        : menus.length === 0 ? <div style={S.empty}>Aucun menu. Ajoutez votre premier menu ci-dessous.</div>
        : menus.map(m => {
          const mg  = calcMarge(m.prix_vente, m.cout_matiere)
          const ok  = mg !== null && mg >= margeCible
          const bad = mg !== null && mg < margeCible - 10
          return (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'1px solid #F8FAFC', opacity: m.actif ? 1 : .5 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:13.5, fontWeight:700, color:'#0F172A' }}>{m.nom}</span>
                  {!m.actif && <span style={{ ...S.badge, background:'#F1F5F9', color:'#94A3B8' }}>Inactif</span>}
                </div>
                <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:2 }}>
                  Prix {m.prix_vente.toFixed(2)} € · Coût {(m.cout_matiere || 0).toFixed(2)} €
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {mg !== null && (
                  <span style={{ ...S.badge, fontSize:12, fontWeight:700, padding:'3px 9px', background: bad ? '#FEF2F2' : ok ? '#ECFDF5' : '#FFFBEB', color: bad ? '#DC2626' : ok ? '#059669' : '#D97706' }}>
                    {mg.toFixed(1)}%
                  </span>
                )}
                <button onClick={() => startEdit(m)} style={{ ...S.btnSm, background:'#F1F5F9', color:'#475569', padding:'5px 9px' }}>✏️</button>
                <button onClick={() => toggleActif(m)} style={{ ...S.btnSm, fontSize:11, padding:'5px 8px', background: m.actif ? '#FEF3C7' : '#ECFDF5', color: m.actif ? '#92400E' : '#059669' }}>
                  {m.actif ? 'Désact.' : 'Activer'}
                </button>
                <button onClick={() => deleteMenu(m.id)} style={{ ...S.btnSm, background:'#FEF2F2', color:'#DC2626', padding:'5px 9px' }}>🗑️</button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>{editId ? 'Modifier le menu' : 'Nouveau menu'}</div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Nom du menu</label>
            <input style={S.input} value={form.nom} onChange={e => pf('nom', e.target.value)} placeholder="Ex : Menu du marché" onKeyDown={e => e.key === 'Enter' && saveMenu()} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Prix vente (€)</label>
            <input style={{ ...S.input, fontFamily:"'DM Mono',monospace" }} type="number" step="0.01" min="0" value={form.prix_vente} onChange={e => pf('prix_vente', e.target.value)} placeholder="32.00" />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Coût matière (€)</label>
            <input style={{ ...S.input, fontFamily:"'DM Mono',monospace" }} type="number" step="0.01" min="0" value={form.cout_matiere} onChange={e => pf('cout_matiere', e.target.value)} placeholder="9.60" />
          </div>
        </div>
        {prevMarge !== null && (
          <div style={{ marginBottom:10, padding:'8px 12px', borderRadius:8, fontSize:13, fontWeight:600, background: prevMarge >= margeCible ? '#ECFDF5' : '#FEF2F2', color: prevMarge >= margeCible ? '#059669' : '#DC2626' }}>
            Marge estimée : {prevMarge.toFixed(1)}% {prevMarge >= margeCible ? `✅ Conforme (objectif ${margeCible}%)` : `⚠️ Sous objectif ${margeCible}%`}
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={saveMenu} disabled={saving || !form.nom.trim() || !form.prix_vente} style={{ ...S.btn, background:'#2563EB', color:'#fff', flex:1, opacity: saving || !form.nom.trim() || !form.prix_vente ? .5 : 1 }}>
            {saving ? 'Enregistrement…' : editId ? '✓ Modifier' : '+ Ajouter ce menu'}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm({ nom:'', prix_vente:'', cout_matiere:'' }) }} style={{ ...S.btn, background:'#F1F5F9', color:'#475569' }}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Onglet Marges ──────────────────────────────────────────────────────────────

function TabMarges({ user }) {
  const [recettes,     setRecettes]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [margeCible,   setMargeCible_]  = useState(() => { try { return parseFloat(localStorage.getItem('aria_marge_cible') || '70') } catch { return 70 } })
  const [caParCouvert, setCaParCouvert_]= useState(() => { try { return parseFloat(localStorage.getItem('aria_ca_couvert') || '') || '' } catch { return '' } })
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

// ── Onglet Clôtures ───────────────────────────────────────────────────────────

function TabClotures({ user }) {
  const [menus,      setMenus]      = useState([])
  const [clotures,   setClotures]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [service,    setService]    = useState('midi')
  const [mode,       setMode]       = useState(null)
  const [nbCouverts, setNbCouverts] = useState({})
  const [uploading,  setUploading]  = useState(false)
  const [fromPhoto,  setFromPhoto]  = useState(false)
  const [validating, setValidating] = useState(false)
  const [ariaMsg,    setAriaMsg]    = useState(null)
  const fileRef = useRef(null)

  const margeCible = (() => { try { return parseFloat(localStorage.getItem('aria_marge_cible') || '70') } catch { return 70 } })()

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    Promise.all([
      supabase.from('menus').select('*').eq('etablissement_id', user.id).eq('actif', true),
      supabase.from('clotures_service').select('*').eq('etablissement_id', user.id).order('date', { ascending: false }).limit(7),
    ]).then(([m, c]) => {
      if (m.data) setMenus(m.data)
      if (c.data) setClotures(c.data)
      setLoading(false)
    })
  }, [user?.id])

  function openModal(svc) {
    setService(svc)
    setMode(null)
    setNbCouverts({})
    setFromPhoto(false)
    setAriaMsg(null)
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setMode(null)
    setNbCouverts({})
    setFromPhoto(false)
  }

  const detail = menus.map(m => {
    const nb = parseInt(nbCouverts[m.id]) || 0
    return { menu: m, nb, ca: nb * m.prix_vente, cout: nb * (m.cout_matiere || 0) }
  })
  const caTotal     = detail.reduce((s, d) => s + d.ca, 0)
  const coutTotal   = detail.reduce((s, d) => s + d.cout, 0)
  const nbTotal     = detail.reduce((s, d) => s + d.nb, 0)
  const marge       = caTotal > 0 ? ((caTotal - coutTotal) / caTotal) * 100 : 0
  const margeOk     = marge >= margeCible

  async function handlePhoto(file) {
    if (!file) return
    setUploading(true)
    try {
      const b64 = await fileToBase64(file)
      const res = await fetch('/api/ticket-caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, menus: menus.map(m => ({ nom: m.nom, prix_vente: m.prix_vente })) }),
      })
      const data = await res.json()
      if (data.menus) {
        const prefill = {}
        data.menus.forEach(item => {
          const found = menus.find(m => m.nom.toLowerCase().includes(item.nom.toLowerCase()) || item.nom.toLowerCase().includes(m.nom.toLowerCase()))
          if (found && item.nb_couverts > 0) prefill[found.id] = String(item.nb_couverts)
        })
        setNbCouverts(prefill)
        setFromPhoto(true)
        setMode('manual')
      }
    } catch (e) {
      console.error('photo ticket error:', e)
    } finally {
      setUploading(false)
    }
  }

  async function validerCloture() {
    if (nbTotal === 0) return
    setValidating(true)
    const today  = new Date().toISOString().slice(0, 10)
    const ventes = detail.filter(d => d.nb > 0).map(d => ({ nom: d.menu.nom, nb: d.nb, ca: d.ca, cout: d.cout }))
    const { data } = await supabase.from('clotures_service').insert({
      etablissement_id: user.id,
      service,
      date: today,
      ventes,
      ca_reel: caTotal,
      cout_total: coutTotal,
      marge_reelle: parseFloat(marge.toFixed(2)),
      nb_couverts: nbTotal,
    }).select().single()
    if (data) setClotures(p => [data, ...p].slice(0, 7))
    const msg = margeOk
      ? `✅ Excellente clôture ! Marge ${marge.toFixed(1)}% — au-dessus de votre objectif ${margeCible}%. ${caTotal.toFixed(0)} € CA pour ${nbTotal} couverts.`
      : `⚠️ Clôture enregistrée. Marge ${marge.toFixed(1)}% sous l'objectif ${margeCible}%. Pensez à revoir le food cost sur les prochains services.`
    setAriaMsg(msg)
    setValidating(false)
    setMode('done')
  }

  function formatDate(d) {
    if (!d) return ''
    const [y, mo, da] = d.split('-')
    return `${da}/${mo}/${y}`
  }

  const chartData = [...clotures].reverse().map(c => ({
    label: formatDate(c.date).slice(0, 5),
    value: parseFloat(c.marge_reelle) || 0,
    color: (parseFloat(c.marge_reelle) || 0) >= margeCible ? '#10B981' : '#EF4444',
  }))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* CTA */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <button onClick={() => openModal('midi')} style={{ ...S.btn, flexDirection:'column', gap:4, padding:'18px 12px', background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#fff', borderRadius:14, fontSize:15 }}>
          <span style={{ fontSize:28 }}>☀️</span>
          <span>Clôture Midi</span>
        </button>
        <button onClick={() => openModal('soir')} style={{ ...S.btn, flexDirection:'column', gap:4, padding:'18px 12px', background:'linear-gradient(135deg,#7C3AED,#4C1D95)', color:'#fff', borderRadius:14, fontSize:15 }}>
          <span style={{ fontSize:28 }}>🌙</span>
          <span>Clôture Soir</span>
        </button>
      </div>

      {/* BarChart 7 dernières */}
      {clotures.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Marge réelle — 7 dernières clôtures</div>
          <BarChart data={chartData} unit="%" height={12} />
          <div style={{ display:'flex', gap:8, marginTop:8, justifyContent:'center' }}>
            <span style={{ fontSize:11, color:'#10B981', fontWeight:600 }}>■ ≥ {margeCible}% objectif</span>
            <span style={{ fontSize:11, color:'#EF4444', fontWeight:600 }}>■ Sous objectif</span>
          </div>
        </div>
      )}

      {/* Historique */}
      <div style={S.card}>
        <div style={S.cardTitle}>Historique des clôtures</div>
        {loading ? <div style={S.empty}>Chargement…</div>
        : clotures.length === 0 ? <div style={S.empty}>Aucune clôture enregistrée.</div>
        : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ color:'#94A3B8', fontWeight:600 }}>
                  {['Date','Service','Couverts','CA','Marge réelle','vs Objectif'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'6px 8px', borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clotures.map(c => {
                  const mg  = parseFloat(c.marge_reelle) || 0
                  const ok  = mg >= margeCible
                  const svc = SERVICES.find(s => s.k === c.service) || { icon:'🍽️', l: c.service }
                  return (
                    <tr key={c.id} style={{ borderBottom:'1px solid #F8FAFC' }}>
                      <td style={{ padding:'8px 8px', color:'#0F172A', fontWeight:500 }}>{formatDate(c.date)}</td>
                      <td style={{ padding:'8px 8px' }}>{svc.icon} {svc.l}</td>
                      <td style={{ padding:'8px 8px', fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{c.nb_couverts}</td>
                      <td style={{ padding:'8px 8px', fontFamily:"'DM Mono',monospace" }}>{(c.ca_reel || 0).toFixed(0)} €</td>
                      <td style={{ padding:'8px 8px' }}>
                        <span style={{ ...S.badge, background: ok ? '#ECFDF5' : '#FEF2F2', color: ok ? '#059669' : '#DC2626', fontSize:12, fontWeight:700 }}>
                          {mg.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding:'8px 8px', color: ok ? '#059669' : '#DC2626', fontWeight:600, fontSize:12 }}>
                        {ok ? `+${(mg - margeCible).toFixed(1)}%` : `−${(margeCible - mg).toFixed(1)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', padding:24, width:'100%', maxWidth:560, maxHeight:'88vh', overflowY:'auto', boxSizing:'border-box' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:17, color:'#0F172A' }}>
                {service === 'midi' ? '☀️ Clôture Midi' : '🌙 Clôture Soir'}
              </div>
              <button onClick={closeModal} style={{ background:'#F1F5F9', border:'none', borderRadius:99, width:32, height:32, cursor:'pointer', fontSize:16, color:'#64748B' }}>✕</button>
            </div>

            {/* Mode done */}
            {mode === 'done' && ariaMsg && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ padding:16, background: margeOk ? '#ECFDF5' : '#FEF2F2', border:`1px solid ${margeOk ? '#A7F3D0' : '#FECACA'}`, borderRadius:12, fontSize:13.5, color: margeOk ? '#065F46' : '#991B1B', lineHeight:1.6 }}>
                  {ariaMsg}
                </div>
                <button onClick={closeModal} style={{ ...S.btn, background:'#0F172A', color:'#fff', width:'100%' }}>Fermer</button>
              </div>
            )}

            {/* Mode selection */}
            {!mode && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <p style={{ fontSize:13.5, color:'#64748B', margin:0 }}>Comment souhaitez-vous saisir les ventes ?</p>
                <button onClick={() => setMode('manual')} style={{ ...S.btn, border:'1.5px solid #E2E8F0', background:'#F8FAFC', color:'#0F172A', fontSize:15, justifyContent:'flex-start', gap:12, padding:'14px 16px' }}>
                  <span style={{ fontSize:22 }}>✏️</span>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontWeight:700 }}>Saisie manuelle</div>
                    <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>Entrez les couverts par menu</div>
                  </div>
                </button>
                <button onClick={() => setMode('photo')} style={{ ...S.btn, border:'1.5px solid #E2E8F0', background:'#F8FAFC', color:'#0F172A', fontSize:15, justifyContent:'flex-start', gap:12, padding:'14px 16px' }}>
                  <span style={{ fontSize:22 }}>📷</span>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontWeight:700 }}>Photo ticket caisse</div>
                    <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>L'IA lit et pré-remplit le formulaire</div>
                  </div>
                </button>
              </div>
            )}

            {/* Mode photo */}
            {mode === 'photo' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handlePhoto(e.target.files?.[0])} />
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{ border:'2px dashed #CBD5E1', borderRadius:12, padding:'40px 24px', textAlign:'center', cursor:'pointer', background:'#F8FAFC' }}
                >
                  {uploading ? (
                    <div style={{ color:'#2563EB', fontSize:14, fontWeight:600 }}>⟳ Analyse en cours…</div>
                  ) : (
                    <>
                      <div style={{ fontSize:40, marginBottom:8 }}>📷</div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#0F172A' }}>Appuyez pour prendre une photo</div>
                      <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>ou sélectionnez depuis la galerie</div>
                    </>
                  )}
                </div>
                <button onClick={() => setMode(null)} style={{ ...S.btnSm, background:'#F1F5F9', color:'#64748B', alignSelf:'flex-start' }}>← Retour</button>
              </div>
            )}

            {/* Mode manual (ou post-photo) */}
            {mode === 'manual' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {fromPhoto && (
                  <div style={{ padding:'8px 12px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:8, fontSize:12.5, color:'#1D4ED8' }}>
                    ✦ Aria a pré-rempli les couverts depuis votre photo. Vérifiez et ajustez si besoin.
                  </div>
                )}
                {menus.length === 0 && (
                  <div style={S.empty}>Aucun menu actif. Créez des menus dans l'onglet Menus.</div>
                )}
                {menus.map(m => (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'#0F172A' }}>{m.nom}</div>
                      <div style={{ fontSize:11.5, color:'#94A3B8' }}>{m.prix_vente.toFixed(2)} € · coût {(m.cout_matiere || 0).toFixed(2)} €</div>
                    </div>
                    <input
                      type="number" min="0" placeholder="0"
                      value={nbCouverts[m.id] || ''}
                      onChange={e => setNbCouverts(p => ({ ...p, [m.id]: e.target.value }))}
                      style={{ ...S.input, width:72, textAlign:'center', fontSize:18, fontWeight:800, fontFamily:"'DM Mono',monospace" }}
                    />
                  </div>
                ))}

                {/* Live calc */}
                {nbTotal > 0 && (
                  <div style={{ padding:14, background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12, display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:'#64748B' }}>Couverts</span>
                      <span style={{ fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{nbTotal}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:'#64748B' }}>CA total</span>
                      <span style={{ fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{caTotal.toFixed(2)} €</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                      <span style={{ color:'#64748B' }}>Coût matière</span>
                      <span style={{ fontWeight:700, fontFamily:"'DM Mono',monospace", color:'#EF4444' }}>{coutTotal.toFixed(2)} €</span>
                    </div>
                    <div style={S.divider} />
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
                      <span style={{ fontWeight:700 }}>Marge brute</span>
                      <span style={{ fontWeight:800, fontFamily:"'DM Mono',monospace", color: margeOk ? '#059669' : '#DC2626' }}>
                        {marge.toFixed(1)}% {margeOk ? '✅' : '⚠️'}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', gap:10 }}>
                  {!fromPhoto && <button onClick={() => setMode(null)} style={{ ...S.btn, background:'#F1F5F9', color:'#64748B' }}>← Retour</button>}
                  <button
                    onClick={validerCloture}
                    disabled={validating || nbTotal === 0}
                    style={{ ...S.btn, background: nbTotal > 0 ? '#2563EB' : '#CBD5E1', color:'#fff', flex:1, opacity: validating ? .7 : 1 }}
                  >
                    {validating ? 'Enregistrement…' : `✓ Valider la clôture (${nbTotal} couverts)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
    { k:'couverts', l:'Couverts',  emoji:'🍽️' },
    { k:'menus',    l:'Menus',     emoji:'🗂️' },
    { k:'clotures', l:'Clôtures',  emoji:'📊' },
    { k:'marges',   l:'Marges',    emoji:'📈' },
    { k:'compta',   l:'Compta',    emoji:'📑' },
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
      {tab === 'menus'    && <TabMenus    user={user} />}
      {tab === 'clotures' && <TabClotures user={user} />}
      {tab === 'marges'   && <TabMarges   user={user} />}
      {tab === 'compta'   && <TabCompta />}
    </div>
  )
}
