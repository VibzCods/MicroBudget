/**
 * Moteur OCR & Analyseur Heuristique conforme au Modèle de Données
 * - Détection automatique de : commercant, date, montant_total, categorie, sous_categorie, articles
 */

import { createWorker } from 'tesseract.js';
import {
  ExpenseCategory,
  TransactionTicket,
  ArticleItem,
  CATEGORIES_CONFIG,
  SOUS_CATEGORIES_MAP,
} from '../types/expense';

export interface PreprocessOptions {
  contrast?: number;
  brightness?: number;
  grayscale?: boolean;
}

/**
 * Prétraitement d'image sur Canvas HTML5
 */
export async function preprocessImage(
  imageSource: string | File | Blob,
  options: PreprocessOptions = {}
): Promise<{ processedDataUrl: string; width: number; height: number }> {
  const { contrast = 140, brightness = 5, grayscale = true } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossible d\'obtenir le contexte 2D'));
        return;
      }

      const maxDimension = 2000;
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        if (grayscale) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }

        r += brightness;
        g += brightness;
        b += brightness;

        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        data[i] = Math.min(255, Math.max(0, r));
        data[i + 1] = Math.min(255, Math.max(0, g));
        data[i + 2] = Math.min(255, Math.max(0, b));
      }

      ctx.putImageData(imgData, 0, 0);
      resolve({
        processedDataUrl: canvas.toDataURL('image/jpeg', 0.9),
        width,
        height,
      });
    };

    img.onerror = (e) => reject(new Error('Erreur de chargement: ' + e));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Exécution du moteur OCR Tesseract.js dans le navigateur
 */
export async function runOcrOnImage(
  imageUri: string,
  onProgress?: (progress: { status: string; percent: number }) => void
): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('fra+eng', 1, {
    logger: (m) => {
      if (onProgress && m.status) {
        let label = 'Analyse du ticket...';
        if (m.status === 'recognizing text') label = 'Reconnaissance des caractères...';
        onProgress({
          status: label,
          percent: Math.round((m.progress || 0) * 100),
        });
      }
    },
  });

  const ret = await worker.recognize(imageUri);
  await worker.terminate();

  return {
    text: ret.data.text,
    confidence: ret.data.confidence,
  };
}

const KNOWN_MERCHANTS = [
  'CARREFOUR', 'AUCHAN', 'LECLERC', 'MONOPRIX', 'INTERMARCHE', 'LIDL', 'ALDI',
  'SUPER U', 'CASINO', 'FRANPRIX', 'PICARD', 'BIOCOOP',
  'TOTAL', 'TOTALENERGIES', 'SHELL', 'BP', 'ESSO', 'AVIA', 'SNCF', 'RATP',
  'LEROY MERLIN', 'CASTORAMA', 'BRICORAMA', 'BRICO DEPOT', 'IKEA',
  'FNAC', 'DARTY', 'BOULANGER', 'APPLE', 'DECATHLON', 'SEPHORA',
  'MCDONALD', 'BURGER KING', 'KFC', 'SUBWAY', 'STARBUCKS', 'PHARMACIE', 'AMAZON'
];

/**
 * Parseur heuristique structurant les données selon le modèle TransactionTicket
 */
export function parseReceiptText(rawText: string, confidenceScore: number = 85): Partial<TransactionTicket> & { rawText: string; confidence: number } {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Détection commerçant
  const commercant = extractMerchant(lines);

  // 2. Détection date & heure (HH:MM garanti)
  const { date, heure } = extractDateTime(rawText);

  // 3. Détection montant total TTC
  const montant_total = extractTotalAmount(rawText, lines);

  // 4. Extraction des articles
  const articles = extractArticles(lines, montant_total);

  // 5. Détection de la catégorie et sous-catégorie
  const { categorie, sous_categorie } = detectCategoryAndSub(commercant, articles, rawText);

  // 6. Détection de la TVA (€) et du taux (%)
  const { tva, taux_tva } = extractVat(rawText, lines, montant_total, categorie);

  // 7. Détection mode de paiement
  const mode_paiement = extractPaymentMethod(rawText);

  return {
    id: `rec_${Date.now()}`,
    commercant,
    date,
    heure,
    montant_total,
    tva,
    taux_tva,
    categorie,
    sous_categorie,
    articles,
    mode_paiement,
    rawText,
    confidence: confidenceScore,
  };
}

function extractMerchant(lines: string[]): string {
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const lineUpper = lines[i].toUpperCase();
    for (const known of KNOWN_MERCHANTS) {
      if (lineUpper.includes(known)) {
        return lines[i].replace(/[^\w\s\-\.\'\&]/gi, '').trim().slice(0, 40) || known;
      }
    }
  }

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    const upper = line.toUpperCase();
    if (
      upper.includes('SIRET') ||
      upper.includes('RCS') ||
      upper.includes('TVA') ||
      upper.includes('BIENVENUE') ||
      upper.includes('TICKET') ||
      line.length < 3 ||
      /^\d+$/.test(line)
    ) {
      continue;
    }
    return line.slice(0, 40);
  }

  return 'Commerçant Inconnu';
}

function extractDateTime(rawText: string): { date: string; heure: string } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHeure = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const dateRegex = /\b([0-3]?[0-9])[\/\.\-]([0-1]?[0-9])[\/\.\-](20\d{2}|\d{2})\b/;
  const match = rawText.match(dateRegex);

  let date = todayStr;
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = '20' + year;
    const numDay = parseInt(day, 10);
    const numMonth = parseInt(month, 10);
    if (numDay >= 1 && numDay <= 31 && numMonth >= 1 && numMonth <= 12) {
      date = `${year}-${month}-${day}`;
    }
  }

  // Regex pour détecter l'heure : 14:35, 14h35, 14:35:12, 14 H 35
  const timeRegex = /\b([0-2]?[0-9])(?::|h|H|\s*h\s*)([0-5][0-9])(?::[0-5][0-9])?\b/;
  const timeMatch = rawText.match(timeRegex);
  let heure: string = currentHeure;
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2].padStart(2, '0');
    if (parseInt(hours, 10) < 24) {
      heure = `${hours}:${minutes}`;
    }
  }

  return { date, heure };
}

function extractTotalAmount(rawText: string, lines: string[]): number {
  const totalKeywords = [
    'TOTAL TTC', 'NET A PAYER', 'TOTAL A PAYER', 'TOTAL EUR', 'MONTANT TOTAL',
    'TOTAL', 'CARTE BANCAIRE', 'CB'
  ];

  for (const kw of totalKeywords) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].toUpperCase();
      if (line.includes(kw)) {
        const combined = [lines[i], lines[i + 1] || '', lines[i + 2] || ''].join(' ');
        const amountMatch = combined.match(/(\d+[\s\.,]\d{2})/g);
        if (amountMatch) {
          const parsed = parsePrice(amountMatch[amountMatch.length - 1]);
          if (parsed > 0 && parsed < 10000) return parsed;
        }
      }
    }
  }

  const matches = rawText.match(/\b\d+[\.,]\d{2}\b/g) || [];
  const numbers = matches.map(parsePrice).filter((v) => v > 0 && v < 5000);
  return numbers.length > 0 ? Math.max(...numbers) : 0.00;
}

function extractVat(
  rawText: string,
  lines: string[],
  total: number,
  category: ExpenseCategory = 'Alimentation'
): { tva: number; taux_tva?: number } {
  let detectedRate: number | undefined = undefined;

  // Détection du taux de TVA (20%, 10%, 5.5%, 2.1%)
  if (/20\s?%|20\.00\s?%/.test(rawText)) detectedRate = 20.0;
  else if (/10\s?%|10\.00\s?%/.test(rawText)) detectedRate = 10.0;
  else if (/5[,\.]5\s?%/.test(rawText)) detectedRate = 5.5;
  else if (/2[,\.]1\s?%/.test(rawText)) detectedRate = 2.1;

  // 1. Recherche du montant de TVA explicite
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.includes('TVA') || upper.includes('TAX') || upper.includes('DONT TVA')) {
      const match = line.match(/(\d+[\.,]\d{2})/);
      if (match) {
        const val = parsePrice(match[1]);
        if (val > 0 && val < total) {
          return { tva: val, taux_tva: detectedRate };
        }
      }
    }
  }

  // 2. Si non trouvé explicitement, déduction selon le taux ou la catégorie
  if (!detectedRate) {
    if (category === 'Alimentation') {
      detectedRate = /restaurant|brasserie|pizzeria|burger|cafe/i.test(rawText) ? 10.0 : 5.5;
    } else if (category === 'Santé') {
      detectedRate = 2.1;
    } else {
      detectedRate = 20.0; // Taux normal pour Transport, High-Tech, Logement, Loisirs
    }
  }

  if (total > 0 && detectedRate) {
    const calculatedTva = Number((total - total / (1 + detectedRate / 100)).toFixed(2));
    return { tva: calculatedTva, taux_tva: detectedRate };
  }

  return { tva: 0.00, taux_tva: detectedRate };
}

function extractPaymentMethod(rawText: string): string {
  const upper = rawText.toUpperCase();
  if (upper.includes('SANS CONTACT')) return 'Sans Contact';
  if (upper.includes('CARTE') || upper.includes('CB') || upper.includes('VISA')) return 'Carte Bancaire';
  if (upper.includes('ESPECE') || upper.includes('CASH')) return 'Espèces';
  if (upper.includes('CHEQUE')) return 'Chèque';
  if (upper.includes('VIREMENT')) return 'Virement';
  return 'Carte Bancaire';
}

function extractArticles(lines: string[], total: number): ArticleItem[] {
  const items: ArticleItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const upper = trimmed.toUpperCase();

    if (
      upper.includes('TOTAL') ||
      upper.includes('CARTE') ||
      upper.includes('TVA') ||
      upper.includes('MERCI') ||
      upper.includes('SIRET') ||
      upper.includes('DATE') ||
      trimmed.length < 4
    ) {
      continue;
    }

    const match = trimmed.match(/^(.*?)(?:x\s*(\d+))?\s+(\d+[\.,]\d{2})\s*(?:€|EUR)?$/i);
    if (match) {
      const nom = match[1].replace(/[^\w\s\-\.\']/gi, '').trim();
      const quantite = match[2] ? parseInt(match[2], 10) : 1;
      const prix = parsePrice(match[3]);

      if (nom.length >= 2 && prix > 0 && prix <= total) {
        items.push({ nom, prix, quantite });
      }
    }
  }

  return items;
}

function detectCategoryAndSub(
  commercant: string,
  articles: ArticleItem[],
  rawText: string
): { categorie: ExpenseCategory; sous_categorie: string } {
  const corpus = (commercant + ' ' + articles.map((a) => a.nom).join(' ') + ' ' + rawText).toLowerCase();

  let detectedCat: ExpenseCategory = 'Autre';

  for (const [catName, meta] of Object.entries(CATEGORIES_CONFIG)) {
    for (const kw of meta.keywords) {
      if (corpus.includes(kw)) {
        detectedCat = catName as ExpenseCategory;
        break;
      }
    }
    if (detectedCat !== 'Autre') break;
  }

  // Déduction de la sous-catégorie
  const subOptions = SOUS_CATEGORIES_MAP[detectedCat] || ['Divers'];
  let detectedSub = subOptions[0];

  if (detectedCat === 'Alimentation') {
    if (corpus.includes('boulangerie') || corpus.includes('croissant') || corpus.includes('pain')) {
      detectedSub = 'Boulangerie & Pâtisserie';
    } else if (corpus.includes('restaurant') || corpus.includes('pizzeria') || corpus.includes('burger') || corpus.includes('menu')) {
      detectedSub = 'Restaurant & Traiteur';
    } else {
      detectedSub = 'Supermarché & Courses';
    }
  } else if (detectedCat === 'Transport') {
    if (corpus.includes('sncf') || corpus.includes('train') || corpus.includes('metro')) {
      detectedSub = 'Train & Transports en commun';
    } else if (corpus.includes('uber') || corpus.includes('taxi')) {
      detectedSub = 'VTC & Taxi';
    } else {
      detectedSub = 'Carburant & Énergie';
    }
  }

  return { categorie: detectedCat, sous_categorie: detectedSub };
}

function parsePrice(str: string): number {
  const clean = str.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Number(num.toFixed(2));
}

export const DEMO_SAMPLE_RECEIPTS = [
  {
    title: 'Supermarché Carrefour (Courses)',
    commercant: 'CARREFOUR EXPRESS',
    date: '2026-11-06',
    total: 34.60,
    categorie: 'Alimentation' as ExpenseCategory,
    sous_categorie: 'Supermarché & Courses',
    text: `CARREFOUR EXPRESS
14 RUE DES COMMERCES 75002 PARIS
SIRET 48291048200021

TICKET DE CAISSE
DATE: 06/11/2026   17:45

PAIN DE CAMPAGNE         2.40 €
LAIT BIO DEMI-ECREME     3.20 €
BEURRE DOUX AOC 250G     2.90 €
POMMES BIO 1KG           3.50 €
SAUMON FUME 4 TRANCHES   8.90 €
PATES ARTISANALES 500G   2.80 €
CHEVRE FRAIS CENDRE      3.90 €
EAU CRISTALINE 6X1.5L    1.80 €
CHOCOLAT NOIR 85%        2.60 €
SAC CABAS KRAFT          0.30 €
--------------------------------
DONT TVA (5.5%)           1.81 €
TOTAL TTC                34.60 €
CARTE BANCAIRE SANS CONTACT
MERCI DE VOTRE VISITE !`,
  },
  {
    title: 'Station TotalEnergies (Carburant)',
    commercant: 'TOTALENERGIES RELAIS',
    date: '2026-11-05',
    total: 62.50,
    categorie: 'Transport' as ExpenseCategory,
    sous_categorie: 'Carburant & Énergie',
    text: `TOTALENERGIES RELAIS
AUTOROUTE A6 - AIRE DU VAL

DATE : 05/11/2026   08:30

SP95 E10 - 32.89 L       58.87 €
CAFE EXPRESSO MACHINE     2.20 €
CROISSANT CHAUD           1.43 €
--------------------------------
MONTANT TOTAL EUR        62.50 €
DONT TVA 20.00%          10.42 €
PAYE PAR CARTE BANCAIRE
BONNE ROUTE !`,
  },
];
