/**
 * Service de stockage modulaire et autonome pour ScanDépense
 * - Stockage principal : IndexedDB
 * - Repli automatique : LocalStorage
 * - Importation/Exportation flexible (fusion ou remplacement)
 * - Gestion pérenne du cycle de vie (pas de réinjection automatique intempestive)
 */
import { TransactionTicket, ArticleItem, ExpenseCategory } from '../types/expense';
import { SAMPLE_EXPENSES } from '../data/sampleReceipts';
import { categoriesService } from './categoriesService';

const DB_NAME = 'ScanDepenseDB';
const DB_VERSION = 2;
const STORE_NAME = 'tickets';
const LOCALSTORAGE_KEY = 'scandepense_tickets_backup';
const HAS_INITIALIZED_KEY = 'scandepense_has_initialized_v2';

class StorageService {
  private db: IDBDatabase | null = null;
  private isIndexedDBAvailable: boolean = true;

  constructor() {
    this.checkIndexedDBSupport();
  }

  private checkIndexedDBSupport(): boolean {
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.isIndexedDBAvailable = false;
      return false;
    }
    return true;
  }

  public async init(): Promise<void> {
    if (!this.checkIndexedDBSupport()) return;

    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('categorie', 'categorie', { unique: false });
            store.createIndex('commercant', 'commercant', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve();
        };

        request.onerror = () => {
          this.isIndexedDBAvailable = false;
          resolve();
        };
      } catch {
        this.isIndexedDBAvailable = false;
        resolve();
      }
    });
  }

  /**
   * Initialisation première visite uniquement.
   * Ne réinjecte JAMAIS de données si l'utilisateur a réinitialisé la base.
   */
  public async seedInitialDataIfFirstTime(): Promise<void> {
    try {
      const alreadyInitialized = localStorage.getItem(HAS_INITIALIZED_KEY);
      if (!alreadyInitialized) {
        localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
        const existing = await this.getAll();
        if (existing.length === 0) {
          await this.saveBatch(SAMPLE_EXPENSES);
        }
      }
    } catch (e) {
      console.warn('Initialisation première visite ignorée:', e);
    }
  }

  public async getAll(): Promise<TransactionTicket[]> {
    await this.ensureReady();

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => {
            const results = (request.result as TransactionTicket[]) || [];
            results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            resolve(results);
          };

          request.onerror = () => {
            resolve(this.getFromLocalStorage());
          };
        } catch {
          resolve(this.getFromLocalStorage());
        }
      });
    }

    return this.getFromLocalStorage();
  }

  public async save(ticket: TransactionTicket): Promise<TransactionTicket> {
    await this.ensureReady();
    const normalized = this.normalizeTicket(ticket);

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(normalized);

          tx.oncomplete = () => {
            this.syncToLocalStorage(normalized);
            resolve(normalized);
          };

          tx.onerror = () => {
            this.saveToLocalStorageDirectly(normalized);
            resolve(normalized);
          };
        } catch {
          this.saveToLocalStorageDirectly(normalized);
          resolve(normalized);
        }
      });
    }

    this.saveToLocalStorageDirectly(normalized);
    return normalized;
  }

  /**
   * Sauvegarde groupée atomique (idéale pour les imports volumineux)
   */
  public async saveBatch(tickets: TransactionTicket[]): Promise<number> {
    await this.ensureReady();
    if (tickets.length === 0) return 0;

    const normalizedList = tickets.map((t) => this.normalizeTicket(t));

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);

          for (const item of normalizedList) {
            store.put(item);
          }

          tx.oncomplete = () => {
            // Synchronisation LocalStorage en une passe
            const current = this.getFromLocalStorage();
            const map = new Map<string, TransactionTicket>();
            for (const c of current) map.set(c.id, c);
            for (const item of normalizedList) {
              map.set(item.id, { ...item, fichier_image: undefined });
            }
            try {
              localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(Array.from(map.values())));
            } catch {
              // Quota dépassé ignoré
            }
            resolve(normalizedList.length);
          };

          tx.onerror = () => {
            for (const item of normalizedList) {
              this.saveToLocalStorageDirectly(item);
            }
            resolve(normalizedList.length);
          };
        } catch {
          for (const item of normalizedList) {
            this.saveToLocalStorageDirectly(item);
          }
          resolve(normalizedList.length);
        }
      });
    }

    for (const item of normalizedList) {
      this.saveToLocalStorageDirectly(item);
    }
    return normalizedList.length;
  }

  public async delete(id: string): Promise<void> {
    await this.ensureReady();

    if (this.isIndexedDBAvailable && this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(id);

          tx.oncomplete = () => {
            this.deleteFromLocalStorage(id);
            resolve();
          };

          tx.onerror = () => {
            this.deleteFromLocalStorage(id);
            resolve();
          };
        } catch {
          this.deleteFromLocalStorage(id);
          resolve();
        }
      });
    }

    this.deleteFromLocalStorage(id);
  }

  /**
   * Réinitialisation totale : vide IndexedDB et LocalStorage
   * et verrouille l'initialisation pour ne PAS re-seeder automatiquement
   */
  public async clear(): Promise<void> {
    await this.ensureReady();

    if (this.isIndexedDBAvailable && this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();

          req.onsuccess = () => resolve();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    try {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      localStorage.removeItem('scandepense_tickets_backup');
      localStorage.removeItem('scandepense_expenses_backup');
      // Marquer comme initialisé pour empêcher tout auto-seed
      localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
    } catch {
      // Ignoré
    }
  }

  /**
   * Recharge explicitement les données de test (action volontaire de l'utilisateur)
   */
  public async seedDemoData(force: boolean = false): Promise<TransactionTicket[]> {
    if (force) {
      await this.saveBatch(SAMPLE_EXPENSES);
      return this.getAll();
    }
    return this.getAll();
  }

  public async exportJSON(): Promise<string> {
    const items = await this.getAll();
    const exportPayload = {
      format: 'ScanDépense-JSON',
      version: '2.0.0',
      date_export: new Date().toISOString(),
      nombre_transactions: items.length,
      transactions: items,
    };
    return JSON.stringify(exportPayload, null, 2);
  }

  /**
   * Importation flexible et robuste de données JSON
   * - mode = 'merge' : ajoute les tickets du fichier aux tickets existants
   * - mode = 'replace' : remplace l'intégralité de la base par le contenu du fichier (même si vide ou quasi-vide)
   */
  public async importJSON(
    jsonString: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ importedCount: number; totalCount: number; errors: string[] }> {
    const errors: string[] = [];
    const validTickets: TransactionTicket[] = [];

    try {
      if (!jsonString || !jsonString.trim()) {
        if (mode === 'replace') {
          await this.clear();
          return { importedCount: 0, totalCount: 0, errors: ['Contenu vide : la base a été entièrement vidée.'] };
        }
        return { importedCount: 0, totalCount: (await this.getAll()).length, errors: ['Contenu JSON vide.'] };
      }

      const parsed = JSON.parse(jsonString);
      let list: any[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.transactions)) list = parsed.transactions;
        else if (Array.isArray(parsed.expenses)) list = parsed.expenses;
        else if (Array.isArray(parsed.tickets)) list = parsed.tickets;
        else if (Array.isArray(parsed.data)) list = parsed.data;
        else if (Array.isArray(parsed.items)) list = parsed.items;
        else if (Array.isArray(parsed.records)) list = parsed.records;
        else if (
          // Objet unique représentant une transaction seule
          parsed.commercant !== undefined ||
          parsed.montant_total !== undefined ||
          parsed.merchant !== undefined ||
          parsed.total !== undefined ||
          parsed.amount !== undefined ||
          parsed.categorie !== undefined ||
          parsed.category !== undefined ||
          parsed.articles !== undefined
        ) {
          list = [parsed];
        } else {
          // Objet vide ou méta sans tableau
          list = [];
        }
      } else {
        throw new Error('Structure JSON invalide. Format attendu : [ ... ] ou { "transactions": [ ... ] }');
      }

      // Si le fichier est complètement vide
      if (list.length === 0) {
        if (mode === 'replace') {
          await this.clear();
          return {
            importedCount: 0,
            totalCount: 0,
            errors: ['Le fichier ne contient aucun ticket : la base a été réinitialisée à 0 transaction.'],
          };
        }
        return {
          importedCount: 0,
          totalCount: (await this.getAll()).length,
          errors: ['Le fichier JSON ne contient aucune transaction à ajouter.'],
        };
      }

      // Traitement tolérant même pour les objets quasi-vides
      const now = new Date();
      const defaultDate = now.toISOString().split('T')[0];
      const defaultHeure = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item !== 'object') continue;

        // Commerçant tolérant
        const rawCommercant =
          item.commercant ||
          item.merchant ||
          item.magasin ||
          item.nom ||
          item.name ||
          item.enseigne ||
          item.store ||
          item.title ||
          item.fournisseur;
        let commercant = String(rawCommercant || '').trim();
        if (!commercant) {
          commercant = item.categorie ? `Dépense ${item.categorie}` : `Ticket #${i + 1}`;
        }

        // Articles tolérants
        const articles: ArticleItem[] = [];
        let articlesSum = 0;
        if (Array.isArray(item.articles)) {
          for (const art of item.articles) {
            if (art && typeof art === 'object') {
              const artNom = String(art.nom || art.name || 'Article').trim();
              const prixRaw = art.prix !== undefined ? art.prix : art.price;
              const prix =
                typeof prixRaw === 'number'
                  ? prixRaw
                  : parseFloat(String(prixRaw || 0).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
              const qteRaw = art.quantite !== undefined ? art.quantite : art.quantity;
              const quantite =
                typeof qteRaw === 'number'
                  ? qteRaw
                  : parseInt(String(qteRaw || 1).replace(/[^\d]/g, ''), 10) || 1;
              articles.push({ nom: artNom, prix: Number(prix.toFixed(2)), quantite });
              articlesSum += prix * quantite;
            }
          }
        }

        // Montant Total tolérant
        const rawMontant =
          item.montant_total !== undefined
            ? item.montant_total
            : item.totalAmount !== undefined
            ? item.totalAmount
            : item.montant !== undefined
            ? item.montant
            : item.total !== undefined
            ? item.total
            : item.amount !== undefined
            ? item.amount
            : item.prix !== undefined
            ? item.prix
            : item.price;

        let montant_total = 0;
        if (typeof rawMontant === 'number') {
          montant_total = rawMontant;
        } else if (typeof rawMontant === 'string') {
          const cleaned = rawMontant.replace(/[^\d.,-]/g, '').replace(',', '.');
          montant_total = parseFloat(cleaned) || 0;
        } else if (articlesSum > 0) {
          montant_total = articlesSum;
        }

        // Date tolérante (YYYY-MM-DD ou DD/MM/YYYY ou timestamp)
        let date = String(item.date || item.date_ticket || '').trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
          date = date.substring(0, 10);
        } else if (/^\d{2}[/-]\d{2}[/-]\d{4}/.test(date)) {
          const parts = date.split(/[/-]/);
          date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          date = defaultDate;
        }

        // Heure tolérante (HH:MM ou HHhMM)
        let heure = String(item.heure || item.time || item.horaire || '').trim();
        if (/^\d{1,2}[:h]\d{2}/.test(heure)) {
          heure = heure.replace('h', ':');
          if (heure.length === 4) heure = '0' + heure;
        } else {
          heure = defaultHeure;
        }

        // TVA tolérante
        const rawTva =
          item.tva !== undefined
            ? item.tva
            : item.vatAmount !== undefined
            ? item.vatAmount
            : item.tax !== undefined
            ? item.tax
            : item.montant_tva;
        let tva = 0;
        if (typeof rawTva === 'number') {
          tva = rawTva;
        } else if (typeof rawTva === 'string') {
          const cleaned = rawTva.replace(/[^\d.,-]/g, '').replace(',', '.');
          tva = parseFloat(cleaned) || 0;
        }

        // Catégorie tolérante
        const rawCategory = String(item.categorie || item.category || '').trim();
        const configuredCats = categoriesService.getCategoryNames();
        let categorie: ExpenseCategory = 'Autre';
        if (rawCategory) {
          const match = configuredCats.find((c) => c.toLowerCase() === rawCategory.toLowerCase());
          if (match) {
            categorie = match;
          } else {
            categorie = rawCategory; // Conserve la catégorie personnalisée de l'import
          }
        } else if (configuredCats.length > 0) {
          categorie = configuredCats[0];
        }

        const sous_categorie = String(item.sous_categorie || item.sousCategorie || item.subCategory || 'Divers').trim();

        const validItem: TransactionTicket = {
          id: item.id ? String(item.id) : `rec_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          date,
          heure,
          commercant,
          montant_total: Number(montant_total.toFixed(2)),
          tva: Number(tva.toFixed(2)),
          taux_tva: typeof item.taux_tva === 'number' ? item.taux_tva : undefined,
          categorie,
          sous_categorie: sous_categorie || 'Divers',
          articles,
          fichier_image: item.fichier_image || item.receiptImageData || undefined,
          mode_paiement: item.mode_paiement || item.paymentMethod || 'Carte Bancaire',
          commentaires: item.commentaires || item.notes || '',
        };

        validTickets.push(validItem);
      }

      if (mode === 'replace') {
        // En mode remplacement : on vide d'abord TOUTE l'ancienne base
        await this.clear();
      }

      if (validTickets.length > 0) {
        await this.saveBatch(validTickets);
      }

      const totalAfter = (await this.getAll()).length;
      return { importedCount: validTickets.length, totalCount: totalAfter, errors };
    } catch (e: any) {
      errors.push(`Erreur de lecture du fichier JSON: ${e.message}`);
      return { importedCount: 0, totalCount: (await this.getAll()).length, errors };
    }
  }

  public async exportCSV(): Promise<string> {
    const items = await this.getAll();
    const headers = [
      'id',
      'date',
      'heure',
      'commercant',
      'categorie',
      'sous_categorie',
      'montant_total',
      'tva',
      'mode_paiement',
      'nb_articles',
      'commentaires',
    ];

    const rows = items.map((rec) => [
      `"${rec.id}"`,
      `"${rec.date}"`,
      `"${rec.heure || ''}"`,
      `"${rec.commercant.replace(/"/g, '""')}"`,
      `"${rec.categorie}"`,
      `"${rec.sous_categorie}"`,
      rec.montant_total.toFixed(2),
      rec.tva ? rec.tva.toFixed(2) : '0.00',
      `"${rec.mode_paiement || ''}"`,
      rec.articles?.length || 0,
      `"${(rec.commentaires || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    return '\uFEFF' + csvContent;
  }

  private normalizeTicket(ticket: TransactionTicket): TransactionTicket {
    const now = new Date();
    const currentHeure = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return {
      id: ticket.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: ticket.date || now.toISOString().split('T')[0],
      heure: ticket.heure || currentHeure,
      commercant: ticket.commercant ? ticket.commercant.trim() : 'Inconnu',
      montant_total: Number(ticket.montant_total) || 0,
      tva: Number(ticket.tva !== undefined ? ticket.tva : 0),
      taux_tva: ticket.taux_tva,
      categorie: ticket.categorie || 'Autre',
      sous_categorie: ticket.sous_categorie || 'Divers',
      articles: Array.isArray(ticket.articles) ? ticket.articles : [],
      fichier_image: ticket.fichier_image || undefined,
      mode_paiement: ticket.mode_paiement || 'Carte Bancaire',
      commentaires: ticket.commentaires || '',
    };
  }

  private async ensureReady(): Promise<void> {
    if (this.isIndexedDBAvailable && !this.db) {
      await this.init();
    }
  }

  private getFromLocalStorage(): TransactionTicket[] {
    try {
      const data = localStorage.getItem(LOCALSTORAGE_KEY);
      if (!data) return [];
      const list = JSON.parse(data) as TransactionTicket[];
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return list;
    } catch {
      return [];
    }
  }

  private saveToLocalStorageDirectly(ticket: TransactionTicket): void {
    try {
      const list = this.getFromLocalStorage();
      const index = list.findIndex((x) => x.id === ticket.id);
      if (index >= 0) {
        list[index] = ticket;
      } else {
        list.push(ticket);
      }
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erreur LocalStorage:', e);
    }
  }

  private syncToLocalStorage(ticket: TransactionTicket): void {
    try {
      const lightCopy = { ...ticket, fichier_image: undefined };
      const list = this.getFromLocalStorage();
      const index = list.findIndex((x) => x.id === ticket.id);
      if (index >= 0) {
        list[index] = lightCopy;
      } else {
        list.push(lightCopy);
      }
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignoré
    }
  }

  private deleteFromLocalStorage(id: string): void {
    try {
      const list = this.getFromLocalStorage().filter((x) => x.id !== id);
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignoré
    }
  }
}

export const storageService = new StorageService();
