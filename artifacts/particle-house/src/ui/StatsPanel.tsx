import React from 'react';
import { useStore } from '../store/useStore';
import { themes } from '../utils/themes';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <>
      <div className="text-[10px] text-white/30">{label}</div>
      <div className="text-[11px] text-right font-bold" style={{ color: color ?? '#ffffff' }}>
        {value}
      </div>
    </>
  );
}

export function StatsPanel() {
  const fps             = useStore(s => s.fps);
  const particleDensity = useStore(s => s.particleDensity);
  const buildProgress   = useStore(s => s.buildProgress);
  const vizMode         = useStore(s => s.vizMode);
  const themeId         = useStore(s => s.theme);
  const isPaused        = useStore(s => s.isPaused);

  // AI vision state
  const cameraConnected = useStore(s => s.cameraConnected);
  const mediapipeLoaded = useStore(s => s.mediapipeLoaded);
  const handsDetected   = useStore(s => s.handsDetected);
  const currentGesture  = useStore(s => s.currentGesture);
  const trackingFps     = useStore(s => s.trackingFps);

  const themeName = themes[themeId]?.name ?? themeId;

  return (
    <div className="absolute top-6 right-6 pointer-events-auto">
      <div className="glass-panel p-4 rounded-xl w-[210px] flex flex-col gap-2">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]">
            {isPaused ? '⏸ PAUSED' : 'System Status'}
          </span>
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isPaused ? '#facc15' : '#4ade80',
              boxShadow: isPaused ? '0 0 6px #facc15' : '0 0 6px #4ade80',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>

        {/* Particle stats */}
        <div className="grid grid-cols-2 gap-y-1.5">
          <Stat label="Particles"    value={`${(particleDensity / 1000).toFixed(0)}k`} color="#00BFFF" />
          <Stat label="FPS"          value={String(fps)} />
          <Stat label="Build"        value={`${(buildProgress * 100).toFixed(1)}%`}  color="#FFD700" />
          <Stat label="Mode"         value={vizMode.toUpperCase()} />
          <Stat label="Style"        value={themeName.split(' ')[0].toUpperCase()} color="#a78bfa" />
        </div>

        {/* AI Vision section */}
        <div className="border-t border-white/10 pt-2 mt-1">
          <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] mb-1.5">AI Vision</div>
          <div className="grid grid-cols-2 gap-y-1.5">
            <Stat
              label="Camera"
              value={cameraConnected  ? 'ON'   : 'OFF'}
              color={cameraConnected  ? '#4ade80' : '#f87171'}
            />
            <Stat
              label="MediaPipe"
              value={mediapipeLoaded  ? 'READY' : 'WAIT'}
              color={mediapipeLoaded  ? '#4ade80' : '#facc15'}
            />
            <Stat
              label="Hands"
              value={`${handsDetected}/2`}
              color={handsDetected > 0 ? '#4ade80' : '#ffffff44'}
            />
            <Stat
              label="Cam FPS"
              value={String(trackingFps)}
              color={trackingFps > 20 ? '#4ade80' : trackingFps > 5 ? '#facc15' : '#f87171'}
            />
          </div>

          {/* Current gesture */}
          <div className="mt-2 flex justify-between items-center">
            <span className="text-[10px] text-white/30">Gesture</span>
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide">
              {currentGesture !== 'none' ? currentGesture.replace('_', ' ') : '—'}
            </span>
          </div>
        </div>

        {/* Gesture cheatsheet */}
        <div className="border-t border-white/10 pt-2 mt-1 space-y-0.5">
          <div className="text-[8px] text-white/20 uppercase tracking-widest mb-1">Gestures</div>
          {[
            ['🖐 Right open', 'Build'],
            ['🖐 Left open',  'Destroy'],
            ['✊ Fist',       'Freeze'],
            ['🤌 Pinch',     'Explode'],
            ['🙌 Two hands', 'Rotate'],
            ['← → Swipe',   'Style'],
            ['👍 Thumb up',  'Camera'],
          ].map(([g, a]) => (
            <div key={g} className="flex justify-between text-[8px]">
              <span className="text-white/25">{g}</span>
              <span className="text-white/40">{a}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
