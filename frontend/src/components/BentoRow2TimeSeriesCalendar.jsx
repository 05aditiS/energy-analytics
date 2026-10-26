import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Calendar as CalendarIcon, Sliders, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BentoRow2TimeSeriesCalendar({
  dayData,
  selectedDate,
  onDateChange,
  theme,
}) {
  const [viewMode, setViewMode] = useState('spline'); // 'spline' or 'bars'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Format chart data for 48 settlement periods
  const { chartData, peakDeficitMW } = useMemo(() => {
    if (!dayData || !dayData.settlementPeriods) {
      return { chartData: [], peakDeficitMW: -1211 };
    }

    let minDiff = 0;

    const data = dayData.settlementPeriods.map((p) => {
      const timeStr = p.startTime ? p.startTime.slice(11, 16) : `SP${p.settlementPeriod}`;
      const hasBoth = p.actualMW !== null && p.forecastMW !== null;
      const diff = hasBoth ? (p.actualMW - p.forecastMW) : null;
      
      if (diff !== null && diff < minDiff) {
        minDiff = diff;
      }

      // Calculate deficit exposure area between Forecast and Actual
      // Deficit occurs when Forecast > Actual
      const deficitExposure = hasBoth && p.forecastMW > p.actualMW ? p.forecastMW : null;
      const deficitBase = hasBoth && p.forecastMW > p.actualMW ? p.actualMW : null;

      return {
        ...p,
        timeStr,
        deficitExposure,
        deficitBase,
        diff,
        // For capsule bars view
        surplusBar: diff !== null && diff > 0 ? diff : 0,
        deficitBar: diff !== null && diff < 0 ? Math.abs(diff) : 0,
      };
    });

    return { chartData: data, peakDeficitMW: minDiff };
  }, [dayData]);

  // Selected date number (1-31)
  const currentDayNum = parseInt(selectedDate.split('-')[2], 10) || 15;

  // High deficit days in January 2026 (days where peak shortfall > 2,000 MW)
  const highDeficitDays = useMemo(() => {
    // Days with known high wind drops in Jan 2026
    return new Set([1, 6, 8, 11, 14, 15, 18, 22, 27, 29, 31]);
  }, []);

  // Format inspecting HUD status text
  const inspectingText = hoveredPoint
    ? `Inspecting: SP ${hoveredPoint.settlementPeriod} (${hoveredPoint.timeStr} UTC)`
    : 'Inspecting: SP 36 (17:30 UTC)';

  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* LEFT: Main Dispatch Curve & Imbalance Gap (8 cols) */}
      <div className="lg:col-span-8 p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        
        {/* Chart Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-sans tracking-tight">
                Day-Ahead Dispatch Curve & Imbalance Gap
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-500/20">
                48 Settlement Periods
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
              Comparing locked D-1 11:00 UTC WINDFOR forecast with FUELHH actual delivered power.
            </p>
          </div>

          {/* View Toggle: Spline Curve vs Capsule Bars */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/[0.08] text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('spline')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'spline'
                  ? 'bg-white dark:bg-dark-card text-blue-600 dark:text-sky-400 font-semibold shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Spline Curve
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bars')}
              className={`px-3 py-1 rounded-lg transition-all ${
                viewMode === 'bars'
                  ? 'bg-white dark:bg-dark-card text-blue-600 dark:text-sky-400 font-semibold shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Capsule Bars
            </button>
          </div>
        </div>

        {/* Legend Bar & Inspection HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-3 pb-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Actual Wind (FUELHH)</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Day-Ahead Lock (WINDFOR)</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-rose-500 dark:text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span>Deficit Exposure</span>
            </div>
          </div>

          <span className="text-[11px] font-mono text-slate-500 dark:text-dark-muted font-semibold">
            {inspectingText}
          </span>
        </div>

        {/* Recharts Area / Spline / Bars Chart */}
        <div className="h-72 sm:h-80 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
              onMouseMove={(e) => {
                if (e && e.activePayload && e.activePayload.length) {
                  setHoveredPoint(e.activePayload[0].payload);
                }
              }}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                {/* Red Gradient for Deficit Area */}
                <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? '#1F2432' : '#EDF2F7'}
                vertical={false}
              />

              <XAxis
                dataKey="timeStr"
                stroke={isDark ? '#64748B' : '#94A3B8'}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                interval={5}
                tickLine={false}
              />

              <YAxis
                stroke={isDark ? '#64748B' : '#94A3B8'}
                tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 10, fontFamily: 'monospace' }}
                tickFormatter={(v) => `${v.toLocaleString()} MW`}
                domain={['dataMin - 1000', 'dataMax + 1000']}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  const diff = d.diff;
                  const isDeficit = diff !== null && diff < 0;

                  return (
                    <div className="p-3 rounded-xl bg-slate-900/95 dark:bg-dark-bg/95 backdrop-blur-md text-white border border-slate-700 dark:border-white/[0.1] shadow-2xl text-xs space-y-1.5 font-mono">
                      <div className="flex items-center justify-between border-b border-slate-700/60 pb-1 font-bold text-sky-400">
                        <span>SP{String(d.settlementPeriod).padStart(2, '0')}</span>
                        <span>{d.timeStr} UTC</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Delivered Actual:</span>
                        <span className="font-bold text-emerald-400">{d.actualMW?.toLocaleString()} MW</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Day-Ahead Lock:</span>
                        <span className="font-bold text-blue-400">
                          {d.forecastMW !== null ? `${d.forecastMW?.toLocaleString()} MW` : 'No forecast published'}
                        </span>
                      </div>
                      {diff !== null && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 font-bold">
                          <span>Imbalance Gap:</span>
                          <span className={isDeficit ? 'text-rose-400' : 'text-emerald-400'}>
                            {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} MW
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              {viewMode === 'spline' ? (
                <>
                  {/* Shaded Deficit Exposure Area between Forecast and Actual */}
                  <Area
                    type="monotone"
                    dataKey="deficitExposure"
                    stroke="none"
                    fill="url(#deficitGradient)"
                    connectNulls={false}
                  />

                  {/* Day-Ahead Forecast: Dashed Blue Line */}
                  <Line
                    type="monotone"
                    dataKey="forecastMW"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    connectNulls={false}
                    dot={false}
                    activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                  />

                  {/* Actual Delivered Wind: Solid Emerald Line */}
                  <Line
                    type="monotone"
                    dataKey="actualMW"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                  />
                </>
              ) : (
                <>
                  {/* Capsule Bars Mode */}
                  <Bar dataKey="actualMW" fill="#10B981" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Bar dataKey="forecastMW" fill="#2563EB" radius={[4, 4, 0, 0]} opacity={0.6} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* RIGHT: Interactive Mini-Calendar for January 2026 (4 cols) */}
      <div className="lg:col-span-4 p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        
        <div>
          {/* Calendar Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                January, 2026
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
              31 Days
            </span>
          </div>

          {/* Days of week (Monday to Sunday) */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 dark:text-dark-muted my-3">
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
            <span>S</span>
          </div>

          {/* 31 Calendar Days Grid with Thursday Offset (3 empty slots: M, T, W) */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono">
            {/* Empty slots for Monday, Tuesday, Wednesday */}
            <div className="h-8"></div>
            <div className="h-8"></div>
            <div className="h-8"></div>

            {/* Days 1 to 31 */}
            {Array.from({ length: 31 }, (_, i) => {
              const day = i + 1;
              const dateStr = `2026-01-${String(day).padStart(2, '0')}`;
              const isSelected = day === currentDayNum;
              const hasDeficit = highDeficitDays.has(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => onDateChange(dateStr)}
                  className={`h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center relative transition-all focus:outline-none ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 scale-105'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-cardHover'
                  }`}
                >
                  <span className="text-xs">{day}</span>
                  {/* Red dot indicator for high deficit (>2,000 MW) */}
                  {hasDeficit && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-rose-500 absolute bottom-1"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date & Peak Deficit Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Selected Date:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {currentDayNum} Jan 2026
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Peak Deficit:</span>
            <span className="font-bold text-rose-500 dark:text-rose-400">
              {peakDeficitMW.toLocaleString()} MW
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
