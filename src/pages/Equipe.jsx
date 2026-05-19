import { useState, useEffect } from 'react'
import { fetchEquipeMembres, upsertEquipeMembre } from '../lib/supabase'
import { ROLES, uid, initials } from '../constants'
import { canDo } from '../hooks/usePermissions'

const F = "'Plus Jakarta Sans','Inter',sans-serif"

const MODULES_FORMATION = [
  { k:'intro',        l:'Introduction HACCP',              icon:'📚', desc:'7 points critiques, bonnes pratiques fondamentales' },
  { k:'temp',         l:'Températures & zones critiques',  icon:'🌡️', desc:'Chaîne du froid, seuils réglementaires, enregistrement' },
  { k:'tracabilite',  l:'Traçabilité & DLC',               icon:'📋', desc:'Étiquetage, FIFO/FEFO, dates limites de consommation' },
  { k:'nettoyage',    l:'Nettoyage & désinfection',        icon:'🧹', desc:'Plans de nettoyage, produits homologués, fréquences' },
  { k:'reception',    l:'Réception des marchandises',      icon:'📦', desc:'Contrôle à réception, refus de livraison, traçabilité' },
]

const CHECKLISTS = {
  proprietaire: [
    { k:'profil',       l:"Configurer le profil établissement" },
    { k:'equipe',       l:"Inviter les membres de l'équipe" },
    { k:'fournisseurs', l:"Ajouter les fournisseurs principaux" },
    { k:'stock',        l:"Saisir le stock initial" },
    { k:'haccp',        l:"Configurer les zones HACCP" },
    { k:'marges',       l:"Paramétrer les objectifs de marge" },
    { k:'aria_test',    l:"Tester Aria avec une question de stock" },
  ],
  chef: [
    { k:'stock',        l:"Vérifier le stock critique" },
    { k:'recettes',     l:"Importer les recettes de la maison" },
    { k:'commandes',    l:"Préparer la première commande fournisseur" },
    { k:'mep',          l:"Créer la première liste de mise en place" },
    { k:'haccp',        l:"Saisir les premières températures" },
    { k:'aria_test',    l:"Demander à Aria un rapport de stock" },
  ],
  second: [
    { k:'stock',        l:"Prendre connaissance du stock actuel" },
    { k:'mep',          l:"Consulter la mise en place du jour" },
    { k:'haccp',        l:"Saisir les températures du matin" },
    { k:'recettes',     l:"Consulter les fiches techniques" },
    { k:'aria_test',    l:"Tester Aria sur les alertes DLC" },
  ],
  cuisinier: [
    { k:'stock',        l:"Consulter le stock disponible" },
    { k:'mep',          l:"Valider les tâches de mise en place" },
    { k:'temp',         l:"Saisir les températures de votre zone" },
    { k:'reception',    l:"Scanner une réception fournisseur" },
    { k:'aria_test',    l:"Demander à Aria vos priorités du jour" },
  ],
  patissier: [
    { k:'stock',        l:"Vérifier le stock pâtisserie" },
    { k:'recettes',     l:"Créer vos premières fiches techniques" },
    { k:'mep',          l:"Valider la mise en place desserts" },
    { k:'temp',         l:"Contrôler la température chambre froide" },
    { k:'aria_test',    l:"Demander à Aria une analyse DLC" },
  ],
  employe: [
    { k:'stock',        l:"Consulter le stock (lecture seule)" },
    { k:'mep',          l:"Valider les tâches de mise en place" },
    { k:'temp',         l:"Saisir une température de contrôle" },
    { k:'aria_test',    l:"Poser une question à Aria" },
  ],
}

const ROLE_KEYS = ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier', 'employe']

const MATRICE_DROITS = [
  { action:'Supprimer produit stock',    allowed:['proprietaire','chef','second'] },
  { action:'Modifier recettes',          allowed:['proprietaire','chef','second','cuisinier','patissier'] },
  { action:'Supprimer recettes',         allowed:['proprietaire','chef','second'] },
  { action:'Passer commandes',           allowed:['proprietaire','chef','second'] },
  { action:'Voir marges / finances',     allowed:['proprietaire','chef','second'] },
  { action:"Gérer l'équipe",            allowed:['proprietaire','chef'] },
  { action:'Voir rapports HACCP',        allowed:['proprietaire','chef','second','cuisinier','patissier','employe'] },
  { action:'Saisir températures',        allowed:['proprietaire','chef','second','cuisinier','patissier','employe'] },
  { action:'Valider mise en place',      allowed:['proprietaire','chef','second','cuisinier','patissier','employe'] },
]

const S = {
  page:       { padding:20, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:880, margin:'0 auto' },
  backBtn:    { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F },
  rowBetween: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  tabs:       { display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3 },
  tab:        { flex:1, padding:'8px 10px', border:'none', background:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:5 },
  tabActive:  { background:'#fff', color:'#0F172A', boxShadow:'0 1px 3px rgba(0,0,0,.08)' },
  card:       { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 20px' },
  cardTitle:  { fontSize:12, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 },
  kpiRow:     { display:'grid', gap:12 },
  kpi:        { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4, alignItems:'center' },
  kpiNum:     { fontSize:22, fontWeight:800, fontFamily:"'DM Mono',monospace" },
  kpiLabel:   { fontSize:11, color:'#64748B', fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' },
  input:      { width:'100%', border:'1.5px solid #E2E8F0', borderRadius:9, padding:'9px 12px', fontSize:14, fontFamily:F, outline:'none', background:'#F8FAFC', color:'#0F172A', boxSizing:'border-box' },
  select:     { width:'100%', border:'1.5px solid #E2E8F0', borderRadius:9, padding:'9px 12px', fontSize:14, fontFamily:F, outline:'none', background:'#F8FAFC', color:'#0F172A', boxSizing:'border-box', cursor:'pointer' },
  btn:        { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', border:'none', fontFamily:F },
  btnSm:      { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 12px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', border:'none', fontFamily:F },
  badge:      { display:'inline-flex', alignItems:'center', gap:3, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:600 },
  empty:      { color:'#94A3B8', textAlign:'center', padding:'28px 0', fontSize:13 },
  avatar:     { width:38, height:38, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, flexShrink:0 },
}

// ── RoleBadge ──────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.employe
  return (
    <span style={{ ...S.badge, background:`${r.color}22`, color:r.color }}>
      {r.icon} {r.label}
    </span>
  )
}

// ── TabEquipe ──────────────────────────────────────────────────────────────────

function TabEquipe({ user, profile, membres, setMembres, loading }) {
  const [showInvite, setShowInvite] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState({ email:'', name:'', role:'cuisinier' })

  const canManage = canDo('gerer_equipe', profile?.role)
  const f = (k, v) => setForm(p => ({ ...p, [k]:v }))

  async function handleInvite() {
    if (!form.email.trim() || !form.name.trim()) { alert('Email et nom requis'); return }
    setSaving(true)
    const rec = {
      id:         uid(),
      owner_id:   user.id,
      email:      form.email.trim().toLowerCase(),
      name:       form.name.trim(),
      role:       form.role,
      actif:      true,
      statut:     'invite',
      formation:  {},
      created_at: new Date().toISOString(),
    }
    await upsertEquipeMembre(rec)
    setMembres(m => [rec, ...m])
    setForm({ email:'', name:'', role:'cuisinier' })
    setShowInvite(false)
    setSaving(false)
  }

  async function handleToggleActif(id, current) {
    const updated = membres.map(m => m.id === id ? { ...m, actif: !current } : m)
    setMembres(updated)
    await upsertEquipeMembre(updated.find(m => m.id === id))
  }

  async function handleChangeRole(id, newRole) {
    const updated = membres.map(m => m.id === id ? { ...m, role: newRole } : m)
    setMembres(updated)
    await upsertEquipeMembre(updated.find(m => m.id === id))
  }

  const actifs    = membres.filter(m => m.actif).length
  const certifies = membres.filter(m => MODULES_FORMATION.every(mod => m.formation?.[mod.k])).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* KPIs */}
      <div style={{ ...S.kpiRow, gridTemplateColumns:'repeat(3,1fr)' }}>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#2563EB' }}>{membres.length}</span>
          <span style={S.kpiLabel}>Membres</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#10B981' }}>{actifs}</span>
          <span style={S.kpiLabel}>Actifs</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#6366F1' }}>{certifies}</span>
          <span style={S.kpiLabel}>Certifiés HACCP</span>
        </div>
      </div>

      {/* Invitation */}
      {canManage && (
        <div style={S.card}>
          <div style={{ ...S.rowBetween, marginBottom: showInvite ? 16 : 0 }}>
            <div style={{ ...S.cardTitle, marginBottom:0 }}>Inviter un membre</div>
            <button
              onClick={() => setShowInvite(v => !v)}
              style={{ ...S.btnSm, background: showInvite ? '#F1F5F9' : '#2563EB', color: showInvite ? '#0F172A' : '#fff' }}
            >
              {showInvite ? '✕ Annuler' : '+ Inviter'}
            </button>
          </div>
          {showInvite && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Nom complet</label>
                  <input style={S.input} placeholder="Jean Dupont" value={form.name} onChange={e => f('name', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Email</label>
                  <input style={S.input} type="email" placeholder="jean@restaurant.fr" value={form.email} onChange={e => f('email', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Rôle</label>
                <select style={S.select} value={form.role} onChange={e => f('role', e.target.value)}>
                  {ROLE_KEYS.map(r => (
                    <option key={r} value={r}>{ROLES[r]?.icon} {ROLES[r]?.label || r}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleInvite}
                disabled={saving}
                style={{ ...S.btn, background:'#2563EB', color:'#fff', opacity: saving ? .7 : 1 }}
              >
                {saving ? 'Enregistrement…' : '✉️ Enregistrer le membre'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liste membres */}
      <div style={S.card}>
        <div style={S.cardTitle}>Équipe ({membres.length})</div>
        {loading ? (
          <div style={S.empty}>Chargement…</div>
        ) : membres.length === 0 ? (
          <div style={S.empty}>Aucun membre enregistré. Invitez votre équipe !</div>
        ) : (
          membres.map((m, i) => {
            const roleInfo = ROLES[m.role] || ROLES.employe
            const done     = MODULES_FORMATION.filter(mod => m.formation?.[mod.k]).length
            return (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom: i < membres.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                <div style={{ ...S.avatar, background:`${roleInfo.color}18`, color:roleInfo.color }}>
                  {initials(m.name)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{m.name}</span>
                    {m.statut === 'invite' && (
                      <span style={{ ...S.badge, background:'#FFFBEB', color:'#92400E' }}>invitation</span>
                    )}
                    {!m.actif && (
                      <span style={{ ...S.badge, background:'#F1F5F9', color:'#94A3B8' }}>inactif</span>
                    )}
                    {done === MODULES_FORMATION.length && (
                      <span style={{ ...S.badge, background:'#ECFDF5', color:'#059669' }}>🎓 Certifié</span>
                    )}
                  </div>
                  <div style={{ fontSize:12, color:'#94A3B8', marginTop:1 }}>{m.email}</div>
                  <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <RoleBadge role={m.role} />
                    <span style={{ fontSize:11, color:'#94A3B8' }}>Formation {done}/{MODULES_FORMATION.length}</span>
                  </div>
                </div>
                {canManage && (
                  <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end', flexShrink:0 }}>
                    <select
                      value={m.role}
                      onChange={e => handleChangeRole(m.id, e.target.value)}
                      style={{ fontSize:12, fontFamily:F, border:'1px solid #E2E8F0', borderRadius:7, padding:'4px 8px', background:'#F8FAFC', cursor:'pointer', outline:'none', color:'#0F172A' }}
                    >
                      {ROLE_KEYS.map(r => (
                        <option key={r} value={r}>{ROLES[r]?.label || r}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleToggleActif(m.id, m.actif)}
                      style={{ ...S.btnSm, background: m.actif ? '#ECFDF5' : '#F1F5F9', color: m.actif ? '#059669' : '#94A3B8', minWidth:72 }}
                    >
                      {m.actif ? '● Actif' : '○ Inactif'}
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Matrice des droits */}
      <div style={S.card}>
        <div style={S.cardTitle}>Matrice des droits</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, minWidth:520 }}>
            <thead>
              <tr>
                <th style={{ textAlign:'left', padding:'6px 10px', color:'#94A3B8', fontWeight:600, borderBottom:'2px solid #E2E8F0', minWidth:160 }}>Action</th>
                {ROLE_KEYS.map(r => (
                  <th key={r} style={{ padding:'6px 8px', color: ROLES[r]?.color || '#94A3B8', fontWeight:700, borderBottom:'2px solid #E2E8F0', textAlign:'center', minWidth:64 }}>
                    <div style={{ fontSize:16 }}>{ROLES[r]?.icon}</div>
                    <div style={{ fontSize:9, color:'#94A3B8', fontWeight:500, marginTop:1, lineHeight:1.2 }}>
                      {ROLES[r]?.label?.split(' ').slice(0,1).join(' ')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRICE_DROITS.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                  <td style={{ padding:'7px 10px', color:'#0F172A', fontWeight:500, fontSize:12.5 }}>{row.action}</td>
                  {ROLE_KEYS.map(r => (
                    <td key={r} style={{ padding:'7px 8px', textAlign:'center', fontSize:14 }}>
                      {row.allowed.includes(r) ? '✅' : <span style={{ color:'#CBD5E1' }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── TabFormation ───────────────────────────────────────────────────────────────

function TabFormation({ profile, membres, setMembres, loading }) {
  const [expanded,  setExpanded]  = useState(null)
  const canManage = canDo('gerer_formation', profile?.role)

  async function handleToggleModule(memberId, moduleKey, current) {
    const updated = membres.map(m => {
      if (m.id !== memberId) return m
      return { ...m, formation: { ...(m.formation || {}), [moduleKey]: !current } }
    })
    setMembres(updated)
    await upsertEquipeMembre(updated.find(m => m.id === memberId))
  }

  const certifies = membres.filter(m => MODULES_FORMATION.every(mod => m.formation?.[mod.k])).length

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* KPIs */}
      <div style={{ ...S.kpiRow, gridTemplateColumns:'repeat(3,1fr)' }}>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#2563EB' }}>{membres.length}</span>
          <span style={S.kpiLabel}>Membres</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#10B981' }}>{certifies}</span>
          <span style={S.kpiLabel}>Certifiés</span>
        </div>
        <div style={S.kpi}>
          <span style={{ ...S.kpiNum, color:'#F59E0B' }}>{membres.length - certifies}</span>
          <span style={S.kpiLabel}>En formation</span>
        </div>
      </div>

      {/* Modules catalogue */}
      <div style={S.card}>
        <div style={S.cardTitle}>Modules HACCP ({MODULES_FORMATION.length})</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
          {MODULES_FORMATION.map(mod => (
            <div key={mod.k} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
              <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{mod.icon}</span>
              <div>
                <div style={{ fontSize:12.5, fontWeight:700, color:'#0F172A' }}>{mod.l}</div>
                <div style={{ fontSize:11, color:'#94A3B8', marginTop:2, lineHeight:1.4 }}>{mod.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progression par employé */}
      <div style={S.card}>
        <div style={S.cardTitle}>Progression par employé</div>
        {loading ? (
          <div style={S.empty}>Chargement…</div>
        ) : membres.length === 0 ? (
          <div style={S.empty}>Ajoutez des membres dans l'onglet Équipe pour suivre leur formation.</div>
        ) : (
          membres.map((m, i) => {
            const formation = m.formation || {}
            const done      = MODULES_FORMATION.filter(mod => formation[mod.k]).length
            const pct       = Math.round((done / MODULES_FORMATION.length) * 100)
            const isOpen    = expanded === m.id
            const roleInfo  = ROLES[m.role] || ROLES.employe
            const barColor  = pct === 100 ? '#10B981' : pct >= 60 ? '#3B82F6' : '#F59E0B'

            return (
              <div key={m.id} style={{ borderBottom: i < membres.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  style={{ width:'100%', background:'none', border:'none', padding:'12px 0', cursor:'pointer', fontFamily:F, textAlign:'left' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ ...S.avatar, background:`${roleInfo.color}18`, color:roleInfo.color, width:34, height:34, fontSize:12 }}>
                      {initials(m.name)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:13.5, fontWeight:700, color:'#0F172A' }}>{m.name}</span>
                        {pct === 100 && (
                          <span style={{ ...S.badge, background:'#ECFDF5', color:'#059669' }}>🎓 Certifié HACCP</span>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5 }}>
                        <div style={{ flex:1, height:6, background:'#E2E8F0', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:99, transition:'width .3s' }} />
                        </div>
                        <span style={{ fontSize:11, color:'#94A3B8', fontWeight:600, flexShrink:0 }}>{done}/{MODULES_FORMATION.length}</span>
                        <span style={{ fontSize:12, color:'#CBD5E1', flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ paddingBottom:12, paddingLeft:46 }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {MODULES_FORMATION.map(mod => {
                        const checked = !!formation[mod.k]
                        return (
                          <div key={mod.k} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background: checked ? '#F0FDF4' : '#F8FAFC', borderRadius:8, border:`1px solid ${checked ? '#A7F3D0' : '#E2E8F0'}` }}>
                            <span style={{ fontSize:16 }}>{mod.icon}</span>
                            <span style={{ flex:1, fontSize:12.5, fontWeight:500, color:'#0F172A' }}>{mod.l}</span>
                            {canManage ? (
                              <button
                                onClick={() => handleToggleModule(m.id, mod.k, checked)}
                                style={{ ...S.btnSm, background: checked ? '#ECFDF5' : '#F1F5F9', color: checked ? '#059669' : '#94A3B8', minWidth:78, flexShrink:0 }}
                              >
                                {checked ? '✓ Validé' : 'Valider'}
                              </button>
                            ) : (
                              <span style={{ fontSize:16 }}>{checked ? '✅' : '○'}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── TabOnboarding ──────────────────────────────────────────────────────────────

function TabOnboarding({ user, profile }) {
  const userRole  = profile?.role || 'employe'
  const canManage = canDo('gerer_equipe', userRole)

  const [viewRole,   setViewRole]   = useState(userRole)
  const [allChecked, setAllChecked] = useState(() => {
    const acc = {}
    ROLE_KEYS.forEach(r => {
      try { acc[r] = JSON.parse(localStorage.getItem(`aria_onboarding_${r}`) || '{}') } catch { acc[r] = {} }
    })
    return acc
  })
  const [ariaMsg,    setAriaMsg]    = useState('')
  const [generating, setGenerating] = useState(false)

  const checklist   = CHECKLISTS[viewRole] || CHECKLISTS.employe
  const roleChecked = allChecked[viewRole] || {}
  const doneCount   = checklist.filter(c => roleChecked[c.k]).length
  const pct         = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0

  function handleCheck(key) {
    const next = {
      ...allChecked,
      [viewRole]: { ...(allChecked[viewRole] || {}), [key]: !(allChecked[viewRole]?.[key]) },
    }
    setAllChecked(next)
    localStorage.setItem(`aria_onboarding_${viewRole}`, JSON.stringify(next[viewRole]))
  }

  async function handleAriaGuide() {
    setGenerating(true)
    setAriaMsg('')
    try {
      const roleInfo = ROLES[viewRole] || ROLES.employe
      const tasks    = checklist.map(c => c.l).join(', ')
      const prompt   = `Je suis un(e) nouveau(elle) ${roleInfo.label} qui commence à utiliser l'application Aria de gestion de cuisine. Guide-moi en 6-8 étapes concrètes pour bien démarrer. Mes premières tâches à effectuer : ${tasks}. Sois chaleureux, encourageant et très concret, adapté à mon rôle en cuisine.`
      const res      = await fetch('/api/aria', {
        method:  'POST',
        headers: { 'Content-Type':'application/json' },
        body:    JSON.stringify({ message:prompt, userId:user?.id, context:{ user_role:viewRole, user_name:profile?.name } }),
      })
      const data = await res.json()
      setAriaMsg(data.reply || "Bienvenue dans l'équipe !")
    } catch (e) {
      setAriaMsg('Erreur : ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Sélecteur rôle (managers uniquement) */}
      {canManage && (
        <div style={S.card}>
          <div style={S.cardTitle}>Aperçu par rôle</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {ROLE_KEYS.map(r => {
              const ri = ROLES[r] || {}
              return (
                <button
                  key={r}
                  onClick={() => setViewRole(r)}
                  style={{ ...S.btnSm, background: viewRole === r ? '#EFF6FF' : '#F8FAFC', color: viewRole === r ? '#2563EB' : '#475569', border:`1.5px solid ${viewRole === r ? '#2563EB' : '#E2E8F0'}` }}
                >
                  {ri.icon} {ri.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div style={S.card}>
        <div style={{ ...S.rowBetween, marginBottom:14 }}>
          <div style={{ ...S.cardTitle, marginBottom:0 }}>
            Checklist — {ROLES[viewRole]?.label}
          </div>
          <span style={{ fontSize:13, fontWeight:700, color: pct === 100 ? '#10B981' : '#2563EB' }}>{pct}%</span>
        </div>
        <div style={{ height:6, background:'#E2E8F0', borderRadius:99, overflow:'hidden', marginBottom:16 }}>
          <div style={{ height:'100%', width:`${pct}%`, background: pct === 100 ? '#10B981' : '#2563EB', borderRadius:99, transition:'width .4s' }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {checklist.map(item => {
            const done = !!roleChecked[item.k]
            return (
              <button
                key={item.k}
                onClick={() => handleCheck(item.k)}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', border:`1.5px solid ${done ? '#A7F3D0' : '#E2E8F0'}`, borderRadius:10, background: done ? '#F0FDF4' : '#F8FAFC', cursor:'pointer', fontFamily:F, textAlign:'left', width:'100%' }}
              >
                <span style={{ fontSize:18, flexShrink:0 }}>{done ? '✅' : '○'}</span>
                <span style={{ fontSize:13.5, fontWeight: done ? 600 : 500, color: done ? '#059669' : '#0F172A', textDecoration: done ? 'line-through' : 'none', opacity: done ? .8 : 1 }}>
                  {item.l}
                </span>
              </button>
            )
          })}
        </div>
        {pct === 100 && (
          <div style={{ marginTop:16, padding:'14px 16px', background:'linear-gradient(135deg,#ECFDF5,#D1FAE5)', borderRadius:12, border:'1px solid #A7F3D0', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🎉</div>
            <div style={{ fontSize:14, fontWeight:700, color:'#059669' }}>Onboarding terminé !</div>
            <div style={{ fontSize:12, color:'#065F46', marginTop:2 }}>Vous êtes prêt(e) à utiliser Aria pleinement.</div>
          </div>
        )}
      </div>

      {/* Guide Aria */}
      <div style={{ ...S.card, border:'1px solid #BFDBFE', background:'#EFF6FF' }}>
        <div style={{ ...S.rowBetween, marginBottom: ariaMsg ? 12 : 0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#1E40AF' }}>✦ Guide Aria personnalisé</div>
            <div style={{ fontSize:12, color:'#3B82F6', marginTop:2 }}>
              Aria vous oriente selon votre rôle {ROLES[viewRole]?.label}
            </div>
          </div>
          <button
            onClick={handleAriaGuide}
            disabled={generating}
            style={{ ...S.btnSm, background:'#2563EB', color:'#fff', opacity: generating ? .7 : 1, flexShrink:0 }}
          >
            {generating ? '⟳ Génération…' : 'Me guider'}
          </button>
        </div>
        {ariaMsg && (
          <div style={{ fontSize:13, color:'#1E40AF', lineHeight:1.75, whiteSpace:'pre-wrap', borderTop:'1px solid #BFDBFE', paddingTop:12 }}>
            {ariaMsg}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Equipe({ user, profile, fromDashboard, onBack }) {
  const [tab,      setTab]      = useState('equipe')
  const [membres,  setMembres]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    fetchEquipeMembres(user.id).then(({ data }) => {
      if (data) setMembres(data)
      setLoading(false)
    })
  }, [user])

  const TABS = [
    { k:'equipe',     l:'Équipe',     emoji:'👥' },
    { k:'formation',  l:'Formation',  emoji:'🎓' },
    { k:'onboarding', l:'Onboarding', emoji:'🚀' },
  ]

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button style={S.backBtn} onClick={onBack}>← Retour</button>
      )}
      <div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0 }}>Équipe & Formation</h2>
        <p style={{ fontSize:13, color:'#94A3B8', margin:'2px 0 0' }}>
          {profile?.name ? `${profile.name} · ` : ''}Gestion des membres, formations HACCP et onboarding
        </p>
      </div>

      <div style={S.tabs}>
        {TABS.map(t => (
          <button
            key={t.k}
            style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}) }}
            onClick={() => setTab(t.k)}
          >
            <span>{t.emoji}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      {tab === 'equipe'     && <TabEquipe     user={user} profile={profile} membres={membres} setMembres={setMembres} loading={loading} />}
      {tab === 'formation'  && <TabFormation  profile={profile} membres={membres} setMembres={setMembres} loading={loading} />}
      {tab === 'onboarding' && <TabOnboarding user={user} profile={profile} />}
    </div>
  )
}
