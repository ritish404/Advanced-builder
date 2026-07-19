import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

export function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const cameraMode = useStore(state => state.cameraMode);
  const selectedRoom = useStore(state => state.selectedRoom);
  
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());
  
  useEffect(() => {
    if (cameraMode === 'orbit') {
      targetPos.current.set(15, 10, 15);
      targetLook.current.set(0, 2, 0);
    } else if (cameraMode === 'cinematic') {
      targetPos.current.set(20, 2, 20);
      targetLook.current.set(0, 4, 0);
    } else if (cameraMode === 'drone') {
      targetPos.current.set(0, 30, 0);
      targetLook.current.set(0, 0, 0);
    } else if (cameraMode === 'firstperson' || cameraMode === 'walkthrough') {
      targetPos.current.set(0, 1.6, 5);
      targetLook.current.set(0, 1.6, 0);
    }
    
    if (selectedRoom) {
      // Zoom into a specific room if selected
      // Actually we'll just handle basic zoom for now, but a real implementation might map room name to specific coordinates
    }
  }, [cameraMode, selectedRoom]);

  useFrame((state, delta) => {
    if (cameraMode === 'cinematic') {
      const time = state.clock.getElapsedTime();
      targetPos.current.x = Math.sin(time * 0.1) * 20;
      targetPos.current.z = Math.cos(time * 0.1) * 20;
      targetPos.current.y = 5 + Math.sin(time * 0.2) * 3;
    }

    // Only override camera position for non-orbit modes.
    // In orbit mode, OrbitControls owns camera movement — lerping
    // against it every frame would fight the user's input.
    if (cameraMode !== 'orbit') {
      camera.position.lerp(targetPos.current, delta * 2.0);
      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLook.current, delta * 2.0);
      }
    }

    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls 
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      autoRotate={cameraMode === 'orbit' && !selectedRoom}
      autoRotateSpeed={0.5}
      maxPolarAngle={Math.PI / 2 + 0.1}
      minDistance={2}
      maxDistance={50}
    />
  );
}
