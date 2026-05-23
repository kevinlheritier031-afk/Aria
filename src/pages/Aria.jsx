import { useState, useRef, useEffect } from 'react'
import { ROLES, fdate, ftime, uid, dlcStatus } from '../constants'
import { supabase, fetchAriaConversation, upsertAriaConversation, fetchTemperatures, fetchRecettes, fetchCouverts, insertAriaAnalytic } from '../lib/supabase'

const STYLE_ID = 'aria-chat-kf'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes aria-dot { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
    @keyframes aria-msg { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  `
  document.head.appendChild(s)
}

const F = "'Plus Jakarta Sans','Inter',sans-serif"

function getTimeSuggestions() {
  const h = new Date().getHours()
  if (h < 11) return [
    { text:'Produits à commander',   icon:'🛒', color:'#2563EB', bg:'#EFF6FF' },
    { text:'Températures nuit',      icon:'🌡️', color:'#6366F1', bg:'#EEF2FF' },
    { text:'Mise en place',          icon:'📋', color:'#10B981', bg:'#ECFDF5' },
  ]
  if (h < 15) return [
    { text:'Marges du service',      icon:'📊', color:'#D97706', bg:'#FFFBEB' },
    { text:'DLC urgentes',           icon:'⚠️', color:'#EF4444', bg:'#FEF2F2' },
    { text:'Recettes du soir',       icon:'🍽️', color:'#10B981', bg:'#ECFDF5' },
  ]
  return [
    { text:'Bilan HACCP',            icon:'✅', color:'#10B981', bg:'#ECFDF5' },
    { text:'Optimise mes marges',    icon:'💡', color:'#2563EB', bg:'#EFF6FF' },
    { text:'Rapport de clôture',     icon:'📄', color:'#6366F1', bg:'#EEF2FF' },
  ]
}

const WELCOME = (name) => ({
  id:   'welcome',
  role: 'assistant',
  content: `Bonjour${name ? ` ${name}` : ''} ! Je suis Aria, votre assistante IA cuisine. ✦\n\nJe connais votre stock, vos fournisseurs et votre historique en temps réel. Que puis-je faire pour vous ?`,
  time: ftime(),
})

// ── Typing indicator ──────────────────────────────────────────────────────────

function Typing() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, animation:'aria-msg .2s ease' }}>
      <span style={{ fontSize:11, fontWeight:700, color:'#6366F1', letterSpacing:'.3px' }}>✦ Aria réfléchit…</span>
      <div style={{ background:'#fff', padding:'12px 16px', borderRadius:'4px 16px 16px 16px', border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,.06)', display:'flex', gap:5, alignItems:'center' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#94A3B8', animation:`aria-dot 1.2s ease-in-out ${i * .18}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap:4, animation:'aria-msg .22s ease' }}>
      {!isUser && (
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:20, height:20, borderRadius:'50%', background:'linear-gradient(135deg,#4F46E5,#2563EB)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>✦</div>
          <span style={{ fontSize:11, fontWeight:700, color:'#6366F1', letterSpacing:'.3px' }}>Aria</span>
        </div>
      )}
      <div style={isUser ? {
        maxWidth:'78%', background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'#fff',
        padding:'12px 16px', borderRadius:'20px 6px 20px 20px',
        fontSize:14, lineHeight:1.65, wordBreak:'break-word',
        boxShadow:'0 4px 16px rgba(37,99,235,.28), 0 1px 4px rgba(37,99,235,.18)',
        fontFamily:F,
      } : {
        maxWidth:'84%', background:'#fff', color:'#0F172A',
        padding:'13px 17px', borderRadius:'6px 20px 20px 20px',
        fontSize:14, lineHeight:1.75, wordBreak:'break-word',
        border:'1px solid #E8EDF4',
        boxShadow:'0 2px 12px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)',
        fontFamily:F,
      }}>
        {msg.content.split('\n').map((line, i, arr) => (
          <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
        ))}
      </div>
      {msg.time && (
        <span style={{ fontSize:10, color:'#CBD5E1', fontFamily:F, marginTop:1 }}>{msg.time}</span>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Aria({ stock = [], fournisseurs = [], scanLog = [], user, profile, fromDashboard = false, onBack }) {
  const name     = profile?.name?.split(' ')[0] || null
  const role     = profile?.role || 'employe'

  const [messages,  setMessages]  = useState([WELCOME(name)])
  const [input,     setInput]     = useState('')
  const [typing,    setTyping]    = useState(false)
  const [error,     setError]     = useState('')
  const [convId,     setConvId]     = useState(null)
  const [temps,      setTemps]      = useState([])
  const [recettes,   setRecettes]   = useState([])
  const [couverts,   setCouverts]   = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  const bottomRef    = useRef()
  const inputRef     = useRef()
  const alertFiredRef = useRef(false)

  // Load conversation history + full context
  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      fetchAriaConversation(user.id),
      fetchTemperatures(user.id),
      fetchRecettes(user.id),
      fetchCouverts(user.id),
    ]).then(([{ data: conv }, { data: t }, { data: r }, { data: c }]) => {
      if (conv?.messages?.length) {
        setMessages(conv.messages)
        setConvId(conv.id)
      }
      if (t?.length) setTemps(t.slice(0, 20))
      if (r?.length) setRecettes(r)
      if (c?.length) setCouverts(c)
      setDataLoaded(true)
    }).catch(() => setDataLoaded(true))
  }, [user])

  // Auto-scroll sur nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Alertes proactives au chargement
  useEffect(() => {
    if (!dataLoaded || alertFiredRef.current) return
    if (messages.length !== 1) return

    const expired  = stock.filter(i => dlcStatus(i.dlc) === 'expired')
    const critical = stock.filter(i => dlcStatus(i.dlc) === 'critical')
    const ncTemps  = temps.filter(t => t.conforme === false)

    const alerts = []
    if (expired.length  > 0) alerts.push(`🗑️ ${expired.length} produit(s) expiré(s) à retirer du stock`)
    if (critical.length > 0) alerts.push(`⚠️ ${critical.length} produit(s) en DLC J-3 ou moins`)
    if (ncTemps.length  > 0) alerts.push(`🌡️ ${ncTemps.length} température(s) non conforme(s)`)

    if (alerts.length > 0) {
      alertFiredRef.current = true
      setMessages(prev => [...prev, {
        id:      uid(),
        role:    'assistant',
        content: `⚠️ Bonjour${name ? ` ${name}` : ''} ! J'ai détecté ${alerts.length} alerte${alerts.length > 1 ? 's' : ''} :\n\n${alerts.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nVoulez-vous que je vous aide à les traiter en priorité ?`,
        time:    ftime(),
      }])
    }
  }, [dataLoaded, messages.length, stock, temps, name])

  function buildContext() {
    const critDlcCount = stock.filter(i => {
      if (!i.dlc) return false
      const [d, m, y] = i.dlc.split('/')
      return Math.ceil((new Date(`${y}-${m}-${d}`) - new Date()) / 86400000) <= 7
    }).length
    const sousSeuil = stock.filter(i => {
      const s = parseFloat(i.seuil_min)
      return isNaN(s) ? parseFloat(i.q) <= 2 : parseFloat(i.q) <= s
    }).length

    const couverts7j = (() => {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      return couverts.filter(c => {
        if (!c.date) return false
        const [d, m, y] = c.date.split('/')
        return y && new Date(`${y}-${m}-${d}`) >= weekAgo
      }).reduce((s, c) => s + (c.nb_couverts || 0), 0)
    })()

    return {
      date:          fdate(),
      user_name:     profile?.name  || null,
      user_role:     profile?.role  || null,
      recettes_count: recettes.length,
      stock:         stock.slice(0, 60).map(i => ({
        nom: i.nom, q: i.q, u: i.u, cat: i.cat,
        dlc: i.dlc, seuil_min: i.seuil_min, four: i.four, px: i.px,
      })),
      fournisseurs:  fournisseurs.map(f => ({
        nom: f.nom, mode: f.mode, jours: f.jours, tel: f.tel, email: f.email,
      })),
      scans_recents: scanLog.slice(0, 10).map(s => ({
        four: s.four, date_scan: s.date_scan, nb: s.nb, conf: s.conf, total: s.total,
      })),
      temperatures:  temps.slice(0, 15).map(t => ({
        contexte: t.contexte, valeur: t.valeur, conforme: t.conforme,
        created_at: t.created_at?.slice(0, 16),
      })),
      stats: {
        stock_total:      stock.length,
        stock_critique:   critDlcCount,
        sous_seuil:       sousSeuil,
        fournisseurs:     fournisseurs.length,
        recettes:         recettes.length,
        couverts_semaine: couverts7j,
      },
    }
  }

  async function trackAnalytic(message) {
    if (!user?.id) return
    const msg   = message.toLowerCase()
    const topic = msg.includes('stock') || msg.includes('produit')  ? 'stock'
                : msg.includes('haccp') || msg.includes('temp')     ? 'haccp'
                : msg.includes('recette')                            ? 'recette'
                : msg.includes('marge') || msg.includes('business') ? 'business'
                : 'autre'
    try {
      await insertAriaAnalytic({ id: uid(), etablissement_id: user.id, date: fdate(), message_count: 1, topic_tags: topic, created_at: new Date().toISOString() })
    } catch {}
  }

  async function saveConversation(msgs) {
    if (!user?.id) return
    try {
      const id = convId || uid()
      const conv = {
        id,
        user_id:    user.id,
        date:       fdate(),
        messages:   msgs.slice(-40),
        updated_at: new Date().toISOString(),
        created_at: convId ? undefined : new Date().toISOString(),
      }
      if (!convId) setConvId(id)
      await upsertAriaConversation(conv)
    } catch { /* table peut ne pas encore exister */ }
  }

  async function handleSend(text) {
    const msg = (text ?? input).trim()
    if (!msg || typing) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setError('')

    const userMsg  = { id: uid(), role: 'user',      content: msg,  time: ftime() }
    const withUser = [...messages, userMsg]
    setMessages(withUser)
    setTyping(true)

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content }))

      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      const res  = await fetch('/api/aria', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, history, context: buildContext(), userId: user?.id, accessToken }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)

      const data    = await res.json()
      const ariaMsg = { id: uid(), role: 'assistant', content: data.reply || '…', time: ftime() }
      const final   = [...withUser, ariaMsg]
      setMessages(final)
      await saveConversation(final)
      trackAnalytic(msg)
    } catch (e) {
      setError(`Impossible de joindre Aria : ${e.message}`)
      setMessages(ms => [...ms, { id: uid(), role:'assistant', content:"Je ne suis pas disponible pour l'instant. Vérifiez la connexion et réessayez.", time: ftime() }])
    } finally {
      setTyping(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleInputChange(e) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  function handleNewConv() {
    setMessages([WELCOME(name)])
    setConvId(null)
    setError('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Context alerts for header chips
  const dlcCount = stock.filter(i => {
    if (!i.dlc) return false
    const [d, m, y] = i.dlc.split('/')
    return Math.ceil((new Date(`${y}-${m}-${d}`) - new Date()) / 86400000) <= 3
  }).length
  const seuilCount = stock.filter(i => {
    const s = parseFloat(i.seuil_min)
    return isNaN(s) ? parseFloat(i.q) <= 2 : parseFloat(i.q) <= s
  }).length
  const tempNcCount = temps.filter(t => t.conforme === false).length

  const showSuggestions = messages.length === 1 && !typing

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:F, maxWidth:760, margin:'0 auto', width:'100%' }}>

      {fromDashboard && (
        <button
          onClick={onBack}
          style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'8px 20px 0', cursor:'pointer', fontFamily:F, flexShrink:0 }}
        >
          ← Retour
        </button>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, padding:'14px 20px 10px', background:'#fff', borderBottom:'1px solid #E2E8F0', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#4F46E5)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:700, flexShrink:0, boxShadow:'0 2px 8px rgba(37,99,235,.3)' }}>
              ✦
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#0F172A' }}>Aria</div>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#64748B' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#10B981', display:'inline-block', flexShrink:0 }} />
                <span>En ligne · {fdate()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleNewConv}
            style={{ fontSize:12, fontWeight:600, color:'#94A3B8', background:'#F1F5F9', border:'none', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontFamily:F, flexShrink:0 }}
          >
            Nouvelle conversation
          </button>
        </div>

        {/* Context chips */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <span style={chip()}>📦 {stock.length} produits</span>
          <span style={chip()}>🚚 {fournisseurs.length} fournisseurs</span>
          {dlcCount > 0  && <span style={chip('#FEF2F2','#DC2626')}>⚠️ {dlcCount} DLC critiques</span>}
          {seuilCount > 0 && <span style={chip('#FFFBEB','#D97706')}>📉 {seuilCount} sous seuil</span>}
          {tempNcCount > 0 && <span style={chip('#FEF2F2','#DC2626')}>🌡️ {tempNcCount} temp. NC</span>}
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:14, background:'#F8FAFC' }}>
        {messages.map(m => <Bubble key={m.id} msg={m} />)}
        {typing && <Typing />}
        {error && (
          <div style={{ padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, color:'#DC2626', fontSize:13, fontFamily:F }}>
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestions rapides ──────────────────────────────────────────── */}
      {showSuggestions && (
        <div style={{ padding:'0 8px 10px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, background:'#F8FAFC', flexShrink:0 }}>
          {getTimeSuggestions().map(s => (
            <button
              key={s.text}
              onClick={() => handleSend(s.text)}
              style={{ padding:'8px 6px', border:`1.5px solid ${s.color}30`, borderRadius:12, background:s.bg, fontSize:11, color:'#0F172A', cursor:'pointer', fontFamily:F, textAlign:'left', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, lineHeight:1.35, transition:'transform .12s, box-shadow .12s', minWidth:0, overflow:'hidden' }}
              onMouseOver={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 4px 12px ${s.color}22` }}
              onMouseOut={e =>  { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}
            >
              <span style={{ fontSize:16, flexShrink:0 }}>{s.icon}</span>
              <span style={{ fontWeight:600, wordBreak:'break-word' }}>{s.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, padding:'10px 12px 12px', background:'#fff', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'flex-end', gap:8 }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKey}
          placeholder="Posez une question à Aria…"
          style={{ flex:1, padding:'11px 14px', border:'1.5px solid #E2E8F0', borderRadius:14, fontSize:14, fontFamily:F, resize:'none', outline:'none', lineHeight:1.5, background:'#F8FAFC', color:'#0F172A', overflowY:'hidden', boxSizing:'border-box', minHeight:44, maxHeight:140 }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || typing}
          style={{ width:44, height:44, borderRadius:'50%', background: (input.trim() && !typing) ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : '#E2E8F0', color: (input.trim() && !typing) ? '#fff' : '#94A3B8', border:'none', cursor: (input.trim() && !typing) ? 'pointer' : 'default', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow: (input.trim() && !typing) ? '0 2px 8px rgba(37,99,235,.3)' : 'none', transition:'all .15s' }}
        >
          {typing ? (
            <div style={{ width:16, height:16, border:'2px solid #94A3B8', borderTopColor:'transparent', borderRadius:'50%', animation:'aria-dot 1s linear infinite' }} />
          ) : '↑'}
        </button>
      </div>
    </div>
  )
}

function chip(bg = '#F1F5F9', color = '#64748B') {
  return { fontSize:11, fontWeight:500, color, background:bg, padding:'3px 9px', borderRadius:99, whiteSpace:'nowrap' }
}
