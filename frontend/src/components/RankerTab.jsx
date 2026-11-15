import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  ExternalLink,
  Flame,
  GitCompare,
  History,
  Layers,
  Search,
  Sparkles,
  Square,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import CopyButton from './CopyButton';

const HARDWARE_FILTERS = ['All', 'CIR', 'MDCA', 'ACME', 'MSG', 'Cygnus', 'TSI P-Trak', 'SoFIE'];
const PILLAR_FILTERS = ['All', 'Prevention', 'Detection', 'Suppression', 'Fundamentals'];
const PHASE_FILTERS = ['All', 'Solid', 'Liquid', 'Gas', 'Aerosol/Particulate'];

const COMPARISON_PRESETS = [
  {
    id: 'cabin-solids',
    label: 'Cabin Solids & SEA (BRE · BASS-II · SAFFIRE-I)',
    ids: ['PSI-20', 'PSI-25', 'PSI-98'],
  },
  {
    id: 'cool-flames',
    label: 'Cool Flames & Droplets (CFI · FLEX-2 · CFI-G)',
    ids: ['PSI-39', 'PSI-68', 'PSI-159'],
  },
  {
    id: 'smoke-dust',
    label: 'Smoke vs. Lunar Dust (DAFT · SAME · SAME-R)',
    ids: ['PSI-47', 'PSI-102', 'PDF-SAMER'],
  },
];

const PILLAR_BADGE = {
  Prevention: 'bg-amber-50 text-amber-800 border-amber-200',
  Detection: 'bg-sky-50 text-sky-800 border-sky-200',
  Suppression: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Fundamentals: 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

const PILLAR_LEFT_BORDER = {
  Prevention: 'border-l-amber-500',
  Detection: 'border-l-sky-600',
  Suppression: 'border-l-emerald-600',
  Fundamentals: 'border-l-indigo-600',
};

function buildMatrixMarkdown(matrix) {
  if (!matrix?.length) return '';
  const headers = ['Parameter', ...matrix.map((m) => `${m.study_id} (${m.acronym})`)];
  const sep = headers.map(() => '---');
  const rows = [
    ['DOI / Source', ...matrix.map((m) => m.doi)],
    ['Pillar & Phase', ...matrix.map((m) => `${m.safety_pillar} / ${m.fuel_phase}`)],
    ['Hardware', ...matrix.map((m) => m.hardware)],
    ['Fuels & Geometry', ...matrix.map((m) => m.fuels_geometry)],
    ['Test Conditions', ...matrix.map((m) => m.test_conditions)],
    ['Same (Constants)', ...matrix.map((m) => m.within_study_same)],
    ['Varied (Sweep)', ...matrix.map((m) => m.within_study_varied)],
    ['Sensors & Diagnostics', ...matrix.map((m) => m.sensors_diagnostics)],
  ];
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');
  return [
    `| ${headers.map(esc).join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`),
  ].join('\n');
}

function downloadMatrixCsv(matrix) {
  if (!matrix?.length) return;
  const cols = ['Parameter', ...matrix.map((m) => `${m.study_id} (${m.acronym})`)];
  const rows = [
    ['Title', ...matrix.map((m) => m.title)],
    ['DOI', ...matrix.map((m) => m.doi)],
    ['Safety Pillar', ...matrix.map((m) => m.safety_pillar)],
    ['Fuel Phase', ...matrix.map((m) => m.fuel_phase)],
    ['Hardware', ...matrix.map((m) => m.hardware)],
    ['Fuels & Dimensions', ...matrix.map((m) => m.fuels_geometry)],
    ['Test Conditions', ...matrix.map((m) => m.test_conditions)],
    ['Within-Study Same', ...matrix.map((m) => m.within_study_same)],
    ['Within-Study Varied', ...matrix.map((m) => m.within_study_varied)],
    ['Sensors & Diagnostics', ...matrix.map((m) => m.sensors_diagnostics)],
  ];
  const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\n+/g, ' ')}"`;
  const csv = [cols, ...rows].map((r) => r.map(csvEsc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ignis-psi-comparison-${matrix.map((m) => m.study_id).join('-vs-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RankerTab({
  habitatState,
  hardwareRacks,
  focusedStudyId,
  audienceLens,
  onOpenSimulator,
  onAskSI,
}) {
  const [query, setQuery] = useState('');
  const [hardware, setHardware] = useState('All');
  const [pillar, setPillar] = useState('All');
  const [phase, setPhase] = useState('All');
  const [useHabitatWeights, setUseHabitatWeights] = useState(true);

  const [allStudies, setAllStudies] = useState([]);
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(['PSI-20', 'PSI-25', 'PSI-98']);
  const [showMatrix, setShowMatrix] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [showFigures, setShowFigures] = useState(true);
  const [activePanel, setActivePanel] = useState(null); // null | 'hardware' | 'heritage'
  const [briefingContext, setBriefingContext] = useState(null);

  useEffect(() => {
    api.briefingContext().then(setBriefingContext).catch(console.error);
    api.studies().then((res) => setAllStudies(res.studies || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (focusedStudyId) {
      setExpandedId(focusedStudyId);
    }
  }, [focusedStudyId]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.rank({
          query,
          o2_pct: useHabitatWeights ? habitatState.o2_pct : null,
          pressure_psia: useHabitatWeights ? habitatState.pressure_psia : null,
          airflow_cms: useHabitatWeights ? habitatState.airflow_cms : null,
          safety_pillar: pillar,
          fuel_phase: phase,
          hardware,
          limit: 25,
        });
        if (!cancelled) setRanked(res.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hardware, pillar, phase, useHabitatWeights, habitatState]);

  useEffect(() => {
    if (!showMatrix || selectedIds.length < 2) return;
    let cancelled = false;
    (async () => {
      setCmpLoading(true);
      try {
        const res = await api.compare(selectedIds);
        if (!cancelled) setComparison(res);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setCmpLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedIds, showMatrix]);

  const toggleSelect = (sid) => {
    setSelectedIds((prev) => {
      if (prev.includes(sid)) return prev.filter((x) => x !== sid);
      if (prev.length >= 3) return [...prev.slice(1), sid];
      return [...prev, sid];
    });
  };

  const applyPresetComparison = (ids) => {
    setSelectedIds(ids);
    setShowMatrix(true);
  };

  const selectedStudies = useMemo(() => {
    const sourceList = allStudies.length > 0 ? allStudies : ranked.map((r) => r.study);
    return selectedIds
      .map((sid) => sourceList.find((st) => st.study_id === sid))
      .filter(Boolean);
  }, [selectedIds, allStudies, ranked]);

  // FIG 1.1: O2% Envelope Range Chart Data (studies with wide or distinct O2 sweeps)
  const o2EnvelopeData = useMemo(() => {
    const pool = allStudies.length > 0 ? allStudies : ranked.map((r) => r.study);
    const featuredIds = [
      'PSI-159',
      'PDF-FLAME-DESIGN',
      'PSI-68',
      'PSI-20',
      'PDF-SFLAME',
      'PSI-25',
      'PSI-39',
      'PDF-MIST',
      'PSI-62',
      'PSI-98',
    ];
    return featuredIds
      .map((id) => pool.find((s) => s.study_id === id))
      .filter(Boolean)
      .map((s) => ({
        study_id: s.study_id,
        label: `${s.study_id} (${s.acronym.split('/')[0].trim().slice(0, 12)})`,
        o2_min: s.o2_min ?? 21,
        o2_span: Math.max(2, (s.o2_max ?? 21) - (s.o2_min ?? 21)),
        o2_max: s.o2_max ?? 21,
        o2_text: s.o2_range,
      }));
  }, [allStudies, ranked]);

  // FIG 1.2: Corpus Distribution by Safety Pillar & Fuel Phase
  const pillarPhaseData = useMemo(() => {
    const pool = allStudies.length > 0 ? allStudies : ranked.map((r) => r.study);
    const pillars = ['Prevention', 'Suppression', 'Detection', 'Fundamentals'];
    return pillars.map((p) => {
      const subset = pool.filter((s) => s.safety_pillar === p);
      return {
        pillar: p,
        Solid: subset.filter((s) => s.fuel_phase === 'Solid').length,
        Liquid: subset.filter((s) => s.fuel_phase === 'Liquid').length,
        Gas: subset.filter((s) => String(s.fuel_phase).startsWith('Gas')).length,
        Aerosol: subset.filter((s) => String(s.fuel_phase).includes('Aerosol')).length,
        total: subset.length,
      };
    });
  }, [allStudies, ranked]);

  // FIG 1.3: Quantitative Matrix Telemetry Chart
  const comparisonChartData = useMemo(() => {
    if (!selectedStudies.length) return [];
    return selectedStudies.map((st) => ({
      name: `${st.study_id}`,
      acronym: st.acronym,
      o2_max: st.o2_max ?? 21,
      pressure_max: Math.round((st.pressure_max_psia ?? 14.7) * 10) / 10,
      flow_max: st.airflow_max_cms ?? 0,
      pubs: st.publications?.length ?? 0,
    }));
  }, [selectedStudies]);

  return (
    <div className="space-y-5">
      {/* Modern 21st.dev Bento Telemetry Summary Strip */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Active Habitat Target
            </span>
            <CopyButton
              text={`${habitatState.o2_pct}% O2 | ${habitatState.pressure_psia} psia | ${habitatState.airflow_cms} cm/s | ${habitatState.gravity_target}`}
              label="Grab"
            />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-display text-lg font-semibold tabular-nums text-zinc-950">
              {habitatState.o2_pct}% O2 · {habitatState.pressure_psia} psia
            </span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-500/20">
              {habitatState.gravity_target}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 to-rose-500 transition-all"
              style={{ width: `${Math.min(100, Math.round((habitatState.o2_pct / 85) * 100))}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            Airflow {habitatState.airflow_cms} cm/s · SEA Design Envelope
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Goldilocks Flow Peak
          </div>
          <div className="mt-2 font-display text-lg font-semibold tabular-nums text-zinc-950">
            ~10 cm/s (0–40 cm/s)
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="ml-[10%] h-full w-[35%] rounded-full bg-amber-500" />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            BASS-II upstream spread below 1g Test 1 (21% O2)
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Smoke Crossover &amp; Fleet
          </div>
          <div className="mt-2 font-display text-lg font-semibold tabular-nums text-zinc-950">
            0.2 µm · {hardwareRacks.length} Racks
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-full rounded-full bg-blue-600" />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            CIR · MDCA · ACME · SoFIE · MSG · Cygnus
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Grounded PSI Corpus
            </span>
            <button
              onClick={() => setShowFigures((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-700 transition hover:bg-zinc-200"
            >
              <BarChart3 className="h-3 w-3" />
              {showFigures ? 'Hide Figs' : 'Show Figs'}
            </button>
          </div>
          <div className="mt-2 font-display text-lg font-semibold tabular-nums text-zinc-950">
            19 Studies · 140 DOIs
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-full rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500">
            78 Context-Injected Chunks · {audienceLens} Lens
          </p>
        </div>
      </div>

      {/* FIG 1.1 & FIG 1.2 Quantitative Corpus Overview */}
      {showFigures && o2EnvelopeData.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-7">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FC3D21]">
                  FIG 1.1 · OXYGEN TEST ENVELOPES ACROSS NASA PSI STUDIES
                </div>
                <h3 className="text-xs font-semibold text-slate-900">
                  Experimental O2% Concentration Ranges vs. Exploration Atmosphere Milestones
                </h3>
              </div>
              <span className="font-mono text-[10px] text-slate-500">Click bar to inspect study</span>
            </div>
            <div className="h-[235px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={o2EnvelopeData}
                  layout="vertical"
                  margin={{ top: 6, right: 20, left: 10, bottom: 8 }}
                  onClick={(state) => {
                    const sid = state?.activePayload?.[0]?.payload?.study_id;
                    if (sid) setExpandedId(sid);
                  }}
                >
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 90]} stroke="#64748B" fontSize={10} unit="%" />
                  <YAxis type="category" dataKey="label" width={145} stroke="#475569" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    formatter={(_val, _name, props) => [props.payload.o2_text, props.payload.study_id]}
                  />
                  <ReferenceLine
                    x={21}
                    stroke="#64748B"
                    strokeDasharray="3 3"
                    label={{ value: '21% ISS', position: 'top', fill: '#475569', fontSize: 9 }}
                  />
                  <ReferenceLine
                    x={34}
                    stroke="#FC3D21"
                    strokeDasharray="3 3"
                    label={{ value: '34% Lunar SEA', position: 'top', fill: '#C8230A', fontSize: 9 }}
                  />
                  <Bar dataKey="o2_min" stackId="o2" fill="transparent" />
                  <Bar
                    dataKey="o2_span"
                    stackId="o2"
                    fill="#0B3D91"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    name="Tested O2 Range (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B3D91]">
                  FIG 1.2 · CORPUS TAXONOMY BY PILLAR &amp; FUEL PHASE
                </div>
                <h3 className="text-xs font-semibold text-slate-900">
                  19 PSI + ISS Guide Studies Grouped by Fire Safety Domain
                </h3>
              </div>
              <span className="font-mono text-[10px] text-slate-500">Click pillar to filter</span>
            </div>
            <div className="h-[235px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pillarPhaseData}
                  margin={{ top: 10, right: 10, left: -16, bottom: 8 }}
                  onClick={(state) => {
                    const p = state?.activeLabel;
                    if (p) setPillar((prev) => (prev === p ? 'All' : p));
                  }}
                >
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="pillar" stroke="#475569" fontSize={10} />
                  <YAxis allowDecimals={false} stroke="#64748B" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                  <Bar dataKey="Solid" stackId="a" fill="#0B3D91" cursor="pointer" />
                  <Bar dataKey="Liquid" stackId="a" fill="#0EA5E9" cursor="pointer" />
                  <Bar dataKey="Gas" stackId="a" fill="#F59E0B" cursor="pointer" />
                  <Bar dataKey="Aerosol" stackId="a" fill="#FC3D21" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* On-Demand Hardware Panel */}
      {activePanel === 'hardware' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[#0B3D91]">
              ISS &amp; Cygnus Combustion Hardware Facilities (NP-2015-10-034-JSC pp. 43–52)
            </h3>
            <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hardwareRacks.map((rack) => (
              <div key={rack.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#0B3D91]">{rack.id}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-400">{rack.source_citation}</span>
                    <CopyButton
                      text={`${rack.id} (${rack.name}): ${rack.volume}. Capabilities: ${rack.capabilities} [${rack.source_citation}]`}
                      label="Copy"
                    />
                  </div>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-900">{rack.name}</div>
                <p className="mt-1 text-[11px] text-slate-600">{rack.volume}</p>
                {(rack.up_mass_kg || rack.power_kw) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px] text-slate-700">
                    {rack.up_mass_kg && <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">{rack.up_mass_kg} kg</span>}
                    {rack.power_kw && <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">{rack.power_kw} kW</span>}
                    {rack.data_volume_gb && <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">{rack.data_volume_gb} GB</span>}
                  </div>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{rack.capabilities}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-Demand Mission Heritage Panel */}
      {activePanel === 'heritage' && briefingContext && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[#0B3D91]">
              Historical Spaceflight Fire Incidents → NASA PSI Evidence
            </h3>
            <button onClick={() => setActivePanel(null)} className="text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {briefingContext.historical_incidents.map((inc) => (
              <div key={inc.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-[#FC3D21]">{inc.mission}</span>
                  <span className="text-slate-400">{inc.year}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-900">{inc.event}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{inc.physics_lesson}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {inc.psi_links.map((sid) => (
                    <button
                      key={sid}
                      onClick={() => {
                        setExpandedId(sid);
                        setActivePanel(null);
                      }}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#0B3D91] hover:border-[#0B3D91]"
                    >
                      {sid}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">{briefingContext.scope_note}</p>
        </div>
      )}

      {/* On-Demand Side-by-Side Comparison Matrix */}
      {showMatrix && selectedIds.length >= 2 && (
        <div className="rounded-xl border border-[#0B3D91]/30 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FC3D21]">
                TABLE 1.1 &amp; FIG 1.3 · SIDE-BY-SIDE PSI INVESTIGATION MATRIX
              </div>
              <h3 className="font-display text-sm font-semibold text-[#0B3D91]">
                Comparative Fuels, Geometry, Test Conditions, Within-Study Controls &amp; Sensors
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {comparison?.matrix?.length > 0 && (
                <>
                  <CopyButton
                    text={buildMatrixMarkdown(comparison.matrix)}
                    label="Copy Markdown"
                    size="sm"
                    title="Copy entire comparison matrix as a Markdown table"
                  />
                  <button
                    onClick={() => downloadMatrixCsv(comparison.matrix)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-slate-700 hover:border-[#0B3D91] hover:text-[#0B3D91]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    CSV
                  </button>
                  {onAskSI && (
                    <button
                      onClick={() =>
                        onAskSI(
                          `Compare ${selectedIds.join(', ')} side-by-side for Lunar/Martian habitat fire safety gaps, sample geometry, and instrumentation.`
                        )
                      }
                      className="inline-flex items-center gap-1 rounded bg-[#0B3D91] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#092F70]"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Ask SI Compare
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => setShowMatrix(false)}
                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          {cmpLoading ? (
            <div className="p-6 text-center text-xs text-slate-500">Synthesizing comparison...</div>
          ) : comparison?.matrix?.length > 0 ? (
            <div className="space-y-4">
              {/* FIG 1.3: Numeric Telemetry Bar Comparison */}
              {comparisonChartData.length >= 2 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-[#0B3D91]">
                      FIG 1.3 · QUANTITATIVE PARAMETER COMPARISON (Max O2%, Max Pressure psia, Max Airflow cm/s, Publications)
                    </span>
                  </div>
                  <div className="h-[190px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
                        <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={11} />
                        <YAxis stroke="#64748B" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            borderColor: '#CBD5E1',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                        <Bar dataKey="o2_max" name="Max O2 (%)" fill="#FC3D21" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="pressure_max" name="Max Pressure (psia)" fill="#0B3D91" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="flow_max" name="Max Airflow (cm/s)" fill="#10B981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="pubs" name="Peer-Reviewed Pubs (#)" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-zinc-200/80">
                <table className="w-full min-w-[740px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/90 text-zinc-900">
                      <th className="w-44 p-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Parameter
                      </th>
                      {comparison.matrix.map((m) => (
                        <th key={m.study_id} className="p-3 align-top">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600">
                              {m.study_id} · {m.acronym}
                            </span>
                            <CopyButton
                              text={`[${m.study_id} | ${m.acronym} | ${m.doi}]`}
                              label="Cite"
                            />
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium text-zinc-800">{m.title}</div>
                          <div className="mt-1 font-mono text-[10px] font-normal text-zinc-500">DOI: {m.doi}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr>
                      <td className="bg-slate-50 p-3 font-medium text-slate-600">Pillar &amp; Phase</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3">
                          <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium ${PILLAR_BADGE[m.safety_pillar] || 'border-slate-200 text-slate-700'}`}>
                            {m.safety_pillar}
                          </span>{' '}
                          <span className="ml-1 text-slate-700">{m.fuel_phase}</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="bg-slate-50 p-3 font-medium text-slate-600">Hardware</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 font-mono text-[11px] font-medium text-[#0B3D91]">{m.hardware}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="bg-slate-50 p-3 font-medium text-slate-600">Fuels &amp; Dimensions</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 leading-relaxed text-slate-700">{m.fuels_geometry}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="bg-slate-50 p-3 font-medium text-slate-600">Test Conditions</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 font-mono text-[11px] text-slate-700">{m.test_conditions}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="bg-slate-50 p-3 font-medium text-slate-600">Within-Study Same vs. Varied</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 leading-relaxed text-slate-700">
                          <div><span className="font-mono text-[10px] font-semibold text-[#0B3D91]">SAME:</span> {m.within_study_same}</div>
                          <div className="mt-1"><span className="font-mono text-[10px] font-semibold text-[#FC3D21]">VARIED:</span> {m.within_study_varied}</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="bg-slate-50 p-3 font-medium text-slate-600">Sensors &amp; Diagnostics</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 leading-relaxed text-slate-700">{m.sensors_diagnostics}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="bg-slate-50 p-3 font-medium text-slate-600">PIs &amp; Publications</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 text-[11px] text-slate-600">
                          <div className="font-medium text-slate-800">
                            {(m.pis || []).join(', ') || 'NASA PSI Research Team'}
                          </div>
                          {m.top_publications?.length > 0 && (
                            <div className="mt-1 font-mono text-[10px] text-[#0B3D91]">
                              {m.top_publications.length} linked key pub(s) · {m.top_publications[0]?.doi || m.doi}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-[#0B3D91]">
                    <Sparkles className="h-3.5 w-3.5 text-[#FC3D21]" />
                    SI Cross-Investigation Synthesis
                  </span>
                  <div className="flex items-center gap-2">
                    <CopyButton text={comparison.synthesis} label="Copy Synthesis" />
                    <span className="font-mono text-[10px] text-slate-400">{comparison.mode}</span>
                  </div>
                </div>
                <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                  {comparison.synthesis}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Main 8/4 Master-Inspector Grid */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left 8 Cols: Search + Ranked Studies */}
        <div className="space-y-4 lg:col-span-8">
          {/* Compact Search & Filter Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search studies, fuels (Sibal 0.94 m, PMMA, n-dodecane, Kapton), sensors..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0B3D91] focus:bg-white focus:outline-none"
                />
              </div>

              <button
                onClick={() => setUseHabitatWeights((v) => !v)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  useHabitatWeights
                    ? 'border-[#0B3D91] bg-[#0B3D91]/10 text-[#0B3D91]'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                Habitat Match: {useHabitatWeights ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={hardware}
                  onChange={(e) => setHardware(e.target.value)}
                  aria-label="Filter by Hardware"
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0B3D91] focus:outline-none"
                >
                  {HARDWARE_FILTERS.map((hw) => (
                    <option key={hw} value={hw}>Hardware: {hw}</option>
                  ))}
                </select>
                <select
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value)}
                  aria-label="Filter by Safety Pillar"
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0B3D91] focus:outline-none"
                >
                  {PILLAR_FILTERS.map((p) => (
                    <option key={p} value={p}>Pillar: {p}</option>
                  ))}
                </select>
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                  aria-label="Filter by Fuel Phase"
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0B3D91] focus:outline-none"
                >
                  {PHASE_FILTERS.map((ph) => (
                    <option key={ph} value={ph}>Phase: {ph}</option>
                  ))}
                </select>
              </div>

              <span className="font-mono text-[11px] text-slate-500">
                {loading ? 'Ranking...' : `${ranked.length} investigations`}
              </span>
            </div>
          </div>

          {/* Ranked Study Cards */}
          <div className="space-y-3">
            {ranked.map((item) => {
              const st = item.study;
              const isSelected = selectedIds.includes(st.study_id);
              const isExpanded = expandedId === st.study_id;
              const citeTag = `[${st.study_id} | ${st.acronym} | ${st.doi}]`;
              const fullSpecText = [
                `${st.study_id} — ${st.acronym}: ${st.title}`,
                `DOI/Source: ${st.doi} (${st.doi_url || ''})`,
                `Pillar & Phase: ${st.safety_pillar} | ${st.fuel_phase}`,
                `Hardware: ${st.hardware}`,
                `Fuels & Geometry: ${st.fuels_geometry}`,
                `Conditions: O2 ${st.o2_range} | Pressure ${st.pressure_psia} | Flow ${st.airflow_cm_s} | ${st.gravity_regime}`,
                `Sensors: ${st.sensors_diagnostics}`,
                `Same: ${st.within_study_same}`,
                `Varied: ${st.within_study_varied}`,
                `Objective: ${st.objective}`,
              ].join('\n');

              return (
                <div
                  key={st.study_id}
                  className={`overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_6px_20px_-6px_rgba(0,0,0,0.1)] ${
                    isSelected
                      ? 'ring-2 ring-blue-600/40'
                      : 'ring-1 ring-zinc-200/80 hover:ring-zinc-300'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0B3D91]">
                            {st.study_id}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {st.acronym}
                          </span>
                          <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${PILLAR_BADGE[st.safety_pillar] || 'border-slate-200 text-slate-600'}`}>
                            {st.safety_pillar}
                          </span>
                          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            {st.publications?.length || 0} Pubs
                          </span>
                          {st.doi && (
                            <a
                              href={st.doi_url || `https://doi.org/${st.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-[#0B3D91] hover:underline"
                            >
                              {st.doi} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <CopyButton text={citeTag} label="Cite" title={`Copy ${citeTag}`} />
                        </div>

                        <h4 className="text-[15px] font-semibold leading-snug text-slate-900">
                          {st.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-600">
                          <span className="font-mono text-[10px] font-semibold uppercase text-slate-400">Sample/Burner: </span>
                          {st.fuels_geometry}
                        </p>
                      </div>

                      {/* Score + Actions */}
                      <div className="flex shrink-0 flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                        <div className="rounded-md bg-[#0B3D91]/8 px-2.5 py-1 text-right font-mono tabular-nums">
                          <span className="text-[10px] text-slate-500">MATCH </span>
                          <span className="text-sm font-bold text-[#0B3D91]">
                            {(item.total_score * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {onAskSI && (
                            <button
                              onClick={() =>
                                onAskSI(
                                  `Summarize key fire-safety findings, exact test parameters, and habitat implications from ${st.study_id} (${st.acronym}).`
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-[#0B3D91] hover:border-[#0B3D91] hover:bg-slate-50"
                              title={`Ask SI Engineer about ${st.study_id}`}
                            >
                              <Bot className="h-3.5 w-3.5 text-[#FC3D21]" />
                              Ask SI
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : st.study_id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Details
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => toggleSelect(st.study_id)}
                            className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                              isSelected
                                ? 'border-[#0B3D91] bg-[#0B3D91] text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-[#0B3D91]'
                            }`}
                          >
                            {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                            Compare
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details with 21st.dev Segmented Inner Tabs */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="inline-flex flex-wrap gap-1 rounded-md bg-slate-200/70 p-0.5">
                            {[
                              { id: 'overview', label: 'Objective & Impacts' },
                              { id: 'vars', label: 'Same vs. Varied' },
                              { id: 'hardware', label: 'Sensors & Hardware' },
                              { id: 'pubs', label: `Publications (${st.publications?.length || 0})` },
                            ].map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setDetailTab(t.id)}
                                className={`rounded px-2.5 py-1 font-mono text-[10px] font-semibold transition ${
                                  detailTab === t.id
                                    ? 'bg-white text-[#0B3D91] shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                          <CopyButton text={fullSpecText} label="Grab Full Spec" size="xs" />
                        </div>

                        <div className="rounded-md border border-slate-200 bg-slate-50/70 px-3 py-1.5 font-mono text-[11px] text-slate-600">
                          <span className="font-semibold text-[#0B3D91]">Context Header:</span> {st.context_header}
                        </div>

                        {detailTab === 'overview' && (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                              <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[#0B3D91]">
                                Objective
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                                {st.objective || 'N/A'}
                              </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                              <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[#0B3D91]">
                                Hypothesis &amp; Research Impacts
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                                {st.hypothesis ? `${st.hypothesis}\n\n` : ''}
                                {st.research_impacts || 'N/A'}
                              </p>
                            </div>
                          </div>
                        )}

                        {detailTab === 'vars' && (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-slate-500">
                                Within-Study Constants (Same)
                              </div>
                              <p className="leading-relaxed text-slate-700">{st.within_study_same}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[#FC3D21]">
                                Within-Study Variations (Varied)
                              </div>
                              <p className="leading-relaxed text-slate-700">{st.within_study_varied}</p>
                            </div>
                          </div>
                        )}

                        {detailTab === 'hardware' && (
                          <div className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[#0B3D91]">
                                  Hardware, Platform &amp; Managing Center
                                </div>
                                <p className="leading-relaxed text-slate-700">
                                  <strong className="text-slate-900">{st.hardware}</strong> ·{' '}
                                  {st.flight_platform} ({st.managing_center || 'NASA PSI'})
                                </p>
                              </div>
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[#0B3D91]">
                                  Sensors &amp; Diagnostics
                                </div>
                                <p className="leading-relaxed text-slate-700">{st.sensors_diagnostics}</p>
                              </div>
                            </div>
                            {st.personnel?.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase text-slate-500">
                                  <Users className="h-3.5 w-3.5" /> Personnel:
                                </span>
                                {st.personnel.map((p, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                                  >
                                    <strong className="font-medium text-slate-900">{p.name}</strong>
                                    {p.role ? ` (${p.role})` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {detailTab === 'pubs' && (
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase text-slate-500">
                              Peer-Reviewed Publications ({st.publications?.length || 0})
                            </div>
                            {st.publications?.length > 0 ? (
                              <ul className="space-y-1.5">
                                {st.publications.slice(0, 8).map((pub, idx) => (
                                  <li key={idx} className="flex items-start justify-between gap-2 text-[11px]">
                                    <span className="text-slate-700">
                                      <strong className="font-medium text-slate-900">{pub.title}</strong>
                                      {pub.authors ? ` — ${pub.authors}` : ''}
                                    </span>
                                    {pub.doi && (
                                      <div className="flex shrink-0 items-center gap-1.5">
                                        <a
                                          href={pub.link || `https://doi.org/${pub.doi}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="font-mono text-[#0B3D91] hover:underline"
                                        >
                                          {pub.doi}
                                        </a>
                                        <CopyButton text={pub.doi} label="DOI" />
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-slate-500">Referenced via NASA ISS Combustion Guide ({st.doi}).</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantitative 4-Cell Telemetry Strip */}
                  <div className="grid grid-cols-2 divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/90 font-mono text-[11px] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                    <div className="px-4 py-2">
                      <div className="text-[9px] uppercase text-slate-400">O2 Range</div>
                      <div className="truncate font-semibold text-slate-800" title={st.o2_range}>{st.o2_range}</div>
                    </div>
                    <div className="px-4 py-2">
                      <div className="text-[9px] uppercase text-slate-400">Pressure</div>
                      <div className="truncate font-semibold text-slate-800" title={st.pressure_psia}>{st.pressure_psia}</div>
                    </div>
                    <div className="px-4 py-2">
                      <div className="text-[9px] uppercase text-slate-400">Airflow Regime</div>
                      <div className="truncate font-semibold text-slate-800" title={st.airflow_cm_s}>{st.airflow_cm_s}</div>
                    </div>
                    <div className="px-4 py-2">
                      <div className="text-[9px] uppercase text-slate-400">Facility / Gravity</div>
                      <div className="truncate font-semibold text-[#0B3D91]" title={st.hardware_tags.join(', ')}>
                        {st.hardware_tags.join(', ')} · {st.gravity_regime}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Sticky Side Inspector */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="sticky top-20 space-y-4">
            {/* Comparison Dock Card (Modern 21st.dev Studio Card) */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80">
              <div className="flex items-center justify-between border-b border-zinc-200/80 bg-zinc-50/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600/10 text-blue-600">
                    <GitCompare className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-zinc-950">
                    Comparison Dock ({selectedIds.length}/3)
                  </h3>
                </div>
                <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-600">
                  MATRIX
                </span>
              </div>

              <div className="space-y-2.5 p-4">
                {selectedIds.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Select 2–3 investigations from the list or load a canonical bundle below.
                  </p>
                ) : (
                  selectedIds.map((sid) => {
                    const st = selectedStudies.find((x) => x.study_id === sid);
                    return (
                      <div
                        key={sid}
                        className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-bold text-[#0B3D91]">
                            {sid} · {st?.acronym || ''}
                          </div>
                          {st && (
                            <div className="truncate text-[11px] text-slate-600">
                              {st.safety_pillar} · {st.o2_range} · {st.pressure_psia}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleSelect(sid)}
                          className="shrink-0 text-slate-400 hover:text-[#FC3D21]"
                          title="Remove from comparison"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}

                <button
                  onClick={() => setShowMatrix((v) => !v)}
                  disabled={selectedIds.length < 2}
                  className="w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-zinc-800 disabled:opacity-40"
                >
                  {showMatrix ? 'Hide Comparison Matrix' : 'Open Full Comparison Matrix'}
                </button>

                <div className="border-t border-slate-100 pt-2.5">
                  <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    1-Click Thematic Comparisons
                  </div>
                  <div className="space-y-1.5">
                    {COMPARISON_PRESETS.map((cp) => (
                      <button
                        key={cp.id}
                        onClick={() => applyPresetComparison(cp.ids)}
                        className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-700 transition hover:border-[#0B3D91] hover:bg-white hover:text-[#0B3D91]"
                      >
                        <span className="truncate">{cp.label}</span>
                        <ArrowRight className="h-3 w-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Habitat Snapshot Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  <Flame className="h-3.5 w-3.5 text-[#FC3D21]" />
                  Habitat Operating Point
                </span>
                <span className="rounded bg-[#FC3D21]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#D92D12]">
                  {habitatState.gravity_target}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 text-center font-mono tabular-nums">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[10px] text-slate-400">O2</div>
                  <div className="text-sm font-bold text-[#FC3D21]">{habitatState.o2_pct}%</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[10px] text-slate-400">PRESSURE</div>
                  <div className="text-sm font-bold text-[#0B3D91]">{habitatState.pressure_psia}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-[10px] text-slate-400">AIRFLOW</div>
                  <div className="text-sm font-bold text-emerald-700">{habitatState.airflow_cms}</div>
                </div>
              </div>

              <button
                onClick={onOpenSimulator}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#0B3D91] transition hover:border-[#0B3D91] hover:bg-white"
              >
                Tune in Flammability Modeler
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Reference Modules Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <Layers className="h-3.5 w-3.5 text-[#0B3D91]" />
                Reference Modules
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setActivePanel(activePanel === 'hardware' ? null : 'hardware')}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                    activePanel === 'hardware'
                      ? 'border-[#0B3D91] bg-[#0B3D91] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5" />
                    ISS Hardware Racks ({hardwareRacks.length})
                  </span>
                  <span className="font-mono text-[10px] opacity-80">CIR · MSG</span>
                </button>

                <button
                  onClick={() => setActivePanel(activePanel === 'heritage' ? null : 'heritage')}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                    activePanel === 'heritage'
                      ? 'border-[#FC3D21] bg-[#FC3D21] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5" />
                    Mission Fire Heritage
                  </span>
                  <span className="font-mono text-[10px] opacity-80">Apollo → Artemis II</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
