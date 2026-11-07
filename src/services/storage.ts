/**
 * Service de stockage modulaire et autonome pour ScanDépense
 * - Stockage principal : IndexedDB
 * - Repli automatique : LocalStorage
 * - Importation/Exportation robuste et batch saving
 */
import { TransactionTicket, ArticleItem } from '../types/expense';
import { SAMPLE_EXPENSES } from '../data/sampleReceipts';

const DB_NAME = 'ScanDepenseDB';
const DB_VERSION = 2;
const STORE_NAME = 'tickets';
const LOCALSTORAGE_KEY = 'scandepense_tickets_backup';

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

  public async clear(): Promise<void> {
    await this.ensureReady();

    if (this.isIndexedDBAvailable && this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();

          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    try {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      localStorage.removeItem('scandepense_expenses_backup');
    } catch {
      // Ignoré
    }
  }

  public async seedDemoData(force: boolean = false): Promise<TransactionTicket[]> {
    const existing = await this.getAll();
    if (existing.length === 0 || force) {
      await this.saveBatch(SAMPLE_EXPENSES);
      return SAMPLE_EXPENSES;
    }
    return existing;
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
   */
  public async importJSON(jsonString: string): Promise<{ importedCount: number; errors: string[] }> {
    const errors: string[] = [];
    const validTickets: TransactionTicket[] = [];

    try {
      const parsed = JSON.parse(jsonString);
      let list: any[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.transactions)) list = parsed.transactions;
        else if (Array.isArray(parsed.expenses)) list = parsed.expenses;
        else if (Array.isArray(parsed.tickets)) list = parsed.tickets;
        else if (Array.isArray(parsed.data)) list = parsed.data;
        else {
          throw new Error('Aucun tableau de transactions ("transactions", "expenses", ou "data") trouvé dans le JSON.');
        }
      } else {
        throw new Error('Structure JSON invalide. Format tableau ou objet avec liste attendu.');
      }

      if (list.length === 0) {
        return { importedCount: 0, errors: ['Le fichier JSON ne contient aucune transaction.'] };
      }

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item !== 'object') continue;

        // Commerçant
        const rawCommercant = item.commercant || item.merchant || item.nom;
        const commercant = String(rawCommercant || '').trim();

        // Montant Total
        const rawMontant = item.montant_total !== undefined ? item.montant_total : item.totalAmount;
        let montant_total = 0;
        if (typeof rawMontant === 'number') {
          montant_total = rawMontant;
        } else if (typeof rawMontant === 'string') {
          montant_total = parseFloat(rawMontant.replace(',', '.'));
        }

        if (!commercant) {
          errors.push(`Ligne ${i + 1} ignorée : commerçant absent.`);
          continue;
        }
        if (isNaN(montant_total) || montant_total < 0) {
          errors.push(`Ligne ${i + 1} (${commercant}) : montant invalide.`);
          continue;
        }

        // TVA
        const rawTva = item.tva !== undefined ? item.tva : item.vatAmount;
        let tva = 0;
        if (typeof rawTva === 'number') {
          tva = rawTva;
        } else if (typeof rawTva === 'string') {
          tva = parseFloat(rawTva.replace(',', '.')) || 0;
        }

        // Articles
        const articles: ArticleItem[] = [];
        if (Array.isArray(item.articles)) {
          for (const art of item.articles) {
            if (art && typeof art === 'object') {
              const nom = String(art.nom || art.name || 'Article').trim();
              const prixRaw = art.prix !== undefined ? art.prix : art.price;
              const prix = typeof prixRaw === 'number' ? prixRaw : parseFloat(String(prixRaw || 0).replace(',', '.')) || 0;
              const qteRaw = art.quantite !== undefined ? art.quantite : art.quantity;
              const quantite = typeof qteRaw === 'number' ? qteRaw : parseInt(String(qteRaw || 1), 10) || 1;
              articles.push({ nom, prix, quantite });
            }
          }
        }

        const validItem: TransactionTicket = {
          id: item.id ? String(item.id) : `rec_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          date: item.date || new Date().toISOString().split('T')[0],
          heure: item.heure || item.time || '12:00',
          commercant,
          montant_total: Number(montant_total.toFixed(2)),
          tva: Number(tva.toFixed(2)),
          taux_tva: typeof item.taux_tva === 'number' ? item.taux_tva : (typeof item.vatRate === 'number' ? item.vatRate : undefined),
          categorie: item.categorie || item.category || 'Autre',
          sous_categorie: item.sous_categorie || item.sousCategorie || 'Divers',
          articles,
          fichier_image: item.fichier_image || item.receiptImageData || undefined,
          mode_paiement: item.mode_paiement || item.paymentMethod || 'Carte Bancaire',
          commentaires: item.commentaires || item.notes || '',
        };

        validTickets.push(validItem);
      }

      if (validTickets.length > 0) {
        await this.saveBatch(validTickets);
      }
    } catch (e: any) {
      errors.push(`Erreur de lecture du fichier JSON: ${e.message}`);
    }

    return { importedCount: validTickets.length, errors };
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
