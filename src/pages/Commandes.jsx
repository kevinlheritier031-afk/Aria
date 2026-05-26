import { useState, useMemo } from 'react'
import { upsertFournisseur, deleteFournisseur, insertPrix } from '../lib/supabase'
import { MODES_COMMANDE, JOURS, uid, critique } from '../constants'

const F  = "'Plus Jakarta Sans','Inter',sans-serif"
const FM = "'DM Mono','JetBrains Mono',monospace"

const suggestQty = (item) => {
  const seuil = parseFloat(item.seuil_min)
  const target = isNaN(seuil) ? 5 : seuil * 2
  return Math.max(1, Math.ceil(target - item.q))
}

const modeIcon = { tel:'📞', mail:'✉️', site:'🌐' }
const modeLabel = { tel:'Téléphone', mail:'Email', site:'Site web' }

// ── Field helper ──────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12, fontWeight:600, color:'#475569' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Bon de commande ───────────────────────────────────────────────────────────

function OrderSheet({ four, items: initItems, onClose }) {
  const [qtys,    setQtys]    = useState(() => Object.fromEntries(initItems.map(i => [i.id, String(suggestQty(i))])))
  const [checked, setChecked] = useState({})
  const [copied,  setCopied]  = useState(false)

  const setQty = (id, v) => setQtys(q => ({ ...q, [id]: v }))
  const toggleCheck = (id) => setChecked(c => ({ ...c, [id]: !c[id] }))

  const orderLines = initItems
    .map(i => ({ ...i, qCmd: parseFloat(qtys[i.id]) || 0 }))
    .filter(i => i.qCmd > 0)

  const dateStr   = new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })
  const scriptTel = [
    `Bonjour, c'est [votre nom] du restaurant [nom établissement].`,
    `Je vous appelle pour passer commande pour le ${dateStr}.`,
    ``,
    ...orderLines.map(i => `• ${i.nom} : ${i.qCmd} ${i.u}`),
    ``,
    `Pouvez-vous confirmer la livraison ? Merci.`,
  ].join('\n')

  const mailSubject = `Commande du ${new Date().toLocaleDateString('fr-FR')}`
  const mailBody = [
    `Bonjour,`,
    ``,
    `Veuillez trouver ci-dessous notre commande :`,
    ``,
    ...orderLines.map(i => `- ${i.nom} : ${i.qCmd} ${i.u}`),
    ``,
    `Livraison souhaitée : dès que possible.`,
    `Merci de confirmer la réception de cet email.`,
    ``,
    `Cordialement`,
  ].join('\n')

  function copy(text) {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth:520 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>Bon de commande</div>
            <div style={{ fontSize:12.5, color:'#94A3B8', marginTop:2 }}>{modeIcon[four.mode]} {four.nom}</div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={S.modalBody}>
          {/* Quantities adjustment */}
          <div>
            <div style={S.sectionLabel}>Produits & quantités à commander</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
              {initItems.map(i => (
                <div key={i.id} style={S.orderLine}>
                  <div style={S.orderLineInfo}>
                    <span style={S.orderNom}>{i.nom}</span>
                    <span style={{ fontSize:11, color:'#94A3B8' }}>stock : {i.q} {i.u}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input
                      style={S.qtyInput}
                      type="number" min="0" step="0.5"
                      value={qtys[i.id]}
                      onChange={e => setQty(i.id, e.target.value)}
                    />
                    <span style={{ fontSize:11.5, color:'#64748B', minWidth:28 }}>{i.u}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mode-specific section */}
          {four.mode === 'tel' && (
            <div style={S.orderBox}>
              <div style={S.sectionLabel}>Script d'appel téléphonique</div>
              {four.tel && (
                <a href={`tel:${four.tel.replace(/\s/g,'')}`} style={S.actionLink}>
                  📞 Appeler {four.nom} — {four.tel}
                </a>
              )}
              <pre style={S.scriptText}>{scriptTel}</pre>
              <button style={{ ...S.copyBtn, background: copied ? '#ECFDF5' : '#fff', color: copied ? '#10B981' : '#475569' }}
                onClick={() => copy(scriptTel)}>
                {copied ? '✓ Copié !' : '📋 Copier le script'}
              </button>
            </div>
          )}

          {four.mode === 'mail' && (
            <div style={S.orderBox}>
              <div style={S.sectionLabel}>Email pré-rédigé</div>
              <div style={S.emailPreview}>
                <div style={{ fontSize:11.5, color:'#94A3B8', marginBottom:8 }}>
                  <strong>À :</strong> {four.email || '(email non configuré)'}<br/>
                  <strong>Objet :</strong> {mailSubject}
                </div>
                <pre style={S.scriptText}>{mailBody}</pre>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {four.email && (
                  <a href={`mailto:${four.email}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`}
                    style={S.actionLink}>
                    ✉️ Ouvrir dans la messagerie
                  </a>
                )}
                <button style={S.copyBtn} onClick={() => copy(mailBody)}>
                  {copied ? '✓ Copié !' : '📋 Copier'}
                </button>
              </div>
            </div>
          )}

          {four.mode === 'site' && (
            <div style={S.orderBox}>
              <div style={S.sectionLabel}>Liste à cocher pour commande en ligne</div>
              {four.site && (
                <a href={four.site} target="_blank" rel="noopener noreferrer" style={S.actionLink}>
                  🌐 Ouvrir le site de {four.nom}
                </a>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                {initItems.map(i => (
                  <label key={i.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 10px', borderRadius:9, background: checked[i.id] ? '#ECFDF5' : '#F8FAFC', border:'1px solid', borderColor: checked[i.id] ? '#A7F3D0' : '#E2E8F0' }}>
                    <input type="checkbox" checked={!!checked[i.id]} onChange={() => toggleCheck(i.id)} style={{ width:16, height:16, accentColor:'#10B981' }} />
                    <span style={{ flex:1, fontSize:13.5, fontWeight:500, color: checked[i.id] ? '#059669' : '#0F172A', textDecoration: checked[i.id] ? 'line-through' : 'none' }}>
                      {i.nom}
                    </span>
                    <span style={{ fontSize:12, fontFamily:FM, color:'#64748B' }}>
                      {qtys[i.id]} {i.u}
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ fontSize:12, color:'#94A3B8', textAlign:'right' }}>
                {Object.values(checked).filter(Boolean).length} / {initItems.length} ajoutés au panier
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Price Entry Modal ─────────────────────────────────────────────────────────

function PrixModal({ fournisseurs, onSave, onClose, saving, produitSuggestion = '' }) {
  const [form, setForm] = useState({ prod: produitSuggestion, four: '', px: '', date_prix: new Date().toISOString().slice(0,10) })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.prod.trim() || !form.four.trim() || !form.px) return
    onSave(form)
  }

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth:420 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>Saisir un prix</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <Field label="Produit *">
            <input style={S.input} value={form.prod} autoFocus
              onChange={e => set('prod', e.target.value)} placeholder="Ex : Filet de bœuf" />
          </Field>
          <Field label="Fournisseur *">
            <input style={S.input} value={form.four}
              onChange={e => set('four', e.target.value)}
              list="prix-fours-list" placeholder="Nom du fournisseur" />
            <datalist id="prix-fours-list">
              {fournisseurs.map(f => <option key={f.id} value={f.nom} />)}
            </datalist>
          </Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="Prix (€/unité) *">
              <input style={S.input} type="number" min="0" step="0.01"
                value={form.px} onChange={e => set('px', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Date">
              <input style={S.input} type="date" value={form.date_prix}
                onChange={e => set('date_prix', e.target.value)} />
            </Field>
          </div>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={{ ...S.btnPrimary, opacity: saving ? .6 : 1 }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fournisseur Modal ─────────────────────────────────────────────────────────

function FournisseurModal({ four, onSave, onClose, saving }) {
  const isNew = !four?.id
  const [form, setForm] = useState({
    nom:          four?.nom          || '',
    mode:         four?.mode         || 'tel',
    tel:          four?.tel          || '',
    email:        four?.email        || '',
    site:         four?.site         || '',
    jours:        four?.jours        || [],
    heure_limite: four?.heure_limite || '09:00',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleJour = (j) => setForm(f => ({
    ...f, jours: f.jours.includes(j) ? f.jours.filter(x => x !== j) : [...f.jours, j]
  }))

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>{isNew ? 'Nouveau fournisseur' : `Modifier — ${form.nom}`}</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <Field label="Nom *">
            <input style={S.input} value={form.nom} autoFocus
              onChange={e => set('nom', e.target.value)} placeholder="Ex : Metro, Pomona…" />
          </Field>

          <Field label="Mode de commande">
            <div style={{ display:'flex', gap:8 }}>
              {MODES_COMMANDE.map(m => (
                <button key={m.k} type="button"
                  style={{ ...S.modeBtn, ...(form.mode === m.k ? S.modeBtnActive : {}) }}
                  onClick={() => set('mode', m.k)}>
                  {m.icon} {m.l}
                </button>
              ))}
            </div>
          </Field>

          {(form.mode === 'tel' || form.mode !== 'site') && (
            <Field label="Téléphone">
              <input style={S.input} value={form.tel}
                onChange={e => set('tel', e.target.value)} placeholder="06 00 00 00 00" />
            </Field>
          )}
          {(form.mode === 'mail' || form.mode !== 'site') && (
            <Field label="Email commandes">
              <input style={S.input} type="email" value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="commandes@fournisseur.fr" />
            </Field>
          )}
          {(form.mode === 'site' || form.mode !== 'tel') && (
            <Field label="Site web">
              <input style={S.input} value={form.site}
                onChange={e => set('site', e.target.value)} placeholder="https://..." />
            </Field>
          )}

          <Field label="Jours de commande">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {JOURS.map(j => (
                <button key={j} type="button"
                  style={{ ...S.jourBtn, ...(form.jours.includes(j) ? S.jourBtnActive : {}) }}
                  onClick={() => toggleJour(j)}>
                  {j.slice(0,3)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Heure limite de commande">
            <input style={{ ...S.input, maxWidth:130 }} type="time"
              value={form.heure_limite} onChange={e => set('heure_limite', e.target.value)} />
          </Field>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={{ ...S.btnPrimary, opacity: saving ? .5 : 1 }} disabled={saving}
            onClick={() => onSave({ ...four, ...form })}>
            {saving ? 'Enregistrement…' : isNew ? '+ Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Commandes Page ────────────────────────────────────────────────────────────

export default function Commandes({ stock = [], fournisseurs = [], setFournisseurs, prixHist = [], setPrixHist, user, fromDashboard = false, onBack }) {
  const [tab,        setTab]        = useState('commandes')
  const [orderSheet, setOrderSheet] = useState(null)
  const [editFour,   setEditFour]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [prixModal,  setPrixModal]  = useState(null)  // null | { produitSuggestion? }
  const [saving,     setSaving]     = useState(false)

  // ── Tab Commandes ─────────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const critiques = stock.filter(critique)
    const map = {}
    critiques.forEach(item => {
      const key = item.four || '—'
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [stock])

  // ── Tab Tarifs ────────────────────────────────────────────────────────────

  const tarifData = useMemo(() => {
    // Latest price per (prod, fournisseur)
    const latestMap = {}
    prixHist.forEach(p => {
      const key = `${p.prod}|||${p.four}`
      if (!latestMap[key] || new Date(p.created_at) > new Date(latestMap[key].created_at)) {
        latestMap[key] = p
      }
    })
    // Group by prod
    const prodMap = {}
    Object.values(latestMap).forEach(p => {
      if (!prodMap[p.prod]) prodMap[p.prod] = []
      prodMap[p.prod].push(p)
    })
    // Build comparison
    return Object.entries(prodMap).map(([prod, prices]) => {
      const sorted = [...prices].sort((a, b) => a.px - b.px)
      const best   = sorted[0]
      const worst  = sorted[sorted.length - 1]
      const saving = sorted.length > 1 ? worst.px - best.px : 0
      const history = prixHist.filter(p => p.prod === prod).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)
      return { prod, prices: sorted, best, worst, saving, history }
    }).sort((a, b) => b.saving - a.saving)
  }, [prixHist])

  const totalSaving = useMemo(() => tarifData.reduce((acc, t) => acc + t.saving, 0), [tarifData])

  // ── Fournisseur CRUD ──────────────────────────────────────────────────────

  async function handleSaveFour(form) {
    setSaving(true)
    const payload = { ...form, user_id: user.id }
    if (!payload.id) payload.id = uid()
    await upsertFournisseur(payload)
    setFournisseurs(fs => form.id ? fs.map(f => f.id === form.id ? payload : f) : [payload, ...fs])
    setSaving(false)
    setEditFour(null)
  }

  async function handleDeleteFour(id) {
    await deleteFournisseur(id)
    setFournisseurs(fs => fs.filter(f => f.id !== id))
    setConfirmDel(null)
  }

  // ── Prix CRUD ─────────────────────────────────────────────────────────────

  async function handleSavePrix(form) {
    setSaving(true)
    const payload = {
      id: uid(), user_id: user.id,
      prod: form.prod.trim(), four: form.four.trim(),
      px: Number(form.px),
      date_prix: form.date_prix,
      created_at: new Date().toISOString(),
    }
    await insertPrix(payload)
    setPrixHist?.(h => [payload, ...h])
    setSaving(false)
    setPrixModal(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Commandes</h1>
          <div style={S.subtitle}>
            {grouped.length > 0
              ? <span style={{ color:'#F59E0B' }}>{stock.filter(critique).length} produit{stock.filter(critique).length > 1 ? 's' : ''} à commander</span>
              : <span style={{ color:'#10B981' }}>Stock à jour ✓</span>
            }
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { k:'commandes',   l:'Commandes',   badge: grouped.length > 0 ? stock.filter(critique).length : 0 },
          { k:'tarifs',      l:'Tarifs',      badge: 0 },
          { k:'fournisseurs',l:'Fournisseurs', badge: 0 },
        ].map(t => (
          <button key={t.k} style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}) }} onClick={() => setTab(t.k)}>
            {t.l}
            {t.badge > 0 && (
              <span style={S.tabBadge}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ Tab : Commandes ══════════════════════════════════════════════════ */}

      {tab === 'commandes' && (
        grouped.length === 0
          ? (
            <div style={S.emptySuccess}>
              <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:600, color:'#059669' }}>Stock à jour !</div>
              <div style={{ fontSize:13, color:'#94A3B8', marginTop:4 }}>Aucun produit n'est sous son seuil minimum.</div>
            </div>
          )
          : grouped.map(([nom, items]) => {
              const four = fournisseurs.find(f => f.nom === nom)
              return (
                <div key={nom} style={S.card}>
                  {/* Card header */}
                  <div style={S.cardHeader}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {four && <span style={S.modeChip}>{modeIcon[four.mode]}</span>}
                        <span style={S.cardTitle}>{nom}</span>
                        <span style={S.countBadge}>{items.length}</span>
                      </div>
                      {four?.jours?.length > 0 && (
                        <div style={S.cardSub}>
                          📅 {four.jours.join(' · ')} avant {four.heure_limite}
                        </div>
                      )}
                    </div>
                    {four && (
                      <button style={S.orderBtn} onClick={() => setOrderSheet({ four, items })}>
                        Bon de commande →
                      </button>
                    )}
                  </div>

                  {/* Product rows */}
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {items.map((i, idx) => (
                      <div key={i.id} style={{ ...S.cmdRow, borderBottom: idx < items.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <div style={S.cmdInfo}>
                          <span style={S.cmdNom}>{i.nom}</span>
                          {i.cat && <span style={S.cmdCat}>{i.cat}</span>}
                        </div>
                        <div style={S.cmdRight}>
                          <div style={S.cmdStock}>
                            <span style={S.cmdQtyCurrent}>{i.q}</span>
                            <span style={S.cmdSep}>/</span>
                            <span style={S.cmdQtyMin}>{i.seuil_min ?? 2} {i.u} min.</span>
                          </div>
                          <div style={S.cmdSuggest}>
                            À commander : <strong style={{ fontFamily:FM }}>{suggestQty(i)} {i.u}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action bar */}
                  <div style={S.cardFooter}>
                    {four?.mode === 'tel' && four?.tel && (
                      <a href={`tel:${four.tel.replace(/\s/g,'')}`} style={S.quickAction}>
                        📞 {four.tel}
                      </a>
                    )}
                    {four?.mode === 'mail' && four?.email && (
                      <span style={S.quickAction}>✉️ {four.email}</span>
                    )}
                    {!four && (
                      <span style={{ fontSize:12, color:'#94A3B8', fontStyle:'italic' }}>
                        Fournisseur "{nom}" non configuré —{' '}
                        <button style={S.linkBtn} onClick={() => setTab('fournisseurs')}>Configurer</button>
                      </span>
                    )}
                  </div>
                </div>
              )
            })
      )}

      {/* ══ Tab : Tarifs ═════════════════════════════════════════════════════ */}

      {tab === 'tarifs' && (
        <>
          <div style={S.tarifHeader}>
            <div>
              {totalSaving > 0 && (
                <div style={S.savingBanner}>
                  💡 Économie potentielle : <strong style={{ fontFamily:FM }}>{totalSaving.toFixed(2)} €/unité</strong> en optimisant les fournisseurs
                </div>
              )}
            </div>
            <button style={S.addBtn} onClick={() => setPrixModal({})}>+ Saisir un prix</button>
          </div>

          {tarifData.length === 0
            ? (
              <div style={S.empty}>
                <div style={{ fontSize:32, marginBottom:10 }}>📊</div>
                <div style={{ fontWeight:600, color:'#475569', marginBottom:4 }}>Aucun historique de prix</div>
                <div style={{ fontSize:13, color:'#94A3B8' }}>Les prix sont enregistrés automatiquement lors des réceptions.</div>
                <button style={{ ...S.addBtn, marginTop:16, alignSelf:'center' }} onClick={() => setPrixModal({})}>
                  + Saisir un prix manuellement
                </button>
              </div>
            )
            : tarifData.map(({ prod, prices, best, saving, history }) => (
              <div key={prod} style={S.card}>
                <div style={S.cardHeader}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={S.cardTitle}>{prod}</span>
                      {saving > 0 && (
                        <span style={S.savingChip}>
                          −{saving.toFixed(2)} € possible
                        </span>
                      )}
                    </div>
                    <div style={S.cardSub}>Meilleur prix : {best.four}</div>
                  </div>
                  <button style={S.iconBtn} onClick={() => setPrixModal({ produitSuggestion: prod })} title="Ajouter un prix">+</button>
                </div>

                {/* Price comparison row */}
                <div style={S.prixRow}>
                  {prices.map((p, i) => (
                    <div key={`${p.four}-${i}`} style={{ ...S.prixCard, ...(i === 0 ? S.prixCardBest : {}) }}>
                      {i === 0 && <div style={S.bestLabel}>Meilleur</div>}
                      <div style={{ fontSize:11, color: i === 0 ? '#059669' : '#94A3B8', fontWeight:500, marginBottom:2 }}>{p.four}</div>
                      <div style={{ fontSize:18, fontWeight:800, fontFamily:FM, color: i === 0 ? '#059669' : '#0F172A' }}>
                        {Number(p.px).toFixed(2)} €
                      </div>
                      {i > 0 && (
                        <div style={{ fontSize:10, color:'#EF4444', fontWeight:600, marginTop:1 }}>
                          +{(p.px - prices[0].px).toFixed(2)} €
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Price history */}
                {history.length > 1 && (
                  <div style={S.historyRow}>
                    {history.slice(0, 5).map((h, i) => (
                      <div key={i} style={S.histTag}>
                        <div style={{ fontSize:10, color:'#94A3B8' }}>{h.date_prix || h.created_at?.slice(0,10)}</div>
                        <div style={{ fontSize:12, fontWeight:700, fontFamily:FM }}>{Number(h.px).toFixed(2)} €</div>
                        <div style={{ fontSize:10, color:'#94A3B8' }}>{h.four}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          }
        </>
      )}

      {/* ══ Tab : Fournisseurs ════════════════════════════════════════════════ */}

      {tab === 'fournisseurs' && (
        <>
          <button style={S.addBtn} onClick={() => setEditFour({})}>+ Ajouter un fournisseur</button>

          {fournisseurs.length === 0
            ? (
              <div style={S.empty}>
                <div style={{ fontSize:32, marginBottom:10 }}>🚚</div>
                <div style={{ fontWeight:600, color:'#475569', marginBottom:4 }}>Aucun fournisseur configuré</div>
                <div style={{ fontSize:13, color:'#94A3B8' }}>Ajoutez vos fournisseurs pour générer des bons de commande.</div>
              </div>
            )
            : fournisseurs.map(f => (
              <div key={f.id} style={S.card}>
                <div style={S.cardHeader}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:20 }}>{modeIcon[f.mode] || '🚚'}</span>
                      <span style={S.cardTitle}>{f.nom}</span>
                      <span style={{ ...S.modeChipFour, background: f.mode === 'tel' ? '#EFF6FF' : f.mode === 'mail' ? '#F0FDF4' : '#FFF7ED', color: f.mode === 'tel' ? '#2563EB' : f.mode === 'mail' ? '#059669' : '#EA580C' }}>
                        {modeLabel[f.mode]}
                      </span>
                    </div>
                    {f.jours?.length > 0 && (
                      <div style={{ ...S.cardSub, marginTop:4 }}>
                        📅 Commandes : {f.jours.join(' · ')}
                        {f.heure_limite && ` avant ${f.heure_limite}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button style={S.iconBtn} onClick={() => setEditFour(f)} title="Modifier">✏️</button>
                    <button style={{ ...S.iconBtn, color:'#EF4444' }} onClick={() => setConfirmDel(f.id)} title="Supprimer">🗑️</button>
                  </div>
                </div>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                  {f.tel   && <a href={`tel:${f.tel.replace(/\s/g,'')}`} style={S.chip}>📞 {f.tel}</a>}
                  {f.email && <a href={`mailto:${f.email}`} style={S.chip}>✉️ {f.email}</a>}
                  {f.site  && <a href={f.site} target="_blank" rel="noopener noreferrer" style={S.chip}>🌐 Site web</a>}
                </div>
              </div>
            ))
          }
        </>
      )}

      {/* ══ Modals ══════════════════════════════════════════════════════════ */}

      {orderSheet && (
        <OrderSheet four={orderSheet.four} items={orderSheet.items} onClose={() => setOrderSheet(null)} />
      )}

      {prixModal !== null && (
        <PrixModal
          fournisseurs={fournisseurs}
          produitSuggestion={prixModal.produitSuggestion || ''}
          onSave={handleSavePrix}
          onClose={() => setPrixModal(null)}
          saving={saving}
        />
      )}

      {editFour !== null && (
        <FournisseurModal four={editFour} onSave={handleSaveFour} onClose={() => setEditFour(null)} saving={saving} />
      )}

      {confirmDel && (
        <div style={S.backdrop} onClick={() => setConfirmDel(null)}>
          <div style={{ ...S.modal, maxWidth:340 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'28px 24px', textAlign:'center', fontFamily:F }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#0F172A', marginBottom:6 }}>Supprimer ce fournisseur ?</div>
              <div style={{ fontSize:13, color:'#94A3B8', marginBottom:20 }}>Cette action est irréversible.</div>
              <div style={{ display:'flex', gap:10 }}>
                <button style={S.btnSecondary} onClick={() => setConfirmDel(null)}>Annuler</button>
                <button style={{ ...S.btnDanger, flex:1 }} onClick={() => handleDeleteFour(confirmDel)}>Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page:    { padding:20, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:860, margin:'0 auto' },
  backBtn: { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F },

  header:   { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 },
  title:    { fontSize:22, fontWeight:700, color:'#0F172A', margin:0 },
  subtitle: { fontSize:12.5, marginTop:2 },

  tabs:    { display:'flex', background:'#F1F5F9', borderRadius:12, padding:4, gap:3 },
  tab:     { flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 6px', border:'none', background:'none', borderRadius:9, fontSize:13.5, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F, transition:'background .15s' },
  tabActive:{ background:'#fff', color:'#0F172A', boxShadow:'0 1px 4px rgba(0,0,0,.08)', fontWeight:600 },
  tabBadge: { background:'#F59E0B', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99 },

  card:       { background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' },
  cardHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12, gap:12 },
  cardTitle:  { fontSize:15, fontWeight:700, color:'#0F172A' },
  cardSub:    { fontSize:12, color:'#94A3B8', marginTop:3 },
  cardFooter: { marginTop:12, paddingTop:10, borderTop:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:10 },

  modeChip:    { fontSize:18, lineHeight:1 },
  modeChipFour:{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99 },
  countBadge:  { background:'#F1F5F9', color:'#475569', fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:99 },

  cmdRow:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', gap:12 },
  cmdInfo:   { flex:1, minWidth:0, display:'flex', alignItems:'center', gap:8 },
  cmdNom:    { fontSize:13.5, color:'#0F172A', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  cmdCat:    { fontSize:10.5, color:'#94A3B8', background:'#F1F5F9', padding:'1px 6px', borderRadius:99, whiteSpace:'nowrap' },
  cmdRight:  { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 },
  cmdStock:  { display:'flex', alignItems:'baseline', gap:3 },
  cmdQtyCurrent:{ fontSize:14, fontWeight:700, fontFamily:FM, color:'#EF4444' },
  cmdSep:    { fontSize:12, color:'#CBD5E1' },
  cmdQtyMin: { fontSize:12, color:'#64748B' },
  cmdSuggest:{ fontSize:11.5, color:'#94A3B8' },

  orderBtn:  { padding:'9px 16px', background:'#2563EB', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' },
  quickAction:{ fontSize:12.5, color:'#2563EB', fontWeight:500, textDecoration:'none' },
  linkBtn:   { background:'none', border:'none', color:'#2563EB', fontSize:12, cursor:'pointer', fontFamily:F, padding:0, fontWeight:500 },

  // Tarifs
  tarifHeader:  { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' },
  savingBanner: { background:'#FFFBEB', border:'1px solid #FDE68A', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#92400E' },
  savingChip:   { background:'#ECFDF5', color:'#059669', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, border:'1px solid #A7F3D0' },
  prixRow:      { display:'flex', gap:8, flexWrap:'wrap', marginTop:4 },
  prixCard:     { background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 14px', display:'flex', flexDirection:'column', minWidth:90, position:'relative' },
  prixCardBest: { background:'#F0FDF4', border:'1px solid #A7F3D0' },
  bestLabel:    { position:'absolute', top:-8, left:8, background:'#10B981', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:99 },
  historyRow:   { display:'flex', gap:6, flexWrap:'wrap', marginTop:10, paddingTop:10, borderTop:'1px solid #F1F5F9' },
  histTag:      { background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'6px 10px', display:'flex', flexDirection:'column', gap:1, minWidth:72 },

  addBtn: { padding:'9px 16px', background:'#EFF6FF', color:'#2563EB', border:'1.5px solid #BFDBFE', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, alignSelf:'flex-start', whiteSpace:'nowrap' },
  iconBtn:{ width:34, height:34, border:'none', background:'#F8FAFC', borderRadius:9, cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, flexShrink:0 },
  chip:   { fontSize:12, padding:'3px 10px', background:'#F1F5F9', borderRadius:99, color:'#475569', textDecoration:'none', whiteSpace:'nowrap' },

  // Modals
  backdrop:    { position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(3px)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:F },
  modal:       { background:'#fff', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:520, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' },
  modalHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 20px 16px', borderBottom:'1px solid #F1F5F9', flexShrink:0 },
  modalTitle:  { fontSize:16, fontWeight:700, color:'#0F172A' },
  closeBtn:    { width:30, height:30, border:'none', background:'#F1F5F9', borderRadius:99, cursor:'pointer', color:'#94A3B8', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F, flexShrink:0 },
  modalBody:   { padding:'18px 20px', display:'flex', flexDirection:'column', gap:16, overflowY:'auto', flex:1 },
  modalFooter: { padding:'14px 20px', borderTop:'1px solid #F1F5F9', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 },

  sectionLabel: { fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 },
  orderBox:     { background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 },
  orderLine:    { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'6px 0', borderBottom:'1px solid #F1F5F9' },
  orderLineInfo:{ display:'flex', flexDirection:'column', gap:1, flex:1, minWidth:0 },
  orderNom:     { fontSize:13.5, fontWeight:500, color:'#0F172A' },
  qtyInput:     { width:60, padding:'6px 8px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, fontWeight:700, fontFamily:FM, textAlign:'center', background:'#fff', outline:'none', boxSizing:'border-box' },

  emailPreview: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:10, padding:'12px 14px' },
  scriptText:   { fontSize:12, fontFamily:FM, color:'#475569', whiteSpace:'pre-wrap', margin:0, lineHeight:1.7 },
  actionLink:   { display:'block', padding:'11px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, color:'#2563EB', fontSize:13.5, fontWeight:600, textDecoration:'none', textAlign:'center' },
  copyBtn:      { alignSelf:'flex-start', padding:'7px 14px', background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:12.5, cursor:'pointer', fontFamily:F, color:'#475569', transition:'background .15s, color .15s' },

  input:        { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:13.5, fontFamily:F, background:'#F8FAFC', outline:'none', boxSizing:'border-box', color:'#0F172A' },
  modeBtn:      { flex:1, padding:'8px 6px', border:'1.5px solid #E2E8F0', borderRadius:9, background:'#F8FAFC', fontSize:12.5, cursor:'pointer', fontFamily:F, color:'#475569' },
  modeBtnActive:{ borderColor:'#2563EB', background:'#EFF6FF', color:'#2563EB', fontWeight:600 },
  jourBtn:      { padding:'6px 10px', border:'1.5px solid #E2E8F0', borderRadius:8, background:'#F8FAFC', fontSize:12.5, cursor:'pointer', fontFamily:F, color:'#475569' },
  jourBtnActive:{ borderColor:'#2563EB', background:'#EFF6FF', color:'#2563EB', fontWeight:600 },

  btnPrimary:   { padding:'10px 22px', background:'#2563EB', color:'#fff', border:'none', borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F },
  btnSecondary: { padding:'10px 18px', background:'#F8FAFC', color:'#475569', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:F },
  btnDanger:    { padding:'10px 18px', background:'#EF4444', color:'#fff', border:'none', borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F },

  empty:       { textAlign:'center', color:'#94A3B8', padding:'40px 20px', fontSize:14, display:'flex', flexDirection:'column', alignItems:'center' },
  emptySuccess:{ textAlign:'center', padding:'40px 20px', display:'flex', flexDirection:'column', alignItems:'center' },
}
