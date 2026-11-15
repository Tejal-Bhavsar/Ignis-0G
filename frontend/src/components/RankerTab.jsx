import { useEffect, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Cpu,
  ExternalLink,
  GitCompare,
  History,
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

export default function RankerTab({ habitatState, hardwareRacks, focusedStudyId, audienceLens }) {
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

  return (
    <div className="space-y-5">
      {/* Compact Search & Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search studies, fuels (Sibal, PMMA, n-dodecane), sensors, or DOIs..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0B3D91] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Compact Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={hardware}
              onChange={(e) => setHardware(e.target.value)}
              aria-label="Filter by Hardware"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-[#0B3D91] focus:outline-none"
            >
              {HARDWARE_FILTERS.map((hw) => (
                <option key={hw} value={hw}>
                  Hardware: {hw}
                </option>
              ))}
            </select>

            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
              aria-label="Filter by Safety Pillar"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-[#0B3D91] focus:outline-none"
            >
              {PILLAR_FILTERS.map((p) => (
                <option key={p} value={p}>
                  Pillar: {p}
                </option>
              ))}
            </select>

            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              aria-label="Filter by Fuel Phase"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-700 focus:border-[#0B3D91] focus:outline-none"
            >
              {PHASE_FILTERS.map((ph) => (
                <option key={ph} value={ph}>
                  Phase: {ph}
                </option>
              ))}
            </select>

            <button
              onClick={() => setUseHabitatWeights((v) => !v)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                useHabitatWeights
                  ? 'border-[#0B3D91] bg-[#0B3D91]/10 text-[#0B3D91]'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              Habitat Match: {useHabitatWeights ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Clean Secondary Utility Row */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActivePanel(activePanel === 'hardware' ? null : 'hardware')}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                activePanel === 'hardware'
                  ? 'border-[#0B3D91] bg-[#0B3D91] text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              ISS Hardware ({hardwareRacks.length})
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'heritage' ? null : 'heritage')}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                activePanel === 'heritage'
                  ? 'border-[#FC3D21] bg-[#FC3D21] text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Mission Fire Heritage
            </button>
          </div>

          {/* Comparison Trigger Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">
              Compare ({selectedIds.length}/3):
            </span>
            {selectedIds.map((sid) => (
              <button
                key={sid}
                onClick={() => toggleSelect(sid)}
                className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 hover:bg-slate-200"
              >
                {sid} ×
              </button>
            ))}
            <button
              onClick={() => setShowMatrix((v) => !v)}
              disabled={selectedIds.length < 2}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0B3D91] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#092F70] disabled:opacity-40"
            >
              <GitCompare className="h-3.5 w-3.5" />
              {showMatrix ? 'Hide Matrix' : 'Compare Side-by-Side'}
            </button>
          </div>
        </div>
      </div>

      {/* On-Demand Hardware Panel */}
      {activePanel === 'hardware' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
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
              <div key={rack.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0B3D91]">{rack.id}</span>
                  <span className="font-mono text-[10px] text-slate-400">{rack.source_citation}</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-900">{rack.name}</div>
                <p className="mt-1 text-[11px] text-slate-600">{rack.volume}</p>
                {(rack.up_mass_kg || rack.power_kw) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px] text-slate-700">
                    {rack.up_mass_kg && <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200">{rack.up_mass_kg} kg</span>}
                    {rack.power_kw && <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200">{rack.power_kw} kW</span>}
                    {rack.data_volume_gb && <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200">{rack.data_volume_gb} GB</span>}
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
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
              <div key={inc.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
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
        <div className="rounded-xl border border-[#0B3D91]/25 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-semibold text-[#0B3D91]">
                Side-by-Side Investigation Comparison Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Comparing Objectives, Fuels &amp; Dimensions, Within-Study Same vs. Varied, Sensors, and DOIs
              </p>
            </div>
            <button
              onClick={() => setShowMatrix(false)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {cmpLoading ? (
            <div className="p-6 text-center text-xs text-slate-500">Synthesizing comparison...</div>
          ) : comparison?.matrix?.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="w-44 p-3 font-mono text-[11px] uppercase text-slate-500">
                        Parameter
                      </th>
                      {comparison.matrix.map((m) => (
                        <th key={m.study_id} className="p-3 align-top">
                          <div className="font-mono text-xs font-bold text-[#0B3D91]">
                            {m.study_id} · {m.acronym}
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium text-slate-800">{m.title}</div>
                          <div className="mt-1 font-mono text-[10px] text-slate-500">DOI: {m.doi}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    <tr>
                      <td className="p-3 font-medium text-slate-500">Pillar &amp; Phase</td>
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
                      <td className="p-3 font-medium text-slate-500">Hardware</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 font-mono text-[11px] text-[#0B3D91]">{m.hardware}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-500">Fuels &amp; Dimensions</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 leading-relaxed text-slate-700">{m.fuels_geometry}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-500">Test Conditions</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 font-mono text-[11px] text-slate-700">{m.test_conditions}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-500">Within-Study Same vs. Varied</td>
                      {comparison.matrix.map((m) => (
                        <td key={m.study_id} className="p-3 leading-relaxed text-slate-700">
                          <div><span className="font-mono text-[10px] font-semibold text-[#0B3D91]">SAME:</span> {m.within_study_same}</div>
                          <div className="mt-1"><span className="font-mono text-[10px] font-semibold text-[#FC3D21]">VARIED:</span> {m.within_study_varied}</div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-500">Sensors &amp; Diagnostics</td>
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

      {/* Clean Ranked Studies Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-medium text-slate-500">
            Showing <span className="font-semibold text-slate-900">{ranked.length}</span> ranked NASA PSI investigations
            {audienceLens ? ` · ${audienceLens} view` : ''}
          </div>
          {loading && <span className="font-mono text-xs text-[#0B3D91]">Updating rank...</span>}
        </div>

        {ranked.map((item) => {
          const st = item.study;
          const isSelected = selectedIds.includes(st.study_id);
          const isExpanded = expandedId === st.study_id;

          return (
            <div
              key={st.study_id}
              className={`rounded-xl border bg-white p-5 transition ${
                isSelected
                  ? 'border-[#0B3D91]/50 shadow-sm ring-1 ring-[#0B3D91]/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-2">
                  {/* Top Meta Line */}
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
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">{st.fuel_phase}</span>
                    {st.doi && (
                      <>
                        <span className="text-xs text-slate-400">·</span>
                        <a
                          href={st.doi_url || `https://doi.org/${st.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] text-[#0B3D91] hover:underline"
                        >
                          {st.doi} <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    )}
                  </div>

                  <h4 className="text-base font-semibold text-slate-900">{st.title}</h4>

                  <p className="text-xs leading-relaxed text-slate-600">
                    {st.fuels_geometry}
                  </p>

                  {/* Crisp Single-Line Telemetry Summary */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 font-mono text-[11px] text-slate-500">
                    <span>Facility: <strong className="font-medium text-slate-700">{st.hardware_tags.join(', ')}</strong></span>
                    <span>O2: <strong className="font-medium text-slate-700">{st.o2_range}</strong></span>
                    <span>Pressure: <strong className="font-medium text-slate-700">{st.pressure_psia}</strong></span>
                    <span>Flow: <strong className="font-medium text-slate-700">{st.airflow_cm_s}</strong></span>
                  </div>
                </div>

                {/* Right Relevance + Actions */}
                <div className="flex shrink-0 flex-row items-center justify-between gap-3 md:flex-col md:items-end">
                  <div className="text-right font-mono">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Match</div>
                    <div className="text-lg font-bold text-[#0B3D91]">
                      {(item.total_score * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : st.study_id)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Details
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleSelect(st.study_id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
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

              {/* Expanded Details Drawer */}
              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-600">
                    <span className="font-semibold text-[#0B3D91]">Telemetry Header:</span> {st.context_header}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                      <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[#0B3D91]">
                        Objective
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                        {st.objective || 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
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
          );
        })}
      </div>
    </div>
  );
}
