import { useEffect, useRef } from 'react';

const REGIME_INDEX = {
  '1g': 0,
  '0g': 1,
  '1/6g': 2,
  '3/8g': 3,
};

export default function OrbitalSimulationCanvas({ habitatState, compact = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(habitatState);

  useEffect(() => {
    stateRef.current = habitatState;
  }, [habitatState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let rafId = 0;
    let startTime = performance.now();

    // Persistent microgravity aerosol/ember particles
    const particles = Array.from({ length: 72 }, (_, i) => ({
      x: 0,
      y: 0,
      vx: ((i * 37) % 100) / 100 - 0.5,
      vy: ((i * 53) % 100) / 100 - 0.5,
      life: (i % 72) / 72,
      size: 1 + (i % 3) * 0.65,
    }));

    const draw = (now) => {
      const t = (now - startTime) / 1000;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(640, rect.width || 900);
      const h = Math.max(260, rect.height || 300);

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const hab = stateRef.current || {
        o2_pct: 34,
        pressure_psia: 8.2,
        airflow_cms: 10,
        gravity_target: '1/6g',
      };

      // Background deep-space instrument backdrop
      ctx.fillStyle = '#09090D';
      ctx.fillRect(0, 0, w, h);

      // Precision grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 28) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 28) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      const splitX = w * 0.52;

      // Vertical telemetry divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(splitX, 16);
      ctx.lineTo(splitX, h - 16);
      ctx.stroke();

      // =====================================================
      // LEFT PANEL: ORBITAL TRAJECTORY (1g -> 0g -> 1/6g -> 3/8g)
      // =====================================================
      const cx = splitX * 0.48;
      const cy = h * 0.54;
      const activeIdx = REGIME_INDEX[hab.gravity_target] ?? 2;

      ctx.fillStyle = '#60A5FA';
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('ORBITAL MISSION ENVELOPE · EARTH → ISS → LUNAR → MARS', 20, 26);

      // Orbit rings
      const orbits = [
        { r: Math.min(cx, cy) * 0.34, speed: 0.9, label: '0g ISS LEO', color: '#38BDF8', idx: 1 },
        { r: Math.min(cx, cy) * 0.62, speed: 0.48, label: '1/6g LUNAR SEA', color: '#F59E0B', idx: 2 },
        { r: Math.min(cx, cy) * 0.88, speed: 0.28, label: '3/8g MARS TRANSIT', color: '#F43F5E', idx: 3 },
      ];

      orbits.forEach((orb) => {
        const isActive = orb.idx === activeIdx;
        ctx.beginPath();
        ctx.ellipse(cx, cy, orb.r * 1.18, orb.r * 0.72, -0.14, 0, Math.PI * 2);
        ctx.strokeStyle = isActive ? orb.color : 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = isActive ? 1.8 : 1;
        if (!isActive) ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Orbiting spacecraft / habitat node
        const angle = t * orb.speed + orb.idx * 1.9;
        const rx = orb.r * 1.18;
        const ry = orb.r * 0.72;
        const rot = -0.14;
        const lx = rx * Math.cos(angle);
        const ly = ry * Math.sin(angle);
        const px = cx + lx * Math.cos(rot) - ly * Math.sin(rot);
        const py = cy + lx * Math.sin(rot) + ly * Math.cos(rot);

        if (isActive) {
          const pulse = 7 + Math.sin(t * 5) * 2.5;
          ctx.beginPath();
          ctx.arc(px, py, pulse, 0, Math.PI * 2);
          ctx.fillStyle = `${orb.color}33`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(px, py, isActive ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? orb.color : '#64748B';
        ctx.fill();

        // Label next to spacecraft
        ctx.fillStyle = isActive ? '#F8FAFC' : '#64748B';
        ctx.font = isActive
          ? '600 10px ui-monospace, SFMono-Regular, Menlo, monospace'
          : '400 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(orb.label, px + 8, py + 3);
      });

      // Central Earth body (1g baseline)
      const earthActive = activeIdx === 0;
      const earthGlow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 28);
      earthGlow.addColorStop(0, '#60A5FA');
      earthGlow.addColorStop(0.55, '#1D4ED8');
      earthGlow.addColorStop(1, 'rgba(29, 78, 216, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fillStyle = earthGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#2563EB';
      ctx.strokeStyle = earthActive ? '#34D399' : '#93C5FD';
      ctx.lineWidth = earthActive ? 2.2 : 1;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = earthActive ? '#34D399' : '#94A3B8';
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('1g EARTH', cx - 22, cy + 25);

      // =====================================================
      // RIGHT PANEL: LIVE MICROGRAVITY COMBUSTION CHAMBER
      // =====================================================
      const rightW = w - splitX;
      const fcx = splitX + rightW * 0.5;
      const fcy = h * 0.58;

      ctx.fillStyle = '#FB923C';
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(
        `COMBUSTION PHYSICS SIMULATOR · ${hab.o2_pct}% O₂ · ${hab.pressure_psia} psia · ${hab.airflow_cms} cm/s · ${hab.gravity_target}`,
        splitX + 20,
        26
      );

      // Determine buoyancy & Goldilocks flow physics
      const gScalar =
        hab.gravity_target === '0g'
          ? 0.0
          : hab.gravity_target === '1/6g'
          ? 0.28
          : hab.gravity_target === '3/8g'
          ? 0.52
          : 1.0;

      const flowFactor = Math.min(1.5, Math.max(0, hab.airflow_cms / 20));
      const o2Boost = Math.min(1.8, Math.max(0.6, hab.o2_pct / 24));
      const isGoldilocks = hab.airflow_cms >= 4 && hab.airflow_cms <= 18 && gScalar < 0.6;

      // Convective airflow streamlines (left -> right)
      const streamSpeed = 18 + hab.airflow_cms * 4.5;
      ctx.strokeStyle = isGoldilocks ? 'rgba(251, 146, 60, 0.35)' : 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1;
      for (let row = 0; row < 5; row++) {
        const sy = h * 0.32 + row * 32;
        const offset = (t * streamSpeed + row * 40) % (rightW - 40);
        const sx = splitX + 20 + offset;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(Math.min(w - 20, sx + 28), sy);
        ctx.stroke();
      }

      // Burner / Solid fuel sample rod
      ctx.fillStyle = '#3F3F46';
      ctx.fillRect(fcx - 3, fcy + 16, 6, h - fcy - 28);
      ctx.fillStyle = '#A1A1AA';
      ctx.fillRect(fcx - 8, fcy + 12, 16, 6);

      // Flame geometry transforms smoothly between 1g teardrop & 0g diffusion sphere
      const flicker = Math.sin(t * 9) * (1.2 + gScalar * 3.5);
      const baseRadius = (22 + o2Boost * 12) * (compact ? 0.85 : 1);
      const flameHeight = baseRadius * (1.05 + gScalar * 1.45) + flicker;
      const flameWidth = baseRadius * (1.12 - gScalar * 0.28);
      const tiltX = flowFactor * (1 - gScalar * 0.45) * 18;

      // Outer luminous blue diffusion corona (stronger at low gravity / high O2)
      const outerGrad = ctx.createRadialGradient(
        fcx + tiltX * 0.35,
        fcy - flameHeight * 0.28,
        4,
        fcx + tiltX * 0.35,
        fcy - flameHeight * 0.28,
        Math.max(flameWidth, flameHeight) * 1.25
      );
      outerGrad.addColorStop(0, hab.o2_pct >= 50 ? 'rgba(224, 242, 254, 0.95)' : 'rgba(96, 165, 250, 0.72)');
      outerGrad.addColorStop(0.55, 'rgba(37, 99, 235, 0.34)');
      outerGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');

      ctx.save();
      ctx.translate(fcx, fcy);
      ctx.beginPath();
      ctx.moveTo(-flameWidth * 0.55, 10);
      ctx.bezierCurveTo(
        -flameWidth * 1.05,
        -flameHeight * 0.4,
        -flameWidth * 0.4 + tiltX,
        -flameHeight * 1.05,
        tiltX,
        -flameHeight * 1.1
      );
      ctx.bezierCurveTo(
        flameWidth * 0.4 + tiltX,
        -flameHeight * 1.05,
        flameWidth * 1.05,
        -flameHeight * 0.4,
        flameWidth * 0.55,
        10
      );
      ctx.closePath();
      ctx.fillStyle = outerGrad;
      ctx.fill();

      // Inner thermal core (amber-orange when buoyant or high O2, ghostly blue in 0g)
      const innerScale = 0.58;
      const coreGrad = ctx.createRadialGradient(
        tiltX * 0.25,
        -flameHeight * 0.25,
        2,
        tiltX * 0.25,
        -flameHeight * 0.25,
        flameHeight * 0.7
      );
      if (gScalar < 0.15 && hab.o2_pct <= 25) {
        coreGrad.addColorStop(0, 'rgba(186, 230, 253, 0.95)');
        coreGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.65)');
        coreGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        coreGrad.addColorStop(0, 'rgba(254, 249, 195, 0.96)');
        coreGrad.addColorStop(0.45, 'rgba(251, 146, 60, 0.85)');
        coreGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      }

      ctx.beginPath();
      ctx.ellipse(
        tiltX * 0.3,
        -flameHeight * 0.34,
        flameWidth * innerScale,
        flameHeight * innerScale,
        tiltX * 0.015,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.restore();

      // 0.2 um ultrafine aerosol & hot ember particles
      particles.forEach((p, idx) => {
        const age = (p.life + t * (0.35 + o2Boost * 0.18)) % 1;
        const spread = gScalar < 0.2 ? 68 : 34;
        const px =
          fcx +
          tiltX * age * 1.4 +
          p.vx * spread * age +
          flowFactor * 36 * age;
        const py =
          fcy -
          age * (26 + gScalar * 85) +
          p.vy * (gScalar < 0.2 ? 48 : 16) * age;
        const alpha = (1 - age) * 0.72;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = idx % 3 === 0 ? `rgba(147, 197, 253, ${alpha})` : `rgba(251, 146, 60, ${alpha})`;
        ctx.fill();
      });

      // Live Regime Physics Badge inside chamber
      const regimeMode =
        gScalar === 0
          ? '0g SPHERICAL DIFFUSION FLAME'
          : isGoldilocks
          ? 'BASS-II GOLDILOCKS UPSTREAM REGIME'
          : gScalar === 1
          ? '1g BUOYANT CONVECTION PLUME'
          : 'PARTIAL-g BOUNDED REGIME';

      ctx.fillStyle = isGoldilocks ? '#FB7185' : '#94A3B8';
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(regimeMode, splitX + 20, h - 18);

      ctx.restore();
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#09090D] shadow-sm">
      <canvas
        ref={canvasRef}
        className={`block w-full ${compact ? 'h-[240px]' : 'h-[290px]'}`}
      />
    </div>
  );
}

