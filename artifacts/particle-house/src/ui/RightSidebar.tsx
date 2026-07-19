import React from 'react';
import { useStore, Theme } from '../store/useStore';
import { themes } from '../utils/themes';

export function RightSidebar() {
  const { 
    theme, setTheme, 
    particleDensity, setParticleDensity,
    animationSpeed, setAnimationSpeed,
    bloomIntensity, setBloomIntensity,
    activeFloor, setFloor,
    cameraMode, setCameraMode,
    isDayMode, toggleDayNight
  } = useStore();

  return (
    <div className="absolute right-6 top-[220px] bottom-24 w-64 flex flex-col gap-4 pointer-events-auto overflow-y-auto pb-4 scrollbar-none">
      {/* Theme Selector */}
      <div className="glass-panel p-4 rounded-xl">
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Architecture</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(themes).map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as Theme)}
              className={`py-2 px-1 text-xs rounded transition-all border ${
                theme === t.id 
                  ? 'border-primary bg-primary/20 text-white' 
                  : 'border-white/5 bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <div className="w-full flex justify-center mb-1">
                <div className="w-3 h-3 rounded-full" style={{ background: t.colors.primary }}></div>
              </div>
              <span className="truncate w-full block text-center">{t.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="glass-panel p-4 rounded-xl flex flex-col gap-4">
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest border-b border-white/10 pb-2">Parameters</h3>
        
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Density</span>
            <span className="text-white">{(particleDensity / 1000).toFixed(0)}k</span>
          </div>
          <input 
            type="range" min="25000" max="150000" step="5000"
            value={particleDensity}
            onChange={(e) => setParticleDensity(Number(e.target.value))}
            className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Speed</span>
            <span className="text-white">{animationSpeed.toFixed(1)}x</span>
          </div>
          <input 
            type="range" min="0.1" max="3.0" step="0.1"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
            className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Glow</span>
            <span className="text-white">{bloomIntensity.toFixed(1)}</span>
          </div>
          <input 
            type="range" min="0.5" max="3.0" step="0.1"
            value={bloomIntensity}
            onChange={(e) => setBloomIntensity(Number(e.target.value))}
            className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Camera & Environment */}
      <div className="glass-panel p-4 rounded-xl flex flex-col gap-3">
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest border-b border-white/10 pb-2">Environment</h3>
        
        <select 
          value={cameraMode}
          onChange={(e) => setCameraMode(e.target.value as any)}
          className="bg-black/50 border border-white/10 text-white text-xs rounded p-2 outline-none focus:border-primary w-full"
        >
          <option value="orbit">Orbit Camera</option>
          <option value="cinematic">Cinematic</option>
          <option value="drone">Drone View</option>
          <option value="firstperson">First Person</option>
        </select>

        <select 
          value={activeFloor || ''}
          onChange={(e) => setFloor(e.target.value ? e.target.value as any : null)}
          className="bg-black/50 border border-white/10 text-white text-xs rounded p-2 outline-none focus:border-primary w-full"
        >
          <option value="">All Floors</option>
          <option value="roof">Roof</option>
          <option value="first">Second Floor</option>
          <option value="ground">Ground Floor</option>
          <option value="basement">Basement</option>
        </select>

        <button 
          onClick={toggleDayNight}
          className="mt-2 py-2 w-full text-xs font-bold uppercase tracking-wider rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
        >
          {isDayMode ? 'Switch to Night' : 'Switch to Day'}
        </button>
      </div>
    </div>
  );
}
