import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
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
import CopyButton from './CopyButton';

const RATING_BADGE = {
  'Recommended (ISS Standard)': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'Caution (Jet Entrainment Risk)': 'border-amber-200 bg-amber-50 text-amber-800',
  'Legacy (Being Replaced on ISS)': 'border-red-200 bg-red-50 text-red-800',
  'Research / Specialty Diluent': 'border-sky-200 bg-sky-50 text-sky-800',
};

function buildParticulateMarkdown(rows) {
  if (!rows?.length) return '';
  const body = rows.map((r) => {
    const pRatio = (r.low_g_primary_nm / r.one_g_primary_nm).toFixed(2);
    const aRatio = (r.low_g_aggregate_nm / r.one_g_aggregate_nm).toFixed(2);
    const regime = r.low_g_aggregate_nm >= 200 ? 'Photoelectric (>0.2 µm)' : 'Ionization (<0.2 µm)';
    return `| ${r.material} | ${r.one_g_primary_nm} nm | ${r.low_g_primary_nm} nm | ${pRatio}x | ${r.one_g_aggregate_nm} nm | ${r.low_g_aggregate_nm} nm | ${aRatio}x | ${regime} |`;
  });
  return [
    '| Smoke Material | 1g Primary | 0g Primary | Primary 0g/1g | 1g Aggregate | 0g Aggregate | Aggregate 0g/1g | Dominant 0g Detector |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...body,
  ].join('\n');
}

function buildSuppressionMarkdown(rows) {
  if (!rows?.length) return '';
  const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');
  return [
    '| Agent | Mechanism | 0g Microgravity Behavior | Crew / ECLSS Impact | Rating | Citation |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${esc(r.agent)} | ${esc(r.mechanism)} | ${esc(r.microgravity_behavior)} | ${esc(r.toxicity_eclss_impact)} | ${esc(r.rating)} | ${esc(r.citation)} |`
    ),
  ].join('\n');
}

export default function DetectionSuppressionTab({ onInspectStudy, onAskSI }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .detectionSuppression()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const particulateMd = useMemo(
    () => buildParticulateMarkdown(data?.aerosol_detection?.particulate_comparison),
    [data]
  );
  const suppressionMd = useMemo(
    () => buildSuppressionMarkdown(data?.suppression_tradeoffs),
    [data]
  );

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
      {/* Top 4 Quantitative Detection & Suppression KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#0B3D91] bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Detector Crossover Threshold
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-slate-900">
            0.2 µm (200 nm)
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Ionization (~d) below 0.2 µm vs. Photoelectric (~d³) above
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-[#FC3D21] bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            0g Coagulation Shift (Candle)
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-slate-900">
            265 → 976 nm (3.68×)
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            SAME EIRD Table 1-2 · Kapton 35→223 nm, Teflon 75→136 nm
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Invisible Cool-Flame Temp
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-slate-900">
            ~500–800 K (227–527 °C)
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Persists after hot extinction; UV / OH* verification required
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 border-t-4 border-t-emerald-600 bg-white p-4 shadow-xs">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            ISS Extinguisher Standard
          </div>
          <div className="mt-1 font-display text-lg font-bold tabular-nums text-slate-900">
            Fine Water Mist (Dec 2015)
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Replaced legacy CO2 · Avoids N2 jet ~10 cm/s entrainment
          </p>
        </div>
      </div>

      {/* Section 1: SAME / DAFT Smoke vs Dust Signatures */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FC3D21]">
              FIG 3.1, FIG 3.2 &amp; TABLE 3.1 · AEROSOL DETECTION &amp; DUST DISCRIMINATION
            </div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Microscope className="h-4 w-4 text-[#0B3D91]" />
              Aerosol Smoke vs. Lunar Regolith / Arizona Red Dust Signatures (SAME &amp; DAFT-2)
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {aerosol_detection.source} · {aerosol_detection.detector_physics?.ionization} · {aerosol_detection.detector_physics?.photoelectric}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {['PSI-47', 'PSI-102', 'PDF-SAMER'].map((sid) => (
              <button
                key={sid}
                onClick={() => onInspectStudy?.(sid)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-medium text-[#0B3D91] hover:border-[#0B3D91]"
              >
                {sid}
              </button>
            ))}
            {onAskSI && (
              <button
                onClick={() =>
                  onAskSI(
                    'Compare ionization (~d) and photoelectric (~d^3) smoke detectors above vs below 0.2 um using SAME, SAME-R, and DAFT-2.'
                  )
                }
                className="inline-flex items-center gap-1 rounded bg-[#0B3D91] px-2 py-0.5 font-mono text-[10px] font-semibold text-white hover:bg-[#092F70]"
              >
                <Bot className="h-3 w-3" /> Ask SI
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 lg:col-span-7">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-slate-800">
                FIG 3.1 · Detector Sensitivity vs. Particle Diameter (nm)
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
                  <XAxis dataKey="diameter_nm" stroke="#64748B" fontSize={11} unit=" nm" />
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
                    labelFormatter={(v, payload) => {
                      const reg = payload?.[0]?.payload?.regime;
                      return `${v} nm${reg ? ` — ${reg}` : ''}`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono' }} />
                  <ReferenceLine
                    x={200}
                    stroke="#D97706"
                    strokeDasharray="4 4"
                    label={{ value: '0.2 µm Crossover', position: 'top', fill: '#B45309', fontSize: 10 }}
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
              FIG 3.2 · SAME EIRD Table 1-2: 0g vs 1g Particle Growth (nm)
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={aerosol_detection.particulate_comparison}
                  margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                >
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="material" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} unit=" nm" />
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

        {/* TABLE 3.1 Exact Particulate Numbers */}
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase text-[#0B3D91]">
              TABLE 3.1 · SAME EIRD TABLE 1-2 EXACT AEROSOL DIAMETER MEASUREMENTS (1g vs. 0g)
            </span>
            <CopyButton text={particulateMd} label="Copy Table Markdown" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#0B3D91] font-mono text-[10px] uppercase text-white">
                  <th className="p-2.5">Material</th>
                  <th className="p-2.5">1g Primary</th>
                  <th className="p-2.5">0g Primary</th>
                  <th className="p-2.5">Primary 0g/1g</th>
                  <th className="p-2.5">1g Aggregate</th>
                  <th className="p-2.5">0g Aggregate</th>
                  <th className="p-2.5">Aggregate 0g/1g</th>
                  <th className="p-2.5">Dominant 0g Regime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-mono text-[11px] tabular-nums">
                {aerosol_detection.particulate_comparison.map((row) => {
                  const pRatio = (row.low_g_primary_nm / row.one_g_primary_nm).toFixed(2);
                  const aRatio = (row.low_g_aggregate_nm / row.one_g_aggregate_nm).toFixed(2);
                  const photoDom = row.low_g_aggregate_nm >= 200;
                  return (
                    <tr key={row.material} className="hover:bg-slate-50">
                      <td className="p-2.5 font-sans font-semibold text-slate-900">{row.material}</td>
                      <td className="p-2.5 text-slate-600">{row.one_g_primary_nm} nm</td>
                      <td className="p-2.5 font-bold text-[#0B3D91]">{row.low_g_primary_nm} nm</td>
                      <td className="p-2.5 text-emerald-700">{pRatio}×</td>
                      <td className="p-2.5 text-amber-700">{row.one_g_aggregate_nm} nm</td>
                      <td className="p-2.5 font-bold text-[#FC3D21]">{row.low_g_aggregate_nm} nm</td>
                      <td className="p-2.5 font-semibold text-[#FC3D21]">{aRatio}×</td>
                      <td className="p-2.5 font-sans text-[11px]">
                        <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${
                          photoDom
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-sky-200 bg-sky-50 text-sky-800'
                        }`}>
                          {photoDom ? 'Photoelectric (>200 nm)' : 'Ionization (<200 nm)'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#0B3D91]">
                <Radio className="h-3.5 w-3.5" /> TSI P-Trak Capillary Mod (PSI-47)
              </div>
              <CopyButton text={aerosol_detection.dust_vs_smoke_challenge.ptrak_modification} label="Grab" />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {aerosol_detection.dust_vs_smoke_challenge.ptrak_modification}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-amber-800">
                <Activity className="h-3.5 w-3.5" /> Arizona Red Dust (ARD) Standard
              </div>
              <CopyButton text={aerosol_detection.dust_vs_smoke_challenge.ard_test_standard} label="Grab" />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {aerosol_detection.dust_vs_smoke_challenge.ard_test_standard}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#FC3D21]">
                <ShieldCheck className="h-3.5 w-3.5" /> 0g Coagulation &amp; False Alarms
              </div>
              <CopyButton text={aerosol_detection.dust_vs_smoke_challenge.coagulation_shift} label="Grab" />
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
          <div className="flex flex-wrap items-center gap-1.5">
            {['PSI-39', 'PSI-68', 'PSI-159'].map((sid) => (
              <button
                key={sid}
                onClick={() => onInspectStudy?.(sid)}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-medium text-[#0B3D91] hover:border-[#0B3D91]"
              >
                {sid}
              </button>
            ))}
            <CopyButton text={cool_flames_reignition.summary} label="Grab Summary" />
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#FC3D21]">
              TABLE 3.2 · SPACECRAFT SUPPRESSION AGENT QUANTITATIVE TRADE-OFFS
            </div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Droplets className="h-4 w-4 text-[#0B3D91]" />
              N2, CO2, Helium &amp; Fine Water Mist Comparison (STS-107 MIST · FLEX-2 · BASS-II)
            </h3>
          </div>
          <CopyButton text={suppressionMd} label="Copy Table Markdown" size="sm" />
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[780px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-[#0B3D91] font-mono text-[10px] uppercase text-white">
                <th className="p-3">Agent</th>
                <th className="p-3">Mechanism</th>
                <th className="p-3">0g Microgravity Behavior</th>
                <th className="p-3">Crew / ECLSS Impact</th>
                <th className="p-3">Status &amp; Citation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {suppression_tradeoffs.map((row) => (
                <tr key={row.agent} className="hover:bg-slate-50/70">
                  <td className="p-3 font-semibold text-slate-900">{row.agent}</td>
                  <td className="p-3 text-slate-600">{row.mechanism}</td>
                  <td className="p-3 leading-relaxed text-slate-700">{row.microgravity_behavior}</td>
                  <td className="p-3 leading-relaxed text-slate-700">{row.toxicity_eclss_impact}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${RATING_BADGE[row.rating] || 'border-slate-200 text-slate-600'}`}>
                      {row.rating}
                    </span>
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10px] text-[#0B3D91]">
                      <span>{row.citation}</span>
                      <CopyButton text={row.citation} label="Cite" />
                    </div>
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
