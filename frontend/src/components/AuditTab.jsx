import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Download,
  Layers,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../api';
import CopyButton from './CopyButton';

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
    </div>
  );
}
