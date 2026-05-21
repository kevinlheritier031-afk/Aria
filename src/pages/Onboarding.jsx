import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  upsertEtablissement,
  insertHaccpZone,
  upsertFournisseur,
  upsertStock,
  upsertRecette,
  upsertEquipeMembre,
} from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ['identity','role','haccp','fournisseurs','stock','recettes','equipe','business']

const STEP_LABELS = {
  identity:     '🏠 Établissement',
  role:         '👤 Votre rôle',
  haccp:        '🌡️ Zones HACCP',
  fournisseurs: '🚚 Fournisseurs',
  stock:        '📦 Stock initial',
  recettes:     '📋 Recettes',
  equipe:       '👥 Équipe',
  business:     '📊 Business',
}

const STEP_CHOICES = {
  role:     ['Propriétaire', 'Chef de cuisine', 'Second de cuisine', 'Cuisinier', 'Pâtissier'],
  haccp:    ['Frigo + Congélateur (standard)', 'Ajouter une chambre froide', 'Passer cette étape'],
  stock:    ["Dicter mes produits maintenant", "Passer pour l'instant"],
  recettes: ["Décrire mes recettes phares", "Passer pour l'instant"],
  equipe:   ["Ajouter des membres", "Passer pour l'instant"],
}

const ROLE_MAP = {
  'Propriétaire':     'proprietaire',
  'Chef de cuisine':  'chef',
  'Second de cuisine':'second',
  'Cuisinier':        'cuisinier',
  'Pâtissier':        'patissier',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseActions(text) {
  const actions = []
  const seen    = new Set()

  function tryAdd(raw) {
    try {
      const obj = JSON.parse(raw.trim())
      if (!obj.action) return
      const key = JSON.stringify({ action: obj.action, step: obj.step })
      if (!seen.has(key)) { seen.add(key); actions.push(obj) }
    } catch {}
  }

  // Method 1 — JSON in code blocks ```json ... ```
  const cbRegex = /```(?:json)?\s*\n?(\{[\s\S]*?"action"[\s\S]*?\})\s*\n?```/g
  let m
  while ((m = cbRegex.exec(text)) !== null) tryAdd(m[1])

  // Method 2 — Lines starting with {
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (t.startsWith('{') && t.includes('"action"')) tryAdd(t)
  }

  // Method 3 — Find action JSON anywhere (brace-matching)
  const anyRe = /\{"action"\s*:/g
  let am
  while ((am = anyRe.exec(text)) !== null) {
    let depth = 0, i = am.index
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') { depth--; if (depth === 0) break }
    }
    tryAdd(text.slice(am.index, i + 1))
  }

  return actions
}

function cleanText(text) {
  let t = text.replace(/```(?:json)?\s*\n?\{[\s\S]*?"action"[\s\S]*?\}\s*\n?```/g, '')
  t = t.split('\n').filter(l => {
    const tr = l.trim()
    return !(tr.startsWith('{"action"') || tr.startsWith('{ "action"'))
  }).join('\n')
  return t.trim()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Bubble({ isAria, isStatus, isError, children }) {
  if (isStatus) {
    return (
      <div style={{ display:'flex', justifyContent:'center', marginBottom:8 }}>
        <div style={{
          padding:'5px 14px', borderRadius:20, fontSize:12.5, fontWeight:600,
          background: isError ? '#FEF2F2' : '#ECFDF5',
          color:      isError ? '#DC2626'  : '#059669',
          border:     `1px solid ${isError ? '#FECACA' : '#A7F3D0'}`,
        }}>
          {children}
        </div>
      </div>
    )
  }
  return (
    <div style={{ display:'flex', justifyContent: isAria ? 'flex-start' : 'flex-end', marginBottom:10, padding:'0 4px' }}>
      {isAria && (
        <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, flexShrink:0, marginRight:8, alignSelf:'flex-end', marginBottom:2 }}>✦</div>
      )}
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: isAria ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isAria ? '#F1F5F9' : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
        color: isAria ? '#1E293B' : '#fff',
        fontSize: 14,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {children}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:10, padding:'0 4px' }}>
      <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, flexShrink:0, marginRight:8, alignSelf:'flex-end', marginBottom:2 }}>✦</div>
      <div style={{ padding:'10px 14px', borderRadius:'4px 16px 16px 16px', background:'#F1F5F9', display:'flex', gap:4, alignItems:'center' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#94A3B8', animation:`onb-bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Onboarding({ user, onComplete }) {
  const [messages,  setMessages]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [step,      setStep]      = useState(0)
  const [choices,   setChoices]   = useState([])

  const apiHistory       = useRef([])
  const bottomRef        = useRef(null)
  const inputRef         = useRef(null)
  const initialized      = useRef(false)
  // Stores the real UUID from etablissements.id (NOT user.id)
  const etablissementIdRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function addStatus(msg, isError = false) {
    setMessages(prev => [...prev, { role: 'status', content: msg, isError }])
  }

  // Fetch (or create) the etablissement and return its real UUID
  async function getEtabId() {
    if (etablissementIdRef.current) return etablissementIdRef.current
    const { data } = await supabase
      .from('etablissements')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    if (data?.id) {
      etablissementIdRef.current = data.id
      console.log('[Onboarding] 📌 etablissement_id récupéré:', data.id)
    }
    return etablissementIdRef.current
  }

  // ── Save handler ──────────────────────────────────────────────────────────────

  async function executeSave(stepName, data) {
    const uid = user.id
    console.log(`[Onboarding] 💾 executeSave — step=${stepName}`, data)

    try {

      // ── IDENTITY ──────────────────────────────────────────────────────────
      if (stepName === 'identity') {
        console.log('[Onboarding] → UPSERT etablissements', { owner_id: uid, nom: data.nom, type: data.type })
        const { data: etabData, error: etabErr } = await upsertEtablissement({ owner_id: uid, nom: data.nom, type: data.type || 'restaurant' })
        if (etabErr) throw new Error(`etablissements: ${etabErr.message}`)

        const etabId = etabData?.[0]?.id
        if (!etabId) throw new Error('etablissement ID introuvable après upsert')
        etablissementIdRef.current = etabId
        console.log('[Onboarding] ✅ Etablissement upsert — id:', etabId)

        // Persist etablissement_id on the profile
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ etablissement_id: etabId })
          .eq('id', uid)
        if (profileErr) console.warn('[Onboarding] ⚠️ profile.etablissement_id update:', profileErr.message)
        else console.log('[Onboarding] ✅ profiles.etablissement_id =', etabId)

        addStatus('✓ Établissement enregistré')
      }

      // ── ROLE ──────────────────────────────────────────────────────────────
      if (stepName === 'role' && data.role) {
        const roleKey = ROLE_MAP[data.role] || data.role.toLowerCase().replace(/\s+/g, '_')
        console.log('[Onboarding] → UPDATE profiles.role =', roleKey)
        const { error } = await supabase.from('profiles').update({ role: roleKey }).eq('id', uid)
        if (error) throw new Error(`profiles.role: ${error.message}`)
        console.log('[Onboarding] ✅ Rôle:', roleKey)
        addStatus('✓ Rôle enregistré')
      }

      // ── HACCP ─────────────────────────────────────────────────────────────
      if (stepName === 'haccp' && data.zones?.length) {
        for (const z of data.zones) {
          console.log('[Onboarding] → INSERT haccp_zones', z)
          // RLS: auth.uid() = etablissement_id → must use uid here
          const { error } = await insertHaccpZone({ nom: z.nom, temp_min: z.temp_min, temp_max: z.temp_max, etablissement_id: uid })
          if (error) throw new Error(`haccp_zones: ${error.message}`)
        }
        console.log('[Onboarding] ✅', data.zones.length, 'zone(s) HACCP')
        addStatus(`✓ ${data.zones.length} zone(s) HACCP enregistrée(s)`)
      }

      // ── FOURNISSEURS ──────────────────────────────────────────────────────
      if (stepName === 'fournisseurs' && data.fournisseurs?.length) {
        const etabId = await getEtabId()
        for (const f of data.fournisseurs) {
          console.log('[Onboarding] → INSERT fournisseurs', f, '— etabId:', etabId)
          const { error } = await upsertFournisseur({
            nom:   f.nom,
            mode:  f.mode  || 'tel',
            tel:   f.tel   || null,
            email: f.email || null,
            jours: f.jours || [],
            user_id:         uid,
            etablissement_id: etabId,
          })
          if (error) throw new Error(`fournisseurs (${f.nom}): ${error.message}`)
        }
        console.log('[Onboarding] ✅', data.fournisseurs.length, 'fournisseur(s)')
        addStatus(`✓ ${data.fournisseurs.length} fournisseur(s) enregistré(s)`)
      }

      // ── STOCK ─────────────────────────────────────────────────────────────
      if (stepName === 'stock' && !data.skipped && data.produits?.length) {
        const etabId = await getEtabId()
        const items  = data.produits.map(p => ({
          nom: p.nom, q: Number(p.q) || 0, u: p.u || 'unité', cat: p.cat || 'autre',
          user_id: uid, etablissement_id: etabId,
        }))
        console.log('[Onboarding] → INSERT stock', items, '— etabId:', etabId)
        const { error } = await upsertStock(items)
        if (error) throw new Error(`stock: ${error.message}`)
        console.log('[Onboarding] ✅', items.length, 'produit(s)')
        addStatus(`✓ ${items.length} produit(s) ajouté(s) au stock`)
      }

      // ── RECETTES ──────────────────────────────────────────────────────────
      if (stepName === 'recettes' && !data.skipped && data.recettes?.length) {
        const etabId = await getEtabId()
        for (const r of data.recettes) {
          console.log('[Onboarding] → INSERT recettes', r, '— etabId:', etabId)
          const { error } = await upsertRecette({
            nom:         r.nom,
            portions:    r.portions    || 1,
            ingredients: r.ingredients || [],
            user_id:         uid,
            etablissement_id: etabId,
          })
          if (error) throw new Error(`recettes (${r.nom}): ${error.message}`)
        }
        console.log('[Onboarding] ✅', data.recettes.length, 'recette(s)')
        addStatus(`✓ ${data.recettes.length} recette(s) enregistrée(s)`)
      }

      // ── EQUIPE ────────────────────────────────────────────────────────────
      if (stepName === 'equipe' && !data.skipped && data.membres?.length) {
        for (const mem of data.membres) {
          console.log('[Onboarding] → INSERT equipe_membres', mem)
          const { error } = await upsertEquipeMembre({
            name:     mem.name,
            role:     mem.role     || 'employe',
            pin_code: mem.pin_code || '',
            owner_id: uid,
          })
          if (error) throw new Error(`equipe_membres (${mem.name}): ${error.message}`)
        }
        console.log('[Onboarding] ✅', data.membres.length, 'membre(s)')
        addStatus(`✓ ${data.membres.length} membre(s) d'équipe enregistré(s)`)
      }

      // ── BUSINESS ─────────────────────────────────────────────────────────
      if (stepName === 'business') {
        console.log('[Onboarding] → UPDATE etablissements.settings', data)
        const { error } = await supabase
          .from('etablissements')
          .update({ settings: { couverts_semaine: data.couverts_semaine, type_cuisine: data.type_cuisine } })
          .eq('owner_id', uid)
        if (error) throw new Error(`etablissements.settings: ${error.message}`)
        console.log('[Onboarding] ✅ Business')
        addStatus('✓ Informations business enregistrées')
      }

    } catch (err) {
      console.error(`[Onboarding] ❌ save error (step=${stepName}):`, err.message, err)
      addStatus(`✗ Erreur (${stepName}) : ${err.message}`, true)
    }

    const idx     = STEPS.indexOf(stepName)
    const nextIdx = idx + 1
    setStep(nextIdx)
    setChoices(STEP_CHOICES[STEPS[nextIdx]] || [])
  }

  // ── Complete ──────────────────────────────────────────────────────────────────

  async function executeComplete() {
    console.log('[Onboarding] 🎉 executeComplete')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
      if (error) throw error
      console.log('[Onboarding] ✅ onboarding_completed = true')
    } catch (err) {
      console.error('[Onboarding] ❌ complete error:', err)
    }
    setTimeout(() => onComplete(), 800)
  }

  // ── Send message ──────────────────────────────────────────────────────────────

  async function send(text) {
    if (!text.trim() || loading) return
    const trimmed = text.trim()
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)
    setChoices([])

    const history = [...apiHistory.current]
    try {
      console.log('[Onboarding] 📤 Envoi message:', trimmed)
      const res = await fetch('/api/aria-onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, history }),
      })
      const data  = await res.json()
      const reply = data.reply || ''

      console.log('[Onboarding] 📥 Réponse API:', reply.slice(0, 200), reply.length > 200 ? '…' : '')

      apiHistory.current = [...history, { role: 'user', content: trimmed }, { role: 'assistant', content: reply }]

      const actions = parseActions(reply)
      console.log('[Onboarding] 🔍 Actions détectées:', actions)

      for (const action of actions) {
        if (action.action === 'save')          await executeSave(action.step, action.data || {})
        else if (action.action === 'complete') await executeComplete()
      }

      const display = cleanText(reply)
      if (display) setMessages(prev => [...prev, { role: 'assistant', content: display }])
    } catch (err) {
      console.error('[Onboarding] ❌ send error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolée, une erreur est survenue. Réessaye !" }])
    } finally {
      setLoading(false)
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const init = async () => {
      setLoading(true)
      const trigger = "Bonjour ! Je viens de créer mon compte Aria. Je suis prêt à configurer mon établissement."
      try {
        const res = await fetch('/api/aria-onboarding', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ message: trigger, history: [] }),
        })
        const data  = await res.json()
        const reply = data.reply || ''
        apiHistory.current = [{ role: 'user', content: trigger }, { role: 'assistant', content: reply }]
        const display = cleanText(reply)
        if (display) setMessages([{ role: 'assistant', content: display }])
      } catch {
        const fallback = "Bonjour ! Je suis Aria, votre assistante cuisine.\n\nBienvenue dans la configuration de votre établissement — ça ne prend que quelques minutes.\n\nCommençons : quel est le nom de votre restaurant ?"
        apiHistory.current = [{ role: 'user', content: trigger }, { role: 'assistant', content: fallback }]
        setMessages([{ role: 'assistant', content: fallback }])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────────

  const progress  = Math.round((step / 8) * 100)
  const stepLabel = step < 8
    ? `Étape ${step + 1}/8 — ${STEP_LABELS[STEPS[step]] || ''}`
    : '✓ Configuration terminée !'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#F8FAFC', fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif", overflow:'hidden' }}>

      {/* Header + progress */}
      <div style={{ padding:'16px 20px 12px', background:'#fff', borderBottom:'1px solid #E2E8F0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, flexShrink:0 }}>✦</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#0F172A', lineHeight:1.2 }}>Aria — Configuration</div>
            <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:1 }}>{stepLabel}</div>
          </div>
        </div>
        <div style={{ height:5, background:'#E2E8F0', borderRadius:5, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#2563EB,#7C3AED)', borderRadius:5, transition:'width .5s cubic-bezier(.4,0,.2,1)' }} />
        </div>
      </div>

      {/* Chat */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 12px 6px' }}>
        {messages.map((m, i) => (
          m.role === 'status'
            ? <Bubble key={i} isStatus isError={m.isError}>{m.content}</Bubble>
            : <Bubble key={i} isAria={m.role === 'assistant'}>{m.content}</Bubble>
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} style={{ height:4 }} />
      </div>

      {/* Quick choices */}
      {choices.length > 0 && !loading && (
        <div style={{ padding:'6px 14px 4px', display:'flex', flexWrap:'wrap', gap:7, background:'#F8FAFC', flexShrink:0 }}>
          {choices.map((c, i) => (
            <button
              key={i}
              onClick={() => send(c)}
              style={{ padding:'7px 14px', borderRadius:20, border:'1.5px solid #DBEAFE', background:'#EFF6FF', color:'#2563EB', fontSize:12.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:'10px 14px 20px', background:'#fff', borderTop:'1px solid #E2E8F0', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Répondez à Aria…"
            rows={1}
            style={{ flex:1, padding:'10px 14px', borderRadius:12, border:'1.5px solid #E2E8F0', fontSize:13.5, fontFamily:'inherit', resize:'none', outline:'none', background:'#F8FAFC', color:'#1E293B', lineHeight:1.5, maxHeight:100, overflowY:'auto' }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            style={{ width:42, height:42, borderRadius:12, border:'none', background: input.trim() && !loading ? 'linear-gradient(135deg,#2563EB,#7C3AED)' : '#E2E8F0', color: input.trim() && !loading ? '#fff' : '#94A3B8', fontSize:18, cursor: input.trim() && !loading ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
          >
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes onb-bounce {
          0%,80%,100% { transform: translateY(0) }
          40%          { transform: translateY(-5px) }
        }
      `}</style>
    </div>
  )
}
