import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Compass,
  Database,
  Flame,
  GitCompare,
  Globe,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';

const QUICK_ACTIONS = [
  {
    id: 'tab-ranker',
    group: 'Navigate',
    label: 'PSI Studies & Matrix',
    sub: 'Search, filter, and compare all 19 NASA investigations',
    icon: Database,
    action: { type: 'tab', tab: 'ranker' },
  },
  {
    id: 'tab-simulator',
    group: 'Navigate',
    label: 'Habitat Flammability Modeler',
    sub: 'Interactive O2%, pressure, airflow & partial-g bounding',
    icon: Flame,
    action: { type: 'tab', tab: 'simulator' },
  },
  {
    id: 'tab-detection',
    group: 'Navigate',
    label: 'Detection & Suppression',
    sub: 'SAME/DAFT 0.2 µm crossover, cool flames & water mist',
    icon: ShieldAlert,
    action: { type: 'tab', tab: 'detection' },
  },
  {
    id: 'tab-audit',
    group: 'Navigate',
    label: 'Mission Safety Audit & ML Predictor',
    sub: '4-Stage fire chain, Scikit-Learn warning predictor & PSI gaps',
    icon: Sparkles,
    action: { type: 'tab', tab: 'audit' },
  },
  {
    id: 'tab-spinoffs',
    group: 'Navigate',
    label: 'Earth Spin-Offs',
    sub: 'Halon-free extinguishers, mine detectors, HCCI engines',
    icon: Globe,
    action: { type: 'tab', tab: 'spinoffs' },
  },
  {
    id: 'ask-si',
    group: 'SI Assistant',
    label: 'Ask SI Engineer (Citation Drawer)',
    sub: 'Query Explicit Context-Injected NASA PSI corpus',
    icon: Bot,
    action: { type: 'ask' },
  },
];

const HABITAT_PRESETS = [
  {
    id: 'lunar_sea',
    label: 'Load Lunar Habitat / Rover (8.2 psia · 34% O2 · 10 cm/s · 1/6g)',
    sub: 'PSI-20 ACME BRE Lunar SEA + BASS-II Goldilocks flow',
    state: { o2_pct: 34.0, pressure_psia: 8.2, airflow_cms: 10.0, gravity_target: '1/6g' },
  },
  {
    id: 'interm_sea',
    label: 'Load Intermediate SEA (10.2 psia · 26.5% O2 · 10 cm/s · 1/6g)',
    sub: 'PSI-20 ACME BRE Exploration Atmosphere',
    state: { o2_pct: 26.5, pressure_psia: 10.2, airflow_cms: 10.0, gravity_target: '1/6g' },
  },
  {
    id: 'iss_norm',
    label: 'Load Earth / ISS Norm (14.7 psia · 21% O2 · 15 cm/s · 0g)',
    sub: 'Standard sea-level equivalent cabin air',
    state: { o2_pct: 21.0, pressure_psia: 14.7, airflow_cms: 15.0, gravity_target: '0g' },
  },
  {
    id: 'mars_hab',
    label: 'Load Mars Transit / Surface (9.0 psia · 30% O2 · 12 cm/s · 3/8g)',
    sub: 'Bounded 0g–1g ACME E-FIELD partial-gravity envelope',
    state: { o2_pct: 30.0, pressure_psia: 9.0, airflow_cms: 12.0, gravity_target: '3/8g' },
  },
];

export default function CommandPalette({
  isOpen,
  onClose,
  studies = [],
  onSelectStudy,
  onSelectTab,
  onApplyHabitat,
  onOpenAsk,
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = [];

    // Habitat Presets
    HABITAT_PRESETS.forEach((p) => {
      if (!q || p.label.toLowerCase().includes(q) || p.sub.toLowerCase().includes(q)) {
        out.push({
          id: p.id,
          group: 'Habitat Presets',
          label: p.label,
          sub: p.sub,
          icon: Compass,
          run: () => {
            onApplyHabitat(p.state);
            onSelectTab('simulator');
            onClose();
          },
        });
      }
    });

    // Quick Navigation
    QUICK_ACTIONS.forEach((qa) => {
      if (!q || qa.label.toLowerCase().includes(q) || qa.sub.toLowerCase().includes(q)) {
        out.push({
          id: qa.id,
          group: qa.group,
          label: qa.label,
          sub: qa.sub,
          icon: qa.icon,
          run: () => {
            if (qa.action.type === 'tab') onSelectTab(qa.action.tab);
            if (qa.action.type === 'ask') onOpenAsk();
            onClose();
          },
        });
      }
    });

    // PSI Studies
    studies.forEach((st) => {
      const hay = `${st.study_id} ${st.acronym} ${st.title} ${st.fuels_geometry} ${st.hardware} ${st.safety_pillar}`.toLowerCase();
      if (!q || hay.includes(q)) {
        out.push({
          id: `study-${st.study_id}`,
          group: 'NASA PSI Investigations',
          label: `${st.study_id} · ${st.acronym} — ${st.title}`,
          sub: `${st.safety_pillar} · ${st.o2_range} · ${st.pressure_psia} · ${st.hardware_tags?.join(', ')}`,
          icon: GitCompare,
          run: () => {
            onSelectStudy(st.study_id);
            onClose();
          },
        });
      }
    });

    return out.slice(0, 14);
  }, [query, studies, onApplyHabitat, onSelectTab, onOpenAsk, onSelectStudy, onClose]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && items[activeIdx]) {
        e.preventDefault();
        items[activeIdx].run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, items, activeIdx, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 px-4 pt-20 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-[#0B3D91]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to PSI-20..159, Sibal, Lunar 34% O2 preset, or tab..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:text-slate-700"
            aria-label="Close command palette"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching PSI studies, habitat presets, or commands found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item, idx) => {
                const Icon = item.icon;
                const active = idx === activeIdx;
                return (
                  <button
                    key={item.id}
                    onClick={item.run}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active
                        ? 'bg-zinc-950 text-white'
                        : 'text-zinc-800 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          active ? 'bg-white/15 text-white' : 'bg-slate-100 text-[#0B3D91]'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{item.label}</div>
                        <div
                          className={`truncate text-[11px] ${
                            active ? 'text-sky-100' : 'text-slate-500'
                          }`}
                        >
                          {item.sub}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                          active
                            ? 'bg-white/15 text-sky-100'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.group}
                      </span>
                      <ArrowRight className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 font-mono text-[10px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="flex items-center gap-1 text-[#0B3D91]">
            <Sparkles className="h-3 w-3 text-[#FC3D21]" />
            IGNIS-PSI Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}

