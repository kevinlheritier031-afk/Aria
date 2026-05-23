import { useState, useRef } from 'react'
import { insertScan, upsertStock, supabase } from '../lib/supabase'
import { uid, fdate, ftime, dlcStatus } from '../constants'

const CONF_OPTIONS = [
  { k:'conforme',     l:'Conforme',      color:'#10B981', bg:'#ECFDF5' },
  { k:'a_verifier',   l:'À vérifier',    color:'#F59E0B', bg:'#FFFBEB' },
  { k:'non_conforme', l:'Non conforme',  color:'#EF4444', bg:'#FEF2F2' },
]

// ── Image to base64 ───────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Conformity badge ──────────────────────────────────────────────────────────

function ConfBadge({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {CONF_OPTIONS.map(o => (
        <button key={o.k} type="button"
          style={{ ...S.confBtn, ...(value === o.k ? { background: o.bg, color: o.color, borderColor: o.color } : {}) }}
          onClick={() => onChange(o.k)}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

// ── Product row ───────────────────────────────────────────────────────────────

function ProductRow({ prod, onUpdate }) {
  return (
    <div style={S.prodRow}>
      <div style={S.prodInfo}>
        <span style={S.prodNom}>{prod.nom}</span>
        <span style={S.prodMeta}>
          {prod.q} {prod.u} · {prod.dlc || 'sans DLC'}
          {prod.px ? ` · ${Number(prod.px).toFixed(2)} €` : ''}
        </span>
      </div>
      <ConfBadge value={prod._conf || 'a_verifier'} onChange={v => onUpdate({ ...prod, _conf: v })} />
    </div>
  )
}

// ── View tabs ─────────────────────────────────────────────────────────────────

function ViewTabs({ view, setView }) {
  const tabs = [{ k:'scan', l:'Résumé' }, { k:'produits', l:'Produits' }, { k:'json', l:'JSON' }]
  return (
    <div style={S.viewTabs}>
      {tabs.map(t => (
        <button key={t.k} style={{ ...S.viewTab, ...(view === t.k ? S.viewTabActive : {}) }}
          onClick={() => setView(t.k)}>{t.l}</button>
      ))}
    </div>
  )
}

// ── Reception Page ────────────────────────────────────────────────────────────

export default function Reception({ scanLog = [], setScanLog, stock = [], setStock, user, profile, fromDashboard = false, onBack }) {
  const [image,     setImage]     = useState(null)   // base64
  const [imageUrl,  setImageUrl]  = useState(null)   // object URL for preview
  const [analyzing, setAnalyzing] = useState(false)
  const [result,    setResult]    = useState(null)   // { fournisseur, produits, total, conf }
  const [products,  setProducts]  = useState([])
  const [view,      setView]      = useState('scan')
  const [conf,      setConf]      = useState('a_verifier')
  const [saving,    setSaving]    = useState(false)
  const [error,       setError]       = useState('')
  const [saved,       setSaved]       = useState(false)
  const [toast,       setToast]       = useState('')
  const [fourModal,   setFourModal]   = useState(null)   // { id, nom, tel, email, adresse, siret, site } | null
  const [fourEditing, setFourEditing] = useState(false)
  const [fourForm,    setFourForm]    = useState({})
  const [fourSaving,  setFourSaving]  = useState(false)

  const galleryRef = useRef()
  const cameraRef  = useRef()

  async function handleFile(file) {
    if (!file) return
    setError('')
    setResult(null)
    setSaved(false)
    setImageUrl(URL.createObjectURL(file))
    const b64 = await fileToBase64(file)
    setImage(b64)
  }

  async function handleAnalyze() {
    if (!image) return
    setAnalyzing(true)
    setError('')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      const etablissementId = profile?.etablissement_id ?? null

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, userId: user.id, etablissementId, accessToken }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setResult(data)
      setProducts((data.produits || []).map(p => ({ ...p, _conf: 'a_verifier', id: uid() })))
      setConf(data.conf || 'a_verifier')
      setView('scan')

      if (data.fournisseur_cree === true && data.fournisseur_id) {
        const contact = data.fournisseur_contact || {}
        setFourModal({
          id:      data.fournisseur_id,
          nom:     data.fournisseur,
          tel:     contact.tel      || data.fournisseur_tel     || '',
          email:   contact.email    || data.fournisseur_email   || '',
          adresse: contact.adresse  || data.fournisseur_adresse || '',
          siret:   contact.siret    || data.fournisseur_siret   || '',
          site:    contact.site     || data.fournisseur_site    || '',
        })
        setFourEditing(false)
      } else if (data.fournisseur && data.fournisseur_id) {
        setToast(`Fournisseur "${data.fournisseur}" reconnu ✅`)
        setTimeout(() => setToast(''), 3500)
      }
    } catch (e) {
      setError(`Analyse échouée : ${e.message}`)
    }
    setAnalyzing(false)
  }

  function updateProduct(updated) {
    setProducts(ps => ps.map(p => p.id === updated.id ? updated : p))
  }

  async function handleSave() {
    if (!result) return
    setSaving(true)
    setError('')
    const nonConf = products.filter(p => p._conf === 'non_conforme').length
    const finalConf = nonConf > 0 ? 'non_conforme' : products.every(p => p._conf === 'conforme') ? 'conforme' : 'a_verifier'
    const etablissementId = profile?.etablissement_id ?? null
    if (!etablissementId) console.warn('[Reception] ⚠️ etablissement_id null — scan sans liaison établissement')

    console.log('EID scan:', etablissementId)
    const scan = {
      id: crypto.randomUUID(), user_id: user.id, etablissement_id: etablissementId,
      four: result.fournisseur || '',
      nb: products.length,
      total: result.total || null,
      conf: finalConf,
      heure: ftime(),
      date_scan: fdate(),
      data_json: result,
    }
    const { error: scanError } = await insertScan(scan)
    if (scanError) {
      console.error('❌ INSERT FAIL:', 'scans', scanError)
      setError('Erreur enregistrement scan : ' + scanError.message)
      setSaving(false)
      return
    }
    console.log('✅ INSERT OK:', 'scans', scan)
    setScanLog(s => [scan, ...s])

    // Add products to stock
    const stockItems = products.map(p => ({
      id: crypto.randomUUID(), user_id: user.id, etablissement_id: etablissementId,
      nom: p.nom, q: p.q || 0, u: p.u || 'unité',
      px: p.px || null, dlc: p.dlc || null,
      cat: p.cat || 'autre', four: result.fournisseur || '',
      lot: p.lot || null, date_reception: fdate(), st: p._conf,
    }))
    const { error: stockError } = await upsertStock(stockItems)
    if (stockError) {
      console.error('❌ INSERT FAIL:', 'stock', stockError)
      setError('Scan enregistré — erreur ajout stock : ' + stockError.message)
      setSaving(false)
      return
    }
    console.log('✅ INSERT OK:', 'stock', stockItems)
    setStock(s => [...stockItems, ...s])

    setSaving(false)
    setSaved(true)
  }

  async function saveFourEdits() {
    if (!fourModal?.id) return
    setFourSaving(true)
    const updates = {
      tel:     fourForm.tel     || null,
      email:   fourForm.email   || null,
      adresse: fourForm.adresse || null,
      siret:   fourForm.siret   || null,
      site:    fourForm.site    || null,
    }
    await supabase.from('fournisseurs').update(updates).eq('id', fourModal.id)
    setFourModal(null)
    setFourSaving(false)
    setToast(`Fournisseur "${fourModal.nom}" mis à jour ✅`)
    setTimeout(() => setToast(''), 3500)
  }

  function reset() {
    setImage(null); setImageUrl(null); setResult(null)
    setProducts([]); setError(''); setSaved(false)
  }

  // ── No image state ────────────────────────────────────────────────────────

  if (!imageUrl) {
    return (
      <div style={S.page}>
        {fromDashboard && (
          <button style={S.backBtn} onClick={onBack}>← Retour</button>
        )}
        <h1 style={S.title}>Réception</h1>
        <p style={S.subtitle}>Photographiez un bon de livraison ou une facture pour l'analyser avec l'IA.</p>

        <div style={S.uploadZone}>
          <div style={S.uploadIcon}>📷</div>
          <p style={S.uploadText}>Choisissez une source</p>
          <div style={S.uploadBtns}>
            <button style={S.uploadBtn} onClick={() => galleryRef.current?.click()}>
              🖼️ Galerie
            </button>
            <button style={{ ...S.uploadBtn, background: '#2563EB', color: '#fff', borderColor: '#2563EB' }}
              onClick={() => cameraRef.current?.click()}>
              📸 Prendre une photo
            </button>
          </div>
          <input ref={galleryRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => handleFile(e.target.files[0])} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>

        {/* Recent scans */}
        {scanLog.length > 0 && (
          <div style={S.card}>
            <div style={S.cardTitle}>Derniers scans</div>
            {scanLog.slice(0,5).map(s => {
              const c = CONF_OPTIONS.find(o => o.k === s.conf) || CONF_OPTIONS[1]
              return (
                <div key={s.id} style={S.scanRow}>
                  <span style={{ ...S.confDot, background: c.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={S.scanFour}>{s.four || '—'}</div>
                    <div style={S.scanMeta}>{s.date_scan} {s.heure} · {s.nb} produits</div>
                  </div>
                  {s.total != null && <span style={S.scanTotal}>{Number(s.total).toFixed(2)} €</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── With image ────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:'#0F172A', color:'#fff', padding:'10px 20px', borderRadius:99, fontSize:13.5, fontWeight:600, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,.2)', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Modal nouveau fournisseur */}
      {fourModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'rgba(15,23,42,.55)', backdropFilter:'blur(4px)' }} onClick={() => setFourModal(null)}>
          <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'24px 20px 40px', maxHeight:'90vh', overflowY:'auto', fontFamily:F }} onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div style={{ width:40, height:4, borderRadius:2, background:'#E2E8F0', margin:'0 auto 20px' }} />

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🏢</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#0F172A' }}>{fourModal.nom}</div>
                <div style={{ fontSize:12, color:'#10B981', fontWeight:600, marginTop:1 }}>✅ Nouveau fournisseur ajouté automatiquement</div>
              </div>
            </div>

            {!fourEditing ? (
              <>
                {/* Info display */}
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
                  {[
                    { icon:'📞', label:'Téléphone', val: fourModal.tel },
                    { icon:'✉️', label:'Email',     val: fourModal.email },
                    { icon:'📍', label:'Adresse',   val: fourModal.adresse },
                    { icon:'🏛️', label:'SIRET/TVA',  val: fourModal.siret },
                    { icon:'🌐', label:'Site web',  val: fourModal.site },
                  ].map(({ icon, label, val }) => val ? (
                    <div key={label} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', background:'#F8FAFC', borderRadius:12, border:'1px solid #E2E8F0' }}>
                      <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:2 }}>{label}</div>
                        <div style={{ fontSize:13.5, color:'#0F172A', fontWeight:500 }}>{val}</div>
                      </div>
                    </div>
                  ) : null)}
                  {!fourModal.tel && !fourModal.email && !fourModal.adresse && !fourModal.siret && !fourModal.site && (
                    <div style={{ fontSize:13, color:'#94A3B8', textAlign:'center', padding:'12px 0' }}>
                      Aucune coordonnée détectée sur la facture.
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setFourModal(null)} style={{ flex:1, padding:'12px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F, color:'#475569' }}>
                    Fermer
                  </button>
                  <button
                    onClick={() => { setFourEditing(true); setFourForm({ tel: fourModal.tel, email: fourModal.email, adresse: fourModal.adresse, siret: fourModal.siret, site: fourModal.site }) }}
                    style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F }}
                  >
                    ✏️ Modifier
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Edit form */}
                {[
                  { key:'tel',     icon:'📞', label:'Téléphone',  placeholder:'06 12 34 56 78' },
                  { key:'email',   icon:'✉️', label:'Email',      placeholder:'contact@fournisseur.fr' },
                  { key:'adresse', icon:'📍', label:'Adresse',    placeholder:'12 rue de la Paix, 75001 Paris' },
                  { key:'siret',   icon:'🏛️', label:'SIRET/TVA', placeholder:'12345678901234' },
                  { key:'site',    icon:'🌐', label:'Site web',   placeholder:'https://fournisseur.fr' },
                ].map(({ key, icon, label, placeholder }) => (
                  <div key={key} style={{ marginBottom:12 }}>
                    <label style={{ fontSize:11, fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:5, display:'block' }}>{icon} {label}</label>
                    <input
                      value={fourForm[key] || ''}
                      onChange={e => setFourForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, fontFamily:F, outline:'none', background:'#F8FAFC', color:'#1E293B', boxSizing:'border-box' }}
                    />
                  </div>
                ))}
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <button onClick={() => setFourEditing(false)} style={{ flex:1, padding:'12px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F, color:'#475569' }}>
                    Annuler
                  </button>
                  <button onClick={saveFourEdits} disabled={fourSaving} style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:F, opacity: fourSaving ? .7 : 1 }}>
                    {fourSaving ? 'Enregistrement…' : '✓ Enregistrer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}
      <div style={S.header}>
        <h1 style={S.title}>Réception</h1>
        <button style={S.btnGhost} onClick={reset}>← Nouvelle photo</button>
      </div>

      {/* Image preview */}
      <div style={S.imgWrap}>
        <img src={imageUrl} alt="Bon de livraison" style={S.img} />
        {!result && (
          <button style={{ ...S.analyzeBtn, opacity: analyzing ? .7 : 1 }}
            onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? '⟳ Analyse en cours…' : '🤖 Analyser avec Aria'}
          </button>
        )}
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      {/* Results */}
      {result && (
        <>
          <ViewTabs view={view} setView={setView} />

          {view === 'scan' && (
            <div style={S.card}>
              <div style={S.scanSummary}>
                <div style={S.summaryItem}>
                  <span style={S.summaryLabel}>Fournisseur</span>
                  <span style={S.summaryValue}>{result.fournisseur || '—'}</span>
                </div>
                <div style={S.summaryItem}>
                  <span style={S.summaryLabel}>Produits</span>
                  <span style={S.summaryValue}>{products.length}</span>
                </div>
                {result.total != null && (
                  <div style={S.summaryItem}>
                    <span style={S.summaryLabel}>Total HT</span>
                    <span style={{ ...S.summaryValue, fontFamily:"'DM Mono',monospace" }}>{Number(result.total).toFixed(2)} €</span>
                  </div>
                )}
              </div>
              <div style={S.cardTitle}>Conformité globale</div>
              <ConfBadge value={conf} onChange={setConf} />
            </div>
          )}

          {view === 'produits' && (
            <div style={S.card}>
              <div style={S.cardTitle}>Produits réceptionnés</div>
              {products.length === 0
                ? <div style={S.empty}>Aucun produit détecté</div>
                : products.map(p => (
                  <ProductRow key={p.id} prod={p} onUpdate={updateProduct} />
                ))
              }
            </div>
          )}

          {view === 'json' && (
            <div style={S.card}>
              <div style={S.cardTitle}>Données brutes</div>
              <pre style={S.json}>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          {/* Save */}
          {!saved ? (
            <button style={{ ...S.saveBtn, opacity: saving ? .7 : 1 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : '✓ Enregistrer dans le stock'}
            </button>
          ) : (
            <div style={S.successBox}>
              ✅ Réception enregistrée — {products.length} produit{products.length !== 1 ? 's' : ''} ajouté{products.length !== 1 ? 's' : ''} au stock.
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const S = {
  page: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: F, maxWidth: 720, margin: '0 auto' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', fontFamily: F },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title:  { fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 },
  subtitle: { fontSize: 14, color: '#64748B', margin: 0 },
  btnGhost: { border: 'none', background: 'none', color: '#2563EB', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: F, padding: '6px 10px', borderRadius: 8 },

  uploadZone: { border: '2px dashed #E2E8F0', borderRadius: 16, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, background: '#F8FAFC' },
  uploadIcon: { fontSize: 48 },
  uploadText: { fontSize: 15, fontWeight: 500, color: '#64748B', margin: 0 },
  uploadBtns: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  uploadBtn:  { padding: '11px 22px', border: '1.5px solid #E2E8F0', borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 },

  imgWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' },
  img:     { width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' },
  analyzeBtn: { position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', color: '#fff', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 14px rgba(37,99,235,.4)', whiteSpace: 'nowrap' },

  viewTabs: { display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 3 },
  viewTab:  { flex: 1, padding: '8px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#64748B', cursor: 'pointer', fontFamily: F },
  viewTabActive: { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,.08)' },

  card: { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 20px' },
  cardTitle: { fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 },

  scanSummary: { display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' },
  summaryItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  summaryLabel: { fontSize: 11, color: '#94A3B8', fontWeight: 500 },
  summaryValue: { fontSize: 18, fontWeight: 700, color: '#0F172A' },

  confBtn: { padding: '6px 12px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: F, color: '#64748B', transition: 'all .15s' },
  confDot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 4 },

  prodRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap' },
  prodInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  prodNom:  { fontSize: 13.5, fontWeight: 600, color: '#0F172A' },
  prodMeta: { fontSize: 12, color: '#94A3B8' },

  json: { fontSize: 11.5, fontFamily: "'DM Mono',monospace", color: '#475569', background: '#F8FAFC', padding: 12, borderRadius: 8, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },

  scanRow:   { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F8FAFC' },
  scanFour:  { fontSize: 13.5, fontWeight: 600, color: '#0F172A' },
  scanMeta:  { fontSize: 12, color: '#94A3B8' },
  scanTotal: { fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: "'DM Mono',monospace", flexShrink: 0 },

  saveBtn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: '0 4px 12px rgba(16,185,129,.3)' },
  successBox: { padding: '14px 20px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, color: '#059669', fontSize: 14, fontWeight: 500, textAlign: 'center' },
  errorBox: { padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#DC2626', fontSize: 13 },
  empty: { color: '#94A3B8', textAlign: 'center', padding: '20px 0', fontSize: 13 },
}
