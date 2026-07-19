import React, { useEffect, useRef } from 'react';
import { ParticleHouseScene } from './components/ParticleHouseScene';
import { HUD } from './ui/HUD';
import { StatsPanel } from './ui/StatsPanel';
import { ControlPanel } from './ui/ControlPanel';
import { ModeSelector } from './ui/ModeSelector';
import { RightSidebar } from './ui/RightSidebar';
import { GestureWidget } from './ui/GestureWidget';
import { useFPSCounter } from './utils/fps';
import { useStore } from './store/useStore';

export default function App() {
  useFPSCounter();

  const triggerBuild        = useStore(state => state.triggerBuild);
  const setCameraConnected  = useStore(state => state.setCameraConnected);

  // Single webcam stream owned here — shared with GestureWidget via ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-start build animation on load
  useEffect(() => {
    const t = setTimeout(() => triggerBuild(), 1000);
    return () => clearTimeout(t);
  }, [triggerBuild]);

  // Acquire the webcam stream once and attach it to the background <video>
  useEffect(() => {
    let stream: MediaStream | null = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraConnected(true);
        }
      } catch (err) {
        // Sandbox / permission denied — silently continue without camera
        setCameraConnected(false);
      }
    };

    start();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      setCameraConnected(false);
    };
  }, [setCameraConnected]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#030610]">
      {/*
       * Layer 0 — webcam feed as full-screen background
       * scaleX(-1) mirrors the image so it acts like a mirror.
       * opacity-40 keeps particles readable against the live feed.
       */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="fixed inset-0 w-full h-full object-cover z-0 opacity-40"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Layer 1 — particle WebGL canvas (transparent) */}
      <ParticleHouseScene />

      {/* Layer 10 — all HUD overlays */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <HUD />
        <StatsPanel />
        <ModeSelector />
        <RightSidebar />
        <ControlPanel />
        {/* GestureWidget receives the shared videoRef for MediaPipe frame input */}
        <GestureWidget videoRef={videoRef} />
      </div>
    </div>
  );
}
