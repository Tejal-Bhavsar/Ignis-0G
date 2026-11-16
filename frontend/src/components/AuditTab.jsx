import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Download,
  Layers,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import CopyButton from './CopyButton';

const RISK_BADGE = {
  HIGH: 'border-rose-200 bg-rose-50 text-rose-800',
  MODERATE: 'border-amber-200 bg-amber-50 text-amber-800',
  LOW: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const QUICK_SCENARIOS = [
  'TSI P-Trak ultrafine aerosol spike prior to smoldering wire insulation smoke in avionics bay',
  '34% O2 8.2 psia forced airflow 10 cm/s cotton-fiberglass flame spread near ECLSS duct',
  'Cool flame low-temperature reignition of n-dodecane droplet after initial extinction',
  'CO2 and water mist suppression agent effectiveness on PMMA rod in microgravity',
];

const STATUS_STYLES = {
  PASS: {
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  CONDITIONAL: {
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  FAIL: {
    badge: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: XCircle,
    iconColor: 'text-rose-600',
  },
};

const GAP_BADGE = {
  'WELL COVERED': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'COVERED (14.7 psia ONLY)': 'border-sky-200 bg-sky-50 text-sky-800',
  'GAS / DROPLET ONLY': 'border-amber-200 bg-amber-50 text-amber-800',
  'PARTIALLY COVERED': 'border-amber-200 bg-amber-50 text-amber-800',
  'BOUNDED VIA PROXY': 'border-indigo-200 bg-indigo-50 text-indigo-800',
  'CRITICAL DATA GAP': 'border-rose-200 bg-rose-50 text-rose-800',
};

export default function AuditTab({ habitatState, onInspectStudy, onAskSI }) {
  const [materialId, setMaterialId] = useState('sibal_fabric');
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scenarioText, setScenarioText] = useState(QUICK_SCENARIOS[0]);
  const [clsResult, setClsResult] = useState(null);
  const [clsLoading, setClsLoading] = useState(false);

  const handleClassify = async (overrideText) => {
    const query = (typeof overrideText === 'string' ? overrideText : scenarioText).trim();
    if (!query) return;
    setClsLoading(true);
    try {
      const res = await api.classifyText(query);
      setClsResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setClsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .audit({
        ...habitatState,
        material_id: materialId,
      })
      .then((res) => {
        if (!cancelled) setAudit(res);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [habitatState, materialId]);

  const auditMarkdown = useMemo(() => {
    if (!audit) return '';
    const op = audit.operating_point;
    return [
      `# IGNIS-PSI Coupled Fire Safety Audit — ${audit.overall_grade}`,
      `**Habitat:** ${op.o2_pct}% O2 · ${op.pressure_psia} psia · ${op.airflow_cms} cm/s · ${op.gravity_label}`,
      `**Material Scenario:** ${audit.material.label} (${audit.material.notes})`,
      `**0g LOC:** ${audit.metrics.loc_0g_pct}% O2 | **Target LOC:** ${audit.metrics.loc_target_pct}% O2 | **Spread Mult:** ${audit.metrics.spread_rate_multiplier}×`,
      '',
      '## 4-Stage Coupled Fire Chain',
      ...audit.stages.map(
        (s) => `- **${s.stage} [${s.status}]**: ${s.finding} (${s.citations.join(', ')})`
      ),
      '',
      '## NASA PSI Empirical Coverage & Gap Matrix',
      ...audit.gap_matrix.regimes.map(
        (r) =>
          `- **${r.regime} [${r.status}]**: ${r.studies.length ? r.studies.join(', ') : 'NO DIRECT FLIGHT DATA'} — ${r.gap_note}`
      ),
    ].join('\n');
  }, [audit]);

  const downloadAudit = () => {
    if (!auditMarkdown) return;
    const blob = new Blob([auditMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ignis-psi-safety-audit-${habitatState.gravity_target.replace('/', '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !audit) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center font-mono text-xs text-zinc-500 ring-1 ring-zinc-200/80">
        Running Coupled 4-Stage Fire Chain &amp; PSI Gap Audit...
      </div>
    );
  }

  if (!audit) return null;

  return (
    <div className="space-y-5">
      {/* Hero Verdict Banner */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-600">
              COUPLED SPACECRAFT FIRE-CHAIN AUDITOR · SOLVING PSI SILOS
            </div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-zinc-950">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Mission Fire Safety Audit &amp; NASA PSI Evidence Gap Radar
            </h2>
            <p className="max-w-3xl text-xs leading-relaxed text-zinc-600">
              Evaluates your active habitat ({audit.operating_point.o2_pct}% O2 · {audit.operating_point.pressure_psia} psia · {audit.operating_point.airflow_cms} cm/s · {audit.operating_point.gravity_target}) across all 4 coupled fire stages simultaneously—and exposes where NASA&apos;s 19 PSI studies have untested intersections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${
                audit.fail_count > 0
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : audit.conditional_count > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {audit.overall_grade}
            </span>
            <CopyButton text={auditMarkdown} label="Copy Audit" size="sm" />
            <button
              onClick={downloadAudit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export .md
            </button>
          </div>
        </div>

        {/* Material Scenario Selector */}
        <div className="mt-4 border-t border-zinc-200/80 pt-4">
          <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Select Spacecraft Ignition / Fuel Scenario
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {audit.material_options.map((m) => {
              const active = materialId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMaterialId(m.id)}
                  className={`rounded-xl p-3 text-left transition ${
                    active
                      ? 'bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-950'
                      : 'bg-zinc-50 text-zinc-800 ring-1 ring-zinc-200/80 hover:bg-white'
                  }`}
                >
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className={`mt-1 font-mono text-[10px] ${active ? 'text-orange-400' : 'text-blue-600'}`}>
                    {m.phase} · {m.primary_studies.join(', ')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4-Stage Coupled Fire Chain */}
      <div className="grid gap-4 md:grid-cols-2">
        {audit.stages.map((st) => {
          const cfg = STATUS_STYLES[st.status] || STATUS_STYLES.CONDITIONAL;
          const Icon = cfg.icon;
          return (
            <div
              key={st.stage}
              className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cfg.iconColor}`} />
                    <h3 className="font-display text-sm font-semibold text-zinc-950">{st.stage}</h3>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${cfg.badge}`}>
                    {st.status}
                  </span>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-zinc-700">{st.finding}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/60 pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {st.citations.map((c) => {
                    const sid = c.replace('[', '').split('|')[0].trim();
                    return (
                      <button
                        key={c}
                        onClick={() => onInspectStudy?.(sid)}
                        className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-medium text-blue-600 hover:bg-zinc-200"
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                {onAskSI && (
                  <button
                    onClick={() =>
                      onAskSI(
                        `Explain mitigation engineering for "${st.stage}" (${st.status}) in ${audit.operating_point.o2_pct}% O2 / ${audit.operating_point.pressure_psia} psia (${audit.operating_point.gravity_target}): ${st.finding}`
                      )
                    }
                    className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-zinc-600 hover:text-zinc-950"
                  >
                    <Bot className="h-3 w-3 text-orange-500" /> Mitigate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NASA PSI Empirical Coverage & Gap Matrix */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-rose-600">
              WHY NASA NEEDS THIS · LIVE CORPUS COVERAGE &amp; BLINDSPOT RADAR
            </div>
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-zinc-950">
              <Layers className="h-4 w-4 text-blue-600" />
              NASA PSI Exploration Regime Coverage Matrix ({audit.gap_matrix.covered_regimes}/{audit.gap_matrix.total_regimes} Regimes With Direct Flight Data)
            </h3>
          </div>
          {onAskSI && (
            <button
              onClick={() =>
                onAskSI(
                  'Why does NASA PSI currently have a 4-way Lunar SEA data gap (34% O2, 8.2 psia, ~10 cm/s flow, 1/6g solid spread) and how do ACME BRE, BASS-II, SAFFIRE, and E-FIELD bound it?'
                )
              }
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />
              Ask SI About PSI Gap
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200/80">
          <table className="w-full min-w-[780px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/90 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <th className="p-3">Exploration Regime</th>
                <th className="p-3">Target Envelope</th>
                <th className="p-3">PSI Flight Studies</th>
                <th className="p-3">Coverage Status</th>
                <th className="p-3">Engineering Gap / Bounding Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 bg-white">
              {audit.gap_matrix.regimes.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/70">
                  <td className="p-3 font-semibold text-zinc-950">{r.regime}</td>
                  <td className="p-3 font-mono text-[11px] text-zinc-600">
                    {r.o2} · {r.pressure} · {r.gravity}
                  </td>
                  <td className="p-3">
                    {r.studies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.studies.map((sid) => (
                          <button
                            key={sid}
                            onClick={() => onInspectStudy?.(sid)}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-blue-600 hover:bg-zinc-200"
                          >
                            {sid}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-[11px] font-semibold text-rose-600">
                        0 Direct Studies
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${GAP_BADGE[r.status] || 'border-zinc-200 text-zinc-600'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 leading-relaxed text-zinc-600">{r.gap_note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trained ML Fire-Hazard Classifier & Future Warning Predictor */}
      {audit?.ml_prediction && (
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-blue-600" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                  FIG 4.2 · SCIKIT-LEARN EMPIRICAL ML PREDICTOR
                </span>
              </div>
              <h3 className="mt-1 text-base font-semibold text-zinc-900">
                Trained Fire-Hazard Classifier &amp; Future Warning Predictor
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                Trained strictly on the {audit.ml_prediction.model_metadata?.training_studies} ingested NASA PSI studies and{' '}
                {audit.ml_prediction.model_metadata?.training_chunks} Context-Injected chunks (no synthetic or mocked datapoints).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                {audit.ml_prediction.model_metadata?.physical_model}
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-600">
                NLP 5-Fold CV: {Math.round((audit.ml_prediction.model_metadata?.nlp_5fold_cv_accuracy || 0) * 100)}%
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Future Warning Forecasts */}
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 lg:col-span-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  <Radar className="h-3.5 w-3.5 text-amber-600" />
                  Future Warning Forecasts (Current Habitat)
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {habitatState.o2_pct}% O₂ · {habitatState.pressure_psia} psia · {habitatState.airflow_cms} cm/s
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {audit.ml_prediction.warning_forecasts?.map((wf) => (
                  <div key={wf.id} className="rounded-lg border border-zinc-200/80 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-800">{wf.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-900">
                          {Math.round((wf.probability || 0) * 100)}%
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                            RISK_BADGE[wf.risk_band] || 'border-zinc-200 text-zinc-600'
                          }`}
                        >
                          {wf.risk_band}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          wf.risk_band === 'HIGH'
                            ? 'bg-rose-500'
                            : wf.risk_band === 'MODERATE'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((wf.probability || 0) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Physical-Space Classification, Feature Importance & Nearest Studies */}
            <div className="space-y-4 lg:col-span-6">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-200/80 bg-white p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      Predicted Safety Pillar
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900">
                      {audit.ml_prediction.predicted_pillar}
                    </div>
                    <div className="mt-2 space-y-1">
                      {audit.ml_prediction.pillar_probabilities?.slice(0, 3).map((p) => (
                        <div key={p.label} className="flex items-center justify-between text-[11px] text-zinc-600">
                          <span>{p.label}</span>
                          <span className="font-mono font-medium">{Math.round(p.probability * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200/80 bg-white p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      Dominant Fuel Phase
                    </div>
                    <div className="mt-1 text-sm font-semibold text-zinc-900">
                      {audit.ml_prediction.predicted_fuel_phase}
                    </div>
                    <div className="mt-2 space-y-1">
                      {audit.ml_prediction.feature_importances?.map((fi) => (
                        <div key={fi.feature} className="flex items-center justify-between text-[11px] text-zinc-600">
                          <span className="truncate pr-2">{fi.feature}</span>
                          <span className="font-mono font-medium">{Math.round(fi.importance * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nearest Physical Studies */}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  Nearest Physical-Envelope NASA Studies (k-NN)
                </div>
                <div className="mt-2.5 space-y-2">
                  {audit.ml_prediction.nearest_physical_studies?.map((ns) => (
                    <button
                      key={ns.study_id}
                      onClick={() => onInspectStudy?.(ns.study_id)}
                      className="flex w-full items-center justify-between rounded-lg border border-zinc-200/80 bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-blue-600">{ns.study_id}</span>
                          <span className="truncate text-xs font-medium text-zinc-800">{ns.acronym}</span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[10px] text-zinc-500">
                          {ns.o2_range} · {ns.pressure_psia} · {ns.airflow_cm_s}
                        </div>
                      </div>
                      <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-600">
                        d={ns.physical_distance}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live NLP Anomaly / Scenario Classifier */}
          <div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Live NLP Anomaly &amp; Telemetry Classifier (TF-IDF + Logistic Regression)
              </div>
              <span className="font-mono text-[10px] text-zinc-400">
                Classifies crew reports or sensor logs into NASA Safety Pillars
              </span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {QUICK_SCENARIOS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setScenarioText(preset);
                    handleClassify(preset);
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 transition hover:border-blue-300 hover:text-blue-700"
                >
                  Sample {idx + 1}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <textarea
                rows={2}
                value={scenarioText}
                onChange={(e) => setScenarioText(e.target.value)}
                placeholder="Describe a spacecraft anomaly, smoke/aerosol reading, or suppression test..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleClassify()}
                disabled={clsLoading || !scenarioText.trim()}
                className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {clsLoading ? 'Classifying…' : 'Classify Anomaly'}
              </button>
            </div>

            {clsResult && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200/80 bg-white p-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    Predicted Fire Safety Pillar
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">{clsResult.predicted_pillar}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700">
                      {Math.round((clsResult.confidence || 0) * 100)}% confidence
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {clsResult.probabilities?.map((p) => (
                    <span
                      key={p.pillar}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[10px] text-zinc-700"
                    >
                      {p.pillar}: {Math.round(p.probability * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

