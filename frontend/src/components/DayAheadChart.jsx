import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AlertTriangle, Clock, Info, ShieldCheck, Zap } from 'lucide-react';

/**
 * Custom Tooltip for Trading Desk Day-Ahead Chart
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const hasForecast = data.forecastMW !== null;
  const isShortfall = data.differenceMW !== null && data.differenceMW < 0;
  const isSurplus = data.differenceMW !== null && data.differenceMW > 0;

  return (
    <div className="bg-desk-900/95 backdrop-blur-md border border-desk-border rounded-lg shadow-2xl p-3 text-xs w-72 z-50">
      <div className="flex items-center justify-between border-b border-desk-border pb-1.5 mb-2 font-mono">
        <span className="font-bold text-sky-400">
          SP{String(data.settlementPeriod).padStart(2, '0')}
        </span>
        <span className="text-slate-300 font-semibold">{data.timeLabel} UTC</span>
        <span className="text-[10px] text-slate-500 font-mono">30-min window</span>
      </div>

      <div className="space-y-1.5">
        {/* Actual MW */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-0.5 bg-sky-400 rounded-full inline-block"></span>
            Actual Generation:
          </span>
          <span className="font-mono font-bold text-sky-300">
            {data.actualMW !== null ? `${data.actualMW.toLocaleString()} MW` : 'No actual data'}
          </span>
        </div>

        {/* Forecast MW */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-amber-400 inline-block"></span>
            Day-Ahead Forecast:
          </span>
          <span className="font-mono font-bold text-amber-400">
            {hasForecast ? `${data.forecastMW.toLocaleString()} MW` : (
              <span className="text-slate-500 italic font-sans">No forecast available</span>
            )}
          </span>
        </div>

        {/* Procurement Gap / Difference */}
        <div className="flex items-center justify-between pt-1 border-t border-desk-border/60">
          <span className="text-slate-400">Procurement Gap:</span>
          <span className="font-mono font-bold">
            {data.differenceMW !== null ? (
              <span className={isShortfall ? 'text-rose-400' : (isSurplus ? 'text-emerald-400' : 'text-slate-300')}>
                {data.differenceMW > 0 ? `+${data.differenceMW.toLocaleString()} MW` : `${data.differenceMW.toLocaleString()} MW`}
                {' '}
                <span className="text-[10px] font-sans font-normal uppercase">
                  ({isShortfall ? 'Shortfall' : (isSurplus ? 'Surplus' : 'Balanced')})
                </span>
              </span>
            ) : (
              <span className="text-slate-500 italic font-sans font-normal">N/A (Missing Forecast)</span>
            )}
          </span>
        </div>

        {/* Forecast Publication Timestamp */}
        <div className="pt-1.5 text-[10px] text-slate-400 border-t border-desk-border/40 flex items-center justify-between">
          <span>Forecast Cutoff Rule:</span>
          <span className="font-mono text-amber-400/90 text-[10px]">
            {data.forecastPublishTime ? (
              `Pub: ${data.forecastPublishTime.slice(11, 16)} UTC (D-1)`
            ) : (
              'None published <= 11:00 UTC'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function DayAheadChart({ dayData, selectedDate, loading }) {
  const chartData = useMemo(() => {
    if (!dayData || !dayData.settlementPeriods) return [];

    return dayData.settlementPeriods.map((period) => {
      // Parse UTC time from startTime (e.g. 2026-01-15T14:00:00Z -> 14:00)
      const timeLabel = period.startTime ? period.startTime.slice(11, 16) : `SP${period.settlementPeriod}`;
      
      // Calculate separate surplus and shortfall fields for Recharts visual representation
      const isShortfall = period.differenceMW !== null && period.differenceMW < 0;
      const isSurplus = period.differenceMW !== null && period.differenceMW > 0;

      return {
        ...period,
        timeLabel,
        displayLabel: period.settlementPeriod % 4 === 1 ? timeLabel : '', // Label every 2 hours
        // Procurement Gap representation:
        // Do not convert null to 0!
        shortfallMW: isShortfall ? period.differenceMW : null,
        surplusMW: isSurplus ? period.differenceMW : null,
      };
    });
  }, [dayData]);

  // Statistics for this specific delivery day
  const dayStats = useMemo(() => {
    if (!chartData.length) return null;
    let totalActual = 0;
    let actualCount = 0;
    let totalShortfall = 0;
    let shortfallPeriods = 0;
    let missingForecasts = 0;

    chartData.forEach((p) => {
      if (p.actualMW !== null) {
        totalActual += p.actualMW;
        actualCount++;
      }
      if (p.differenceMW !== null && p.differenceMW < 0) {
        totalShortfall += Math.abs(p.differenceMW);
        shortfallPeriods++;
      }
      if (p.forecastMW === null) {
        missingForecasts++;
      }
    });

    return {
      avgActual: actualCount ? Math.round(totalActual / actualCount) : 0,
      totalShortfallMW: Math.round(totalShortfall),
      shortfallPeriods,
      missingForecasts,
    };
  }, [chartData]);

  if (loading && !chartData.length) {
    return (
      <div className="bg-desk-900 border border-desk-border rounded-xl p-6 h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-mono">Loading 48 settlement periods for {selectedDate}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-desk-900 border border-desk-border rounded-xl p-5 shadow-lg space-y-4">
      
      {/* Chart Header & Mini Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-desk-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Day-Ahead Forecast vs Actual Wind Generation
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-desk-800 text-sky-400 border border-desk-border">
              {selectedDate} (48 Periods)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Half-hourly delivery periods with day-ahead market cutoff (D-1 11:00 UTC)
          </p>
        </div>

        {/* Day Summary Badges */}
        {dayStats && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-desk-850 border border-desk-border">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span className="text-slate-400">Mean Actual:</span>
              <span className="font-mono font-bold text-white">{dayStats.avgActual.toLocaleString()} MW</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-desk-850 border border-desk-border">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span className="text-slate-400">Shortfall Periods:</span>
              <span className="font-mono font-bold text-rose-400">{dayStats.shortfallPeriods}/48</span>
            </div>
            {dayStats.missingForecasts > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Info className="w-3.5 h-3.5" />
                <span className="text-[11px]">{dayStats.missingForecasts} periods without forecast</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Recharts Composed Time Series */}
      <div className="h-80 sm:h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 15, left: 5, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            
            <XAxis
              dataKey="timeLabel"
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
              interval={3}
              tickLine={{ stroke: '#334155' }}
            />
            
            <YAxis
              stroke="#64748B"
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={['auto', 'auto']}
              tickLine={{ stroke: '#334155' }}
              label={{
                value: 'Generation (MW)',
                angle: -90,
                position: 'insideLeft',
                fill: '#64748B',
                fontSize: 11,
                offset: 10
              }}
            />

            <Tooltip content={<CustomTooltip />} />
            
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              formatter={(value) => {
                if (value === 'actualMW') return <span className="text-sky-300 font-medium">Actual Wind</span>;
                if (value === 'forecastMW') return <span className="text-amber-400 font-medium">Day-Ahead Forecast (D-1 11:00 UTC)</span>;
                if (value === 'surplusMW') return <span className="text-emerald-400 font-medium">Surplus Gap (Act &gt; Fcast)</span>;
                if (value === 'shortfallMW') return <span className="text-rose-400 font-medium">Shortfall Gap (Act &lt; Fcast)</span>;
                return value;
              }}
            />

            {/* Procurement Gap: Surplus (Green Bars) & Shortfall (Red Bars) */}
            <Bar dataKey="surplusMW" fill="#10B981" fillOpacity={0.4} barSize={8} name="surplusMW" />
            <Bar dataKey="shortfallMW" fill="#F43F5E" fillOpacity={0.4} barSize={8} name="shortfallMW" />

            {/* Zero line reference */}
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />

            {/* Actual Wind Generation - Solid Line */}
            <Line
              type="monotone"
              dataKey="actualMW"
              stroke="#38BDF8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#38BDF8', stroke: '#070a10', strokeWidth: 2 }}
              name="actualMW"
            />

            {/* Day-Ahead Forecast - Dashed Line (connectNulls={false} ensures missing forecast is a GAP) */}
            <Line
              type="monotone"
              dataKey="forecastMW"
              stroke="#F59E0B"
              strokeWidth={2}
              strokeDasharray="5 5"
              connectNulls={false}
              dot={{ r: 2.5, fill: '#F59E0B' }}
              activeDot={{ r: 5, fill: '#F59E0B', stroke: '#070a10', strokeWidth: 2 }}
              name="forecastMW"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory Legend / Trading Guidance Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-desk-border text-xs">
        
        {/* Shortfall Risk Meaning */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0"></div>
          <div>
            <span className="font-semibold text-rose-300 block">
              Wind Shortfall (Actual &lt; Forecast)
            </span>
            <p className="text-slate-400 mt-0.5 leading-relaxed text-[11px]">
              Actual wind generation falls short of day-ahead expectation. Indicates a potential requirement for additional thermal dispatch or reserve activation to cover the deficit.
            </p>
          </div>
        </div>

        {/* Surplus Opportunity Meaning */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
          <div>
            <span className="font-semibold text-emerald-300 block">
              Wind Surplus (Actual &gt; Forecast)
            </span>
            <p className="text-slate-400 mt-0.5 leading-relaxed text-[11px]">
              Actual wind output exceeds the day-ahead forecast. Indicates potential opportunity to curtail thermal commitments or sell surplus energy into intraday balancing markets.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
