import React from 'react';
import { useStore } from '../store/useStore';
import { themes } from '../utils/themes';
import { Download } from 'lucide-react';

export function HUD() {
  const themeId = useStore(state => state.theme);
  const theme = themes[themeId];

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'particle-house.png';
      a.click();
    }
  };

  return (
    <>
      {/* Top Left Title */}
      <div className="absolute top-6 left-6 pointer-events-auto flex items-center gap-4">
        <div className="glass-panel p-3 px-5 rounded-xl border-l-2" style={{ borderLeftColor: theme.colors.primary }}>
          <h1 className="text-xl font-bold tracking-widest text-white leading-none mb-1">PARTICLE<span className="text-primary">HOUSE</span></h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">{theme.name}</p>
        </div>
        
        <button 
          onClick={handleExport}
          className="glass-panel p-3 rounded-xl hover:bg-white/10 transition-colors text-white"
          title="Export Screenshot"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Reticle / Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
        <div className="w-8 h-px bg-primary absolute top-1/2 -left-4"></div>
        <div className="w-px h-8 bg-primary absolute -top-4 left-1/2"></div>
        <div className="w-2 h-2 border border-primary rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      {/* Scanlines Overlay */}
      <div className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-10" 
           style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }}>
      </div>
    </>
  );
}
