const F = "'Plus Jakarta Sans','Inter',sans-serif"

export default function Haccp({ fromDashboard, onBack }) {
  return (
    <div style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:'40px 24px', textAlign:'center', fontFamily:F, gap:16 }}>

      {fromDashboard && (
        <button
          onClick={onBack}
          style={{ position:'absolute', top:0, left:0, background:'none', border:'none', color:'#2563EB', fontWeight:600, fontSize:14, cursor:'pointer', padding:'4px 0', fontFamily:F, display:'flex', alignItems:'center', gap:4 }}
        >
          ← Retour
        </button>
      )}

      <div style={{ fontSize:64, lineHeight:1 }}>🛡️</div>

      <div style={{ fontSize:22, fontWeight:800, color:'#0F172A', marginTop:8 }}>Module HACCP</div>

      <div style={{ fontSize:14, color:'#94A3B8', maxWidth:280, lineHeight:1.6 }}>
        Refonte en cours — disponible très bientôt
      </div>

      <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:99, fontSize:12.5, fontWeight:600, color:'#2563EB' }}>
        Bientôt disponible
      </div>

    </div>
  )
}
