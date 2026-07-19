import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

// ─── MediaPipe hand connections ───────────────────────────────────────────────
const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// ─── Gesture classifier ───────────────────────────────────────────────────────
function classifyGesture(lm: any[]): string {
  if (!lm || lm.length < 21) return 'none';

  const ext = (tip: number, pip: number) => lm[tip].y < lm[pip].y;
  const idx  = ext(8,  6);
  const mid  = ext(12, 10);
  const rng  = ext(16, 14);
  const pky  = ext(20, 18);
  const thumbUp = lm[4].y < lm[2].y;
  const numOpen = [idx, mid, rng, pky].filter(Boolean).length;

  const dx = lm[4].x - lm[8].x;
  const dy = lm[4].y - lm[8].y;
  if (Math.sqrt(dx*dx + dy*dy) < 0.07) return 'pinch';
  if (numOpen >= 4 && thumbUp)          return 'open';
  if (numOpen === 0 && !thumbUp)        return 'fist';
  if (thumbUp && numOpen <= 1 && lm[4].y < lm[0].y) return 'thumbsup';
  return 'none';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GestureWidget({ videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Read-only subscriptions for the debug display
  const mediapipeLoaded = useStore(s => s.mediapipeLoaded);
  const handsDetected   = useStore(s => s.handsDetected);
  const currentGesture  = useStore(s => s.currentGesture);
  const trackingFps     = useStore(s => s.trackingFps);
  const cameraConnected = useStore(s => s.cameraConnected);

  useEffect(() => {
    const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';
    let cancelled = false;
    let rafId     = 0;
    let sending   = false;

    // Cooldown map: key → last-fired timestamp
    const lastFired: Record<string, number> = {};
    const cool = (key: string, ms: number) => {
      const now = Date.now();
      if (now - (lastFired[key] ?? 0) < ms) return false;
      lastFired[key] = now;
      return true;
    };

    // Swipe velocity buffer (per hand)
    const swipeBuf: { x: number; t: number }[] = [];

    // FPS tracking
    const fpsTimestamps: number[] = [];

    const loadScript = (src: string) =>
      new Promise<void>((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.onload  = () => res();
        s.onerror = () => rej(new Error(`Script load failed: ${src}`));
        document.head.appendChild(s);
      });

    const onResults = (results: any) => {
      if (cancelled) return;

      // FPS
      const now = performance.now();
      fpsTimestamps.push(now);
      const cutoff = now - 1000;
      while (fpsTimestamps[0] < cutoff) fpsTimestamps.shift();
      useStore.getState().setTrackingFps(fpsTimestamps.length);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background for the debug panel
      ctx.fillStyle = 'rgba(2, 6, 18, 0.75)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const numHands = results.multiHandLandmarks?.length ?? 0;
      useStore.getState().setHandsDetected(numHands);

      let dominantGesture = 'none';
      let anyFist         = false;
      let openCount       = 0;

      if (results.multiHandLandmarks && results.multiHandedness) {
        for (let h = 0; h < results.multiHandLandmarks.length; h++) {
          const lm         = results.multiHandLandmarks[h];
          const handedness = results.multiHandedness[h].label as 'Left' | 'Right';
          const color      = handedness === 'Right' ? '#00BFFF' : '#FF4466';

          // Draw skeleton connections
          ctx.strokeStyle = color + 'aa';
          ctx.lineWidth   = 1.5;
          for (const [a, b] of CONNECTIONS) {
            ctx.beginPath();
            ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height);
            ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height);
            ctx.stroke();
          }

          // Draw landmark dots
          for (let p = 0; p < lm.length; p++) {
            const r = p === 0 ? 5 : (p % 4 === 0 ? 3.5 : 2);
            ctx.fillStyle = p === 0 ? '#ffffff' : color;
            ctx.beginPath();
            ctx.arc(lm[p].x * canvas.width, lm[p].y * canvas.height, r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Classify
          const g = classifyGesture(lm);
          if (g !== 'none') dominantGesture = g;
          if (g === 'fist') anyFist = true;
          if (g === 'open') openCount++;

          // Gesture label above wrist
          const wx = lm[0].x * canvas.width;
          const wy = lm[0].y * canvas.height;
          ctx.font      = 'bold 8px monospace';
          ctx.fillStyle = color;
          ctx.fillText(g.toUpperCase(), Math.max(2, wx - 16), Math.max(10, wy - 8));

          // Swipe detection (track wrist X velocity)
          swipeBuf.push({ x: lm[0].x, t: now });
        }
      }

      // Prune swipe buffer to last 500ms
      const swipeCut = now - 500;
      while (swipeBuf[0] && swipeBuf[0].t < swipeCut) swipeBuf.shift();

      // Detect swipe: >0.22 normalised units in <450ms
      if (swipeBuf.length >= 5) {
        const dxSwipe = swipeBuf[swipeBuf.length - 1].x - swipeBuf[0].x;
        const dtSwipe = swipeBuf[swipeBuf.length - 1].t - swipeBuf[0].t;
        if (Math.abs(dxSwipe) > 0.22 && dtSwipe < 450) {
          dominantGesture = dxSwipe > 0 ? 'swipe_right' : 'swipe_left';
        }
      }

      // Two open hands → rotate mode
      if (openCount >= 2) dominantGesture = 'two_hands';

      useStore.getState().setCurrentGesture(dominantGesture);
      useStore.getState().setPaused(anyFist);

      if (numHands === 0) return;

      // ── Gesture → store actions ───────────────────────────────────────────
      const THEMES: string[] = [
        'modern','luxury','cyberpunk','cabin','beach','japanese','scandinavian','minimal',
      ];
      const CAM_MODES: string[] = ['orbit','cinematic','drone','walkthrough'];
      const store = useStore.getState();

      switch (dominantGesture) {
        case 'open': {
          const hand0 = results.multiHandedness[0]?.label;
          if (hand0 === 'Right' && cool('build',   2000)) store.triggerBuild();
          if (hand0 === 'Left'  && cool('destroy', 2000)) store.triggerDestroy();
          break;
        }
        case 'two_hands':
          if (cool('rotate', 600)) store.setCameraMode('orbit');
          break;
        case 'swipe_left':
          if (cool('swipe', 1500)) {
            const i = THEMES.indexOf(store.theme);
            store.setTheme(THEMES[(i - 1 + THEMES.length) % THEMES.length] as any);
            swipeBuf.length = 0;
          }
          break;
        case 'swipe_right':
          if (cool('swipe', 1500)) {
            const i = THEMES.indexOf(store.theme);
            store.setTheme(THEMES[(i + 1) % THEMES.length] as any);
            swipeBuf.length = 0;
          }
          break;
        case 'thumbsup':
          if (cool('camera', 2000)) {
            const i = CAM_MODES.indexOf(store.cameraMode);
            store.setCameraMode(CAM_MODES[(i + 1) % CAM_MODES.length] as any);
          }
          break;
        case 'pinch':
          if (cool('explode', 2500)) store.triggerExplode();
          break;
      }
    };

    const init = async () => {
      try {
        await loadScript(`${CDN}/hands.js`);
        if (cancelled) return;

        const HandsCtor = (window as any).Hands;
        if (!HandsCtor) throw new Error('window.Hands not available after script load');

        const hands = new HandsCtor({
          locateFile: (f: string) => `${CDN}/${f}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        hands.onResults(onResults);
        // NOTE: hands.initialize() does NOT exist in @mediapipe/hands@0.4.x.
        // The WASM graph loads lazily on the first hands.send() call.
        if (cancelled) { hands.close(); return; }

        setStatus('ready');
        useStore.getState().setMediapipeLoaded(true);

        // rAF loop — send one frame at a time (no concurrent sends)
        const loop = async () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && !video.paused && !sending) {
            sending = true;
            try { await hands.send({ image: video }); } catch (_) { /* ignore */ }
            sending = false;
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        if (!cancelled) {
          console.warn('GestureWidget: MediaPipe init failed', err);
          setStatus('error');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      useStore.getState().setMediapipeLoaded(false);
      useStore.getState().setHandsDetected(0);
      useStore.getState().setCurrentGesture('none');
    };
  }, [videoRef]);

  // ── Gesture label helpers ─────────────────────────────────────────────────
  const GESTURE_ICONS: Record<string, string> = {
    open:        '🖐',
    fist:        '✊',
    pinch:       '🤌',
    thumbsup:    '👍',
    swipe_left:  '←',
    swipe_right: '→',
    two_hands:   '🙌',
    none:        '–',
  };

  return (
    <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col gap-2">
      {/* Skeleton preview panel */}
      <div
        className="relative rounded-xl overflow-hidden border border-white/10"
        style={{ width: 200, height: 150 }}
      >
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020612]/90 gap-2">
            <div className="w-4 h-4 border-2 border-cyan-500/40 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-[8px] text-white/40 uppercase tracking-[0.2em]">Loading AI</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#020612]/90">
            <span className="text-[8px] text-red-400/70 uppercase tracking-widest">Vision Unavailable</span>
          </div>
        )}
        {/* Landmark canvas — mirrored via CSS to match the background video */}
        <canvas
          ref={canvasRef}
          width={200}
          height={150}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div className="absolute top-1.5 left-2 text-[7px] font-bold text-cyan-400/60 tracking-[0.2em] uppercase">
          AI Vision
        </div>
      </div>

      {/* Debug info strip */}
      <div className="glass-panel rounded-lg px-3 py-2 text-[9px] space-y-1 min-w-[200px]">
        <div className="flex justify-between text-white/40 border-b border-white/5 pb-1 mb-1">
          <span className="uppercase tracking-widest">Gesture Control</span>
          <span
            className="font-bold"
            style={{ color: mediapipeLoaded ? '#22d3ee' : '#f87171' }}
          >
            {mediapipeLoaded ? 'READY' : 'WAIT'}
          </span>
        </div>
        <Row label="Camera"  value={cameraConnected  ? 'ON'  : 'OFF'} good={cameraConnected} />
        <Row label="Hands"   value={`${handsDetected}/2`} good={handsDetected > 0} />
        <Row label="Fps"     value={String(trackingFps)} good={trackingFps > 10} />
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-white/30">Gesture</span>
          <span className="font-bold text-cyan-300">
            {GESTURE_ICONS[currentGesture] ?? '–'} {currentGesture !== 'none' ? currentGesture.replace('_',' ').toUpperCase() : '–'}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/30">{label}</span>
      <span className="font-bold" style={{ color: good ? '#4ade80' : '#f87171' }}>{value}</span>
    </div>
  );
}
