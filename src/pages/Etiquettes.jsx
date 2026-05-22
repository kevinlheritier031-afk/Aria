import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../constants'
import { DLC_NORMES, BONNES_PRATIQUES_CONGELATION } from '../constants/dlcNormes'

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const TYPES = [
  { k:'mise_en_place', l:'Mise en place', emoji:'🥗', color:'#10B981', bg:'#ECFDF5', br:'#A7F3D0' },
  { k:'sous_vide',     l:'Sous vide',     emoji:'🫙', color:'#2563EB', bg:'#EFF6FF', br:'#BFDBFE' },
  { k:'congelation',   l:'Congélation',   emoji:'❄️', color:'#0EA5E9', bg:'#F0F9FF', br:'#BAE6FD' },
]

const SOUS_CATS = [
  { k:'viande',        l:'Viande' },
  { k:'viande_hachee', l:'Viande hachée' },
  { k:'poisson',       l:'Poisson' },
  { k:'plat_prepare',  l:'Plat préparé' },
  { k:'autre',         l:'Autre' },
]

const STATUTS = {
  en_attente: { l:'En attente',  color:'#F59E0B', bg:'#FFFBEB' },
  imprimee:   { l:'Imprimée',    color:'#10B981', bg:'#ECFDF5' },
  reimprimee: { l:'Réimprimée',  color:'#6366F1', bg:'#EEF2FF' },
}

const S = {
  page:       { padding:20, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:860, margin:'0 auto' },
  card:       { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 20px' },
  cardTitle:  { fontSize:12, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 },
  tabs:       { display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3 },
  tab:        { flex:1, padding:'8px 10px', border:'none', background:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F },
  tabActive:  { background:'#fff', color:'#0F172A', boxShadow:'0 1px 3px rgba(0,0,0,.08)' },
  input:      { width:'100%', border:'1.5px solid #E2E8F0', borderRadius:9, padding:'9px 12px', fontSize:14, fontFamily:F, outline:'none', background:'#F8FAFC', color:'#0F172A', boxSizing:'border-box' },
  btn:        { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', border:'none', fontFamily:F },
  btnSm:      { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 12px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', border:'none', fontFamily:F },
  badge:      { display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600 },
  empty:      { color:'#94A3B8', textAlign:'center', padding:'28px 0', fontSize:13 },
  rowBetween: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  divider:    { height:1, background:'#E2E8F0', margin:'8px 0' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcDLC(type, dateFab, joursLabo, sousCat) {
  const base = new Date(dateFab)
  let jours
  if (joursLabo && parseInt(joursLabo) > 0) {
    jours = parseInt(joursLabo)
  } else {
    const normes = DLC_NORMES[type] || DLC_NORMES.mise_en_place
    jours = (type === 'congelation' && sousCat && normes[sousCat] != null)
      ? normes[sousCat]
      : normes.default
  }
  const dlc = new Date(base)
  dlc.setDate(dlc.getDate() + jours)
  return dlc
}

function calcDDM(dateFab, joursDDM) {
  if (!joursDDM || parseInt(joursDDM) <= 0) return null
  const ddm = new Date(dateFab)
  ddm.setDate(ddm.getDate() + parseInt(joursDDM))
  return ddm
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })
}

function fmtDateTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "Il y a moins d'1h"
  if (h < 24) return `Il y a ${h}h`
  return `Il y a ${Math.floor(h / 24)}j`
}

function dlcUrgency(dlc) {
  const h = (new Date(dlc).getTime() - Date.now()) / 3600000
  if (h < 24) return 'danger'
  if (h < 48) return 'warning'
  return 'ok'
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ── EtiquetteContent (shared between preview + print) ─────────────────────────

function EtiquetteContent({ produit, type, dateFab, dlc, ddm, userName, hasLabo }) {
  const typeInfo = TYPES.find(t => t.k === type) || TYPES[0]
  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
        <span style={{ fontWeight:700, fontSize:13 }}>✦ Aria</span>
        <span style={{ fontWeight:600, fontSize:9, padding:'1px 5px', background:'#0F172A', color:'#fff', borderRadius:3, letterSpacing:'.3px' }}>
          {typeInfo.emoji} {typeInfo.l.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize:12, fontWeight:800, color:'#0F172A', letterSpacing:'-.2px', lineHeight:1.2, marginBottom:1 }}>
        {produit || '—'}
      </div>
      <div style={{ borderTop:'1px dashed #CBD5E1', margin:'2px 0' }} />
      <div style={{ fontSize:9 }}>Fabriqué le : {dateFab ? fmtDateTime(dateFab) : '—'}</div>
      <div style={{ fontSize:9 }}>Par : <strong>{userName || '—'}</strong></div>
      <div style={{ fontSize:9, fontWeight:800, color:'#0F172A' }}>DLC : {dlc ? fmtDate(dlc) : '—'}</div>
      {ddm && <div style={{ fontSize:8, color:'#6366F1' }}>DDM : {fmtDate(ddm)}</div>}
      {hasLabo && (
        <div style={{ marginTop:2, fontSize:7, fontWeight:700, color:'#6366F1', background:'#EEF2FF', padding:'1px 4px', borderRadius:2, display:'inline-block' }}>
          ⚗️ RÉSULTATS LABO
        </div>
      )}
    </>
  )
}

// ── EtiquettePreview (visible on screen) ──────────────────────────────────────

function EtiquettePreview({ produit, type, dateFab, dlc, ddm, userName, hasLabo }) {
  return (
    <div style={{ width:'100%', maxWidth:280, border:'1.5px solid #0F172A', borderRadius:6, padding:'8px 10px', fontFamily:"'DM Mono',monospace", fontSize:10, background:'#fff', display:'flex', flexDirection:'column', gap:1, lineHeight:1.4 }}>
      <EtiquetteContent produit={produit} type={type} dateFab={dateFab} dlc={dlc} ddm={ddm} userName={userName} hasLabo={hasLabo} />
    </div>
  )
}

// ── TabNouvelleEtiquette ───────────────────────────────────────────────────────

function TabNouvelleEtiquette({ currentUser, stock, onPrint }) {
  const [produit,        setProduit]        = useState('')
  const [type,           setType]           = useState('mise_en_place')
  const [sousCat,        setSousCat]        = useState('autre')
  const [dateFab,        setDateFab]        = useState(() => new Date().toISOString().slice(0, 16))
  const [hasLabo,        setHasLabo]        = useState(false)
  const [joursLabo,      setJoursLabo]      = useState('')
  const [joursDDM,       setJoursDDM]       = useState('')
  const [refAnalyse,     setRefAnalyse]     = useState('')
  const [saving,         setSaving]         = useState(false)
  const [showPratiques,  setShowPratiques]  = useState(false)
  const [toast,          setToast]          = useState(null)

  const dlc = produit && dateFab ? calcDLC(type, dateFab, hasLabo ? joursLabo : null, sousCat) : null
  const ddm = hasLabo && joursDDM && dateFab ? calcDDM(dateFab, joursDDM) : null

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function saveEtiquette(andPrint = false) {
    if (!produit.trim() || !dateFab) return
    setSaving(true)
    const dlcDate = calcDLC(type, dateFab, hasLabo ? joursLabo : null, sousCat)
    const ddmDate = hasLabo && joursDDM ? calcDDM(dateFab, joursDDM) : null

    const payload = {
      etablissement_id: currentUser.etablissementId,
      created_by: currentUser.isTeamMember ? null : currentUser.id,
      created_by_name: currentUser.name,
      produit: produit.trim(),
      type,
      date_fabrication: new Date(dateFab).toISOString(),
      dlc_calculee: dlcDate.toISOString(),
      ddm_calculee: ddmDate ? ddmDate.toISOString() : null,
      base_calcul: hasLabo ? 'laboratoire' : 'haccp',
      resultats_labo: hasLabo ? { jours: joursLabo, ddm_jours: joursDDM, ref: refAnalyse } : null,
      statut_impression: andPrint ? 'imprimee' : 'en_attente',
      imprimee_at: andPrint ? new Date().toISOString() : null,
      nb_impressions: andPrint ? 1 : 0,
    }

    const { error } = await supabase.from('etiquettes').insert(payload)
    setSaving(false)

    if (error) {
      showToast('Erreur : ' + error.message, false)
      return
    }

    if (andPrint) {
      onPrint({ produit: payload.produit, type, dateFab: payload.date_fabrication, dlc: dlcDate, ddm: ddmDate, userName: currentUser.name, hasLabo })
    } else {
      showToast('Étiquette sauvegardée dans la file d\'attente.')
    }

    setProduit('')
    setType('mise_en_place')
    setSousCat('autre')
    setDateFab(new Date().toISOString().slice(0, 16))
    setHasLabo(false)
    setJoursLabo('')
    setJoursDDM('')
    setRefAnalyse('')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {toast && (
        <div style={{ padding:'10px 14px', background: toast.ok ? '#ECFDF5' : '#FEF2F2', border:`1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}`, borderRadius:10, fontSize:13, color: toast.ok ? '#065F46' : '#DC2626', fontWeight:600 }}>
          {toast.msg}
        </div>
      )}

      {/* Session active */}
      <div style={{ ...S.card, display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}>
        <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#3B82F6,#1D4ED8)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
          {initials(currentUser.name)}
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>Session : {currentUser.name}</div>
          <div style={{ fontSize:11, color:'#94A3B8' }}>
            {ROLES[currentUser.role]?.icon} {ROLES[currentUser.role]?.label || currentUser.role}
          </div>
        </div>
        <span style={{ marginLeft:'auto', ...S.badge, background:'#ECFDF5', color:'#10B981' }}>● Actif</span>
      </div>

      {/* Produit */}
      <div style={S.card}>
        <div style={S.cardTitle}>Nom du produit</div>
        <input
          style={S.input}
          placeholder="Ex : Blanquette de veau, Mousse au chocolat…"
          value={produit}
          onChange={e => setProduit(e.target.value)}
        />
        {stock.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
            {stock.slice(0, 12).map(s => (
              <button
                key={s.id}
                onClick={() => setProduit(s.nom)}
                style={{ ...S.btnSm, fontSize:11, background:'#F1F5F9', color:'#475569', padding:'3px 8px' }}
              >
                {s.nom}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Type */}
      <div style={S.card}>
        <div style={S.cardTitle}>Type de conservation</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {TYPES.map(t => (
            <button
              key={t.k}
              onClick={() => { setType(t.k); setSousCat('autre') }}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px 8px', border:`1.5px solid ${type === t.k ? t.color : '#E2E8F0'}`, borderRadius:10, background: type === t.k ? t.bg : '#F8FAFC', cursor:'pointer', fontFamily:F, transition:'all .12s' }}
            >
              <span style={{ fontSize:24 }}>{t.emoji}</span>
              <span style={{ fontSize:12, fontWeight:700, color: type === t.k ? t.color : '#475569' }}>{t.l}</span>
              <span style={{ fontSize:10, color:'#94A3B8' }}>{DLC_NORMES[t.k]?.default}j HACCP</span>
            </button>
          ))}
        </div>

        {type === 'congelation' && (
          <div style={{ marginTop:12 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:8 }}>Sous-catégorie</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {SOUS_CATS.map(sc => {
                const jours = DLC_NORMES.congelation[sc.k] ?? DLC_NORMES.congelation.default
                return (
                  <button
                    key={sc.k}
                    onClick={() => setSousCat(sc.k)}
                    style={{ ...S.btnSm, background: sousCat === sc.k ? '#0F172A' : '#F1F5F9', color: sousCat === sc.k ? '#fff' : '#475569', fontSize:12 }}
                  >
                    {sc.l} ({jours}j)
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Date fabrication */}
      <div style={S.card}>
        <div style={S.cardTitle}>Date et heure de fabrication</div>
        <input style={S.input} type="datetime-local" value={dateFab} onChange={e => setDateFab(e.target.value)} />
      </div>

      {/* Labo toggle */}
      <div style={S.card}>
        <div style={{ ...S.rowBetween, cursor:'pointer' }} onClick={() => setHasLabo(v => !v)}>
          <div>
            <div style={{ fontSize:13.5, fontWeight:700, color:'#0F172A' }}>⚗️ Résultats laboratoire</div>
            <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:1 }}>Optionnel — remplace les normes HACCP</div>
          </div>
          <div style={{ width:44, height:24, borderRadius:99, background: hasLabo ? '#2563EB' : '#CBD5E1', position:'relative', transition:'background .2s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:2, left: hasLabo ? 22 : 2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
          </div>
        </div>

        {hasLabo && (
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>DLC labo (jours)</label>
              <input style={S.input} type="number" min="1" placeholder="Ex : 10" value={joursLabo} onChange={e => setJoursLabo(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>DDM labo (jours)</label>
              <input style={S.input} type="number" min="1" placeholder="Ex : 14" value={joursDDM} onChange={e => setJoursDDM(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Réf. analyse</label>
              <input style={S.input} placeholder="LAB-2024-001" value={refAnalyse} onChange={e => setRefAnalyse(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* DLC calculée */}
      {dlc && (
        <div style={{ ...S.card, border:'1.5px solid #BFDBFE', background:'#EFF6FF' }}>
          <div style={S.rowBetween}>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'#3B82F6', marginBottom:2 }}>
                DLC calculée · {hasLabo ? 'Résultats labo' : 'Normes HACCP'}
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:'#1D4ED8', fontFamily:"'DM Mono',monospace" }}>
                {fmtDate(dlc)}
              </div>
              {ddm && <div style={{ fontSize:12, color:'#6366F1', marginTop:2 }}>DDM : {fmtDate(ddm)}</div>}
            </div>
            <div style={{ fontSize:11.5, color:'#64748B', textAlign:'right' }}>
              <div>{TYPES.find(t => t.k === type)?.l}</div>
              {type === 'congelation' && <div>{SOUS_CATS.find(s => s.k === sousCat)?.l}</div>}
              <div style={{ fontWeight:600, color: hasLabo ? '#6366F1' : '#2563EB' }}>
                Base : {hasLabo ? 'Labo' : 'HACCP'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aperçu étiquette */}
      <div style={S.card}>
        <div style={S.cardTitle}>Aperçu étiquette (62×29mm)</div>
        <div style={{ display:'flex', justifyContent:'center' }}>
          <EtiquettePreview
            produit={produit}
            type={type}
            dateFab={dateFab ? new Date(dateFab).toISOString() : null}
            dlc={dlc}
            ddm={ddm}
            userName={currentUser.name}
            hasLabo={hasLabo}
          />
        </div>
      </div>

      {/* Bonnes pratiques congélation */}
      {type === 'congelation' && (
        <div style={{ ...S.card, border:'1px solid #BAE6FD', background:'#F0F9FF' }}>
          <div style={{ ...S.rowBetween, cursor:'pointer' }} onClick={() => setShowPratiques(v => !v)}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0369A1' }}>❄️ Bonnes pratiques de congélation</div>
            <span style={{ fontSize:16, color:'#0369A1', display:'inline-block', transform: showPratiques ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>▾</span>
          </div>
          {showPratiques && (
            <ul style={{ margin:'12px 0 0', paddingLeft:18, display:'flex', flexDirection:'column', gap:5 }}>
              {BONNES_PRATIQUES_CONGELATION.map((p, i) => (
                <li key={i} style={{ fontSize:12.5, color:'#0369A1', lineHeight:1.5 }}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:10 }}>
        <button
          onClick={() => saveEtiquette(true)}
          disabled={saving || !produit.trim() || !dateFab}
          style={{ ...S.btn, background:'#0F172A', color:'#fff', flex:1, opacity: saving || !produit.trim() || !dateFab ? .5 : 1 }}
        >
          🖨️ Imprimer
        </button>
        <button
          onClick={() => saveEtiquette(false)}
          disabled={saving || !produit.trim() || !dateFab}
          style={{ ...S.btn, background:'#F1F5F9', color:'#475569', flex:1, opacity: saving || !produit.trim() || !dateFab ? .5 : 1 }}
        >
          💾 Sauvegarder sans imprimer
        </button>
      </div>
    </div>
  )
}

// ── TabFileAttente ─────────────────────────────────────────────────────────────

function TabFileAttente({ currentUser, onPrint }) {
  const [etiquettes, setEtiquettes] = useState([])
  const [loading,    setLoading]    = useState(true)

  function load() {
    supabase.from('etiquettes')
      .select('*')
      .eq('etablissement_id', currentUser.etablissementId)
      .in('statut_impression', ['en_attente', 'reimprimee'])
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEtiquettes(data); setLoading(false) })
  }

  useEffect(() => { load() }, [currentUser.etablissementId])

  async function handlePrintOne(e) {
    await supabase.from('etiquettes').update({
      statut_impression: 'imprimee',
      imprimee_at: new Date().toISOString(),
      nb_impressions: (e.nb_impressions || 0) + 1,
    }).eq('id', e.id)
    setEtiquettes(p => p.filter(x => x.id !== e.id))
    onPrint({ produit: e.produit, type: e.type, dateFab: e.date_fabrication, dlc: new Date(e.dlc_calculee), ddm: e.ddm_calculee ? new Date(e.ddm_calculee) : null, userName: e.created_by_name, hasLabo: e.base_calcul === 'laboratoire' })
  }

  async function handlePrintAll() {
    if (etiquettes.length === 0) return
    const updates = etiquettes.map(e =>
      supabase.from('etiquettes').update({
        statut_impression: 'imprimee',
        imprimee_at: new Date().toISOString(),
        nb_impressions: (e.nb_impressions || 0) + 1,
      }).eq('id', e.id)
    )
    await Promise.all(updates)
    const first = etiquettes[0]
    setEtiquettes([])
    onPrint({ produit: first.produit, type: first.type, dateFab: first.date_fabrication, dlc: new Date(first.dlc_calculee), ddm: first.ddm_calculee ? new Date(first.ddm_calculee) : null, userName: first.created_by_name, hasLabo: first.base_calcul === 'laboratoire' })
  }

  if (loading) return <div style={S.empty}>Chargement…</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {etiquettes.length > 0 && (
        <div style={S.rowBetween}>
          <span style={{ fontSize:13, color:'#64748B', fontWeight:500 }}>
            {etiquettes.length} étiquette{etiquettes.length > 1 ? 's' : ''} en attente
          </span>
          <button onClick={handlePrintAll} style={{ ...S.btnSm, background:'#0F172A', color:'#fff' }}>
            🖨️ Tout imprimer
          </button>
        </div>
      )}

      {etiquettes.length === 0 ? (
        <div style={{ ...S.card, textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>File d'attente vide</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>Toutes les étiquettes ont été imprimées.</div>
        </div>
      ) : etiquettes.map(e => {
        const urgency  = dlcUrgency(e.dlc_calculee)
        const typeInfo = TYPES.find(t => t.k === e.type) || TYPES[0]
        return (
          <div key={e.id} style={{ ...S.card, borderLeft:`3px solid ${urgency === 'danger' ? '#EF4444' : urgency === 'warning' ? '#F59E0B' : '#E2E8F0'}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{e.produit}</span>
                  <span style={{ ...S.badge, background: typeInfo.bg, color: typeInfo.color }}>{typeInfo.emoji} {typeInfo.l}</span>
                  {urgency === 'danger'  && <span style={{ ...S.badge, background:'#FEF2F2', color:'#DC2626' }}>⚠️ DLC &lt; 24h</span>}
                  {urgency === 'warning' && <span style={{ ...S.badge, background:'#FFFBEB', color:'#D97706' }}>⏳ DLC &lt; 48h</span>}
                  {e.base_calcul === 'laboratoire' && <span style={{ ...S.badge, background:'#EEF2FF', color:'#6366F1', fontSize:10 }}>⚗️ Labo</span>}
                </div>
                <div style={{ fontSize:12, color:'#64748B', marginTop:4 }}>
                  Fabriqué le {fmtDateTime(e.date_fabrication)} · Par : <strong>{e.created_by_name}</strong> · DLC : <strong>{fmtDate(e.dlc_calculee)}</strong>
                </div>
                <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:2 }}>{timeAgo(e.created_at)}</div>
              </div>
              <button onClick={() => handlePrintOne(e)} style={{ ...S.btnSm, background:'#0F172A', color:'#fff', flexShrink:0 }}>
                🖨️ Imprimer
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── TabHistorique ──────────────────────────────────────────────────────────────

function TabHistorique({ currentUser, onPrint }) {
  const [etiquettes, setEtiquettes] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filters,    setFilters]    = useState({ type:'', statut:'', produit:'', employe:'' })

  useEffect(() => {
    supabase.from('etiquettes')
      .select('*')
      .eq('etablissement_id', currentUser.etablissementId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { if (data) setEtiquettes(data); setLoading(false) })
  }, [currentUser.etablissementId])

  const ff = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const filtered = etiquettes.filter(e => {
    if (filters.type   && e.type !== filters.type) return false
    if (filters.statut && e.statut_impression !== filters.statut) return false
    if (filters.produit  && !e.produit.toLowerCase().includes(filters.produit.toLowerCase())) return false
    if (filters.employe  && !e.created_by_name.toLowerCase().includes(filters.employe.toLowerCase())) return false
    return true
  })

  async function handleReimprimer(e) {
    const nb = (e.nb_impressions || 0) + 1
    await supabase.from('etiquettes').update({ statut_impression: 'reimprimee', nb_impressions: nb }).eq('id', e.id)
    setEtiquettes(p => p.map(x => x.id === e.id ? { ...x, statut_impression: 'reimprimee', nb_impressions: nb } : x))
    onPrint({ produit: e.produit, type: e.type, dateFab: e.date_fabrication, dlc: new Date(e.dlc_calculee), ddm: e.ddm_calculee ? new Date(e.ddm_calculee) : null, userName: e.created_by_name, hasLabo: e.base_calcul === 'laboratoire' })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Filtres */}
      <div style={S.card}>
        <div style={S.cardTitle}>Filtres</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Type</label>
            <select style={{ ...S.input, appearance:'auto' }} value={filters.type} onChange={e => ff('type', e.target.value)}>
              <option value="">Tous les types</option>
              {TYPES.map(t => <option key={t.k} value={t.k}>{t.l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Statut</label>
            <select style={{ ...S.input, appearance:'auto' }} value={filters.statut} onChange={e => ff('statut', e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Produit</label>
            <input style={S.input} placeholder="Rechercher…" value={filters.produit} onChange={e => ff('produit', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Employé</label>
            <input style={S.input} placeholder="Nom…" value={filters.employe} onChange={e => ff('employe', e.target.value)} />
          </div>
        </div>
        {filtered.length !== etiquettes.length && (
          <div style={{ marginTop:8, fontSize:12, color:'#94A3B8' }}>
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {etiquettes.length}
          </div>
        )}
      </div>

      {/* Liste */}
      {loading ? <div style={S.empty}>Chargement…</div>
      : filtered.length === 0 ? <div style={S.empty}>Aucune étiquette trouvée.</div>
      : filtered.map(e => {
        const typeInfo = TYPES.find(t => t.k === e.type) || TYPES[0]
        const statut   = STATUTS[e.statut_impression] || STATUTS.en_attente
        const urgency  = dlcUrgency(e.dlc_calculee)
        return (
          <div key={e.id} style={{ ...S.card, borderLeft:`2px solid ${urgency === 'danger' ? '#EF4444' : '#E2E8F0'}` }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{e.produit}</span>
                  <span style={{ ...S.badge, background: typeInfo.bg, color: typeInfo.color }}>{typeInfo.emoji} {typeInfo.l}</span>
                  <span style={{ ...S.badge, background: statut.bg, color: statut.color }}>{statut.l}</span>
                  {e.base_calcul === 'laboratoire' && <span style={{ ...S.badge, background:'#EEF2FF', color:'#6366F1' }}>⚗️ Labo</span>}
                </div>
                <div style={{ fontSize:12, color:'#64748B' }}>
                  Fabriqué le {fmtDateTime(e.date_fabrication)} · Par : <strong>{e.created_by_name}</strong>
                </div>
                <div style={{ fontSize:12, color:'#64748B' }}>
                  DLC : <strong>{fmtDate(e.dlc_calculee)}</strong>
                  {e.ddm_calculee && <span> · DDM : {fmtDate(e.ddm_calculee)}</span>}
                </div>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>
                  {fmtDateTime(e.created_at)} · {e.nb_impressions || 0} impression{(e.nb_impressions || 0) > 1 ? 's' : ''}
                </div>
              </div>
              <button onClick={() => handleReimprimer(e)} style={{ ...S.btnSm, background:'#F1F5F9', color:'#475569', flexShrink:0 }}>
                🖨️ Réimprimer
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Etiquettes({ user, profile, stock = [], fromDashboard, onBack }) {
  const [tab,        setTab]        = useState('nouvelle')
  const [printData,  setPrintData]  = useState(null)
  const pendingPrint = useRef(false)

  const currentUser = {
    id:              user?.isTeamMember ? user?.memberId : user?.id,
    etablissementId: profile?.etablissement_id || user?.id,
    isTeamMember:    user?.isTeamMember || false,
    name:            profile?.name || 'Utilisateur',
    role:            profile?.role || 'employe',
  }

  useEffect(() => {
    if (pendingPrint.current && printData) {
      pendingPrint.current = false
      const t = setTimeout(() => {
        window.print()
        setPrintData(null)
      }, 150)
      return () => clearTimeout(t)
    }
  }, [printData])

  function handlePrint(data) {
    setPrintData(data)
    pendingPrint.current = true
  }

  const TABS = [
    { k:'nouvelle',   l:'Nouvelle étiquette', emoji:'🏷️' },
    { k:'attente',    l:"File d'attente",     emoji:'⏳' },
    { k:'historique', l:'Historique',         emoji:'📋' },
  ]

  return (
    <div style={S.page}>
      {/* Élément print — invisible à l'écran, visible uniquement @media print via CSS */}
      {printData && (
        <div className="etiquette-print" style={{ fontFamily:"'DM Mono',monospace", display:'flex', flexDirection:'column', gap:1, lineHeight:1.4 }}>
          <EtiquetteContent {...printData} />
        </div>
      )}

      {fromDashboard && (
        <button
          onClick={onBack}
          style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F }}
        >
          ← Retour
        </button>
      )}

      <div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0 }}>Étiquetage DLC / DDM</h2>
        <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>Normes HACCP · Résultats laboratoire · Impression Brother</p>
      </div>

      <div style={S.tabs}>
        {TABS.map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}), display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}
          >
            <span>{t.emoji}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      {tab === 'nouvelle'   && <TabNouvelleEtiquette currentUser={currentUser} stock={stock} onPrint={handlePrint} />}
      {tab === 'attente'    && <TabFileAttente        currentUser={currentUser} onPrint={handlePrint} />}
      {tab === 'historique' && <TabHistorique         currentUser={currentUser} onPrint={handlePrint} />}
    </div>
  )
}
