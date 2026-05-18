import { useState, useMemo } from 'react'
import { upsertStock, deleteStockItem } from '../lib/supabase'
import { CAT_ICON, CAT_COLOR, CAT_BG, UNITES, dlcStatus, dlcDays, dlcColor, uid, fdate } from '../constants'

const CATS    = ['viande','poisson','laitier','epicerie','legumes','boissons','autre']
const MODES   = [{ k:'liste', l:'Liste' }, { k:'sortie', l:'Sortie rapide' }, { k:'flash', l:'Flash stock' }]
const FILTERS = ['tout','commander','ok','j7','j3','expiré', ...CATS]

const critique = (item) => {
  const s = parseFloat(item.seuil_min)
  return isNaN(s) ? item.q <= 2 : item.q <= s
}

const filterLabel = { tout:'Tout', commander:'À commander', ok:'OK', j7:'J-7', j3:'J-3', 'expiré':'Expiré' }

// ── DLC Pill ──────────────────────────────────────────────────────────────────

function DlcPill({ dlc }) {
  if (!dlc) return null
  const st = dlcStatus(dlc)
  const n  = dlcDays(dlc)
  const color = dlcColor(st)
  const labels = { ok:'OK', warn:`J-${n}`, critical:`⚠️ J-${n}`, expired:'Expiré', unknown:'—' }
  return (
    <span style={{ ...S.pill, background: `${color}18`, color, border: `1px solid ${color}33`, fontSize: 10.5 }}>
      {labels[st]}
    </span>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ item, onEdit, onDelete, mode, onQtyChange }) {
  const cat   = item.cat || 'autre'
  const crit  = critique(item)
  const st    = dlcStatus(item.dlc)

  return (
    <div style={{ ...S.productCard, borderLeft: `3px solid ${CAT_COLOR[cat] || '#94A3B8'}`, opacity: st === 'expired' ? .7 : 1 }}>
      {/* Left icon */}
      <div style={{ ...S.catIcon, background: CAT_BG[cat] || '#F8FAFC' }}>
        {CAT_ICON[cat] || '📦'}
      </div>

      {/* Info */}
      <div style={S.cardInfo}>
        <div style={S.cardRow}>
          <span style={S.cardNom}>{item.nom}</span>
          {crit && <span style={S.critBadge}>Critique</span>}
        </div>
        <div style={S.cardMeta}>
          {item.four && <span>{item.four}</span>}
          {item.seuil_min != null && <span>· seuil {item.seuil_min} {item.u}</span>}
        </div>
        <div style={S.cardRow2}>
          <DlcPill dlc={item.dlc} />
          {item.px != null && <span style={S.prixTag}>{Number(item.px).toFixed(2)} €/{item.u}</span>}
        </div>
      </div>

      {/* Qty */}
      {mode === 'sortie' ? (
        <div style={S.qtyWrap}>
          <button style={S.qtyBtn} onClick={() => onQtyChange(item, -1)}>−</button>
          <span style={S.qtyVal}>{item.q}</span>
          <button style={S.qtyBtn} onClick={() => onQtyChange(item, +1)}>+</button>
          <span style={S.qtyU}>{item.u}</span>
        </div>
      ) : (
        <div style={S.qtyDisplay}>
          <span style={{ ...S.qtyBig, color: crit ? '#EF4444' : '#0F172A' }}>{item.q}</span>
          <span style={S.qtyU}>{item.u}</span>
        </div>
      )}

      {/* Actions */}
      {mode === 'liste' && (
        <div style={S.cardActions}>
          <button style={S.actionBtn} onClick={() => onEdit(item)} title="Modifier">✏️</button>
          <button style={{ ...S.actionBtn, color: '#EF4444' }} onClick={() => onDelete(item.id)} title="Supprimer">🗑️</button>
        </div>
      )}
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ item, fournisseurs, onSave, onClose, saving }) {
  const isNew = !item?.id
  const [form, setForm] = useState({
    nom: item?.nom || '', q: item?.q ?? '', u: item?.u || 'kg',
    px: item?.px ?? '', seuil_min: item?.seuil_min ?? '',
    cat: item?.cat || 'autre', four: item?.four || '',
    dlc: item?.dlc || '', lot: item?.lot || '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.nom.trim()) return
    onSave({ ...item, ...form, q: Number(form.q) || 0, px: form.px !== '' ? Number(form.px) : null, seuil_min: form.seuil_min !== '' ? Number(form.seuil_min) : null })
  }

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>{isNew ? 'Nouveau produit' : 'Modifier produit'}</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          <Field label="Nom *">
            <input style={S.input} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex : Filet de bœuf" />
          </Field>

          <div style={S.row2}>
            <Field label="Quantité">
              <input style={S.input} type="number" min="0" step="0.1" value={form.q} onChange={e => set('q', e.target.value)} />
            </Field>
            <Field label="Unité">
              <select style={S.input} value={form.u} onChange={e => set('u', e.target.value)}>
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>

          <div style={S.row2}>
            <Field label="Seuil minimum">
              <input style={S.input} type="number" min="0" step="0.1" value={form.seuil_min} onChange={e => set('seuil_min', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Prix (€/unité)">
              <input style={S.input} type="number" min="0" step="0.01" value={form.px} onChange={e => set('px', e.target.value)} placeholder="0.00" />
            </Field>
          </div>

          <Field label="Catégorie">
            <div style={S.catGrid}>
              {CATS.map(c => (
                <button key={c} type="button"
                  style={{ ...S.catBtn, ...(form.cat === c ? { borderColor: CAT_COLOR[c], background: CAT_BG[c] } : {}) }}
                  onClick={() => set('cat', c)}>
                  {CAT_ICON[c]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Fournisseur">
            <input style={S.input} value={form.four} onChange={e => set('four', e.target.value)}
              list="fours-list" placeholder="Nom du fournisseur" />
            <datalist id="fours-list">
              {fournisseurs.map(f => <option key={f.id} value={f.nom} />)}
            </datalist>
          </Field>

          <div style={S.row2}>
            <Field label="DLC (JJ/MM/AAAA)">
              <input style={S.input} value={form.dlc} onChange={e => set('dlc', e.target.value)} placeholder="31/12/2025" />
            </Field>
            <Field label="N° lot">
              <input style={S.input} value={form.lot} onChange={e => set('lot', e.target.value)} placeholder="LOT-001" />
            </Field>
          </div>
        </div>

        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={{ ...S.btnPrimary, opacity: saving ? .6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : isNew ? 'Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Stock Page ────────────────────────────────────────────────────────────────

export default function Stock({ stock = [], setStock, fournisseurs = [], user, fromDashboard = false, onBack }) {
  const [mode,    setMode]    = useState('liste')
  const [filter,  setFilter]  = useState('tout')
  const [search,  setSearch]  = useState('')
  const [editItem, setEditItem] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [saving,  setSaving]  = useState(false)

  const filtered = useMemo(() => {
    let items = [...stock]
    if (search) items = items.filter(i => i.nom?.toLowerCase().includes(search.toLowerCase()) || i.four?.toLowerCase().includes(search.toLowerCase()))
    if (filter === 'commander') items = items.filter(critique)
    else if (filter === 'ok')     items = items.filter(i => dlcStatus(i.dlc) === 'ok')
    else if (filter === 'j7')     items = items.filter(i => dlcStatus(i.dlc) === 'warn')
    else if (filter === 'j3')     items = items.filter(i => dlcStatus(i.dlc) === 'critical')
    else if (filter === 'expiré') items = items.filter(i => dlcStatus(i.dlc) === 'expired')
    else if (CATS.includes(filter)) items = items.filter(i => i.cat === filter)
    return items.sort((a,b) => {
      const sA = dlcStatus(a.dlc), sB = dlcStatus(b.dlc)
      const order = { expired:0, critical:1, warn:2, ok:3, unknown:4 }
      return (order[sA] ?? 4) - (order[sB] ?? 4)
    })
  }, [stock, filter, search])

  async function handleSave(form) {
    setSaving(true)
    const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
    if (!payload.id) { payload.id = uid(); payload.date_reception = fdate() }
    const { data } = await upsertStock([payload])
    if (data) setStock(s => payload.date_reception === fdate() && !form.id ? [payload, ...s] : s.map(i => i.id === payload.id ? payload : i))
    else setStock(s => form.id ? s.map(i => i.id === form.id ? payload : i) : [payload, ...s])
    setSaving(false)
    setEditItem(null)
  }

  async function handleDelete(id) {
    await deleteStockItem(id)
    setStock(s => s.filter(i => i.id !== id))
    setConfirmId(null)
  }

  async function handleQtyChange(item, delta) {
    const updated = { ...item, q: Math.max(0, item.q + delta) }
    setStock(s => s.map(i => i.id === item.id ? updated : i))
    await upsertStock([{ ...updated, user_id: user.id }])
  }

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>Stock</h1>
        <button style={S.btnAdd} onClick={() => setEditItem({})}>+ Ajouter</button>
      </div>

      {/* Modes */}
      <div style={S.modeTabs}>
        {MODES.map(m => (
          <button key={m.k} style={{ ...S.modeTab, ...(mode === m.k ? S.modeTabActive : {}) }}
            onClick={() => setMode(m.k)}>{m.l}</button>
        ))}
      </div>

      {/* Search */}
      <input style={S.search} placeholder="🔍 Rechercher un produit ou fournisseur…"
        value={search} onChange={e => setSearch(e.target.value)} />

      {/* Filter pills */}
      <div style={S.pills}>
        {FILTERS.map(f => (
          <button key={f} style={{ ...S.pill2, ...(filter === f ? S.pillActive : {}) }}
            onClick={() => setFilter(f)}>
            {CATS.includes(f) ? `${CAT_ICON[f]} ` : ''}{filterLabel[f] || f}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={S.count}>{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</div>

      {/* List */}
      {filtered.length === 0
        ? <div style={S.empty}>Aucun produit{search ? ' correspondant' : ''}</div>
        : (
          <div style={S.list}>
            {filtered.map(item => (
              <ProductCard key={item.id} item={item} mode={mode}
                onEdit={setEditItem}
                onDelete={id => setConfirmId(id)}
                onQtyChange={handleQtyChange} />
            ))}
          </div>
        )
      }

      {/* Confirm delete */}
      {confirmId && (
        <div style={S.backdrop} onClick={() => setConfirmId(null)}>
          <div style={{ ...S.modal, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>Supprimer ce produit ?</div>
              <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>Cette action est irréversible.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={S.btnSecondary} onClick={() => setConfirmId(null)}>Annuler</button>
                <button style={{ ...S.btnDanger, flex: 1 }} onClick={() => handleDelete(confirmId)}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editItem !== null && (
        <EditModal item={editItem} fournisseurs={fournisseurs}
          onSave={handleSave} onClose={() => setEditItem(null)} saving={saving} />
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F = "'DM Sans','Inter',sans-serif"

const S = {
  page: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: F, maxWidth: 900, margin: '0 auto' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', fontFamily: F },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title:  { fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 },
  btnAdd: { padding: '9px 18px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: F },

  modeTabs: { display: 'flex', background: '#F1F5F9', borderRadius: 10, padding: 3, gap: 3 },
  modeTab:  { flex: 1, padding: '8px', border: 'none', background: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#64748B', cursor: 'pointer', fontFamily: F },
  modeTabActive: { background: '#fff', color: '#0F172A', boxShadow: '0 1px 3px rgba(0,0,0,.08)' },

  search: { width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 13.5, fontFamily: F, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' },

  pills: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  pill2: { padding: '5px 12px', border: '1.5px solid #E2E8F0', borderRadius: 99, background: '#fff', fontSize: 12.5, fontWeight: 500, color: '#64748B', cursor: 'pointer', fontFamily: F },
  pillActive: { borderColor: '#2563EB', background: '#EFF6FF', color: '#2563EB' },

  count: { fontSize: 12, color: '#94A3B8', fontWeight: 500 },
  list:  { display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { textAlign: 'center', color: '#94A3B8', padding: '40px 20px', fontSize: 14 },

  productCard: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 2px rgba(0,0,0,.04)' },
  catIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  cardRow:  { display: 'flex', alignItems: 'center', gap: 8 },
  cardRow2: { display: 'flex', alignItems: 'center', gap: 6 },
  cardNom:  { fontSize: 14, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  cardMeta: { fontSize: 11.5, color: '#94A3B8', display: 'flex', gap: 4 },
  critBadge: { fontSize: 10, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '1px 6px', borderRadius: 99, border: '1px solid #FECACA', whiteSpace: 'nowrap' },
  pill: { padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },
  prixTag: { fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono',monospace" },

  qtyWrap: { display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 },
  qtyBtn:  { width: 28, height: 28, borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#F8FAFC', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F },
  qtyVal:  { fontSize: 15, fontWeight: 700, color: '#0F172A', minWidth: 24, textAlign: 'center', fontFamily: "'DM Mono',monospace" },
  qtyDisplay: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 },
  qtyBig: { fontSize: 18, fontWeight: 800, fontFamily: "'DM Mono',monospace", lineHeight: 1 },
  qtyU:  { fontSize: 10, color: '#94A3B8', fontWeight: 500 },

  cardActions: { display: 'flex', gap: 4, flexShrink: 0 },
  actionBtn: { width: 32, height: 32, border: 'none', background: '#F8FAFC', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontFamily: F },

  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(2px)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0', fontFamily: F },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(0,0,0,.15)' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid #F1F5F9' },
  modalTitle: { fontSize: 16, fontWeight: 700, color: '#0F172A' },
  closeBtn: { width: 30, height: 30, border: 'none', background: '#F1F5F9', borderRadius: 99, cursor: 'pointer', color: '#94A3B8', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F },
  modalBody: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 },
  modalFooter: { padding: '14px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' },

  input: { width: '100%', padding: '9px 12px', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, fontFamily: F, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box', color: '#0F172A' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  catGrid: { display: 'flex', gap: 8 },
  catBtn: { flex: 1, padding: '10px 6px', border: '1.5px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC', fontSize: 18, cursor: 'pointer', fontFamily: F, transition: 'border-color .15s' },

  btnPrimary:   { padding: '10px 22px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: F },
  btnSecondary: { padding: '10px 18px', background: '#F8FAFC', color: '#475569', border: '1.5px solid #E2E8F0', borderRadius: 9, fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: F },
  btnDanger:    { padding: '10px 18px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: F },
}
