import { useEffect, useState } from 'react';
import {
  CheckSquare,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  GitCompare,
  History,
  Search,
  Sparkles,
  Square,
  Users,
} from 'lucide-react';
import { api } from '../api';

const HARDWARE_FILTERS = ['All', 'CIR', 'MDCA', 'ACME', 'MSG', 'Cygnus', 'TSI P-Trak', 'SoFIE'];
const PILLAR_FILTERS = ['All', 'Prevention', 'Detection', 'Suppression', 'Fundamentals'];
const PHASE_FILTERS = ['All', 'Solid', 'Liquid', 'Gas', 'Aerosol/Particulate'];

const PILLAR_BADGE = {
  Prevention: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  Detection: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  Suppression: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  Fundamentals: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
};

export default function RankerTab({ habitatState, hardwareRacks, focusedStudyId }) {
  const [query, setQuery] = useState('');
  const [hardware, setHardware] = useState('All');
  const [pillar, setPillar] = useState('All');
  const [phase, setPhase] = useState('All');
  const [useHabitatWeights, setUseHabitatWeights] = useState(true);

  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(['PSI-20', 'PSI-25', 'PSI-98']);
  const [comparison, setComparison] = useState(null);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showHardware, setShowHardware] = useState(false);
  const [showHeritage, setShowHeritage] = useState(false);
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
    if (selectedIds.length < 2) {
      setComparison(null);
      return;
    }
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
  }, [selectedIds]);

  const toggleSelect = (sid) => {
    setSelectedIds((prev) => {
      if (prev.includes(sid)) return prev.filter((x) => x !== sid);
      if (prev.length >= 3) return [...prev.slice(1), sid];
      return [...prev, sid];
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Multi-Factor Filter Bar */}
      <div className="rounded-lg border border-[#1C2B47] bg-[#0D1526] p-4 shadow-lg">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search PSI investigations, fuels (Sibal 0.94 m, PMMA, n-dodecane), sensors (P-Trak, UV), or DOIs..."
              className="w-full rounded-md border border-[#1C2B47] bg-[#070D19] py-2.5 pr-4 pl-10 text-sm text-slate-100 placeholder-slate-500 focus:border-[#38BDF8] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setUseHabitatWeights((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-xs transition ${
                useHabitatWeights
                  ? 'border-[#2563EB] bg-[#0B3D91]/70 text-white'
                  : 'border-[#1C2B47] bg-[#070D19] text-slate-400'
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-[#38BDF8]" />
              Habitat Proximity: {useHabitatWeights ? `${habitatState.o2_pct}% O2 / ${habitatState.pressure_psia} psia / ${habitatState.airflow_cms} cm/s` : 'OFF'}
            </button>

            <button
              onClick={() => setShowHardware((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-xs transition ${
                showHardware
                  ? 'border-[#38BDF8]/60 bg-[#0B3D91]/50 text-white'
                  : 'border-[#1C2B47] bg-[#070D19] text-slate-200 hover:border-[#38BDF8]/40'
              }`}
            >
              <Cpu className="h-3.5 w-3.5 text-[#38BDF8]" />
              ISS Hardware ({hardwareRacks.length})
            </button>

            <button
              onClick={() => setShowHeritage((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 font-mono text-xs transition ${
                showHeritage
                  ? 'border-[#FC3D21]/60 bg-[#FC3D21]/15 text-white'
                  : 'border-[#1C2B47] bg-[#070D19] text-slate-200 hover:border-[#FC3D21]/50'
              }`}
            >
              <History className="h-3.5 w-3.5 text-[#FC3D21]" />
              Mission Fire Heritage
            </button>
          </div>
        </div>

        {/* Facet Chips */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Hardware Facility
            </div>
            <div className="flex flex-wrap gap-1.5">
              {HARDWARE_FILTERS.map((hw) => (
                <button
                  key={hw}
                  onClick={() => setHardware(hw)}
                  className={`rounded border px-2 py-1 font-mono text-[11px] transition ${
                    hardware === hw
                      ? 'border-[#3B82F6] bg-[#0B3D91] text-white'
                      : 'border-[#1C2B47] bg-[#070D19] text-slate-400 hover:border-[#2C436E] hover:text-slate-200'
                  }`}
                >
                  {hw}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Fire Safety Pillar
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PILLAR_FILTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPillar(p)}
                  className={`rounded border px-2 py-1 font-mono text-[11px] transition ${
                    pillar === p
                      ? 'border-[#3B82F6] bg-[#0B3D91] text-white'
                      : 'border-[#1C2B47] bg-[#070D19] text-slate-400 hover:border-[#2C436E] hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Fuel Phase
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PHASE_FILTERS.map((ph) => (
                <button
                  key={ph}
                  onClick={() => setPhase(ph)}
                  className={`rounded border px-2 py-1 font-mono text-[11px] transition ${
                    phase === ph
                      ? 'border-[#3B82F6] bg-[#0B3D91] text-white'
                      : 'border-[#1C2B47] bg-[#070D19] text-slate-400 hover:border-[#2C436E] hover:text-slate-200'
                  }`}
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Mission Fire Heritage -> PSI Bridge */}
      {showHeritage && briefingContext && (
        <div className="rounded-xl border border-amber-500/30 bg-[#0E1525] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-amber-300">
              <History className="h-4 w-4" />
              Historical Spaceflight Fire Incidents → NASA PSI Evidence Bridge
            </h3>
            <span className="font-mono text-[10px] text-slate-400">
              Crewed Habitats Only · Rocket/Propellant High-Velocity Flow Excluded
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {briefingContext.historical_incidents.map((inc) => (
              <div key={inc.id} className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-orange-300">{inc.mission}</span>
                  <span className="text-slate-500">{inc.year}</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-200">{inc.event}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{inc.physics_lesson}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {inc.psi_links.map((sid) => (
                    <button
                      key={sid}
                      onClick={() => setExpandedId(sid)}
                      className="rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-300 hover:bg-sky-500/20"
                    >
                      {sid}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] text-slate-400">{briefingContext.scope_note}</p>
        </div>
      )}

      {/* Collapsible ISS Hardware Rack Spec Strip */}
      {showHardware && (
        <div className="rounded-xl border border-slate-800 bg-[#0E1525] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-orange-300">
              <Cpu className="h-4 w-4" />
              ISS &amp; Cygnus Combustion Hardware Facilities (NP-2015-10-034-JSC pp. 43–52)
            </h3>
            <span className="font-mono text-[11px] text-slate-400">
              CIR / MDCA / ACME / SoFIE / MSG / SAFFIRE
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hardwareRacks.map((rack) => (
              <div
                key={rack.id}
                className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-300">
                    {rack.id}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {rack.source_citation}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-100">
                  {rack.name}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{rack.volume}</p>
                {(rack.up_mass_kg || rack.power_kw) && (
                  <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] text-emerald-300">
                    {rack.up_mass_kg && <span className="rounded bg-slate-800 px-1.5 py-0.5">{rack.up_mass_kg} kg</span>}
                    {rack.power_kw && <span className="rounded bg-slate-800 px-1.5 py-0.5">{rack.power_kw} kW</span>}
                    {rack.data_volume_gb && <span className="rounded bg-slate-800 px-1.5 py-0.5">{rack.data_volume_gb} GB</span>}
                  </div>
                )}
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                  {rack.capabilities}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix */}
      <div className="rounded-lg border border-[#2563EB]/40 bg-[#0D1526] p-5 shadow-lg">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-white">
              <GitCompare className="h-4 w-4 text-[#38BDF8]" />
              Side-by-Side PSI Investigation Comparison Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Select any 2–3 studies below to compare Objectives, Fuels/Dimensions, Within-Study Variations, Sensors, and DOIs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedIds.map((sid) => (
              <button
                key={sid}
                onClick={() => toggleSelect(sid)}
                className="inline-flex items-center gap-1 rounded border border-[#3B82F6]/60 bg-[#0B3D91] px-2.5 py-1 font-mono text-xs text-white hover:bg-[#134EB3]"
              >
                {sid} ×
              </button>
            ))}
          </div>
        </div>

        {selectedIds.length < 2 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-400">
            Select at least 2 studies from the ranked list below to activate the side-by-side comparison matrix.
          </div>
        ) : cmpLoading ? (
          <div className="p-6 text-center font-mono text-xs text-slate-400">
            Synthesizing side-by-side comparison...
          </div>
        ) : comparison?.matrix?.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0B0F19]">
                    <th className="w-44 p-3 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                      Parameter
                    </th>
                    {comparison.matrix.map((m) => (
                      <th key={m.study_id} className="p-3 align-top">
                        <div className="font-mono text-xs font-bold text-orange-300">
                          {m.study_id} · {m.acronym}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium text-slate-200">
                          {m.title}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-sky-400">
                          DOI: {m.doi}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 bg-[#0E1422]">
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Pillar &amp; Phase</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 text-slate-200">
                        <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] ${PILLAR_BADGE[m.safety_pillar] || 'border-slate-700 text-slate-300'}`}>
                          {m.safety_pillar}
                        </span>{' '}
                        <span className="ml-1 font-mono text-[11px] text-slate-300">{m.fuel_phase}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Hardware</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 font-mono text-[11px] text-sky-300">
                        {m.hardware}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Fuels &amp; Dimensions</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 leading-relaxed text-slate-200">
                        {m.fuels_geometry}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Test Conditions</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 font-mono text-[11px] text-amber-200">
                        {m.test_conditions}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Controlled Variables</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 leading-relaxed text-slate-300">
                        {m.controlled_variables}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Varied Parameters</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 leading-relaxed text-slate-300">
                        {m.varied_parameters}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-amber-300/90">
                      Within-Study Same vs. Varied
                    </td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 leading-relaxed text-slate-300">
                        <div>
                          <span className="font-mono text-[10px] text-sky-400">SAME:</span>{' '}
                          {m.within_study_same}
                        </div>
                        <div className="mt-1">
                          <span className="font-mono text-[10px] text-orange-400">VARIED:</span>{' '}
                          {m.within_study_varied}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Sensors &amp; Diagnostics</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 leading-relaxed text-emerald-300/90">
                        {m.sensors_diagnostics}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-[11px] font-semibold text-slate-400">Primary Objective</td>
                    {comparison.matrix.map((m) => (
                      <td key={m.study_id} className="p-3 leading-relaxed text-slate-300">
                        {m.objective?.slice(0, 280)}{m.objective?.length > 280 ? '...' : ''}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SI Synthesis Box */}
            <div className="rounded-lg border border-sky-500/30 bg-[#0B0F19] p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  SI Cross-Investigation Synthesis
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  Engine: {comparison.mode}
                </span>
              </div>
              <div className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                {comparison.synthesis}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Ranked Studies Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Database className="h-4 w-4 text-orange-400" />
            Ranked NASA PSI Investigations ({ranked.length} matched)
          </h3>
          {loading && <span className="font-mono text-xs text-orange-400">Ranking...</span>}
        </div>

        {ranked.map((item) => {
          const st = item.study;
          const isSelected = selectedIds.includes(st.study_id);
          const isExpanded = expandedId === st.study_id;

          return (
            <div
              key={st.study_id}
              className={`rounded-lg border transition ${
                isSelected
                  ? 'border-[#2563EB] bg-[#0F1B33]'
                  : 'border-[#1C2B47] bg-[#0D1526] hover:border-[#2C436E]'
              } p-4`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1 space-y-2">
                  {/* Context-Injected Telemetry Header */}
                  <div className="inline-block rounded border border-[#1C2B47] bg-[#070D19] px-2.5 py-1 font-mono text-[10px] text-sky-300/90">
                    {st.context_header}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">
                      {st.study_id}
                    </span>
                    <span className="rounded bg-[#0B3D91] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                      {st.acronym}
                    </span>
                    <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${PILLAR_BADGE[st.safety_pillar] || 'border-slate-700 text-slate-300'}`}>
                      {st.safety_pillar}
                    </span>
                    <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                      {st.source_type}
                    </span>
                    {st.doi && (
                      <a
                        href={st.doi_url || `https://doi.org/${st.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-400 hover:underline"
                      >
                        {st.doi} <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-100">{st.title}</h4>
                  <p className="text-xs leading-relaxed text-slate-300">
                    <span className="font-semibold text-slate-200">Fuels / Geometry:</span>{' '}
                    {st.fuels_geometry}
                  </p>

                  {item.matched_parameters?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.matched_parameters.map((mp) => (
                        <span
                          key={mp}
                          className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
                        >
                          ✓ {mp}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Score + Actions */}
                <div className="flex shrink-0 flex-row items-center justify-between gap-3 lg:flex-col lg:items-end">
                  <div className="rounded-md border border-[#1C2B47] bg-[#070D19] px-3 py-2 text-right font-mono">
                    <div className="text-[10px] text-slate-400">RELEVANCE SCORE</div>
                    <div className="text-base font-bold text-[#38BDF8]">
                      {(item.total_score * 100).toFixed(0)}
                      <span className="text-xs text-slate-500">/100</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Sem {(item.semantic_score * 100).toFixed(0)}% · Phys {(item.physical_proximity_score * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : st.study_id)}
                      className="rounded-md border border-[#1C2B47] bg-[#070D19] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-[#38BDF8]/50"
                    >
                      {isExpanded ? 'Hide Details' : 'Metadata & DOIs'}
                    </button>
                    <button
                      onClick={() => toggleSelect(st.study_id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                        isSelected
                          ? 'border-[#3B82F6] bg-[#0B3D91] text-white'
                          : 'border-[#1C2B47] bg-[#070D19] text-slate-200 hover:border-[#3B82F6]/60'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      Compare
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded ISA-Tab Metadata Drawer */}
              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-slate-800 pt-4 text-xs">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                      <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-orange-300">
                        Objective
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-300">
                        {st.objective || 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                      <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-sky-300">
                        Hypothesis &amp; Research Impacts
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-300">
                        {st.hypothesis ? `${st.hypothesis}\n\n` : ''}
                        {st.research_impacts || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                      <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-sky-400">
                        Within-Study Constants (How Tests Stayed the Same)
                      </div>
                      <p className="leading-relaxed text-slate-300">{st.within_study_same}</p>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                      <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-amber-400">
                        Within-Study Variations (How Tests Differed)
                      </div>
                      <p className="leading-relaxed text-slate-300">{st.within_study_varied}</p>
                    </div>
                  </div>

                  {st.personnel?.length > 0 && (
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-slate-400">
                        <Users className="h-3.5 w-3.5" /> Investigation Personnel (PIs / Co-Is)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {st.personnel.map((p, idx) => (
                          <span
                            key={idx}
                            className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
                          >
                            <span className="font-semibold text-slate-100">{p.name}</span>
                            {p.role ? ` · ${p.role}` : ''}
                            {p.affiliation ? ` (${p.affiliation})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {st.publications?.length > 0 && (
                    <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                      <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase text-emerald-400">
                        Peer-Reviewed Publications ({st.publications.length})
                      </div>
                      <ul className="space-y-1.5">
                        {st.publications.slice(0, 6).map((pub, idx) => (
                          <li key={idx} className="flex items-start justify-between gap-2 text-[11px]">
                            <span className="text-slate-300">
                              <span className="font-medium text-slate-100">{pub.title}</span>
                              {pub.authors ? ` — ${pub.authors}` : ''}
                            </span>
                            {pub.doi && (
                              <a
                                href={pub.link || `https://doi.org/${pub.doi}`}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 font-mono text-sky-400 hover:underline"
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
          );
        })}
      </div>
    </div>
  );
}

