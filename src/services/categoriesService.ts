/**
 * Service de Configuration des Catégories & Sous-Catégories
 * - 100% Configurable par l'utilisateur
 * - Exportation et Importation dédiées via un fichier JSON de configuration (SANS données de transactions)
 * - Persistance dans le navigateur (LocalStorage)
 * - Émission d'événements pour mise à jour synchrone de tous les modules de l'application
 */

export interface CategoryConfigItem {
  id?: string;
  nom: string;
  color: string;
  bgColor?: string;
  keywords?: string[];
  sous_categories: string[];
}

export interface CategoriesConfigFile {
  format: 'ScanDepense-CategoriesConfig';
  version: string;
  date_export: string;
  nombre_categories: number;
  categories: CategoryConfigItem[];
}

const CATEGORIES_STORAGE_KEY = 'scandepense_custom_categories_config_v1';

// Palette de couleurs esthétiques pour les catégories
export const PRESET_COLORS = [
  '#10b981', // Émeraude (Alimentation/Nature)
  '#3b82f6', // Bleu (Transport/Déplacement)
  '#8b5cf6', // Violet (Logement/Maison)
  '#ec4899', // Rose (Loisirs/Culture)
  '#06b6d4', // Cyan (Santé/Bien-être)
  '#6366f1', // Indigo (High-Tech/Électronique)
  '#f59e0b', // Ambre (Services/Énergie)
  '#ef4444', // Rouge (Urgent/Fiscalité)
  '#14b8a6', // Sarcelle (Abonnements/Pro)
  '#84cc16', // Lime (Alimentation bio/Jardin)
  '#d946ef', // Fuchsia (Cadeaux/Mode)
  '#64748b', // Ardoise (Autre/Divers)
];

// Configuration initiale par défaut
export const DEFAULT_CATEGORIES: CategoryConfigItem[] = [
  {
    nom: 'Alimentation',
    color: '#10b981',
    bgColor: '#ecfdf5',
    keywords: [
      'carrefour', 'auchan', 'leclerc', 'monoprix', 'intermarche', 'lidl', 'aldi',
      'super u', 'casino', 'franprix', 'picard', 'biocoop', 'boulangerie', 'epicerie',
      'pain', 'lait', 'fromage', 'fruits', 'legumes', 'restaurant', 'brasserie', 'pizzeria',
      'burger', 'mcdonald', 'kfc', 'subway', 'starbucks', 'cafe', 'dejeuner', 'diner'
    ],
    sous_categories: [
      'Supermarché & Courses',
      'Boulangerie & Pâtisserie',
      'Restaurant & Traiteur',
      'Épicerie & Marché',
      'Boissons & Café',
    ],
  },
  {
    nom: 'Transport',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    keywords: [
      'total', 'totalenergies', 'shell', 'bp', 'esso', 'avia', 'essence', 'carburant',
      'gazole', 'sp95', 'sp98', 'sncf', 'ratp', 'metro', 'train', 'bus', 'tram',
      'uber', 'taxi', 'peage', 'vinci', 'parking', 'gare', 'aeroport'
    ],
    sous_categories: [
      'Carburant & Énergie',
      'Train & Transports en commun',
      'Péage & Parking',
      'VTC & Taxi',
      'Entretien véhicule',
    ],
  },
  {
    nom: 'Logement',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    keywords: [
      'leroy merlin', 'castorama', 'ikea', 'bricorama', 'brico depot', 'darty',
      'boulanger', 'quincaillerie', 'meuble', 'bricolage', 'jardin', 'maison', 'plante',
      'edf', 'engie', 'eau', 'loyer', 'charges'
    ],
    sous_categories: [
      'Bricolage & Travaux',
      'Ameublement & Déco',
      'Électricité & Chauffage',
      'Entretien & Jardin',
      'Loyer & Charges',
    ],
  },
  {
    nom: 'Loisirs',
    color: '#ec4899',
    bgColor: '#fdf2f8',
    keywords: [
      'fnac', 'cinema', 'ugc', 'pathe', 'theatre', 'concert', 'livre', 'culture',
      'sport', 'decathlon', 'fitness', 'musee', 'parc', 'jeu', 'steam', 'playstation'
    ],
    sous_categories: [
      'Livres & Presse',
      'Cinéma & Spectacles',
      'Sport & Plein air',
      'Jeux & Abonnements',
      'Voyages & Vacances',
    ],
  },
  {
    nom: 'Santé',
    color: '#06b6d4',
    bgColor: '#ecfeff',
    keywords: [
      'pharmacie', 'medecin', 'docteur', 'dentiste', 'optique', 'ophtalmo',
      'parapharmacie', 'soin', 'sante', 'medicament', 'ordonnance'
    ],
    sous_categories: [
      'Pharmacie & Parapharmacie',
      'Médecin & Soins',
      'Optique & Dentaire',
      'Bien-être',
    ],
  },
  {
    nom: 'High-Tech',
    color: '#6366f1',
    bgColor: '#eef2ff',
    keywords: [
      'apple', 'samsung', 'amazon', 'ldlc', 'materiel.net', 'informatique',
      'ordinateur', 'telephone', 'smartphone', 'cable', 'ecran', 'clavier', 'souris', 'tech'
    ],
    sous_categories: [
      'Informatique & PC',
      'Téléphonie & Mobile',
      'Accessoires & Câbles',
      'Audio & Vidéo',
      'Logiciels & Cloud',
    ],
  },
  {
    nom: 'Autre',
    color: '#64748b',
    bgColor: '#f8fafc',
    keywords: [],
    sous_categories: [
      'Fournitures diverses',
      'Cadeaux',
      'Services administratifs',
      'Frais non classés',
    ],
  },
];

class CategoriesService {
  private categories: CategoryConfigItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') {
      this.categories = [...DEFAULT_CATEGORIES];
      return;
    }

    try {
      const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.categories = parsed.map((item, idx) => ({
            id: item.id || `cat_${idx}`,
            nom: String(item.nom || 'Sans nom').trim(),
            color: item.color || PRESET_COLORS[idx % PRESET_COLORS.length],
            bgColor: item.bgColor,
            keywords: Array.isArray(item.keywords) ? item.keywords : [],
            sous_categories: Array.isArray(item.sous_categories)
              ? item.sous_categories.map((s: any) => String(s).trim()).filter(Boolean)
              : ['Divers'],
          }));
          return;
        }
      }
    } catch (e) {
      console.warn('Erreur de lecture des catégories personnalisées:', e);
    }

    this.categories = [...DEFAULT_CATEGORIES];
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(this.categories));
      this.notifyListeners();
    } catch (e) {
      console.warn('Erreur de sauvegarde des catégories:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
    }
  }

  public getAll(): CategoryConfigItem[] {
    return [...this.categories];
  }

  public getCategoryNames(): string[] {
    return this.categories.map((c) => c.nom);
  }

  public getSubcategories(categoryName: string): string[] {
    const found = this.categories.find(
      (c) => c.nom.toLowerCase() === categoryName.toLowerCase()
    );
    if (found && found.sous_categories.length > 0) {
      return [...found.sous_categories];
    }
    return ['Divers'];
  }

  public getCategoryMeta(categoryName: string): { label: string; color: string; bgColor: string } {
    const found = this.categories.find(
      (c) => c.nom.toLowerCase() === categoryName.toLowerCase()
    );
    if (found) {
      return {
        label: found.nom,
        color: found.color,
        bgColor: found.bgColor || `${found.color}15`,
      };
    }

    // Génération déterministe d'une couleur si non trouvée
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = PRESET_COLORS[Math.abs(hash) % PRESET_COLORS.length];
    return {
      label: categoryName,
      color,
      bgColor: `${color}15`,
    };
  }

  public addCategory(
    nom: string,
    color?: string,
    sous_categories: string[] = ['Divers'],
    keywords: string[] = []
  ): boolean {
    const cleanNom = nom.trim();
    if (!cleanNom) return false;
    if (this.categories.some((c) => c.nom.toLowerCase() === cleanNom.toLowerCase())) {
      return false; // Existe déjà
    }

    const assignedColor = color || PRESET_COLORS[this.categories.length % PRESET_COLORS.length];
    const newCat: CategoryConfigItem = {
      id: `cat_${Date.now()}`,
      nom: cleanNom,
      color: assignedColor,
      keywords,
      sous_categories: sous_categories.length > 0 ? sous_categories : ['Divers'],
    };

    this.categories.push(newCat);
    this.saveToStorage();
    return true;
  }

  public updateCategory(
    oldNom: string,
    updated: { nom?: string; color?: string; sous_categories?: string[]; keywords?: string[] }
  ): boolean {
    const index = this.categories.findIndex(
      (c) => c.nom.toLowerCase() === oldNom.toLowerCase()
    );
    if (index === 0 && this.categories.length === 1 && !updated.nom) return false;
    if (index === -1) return false;

    const current = this.categories[index];
    const newNom = updated.nom ? updated.nom.trim() : current.nom;

    // Si le nom change, vérifier les doublons
    if (newNom.toLowerCase() !== oldNom.toLowerCase()) {
      if (this.categories.some((c) => c.nom.toLowerCase() === newNom.toLowerCase())) {
        return false;
      }
    }

    this.categories[index] = {
      ...current,
      nom: newNom,
      color: updated.color || current.color,
      keywords: updated.keywords || current.keywords || [],
      sous_categories:
        updated.sous_categories !== undefined
          ? updated.sous_categories.filter((s) => s.trim().length > 0)
          : current.sous_categories,
    };

    this.saveToStorage();
    return true;
  }

  public deleteCategory(nom: string): boolean {
    if (this.categories.length <= 1) return false; // Conserver au moins 1 catégorie
    const before = this.categories.length;
    this.categories = this.categories.filter((c) => c.nom.toLowerCase() !== nom.toLowerCase());
    if (this.categories.length !== before) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public addSubcategory(categoryNom: string, subNom: string): boolean {
    const cleanSub = subNom.trim();
    if (!cleanSub) return false;
    const cat = this.categories.find(
      (c) => c.nom.toLowerCase() === categoryNom.toLowerCase()
    );
    if (!cat) return false;
    if (cat.sous_categories.some((s) => s.toLowerCase() === cleanSub.toLowerCase())) {
      return false; // Existe déjà
    }
    cat.sous_categories.push(cleanSub);
    this.saveToStorage();
    return true;
  }

  public removeSubcategory(categoryNom: string, subNom: string): boolean {
    const cat = this.categories.find(
      (c) => c.nom.toLowerCase() === categoryNom.toLowerCase()
    );
    if (!cat) return false;
    if (cat.sous_categories.length <= 1) return false; // Conserver au moins 1 sous-catégorie
    cat.sous_categories = cat.sous_categories.filter(
      (s) => s.toLowerCase() !== subNom.toLowerCase()
    );
    this.saveToStorage();
    return true;
  }

  public resetToDefault(): CategoryConfigItem[] {
    this.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    this.saveToStorage();
    return [...this.categories];
  }

  /**
   * Exportation du fichier de configuration JSON (SANS données de transactions)
   */
  public exportJSON(): string {
    const payload: CategoriesConfigFile = {
      format: 'ScanDepense-CategoriesConfig',
      version: '1.0.0',
      date_export: new Date().toISOString(),
      nombre_categories: this.categories.length,
      categories: this.categories.map((c) => ({
        nom: c.nom,
        color: c.color,
        sous_categories: c.sous_categories,
        keywords: c.keywords && c.keywords.length > 0 ? c.keywords : undefined,
      })),
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Importation d'un fichier de configuration JSON de catégories & sous-catégories
   * Accepte :
   * 1. Format ScanDepense { format: '...', categories: [...] }
   * 2. Tableau direct [ { nom: '...', sous_categories: [...] } ]
   * 3. Dictionnaire simple { "Alimentation": ["Courses", "Boulangerie"], "Transport": [...] }
   */
  public importJSON(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      if (!jsonString || !jsonString.trim()) {
        return { success: false, count: 0, error: 'Le contenu JSON est vide.' };
      }

      const parsed = JSON.parse(jsonString);
      let newCategories: CategoryConfigItem[] = [];

      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.categories)) {
          // Format 1 : { categories: [ ... ] }
          newCategories = parsed.categories;
        } else if (Array.isArray(parsed)) {
          // Format 2 : [ { nom: "...", sous_categories: [ ... ] } ]
          newCategories = parsed;
        } else {
          // Format 3 : Dictionnaire clef-valeur { "NomCatégorie": ["SousCat1", "SousCat2"] }
          const keys = Object.keys(parsed).filter((k) => k !== 'format' && k !== 'version');
          if (keys.length > 0) {
            newCategories = keys.map((key, idx) => ({
              nom: key,
              color: PRESET_COLORS[idx % PRESET_COLORS.length],
              sous_categories: Array.isArray(parsed[key])
                ? parsed[key].map((s: any) => String(s).trim()).filter(Boolean)
                : ['Divers'],
            }));
          }
        }
      }

      if (!Array.isArray(newCategories) || newCategories.length === 0) {
        return {
          success: false,
          count: 0,
          error: 'Aucune catégorie valide trouvée dans le fichier de configuration JSON.',
        };
      }

      // Normalisation des catégories importées
      const validated: CategoryConfigItem[] = [];
      const seenNames = new Set<string>();

      for (let i = 0; i < newCategories.length; i++) {
        const item: any = newCategories[i];
        if (!item || typeof item !== 'object') continue;

        const nom = String(item.nom || item.name || item.titre || `Catégorie ${i + 1}`).trim();
        if (!nom) continue;

        const lowerNom = nom.toLowerCase();
        if (seenNames.has(lowerNom)) continue; // Évite les doublons
        seenNames.add(lowerNom);

        const color =
          item.color && typeof item.color === 'string' && item.color.startsWith('#')
            ? item.color
            : PRESET_COLORS[validated.length % PRESET_COLORS.length];

        let sous_categories: string[] = [];
        const rawSubs = item.sous_categories || item.subcategories || item.sousCategories;
        if (Array.isArray(rawSubs)) {
          sous_categories = rawSubs.map((s) => String(s).trim()).filter(Boolean);
        }
        if (sous_categories.length === 0) {
          sous_categories = ['Divers'];
        }

        validated.push({
          id: `cat_imported_${Date.now()}_${i}`,
          nom,
          color,
          keywords: Array.isArray(item.keywords) ? item.keywords : [],
          sous_categories,
        });
      }

      if (validated.length === 0) {
        return {
          success: false,
          count: 0,
          error: 'Le fichier ne contient aucune catégorie valide avec un nom.',
        };
      }

      this.categories = validated;
      this.saveToStorage();
      return { success: true, count: validated.length };
    } catch (e: any) {
      return { success: false, count: 0, error: `Erreur d'analyse JSON: ${e.message}` };
    }
  }
}

export const categoriesService = new CategoriesService();
