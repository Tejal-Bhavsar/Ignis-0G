import { useCallback, useEffect, useState } from 'react';
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
import CopyButton from './CopyButton';

const QUICK_PROMPTS = [
  'Why does shutting off cabin ventilation fail to extinguish fires in 34% O2 Lunar habitats?',
  'Explain the BASS-II Goldilocks 10 cm/s airflow regime and nitrogen jet air entrainment hazard.',
  'How do SAME and DAFT-2 distinguish microgravity smoke from Arizona Red Dust or lunar regolith?',
  'Why can invisible cool flames in FLEX-2 and CFI re-ignite after visible flame extinction?',
  'How does IGNIS-PSI bound 1/6g Moon and 3/8g Mars flammability without partial-g PSI flight data?',
];

export default function AskDrawer({ isOpen, onClose, habitatState, onSelectStudy, queuedPrompt }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [expandedEvidence, setExpandedEvidence] = useState({});

  const submitQuestion = useCallback(async (qText) => {
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
  }, [question, loading, habitatState]);

  useEffect(() => {
    if (isOpen && queuedPrompt?.text) {
      submitQuestion(queuedPrompt.text);
    }
    // Only trigger when queuedPrompt nonce changes while drawer opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedPrompt?.nonce, isOpen]);

  if (!isOpen) return null;

  const toggleEv = (key) => {
    setExpandedEvidence((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-orange-400 ring-1 ring-white/15">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold tracking-wide">
              ASK SI ENGINEER
            </h2>
            <p className="font-mono text-[11px] text-zinc-400">
              Explicit Context-Injected PSI Retrieval &amp; Citations
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-white/25 p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Close SI Engineer drawer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Active Habitat Telemetry Strip */}
      {habitatState && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-2 font-mono text-[11px] text-slate-700">
          <span className="text-slate-400">ACTIVE HABITAT:</span>
          <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-semibold text-[#FC3D21]">{habitatState.o2_pct}% O2</span>
          <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">{habitatState.pressure_psia} psia</span>
          <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-emerald-700">{habitatState.airflow_cms} cm/s</span>
          <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[#0B3D91]">{habitatState.gravity_target}</span>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="border-b border-slate-200 px-5 py-3">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#0B3D91]">
          <Sparkles className="h-3.5 w-3.5 text-[#FC3D21]" />
          Mission Control Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => submitQuestion(p)}
              disabled={loading}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-[11px] text-slate-700 transition hover:border-[#0B3D91] hover:bg-white disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-[#F4F6F9] px-5 py-4">
        {history.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm font-semibold text-slate-800">
              Query 19 NASA PSI &amp; ISS Guide Investigations
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Every answer cites Explicit Context-Injected telemetry headers and exact{' '}
              <code className="font-semibold text-[#0B3D91]">[PSI-XX | Acronym | DOI]</code> records.
            </p>
          </div>
        )}

        {history.map((item, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-[#0B3D91]">Q: {item.question}</p>
              <div className="flex shrink-0 items-center gap-1.5">
                <CopyButton
                  text={`Q: ${item.question}\n\n${item.answer}`}
                  label="Copy"
                  title="Copy Q&A + citations"
                />
                <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                  {item.mode}
                </span>
              </div>
            </div>

            <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
              {item.answer}
            </div>

            {item.evidence?.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Cited Context-Injected Chunks ({item.evidence.length})
                </div>
                <div className="space-y-1.5">
                  {item.evidence.map((ev, eIdx) => {
                    const key = `${idx}-${eIdx}`;
                    const open = !!expandedEvidence[key];
                    return (
                      <div key={key} className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => toggleEv(key)}
                            className="flex items-center gap-1.5 text-left font-mono text-[11px] font-medium text-slate-800 hover:text-[#0B3D91]"
                          >
                            {open ? (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            )}
                            <span>[{ev.study_id} | {ev.acronym} | {ev.section}]</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-medium text-emerald-700">
                              sim {(ev.score * 100).toFixed(0)}%
                            </span>
                            {onSelectStudy && (
                              <button
                                onClick={() => onSelectStudy(ev.study_id)}
                                className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#0B3D91] hover:border-[#0B3D91]"
                              >
                                Inspect <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {open && (
                          <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                            <div className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] text-[#0B3D91]">
                              {ev.context_header}
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-600">{ev.excerpt}...</p>
                            <div className="font-mono text-[10px] text-slate-500">DOI / Source: {ev.doi}</div>
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
        className="border-t border-slate-200 bg-white p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about PSI-20..159, 34% O2 Lunar habs, SAME dust vs smoke..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#0B3D91] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3D91] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#092F70] disabled:opacity-50"
          >
            {loading ? 'Querying...' : 'Ask'}
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
