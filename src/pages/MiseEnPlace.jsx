import { useState, useEffect } from 'react'
import { fetchMiseEnPlace, upsertMiseEnPlace, deleteMiseEnPlace, fetchRecettes, upsertStock } from '../lib/supabase'
import { dlcStatus, dlcLabel, dlcColor, CAT_ICON, uid } from '../constants'

const S = {
  page:       { display:'flex', flexDirection:'column', gap:16 },
  row:        { display:'flex', alignItems:'center', gap:8 },
  rowBetween: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  card:       { background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', padding:'14px 16px' },
  input:      { width:'100%', border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:'none', background:'#fff', color:'#0F172A' },
  select:     { border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", outline:'none', background:'#fff', color:'#0F172A', cursor:'pointer' },
  label:      { fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' },
  btn:        { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 16px', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', border:'none', transition:'opacity .15s' },
  btnSm:      { display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'6px 12px', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', border:'none' },
  badge:      { display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:99, fontSize:11, fontWeight:600 },
  divider:    { height:1, background:'#E2E8F0', margin:'8px 0' },
  overlay:    { position:'fixed', inset:0, background:'rgba(15,23,42,.45)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' },
  sheet:      { background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:640, maxHeight:'88vh', display:'flex', flexDirection:'column', overflow:'hidden' },
  sheetHdr:   { padding:'16px 20px 12px', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  sheetBody:  { padding:'16px 20px', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:14 },
  sheetFtr:   { padding:'12px 20px', borderTop:'1px solid #E2E8F0', display:'flex', gap:8, flexShrink:0 },
}

const STATUT_CONFIG = {
  todo:     { label:'À faire',   color:'#94A3B8', bg:'#F1F5F9', border:'#CBD5E1', icon:'○' },
  en_cours: { label:'En cours',  color:'#D97706', bg:'#FFFBEB', border:'#FDE68A', icon:'◑' },
  fait:     { label:'Terminé',   color:'#10B981', bg:'#ECFDF5', border:'#A7F3D0', icon:'●' },
}

function todayStr() {
  return new Date().toLocaleDateString('fr-FR')
}

function scaledQ(q, base, target) {
  if (!q || !base || !target) return q
  return Math.round((parseFloat(q) * target / base) * 100) / 100
}

function DlcPill({ dlc }) {
  if (!dlc) return null
  const st = dlcStatus(dlc)
  if (st === 'ok' || st === 'unknown') return null
  return (
    <span style={{ ...S.badge, background: st === 'expired' || st === 'critical' ? '#FEF2F2' : '#FFFBEB', color: dlcColor(st), border: `1px solid ${st === 'expired' || st === 'critical' ? '#FECACA' : '#FDE68A'}` }}>
      DLC {dlcLabel(st, dlc)}
    </span>
  )
}

function TaskCard({ task, onStatusChange, onDelete, stock }) {
  const cfg  = STATUT_CONFIG[task.statut] || STATUT_CONFIG.todo
  const next = { todo:'en_cours', en_cours:'fait', fait:'todo' }
  const [expanded, setExpanded] = useState(false)

  const linkedItems = (task.stock_deductions || []).map(d => {
    const s = stock?.find(x => x.id === d.stock_id)
    return s ? { ...d, dlc: s.dlc, nom: s.nom } : d
  })

  return (
    <div style={{ ...S.card, borderLeft: `3px solid ${cfg.border}`, opacity: task.statut === 'fait' ? .7 : 1 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <button
          onClick={() => onStatusChange(task.id, next[task.statut])}
          style={{ background: cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:99, color: cfg.color, fontWeight:700, fontSize:15, cursor:'pointer', minWidth:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
        >
          {cfg.icon}
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
            <span style={{ fontWeight:700, fontSize:14, color: task.statut === 'fait' ? '#94A3B8' : '#0F172A', textDecoration: task.statut === 'fait' ? 'line-through' : 'none' }}>
              {task.nom}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              {linkedItems.length > 0 && (
                <button onClick={() => setExpanded(!expanded)} style={{ ...S.btnSm, background:'#F1F5F9', color:'#475569', padding:'3px 8px', fontSize:11 }}>
                  📦 {linkedItems.length}
                </button>
              )}
              <button onClick={() => onDelete(task.id)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:16, padding:'2px' }}>×</button>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, flexWrap:'wrap' }}>
            {task.source_recette && (
              <span style={{ ...S.badge, background:'#EFF6FF', color:'#2563EB' }}>📖 Recette</span>
            )}
            {task.nb_personnes && (
              <span style={{ ...S.badge, background:'#F1F5F9', color:'#475569' }}>{task.nb_personnes} pers.</span>
            )}
            <span style={{ ...S.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>
          {expanded && linkedItems.length > 0 && (
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
              {linkedItems.map((d, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 10px', background:'#F8FAFC', borderRadius:8 }}>
                  <span style={{ fontSize:12, color:'#475569' }}>{d.nom}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:'#0F172A' }}>{d.q_a_deduire} {d.u}</span>
                    <DlcPill dlc={d.dlc} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddTaskModal({ onAdd, onClose, recettes, nbPersonnesDefault = 4 }) {
  const [tab,          setTab]          = useState('manuel')
  const [nom,          setNom]          = useState('')
  const [selectedRec,  setSelectedRec]  = useState(null)
  const [nbP,          setNbP]          = useState(nbPersonnesDefault)
  const [deductions,   setDeductions]   = useState([])
  const [taskError,    setTaskError]    = useState('')

  function handleSelectRecette(rec) {
    setSelectedRec(rec)
    setNom(rec.nom)
    const scaled = (rec.ingredients || []).map(ing => ({
      stock_id: null,
      nom:      ing.nom,
      q_a_deduire: scaledQ(ing.q, rec.nb_personnes || 4, nbP),
      u:        ing.u,
    }))
    setDeductions(scaled)
  }

  function updateNb(v) {
    setNbP(v)
    if (selectedRec) {
      const scaled = (selectedRec.ingredients || []).map(ing => ({
        stock_id: null,
        nom:      ing.nom,
        q_a_deduire: scaledQ(ing.q, selectedRec.nb_personnes || 4, v),
        u:        ing.u,
      }))
      setDeductions(scaled)
    }
  }

  function handleAdd() {
    setTaskError('')
    if (!nom.trim()) { setTaskError('Le nom de la tâche est requis'); return }
    onAdd({
      nom:              nom.trim(),
      source_recette:   selectedRec?.id || null,
      nb_personnes:     tab === 'recette' ? parseInt(nbP) : null,
      statut:           'todo',
      stock_deductions: tab === 'recette' ? deductions : [],
    })
  }

  return (
    <>
      <div style={S.sheetHdr}>
        <span style={{ fontWeight:700, fontSize:17 }}>Ajouter une tâche</span>
        <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94A3B8' }}>×</button>
      </div>

      <div style={{ display:'flex', borderBottom:'1px solid #E2E8F0' }}>
        {['manuel','recette'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'10px', fontWeight:600, fontSize:13, cursor:'pointer', border:'none', borderBottom: tab===t ? '2px solid #2563EB' : '2px solid transparent', background:'none', color: tab===t ? '#2563EB' : '#94A3B8' }}>
            {t === 'manuel' ? '✏️ Manuel' : '📖 Depuis recette'}
          </button>
        ))}
      </div>

      <div style={S.sheetBody}>
        {tab === 'recette' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div>
              <label style={S.label}>Choisir une recette</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:200, overflowY:'auto' }}>
                {recettes.length === 0 && <div style={{ color:'#94A3B8', fontSize:13 }}>Aucune recette enregistrée</div>}
                {recettes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRecette(r)}
                    style={{ ...S.card, cursor:'pointer', border: selectedRec?.id === r.id ? '2px solid #2563EB' : '1px solid #E2E8F0', padding:'10px 14px', display:'flex', gap:10, alignItems:'center', textAlign:'left' }}
                  >
                    <span style={{ fontSize:20 }}>📖</span>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{r.nom}</div>
                      <div style={{ fontSize:11, color:'#94A3B8' }}>{r.nb_personnes} pers. · {r.ingredients?.length || 0} ingr.</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedRec && (
              <div>
                <label style={S.label}>Nombre de couverts</label>
                <input style={S.input} type="number" min="1" value={nbP} onChange={e => updateNb(parseInt(e.target.value) || 1)} />
              </div>
            )}

            {deductions.length > 0 && (
              <div>
                <label style={S.label}>Ingrédients à préparer ({deductions.length})</label>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {deductions.map((d, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 10px', background:'#F8FAFC', borderRadius:8 }}>
                      <span style={{ fontSize:13, color:'#475569' }}>{d.nom}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{d.q_a_deduire} {d.u}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'manuel' && (
          <div>
            <label style={S.label}>Nom de la tâche</label>
            <input style={S.input} placeholder="Ex: Éplucher les légumes, Monter les blancs…" value={nom} onChange={e => setNom(e.target.value)} autoFocus />
          </div>
        )}
      </div>

      {taskError && (
        <div style={{ margin:'0 20px 4px', padding:'7px 12px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12.5, color:'#DC2626' }}>
          {taskError}
        </div>
      )}
      <div style={S.sheetFtr}>
        <button onClick={onClose} style={{ ...S.btn, flex:1, background:'#F1F5F9', color:'#475569' }}>Annuler</button>
        <button onClick={handleAdd} style={{ ...S.btn, flex:2, background:'#2563EB', color:'#fff' }}>+ Ajouter</button>
      </div>
    </>
  )
}

function DeductModal({ task, stock, onConfirm, onSkip }) {
  const [sel, setSel] = useState({})

  const items = (task.stock_deductions || []).map(d => {
    const s = stock?.find(x => x.nom.toLowerCase() === d.nom?.toLowerCase())
    return { ...d, stock_id: s?.id || null, found: !!s }
  })

  useEffect(() => {
    const init = {}
    items.forEach((d, i) => { init[i] = d.found })
    setSel(init)
  }, [])

  async function handleConfirm() {
    const toDeduct = items.filter((_, i) => sel[i] && items[i].stock_id)
    for (const d of toDeduct) {
      const s = stock.find(x => x.id === d.stock_id)
      if (!s) continue
      await upsertStock([{ ...s, q: Math.max(0, (parseFloat(s.q) || 0) - (parseFloat(d.q_a_deduire) || 0)) }])
    }
    onConfirm(toDeduct)
  }

  if (items.length === 0) { onConfirm([]); return null }

  return (
    <>
      <div style={S.sheetHdr}>
        <div>
          <div style={{ fontWeight:700, fontSize:17 }}>Déduire du stock</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>{task.nom}</div>
        </div>
      </div>

      <div style={S.sheetBody}>
        <p style={{ fontSize:13, color:'#475569', margin:0 }}>Sélectionnez les ingrédients à déduire du stock :</p>
        {items.map((d, i) => (
          <label key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background: d.found ? '#F8FAFC' : '#FEF2F2', borderRadius:10, cursor: d.found ? 'pointer' : 'default', border:'1px solid #E2E8F0' }}>
            <div style={S.row}>
              <input
                type="checkbox"
                checked={!!sel[i]}
                disabled={!d.found}
                onChange={e => setSel(p => ({ ...p, [i]: e.target.checked }))}
                style={{ width:16, height:16 }}
              />
              <span style={{ fontSize:14, color: d.found ? '#0F172A' : '#EF4444', fontWeight:500 }}>{d.nom}</span>
              {!d.found && <span style={{ ...S.badge, background:'#FEF2F2', color:'#EF4444', fontSize:10 }}>introuvable</span>}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>{d.q_a_deduire} {d.u}</span>
          </label>
        ))}
      </div>

      <div style={S.sheetFtr}>
        <button onClick={onSkip} style={{ ...S.btn, flex:1, background:'#F1F5F9', color:'#475569' }}>Ignorer</button>
        <button onClick={handleConfirm} style={{ ...S.btn, flex:2, background:'#10B981', color:'#fff' }}>✓ Déduire</button>
      </div>
    </>
  )
}

export default function MiseEnPlace({ stock, setStock, user, fromDashboard, onBack }) {
  const [tasks,       setTasks]       = useState([])
  const [recettes,    setRecettes]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [deductTask,  setDeductTask]  = useState(null)
  const [ariaMsg,     setAriaMsg]     = useState(null)
  const [ariaLoading, setAriaLoading] = useState(false)
  const today = todayStr()

  useEffect(() => {
    if (!user) return
    Promise.all([
      fetchMiseEnPlace(user.id, today),
      fetchRecettes(user.id),
    ]).then(([{ data: t }, { data: r }]) => {
      if (t) setTasks(t)
      if (r) setRecettes(r)
      setLoading(false)
    })
  }, [user])

  async function handleAdd(partial) {
    const task = {
      id:               uid(),
      user_id:          user.id,
      date:             today,
      ordre:            tasks.length,
      ...partial,
    }
    await upsertMiseEnPlace(task)
    setTasks(prev => [...prev, task])
    setShowAdd(false)
  }

  async function handleStatusChange(id, newStatut) {
    const task = tasks.find(t => t.id === id)
    if (!task) return

    if (newStatut === 'fait' && task.stock_deductions?.length > 0) {
      setDeductTask({ ...task, _nextStatut: newStatut })
      return
    }

    const updated = { ...task, statut: newStatut }
    await upsertMiseEnPlace(updated)
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
  }

  async function handleDeductConfirm(deducted) {
    if (!deductTask) return
    const updated = { ...deductTask, statut: deductTask._nextStatut }
    delete updated._nextStatut
    await upsertMiseEnPlace(updated)
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    if (deducted.length > 0 && setStock) {
      const updatedStock = stock.map(s => {
        const d = deducted.find(x => x.stock_id === s.id)
        return d ? { ...s, q: Math.max(0, (parseFloat(s.q)||0) - (parseFloat(d.q_a_deduire)||0)) } : s
      })
      setStock(updatedStock)
    }
    setDeductTask(null)
  }

  async function handleDelete(id) {
    await deleteMiseEnPlace(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function handleAriaSuggest() {
    setAriaLoading(true)
    setAriaMsg(null)
    try {
      const todoTasks = tasks.filter(t => t.statut !== 'fait').map(t => t.nom)
      const critDlc   = (stock || []).filter(s => ['critical','expired'].includes(dlcStatus(s.dlc))).map(s => `${s.nom} (DLC ${s.dlc})`)

      const message = [
        `Mise en place du ${today}.`,
        todoTasks.length > 0 ? `Tâches restantes : ${todoTasks.join(', ')}.` : 'Toutes les tâches sont terminées.',
        critDlc.length > 0 ? `Produits avec DLC critique : ${critDlc.slice(0,5).join(', ')}.` : '',
        `Donne-moi 3 conseils courts et concrets pour optimiser cette mise en place.`
      ].filter(Boolean).join(' ')

      const res  = await fetch('/api/aria', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message, userId: user.id }) })
      const data = await res.json()
      setAriaMsg(data.reply || 'Pas de suggestion disponible.')
    } catch (e) {
      setAriaMsg('Erreur lors de la suggestion Aria.')
    } finally {
      setAriaLoading(false)
    }
  }

  const grouped = {
    todo:     tasks.filter(t => t.statut === 'todo'),
    en_cours: tasks.filter(t => t.statut === 'en_cours'),
    fait:     tasks.filter(t => t.statut === 'fait'),
  }
  const progress = tasks.length > 0 ? Math.round((grouped.fait.length / tasks.length) * 100) : 0

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:48, color:'#94A3B8' }}>Chargement…</div>
  )

  return (
    <div style={S.page}>
      {fromDashboard && (
        <button onClick={onBack} style={{ ...S.btnSm, background:'#F1F5F9', color:'#475569', alignSelf:'flex-start' }}>
          ← Retour
        </button>
      )}

      {/* Header */}
      <div style={S.rowBetween}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:'#0F172A', margin:0 }}>Mise en place</h2>
          <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>{today} · {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...S.btn, background:'#2563EB', color:'#fff', padding:'10px 14px' }}>
          + Tâche
        </button>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div style={{ ...S.card, padding:'12px 16px' }}>
          <div style={S.rowBetween}>
            <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>Avancement</span>
            <span style={{ fontSize:13, fontWeight:700, color: progress === 100 ? '#10B981' : '#2563EB' }}>{progress}%</span>
          </div>
          <div style={{ height:8, background:'#E2E8F0', borderRadius:99, marginTop:8, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, background: progress === 100 ? '#10B981' : '#2563EB', borderRadius:99, transition:'width .3s' }} />
          </div>
          <div style={{ ...S.row, marginTop:8, fontSize:12, color:'#94A3B8' }}>
            <span>○ {grouped.todo.length} à faire</span>
            <span>◑ {grouped.en_cours.length} en cours</span>
            <span>● {grouped.fait.length} terminé{grouped.fait.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Aria suggestion */}
      <div style={{ ...S.card, border:'1px solid #BFDBFE', background:'#EFF6FF' }}>
        <div style={S.rowBetween}>
          <div style={S.row}>
            <span style={{ fontSize:20 }}>✦</span>
            <span style={{ fontSize:14, fontWeight:700, color:'#1E40AF' }}>Suggestions Aria</span>
          </div>
          <button
            onClick={handleAriaSuggest}
            disabled={ariaLoading}
            style={{ ...S.btnSm, background:'#2563EB', color:'#fff', opacity: ariaLoading ? .7 : 1 }}
          >
            {ariaLoading ? '…' : 'Analyser'}
          </button>
        </div>
        {ariaMsg && (
          <div style={{ marginTop:10, fontSize:13, color:'#1E40AF', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
            {ariaMsg}
          </div>
        )}
      </div>

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 16px', color:'#94A3B8' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:600, color:'#0F172A', marginBottom:4 }}>Aucune tâche</div>
          <div style={{ fontSize:13 }}>Ajoutez une tâche manuellement ou depuis une recette</div>
        </div>
      ) : (
        <>
          {(['en_cours','todo','fait']).map(statut => {
            const list = grouped[statut]
            if (list.length === 0) return null
            const cfg = STATUT_CONFIG[statut]
            return (
              <div key={statut} style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={S.row}>
                  <span style={{ fontSize:12, fontWeight:700, color: cfg.color, textTransform:'uppercase', letterSpacing:.5 }}>
                    {cfg.label}
                  </span>
                  <span style={{ ...S.badge, background: cfg.bg, color: cfg.color }}>{list.length}</span>
                </div>
                {list.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    stock={stock}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )
          })}
        </>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div style={S.sheet}>
            <AddTaskModal
              recettes={recettes}
              onAdd={handleAdd}
              onClose={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}

      {/* Deduct modal */}
      {deductTask && (
        <div style={S.overlay}>
          <div style={S.sheet}>
            <DeductModal
              task={deductTask}
              stock={stock}
              onConfirm={handleDeductConfirm}
              onSkip={() => {
                const updated = { ...deductTask, statut: deductTask._nextStatut }
                delete updated._nextStatut
                upsertMiseEnPlace(updated)
                setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
                setDeductTask(null)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
