/**
 * Composant Indicateur / Point de Repère des Articles
 * Affiche en temps réel pendant la saisie et modification :
 * - Nombre d'articles (lignes + somme des quantités)
 * - Coût total cumulé des articles
 * - Comparaison informative avec le montant total du ticket (écart de repère)
 * - Bouton d'alignement rapide pour synchroniser le montant total
 */

import React from 'react';
import { ArticleItem } from '../types/expense';
import { Calculator, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface ArticlesSummaryRepereProps {
  articles: ArticleItem[];
  montantTotal: number;
  onApplyTotal?: () => void;
  className?: string;
}

export const ArticlesSummaryRepere: React.FC<ArticlesSummaryRepereProps> = ({
  articles,
  montantTotal,
  onApplyTotal,
  className = '',
}) => {
  const nbLignes = articles.length;
  const nbQuantiteTotale = articles.reduce((sum, a) => sum + (Number(a.quantite) || 1), 0);
  const totalCout = articles.reduce(
    (sum, a) => sum + (Number(a.prix) || 0) * (Number(a.quantite) || 1),
    0
  );

  const diff = Number((totalCout - montantTotal).toFixed(2));
  const isConforme = montantTotal > 0 && Math.abs(diff) < 0.01;
  const hasEcart = montantTotal > 0 && Math.abs(diff) >= 0.01 && totalCout > 0;

  return (
    <div
      className={`p-3 rounded-lg border text-xs transition-all ${
        isConforme
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
          : hasEcart
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {/* Point de repère : Compteurs */}
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
              isConforme
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : hasEcart
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold flex items-center gap-2">
              <span>Point de repère articles :</span>
              <span className="font-mono tabular-nums font-bold text-sm">
                {totalCout.toFixed(2)} €
              </span>
            </div>
            <div className="text-[11px] opacity-80">
              {nbLignes} article{nbLignes > 1 ? 's' : ''} ({nbQuantiteTotale} unité{nbQuantiteTotale > 1 ? 's' : ''} au total)
            </div>
          </div>
        </div>

        {/* Indicateur de conformité / écart par rapport au total */}
        <div className="flex items-center gap-2">
          {isConforme && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conforme au total ticket ({montantTotal.toFixed(2)} €)</span>
            </span>
          )}

          {hasEcart && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Écart : {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} € (Ticket: {montantTotal.toFixed(2)} €)
                </span>
              </span>

              {onApplyTotal && (
                <button
                  type="button"
                  onClick={onApplyTotal}
                  className="px-2 py-1 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 rounded transition-colors flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                  title="Mettre à jour le montant total avec la somme calculée des articles"
                >
                  <span>Reporter ({totalCout.toFixed(2)} €)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {montantTotal <= 0 && totalCout > 0 && onApplyTotal && (
            <button
              type="button"
              onClick={onApplyTotal}
              className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <span>Définir montant total ({totalCout.toFixed(2)} €)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
