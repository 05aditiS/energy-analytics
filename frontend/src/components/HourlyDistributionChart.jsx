import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { AlertCircle, BarChart3, Clock, Sparkles } from 'lucide-react';

/**
 * Custom Tooltip for Settlement Period Hourly Distribution
 */
const HourlyTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-desk-900/95 backdrop-blur-md border border-desk-border rounded-lg shadow-xl p-3 text-xs w-64 z-50">
      <div className="flex items-center justify-between border-b border-desk-border pb-1.5 mb-2 font-mono">
        <span className="font-bold text-sky-400">SP{String(d.settlementPeriod).padStart(2, '0')}</span>
        <span className="text-slate-300 font-semibold">{d.timeStr}</span>
        <span className="text-slate-500 text-[10px]">N = {d.sampleCount}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Mean Absolute Error:</span>
          <span className="font-mono font-bold text-amber-400">
            {d.maeMW !== null ? `${d.maeMW.toLocaleString()} MW` : 'No data'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Directional Bias:</span>
          <span className="font-mono font-bold">
            {d.averageErrorMW !== null ? (
              <span className={d.averageErrorMW < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {d.averageErrorMW > 0 ? `+${d.averageErrorMW.toFixed(1)}` : d.averageErrorMW.toFixed(1)} MW
              </span>
            ) : (
              'None'
            )}
          </span>
        </div>

        <div className="pt-1 text-[10px] text-slate-500 border-t border-desk-border/40">
          {d.sampleCount > 0 ? (
            <span>Aggregated over {d.sampleCount} January days</span>
          ) : (
            <span className="text-amber-400/80 italic">No forecast published for half-hour period</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function HourlyDistributionChart({ hourlyMetrics, loading }) {
  // Format data with time labels and find dynamic peak error
  const { chartData, peakErrorInsight, maxMAE } = useMemo(() => {
    if (!hourlyMetrics || !hourlyMetrics.length) {
      return { chartData: [], peakErrorInsight: null, maxMAE: 0 };
    }

    let highestMAE = 0;
    let peakPeriod = null;

    const data = hourlyMetrics.map((item) => {
      const sp = item.settlementPeriod;
      const totalMin = (sp - 1) * 30;
      const hour = Math.floor(totalMin / 60);
      const min = totalMin % 60;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} UTC`;
      const label = sp % 4 === 1 ? `SP${sp}` : '';

      if (item.maeMW !== null && item.maeMW > highestMAE) {
        highestMAE = item.maeMW;
        peakPeriod = { sp, timeStr, maeMW: item.maeMW, biasMW: item.averageErrorMW };
      }

      return {
        ...item,
        timeStr,
        displayLabel: label,
      };
    });

    let insight = null;
    if (peakPeriod) {
      insight = {
        statement: `Highest average forecast error occurs around Settlement Period ${peakPeriod.sp} (${peakPeriod.timeStr}) with a Mean Absolute Error of ${Math.round(peakPeriod.maeMW).toLocaleString()} MW.`,
        biasText: peakPeriod.biasMW < 0
          ? `Forecast systematically over-predicted wind by ${Math.abs(Math.round(peakPeriod.biasMW)).toLocaleString()} MW on average.`
          : `Forecast under-predicted wind by ${Math.round(peakPeriod.biasMW).toLocaleString()} MW on average.`,
      };
    }

    return { chartData: data, peakErrorInsight: insight, maxMAE: highestMAE };
  }, [hourlyMetrics]);

  if (loading && !chartData.length) {
    return (
      <div className="bg-desk-900 border border-desk-border rounded-xl p-6 h-80 flex items-center justify-center animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-desk-900 border border-desk-border rounded-xl p-5 shadow-lg space-y-4">
      
      {/* Chart Title & Dynamic Insight */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-desk-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Settlement Period Error Profile (SP1 – SP48)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical January 2026 Mean Absolute Error across all 48 intraday half-hour settlement windows
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded bg-amber-500/80"></span>
            <span>MAE (MW)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
            <span>Peak Error Period</span>
          </div>
        </div>
      </div>

      {/* Dynamic Data-Driven Insight Banner */}
      {peakErrorInsight && (
        <div className="p-3 rounded-lg bg-desk-850 border border-amber-500/30 flex items-start gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-200">
              {peakErrorInsight.statement}
            </p>
            <p className="text-slate-400 text-[11px]">
              {peakErrorInsight.biasText}
            </p>
          </div>
        </div>
      )}

      {/* Recharts Bar Chart */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            
            <XAxis
              dataKey="settlementPeriod"
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => `SP${v}`}
              interval={3}
            />
            
            <YAxis
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{
                value: 'MAE (MW)',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748B',
                fontSize: 11,
                offset: 10
              }}
            />

            <Tooltip content={<HourlyTooltip />} />

            <Bar dataKey="maeMW" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, index) => {
                // Visually highlight peak error bar
                const isPeak = entry.maeMW && maxMAE && entry.maeMW >= maxMAE * 0.95;
                const isAboveAverage = entry.maeMW && entry.maeMW > 2200;
                
                let fillColor = '#F59E0B'; // Amber default
                if (isPeak) {
                  fillColor = '#F43F5E'; // Rose for top error peak
                } else if (isAboveAverage) {
                  fillColor = '#FB923C'; // Orange for high error
                } else if (!entry.maeMW) {
                  fillColor = 'transparent';
                }

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fillColor}
                    fillOpacity={isPeak ? 1 : 0.75}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-desk-border pt-2 font-mono">
        <span>SP01 = 00:00 UTC (Night)</span>
        <span>SP24 = 11:30 UTC (Midday Cutoff)</span>
        <span>SP48 = 23:30 UTC (Close)</span>
      </div>

    </div>
  );
}
