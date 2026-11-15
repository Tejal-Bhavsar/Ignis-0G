import { useState } from 'react';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../api';

const QUICK_PROMPTS = [
  'Why does shutting off cabin ventilation fail to extinguish fires in 34% O2 Lunar habitats?',
  'Explain the BASS-II Goldilocks 10 cm/s airflow regime and nitrogen jet air entrainment hazard.',
  'How do SAME and DAFT-2 distinguish microgravity smoke from Arizona Red Dust or lunar regolith?',
  'Why can invisible cool flames in FLEX-2 and CFI re-ignite after visible flame extinction?',
  'How does IGNIS-PSI bound 1/6g Moon and 3/8g Mars flammability without partial-g PSI flight data?',
];

export default function AskDrawer({ isOpen, onClose, habitatState, onSelectStudy }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [expandedEvidence, setExpandedEvidence] = useState({});

  if (!isOpen) return null;

  const submitQuestion = async (qText) => {
    const q = (qText ?? question).trim();
    if (!q || loading) return;
    setLoading(true);
    if (!qText) setQuestion('');
    try {
      const res = await api.ask({
        question: q,
        o2_pct: habitatState?.o2_pct,
        pressure_psia: habitatState?.pressure_psia,
        airflow_cms: habitatState?.airflow_cms,
        gravity_target: habitatState?.gravity_target,
      });
      setHistory((prev) => [res, ...prev]);
    } catch (err) {
      setHistory((prev) => [
        {
          question: q,
          answer: `Error querying SI Engineer: ${err.message}`,
          evidence: [],
          mode: 'error',
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleEv = (key) => {
    setExpandedEvidence((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-[#1C2B47] bg-[#070D19] shadow-2xl shadow-black/90">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1C2B47] bg-[#060B14] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0B3D91] text-[#38BDF8] ring-1 ring-[#3B82F6]/40">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold tracking-wider text-white">
              ASK SI ENGINEER
            </h2>
            <p className="font-mono text-[11px] text-slate-400">
              Explicit Context-Injected PSI Retrieval &amp; Citations
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-[#1C2B47] p-1.5 text-slate-400 transition hover:border-[#38BDF8]/50 hover:text-white"
          aria-label="Close SI Engineer drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Active Habitat Telemetry Strip */}
      {habitatState && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1C2B47] bg-[#0A1324] px-5 py-2 font-mono text-[11px] text-sky-300">
          <span className="text-slate-400">ACTIVE TELEMETRY:</span>
          <span className="rounded border border-[#1C2B47] bg-[#0D1526] px-1.5 py-0.5 text-[#FF7A66]">{habitatState.o2_pct}% O2</span>
          <span className="rounded border border-[#1C2B47] bg-[#0D1526] px-1.5 py-0.5">{habitatState.pressure_psia} psia</span>
          <span className="rounded border border-[#1C2B47] bg-[#0D1526] px-1.5 py-0.5 text-emerald-300">{habitatState.airflow_cms} cm/s</span>
          <span className="rounded border border-[#1C2B47] bg-[#0D1526] px-1.5 py-0.5 text-slate-200">{habitatState.gravity_target}</span>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="border-b border-[#1C2B47] px-5 py-3">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-400">
          <Sparkles className="h-3.5 w-3.5 text-[#FC3D21]" />
          Mission Control Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => submitQuestion(p)}
              disabled={loading}
              className="rounded-md border border-[#1C2B47] bg-[#0D1526] px-2.5 py-1 text-left text-[11px] text-slate-300 transition hover:border-[#38BDF8]/60 hover:bg-[#111F38] hover:text-white disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation / Citation Feed */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {history.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-900/40 p-6 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-500" />
            <p className="text-sm font-medium text-slate-300">
              Query 19 NASA PSI &amp; ISS Guide Investigations
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Every response is anchored to Explicit Context-Injected telemetry headers
              and cites exact <code className="text-orange-300">[PSI-XX | Acronym | DOI]</code> records.
            </p>
          </div>
        )}

        {history.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-800 bg-[#111827]/90 p-4 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-orange-300">
                Q: {item.question}
              </p>
              <span className="shrink-0 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                {item.mode}
              </span>
            </div>

            <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
              {item.answer}
            </div>

            {item.evidence?.length > 0 && (
              <div className="mt-3 border-t border-slate-800 pt-3">
                <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                  Cited Context-Injected Chunks ({item.evidence.length})
                </div>
                <div className="space-y-1.5">
                  {item.evidence.map((ev, eIdx) => {
                    const key = `${idx}-${eIdx}`;
                    const open = !!expandedEvidence[key];
                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-slate-800 bg-[#0B0F19] p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => toggleEv(key)}
                            className="flex items-center gap-1.5 text-left font-mono text-[11px] font-medium text-slate-200 hover:text-orange-300"
                          >
                            {open ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span>
                              [{ev.study_id} | {ev.acronym} | {ev.section}]
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-emerald-400">
                              sim {(ev.score * 100).toFixed(0)}%
                            </span>
                            {onSelectStudy && (
                              <button
                                onClick={() => onSelectStudy(ev.study_id)}
                                className="inline-flex items-center gap-0.5 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-sky-300 hover:bg-slate-700"
                              >
                                Inspect <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {open && (
                          <div className="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2">
                            <div className="rounded bg-slate-900/90 px-2 py-1 font-mono text-[10px] text-amber-300/90">
                              {ev.context_header}
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-400">
                              {ev.excerpt}...
                            </p>
                            <div className="font-mono text-[10px] text-slate-500">
                              DOI / Source: {ev.doi}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuestion();
        }}
        className="border-t border-[#1C2B47] bg-[#060B14] p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about PSI-20..159, 34% O2 Lunar habs, SAME dust vs smoke..."
            className="flex-1 rounded-md border border-[#1C2B47] bg-[#0D1526] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-[#38BDF8] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0B3D91] px-4 py-2 text-xs font-semibold text-white ring-1 ring-[#3B82F6]/40 transition hover:bg-[#134EB3] disabled:opacity-50"
          >
            {loading ? 'Querying...' : 'Ask'}
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

