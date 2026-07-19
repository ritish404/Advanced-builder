import React from 'react';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import { useStore } from '../store/useStore';

export function PostProcessing() {
  const bloomIntensity = useStore(state => state.bloomIntensity);
  const vizMode = useStore(state => state.vizMode);

  return (
    <EffectComposer multisampling={4}>
      <Bloom 
        intensity={vizMode === 'blueprint' ? bloomIntensity * 0.5 : bloomIntensity} 
        luminanceThreshold={0.2} 
        luminanceSmoothing={0.9} 
        mipmapBlur 
      />
      <Vignette offset={0.1} darkness={1.1} />
      <DepthOfField 
        focusDistance={0.0} 
        focalLength={0.02} 
        bokehScale={2} 
        height={480} 
      />
    </EffectComposer>
  );
}
