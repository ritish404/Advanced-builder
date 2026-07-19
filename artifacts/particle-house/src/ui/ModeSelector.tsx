import React from 'react';
import { useStore, VizMode } from '../store/useStore';
import { Layers, Maximize, Box, Eye, Radio } from 'lucide-react';

const modes: { id: VizMode, icon: any, label: string }[] = [
  { id: 'normal', icon: Box, label: 'Normal' },
  { id: 'wireframe', icon: Layers, label: 'Wireframe' },
  { id: 'blueprint', icon: Maximize, label: 'Blueprint' },
  { id: 'glass', icon: Eye, label: 'Glass' },
  { id: 'xray', icon: Radio, label: 'X-Ray' },
];

export function ModeSelector() {
  const vizMode = useStore(state => state.vizMode);
  const setVizMode = useStore(state => state.setVizMode);

  return (
    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
      <div className="glass-panel p-2 rounded-xl flex flex-col gap-2">
        {modes.map(mode => {
          const Icon = mode.icon;
          const isActive = vizMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setVizMode(mode.id)}
              className={`p-3 rounded-lg flex items-center justify-center transition-all group relative ${
                isActive ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,191,255,0.3)]' : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={20} />
              
              <div className="absolute left-full ml-4 px-2 py-1 bg-black/80 rounded border border-white/10 text-xs font-bold uppercase opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                {mode.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
