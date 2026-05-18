import { useState, useRef, useEffect } from 'react'
import { initials, ROLES, fdate, ftime } from '../constants'

const STYLE_ID = 'aria-chat-kf'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes aria-dot { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
    @keyframes aria-msg { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  `
  document.head.appendChild(s)
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function Typing() {
  return (
    <div style={S.bubble_aria}>
      <div style={{ display:'flex', gap:4, alignItems:'center', padding:'4px 0' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#94A3B8', animation:`aria-dot 1.2s ease-in-out ${i * .2}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap:4, animation:'aria-msg .2s ease' }}>
      {!isUser && (
        <div style={S.ariaLabel}>✦ Aria</div>
      )}
      <div style={isUser ? S.bubble_user : S.bubble_aria}>
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
        ))}
      </div>
      <div style={S.timestamp}>{msg.time}</div>
    </div>
  )
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Quels produits vont bientôt expirer ?',
  'Génère un bon de commande pour cette semaine',
  'Analyse mon stock et identifie les risques',
  'Quels fournisseurs dois-je contacter aujourd\'hui ?',
]

// ── Aria Chat Page ────────────────────────────────────────────────────────────

export default function Aria({ stock = [], fournisseurs = [], scanLog = [], user, profile, fromDashboard = false, onBack }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome', role: 'assistant',
      content: `Bonjour ! Je suis Aria, votre assistante cuisine IA. 👨‍🍳\n\nJe peux vous aider à analyser votre stock, anticiper les commandes, détecter les risques DLC et bien plus. Posez-moi une question !`,
      time: ftime(),
    }
  ])
  const [input,   setInput]   = useState('')
  const [typing,  setTyping]  = useState(false)
  const [error,   setError]   = useState('')
  const bottomRef = useRef()
  const inputRef  = useRef()

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function buildContext() {
    return {
      date: fdate(),
      stock: stock.slice(0, 60).map(i => ({
        nom: i.nom, q: i.q, u: i.u, cat: i.cat,
        dlc: i.dlc, seuil_min: i.seuil_min, four: i.four,
      })),
      fournisseurs: fournisseurs.map(f => ({ nom: f.nom, mode: f.mode, jours: f.jours })),
      scans_recents: scanLog.slice(0, 10).map(s => ({ four: s.four, date_scan: s.date_scan, nb: s.nb, conf: s.conf })),
    }
  }

  async function handleSend(text) {
    const msg = text || input.trim()
    if (!msg || typing) return
    setInput('')
    setError('')

    const userMsg = { id: Date.now().toString(), role: 'user', content: msg, time: ftime() }
    setMessages(ms => [...ms, userMsg])
    setTyping(true)

    try {
      const res = await fetch('/api/aria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
          userId: user?.id,
        }),
      })

      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      const ariaMsg = { id: `a-${Date.now()}`, role: 'assistant', content: data.reply || data.message || '…', time: ftime() }
      setMessages(ms => [...ms, ariaMsg])
    } catch (e) {
      setError(`Impossible de joindre Aria : ${e.message}`)
      setMessages(ms => [...ms, { id: `err-${Date.now()}`, role:'assistant', content:'⚠️ Je ne suis pas disponible pour l\'instant. Vérifiez la connexion ou réessayez.', time:ftime() }])
    }
    setTyping(false)
    inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const name    = profile?.name || user?.email || '?'
  const role    = profile?.role || 'employe'
  const roleInfo = ROLES[role] || ROLES.employe

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}
      {/* Header */}
      <div style={S.header}>
        <div style={S.ariaHeader}>
          <div style={S.ariaBadge}>✦</div>
          <div>
            <div style={S.ariaName}>Aria</div>
            <div style={S.ariaStatus}>
              <span style={S.statusDot} />
              <span>Assistante IA · Gestion cuisine</span>
            </div>
          </div>
        </div>
        <div style={S.contextChips}>
          <span style={S.ctxChip}>📦 {stock.length} produits</span>
          <span style={S.ctxChip}>🚚 {fournisseurs.length} fournisseurs</span>
          <span style={S.ctxChip}>📷 {scanLog.length} scans</span>
        </div>
      </div>

      {/* Messages */}
      <div style={S.messages}>
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        {typing && <Typing />}
        {error && <div style={S.errorBox}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (show only at start) */}
      {messages.length === 1 && !typing && (
        <div style={S.suggestions}>
          {SUGGESTIONS.map(s => (
            <button key={s} style={S.suggBtn} onClick={() => handleSend(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={S.inputArea}>
        <textarea
          ref={inputRef}
          style={S.textarea}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Posez une question à Aria…"
          rows={1}
        />
        <button
          style={{ ...S.sendBtn, opacity: (!input.trim() || typing) ? .5 : 1 }}
          onClick={() => handleSend()}
          disabled={!input.trim() || typing}
        >
          {typing ? '⟳' : '↑'}
        </button>
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const F = "'DM Sans','Inter',sans-serif"

const S = {
  page: {
    display:'flex', flexDirection:'column', height:'100%', fontFamily:F, maxWidth:760, margin:'0 auto', width:'100%',
  },
  backBtn: { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'8px 20px 0', cursor:'pointer', fontFamily:F },
  header: {
    flexShrink:0, padding:'16px 20px 12px', background:'#fff', borderBottom:'1px solid #E2E8F0',
    display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap',
  },
  ariaHeader: { display:'flex', alignItems:'center', gap:12 },
  ariaBadge: {
    width:40, height:40, borderRadius:'50%',
    background:'linear-gradient(135deg,#2563EB,#4F46E5)', color:'#fff',
    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, flexShrink:0,
  },
  ariaName: { fontSize:16, fontWeight:700, color:'#0F172A' },
  ariaStatus: { display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#64748B' },
  statusDot: { width:7, height:7, borderRadius:'50%', background:'#10B981', display:'inline-block' },

  contextChips: { display:'flex', gap:6, flexWrap:'wrap' },
  ctxChip: { fontSize:11, fontWeight:500, color:'#64748B', background:'#F1F5F9', padding:'3px 9px', borderRadius:99 },

  messages: {
    flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:16,
    background:'#F8FAFC',
  },

  ariaLabel: { fontSize:11, fontWeight:600, color:'#6366F1', letterSpacing:'.3px' },

  bubble_user: {
    maxWidth:'78%', background:'#2563EB', color:'#fff',
    padding:'11px 15px', borderRadius:'16px 4px 16px 16px',
    fontSize:14, lineHeight:1.55, wordBreak:'break-word',
    boxShadow:'0 2px 8px rgba(37,99,235,.25)',
  },
  bubble_aria: {
    maxWidth:'82%', background:'#fff', color:'#0F172A',
    padding:'11px 15px', borderRadius:'4px 16px 16px 16px',
    fontSize:14, lineHeight:1.6, wordBreak:'break-word',
    border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,.06)',
  },
  timestamp: { fontSize:10.5, color:'#CBD5E1', marginTop:1 },

  suggestions: { padding:'0 16px 12px', display:'flex', flexDirection:'column', gap:8, background:'#F8FAFC' },
  suggBtn: {
    padding:'11px 16px', border:'1.5px solid #E2E8F0', borderRadius:12, background:'#fff',
    fontSize:13.5, color:'#0F172A', cursor:'pointer', fontFamily:F, textAlign:'left',
    transition:'border-color .15s, background .15s',
  },

  inputArea: {
    flexShrink:0, padding:'12px 16px', background:'#fff', borderTop:'1px solid #E2E8F0',
    display:'flex', alignItems:'flex-end', gap:10,
  },
  textarea: {
    flex:1, padding:'11px 14px', border:'1.5px solid #E2E8F0', borderRadius:12,
    fontSize:14, fontFamily:F, resize:'none', outline:'none', lineHeight:1.5,
    background:'#F8FAFC', color:'#0F172A', maxHeight:140, overflowY:'auto',
    boxSizing:'border-box',
  },
  sendBtn: {
    width:44, height:44, borderRadius:'50%',
    background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'#fff',
    border:'none', cursor:'pointer', fontSize:18, fontWeight:700,
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    boxShadow:'0 2px 8px rgba(37,99,235,.3)',
    transition:'opacity .15s',
  },
  errorBox: { padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, color:'#DC2626', fontSize:13 },
}
