import { useEffect, useState } from 'react';
import {
  AlertTriangle,
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
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';
import FlameVisualizer from './FlameVisualizer';

const GRAVITY_OPTIONS = [
  { id: '0g', label: '0g ISS Microgravity' },
  { id: '1/6g', label: '1/6g Moon Base' },
  { id: '3/8g', label: '3/8g Mars Habitat' },
  { id: '1g', label: '1g Earth Baseline' },
];

const RISK_STYLE = {
  CRITICAL: 'border-[#FC3D21]/60 bg-[#FC3D21]/15 text-[#FF8A75]',
  HIGH: 'border-amber-500/60 bg-amber-500/15 text-amber-300',
  MODERATE: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
  'LOW (Sub-Limit)': 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
};

export default function SimulatorTab({ habitatState, setHabitatState, onInspectStudy }) {
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

  return (
    <div className="space-y-6">
      {/* NASA Exploration Atmosphere Presets */}
      <div className="rounded-lg border border-[#1C2B47] bg-[#0D1526] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-xs font-semibold uppercase tracking-wider text-sky-300">
            NASA Exploration Atmosphere &amp; Flight Test Presets (PSI-20 BRE &amp; PSI-159 CFI-G)
          </div>
          {loading && <span className="font-mono text-xs text-sky-400">Simulating...</span>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {presets.map((p) => {
            const active =
              Math.abs(habitatState.o2_pct - p.o2_pct) < 0.2 &&
              Math.abs(habitatState.pressure_psia - p.pressure_psia) < 0.2;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`rounded-md border p-2.5 text-left transition ${
                  active
                    ? 'border-[#3B82F6] bg-[#0B3D91]/70 shadow-[inset_0_-2px_0_#FC3D21]'
                    : 'border-[#1C2B47] bg-[#070D19] hover:border-[#2C436E]'
                }`}
              >
                <div className="text-xs font-semibold text-white">{p.label}</div>
                <div className="mt-1 font-mono text-[11px] text-[#38BDF8]">
                  {p.pressure_psia} psia · {p.o2_pct}% O2
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {p.gravity_target} · {p.airflow_cms} cm/s
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls + Flammability Regime Chart */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Controls Panel */}
        <div className="space-y-4 rounded-lg border border-[#1C2B47] bg-[#0D1526] p-5 xl:col-span-4">
          <h3 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-sky-300">
            <Gauge className="h-4 w-4 text-[#38BDF8]" />
            Habitat Environment Controls
          </h3>

          {/* O2 Slider */}
          <div className="space-y-1.5 rounded-md border border-[#1C2B47] bg-[#070D19] p-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-300">Oxygen Concentration (O2%)</span>
              <span className="font-bold text-[#FF7A66]">{habitatState.o2_pct.toFixed(1)}%</span>
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
            <div className="flex justify-between font-mono text-[10px] text-slate-500">
              <span>17% (Vitiated)</span>
              <span>21% ISS</span>
              <span>34% Lunar SEA</span>
              <span>85% CFI-G</span>
            </div>
          </div>

          {/* Pressure Slider */}
          <div className="space-y-1.5 rounded-md border border-[#1C2B47] bg-[#070D19] p-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-300">Cabin Pressure (psia)</span>
              <span className="font-bold text-[#38BDF8]">{habitatState.pressure_psia.toFixed(1)} psia</span>
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
              className="w-full accent-[#1D63DC]"
            />
            <div className="flex justify-between font-mono text-[10px] text-slate-500">
              <span>4.3 EVA</span>
              <span>8.2 Lunar</span>
              <span>10.2 Interm.</span>
              <span>14.7 Earth</span>
            </div>
          </div>

          {/* Airflow Slider */}
          <div className="space-y-1.5 rounded-md border border-[#1C2B47] bg-[#070D19] p-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="flex items-center gap-1 text-slate-300">
                <Wind className="h-3.5 w-3.5 text-emerald-400" /> Forced Airflow (cm/s)
              </span>
              <span className="font-bold text-emerald-400">{habitatState.airflow_cms.toFixed(0)} cm/s</span>
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
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between font-mono text-[10px] text-slate-500">
              <span>0 Quiescent</span>
              <span className="text-amber-400">~10 Goldilocks</span>
              <span>20–30 SAFFIRE</span>
              <span>40 Max</span>
            </div>
          </div>

          {/* Gravity Target */}
          <div className="space-y-2 rounded-md border border-[#1C2B47] bg-[#070D19] p-3">
            <div className="font-mono text-xs text-slate-300">Gravity Target</div>
            <div className="grid grid-cols-2 gap-1.5">
              {GRAVITY_OPTIONS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setHabitatState((s) => ({ ...s, gravity_target: g.id }))}
                  className={`rounded border px-2.5 py-1.5 font-mono text-[11px] transition ${
                    habitatState.gravity_target === g.id
                      ? 'border-[#3B82F6] bg-[#0B3D91] text-white'
                      : 'border-[#1C2B47] bg-[#0D1526] text-slate-400 hover:border-[#2C436E]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {metrics && (
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-amber-300/90">
                {metrics.flight_data_status}
              </p>
            )}
          </div>

          <FlameVisualizer
            o2Pct={habitatState.o2_pct}
            pressurePsia={habitatState.pressure_psia}
            airflowCms={habitatState.airflow_cms}
            gravityTarget={habitatState.gravity_target}
          />
        </div>

        {/* Flammability Regime Chart + Live KPIs */}
        <div className="space-y-4 rounded-lg border border-[#1C2B47] bg-[#0D1526] p-5 xl:col-span-8">
          {/* KPIs */}
          {metrics && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className={`rounded-lg border p-3 ${RISK_STYLE[metrics.risk_level] || 'border-slate-700'}`}>
                <div className="font-mono text-[10px] uppercase opacity-80">Fire Risk</div>
                <div className="mt-0.5 font-mono text-sm font-bold">{metrics.risk_level}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                <div className="font-mono text-[10px] text-slate-400">pO2 Partial</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-slate-100">
                  {simData.operating_point.po2_psia} psia
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                <div className="font-mono text-[10px] text-slate-400">0g LOC Limit</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-orange-300">
                  {metrics.loc_0g_pct}% O2
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                <div className="font-mono text-[10px] text-slate-400">Target Gravity LOC</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-sky-300">
                  {metrics.loc_target_pct}% O2
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3">
                <div className="font-mono text-[10px] text-slate-400">Spread Multiplier</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-amber-300">
                  {metrics.spread_rate_multiplier}×
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Flame className="h-4 w-4 text-orange-400" />
                  NASA Flammability Boundary Curve: O2% vs. Forced Flow Velocity (0–40 cm/s)
                </h4>
                <p className="font-mono text-[11px] text-slate-400">
                  Shaded band = 0g–1g ACME E-FIELD partial-gravity bounding envelope · Live Operating Point plotted
                </p>
              </div>
              <div className="flex flex-wrap gap-3 font-mono text-[10px]">
                <span className="text-orange-400">― 0g LOC (BASS-II)</span>
                <span className="text-sky-400">― Target ({habitatState.gravity_target})</span>
                <span className="text-slate-400">- - 1g Test 1 (21%)</span>
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curve} margin={{ top: 15, right: 20, left: 0, bottom: 15 }}>
                  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="airflow_cms"
                    stroke="#94A3B8"
                    fontSize={11}
                    label={{
                      value: 'Forced Airflow Velocity (cm/s) — BASS-II Goldilocks Valley ~10 cm/s',
                      position: 'insideBottom',
                      offset: -8,
                      fill: '#94A3B8',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    domain={[12, Math.max(40, Math.ceil(habitatState.o2_pct + 4))]}
                    stroke="#94A3B8"
                    fontSize={11}
                    label={{
                      value: 'O2 Concentration (%)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#94A3B8',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    formatter={(value, name) => {
                      if (Array.isArray(value)) return [`${value[0]}% – ${value[1]}%`, '0g–1g Bounding Band'];
                      return [`${value}% O2`, name];
                    }}
                    labelFormatter={(v) => `Airflow: ${v} cm/s`}
                  />
                  {/* 0g-1g Bounding Envelope */}
                  <Area
                    type="monotone"
                    dataKey="envelope_band"
                    stroke="none"
                    fill="#38BDF8"
                    fillOpacity={0.16}
                    name="0g–1g Bounding Band"
                  />
                  {/* NASA-STD-6001 Test 1 21% line */}
                  <ReferenceLine
                    y={21}
                    stroke="#64748B"
                    strokeDasharray="5 5"
                    label={{
                      value: 'NASA-STD-6001 Test 1 (21% O2)',
                      position: 'insideTopRight',
                      fill: '#94A3B8',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    x={10}
                    stroke="#F59E0B"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
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
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    dot={false}
                    name={`Target ${habitatState.gravity_target} LOC`}
                  />
                  {/* Live Operating Point */}
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

          {/* EVA Pre-Breathe vs Flammability Multiplier Trade-Off */}
          {simData?.prebreathe_tradeoff?.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-100">
                    Spacesuit EVA Pre-Breathe Trade-Off vs. Fire Hazard Multiplier
                  </h4>
                  <p className="font-mono text-[10px] text-slate-400">
                    Why Moon Bases sit at ≥30% O2 &amp; ≤10.2 psia: cutting decompression-sickness pre-breathe raises flame hazard
                  </p>
                </div>
                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  SEA Design Dilemma
                </span>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={simData.prebreathe_tradeoff}
                    margin={{ top: 8, right: 16, left: -10, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                    <XAxis dataKey="regime" stroke="#94A3B8" fontSize={10} />
                    <YAxis yAxisId="left" stroke="#38BDF8" fontSize={10} />
                    <YAxis yAxisId="right" orientation="right" stroke="#F97316" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                    <Bar
                      yAxisId="left"
                      dataKey="est_prebreathe_min"
                      name="Est. EVA Pre-Breathe (min)"
                      fill="#38BDF8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="spread_multiplier"
                      name="Relative Spread Multiplier (×)"
                      stroke="#F97316"
                      strokeWidth={2.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warnings + Ranked Evidence */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-3 rounded-xl border border-slate-800 bg-[#111827] p-5 lg:col-span-7">
          <h4 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-amber-300">
            <ShieldAlert className="h-4 w-4" />
            Active Habitat Safety Advisories &amp; Suppressant Warnings
          </h4>
          <div className="space-y-2.5">
            {(simData?.warnings || []).map((w) => (
              <div
                key={w.code}
                className={`rounded-lg border p-3 ${
                  w.severity === 'CRITICAL'
                    ? 'border-red-500/40 bg-red-500/10'
                    : w.severity === 'HIGH'
                      ? 'border-orange-500/40 bg-orange-500/10'
                      : 'border-sky-500/30 bg-sky-500/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
                    {w.severity === 'ADVISORY' ? (
                      <Info className="h-3.5 w-3.5 text-sky-400" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                    )}
                    {w.title}
                  </span>
                  <span className="font-mono text-[10px] text-slate-300">{w.severity}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{w.detail}</p>
                <div className="mt-1.5 font-mono text-[10px] text-amber-300">{w.citation}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-[#111827] p-5 lg:col-span-5">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-sky-300">
            Top Matching PSI Evidence for This Operating Point
          </h4>
          <div className="space-y-2.5">
            {(simData?.ranked_evidence || []).map((ev) => (
              <div
                key={ev.study.study_id}
                className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-orange-300">
                    {ev.study.study_id} · {ev.study.acronym}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    Match {(ev.total_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-200">{ev.study.title}</div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  {ev.study.o2_range} · {ev.study.pressure_psia} · {ev.study.airflow_cm_s}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-sky-400">{ev.study.doi}</span>
                  {onInspectStudy && (
                    <button
                      onClick={() => onInspectStudy(ev.study.study_id)}
                      className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-200 hover:bg-slate-700"
                    >
                      Inspect Study →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

