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
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { api } from './api';
import AskDrawer from './components/AskDrawer';
import AuditTab from './components/AuditTab';
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
    badge: '19',
    icon: Database,
    desc: 'ISA-Tab + PDF Corpus',
  },
  {
    id: 'simulator',
    label: 'Habitat Modeler',
    badge: '0g–1g',
    icon: Flame,
    desc: 'SEA & Goldilocks Flow',
  },
  {
    id: 'detection',
    label: 'Detection & Suppression',
    badge: '0.2µm',
    icon: ShieldAlert,
    desc: 'SAME, Cool Flames & Mist',
  },
  {
    id: 'audit',
    label: 'Mission Safety Audit',
    badge: 'GAP',
    icon: ShieldCheck,
    desc: '4-Stage Chain & PSI Gaps',
  },
  {
    id: 'spinoffs',
    label: 'Earth Spin-Offs',
    badge: '4',
    icon: Globe,
    desc: 'Orbital-to-Earth Transfer',
  },
];

const QUICK_HABITATS = [
  {
    id: 'lunar',
    label: 'Lunar',
    meta: '8.2 psia · 34% O2',
    state: { o2_pct: 34.0, pressure_psia: 8.2, airflow_cms: 10.0, gravity_target: '1/6g' },
  },
  {
    id: 'mars',
    label: 'Mars',
    meta: '9.0 psia · 30% O2',
    state: { o2_pct: 30.0, pressure_psia: 9.0, airflow_cms: 12.0, gravity_target: '3/8g' },
  },
  {
    id: 'iss',
    label: 'ISS',
    meta: '14.7 psia · 21% O2',
    state: { o2_pct: 21.0, pressure_psia: 14.7, airflow_cms: 15.0, gravity_target: '0g' },
  },
];

function MissionMark() {
  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 shadow-inner ring-1 ring-white/15">
      <svg viewBox="0 0 28 28" className="h-5 w-5" aria-hidden="true">
        <path d="M5 19 Q14 9 23 11" fill="none" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M9.5 21 L14 7.5 L18.5 21" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="14" r="2.2" fill="#38BDF8" />
      </svg>
    </div>
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
  const [theme, setTheme] = useState(() => localStorage.getItem('ignis-theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ignis-theme', theme);
  }, [theme]);

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
    <div className="flex h-full flex-col justify-between bg-[#FAFAFA]">
      <div className="space-y-4 p-3">
        {/* Modern Obsidian Brand Header */}
        <div className={`rounded-xl bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-900/10 ${collapsed ? 'p-2' : 'p-3'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <MissionMark />
              {!collapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-sm font-bold tracking-tight text-white">IGNIS-PSI</span>
                    <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-orange-300 ring-1 ring-inset ring-orange-400/30">
                      0g
                    </span>
                  </div>
                  <div className="truncate text-[10px] text-zinc-400">NASA PSI Intelligence</div>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="hidden rounded-md p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white lg:inline-flex"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Cmd+K Search Pill */}
        <button
          onClick={() => setCmdOpen(true)}
          className={`flex w-full items-center justify-between rounded-xl bg-white text-xs text-zinc-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition hover:text-zinc-900 hover:ring-zinc-300 ${
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
          }`}
          title="Quick Jump (Cmd+K)"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            {!collapsed && <span>Search or jump...</span>}
          </span>
          {!collapsed && (
            <kbd className="inline-flex items-center gap-0.5 rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          )}
        </button>

        {/* Navigation Section */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 pb-1 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              Workspace
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
                className={`group flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-all ${
                  active
                    ? 'bg-white text-zinc-950 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200/90'
                    : 'text-zinc-600 hover:bg-zinc-200/45 hover:text-zinc-950'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-500 group-hover:bg-white group-hover:text-zinc-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {!collapsed && (
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold">{t.label}</div>
                      <div className="truncate text-[10px] text-zinc-400">{t.desc}</div>
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${
                      active
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20'
                        : 'bg-zinc-100 text-zinc-500'
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
          <div className="rounded-xl bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Habitat Target
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {habitatState.gravity_target}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px] tabular-nums">
              <div className="rounded-lg bg-zinc-50 py-1.5 ring-1 ring-zinc-200/60">
                <div className="text-[9px] text-zinc-400">O2</div>
                <div className="font-semibold text-rose-600">{habitatState.o2_pct}%</div>
              </div>
              <div className="rounded-lg bg-zinc-50 py-1.5 ring-1 ring-zinc-200/60">
                <div className="text-[9px] text-zinc-400">PSIA</div>
                <div className="font-semibold text-blue-600">{habitatState.pressure_psia}</div>
              </div>
              <div className="rounded-lg bg-zinc-50 py-1.5 ring-1 ring-zinc-200/60">
                <div className="text-[9px] text-zinc-400">FLOW</div>
                <div className="font-semibold text-emerald-600">{habitatState.airflow_cms}</div>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-1">
              {QUICK_HABITATS.map((qh) => {
                const isCur =
                  Math.abs(habitatState.o2_pct - qh.state.o2_pct) < 0.2 &&
                  Math.abs(habitatState.pressure_psia - qh.state.pressure_psia) < 0.2;
                return (
                  <button
                    key={qh.id}
                    onClick={() => setHabitatState(qh.state)}
                    className={`rounded-lg py-1 font-mono text-[10px] font-medium transition ${
                      isCur
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70'
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
      <div className="space-y-2.5 border-t border-zinc-200/80 p-3">
        {!collapsed && (
          <div>
            <div className="mb-1.5 px-1 font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              View Lens
            </div>
            <div className="grid grid-cols-3 rounded-lg bg-zinc-200/70 p-0.5 font-mono text-[10px] font-medium">
              {['Engineer', 'Researcher', 'Student'].map((lens) => (
                <button
                  key={lens}
                  onClick={() => setAudienceLens(lens)}
                  className={`rounded-md py-1 transition ${
                    audienceLens === lens
                      ? 'bg-white font-semibold text-zinc-950 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900'
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
          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 ${
            collapsed ? 'px-2' : 'px-3'
          }`}
          title="Ask SI Engineer"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-orange-400" />
          {!collapsed && <span>Ask SI Engineer</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen text-zinc-950">
      {/* Desktop Left Sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-zinc-200/80 bg-[#FAFAFA] transition-all duration-200 lg:block ${
          sidebarCollapsed ? 'w-[74px]' : 'w-[262px]'
        }`}
      >
        <SidebarInner collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-zinc-950/35 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
          <div className="relative z-10 w-[270px] border-r border-zinc-200 bg-[#FAFAFA] shadow-2xl">
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-3 right-3 z-20 rounded-md bg-white/15 p-1 text-white"
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
        {/* Modern Translucent Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="hidden font-mono font-medium text-zinc-400 sm:inline">IGNIS-PSI</span>
                <ChevronRight className="hidden h-3.5 w-3.5 text-zinc-300 sm:inline" />
                <span className="truncate font-display text-sm font-semibold text-zinc-950">
                  {activeTabObj.label}
                </span>
              </div>

              {health?.counts && (
                <span className="hidden rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-[10px] font-medium text-zinc-600 md:inline-flex">
                  {health.counts.total_studies} Studies · {health.counts.total_publications} DOIs
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full bg-zinc-100/80 px-3 py-1 font-mono text-[11px] text-zinc-700 ring-1 ring-zinc-200/80 xl:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-rose-600">{habitatState.o2_pct}% O2</span>
                <span className="text-zinc-300">/</span>
                <span className="font-semibold text-blue-600">{habitatState.pressure_psia} psia</span>
                <span className="text-zinc-300">/</span>
                <span>{habitatState.airflow_cms} cm/s</span>
                <CopyButton
                  text={`${habitatState.o2_pct}% O2 | ${habitatState.pressure_psia} psia | ${habitatState.airflow_cms} cm/s | ${habitatState.gravity_target}`}
                  label="Grab"
                />
              </div>

              <button
                onClick={() => setCmdOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 lg:hidden"
              >
                <Search className="h-3.5 w-3.5" />
                <span>⌘K</span>
              </button>

              <button
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-950"
                title={theme === 'dark' ? 'Switch to Studio Light' : 'Switch to 21st.dev Dark'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-zinc-600" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExportBrief}
                disabled={exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs transition hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export Brief'}</span>
              </button>

              <button
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-zinc-800"
              >
                <Bot className="h-3.5 w-3.5 text-orange-400" />
                <span className="hidden sm:inline">Ask SI</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Studio Canvas */}
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
            {activeTab === 'audit' && (
              <AuditTab
                habitatState={habitatState}
                onInspectStudy={handleInspectStudy}
                onAskSI={handleAskSI}
              />
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
