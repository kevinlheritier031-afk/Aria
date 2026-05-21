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
  identity:    '🏠 Établissement',
  role:        '👤 Votre rôle',
  haccp:       '🌡️ Zones HACCP',
  fournisseurs:'🚚 Fournisseurs',
  stock:       '📦 Stock initial',
  recettes:    '📋 Recettes',
  equipe:      '👥 Équipe',
  business:    '📊 Business',
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
  const lines = text.split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('{') && t.includes('"action"')) {
      try {
        const obj = JSON.parse(t)
        if (obj.action) actions.push(obj)
      } catch {}
    }
  }
  const cbRegex = /```(?:json)?\s*\n?(\{[\s\S]*?"action"[\s\S]*?\})\s*\n?```/g
  let m
  while ((m = cbRegex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1].trim())
      if (obj.action && !actions.find(a => a.action === obj.action && a.step === obj.step)) {
        actions.push(obj)
      }
    } catch {}
  }
  return actions
}

function cleanText(text) {
  let t = text.replace(/```(?:json)?\s*\n?\{[\s\S]*?"action"[\s\S]*?\}\s*\n?```/g, '')
  t = t.split('\n').filter(l => !l.trim().startsWith('{"action"')).join('\n')
  return t.trim()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Bubble({ isAria, children }) {
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
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [step, setStep]         = useState(0)
  const [choices, setChoices]   = useState([])
  const apiHistory  = useRef([])
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function executeSave(stepName, data) {
    const uid = user.id
    try {
      if (stepName === 'identity') {
        await upsertEtablissement({ owner_id: uid, nom: data.nom, type: data.type })
      }
      if (stepName === 'role' && data.role) {
        const roleKey = ROLE_MAP[data.role] || data.role.toLowerCase()
        await supabase.from('profiles').update({ role: roleKey }).eq('id', uid)
      }
      if (stepName === 'haccp' && data.zones?.length) {
        for (const z of data.zones) {
          await insertHaccpZone({ nom: z.nom, temp_min: z.temp_min, temp_max: z.temp_max, etablissement_id: uid })
        }
      }
      if (stepName === 'fournisseurs' && data.fournisseurs?.length) {
        for (const f of data.fournisseurs) {
          await upsertFournisseur({ nom: f.nom, mode: f.mode || 'tel', tel: f.tel || null, email: f.email || null, jours: f.jours || [], user_id: uid, etablissement_id: uid })
        }
      }
      if (stepName === 'stock' && !data.skipped && data.produits?.length) {
        await upsertStock(data.produits.map(p => ({ nom: p.nom, q: Number(p.q) || 0, u: p.u || 'unité', cat: p.cat || 'autre', user_id: uid, etablissement_id: uid })))
      }
      if (stepName === 'recettes' && !data.skipped && data.recettes?.length) {
        for (const r of data.recettes) {
          await upsertRecette({ nom: r.nom, portions: r.portions || 1, ingredients: r.ingredients || [], user_id: uid, etablissement_id: uid })
        }
      }
      if (stepName === 'equipe' && !data.skipped && data.membres?.length) {
        for (const m of data.membres) {
          await upsertEquipeMembre({ name: m.name, role: m.role || 'employe', pin_code: m.pin_code || '', owner_id: uid })
        }
      }
      if (stepName === 'business') {
        await supabase.from('etablissements').update({
          settings: { couverts_semaine: data.couverts_semaine, type_cuisine: data.type_cuisine },
        }).eq('owner_id', uid)
      }
    } catch (err) {
      console.error('[Onboarding] save error:', stepName, err)
    }
    const idx = STEPS.indexOf(stepName)
    const nextIdx = idx + 1
    setStep(nextIdx)
    setChoices(STEP_CHOICES[STEPS[nextIdx]] || [])
  }

  async function executeComplete() {
    try {
      await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id)
    } catch (err) {
      console.error('[Onboarding] complete error:', err)
    }
    setTimeout(() => onComplete(), 800)
  }

  async function send(text) {
    if (!text.trim() || loading) return
    const trimmed = text.trim()
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)
    setChoices([])

    const history = [...apiHistory.current]
    try {
      const res = await fetch('/api/aria-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })
      const data  = await res.json()
      const reply = data.reply || ''

      apiHistory.current = [...history, { role: 'user', content: trimmed }, { role: 'assistant', content: reply }]

      const actions = parseActions(reply)
      for (const action of actions) {
        if (action.action === 'save')          await executeSave(action.step, action.data || {})
        else if (action.action === 'complete') await executeComplete()
      }

      const display = cleanText(reply)
      if (display) setMessages(prev => [...prev, { role: 'assistant', content: display }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Désolée, une erreur est survenue. Réessaye !" }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const init = async () => {
      setLoading(true)
      const trigger = "Bonjour ! Je viens de créer mon compte Aria. Je suis prêt à configurer mon établissement."
      try {
        const res = await fetch('/api/aria-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trigger, history: [] }),
        })
        const data  = await res.json()
        const reply = data.reply || ''
        apiHistory.current = [{ role: 'user', content: trigger }, { role: 'assistant', content: reply }]
        const display = cleanText(reply)
        if (display) setMessages([{ role: 'assistant', content: display }])
      } catch {
        const fallback = "Bonjour ! Je suis Aria, votre assistante cuisine.\n\nBienvenue dans la configuration de votre établissement — ça ne prend que quelques minutes.\n\nCommençons par le commencement : quel est le nom de votre restaurant ?"
        apiHistory.current = [{ role: 'user', content: trigger }, { role: 'assistant', content: fallback }]
        setMessages([{ role: 'assistant', content: fallback }])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

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
          <Bubble key={i} isAria={m.role === 'assistant'}>{m.content}</Bubble>
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
          40% { transform: translateY(-5px) }
        }
      `}</style>
    </div>
  )
}
