import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const F = "'Plus Jakarta Sans','DM Sans','Inter',sans-serif"

const ETAPES = [
  { key: '0min',  label: '0 min', ms: 0,        seuil: null },
  { key: '30min', label: '30 min', ms: 1800000,  seuil: 25  },
  { key: '1h',    label: '1 h',   ms: 3600000,  seuil: null },
  { key: '2h',    label: '2 h',   ms: 7200000,  seuil: 10  },
]

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function elapsed(ts) {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

// ── TempModal ──────────────────────────────────────────────────────────────────

function TempModal({ title, sub, extra, onClose, onSubmit, saving }) {
  const [val, setVal]     = useState('')
  const [ext, setExt]     = useState('')
  const inputRef          = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150) }, [])

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.handle} />
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 16 }}>{sub}</div>}
        {extra && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>{extra.label}</label>
            <input value={ext} onChange={e => setExt(e.target.value)} style={S.input} placeholder={extra.placeholder} />
          </div>
        )}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="0.0"
            style={{ fontSize: 52, fontWeight: 800, color: '#0F172A', border: 'none', borderBottom: '3px solid #2563EB', textAlign: 'center', width: '100%', outline: 'none', background: 'transparent', padding: '8px 0', fontFamily: F }}
          />
          <div style={{ fontSize: 18, color: '#94A3B8', marginTop: 4 }}>°C</div>
        </div>
        <button
          onClick={() => val !== '' && onSubmit(parseFloat(val), ext)}
          disabled={val === '' || saving}
          style={{ ...S.btnP, width: '100%', marginTop: 20, opacity: (val === '' || saving) ? .5 : 1 }}
        >
          {saving ? 'Enregistrement…' : 'Valider la mesure'}
        </button>
      </div>
    </div>
  )
}

// ── FeedbackModal ──────────────────────────────────────────────────────────────

function FeedbackModal({ conforme, valeur, seuil, onClose }) {
  const ok    = conforme === true
  const noRef = conforme === null
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.sheet, textAlign: 'center', padding: '32px 24px 40px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{noRef ? 'ℹ️' : ok ? '✅' : '⚠️'}</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: noRef ? '#0F172A' : ok ? '#16A34A' : '#DC2626' }}>
          {noRef ? 'Mesure enregistrée' : ok ? 'Conforme' : 'Hors norme'}
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
          {valeur.toFixed(1)} °C
        </div>
        {seuil !== null && !noRef && (
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16 }}>
            {ok ? `Seuil respecté (${seuil} °C)` : `Seuil dépassé — limite ${seuil} °C`}
          </div>
        )}
        {!ok && !noRef && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 20, textAlign: 'left' }}>
            Alertez votre responsable et appliquez la procédure de non-conformité.
          </div>
        )}
        <button onClick={onClose} style={{ ...S.btnP, width: '100%', background: noRef ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : ok ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
          OK
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function Haccp({ user, profile, fromDashboard, onBack }) {
  const [tab,     setTab]     = useState(0)
  const [eid,     setEid]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Froid
  const [zones,      setZones]      = useState([])
  const [appareils,  setAppareils]  = useState([])
  const [temps,      setTemps]      = useState([])
  const [expanded,   setExpanded]   = useState({})
  const [tempModal,  setTempModal]  = useState(null)
  const [zonesModal, setZonesModal] = useState(false)

  // Zones manager form
  const [newZNom,     setNewZNom]     = useState('')
  const [newZType,    setNewZType]    = useState('froid')
  const [newApZone,   setNewApZone]   = useState('')
  const [newApNom,    setNewApNom]    = useState('')
  const [newApMin,    setNewApMin]    = useState('')
  const [newApMax,    setNewApMax]    = useState('')
  const [savingZone,  setSavingZone]  = useState(false)

  // Chaud
  const [settings,      setSettings]      = useState({ nb_prises_chaud_par_service: 2 })
  const [chaudModal,    setChaudModal]    = useState(false)
  const [settingsModal, setSettingsModal] = useState(false)
  const [serviceDebut]                    = useState(() => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))

  // Refroidissement
  const [plats,      setPlats]      = useState([])
  const [platsDone,  setPlatsDone]  = useState([])
  const [platModal,  setPlatModal]  = useState(false)
  const [etapeModal, setEtapeModal] = useState(null)
  const [newPlatNom,   setNewPlatNom]   = useState('')
  const [newPlatHeure, setNewPlatHeure] = useState(() => new Date().toTimeString().slice(0, 5))

  // Timer for refroidissement display
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: etab } = await supabase.from('etablissements').select('id').eq('owner_id', user.id).single()
      if (!etab) return
      const realEid = etab.id
      setEid(realEid)

      const since24h = new Date(Date.now() - 86400000).toISOString()
      const [zonesRes, apRes, settRes, platsRes, tempsRes] = await Promise.all([
        supabase.from('haccp_zones').select('*').eq('etablissement_id', realEid).order('nom'),
        supabase.from('haccp_appareils').select('*').eq('etablissement_id', realEid).order('nom'),
        supabase.from('haccp_settings').select('*').eq('etablissement_id', realEid).maybeSingle(),
        supabase.from('haccp_plats_refroidissement').select('*').eq('etablissement_id', realEid).order('created_at', { ascending: false }),
        supabase.from('haccp_temperatures').select('*').eq('etablissement_id', realEid).gte('created_at', since24h).order('created_at', { ascending: false }),
      ])

      if (zonesRes.data)    setZones(zonesRes.data)
      if (apRes.data)       setAppareils(apRes.data)
      if (settRes.data)     setSettings(settRes.data)
      if (tempsRes.data)    setTemps(tempsRes.data)
      if (platsRes.data) {
        setPlats(platsRes.data.filter(p => p.statut === 'en_cours'))
        setPlatsDone(platsRes.data.filter(p => p.statut !== 'en_cours' && new Date(p.created_at) > new Date(Date.now() - 86400000)))
      }
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => { load() }, [load])

  // ── Froid ──────────────────────────────────────────────────────────────────
  const takeFroidTemp = async (valeur) => {
    if (!tempModal || !eid) return
    setSaving(true)
    const { appareil, zone } = tempModal
    const conforme = (appareil.temp_min !== null && appareil.temp_max !== null)
      ? (valeur >= appareil.temp_min && valeur <= appareil.temp_max)
      : null
    const { data } = await supabase.from('haccp_temperatures').insert({
      etablissement_id: eid, appareil_id: appareil.id, zone_id: zone.id,
      type: 'froid', valeur, conforme, prise_par: user.id,
    }).select().single()
    if (data) setTemps(p => [data, ...p])
    setSaving(false)
    setTempModal(null)
    setFeedback({ conforme, valeur, seuil: appareil.temp_max ?? null })
  }

  const addZone = async () => {
    if (!newZNom.trim() || !eid) return
    setSavingZone(true)
    const { data } = await supabase.from('haccp_zones').insert({ etablissement_id: eid, nom: newZNom.trim(), type: newZType }).select().single()
    if (data) setZones(p => [...p, data])
    setNewZNom('')
    setSavingZone(false)
  }

  const addAppareil = async () => {
    if (!newApNom.trim() || !newApZone || !eid) return
    setSavingZone(true)
    const { data } = await supabase.from('haccp_appareils').insert({
      etablissement_id: eid, zone_id: newApZone, nom: newApNom.trim(),
      temp_min: newApMin !== '' ? parseFloat(newApMin) : null,
      temp_max: newApMax !== '' ? parseFloat(newApMax) : null,
    }).select().single()
    if (data) setAppareils(p => [...p, data])
    setNewApNom(''); setNewApMin(''); setNewApMax(''); setNewApZone('')
    setSavingZone(false)
  }

  // ── Chaud ──────────────────────────────────────────────────────────────────
  const takeChaudTemp = async (valeur, platNom) => {
    if (!eid) return
    setSaving(true)
    const conforme = valeur >= 63
    const { data } = await supabase.from('haccp_temperatures').insert({
      etablissement_id: eid, type: 'chaud', valeur,
      conforme, prise_par: user.id, plat_nom: platNom || null,
    }).select().single()
    if (data) setTemps(p => [data, ...p])
    setSaving(false)
    setChaudModal(false)
    setFeedback({ conforme, valeur, seuil: 63 })
  }

  const saveSettings = async (nb) => {
    if (!eid) return
    await supabase.from('haccp_settings').upsert({ etablissement_id: eid, nb_prises_chaud_par_service: nb }, { onConflict: 'etablissement_id' })
    setSettings(p => ({ ...p, nb_prises_chaud_par_service: nb }))
    setSettingsModal(false)
  }

  // ── Refroidissement ────────────────────────────────────────────────────────
  const addPlatCellule = async () => {
    if (!newPlatNom.trim() || !eid) return
    setSaving(true)
    const [h, m] = newPlatHeure.split(':').map(Number)
    const debut = new Date(); debut.setHours(h, m, 0, 0)
    const { data } = await supabase.from('haccp_plats_refroidissement').insert({
      etablissement_id: eid, nom: newPlatNom.trim(),
      debut_cellule: debut.toISOString(), statut: 'en_cours', prise_par: user.id,
    }).select().single()
    if (data) setPlats(p => [data, ...p])
    setSaving(false)
    setPlatModal(false)
    setNewPlatNom('')
    setNewPlatHeure(new Date().toTimeString().slice(0, 5))
  }

  const takeRefroidTemp = async (valeur, _ext, plat, etape) => {
    if (!eid) return
    setSaving(true)
    const conforme = etape.seuil !== null ? valeur < etape.seuil : null
    const { data: tData } = await supabase.from('haccp_temperatures').insert({
      etablissement_id: eid, type: 'refroidissement', valeur, conforme,
      prise_par: user.id, plat_nom: plat.nom, refroidissement_etape: etape.key,
    }).select().single()

    const newTemps = tData ? [tData, ...temps] : temps
    setTemps(newTemps)

    // Check completion
    const platTemps = newTemps.filter(t => t.type === 'refroidissement' && t.plat_nom === plat.nom)
    const nonConf   = platTemps.some(t => t.conforme === false)
    const allDone   = ETAPES.every(e => platTemps.some(t => t.refroidissement_etape === e.key))

    if (allDone || nonConf) {
      const statut = nonConf ? 'non_conforme' : 'conforme'
      await supabase.from('haccp_plats_refroidissement').update({ statut }).eq('id', plat.id)
      setPlats(p => p.filter(x => x.id !== plat.id))
      setPlatsDone(p => [{ ...plat, statut }, ...p])
    }

    setSaving(false)
    setEtapeModal(null)
    if (conforme !== null) setFeedback({ conforme, valeur, seuil: etape.seuil })
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ fontSize: 28, color: '#2563EB', animation: 'spin .8s linear infinite' }}>✦</div>
      </div>
    )
  }

  const todayStart  = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayTemps  = temps.filter(t => new Date(t.created_at) >= todayStart)
  const chaudToday  = todayTemps.filter(t => t.type === 'chaud')
  const nb          = settings?.nb_prises_chaud_par_service || 2
  const froidZones  = zones.filter(z => (z.type || 'froid') !== 'chaud')

  return (
    <>
      <style>{`
        @keyframes haccp-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,.5); }
          50%      { box-shadow: 0 0 0 6px rgba(37,99,235,0); }
        }
      `}</style>

      <div style={{ fontFamily: F, maxWidth: 640, margin: '0 auto', paddingBottom: 80 }}>

        {fromDashboard && (
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '12px 16px 0', background: 'none', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0, fontFamily: F }}>
            ← Retour
          </button>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '14px 16px 0', gap: 4, borderBottom: '1px solid #E2E8F0', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
          {['🌡️ Froid', '🔥 Chaud', '❄️ Refroid.'].map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{ flex: 1, padding: '10px 4px 12px', border: 'none', background: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: F, color: tab === i ? '#2563EB' : '#94A3B8', borderBottom: tab === i ? '2.5px solid #2563EB' : '2.5px solid transparent', transition: 'all .15s' }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ══════════════ ONGLET FROID ══════════════ */}
        {tab === 0 && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={S.sectionTitle}>Zones froides</div>
              <button onClick={() => setZonesModal(true)} style={S.btnGhost}>⚙️ Gérer</button>
            </div>

            {froidZones.length === 0 ? (
              <div style={S.empty}>
                Aucune zone configurée.<br />
                <button onClick={() => setZonesModal(true)} style={{ ...S.btnP, marginTop: 12 }}>+ Ajouter une zone</button>
              </div>
            ) : froidZones.map(zone => {
              const zoneAps = appareils.filter(a => a.zone_id === zone.id)
              return (
                <div key={zone.id} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                    <span>{zone.type === 'ambiant' ? '🌡️' : '🔵'}</span>
                    {zone.nom}
                    <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>({zone.type === 'ambiant' ? 'ambiant' : 'froid'})</span>
                  </div>
                  {zoneAps.length === 0 ? (
                    <div style={{ ...S.empty, padding: '12px 0', fontSize: 12 }}>Aucun appareil dans cette zone.</div>
                  ) : zoneAps.map(ap => {
                    const apTemps   = todayTemps.filter(t => t.appareil_id === ap.id)
                    const last      = apTemps[0]
                    const isExp     = !!expanded[ap.id]
                    const hasSeuil  = ap.temp_min !== null && ap.temp_max !== null
                    return (
                      <div key={ap.id} style={{ ...S.card, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{ap.nom}</div>
                            <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                              {hasSeuil ? `${ap.temp_min}°C – ${ap.temp_max}°C` : 'Pas de seuil'}
                            </div>
                          </div>
                          {last && (
                            <div style={{ padding: '4px 10px', borderRadius: 99, fontSize: 13, fontWeight: 700, border: '1.5px solid', flexShrink: 0, background: last.conforme === false ? '#FEF2F2' : last.conforme === true ? '#F0FDF4' : '#F8FAFC', color: last.conforme === false ? '#DC2626' : last.conforme === true ? '#16A34A' : '#64748B', borderColor: last.conforme === false ? '#FECACA' : last.conforme === true ? '#BBF7D0' : '#E2E8F0' }}>
                              {last.valeur.toFixed(1)}°
                            </div>
                          )}
                          <button onClick={() => setTempModal({ appareil: ap, zone })} style={{ width: 38, height: 38, borderRadius: 10, border: '1.5px solid #BFDBFE', background: '#EFF6FF', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            📝
                          </button>
                          <button onClick={() => setExpanded(p => ({ ...p, [ap.id]: !p[ap.id] }))} style={{ ...S.btnGhost, padding: '6px 8px', fontSize: 12 }}>
                            {isExp ? '▲' : '▼'}
                          </button>
                        </div>
                        {isExp && (
                          <div style={{ marginTop: 10, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                            {apTemps.length === 0 ? (
                              <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '6px 0' }}>Aucune mesure aujourd'hui.</div>
                            ) : apTemps.slice(0, 5).map(t => (
                              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: '#94A3B8', width: 44, flexShrink: 0 }}>{fmtTime(t.created_at)}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{t.valeur.toFixed(1)}°C</span>
                                <span>{t.conforme === true ? '✅' : t.conforme === false ? '⚠️' : '—'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════ ONGLET CHAUD ══════════════ */}
        {tab === 1 && (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ ...S.card, marginBottom: 16, background: 'linear-gradient(135deg,#FFF7ED,#FFFBEB)', borderColor: '#FED7AA' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Service en cours</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{serviceDebut}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Heure de début</div>
                </div>
                <button onClick={() => setSettingsModal(true)} style={S.btnGhost}>⚙️</button>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 12 }}>
              Prises de température ({chaudToday.length} / {nb} prévues)
            </div>

            {Array.from({ length: Math.max(nb, chaudToday.length + (chaudToday.length < nb ? 0 : 1)) }, (_, i) => {
              const done = chaudToday[i]
              return (
                <div key={i} style={{ ...S.card, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: done ? (done.conforme ? '#F0FDF4' : '#FEF2F2') : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? 18 : 14, fontWeight: 700, flexShrink: 0, color: done ? (done.conforme ? '#16A34A' : '#DC2626') : '#2563EB' }}>
                      {done ? (done.conforme ? '✅' : '⚠️') : `${i + 1}`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                        {done ? (done.plat_nom || 'Plat non renseigné') : `Prise ${i + 1}`}
                      </div>
                      {done && (
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>
                          {done.valeur.toFixed(1)}°C · {fmtTime(done.created_at)}
                        </div>
                      )}
                    </div>
                    {!done && (
                      <button onClick={() => setChaudModal(true)} style={S.btnP}>
                        Prendre
                      </button>
                    )}
                    {done && (
                      <div style={{ padding: '4px 10px', borderRadius: 99, fontSize: 13, fontWeight: 700, border: '1.5px solid', flexShrink: 0, background: done.conforme ? '#F0FDF4' : '#FEF2F2', color: done.conforme ? '#16A34A' : '#DC2626', borderColor: done.conforme ? '#BBF7D0' : '#FECACA' }}>
                        {done.valeur.toFixed(1)}°
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 14px', fontSize: 12.5, color: '#1D4ED8', marginTop: 12 }}>
              ℹ️ Maintien à chaud légal : minimum <strong>63 °C</strong> pendant tout le service.
            </div>
          </div>
        )}

        {/* ══════════════ ONGLET REFROIDISSEMENT ══════════════ */}
        {tab === 2 && (
          <div style={{ padding: '16px 16px 0' }}>
            <button onClick={() => setPlatModal(true)} style={{ ...S.btnP, width: '100%', marginBottom: 20 }}>
              ❄️ Mettre un plat en cellule
            </button>

            {plats.length > 0 && (
              <>
                <div style={{ ...S.sectionTitle, marginBottom: 10 }}>En cours de refroidissement</div>
                {plats.map(plat => {
                  const debut    = new Date(plat.debut_cellule)
                  const platTmps = temps.filter(t => t.type === 'refroidissement' && t.plat_nom === plat.nom)
                  return (
                    <div key={plat.id} style={{ ...S.card, marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{plat.nom}</div>
                          <div style={{ fontSize: 12, color: '#94A3B8' }}>
                            En cellule depuis {fmtTime(debut)} · {elapsed(debut)} écoulé
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ETAPES.map(etape => {
                          const due  = Date.now() >= debut.getTime() + etape.ms
                          const done = platTmps.find(t => t.refroidissement_etape === etape.key)
                          const active = due && !done
                          return (
                            <div key={etape.key} style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 5 }}>{etape.label}</div>
                              {done ? (
                                <div style={{ padding: '7px 4px', borderRadius: 10, background: done.conforme === false ? '#FEF2F2' : '#F0FDF4', fontSize: 11, fontWeight: 700, color: done.conforme === false ? '#DC2626' : '#16A34A' }}>
                                  {done.valeur.toFixed(1)}°
                                  <div style={{ fontSize: 10, marginTop: 2 }}>{done.conforme === false ? '⚠️' : '✅'}</div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => active && setEtapeModal({ plat, etape })}
                                  style={{ padding: '7px 4px', borderRadius: 10, border: '1.5px solid', width: '100%', cursor: active ? 'pointer' : 'default', fontSize: 14, fontWeight: 600, background: active ? '#EFF6FF' : '#F8FAFC', borderColor: active ? '#2563EB' : '#E2E8F0', color: active ? '#2563EB' : '#CBD5E1', animation: active ? 'haccp-pulse 1.5s ease-in-out infinite' : 'none', fontFamily: F }}
                                >
                                  {due ? '📝' : '⏳'}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {platsDone.length > 0 && (
              <>
                <div style={{ ...S.sectionTitle, marginTop: plats.length > 0 ? 16 : 0, marginBottom: 10 }}>Terminés (24 h)</div>
                {platsDone.map(p => (
                  <div key={p.id} style={{ ...S.card, marginBottom: 8, borderLeft: `4px solid ${p.statut === 'conforme' ? '#10B981' : '#EF4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{p.nom}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>Début : {fmtTime(p.debut_cellule)} · {p.statut}</div>
                      </div>
                      <span style={{ fontSize: 22 }}>{p.statut === 'conforme' ? '✅' : '⚠️'}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {plats.length === 0 && platsDone.length === 0 && (
              <div style={S.empty}>Aucun plat en refroidissement actuellement.</div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ MODALS ══════════════ */}

      {tempModal && (
        <TempModal
          title={tempModal.appareil.nom}
          sub={`Zone : ${tempModal.zone.nom} · ${tempModal.appareil.temp_min !== null ? `${tempModal.appareil.temp_min}°C – ${tempModal.appareil.temp_max}°C` : 'Pas de seuil'}`}
          onClose={() => setTempModal(null)}
          onSubmit={takeFroidTemp}
          saving={saving}
        />
      )}

      {chaudModal && (
        <TempModal
          title="Température à chaud"
          sub="Maintien chaud — minimum 63 °C"
          extra={{ label: 'Nom du plat (optionnel)', placeholder: 'Ex : Blanquette de veau' }}
          onClose={() => setChaudModal(false)}
          onSubmit={takeChaudTemp}
          saving={saving}
        />
      )}

      {etapeModal && (
        <TempModal
          title={`Refroidissement — ${etapeModal.etape.label}`}
          sub={`${etapeModal.plat.nom}${etapeModal.etape.seuil ? ` · Seuil : < ${etapeModal.etape.seuil} °C` : ''}`}
          onClose={() => setEtapeModal(null)}
          onSubmit={(val) => takeRefroidTemp(val, '', etapeModal.plat, etapeModal.etape)}
          saving={saving}
        />
      )}

      {feedback && (
        <FeedbackModal
          conforme={feedback.conforme}
          valeur={feedback.valeur}
          seuil={feedback.seuil}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Plat en cellule */}
      {platModal && (
        <div style={S.overlay} onClick={() => setPlatModal(false)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.handle} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Nouveau plat en cellule</div>
            <label style={S.label}>Nom du plat *</label>
            <input value={newPlatNom} onChange={e => setNewPlatNom(e.target.value)} style={{ ...S.input, marginBottom: 12 }} placeholder="Ex : Purée de pommes de terre" />
            <label style={S.label}>Heure de mise en cellule</label>
            <input type="time" value={newPlatHeure} onChange={e => setNewPlatHeure(e.target.value)} style={{ ...S.input, marginBottom: 20 }} />
            <button onClick={addPlatCellule} disabled={!newPlatNom.trim() || saving} style={{ ...S.btnP, width: '100%', opacity: !newPlatNom.trim() ? .5 : 1 }}>
              {saving ? 'Enregistrement…' : '❄️ Démarrer le refroidissement'}
            </button>
          </div>
        </div>
      )}

      {/* Paramètres service chaud */}
      {settingsModal && (
        <div style={S.overlay} onClick={() => setSettingsModal(false)}>
          <div style={S.sheet} onClick={e => e.stopPropagation()}>
            <div style={S.handle} />
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Prises par service</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              {[1, 2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => saveSettings(n)}
                  style={{ flex: 1, padding: 14, borderRadius: 12, border: '2px solid', background: (settings?.nb_prises_chaud_par_service === n) ? '#EFF6FF' : '#F8FAFC', borderColor: (settings?.nb_prises_chaud_par_service === n) ? '#2563EB' : '#E2E8F0', color: (settings?.nb_prises_chaud_par_service === n) ? '#2563EB' : '#94A3B8', fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: F }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gérer les zones */}
      {zonesModal && (
        <div style={{ ...S.overlay, alignItems: 'flex-start', overflowY: 'auto' }} onClick={() => setZonesModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, margin: '60px 16px 20px', padding: '24px 20px', fontFamily: F, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>Gérer les zones & appareils</div>

            {zones.map(z => (
              <div key={z.id} style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 14px', marginBottom: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  {z.nom} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>({z.type || 'froid'})</span>
                </div>
                {appareils.filter(a => a.zone_id === z.id).map(a => (
                  <div key={a.id} style={{ fontSize: 12, color: '#64748B', marginBottom: 2 }}>
                    • {a.nom}{a.temp_min !== null && a.temp_max !== null ? ` (${a.temp_min}° – ${a.temp_max}°C)` : ''}
                  </div>
                ))}
              </div>
            ))}

            <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid #BFDBFE' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8', marginBottom: 10 }}>+ Nouvelle zone</div>
              <input value={newZNom} onChange={e => setNewZNom(e.target.value)} style={{ ...S.input, marginBottom: 8 }} placeholder="Nom de la zone" />
              <select value={newZType} onChange={e => setNewZType(e.target.value)} style={{ ...S.input, marginBottom: 10 }}>
                <option value="froid">Froid</option>
                <option value="chaud">Chaud</option>
                <option value="ambiant">Ambiant</option>
              </select>
              <button onClick={addZone} disabled={!newZNom.trim() || savingZone} style={{ ...S.btnP, width: '100%', opacity: !newZNom.trim() ? .5 : 1 }}>
                {savingZone ? '…' : 'Ajouter la zone'}
              </button>
            </div>

            <div style={{ background: '#F0FDF4', borderRadius: 12, padding: 14, border: '1px solid #BBF7D0', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 10 }}>+ Nouvel appareil</div>
              <select value={newApZone} onChange={e => setNewApZone(e.target.value)} style={{ ...S.input, marginBottom: 8 }}>
                <option value="">— Choisir une zone —</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.nom}</option>)}
              </select>
              <input value={newApNom} onChange={e => setNewApNom(e.target.value)} style={{ ...S.input, marginBottom: 8 }} placeholder="Nom de l'appareil" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <input type="number" value={newApMin} onChange={e => setNewApMin(e.target.value)} style={S.input} placeholder="T° min (°C)" />
                <input type="number" value={newApMax} onChange={e => setNewApMax(e.target.value)} style={S.input} placeholder="T° max (°C)" />
              </div>
              <button onClick={addAppareil} disabled={!newApNom.trim() || !newApZone || savingZone} style={{ ...S.btnP, width: '100%', opacity: (!newApNom.trim() || !newApZone) ? .5 : 1 }}>
                {savingZone ? '…' : 'Ajouter l\'appareil'}
              </button>
            </div>

            <button onClick={() => setZonesModal(false)} style={{ ...S.btnGhost, width: '100%' }}>Fermer</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(4px)',
  },
  sheet: {
    background: '#fff', borderRadius: '24px 24px 0 0',
    padding: '24px 20px 40px', maxHeight: '90vh', overflowY: 'auto',
    fontFamily: F,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, background: '#E2E8F0',
    margin: '0 auto 20px',
  },
  card: {
    background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
    padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.05)',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: '.6px',
  },
  empty: {
    color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '24px 0',
  },
  label: {
    fontSize: 11, fontWeight: 600, color: '#64748B',
    textTransform: 'uppercase', letterSpacing: '.4px',
    marginBottom: 4, display: 'block',
  },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid #E2E8F0', fontSize: 14, fontFamily: F,
    outline: 'none', background: '#F8FAFC', color: '#1E293B',
    boxSizing: 'border-box',
  },
  btnP: {
    padding: '12px 18px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg,#2563EB,#1D4ED8)',
    color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
    fontFamily: F,
  },
  btnGhost: {
    padding: '8px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0',
    background: '#F8FAFC', color: '#475569', fontWeight: 500, fontSize: 13,
    cursor: 'pointer', fontFamily: F, flexShrink: 0,
  },
}
