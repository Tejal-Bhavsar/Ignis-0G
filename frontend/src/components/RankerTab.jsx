import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Cpu,
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
import { api } from '../api';

const HARDWARE_FILTERS = ['All', 'CIR', 'MDCA', 'ACME', 'MSG', 'Cygnus', 'TSI P-Trak', 'SoFIE'];
const PILLAR_FILTERS = ['All', 'Prevention', 'Detection', 'Suppression', 'Fundamentals'];
const PHASE_FILTERS = ['All', 'Solid', 'Liquid', 'Gas', 'Aerosol/Particulate'];

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

export default function RankerTab({
  habitatState,
  hardwareRacks,
  focusedStudyId,
  audienceLens,
  onOpenSimulator,
}) {
  const [query, setQuery] = useState('');
  const [hardware, setHardware] = useState('All');
  const [pillar, setPillar] = useState('All');
  const [phase, setPhase] = useState('All');
  const [useHabitatWeights, setUseHabitatWeights] = useState(true);

  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(['PSI-20', 'PSI-25', 'PSI-98']);
  const [showMatrix, setShowMatrix] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [activePanel, setActivePanel] = useState(null); // null | 'hardware' | 'heritage'
  const [briefingContext, setBriefingContext] = useState(null);

  useEffect(() => {
    api.briefingContext().then(setBriefingContext).catch(console.error);
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

  const selectedStudies = selectedIds
    .map((sid) => ranked.find((r) => r.study.study_id === sid)?.study)
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Executive Telemetry Summary Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#FC3D21] bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Active Habitat Target
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-display text-lg font-bold text-slate-900">
              {habitatState.o2_pct}% O2 · {habitatState.pressure_psia} psia
            </span>
            <span className="rounded bg-[#FC3D21]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#D92D12]">
              {habitatState.gravity_target}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Airflow {habitatState.airflow_cms} cm/s · SEA Risk Envelope
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Goldilocks Flow Peak
          </div>
          <div className="mt-1 font-display text-lg font-bold text-slate-900">
            ~10 cm/s (0–40 cm/s)
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            BASS-II upstream spread below NASA Test 1 (21% O2)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#0B3D91] bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            ISS &amp; Cygnus Racks
          </div>
          <div className="mt-1 font-display text-lg font-bold text-slate-900">
            {hardwareRacks.length} Flight Facilities
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            CIR · MDCA · ACME · SoFIE · MSG · SAFFIRE
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Grounded PSI Corpus
          </div>
          <div className="mt-1 font-display text-lg font-bold text-slate-900">
            19 Studies · 140 DOIs
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            78 Context-Injected Chunks · {audienceLens} Lens
          </p>
        </div>
      </div>

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
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0B3D91]">{rack.id}</span>
                  <span className="font-mono text-[10px] text-slate-400">{rack.source_citation}</span>
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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-[#0B3D91]">
                Side-by-Side Investigation Comparison Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Objectives, Fuels &amp; Dimensions, Within-Study Same vs. Varied, Sensors, and DOIs
              </p>
            </div>
            <button
              onClick={() => setShowMatrix(false)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Close Matrix
            </button>
          </div>

          {cmpLoading ? (
            <div className="p-6 text-center text-xs text-slate-500">Synthesizing comparison...</div>
          ) : comparison?.matrix?.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#0B3D91] text-white">
                      <th className="w-44 p-3 font-mono text-[11px] uppercase tracking-wider text-sky-100">
                        Parameter
                      </th>
                      {comparison.matrix.map((m) => (
                        <th key={m.study_id} className="p-3 align-top">
                          <div className="font-mono text-xs font-bold text-white">
                            {m.study_id} · {m.acronym}
                          </div>
                          <div className="mt-0.5 text-[11px] font-normal text-sky-100">{m.title}</div>
                          <div className="mt-1 font-mono text-[10px] text-sky-200">DOI: {m.doi}</div>
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
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-[#0B3D91]">
                    <Sparkles className="h-3.5 w-3.5 text-[#FC3D21]" />
                    SI Cross-Investigation Synthesis
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{comparison.mode}</span>
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
                  placeholder="Search studies, fuels (Sibal, PMMA, n-dodecane), sensors..."
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

              return (
                <div
                  key={st.study_id}
                  className={`overflow-hidden rounded-xl border border-l-4 bg-white shadow-xs transition ${
                    PILLAR_LEFT_BORDER[st.safety_pillar] || 'border-l-slate-400'
                  } ${
                    isSelected
                      ? 'border-[#0B3D91]/50 ring-1 ring-[#0B3D91]/15'
                      : 'border-slate-200 hover:border-slate-300'
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
                        </div>

                        <h4 className="text-[15px] font-semibold leading-snug text-slate-900">
                          {st.title}
                        </h4>
                        <p className="text-xs leading-relaxed text-slate-600">
                          {st.fuels_geometry}
                        </p>
                      </div>

                      {/* Score + Actions */}
                      <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <div className="rounded-md bg-[#0B3D91]/8 px-2.5 py-1 text-right font-mono">
                          <span className="text-[10px] text-slate-500">MATCH </span>
                          <span className="text-sm font-bold text-[#0B3D91]">
                            {(item.total_score * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
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

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-600">
                          <span className="font-semibold text-[#0B3D91]">Context Header:</span> {st.context_header}
                        </div>

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

                        {st.publications?.length > 0 && (
                          <div className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase text-slate-500">
                              Peer-Reviewed Publications ({st.publications.length})
                            </div>
                            <ul className="space-y-1">
                              {st.publications.slice(0, 5).map((pub, idx) => (
                                <li key={idx} className="flex items-start justify-between gap-2 text-[11px]">
                                  <span className="text-slate-700">
                                    <strong className="font-medium text-slate-900">{pub.title}</strong>
                                    {pub.authors ? ` — ${pub.authors}` : ''}
                                  </span>
                                  {pub.doi && (
                                    <a
                                      href={pub.link || `https://doi.org/${pub.doi}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="shrink-0 font-mono text-[#0B3D91] hover:underline"
                                    >
                                      {pub.doi}
                                    </a>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tinted Telemetry Footer Strip */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 bg-slate-50/90 px-4 py-2 font-mono text-[11px] text-slate-600 sm:px-5">
                    <span>Facility: <strong className="font-medium text-slate-800">{st.hardware_tags.join(', ')}</strong></span>
                    <span>O2: <strong className="font-medium text-slate-800">{st.o2_range}</strong></span>
                    <span>Pressure: <strong className="font-medium text-slate-800">{st.pressure_psia}</strong></span>
                    <span>Flow: <strong className="font-medium text-slate-800">{st.airflow_cm_s}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Sticky Side Inspector */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="sticky top-32 space-y-4">
            {/* Comparison Dock Card (Navy Header Anchor) */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between bg-[#0B3D91] px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-sky-300" />
                  <h3 className="font-display text-sm font-semibold">
                    Comparison Dock ({selectedIds.length}/3)
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-sky-200">SIDE-BY-SIDE</span>
              </div>

              <div className="space-y-2.5 p-4">
                {selectedIds.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Select 2–3 investigations from the list to compare test matrices.
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
                              {st.safety_pillar} · {st.fuel_phase} · {st.o2_range}
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
                  className="w-full rounded-lg bg-[#0B3D91] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#092F70] disabled:opacity-40"
                >
                  {showMatrix ? 'Hide Comparison Matrix' : 'Open Full Comparison Matrix'}
                </button>
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

              <div className="grid grid-cols-3 gap-2 py-2 text-center font-mono">
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
