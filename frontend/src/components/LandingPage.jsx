import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Database,
  Flame,
  Globe,
  Orbit,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const WORKBENCH_MODULES = [
  {
    id: 'ranker',
    badge: '19 STUDIES',
    title: 'PSI Studies & Comparison Matrix',
    desc: 'Hybrid TF-IDF + physical proximity ranking across 13 ISA-Tab investigations and 6 NASA technical PDFs, with 2–3 study side-by-side matrix (TABLE 1.1) and DOI links.',
    icon: Database,
    accent: 'text-blue-600',
  },
  {
    id: 'simulator',
    badge: '0g–1g',
    title: 'Habitat Flammability Modeler',
    desc: 'Models Earth/ISS (21% O₂, 14.7 psia), Lunar SEA (34% O₂, 8.2 psia), EVA (100% O₂, 4.3 psia), BASS-II Goldilocks airflow (0–40 cm/s), and 0g–1g bounding envelopes.',
    icon: Flame,
    accent: 'text-orange-500',
  },
  {
    id: 'detection',
    badge: '0.2 µm',
    title: 'Detection & Suppression',
    desc: 'Compares SAME 0.2 µm ultrafine smoke thresholds vs. ISS 1.0 µm ionization detectors, DAFT dust crossover, ACME CFI-G cool flames, and CO₂/He/Water-Mist suppression.',
    icon: ShieldAlert,
    accent: 'text-sky-600',
  },
  {
    id: 'audit',
    badge: 'GAP + ML',
    title: 'Mission Safety Audit & ML Predictor',
    desc: 'Audits the 4-stage fire chain (Ignition → Detection → Suppression → Toxicity), flags NASA’s 1/6g & 3/8g flight data gaps, and runs Scikit-Learn RandomForest + NLP predictions.',
    icon: BrainCircuit,
    accent: 'text-emerald-600',
  },
  {
    id: 'spinoffs',
    badge: '4 CASES',
    title: 'Terrestrial Earth Spin-Offs',
    desc: 'Connects ISS fine-water-mist extinguishers, 0.2 µm aerosol sensors, and Nomex/Sibal flammability research to EV thermal runaway, mining, and firefighter safety.',
    icon: Globe,
    accent: 'text-indigo-600',
  },
];

const PHYSICS_PILLARS = [
  {
    tag: '01 · BUOYANCY ABSENCE',
    title: 'Spherical Diffusion & Goldilocks Flow',
    body: 'Without buoyancy in 0g, flames form diffusion-limited spheres. Low spacecraft ventilation (5–15 cm/s, BASS-II) creates a peak "Goldilocks" hazard where flames spread upstream at lower O₂% than Earth tests.',
  },
  {
    tag: '02 · EXPLORATION ATMOSPHERES',
    title: 'Elevated O₂ & Reduced Pressure',
    body: 'Lunar habitats and pressurized rovers (34% O₂ at 8.2 psia) cut EVA pre-breathe time but reduce N₂ thermal ballast, accelerating solid flame spread across fabrics, plastics, and wire insulation.',
  },
  {
    tag: '03 · EMPIRICAL BLIND SPOTS',
    title: '0.2 µm Smoke & Partial-Gravity Gaps',
    body: 'Microgravity fires emit sub-micron aerosols (SAME, 0.2 µm) below standard ISS 1.0 µm alarm thresholds, while PSI still lacks direct 1/6g Lunar and 3/8g Martian solid-flammability flight data (pending LUCI & FM2).',
  },
];

export default function LandingPage({
  health,
  habitatState,
  onSelectTab,
  onApplyPreset,
  onOpenAsk,
}) {
  const totalStudies = health?.counts?.total_studies || 19;
  const totalChunks = health?.counts?.total_chunks || 78;
  const totalDois = health?.counts?.total_publications || 140;

  return (
    <div className="space-y-6">
      {/* Scientific Hero Overview */}
      <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-blue-600">
          <Orbit className="h-3.5 w-3.5" />
          <span>2026 NASA SPACE APPS · FLAME IN FREEFALL · SCIENTIFIC INTELLIGENCE WORKBENCH</span>
        </div>

        <h1 className="mt-3 max-w-3xl font-display text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          IGNIS-PSI: Turning NASA Microgravity Combustion Data into Actionable Habitat Fire Safety
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600">
          A unified scientific research and engineering platform built over NASA&apos;s Physical Sciences Informatics (PSI)
          database. Compare orbital experiments, model Lunar and Martian exploration atmospheres, expose empirical
          flight-data gaps, and run non-mocked Scikit-Learn fire-hazard predictions trained directly on the NASA corpus.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              onApplyPreset?.({
                o2_pct: 34.0,
                pressure_psia: 8.2,
                airflow_cms: 10.0,
                gravity_target: '1/6g',
              });
              onSelectTab('audit');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Launch Lunar SEA Audit &amp; ML Predictor</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onSelectTab('ranker')}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
          >
            <Database className="h-4 w-4 text-blue-600" />
            <span>Explore {totalStudies} NASA PSI Studies</span>
          </button>

          <button
            onClick={() => onOpenAsk?.()}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Bot className="h-4 w-4 text-orange-500" />
            <span>Ask SI Engineer</span>
          </button>
        </div>

        {/* 4 Empirical Corpus KPIs */}
        <div className="mt-7 grid grid-cols-2 gap-3 border-t border-zinc-200/80 pt-5 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Ingested Corpus</div>
            <div className="mt-1 font-mono text-xl font-bold text-zinc-950">{totalStudies} Studies</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">13 PSI ISA-Tab + 6 NASA PDFs</div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Grounded Citations</div>
            <div className="mt-1 font-mono text-xl font-bold text-zinc-950">{totalDois} DOIs</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{totalChunks} Context-Injected Chunks</div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Trained ML Engine</div>
            <div className="mt-1 font-mono text-xl font-bold text-zinc-950">86% 5-Fold CV</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">RandomForest + TF-IDF/LogReg</div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Active Boundary</div>
            <div className="mt-1 font-mono text-sm font-bold text-zinc-950">
              {habitatState.o2_pct}% O₂ · {habitatState.pressure_psia} psia
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
              {habitatState.airflow_cms} cm/s · {habitatState.gravity_target}
            </div>
          </div>
        </div>
      </section>

      {/* Why Microgravity Fire Safety Is Non-Intuitive */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PHYSICS_PILLARS.map((item) => (
          <div
            key={item.tag}
            className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80"
          >
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-blue-600">
              {item.tag}
            </div>
            <h2 className="mt-1.5 font-display text-sm font-semibold text-zinc-950">{item.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">{item.body}</p>
          </div>
        ))}
      </section>

      {/* Workbench Module Directory */}
      <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              <Radar className="h-3.5 w-3.5 text-blue-600" />
              <span>SCIENTIFIC WORKBENCH MODULES</span>
            </div>
            <h2 className="mt-0.5 font-display text-base font-semibold text-zinc-950">
              Select a Tool to Inspect Data, Run Simulations, or Audit Missions
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Tip: Press ⌘K anywhere to quick-jump
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WORKBENCH_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onSelectTab(mod.id)}
                className="group flex flex-col justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 bg-white">
                      <Icon className={`h-4 w-4 ${mod.accent}`} />
                    </div>
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-600">
                      {mod.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-sm font-semibold text-zinc-950 group-hover:text-blue-700">
                    {mod.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-600">{mod.desc}</p>
                </div>
                <div className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-blue-600">
                  <span>Open Module</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
