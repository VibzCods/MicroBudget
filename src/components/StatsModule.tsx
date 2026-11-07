/**
 * Module Stats & Visualisations Graphiques avec Chart.js
 * - Répartition des dépenses par catégorie (Doughnut Chart)
 * - Évolution mensuelle des dépenses (Bar Chart)
 * - Top Commerçants (Horizontal Bar Chart)
 * - Ventilation par sous-catégories
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  LineElement,
  PointElement,
  Filler,
  BarController,
  DoughnutController,
  LineController,
} from 'chart.js';
import { TransactionTicket, TimeFilter } from '../types/expense';
import { categoriesService } from '../services/categoriesService';
import {
  TrendingUp,
  Receipt,
  PieChart,
  Store,
  Calendar,
  Layers,
} from 'lucide-react';

Chart.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Filler,
  BarController,
  DoughnutController,
  LineController
);

interface StatsModuleProps {
  expenses: TransactionTicket[];
  isDark: boolean;
}

export const StatsModule: React.FC<StatsModuleProps> = ({ expenses, isDark }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const categoryChartRef = useRef<HTMLCanvasElement | null>(null);
  const monthlyChartRef = useRef<HTMLCanvasElement | null>(null);
  const merchantChartRef = useRef<HTMLCanvasElement | null>(null);

  const categoryChartInstance = useRef<Chart | null>(null);
  const monthlyChartInstance = useRef<Chart | null>(null);
  const merchantChartInstance = useRef<Chart | null>(null);

  // Filtrage par période
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.filter((item) => {
      const itemDate = new Date(item.date);
      if (isNaN(itemDate.getTime())) return true;

      if (timeFilter === 'this_month') {
        return (
          itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth
        );
      }
      if (timeFilter === 'last_30_days') {
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      if (timeFilter === 'this_year') {
        return itemDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [expenses, timeFilter]);

  // Agrégats et calculs statistiques
  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, item) => sum + item.montant_total, 0);
    const count = filteredExpenses.length;
    const average = count > 0 ? total / count : 0;
    const maxExpense = filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map((e) => e.montant_total)) : 0;
    const totalVat = filteredExpenses.reduce((sum, item) => sum + (item.tva || 0), 0);

    // Par catégorie
    const byCategory: Record<string, { total: number; count: number }> = {};
    for (const item of filteredExpenses) {
      const cat = item.categorie || 'Autre';
      if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
      byCategory[cat].total += item.montant_total;
      byCategory[cat].count += 1;
    }

    // Par sous-catégorie
    const bySubCategory: Record<string, number> = {};
    for (const item of filteredExpenses) {
      const sub = item.sous_categorie || 'Divers';
      bySubCategory[sub] = (bySubCategory[sub] || 0) + item.montant_total;
    }

    // Top commerçants
    const byMerchant: Record<string, number> = {};
    for (const item of filteredExpenses) {
      const m = item.commercant || 'Inconnu';
      byMerchant[m] = (byMerchant[m] || 0) + item.montant_total;
    }
    const topMerchants = Object.entries(byMerchant)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Évolution mensuelle
    const monthlyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }
    for (const item of expenses) {
      const monthKey = item.date.substring(0, 7);
      if (monthlyMap[monthKey] !== undefined) {
        monthlyMap[monthKey] += item.montant_total;
      }
    }

    return {
      total,
      count,
      average,
      maxExpense,
      totalVat,
      byCategory,
      bySubCategory,
      topMerchants,
      monthlyMap,
    };
  }, [filteredExpenses, expenses]);

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // Chart 1: Donut Catégories
  useEffect(() => {
    if (!categoryChartRef.current) return;
    if (categoryChartInstance.current) categoryChartInstance.current.destroy();

    const categories = Object.keys(stats.byCategory);
    const dataValues = categories.map((cat) => stats.byCategory[cat].total);
    const backgroundColors = categories.map(
      (cat) => categoriesService.getCategoryMeta(cat).color
    );

    const ctx = categoryChartRef.current.getContext('2d');
    if (!ctx) return;

    categoryChartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categories,
        datasets: [
          {
            data: dataValues.length > 0 ? dataValues : [1],
            backgroundColor: dataValues.length > 0 ? backgroundColors : ['#cbd5e1'],
            borderWidth: 2,
            borderColor: isDark ? '#0f172a' : '#ffffff',
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 11 },
              padding: 12,
              boxWidth: 10,
              boxHeight: 10,
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw as number;
                const total = stats.total || 1;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${context.label}: ${val.toFixed(2)} € (${pct}%)`;
              },
            },
          },
        },
        cutout: '65%',
      },
    });

    return () => {
      if (categoryChartInstance.current) categoryChartInstance.current.destroy();
    };
  }, [stats.byCategory, isDark]);

  // Chart 2: Barres mensuelles
  useEffect(() => {
    if (!monthlyChartRef.current) return;
    if (monthlyChartInstance.current) monthlyChartInstance.current.destroy();

    const months = Object.keys(stats.monthlyMap);
    const labels = months.map((m) => {
      const [year, month] = m.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    });
    const values = months.map((m) => stats.monthlyMap[m]);

    const ctx = monthlyChartRef.current.getContext('2d');
    if (!ctx) return;

    monthlyChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Total (€)',
            data: values,
            backgroundColor: '#10b981',
            borderRadius: 6,
            maxBarThickness: 36,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${Number(ctx.raw).toFixed(2)} €`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val} €`,
            },
          },
        },
      },
    });

    return () => {
      if (monthlyChartInstance.current) monthlyChartInstance.current.destroy();
    };
  }, [stats.monthlyMap, isDark]);

  // Chart 3: Top Commerçants
  useEffect(() => {
    if (!merchantChartRef.current) return;
    if (merchantChartInstance.current) merchantChartInstance.current.destroy();

    const labels = stats.topMerchants.map((m) => m.name);
    const values = stats.topMerchants.map((m) => m.amount);

    const ctx = merchantChartRef.current.getContext('2d');
    if (!ctx) return;

    merchantChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['Aucun commerçant'],
        datasets: [
          {
            label: 'Total (€)',
            data: values.length > 0 ? values : [0],
            backgroundColor: '#3b82f6',
            borderRadius: 4,
            maxBarThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${Number(ctx.raw).toFixed(2)} €`,
            },
          },
        },
        scales: {
          y: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } },
          },
          x: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (val) => `${val} €`,
            },
          },
        },
      },
    });

    return () => {
      if (merchantChartInstance.current) merchantChartInstance.current.destroy();
    };
  }, [stats.topMerchants, isDark]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Module Stats & Analyse
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Visualisation Chart.js</span>
            <span aria-hidden="true">·</span>
            <span>Ventilation catégorie & sous-catégorie</span>
            <span aria-hidden="true">·</span>
            <span>Chiffres tabulaires</span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setTimeFilter('this_month')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeFilter === 'this_month'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Ce mois
          </button>
          <button
            onClick={() => setTimeFilter('last_30_days')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeFilter === 'last_30_days'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            30 jours
          </button>
          <button
            onClick={() => setTimeFilter('this_year')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeFilter === 'this_year'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Année en cours
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Total TTC */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total TTC</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats.total.toFixed(2)} €
          </div>
          <div className="text-xs text-slate-400 mt-1">{stats.count} transactions</div>
        </div>

        {/* KPI 2 : Total TVA */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">TVA Détectée</span>
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats.totalVat.toFixed(2)} €
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {stats.total > 0 ? `${((stats.totalVat / stats.total) * 100).toFixed(1)}% du montant TTC` : '0%'}
          </div>
        </div>

        {/* KPI 3 : Montant Total HT */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total HT</span>
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {Math.max(0, stats.total - stats.totalVat).toFixed(2)} €
          </div>
          <div className="text-xs text-slate-400 mt-1">Montant net hors taxes</div>
        </div>

        {/* KPI 4 : Ticket Moyen */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ticket Moyen</span>
            <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {stats.average.toFixed(2)} €
          </div>
          <div className="text-xs text-slate-400 mt-1">Moyenne par achat</div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Répartition par Catégorie</span>
              </h3>
            </div>
            <div className="h-64 relative">
              <canvas ref={categoryChartRef} />
            </div>
          </div>

          {/* Sous-catégories les plus actives */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Top Sous-catégories
            </span>
            {Object.entries(stats.bySubCategory)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4)
              .map(([sub, amount]) => {
                const pct = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                return (
                  <div key={sub} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                      {sub}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                      {amount.toFixed(2)} € ({pct.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Évolution Mensuelle</span>
              </h3>
            </div>
            <div className="h-56">
              <canvas ref={monthlyChartRef} />
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Top Commerçants</span>
              </h3>
            </div>
            <div className="h-52">
              <canvas ref={merchantChartRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
