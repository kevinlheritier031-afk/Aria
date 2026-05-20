import { useState, useEffect } from 'react'
import { fetchEquipeMembres, upsertEquipeMembre } from '../lib/supabase'
import { ROLES, uid, initials } from '../constants'
import { canDo } from '../hooks/usePermissions'

const F = "'Plus Jakarta Sans','Inter',sans-serif"

// ── Formation modules catalogue ───────────────────────────────────────────────

const MODULES_FORMATION = [
  { k:'intro',       l:'Introduction HACCP',             icon:'📚', color:'#6366F1', bg:'#EEF2FF' },
  { k:'temp',        l:'Températures & zones critiques', icon:'🌡️', color:'#EF4444', bg:'#FEF2F2' },
  { k:'tracabilite', l:'Traçabilité & DLC',              icon:'📋', color:'#F59E0B', bg:'#FFFBEB' },
  { k:'nettoyage',   l:'Nettoyage & désinfection',       icon:'🧹', color:'#10B981', bg:'#ECFDF5' },
  { k:'reception',   l:'Réception des marchandises',     icon:'📦', color:'#3B82F6', bg:'#EFF6FF' },
  { k:'allergenes',  l:'Allergènes alimentaires',        icon:'⚠️', color:'#D97706', bg:'#FFFBEB' },
]

// ── Training content ──────────────────────────────────────────────────────────

const MODULE_CONTENT = {
  intro: {
    sections: [
      { title:"Qu'est-ce que le HACCP ?", body:"Le HACCP (Hazard Analysis Critical Control Point) est un système préventif de gestion de la sécurité alimentaire. Il permet d'identifier, évaluer et maîtriser les dangers significatifs au regard de la sécurité des aliments. C'est une obligation réglementaire pour tout professionnel de la restauration." },
      { title:'Les 7 principes fondamentaux', body:"1. Analyser les dangers (biologiques, chimiques, physiques)\n2. Identifier les Points Critiques de Contrôle (CCP)\n3. Fixer les limites critiques pour chaque CCP\n4. Mettre en place un système de surveillance\n5. Définir les actions correctives\n6. Vérifier l'efficacité du système\n7. Constituer des dossiers et tenir des enregistrements" },
      { title:'Bonnes pratiques au quotidien', body:"• Lavage des mains systématique avant chaque manipulation\n• Port de tenue propre adaptée (tablier, charlotte)\n• Respect de la marche en avant (du sale vers le propre)\n• Signalement immédiat de tout problème d'hygiène\n• Formation continue de l'équipe" },
    ],
    quiz: [
      { q:'Que signifie HACCP ?', opts:['Hygiene Analysis Critical Control Protocol','Hazard Analysis Critical Control Point','High Acidity Content Control Point','Hazard Assessment for Catering Consumption'], a:1 },
      { q:'Combien de principes compte le système HACCP ?', opts:['5','7','9','12'], a:1 },
      { q:"Quel est l'objectif principal du HACCP ?", opts:['Réduire les coûts de production','Accélérer le service','Identifier et maîtriser les dangers alimentaires','Former les équipes au nettoyage'], a:2 },
      { q:'Que signifie "marche en avant" ?', opts:['Aller vite en cuisine','Éviter la contamination croisée en séparant zones propres et sales','Se déplacer en cuisine en avant uniquement','Une technique de découpe'], a:1 },
    ],
  },
  temp: {
    sections: [
      { title:'La chaîne du froid', body:"La chaîne du froid est le maintien en continu d'une température basse depuis la fabrication jusqu'à la consommation. Toute rupture peut entraîner une prolifération bactérienne dangereuse. Les produits réfrigérés doivent être maintenus à ≤ 4°C et les surgelés à ≤ -18°C." },
      { title:'Températures réglementaires', body:"• Produits réfrigérés : ≤ 4°C\n• Surgelés : ≤ -18°C\n• Plats chauds en service : ≥ 63°C\n• Réception produits réfrigérés : ≤ 8°C\n• Refroidissement rapide : de 63°C à 10°C en moins de 2h\n• Remise en température : atteindre 63°C en moins d'1h" },
      { title:'Relevés et enregistrement', body:"Chaque relevé de température doit être enregistré avec : la date et l'heure, le nom de la zone ou de l'équipement, la valeur mesurée, la signature du responsable. En cas de non-conformité, une action corrective doit être immédiatement documentée." },
    ],
    quiz: [
      { q:'Température maximale de conservation des produits réfrigérés ?', opts:['0°C','4°C','8°C','12°C'], a:1 },
      { q:'Un plat chaud en service doit être maintenu à :',opts:['≥ 55°C','≥ 60°C','≥ 63°C','≥ 70°C'], a:2 },
      { q:'Le refroidissement rapide impose de passer de 63°C à 10°C en :',opts:['30 minutes','1 heure','2 heures','4 heures'], a:2 },
      { q:'En cas de rupture de la chaîne du froid, que faire ?',opts:['Remettre au réfrigérateur immédiatement','Congeler le produit','Évaluer durée et température de rupture puis décider','Servir rapidement'], a:2 },
    ],
  },
  tracabilite: {
    sections: [
      { title:'DLC et DDM', body:'La Date Limite de Consommation (DLC) concerne les produits très périssables (viandes, produits frais). Un produit dont la DLC est dépassée ne peut pas être consommé et doit être retiré. La Date de Durabilité Minimale (DDM) concerne les produits stables (conserves, épices). Après la DDM, le produit peut être altéré mais pas dangereux.' },
      { title:'Méthode FIFO / FEFO', body:"FIFO (First In First Out) = premier entré, premier sorti. Les produits les plus anciens sont utilisés en premier. FEFO (First Expired First Out) = première date limite, première sortie. On consomme d'abord les produits avec la DLC la plus proche. Ces méthodes réduisent les pertes et garantissent la fraîcheur des produits." },
      { title:'Étiquetage interne', body:"Tout produit déballé ou préparé doit être étiqueté avec : le nom du produit, la date d'ouverture ou de préparation, la DLC calculée. Un produit décongelé ne peut pas être recongelé et doit être utilisé dans les 24 heures. Les informations doivent rester lisibles et résistantes à l'humidité." },
    ],
    quiz: [
      { q:'Que signifie FIFO ?', opts:['Fresh Ingredients For Operations','First In First Out','Food Inventory For Orders','Frozen Items For Outlet'], a:1 },
      { q:"La DLC s'applique aux produits :",opts:['Secs et stables','Très périssables microbiologiquement','Surgelés uniquement','En conserve'], a:1 },
      { q:'Un produit dont la DLC est dépassée doit être :',opts:['Cuit rapidement','Congelé immédiatement','Retiré et détruit','Mis en promotion'], a:2 },
      { q:"L'étiquetage interne d'un produit décongelé doit mentionner :",opts:['Uniquement le nom',"Nom, date d'ouverture et DLC calculée","Le prix d'achat",'Le fournisseur uniquement'], a:1 },
    ],
  },
  nettoyage: {
    sections: [
      { title:'Nettoyer vs désinfecter', body:"Le nettoyage élimine les salissures visibles (graisses, résidus alimentaires) à l'aide d'un détergent. La désinfection détruit les micro-organismes pathogènes à l'aide d'un désinfectant homologué. Les deux opérations sont complémentaires et doivent être réalisées dans cet ordre : nettoyage → rinçage → désinfection → rinçage." },
      { title:'Plan de nettoyage', body:'Le plan de nettoyage précise pour chaque surface ou équipement : QUOI nettoyer, COMMENT (méthode), AVEC QUOI (produits et concentrations), À QUELLE FRÉQUENCE (après chaque service, journalière, hebdomadaire…), PAR QUI (responsable désigné). Ce document doit être affiché en cuisine et signé après chaque intervention.' },
      { title:'Fréquences minimales', body:'• Plans de travail et planches : après chaque utilisation\n• Sols : après chaque service\n• Équipements de cuisson : quotidien\n• Chambres froides : hebdomadaire\n• Hottes et filtres : mensuel\n• Siphons et caniveaux : hebdomadaire' },
    ],
    quiz: [
      { q:'Différence entre nettoyage et désinfection ?',opts:['Ils sont synonymes','Le nettoyage élimine les salissures, la désinfection détruit les micro-organismes','La désinfection élimine les salissures','Le nettoyage détruit les micro-organismes'], a:1 },
      { q:'Dans quel ordre effectue-t-on les opérations ?',opts:['Désinfecter → Nettoyer → Rincer','Nettoyer → Désinfecter → Rincer','Rincer → Nettoyer → Désinfecter',"L'ordre n'a pas d'importance"], a:1 },
      { q:"Fréquence minimale de nettoyage d'un plan de travail :",opts:['Une fois par semaine','Une fois par jour','Après chaque utilisation','Deux fois par semaine'], a:2 },
      { q:'Un plan de nettoyage doit préciser :',opts:['Quoi, quand, comment, avec quoi, par qui','Uniquement les produits','La durée de chaque opération','Le budget alloué'], a:0 },
    ],
  },
  reception: {
    sections: [
      { title:'Contrôle à réception', body:"Chaque livraison doit faire l'objet d'un contrôle systématique portant sur : l'état des emballages (pas d'emballages souillés, déchirés ou gonflés), les températures (mesure à cœur ou en surface selon les produits), les DLC et DDM, la conformité avec le bon de commande (quantités, références), l'étiquetage et la traçabilité." },
      { title:"Températures d'acceptation", body:"• Produits réfrigérés : ≤ 8°C\n• Produits surgelés : ≤ -15°C (idéalement -18°C)\n• Produits ultra-frais : ≤ 4°C\n• Produits de la mer frais : entre 0 et 2°C\nTout produit livré hors température doit être refusé ou faire l'objet de réserves écrites." },
      { title:'Refus et réserves', body:"En cas de non-conformité, deux options : refuser la livraison en totalité (retour au livreur) ou émettre des réserves précises et datées sur le bon de livraison signé par le livreur. Dans tous les cas, tracer l'incident : date, nature du problème, nom du fournisseur, action prise. Informer immédiatement le responsable." },
    ],
    quiz: [
      { q:"Température maximale d'acceptation des produits réfrigérés ?",opts:['4°C','8°C','10°C','12°C'], a:1 },
      { q:'En cas de livraison non conforme :',opts:['Accepter et mettre au froid rapidement','Refuser ou émettre des réserves écrites','Appeler la mairie','Congeler les produits douteux'], a:1 },
      { q:'Que vérifier en priorité à réception ?',opts:['Le prix de la facture','Le nom du livreur','Températures, emballages et DLC','La quantité uniquement'], a:2 },
      { q:'La fiche de réception permet de :',opts:['Calculer le coût des repas','Assurer la traçabilité en cas de problème','Planifier les menus','Gérer les ressources humaines'], a:1 },
    ],
  },
  allergenes: {
    sections: [
      { title:'Les 14 allergènes majeurs', body:'La réglementation européenne (règlement INCO 1169/2011) définit 14 allergènes à déclaration obligatoire :\n1. Gluten (blé, seigle, orge, avoine…)\n2. Crustacés\n3. Œufs\n4. Poissons\n5. Arachides\n6. Soja\n7. Lait\n8. Fruits à coque\n9. Céleri\n10. Moutarde\n11. Sésame\n12. Sulfites (> 10mg/kg)\n13. Lupin\n14. Mollusques' },
      { title:'Obligations légales', body:'Depuis 2014, tout restaurateur doit informer ses clients des allergènes présents dans chaque plat, sous forme écrite (carte, affiché, registre). Pour la restauration collective, un document écrit est obligatoire. La contamination croisée doit être mentionnée si elle est possible (mention "peut contenir des traces de…").' },
      { title:'Gestion et communication', body:`• Former l'équipe à identifier les allergènes dans chaque recette\n• Maintenir une fiche technique actualisée pour chaque plat\n• Dédiés ustensiles pour allergènes majeurs (noix, gluten)\n• En cas de doute, informer honnêtement le client\n• Ne jamais promettre un plat "sans allergène" sans certitude absolue\n• Proposer une alternative adaptée si possible` },
    ],
    quiz: [
      { q:"Combien d'allergènes sont définis par la réglementation européenne ?",opts:['8','10','14','18'], a:2 },
      { q:'Le gluten est présent dans :',opts:['Le riz et le maïs',"Le blé, le seigle, l'orge et leurs dérivés",'Tous les féculents','Uniquement le blé'], a:1 },
      { q:'En cas de doute sur un allergène dans un plat :',opts:['Rassurer le client','Refuser systématiquement de servir','Informer honnêtement et proposer une alternative','Vérifier après avoir servi'], a:2 },
      { q:'"Peut contenir des traces de…" indique :',opts:['Une contamination intentionnelle','Un risque de contamination croisée',"Que le produit ne contient pas l'allergène",'Une information facultative'], a:1 },
    ],
  },
}

// ── Checklists per role ───────────────────────────────────────────────────────

const CHECKLISTS = {
  proprietaire: [
    { k:'profil',       l:"Configurer le profil établissement" },
    { k:'equipe',       l:"Inviter les membres de l'équipe avec leur PIN" },
    { k:'fournisseurs', l:"Ajouter les fournisseurs principaux" },
    { k:'stock',        l:"Saisir le stock initial" },
    { k:'haccp',        l:"Configurer les zones HACCP" },
    { k:'marges',       l:"Paramétrer les objectifs de marge" },
    { k:'aria_test',    l:"Tester Aria avec une question de stock" },
  ],
  chef: [
    { k:'stock',     l:"Vérifier le stock critique" },
    { k:'recettes',  l:"Importer les recettes de la maison" },
    { k:'commandes', l:"Préparer la première commande fournisseur" },
    { k:'mep',       l:"Créer la première liste de mise en place" },
    { k:'haccp',     l:"Saisir les premières températures" },
    { k:'aria_test', l:"Demander à Aria un rapport de stock" },
  ],
  second: [
    { k:'stock',     l:"Prendre connaissance du stock actuel" },
    { k:'mep',       l:"Consulter la mise en place du jour" },
    { k:'haccp',     l:"Saisir les températures du matin" },
    { k:'recettes',  l:"Consulter les fiches techniques" },
    { k:'aria_test', l:"Tester Aria sur les alertes DLC" },
  ],
  cuisinier: [
    { k:'stock',     l:"Consulter le stock disponible" },
    { k:'mep',       l:"Valider les tâches de mise en place" },
    { k:'temp',      l:"Saisir les températures de votre zone" },
    { k:'reception', l:"Scanner une réception fournisseur" },
    { k:'aria_test', l:"Demander à Aria vos priorités du jour" },
  ],
  patissier: [
    { k:'stock',     l:"Vérifier le stock pâtisserie" },
    { k:'recettes',  l:"Créer vos premières fiches techniques" },
    { k:'mep',       l:"Valider la mise en place desserts" },
    { k:'temp',      l:"Contrôler la température chambre froide" },
    { k:'aria_test', l:"Demander à Aria une analyse DLC" },
  ],
  employe: [
    { k:'stock',     l:"Consulter le stock (lecture seule)" },
    { k:'mep',       l:"Valider les tâches de mise en place" },
    { k:'temp',      l:"Saisir une température de contrôle" },
    { k:'aria_test', l:"Poser une question à Aria" },
  ],
  apprenti: [
    { k:'intro',     l:"Lire l'introduction HACCP" },
    { k:'temp',      l:"Saisir une première température" },
    { k:'mep',       l:"Valider une tâche de mise en place" },
    { k:'aria_test', l:"Poser une question à Aria" },
  ],
  stagiaire: [
    { k:'intro',     l:"Lire l'introduction HACCP" },
    { k:'temp',      l:"Observer et saisir une température" },
    { k:'mep',       l:"Valider une tâche de mise en place" },
    { k:'aria_test', l:"Poser une question à Aria" },
  ],
}

const ROLE_KEYS = ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier', 'employe', 'apprenti', 'stagiaire']

const MATRICE_DROITS = [
  { action:'Supprimer produit stock',    allowed:['proprietaire','chef','second'] },
  { action:'Modifier stock',             allowed:['proprietaire','chef','second','cuisinier','patissier'] },
  { action:'Modifier recettes',          allowed:['proprietaire','chef','second','cuisinier','patissier'] },
  { action:'Supprimer recettes',         allowed:['proprietaire','chef','second'] },
  { action:'Passer commandes',           allowed:['proprietaire','chef','second'] },
  { action:'Voir marges / finances',     allowed:['proprietaire','chef','second'] },
  { action:"Gérer l'équipe",            allowed:['proprietaire','chef'] },
  { action:'Saisir températures',        allowed:['proprietaire','chef','second','cuisinier','patissier','employe','apprenti','stagiaire'] },
  { action:'Valider mise en place',      allowed:['proprietaire','chef','second','cuisinier','patissier','employe','apprenti','stagiaire'] },
  { action:'Stock lecture seule',        allowed:['proprietaire','chef','second','cuisinier','patissier','employe','apprenti','stagiaire'] },
]

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page:       { padding:20, paddingBottom:100, display:'flex', flexDirection:'column', gap:16, fontFamily:F, maxWidth:880, margin:'0 auto' },
  backBtn:    { display:'inline-flex', alignItems:'center', gap:5, fontSize:13.5, fontWeight:500, color:'#2563EB', background:'none', border:'none', padding:'2px 0', cursor:'pointer', fontFamily:F },
  rowBetween: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  tabs:       { display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3 },
  tab:        { flex:1, padding:'8px 10px', border:'none', background:'none', borderRadius:8, fontSize:13, fontWeight:500, color:'#64748B', cursor:'pointer', fontFamily:F, display:'flex', alignItems:'center', justifyContent:'center', gap:5 },
  tabActive:  { background:'#fff', color:'#0F172A', boxShadow:'0 1px 3px rgba(0,0,0,.08)' },
  card:       { background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' },
  cardTitle:  { fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:14 },
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

// ── ModuleView — Training content + quiz ──────────────────────────────────────

function ModuleView({ mod, onBack, onComplete, alreadyDone }) {
  const content  = MODULE_CONTENT[mod.k]
  const [step,   setStep]   = useState('content')
  const [answers,setAnswers]= useState({})
  const [result, setResult] = useState(null)

  if (!content) return null

  function handleSubmitQuiz() {
    let correct = 0
    content.quiz.forEach((q, i) => { if (answers[i] === q.a) correct++ })
    const score = Math.round((correct / content.quiz.length) * 100)
    const passed = score >= 75
    setResult({ score, correct, total: content.quiz.length, passed })
    if (passed) setStep('result')
    else setStep('result')
  }

  const allAnswered = content.quiz.every((_, i) => answers[i] !== undefined)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={onBack} style={{ ...S.btnSm, background:'#F1F5F9', color:'#475569' }}>← Retour</button>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:mod.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
            {mod.icon}
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#0F172A' }}>{mod.l}</div>
            {alreadyDone && (
              <span style={{ ...S.badge, background:'#ECFDF5', color:'#059669', fontSize:10 }}>✓ Certifié</span>
            )}
          </div>
        </div>
      </div>

      {/* Step tabs */}
      <div style={{ display:'flex', background:'#F1F5F9', borderRadius:10, padding:3, gap:3 }}>
        {[{k:'content',l:'📖 Contenu'},{k:'quiz',l:'✏️ Quiz'},{k:'result',l:'🎯 Résultat'}].map(t => (
          <button
            key={t.k}
            onClick={() => { if (t.k !== 'result' || result) setStep(t.k) }}
            style={{ ...S.tab, ...(step === t.k ? S.tabActive : {}), opacity: t.k === 'result' && !result ? .4 : 1, cursor: t.k === 'result' && !result ? 'default' : 'pointer' }}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Content */}
      {step === 'content' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {content.sections.map((sec, i) => (
            <div key={i} style={S.card}>
              <div style={{ fontSize:14, fontWeight:700, color:mod.color, marginBottom:10 }}>{sec.title}</div>
              <div style={{ fontSize:13.5, color:'#334155', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{sec.body}</div>
            </div>
          ))}
          <button
            onClick={() => setStep('quiz')}
            style={{ ...S.btn, background:`linear-gradient(135deg,${mod.color},${mod.color}CC)`, color:'#fff', boxShadow:`0 4px 12px ${mod.color}40` }}
          >
            Passer le quiz →
          </button>
        </div>
      )}

      {/* Quiz */}
      {step === 'quiz' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontSize:13, color:'#64748B', padding:'0 4px' }}>
            {content.quiz.length} questions — Score minimum requis : 75%
          </div>
          {content.quiz.map((q, qi) => (
            <div key={qi} style={{ ...S.card, border: answers[qi] !== undefined ? `1.5px solid ${mod.color}44` : '1px solid #E2E8F0' }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:'#0F172A', marginBottom:12 }}>
                {qi + 1}. {q.q}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {q.opts.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                    style={{
                      display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                      border: answers[qi] === oi ? `2px solid ${mod.color}` : '1.5px solid #E2E8F0',
                      borderRadius:10,
                      background: answers[qi] === oi ? mod.bg : '#F8FAFC',
                      cursor:'pointer', fontFamily:F, textAlign:'left',
                    }}
                  >
                    <div style={{
                      width:20, height:20, borderRadius:'50%', flexShrink:0, border: answers[qi] === oi ? `2px solid ${mod.color}` : '2px solid #CBD5E1',
                      background: answers[qi] === oi ? mod.color : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {answers[qi] === oi && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
                    </div>
                    <span style={{ fontSize:13, color:'#0F172A', fontWeight: answers[qi] === oi ? 600 : 400 }}>{opt}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={handleSubmitQuiz}
            disabled={!allAnswered}
            style={{ ...S.btn, background: allAnswered ? `linear-gradient(135deg,${mod.color},${mod.color}CC)` : '#E2E8F0', color: allAnswered ? '#fff' : '#94A3B8', opacity: allAnswered ? 1 : .7, boxShadow: allAnswered ? `0 4px 12px ${mod.color}40` : 'none' }}
          >
            Valider mes réponses
          </button>
        </div>
      )}

      {/* Result */}
      {step === 'result' && result && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ ...S.card, textAlign:'center', border: result.passed ? '1.5px solid #A7F3D0' : '1.5px solid #FECACA', background: result.passed ? 'linear-gradient(135deg,#F0FDF4,#ECFDF5)' : 'linear-gradient(135deg,#FEF2F2,#FEF2F2)' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>{result.passed ? '🎓' : '📝'}</div>
            <div style={{ fontSize:20, fontWeight:800, color: result.passed ? '#059669' : '#DC2626' }}>
              {result.passed ? 'Module validé !' : 'Score insuffisant'}
            </div>
            <div style={{ fontSize:32, fontWeight:800, fontFamily:"'DM Mono',monospace", color: result.passed ? '#059669' : '#EF4444', margin:'10px 0' }}>
              {result.score}%
            </div>
            <div style={{ fontSize:13.5, color:'#64748B' }}>
              {result.correct}/{result.total} bonnes réponses
              {result.passed ? ' — Bravo !' : ' — Score minimum requis : 75%'}
            </div>
          </div>

          {/* Corrected answers */}
          <div style={S.card}>
            <div style={S.cardTitle}>Correction</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {content.quiz.map((q, qi) => {
                const correct = answers[qi] === q.a
                return (
                  <div key={qi} style={{ padding:'10px 12px', background: correct ? '#F0FDF4' : '#FEF2F2', borderRadius:10, border:`1px solid ${correct ? '#A7F3D0' : '#FECACA'}` }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0F172A', marginBottom:4 }}>{qi+1}. {q.q}</div>
                    <div style={{ fontSize:12.5, color: correct ? '#059669' : '#DC2626', fontWeight:500 }}>
                      {correct ? '✓' : '✗'} {q.opts[answers[qi]]}
                      {!correct && (
                        <span style={{ color:'#059669' }}> → Bonne réponse : {q.opts[q.a]}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {result.passed ? (
            <button
              onClick={onComplete}
              style={{ ...S.btn, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', boxShadow:'0 4px 12px rgba(16,185,129,.35)' }}
            >
              🎓 Enregistrer ma certification
            </button>
          ) : (
            <button
              onClick={() => { setAnswers({}); setResult(null); setStep('quiz') }}
              style={{ ...S.btn, background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'#fff' }}
            >
              🔄 Réessayer le quiz
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── TabEquipe ──────────────────────────────────────────────────────────────────

function TabEquipe({ user, profile, membres, setMembres, loading }) {
  const [showInvite, setShowInvite] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [formErr,    setFormErr]    = useState('')
  const [form,       setForm]       = useState({ name:'', role:'cuisinier', pin_code:'' })
  const [copied,     setCopied]     = useState(false)

  const canManage = canDo('gerer_equipe', profile?.role)
  const f = (k, v) => setForm(p => ({ ...p, [k]:v }))

  function handleCopyCode() {
    try {
      navigator.clipboard.writeText(user?.id || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  async function handleInvite() {
    setFormErr('')
    if (!form.name.trim()) { setFormErr('Le prénom et nom sont requis'); return }
    if (form.pin_code && (!/^\d{4}$/.test(form.pin_code))) { setFormErr('Le PIN doit être composé de 4 chiffres'); return }
    setSaving(true)
    const rec = {
      id:         uid(),
      owner_id:   user.id,
      email:      '',
      name:       form.name.trim(),
      role:       form.role,
      pin_code:   form.pin_code || null,
      actif:      true,
      statut:     'actif',
      formation:  {},
      created_at: new Date().toISOString(),
    }
    await upsertEquipeMembre(rec)
    setMembres(m => [rec, ...m])
    setForm({ name:'', role:'cuisinier', pin_code:'' })
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
      {/* Code établissement (managers only) */}
      {canManage && user?.id && (
        <div style={{ ...S.card, background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border:'1px solid #BFDBFE' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1E40AF', marginBottom:6, textTransform:'uppercase', letterSpacing:'.5px' }}>
            🔑 Code établissement (partagez avec votre équipe)
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, background:'#fff', borderRadius:8, padding:'8px 12px', fontSize:11, fontFamily:"'DM Mono',monospace", color:'#1E40AF', wordBreak:'break-all', border:'1px solid #BFDBFE', letterSpacing:'.5px' }}>
              {user.id}
            </div>
            <button
              onClick={handleCopyCode}
              style={{ ...S.btnSm, background: copied ? '#10B981' : '#2563EB', color:'#fff', flexShrink:0 }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>
      )}

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
          <span style={S.kpiLabel}>Certifiés</span>
        </div>
      </div>

      {/* Invitation */}
      {canManage && (
        <div style={S.card}>
          <div style={{ ...S.rowBetween, marginBottom: showInvite ? 16 : 0 }}>
            <div style={{ ...S.cardTitle, marginBottom:0 }}>Ajouter un membre</div>
            <button
              onClick={() => { setShowInvite(v => !v); setFormErr('') }}
              style={{ ...S.btnSm, background: showInvite ? '#F1F5F9' : '#2563EB', color: showInvite ? '#0F172A' : '#fff' }}
            >
              {showInvite ? '✕ Annuler' : '+ Ajouter'}
            </button>
          </div>
          {showInvite && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Prénom & Nom *</label>
                  <input style={S.input} placeholder="Jean Dupont" value={form.name} onChange={e => f('name', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#475569', marginBottom:4, display:'block' }}>Code PIN (4 chiffres)</label>
                  <input
                    style={{ ...S.input, fontFamily:"'DM Mono',monospace", letterSpacing:'4px', textAlign:'center' }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="1234"
                    value={form.pin_code}
                    onChange={e => f('pin_code', e.target.value.replace(/\D/g,'').slice(0,4))}
                  />
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
              {formErr && (
                <div style={{ fontSize:12.5, color:'#DC2626', background:'#FEF2F2', padding:'8px 12px', borderRadius:8, border:'1px solid #FECACA' }}>
                  {formErr}
                </div>
              )}
              <button
                onClick={handleInvite}
                disabled={saving}
                style={{ ...S.btn, background:'#2563EB', color:'#fff', opacity: saving ? .7 : 1 }}
              >
                {saving ? 'Enregistrement…' : '+ Ajouter le membre'}
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
          <div style={S.empty}>Aucun membre. Ajoutez votre équipe pour commencer.</div>
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
                    {!m.actif && <span style={{ ...S.badge, background:'#F1F5F9', color:'#94A3B8' }}>inactif</span>}
                    {m.pin_code && <span style={{ ...S.badge, background:'#EFF6FF', color:'#2563EB' }}>🔐 PIN</span>}
                    {done === MODULES_FORMATION.length && <span style={{ ...S.badge, background:'#ECFDF5', color:'#059669' }}>🎓 Certifié</span>}
                  </div>
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
                      {ROLE_KEYS.map(r => <option key={r} value={r}>{ROLES[r]?.label || r}</option>)}
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
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:F, minWidth:620 }}>
            <thead>
              <tr>
                <th style={{ textAlign:'left', padding:'6px 10px', color:'#94A3B8', fontWeight:600, borderBottom:'2px solid #E2E8F0', minWidth:170 }}>Action</th>
                {ROLE_KEYS.map(r => (
                  <th key={r} style={{ padding:'6px 6px', color: ROLES[r]?.color || '#94A3B8', fontWeight:700, borderBottom:'2px solid #E2E8F0', textAlign:'center', minWidth:56 }}>
                    <div style={{ fontSize:14 }}>{ROLES[r]?.icon}</div>
                    <div style={{ fontSize:9, color:'#94A3B8', fontWeight:500, marginTop:1, lineHeight:1.2 }}>
                      {ROLES[r]?.label?.split(' ')[0]}
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
                    <td key={r} style={{ padding:'7px 6px', textAlign:'center', fontSize:13 }}>
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

function TabFormation({ user, profile, membres, setMembres, loading }) {
  const [expanded,     setExpanded]     = useState(null)
  const [activeModule, setActiveModule] = useState(null)
  const canManage = canDo('gerer_formation', profile?.role)

  // Self-formation tracking (for logged-in user who is not in equipe_membres)
  function getSelfFormation() {
    try { return JSON.parse(localStorage.getItem(`aria_formation_self_${user?.id}`) || '{}') } catch { return {} }
  }
  function saveSelfFormation(data) {
    try { localStorage.setItem(`aria_formation_self_${user?.id}`, JSON.stringify(data)) } catch {}
  }

  async function handleCompleteModule(moduleKey, memberId) {
    if (memberId) {
      // Update a specific team member's formation
      const updated = membres.map(m => {
        if (m.id !== memberId) return m
        return { ...m, formation: { ...(m.formation || {}), [moduleKey]: true } }
      })
      setMembres(updated)
      await upsertEquipeMembre(updated.find(m => m.id === memberId))
    } else {
      // Update self-formation in localStorage
      const cur = getSelfFormation()
      saveSelfFormation({ ...cur, [moduleKey]: true })
    }
    setActiveModule(null)
  }

  async function handleToggleModule(memberId, moduleKey, current) {
    const updated = membres.map(m => {
      if (m.id !== memberId) return m
      return { ...m, formation: { ...(m.formation || {}), [moduleKey]: !current } }
    })
    setMembres(updated)
    await upsertEquipeMembre(updated.find(m => m.id === memberId))
  }

  const certifies     = membres.filter(m => MODULES_FORMATION.every(mod => m.formation?.[mod.k])).length
  const selfFormation = getSelfFormation()

  if (activeModule) {
    return (
      <ModuleView
        mod={activeModule.mod}
        alreadyDone={activeModule.memberId
          ? !!membres.find(m => m.id === activeModule.memberId)?.formation?.[activeModule.mod.k]
          : !!selfFormation[activeModule.mod.k]
        }
        onBack={() => setActiveModule(null)}
        onComplete={() => handleCompleteModule(activeModule.mod.k, activeModule.memberId || null)}
      />
    )
  }

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

      {/* Modules catalogue — cliquables */}
      <div style={S.card}>
        <div style={S.cardTitle}>Modules de formation ({MODULES_FORMATION.length}) — Cliquez pour démarrer</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
          {MODULES_FORMATION.map(mod => {
            const selfDone = !!selfFormation[mod.k]
            return (
              <button
                key={mod.k}
                onClick={() => setActiveModule({ mod, memberId: null })}
                style={{
                  display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px',
                  background: selfDone ? mod.bg : '#F8FAFC',
                  borderRadius:12,
                  border: selfDone ? `1.5px solid ${mod.color}44` : '1.5px solid #E2E8F0',
                  cursor:'pointer', fontFamily:F, textAlign:'left',
                  transition:'transform .15s, box-shadow .15s',
                }}
                onMouseOver={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=`0 4px 12px ${mod.color}22` }}
                onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none' }}
              >
                <span style={{ fontSize:22, flexShrink:0, marginTop:1 }}>{mod.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color: selfDone ? mod.color : '#0F172A' }}>{mod.l}</div>
                  {selfDone && <span style={{ ...S.badge, background:'#ECFDF5', color:'#059669', marginTop:4, fontSize:10 }}>✓ Validé</span>}
                </div>
                <span style={{ color: mod.color, fontSize:14, flexShrink:0 }}>›</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Progression par employé */}
      {membres.length > 0 && (
        <div style={S.card}>
          <div style={S.cardTitle}>Progression par employé</div>
          {loading ? (
            <div style={S.empty}>Chargement…</div>
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
                          {pct === 100 && <span style={{ ...S.badge, background:'#ECFDF5', color:'#059669' }}>🎓 Certifié HACCP</span>}
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
                            <div key={mod.k} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background: checked ? '#F0FDF4' : '#F8FAFC', borderRadius:10, border:`1px solid ${checked ? '#A7F3D0' : '#E2E8F0'}` }}>
                              <span style={{ fontSize:16 }}>{mod.icon}</span>
                              <button
                                onClick={() => setActiveModule({ mod, memberId: m.id })}
                                style={{ flex:1, background:'none', border:'none', fontSize:12.5, fontWeight:500, color:'#0F172A', textAlign:'left', cursor:'pointer', fontFamily:F, padding:0 }}
                              >
                                {mod.l}
                              </button>
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
      )}
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
    const next = { ...allChecked, [viewRole]: { ...(allChecked[viewRole] || {}), [key]: !(allChecked[viewRole]?.[key]) } }
    setAllChecked(next)
    localStorage.setItem(`aria_onboarding_${viewRole}`, JSON.stringify(next[viewRole]))
  }

  async function handleAriaGuide() {
    setGenerating(true)
    setAriaMsg('')
    try {
      const roleInfo = ROLES[viewRole] || ROLES.employe
      const tasks    = checklist.map(c => c.l).join(', ')
      const prompt   = `Je suis un(e) nouveau(elle) ${roleInfo.label} qui commence à utiliser l'application Aria de gestion de cuisine. Guide-moi en 6-8 étapes concrètes pour bien démarrer. Mes premières tâches : ${tasks}. Sois chaleureux, encourageant et très concret.`
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

      <div style={S.card}>
        <div style={{ ...S.rowBetween, marginBottom:14 }}>
          <div style={{ ...S.cardTitle, marginBottom:0 }}>Checklist — {ROLES[viewRole]?.label}</div>
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

      <div style={{ ...S.card, border:'1px solid #BFDBFE', background:'#EFF6FF' }}>
        <div style={{ ...S.rowBetween, marginBottom: ariaMsg ? 12 : 0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#1E40AF' }}>✦ Guide Aria personnalisé</div>
            <div style={{ fontSize:12, color:'#3B82F6', marginTop:2 }}>Aria vous oriente selon votre rôle {ROLES[viewRole]?.label}</div>
          </div>
          <button onClick={handleAriaGuide} disabled={generating} style={{ ...S.btnSm, background:'#2563EB', color:'#fff', opacity: generating ? .7 : 1, flexShrink:0 }}>
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
  const [tab,     setTab]     = useState('equipe')
  const [membres, setMembres] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    const ownerId = user.isTeamMember ? user.id : user.id
    fetchEquipeMembres(ownerId).then(({ data }) => {
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
          <button key={t.k} style={{ ...S.tab, ...(tab === t.k ? S.tabActive : {}) }} onClick={() => setTab(t.k)}>
            <span>{t.emoji}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      {tab === 'equipe'     && <TabEquipe     user={user} profile={profile} membres={membres} setMembres={setMembres} loading={loading} />}
      {tab === 'formation'  && <TabFormation  user={user} profile={profile} membres={membres} setMembres={setMembres} loading={loading} />}
      {tab === 'onboarding' && <TabOnboarding user={user} profile={profile} />}
    </div>
  )
}
