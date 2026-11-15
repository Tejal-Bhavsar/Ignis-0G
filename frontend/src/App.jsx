import { useEffect, useState } from 'react';
import {
  Bot,
  ChevronRight,
  Command,
  Database,
  Download,
  Flame,
  Globe,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from './api';
import AskDrawer from './components/AskDrawer';
import CommandPalette from './components/CommandPalette';
import CopyButton from './components/CopyButton';
import DetectionSuppressionTab from './components/DetectionSuppressionTab';
import RankerTab from './components/RankerTab';
import SimulatorTab from './components/SimulatorTab';
import SpinoffsTab from './components/SpinoffsTab';

const TABS = [
  {
    id: 'ranker',
    label: 'PSI Studies & Matrix',
    shortLabel: 'PSI Corpus',
    badge: '19',
    icon: Database,
    desc: 'ISA-Tab + PDF Corpus & Matrix',
  },
  {
    id: 'simulator',
    label: 'Habitat Modeler',
    shortLabel: 'Modeler',
    badge: '0g–1g',
    icon: Flame,
    desc: 'SEA Presets & Goldilocks Flow',
  },
  {
    id: 'detection',
    label: 'Detection & Suppression',
    shortLabel: 'Detection',
    badge: '0.2µm',
    icon: ShieldAlert,
    desc: 'SAME, DAFT-2, Cool Flames & Mist',
  },
  {
    id: 'spinoffs',
    label: 'Earth Spin-Offs',
    shortLabel: 'Spin-Offs',
    badge: '4',
    icon: Globe,
    desc: 'Orbital-to-Earth Safety Transfer',
  },
];

const QUICK_HABITATS = [
  {
    id: 'lunar',
    label: 'Lunar Hab',
    meta: '8.2 psia · 34% O2',
    state: { o2_pct: 34.0, pressure_psia: 8.2, airflow_cms: 10.0, gravity_target: '1/6g' },
  },
  {
    id: 'mars',
    label: 'Mars Hab',
    meta: '9.0 psia · 30% O2',
    state: { o2_pct: 30.0, pressure_psia: 9.0, airflow_cms: 12.0, gravity_target: '3/8g' },
  },
  {
    id: 'iss',
    label: 'ISS Norm',
    meta: '14.7 psia · 21% O2',
    state: { o2_pct: 21.0, pressure_psia: 14.7, airflow_cms: 15.0, gravity_target: '0g' },
  },
];

function NasaMissionEmblem() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#072963" stroke="#3B82F6" strokeOpacity="0.45" strokeWidth="1.2" />
      <circle cx="11" cy="12" r="0.9" fill="#FFFFFF" opacity="0.9" />
      <circle cx="29" cy="11" r="0.8" fill="#FFFFFF" opacity="0.8" />
      <circle cx="30" cy="26" r="0.9" fill="#FFFFFF" opacity="0.85" />
      <path d="M8 26 Q20 13 32 15" fill="none" stroke="#FC3D21" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 28 L20 10 L26 28" fill="none" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="2.6" fill="#38BDF8" />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('ranker');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [studiesList, setStudiesList] = useState([]);
  const [hardwareRacks, setHardwareRacks] = useState([]);
  const [focusedStudyId, setFocusedStudyId] = useState(null);
  const [audienceLens, setAudienceLens] = useState('Engineer');
  const [exporting, setExporting] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState(null);

  const [habitatState, setHabitatState] = useState({
    o2_pct: 34.0,
    pressure_psia: 8.2,
    airflow_cms: 10.0,
    gravity_target: '1/6g',
  });

  useEffect(() => {
    api.health().then(setHealth).catch(console.error);
    api.studies().then((res) => setStudiesList(res.studies || [])).catch(console.error);
    api
      .hardware()
      .then((res) => setHardwareRacks(res.hardware_racks || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleInspectStudy = (studyId) => {
    setFocusedStudyId(studyId);
    setActiveTab('ranker');
    setDrawerOpen(false);
  };

  const handleAskSI = (promptText) => {
    setQueuedPrompt({ text: promptText, nonce: Date.now() });
    setDrawerOpen(true);
  };

  const handleExportBrief = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const sim = await api.simulate(habitatState);
      const md = [
        '# IGNIS-PSI Mission Fire Safety Brief',
        `**Audience Lens:** ${audienceLens}`,
        `**Operating Habitat:** ${sim.operating_point.o2_pct}% O2 | ${sim.operating_point.pressure_psia} psia | ${sim.operating_point.airflow_cms} cm/s | ${sim.operating_point.gravity_label}`,
        `**pO2:** ${sim.operating_point.po2_psia} psia | **Risk Level:** ${sim.metrics.risk_level} | **0g LOC:** ${sim.metrics.loc_0g_pct}% O2 | **Target Gravity LOC:** ${sim.metrics.loc_target_pct}% O2 | **Spread Multiplier:** ${sim.metrics.spread_rate_multiplier}×`,
        '',
        '## Active Safety Advisories',
        ...sim.warnings.map((w) => `- **${w.title}** (${w.severity}): ${w.detail} ${w.citation}`),
        '',
        '## Top Ranked NASA PSI Evidence',
        ...(sim.ranked_evidence || []).map(
          (r) =>
            `- **[${r.study.study_id} | ${r.study.acronym} | ${r.study.doi}]** (Match ${(r.total_score * 100).toFixed(0)}%) — ${r.study.title} (${r.study.o2_range}, ${r.study.pressure_psia}, ${r.study.airflow_cm_s})`
        ),
        '',
        '*Generated by IGNIS-PSI (NASA Space Apps Challenge 2026 — Flame in Freefall). High-velocity rocket/propellant combustion is outside PSI scope.*',
      ].join('\n');

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ignis-psi-brief-${habitatState.gravity_target.replace('/', '-')}-${habitatState.o2_pct}pctO2.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const activeTabObj = TABS.find((t) => t.id === activeTab) || TABS[0];

  const SidebarInner = ({ collapsed = false }) => (
    <div className="flex h-full flex-col justify-between bg-white">
      <div className="space-y-4 p-3">
        {/* NASA Blue Brand Anchor Card */}
        <div className={`rounded-xl bg-gradient-to-br from-[#072963] via-[#0B3D91] to-[#124EB0] text-white shadow-sm ${collapsed ? 'p-2.5' : 'p-3.5'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <NasaMissionEmblem />
              {!collapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-sm font-bold tracking-wide">IGNIS-PSI</span>
                    <span className="rounded bg-[#FC3D21] px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider">
                      0g
                    </span>
                  </div>
                  <div className="truncate text-[10px] text-sky-100/80">Flame in Freefall · 2026</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden rounded-md p-1 text-sky-200 transition hover:bg-white/15 hover:text-white lg:inline-flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 21st.dev Cmd+K Quick Jump Trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className={`flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/90 text-xs text-slate-500 transition hover:border-[#0B3D91]/40 hover:bg-white hover:text-slate-900 ${
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
          }`}
          title="Quick Jump (Cmd+K)"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[#0B3D91]" />
            {!collapsed && <span>Quick Jump...</span>}
          </span>
          {!collapsed && (
            <kbd className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          )}
        </button>

        {/* Navigation Section */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 pb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workbenches
            </div>
          )}
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setMobileNavOpen(false);
                }}
                title={t.label}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                  active
                    ? 'bg-[#0B3D91] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-[#FC3D21]' : 'text-slate-400 group-hover:text-[#0B3D91]'
                    }`}
                  />
                  {!collapsed && (
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{t.label}</div>
                      <div className={`truncate text-[10px] ${active ? 'text-sky-100/80' : 'text-slate-400'}`}>
                        {t.desc}
                      </div>
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <span
                    className={`ml-2 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                      active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Live Habitat Preset Widget */}
        {!collapsed && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Active Habitat
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {habitatState.gravity_target}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px] tabular-nums">
              <div className="rounded-lg border border-slate-200 bg-white py-1.5">
                <div className="text-[9px] text-slate-400">O2</div>
                <div className="font-bold text-[#FC3D21]">{habitatState.o2_pct}%</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white py-1.5">
                <div className="text-[9px] text-slate-400">PSIA</div>
                <div className="font-bold text-[#0B3D91]">{habitatState.pressure_psia}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white py-1.5">
                <div className="text-[9px] text-slate-400">FLOW</div>
                <div className="font-bold text-emerald-700">{habitatState.airflow_cms}</div>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1">
              {QUICK_HABITATS.map((qh) => {
                const isCur =
                  Math.abs(habitatState.o2_pct - qh.state.o2_pct) < 0.2 &&
                  Math.abs(habitatState.pressure_psia - qh.state.pressure_psia) < 0.2;
                return (
                  <button
                    key={qh.id}
                    onClick={() => setHabitatState(qh.state)}
                    className={`flex-1 rounded-md border px-1.5 py-1 text-center font-mono text-[10px] font-medium transition ${
                      isCur
                        ? 'border-[#0B3D91] bg-[#0B3D91]/10 text-[#0B3D91]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                    title={qh.meta}
                  >
                    {qh.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Audience Lens Segmented Pill + SI CTA */}
      <div className="space-y-2.5 border-t border-slate-200 p-3">
        {!collapsed && (
          <div>
            <div className="mb-1.5 px-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Audience Lens
            </div>
            <div className="grid grid-cols-3 rounded-lg bg-slate-100 p-0.5 font-mono text-[10px] font-semibold">
              {['Engineer', 'Researcher', 'Student'].map((lens) => (
                <button
                  key={lens}
                  onClick={() => setAudienceLens(lens)}
                  className={`rounded-md py-1.5 transition ${
                    audienceLens === lens
                      ? 'bg-white text-[#0B3D91] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lens}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#FC3D21] py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#E03116] ${
            collapsed ? 'px-2' : 'px-3'
          }`}
          title="Ask SI Engineer"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Ask SI Engineer</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-slate-200/90 bg-white transition-all duration-200 lg:block ${
          sidebarCollapsed ? 'w-[74px]' : 'w-[264px]'
        }`}
      >
        <SidebarInner collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 w-[270px] border-r border-slate-200 bg-white shadow-2xl">
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-3 right-3 z-20 rounded-md bg-white/20 p-1 text-white"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarInner collapsed={false} />
          </div>
        </div>
      )}

      {/* Main Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 21st.dev Glassmorphic Top Utility Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="hidden font-mono font-semibold text-[#0B3D91] sm:inline">IGNIS-PSI</span>
                <ChevronRight className="hidden h-3.5 w-3.5 text-slate-400 sm:inline" />
                <span className="truncate font-display text-sm font-bold text-slate-900">
                  {activeTabObj.label}
                </span>
              </div>

              {health?.counts && (
                <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-[10px] font-medium text-slate-600 md:inline-flex">
                  {health.counts.total_studies} Studies · {health.counts.total_publications} DOIs
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 py-1 font-mono text-[11px] text-slate-700 xl:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-[#FC3D21]">{habitatState.o2_pct}% O2</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-[#0B3D91]">{habitatState.pressure_psia} psia</span>
                <span className="text-slate-300">·</span>
                <span>{habitatState.airflow_cms} cm/s</span>
                <CopyButton
                  text={`${habitatState.o2_pct}% O2 | ${habitatState.pressure_psia} psia | ${habitatState.airflow_cms} cm/s | ${habitatState.gravity_target}`}
                  label="Grab"
                />
              </div>

              <button
                onClick={() => setCmdOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#0B3D91] hover:text-[#0B3D91] lg:hidden"
              >
                <Search className="h-3.5 w-3.5" />
                <span>⌘K</span>
              </button>

              <button
                onClick={handleExportBrief}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#0B3D91] hover:text-[#0B3D91] disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export Brief'}</span>
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B3D91] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#092F70]"
              >
                <Bot className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ask SI</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Bento Canvas */}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
          <div key={activeTab} className="animate-panel">
            {activeTab === 'ranker' && (
              <RankerTab
                habitatState={habitatState}
                hardwareRacks={hardwareRacks}
                focusedStudyId={focusedStudyId}
                audienceLens={audienceLens}
                onOpenSimulator={() => setActiveTab('simulator')}
                onAskSI={handleAskSI}
              />
            )}
            {activeTab === 'simulator' && (
              <SimulatorTab
                habitatState={habitatState}
                setHabitatState={setHabitatState}
                onInspectStudy={handleInspectStudy}
                onAskSI={handleAskSI}
              />
            )}
            {activeTab === 'detection' && (
              <DetectionSuppressionTab onInspectStudy={handleInspectStudy} onAskSI={handleAskSI} />
            )}
            {activeTab === 'spinoffs' && (
              <SpinoffsTab onInspectStudy={handleInspectStudy} onAskSI={handleAskSI} />
            )}
          </div>
        </main>
      </div>

      <AskDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        habitatState={habitatState}
        onSelectStudy={handleInspectStudy}
        queuedPrompt={queuedPrompt}
      />

      <CommandPalette
        isOpen={cmdOpen}
        onClose={() => setCmdOpen(false)}
        studies={studiesList}
        onSelectStudy={handleInspectStudy}
        onSelectTab={setActiveTab}
        onApplyHabitat={setHabitatState}
        onOpenAsk={() => setDrawerOpen(true)}
      />
    </div>
  );
}
