/**
 * Module Gestion des Données & Portabilité JSON
 * - Export JSON strict respectant le schéma d'objet demandé
 * - Importation avec validation de structure, support fichier & copier/coller direct
 * - Export CSV pour tableurs
 * - Réinitialisation totale et rechargement démo sécurisés via modal (sans window.confirm)
 */

import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  ShieldCheck,
  Code,
  ClipboardPaste,
  FileText,
  FileJson,
} from 'lucide-react';
import { storageService } from '../services/storage';
import { TransactionTicket } from '../types/expense';
import { ConfirmDialog } from './ConfirmDialog';

interface DataManagementProps {
  expenses: TransactionTicket[];
  onDataChanged: () => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({
  expenses,
  onDataChanged,
}) => {
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    details?: string[];
  }>({ type: null, message: '' });

  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [pastedJsonText, setPastedJsonText] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Dialogs de confirmation
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportJSON = async () => {
    try {
      const jsonContent = await storageService.exportJSON();
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `scandepense_transactions_${dateStr}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setImportStatus({
        type: 'success',
        message: 'Fichier JSON exporté avec succès selon le Data Model normalisé.',
      });
    } catch (e: any) {
      setImportStatus({
        type: 'error',
        message: `Erreur d'exportation: ${e.message}`,
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvContent = await storageService.exportCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `scandepense_export_${dateStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setImportStatus({
        type: 'success',
        message: 'Fichier CSV généré pour Excel / LibreOffice.',
      });
    } catch (e: any) {
      setImportStatus({
        type: 'error',
        message: `Erreur d'exportation CSV: ${e.message}`,
      });
    }
  };

  const processJsonString = async (jsonString: string) => {
    if (!jsonString.trim()) {
      setImportStatus({
        type: 'error',
        message: 'Le contenu JSON est vide. Veuillez coller ou téléverser du JSON valide.',
      });
      return;
    }

    try {
      const result = await storageService.importJSON(jsonString);

      if (result.errors.length > 0) {
        setImportStatus({
          type: result.importedCount > 0 ? 'success' : 'error',
          message: `${result.importedCount} transaction(s) importée(s) avec succès.`,
          details: result.errors,
        });
      } else {
        setImportStatus({
          type: 'success',
          message: `Succès : ${result.importedCount} transaction(s) importée(s) et validée(s) dans la base locale.`,
        });
      }

      onDataChanged();
      if (result.importedCount > 0) {
        setPastedJsonText('');
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Fichier JSON corrompu ou invalide: ${err.message}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await processJsonString(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        await processJsonString(text);
      };
      reader.readAsText(file);
    }
  };

  const handleSeedDemoConfirmed = async () => {
    setShowSeedConfirm(false);
    await storageService.seedDemoData(true);
    onDataChanged();
    setImportStatus({
      type: 'success',
      message: 'Jeu de démonstration chargé dans la base.',
    });
  };

  const handleClearAllConfirmed = async () => {
    setShowClearConfirm(false);
    await storageService.clear();
    onDataChanged();
    setImportStatus({
      type: 'success',
      message: 'Base locale entièrement vidée (IndexedDB et LocalStorage réinitialisés).',
    });
  };

  const handleDownloadSampleJSON = () => {
    const sample = [
      {
        id: `sample_${Date.now()}_1`,
        date: new Date().toISOString().split('T')[0],
        heure: '14:25',
        commercant: 'Monoprix Express',
        montant_total: 24.8,
        tva: 2.1,
        categorie: 'Alimentation',
        sous_categorie: 'Supermarché & Courses',
        articles: [
          { nom: 'Salade César bio', prix: 5.5, quantite: 1 },
          { nom: 'Bouteille eau minérale 1.5L', prix: 1.2, quantite: 2 },
          { nom: 'Plat cuisiné traiteur', prix: 16.9, quantite: 1 }
        ],
        commentaires: 'Déjeuner sur le pouce'
      },
      {
        id: `sample_${Date.now()}_2`,
        date: new Date().toISOString().split('T')[0],
        heure: '09:10',
        commercant: 'SNCF Voyageurs',
        montant_total: 49.0,
        tva: 4.45,
        categorie: 'Transport',
        sous_categorie: 'Train & Métro & Bus',
        articles: [
          { nom: 'Billet TGV InOui Paris-Lyon', prix: 49.0, quantite: 1 }
        ],
        commentaires: 'Déplacement pro'
      }
    ];

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exemple_tickets_valides.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSampleIntoTextarea = () => {
    const sample = [
      {
        id: `sample_paste_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        heure: '12:30',
        commercant: 'Boulangerie du Marché',
        montant_total: 8.5,
        tva: 0.85,
        categorie: 'Alimentation',
        sous_categorie: 'Boulangerie & Pâtisserie',
        articles: [
          { nom: 'Formule Sandwich Déjeuner', prix: 7.2, quantite: 1 },
          { nom: 'Espresso', prix: 1.3, quantite: 1 }
        ]
      }
    ];
    setPastedJsonText(JSON.stringify(sample, null, 2));
    setImportTab('paste');
  };

  const totalAmountSum = expenses.reduce((sum, item) => sum + item.montant_total, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Base de Données & Portabilité JSON
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>Persistance IndexedDB</span>
          <span aria-hidden="true">·</span>
          <span>Import/Export JSON strict</span>
          <span aria-hidden="true">·</span>
          <span>Export CSV Excel</span>
        </div>
      </div>

      {importStatus.type && (
        <div
          className={`p-4 rounded-xl text-xs flex flex-col gap-2 border ${
            importStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{importStatus.message}</div>
            <button
              onClick={() => setImportStatus({ type: null, message: '' })}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          {importStatus.details && importStatus.details.length > 0 && (
            <div className="pl-7 text-[11px] space-y-1 text-slate-600 dark:text-slate-400 font-mono">
              {importStatus.details.map((d, i) => (
                <div key={i}>• {d}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Structure du Data Model */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Spécification du Data Model (JSON Schema)
            </h3>
          </div>
          <button
            onClick={handleDownloadSampleJSON}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded border border-emerald-200 dark:border-emerald-800"
          >
            <Download className="w-3 h-3" />
            <span>Télécharger un modèle JSON</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Toute importation et exportation applique scrupuleusement la structure suivante (avec tolérance automatique sur les montants sous forme de chaîne et les champs optionnels) :
        </p>
        <pre className="p-3.5 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`{
  "id": "rec_001",
  "date": "2026-11-05",
  "heure": "18:42",
  "commercant": "Carrefour Market",
  "montant_total": 64.85,
  "tva": 3.45,
  "categorie": "Alimentation",
  "sous_categorie": "Supermarché & Courses",
  "articles": [
    { "nom": "Pain de mie complet Bio", "prix": 1.89, "quantite": 1 }
  ],
  "fichier_image": "data:image/jpeg;base64,..." // optionnel
}`}
        </pre>
      </div>

      {/* Statistiques base */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Stockage Local du Navigateur
            </h3>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Données locales privées</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              Transactions stockées
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {expenses.length}
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              Montant total cumulé
            </span>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {totalAmountSum.toFixed(2)} €
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
              Moteur actif
            </span>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">
              IndexedDB (avec repli LocalStorage)
            </div>
          </div>
        </div>
      </div>

      {/* Exportations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Exportation JSON Normalisée
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Télécharge toutes vos transactions avec leurs articles, heure, TVA et sous-catégories sous le format strict demandé.
            </p>
          </div>
          <button
            onClick={handleExportJSON}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger l'export JSON ({expenses.length} tickets)</span>
          </button>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Exportation Tableur CSV
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Export prêt à l'emploi compatible Excel, Google Sheets et LibreOffice avec séparateurs point-virgule.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exporter au format CSV</span>
          </button>
        </div>
      </div>

      {/* Module Importation JSON Renforcé */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Importer des Données JSON
            </h4>
          </div>

          {/* Onglets Fichier vs Coller */}
          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setImportTab('file')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
                importTab === 'file'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Fichier .json</span>
            </button>
            <button
              onClick={() => setImportTab('paste')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors ${
                importTab === 'paste'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Coller du JSON</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reconnaît les tableaux simples <code className="text-purple-600 dark:text-purple-400">[ ... ]</code> ou les objets encapsulés <code className="text-purple-600 dark:text-purple-400">&#123; "transactions": [ ... ] &#125;</code>.
        </p>

        {importTab === 'file' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragOver
                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/20'
            }`}
          >
            <div className="max-w-xs mx-auto space-y-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Glissez-déposez votre fichier .json ici
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ou cliquez pour explorer vos dossiers
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parcourir les fichiers</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-slate-700 dark:text-slate-300">
                Collez votre texte JSON ci-dessous :
              </label>
              <button
                type="button"
                onClick={handleLoadSampleIntoTextarea}
                className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Insérer un exemple de test</span>
              </button>
            </div>
            <textarea
              value={pastedJsonText}
              onChange={(e) => setPastedJsonText(e.target.value)}
              placeholder='[ { "commercant": "Monoprix", "montant_total": 15.2, "date": "2026-11-05", "heure": "12:00", "tva": 1.5, "categorie": "Alimentation", "sous_categorie": "Supermarché & Courses", "articles": [] } ]'
              rows={6}
              className="w-full p-3 font-mono text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => processJsonString(pastedJsonText)}
                disabled={!pastedJsonText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Valider et importer le JSON collé</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Maintenance & Exemples
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSeedConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Recharger les exemples démo</span>
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Réinitialiser la base locale (Suppression totale)</span>
          </button>
        </div>
      </div>

      {/* Dialogue confirmation suppression totale */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Suppression totale de la base locale"
        message="ATTENTION : Êtes-vous certain de vouloir supprimer TOUTES les transactions enregistrées ? Cette opération videra intégralement la base IndexedDB et le LocalStorage."
        confirmLabel="Tout supprimer définitivement"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={handleClearAllConfirmed}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Dialogue confirmation rechargement démo */}
      <ConfirmDialog
        isOpen={showSeedConfirm}
        title="Recharger le jeu de démonstration"
        message="Souhaitez-vous injecter les transactions de test ? Vos données actuelles seront conservées et les exemples viendront s'y ajouter."
        confirmLabel="Ajouter les exemples"
        cancelLabel="Annuler"
        isDestructive={false}
        onConfirm={handleSeedDemoConfirmed}
        onCancel={() => setShowSeedConfirm(false)}
      />
    </div>
  );
};
