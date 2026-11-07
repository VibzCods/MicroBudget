/**
 * Structure des Données (Data Model) stricte pour ScanDépense
 * Inclut obligatoirement l'heure et la TVA :
 * 
 * - id (string / timestamp)
 * - date (ISO format YYYY-MM-DD)
 * - heure (format HH:MM)
 * - commercant (string)
 * - montant_total (number)
 * - tva (number : montant de la TVA en €)
 * - taux_tva (number : taux de TVA en %, optionnel)
 * - categorie (Alimentation, Transport, Logement, Loisirs, Santé, High-Tech, Autre)
 * - sous_categorie (string)
 * - articles (array d'objets : [{ nom, prix, quantite }])
 * - fichier_image (string / base64 ou URL blob locale, optionnel)
 */

export type ExpenseCategory =
  | 'Alimentation'
  | 'Transport'
  | 'Logement'
  | 'Loisirs'
  | 'Santé'
  | 'High-Tech'
  | 'Autre';

export interface ArticleItem {
  nom: string;
  prix: number;
  quantite: number;
}

export interface TransactionTicket {
  id: string;               // Identifiant unique
  date: string;             // Date au format ISO YYYY-MM-DD
  heure: string;            // Heure de la transaction (HH:MM)
  commercant: string;       // Enseigne ou commerçant
  montant_total: number;    // Montant total TTC (€)
  tva: number;              // Montant de la TVA (€)
  taux_tva?: number;        // Taux de TVA (ex: 20, 10, 5.5, 2.1)
  categorie: ExpenseCategory; // Catégorie principale
  sous_categorie: string;   // Sous-catégorie
  articles: ArticleItem[];  // Articles détaillés [{ nom, prix, quantite }]
  fichier_image?: string;   // Image du ticket (base64 ou blob URL, optionnel)
  mode_paiement?: string;   // Mode de règlement (Carte, Espèces, etc.)
  commentaires?: string;    // Notes ou descriptif
}

// Catalogue des sous-catégories par catégorie parente
export const SOUS_CATEGORIES_MAP: Record<ExpenseCategory, string[]> = {
  Alimentation: ['Supermarché & Courses', 'Boulangerie & Pâtisserie', 'Restaurant & Traiteur', 'Épicerie & Marché', 'Boissons & Café'],
  Transport: ['Carburant & Énergie', 'Train & Transports en commun', 'Péage & Parking', 'VTC & Taxi', 'Entretien véhicule'],
  Logement: ['Bricolage & Travaux', 'Ameublement & Déco', 'Électricité & Chauffage', 'Entretien & Jardin', 'Loyer & Charges'],
  Loisirs: ['Livres & Presse', 'Cinéma & Spectacles', 'Sport & Plein air', 'Jeux & Abonnements', 'Voyages & Vacances'],
  Santé: ['Pharmacie & Parapharmacie', 'Médecin & Soins', 'Optique & Dentaire', 'Bien-être'],
  'High-Tech': ['Informatique & PC', 'Téléphonie & Mobile', 'Accessoires & Câbles', 'Audio & Vidéo', 'Logiciels & Cloud'],
  Autre: ['Fournitures diverses', 'Cadeaux', 'Services administratifs', 'Frais non classés'],
};

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  color: string;
  bgColor: string;
  keywords: string[];
}

export const CATEGORIES_CONFIG: Record<ExpenseCategory, CategoryMeta> = {
  Alimentation: {
    id: 'Alimentation',
    label: 'Alimentation',
    color: '#10b981',
    bgColor: '#ecfdf5',
    keywords: [
      'carrefour', 'auchan', 'leclerc', 'monoprix', 'intermarche', 'lidl', 'aldi',
      'super u', 'casino', 'franprix', 'picard', 'biocoop', 'boulangerie', 'epicerie',
      'pain', 'lait', 'fromage', 'fruits', 'legumes', 'restaurant', 'brasserie', 'pizzeria',
      'burger', 'mcdonald', 'kfc', 'subway', 'starbucks', 'cafe', 'dejeuner', 'diner'
    ],
  },
  Transport: {
    id: 'Transport',
    label: 'Transport',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    keywords: [
      'total', 'totalenergies', 'shell', 'bp', 'esso', 'avia', 'essence', 'carburant',
      'gazole', 'sp95', 'sp98', 'sncf', 'ratp', 'metro', 'train', 'bus', 'tram',
      'uber', 'taxi', 'peage', 'vinci', 'parking', 'gare', 'aeroport'
    ],
  },
  Logement: {
    id: 'Logement',
    label: 'Logement',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    keywords: [
      'leroy merlin', 'castorama', 'ikea', 'bricorama', 'brico depot', 'darty',
      'boulanger', 'quincaillerie', 'meuble', 'bricolage', 'jardin', 'maison', 'plante',
      'edf', 'engie', 'eau', 'loyer', 'charges'
    ],
  },
  Loisirs: {
    id: 'Loisirs',
    label: 'Loisirs',
    color: '#ec4899',
    bgColor: '#fdf2f8',
    keywords: [
      'fnac', 'cinema', 'ugc', 'pathe', 'theatre', 'concert', 'livre', 'culture',
      'sport', 'decathlon', 'fitness', 'musee', 'parc', 'jeu', 'steam', 'playstation'
    ],
  },
  Santé: {
    id: 'Santé',
    label: 'Santé',
    color: '#06b6d4',
    bgColor: '#ecfeff',
    keywords: [
      'pharmacie', 'medecin', 'docteur', 'dentiste', 'optique', 'ophtalmo',
      'parapharmacie', 'soin', 'sante', 'medicament', 'ordonnance'
    ],
  },
  'High-Tech': {
    id: 'High-Tech',
    label: 'High-Tech',
    color: '#6366f1',
    bgColor: '#eef2ff',
    keywords: [
      'apple', 'samsung', 'amazon', 'ldlc', 'materiel.net', 'informatique',
      'ordinateur', 'telephone', 'smartphone', 'cable', 'ecran', 'clavier', 'souris', 'tech'
    ],
  },
  Autre: {
    id: 'Autre',
    label: 'Autre',
    color: '#64748b',
    bgColor: '#f8fafc',
    keywords: [],
  },
};

export type TimeFilter = 'all' | 'this_month' | 'last_30_days' | 'last_month' | 'this_year';
