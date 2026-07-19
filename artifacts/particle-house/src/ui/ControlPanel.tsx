import React from 'react';
import { useStore } from '../store/useStore';
import { Play, RotateCcw, BoxSelect, Zap } from 'lucide-react';

export function ControlPanel() {
  const triggerBuild = useStore(state => state.triggerBuild);
  const triggerDestroy = useStore(state => state.triggerDestroy);
  const triggerExplode = useStore(state => state.triggerExplode);
  const triggerRebuild = useStore(state => state.triggerRebuild);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
      <div className="glass-pill px-6 py-3 flex items-center gap-4">
        <button 
          onClick={() => triggerBuild()}
          className="glass-button flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-primary border border-transparent"
        >
          <Play size={16} /> Build
        </button>
        
        <div className="w-px h-6 bg-white/20"></div>
        
        <button 
          onClick={() => triggerDestroy()}
          className="glass-button flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-destructive border border-transparent"
        >
          <RotateCcw size={16} /> Destroy
        </button>
        
        <div className="w-px h-6 bg-white/20"></div>
        
        <button 
          onClick={() => triggerExplode()}
          className="glass-button flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-yellow-400 border border-transparent"
        >
          <Zap size={16} /> Explode
        </button>

        <div className="w-px h-6 bg-white/20"></div>
        
        <button 
          onClick={() => triggerRebuild()}
          className="glass-button flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-green-400 border border-transparent"
        >
          <BoxSelect size={16} /> Rebuild
        </button>
      </div>
    </div>
  );
}
