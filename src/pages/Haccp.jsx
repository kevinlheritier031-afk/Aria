import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { fetchTemperatures, insertTemperature } from '../lib/supabase'
import { uid, fdate, ftime } from '../constants'

const ZONES = [
  { k:'frigo',           l:'Réfrigération',    icon:'🧊', unit:'°C', norm:'≤ 4°C',  check: v => v <= 4  },
  { k:'chaud',           l:'Maintien chaud',   icon:'🔥', unit:'°C', norm:'≥ 63°C', check: v => v >= 63 },
  { k:'reception',       l:'Réception',        icon:'📦', unit:'°C', norm:'≤ 8°C',  check: v => v <= 8  },
  { k:'refroidissement', l:'Refroidissement',  icon:'❄️', unit:'°C', norm:'≤ 10°C en < 2h', check: v => v <= 10 },
]

const CONF_COLOR = { true:'#10B981', false:'#EF4444', null:'#94A3B8' }
const CONF_BG    = { true:'#ECFDF5', false:'#FEF2F2', null:'#F8FAFC' }
const CONF_LABEL = { true:'Conforme', false:'Non conforme', null:'—' }

// ── Thermometer visual ────────────────────────────────────────────────────────

function TempIndicator({ value, zone }) {
  if (value === '' || isNaN(Number(value))) return null
  const v = Number(value)
  const conforme = zone.check(v)
  return (
    <div style={{ ...S.tempIndicator, background: conforme ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${conforme ? '#A7F3D0' : '#FECACA'}` }}>
      <span style={{ fontSize:20 }}>{conforme ? '✅' : '⚠️'}</span>
      <div>
        <div style={{ fontSize:15, fontWeight:700, color: conforme ? '#059669' : '#DC2626' }}>
          {v} {zone.unit}
        </div>
        <div style={{ fontSize:12, color: conforme ? '#059669' : '#DC2626' }}>
          {conforme ? 'Conforme' : 'Non conforme'} — norme : {zone.norm}
        </div>
      </div>
    </div>
  )
}

// ── Relevé row ────────────────────────────────────────────────────────────────

function RelRow({ rel }) {
  const zone = ZONES.find(z => z.k === rel.contexte) || { l: rel.contexte, icon:'🌡️' }
  const key  = String(rel.conforme)
  return (
    <div style={S.relRow}>
      <span style={{ fontSize:20 }}>{zone.icon}</span>
      <div style={S.relInfo}>
        <div style={S.relZone}>{zone.l}</div>
        <div style={S.relMeta}>{rel.created_at?.slice(0,10)} {rel.created_at?.slice(11,16)}</div>
        {rel.note && <div style={S.relNote}>{rel.note}</div>}
      </div>
      <div style={S.relRight}>
        <div style={{ fontSize:18, fontWeight:800, fontFamily:"'DM Mono',monospace", color:'#0F172A' }}>
          {rel.valeur}°C
        </div>
        <span style={{ ...S.confBadge, background: CONF_BG[key], color: CONF_COLOR[key] }}>
          {CONF_LABEL[key]}
        </span>
      </div>
    </div>
  )
}

// ── HACCP Page ────────────────────────────────────────────────────────────────

export default function Haccp({ user, scanLog = [], fromDashboard = false, onBack }) {
  const [zone,    setZone]    = useState('frigo')
  const [valeur,  setValeur]  = useState('')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [releves, setReleves] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabMain, setTabMain] = useState('releves')

  const currentZone = ZONES.find(z => z.k === zone)

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

  const stats = {
    total:  releves.length,
    conf:   releves.filter(r => r.conforme === true).length,
    nconf:  releves.filter(r => r.conforme === false).length,
  }

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}
      <h1 style={S.title}>HACCP</h1>

      {/* Main tabs */}
      <div style={S.tabs}>
        {[{k:'releves',l:'Relevés température'},{k:'scans',l:'Conformité réceptions'},{k:'nettoyage',l:'Plans de nettoyage'}].map(t => (
          <button key={t.k} style={{ ...S.tab, ...(tabMain === t.k ? S.tabActive : {}) }} onClick={() => setTabMain(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Relevés de température ───────────────────────────────────────── */}

      {tabMain === 'releves' && (
        <>
          {/* KPIs */}
          <div style={S.kpiRow}>
            <div style={S.kpi}>
              <span style={{ fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace", color:'#0F172A' }}>{stats.total}</span>
              <span style={S.kpiLabel}>Relevés</span>
            </div>
            <div style={{ ...S.kpi, background:'#ECFDF5' }}>
              <span style={{ fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace", color:'#10B981' }}>{stats.conf}</span>
              <span style={S.kpiLabel}>Conformes</span>
            </div>
            <div style={{ ...S.kpi, background:'#FEF2F2' }}>
              <span style={{ fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace", color:'#EF4444' }}>{stats.nconf}</span>
              <span style={S.kpiLabel}>Non conformes</span>
            </div>
          </div>

          {/* Form */}
          <div style={S.card}>
            <div style={S.cardTitle}>Nouveau relevé</div>

            {/* Zone selector */}
            <div style={S.zoneGrid}>
              {ZONES.map(z => (
                <button key={z.k} style={{ ...S.zoneBtn, ...(zone === z.k ? S.zoneBtnActive : {}) }}
                  onClick={() => setZone(z.k)}>
                  <span style={{ fontSize:22 }}>{z.icon}</span>
                  <span style={{ fontSize:12, fontWeight:500, marginTop:2 }}>{z.l}</span>
                  <span style={{ fontSize:10, color:'#94A3B8' }}>{z.norm}</span>
                </button>
              ))}
            </div>

            {/* Temperature input */}
            <div style={S.tempRow}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                <input
                  style={S.tempInput}
                  type="number" step="0.1"
                  value={valeur}
                  onChange={e => setValeur(e.target.value)}
                  placeholder="0.0"
                />
                <span style={S.tempUnit}>°C</span>
              </div>
              <TempIndicator value={valeur} zone={currentZone} />
            </div>

            <input style={{ ...S.input, marginTop:10 }} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Note optionnelle (ex : frigo n°2, sonde de…)" />

            <button style={{ ...S.saveBtn, opacity: saving ? .6 : 1, marginTop:14 }}
              onClick={handleSave} disabled={saving || valeur === ''}>
              {saving ? 'Enregistrement…' : '+ Enregistrer ce relevé'}
            </button>
          </div>

          {/* History */}
          <div style={S.card}>
            <div style={S.cardTitle}>Historique des relevés</div>
            {loading
              ? <div style={S.empty}>Chargement…</div>
              : releves.length === 0
                ? <div style={S.empty}>Aucun relevé enregistré.</div>
                : releves.map(r => <RelRow key={r.id} rel={r} />)
            }
          </div>
        </>
      )}

      {/* ── Conformité réceptions ────────────────────────────────────────── */}

      {tabMain === 'scans' && (
        <div style={S.card}>
          <div style={S.cardTitle}>Réceptions et conformité HACCP</div>
          {scanLog.length === 0
            ? <div style={S.empty}>Aucune réception enregistrée.</div>
            : scanLog.map(s => {
              const conf = s.conf === 'conforme', nconf = s.conf === 'non_conforme'
              return (
                <div key={s.id} style={S.scanRow}>
                  <div style={{ ...S.scanDot, background: conf ? '#10B981' : nconf ? '#EF4444' : '#F59E0B' }} />
                  <div style={S.scanInfo}>
                    <div style={S.scanFour}>{s.four || 'Fournisseur inconnu'}</div>
                    <div style={S.scanMeta}>{s.date_scan} {s.heure} · {s.nb} produits · {s.conf === 'conforme' ? 'Conforme' : s.conf === 'non_conforme' ? 'Non conforme' : 'À vérifier'}</div>
                  </div>
                  {s.total != null && <span style={S.scanTotal}>{Number(s.total).toFixed(2)} €</span>}
                </div>
              )
            })
          }
        </div>
      )}

      {/* ── Plans de nettoyage ───────────────────────────────────────────── */}

      {tabMain === 'nettoyage' && (
        <div style={{ ...S.card, textAlign:'center', padding:'60px 40px' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🧹</div>
          <div style={{ fontSize:17, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Plans de nettoyage</div>
          <div style={{ fontSize:14, color:'#94A3B8', maxWidth:320, margin:'0 auto' }}>
            Création de plans de nettoyage personnalisables, check-lists quotidiennes et traçabilité — disponible prochainement.
          </div>
          <div style={{ marginTop:20, padding:'8px 18px', background:'#EFF6FF', color:'#2563EB', borderRadius:99, fontSize:12, fontWeight:600, display:'inline-block' }}>
            Bientôt disponible
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F = "'DM Sans','Inter',sans-serif"

const S = {
  page: { padding:20, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:800, margin:'0 auto' },
  backBtn: { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F },
  title: { fontSize:22, fontWeight:700, color:'#0F172A', margin:0 },

  tabs: { display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3, flexWrap:'wrap' },
  tab:  { flex:1, padding:'8px 10px', border:'none', background:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' },
  tabActive: { background:'#fff', color:'#0F172A', boxShadow:'0 1px 3px rgba(0,0,0,.08)' },

  kpiRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 },
  kpi: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4, alignItems:'center' },
  kpiLabel: { fontSize:11, color:'#64748B', fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' },

  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 20px' },
  cardTitle: { fontSize:12, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 },

  zoneGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 },
  zoneBtn:  { display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'12px 8px', border:'1.5px solid #E2E8F0', borderRadius:10, background:'#F8FAFC', cursor:'pointer', fontFamily:F, transition:'border-color .15s' },
  zoneBtnActive: { borderColor:'#2563EB', background:'#EFF6FF' },

  tempRow: { display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' },
  tempInput: { fontSize:32, fontWeight:800, width:100, border:'2px solid #E2E8F0', borderRadius:12, padding:'12px 14px', fontFamily:"'DM Mono',monospace", color:'#0F172A', background:'#F8FAFC', outline:'none', textAlign:'center', boxSizing:'border-box' },
  tempUnit: { fontSize:22, fontWeight:700, color:'#64748B' },
  tempIndicator: { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, flex:1 },

  input: { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:13.5, fontFamily:F, background:'#F8FAFC', outline:'none', boxSizing:'border-box', color:'#0F172A' },
  saveBtn: { width:'100%', padding:'12px', background:'#2563EB', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F },

  relRow: { display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid #F8FAFC' },
  relInfo: { flex:1, minWidth:0 },
  relZone: { fontSize:13.5, fontWeight:600, color:'#0F172A' },
  relMeta: { fontSize:11.5, color:'#94A3B8' },
  relNote: { fontSize:11.5, color:'#64748B', fontStyle:'italic' },
  relRight: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 },
  confBadge: { fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:99 },

  scanRow: { display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid #F8FAFC' },
  scanDot: { width:10, height:10, borderRadius:'50%', flexShrink:0 },
  scanInfo: { flex:1 },
  scanFour: { fontSize:13.5, fontWeight:600, color:'#0F172A' },
  scanMeta: { fontSize:11.5, color:'#94A3B8' },
  scanTotal: { fontSize:13, fontWeight:700, color:'#0F172A', fontFamily:"'DM Mono',monospace", flexShrink:0 },

  empty: { color:'#94A3B8', textAlign:'center', padding:'30px 0', fontSize:13 },
}
