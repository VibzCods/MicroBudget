/**
 * Application ScanDépense - Numérisation, Vérification & Analyse de Tickets
 * 100% Frontend, Modulaire, Autonome et Ultra-légère
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { ScanModule } from './components/ScanModule';
import { StatsModule } from './components/StatsModule';
import { ExpenseList } from './components/ExpenseList';
import { DataManagement } from './components/DataManagement';
import { ExpenseModal } from './components/ExpenseModal';
import { ManualExpenseModal } from './components/ManualExpenseModal';
import { CategoriesManager } from './components/CategoriesManager';
import { storageService } from './services/storage';
import { TransactionTicket } from './types/expense';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
  const [expenses, setExpenses] = useState<TransactionTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedExpense, setSelectedExpense] = useState<TransactionTicket | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Mode sombre / clair synchronisé
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('scandepense_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('scandepense_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scandepense_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Chargement des données IndexedDB
  const loadExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      await storageService.init();
      await storageService.seedInitialDataIfFirstTime();
      const loaded = await storageService.getAll();
      setExpenses(loaded);
    } catch (e) {
      console.error('Erreur de chargement:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSaveExpense = async (newExpense: TransactionTicket) => {
    await storageService.save(newExpense);
    await loadExpenses();
    setActiveTab('expenses');
    showToast(`Transaction ${newExpense.commercant} enregistrée avec succès !`);
  };

  const handleUpdateExpense = async (updated: TransactionTicket) => {
    await storageService.save(updated);
    await loadExpenses();
    setSelectedExpense(updated);
    showToast('Transaction mise à jour.');
  };

  const handleDeleteExpense = async (id: string) => {
    await storageService.delete(id);
    await loadExpenses();
    showToast('Transaction supprimée.', 'info');
  };

  const handleSeedDemoData = async () => {
    await storageService.seedDemoData(true);
    await loadExpenses();
    showToast('Données de démonstration chargées.');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        expensesCount={expenses.length}
      />

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500">Chargement de la base locale...</span>
          </div>
        ) : (
          <>
            {activeTab === 'expenses' && (
              <ExpenseList
                expenses={expenses}
                onSelectExpense={(exp) => setSelectedExpense(exp)}
                onDeleteExpense={handleDeleteExpense}
                onNewScan={() => setActiveTab('scan')}
                onSeedDemo={handleSeedDemoData}
                onManualAdd={() => setIsManualModalOpen(true)}
              />
            )}

            {activeTab === 'scan' && (
              <ScanModule
                onSaveExpense={handleSaveExpense}
                onCancel={() => setActiveTab('expenses')}
              />
            )}

            {activeTab === 'stats' && (
              <StatsModule expenses={expenses} isDark={isDark} />
            )}

            {activeTab === 'categories' && (
              <CategoriesManager onCategoriesChanged={loadExpenses} />
            )}

            {activeTab === 'data' && (
              <DataManagement
                expenses={expenses}
                onDataChanged={loadExpenses}
                onNavigateToCategories={() => setActiveTab('categories')}
              />
            )}
          </>
        )}
      </main>

      <ExpenseModal
        expense={selectedExpense}
        isOpen={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        onUpdate={handleUpdateExpense}
        onDelete={handleDeleteExpense}
      />

      <ManualExpenseModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSave={handleSaveExpense}
      />

      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">ScanDépense</span>
            <span aria-hidden="true">·</span>
            <span>Application 100% frontend autonome</span>
            <span aria-hidden="true">·</span>
            <span>IndexedDB / LocalStorage</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Chart.js</span>
            <span aria-hidden="true">·</span>
            <span>OCR Tesseract.js</span>
            <span aria-hidden="true">·</span>
            <span>Export JSON normalisé</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
