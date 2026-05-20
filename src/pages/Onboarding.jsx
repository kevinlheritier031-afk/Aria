import { useState, useRef } from 'react'
import { uid, fdate } from '../constants'
import {
  upsertFournisseur, upsertStock, upsertRecette, upsertEquipeMembre,
  insertHaccpZone, updateUserMetadata, upsertEtablissement,
} from '../lib/supabase'

const F = "'Plus Jakarta Sans','Inter',sans-serif"
const TOTAL = 8

const ETAB_TYPES   = ['Restaurant', 'Boulangerie-Pâtisserie', 'Hôtel-Restaurant', 'Traiteur', 'Restauration collective', 'Autre']
const NB_EMP       = ['1–5', '6–15', '16–30', '30+']
const ROLE_CHOICES = [
  { k:'proprietaire', l:'Propriétaire', i:'👑' },
  { k:'chef',         l:'Chef',         i:'👨‍🍳' },
  { k:'second',       l:'Second',       i:'🧑‍🍳' },
  { k:'cuisinier',    l:'Cuisinier',    i:'🍳' },
  { k:'employe',      l:'Employé',      i:'👤' },
]
const JOURS      = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const EQ_ROLES   = ['chef', 'second', 'cuisinier', 'employe', 'apprenti', 'stagiaire']
const STOCK_CATS = ['viande', 'poisson', 'laitier', 'epicerie', 'legumes', 'boissons', 'autre']
const UNITES     = ['kg', 'g', 'L', 'cl', 'pièce', 'carton', 'boîte', 'autre']

const pinRand = () => String(Math.floor(1000 + Math.random() * 9000))

// ── AriaBubble ────────────────────────────────────────────────────────────────

function AriaBubble({ text }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:24 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#4F46E5)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>✦</div>
      <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:'6px 18px 18px 18px', padding:'13px 17px', fontSize:14, lineHeight:1.7, color:'#0F172A', maxWidth:520, boxShadow:'0 2px 10px rgba(15,23,42,.06)', fontFamily:F }}>
        {text.split('\n').map((l, i, a) => <span key={i}>{l}{i < a.length - 1 && <br />}</span>)}
      </div>
    </div>
  )
}

// ── ChoiceGrid ────────────────────────────────────────────────────────────────

function ChoiceGrid({ items, value, onChange }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
      {items.map(item => {
        const k = typeof item === 'string' ? item : item.k
        const l = typeof item === 'string' ? item : item.l
        const ic = typeof item === 'object' ? item.i : null
        const active = value === k
        return (
          <button key={k} onClick={() => onChange(k)}
            style={{ padding:'9px 18px', borderRadius:10, border:`1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`, background: active ? '#EFF6FF' : '#fff', color: active ? '#2563EB' : '#475569', fontWeight: active ? 700 : 500, fontSize:14, cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', gap:6 }}>
            {ic && <span>{ic}</span>}
            {l}
          </button>
        )
      })}
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</label>
      {children}
    </div>
  )
}

const inp = { padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, fontFamily:F, outline:'none', background:'#fff', color:'#0F172A', width:'100%', boxSizing:'border-box' }
const btnP = { background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'#fff', border:'none', borderRadius:12, padding:'13px 28px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:F, boxShadow:'0 4px 14px rgba(37,99,235,.3)' }
const btnS = { background:'none', border:'none', color:'#94A3B8', fontSize:13, cursor:'pointer', fontFamily:F, padding:'4px 0' }

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 — Accueil
// ─────────────────────────────────────────────────────────────────────────────

function Step0({ user, onNext }) {
  const [form, setForm] = useState({ nom:'', etab:'', type:'', nb_employes:'' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    if (!form.nom.trim() || !form.etab.trim()) return
    setSaving(true)
    try {
      await updateUserMetadata({ name: form.nom, nom_etablissement: form.etab, type_etablissement: form.type, nb_employes: form.nb_employes })
      await upsertEtablissement({ owner_id: user.id, nom: form.etab, type: form.type, nb_employes: form.nb_employes, created_at: new Date().toISOString() }).catch(() => {})
    } catch {}
    setSaving(false)
    onNext({ nom: form.nom, etab: form.etab, type: form.type })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Field label="Votre prénom *">
        <input style={inp} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex : Marie" autoFocus />
      </Field>
      <Field label="Nom de l'établissement *">
        <input style={inp} value={form.etab} onChange={e => set('etab', e.target.value)} placeholder="Ex : Brasserie Le Central" />
      </Field>
      <Field label="Type d'établissement">
        <ChoiceGrid items={ETAB_TYPES} value={form.type} onChange={v => set('type', v)} />
      </Field>
      <Field label="Nombre d'employés">
        <ChoiceGrid items={NB_EMP} value={form.nb_employes} onChange={v => set('nb_employes', v)} />
      </Field>
      <button style={{ ...btnP, opacity: (!form.nom || !form.etab || saving) ? .6 : 1 }}
        onClick={handleNext} disabled={!form.nom || !form.etab || saving}>
        {saving ? 'Enregistrement…' : 'Continuer →'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Rôle
// ─────────────────────────────────────────────────────────────────────────────

function Step1({ onNext }) {
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  async function handleNext() {
    if (!role) return
    setSaving(true)
    try { await updateUserMetadata({ role }) } catch {}
    setSaving(false)
    onNext({ role })
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <ChoiceGrid items={ROLE_CHOICES} value={role} onChange={setRole} />
      <button style={{ ...btnP, opacity: (!role || saving) ? .6 : 1 }}
        onClick={handleNext} disabled={!role || saving}>
        {saving ? 'Enregistrement…' : 'Continuer →'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — HACCP Zones
// ─────────────────────────────────────────────────────────────────────────────

const defaultZone = () => ({ nom:'', temp_min:'', temp_max:'' })

function Step2({ user, onNext }) {
  const [zones, setZones] = useState([defaultZone()])
  const [saving, setSaving] = useState(false)

  const setZone = (i, k, v) => setZones(z => z.map((zone, idx) => idx === i ? { ...zone, [k]: v } : zone))

  async function handleNext() {
    setSaving(true)
    const filled = zones.filter(z => z.nom.trim())
    for (const z of filled) {
      try {
        await insertHaccpZone({ id: uid(), etablissement_id: user.id, nom: z.nom, temp_min: Number(z.temp_min) || null, temp_max: Number(z.temp_max) || null, created_at: new Date().toISOString() })
      } catch {}
    }
    setSaving(false)
    onNext({ zones_count: filled.length })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {zones.map((z, i) => (
        <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#64748B' }}>Zone {i + 1}</span>
            {zones.length > 1 && (
              <button style={{ marginLeft:'auto', background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:16 }}
                onClick={() => setZones(z => z.filter((_, idx) => idx !== i))}>✕</button>
            )}
          </div>
          <input style={inp} placeholder="Nom (ex : Chambre froide positive)" value={z.nom} onChange={e => setZone(i, 'nom', e.target.value)} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <input style={inp} placeholder="Temp. min (°C)" type="number" value={z.temp_min} onChange={e => setZone(i, 'temp_min', e.target.value)} />
            <input style={inp} placeholder="Temp. max (°C)" type="number" value={z.temp_max} onChange={e => setZone(i, 'temp_max', e.target.value)} />
          </div>
        </div>
      ))}
      <button style={{ ...btnS, color:'#2563EB', fontWeight:600 }} onClick={() => setZones(z => [...z, defaultZone()])}>+ Ajouter une zone</button>
      <div style={{ display:'flex', gap:12 }}>
        <button style={{ ...btnP, opacity: saving ? .6 : 1 }} onClick={handleNext} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
        <button style={btnS} onClick={() => onNext({ zones_count: 0 })}>⏭ Passer</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Fournisseurs
// ─────────────────────────────────────────────────────────────────────────────

const defaultFour = () => ({ nom:'', tel:'', email:'', jours:[] })

function Step3({ user, onNext }) {
  const [fours, setFours] = useState([defaultFour()])
  const [saving, setSaving] = useState(false)

  const setF = (i, k, v) => setFours(f => f.map((x, idx) => idx === i ? { ...x, [k]: v } : x))
  const toggleJour = (i, j) => setFours(f => f.map((x, idx) => {
    if (idx !== i) return x
    const jours = x.jours.includes(j) ? x.jours.filter(d => d !== j) : [...x.jours, j]
    return { ...x, jours }
  }))

  async function handleNext() {
    setSaving(true)
    const filled = fours.filter(f => f.nom.trim())
    for (const f of filled) {
      try {
        await upsertFournisseur({ id: uid(), user_id: user.id, nom: f.nom, tel: f.tel, email: f.email, jours: f.jours, created_at: new Date().toISOString() })
      } catch {}
    }
    setSaving(false)
    onNext({ fournisseurs_count: filled.length })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {fours.map((f, i) => (
        <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#64748B' }}>Fournisseur {i + 1}</span>
            {fours.length > 1 && <button style={{ marginLeft:'auto', background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:16 }} onClick={() => setFours(f => f.filter((_, idx) => idx !== i))}>✕</button>}
          </div>
          <input style={inp} placeholder="Nom du fournisseur *" value={f.nom} onChange={e => setF(i, 'nom', e.target.value)} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <input style={inp} placeholder="Téléphone" value={f.tel} onChange={e => setF(i, 'tel', e.target.value)} />
            <input style={inp} placeholder="Email" value={f.email} onChange={e => setF(i, 'email', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:12, color:'#64748B', marginBottom:6 }}>Jours de livraison</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {JOURS.map(j => {
                const active = f.jours.includes(j)
                return (
                  <button key={j} onClick={() => toggleJour(i, j)}
                    style={{ padding:'5px 10px', borderRadius:8, border:`1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`, background: active ? '#EFF6FF' : '#fff', color: active ? '#2563EB' : '#475569', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:F }}>
                    {j}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ))}
      <button style={{ ...btnS, color:'#2563EB', fontWeight:600 }} onClick={() => setFours(f => [...f, defaultFour()])}>+ Ajouter un fournisseur</button>
      <div style={{ display:'flex', gap:12 }}>
        <button style={{ ...btnP, opacity: saving ? .6 : 1 }} onClick={handleNext} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
        <button style={btnS} onClick={() => onNext({ fournisseurs_count: 0 })}>⏭ Passer</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Stock initial
// ─────────────────────────────────────────────────────────────────────────────

const defaultProd = () => ({ nom:'', cat:'autre', q:'', u:'kg', dlc:'' })

function Step4({ user, onNext }) {
  const [mode, setMode]       = useState(null) // 'manuel' | 'scan' | null
  const [products, setProducts] = useState([defaultProd()])
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving]   = useState(false)
  const fileRef = useRef()

  const setP = (i, k, v) => setProducts(p => p.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  async function handleScan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const reader = new FileReader()
      reader.onload = async ev => {
        const base64 = ev.target.result.split(',')[1]
        try {
          const res  = await fetch('/api/analyze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image: base64, userId: user.id }) })
          const data = await res.json()
          if (data.produits?.length) {
            setProducts(data.produits.map(p => ({ nom: p.nom || '', cat: p.cat || 'autre', q: String(p.q || ''), u: p.u || 'kg', dlc: p.dlc || '' })))
          }
        } catch {}
        setScanning(false)
        setMode('manuel')
      }
      reader.readAsDataURL(file)
    } catch { setScanning(false) }
  }

  async function handleNext() {
    setSaving(true)
    const filled = products.filter(p => p.nom.trim())
    for (const p of filled) {
      try {
        await upsertStock([{ id: uid(), user_id: user.id, nom: p.nom, cat: p.cat, q: parseFloat(p.q) || 0, u: p.u, dlc: p.dlc, date_reception: fdate(), created_at: new Date().toISOString() }])
      } catch {}
    }
    setSaving(false)
    onNext({ stock_count: filled.length })
  }

  if (!mode) return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleScan} />
      <button style={{ ...btnP, background:'linear-gradient(135deg,#6366F1,#4F46E5)' }} onClick={() => fileRef.current?.click()}>
        {scanning ? '⏳ Analyse en cours…' : '📷 Scanner une facture / BL'}
      </button>
      <button style={{ ...btnP }} onClick={() => setMode('manuel')}>✏️ Saisir manuellement</button>
      <button style={btnS} onClick={() => onNext({ stock_count: 0 })}>⏭ Passer cette étape</button>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {products.map((p, i) => (
        <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input style={{ ...inp, flex:2 }} placeholder="Nom du produit *" value={p.nom} onChange={e => setP(i, 'nom', e.target.value)} />
            <input style={{ ...inp, flex:1 }} placeholder="Qté" type="number" value={p.q} onChange={e => setP(i, 'q', e.target.value)} />
            <select style={{ ...inp, flex:1 }} value={p.u} onChange={e => setP(i, 'u', e.target.value)}>
              {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <select style={inp} value={p.cat} onChange={e => setP(i, 'cat', e.target.value)}>
              {STOCK_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={inp} placeholder="DLC (JJ/MM/AAAA)" value={p.dlc} onChange={e => setP(i, 'dlc', e.target.value)} />
          </div>
          {products.length > 1 && <button style={{ ...btnS, color:'#EF4444', fontSize:12 }} onClick={() => setProducts(pr => pr.filter((_, idx) => idx !== i))}>✕ Supprimer</button>}
        </div>
      ))}
      <button style={{ ...btnS, color:'#2563EB', fontWeight:600 }} onClick={() => setProducts(p => [...p, defaultProd()])}>+ Ajouter un produit</button>
      <div style={{ display:'flex', gap:12 }}>
        <button style={{ ...btnP, opacity: saving ? .6 : 1 }} onClick={handleNext} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
        <button style={btnS} onClick={() => onNext({ stock_count: 0 })}>⏭ Passer</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — Recettes
// ─────────────────────────────────────────────────────────────────────────────

const defaultRecette = () => ({ nom:'', portions:'', cout:'' })

function Step5({ user, onNext }) {
  const [mode, setMode]     = useState(null)
  const [recettes, setRec]  = useState([defaultRecette()])
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  const setR = (i, k, v) => setRec(r => r.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  async function handleScan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    try {
      const reader = new FileReader()
      reader.onload = async ev => {
        const base64 = ev.target.result.split(',')[1]
        try {
          const res  = await fetch('/api/recette', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ image: base64, userId: user.id }) })
          const data = await res.json()
          if (data.nom) setRec([{ nom: data.nom || '', portions: String(data.portions || ''), cout: String(data.cout || '') }])
        } catch {}
        setScanning(false)
        setMode('manuel')
      }
      reader.readAsDataURL(file)
    } catch { setScanning(false) }
  }

  async function handleNext() {
    setSaving(true)
    const filled = recettes.filter(r => r.nom.trim())
    for (const r of filled) {
      try {
        await upsertRecette({ id: uid(), user_id: user.id, nom: r.nom, portions: Number(r.portions) || null, cout: parseFloat(r.cout) || null, created_at: new Date().toISOString() })
      } catch {}
    }
    setSaving(false)
    onNext({ recettes_count: filled.length })
  }

  if (!mode) return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleScan} />
      <button style={{ ...btnP, background:'linear-gradient(135deg,#6366F1,#4F46E5)' }} onClick={() => fileRef.current?.click()}>
        {scanning ? '⏳ Analyse en cours…' : '📷 Scanner une recette'}
      </button>
      <button style={{ ...btnP }} onClick={() => setMode('manuel')}>✏️ Saisir manuellement</button>
      <button style={btnS} onClick={() => onNext({ recettes_count: 0 })}>⏭ Passer cette étape</button>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {recettes.map((r, i) => (
        <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <input style={inp} placeholder="Nom de la recette *" value={r.nom} onChange={e => setR(i, 'nom', e.target.value)} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <input style={inp} placeholder="Portions" type="number" value={r.portions} onChange={e => setR(i, 'portions', e.target.value)} />
            <input style={inp} placeholder="Coût estimé (€)" type="number" step="0.01" value={r.cout} onChange={e => setR(i, 'cout', e.target.value)} />
          </div>
          {recettes.length > 1 && <button style={{ ...btnS, color:'#EF4444', fontSize:12 }} onClick={() => setRec(rc => rc.filter((_, idx) => idx !== i))}>✕ Supprimer</button>}
        </div>
      ))}
      <button style={{ ...btnS, color:'#2563EB', fontWeight:600 }} onClick={() => setRec(r => [...r, defaultRecette()])}>+ Ajouter une recette</button>
      <div style={{ display:'flex', gap:12 }}>
        <button style={{ ...btnP, opacity: saving ? .6 : 1 }} onClick={handleNext} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
        <button style={btnS} onClick={() => onNext({ recettes_count: 0 })}>⏭ Passer</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — Équipe
// ─────────────────────────────────────────────────────────────────────────────

const defaultMembre = () => ({ nom:'', role:'employe', pin: pinRand() })

function Step6({ user, onNext }) {
  const [membres, setMembres] = useState([defaultMembre()])
  const [saving, setSaving]   = useState(false)
  const [pinVisible, setPinVisible] = useState({})

  const setM = (i, k, v) => setMembres(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  async function handleNext() {
    setSaving(true)
    const filled = membres.filter(m => m.nom.trim())
    for (const m of filled) {
      try {
        await upsertEquipeMembre({ id: uid(), owner_id: user.id, name: m.nom, role: m.role, pin_code: m.pin, created_at: new Date().toISOString() })
      } catch {}
    }
    setSaving(false)
    onNext({ equipe_count: filled.length })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {membres.map((m, i) => (
        <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input style={{ ...inp, flex:1 }} placeholder="Prénom *" value={m.nom} onChange={e => setM(i, 'nom', e.target.value)} />
            <select style={{ ...inp, flex:1 }} value={m.role} onChange={e => setM(i, 'role', e.target.value)}>
              {EQ_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>PIN :</span>
            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:'#0F172A', letterSpacing:pinVisible[i] ? '.1em' : 0 }}>
              {pinVisible[i] ? m.pin : '••••'}
            </span>
            <button style={{ background:'none', border:'none', cursor:'pointer', fontSize:14 }} onClick={() => setPinVisible(v => ({ ...v, [i]: !v[i] }))}>
              {pinVisible[i] ? '🙈' : '👁️'}
            </button>
            <button style={{ ...btnS, color:'#2563EB', fontSize:12 }} onClick={() => setM(i, 'pin', pinRand())}>↺ Régénérer</button>
          </div>
          {membres.length > 1 && <button style={{ ...btnS, color:'#EF4444', fontSize:12 }} onClick={() => setMembres(ms => ms.filter((_, idx) => idx !== i))}>✕ Supprimer</button>}
        </div>
      ))}
      <button style={{ ...btnS, color:'#2563EB', fontWeight:600 }} onClick={() => setMembres(m => [...m, defaultMembre()])}>+ Ajouter un membre</button>
      <div style={{ display:'flex', gap:12 }}>
        <button style={{ ...btnP, opacity: saving ? .6 : 1 }} onClick={handleNext} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
        <button style={btnS} onClick={() => onNext({ equipe_count: 0 })}>⏭ Passer</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — Business
// ─────────────────────────────────────────────────────────────────────────────

function Step7({ user, onNext }) {
  const [form, setForm] = useState({ ticket_moyen:'', objectif_marge:'70', devise:'€' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [saving, setSaving] = useState(false)

  async function handleNext() {
    setSaving(true)
    try {
      await updateUserMetadata({ business_settings: form })
      await upsertEtablissement({ owner_id: user.id, settings: form }).catch(() => {})
    } catch {}
    setSaving(false)
    onNext({ ticket_moyen: form.ticket_moyen, objectif_marge: form.objectif_marge })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <Field label="Ticket moyen par couvert (€)">
        <input style={inp} type="number" step="0.5" placeholder="Ex : 28.50" value={form.ticket_moyen} onChange={e => set('ticket_moyen', e.target.value)} />
      </Field>
      <Field label="Objectif marge brute (%)">
        <input style={inp} type="number" min="0" max="100" placeholder="Ex : 70" value={form.objectif_marge} onChange={e => set('objectif_marge', e.target.value)} />
      </Field>
      <Field label="Devise">
        <ChoiceGrid items={['€','$','CHF','£']} value={form.devise} onChange={v => set('devise', v)} />
      </Field>
      <div style={{ display:'flex', gap:12 }}>
        <button style={{ ...btnP, opacity: saving ? .6 : 1 }} onClick={handleNext} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Continuer →'}
        </button>
        <button style={btnS} onClick={() => onNext({})}>⏭ Passer</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FINAL — Récapitulatif
// ─────────────────────────────────────────────────────────────────────────────

function StepFinal({ summary, onDone, saving }) {
  const rows = [
    { label:'Établissement',  value: summary.etab || '—',                    icon:'🏢' },
    { label:'Zones HACCP',    value: `${summary.zones_count || 0} zone(s)`,  icon:'🌡️' },
    { label:'Fournisseurs',   value: `${summary.fournisseurs_count || 0}`,   icon:'🚚' },
    { label:'Produits stock', value: `${summary.stock_count || 0}`,          icon:'📦' },
    { label:'Recettes',       value: `${summary.recettes_count || 0}`,       icon:'🍽️' },
    { label:'Équipe',         value: `${summary.equipe_count || 0} membre(s)`,icon:'👥' },
    { label:'Marge cible',    value: summary.objectif_marge ? `${summary.objectif_marge}%` : '—', icon:'📊' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <AriaBubble text={`Votre espace est prêt, ${summary.nom || 'Chef'} ! 🎉\n\nVoici un récapitulatif de votre configuration. Vous pouvez tout modifier à tout moment dans les paramètres.\n\nJe suis là si vous avez besoin de quoi que ce soit !`} />
      <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:16, overflow:'hidden' }}>
        {rows.map((r, i) => (
          <div key={r.label} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < rows.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <span style={{ fontSize:20, width:28, textAlign:'center' }}>{r.icon}</span>
            <span style={{ flex:1, fontSize:14, color:'#475569', fontWeight:500 }}>{r.label}</span>
            <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{r.value}</span>
            <span style={{ color:'#10B981', fontWeight:700 }}>✓</span>
          </div>
        ))}
      </div>
      <button style={{ ...btnP, fontSize:16, padding:'16px 32px', opacity: saving ? .7 : 1 }}
        onClick={onDone} disabled={saving}>
        {saving ? 'Finalisation…' : '🚀 Accéder à mon tableau de bord'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ARIA MESSAGES PER STEP
// ─────────────────────────────────────────────────────────────────────────────

const ARIA_MSGS = [
  "Bonjour ! Je suis Aria, votre assistante IA. Je vais configurer votre espace en quelques minutes.\n\nCommençons ! Comment vous appelez-vous, et quel est votre établissement ?",
  "Parfait ! Quel est votre rôle dans l'établissement ?",
  "Configurons vos zones de stockage HACCP.\n\nAjoutez vos zones (chambre froide, réserve sèche, etc.) avec leurs températures cibles.",
  "Ajoutons vos fournisseurs. Vous pourrez en ajouter d'autres depuis la section Commandes.",
  "Voulez-vous importer votre stock initial ? Je peux analyser une facture automatiquement.",
  "Voulez-vous ajouter vos recettes de base ?",
  "Ajoutons les membres de votre équipe. Chaque membre recevra un PIN pour se connecter.",
  "Quelques paramètres de gestion pour finaliser votre configuration.",
]

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Onboarding({ user, onComplete }) {
  const [step, setStep]       = useState(0)
  const [saving, setSaving]   = useState(false)
  const [summary, setSummary] = useState({ nom:'', etab:'', type:'', role:'', zones_count:0, fournisseurs_count:0, stock_count:0, recettes_count:0, equipe_count:0, objectif_marge:'70' })

  function advance(updates = {}) {
    setSummary(s => ({ ...s, ...updates }))
    setStep(s => s + 1)
  }

  async function handleComplete() {
    setSaving(true)
    try { await updateUserMetadata({ onboarding_completed: true }) } catch {}
    setSaving(false)
    onComplete()
  }

  const STEPS = [
    <Step0 key={0} user={user} onNext={updates => advance({ nom: updates.nom, etab: updates.etab, type: updates.type })} />,
    <Step1 key={1} onNext={updates => advance({ role: updates.role })} />,
    <Step2 key={2} user={user} onNext={updates => advance({ zones_count: updates.zones_count })} />,
    <Step3 key={3} user={user} onNext={updates => advance({ fournisseurs_count: updates.fournisseurs_count })} />,
    <Step4 key={4} user={user} onNext={updates => advance({ stock_count: updates.stock_count })} />,
    <Step5 key={5} user={user} onNext={updates => advance({ recettes_count: updates.recettes_count })} />,
    <Step6 key={6} user={user} onNext={updates => advance({ equipe_count: updates.equipe_count })} />,
    <Step7 key={7} user={user} onNext={updates => advance(updates)} />,
  ]

  const isFinal = step >= TOTAL

  return (
    <div style={S.page}>
      {/* Progress */}
      {!isFinal && (
        <div style={S.topBar}>
          <div style={S.progressWrap}>
            <div style={{ ...S.progressFill, width: `${((step + 1) / TOTAL) * 100}%` }} />
          </div>
          <div style={S.stepLabel}>Étape {step + 1} / {TOTAL}</div>
        </div>
      )}

      <div style={S.container}>
        <div style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>
          {isFinal
            ? <StepFinal summary={summary} onDone={handleComplete} saving={saving} />
            : (
              <>
                <AriaBubble text={ARIA_MSGS[step]} />
                <div style={S.formBox}>
                  {STEPS[step]}
                </div>
              </>
            )
          }
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const S = {
  page:      { minHeight:'100vh', background:'linear-gradient(160deg,#EFF6FF 0%,#F8FAFF 60%,#fff 100%)', fontFamily:F, display:'flex', flexDirection:'column' },
  topBar:    { padding:'16px 20px 8px', display:'flex', flexDirection:'column', gap:8, background:'rgba(255,255,255,.8)', backdropFilter:'blur(8px)', borderBottom:'1px solid #E2E8F0' },
  progressWrap: { height:6, background:'#E2E8F0', borderRadius:99, overflow:'hidden' },
  progressFill: { height:'100%', background:'linear-gradient(90deg,#2563EB,#6366F1)', borderRadius:99, transition:'width .4s ease' },
  stepLabel: { fontSize:12, fontWeight:600, color:'#94A3B8', textAlign:'right' },
  container: { flex:1, padding:'28px 20px 40px', overflowY:'auto' },
  formBox:   { background:'rgba(255,255,255,.85)', border:'1px solid #E2E8F0', borderRadius:18, padding:'24px', backdropFilter:'blur(4px)', boxShadow:'0 4px 24px rgba(15,23,42,.07)' },
}
