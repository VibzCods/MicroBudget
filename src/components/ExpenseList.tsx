/**
 * Module Liste & Recherche Multicritère des Dépenses
 * - Recherche multicritère : commercant, date, categorie, sous_categorie, articles, montant_total
 * - Tri chronologique ou par montant
 * - Rendu haute densité avec typographie soignée
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Receipt,
  Trash2,
  Eye,
  Sparkles,
} from 'lucide-react';
import {
  TransactionTicket,
  CATEGORIES_CONFIG,
} from '../types/expense';
import { ConfirmDialog } from './ConfirmDialog';

interface ExpenseListProps {
  expenses: TransactionTicket[];
  onSelectExpense: (expense: TransactionTicket) => void;
  onDeleteExpense: (id: string) => void;
  onNewScan: () => void;
  onSeedDemo: () => void;
  onManualAdd: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onSelectExpense,
  onDeleteExpense,
  onNewScan,
  onSeedDemo,
  onManualAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [ticketToDelete, setTicketToDelete] = useState<TransactionTicket | null>(null);

  // Recherche multicritère
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        if (selectedCategory !== 'all' && exp.categorie !== selectedCategory) {
          return false;
        }

        if (searchTerm.trim() !== '') {
          const q = searchTerm.toLowerCase();
          const matchCommercant = exp.commercant.toLowerCase().includes(q);
          const matchCategorie = exp.categorie.toLowerCase().includes(q);
          const matchSousCat = (exp.sous_categorie || '').toLowerCase().includes(q);
          const matchMontant = exp.montant_total.toString().includes(q);
          const matchArticles = exp.articles?.some((art) => art.nom.toLowerCase().includes(q));
          const matchNotes = (exp.commentaires || '').toLowerCase().includes(q);

          return matchCommercant || matchCategorie || matchSousCat || matchMontant || matchArticles || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.montant_total - a.montant_total;
        }
        if (sortBy === 'amount_asc') {
          return a.montant_total - b.montant_total;
        }
        return 0;
      });
  }, [expenses, searchTerm, selectedCategory, sortBy]);

  const displayedTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.montant_total, 0);
  }, [filteredExpenses]);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Base de Données des Tickets
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>{filteredExpenses.length} transaction{filteredExpenses.length > 1 ? 's' : ''}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              Total cumulé : {displayedTotal.toFixed(2)} €
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onManualAdd}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Saisie manuelle</span>
          </button>

          <button
            onClick={onNewScan}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Scanner un ticket</span>
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par commerçant, article, sous-catégorie, montant..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Toutes les catégories</option>
            {Object.keys(CATEGORIES_CONFIG).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="date_desc">Date la plus récente</option>
            <option value="date_asc">Date la plus ancienne</option>
            <option value="amount_desc">Montant le plus élevé</option>
            <option value="amount_asc">Montant le plus faible</option>
          </select>
        </div>
      </div>

      {/* Tableau des données */}
      {filteredExpenses.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Aucune transaction trouvée
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Modifiez vos filtres de recherche ou ajoutez un nouveau ticket.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onNewScan}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              Scanner un ticket
            </button>
            {expenses.length === 0 && (
              <button
                onClick={onSeedDemo}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Charger les exemples</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">
                    commercant
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">
                    date & heure
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">
                    categorie / sous_categorie
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">
                    articles
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px] text-right">
                    montant_total & tva
                  </th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-[11px] text-right">
                    actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredExpenses.map((exp) => {
                  const meta = CATEGORIES_CONFIG[exp.categorie] || CATEGORIES_CONFIG.Autre;
                  return (
                    <tr
                      key={exp.id}
                      onClick={() => onSelectExpense(exp)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {exp.commercant}
                            </div>
                            {exp.commentaires && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {exp.commentaires}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{exp.date}</div>
                        <div className="text-[11px] text-slate-400">{exp.heure || '12:00'}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-medium">{exp.categorie}</div>
                        <div className="text-[11px] text-slate-400">{exp.sous_categorie}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {exp.articles && exp.articles.length > 0 ? (
                          <span>{exp.articles.length} article{exp.articles.length > 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white text-sm">
                          {exp.montant_total.toFixed(2)} €
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                          TVA: {(exp.tva || 0).toFixed(2)} €
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectExpense(exp)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTicketToDelete(exp)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Boîte de dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={!!ticketToDelete}
        title="Supprimer la transaction ?"
        message={`Êtes-vous sûr de vouloir supprimer définitivement le ticket de ${ticketToDelete?.commercant || 'ce commerçant'} (${ticketToDelete?.montant_total.toFixed(2)} €) ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDestructive={true}
        onConfirm={() => {
          if (ticketToDelete) {
            onDeleteExpense(ticketToDelete.id);
            setTicketToDelete(null);
          }
        }}
        onCancel={() => setTicketToDelete(null)}
      />
    </div>
  );
};
