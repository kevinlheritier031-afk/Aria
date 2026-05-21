import { useState, useEffect } from 'react'
import { supabase, fetchFournisseurs, deleteFournisseur } from '../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const JOURS       = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche']
const TYPE_ETAB   = ['restaurant','brasserie','pizzeria','café','traiteur','autre']
const PLAN_LABELS = { starter:'Starter', pro:'Pro', restaurant_plus:'Restaurant+' }

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  card:      { background:'#fff', borderRadius:16, padding:'20px 20px 16px', marginBottom:14, boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1px solid #F1F5F9' },
  dangerCard:{ background:'#fff', borderRadius:16, padding:'20px 20px 16px', marginBottom:14, boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1.5px solid #FEE2E2' },
  title:     { fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:14, display:'flex', alignItems:'center', gap:8 },
  label:     { fontSize:11.5, fontWeight:600, color:'#64748B', marginBottom:4, display:'block', textTransform:'uppercase', letterSpacing:'.4px' },
  input:     { width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, fontFamily:'inherit', outline:'none', background:'#F8FAFC', color:'#1E293B', boxSizing:'border-box' },
  inputSm:   { padding:'8px 10px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', background:'#F8FAFC', color:'#1E293B', width:'100%', boxSizing:'border-box' },
  btnPrimary:{ padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'#fff', fontWeight:600, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' },
  btnDanger: { padding:'10px 20px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#EF4444,#DC2626)', color:'#fff', fontWeight:600, fontSize:13.5, cursor:'pointer', fontFamily:'inherit' },
  btnGhost:  { padding:'8px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#F8FAFC', color:'#475569', fontWeight:500, fontSize:13, cursor:'pointer', fontFamily:'inherit' },
  divider:   { height:1, background:'#F1F5F9', margin:'14px 0' },
  badge:     { padding:'2px 9px', borderRadius:20, background:'#FEF3C7', color:'#92400E', fontSize:11.5, fontWeight:500 },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(15,23,42,.55)', backdropFilter:'blur(4px)', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'28px 24px', maxWidth:320, width:'100%', boxShadow:'0 24px 64px rgba(0,0,0,.18)', fontFamily:"'Plus Jakarta Sans',sans-serif", textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
        <div style={{ fontSize:15, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Confirmation</div>
        <div style={{ fontSize:13.5, color:'#64748B', marginBottom:22, lineHeight:1.5 }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel}  style={{ flex:1, ...S.btnGhost }}>Annuler</button>
          <button onClick={onConfirm} style={{ flex:1, ...S.btnDanger }}>Confirmer</button>
        </div>
      </div>
    </div>
  )
}

function Toast({ msg, type }) {
  return (
    <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', zIndex:1001, background: type === 'success' ? '#10B981' : '#EF4444', color:'#fff', padding:'10px 20px', borderRadius:12, fontSize:13.5, fontWeight:500, boxShadow:'0 8px 24px rgba(0,0,0,.2)', whiteSpace:'nowrap', pointerEvents:'none' }}>
      {type === 'success' ? '✓ ' : '✗ '}{msg}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Parametres({ user, profile: initProfile, setProfile, onLogout, fromDashboard, onBack }) {
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState({})
  const [confirm,     setConfirm]     = useState(null)
  const [toast,       setToast]       = useState(null)

  // Compte
  const [displayName, setDisplayName] = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [pwdConfirm,  setPwdConfirm]  = useState('')

  // Établissement
  const [etab,        setEtab]        = useState({})
  const [etabNom,     setEtabNom]     = useState('')
  const [etabType,    setEtabType]    = useState('')
  const [etabEmpl,    setEtabEmpl]    = useState('')

  // Zones HACCP
  const [zones,       setZones]       = useState([])

  // Fournisseurs
  const [fours,       setFours]       = useState([])

  // Business
  const [ticket,      setTicket]      = useState('')
  const [marge,       setMarge]       = useState('')
  const [devise,      setDevise]      = useState('€')

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const isSaving = (key) => !!saving[key]
  const startSave = (key) => setSaving(p => ({ ...p, [key]: true }))
  const endSave   = (key) => setSaving(p => ({ ...p, [key]: false }))

  // ── Load all data ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [profRes, etabRes, zoneRes, fourRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('etablissements').select('*').eq('owner_id', user.id).single(),
          supabase.from('haccp_zones').select('*').eq('etablissement_id', user.id).order('created_at', { ascending: true }),
          fetchFournisseurs(user.id),
        ])

        if (profRes.data) {
          setDisplayName(profRes.data.name || '')
        } else {
          setDisplayName(initProfile?.name || '')
        }

        if (etabRes.data) {
          const e = etabRes.data
          setEtab(e)
          setEtabNom(e.nom || '')
          setEtabType(e.type || '')
          setEtabEmpl(e.nb_employes || '')
          const s = e.settings || {}
          setTicket(s.ticket_moyen !== undefined ? String(s.ticket_moyen) : '')
          setMarge(s.objectif_marge !== undefined ? String(s.objectif_marge) : '')
          setDevise(s.devise || '€')
        }

        if (zoneRes.data) setZones(zoneRes.data.map(z => ({ ...z, _uid: z.id })))
        if (fourRes.data) setFours(fourRes.data.map(f => ({ ...f, _uid: f.id })))
      } catch (err) {
        console.error('[Parametres] load:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id, initProfile?.name])

  // ── Compte ─────────────────────────────────────────────────────────────────
  const saveCompte = async () => {
    startSave('compte')
    try {
      const { error } = await supabase.from('profiles').update({ name: displayName }).eq('id', user.id)
      if (error) throw error
      if (setProfile) setProfile(p => ({ ...p, name: displayName }))
      showToast('Nom mis à jour')
    } catch { showToast('Erreur lors de la sauvegarde', 'error') }
    endSave('compte')
  }

  const savePwd = async () => {
    if (!newPwd || newPwd.length < 6) return showToast('Mot de passe trop court (min 6 car.)', 'error')
    if (newPwd !== pwdConfirm) return showToast('Les mots de passe ne correspondent pas', 'error')
    startSave('pwd')
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setNewPwd(''); setPwdConfirm('')
      showToast('Mot de passe modifié')
    } catch (err) { showToast(err.message || 'Erreur', 'error') }
    endSave('pwd')
  }

  // ── Établissement ──────────────────────────────────────────────────────────
  const saveEtab = async () => {
    startSave('etab')
    try {
      const payload = { owner_id: user.id, nom: etabNom, type: etabType, nb_employes: etabEmpl }
      const { error } = await supabase.from('etablissements').upsert(payload, { onConflict: 'owner_id' })
      if (error) throw error
      setEtab(p => ({ ...p, ...payload }))
      showToast('Établissement enregistré')
    } catch { showToast('Erreur lors de la sauvegarde', 'error') }
    endSave('etab')
  }

  // ── Zones HACCP ────────────────────────────────────────────────────────────
  const updateZone = (uid, field, value) =>
    setZones(prev => prev.map(z => z._uid === uid ? { ...z, [field]: value } : z))

  const saveZone = async (zone) => {
    const key = `zone_${zone._uid}`
    startSave(key)
    try {
      if (zone.id) {
        const { error } = await supabase.from('haccp_zones')
          .update({ nom: zone.nom, temp_min: zone.temp_min, temp_max: zone.temp_max })
          .eq('id', zone.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('haccp_zones')
          .insert({ nom: zone.nom, temp_min: zone.temp_min, temp_max: zone.temp_max, etablissement_id: user.id })
          .select().single()
        if (error) throw error
        setZones(prev => prev.map(z => z._uid === zone._uid ? { ...data, _uid: zone._uid } : z))
      }
      showToast(`Zone "${zone.nom}" enregistrée`)
    } catch { showToast('Erreur lors de la sauvegarde', 'error') }
    endSave(key)
  }

  const addZone = () =>
    setZones(prev => [...prev, { _uid: Date.now(), id: null, nom: '', temp_min: 0, temp_max: 4 }])

  const confirmDeleteZone = (zone) =>
    setConfirm({
      msg: `Supprimer la zone "${zone.nom}" ?`,
      onConfirm: async () => {
        if (zone.id) await supabase.from('haccp_zones').delete().eq('id', zone.id)
        setZones(prev => prev.filter(z => z._uid !== zone._uid))
        setConfirm(null)
        showToast('Zone supprimée')
      },
    })

  // ── Fournisseurs ───────────────────────────────────────────────────────────
  const updateFour = (uid, field, value) =>
    setFours(prev => prev.map(f => f._uid === uid ? { ...f, [field]: value } : f))

  const toggleJour = (uid, jour) =>
    setFours(prev => prev.map(f => {
      if (f._uid !== uid) return f
      const jours = f.jours || []
      return { ...f, jours: jours.includes(jour) ? jours.filter(j => j !== jour) : [...jours, jour] }
    }))

  const saveFour = async (f) => {
    const key = `four_${f._uid}`
    startSave(key)
    try {
      const payload = {
        nom: f.nom, mode: f.mode || 'tel',
        tel: f.tel || null, email: f.email || null,
        jours: f.jours || [], heure_limite: f.heure_limite || '09:00',
        user_id: user.id, etablissement_id: user.id,
      }
      if (f.id) {
        const { error } = await supabase.from('fournisseurs').update(payload).eq('id', f.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('fournisseurs').insert(payload).select().single()
        if (error) throw error
        setFours(prev => prev.map(x => x._uid === f._uid ? { ...data, _uid: f._uid } : x))
      }
      showToast(`Fournisseur "${f.nom}" enregistré`)
    } catch { showToast('Erreur lors de la sauvegarde', 'error') }
    endSave(key)
  }

  const addFour = () =>
    setFours(prev => [...prev, { _uid: Date.now(), id: null, nom: '', mode: 'tel', tel: '', email: '', jours: [] }])

  const confirmDeleteFour = (f) =>
    setConfirm({
      msg: `Supprimer le fournisseur "${f.nom}" ?`,
      onConfirm: async () => {
        if (f.id) await deleteFournisseur(f.id)
        setFours(prev => prev.filter(x => x._uid !== f._uid))
        setConfirm(null)
        showToast('Fournisseur supprimé')
      },
    })

  // ── Business ───────────────────────────────────────────────────────────────
  const saveBusiness = async () => {
    startSave('business')
    try {
      const settings = { ...(etab.settings || {}), ticket_moyen: Number(ticket) || 0, objectif_marge: Number(marge) || 0, devise }
      const { error } = await supabase.from('etablissements').update({ settings }).eq('owner_id', user.id)
      if (error) throw error
      setEtab(p => ({ ...p, settings }))
      showToast('Paramètres business enregistrés')
    } catch { showToast('Erreur lors de la sauvegarde', 'error') }
    endSave('business')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#94A3B8', fontSize:14 }}>
        Chargement…
      </div>
    )
  }

  const avatarLetter = (displayName || initProfile?.name || '?')[0]?.toUpperCase() || '?'
  const planLabel    = PLAN_LABELS[etab.abonnement || 'starter'] || 'Starter'

  return (
    <div style={{ padding:'16px 16px 80px', maxWidth:640, margin:'0 auto', fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" }}>

      {fromDashboard && (
        <button onClick={onBack} style={{ marginBottom:14, background:'none', border:'none', color:'#2563EB', fontWeight:600, fontSize:14, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:6 }}>
          ← Retour
        </button>
      )}

      <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', marginBottom:18, marginTop:0 }}>⚙️ Paramètres</h1>

      {/* ── 1. Mon compte ──────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.title}>👤 Mon compte</div>

        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:50, height:50, borderRadius:'50%', background:'linear-gradient(135deg,#2563EB,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20, fontWeight:700, flexShrink:0 }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ fontWeight:600, fontSize:14, color:'#0F172A' }}>{displayName || '—'}</div>
            <div style={{ fontSize:12, color:'#94A3B8' }}>{user?.email}</div>
          </div>
        </div>

        <label style={S.label}>Prénom / Nom d'affichage</label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ ...S.input, marginBottom:12 }} placeholder="Votre prénom et nom" />

        <label style={S.label}>Email</label>
        <input value={user?.email || ''} readOnly style={{ ...S.input, marginBottom:14, background:'#F1F5F9', color:'#94A3B8', cursor:'not-allowed' }} />

        <button onClick={saveCompte} disabled={isSaving('compte')} style={{ ...S.btnPrimary, opacity: isSaving('compte') ? .6 : 1 }}>
          {isSaving('compte') ? 'Enregistrement…' : 'Enregistrer le nom'}
        </button>

        <div style={S.divider} />

        <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:10 }}>🔒 Changer le mot de passe</div>
        <label style={S.label}>Nouveau mot de passe</label>
        <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ ...S.input, marginBottom:10 }} placeholder="Min. 6 caractères" />
        <label style={S.label}>Confirmer</label>
        <input type="password" value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} style={{ ...S.input, marginBottom:14 }} placeholder="Répéter le mot de passe" />
        <button onClick={savePwd} disabled={isSaving('pwd')} style={{ ...S.btnGhost, opacity: isSaving('pwd') ? .6 : 1 }}>
          {isSaving('pwd') ? 'Modification…' : 'Modifier le mot de passe'}
        </button>
      </div>

      {/* ── 2. Mon établissement ───────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.title}>🏠 Mon établissement</div>
        <label style={S.label}>Nom</label>
        <input value={etabNom} onChange={e => setEtabNom(e.target.value)} style={{ ...S.input, marginBottom:12 }} placeholder="Nom du restaurant" />
        <label style={S.label}>Type</label>
        <select value={etabType} onChange={e => setEtabType(e.target.value)} style={{ ...S.input, marginBottom:12 }}>
          <option value="">— Choisir —</option>
          {TYPE_ETAB.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <label style={S.label}>Nombre d'employés</label>
        <input value={etabEmpl} onChange={e => setEtabEmpl(e.target.value)} style={{ ...S.input, marginBottom:14 }} placeholder="Ex : 5" />
        <button onClick={saveEtab} disabled={isSaving('etab')} style={{ ...S.btnPrimary, opacity: isSaving('etab') ? .6 : 1 }}>
          {isSaving('etab') ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {/* ── 3. Zones HACCP ─────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.title}>🌡️ Zones HACCP</div>
        {zones.length === 0 && (
          <div style={{ fontSize:13, color:'#94A3B8', marginBottom:12 }}>Aucune zone configurée.</div>
        )}
        {zones.map(zone => (
          <div key={zone._uid} style={{ background:'#F8FAFC', borderRadius:12, padding:'12px 14px', marginBottom:10, border:'1px solid #E2E8F0' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8, marginBottom:8 }}>
              <div>
                <label style={{ ...S.label, marginBottom:3 }}>Zone</label>
                <input value={zone.nom} onChange={e => updateZone(zone._uid, 'nom', e.target.value)} style={S.inputSm} placeholder="Ex : Frigo viandes" />
              </div>
              <div>
                <label style={{ ...S.label, marginBottom:3 }}>T° min (°C)</label>
                <input type="number" value={zone.temp_min} onChange={e => updateZone(zone._uid, 'temp_min', Number(e.target.value))} style={S.inputSm} />
              </div>
              <div>
                <label style={{ ...S.label, marginBottom:3 }}>T° max (°C)</label>
                <input type="number" value={zone.temp_max} onChange={e => updateZone(zone._uid, 'temp_max', Number(e.target.value))} style={S.inputSm} />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => confirmDeleteZone(zone)} style={{ ...S.btnGhost, fontSize:12, padding:'6px 12px', color:'#EF4444', borderColor:'#FECACA' }}>
                Supprimer
              </button>
              <button onClick={() => saveZone(zone)} disabled={isSaving(`zone_${zone._uid}`)} style={{ ...S.btnPrimary, fontSize:12, padding:'6px 14px', opacity: isSaving(`zone_${zone._uid}`) ? .6 : 1 }}>
                {isSaving(`zone_${zone._uid}`) ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ))}
        <button onClick={addZone} style={{ ...S.btnGhost, fontSize:13, width:'100%' }}>
          + Ajouter une zone
        </button>
      </div>

      {/* ── 4. Fournisseurs ────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.title}>🚚 Fournisseurs</div>
        {fours.length === 0 && (
          <div style={{ fontSize:13, color:'#94A3B8', marginBottom:12 }}>Aucun fournisseur configuré.</div>
        )}
        {fours.map(f => (
          <div key={f._uid} style={{ background:'#F8FAFC', borderRadius:12, padding:'12px 14px', marginBottom:10, border:'1px solid #E2E8F0' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div>
                <label style={{ ...S.label, marginBottom:3 }}>Nom</label>
                <input value={f.nom} onChange={e => updateFour(f._uid, 'nom', e.target.value)} style={S.inputSm} placeholder="Nom du fournisseur" />
              </div>
              <div>
                <label style={{ ...S.label, marginBottom:3 }}>Mode commande</label>
                <select value={f.mode || 'tel'} onChange={e => updateFour(f._uid, 'mode', e.target.value)} style={S.inputSm}>
                  <option value="tel">Téléphone</option>
                  <option value="email">Email</option>
                  <option value="edi">EDI</option>
                  <option value="site">Site web</option>
                </select>
              </div>
              <div>
                <label style={{ ...S.label, marginBottom:3 }}>Téléphone</label>
                <input value={f.tel || ''} onChange={e => updateFour(f._uid, 'tel', e.target.value)} style={S.inputSm} placeholder="06 xx xx xx xx" />
              </div>
              <div>
                <label style={{ ...S.label, marginBottom:3 }}>Email</label>
                <input value={f.email || ''} onChange={e => updateFour(f._uid, 'email', e.target.value)} style={S.inputSm} placeholder="commandes@..." />
              </div>
            </div>
            <div style={{ marginBottom:8 }}>
              <label style={{ ...S.label, marginBottom:4 }}>Jours de livraison</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {JOURS.map(j => {
                  const active = (f.jours || []).includes(j)
                  return (
                    <button
                      key={j}
                      onClick={() => toggleJour(f._uid, j)}
                      style={{ padding:'4px 9px', borderRadius:20, fontSize:11.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit', border: active ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0', background: active ? '#DBEAFE' : '#F8FAFC', color: active ? '#1D4ED8' : '#64748B' }}
                    >
                      {j.slice(0, 3)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => confirmDeleteFour(f)} style={{ ...S.btnGhost, fontSize:12, padding:'6px 12px', color:'#EF4444', borderColor:'#FECACA' }}>
                Supprimer
              </button>
              <button onClick={() => saveFour(f)} disabled={isSaving(`four_${f._uid}`)} style={{ ...S.btnPrimary, fontSize:12, padding:'6px 14px', opacity: isSaving(`four_${f._uid}`) ? .6 : 1 }}>
                {isSaving(`four_${f._uid}`) ? '…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ))}
        <button onClick={addFour} style={{ ...S.btnGhost, fontSize:13, width:'100%' }}>
          + Ajouter un fournisseur
        </button>
      </div>

      {/* ── 5. Business ────────────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.title}>📊 Paramètres business</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label style={S.label}>Ticket moyen (€ / couvert)</label>
            <input type="number" value={ticket} onChange={e => setTicket(e.target.value)} style={S.input} placeholder="Ex : 32" />
          </div>
          <div>
            <label style={S.label}>Objectif marge brute (%)</label>
            <input type="number" value={marge} onChange={e => setMarge(e.target.value)} style={S.input} placeholder="Ex : 68" />
          </div>
          <div>
            <label style={S.label}>Devise</label>
            <select value={devise} onChange={e => setDevise(e.target.value)} style={S.input}>
              <option value="€">€ Euro</option>
              <option value="$">$ Dollar</option>
              <option value="CHF">CHF Franc suisse</option>
              <option value="£">£ Livre sterling</option>
            </select>
          </div>
        </div>
        <button onClick={saveBusiness} disabled={isSaving('business')} style={{ ...S.btnPrimary, opacity: isSaving('business') ? .6 : 1 }}>
          {isSaving('business') ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {/* ── 6. Plan tarifaire ──────────────────────────────────────────────── */}
      <div style={S.card}>
        <div style={S.title}>💎 Plan tarifaire</div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ padding:'4px 14px', borderRadius:20, background:'linear-gradient(135deg,#2563EB,#7C3AED)', color:'#fff', fontSize:13, fontWeight:600 }}>
            {planLabel}
          </span>
          <span style={{ fontSize:13, color:'#64748B' }}>Plan actuel</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button disabled style={{ ...S.btnGhost, opacity:.45, cursor:'not-allowed' }}>Changer de plan</button>
          <span style={S.badge}>Contacter le support</span>
        </div>
      </div>

      {/* ── 7. Zone de danger ──────────────────────────────────────────────── */}
      <div style={S.dangerCard}>
        <div style={{ ...S.title, color:'#EF4444' }}>⚠️ Zone de danger</div>

        <div>
          <div style={{ fontSize:13.5, fontWeight:600, color:'#0F172A', marginBottom:3 }}>Se déconnecter</div>
          <div style={{ fontSize:12.5, color:'#94A3B8', marginBottom:10 }}>Vous serez redirigé vers la page de connexion.</div>
          <button
            onClick={() => setConfirm({ msg:'Êtes-vous sûr de vouloir vous déconnecter ?', onConfirm: () => { setConfirm(null); onLogout() } })}
            style={{ ...S.btnGhost, borderColor:'#FECACA', color:'#DC2626' }}
          >
            Me déconnecter
          </button>
        </div>

        <div style={S.divider} />

        <div>
          <div style={{ fontSize:13.5, fontWeight:600, color:'#0F172A', marginBottom:3 }}>Supprimer mon compte</div>
          <div style={{ fontSize:12.5, color:'#94A3B8', marginBottom:10 }}>Action irréversible — toutes les données seront supprimées définitivement.</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button disabled style={{ ...S.btnDanger, opacity:.35, cursor:'not-allowed' }}>Supprimer mon compte</button>
            <span style={S.badge}>Contacter le support</span>
          </div>
        </div>
      </div>

      {confirm && <ConfirmModal message={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}
      {toast   && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}
