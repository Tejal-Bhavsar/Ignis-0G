import { useEffect, useState } from 'react';
import {
  Activity,
  Droplets,
  EyeOff,
  FlameKindling,
  Microscope,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../api';

const RATING_BADGE = {
  'Recommended (ISS Standard)': 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  'Caution (Jet Entrainment Risk)': 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  'Legacy (Being Replaced on ISS)': 'border-red-500/40 bg-red-500/15 text-red-300',
  'Research / Specialty Diluent': 'border-sky-500/40 bg-sky-500/15 text-sky-300',
};

export default function DetectionSuppressionTab({ onInspectStudy }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .detectionSuppression()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center font-mono text-xs text-slate-400">
        Loading SAME/DAFT &amp; FLEX-2/BASS-II Detection &amp; Suppression Intelligence...
      </div>
    );
  }

  const { aerosol_detection, cool_flames_reignition, suppression_tradeoffs } = data;

  return (
    <div className="space-y-6">
      {/* Section 1: SAME / DAFT Smoke vs Dust Signatures */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5 shadow-lg">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Microscope className="h-4 w-4 text-sky-400" />
              Aerosol Smoke vs. Lunar Regolith / Arizona Red Dust Signatures (SAME &amp; DAFT-2)
            </h3>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              {aerosol_detection.source} · Ionization (~d) vs. Photoelectric (~d³) 0.2 µm (200 nm) Crossover
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['PSI-47', 'PSI-102', 'PDF-SAMER'].map((sid) => (
              <button
                key={sid}
                onClick={() => onInspectStudy?.(sid)}
                className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-300 hover:bg-sky-500/20"
              >
                {sid}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Chart A: Detector Response Crossover */}
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4 lg:col-span-7">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-200">
                Detector Sensitivity vs. Particle Diameter (nm)
              </span>
              <span className="font-mono text-[10px] text-amber-300">
                0.2 µm (200 nm) Crossover
              </span>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={aerosol_detection.detector_response_curve}
                  margin={{ top: 10, right: 16, left: -10, bottom: 10 }}
                >
                  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                  <XAxis dataKey="diameter_nm" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[0, 1]} stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    labelFormatter={(v) => `Diameter: ${v} nm`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                  <ReferenceLine
                    x={200}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{ value: '0.2 µm', position: 'top', fill: '#F59E0B', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ionization_resp"
                    name="Ionization (~d)"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="photoelectric_resp"
                    name="Photoelectric Scattering (~d³)"
                    stroke="#F97316"
                    strokeWidth={2.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart B: Table 1-2 Low-g vs 1g Smoke Diameters */}
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4 lg:col-span-5">
            <div className="mb-2 font-mono text-xs font-semibold text-slate-200">
              SAME EIRD Table 1-2: 0g vs 1g Particle Growth (nm)
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={aerosol_detection.particulate_comparison}
                  margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                >
                  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                  <XAxis dataKey="material" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
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
                  <Bar dataKey="one_g_primary_nm" name="1g Primary (nm)" fill="#64748B" />
                  <Bar dataKey="low_g_primary_nm" name="0g Primary (nm)" fill="#38BDF8" />
                  <Bar dataKey="one_g_aggregate_nm" name="1g Aggregate (nm)" fill="#F59E0B" />
                  <Bar dataKey="low_g_aggregate_nm" name="0g Aggregate (nm)" fill="#F97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* DAFT-2 P-Trak & ARD Dust Details */}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-sky-300">
              <Radio className="h-3.5 w-3.5" /> TSI P-Trak Capillary Modification (PSI-47)
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {aerosol_detection.dust_vs_smoke_challenge.ptrak_modification}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-amber-300">
              <Activity className="h-3.5 w-3.5" /> Arizona Red Dust (ARD) Regolith Analog
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {aerosol_detection.dust_vs_smoke_challenge.ard_test_standard}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-orange-300">
              <ShieldCheck className="h-3.5 w-3.5" /> 0g Coagulation &amp; False-Alarm Physics
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {aerosol_detection.dust_vs_smoke_challenge.coagulation_shift}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Cool-Flame Re-Ignition Risks */}
      <div className="rounded-xl border border-purple-500/30 bg-[#111827] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <EyeOff className="h-4 w-4 text-purple-400" />
            Invisible Cool-Flame Persistence &amp; Re-Ignition Risk (CFI, FLEX-2, ACME CFI-G)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {['PSI-39', 'PSI-68', 'PSI-159'].map((sid) => (
              <button
                key={sid}
                onClick={() => onInspectStudy?.(sid)}
                className="rounded border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-300 hover:bg-purple-500/20"
              >
                {sid}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-200">
          {cool_flames_reignition.summary}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-purple-300">
              <FlameKindling className="h-3.5 w-3.5" /> Verified Cool-Flame Fuels in PSI
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {cool_flames_reignition.fuels_tested.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase text-red-300">
              Crew Fire-Out Verification Imperatives
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {cool_flames_reignition.operational_implications.map((imp) => (
                <li key={imp}>• {imp}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Suppression Agent Trade-Offs */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Droplets className="h-4 w-4 text-emerald-400" />
          Spacecraft Fire Suppression Agent Trade-Off Matrix (N2, CO2, Helium, Water Mist)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B0F19] font-mono text-[11px] uppercase text-slate-400">
                <th className="p-3">Agent</th>
                <th className="p-3">Mechanism</th>
                <th className="p-3">0g Microgravity Behavior</th>
                <th className="p-3">Crew / ECLSS Impact</th>
                <th className="p-3">Status &amp; Citation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-[#0E1422]">
              {suppression_tradeoffs.map((row) => (
                <tr key={row.agent}>
                  <td className="p-3 font-semibold text-slate-100">{row.agent}</td>
                  <td className="p-3 text-slate-300">{row.mechanism}</td>
                  <td className="p-3 leading-relaxed text-slate-300">{row.microgravity_behavior}</td>
                  <td className="p-3 leading-relaxed text-slate-300">{row.toxicity_eclss_impact}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] ${RATING_BADGE[row.rating] || 'border-slate-700 text-slate-300'}`}>
                      {row.rating}
                    </span>
                    <div className="mt-1.5 font-mono text-[10px] text-amber-300">{row.citation}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
