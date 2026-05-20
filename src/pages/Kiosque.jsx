import { useState, useEffect, useMemo } from 'react'
import { ALLERGENES } from '../constants'

const F = "'Plus Jakarta Sans','Inter',sans-serif"

export default function Kiosque({ ownerId }) {
  const [recipes,   setRecipes]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filterAlg, setFilterAlg] = useState(null)

  useEffect(() => {
    if (!ownerId) { setLoading(false); return }
    fetch(`/api/kiosque-recipes?ownerId=${encodeURIComponent(ownerId)}`)
      .then(r => r.json())
      .then(d => { setRecipes(d.recipes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [ownerId])

  const filtered = useMemo(() => {
    let items = recipes
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(r => r.nom?.toLowerCase().includes(q))
    }
    if (filterAlg) {
      items = items.filter(r => (r.allergenes || []).includes(filterAlg))
    }
    return items
  }, [recipes, search, filterAlg])

  const activeAlg = ALLERGENES.find(a => a.k === filterAlg)

  return (
    <div style={{ minHeight:'100vh', background:'#F8FAFF', fontFamily: F }}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <span style={{ fontSize:22, color:'#2563EB' }}>✦</span>
            <span style={{ fontSize:20, fontWeight:800, color:'#0F172A' }}>Aria</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={S.headerTitle}>Informations allergènes</div>
            <div style={S.headerSub}>Conformément au règlement UE n°1169/2011</div>
          </div>
          <div style={S.headerBadge}>🇫🇷 14 allergènes</div>
        </div>
      </div>

      <div style={S.content}>
        {/* Search */}
        <input
          style={S.searchInput}
          placeholder="🔍 Rechercher un plat…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Allergen filter chips */}
        <div style={S.algRow}>
          <button
            style={{ ...S.algChip, ...(filterAlg === null ? S.algChipActive : {}) }}
            onClick={() => setFilterAlg(null)}
          >
            Tous
          </button>
          {ALLERGENES.map(a => (
            <button
              key={a.k}
              style={{ ...S.algChip, ...(filterAlg === a.k ? S.algChipActive : {}) }}
              onClick={() => setFilterAlg(filterAlg === a.k ? null : a.k)}
              title={a.label}
            >
              {a.icon}
            </button>
          ))}
        </div>

        {activeAlg && (
          <div style={S.filterBanner}>
            Plats contenant {activeAlg.icon} <strong>{activeAlg.label}</strong>
            <button style={S.filterClear} onClick={() => setFilterAlg(null)}>✕ Effacer</button>
          </div>
        )}

        {loading ? (
          <div style={S.loadingWrap}>
            <span style={{ display:'inline-block', animation:'ptr-spin .8s linear infinite', fontSize:28, color:'#2563EB' }}>✦</span>
          </div>
        ) : !ownerId ? (
          <div style={S.empty}>Lien invalide — aucun restaurant associé.</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>Aucun plat{search || filterAlg ? ' correspondant' : ' disponible'}.</div>
        ) : (
          <div style={S.grid}>
            {filtered.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        )}
      </div>

      <style>{`@keyframes ptr-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function RecipeCard({ recipe }) {
  const algs    = recipe.allergenes || []
  const present = ALLERGENES.filter(a => algs.includes(a.k))

  return (
    <div style={S.card}>
      <div style={S.cardName}>{recipe.nom}</div>
      {recipe.categorie && <div style={S.cardCat}>{recipe.categorie}</div>}

      <div style={{ marginTop:14 }}>
        {present.length === 0 ? (
          <div style={S.noAllergens}>✓ Aucun des 14 allergènes réglementaires</div>
        ) : (
          <>
            <div style={S.algSectionTitle}>⚠ Contient</div>
            <div style={S.algTagRow}>
              {present.map(a => (
                <div key={a.k} style={S.algTag}>
                  <span style={{ fontSize:16 }}>{a.icon}</span>
                  <span style={{ fontSize:11, fontWeight:600 }}>{a.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* All 14 allergens compact legend */}
      <div style={S.legend}>
        {ALLERGENES.map(a => {
          const has = algs.includes(a.k)
          return (
            <span key={a.k} title={a.label}
              style={{ fontSize:18, opacity: has ? 1 : 0.2, filter: has ? 'none' : 'grayscale(1)' }}>
              {a.icon}
            </span>
          )
        })}
      </div>
    </div>
  )
}

const S = {
  header:      { background:'#fff', borderBottom:'1px solid #E2E8F0', padding:'16px 20px', position:'sticky', top:0, zIndex:10 },
  headerInner: { maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', gap:12 },
  logo:        { display:'flex', alignItems:'center', gap:6, flexShrink:0 },
  headerTitle: { fontSize:16, fontWeight:700, color:'#0F172A', lineHeight:1.2 },
  headerSub:   { fontSize:11, color:'#94A3B8', marginTop:2 },
  headerBadge: { fontSize:12, color:'#2563EB', background:'#EFF6FF', padding:'4px 10px', borderRadius:20, fontWeight:600, flexShrink:0 },
  content:     { maxWidth:960, margin:'0 auto', padding:'20px 16px' },
  searchInput: { width:'100%', padding:'12px 16px', borderRadius:12, border:'1.5px solid #E2E8F0', fontSize:15, marginBottom:14, boxSizing:'border-box', fontFamily:'inherit', outline:'none', background:'#fff' },
  algRow:      { display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 },
  algChip:     { padding:'6px 13px', borderRadius:20, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:14, fontFamily:'inherit', fontWeight:500, color:'#475569' },
  algChipActive:{ background:'#2563EB', borderColor:'#2563EB', color:'#fff' },
  filterBanner:{ fontSize:13, color:'#1D4ED8', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:10, padding:'8px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:8 },
  filterClear: { marginLeft:'auto', background:'none', border:'none', color:'#64748B', cursor:'pointer', fontFamily:'inherit', fontSize:13 },
  grid:        { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 },
  card:        { background:'#fff', borderRadius:16, padding:'18px 20px', border:'1px solid #E2E8F0', boxShadow:'0 2px 8px rgba(15,23,42,.05)' },
  cardName:    { fontSize:17, fontWeight:700, color:'#0F172A' },
  cardCat:     { fontSize:12, color:'#94A3B8', marginTop:2 },
  algSectionTitle:{ fontSize:11, fontWeight:700, color:'#B45309', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 },
  algTagRow:   { display:'flex', flexWrap:'wrap', gap:6 },
  algTag:      { display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:8, background:'#FEF9C3', border:'1px solid #FDE047', color:'#713F12', fontWeight:500 },
  noAllergens: { color:'#10B981', fontSize:13, fontWeight:600 },
  legend:      { display:'flex', flexWrap:'wrap', gap:4, marginTop:14, paddingTop:14, borderTop:'1px solid #F1F5F9' },
  loadingWrap: { display:'flex', justifyContent:'center', padding:'60px 0' },
  empty:       { textAlign:'center', color:'#94A3B8', padding:'60px 0', fontSize:16 },
}
