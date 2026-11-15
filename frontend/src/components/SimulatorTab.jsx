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
  CRITICAL: 'border-[#FC3D21]/40 bg-[#FC3D21]/10 text-[#C8230A]',
  HIGH: 'border-amber-300 bg-amber-50 text-amber-800',
  MODERATE: 'border-sky-300 bg-sky-50 text-sky-800',
  'LOW (Sub-Limit)': 'border-emerald-300 bg-emerald-50 text-emerald-800',
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
    <div className="space-y-5">
      {/* NASA Exploration Atmosphere Presets */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-xs font-semibold uppercase tracking-wider text-[#0B3D91]">
            NASA Exploration Atmosphere Presets (PSI-20 BRE &amp; PSI-159 CFI-G)
          </div>
          {loading && <span className="font-mono text-xs text-[#0B3D91]">Simulating...</span>}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {presets.map((p) => {
            const active =
              Math.abs(habitatState.o2_pct - p.o2_pct) < 0.2 &&
              Math.abs(habitatState.pressure_psia - p.pressure_psia) < 0.2;
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
                <div className={`mt-1 font-mono text-[11px] ${active ? 'text-sky-200' : 'text-[#0B3D91]'}`}>
                  {p.pressure_psia} psia · {p.o2_pct}% O2
                </div>
                <div className={`mt-0.5 font-mono text-[10px] ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                  {p.gravity_target} · {p.airflow_cms} cm/s
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
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-700">Oxygen (O2%)</span>
              <span className="font-bold text-[#FC3D21]">{habitatState.o2_pct.toFixed(1)}%</span>
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
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-slate-700">Pressure (psia)</span>
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
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="flex items-center gap-1 text-slate-700">
                <Wind className="h-3.5 w-3.5 text-emerald-600" /> Airflow (cm/s)
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
              <span className="text-amber-700">~10 Goldilocks</span>
              <span>20–30 SAFFIRE</span>
              <span>40</span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <div className="font-mono text-xs text-slate-700">Gravity Target</div>
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

          <FlameVisualizer
            o2Pct={habitatState.o2_pct}
            pressurePsia={habitatState.pressure_psia}
            airflowCms={habitatState.airflow_cms}
            gravityTarget={habitatState.gravity_target}
          />
        </div>

        {/* Charts + KPIs */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-8">
          {metrics && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className={`rounded-lg border p-3 ${RISK_STYLE[metrics.risk_level] || 'border-slate-200'}`}>
                <div className="font-mono text-[10px] uppercase opacity-80">Fire Risk</div>
                <div className="mt-0.5 font-mono text-sm font-bold">{metrics.risk_level}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="font-mono text-[10px] text-slate-500">pO2 Partial</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                  {simData.operating_point.po2_psia} psia
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="font-mono text-[10px] text-slate-500">0g LOC Limit</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-[#FC3D21]">
                  {metrics.loc_0g_pct}% O2
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="font-mono text-[10px] text-slate-500">Target LOC</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-[#0B3D91]">
                  {metrics.loc_target_pct}% O2
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="font-mono text-[10px] text-slate-500">Spread Mult.</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-amber-700">
                  {metrics.spread_rate_multiplier}×
                </div>
              </div>
            </div>
          )}

          {/* Main Flammability Boundary Curve */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Flame className="h-4 w-4 text-[#FC3D21]" />
                  NASA Flammability Boundary Curve: O2% vs. Forced Flow Velocity (0–40 cm/s)
                </h4>
                <p className="text-xs text-slate-500">
                  Shaded band = 0g–1g ACME E-FIELD partial-gravity bounding envelope · Red dot = Live Operating Point
                </p>
              </div>
              <div className="flex flex-wrap gap-3 font-mono text-[10px]">
                <span className="font-semibold text-[#FC3D21]">― 0g LOC (BASS-II)</span>
                <span className="font-semibold text-[#0B3D91]">― Target ({habitatState.gravity_target})</span>
                <span className="text-slate-500">- - 1g Test 1 (21%)</span>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curve} margin={{ top: 15, right: 20, left: 0, bottom: 15 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="airflow_cms"
                    stroke="#64748B"
                    fontSize={11}
                    label={{
                      value: 'Forced Airflow Velocity (cm/s) — BASS-II Goldilocks Valley ~10 cm/s',
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
                    labelFormatter={(v) => `Airflow: ${v} cm/s`}
                  />
                  <Area
                    type="monotone"
                    dataKey="envelope_band"
                    stroke="none"
                    fill="#0B3D91"
                    fillOpacity={0.1}
                    name="0g–1g Bounding Band"
                  />
                  <ReferenceLine
                    y={21}
                    stroke="#94A3B8"
                    strokeDasharray="5 5"
                    label={{
                      value: 'NASA-STD-6001 Test 1 (21% O2)',
                      position: 'insideTopRight',
                      fill: '#475569',
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine x={10} stroke="#F59E0B" strokeDasharray="3 3" strokeOpacity={0.6} />
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

          {/* EVA Pre-Breathe vs Flammability Multiplier Trade-Off */}
          {simData?.prebreathe_tradeoff?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">
                    Spacesuit EVA Pre-Breathe Trade-Off vs. Fire Hazard Multiplier
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cutting decompression-sickness pre-breathe time by raising O2% (≥30% O2, ≤10.2 psia) sharply amplifies flame spread
                  </p>
                </div>
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-800">
                  SEA Design Trade-Off
                </span>
              </div>
              <div className="h-[190px] w-full">
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
                  <span className="font-mono text-[10px] font-semibold text-slate-600">{w.severity}</span>
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
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-slate-500">{ev.study.doi}</span>
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
