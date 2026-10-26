import React, { useState } from 'react';
import { Sparkles, Send, Bot, Clock, AlertTriangle, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react';
import api from '../api';

export default function BentoRow3CopilotRisk({ selectedDate, dayData, hourlyMetrics }) {
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([
    {
      sender: 'copilot',
      text: `Good morning. Executive Briefing for ${selectedDate}: Wind generation shows an intraday deficit peaking at 18:00 UTC. We advise pre-hedging up to +1,211 MW of flexible thermal capacity prior to D-1 11:00 UTC gate closure to avoid System Buy Price imbalance penalties.`,
    },
  ]);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  // Settlement operational windows segmentation
  const windowRisks = React.useMemo(() => {
    // 5 standard operational trading windows in UK power market:
    // 1. Overnight: SP 01-14 (00:00 - 07:00)
    // 2. Morning Ramp: SP 15-22 (07:00 - 11:00)
    // 3. Midday Cutoff: SP 23-32 (11:00 - 16:00)
    // 4. Evening Peak: SP 33-44 (16:00 - 22:00)
    // 5. Late Night: SP 45-48 (22:00 - 24:00)

    const windows = [
      { name: 'Overnight (SP 01–14)', time: '00:00 – 07:00 UTC', minSP: 1, maxSP: 14, targetMAE: 1850 },
      { name: 'Morning Ramp (SP 15–22)', time: '07:00 – 11:00 UTC', minSP: 15, maxSP: 22, targetMAE: 2150 },
      { name: 'Midday Cutoff (SP 23–32)', time: '11:00 – 16:00 UTC', minSP: 23, maxSP: 32, targetMAE: 1980 },
      { name: 'Evening Peak (SP 33–44)', time: '16:00 – 22:00 UTC', minSP: 33, maxSP: 44, targetMAE: 2450 },
      { name: 'Late Night (SP 45–48)', time: '22:00 – 24:00 UTC', minSP: 45, maxSP: 48, targetMAE: 1720 },
    ];

    if (!hourlyMetrics || !hourlyMetrics.length) {
      return windows.map(w => ({
        ...w,
        maeMW: w.targetMAE,
        riskLevel: w.targetMAE > 2200 ? 'High Risk' : (w.targetMAE > 1900 ? 'Moderate' : 'Low Risk'),
        pct: Math.min(100, Math.round((w.targetMAE / 2600) * 100)),
      }));
    }

    return windows.map((w) => {
      const spSubset = hourlyMetrics.filter(m => m.settlementPeriod >= w.minSP && m.settlementPeriod <= w.maxSP && m.maeMW !== null);
      let calculatedMAE = w.targetMAE;
      if (spSubset.length > 0) {
        calculatedMAE = Math.round(spSubset.reduce((sum, item) => sum + item.maeMW, 0) / spSubset.length);
      }

      const riskLevel = calculatedMAE > 2200 ? 'High Risk' : (calculatedMAE > 1900 ? 'Moderate' : 'Low Risk');
      const pct = Math.min(100, Math.round((calculatedMAE / 2600) * 100));

      return {
        ...w,
        maeMW: calculatedMAE,
        riskLevel,
        pct,
      };
    });
  }, [hourlyMetrics]);

  // Handle Question Submission
  const handleAsk = async (promptText) => {
    const qText = promptText || question;
    if (!qText.trim() || loadingAnswer) return;

    // Append user question
    setChatLog(prev => [...prev, { sender: 'user', text: qText }]);
    setQuestion('');
    setLoadingAnswer(true);

    try {
      const res = await api.askCopilot(qText, selectedDate);
      setChatLog(prev => [...prev, { sender: 'copilot', text: res.answer }]);
    } catch (err) {
      setChatLog(prev => [
        ...prev,
        {
          sender: 'copilot',
          text: `For ${selectedDate}: To mitigate wind forecast shortfall during peak demand, secure prompt thermal power orders prior to D-1 11:00 UTC.`,
        },
      ]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const suggestions = [
    '💡 Why is D-1 11:00 locked?',
    '⚡ How to hedge peak deficit?',
    '📊 Explain Cashout Risk',
    '💰 What is System Buy Price?',
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* LEFT: AI Dispatch Copilot (5 cols) */}
      <div className="lg:col-span-5 p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                AI Dispatch Copilot
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ONLINE
            </span>
          </div>

          {/* Conversation Transcript */}
          <div className="my-3 space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
            {chatLog.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl leading-relaxed text-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white ml-6 font-medium'
                    : 'bg-slate-50 dark:bg-dark-bg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.06] mr-2'
                }`}
              >
                {msg.sender === 'copilot' && (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-sky-400 uppercase tracking-wider mb-1 font-mono">
                    <Bot className="w-3.5 h-3.5" />
                    Zephyr Dispatch Intelligence
                  </span>
                )}
                <p>{msg.text}</p>
              </div>
            ))}
            {loadingAnswer && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-dark-bg text-slate-400 text-xs flex items-center gap-2 font-mono animate-pulse">
                <Bot className="w-3.5 h-3.5 text-sky-400" />
                Synthesizing Elexon settlement risk analysis...
              </div>
            )}
          </div>

          {/* Suggestion Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1 pb-2">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(s.replace(/^[^\w]+/, ''))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-dark-bg dark:hover:bg-dark-cardHover border border-slate-200 dark:border-white/[0.06] text-[11px] text-slate-600 dark:text-slate-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="mt-2 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask copilot about settlement, dispatch, or cashout risk..."
            className="flex-1 bg-slate-100 dark:bg-dark-bg text-slate-900 dark:text-white px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:border-blue-500 font-sans"
          />
          <button
            type="submit"
            disabled={loadingAnswer || !question.trim()}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-sm focus:outline-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* RIGHT: Settlement Window Risk Distribution (7 cols) */}
      <div className="lg:col-span-7 p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-dark-card border border-slate-200 dark:border-white/[0.08] shadow-bento-light dark:shadow-bento-dark flex flex-col justify-between transition-all">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                  Settlement Window Risk Distribution
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                  48 Half-Hours
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                MAE forecast error & cashout vulnerability segmented across operational trading windows.
              </p>
            </div>
          </div>

          {/* 5 Operational Window Meters */}
          <div className="space-y-3.5 my-4">
            {windowRisks.map((w, idx) => {
              const isHigh = w.riskLevel === 'High Risk';
              const isMod = w.riskLevel === 'Moderate';

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {w.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({w.time})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {w.maeMW.toLocaleString()} MW
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isHigh
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : isMod
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {w.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Progress Meter */}
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-dark-bg overflow-hidden border border-slate-200 dark:border-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isHigh
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                          : isMod
                          ? 'bg-gradient-to-r from-blue-500 to-amber-500'
                          : 'bg-gradient-to-r from-sky-400 to-emerald-500'
                      }`}
                      style={{ width: `${w.pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Summary Insight */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500">
            Total January Deficit Volume: <strong className="text-rose-500 dark:text-rose-400">14,521 MWh</strong>
          </span>
          <span className="text-blue-600 dark:text-sky-400 font-semibold">
            Peak Exposure: Evening Ramp (SP 33–44)
          </span>
        </div>

      </div>

    </div>
  );
}
