import { useState, useRef } from 'react'
import { insertScan, upsertStock } from '../lib/supabase'
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

export default function Reception({ scanLog = [], setScanLog, stock = [], setStock, user }) {
  const [image,     setImage]     = useState(null)   // base64
  const [imageUrl,  setImageUrl]  = useState(null)   // object URL for preview
  const [analyzing, setAnalyzing] = useState(false)
  const [result,    setResult]    = useState(null)   // { fournisseur, produits, total, conf }
  const [products,  setProducts]  = useState([])
  const [view,      setView]      = useState('scan')
  const [conf,      setConf]      = useState('a_verifier')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [saved,     setSaved]     = useState(false)

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
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, userId: user.id }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setResult(data)
      setProducts((data.produits || []).map(p => ({ ...p, _conf: 'a_verifier', id: uid() })))
      setConf(data.conf || 'a_verifier')
      setView('scan')
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
    const nonConf = products.filter(p => p._conf === 'non_conforme').length
    const finalConf = nonConf > 0 ? 'non_conforme' : products.every(p => p._conf === 'conforme') ? 'conforme' : 'a_verifier'

    const scan = {
      id: uid(), user_id: user.id,
      four: result.fournisseur || '',
      nb: products.length,
      total: result.total || null,
      conf: finalConf,
      heure: ftime(),
      date_scan: fdate(),
      data_json: result,
    }
    const { data } = await insertScan(scan)
    setScanLog(s => [scan, ...s])

    // Add products to stock
    const stockItems = products.map(p => ({
      id: uid(), user_id: user.id,
      nom: p.nom, q: p.q || 0, u: p.u || 'unité',
      px: p.px || null, dlc: p.dlc || null,
      cat: p.cat || 'autre', four: result.fournisseur || '',
      lot: p.lot || null, date_reception: fdate(), st: p._conf,
    }))
    await upsertStock(stockItems)
    setStock(s => [...stockItems, ...s])

    setSaving(false)
    setSaved(true)
  }

  function reset() {
    setImage(null); setImageUrl(null); setResult(null)
    setProducts([]); setError(''); setSaved(false)
  }

  // ── No image state ────────────────────────────────────────────────────────

  if (!imageUrl) {
    return (
      <div style={S.page}>
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

const F = "'DM Sans','Inter',sans-serif"

const S = {
  page: { padding: 20, display: 'flex', flexDirection: 'column', gap: 16, fontFamily: F, maxWidth: 720, margin: '0 auto' },
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
