import React from 'react';
import { Calendar, Moon, Sun, Wind, Sliders, Shield, Clock } from 'lucide-react';

export default function TopExecutiveNav({ selectedDate, theme, toggleTheme }) {
  // Format selected date (e.g., "15 Jan 2026")
  const formatDatePill = (dStr) => {
    if (!dStr) return '15 Jan 2026';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const day = parts[2];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[parseInt(parts[1], 10) - 1] || 'Jan';
      const year = parts[0];
      return `${parseInt(day, 10)} ${month} ${year}`;
    }
    return dStr;
  };

  return (
    <header className="w-full border-b transition-colors duration-200 bg-white/80 dark:bg-dark-card/90 backdrop-blur-md border-slate-200 dark:border-white/[0.08] sticky top-0 z-40">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left: Brand & Gate Closure */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-glow-blue shadow-sm">
              <Sliders className="w-5 h-5 rotate-90" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-wider font-sans text-slate-900 dark:text-white">
                  ZEPHYR
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ELEXON BMRS LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted font-medium">
                Day-Ahead Renewable Procurement Cockpit
              </p>
            </div>
          </div>

          {/* Auction Cutoff Zero-Leakage Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>AUCTION CUTOFF: <strong className="font-bold text-emerald-600 dark:text-emerald-300">D-1 11:00 UTC (ZERO-LEAKAGE)</strong></span>
          </div>
        </div>

        {/* Right: Date, Theme Toggle, Profile */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          
          {/* Selected Date Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
            <span className="font-mono">{formatDatePill(selectedDate)}</span>
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-sky-400 transition-colors shadow-sm focus:outline-none"
            title={theme === 'dark' ? 'Switch to Crisp Soft Slate (Light)' : 'Switch to Matte Obsidian (Dark)'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-white/[0.08]">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center font-mono shadow-sm">
              AS
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-xs font-bold leading-tight text-slate-800 dark:text-slate-200">
                Power Desk
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-dark-muted leading-tight">
                UK Day-Ahead Trader
              </span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
