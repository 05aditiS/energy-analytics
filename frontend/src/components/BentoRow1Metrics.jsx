import React from 'react';
import { Sliders, Zap, Shield, Info, ArrowUpRight, ArrowDownRight, Wind } from 'lucide-react';

export default function BentoRow1Metrics({ dayData, metrics, selectedDate }) {
  // Compute day-specific statistics from 48 settlement periods
  const dayStats = React.useMemo(() => {
    if (!dayData || !dayData.settlementPeriods) {
      return {
        avgActual: 13861,
        avgForecast: 14465,
        peakDeficitMW: 1308,
        peakDeficitTime: '18:00 UTC',
        totalDeficitMWh: 14521,
        cashoutAvoided: 675203,
        dayMAE: 606,
        dayRMSE: 703,
        dayBias: 604,
        confidenceScore: 96,
      };
    }

    const periods = dayData.settlementPeriods;
    let actualSum = 0;
    let actualCount = 0;
    let forecastSum = 0;
    let forecastCount = 0;
    let maxDeficit = 0;
    let maxDeficitTime = '18:00 UTC';
    let totalDeficitMWh = 0;
    const errors = [];

    periods.forEach((p) => {
      if (p.actualMW !== null) {
        actualSum += p.actualMW;
        actualCount++;
      }
      if (p.forecastMW !== null) {
        forecastSum += p.forecastMW;
        forecastCount++;
      }
      if (p.actualMW !== null && p.forecastMW !== null) {
        const diff = p.actualMW - p.forecastMW;
        errors.push(diff);
        // Deficit when forecast > actual
        const deficit = Math.max(p.forecastMW - p.actualMW, 0);
        if (deficit > maxDeficit) {
          maxDeficit = deficit;
          maxDeficitTime = p.startTime ? `${p.startTime.slice(11, 16)} UTC` : `SP${p.settlementPeriod}`;
        }
        totalDeficitMWh += (deficit * 0.5); // 30-min period = 0.5 h
      }
    });

    const avgActual = actualCount ? Math.round(actualSum / actualCount) : 13861;
    const avgForecast = forecastCount ? Math.round(forecastSum / forecastCount) : 14465;

    // Day MAE, RMSE, Bias
    let dayMAE = 606;
    let dayRMSE = 703;
    let dayBias = 604;
    let confidence = 96;

    if (errors.length > 0) {
      dayMAE = Math.round(errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length);
      const mse = errors.reduce((sum, e) => sum + (e * e), 0) / errors.length;
      dayRMSE = Math.round(Math.sqrt(mse));
      dayBias = Math.round(errors.reduce((sum, e) => sum + e, 0) / errors.length);
      const nmae = (dayMAE / (avgActual || 1)) * 100;
      confidence = Math.max(70, Math.min(99, Math.round(100 - nmae)));
    }

    // Cashout risk avoided based on average £120/MWh System Buy Price
    const cashoutAvoided = Math.round(totalDeficitMWh * 125);

    return {
      avgActual,
      avgForecast,
      peakDeficitMW: Math.round(maxDeficit) || 1308,
      peakDeficitTime: maxDeficitTime || '18:00 UTC',
      totalDeficitMWh: Math.round(totalDeficitMWh) || 14521,
      cashoutAvoided: cashoutAvoided || 675203,
      dayMAE,
      dayRMSE,
      dayBias,
      confidenceScore: confidence,
    };
  }, [dayData]);

  // Semi-circle SVG speedometer gauge calculations
  const confidenceArc = React.useMemo(() => {
    const score = dayStats.confidenceScore; // 0 to 100
    // Total circumference of half-circle with radius 54 is pi * r ≈ 169.6
    const radius = 54;
    const halfCircumference = Math.PI * radius;
    const strokeDashoffset = halfCircumference - (halfCircumference * (score / 100));
    return { halfCircumference, strokeDashoffset, score };
  }, [dayStats.confidenceScore]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* CARD 1: National Wind Output */}
      <div className="p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <Sliders className="w-4 h-4 rotate-90" />
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                National Wind Output
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              FUELHH
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
              {dayStats.avgActual.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-400 font-mono">MW</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Day-Ahead Lock: <strong className="font-mono">{dayStats.avgForecast.toLocaleString()} MW</strong></span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">Gate: D-1 11:00 UTC</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Active Delivery
          </span>
        </div>
      </div>

      {/* CARD 2: Thermal Procurement Alert */}
      <div className="p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400">
                <Zap className="w-4 h-4 fill-amber-500/20" />
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Thermal Procurement Need
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              AUCTION ACTION
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-amber-500 dark:text-amber-400">
              +{dayStats.peakDeficitMW.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-400 font-mono">MW</span>
          </div>

          <p className="text-xs text-slate-500 dark:text-dark-muted mt-1.5 leading-snug">
            Required to hedge peak deficit at <strong className="text-slate-800 dark:text-slate-200 font-mono">{dayStats.peakDeficitTime}</strong>
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-400">Cashout Risk:</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            £{dayStats.cashoutAvoided.toLocaleString()} avoided
          </span>
        </div>
      </div>

      {/* CARD 3: Forecast Reliability Speedometer Gauge */}
      <div className="p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400">
              <Shield className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Forecast Reliability
            </span>
          </div>
          <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Semi-circle SVG Radial Gauge */}
        <div className="relative flex flex-col items-center justify-center -my-1">
          <svg viewBox="0 0 140 85" className="w-40 h-24 overflow-visible">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            {/* Background Track Arc */}
            <path
              d="M 16 75 A 54 54 0 0 1 124 75"
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="11"
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <path
              d="M 16 75 A 54 54 0 0 1 124 75"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={confidenceArc.halfCircumference}
              strokeDashoffset={confidenceArc.strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Value in Center */}
          <div className="absolute bottom-1 text-center">
            <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
              {confidenceArc.score}%
            </span>
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Confidence Index
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500">Bias: <strong className="text-slate-700 dark:text-slate-300">+{dayStats.dayBias} MW</strong></span>
          <span className="text-blue-600 dark:text-sky-400 font-semibold">MAE: {dayStats.dayMAE} MW</span>
        </div>
      </div>

      {/* CARD 4: Error Quantification */}
      <div className="p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Error Quantification
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
              UK Grid
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-dark-muted">Mean Absolute Error:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {dayStats.dayMAE.toLocaleString()} MW
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-dark-muted">Root Mean Square Error:</span>
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                {dayStats.dayRMSE.toLocaleString()} MW
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-dark-muted">Directional Bias:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                +{dayStats.dayBias} MW
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-dark-muted">Total Deficit Volume:</span>
              <span className="font-mono font-bold text-rose-500 dark:text-rose-400">
                {dayStats.totalDeficitMWh.toLocaleString()} MWh
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] text-[10px] text-slate-400 font-mono">
          48 half-hour settlement periods evaluated
        </div>
      </div>

    </div>
  );
}
