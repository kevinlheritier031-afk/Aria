import { useState, useEffect, useRef } from 'react'
import { fetchRecettes, upsertRecette, deleteRecette } from '../lib/supabase'
import { ALLERGENES, CAT_ICON, CAT_COLOR, CAT_BG, UNITES, uid } from '../constants'

const CAT_RECETTE = ['entree','plat','dessert','sauce','base','autre']
const CAT_RECETTE_LABEL = { entree:'Entrée', plat:'Plat', dessert:'Dessert', sauce:'Sauce', base:'Base', autre:'Autre' }
const CAT_RECETTE_EMOJI = { entree:'🥗', plat:'🍽️', dessert:'🍮', sauce:'🫙', base:'📦', autre:'🍴' }

const S = {
  page:     { display:'flex', flexDirection:'column', gap:16 },
  row:      { display:'flex', alignItems:'center', gap:8 },
  rowBetween:{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  card:     { background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'14px 16px', cursor:'pointer', transition:'box-shadow .15s' },
  input:    { width:'100%', border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:'none', background:'#fff', color:'#0F172A' },
  select:   { border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:'none', background:'#fff', color:'#0F172A', cursor:'pointer' },
  label:    { fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' },
  btn:      { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', border:'none', transition:'opacity .15s' },
  btnSm:    { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 12px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', border:'none' },
  divider:  { height:1, background:'#E2E8F0', margin:'8px 0' },
  section:  { display:'flex', flexDirection:'column', gap:8 },
  badge:    { display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:99, fontSize:11, fontWeight:600 },
  overlay:  { position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' },
  sheet:    { background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:640, maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden' },
  sheetHdr: { padding:'16px 20px 12px', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  sheetBody:{ padding:'16px 20px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:16 },
  sheetFtr: { padding:'12px 20px', borderTop:'1px solid #E2E8F0', display:'flex', gap:8, flexShrink:0 },
  textarea: { width:'100%', border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:'none', resize:'vertical', minHeight:80, color:'#0F172A' },
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function AllergenBadge({ ak, selected, onClick }) {
  const a = ALLERGENES.find(x => x.k === ak)
  if (!a) return null
  const active = selected
  return (
    <button
      onClick={onClick}
      style={{
        display:'inline-flex', alignItems:'center', gap:4, padding:'4px 9px',
        borderRadius:99, fontSize:12, fontWeight:500, cursor:'pointer', border:'none',
        background: active ? '#FEF3C7' : '#F1F5F9',
        color:      active ? '#92400E' : '#94A3B8',
        outline: active ? '1.5px solid #FDE68A' : 'none',
        transition:'all .12s',
      }}
    >
      {a.icon} {a.label}
    </button>
  )
}

function AllergenChip({ ak }) {
  const a = ALLERGENES.find(x => x.k === ak)
  if (!a) return null
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:99, background:'#FEF3C7', color:'#92400E', fontSize:11, fontWeight:600 }}>
      {a.icon} {a.label}
    </span>
  )
}

function RecetteCard({ rec, onClick }) {
  const cat = rec.cat || 'autre'
  return (
    <div
      style={{ ...S.card, display:'flex', flexDirection:'column', gap:8 }}
      onClick={onClick}
      onMouseOver={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(15,23,42,.08)'}
      onMouseOut={e => e.currentTarget.style.boxShadow='none'}
    >
      <div style={S.rowBetween}>
        <div style={S.row}>
          <span style={{ fontSize:22 }}>{CAT_RECETTE_EMOJI[cat] || '🍴'}</span>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#0F172A', lineHeight:1.2 }}>{rec.nom}</div>
            <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
              {CAT_RECETTE_LABEL[cat] || cat} · {rec.nb_personnes || '?'} pers.
              {rec.temps_prep ? ` · ${rec.temps_prep}min prépa` : ''}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          {rec.cout_estime > 0 && (
            <span style={{ ...S.badge, background:'#EFF6FF', color:'#2563EB' }}>
              {rec.cout_estime.toFixed(2)} €
            </span>
          )}
          <span style={{ fontSize:12, color:'#94A3B8' }}>
            {rec.ingredients?.length || 0} ingr.
          </span>
        </div>
      </div>
      {rec.allergenes?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {rec.allergenes.slice(0,5).map(ak => <AllergenChip key={ak} ak={ak} />)}
          {rec.allergenes.length > 5 && (
            <span style={{ ...S.badge, background:'#F1F5F9', color:'#94A3B8' }}>+{rec.allergenes.length - 5}</span>
          )}
        </div>
      )}
    </div>
  )
}

const EMPTY_ING  = () => ({ id:uid(), nom:'', q:'', u:'kg', cat:'epicerie' })
const EMPTY_FORM = () => ({
  nom:'', nb_personnes:4, cat:'plat',
  ingredients:[], etapes:[], allergenes:[],
  cout_estime:'', temps_prep:'', temps_cuisson:'', notes:'',
})

function RecetteForm({ initial, onSave, onCancel, user, profile }) {
  const [form,      setForm]      = useState(initial ? { ...initial, cout_estime: initial.cout_estime ?? '', temps_prep: initial.temps_prep ?? '', temps_cuisson: initial.temps_cuisson ?? '', notes: initial.notes ?? '' } : EMPTY_FORM())
  const [scanning,  setScanning]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')
  const fileRef = useRef()
  const camRef  = useRef()

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleScan(file) {
    if (!file) return
    setScanning(true)
    try {
      const b64  = await fileToBase64(file)
      const res  = await fetch('/api/recette', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image: b64 }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(prev => ({
        ...prev,
        nom:          data.nom          || prev.nom,
        nb_personnes: data.nb_personnes || prev.nb_personnes,
        cat:          data.cat          || prev.cat,
        ingredients:  (data.ingredients || []).map(i => ({ ...i, id: uid() })),
        etapes:       data.etapes       || prev.etapes,
        allergenes:   data.allergenes   || prev.allergenes,
        cout_estime:  data.cout_estime  ?? prev.cout_estime,
        temps_prep:   data.temps_prep   ?? prev.temps_prep,
        temps_cuisson:data.temps_cuisson?? prev.temps_cuisson,
        notes:        data.notes        || prev.notes,
      }))
    } catch (e) {
      setFormError('Erreur scan : ' + e.message)
    } finally {
      setScanning(false)
    }
  }

  function toggleAllergen(ak) {
    const has = form.allergenes.includes(ak)
    f('allergenes', has ? form.allergenes.filter(x => x !== ak) : [...form.allergenes, ak])
  }

  function addIngredient() { f('ingredients', [...form.ingredients, EMPTY_ING()]) }
  function updateIngredient(id, k, v) {
    f('ingredients', form.ingredients.map(i => i.id === id ? { ...i, [k]: v } : i))
  }
  function removeIngredient(id) { f('ingredients', form.ingredients.filter(i => i.id !== id)) }

  function addEtape() { f('etapes', [...form.etapes, '']) }
  function updateEtape(idx, v) { f('etapes', form.etapes.map((e,i) => i === idx ? v : e)) }
  function removeEtape(idx) { f('etapes', form.etapes.filter((_,i) => i !== idx)) }

  async function handleSave() {
    setFormError('')
    if (!form.nom.trim()) { setFormError('Le nom de la recette est requis'); return }
    setSaving(true)
    const payload = {
      id:            initial?.id || uid(),
      user_id:       user.id,
      etablissement_id: profile?.etablissement_id,
      nom:           form.nom.trim(),
      nb_personnes:  parseInt(form.nb_personnes) || 4,
      cat:           form.cat,
      ingredients:   form.ingredients.filter(i => i.nom.trim()),
      etapes:        form.etapes.filter(e => e.trim()),
      allergenes:    form.allergenes,
      cout_estime:   parseFloat(form.cout_estime) || null,
      temps_prep:    parseInt(form.temps_prep)    || null,
      temps_cuisson: parseInt(form.temps_cuisson) || null,
      notes:         form.notes.trim() || null,
    }
    const { error } = await upsertRecette(payload)
    setSaving(false)
    if (error) {
      console.error('❌ INSERT FAIL:', 'recettes', error)
      setFormError('Erreur : ' + error.message)
      return
    }
    console.log('✅ INSERT OK:', 'recettes', payload)
    onSave(payload)
  }

  return (
    <>
      <div style={S.sheetHdr}>
        <span style={{ fontWeight:700, fontSize:17 }}>{initial ? 'Modifier la recette' : 'Nouvelle recette'}</span>
        <button onClick={onCancel} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8' }}>×</button>
      </div>

      <div style={S.sheetBody}>
        {/* Scan buttons */}
        <div style={{ display:'flex', gap:8 }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleScan(e.target.files[0])} />
          <input ref={camRef}  type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => handleScan(e.target.files[0])} />
          <button onClick={() => camRef.current.click()} disabled={scanning} style={{ ...S.btn, ...S.btnSm, flex:1, background:'#EFF6FF', color:'#2563EB' }}>
            📷 {scanning ? 'Scan…' : 'Scanner'}
          </button>
          <button onClick={() => fileRef.current.click()} disabled={scanning} style={{ ...S.btn, ...S.btnSm, flex:1, background:'#F1F5F9', color:'#475569' }}>
            🖼 Galerie
          </button>
        </div>

        <div style={S.divider} />

        {/* Infos de base */}
        <div style={S.section}>
          <label style={S.label}>Nom de la recette *</label>
          <input style={S.input} value={form.nom} onChange={e => f('nom', e.target.value)} placeholder="Ex: Blanquette de veau" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={S.label}>Catégorie</label>
            <select style={{ ...S.select, width:'100%' }} value={form.cat} onChange={e => f('cat', e.target.value)}>
              {CAT_RECETTE.map(c => <option key={c} value={c}>{CAT_RECETTE_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Nb personnes</label>
            <input style={S.input} type="number" min="1" value={form.nb_personnes} onChange={e => f('nb_personnes', e.target.value)} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div>
            <label style={S.label}>Prépa (min)</label>
            <input style={S.input} type="number" min="0" value={form.temps_prep} onChange={e => f('temps_prep', e.target.value)} placeholder="30" />
          </div>
          <div>
            <label style={S.label}>Cuisson (min)</label>
            <input style={S.input} type="number" min="0" value={form.temps_cuisson} onChange={e => f('temps_cuisson', e.target.value)} placeholder="45" />
          </div>
          <div>
            <label style={S.label}>Coût (€)</label>
            <input style={S.input} type="number" step="0.01" min="0" value={form.cout_estime} onChange={e => f('cout_estime', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div style={S.divider} />

        {/* Ingrédients */}
        <div style={S.section}>
          <div style={S.rowBetween}>
            <label style={{ ...S.label, marginBottom:0 }}>Ingrédients</label>
            <button onClick={addIngredient} style={{ ...S.btnSm, background:'#EFF6FF', color:'#2563EB' }}>+ Ajouter</button>
          </div>
          {form.ingredients.length === 0 && (
            <div style={{ textAlign:'center', color:'#94A3B8', fontSize:13, padding:'8px 0' }}>Aucun ingrédient — scannez ou ajoutez manuellement</div>
          )}
          {form.ingredients.map((ing, idx) => (
            <div key={ing.id} style={{ display:'grid', gridTemplateColumns:'1fr 60px 80px auto', gap:6, alignItems:'center' }}>
              <input
                style={S.input}
                placeholder={`Ingrédient ${idx+1}`}
                value={ing.nom}
                onChange={e => updateIngredient(ing.id, 'nom', e.target.value)}
              />
              <input
                style={{ ...S.input, textAlign:'center' }}
                type="number" step="0.01" min="0"
                placeholder="Qté"
                value={ing.q}
                onChange={e => updateIngredient(ing.id, 'q', e.target.value)}
              />
              <select style={{ ...S.select, padding:'9px 6px', fontSize:12 }} value={ing.u} onChange={e => updateIngredient(ing.id, 'u', e.target.value)}>
                {['kg','g','L','cl','ml','pièce','c.à.s','c.à.c','pincée','sachet','bouquet'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button onClick={() => removeIngredient(ing.id)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:18, lineHeight:1, padding:'0 4px' }}>×</button>
            </div>
          ))}
        </div>

        <div style={S.divider} />

        {/* Étapes */}
        <div style={S.section}>
          <div style={S.rowBetween}>
            <label style={{ ...S.label, marginBottom:0 }}>Étapes de préparation</label>
            <button onClick={addEtape} style={{ ...S.btnSm, background:'#EFF6FF', color:'#2563EB' }}>+ Étape</button>
          </div>
          {form.etapes.length === 0 && (
            <div style={{ textAlign:'center', color:'#94A3B8', fontSize:13, padding:'8px 0' }}>Aucune étape</div>
          )}
          {form.etapes.map((e, idx) => (
            <div key={idx} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
              <span style={{ fontWeight:700, color:'#2563EB', fontSize:13, minWidth:20, paddingTop:10 }}>{idx+1}.</span>
              <textarea
                style={{ ...S.textarea, minHeight:56, flex:1 }}
                placeholder={`Étape ${idx+1}`}
                value={e}
                onChange={ev => updateEtape(idx, ev.target.value)}
              />
              <button onClick={() => removeEtape(idx)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:18, padding:'8px 2px' }}>×</button>
            </div>
          ))}
        </div>

        <div style={S.divider} />

        {/* Allergènes */}
        <div style={S.section}>
          <label style={S.label}>Allergènes présents</label>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {ALLERGENES.map(a => (
              <AllergenBadge
                key={a.k}
                ak={a.k}
                selected={form.allergenes.includes(a.k)}
                onClick={() => toggleAllergen(a.k)}
              />
            ))}
          </div>
        </div>

        <div style={S.divider} />

        {/* Notes */}
        <div style={S.section}>
          <label style={S.label}>Notes</label>
          <textarea style={S.textarea} placeholder="Astuces, conseils de chef, variantes…" value={form.notes} onChange={e => f('notes', e.target.value)} />
        </div>
      </div>

      {formError && (
        <div style={{ margin:'0 20px 0', padding:'8px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12.5, color:'#DC2626', flexShrink:0 }}>
          {formError}
        </div>
      )}
      <div style={S.sheetFtr}>
        <button onClick={onCancel} style={{ ...S.btn, flex:1, background:'#F1F5F9', color:'#475569' }}>Annuler</button>
        <button onClick={handleSave} disabled={saving} style={{ ...S.btn, flex:2, background:'#2563EB', color:'#fff', opacity: saving ? .7 : 1 }}>
          {saving ? 'Enregistrement…' : '✓ Enregistrer'}
        </button>
      </div>
    </>
  )
}

function RecetteDetail({ rec, onEdit, onDelete, onClose }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const cat = rec.cat || 'autre'
  const totalTemps = (rec.temps_prep || 0) + (rec.temps_cuisson || 0)

  return (
    <>
      <div style={S.sheetHdr}>
        <div>
          <div style={{ fontWeight:700, fontSize:17, color:'#0F172A' }}>{rec.nom}</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
            {CAT_RECETTE_LABEL[cat] || cat} · {rec.nb_personnes} pers.
            {totalTemps > 0 ? ` · ${totalTemps} min` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8' }}>×</button>
      </div>

      <div style={S.sheetBody}>
        {/* Stats row */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {rec.temps_prep > 0 && (
            <span style={{ ...S.badge, background:'#F0FDF4', color:'#15803D' }}>⏱ Prépa {rec.temps_prep} min</span>
          )}
          {rec.temps_cuisson > 0 && (
            <span style={{ ...S.badge, background:'#FFF7ED', color:'#C2410C' }}>🔥 Cuisson {rec.temps_cuisson} min</span>
          )}
          {rec.cout_estime > 0 && (
            <span style={{ ...S.badge, background:'#EFF6FF', color:'#2563EB' }}>💶 {rec.cout_estime.toFixed(2)} €</span>
          )}
        </div>

        {/* Allergènes */}
        {rec.allergenes?.length > 0 && (
          <div style={S.section}>
            <label style={S.label}>Allergènes</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {rec.allergenes.map(ak => <AllergenChip key={ak} ak={ak} />)}
            </div>
          </div>
        )}

        {/* Ingrédients */}
        {rec.ingredients?.length > 0 && (
          <div style={S.section}>
            <label style={S.label}>Ingrédients ({rec.ingredients.length})</label>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {rec.ingredients.map((ing, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'#F8FAFC', borderRadius:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:16 }}>{CAT_ICON[ing.cat] || '📦'}</span>
                    <span style={{ fontSize:14, color:'#0F172A' }}>{ing.nom}</span>
                  </div>
                  <span style={{ fontSize:14, fontWeight:600, color:'#475569' }}>
                    {ing.q} {ing.u}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Étapes */}
        {rec.etapes?.length > 0 && (
          <div style={S.section}>
            <label style={S.label}>Préparation</label>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {rec.etapes.map((e, i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <span style={{ fontWeight:800, color:'#2563EB', fontSize:15, minWidth:22 }}>{i+1}</span>
                  <p style={{ fontSize:14, color:'#0F172A', lineHeight:1.6, margin:0 }}>{e}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {rec.notes && (
          <div style={{ background:'#FFFBEB', borderRadius:10, padding:'10px 14px', border:'1px solid #FDE68A' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#92400E', marginBottom:4 }}>💡 Notes</div>
            <p style={{ fontSize:13, color:'#78350F', margin:0, lineHeight:1.5 }}>{rec.notes}</p>
          </div>
        )}
      </div>

      <div style={S.sheetFtr}>
        {confirmDel ? (
          <>
            <button onClick={() => setConfirmDel(false)} style={{ ...S.btn, flex:1, background:'#F1F5F9', color:'#475569' }}>Non</button>
            <button onClick={onDelete} style={{ ...S.btn, flex:2, background:'#FEF2F2', color:'#EF4444', border:'1px solid #FECACA' }}>Supprimer définitivement</button>
          </>
        ) : (
          <>
            <button onClick={() => setConfirmDel(true)} style={{ ...S.btnSm, background:'#FEF2F2', color:'#EF4444', border:'1px solid #FECACA' }}>🗑</button>
            <button onClick={onEdit} style={{ ...S.btn, flex:1, background:'#F1F5F9', color:'#475569' }}>✏️ Modifier</button>
            <button onClick={onClose} style={{ ...S.btn, flex:1, background:'#2563EB', color:'#fff' }}>Fermer</button>
          </>
        )}
      </div>
    </>
  )
}

export default function Recettes({ stock, user, profile, fromDashboard, onBack }) {
  const [recettes,  setRecettes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState('list')
  const [detail,    setDetail]    = useState(null)
  const [editRec,   setEditRec]   = useState(null)
  const [searchQ,   setSearchQ]   = useState('')
  const [filterCat, setFilterCat] = useState('all')

  useEffect(() => {
    if (!user) return
    fetchRecettes(user.id).then(({ data }) => {
      if (data) setRecettes(data)
      setLoading(false)
    })
  }, [user])

  const filtered = recettes.filter(r => {
    const matchQ   = !searchQ   || r.nom.toLowerCase().includes(searchQ.toLowerCase())
    const matchCat = filterCat === 'all' || r.cat === filterCat
    return matchQ && matchCat
  })

  async function handleSave(rec) {
    setRecettes(prev => {
      const idx = prev.findIndex(r => r.id === rec.id)
      return idx >= 0 ? prev.map(r => r.id === rec.id ? rec : r) : [rec, ...prev]
    })
    setView('list')
    setEditRec(null)
  }

  async function handleDelete(id) {
    await deleteRecette(id)
    setRecettes(prev => prev.filter(r => r.id !== id))
    setDetail(null)
    setView('list')
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:48, color:'#94A3B8' }}>
      Chargement…
    </div>
  )

  return (
    <div style={S.page}>
      {/* Back button */}
      {fromDashboard && (
        <button onClick={onBack} style={{ ...S.btnSm, background:'#F1F5F9', color:'#475569', alignSelf:'flex-start' }}>
          ← Retour
        </button>
      )}

      {/* Header */}
      <div style={S.rowBetween}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0 }}>Recettes</h2>
          <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>{recettes.length} recette{recettes.length !== 1 ? 's' : ''} enregistrée{recettes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditRec(null); setView('form') }} style={{ ...S.btn, background:'#2563EB', color:'#fff', padding:'10px 14px' }}>
          + Nouvelle
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ display:'flex', gap:8 }}>
        <input
          style={{ ...S.input, flex:1 }}
          placeholder="🔍 Rechercher une recette…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />
        <select style={{ ...S.select, minWidth:110 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">Tout</option>
          {CAT_RECETTE.map(c => <option key={c} value={c}>{CAT_RECETTE_LABEL[c]}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 16px', color:'#94A3B8' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📖</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#0F172A', marginBottom:4 }}>
            {recettes.length === 0 ? 'Aucune recette' : 'Aucun résultat'}
          </div>
          <div style={{ fontSize:13 }}>
            {recettes.length === 0 ? 'Créez votre première recette ou scannez une fiche' : 'Modifiez votre recherche'}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(rec => (
            <RecetteCard
              key={rec.id}
              rec={rec}
              onClick={() => { setDetail(rec); setView('detail') }}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {view === 'detail' && detail && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setView('list') }}>
          <div style={S.sheet}>
            <RecetteDetail
              rec={detail}
              onClose={() => setView('list')}
              onEdit={() => { setEditRec(detail); setView('form') }}
              onDelete={() => handleDelete(detail.id)}
            />
          </div>
        </div>
      )}

      {/* Form modal */}
      {view === 'form' && (
        <div style={S.overlay}>
          <div style={S.sheet}>
            <RecetteForm
              initial={editRec}
              user={user}
              profile={profile}
              onSave={handleSave}
              onCancel={() => { setView(editRec ? 'detail' : 'list'); setEditRec(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
