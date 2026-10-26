import React from 'react';
import { AlertTriangle, Flame, Info, ShieldAlert, Sparkles } from 'lucide-react';

export default function ThermalBufferCard({ bufferData, loading }) {
  if (loading && !bufferData) {
    return (
      <div className="bg-desk-900 border border-desk-border rounded-xl p-5 animate-pulse h-48">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-slate-800 rounded w-1/2 mb-3"></div>
        <div className="h-4 bg-slate-800 rounded w-2/3"></div>
      </div>
    );
  }

  const {
    indicativeBufferMW = 5574.25,
    percentile = 95,
    comparableObservations = 744,
    positiveShortfalls = 628,
    maxShortfallMW = 6857,
    avgShortfallMW = 2176,
  } = bufferData || {};

  return (
    <div className="bg-gradient-to-br from-desk-900 via-desk-900 to-desk-850 border border-amber-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
      
      {/* Subtle accent glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left side: Key metric */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-4 h-4 text-amber-400" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
              Indicative Thermal Buffer
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
              P{percentile} Risk
            </span>
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
              {Math.round(indicativeBufferMW).toLocaleString()}
            </span>
            <span className="text-sm font-bold text-amber-400 font-mono">MW</span>
          </div>

          <p className="text-xs text-slate-300 pt-0.5">
            Based on <strong className="text-white">P{percentile}</strong> historical January wind forecast shortfall.
          </p>
        </div>

        {/* Right side: Statistical Breakdown badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-desk-950/70 p-3 rounded-lg border border-desk-border text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Observed Periods</span>
            <span className="font-mono font-semibold text-slate-200">
              {comparableObservations} <span className="text-slate-500 text-[10px]">({positiveShortfalls} shortfalls)</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Max Historical Shortfall</span>
            <span className="font-mono font-semibold text-rose-400">
              {Math.round(maxShortfallMW).toLocaleString()} MW
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mean Shortfall</span>
            <span className="font-mono font-semibold text-amber-300">
              {Math.round(avgShortfallMW).toLocaleString()} MW
            </span>
          </div>
        </div>

      </div>

      {/* Mandatory Regulatory / Operational Disclaimer */}
      <div className="mt-4 pt-3 border-t border-desk-border/80 flex items-start gap-2 text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-300">Operational Disclaimer:</strong> This is an analytical estimate for the prototype calculated from Elexon January 2026 day-ahead shortfall distributions (<span className="font-mono text-slate-300">max(forecast - actual, 0)</span>), not an operational trading or dispatch instruction.
        </p>
      </div>

    </div>
  );
}
