export const DLC_NORMES = {
  mise_en_place: {
    default: 3,
    refrigere: 3,
    description: "Préparations froides réfrigérées"
  },
  sous_vide: {
    default: 6,
    refrigere: 6,
    description: "Préparations sous vide réfrigérées"
  },
  congelation: {
    default: 90,
    viande_hachee: 30,
    poisson: 30,
    viande: 90,
    plat_prepare: 90,
    description: "Produits congelés"
  }
};

export const BONNES_PRATIQUES_CONGELATION = [
  "Refroidir rapidement avant congélation (moins de 2h pour passer de 63°C à 10°C)",
  "Ne jamais congeler un produit déjà décongelé",
  "Température de congélation : -18°C minimum",
  "Emballer hermétiquement avant congélation",
  "Étiqueter obligatoirement avec date et DLC",
  "Décongeler en chambre froide positive uniquement",
  "Consommer dans les 24h après décongélation"
];
