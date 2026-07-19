import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

export function Lighting() {
  const isDayMode = useStore(state => state.isDayMode);
  
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  useFrame((state, delta) => {
    if (directionalLightRef.current && ambientLightRef.current) {
      const targetIntensityDir = isDayMode ? 1.5 : 0.2;
      const targetIntensityAmb = isDayMode ? 0.8 : 0.1;
      
      directionalLightRef.current.intensity = THREE.MathUtils.lerp(directionalLightRef.current.intensity, targetIntensityDir, delta * 2);
      ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, targetIntensityAmb, delta * 2);
      
      const targetColor = isDayMode ? new THREE.Color('#ffffff') : new THREE.Color('#334455');
      directionalLightRef.current.color.lerp(targetColor, delta * 2);
    }
  });

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.1} color="#ffffff" />
      <directionalLight
        ref={directionalLightRef}
        position={[10, 20, 10]}
        intensity={0.2}
        color="#334455"
        castShadow
      />
      {/* Interior warm lights */}
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#FFA500" distance={10} />
      <pointLight position={[4, 3, -4]} intensity={0.3} color="#FFD700" distance={8} />
      <pointLight position={[-4, 3, 4]} intensity={0.3} color="#FFD700" distance={8} />
    </>
  );
}
