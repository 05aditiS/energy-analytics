import React, { useState } from 'react';
import { Calendar, Clock, Info, Shield, Wind, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function Header({ dates, selectedDate, onDateChange, loading }) {
  const [showCutoffInfo, setShowCutoffInfo] = useState(false);

  // Format date nicely (e.g. 15 January 2026)
  const formatDisplayDate = (dStr) => {
    if (!dStr) return '';
    try {
      const [year, month, day] = dStr.split('-');
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      });
    } catch {
      return dStr;
    }
  };

  return (
    <header className="border-b border-desk-border bg-desk-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Title & Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Wind className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase font-mono">
                  Wind Procurement Analytics
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Live Desk
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>UK National Wind — Day-Ahead Forecast Risk</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-500 font-mono">Elexon BMRS</span>
              </p>
            </div>
          </div>

          {/* Controls: Date Picker & Cutoff Badge */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Cutoff Explainer Badge & Popup */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCutoffInfo(!showCutoffInfo)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-desk-850 hover:bg-desk-800 border border-desk-border text-slate-300 transition-colors"
                title="Click for day-ahead market timing explanation"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Cutoff: <strong className="text-amber-400 font-mono">D-1 11:00 UTC</strong></span>
                <Info className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {showCutoffInfo && (
                <div className="absolute right-0 mt-2 w-80 p-4 bg-desk-900 border border-desk-border rounded-lg shadow-2xl z-50 text-xs">
                  <div className="flex items-center justify-between border-b border-desk-border pb-2 mb-2.5">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Day-Ahead Market Cutoff
                    </span>
                    <button
                      onClick={() => setShowCutoffInfo(false)}
                      className="text-slate-500 hover:text-slate-300 text-sm font-bold"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    For every 30-minute delivery period on day <strong className="text-white">D</strong>, UK day-ahead power procurement decisions close at <strong className="text-amber-400">11:00:00 UTC on D-1</strong>.
                  </p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    This dashboard strictly incorporates the latest forecast published at or before this deadline. Forecasts published after 11:00 UTC are rejected to eliminate lookahead bias.
                  </p>
                </div>
              )}
            </div>

            {/* Selected Date Indicator & Dropdown */}
            <div className="flex items-center gap-2 bg-desk-850 border border-desk-border rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-sky-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Delivery Date</span>
                <select
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  disabled={loading || !dates.length}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer font-mono"
                  id="date-selector"
                >
                  {dates.map((d) => (
                    <option key={d} value={d} className="bg-desk-900 text-slate-200">
                      {d} ({formatDisplayDate(d)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick date chips for test days: Jan 1, Jan 15, Jan 31 */}
            <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span className="text-slate-500 text-[10px] uppercase mr-1">Quick:</span>
              {['2026-01-01', '2026-01-15', '2026-01-31'].map((quickD) => (
                <button
                  key={quickD}
                  onClick={() => onDateChange(quickD)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDate === quickD
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-desk-850 hover:bg-desk-800 text-slate-400 border border-desk-border'
                  }`}
                >
                  {quickD.slice(8)} Jan
                </button>
              ))}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
