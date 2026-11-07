/**
 * Modal d'affichage détaillé et modification complète d'une transaction ticket
 * - Modification des métadonnées (commercant, montant, tva, date, heure, categorie, sous_categorie, commentaires)
 * - Édition complète de la liste des articles [{ nom, prix, quantite }]
 * - Suppression sécurisée via ConfirmDialog (sans window.confirm)
 */
import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit3, Check, Plus } from 'lucide-react';
import {
  TransactionTicket,
  ExpenseCategory,
  ArticleItem,
} from '../types/expense';
import { categoriesService } from '../services/categoriesService';
import { ConfirmDialog } from './ConfirmDialog';
import { ArticlesSummaryRepere } from './ArticlesSummaryRepere';

interface ExpenseModalProps {
  expense: TransactionTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (expense: TransactionTicket) => void;
  onDelete: (id: string) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!isOpen || !expense) return null;

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [commercant, setCommercant] = useState<string>(expense.commercant);
  const [montantTotal, setMontantTotal] = useState<number>(expense.montant_total);
  const [date, setDate] = useState<string>(expense.date);
  const [heure, setHeure] = useState<string>(expense.heure || '12:00');
  const [tva, setTva] = useState<number>(expense.tva || 0);
  const [categorie, setCategorie] = useState<ExpenseCategory>(expense.categorie);
  const [sousCategorie, setSousCategorie] = useState<string>(expense.sous_categorie);
  const [articles, setArticles] = useState<ArticleItem[]>(expense.articles || []);
  const [commentaires, setCommentaires] = useState<string>(expense.commentaires || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Synchronisation si la dépense change
  useEffect(() => {
    if (expense) {
      setCommercant(expense.commercant);
      setMontantTotal(expense.montant_total);
      setDate(expense.date);
      setHeure(expense.heure || '12:00');
      setTva(expense.tva || 0);
      setCategorie(expense.categorie);
      setSousCategorie(expense.sous_categorie);
      setArticles(expense.articles ? [...expense.articles] : []);
      setCommentaires(expense.commentaires || '');
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setEditError(null);
    }
  }, [expense]);

  const handleCategoryChange = (newCat: ExpenseCategory) => {
    setCategorie(newCat);
    const available = categoriesService.getSubcategories(newCat);
    setSousCategorie(available[0] || 'Divers');
  };

  // Gestion des articles en mode édition
  const handleAddArticle = () => {
    setArticles((prev) => [...prev, { nom: 'Nouvel article', prix: 0.0, quantite: 1 }]);
  };

  const handleUpdateArticle = (index: number, field: keyof ArticleItem, value: any) => {
    setArticles((prev) =>
      prev.map((art, idx) => (idx === index ? { ...art, [field]: value } : art))
    );
  };

  const handleRemoveArticle = (index: number) => {
    setArticles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSumArticlesToTotal = () => {
    const sum = articles.reduce((acc, a) => acc + (a.prix || 0) * (a.quantite || 1), 0);
    setMontantTotal(Number(sum.toFixed(2)));
  };

  const handleSave = () => {
    setEditError(null);
    if (!commercant.trim()) {
      setEditError('Veuillez renseigner un commerçant.');
      return;
    }
    if (isNaN(montantTotal) || montantTotal <= 0) {
      setEditError('Veuillez renseigner un montant total valide.');
      return;
    }
    onUpdate({
      ...expense,
      commercant: commercant.trim(),
      montant_total: Number(montantTotal),
      date,
      heure: heure.trim(),
      tva: Number(tva),
      categorie,
      sous_categorie: sousCategorie,
      articles,
      commentaires: commentaires.trim(),
    });
    setIsEditing(false);
  };

  const categoryMeta = categoriesService.getCategoryMeta(expense.categorie);
  const articlesSum = articles.reduce((acc, a) => acc + (a.prix || 0) * (a.quantite || 1), 0);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* En-tête */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{ backgroundColor: categoryMeta.color }}
              />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Modifier la transaction' : expense.commercant}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>{expense.date}</span>
                  <span>à {expense.heure || '12:00'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{expense.categorie}</span>
                  <span aria-hidden="true">·</span>
                  <span>{expense.sous_categorie}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Modifier"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {isEditing ? (
              <div className="space-y-4">
                {editError && (
                  <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg">
                    {editError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    commercant *
                  </label>
                  <input
                    type="text"
                    value={commercant}
                    onChange={(e) => setCommercant(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      montant_total (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={montantTotal}
                      onChange={(e) => setMontantTotal(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-mono font-bold tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      tva (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tva}
                      onChange={(e) => setTva(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      date *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      heure (HH:MM) *
                    </label>
                    <input
                      type="time"
                      value={heure}
                      onChange={(e) => setHeure(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      categorie *
                    </label>
                    <select
                      value={categorie}
                      onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {categoriesService.getCategoryNames().map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      sous_categorie *
                    </label>
                    <select
                      value={sousCategorie}
                      onChange={(e) => setSousCategorie(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {categoriesService.getSubcategories(categorie).map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ÉDITION COMPLÈTE DES ARTICLES AVEC POINT DE REPÈRE */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      articles ({articles.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddArticle}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter un article</span>
                    </button>
                  </div>

                  {/* Point de repère interactif : total coût + nbr articles + comparaison montant ticket */}
                  <ArticlesSummaryRepere
                    articles={articles}
                    montantTotal={Number(montantTotal)}
                    onApplyTotal={handleSumArticlesToTotal}
                  />

                  {articles.length === 0 ? (
                    <div className="py-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      Aucun article dans cette transaction. Cliquez sur "+ Ajouter un article".
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {articles.map((art, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={art.nom}
                            onChange={(e) => handleUpdateArticle(idx, 'nom', e.target.value)}
                            placeholder="Nom de l'article"
                            className="flex-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                          <div className="w-16 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={art.quantite || 1}
                              onChange={(e) =>
                                handleUpdateArticle(idx, 'quantite', parseInt(e.target.value, 10) || 1)
                              }
                              placeholder="Qté"
                              title="Quantité"
                              className="w-full px-2 py-1.5 text-xs font-mono text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="w-24 shrink-0 relative">
                            <input
                              type="number"
                              step="0.01"
                              value={art.prix === 0 ? '' : art.prix}
                              onChange={(e) =>
                                handleUpdateArticle(idx, 'prix', parseFloat(e.target.value) || 0)
                              }
                              placeholder="Prix"
                              className="w-full pl-2 pr-6 py-1.5 text-xs font-mono tabular-nums text-right rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">€</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveArticle(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    commentaires
                  </label>
                  <input
                    type="text"
                    value={commentaires}
                    onChange={(e) => setCommentaires(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enregistrer les modifications</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                      montant_total
                    </span>
                    <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {expense.montant_total.toFixed(2)} €
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">TVA</span>
                    <div className="text-base font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                      {(expense.tva || 0).toFixed(2)} €
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">categorie</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {expense.categorie}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">sous_categorie</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {expense.sous_categorie}
                    </span>
                  </div>
                  {expense.commentaires && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block mb-0.5">commentaires</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {expense.commentaires}
                      </span>
                    </div>
                  )}
                </div>

                {/* Articles [{ nom, prix, quantite }] */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      articles ({expense.articles?.length || 0})
                    </h4>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Modifier les articles</span>
                    </button>
                  </div>

                  {expense.articles && expense.articles.length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {expense.articles.map((art, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 text-xs bg-white dark:bg-slate-900"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 text-[11px]">
                              {art.quantite || 1}x
                            </span>
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {art.nom}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                            {art.prix.toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      Aucun article répertorié. Cliquez sur "Modifier les articles" pour en ajouter.
                    </div>
                  )}
                </div>

                {/* Justificatif Image */}
                {expense.fichier_image && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      fichier_image
                    </h4>
                    <div className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 flex justify-center max-h-80 overflow-auto">
                      <img
                        src={expense.fichier_image}
                        alt="Ticket de caisse"
                        className="max-h-72 w-auto object-contain rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pied de modale */}
          <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer la transaction</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation personnalisée de suppression */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Supprimer cette transaction ?"
        message={`Êtes-vous sûr de vouloir supprimer le ticket de "${expense.commercant}" d'un montant de ${expense.montant_total.toFixed(2)} € ? Cette action est irréversible.`}
        confirmLabel="Oui, supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={() => {
          onDelete(expense.id);
          setShowDeleteConfirm(false);
          onClose();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
