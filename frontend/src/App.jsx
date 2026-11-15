import { useEffect, useState } from 'react';
import {
  Bot,
  Database,
  Flame,
  Globe,
  Orbit,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import { api } from './api';
import AskDrawer from './components/AskDrawer';
import DetectionSuppressionTab from './components/DetectionSuppressionTab';
import RankerTab from './components/RankerTab';
import SimulatorTab from './components/SimulatorTab';
import SpinoffsTab from './components/SpinoffsTab';

const TABS = [
  {
    id: 'ranker',
    label: '1. PSI Ranker & Matrix',
    icon: Database,
  },
  {
    id: 'simulator',
    label: '2. Moon Base & Habitat Modeler',
    icon: Flame,
  },
  {
    id: 'detection',
    label: '3. Detection & Suppression',
    icon: ShieldAlert,
  },
  {
    id: 'spinoffs',
    label: '4. Terrestrial Spin-Offs',
    icon: Globe,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('ranker');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [hardwareRacks, setHardwareRacks] = useState([]);
  const [focusedStudyId, setFocusedStudyId] = useState(null);

  // Shared habitat state across Modeler + Multi-Factor Ranker + Ask SI Engineer
  const [habitatState, setHabitatState] = useState({
    o2_pct: 34.0,
    pressure_psia: 8.2,
    airflow_cms: 10.0,
    gravity_target: '1/6g',
  });

  useEffect(() => {
    api.health().then(setHealth).catch(console.error);
    api
      .hardware()
      .then((res) => setHardwareRacks(res.hardware_racks || []))
      .catch(console.error);
  }, []);

  const handleInspectStudy = (studyId) => {
    setFocusedStudyId(studyId);
    setActiveTab('ranker');
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100">
      {/* Top Mission Control Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#0B0F19]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/40 bg-gradient-to-br from-orange-500/20 to-amber-500/5 text-orange-400 shadow-inner">
                <Orbit className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-base font-bold tracking-wider text-slate-100">
                    IGNIS-PSI
                  </h1>
                  <span className="rounded border border-orange-500/40 bg-orange-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-orange-300">
                    NASA SPACE APPS 2026 · FLAME IN FREEFALL
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  SI-Powered Microgravity Combustion &amp; Exploration Fire Safety Intelligence
                </p>
              </div>
            </div>

            {/* Right Telemetry + Ask Drawer Trigger */}
            <div className="flex flex-wrap items-center gap-2.5">
              {health?.counts && (
                <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-1.5 font-mono text-[11px] xl:flex">
                  <Radio className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-slate-300">
                    {health.counts.psi_isa_tab_studies} ISA-Tab + {health.counts.pdf_supplementary_studies} PDF Studies
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-sky-300">
                    {health.counts.total_context_injected_chunks} Context Chunks
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-300">
                    {health.counts.total_publications} DOIs
                  </span>
                </div>
              )}

              <div className="hidden items-center gap-1.5 rounded-lg border border-slate-800 bg-[#111827] px-2.5 py-1.5 font-mono text-[11px] text-slate-300 sm:flex">
                <span className="text-slate-500">HAB:</span>
                <span className="text-orange-300">{habitatState.o2_pct}% O2</span>
                <span className="text-slate-600">·</span>
                <span className="text-sky-300">{habitatState.pressure_psia} psia</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-300">{habitatState.airflow_cms} cm/s</span>
                <span className="text-slate-600">·</span>
                <span className="text-purple-300">{habitatState.gravity_target}</span>
              </div>

              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-orange-500/50 bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-950/40 transition hover:bg-orange-500"
              >
                <Bot className="h-4 w-4" />
                Ask SI Engineer
              </button>
            </div>
          </div>

          {/* 4 Workbench Tabs */}
          <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition ${
                    active
                      ? 'border-orange-500/60 bg-orange-500/15 text-orange-200'
                      : 'border-slate-800 bg-[#111827]/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-orange-400' : 'text-slate-500'}`} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Active Workbench Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'ranker' && (
          <RankerTab
            habitatState={habitatState}
            hardwareRacks={hardwareRacks}
            focusedStudyId={focusedStudyId}
          />
        )}
        {activeTab === 'simulator' && (
          <SimulatorTab
            habitatState={habitatState}
            setHabitatState={setHabitatState}
            onInspectStudy={handleInspectStudy}
          />
        )}
        {activeTab === 'detection' && (
          <DetectionSuppressionTab onInspectStudy={handleInspectStudy} />
        )}
        {activeTab === 'spinoffs' && (
          <SpinoffsTab onInspectStudy={handleInspectStudy} />
        )}
      </main>

      {/* Persistent Ask SI Engineer Citation Drawer */}
      <AskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        habitatState={habitatState}
        onSelectStudy={handleInspectStudy}
      />
    </div>
  );
}
