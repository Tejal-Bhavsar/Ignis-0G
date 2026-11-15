import { useMemo, useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bot,
  Flame,
  Gauge,
  Info,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import CopyButton from './CopyButton';
import FlameVisualizer from './FlameVisualizer';

const GRAVITY_OPTIONS = [
  { id: '0g', label: '0g ISS Microgravity' },
  { id: '1/6g', label: '1/6g Moon Base' },
  { id: '3/8g', label: '3/8g Mars Habitat' },
  { id: '1g', label: '1g Earth Baseline' },
];

const RISK_STYLE = {
  CRITICAL: 'border-[#FC3D21]/40 bg-[#FC3D21]/10 text-[#C8230A]',
  HIGH: 'border-amber-300 bg-amber-50 text-amber-800',
  MODERATE: 'border-sky-300 bg-sky-50 text-sky-800',
  'LOW (Sub-Limit)': 'border-emerald-300 bg-emerald-50 text-emerald-800',
};

function formatSimTelemetry(simData) {
  if (!simData) return '';
  const { operating_point: op, metrics: m } = simData;
  return [
    `IGNIS-PSI Habitat Operating Telemetry (${op.gravity_label})`,
    `O2: ${op.o2_pct}% | N2: ${(100 - op.o2_pct).toFixed(1)}% | Total Pressure: ${op.pressure_psia} psia | pO2: ${op.po2_psia} psia | Airflow: ${op.airflow_cms} cm/s`,
    `Risk Level: ${m.risk_level} | 0g LOC: ${m.loc_0g_pct}% (Margin: ${m.margin_vs_0g_pct >= 0 ? '+' : ''}${m.margin_vs_0g_pct} pp) | Target LOC: ${m.loc_target_pct}% (Margin: ${m.margin_vs_target_pct >= 0 ? '+' : ''}${m.margin_vs_target_pct} pp) | Spread Multiplier: ${m.spread_rate_multiplier}x`,
    `Basis: ${m.flight_data_status}`,
  ].join('\n');
}

function buildSeaMatrixMarkdown(presets, tradeoff) {
  const preMap = new Map((tradeoff || []).map((t) => [t.o2_pct, t]));
  const rows = (presets || []).map((p) => {
    const po2 = (p.pressure_psia * (p.o2_pct / 100)).toFixed(2);
    const n2 = (100 - p.o2_pct).toFixed(1);
    const tb = preMap.get(p.o2_pct);
    const preMin = tb ? `${tb.est_prebreathe_min} min` : '—';
    const mult = tb ? `${tb.spread_multiplier}x` : '—';
    return `| ${p.label} | ${p.pressure_psia} psia | ${p.o2_pct}% | ${n2}% | ${po2} psia | ${p.airflow_cms} cm/s | ${p.gravity_target} | ${preMin} | ${mult} | ${p.source} |`;
  });
  return [
    '| Exploration Atmosphere | Pressure | O2% | N2% | pO2 | Airflow | Gravity | Est. Pre-Breathe | Spread Mult. | PSI Source |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

export default function SimulatorTab({
  habitatState,
  setHabitatState,
  onInspectStudy,
  onAskSI,
}) {
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.simulate(habitatState);
        if (!cancelled) setSimData(res);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [habitatState]);

  const applyPreset = (preset) => {
    setHabitatState({
      o2_pct: preset.o2_pct,
      pressure_psia: preset.pressure_psia,
      airflow_cms: preset.airflow_cms,
      gravity_target: preset.gravity_target,
    });
  };

  const metrics = simData?.metrics;
  const presets = simData?.presets || [];
  const curve = simData?.curve || [];
  const telemetryCopy = useMemo(() => formatSimTelemetry(simData), [simData]);
  const seaMarkdown = useMemo(
    () => buildSeaMatrixMarkdown(presets, simData?.prebreathe_tradeoff),
    [presets, simData?.prebreathe_tradeoff]
  );

  return (
    <div className="space-y-5">
      {/* NASA Exploration Atmosphere Presets */}
      <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#0B3D91] bg-white p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FC3D21]">
              NASA SPACE EXPLORATION ATMOSPHERES (SEA) · PSI-20 &amp; PSI-159
            </div>
            <div className="font-mono text-xs font-semibold text-[#0B3D91]">
              Select a NASA Test Point or Tune Live Habitat Telemetry Below
            </div>
          </div>
          <div className="flex items-center gap-2">
            {telemetryCopy && (
              <CopyButton text={telemetryCopy} label="Grab Telemetry" size="sm" />
            )}
            {onAskSI && (
              <button
                onClick={() =>
                  onAskSI(
                    `Evaluate fire risk, LOC margin, and suppression requirements for ${habitatState.o2_pct}% O2 at ${habitatState.pressure_psia} psia and ${habitatState.airflow_cms} cm/s in ${habitatState.gravity_target}.`
                  )
                }
                className="inline-flex items-center gap-1 rounded bg-[#0B3D91] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#092F70]"
              >
                <Bot className="h-3.5 w-3.5" />
                Ask SI Point
              </button>
            )}
            {loading && <span className="font-mono text-xs text-[#0B3D91]">Simulating...</span>}
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {presets.map((p) => {
            const active =
              Math.abs(habitatState.o2_pct - p.o2_pct) < 0.2 &&
              Math.abs(habitatState.pressure_psia - p.pressure_psia) < 0.2;
            const po2 = (p.pressure_psia * (p.o2_pct / 100)).toFixed(2);
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`rounded-lg border p-2.5 text-left transition ${
                  active
                    ? 'border-[#0B3D91] bg-[#0B3D91] text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-[#0B3D91]/50 hover:bg-white'
                }`}
              >
                <div className="text-xs font-semibold">{p.label}</div>
                <div className={`mt-1 font-mono text-[11px] font-semibold tabular-nums ${active ? 'text-sky-200' : 'text-[#0B3D91]'}`}>
                  {p.pressure_psia} psia · {p.o2_pct}% O2
                </div>
                <div className={`mt-0.5 font-mono text-[10px] tabular-nums ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                  pO2 {po2} · {p.gravity_target} · {p.airflow_cms} cm/s
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls + Flammability Boundary Chart */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* Controls Panel */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-4">
          <h3 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#0B3D91]">
            <Gauge className="h-4 w-4" />
            Habitat Environment Controls
          </h3>

          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between font-mono text-xs tabular-nums">
              <span className="text-slate-700">Oxygen (O2%) / N2 Balance</span>
              <span className="font-bold text-[#FC3D21]">
                {habitatState.o2_pct.toFixed(1)}% / {(100 - habitatState.o2_pct).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="17"
              max="85"
              step="0.5"
              value={Math.min(85, habitatState.o2_pct)}
              onChange={(e) =>
                setHabitatState((s) => ({ ...s, o2_pct: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#FC3D21]"
            />
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <span>17%</span>
              <span>21% ISS</span>
              <span>34% Lunar</span>
              <span>85% CFI-G</span>
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between font-mono text-xs tabular-nums">
              <span className="text-slate-700">Cabin Pressure (psia)</span>
              <span className="font-bold text-[#0B3D91]">{habitatState.pressure_psia.toFixed(1)} psia</span>
            </div>
            <input
              type="range"
              min="4.3"
              max="14.7"
              step="0.1"
              value={habitatState.pressure_psia}
              onChange={(e) =>
                setHabitatState((s) => ({ ...s, pressure_psia: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#0B3D91]"
            />
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <span>4.3 EVA</span>
              <span>8.2 Lunar</span>
              <span>10.2 Interm.</span>
              <span>14.7 Earth</span>
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between font-mono text-xs tabular-nums">
              <span className="flex items-center gap-1 text-slate-700">
                <Wind className="h-3.5 w-3.5 text-emerald-600" /> Forced Airflow (cm/s)
              </span>
              <span className="font-bold text-emerald-700">{habitatState.airflow_cms.toFixed(0)} cm/s</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={habitatState.airflow_cms}
              onChange={(e) =>
                setHabitatState((s) => ({ ...s, airflow_cms: parseFloat(e.target.value) }))
              }
              className="w-full accent-emerald-600"
            />
            <div className="flex justify-between font-mono text-[10px] text-slate-400">
              <span>0 Quiescent</span>
              <span className="font-semibold text-amber-700">~10 Goldilocks</span>
              <span>20–30 SAFFIRE</span>
              <span>40</span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="font-mono text-xs text-slate-700">Gravity Regime Target</div>
            <div className="grid grid-cols-2 gap-1.5">
              {GRAVITY_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setHabitatState((s) => ({ ...s, gravity_target: g.id }))}
                  className={`rounded border px-2.5 py-1.5 font-mono text-[11px] transition ${
                    habitatState.gravity_target === g.id
                      ? 'border-[#0B3D91] bg-[#0B3D91] text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {metrics && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {metrics.flight_data_status}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B3D91]">
              FIG 2.2 · LIVE FLAME MORPHOLOGY CHAMBER
            </div>
            <FlameVisualizer
              o2Pct={habitatState.o2_pct}
              pressurePsia={habitatState.pressure_psia}
              airflowCms={habitatState.airflow_cms}
              gravityTarget={habitatState.gravity_target}
            />
          </div>
        </div>

        {/* Charts + KPIs */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-8">
          {metrics && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className={`rounded-lg border p-3 ${RISK_STYLE[metrics.risk_level] || 'border-slate-200'}`}>
                <div className="font-mono text-[10px] uppercase opacity-80">Fire Risk</div>
                <div className="mt-0.5 font-mono text-xs font-bold">{metrics.risk_level}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono tabular-nums">
                <div className="text-[10px] text-slate-500">pO2 Partial</div>
                <div className="mt-0.5 text-sm font-bold text-slate-900">
                  {simData.operating_point.po2_psia} psia
                </div>
                <div className="text-[9px] text-slate-400">Earth norm 3.09</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono tabular-nums">
                <div className="text-[10px] text-slate-500">0g LOC (BASS-II)</div>
                <div className="mt-0.5 text-sm font-bold text-[#FC3D21]">
                  {metrics.loc_0g_pct}% O2
                </div>
                <div className="text-[9px] text-slate-500">
                  Δ {metrics.margin_vs_0g_pct >= 0 ? `+${metrics.margin_vs_0g_pct}` : metrics.margin_vs_0g_pct} pp
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono tabular-nums">
                <div className="text-[10px] text-slate-500">{habitatState.gravity_target} LOC Bound</div>
                <div className="mt-0.5 text-sm font-bold text-[#0B3D91]">
                  {metrics.loc_target_pct}% O2
                </div>
                <div className="text-[9px] text-slate-500">
                  Δ {metrics.margin_vs_target_pct >= 0 ? `+${metrics.margin_vs_target_pct}` : metrics.margin_vs_target_pct} pp
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono tabular-nums">
                <div className="text-[10px] text-slate-500">1g Test 1 Ref</div>
                <div className="mt-0.5 text-sm font-bold text-slate-800">21.0% O2</div>
                <div className="text-[9px] text-slate-400">NASA-STD-6001</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono tabular-nums">
                <div className="text-[10px] text-slate-500">Spread Mult.</div>
                <div className="mt-0.5 text-sm font-bold text-amber-700">
                  {metrics.spread_rate_multiplier}×
                </div>
                <div className="text-[9px] text-slate-400">vs ISS 21%/14.7</div>
              </div>
            </div>
          )}

          {/* FIG 2.1: Main Flammability Boundary Curve */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FC3D21]">
                  FIG 2.1 · NASA FLAMMABILITY BOUNDARY ENVELOPE (O2% VS. FORCED AIRFLOW 0–40 CM/S)
                </div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Flame className="h-4 w-4 text-[#FC3D21]" />
                  BASS-II Goldilocks Minimum-LOC Trough (~10 cm/s) &amp; ACME E-FIELD 0g–1g Bounding Band
                </h4>
                <p className="text-xs text-slate-500">
                  Shaded blue band = 0g–1g ACME E-FIELD partial-gravity bounding envelope · Shaded amber zone = 4–18 cm/s Goldilocks upstream-spread hazard
                </p>
              </div>
              <div className="flex flex-wrap gap-3 font-mono text-[10px]">
                <span className="font-semibold text-[#FC3D21]">― 0g LOC (BASS-II)</span>
                <span className="font-semibold text-[#0B3D91]">― Target ({habitatState.gravity_target})</span>
                <span className="text-slate-500">- - 1g LOC / Test 1 (21%)</span>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curve} margin={{ top: 15, right: 20, left: 0, bottom: 15 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <ReferenceArea
                    x1={4}
                    x2={18}
                    fill="#F59E0B"
                    fillOpacity={0.11}
                    label={{
                      value: 'Goldilocks Hazard Zone (4–18 cm/s)',
                      position: 'insideTop',
                      fill: '#B45309',
                      fontSize: 10,
                    }}
                  />
                  <XAxis
                    dataKey="airflow_cms"
                    stroke="#64748B"
                    fontSize={11}
                    label={{
                      value: 'Forced Airflow Velocity (cm/s) — BASS-II Peak Hazard ~10 cm/s',
                      position: 'insideBottom',
                      offset: -8,
                      fill: '#475569',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    domain={[12, Math.max(40, Math.ceil(habitatState.o2_pct + 4))]}
                    stroke="#64748B"
                    fontSize={11}
                    label={{
                      value: 'O2 Concentration (%)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#475569',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      color: '#0F172A',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    formatter={(value, name) => {
                      if (Array.isArray(value)) return [`${value[0]}% – ${value[1]}%`, '0g–1g Bounding Band'];
                      return [`${value}% O2`, name];
                    }}
                    labelFormatter={(v) => `Airflow: ${v} cm/s (${habitatState.pressure_psia} psia)`}
                  />
                  <Area
                    type="monotone"
                    dataKey="envelope_band"
                    stroke="none"
                    fill="#0B3D91"
                    fillOpacity={0.12}
                    name="0g–1g Bounding Band"
                  />
                  <ReferenceLine
                    y={21}
                    stroke="#64748B"
                    strokeDasharray="5 5"
                    label={{
                      value: 'NASA-STD-6001 Test 1 (21% O2)',
                      position: 'insideTopRight',
                      fill: '#475569',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine x={10} stroke="#D97706" strokeDasharray="3 3" strokeOpacity={0.75} />
                  <Line
                    type="monotone"
                    dataKey="loc_0g_pct"
                    stroke="#FC3D21"
                    strokeWidth={2.5}
                    dot={false}
                    name="0g LOC (BASS-II)"
                  />
                  <Line
                    type="monotone"
                    dataKey="loc_1g_pct"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="1g Baseline LOC"
                  />
                  <Line
                    type="monotone"
                    dataKey="loc_target_pct"
                    stroke="#0B3D91"
                    strokeWidth={2.5}
                    dot={false}
                    name={`Target ${habitatState.gravity_target} LOC`}
                  />
                  <ReferenceDot
                    x={Math.round(habitatState.airflow_cms / 2) * 2}
                    y={habitatState.o2_pct}
                    r={7}
                    fill="#FC3D21"
                    stroke="#FFFFFF"
                    strokeWidth={2.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* FIG 2.3: EVA Pre-Breathe vs Flammability Multiplier Trade-Off */}
          {simData?.prebreathe_tradeoff?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0B3D91]">
                    FIG 2.3 · CREW EVA PRE-BREATHE DURATION VS. FLAME SPREAD MULTIPLIER
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Decompression-Sickness Pre-Breathe Benefit vs. Fire Acceleration Penalty Across NASA SEA Regimes
                  </h4>
                </div>
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-800">
                  SEA Design Trade-Off
                </span>
              </div>
              <div className="h-[195px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={simData.prebreathe_tradeoff}
                    margin={{ top: 8, right: 16, left: -10, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                    <XAxis dataKey="regime" stroke="#64748B" fontSize={10} />
                    <YAxis yAxisId="left" stroke="#0B3D91" fontSize={10} />
                    <YAxis yAxisId="right" orientation="right" stroke="#FC3D21" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#CBD5E1',
                        borderRadius: '8px',
                        color: '#0F172A',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="est_prebreathe_min"
                      name="Est. EVA Pre-Breathe (min)"
                      fill="#0B3D91"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="spread_multiplier"
                      name="Relative Spread Multiplier (×)"
                      stroke="#FC3D21"
                      strokeWidth={2.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE 2.1: Interactive Exploration Atmosphere Quantitative Reference Matrix */}
      {presets.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FC3D21]">
                TABLE 2.1 · NASA EXPLORATION ATMOSPHERE QUANTITATIVE REFERENCE MATRIX
              </div>
              <h4 className="text-sm font-semibold text-slate-900">
                Exact NASA PSI Atmospheric Test Points (Click Any Row to Load into Modeler)
              </h4>
            </div>
            <CopyButton text={seaMarkdown} label="Copy Table Markdown" size="sm" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[780px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#0B3D91] font-mono text-[10px] uppercase text-white">
                  <th className="p-2.5">Habitat / Regime</th>
                  <th className="p-2.5">Pressure</th>
                  <th className="p-2.5">O2%</th>
                  <th className="p-2.5">N2% Diluent</th>
                  <th className="p-2.5">pO2 (psia)</th>
                  <th className="p-2.5">Flow</th>
                  <th className="p-2.5">Gravity</th>
                  <th className="p-2.5">Primary NASA PSI Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px] tabular-nums">
                {presets.map((p) => {
                  const active =
                    Math.abs(habitatState.o2_pct - p.o2_pct) < 0.2 &&
                    Math.abs(habitatState.pressure_psia - p.pressure_psia) < 0.2;
                  const po2 = (p.pressure_psia * (p.o2_pct / 100)).toFixed(2);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className={`cursor-pointer transition ${
                        active ? 'bg-[#0B3D91]/8 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-2.5 font-sans font-semibold text-slate-900">{p.label}</td>
                      <td className="p-2.5 text-[#0B3D91]">{p.pressure_psia} psia</td>
                      <td className="p-2.5 font-bold text-[#FC3D21]">{p.o2_pct}%</td>
                      <td className="p-2.5 text-slate-600">{(100 - p.o2_pct).toFixed(1)}%</td>
                      <td className="p-2.5 text-slate-800">{po2} psia</td>
                      <td className="p-2.5 text-emerald-700">{p.airflow_cms} cm/s</td>
                      <td className="p-2.5 text-slate-700">{p.gravity_target}</td>
                      <td className="p-2.5 font-sans text-[11px] text-slate-600">{p.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warnings + Ranked Evidence */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <h4 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#0B3D91]">
            <ShieldAlert className="h-4 w-4 text-[#FC3D21]" />
            Active Habitat Safety Advisories &amp; Suppressant Warnings
          </h4>
          <div className="space-y-2.5">
            {(simData?.warnings || []).map((w) => (
              <div
                key={w.code}
                className={`rounded-lg border p-3.5 ${
                  w.severity === 'CRITICAL'
                    ? 'border-[#FC3D21]/30 bg-[#FC3D21]/5'
                    : w.severity === 'HIGH'
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-sky-200 bg-sky-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    {w.severity === 'ADVISORY' ? (
                      <Info className="h-3.5 w-3.5 text-[#0B3D91]" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-[#FC3D21]" />
                    )}
                    {w.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <CopyButton text={`${w.title} (${w.severity}): ${w.detail} ${w.citation}`} label="Grab" />
                    <span className="font-mono text-[10px] font-semibold text-slate-600">{w.severity}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">{w.detail}</p>
                <div className="mt-1.5 font-mono text-[10px] text-[#0B3D91]">{w.citation}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0B3D91]">
            Top Matching PSI Evidence
          </h4>
          <div className="space-y-2.5">
            {(simData?.ranked_evidence || []).map((ev) => (
              <div key={ev.study.study_id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0B3D91]">
                    {ev.study.study_id} · {ev.study.acronym}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-emerald-700">
                    Match {(ev.total_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-900">{ev.study.title}</div>
                <div className="mt-1 font-mono text-[10px] text-slate-500">
                  {ev.study.o2_range} · {ev.study.pressure_psia} · {ev.study.airflow_cm_s}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-500">{ev.study.doi}</span>
                  <div className="flex items-center gap-1.5">
                    <CopyButton
                      text={`[${ev.study.study_id} | ${ev.study.acronym} | ${ev.study.doi}]`}
                      label="Cite"
                    />
                    {onInspectStudy && (
                      <button
                        onClick={() => onInspectStudy(ev.study.study_id)}
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-medium text-[#0B3D91] hover:border-[#0B3D91]"
                      >
                        Inspect →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
