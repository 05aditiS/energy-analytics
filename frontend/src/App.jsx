import React from 'react';
import { useTheme } from './hooks/useTheme';
import { useDashboardData } from './hooks/useDashboardData';
import TopExecutiveNav from './components/TopExecutiveNav';
import BentoRow1Metrics from './components/BentoRow1Metrics';
import BentoRow2TimeSeriesCalendar from './components/BentoRow2TimeSeriesCalendar';
import BentoRow3CopilotRisk from './components/BentoRow3CopilotRisk';
import DataQualityPanel from './components/DataQualityPanel';

export default function App() {
  const { theme, toggleTheme, isDark } = useTheme();
  const {
    dates,
    selectedDate,
    dayData,
    metrics,
    hourlyMetrics,
    qualityReport,
    bufferData,
    loadingGlobal,
    loadingDay,
    error,
    changeDate,
    retry,
  } = useDashboardData();

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-dark-bg text-slate-100' : 'bg-light-bg text-slate-900'}`}>
      
      {/* Top Executive Navigation */}
      <TopExecutiveNav
        selectedDate={selectedDate}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Executive Bento Grid Container */}
      <main className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        
        {/* Bento Grid Row 1: Key Metrics & Forecast Reliability Speedometer */}
        <section aria-label="Key Performance Indicators and Reliability">
          <BentoRow1Metrics
            dayData={dayData}
            metrics={metrics}
            selectedDate={selectedDate}
          />
        </section>

        {/* Bento Grid Row 2: Primary 48-SP Time-Series & Interactive Mini-Calendar */}
        <section aria-label="Day-Ahead Dispatch Curve and Calendar">
          <BentoRow2TimeSeriesCalendar
            dayData={dayData}
            selectedDate={selectedDate}
            onDateChange={changeDate}
            theme={theme}
          />
        </section>

        {/* Bento Grid Row 3: AI Copilot & Settlement Window Risk Distribution */}
        <section aria-label="AI Dispatch Copilot and Risk Windows">
          <BentoRow3CopilotRisk
            selectedDate={selectedDate}
            dayData={dayData}
            hourlyMetrics={hourlyMetrics}
          />
        </section>

        {/* Pipeline Data Quality & Ingestion Audit */}
        <section aria-label="Data Quality Governance">
          <DataQualityPanel
            qualityReport={qualityReport}
            loading={loadingGlobal}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/[0.08] py-4 text-xs text-slate-500 dark:text-dark-muted mt-8">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <div>
            ZEPHYR // UK National Wind Day-Ahead Procurement Desk • Elexon BMRS Live Stream
          </div>
          <div>
            Auction Cutoff: D-1 11:00 UTC (Zero-Leakage Enforcement)
          </div>
        </div>
      </footer>

    </div>
  );
}
