import { useState, useEffect, useMemo } from 'react'
import { upsertStock, deleteStockItem, fetchLabResults } from '../lib/supabase'
import { CAT_ICON, CAT_COLOR, CAT_BG, UNITES, dlcStatus, dlcDays, dlcColor, uid, fdate } from '../constants'

const CATS    = ['viande','poisson','laitier','epicerie','legumes','boissons','autre']
const MODES   = [{ k:'liste', l:'Liste' }, { k:'sortie', l:'Sortie' }, { k:'flash', l:'Flash' }]
const FILTERS = ['tout','commander','ok','j7','j3','expiré', ...CATS]
const FL      = { tout:'Tout', commander:'À commander', ok:'DLC OK', j7:'J-7', j3:'J-3', 'expiré':'Expirés' }

const MOTIFS = [
  { k:'consommé', l:'Consommé', icon:'🍽️', color:'#2563EB', bg:'#EFF6FF' },
  { k:'servi',    l:'Servi',    icon:'🧑‍🍳', color:'#10B981', bg:'#ECFDF5' },
  { k:'perte',    l:'Perte',    icon:'💸',   color:'#F59E0B', bg:'#FFFBEB' },
  { k:'périmé',   l:'Périmé',   icon:'🗑️',  color:'#EF4444', bg:'#FEF2F2' },
]

const critique = (item) => {
  const s = parseFloat(item.seuil_min)
  return isNaN(s) ? item.q <= 2 : item.q <= s
}

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

function ProductCard({ item, onEdit, onDelete, mode, onSortie, certified }) {
  const cat  = item.cat || 'autre'
  const crit = critique(item)
  const st   = dlcStatus(item.dlc)

  return (
    <div
      style={{ ...S.productCard, borderLeft:`3px solid ${CAT_COLOR[cat]||'#94A3B8'}`, opacity: st==='expired' ? .65 : 1 }}
      onClick={mode === 'sortie' ? () => onSortie(item) : undefined}
    >
      <div style={{ ...S.catIcon, background: CAT_BG[cat]||'#F8FAFC' }}>
        {CAT_ICON[cat]||'📦'}
      </div>

      <div style={S.cardInfo}>
        <div style={S.cardRow}>
          <span style={S.cardNom}>{item.nom}</span>
          {crit && (
            <span style={S.seuilBadge}>Seuil</span>
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

      {mode === 'liste' && (
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

// ── Flash Row ─────────────────────────────────────────────────────────────────

function FlashRow({ item, onQtyUpdate }) {
  const [val, setVal] = useState(String(item.q))
  const crit = critique({ ...item, q: Number(val) || 0 })

  function commit() {
    const n = parseFloat(val)
    if (!isNaN(n) && n !== item.q) onQtyUpdate(item, n)
  }

  return (
    <div style={S.flashRow}>
      <span style={{ fontSize:18 }}>{CAT_ICON[item.cat||'autre']||'📦'}</span>
      <div style={S.flashInfo}>
        <span style={S.flashNom}>{item.nom}</span>
        {item.four && <span style={S.flashMeta}>{item.four}</span>}
      </div>
      <div style={S.flashQtyWrap}>
        <input
          style={{ ...S.flashQtyInput, borderColor: crit ? '#F59E0B' : '#E2E8F0', color: crit ? '#F59E0B' : '#0F172A' }}
          type="number" min="0" step="0.1"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
        />
        <span style={S.flashU}>{item.u}</span>
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
  const [confirmId,      setConfirmId]      = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [certifiedNames, setCertifiedNames] = useState(new Set())

  useEffect(() => {
    fetchLabResults(user.id).then(({ data }) => {
      if (data) {
        setCertifiedNames(new Set(
          data.filter(r => r.status === 'conforme').map(r => r.product_name?.trim().toLowerCase())
        ))
      }
    })
  }, [user.id])

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

  async function handleDelete(id) {
    await deleteStockItem(id)
    setStock(s => s.filter(i => i.id !== id))
    setConfirmId(null)
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

  async function handleFlashUpdate(item, newQ) {
    const updated = { ...item, q: newQ, user_id: user.id, etablissement_id: profile?.etablissement_id }
    const { error } = await upsertStock([updated])
    if (error) { console.error('❌ INSERT FAIL:', 'stock (flash)', error); return }
    console.log('✅ INSERT OK:', 'stock (flash)', updated)
    setStock(s => s.map(i => i.id === item.id ? { ...i, q: newQ } : i))
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
        <button style={S.btnAdd} onClick={() => setEditItem({})}>+ Ajouter</button>
      </div>

      {/* Mode tabs */}
      <div style={S.modeTabs}>
        {MODES.map(m => (
          <button key={m.k} style={{ ...S.modeTab, ...(mode === m.k ? S.modeTabActive : {}) }}
            onClick={() => setMode(m.k)}>{m.l}</button>
        ))}
      </div>

      {mode !== 'flash' && (
        <>
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
        </>
      )}

      {/* ── Liste / Sortie ── */}
      {mode !== 'flash' && (
        filtered.length === 0
          ? <div style={S.empty}>Aucun produit{search ? ' trouvé' : ''}</div>
          : (
            <div style={S.list}>
              {filtered.map(item => (
                <ProductCard key={item.id} item={item} mode={mode}
                  onEdit={setEditItem}
                  onDelete={id => setConfirmId(id)}
                  onSortie={setSortieItem}
                  certified={certifiedNames.has(item.nom?.trim().toLowerCase())}
                />
              ))}
            </div>
          )
      )}

      {/* ── Flash stock ── */}
      {mode === 'flash' && (
        <div style={S.flashSection}>
          <div style={S.flashHeader}>
            <span style={S.flashHeaderText}>Mise à jour rapide des quantités</span>
            <input style={{ ...S.search, flex:1 }} placeholder="🔍 Filtrer…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={S.flashList}>
            {filtered.map(item => (
              <FlashRow key={item.id} item={item} onQtyUpdate={handleFlashUpdate} />
            ))}
            {filtered.length === 0 && <div style={S.empty}>Aucun produit</div>}
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirmId && (
        <div style={S.backdrop} onClick={() => setConfirmId(null)}>
          <div style={{ ...S.modal, maxWidth:340 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'28px 24px', textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🗑️</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#0F172A', marginBottom:6 }}>Supprimer ce produit ?</div>
              <div style={{ fontSize:13, color:'#64748B', marginBottom:20 }}>Cette action est irréversible.</div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={S.btnSecondary} onClick={() => setConfirmId(null)}>Annuler</button>
                <button style={{ ...S.btnDanger, flex:1 }} onClick={() => handleDelete(confirmId)}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
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

  // Flash mode
  flashSection:    { display:'flex', flexDirection:'column', gap:12 },
  flashHeader:     { display:'flex', flexDirection:'column', gap:8 },
  flashHeaderText: { fontSize:12.5, color:'#94A3B8', fontWeight:500 },
  flashList:       { display:'flex', flexDirection:'column', gap:6 },
  flashRow:        { display:'flex', alignItems:'center', gap:12, background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'10px 14px' },
  flashInfo:       { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:2 },
  flashNom:        { fontSize:13.5, fontWeight:600, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  flashMeta:       { fontSize:11.5, color:'#94A3B8' },
  flashQtyWrap:    { display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  flashQtyInput:   { width:64, padding:'7px 10px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:14, fontWeight:700, fontFamily:FM, textAlign:'center', background:'#F8FAFC', outline:'none', boxSizing:'border-box' },
  flashU:          { fontSize:11, color:'#94A3B8', fontWeight:500 },

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
}
