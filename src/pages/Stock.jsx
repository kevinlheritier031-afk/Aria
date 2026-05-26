import { useState, useEffect, useMemo, useRef } from 'react'
import { upsertStock, deleteStockItem, fetchLabResults, insertStockPerte } from '../lib/supabase'
import { CAT_ICON, CAT_COLOR, CAT_BG, UNITES, dlcStatus, dlcDays, dlcColor, uid, fdate, critique } from '../constants'

const CATS    = ['viande','poisson','laitier','epicerie','legumes','boissons','autre']
const MODES   = [{ k:'liste', l:'Liste' }, { k:'sortie', l:'Sortie' }]
const FILTERS = ['tout','commander','ok','j7','j3','expiré', ...CATS]
const FL      = { tout:'Tout', commander:'À commander', ok:'DLC OK', j7:'J-7', j3:'J-3', 'expiré':'Expirés' }

const MOTIFS = [
  { k:'consommé', l:'Consommé', icon:'🍽️', color:'#2563EB', bg:'#EFF6FF' },
  { k:'servi',    l:'Servi',    icon:'🧑‍🍳', color:'#10B981', bg:'#ECFDF5' },
  { k:'perte',    l:'Perte',    icon:'💸',   color:'#F59E0B', bg:'#FFFBEB' },
  { k:'périmé',   l:'Périmé',   icon:'🗑️',  color:'#EF4444', bg:'#FEF2F2' },
]

const DEL_MOTIFS = [
  { k:'erreur',     l:'Erreur de saisie', icon:'✏️',  desc:'Aucune perte enregistrée', color:'#64748B', bg:'#F8FAFC' },
  { k:'casse',      l:'Casse',            icon:'💥',  desc:'Produit endommagé',         color:'#F59E0B', bg:'#FFFBEB' },
  { k:'péremption', l:'Péremption',       icon:'📅',  desc:'DLC dépassée',              color:'#EF4444', bg:'#FEF2F2' },
  { k:'autre',      l:'Autre',            icon:'📝',  desc:'Précisez ci-dessous',       color:'#2563EB', bg:'#EFF6FF' },
]

// ── DLC Pill ──────────────────────────────────────────────────────────────────

function DlcPill({ dlc }) {
  if (!dlc) return null
  const st    = dlcStatus(dlc)
  const n     = dlcDays(dlc)
  const color = dlcColor(st)
  const label = { ok:'OK', warn:`J-${n}`, critical:`⚠ J-${n}`, expired:'Expiré', unknown:'—' }[st]
  return (
    <span style={{ ...S.pill, background:`${color}18`, color, border:`1px solid ${color}33` }}>
      {label}
    </span>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ item, onEdit, onDelete, mode, onSortie, certified, selMode = false, selected = false, onToggle }) {
  const cat  = item.cat || 'autre'
  const crit = critique(item)
  const st   = dlcStatus(item.dlc)

  return (
    <div
      style={{
        ...S.productCard,
        borderLeft: selMode ? undefined : `3px solid ${CAT_COLOR[cat]||'#94A3B8'}`,
        ...(selMode && selected && { border: '2px solid #2563EB', background: '#EFF6FF' }),
        opacity: st === 'expired' ? .65 : 1,
        cursor: selMode ? 'pointer' : undefined,
      }}
      onClick={selMode ? () => onToggle(item.id) : (mode === 'sortie' ? () => onSortie(item) : undefined)}
    >
      {selMode && (
        <div style={{ width:22, height:22, borderRadius:6, border: selected ? 'none' : '2px solid #CBD5E1', background: selected ? '#2563EB' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#fff', fontSize:13, fontWeight:700 }}>
          {selected ? '✓' : ''}
        </div>
      )}
      <div style={{ ...S.catIcon, background: CAT_BG[cat]||'#F8FAFC' }}>
        {CAT_ICON[cat]||'📦'}
      </div>

      <div style={S.cardInfo}>
        <div style={S.cardRow}>
          <span style={S.cardNom}>{item.nom}</span>
          {crit && (
            <span style={S.seuilBadge}>Seuil</span>
          )}
          {st === 'expired' && (
            <span style={{ fontSize:10, fontWeight:700, color:'#DC2626', background:'#FEF2F2', padding:'2px 7px', borderRadius:99, border:'1px solid #FECACA', whiteSpace:'nowrap' }}>Périmé</span>
          )}
        </div>
        <div style={S.cardMeta}>
          {item.four && <span>{item.four}</span>}
          {item.seuil_min != null && (
            <span style={{ color:'#F59E0B' }}>· min {item.seuil_min} {item.u}</span>
          )}
        </div>
        <div style={S.cardRow2}>
          <DlcPill dlc={item.dlc} />
          {item.px != null && (
            <span style={S.prixTag}>{Number(item.px).toFixed(2)} €/{item.u}</span>
          )}
          {certified && (
            <span style={{ fontSize:11, color:'#10B981', fontWeight:700, background:'#ECFDF5', padding:'2px 7px', borderRadius:6, border:'1px solid #6EE7B7' }}>✓ Certifié</span>
          )}
        </div>
      </div>

      <div style={mode === 'sortie' ? S.qtyDisplay : S.qtyDisplayRight}>
        <span style={{ ...S.qtyBig, color: crit ? '#F59E0B' : '#0F172A' }}>{item.q}</span>
        <span style={S.qtyU}>{item.u}</span>
      </div>

      {mode === 'liste' && !selMode && (
        <div style={S.cardActions}>
          <button style={S.actionBtn} onClick={() => onEdit(item)} title="Modifier">✏️</button>
          <button style={{ ...S.actionBtn, color:'#EF4444' }} onClick={() => onDelete(item.id)} title="Supprimer">🗑️</button>
        </div>
      )}

      {mode === 'sortie' && (
        <div style={S.sortieArrow}>›</div>
      )}
    </div>
  )
}

// ── Delete Qualification Modal ────────────────────────────────────────────────

function DeleteQualModal({ count, onConfirm, onClose }) {
  const [motif,   setMotif]   = useState('erreur')
  const [comment, setComment] = useState('')
  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth:420 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>
              Supprimer {count > 1 ? `${count} produits` : 'ce produit'}
            </div>
            <div style={{ fontSize:12.5, color:'#94A3B8', marginTop:2 }}>Motif de suppression</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <div style={S.motifGrid}>
            {DEL_MOTIFS.map(m => (
              <button key={m.k} type="button"
                style={{ ...S.motifBtn, padding:'14px 8px', ...(motif === m.k ? { background: m.bg, borderColor: m.color, color: m.color } : {}) }}
                onClick={() => setMotif(m.k)}>
                <span style={{ fontSize:22 }}>{m.icon}</span>
                <span style={{ fontSize:12, fontWeight:600, marginTop:2 }}>{m.l}</span>
                <span style={{ fontSize:10.5, color: motif === m.k ? m.color : '#94A3B8', marginTop:1 }}>{m.desc}</span>
              </button>
            ))}
          </div>
          {motif === 'autre' && (
            <div>
              <div style={S.fieldLabel}>Précisez</div>
              <textarea
                style={{ ...S.input, resize:'vertical', minHeight:68, marginTop:4 }}
                placeholder="Décrivez le motif…"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>
          )}
          {motif === 'erreur' && (
            <div style={{ fontSize:12.5, color:'#64748B', background:'#F8FAFC', borderRadius:10, padding:'10px 14px', border:'1px solid #E2E8F0' }}>
              Suppression pure — aucune perte ne sera enregistrée dans le registre.
            </div>
          )}
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button
            style={{ ...S.btnDanger, opacity: motif === 'autre' && !comment.trim() ? .5 : 1 }}
            onClick={() => onConfirm(motif, comment)}
            disabled={motif === 'autre' && !comment.trim()}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sortie Sheet ──────────────────────────────────────────────────────────────

function SortieSheet({ item, onConfirm, onClose }) {
  const [motif, setMotif] = useState('consommé')
  const [qte,   setQte]   = useState('1')

  function handleConfirm() {
    const q = parseFloat(qte)
    if (isNaN(q) || q <= 0) return
    onConfirm(item, q, motif)
  }

  const qteNum = parseFloat(qte) || 0

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>Sortie stock</div>
            <div style={{ fontSize:12.5, color:'#94A3B8', marginTop:2 }}>{item.nom} · stock actuel : {item.q} {item.u}</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          {/* Motif */}
          <div>
            <div style={S.fieldLabel}>Motif de sortie</div>
            <div style={S.motifGrid}>
              {MOTIFS.map(m => (
                <button key={m.k} type="button"
                  style={{ ...S.motifBtn, ...(motif === m.k ? { background: m.bg, borderColor: m.color, color: m.color } : {}) }}
                  onClick={() => setMotif(m.k)}>
                  <span style={{ fontSize:20 }}>{m.icon}</span>
                  <span style={{ fontSize:12, fontWeight:600, marginTop:2 }}>{m.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantité */}
          <div>
            <div style={S.fieldLabel}>Quantité à retirer ({item.u})</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button style={S.qtyBtn2}
                onClick={() => setQte(q => String(Math.max(0, (parseFloat(q)||0) - 1)))}>−</button>
              <input
                style={{ ...S.input, flex:1, textAlign:'center', fontSize:18, fontWeight:700, fontFamily:"'DM Mono',monospace" }}
                type="number" min="0" step="0.1"
                value={qte}
                onChange={e => setQte(e.target.value)}
              />
              <button style={S.qtyBtn2}
                onClick={() => setQte(q => String((parseFloat(q)||0) + 1))}>+</button>
            </div>
            {qteNum > item.q && (
              <div style={{ fontSize:13, color:'#DC2626', marginTop:6, padding:'10px 12px', background:'#FEF2F2', borderRadius:10, border:'1px solid #FECACA', fontWeight:500 }}>
                ⛔ Stock insuffisant. Vous avez seulement <strong>{item.q} {item.u}</strong> disponible{item.q > 1 ? 's' : ''}.
              </div>
            )}
          </div>

          <div style={{ fontSize:13, color:'#475569', background:'#F8FAFC', borderRadius:10, padding:'10px 14px' }}>
            Après sortie : <strong style={{ fontFamily:"'DM Mono',monospace" }}>{Math.max(0, item.q - qteNum)} {item.u}</strong>
          </div>
        </div>

        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button
            style={{ ...S.btnPrimary, opacity: (qteNum <= 0 || qteNum > item.q) ? .5 : 1 }}
            onClick={handleConfirm}
            disabled={qteNum <= 0 || qteNum > item.q}
          >
            Confirmer la sortie
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ item, fournisseurs, onSave, onClose, saving }) {
  const isNew = !item?.id
  const [form, setForm] = useState({
    nom:       item?.nom       || '',
    q:         item?.q         ?? '',
    u:         item?.u         || 'kg',
    px:        item?.px        ?? '',
    seuil_min: item?.seuil_min ?? '',
    cat:       item?.cat       || 'autre',
    four:      item?.four      || '',
    dlc:       item?.dlc       || '',
    lot:       item?.lot       || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.nom.trim()) return
    onSave({
      ...item, ...form,
      q:         Number(form.q)         || 0,
      px:        form.px        !== '' ? Number(form.px)        : null,
      seuil_min: form.seuil_min !== '' ? Number(form.seuil_min) : null,
    })
  }

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>{isNew ? 'Nouveau produit' : 'Modifier le produit'}</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          <Field label="Nom *">
            <input style={S.input} value={form.nom} autoFocus
              onChange={e => set('nom', e.target.value)} placeholder="Ex : Filet de bœuf" />
          </Field>

          <div style={S.row2}>
            <Field label="Quantité">
              <input style={S.input} type="number" min="0" step="0.1"
                value={form.q} onChange={e => set('q', e.target.value)} />
            </Field>
            <Field label="Unité">
              <select style={S.input} value={form.u} onChange={e => set('u', e.target.value)}>
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>

          <div style={S.row2}>
            <Field label={`Seuil min (${form.u})`}>
              <input style={S.input} type="number" min="0" step="0.1"
                value={form.seuil_min} onChange={e => set('seuil_min', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Prix (€/unité)">
              <input style={S.input} type="number" min="0" step="0.01"
                value={form.px} onChange={e => set('px', e.target.value)} placeholder="0.00" />
            </Field>
          </div>

          <Field label="Catégorie">
            <div style={S.catGrid}>
              {CATS.map(c => (
                <button key={c} type="button"
                  style={{ ...S.catBtn, ...(form.cat === c ? { borderColor: CAT_COLOR[c], background: CAT_BG[c] } : {}) }}
                  onClick={() => set('cat', c)}>
                  <span style={{ fontSize:20 }}>{CAT_ICON[c]}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Fournisseur">
            <input style={S.input} value={form.four}
              onChange={e => set('four', e.target.value)}
              list="edit-fours-list" placeholder="Nom du fournisseur" />
            <datalist id="edit-fours-list">
              {fournisseurs.map(f => <option key={f.id} value={f.nom} />)}
            </datalist>
          </Field>

          <div style={S.row2}>
            <Field label="DLC (JJ/MM/AAAA)">
              <input style={S.input} value={form.dlc}
                onChange={e => set('dlc', e.target.value)} placeholder="31/12/2025" />
            </Field>
            <Field label="N° lot">
              <input style={S.input} value={form.lot}
                onChange={e => set('lot', e.target.value)} placeholder="LOT-001" />
            </Field>
          </div>
        </div>

        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={{ ...S.btnPrimary, opacity: saving ? .6 : 1 }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : isNew ? '+ Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

// ── Stock Page ────────────────────────────────────────────────────────────────

export default function Stock({ stock = [], setStock, fournisseurs = [], user, profile, fromDashboard = false, onBack }) {
  const [mode,           setMode]           = useState('liste')
  const [filter,         setFilter]         = useState('tout')
  const [search,         setSearch]         = useState('')
  const [editItem,       setEditItem]       = useState(null)
  const [sortieItem,     setSortieItem]     = useState(null)
  const [deleteModal,    setDeleteModal]    = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [certifiedNames, setCertifiedNames] = useState(new Set())
  const [selMode,        setSelMode]        = useState(false)
  const [selectedIds,    setSelectedIds]    = useState(new Set())
  const [addMenu,        setAddMenu]        = useState(false)
  const [analyzing,      setAnalyzing]      = useState(false)
  const [photoProducts,  setPhotoProducts]  = useState(null)
  const [photoError,     setPhotoError]     = useState(null)

  const cameraRef        = useRef(null)
  const galleryRef       = useRef(null)
  const loggedExpiredRef = useRef(new Set())

  useEffect(() => {
    fetchLabResults(user.id).then(({ data }) => {
      if (data) {
        setCertifiedNames(new Set(
          data.filter(r => r.status === 'conforme').map(r => r.product_name?.trim().toLowerCase())
        ))
      }
    })
  }, [user.id])

  useEffect(() => {
    if (!user?.id) return
    const expired = stock.filter(i => dlcStatus(i.dlc) === 'expired' && !loggedExpiredRef.current.has(i.id))
    if (expired.length === 0) return
    expired.forEach(item => {
      loggedExpiredRef.current.add(item.id)
      insertStockPerte({
        id:               crypto.randomUUID(),
        stock_id:         item.id,
        lot_id:           item.lot || null,
        motif:            'péremption',
        commentaire:      null,
        quantite:         item.q,
        created_by:       user.id,
        user_id:          user.id,
        etablissement_id: profile?.etablissement_id,
        created_at:       new Date().toISOString(),
      })
    })
  }, [stock, user?.id])

  const filtered = useMemo(() => {
    let items = [...stock]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i => i.nom?.toLowerCase().includes(q) || i.four?.toLowerCase().includes(q))
    }
    if (filter === 'commander')      items = items.filter(critique)
    else if (filter === 'ok')        items = items.filter(i => dlcStatus(i.dlc) === 'ok')
    else if (filter === 'j7')        items = items.filter(i => dlcStatus(i.dlc) === 'warn')
    else if (filter === 'j3')        items = items.filter(i => dlcStatus(i.dlc) === 'critical')
    else if (filter === 'expiré')    items = items.filter(i => dlcStatus(i.dlc) === 'expired')
    else if (CATS.includes(filter))  items = items.filter(i => i.cat === filter)
    return items.sort((a, b) => {
      const order = { expired:0, critical:1, warn:2, ok:3, unknown:4 }
      return (order[dlcStatus(a.dlc)] ?? 4) - (order[dlcStatus(b.dlc)] ?? 4)
    })
  }, [stock, filter, search])

  const nCommander = useMemo(() => stock.filter(critique).length, [stock])

  async function handleSave(form) {
    setSaving(true)
    const payload = { ...form, user_id: user.id, etablissement_id: profile?.etablissement_id, updated_at: new Date().toISOString() }
    if (!payload.id) { payload.id = crypto.randomUUID(); payload.date_reception = fdate() }
    console.log('EID scan:', payload.etablissement_id)
    const { error } = await upsertStock([payload])
    if (error) {
      console.error('❌ INSERT FAIL:', 'stock', error)
      setSaving(false)
      return
    }
    console.log('✅ INSERT OK:', 'stock', payload)
    setStock(s => form.id ? s.map(i => i.id === form.id ? payload : i) : [payload, ...s])
    setSaving(false)
    setEditItem(null)
  }

  async function handleDeleteWithMotif(motif, commentaire) {
    if (!deleteModal) return
    const { ids } = deleteModal
    if (motif !== 'erreur') {
      const items = stock.filter(i => ids.includes(i.id))
      await Promise.all(items.map(item => insertStockPerte({
        id:               crypto.randomUUID(),
        stock_id:         item.id,
        lot_id:           item.lot || null,
        motif,
        commentaire:      motif === 'autre' ? commentaire.trim() : null,
        quantite:         item.q,
        created_by:       user.id,
        user_id:          user.id,
        etablissement_id: profile?.etablissement_id,
        created_at:       new Date().toISOString(),
      })))
    }
    await Promise.all(ids.map(id => deleteStockItem(id)))
    setStock(s => s.filter(i => !ids.includes(i.id)))
    if (ids.length > 1) { setSelectedIds(new Set()); setSelMode(false) }
    setDeleteModal(null)
  }

  async function handleSortie(item, qte, motif) {
    const newQ    = Math.max(0, item.q - qte)
    const updated = { ...item, q: newQ, user_id: user.id, etablissement_id: profile?.etablissement_id }
    const { error } = await upsertStock([updated])
    if (error) { console.error('❌ INSERT FAIL:', 'stock (sortie)', error); setSortieItem(null); return }
    console.log('✅ INSERT OK:', 'stock (sortie)', updated)
    setStock(s => s.map(i => i.id === item.id ? { ...i, q: newQ } : i))
    setSortieItem(null)
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }


  const updatePhotoProduct = (id, field, val) =>
    setPhotoProducts(prev => prev.map(p => p._id === id ? { ...p, [field]: val } : p))

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setAnalyzing(true)
    setPhotoError(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res  = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, userId: user.id, etablissementId: profile?.etablissement_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur analyse')
      const produits = (data.produits || []).map((p, i) => ({ ...p, _id: i }))
      if (produits.length === 0) {
        setPhotoError('Aucun produit détecté. Réessayez avec une image plus nette.')
      } else {
        setPhotoProducts(produits)
      }
    } catch (err) {
      setPhotoError(err.message || "Erreur lors de l'analyse")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handlePhotoInsert() {
    setSaving(true)
    const items = photoProducts
      .filter(p => (p.nom || '').trim())
      .map(p => ({
        id:               crypto.randomUUID(),
        nom:              p.nom.trim(),
        q:                Number(p.q) || 0,
        u:                p.u || 'kg',
        px:               p.px != null && p.px !== '' ? Number(p.px) : null,
        seuil_min:        null,
        cat:              p.cat || 'autre',
        four:             '',
        dlc:              p.dlc || '',
        lot:              p.lot || '',
        user_id:          user.id,
        etablissement_id: profile?.etablissement_id,
        date_reception:   fdate(),
        updated_at:       new Date().toISOString(),
      }))
    const { error } = await upsertStock(items)
    if (!error) {
      setStock(s => [...items, ...s])
      setPhotoProducts(null)
    }
    setSaving(false)
  }


  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Stock</h1>
          <div style={S.subtitle}>{stock.length} produit{stock.length !== 1 ? 's' : ''} · {nCommander > 0 && <span style={{ color:'#F59E0B' }}>{nCommander} à commander</span>}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {!selMode ? (
            <>
              {mode === 'liste' && (
                <button style={S.btnSel} onClick={() => { setSelMode(true); setSelectedIds(new Set()) }}>Sélectionner</button>
              )}
              <button style={S.btnAdd} onClick={() => setAddMenu(true)}>+ Ajouter</button>
            </>
          ) : (
            <button style={S.btnSel} onClick={() => { setSelMode(false); setSelectedIds(new Set()) }}>Annuler</button>
          )}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={S.modeTabs}>
        {MODES.map(m => (
          <button key={m.k} style={{ ...S.modeTab, ...(mode === m.k ? S.modeTabActive : {}) }}
            onClick={() => { setMode(m.k); setSelMode(false); setSelectedIds(new Set()) }}>{m.l}</button>
        ))}
      </div>

      {/* Search */}
      <input
        style={S.search}
        placeholder="🔍 Rechercher un produit ou fournisseur…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Filter pills */}
      <div style={S.pills}>
        {FILTERS.map(f => {
          const isActive = filter === f
          const isCmdr   = f === 'commander'
          return (
            <button key={f}
              style={{ ...S.pill2, ...(isActive ? (isCmdr ? S.pillOrange : S.pillActive) : {}) }}
              onClick={() => setFilter(f)}>
              {CATS.includes(f) ? `${CAT_ICON[f]} ` : ''}{FL[f] || f}
              {isCmdr && nCommander > 0 && (
                <span style={{ ...S.filterBadge, background: isActive ? '#F59E0B' : '#FDE68A', color: isActive ? '#fff' : '#92400E' }}>
                  {nCommander}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={S.count}>{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</div>

      {/* ── Liste / Sortie ── */}
      {filtered.length === 0
        ? <div style={S.empty}>Aucun produit{search ? ' trouvé' : ''}</div>
        : (
          <div style={S.list}>
            {filtered.map(item => (
              <ProductCard key={item.id} item={item} mode={mode}
                onEdit={setEditItem}
                onDelete={id => setDeleteModal({ ids: [id] })}
                onSortie={setSortieItem}
                certified={certifiedNames.has(item.nom?.trim().toLowerCase())}
                selMode={selMode}
                selected={selectedIds.has(item.id)}
                onToggle={toggleSelect}
              />
            ))}
          </div>
        )
      }

      {/* ── Delete qualification modal ── */}
      {deleteModal && (
        <DeleteQualModal
          count={deleteModal.ids.length}
          onConfirm={handleDeleteWithMotif}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {/* ── Sortie sheet ── */}
      {sortieItem && (
        <SortieSheet item={sortieItem} onConfirm={handleSortie} onClose={() => setSortieItem(null)} />
      )}

      {/* ── Edit modal ── */}
      {editItem !== null && (
        <EditModal item={editItem} fournisseurs={fournisseurs}
          onSave={handleSave} onClose={() => setEditItem(null)} saving={saving} />
      )}


      {/* ── Selection bar ── */}
      {selMode && selectedIds.size > 0 && (
        <div style={S.selBar}>
          <span style={{ fontSize:14, fontWeight:600, color:'#0F172A' }}>
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button style={S.btnDanger} onClick={() => setDeleteModal({ ids: [...selectedIds] })}>
            Supprimer
          </button>
        </div>
      )}

      {/* ── Hidden file inputs ── */}
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleFileSelect} />
      <input ref={galleryRef} type="file" accept="image/*"                        style={{ display:'none' }} onChange={handleFileSelect} />

      {/* ── Analyzing overlay ── */}
      {analyzing && (
        <div style={S.analyzingOverlay}>
          <div style={S.analyzingBox}>
            <div style={S.analyzingIcon}>📸</div>
            <div style={S.analyzingTitle}>Analyse en cours…</div>
            <div style={S.analyzingSub}>Aria identifie les produits</div>
          </div>
        </div>
      )}

      {/* ── Photo error ── */}
      {photoError && (
        <div style={S.backdrop} onClick={() => setPhotoError(null)}>
          <div style={{ ...S.modal, maxWidth:340 }} onClick={e => e.stopPropagation()}>
            <div style={S.confirmBody}>
              <div style={S.confirmIcon}>⚠️</div>
              <div style={S.confirmTitle}>Analyse impossible</div>
              <div style={S.confirmText}>{photoError}</div>
              <button style={{ ...S.btnPrimary, width:'100%' }} onClick={() => setPhotoError(null)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add menu ── */}
      {addMenu && (
        <div style={S.backdrop} onClick={() => setAddMenu(false)}>
          <div style={{ ...S.modal, maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>Ajouter un produit</span>
              <button style={S.closeBtn} onClick={() => setAddMenu(false)}>✕</button>
            </div>
            <div style={{ padding:'16px 20px 24px', display:'flex', flexDirection:'column', gap:10 }}>
              <button style={S.addOptionBtn} onClick={() => { setAddMenu(false); setEditItem({}) }}>
                <span style={{ fontSize:24 }}>✏️</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'#0F172A', fontFamily:F }}>Saisie manuelle</div>
                  <div style={{ fontSize:12, color:'#94A3B8', marginTop:2, fontFamily:F }}>Remplir le formulaire manuellement</div>
                </div>
              </button>
              <button style={S.addOptionBtn} onClick={() => { setAddMenu(false); cameraRef.current?.click() }}>
                <span style={{ fontSize:24 }}>📷</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'#0F172A', fontFamily:F }}>Prendre une photo</div>
                  <div style={{ fontSize:12, color:'#94A3B8', marginTop:2, fontFamily:F }}>Photo d'un produit ou d'un document</div>
                </div>
              </button>
              <button style={S.addOptionBtn} onClick={() => { setAddMenu(false); galleryRef.current?.click() }}>
                <span style={{ fontSize:24 }}>🖼️</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'#0F172A', fontFamily:F }}>Choisir dans la galerie</div>
                  <div style={{ fontSize:12, color:'#94A3B8', marginTop:2, fontFamily:F }}>Importer une photo existante</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo products confirm ── */}
      {photoProducts && (
        <div style={S.backdrop} onClick={() => setPhotoProducts(null)}>
          <div style={{ ...S.modal, maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <div>
                <div style={S.modalTitle}>{photoProducts.length} produit{photoProducts.length > 1 ? 's' : ''} détecté{photoProducts.length > 1 ? 's' : ''}</div>
                <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>Vérifiez et modifiez avant d'ajouter au stock</div>
              </div>
              <button style={S.closeBtn} onClick={() => setPhotoProducts(null)}>✕</button>
            </div>
            <div style={{ ...S.modalBody, gap:12 }}>
              {photoProducts.map(p => (
                <div key={p._id} style={{ border:'1.5px solid #E2E8F0', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8, position:'relative' }}>
                  <button
                    style={{ position:'absolute', top:8, right:8, width:24, height:24, border:'none', background:'#FEF2F2', borderRadius:6, color:'#EF4444', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F }}
                    onClick={() => setPhotoProducts(prev => prev.filter(x => x._id !== p._id))}
                  >✕</button>
                  <div style={{ paddingRight:28 }}>
                    <div style={S.fieldLabel}>Nom</div>
                    <input style={S.input} value={p.nom || ''} onChange={e => updatePhotoProduct(p._id, 'nom', e.target.value)} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div>
                      <div style={S.fieldLabel}>Quantité</div>
                      <input style={S.input} type="number" min="0" step="0.1" value={p.q ?? ''} onChange={e => updatePhotoProduct(p._id, 'q', e.target.value)} />
                    </div>
                    <div>
                      <div style={S.fieldLabel}>Unité</div>
                      <select style={S.input} value={p.u || 'kg'} onChange={e => updatePhotoProduct(p._id, 'u', e.target.value)}>
                        {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div>
                      <div style={S.fieldLabel}>DLC (JJ/MM/AAAA)</div>
                      <input style={S.input} value={p.dlc || ''} onChange={e => updatePhotoProduct(p._id, 'dlc', e.target.value)} placeholder="JJ/MM/AAAA" />
                    </div>
                    <div>
                      <div style={S.fieldLabel}>Prix (€)</div>
                      <input style={S.input} type="number" min="0" step="0.01" value={p.px ?? ''} onChange={e => updatePhotoProduct(p._id, 'px', e.target.value)} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <div style={S.fieldLabel}>Catégorie</div>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:4 }}>
                      {CATS.map(c => (
                        <button key={c} type="button"
                          style={{ ...S.catBtn, minWidth:32, flex:'none', padding:'7px', ...(p.cat === c ? { borderColor: CAT_COLOR[c], background: CAT_BG[c] } : {}) }}
                          onClick={() => updatePhotoProduct(p._id, 'cat', c)}>
                          <span style={{ fontSize:18 }}>{CAT_ICON[c]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnSecondary} onClick={() => setPhotoProducts(null)}>Annuler</button>
              <button
                style={{ ...S.btnPrimary, opacity: saving || photoProducts.filter(p => (p.nom||'').trim()).length === 0 ? .5 : 1 }}
                onClick={handlePhotoInsert}
                disabled={saving || photoProducts.filter(p => (p.nom||'').trim()).length === 0}
              >
                {saving ? 'Ajout…' : `Ajouter ${photoProducts.filter(p => (p.nom||'').trim()).length} produit${photoProducts.filter(p => (p.nom||'').trim()).length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F  = "'Plus Jakarta Sans','Inter',sans-serif"
const FM = "'DM Mono','JetBrains Mono',monospace"

const S = {
  page:    { padding:20, display:'flex', flexDirection:'column', gap:14, fontFamily:F, maxWidth:900, margin:'0 auto' },
  backBtn: { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F },

  header:   { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  title:    { fontSize:22, fontWeight:700, color:'#0F172A', margin:0 },
  subtitle: { fontSize:12.5, color:'#94A3B8', marginTop:2 },
  btnAdd:   { padding:'9px 18px', background:'#2563EB', color:'#fff', border:'none', borderRadius:12, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F, flexShrink:0 },

  modeTabs:    { display:'flex', background:'#F1F5F9', borderRadius:12, padding:4, gap:3 },
  modeTab:     { flex:1, padding:'8px 6px', border:'none', background:'none', borderRadius:9, fontSize:13, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F, transition:'background .15s' },
  modeTabActive:{ background:'#fff', color:'#0F172A', boxShadow:'0 1px 4px rgba(0,0,0,.08)', fontWeight:600 },

  search: { width:'100%', padding:'10px 14px', border:'1.5px solid #E2E8F0', borderRadius:12, fontSize:13.5, fontFamily:F, background:'#F8FAFC', outline:'none', boxSizing:'border-box', transition:'border-color .15s' },

  pills:      { display:'flex', gap:6, flexWrap:'wrap' },
  pill2:      { display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', border:'1.5px solid #E2E8F0', borderRadius:99, background:'#fff', fontSize:12.5, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F },
  pillActive: { borderColor:'#2563EB', background:'#EFF6FF', color:'#2563EB' },
  pillOrange: { borderColor:'#F59E0B', background:'#FFFBEB', color:'#B45309' },
  filterBadge:{ padding:'0 6px', borderRadius:99, fontSize:10.5, fontWeight:700 },

  count: { fontSize:12, color:'#94A3B8', fontWeight:500 },
  list:  { display:'flex', flexDirection:'column', gap:8 },
  empty: { textAlign:'center', color:'#94A3B8', padding:'40px 20px', fontSize:14 },

  productCard: {
    display:'flex', alignItems:'center', gap:12,
    background:'#fff', border:'1px solid #E2E8F0', borderRadius:14,
    padding:'12px 14px', boxShadow:'0 1px 3px rgba(0,0,0,.04)',
    transition:'box-shadow .15s',
  },
  catIcon:   { width:40, height:40, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 },
  cardInfo:  { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:3 },
  cardRow:   { display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' },
  cardRow2:  { display:'flex', alignItems:'center', gap:6 },
  cardNom:   { fontSize:14, fontWeight:600, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 },
  cardMeta:  { fontSize:11.5, color:'#94A3B8', display:'flex', gap:5, alignItems:'center' },
  seuilBadge:{ fontSize:10, fontWeight:700, color:'#B45309', background:'#FFFBEB', padding:'1px 6px', borderRadius:99, border:'1px solid #FDE68A', whiteSpace:'nowrap' },
  pill:      { padding:'2px 7px', borderRadius:99, fontSize:11, fontWeight:600 },
  prixTag:   { fontSize:11, color:'#94A3B8', fontFamily:FM },

  qtyDisplay:     { display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, minWidth:44 },
  qtyDisplayRight:{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, minWidth:44 },
  qtyBig:         { fontSize:18, fontWeight:800, fontFamily:FM, lineHeight:1 },
  qtyU:           { fontSize:10, color:'#94A3B8', fontWeight:500 },
  sortieArrow:    { fontSize:18, color:'#CBD5E1', flexShrink:0, fontWeight:300 },

  cardActions: { display:'flex', gap:4, flexShrink:0 },
  actionBtn:   { width:32, height:32, border:'none', background:'#F8FAFC', borderRadius:9, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontFamily:F, transition:'background .15s' },

  // Sortie sheet / modals
  motifGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:6 },
  motifBtn:  { display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px 8px', border:'2px solid #E2E8F0', borderRadius:12, background:'#F8FAFC', cursor:'pointer', fontFamily:F, transition:'border-color .15s, background .15s', color:'#475569' },

  qtyBtn2: { width:40, height:40, borderRadius:10, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, flexShrink:0 },

  backdrop:     { position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(3px)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:F },
  modal:        { background:'#fff', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' },
  modalHeader:  { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 20px 16px', borderBottom:'1px solid #F1F5F9', flexShrink:0 },
  modalTitle:   { fontSize:16, fontWeight:700, color:'#0F172A' },
  closeBtn:     { width:30, height:30, border:'none', background:'#F1F5F9', borderRadius:99, cursor:'pointer', color:'#94A3B8', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, flexShrink:0 },
  modalBody:    { padding:'18px 20px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto', flex:1 },
  modalFooter:  { padding:'14px 20px', borderTop:'1px solid #F1F5F9', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 },

  fieldLabel: { fontSize:12, fontWeight:600, color:'#475569', letterSpacing:'.2px' },
  input:      { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:13.5, fontFamily:F, background:'#F8FAFC', outline:'none', boxSizing:'border-box', color:'#0F172A', transition:'border-color .15s' },
  row2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  catGrid:    { display:'flex', gap:7, flexWrap:'wrap' },
  catBtn:     { flex:1, minWidth:36, padding:'10px 4px', border:'1.5px solid #E2E8F0', borderRadius:10, background:'#F8FAFC', cursor:'pointer', fontFamily:F, transition:'border-color .15s', display:'flex', alignItems:'center', justifyContent:'center' },

  btnPrimary:   { padding:'10px 22px', background:'#2563EB', color:'#fff', border:'none', borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F },
  btnSecondary: { padding:'10px 18px', background:'#F8FAFC', color:'#475569', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:F },
  btnDanger:    { padding:'10px 18px', background:'#EF4444', color:'#fff', border:'none', borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F },

  confirmBody:  { padding:'28px 24px', textAlign:'center' },
  confirmIcon:  { fontSize:36, marginBottom:12 },
  confirmTitle: { fontSize:15, fontWeight:600, color:'#0F172A', marginBottom:6 },
  confirmText:  { fontSize:13, color:'#64748B', marginBottom:20 },
  confirmBtns:  { display:'flex', gap:10 },

  analyzingOverlay: { position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(3px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F },
  analyzingBox:     { background:'#fff', borderRadius:20, padding:'32px 40px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:14, boxShadow:'0 8px 40px rgba(0,0,0,.15)' },
  analyzingIcon:    { fontSize:40 },
  analyzingTitle:   { fontSize:15, fontWeight:700, color:'#0F172A', fontFamily:F },
  analyzingSub:     { fontSize:12.5, color:'#94A3B8', fontFamily:F },
  btnSel:       { padding:'9px 16px', background:'#F1F5F9', color:'#0F172A', border:'none', borderRadius:12, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F, flexShrink:0 },
  selBar:       { position:'fixed', bottom:64, left:0, right:0, zIndex:200, background:'#fff', borderTop:'1.5px solid #E2E8F0', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 -4px 16px rgba(0,0,0,.08)', fontFamily:F },
  addOptionBtn: { display:'flex', alignItems:'center', gap:14, padding:'14px 16px', border:'1.5px solid #E2E8F0', borderRadius:14, background:'#F8FAFC', cursor:'pointer', fontFamily:F, width:'100%', transition:'border-color .15s, background .15s' },
}
