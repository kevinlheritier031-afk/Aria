import { useState, useEffect, useRef } from 'react'
import { fetchLabResults, insertLabResult } from '../lib/supabase'
import { uid } from '../constants'

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const STATUS_CFG = {
  conforme:     { label: 'Conforme',     color: '#10B981', bg: '#ECFDF5', icon: '✓' },
  non_conforme: { label: 'Non conforme', color: '#EF4444', bg: '#FEF2F2', icon: '✗' },
  a_verifier:   { label: 'À vérifier',  color: '#F59E0B', bg: '#FFFBEB', icon: '⚠' },
}

export default function Laboratoire({ user, fromDashboard, onBack }) {
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [file,      setFile]      = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [analysing, setAnalysing] = useState(false)
  const [result,    setResult]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState(null)
  const inputRef = useRef()

  useEffect(() => {
    fetchLabResults(user.id).then(({ data }) => {
      if (data) setResults(data)
      setLoading(false)
    })
  }, [user.id])

  function processFile(f) {
    setResult(null); setSaved(false); setError(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      setFile({ name: f.name, base64: dataUrl.split(',')[1] })
      setPreview(f.type.startsWith('image/') ? dataUrl : null)
    }
    reader.readAsDataURL(f)
  }

  async function handleAnalyse() {
    if (!file) return
    setAnalysing(true); setError(null)
    try {
      const res  = await fetch('/api/analyze-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: file.base64, userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur analyse')
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setAnalysing(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    const payload = {
      id: uid(), user_id: user.id,
      product_name:       result.product_name,
      analysis_date:      result.analysis_date,
      lab_name:           result.lab_name,
      status:             result.status,
      dlc_certified:      result.dlc_certified,
      recommendations:    result.recommendations,
      certificate_number: result.certificate_number,
      raw_data:           JSON.stringify(result),
      created_at:         new Date().toISOString(),
    }
    const { error: e } = await insertLabResult(payload)
    if (!e) { setResults(r => [payload, ...r]); setSaved(true) }
    setSaving(false)
  }

  const sc = STATUS_CFG[result?.status] || STATUS_CFG.a_verifier

  return (
    <div style={{ padding: 20, maxWidth: 680, margin: '0 auto', fontFamily: F }}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}

      <div style={S.header}>
        <div style={S.headerIcon}>🔬</div>
        <div>
          <h1 style={S.title}>Laboratoire</h1>
          <p style={S.subtitle}>Analysez vos rapports d'analyse par IA et gérez vos certifications</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        style={S.dropzone}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }} />
        {preview ? (
          <img src={preview} alt="aperçu" style={{ maxHeight:180, maxWidth:'100%', borderRadius:10, objectFit:'contain' }} />
        ) : (
          <>
            <div style={{ fontSize:36, marginBottom:8 }}>📄</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#0F172A' }}>
              {file ? file.name : 'Appuyer ou déposer une image'}
            </div>
            <div style={{ fontSize:13, color:'#94A3B8', marginTop:4 }}>
              JPG, PNG — rapport d'analyse ou certificat de conformité
            </div>
          </>
        )}
        {file && !preview && (
          <div style={{ fontSize:13, color:'#2563EB', marginTop:8, fontWeight:600 }}>📄 {file.name}</div>
        )}
      </div>

      {file && !result && (
        <button style={{ ...S.btnPrimary, width:'100%', marginTop:14, opacity: analysing ? .7 : 1 }}
          onClick={handleAnalyse} disabled={analysing}>
          {analysing
            ? <><span style={{ display:'inline-block', animation:'spin .8s linear infinite' }}>✦</span> Analyse en cours…</>
            : '🔬 Analyser par IA'}
        </button>
      )}

      {error && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'12px 16px', color:'#DC2626', fontSize:14, marginTop:14 }}>
          ⚠ {error}
        </div>
      )}

      {result && (
        <div style={{ ...S.card, marginTop:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ ...S.statusBadge, background:sc.bg, color:sc.color }}>
              {sc.icon} {sc.label}
            </div>
            <div style={{ flex:1 }}>
              <div style={S.resultProduct}>{result.product_name || '—'}</div>
              {result.lab_name && <div style={S.resultMeta}>{result.lab_name}</div>}
            </div>
          </div>

          <div style={S.infoGrid}>
            {result.analysis_date  && <InfoCell label="Date d'analyse"  value={result.analysis_date} />}
            {result.dlc_certified  && <InfoCell label="DLC certifiée"   value={result.dlc_certified} />}
            {result.certificate_number && <InfoCell label="N° certificat" value={result.certificate_number} />}
          </div>

          {result.germs?.length > 0 && (
            <div style={{ marginTop:14 }}>
              <div style={S.sectionLabel}>Résultats microbiologiques</div>
              {result.germs.map((g, i) => (
                <div key={i} style={S.germRow}>
                  <span style={{ flex:1, fontSize:13 }}>{g.name}</span>
                  <span style={{ fontSize:13, fontFamily:"'DM Mono',monospace" }}>{g.value}</span>
                  <span style={{ fontSize:12, color:'#94A3B8' }}>/{g.limit}</span>
                  <span style={{ color: g.ok ? '#10B981' : '#EF4444', fontSize:16 }}>{g.ok ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          )}

          {result.recommendations && (
            <div style={{ marginTop:14, background:'#F8FAFC', borderRadius:10, padding:'10px 14px' }}>
              <div style={S.sectionLabel}>Recommandations</div>
              <div style={{ fontSize:13, color:'#475569', lineHeight:1.5 }}>{result.recommendations}</div>
            </div>
          )}

          {!saved ? (
            <button style={{ ...S.btnPrimary, width:'100%', marginTop:16, opacity: saving ? .7 : 1 }}
              onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : '💾 Enregistrer la certification'}
            </button>
          ) : (
            <div style={{ textAlign:'center', color:'#10B981', fontWeight:600, fontSize:14, marginTop:16, padding:10 }}>
              ✓ Certification enregistrée
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop:30 }}>
        <div style={S.sectionTitle}>Historique des analyses</div>
        {loading ? (
          <div style={S.empty}>Chargement…</div>
        ) : results.length === 0 ? (
          <div style={S.empty}>Aucune analyse enregistrée</div>
        ) : results.map(r => {
          const cfg = STATUS_CFG[r.status] || STATUS_CFG.a_verifier
          return (
            <div key={r.id} style={S.historyRow}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'#0F172A' }}>{r.product_name || '—'}</div>
                <div style={{ fontSize:12, color:'#94A3B8' }}>{r.analysis_date} · {cfg.label}</div>
              </div>
              {r.dlc_certified && (
                <div style={{ fontSize:12, color:'#2563EB', fontWeight:600 }}>DLC {r.dlc_certified}</div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function InfoCell({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <div style={{ fontSize:11, color:'#94A3B8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color:'#0F172A' }}>{value}</div>
    </div>
  )
}

const S = {
  backBtn:     { background:'none', border:'none', color:'#2563EB', fontSize:14, fontWeight:600, cursor:'pointer', padding:'4px 0', marginBottom:16, fontFamily:'inherit' },
  header:      { display:'flex', alignItems:'center', gap:14, marginBottom:24 },
  headerIcon:  { fontSize:32, width:56, height:56, background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  title:       { fontSize:22, fontWeight:800, color:'#0F172A', margin:0 },
  subtitle:    { fontSize:13, color:'#64748B', margin:'4px 0 0', fontWeight:400 },
  dropzone: {
    border:'2px dashed #CBD5E1', borderRadius:16, padding:'28px 24px',
    textAlign:'center', cursor:'pointer', background:'#FAFBFF',
    display:'flex', flexDirection:'column', alignItems:'center',
  },
  card:         { background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, padding:'20px 22px', boxShadow:'0 2px 12px rgba(15,23,42,.06)' },
  statusBadge:  { padding:'6px 14px', borderRadius:10, fontSize:14, fontWeight:700, flexShrink:0 },
  resultProduct:{ fontSize:16, fontWeight:700, color:'#0F172A' },
  resultMeta:   { fontSize:12, color:'#94A3B8', marginTop:2 },
  infoGrid:     { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:4 },
  sectionLabel: { fontSize:11, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 },
  germRow:      { display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F1F5F9' },
  historyRow:   { display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, marginBottom:10 },
  sectionTitle: { fontSize:13, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 },
  btnPrimary: {
    background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'#fff',
    border:'none', borderRadius:12, padding:'13px 20px',
    fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
    boxShadow:'0 4px 14px rgba(37,99,235,.3)',
  },
  empty: { color:'#94A3B8', textAlign:'center', padding:'30px 0', fontSize:14 },
}
