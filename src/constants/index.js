// ═══════════════════════════════════════════════════════
//  ARIA — Design Tokens & Constants
// ═══════════════════════════════════════════════════════

export const COLORS = {
  bg:"#F8FAFC",bgCard:"#FFFFFF",bgSide:"#0F172A",bgSideSub:"#1E293B",
  primary:"#2563EB",primaryHov:"#1D4ED8",primaryBg:"#EFF6FF",primaryBr:"#BFDBFE",primaryLight:"#DBEAFE",
  success:"#10B981",successBg:"#ECFDF5",successBr:"#A7F3D0",
  warning:"#F59E0B",warningBg:"#FFFBEB",warningBr:"#FDE68A",
  danger:"#EF4444",dangerBg:"#FEF2F2",dangerBr:"#FECACA",
  info:"#6366F1",infoBg:"#EEF2FF",infoBr:"#C7D2FE",
  t1:"#0F172A",t2:"#475569",t3:"#94A3B8",t4:"#CBD5E1",
  border:"#E2E8F0",borderHi:"#CBD5E1",
  sideT1:"#F8FAFC",sideT2:"#94A3B8",sideT3:"#475569",
};

export const FONTS = {
  sans:"'Plus Jakarta Sans','Inter',sans-serif",
  mono:"'DM Mono','JetBrains Mono',monospace",
  display:"'Plus Jakarta Sans',sans-serif",
};

export const CAT_ICON = {
  viande:"🥩",poisson:"🐟",laitier:"🧈",
  epicerie:"🏪",legumes:"🥦",boissons:"🍶",autre:"📦",
};

export const CAT_COLOR = {
  viande:"#EF4444",poisson:"#3B82F6",laitier:"#F59E0B",
  epicerie:"#10B981",legumes:"#22C55E",boissons:"#8B5CF6",autre:"#94A3B8",
};

export const CAT_BG = {
  viande:"#FEF2F2",poisson:"#EFF6FF",laitier:"#FFFBEB",
  epicerie:"#ECFDF5",legumes:"#F0FDF4",boissons:"#F5F3FF",autre:"#F8FAFC",
};

export const UNITES = [
  "kg","g","L","cl","ml","pièce","caisse","carton",
  "bouteille","sac","boîte","barquette","filet","botte","unité",
];

export const JOURS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"];

export const MODES_COMMANDE = [
  {k:"tel",l:"Téléphone",icon:"📞",desc:"Résumé vocal à lire"},
  {k:"mail",l:"Email",icon:"✉️",desc:"Email pré-rédigé"},
  {k:"site",l:"Site web",icon:"🌐",desc:"Liste à cocher"},
];

export const ROLES = {
  superadmin:   {label:"Super Admin",        icon:"👑", color:"#F59E0B"},
  proprietaire: {label:"Propriétaire",       icon:"🏪", color:"#6366F1"},
  chef:         {label:"Chef de cuisine",    icon:"👨‍🍳", color:"#10B981"},
  second:       {label:"Second de cuisine",  icon:"🥈", color:"#0EA5E9"},
  cuisinier:    {label:"Cuisinier",          icon:"🧑‍🍳", color:"#3B82F6"},
  patissier:    {label:"Pâtissier",          icon:"🎂",  color:"#EC4899"},
  employe:      {label:"Employé",            icon:"👤",  color:"#94A3B8"},
  apprenti:     {label:"Apprenti",           icon:"🎓",  color:"#8B5CF6"},
  stagiaire:    {label:"Stagiaire",          icon:"📋",  color:"#06B6D4"},
};

export const NAV_GROUPS = [
  {
    label: 'Quotidien',
    items: [
      { k:'dashboard',  label:'Tableau de bord', emoji:'🏠' },
      { k:'reception',  label:'Réceptions',      emoji:'📷' },
      { k:'etiquettes', label:'Étiquettes DLC',  emoji:'🏷️' },
    ],
  },
  {
    label: 'Cuisine',
    items: [
      { k:'mise_en_place', label:'Mise en place', emoji:'📋' },
      { k:'recettes',      label:'Recettes',      emoji:'📖' },
      { k:'stock',         label:'Stock',         emoji:'📦' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { k:'business',  label:'Business',  emoji:'📊' },
      { k:'commandes', label:'Commandes', emoji:'🛒' },
      { k:'equipe',    label:'Équipe',    emoji:'👥' },
    ],
  },
  {
    label: 'IA',
    items: [
      { k:'aria', label:'Aria', emoji:'✦' },
    ],
  },
  {
    label: 'HACCP',
    items: [
      { k:'haccp', label:'HACCP', emoji:'✅' },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export const BOTTOM_NAV_ITEMS = [
  { k:'dashboard',  label:'Accueil',  emoji:'🏠' },
  { k:'stock',      label:'Stock',    emoji:'📦' },
  { k:'aria',       label:'Aria',     emoji:'✦'  },
  { k:'etiquettes', label:'DLC',      emoji:'🏷️' },
  { k:'business',   label:'Business', emoji:'📊' },
];

export const ALLERGENES = [
  {k:"gluten",        label:"Gluten",          icon:"🌾"},
  {k:"crustaces",     label:"Crustacés",       icon:"🦐"},
  {k:"oeufs",         label:"Œufs",            icon:"🥚"},
  {k:"poisson",       label:"Poisson",         icon:"🐟"},
  {k:"arachides",     label:"Arachides",       icon:"🥜"},
  {k:"soja",          label:"Soja",            icon:"🫘"},
  {k:"lait",          label:"Lait",            icon:"🥛"},
  {k:"fruits_a_coque",label:"Fruits à coque",  icon:"🌰"},
  {k:"celeri",        label:"Céleri",          icon:"🌿"},
  {k:"moutarde",      label:"Moutarde",        icon:"💛"},
  {k:"sesame",        label:"Sésame",          icon:"🌱"},
  {k:"sulfites",      label:"Sulfites",        icon:"🍷"},
  {k:"lupin",         label:"Lupin",           icon:"🌼"},
  {k:"mollusques",    label:"Mollusques",      icon:"🦑"},
];

export const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5);
export const fdate = () => new Date().toLocaleDateString("fr-FR");
export const ftime = () => new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
export const initials = (name) => name.trim().split(/\s+/).map(w=>w[0].toUpperCase()).slice(0,2).join("");

export function dlcDays(dlc){
  if(!dlc)return null;
  const[d,m,y]=dlc.split("/");
  const dt=new Date(`${y}-${m}-${d}`);
  if(isNaN(dt))return null;
  return Math.ceil((dt-new Date())/86400000);
}

export function dlcStatus(dlc){
  const n=dlcDays(dlc);
  if(n===null)return"unknown";
  if(n<0)return"expired";
  if(n<=3)return"critical";
  if(n<=7)return"warn";
  return"ok";
}

export function dlcColor(s){
  return{ok:COLORS.success,warn:COLORS.warning,critical:COLORS.danger,expired:COLORS.danger}[s]||COLORS.t3;
}

export function dlcLabel(s,dlc){
  const n=dlcDays(dlc);
  if(s==="expired")return"Expiré";
  if(s==="critical")return`J-${n}`;
  if(s==="warn")return`J-${n}`;
  if(s==="ok")return"OK";
  return"—";
}

export function isCritique(item){
  if(item.seuil_min==null||item.seuil_min==="")return parseFloat(item.q)<=2;
  return parseFloat(item.q)<=parseFloat(item.seuil_min);
}

export function checkPwd(pwd){
  return{
    length:pwd.length>=8,
    upper:/[A-Z]/.test(pwd),
    number:/[0-9]/.test(pwd),
    special:/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd),
  };
}

export function pwdScore(pwd){return Object.values(checkPwd(pwd)).filter(Boolean).length;}
export function pwdStrengthColor(s){return s<=1?COLORS.danger:s<=2?COLORS.warning:s<=3?"#F0A500":COLORS.success;}
export function pwdStrengthLabel(s){return s<=1?"Très faible":s<=2?"Faible":s<=3?"Moyen":"Fort ✓";}