import React from 'react';
import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle, Gauge, TrendingDown, TrendingUp } from 'lucide-react';

export default function KPICards({ metrics, loading }) {
  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-desk-900 border border-desk-border rounded-xl animate-pulse p-4 flex flex-col justify-between">
            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
            <div className="h-7 bg-slate-800 rounded w-3/4"></div>
            <div className="h-3 bg-slate-800 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  const {
    maeMW = 0,
    rmseMW = 0,
    meanErrorMW = 0,
    nMAEPercent = 0,
    comparablePeriods = 0,
  } = metrics || {};

  // Application-derived Normalized Forecast Score = 100 - nMAE
  const normalizedScore = nMAEPercent !== null ? Math.max(0, (100 - nMAEPercent)).toFixed(2) : 'N/A';

  // Bias interpretation:
  // negative = actual wind generation was lower than forecast on average (over-prediction)
  // positive = actual wind was higher than forecast (under-prediction)
  const isOverpredicting = meanErrorMW < 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. MAE Card */}
      <div className="bg-desk-900 border border-desk-border hover:border-slate-700 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Mean Absolute Error</span>
          <span className="p-1.5 rounded-md bg-sky-500/10 text-sky-400">
            <Activity className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">
            {maeMW !== null ? maeMW.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
          </span>
          <span className="text-xs font-medium text-slate-400 font-mono">MW</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-desk-border/60 pt-2">
          <span>Avg forecast error magnitude</span>
          <span className="text-slate-500 font-mono">N = {comparablePeriods}</span>
        </div>
      </div>

      {/* 2. RMSE Card */}
      <div className="bg-desk-900 border border-desk-border hover:border-slate-700 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Root Mean Sq Error</span>
          <span className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400">
            <Gauge className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-white">
            {rmseMW !== null ? rmseMW.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
          </span>
          <span className="text-xs font-medium text-slate-400 font-mono">MW</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-desk-border/60 pt-2">
          <span>Penalizes volatile swings</span>
          <span className="text-slate-500 font-mono">RMSE/MAE: {(rmseMW / (maeMW || 1)).toFixed(2)}x</span>
        </div>
      </div>

      {/* 3. Directional Bias Card */}
      <div className="bg-desk-900 border border-desk-border hover:border-slate-700 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Directional Bias</span>
          <span className={`p-1.5 rounded-md ${
            isOverpredicting ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {isOverpredicting ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold font-mono ${isOverpredicting ? 'text-rose-400' : 'text-emerald-400'}`}>
            {meanErrorMW !== null ? (meanErrorMW > 0 ? `+${meanErrorMW.toFixed(1)}` : meanErrorMW.toFixed(1)) : '—'}
          </span>
          <span className="text-xs font-medium text-slate-400 font-mono">MW</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-desk-border/60 pt-2">
          <span className={isOverpredicting ? 'text-rose-400/90' : 'text-emerald-400/90'}>
            {isOverpredicting ? 'Actual < Forecast (Over-forecast)' : 'Actual > Forecast (Under-forecast)'}
          </span>
        </div>
      </div>

      {/* 4. Normalized Forecast Score / Accuracy Card */}
      <div className="bg-desk-900 border border-desk-border hover:border-slate-700 rounded-xl p-4 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider" title="Application-derived: 100 - nMAE%">
            Forecast Score
          </span>
          <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
            <CheckCircle className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {normalizedScore}%
          </span>
          <span className="text-xs font-medium text-slate-500 font-mono">accuracy</span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-desk-border/60 pt-2">
          <span title="Normalized MAE as % of mean generation">Underlying nMAE: <strong className="text-slate-300 font-mono">{nMAEPercent}%</strong></span>
          <span className="text-slate-500 text-[10px]">App-derived</span>
        </div>
      </div>

    </div>
  );
}
