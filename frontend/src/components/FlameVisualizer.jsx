import { Flame } from 'lucide-react';

/**
 * Real-time Microgravity vs. Normal-Gravity Flame Morphology Visualizer.
 * Driven live by O2%, Pressure (psia), Airflow (cm/s), and Gravity Target.
 */
export default function FlameVisualizer({ o2Pct, pressurePsia, airflowCms, gravityTarget }) {
  const is1g = gravityTarget === '1g';
  const isInverseCfig = !is1g && o2Pct >= 50;
  const isGoldilocks = !is1g && !isInverseCfig && airflowCms >= 4 && airflowCms <= 18;
  const isQuiescent = !is1g && !isInverseCfig && airflowCms < 4;

  let regimeName = 'SAFFIRE Convective Wake Flame';
  let regimeTag = 'PSI-98/99/100';
  let regimeDesc = 'Forced ventilation stretches the flame plume downstream along the material surface.';
  let accentColor = '#FB923C';

  if (is1g) {
    regimeName = '1g Buoyant Teardrop Plume';
    regimeTag = 'NASA-STD-6001 Baseline';
    regimeDesc = 'Hot combustion gases rise via buoyancy, drawing fresh air inward and masking low-flow microgravity hazards.';
    accentColor = '#FBBF24';
  } else if (isInverseCfig) {
    regimeName = 'ACME CFI-G Inside-Out Inverse Flame';
    regimeTag = 'PSI-159 (Up to 85% O2)';
    regimeDesc = 'O2/N2 mixture flows out of the porous sphere into a fuel-seeded chamber, sustaining cool & hot inverse flames.';
    accentColor = '#38BDF8';
  } else if (isQuiescent) {
    regimeName = '0g Spherical Diffusion Halo';
    regimeTag = 'PSI-20 ACME BRE';
    regimeDesc = 'Without buoyancy or airflow, flames form a ghostly blue diffusion sphere; elevated O2 sustains quasi-steady burning.';
    accentColor = '#60A5FA';
  } else if (isGoldilocks) {
    regimeName = 'BASS-II Goldilocks Upstream-Creeping Flame';
    regimeTag = 'PSI-25 (~10 cm/s Peak Hazard)';
    regimeDesc = 'Low-speed airflow feeds O2 without blowing off the flame—allowing upstream spread at lower O2% than 1g Test 1.';
    accentColor = '#F97316';
  }

  // Dynamic flame dimensions
  const o2Scale = Math.min(1.45, Math.max(0.75, 0.72 + (o2Pct / 45) * 0.55));
  const skewX = is1g ? 0 : Math.min(34, airflowCms * 1.05);

  return (
    <div className="rounded-lg border border-[#1C2B47] bg-[#070D19] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-200">
          <Flame className="h-3.5 w-3.5 text-[#FC3D21]" />
          Live Flame Morphology
        </span>
        <span
          className="rounded border px-1.5 py-0.5 font-mono text-[10px]"
          style={{ borderColor: `${accentColor}66`, color: accentColor, backgroundColor: `${accentColor}15` }}
        >
          {regimeTag}
        </span>
      </div>

      {/* SVG Physics Viewport */}
      <div className="nasa-grid-bg relative overflow-hidden rounded-md border border-[#1C2B47] bg-[#050912]">
        <svg viewBox="0 0 320 170" className="h-[168px] w-full">
          <defs>
            <radialGradient id="blueShell" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.12" />
              <stop offset="62%" stopColor="#3B82F6" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#38BDF8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hotFlame" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#F97316" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#EF4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="inverseCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.7" />
              <stop offset="85%" stopColor="#A855F7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle telemetry grid */}
          <path d="M0 42 H320 M0 85 H320 M0 128 H320 M80 0 V170 M160 0 V170 M240 0 V170" stroke="#1E293B" strokeWidth="0.6" strokeDasharray="3 3" />

          {/* Airflow streamlines (left -> right) when airflow > 0 */}
          {airflowCms > 0 && !is1g && (
            <g opacity="0.65">
              {[42, 85, 128].map((y) => (
                <g key={y}>
                  <line x1="16" y1={y} x2="86" y2={y} stroke="#34D399" strokeWidth="1.2" strokeDasharray="4 3" />
                  <polygon points={`88,${y} 81,${y - 3} 81,${y + 3}`} fill="#34D399" />
                </g>
              ))}
              <text x="16" y="24" fill="#34D399" fontSize="9" fontFamily="JetBrains Mono, monospace">
                FLOW → {airflowCms.toFixed(0)} cm/s
              </text>
            </g>
          )}

          {/* Buoyancy arrows for 1g */}
          {is1g && (
            <g opacity="0.7">
              <line x1="108" y1="130" x2="108" y2="35" stroke="#FBBF24" strokeWidth="1.2" strokeDasharray="3 3" />
              <polygon points="108,32 104,39 112,39" fill="#FBBF24" />
              <line x1="212" y1="130" x2="212" y2="35" stroke="#FBBF24" strokeWidth="1.2" strokeDasharray="3 3" />
              <polygon points="212,32 208,39 216,39" fill="#FBBF24" />
              <text x="14" y="24" fill="#FBBF24" fontSize="9" fontFamily="JetBrains Mono, monospace">
                1g BUOYANT PLUME ↑
              </text>
            </g>
          )}

          {/* Flame Rendering */}
          {is1g ? (
            <g transform={`translate(160, 102) scale(${o2Scale})`}>
              <path
                d="M0,-62 C20,-35 28,-4 22,16 C16,30 -16,30 -22,16 C-28,-4 -20,-35 0,-62 Z"
                fill="url(#hotFlame)"
              />
              <path
                d="M0,-38 C10,-18 12,4 8,14 C4,20 -4,20 -8,14 C-12,4 -10,-18 0,-38 Z"
                fill="#FEF9C3"
                opacity="0.85"
              />
              <rect x="-4" y="18" width="8" height="22" rx="2" fill="#94A3B8" />
            </g>
          ) : isInverseCfig ? (
            <g transform={`translate(165, 85) scale(${o2Scale})`}>
              <circle cx="0" cy="0" r="46" fill="url(#inverseCore)" />
              <circle cx="0" cy="0" r="24" fill="none" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="0" cy="0" r="9" fill="#CBD5E1" stroke="#38BDF8" strokeWidth="1.5" />
              <text x="16" y="-26" fill="#E0F2FE" fontSize="8" fontFamily="JetBrains Mono, monospace">
                O2 CORE →
              </text>
            </g>
          ) : isQuiescent ? (
            <g transform={`translate(160, 85) scale(${o2Scale})`}>
              <circle cx="0" cy="0" r="44" fill="url(#blueShell)" />
              <circle cx="0" cy="0" r="30" fill="none" stroke="#60A5FA" strokeWidth="1.5" opacity="0.7" />
              <circle cx="0" cy="0" r="8" fill="#E2E8F0" />
            </g>
          ) : (
            <g transform={`translate(${155 + skewX * 0.45}, 85) scale(${o2Scale})`}>
              {/* Goldilocks upstream creep indicator */}
              {isGoldilocks && (
                <g>
                  <line x1="-38" y1="-28" x2="-58" y2="-28" stroke="#FB923C" strokeWidth="1.2" />
                  <polygon points="-61,-28 -55,-31 -55,-25" fill="#FB923C" />
                  <text x="-70" y="-34" fill="#FB923C" fontSize="8" fontFamily="JetBrains Mono, monospace">
                    UPSTREAM SPREAD
                  </text>
                </g>
              )}
              <ellipse
                cx={skewX * 0.35}
                cy="0"
                rx={34 + skewX * 0.7}
                ry={isGoldilocks ? 26 : 21}
                fill={o2Pct >= 28 ? 'url(#hotFlame)' : 'url(#blueShell)'}
              />
              <ellipse
                cx={skewX * 0.2}
                cy="0"
                rx={18 + skewX * 0.35}
                ry={13}
                fill={o2Pct >= 28 ? '#FEF08A' : '#93C5FD'}
                opacity="0.65"
              />
              <circle cx="-10" cy="0" r="7" fill="#CBD5E1" />
            </g>
          )}

          {/* Bottom Telemetry Readout */}
          <text x="12" y="158" fill="#94A3B8" fontSize="9" fontFamily="JetBrains Mono, monospace">
            {gravityTarget} · {o2Pct.toFixed(1)}% O2 · {pressurePsia.toFixed(1)} psia
          </text>
        </svg>
      </div>

      <div className="mt-2.5">
        <div className="text-xs font-semibold text-slate-100">{regimeName}</div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{regimeDesc}</p>
      </div>
    </div>
  );
}

