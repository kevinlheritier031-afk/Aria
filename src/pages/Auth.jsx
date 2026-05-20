import { useState, useRef } from 'react'
import { signIn } from '../lib/supabase'

const F = "'Plus Jakarta Sans', 'Inter', sans-serif"

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }) {
  const [email,   setEmail]   = useState('')
  const [pwd,     setPwd]     = useState('')
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handle(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await signIn({ email, password: pwd })
    if (error) { setError(translateError(error.message)); setLoading(false); return }
    onSuccess(data.session.user)
    setLoading(false)
  }

  return (
    <form onSubmit={handle} style={S.form}>
      <div style={S.group}>
        <label style={S.label}>Email</label>
        <input
          style={S.input}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="chef@restaurant.fr"
          autoComplete="email"
          required
        />
      </div>

      <div style={S.group}>
        <label style={S.label}>Mot de passe</label>
        <div style={S.inputWrap}>
          <input
            style={S.input}
            type={show ? 'text' : 'password'}
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button type="button" style={S.eye} onClick={() => setShow(v => !v)}>
            {show ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <button style={{ ...S.btn, opacity: loading ? .6 : 1 }} type="submit" disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>

      <div style={{ textAlign:'center', fontSize:12, color:'#94A3B8', marginTop:4 }}>
        Accès réservé aux responsables d'établissement.<br/>
        Pour créer un compte, contactez votre administrateur.
      </div>
    </form>
  )
}

// ── PIN Login ─────────────────────────────────────────────────────────────────

function PinLoginForm({ onSuccess }) {
  const [step,        setStep]        = useState('code')     // 'code' | 'select' | 'pin'
  const [ownerCode,   setOwnerCode]   = useState('')
  const [membres,     setMembres]     = useState([])
  const [selected,    setSelected]    = useState(null)
  const [pin,         setPin]         = useState(['', '', '', ''])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const pinRefs       = [useRef(), useRef(), useRef(), useRef()]

  async function handleFetchMembres() {
    if (ownerCode.length < 10) { setError('Code trop court'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: ownerCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Code invalide'); setLoading(false); return }
      if (!data.membres?.length) { setError('Aucun membre trouvé pour ce code'); setLoading(false); return }
      setMembres(data.membres)
      setStep('select')
    } catch {
      setError('Impossible de joindre le serveur')
    }
    setLoading(false)
  }

  function handleSelect(membre) {
    setSelected(membre)
    setPin(['', '', '', ''])
    setError('')
    setStep('pin')
    setTimeout(() => pinRefs[0].current?.focus(), 50)
  }

  function handlePinInput(index, value) {
    const v = value.replace(/\D/, '')
    if (!v && value) return
    const next = [...pin]
    next[index] = v
    setPin(next)
    if (v && index < 3) pinRefs[index + 1].current?.focus()
    if (next.every(d => d !== '') && index === 3) handleVerify(next)
  }

  function handlePinKey(index, e) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus()
    }
  }

  async function handleVerify(pinArr) {
    const pinStr = (pinArr || pin).join('')
    if (pinStr.length !== 4) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/team-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: ownerCode.trim(), memberId: selected.id, pin: pinStr }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Connexion échouée')
        setPin(['', '', '', ''])
        setTimeout(() => pinRefs[0].current?.focus(), 50)
        setLoading(false)
        return
      }
      onSuccess(data)
    } catch {
      setError('Impossible de joindre le serveur')
      setLoading(false)
    }
  }

  // ── Step 1: Enter establishment code ──────────────────────────────────────
  if (step === 'code') {
    return (
      <div style={S.form}>
        <div style={S.pinInfo}>
          <div style={{ fontSize:28, marginBottom:8 }}>🏪</div>
          <div style={{ fontWeight:700, color:'#0F172A', fontSize:14 }}>Code établissement</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginTop:4, lineHeight:1.5 }}>
            Demandez ce code à votre responsable (Propriétaire ou Chef)
          </div>
        </div>
        <div style={S.group}>
          <label style={S.label}>Code établissement</label>
          <textarea
            style={{ ...S.input, height:80, resize:'none', fontSize:12, fontFamily:"'DM Mono',monospace", letterSpacing:'.5px' }}
            value={ownerCode}
            onChange={e => setOwnerCode(e.target.value)}
            placeholder="Collez le code ici…"
            autoComplete="off"
          />
        </div>
        {error && <div style={S.errorBox}>{error}</div>}
        <button
          style={{ ...S.btn, opacity: loading || ownerCode.length < 10 ? .6 : 1 }}
          onClick={handleFetchMembres}
          disabled={loading || ownerCode.length < 10}
        >
          {loading ? 'Recherche…' : "Voir l'équipe →"}
        </button>
      </div>
    )
  }

  // ── Step 2: Select name ───────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div style={S.form}>
        <div style={S.pinInfo}>
          <div style={{ fontSize:28, marginBottom:8 }}>👋</div>
          <div style={{ fontWeight:700, color:'#0F172A', fontSize:14 }}>Qui êtes-vous ?</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>
            {membres.length} membre{membres.length > 1 ? 's' : ''} trouvé{membres.length > 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {membres.map(m => (
            <button
              key={m.id}
              onClick={() => handleSelect(m)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', border:'1.5px solid #E2E8F0', borderRadius:12, background:'#F8FAFC', cursor:'pointer', fontFamily:F, textAlign:'left', transition:'all .15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = '#EFF6FF' }}
              onMouseOut={e =>  { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC' }}
            >
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#3B82F6,#1D4ED8)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, flexShrink:0 }}>
                {m.name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{m.name}</div>
                <div style={{ fontSize:12, color:'#94A3B8' }}>{m.role}</div>
              </div>
              <span style={{ marginLeft:'auto', color:'#CBD5E1', fontSize:16 }}>›</span>
            </button>
          ))}
        </div>
        <button onClick={() => setStep('code')} style={{ ...S.btnLink }}>← Changer de code</button>
      </div>
    )
  }

  // ── Step 3: Enter PIN ─────────────────────────────────────────────────────
  return (
    <div style={S.form}>
      <div style={S.pinInfo}>
        <div style={{ fontSize:28, marginBottom:8 }}>🔐</div>
        <div style={{ fontWeight:700, color:'#0F172A', fontSize:14 }}>Bonjour, {selected?.name?.split(' ')[0]} !</div>
        <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>Entrez votre code PIN à 4 chiffres</div>
      </div>
      <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
        {pin.map((d, i) => (
          <input
            key={i}
            ref={pinRefs[i]}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handlePinInput(i, e.target.value)}
            onKeyDown={e => handlePinKey(i, e)}
            style={{
              width:54, height:62, textAlign:'center',
              fontSize:26, fontWeight:800, fontFamily:"'DM Mono',monospace",
              border: d ? '2px solid #2563EB' : '2px solid #E2E8F0',
              borderRadius:14, background: d ? '#EFF6FF' : '#F8FAFC',
              color:'#0F172A', outline:'none',
              boxShadow: d ? '0 0 0 3px rgba(37,99,235,.12)' : 'none',
              transition:'all .15s',
            }}
          />
        ))}
      </div>
      {error && <div style={S.errorBox}>{error}</div>}
      {loading && (
        <div style={{ textAlign:'center', fontSize:13, color:'#94A3B8' }}>Vérification…</div>
      )}
      <button onClick={() => { setStep('select'); setPin(['','','','']) }} style={S.btnLink}>
        ← Choisir un autre nom
      </button>
    </div>
  )
}

// ── Main Auth component ───────────────────────────────────────────────────────

export default function Auth({ onLogin, onTeamLogin }) {
  const [mode, setMode] = useState('compte')

  function handleLoginSuccess(user) {
    onLogin(user)
  }

  function handleTeamSuccess(session) {
    onTeamLogin(session)
  }

  return (
    <div style={S.screen}>
      {/* Gradient header */}
      <div style={S.header}>
        <div style={S.logo}>
          <div style={S.logoOrb}>✦</div>
          <div style={S.logoText}>Aria</div>
        </div>
        <p style={S.tagline}>Gestion de cuisine professionnelle</p>
      </div>

      {/* Card */}
      <div style={S.card}>
        {/* Mode tabs */}
        <div style={S.tabs}>
          {[
            { k:'compte', l:'Connexion compte',  icon:'🔑' },
            { k:'pin',    l:'Connexion PIN',      icon:'🔐' },
          ].map(t => (
            <button
              key={t.k}
              type="button"
              onClick={() => setMode(t.k)}
              style={{ ...S.tab, ...(mode === t.k ? S.tabActive : {}) }}
            >
              <span>{t.icon}</span>
              <span>{t.l}</span>
            </button>
          ))}
        </div>

        <div style={S.scrollArea}>
          {mode === 'compte'
            ? <LoginForm onSuccess={handleLoginSuccess} />
            : <PinLoginForm onSuccess={handleTeamSuccess} />
          }
        </div>
      </div>
    </div>
  )
}

// ── Error translation ─────────────────────────────────────────────────────────

function translateError(msg) {
  if (!msg) return 'Une erreur est survenue.'
  if (msg.includes('Invalid login credentials'))  return 'Email ou mot de passe incorrect.'
  if (msg.includes('Email not confirmed'))        return 'Confirmez votre email avant de vous connecter.'
  if (msg.includes('User already registered'))    return 'Un compte existe déjà avec cet email.'
  if (msg.includes('rate limit'))                return 'Trop de tentatives. Attendez quelques minutes.'
  return msg
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  screen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(160deg, #1D4ED8 0%, #2563EB 30%, #3B82F6 55%, #F8FAFC 55%)',
    fontFamily: F,
  },
  header: {
    flex: '0 0 auto',
    padding: '52px 32px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  logoOrb: {
    width: 44, height: 44, borderRadius: 14,
    background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, color: '#fff',
    boxShadow: '0 0 0 1px rgba(255,255,255,.2) inset, 0 4px 20px rgba(37,99,235,.5)',
  },
  logoText: {
    fontSize: 32, fontWeight: 800, color: '#ffffff',
    letterSpacing: '-1px', textShadow: '0 2px 12px rgba(0,0,0,.15)',
  },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,.75)', margin: 0 },
  card: {
    flex: 1,
    background: '#ffffff',
    borderRadius: '24px 24px 0 0',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 160px)',
    boxShadow: '0 -4px 32px rgba(15,23,42,.12)',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
  },
  scrollArea: { overflowY: 'auto', flex: 1, padding: '0 24px 40px' },
  tabs: {
    display: 'flex', padding: '20px 24px 0', gap: 4, flexShrink: 0, marginBottom: 20,
  },
  tab: {
    flex: 1, padding: '9px 6px', border: 'none', background: 'none',
    fontSize: 13, fontWeight: 500, color: '#94A3B8',
    borderBottom: '2px solid transparent', cursor: 'pointer',
    transition: 'color .15s, border-color .15s', fontFamily: F,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  },
  tabActive: { color: '#2563EB', borderBottomColor: '#2563EB', fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  group: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12.5, fontWeight: 500, color: '#475569' },
  inputWrap: { position: 'relative' },
  input: {
    width: '100%', padding: '10px 12px',
    border: '1.5px solid #E2E8F0', borderRadius: 10,
    fontSize: 14, color: '#0F172A', background: '#F8FAFC',
    fontFamily: F, boxSizing: 'border-box', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
  },
  eye: {
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
    padding: '0 2px', lineHeight: 1, display: 'flex', alignItems: 'center',
  },
  btn: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: F,
    boxShadow: '0 4px 12px rgba(37,99,235,.35)',
    transition: 'opacity .15s, transform .1s',
    marginTop: 4,
  },
  btnLink: {
    background: 'none', border: 'none', color: '#94A3B8',
    fontSize: 13, cursor: 'pointer', fontFamily: F,
    textAlign: 'center', padding: '4px 0', textDecoration: 'underline',
  },
  errorBox: {
    padding: '10px 14px', background: '#FEF2F2',
    border: '1px solid #FECACA', borderRadius: 8,
    fontSize: 13, color: '#DC2626', lineHeight: 1.4,
  },
  pinInfo: {
    textAlign: 'center', padding: '8px 0 4px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
}
