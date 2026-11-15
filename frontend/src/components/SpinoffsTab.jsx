import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Droplets,
  Flame,
  Fuel,
  Globe,
  HardHat,
  Radio,
} from 'lucide-react';
import { api } from '../api';

const ICON_MAP = {
  'water-mist-extinguishers': Droplets,
  'nuisance-free-smoke-detectors': Radio,
  'firefighter-gear-and-wildfire-models': HardHat,
  'clean-hcci-engines-and-burners': Fuel,
};

export default function SpinoffsTab({ onInspectStudy }) {
  const [spinoffs, setSpinoffs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .spinoffs()
      .then((res) => setSpinoffs(res.spinoffs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center font-mono text-xs text-slate-500">
        Loading NASA PSI Terrestrial Spin-Offs...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Globe className="h-4 w-4 text-[#0B3D91]" />
              From Orbital Freefall to Earth Safety: NASA PSI Terrestrial Spin-Offs
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              How eliminating buoyancy on ISS, Shuttle STS-107, and Cygnus unlocked cleaner engines,
              Halon-free fire suppression, nuisance-proof mine/submarine detectors, and firefighter gear.
            </p>
          </div>
          <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-medium text-emerald-800">
            4 Validated Technology Transfer Pathways
          </span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {spinoffs.map((item) => {
          const Icon = ICON_MAP[item.id] || Flame;
          return (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-[#0B3D91]/40"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B3D91] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#FC3D21]">
                      {item.category}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Earth Sectors: {item.earth_sector}</span>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-[#0B3D91]">
                    0g Microgravity Discovery
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700">
                    {item.microgravity_discovery}
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                  <div className="mb-1 font-mono text-[10px] font-semibold uppercase text-emerald-800">
                    Terrestrial Application &amp; Impact
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700">{item.earth_impact}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Source PSI Investigations (Click to Inspect)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.citations.map((c) => (
                    <button
                      key={c.study_id}
                      onClick={() => onInspectStudy?.(c.study_id)}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-medium text-[#0B3D91] transition hover:border-[#0B3D91] hover:bg-white"
                    >
                      [{c.study_id} | {c.acronym} | {c.doi}]
                      <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
