/**
 * Modal d'ajout manuel d'une transaction
 * - Saisie complète des champs obligatoires : commercant, montant_total, tva, date, heure, categorie, sous_categorie
 * - Édition complète de la liste des articles [{ nom, prix, quantite }]
 * - Calcul automatique possible du montant_total à partir des articles
 */
import React, { useState } from 'react';
import { X, Check, Plus, Trash2, Calculator } from 'lucide-react';
import {
  TransactionTicket,
  ExpenseCategory,
  ArticleItem,
} from '../types/expense';
import { categoriesService } from '../services/categoriesService';
import { ArticlesSummaryRepere } from './ArticlesSummaryRepere';

interface ManualExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: TransactionTicket) => void;
}

export const ManualExpenseModal: React.FC<ManualExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const currentHeure = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [commercant, setCommercant] = useState<string>('');
  const [montantTotal, setMontantTotal] = useState<string>('');
  const [date, setDate] = useState<string>(now.toISOString().split('T')[0]);
  const [heure, setHeure] = useState<string>(currentHeure);
  const defaultCats = categoriesService.getCategoryNames();
  const initialCat = defaultCats[0] || 'Autre';
  const initialSubs = categoriesService.getSubcategories(initialCat);

  const [categorie, setCategorie] = useState<ExpenseCategory>(initialCat);
  const [sousCategorie, setSousCategorie] = useState<string>(initialSubs[0] || 'Divers');
  const [tva, setTva] = useState<string>('');
  const [modePaiement, setModePaiement] = useState<string>('Carte Bancaire');
  const [commentaires, setCommentaires] = useState<string>('');
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCategoryChange = (newCat: ExpenseCategory) => {
    setCategorie(newCat);
    const subOptions = categoriesService.getSubcategories(newCat);
    setSousCategorie(subOptions[0] || 'Divers');
  };

  const handleAddArticle = () => {
    setArticles((prev) => [...prev, { nom: '', prix: 0.0, quantite: 1 }]);
  };

  const handleUpdateArticle = (index: number, field: keyof ArticleItem, value: any) => {
    setArticles((prev) =>
      prev.map((art, idx) => (idx === index ? { ...art, [field]: value } : art))
    );
  };

  const handleRemoveArticle = (index: number) => {
    setArticles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calcul du montant total à partir de la somme des articles
  const handleAutoSumArticles = () => {
    const sum = articles.reduce((acc, a) => acc + (a.prix || 0) * (a.quantite || 1), 0);
    setMontantTotal(sum.toFixed(2));
  };

  const articlesSum = articles.reduce((acc, a) => acc + (a.prix || 0) * (a.quantite || 1), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const numAmount = parseFloat(montantTotal.replace(',', '.'));
    if (!commercant.trim()) {
      setFormError('Veuillez renseigner un commerçant.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Veuillez indiquer un montant total valide supérieur à 0.');
      return;
    }

    const numVat = tva ? parseFloat(tva.replace(',', '.')) : 0;

    // Filtrer les articles avec au moins un nom
    const cleanArticles = articles
      .map((a) => ({
        nom: a.nom.trim() || 'Article',
        prix: Number(a.prix) || 0,
        quantite: Number(a.quantite) || 1,
      }))
      .filter((a) => a.nom.length > 0);

    const newTicket: TransactionTicket = {
      id: `rec_${Date.now()}`,
      date,
      heure: heure.trim() || currentHeure,
      commercant: commercant.trim(),
      montant_total: Number(numAmount.toFixed(2)),
      tva: Number(numVat.toFixed(2)),
      categorie,
      sous_categorie: sousCategorie,
      articles: cleanArticles,
      mode_paiement: modePaiement,
      commentaires: commentaires.trim(),
    };

    onSave(newTicket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Nouvelle transaction manuelle
            </h2>
            <p className="text-xs text-slate-500">Ajout avec détail d'articles et de TVA</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              commercant *
            </label>
            <input
              type="text"
              required
              value={commercant}
              onChange={(e) => setCommercant(e.target.value)}
              placeholder="Ex: Monoprix, TotalEnergies, Boulangerie..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                montant_total (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={montantTotal}
                onChange={(e) => setMontantTotal(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono font-bold tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                heure (HH:MM) *
              </label>
              <input
                type="time"
                required
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* TVA et Paiement */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  tva (€)
                </label>
                {parseFloat(montantTotal) > 0 && (
                  <div className="flex gap-1">
                    {[20, 10, 5.5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => {
                          const tot = parseFloat(montantTotal) || 0;
                          const t = Number((tot - tot / (1 + rate / 100)).toFixed(2));
                          setTva(t.toString());
                        }}
                        className="text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-600 dark:text-slate-300 font-mono"
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tva}
                onChange={(e) => setTva(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                mode_paiement
              </label>
              <select
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Carte Bancaire">Carte Bancaire</option>
                <option value="Sans Contact">Sans Contact</option>
                <option value="Espèces">Espèces</option>
                <option value="Chèque">Chèque</option>
                <option value="Virement">Virement</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Catégorie & Sous-catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                categorie *
              </label>
              <select
                value={categorie}
                onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categoriesService.getSubcategories(categorie).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ÉDITION DES ARTICLES AVEC POINT DE REPÈRE */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
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

            {/* Point de repère informatif des articles */}
            <ArticlesSummaryRepere
              articles={articles}
              montantTotal={parseFloat(montantTotal) || 0}
              onApplyTotal={handleAutoSumArticles}
            />

            {articles.length === 0 ? (
              <div className="py-2.5 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                Aucun article renseigné. Cliquez sur "+ Ajouter un article" pour lister vos achats.
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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
                      className="p-1 text-slate-400 hover:text-rose-500"
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
              placeholder="Notes, référence, contexte..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer la transaction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
