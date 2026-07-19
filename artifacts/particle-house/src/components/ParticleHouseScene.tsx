import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { ParticleSystem } from './ParticleSystem';
import { CameraController } from './CameraController';
import { Lighting } from './Lighting';
import { PostProcessing } from './PostProcessing';

// ---- WebGL pre-flight check ----
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      (c as any).getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

// ---- Error boundary: catches WebGL renderer errors thrown by R3F ----
interface EBState { error: Error | null }
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  EBState
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

// Fallback shown when WebGL is unavailable (sandbox / headless environment)
function WebGLFallback() {
  return (
    <div
      className="fixed inset-0 z-0"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #0a1628 0%, #030610 60%, #000 100%)',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-3 px-8">
          <div className="text-[11px] text-cyan-500/60 uppercase tracking-[0.3em] font-bold">
            GPU Unavailable in Preview
          </div>
          <div className="text-[9px] text-white/30 tracking-widest uppercase">
            Open in a browser tab for full particle rendering
          </div>
        </div>
      </div>
    </div>
  );
}

export function ParticleHouseScene() {
  // Transparent canvas — particles float over the webcam background
  const webglOk = hasWebGL();

  return (
    <div className="fixed inset-0 z-[1]">
      <CanvasErrorBoundary fallback={<WebGLFallback />}>
        {webglOk ? (
          <Canvas
            gl={{
              antialias: true,
              alpha: true,           // transparent so webcam video shows behind
              preserveDrawingBuffer: false,
              powerPreference: 'high-performance',
            }}
            camera={{ position: [15, 10, 15], fov: 45 }}
            dpr={[1, 1.5]}
            style={{ background: 'transparent' }}
          >
            {/* No <color> or <fog> — scene is transparent over the webcam layer */}
            <Lighting />
            <ParticleSystem />
            <CameraController />
            <PostProcessing />
          </Canvas>
        ) : (
          <WebGLFallback />
        )}
      </CanvasErrorBoundary>
    </div>
  );
}
