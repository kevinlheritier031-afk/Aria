import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'
import { checkPwd, pwdScore, pwdStrengthColor, pwdStrengthLabel } from '../constants'

const ROLE_OPTIONS = [
  { k: 'chef',         l: 'Chef de cuisine', icon: '👨‍🍳' },
  { k: 'cuisinier',    l: 'Cuisinier',        icon: '🧑‍🍳' },
  { k: 'patissier',    l: 'Pâtissier',        icon: '🎂'  },
  { k: 'gestionnaire', l: 'Gestionnaire',     icon: '📋'  },
  { k: 'proprietaire', l: 'Propriétaire',     icon: '🏪'  },
]

// ── Password rules display ────────────────────────────────────────────────────

function PwdRules({ pwd }) {
  const rules = checkPwd(pwd)
  const items = [
    { k: 'length',  l: '8 caractères minimum' },
    { k: 'upper',   l: 'Une majuscule'         },
    { k: 'number',  l: 'Un chiffre'            },
    { k: 'special', l: 'Un caractère spécial'  },
  ]
  return (
    <div style={S.rules}>
      {items.map(({ k, l }) => (
        <div key={k} style={S.ruleItem}>
          <span style={{ color: rules[k] ? '#10B981' : '#94A3B8', fontSize: 13 }}>
            {rules[k] ? '✓' : '○'}
          </span>
          <span style={{ color: rules[k] ? '#0F172A' : '#94A3B8', fontSize: 12 }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

// ── Password field ────────────────────────────────────────────────────────────

function PwdField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div style={S.group}>
      <label style={S.label}>{label}</label>
      <div style={S.inputWrap}>
        <input
          style={S.input}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '••••••••'}
          autoComplete="new-password"
        />
        <button type="button" style={S.eye} onClick={() => setShow(v => !v)}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }) {
  const [email, setEmail]     = useState('')
  const [pwd, setPwd]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

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
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <button style={{ ...S.btn, opacity: loading ? .6 : 1 }} type="submit" disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}

// ── Signup form ───────────────────────────────────────────────────────────────

function SignupForm({ onSuccess }) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('chef')
  const [pwd, setPwd]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const score = pwdScore(pwd)

  async function handle(e) {
    e.preventDefault()
    setError('')

    const checks = checkPwd(pwd)
    if (!checks.length || !checks.upper || !checks.number || !checks.special) {
      setError('Le mot de passe ne respecte pas toutes les règles.')
      return
    }
    if (pwd !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const { data, error } = await signUp({ email, password: pwd, name, role })
    if (error) { setError(translateError(error.message)); setLoading(false); return }

    if (data.session) {
      onSuccess(data.session.user)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div style={S.successBox}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>✉️</div>
        <div style={{ fontWeight: 600, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>
          Vérifiez votre boîte mail
        </div>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
          Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handle} style={S.form}>
      <div style={S.group}>
        <label style={S.label}>Prénom &amp; Nom</label>
        <input
          style={S.input}
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Jean Dupont"
          required
        />
      </div>

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
        <label style={S.label}>Rôle</label>
        <div style={S.roleGrid}>
          {ROLE_OPTIONS.map(r => (
            <button
              key={r.k}
              type="button"
              onClick={() => setRole(r.k)}
              style={{
                ...S.roleBtn,
                ...(role === r.k ? S.roleBtnActive : {}),
              }}
            >
              <span style={{ fontSize: 18 }}>{r.icon}</span>
              <span style={{ fontSize: 11, marginTop: 2, lineHeight: 1.2, textAlign: 'center' }}>{r.l}</span>
            </button>
          ))}
        </div>
      </div>

      <PwdField label="Mot de passe" value={pwd} onChange={v => { setPwd(v); if (!showRules) setShowRules(true) }} />

      {showRules && pwd.length > 0 && (
        <>
          <div style={S.meterWrap}>
            <div style={S.meterBar}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ ...S.meterSeg, background: i <= score ? pwdStrengthColor(score) : '#E2E8F0' }} />
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: pwdStrengthColor(score), whiteSpace: 'nowrap' }}>
              {pwdStrengthLabel(score)}
            </span>
          </div>
          <PwdRules pwd={pwd} />
        </>
      )}

      <PwdField label="Confirmer le mot de passe" value={confirm} onChange={setConfirm} />

      {error && <div style={S.errorBox}>{error}</div>}

      <button style={{ ...S.btn, opacity: loading ? .6 : 1 }} type="submit" disabled={loading}>
        {loading ? 'Création…' : 'Créer mon compte'}
      </button>
    </form>
  )
}

// ── Main Auth component ───────────────────────────────────────────────────────

export default function Auth({ onLogin }) {
  const [tab, setTab] = useState('login')

  function handleSuccess(user) {
    onLogin(user)
  }

  return (
    <div style={S.screen}>
      {/* Gradient header */}
      <div style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}>✦</div>
          <div style={S.logoText}>Aria</div>
        </div>
        <p style={S.tagline}>Gestion de cuisine professionnelle</p>
      </div>

      {/* Card */}
      <div style={S.card}>
        {/* Tabs */}
        <div style={S.tabs}>
          {[
            { k: 'login',  l: 'Connexion'       },
            { k: 'signup', l: 'Créer un compte'  },
          ].map(t => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}) }}
            >
              {t.l}
            </button>
          ))}
        </div>

        <div style={S.scrollArea}>
          {tab === 'login'
            ? <LoginForm  onSuccess={handleSuccess} />
            : <SignupForm onSuccess={handleSuccess} />
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
  if (msg.includes('Password should be'))        return 'Le mot de passe doit faire au moins 6 caractères.'
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
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  },
  header: {
    flex: '0 0 auto',
    padding: '52px 32px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logoIcon: {
    fontSize: 28,
    color: 'rgba(255,255,255,.9)',
    filter: 'drop-shadow(0 2px 8px rgba(255,255,255,.3))',
    lineHeight: 1,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-1px',
    textShadow: '0 2px 12px rgba(0,0,0,.15)',
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,.75)',
    margin: 0,
  },
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
  scrollArea: {
    overflowY: 'auto',
    flex: 1,
    padding: '0 24px 32px',
  },
  tabs: {
    display: 'flex',
    padding: '20px 24px 0',
    gap: 4,
    flexShrink: 0,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: '10px 8px',
    border: 'none',
    background: 'none',
    fontSize: 13.5,
    fontWeight: 500,
    color: '#94A3B8',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'color .15s, border-color .15s',
    fontFamily: 'inherit',
  },
  tabActive: {
    color: '#2563EB',
    borderBottomColor: '#2563EB',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 500,
    color: '#475569',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #E2E8F0',
    borderRadius: 10,
    fontSize: 14,
    color: '#0F172A',
    background: '#F8FAFC',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
  },
  eye: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 2px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  roleBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 6px',
    border: '1.5px solid #E2E8F0',
    borderRadius: 10,
    background: '#F8FAFC',
    cursor: 'pointer',
    color: '#475569',
    fontFamily: 'inherit',
    transition: 'border-color .15s, background .15s, color .15s',
    gap: 4,
  },
  roleBtnActive: {
    borderColor: '#2563EB',
    background: '#EFF6FF',
    color: '#1D4ED8',
  },
  meterWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: -8,
  },
  meterBar: {
    display: 'flex',
    gap: 4,
    flex: 1,
  },
  meterSeg: {
    height: 4,
    flex: 1,
    borderRadius: 99,
    transition: 'background .2s',
  },
  rules: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px 12px',
    padding: '10px 12px',
    background: '#F8FAFC',
    borderRadius: 8,
    marginTop: -8,
  },
  ruleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 12px rgba(37,99,235,.35)',
    transition: 'opacity .15s, transform .1s',
    marginTop: 4,
  },
  errorBox: {
    padding: '10px 14px',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 8,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 1.4,
  },
  successBox: {
    textAlign: 'center',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
}
