/**
 * Module Gestion & Configuration des Catégories & Sous-Catégories
 * - 100% Configurable : Création, modification, suppression de catégories et sous-catégories
 * - Importation et Exportation de configuration dédiée JSON (strictement de la configuration, AUCUNE donnée de ticket)
 * - Choix des couleurs de repère visuel
 * - Restauration des paramètres d'origine en 1 clic
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  categoriesService,
  CategoryConfigItem,
  PRESET_COLORS,
} from '../services/categoriesService';
import {
  FolderTree,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  ClipboardPaste,
  Edit2,
  Check,
  X,
  Tag,
  Palette,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface CategoriesManagerProps {
  onCategoriesChanged?: () => void;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = ({
  onCategoriesChanged,
}) => {
  const [categories, setCategories] = useState<CategoryConfigItem[]>([]);
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [editingColorValue, setEditingColorValue] = useState<string>('');
  const [newSubcatValue, setNewSubcatValue] = useState<{ [catNom: string]: string }>({});

  // Ajout d'une nouvelle catégorie
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>(PRESET_COLORS[0]);
  const [newCatSubs, setNewCatSubs] = useState<string>('Général, Divers');

  // Confirmation de suppression
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // État de l'import de configuration
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [pastedJson, setPastedJson] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const reloadCategories = () => {
    setCategories(categoriesService.getAll());
    if (onCategoriesChanged) onCategoriesChanged();
  };

  useEffect(() => {
    reloadCategories();
    const unsubscribe = categoriesService.subscribe(() => {
      reloadCategories();
    });
    return unsubscribe;
  }, []);

  const handleStartEdit = (cat: CategoryConfigItem) => {
    setEditingCategoryName(cat.nom);
    setEditingNameValue(cat.nom);
    setEditingColorValue(cat.color);
  };

  const handleSaveEdit = (oldNom: string) => {
    if (!editingNameValue.trim()) return;
    categoriesService.updateCategory(oldNom, {
      nom: editingNameValue.trim(),
      color: editingColorValue,
    });
    setEditingCategoryName(null);
    reloadCategories();
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const subs = newCatSubs
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const success = categoriesService.addCategory(
      newCatName.trim(),
      newCatColor,
      subs.length > 0 ? subs : ['Divers']
    );

    if (success) {
      setNewCatName('');
      setNewCatSubs('Général, Divers');
      setIsAddingCategory(false);
      setImportStatus({
        type: 'success',
        message: `Catégorie "${newCatName.trim()}" ajoutée avec succès.`,
      });
      reloadCategories();
    } else {
      setImportStatus({
        type: 'error',
        message: `La catégorie "${newCatName.trim()}" existe déjà.`,
      });
    }
  };

  const handleAddSubcategory = (catNom: string) => {
    const val = (newSubcatValue[catNom] || '').trim();
    if (!val) return;
    categoriesService.addSubcategory(catNom, val);
    setNewSubcatValue((prev) => ({ ...prev, [catNom]: '' }));
    reloadCategories();
  };

  const handleRemoveSubcategory = (catNom: string, subNom: string) => {
    categoriesService.removeSubcategory(catNom, subNom);
    reloadCategories();
  };

  const handleDeleteCategoryConfirmed = () => {
    if (categoryToDelete) {
      categoriesService.deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      reloadCategories();
      setImportStatus({
        type: 'success',
        message: 'Catégorie supprimée.',
      });
    }
  };

  const handleResetToDefaultConfirmed = () => {
    setShowResetConfirm(false);
    categoriesService.resetToDefault();
    reloadCategories();
    setImportStatus({
      type: 'success',
      message: 'Catégories réinitialisées avec la configuration par défaut.',
    });
  };

  const handleExportConfigJSON = () => {
    try {
      const jsonContent = categoriesService.exportJSON();
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scandepense_categories_config.json`;
      link.click();
      URL.revokeObjectURL(url);
      setImportStatus({
        type: 'success',
        message: 'Fichier de configuration des catégories exporté (strictement sans données de tickets).',
      });
    } catch (e: any) {
      setImportStatus({
        type: 'error',
        message: `Erreur d'exportation: ${e.message}`,
      });
    }
  };

  const processImportJson = (text: string) => {
    if (!text.trim()) {
      setImportStatus({
        type: 'error',
        message: 'Le contenu JSON de configuration est vide.',
      });
      return;
    }
    const res = categoriesService.importJSON(text);
    if (res.success) {
      setImportStatus({
        type: 'success',
        message: `Configuration importée avec succès : ${res.count} catégorie(s) configurée(s).`,
      });
      setPastedJson('');
      reloadCategories();
    } else {
      setImportStatus({
        type: 'error',
        message: res.error || 'Erreur lors de l\'import de configuration.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImportJson(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processImportJson(text);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadCustomSample = () => {
    const sampleConfig = {
      format: 'ScanDepense-CategoriesConfig',
      version: '1.0.0',
      categories: [
        {
          nom: 'Courses & Épicerie',
          color: '#10b981',
          sous_categories: ['Supermarché', 'Marché bio', 'Boulangerie', 'Boucherie', 'Boissons'],
        },
        {
          nom: 'Auto & Trajets',
          color: '#3b82f6',
          sous_categories: ['Carburant', 'Péage', 'Parking', 'Entretien & Réparations', 'Assurance'],
        },
        {
          nom: 'Maison & Jardin',
          color: '#8b5cf6',
          sous_categories: ['Bricolage', 'Mobilier', 'Énergie', 'Plantes', 'Loyer'],
        },
        {
          nom: 'Sorties & Voyages',
          color: '#ec4899',
          sous_categories: ['Restaurants', 'Hôtels & Séjours', 'Cinéma & Concerts', 'Loisirs sportifs'],
        },
        {
          nom: 'Professionnel & Bureau',
          color: '#14b8a6',
          sous_categories: ['Fournitures', 'Matériel info', 'Logiciels & Abonnements', 'Déplacements pro'],
        },
        {
          nom: 'Santé & Soins',
          color: '#06b6d4',
          sous_categories: ['Pharmacie', 'Médecin spécialiste', 'Dentiste', 'Bien-être'],
        },
        {
          nom: 'Divers & Autres',
          color: '#64748b',
          sous_categories: ['Cadeaux', 'Frais bancaires', 'Non classé'],
        },
      ],
    };
    setPastedJson(JSON.stringify(sampleConfig, null, 2));
    setImportTab('paste');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderTree className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Configuration des Catégories & Sous-Catégories</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Fichier JSON dédié indépendant</span>
            <span aria-hidden="true">·</span>
            <span>Uniquement de la configuration (sans données)</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {categories.length} catégorie{categories.length > 1 ? 's' : ''} actives
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle catégorie</span>
          </button>
          <button
            onClick={handleExportConfigJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Télécharger le fichier JSON de configuration"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter la conf JSON</span>
          </button>
        </div>
      </div>

      {/* Bannière de statut */}
      {importStatus.type && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
            importStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="flex-1 font-medium">{importStatus.message}</span>
          <button
            onClick={() => setImportStatus({ type: null, message: '' })}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulaire modal ou dépliable d'ajout d'une catégorie */}
      {isAddingCategory && (
        <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Créer une nouvelle catégorie</span>
            </h3>
            <button
              onClick={() => setIsAddingCategory(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddCategorySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom de la catégorie *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Animaux, Vacances, Frais Pro..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sous-catégories initiales (séparées par des virgules)
                </label>
                <input
                  type="text"
                  value={newCatSubs}
                  onChange={(e) => setNewCatSubs(e.target.value)}
                  placeholder="Ex: Vétérinaire, Croquettes, Accessoires"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Sélecteur de couleur */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                <span>Couleur de repère visuel :</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCatColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      newCatColor === c ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
              >
                Enregistrer la catégorie
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des catégories configurées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const isEditing = editingCategoryName === cat.nom;

          return (
            <div
              key={cat.nom}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between space-y-4"
            >
              {/* En-tête de la carte catégorie */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                    ) : (
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {cat.nom}
                      </h3>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(cat.nom)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded cursor-pointer"
                          title="Enregistrer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCategoryName(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                          title="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Modifier le nom ou la couleur"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {categories.length > 1 && (
                          <button
                            onClick={() => setCategoryToDelete(cat.nom)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Supprimer la catégorie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Sélecteur de couleur en mode édition */}
                {isEditing && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Couleur :
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditingColorValue(c)}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                            editingColorValue === c
                              ? 'scale-125 ring-2 ring-offset-1 ring-emerald-500'
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Liste des sous-catégories (tags) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Sous-catégories ({cat.sous_categories.length}) :</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {cat.sous_categories.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        <span>{sub}</span>
                        {cat.sous_categories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubcategory(cat.nom, sub)}
                            className="text-slate-400 hover:text-rose-500 ml-0.5 cursor-pointer"
                            title={`Supprimer la sous-catégorie ${sub}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Champ d'ajout d'une sous-catégorie */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newSubcatValue[cat.nom] || ''}
                    onChange={(e) =>
                      setNewSubcatValue((prev) => ({
                        ...prev,
                        [cat.nom]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcategory(cat.nom);
                      }
                    }}
                    placeholder="+ Nouvelle sous-catégorie..."
                    className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSubcategory(cat.nom)}
                    disabled={!(newSubcatValue[cat.nom] || '').trim()}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded border border-emerald-200 dark:border-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Import / Export Spécifique de la Configuration JSON */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Importer / Sauvegarder la Configuration JSON des Catégories
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fichier dédié de configuration pure (ne touche pas à vos transactions existantes).
            </p>
          </div>

          <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setImportTab('file')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
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
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
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

        {importTab === 'file' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20'
            }`}
          >
            <div className="max-w-xs mx-auto space-y-2">
              <FileJson className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Glissez votre fichier de catégories .json ici
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Parcourir</span>
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
                Collez votre configuration JSON (tableau ou dictionnaire clef/valeur) :
              </label>
              <button
                type="button"
                onClick={handleLoadCustomSample}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Insérer un exemple de configuration personnalisé
              </button>
            </div>
            <textarea
              value={pastedJson}
              onChange={(e) => setPastedJson(e.target.value)}
              placeholder='{ "categories": [ { "nom": "Alimentation", "color": "#10b981", "sous_categories": ["Supermarché", "Boulangerie"] } ] }'
              rows={5}
              className="w-full p-3 font-mono text-[11px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => processImportJson(pastedJson)}
                disabled={!pastedJson.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Appliquer la configuration</span>
              </button>
            </div>
          </div>
        )}

        {/* Spécification visuelle du format de configuration */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Format de configuration accepté :
          </span>
          <pre className="p-3 rounded-lg bg-slate-950 text-slate-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`{
  "format": "ScanDepense-CategoriesConfig",
  "version": "1.0.0",
  "categories": [
    {
      "nom": "Alimentation & Courses",
      "color": "#10b981",
      "sous_categories": ["Supermarché", "Boulangerie", "Marché", "Restaurant"]
    },
    {
      "nom": "Véhicule & Déplacement",
      "color": "#3b82f6",
      "sous_categories": ["Carburant", "Péage", "Entretien", "Train & Bus"]
    }
  ]
}`}
          </pre>
        </div>
      </div>

      {/* Zone de réinitialisation */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Réinitialiser les catégories
          </h4>
          <p className="text-[11px] text-slate-500">
            Restaure les 7 catégories et sous-catégories d'origine.
          </p>
        </div>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurer par défaut</span>
        </button>
      </div>

      {/* Confirmation suppression de catégorie */}
      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="Supprimer cette catégorie ?"
        message={`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryToDelete}" ? Les transactions existantes associées conserveront leur libellé.`}
        confirmLabel="Supprimer la catégorie"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={handleDeleteCategoryConfirmed}
        onCancel={() => setCategoryToDelete(null)}
      />

      {/* Confirmation réinitialisation par défaut */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Restaurer les catégories par défaut ?"
        message="Cette action remplacera vos catégories personnalisées par les 7 catégories initiales (Alimentation, Transport, Logement, Loisirs, Santé, High-Tech, Autre)."
        confirmLabel="Restaurer par défaut"
        cancelLabel="Annuler"
        isDestructive={false}
        onConfirm={handleResetToDefaultConfirmed}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
