/**
 * Barre de navigation principale conforme au Top Bar Contract
 * Zone 1: Marque unique sans pillules ni sous-titres superflus
 * Zone 2: Liens de navigation simples en une seule ligne
 * Zone 3: Action primaire (Nouveau Scan) + Sélecteur de thème
 */
import React from 'react';
import { Camera, Sun, Moon, ReceiptText, BarChart3, Database } from 'lucide-react';

export type ActiveTab = 'expenses' | 'scan' | 'stats' | 'data';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  expensesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isDark,
  onToggleTheme,
  expensesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          
          {/* Zone 1: Marque & Logo minimaliste */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTabChange('expenses')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <ReceiptText className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                ScanDépense
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation principale (liens sur une seule ligne) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => onTabChange('expenses')}
              className={`flex items-center gap-2 pb-1 transition-colors whitespace-nowrap border-b-2 ${
                activeTab === 'expenses'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Mes Dépenses</span>
              <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500">
                ({expensesCount})
              </span>
            </button>

            <button
              onClick={() => onTabChange('scan')}
              className={`flex items-center gap-2 pb-1 transition-colors whitespace-nowrap border-b-2 ${
                activeTab === 'scan'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Scanner un Ticket</span>
            </button>

            <button
              onClick={() => onTabChange('stats')}
              className={`flex items-center gap-2 pb-1 transition-colors whitespace-nowrap border-b-2 ${
                activeTab === 'stats'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analyses & Graphiques</span>
            </button>

            <button
              onClick={() => onTabChange('data')}
              className={`flex items-center gap-2 pb-1 transition-colors whitespace-nowrap border-b-2 ${
                activeTab === 'data'
                  ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Sauvegardes & Données</span>
            </button>
          </nav>

          {/* Zone 3: Action Primaire + Basculeur Clair/Sombre */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onToggleTheme}
              aria-label="Basculer le thème"
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onTabChange('scan')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>Scanner</span>
            </button>
          </div>
        </div>

        {/* Barre d'onglets mobile */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => onTabChange('expenses')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${
              activeTab === 'expenses' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>Dépenses</span>
          </button>
          <button
            onClick={() => onTabChange('scan')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${
              activeTab === 'scan' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scanner</span>
          </button>
          <button
            onClick={() => onTabChange('stats')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${
              activeTab === 'stats' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Stats</span>
          </button>
          <button
            onClick={() => onTabChange('data')}
            className={`flex flex-col items-center gap-1 py-1 px-2 ${
              activeTab === 'data' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-500'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Données</span>
          </button>
        </div>
      </div>
    </header>
  );
};
