import { useState, useMemo } from 'react'
import { upsertFournisseur, deleteFournisseur } from '../lib/supabase'
import { MODES_COMMANDE, JOURS, uid } from '../constants'

const critique = (item) => {
  const s = parseFloat(item.seuil_min)
  return isNaN(s) ? item.q <= 2 : item.q <= s
}

// ── Fournisseur Modal ─────────────────────────────────────────────────────────

function FournisseurModal({ four, onSave, onClose, saving }) {
  const isNew = !four?.id
  const [form, setForm] = useState({
    nom: four?.nom || '', mode: four?.mode || 'tel',
    tel: four?.tel || '', email: four?.email || '', site: four?.site || '',
    jours: four?.jours || [], heure_limite: four?.heure_limite || '09:00',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleJour = (j) => setForm(f => ({
    ...f, jours: f.jours.includes(j) ? f.jours.filter(x => x !== j) : [...f.jours, j]
  }))

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>{isNew ? 'Nouveau fournisseur' : form.nom}</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <Field label="Nom *">
            <input style={S.input} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex : Metro" />
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
          {form.mode === 'tel' && (
            <Field label="Téléphone">
              <input style={S.input} value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="06 00 00 00 00" />
            </Field>
          )}
          {form.mode === 'mail' && (
            <Field label="Email commandes">
              <input style={S.input} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="commandes@fournisseur.fr" />
            </Field>
          )}
          {form.mode === 'site' && (
            <Field label="Site web">
              <input style={S.input} value={form.site} onChange={e => set('site', e.target.value)} placeholder="https://..." />
            </Field>
          )}
          <Field label="Jours de commande">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {JOURS.map((j, i) => (
                <button key={j} type="button"
                  style={{ ...S.jourBtn, ...(form.jours.includes(j) ? S.jourBtnActive : {}) }}
                  onClick={() => toggleJour(j)}>
                  {j.slice(0,3)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Heure limite">
            <input style={{ ...S.input, width:'auto', maxWidth:140 }} type="time" value={form.heure_limite} onChange={e => set('heure_limite', e.target.value)} />
          </Field>
        </div>
        <div style={S.modalFooter}>
          <button style={S.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={{ ...S.btnPrimary, opacity: saving?.5:1 }} disabled={saving}
            onClick={() => onSave({ ...four, ...form })}>
            {saving ? 'Enregistrement…' : isNew ? 'Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12, fontWeight:500, color:'#475569' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Order Sheet Generator ─────────────────────────────────────────────────────

function OrderSheet({ four, items, onClose }) {
  const { mode, tel, email, site } = four
  const lines = items.map(i => `• ${i.nom} : ${i.q} ${i.u} (seuil : ${i.seuil_min ?? 2} ${i.u})`).join('\n')

  const tel_text = `Bonjour, je souhaite passer commande :\n${lines}`
  const mail_subject = `Commande ${new Date().toLocaleDateString('fr-FR')}`
  const mail_body = `Bonjour,\n\nVeuillez trouver ci-dessous ma commande :\n\n${lines}\n\nMerci.`

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth:480 }} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>Bon de commande — {four.nom}</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>
          <div style={S.orderBox}>
            <div style={S.orderLabel}>Produits à commander</div>
            {items.map(i => (
              <div key={i.id} style={S.orderRow}>
                <span style={S.orderNom}>{i.nom}</span>
                <span style={S.orderQty}>{i.q} / {i.seuil_min ?? 2} {i.u}</span>
              </div>
            ))}
          </div>

          {mode === 'tel' && tel && (
            <a href={`tel:${tel}`} style={S.actionLink}>
              📞 Appeler {four.nom} — {tel}
            </a>
          )}
          {mode === 'mail' && email && (
            <a href={`mailto:${email}?subject=${encodeURIComponent(mail_subject)}&body=${encodeURIComponent(mail_body)}`}
              style={S.actionLink}>
              ✉️ Envoyer l'email à {four.nom}
            </a>
          )}
          {mode === 'site' && site && (
            <a href={site} target="_blank" rel="noopener noreferrer" style={S.actionLink}>
              🌐 Ouvrir le site de {four.nom}
            </a>
          )}

          <div style={S.copyBox}>
            <div style={S.copyLabel}>Texte à copier</div>
            <pre style={S.copyText}>{tel_text}</pre>
            <button style={S.copyBtn} onClick={() => navigator.clipboard?.writeText(tel_text)}>
              📋 Copier
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Commandes Page ────────────────────────────────────────────────────────────

export default function Commandes({ stock = [], fournisseurs = [], setFournisseurs, prixHist = [], user }) {
  const [tab,        setTab]        = useState('commandes')
  const [orderSheet, setOrderSheet] = useState(null)
  const [editFour,   setEditFour]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving,     setSaving]     = useState(false)

  // ── Tab : Commandes ──────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const critiques = stock.filter(critique)
    const map = {}
    critiques.forEach(item => {
      const key = item.four || '—'
      if (!map[key]) map[key] = []
      map[key].push(item)
    })
    return Object.entries(map).sort((a,b) => a[0].localeCompare(b[0]))
  }, [stock])

  // ── Tab : Tarifs ─────────────────────────────────────────────────────────

  const prixData = useMemo(() => {
    const map = {}
    prixHist.forEach(p => {
      if (!map[p.prod]) map[p.prod] = []
      map[p.prod].push(p)
    })
    return Object.entries(map).map(([prod, prix]) => {
      const sorted = [...prix].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      const last = sorted[0], prev = sorted[1]
      const delta = prev ? ((last.px - prev.px) / prev.px * 100) : null
      return { prod, last, prev, delta, history: sorted.slice(0,5) }
    }).sort((a,b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
  }, [prixHist])

  // ── Fournisseur CRUD ──────────────────────────────────────────────────────

  async function handleSaveFour(form) {
    setSaving(true)
    const payload = { ...form, user_id: user.id }
    if (!payload.id) payload.id = uid()
    const { data } = await upsertFournisseur(payload)
    setFournisseurs(fs => form.id ? fs.map(f => f.id === form.id ? payload : f) : [payload, ...fs])
    setSaving(false)
    setEditFour(null)
  }

  async function handleDeleteFour(id) {
    await deleteFournisseur(id)
    setFournisseurs(fs => fs.filter(f => f.id !== id))
    setConfirmDel(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      <h1 style={S.title}>Commandes</h1>

      {/* Tabs */}
      <div style={S.tabs}>
        {[{k:'commandes',l:'Commandes'},{k:'tarifs',l:'Tarifs'},{k:'fournisseurs',l:'Fournisseurs'}].map(t => (
          <button key={t.k} style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}) }} onClick={() => setTab(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── Tab Commandes ─────────────────────────────────────────────────── */}

      {tab === 'commandes' && (
        grouped.length === 0
          ? <div style={S.empty}>✅ Aucun produit sous seuil — stock à jour !</div>
          : grouped.map(([nom, items]) => {
              const four = fournisseurs.find(f => f.nom === nom)
              return (
                <div key={nom} style={S.card}>
                  <div style={S.cardHeader}>
                    <div>
                      <div style={S.cardTitle}>{nom}</div>
                      {four?.jours?.length > 0 && (
                        <div style={S.cardSub}>Commande : {four.jours.join(', ')} avant {four.heure_limite}</div>
                      )}
                    </div>
                    {four && (
                      <button style={S.orderBtn} onClick={() => setOrderSheet({ four, items })}>
                        {four.mode === 'tel' ? '📞' : four.mode === 'mail' ? '✉️' : '🌐'} Commander
                      </button>
                    )}
                  </div>
                  {items.map(i => (
                    <div key={i.id} style={S.cmdRow}>
                      <span style={S.cmdNom}>{i.nom}</span>
                      <div style={S.cmdRight}>
                        <span style={S.cmdQty}>{i.q} {i.u}</span>
                        <span style={S.cmdArrow}>→</span>
                        <span style={S.cmdSeuil}>{i.seuil_min ?? 2} {i.u} min.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
      )}

      {/* ── Tab Tarifs ────────────────────────────────────────────────────── */}

      {tab === 'tarifs' && (
        prixData.length === 0
          ? <div style={S.empty}>Aucun historique de prix enregistré.</div>
          : prixData.map(({ prod, last, delta, history }) => (
            <div key={prod} style={S.card}>
              <div style={S.cardHeader}>
                <div>
                  <div style={S.cardTitle}>{prod}</div>
                  <div style={S.cardSub}>{last.four}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:18, fontWeight:800, fontFamily:"'DM Mono',monospace", color:'#0F172A' }}>
                    {Number(last.px).toFixed(2)} €
                  </span>
                  {delta !== null && (
                    <span style={{ fontSize:12, fontWeight:600, color: delta > 0 ? '#EF4444' : '#10B981', background: delta > 0 ? '#FEF2F2' : '#ECFDF5', padding:'2px 8px', borderRadius:99 }}>
                      {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {history.map((p, i) => (
                  <div key={i} style={S.prixTag}>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{p.date_prix || p.created_at?.slice(0,10)}</div>
                    <div style={{ fontSize:13, fontWeight:700, fontFamily:"'DM Mono',monospace", color:'#0F172A' }}>{Number(p.px).toFixed(2)} €</div>
                    <div style={{ fontSize:10, color:'#94A3B8' }}>{p.four}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}

      {/* ── Tab Fournisseurs ─────────────────────────────────────────────── */}

      {tab === 'fournisseurs' && (
        <>
          <button style={S.addBtn} onClick={() => setEditFour({})}>+ Ajouter un fournisseur</button>
          {fournisseurs.length === 0
            ? <div style={S.empty}>Aucun fournisseur configuré.</div>
            : fournisseurs.map(f => (
              <div key={f.id} style={S.card}>
                <div style={S.cardHeader}>
                  <div>
                    <div style={S.cardTitle}>{f.nom}</div>
                    <div style={S.cardSub}>
                      {MODES_COMMANDE.find(m => m.k === f.mode)?.l || f.mode}
                      {f.jours?.length > 0 && ` · ${f.jours.join(', ')}`}
                      {f.heure_limite && ` avant ${f.heure_limite}`}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button style={S.iconBtn} onClick={() => setEditFour(f)}>✏️</button>
                    <button style={{ ...S.iconBtn, color:'#EF4444' }} onClick={() => setConfirmDel(f.id)}>🗑️</button>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                  {f.tel && <span style={S.chip}>📞 {f.tel}</span>}
                  {f.email && <span style={S.chip}>✉️ {f.email}</span>}
                  {f.site && <span style={S.chip}>🌐 Site</span>}
                </div>
              </div>
            ))
          }
        </>
      )}

      {/* Modals */}
      {orderSheet && <OrderSheet four={orderSheet.four} items={orderSheet.items} onClose={() => setOrderSheet(null)} />}
      {editFour !== null && (
        <FournisseurModal four={editFour} onSave={handleSaveFour} onClose={() => setEditFour(null)} saving={saving} />
      )}
      {confirmDel && (
        <div style={S.backdrop} onClick={() => setConfirmDel(null)}>
          <div style={{ ...S.modal, maxWidth:340 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:'28px 24px', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
              <div style={{ fontSize:15, fontWeight:600, color:'#0F172A', marginBottom:6 }}>Supprimer ce fournisseur ?</div>
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
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

const F = "'DM Sans','Inter',sans-serif"

const S = {
  page: { padding:20, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:860, margin:'0 auto' },
  title: { fontSize:22, fontWeight:700, color:'#0F172A', margin:0 },

  tabs: { display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3 },
  tab:  { flex:1, padding:'9px', border:'none', background:'none', borderRadius:8, fontSize:13.5, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F },
  tabActive: { background:'#fff', color:'#0F172A', boxShadow:'0 1px 3px rgba(0,0,0,.08)' },

  card: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 20px' },
  cardHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12, gap:12 },
  cardTitle:  { fontSize:15, fontWeight:700, color:'#0F172A' },
  cardSub:    { fontSize:12, color:'#94A3B8', marginTop:2 },

  cmdRow:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F8FAFC' },
  cmdNom:   { fontSize:13.5, color:'#0F172A', fontWeight:500 },
  cmdRight: { display:'flex', alignItems:'center', gap:6 },
  cmdQty:   { fontSize:13, fontFamily:"'DM Mono',monospace", color:'#EF4444', fontWeight:700 },
  cmdArrow: { fontSize:12, color:'#94A3B8' },
  cmdSeuil: { fontSize:12, color:'#64748B' },

  orderBtn: { padding:'8px 14px', background:'#2563EB', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' },

  prixTag: { background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, padding:'8px 12px', display:'flex', flexDirection:'column', gap:1, minWidth:80 },

  addBtn: { padding:'10px 18px', background:'#EFF6FF', color:'#2563EB', border:'1.5px solid #BFDBFE', borderRadius:10, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F, alignSelf:'flex-start' },
  iconBtn: { width:34, height:34, border:'none', background:'#F8FAFC', borderRadius:8, cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F },
  chip: { fontSize:12, padding:'3px 10px', background:'#F1F5F9', borderRadius:99, color:'#475569' },

  backdrop: { position:'fixed', inset:0, background:'rgba(15,23,42,.45)', backdropFilter:'blur(2px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center', fontFamily:F },
  modal: { background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:520, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 -8px 40px rgba(0,0,0,.15)' },
  modalHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 16px', borderBottom:'1px solid #F1F5F9' },
  modalTitle: { fontSize:16, fontWeight:700, color:'#0F172A' },
  closeBtn: { width:30, height:30, border:'none', background:'#F1F5F9', borderRadius:99, cursor:'pointer', color:'#94A3B8', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:F },
  modalBody: { padding:'16px 20px', display:'flex', flexDirection:'column', gap:14, overflowY:'auto', flex:1 },
  modalFooter: { padding:'14px 20px', borderTop:'1px solid #F1F5F9', display:'flex', gap:10, justifyContent:'flex-end' },

  input: { width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:13.5, fontFamily:F, background:'#F8FAFC', outline:'none', boxSizing:'border-box', color:'#0F172A' },

  modeBtn: { flex:1, padding:'8px 6px', border:'1.5px solid #E2E8F0', borderRadius:9, background:'#F8FAFC', fontSize:12.5, cursor:'pointer', fontFamily:F, color:'#475569' },
  modeBtnActive: { borderColor:'#2563EB', background:'#EFF6FF', color:'#2563EB' },

  jourBtn: { padding:'6px 10px', border:'1.5px solid #E2E8F0', borderRadius:8, background:'#F8FAFC', fontSize:12.5, cursor:'pointer', fontFamily:F, color:'#475569' },
  jourBtnActive: { borderColor:'#2563EB', background:'#EFF6FF', color:'#2563EB', fontWeight:600 },

  btnPrimary:   { padding:'10px 22px', background:'#2563EB', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F },
  btnSecondary: { padding:'10px 18px', background:'#F8FAFC', color:'#475569', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:13.5, fontWeight:500, cursor:'pointer', fontFamily:F },
  btnDanger:    { padding:'10px 18px', background:'#EF4444', color:'#fff', border:'none', borderRadius:9, fontSize:13.5, fontWeight:600, cursor:'pointer', fontFamily:F },

  orderBox: { background:'#F8FAFC', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 },
  orderLabel: { fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 },
  orderRow: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  orderNom: { fontSize:13.5, color:'#0F172A', fontWeight:500 },
  orderQty: { fontSize:12, color:'#64748B', fontFamily:"'DM Mono',monospace" },

  actionLink: { display:'block', padding:'12px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, color:'#2563EB', fontSize:13.5, fontWeight:600, textDecoration:'none', textAlign:'center' },

  copyBox: { background:'#F8FAFC', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 },
  copyLabel: { fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase' },
  copyText: { fontSize:12, fontFamily:"'DM Mono',monospace", color:'#475569', whiteSpace:'pre-wrap', margin:0 },
  copyBtn: { alignSelf:'flex-start', padding:'6px 14px', background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:12.5, cursor:'pointer', fontFamily:F, color:'#475569' },

  empty: { textAlign:'center', color:'#94A3B8', padding:'40px 20px', fontSize:14 },
}
