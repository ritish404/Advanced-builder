import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Auto-start build animation on load
  useEffect(() => {
    const t = setTimeout(() => triggerBuild(), 1000);
    return () => clearTimeout(t);
  }, [triggerBuild]);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraConnected(false);
  }, [setCameraConnected]);

  const startCamera = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setCameraStarting(true);
    setCameraError('');

    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;

    try {
      if (!window.isSecureContext) {
        throw new Error('Camera access requires a secure HTTPS connection.');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: 'user' },
        },
        audio: false,
      });

      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Camera preview is not available.');

      video.srcObject = stream;
      await video.play();

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (streamRef.current === stream) {
          setCameraConnected(false);
          setCameraError('Camera access stopped. Select Enable camera to reconnect.');
        }
      }, { once: true });

      setCameraConnected(true);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      const cameraError = error as DOMException;
      const message = cameraError.name === 'NotAllowedError'
        ? 'Camera permission is blocked. Allow camera access in the browser site settings, then retry.'
        : cameraError.name === 'NotFoundError'
          ? 'No camera was found on this device.'
          : cameraError.name === 'NotReadableError'
            ? 'The camera is already in use by another application.'
            : cameraError.message || 'Unable to start the camera.';

      setCameraConnected(false);
      setCameraError(message);
    } finally {
      if (requestId === requestIdRef.current) setCameraStarting(false);
    }
  }, [setCameraConnected]);

  // Try once automatically, then keep an explicit user-gesture retry available.
  useEffect(() => {
    void startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

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
        <GestureWidget
          videoRef={videoRef}
          cameraStarting={cameraStarting}
          cameraError={cameraError}
          onEnableCamera={startCamera}
        />
      </div>
    </div>
  );
}
