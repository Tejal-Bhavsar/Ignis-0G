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
  'Recommended (ISS Standard)': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'Caution (Jet Entrainment Risk)': 'border-amber-200 bg-amber-50 text-amber-800',
  'Legacy (Being Replaced on ISS)': 'border-red-200 bg-red-50 text-red-800',
  'Research / Specialty Diluent': 'border-sky-200 bg-sky-50 text-sky-800',
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
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center font-mono text-xs text-slate-500">
        Loading SAME/DAFT &amp; FLEX-2/BASS-II Detection &amp; Suppression Intelligence...
      </div>
    );
  }

  const { aerosol_detection, cool_flames_reignition, suppression_tradeoffs } = data;

  return (
    <div className="space-y-5">
      {/* Section 1: SAME / DAFT Smoke vs Dust Signatures */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Microscope className="h-4 w-4 text-[#0B3D91]" />
              Aerosol Smoke vs. Lunar Regolith / Arizona Red Dust Signatures (SAME &amp; DAFT-2)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {aerosol_detection.source} · Ionization (~d) vs. Photoelectric (~d³) 0.2 µm (200 nm) Crossover
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['PSI-47', 'PSI-102', 'PDF-SAMER'].map((sid) => (
              <button
                key={sid}
                onClick={() => onInspectStudy?.(sid)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-medium text-[#0B3D91] hover:border-[#0B3D91]"
              >
                {sid}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 lg:col-span-7">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-800">
                Detector Sensitivity vs. Particle Diameter (nm)
              </span>
              <span className="font-mono text-[10px] font-medium text-amber-700">
                0.2 µm (200 nm) Crossover
              </span>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={aerosol_detection.detector_response_curve}
                  margin={{ top: 10, right: 16, left: -10, bottom: 10 }}
                >
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="diameter_nm" stroke="#64748B" fontSize={11} />
                  <YAxis domain={[0, 1]} stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '8px',
                      color: '#0F172A',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    labelFormatter={(v) => `Diameter: ${v} nm`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                  <ReferenceLine
                    x={200}
                    stroke="#D97706"
                    strokeDasharray="4 4"
                    label={{ value: '0.2 µm', position: 'top', fill: '#B45309', fontSize: 10 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ionization_resp"
                    name="Ionization (~d)"
                    stroke="#0B3D91"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="photoelectric_resp"
                    name="Photoelectric Scattering (~d³)"
                    stroke="#FC3D21"
                    strokeWidth={2.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 lg:col-span-5">
            <div className="mb-2 font-mono text-xs font-semibold text-slate-800">
              SAME EIRD Table 1-2: 0g vs 1g Particle Growth (nm)
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={aerosol_detection.particulate_comparison}
                  margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                >
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="material" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
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
                  <Bar dataKey="one_g_primary_nm" name="1g Primary (nm)" fill="#94A3B8" />
                  <Bar dataKey="low_g_primary_nm" name="0g Primary (nm)" fill="#0B3D91" />
                  <Bar dataKey="one_g_aggregate_nm" name="1g Aggregate (nm)" fill="#F59E0B" />
                  <Bar dataKey="low_g_aggregate_nm" name="0g Aggregate (nm)" fill="#FC3D21" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#0B3D91]">
              <Radio className="h-3.5 w-3.5" /> TSI P-Trak Capillary Mod (PSI-47)
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {aerosol_detection.dust_vs_smoke_challenge.ptrak_modification}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-amber-800">
              <Activity className="h-3.5 w-3.5" /> Arizona Red Dust (ARD) Standard
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {aerosol_detection.dust_vs_smoke_challenge.ard_test_standard}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#FC3D21]">
              <ShieldCheck className="h-3.5 w-3.5" /> 0g Coagulation &amp; False Alarms
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {aerosol_detection.dust_vs_smoke_challenge.coagulation_shift}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Cool-Flame Re-Ignition Risks */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <EyeOff className="h-4 w-4 text-[#0B3D91]" />
            Invisible Cool-Flame Persistence &amp; Re-Ignition Risk (CFI, FLEX-2, ACME CFI-G)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {['PSI-39', 'PSI-68', 'PSI-159'].map((sid) => (
              <button
                key={sid}
                onClick={() => onInspectStudy?.(sid)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-medium text-[#0B3D91] hover:border-[#0B3D91]"
              >
                {sid}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-slate-700">
          {cool_flames_reignition.summary}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase text-[#0B3D91]">
              <FlameKindling className="h-3.5 w-3.5" /> Verified Cool-Flame Fuels in PSI
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {cool_flames_reignition.fuels_tested.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-[#FC3D21]/25 bg-[#FC3D21]/5 p-3.5">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase text-[#C8230A]">
              Crew Fire-Out Verification Imperatives
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {cool_flames_reignition.operational_implications.map((imp) => (
                <li key={imp}>• {imp}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3: Suppression Agent Trade-Offs */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Droplets className="h-4 w-4 text-[#0B3D91]" />
          Spacecraft Fire Suppression Agent Trade-Off Matrix (N2, CO2, Helium, Water Mist)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-mono text-[11px] uppercase text-slate-500">
                <th className="p-3">Agent</th>
                <th className="p-3">Mechanism</th>
                <th className="p-3">0g Microgravity Behavior</th>
                <th className="p-3">Crew / ECLSS Impact</th>
                <th className="p-3">Status &amp; Citation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {suppression_tradeoffs.map((row) => (
                <tr key={row.agent}>
                  <td className="p-3 font-semibold text-slate-900">{row.agent}</td>
                  <td className="p-3 text-slate-600">{row.mechanism}</td>
                  <td className="p-3 leading-relaxed text-slate-700">{row.microgravity_behavior}</td>
                  <td className="p-3 leading-relaxed text-slate-700">{row.toxicity_eclss_impact}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${RATING_BADGE[row.rating] || 'border-slate-200 text-slate-600'}`}>
                      {row.rating}
                    </span>
                    <div className="mt-1.5 font-mono text-[10px] text-[#0B3D91]">{row.citation}</div>
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
