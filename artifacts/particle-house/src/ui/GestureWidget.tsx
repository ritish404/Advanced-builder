import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

// ─── MediaPipe hand skeleton connections ──────────────────────────────────────
const CONNECTIONS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

// ─── Gesture classifier ───────────────────────────────────────────────────────
// Landmarks are in raw (un-mirrored) video space. y=0 is top, y=1 is bottom.
// "Extended" means fingertip y < PIP joint y (tip is ABOVE the knuckle).
function classifyGesture(lm: any[]): string {
  if (!lm || lm.length < 21) return 'none';

  // Is finger extended?  tip.y < pip.y  (lower y = higher on screen)
  const ext = (tip: number, pip: number) => lm[tip].y < lm[pip].y - 0.02;

  const idx  = ext(8,  6);
  const mid  = ext(12, 10);
  const rng  = ext(16, 14);
  const pky  = ext(20, 18);
  // Thumb: compare thumb tip to thumb IP joint on x-axis (works for both hands)
  const thumbExt = Math.abs(lm[4].x - lm[2].x) > 0.04;
  const numOpen  = [idx, mid, rng, pky].filter(Boolean).length;

  // Pinch: thumb tip close to index tip
  const dx = lm[4].x - lm[8].x;
  const dy = lm[4].y - lm[8].y;
  const pinchDist = Math.sqrt(dx * dx + dy * dy);
  if (pinchDist < 0.08) return 'pinch';

  // Open hand: all 4 fingers extended + thumb
  if (numOpen >= 4 && thumbExt) return 'open';

  // Fist: all 4 fingers curled, thumb not extended
  if (numOpen === 0 && !thumbExt) return 'fist';

  // Thumbs-up: thumb extended upward, all fingers curled, wrist in lower half
  if (thumbExt && numOpen <= 1 && lm[4].y < lm[2].y && !idx) return 'thumbsup';

  return 'none';
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function GestureWidget({ videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const mediapipeLoaded = useStore(s => s.mediapipeLoaded);
  const handsDetected   = useStore(s => s.handsDetected);
  const currentGesture  = useStore(s => s.currentGesture);
  const trackingFps     = useStore(s => s.trackingFps);
  const cameraConnected = useStore(s => s.cameraConnected);

  useEffect(() => {
    // MediaPipe WASM & model files are copied to public/mediapipe-hands/ by
    // vite.config.ts at startup so they're served locally — no CDN needed and
    // no CSP / cross-origin-isolation issues.
    const BASE = `${import.meta.env.BASE_URL}mediapipe-hands`;

    let cancelled = false;
    let rafId     = 0;
    let sending   = false;

    // Cooldown tracker
    const lastFired: Record<string, number> = {};
    const cool = (key: string, ms: number) => {
      const now = Date.now();
      if (now - (lastFired[key] ?? 0) < ms) return false;
      lastFired[key] = now;
      return true;
    };

    // Per-hand swipe trackers keyed by handedness label
    const swipeBufs: Record<string, { x: number; t: number }[]> = {
      Left: [],
      Right: [],
    };

    const fpsTimestamps: number[] = [];

    const loadScript = (src: string) =>
      new Promise<void>((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
        const s = document.createElement('script');
        s.src    = src;
        s.onload  = () => res();
        s.onerror = () => rej(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
      });

    const onResults = (results: any) => {
      if (cancelled) return;

      // FPS counter
      const now = performance.now();
      fpsTimestamps.push(now);
      while (fpsTimestamps[0] < now - 1000) fpsTimestamps.shift();
      useStore.getState().setTrackingFps(fpsTimestamps.length);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ── Draw live camera thumbnail first (canvas has CSS scaleX(-1) so
      //    it mirrors to match the background video) ──────────────────────
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Dark tint so skeleton stands out
        ctx.fillStyle = 'rgba(0, 4, 18, 0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#020612';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const numHands = results.multiHandLandmarks?.length ?? 0;
      useStore.getState().setHandsDetected(numHands);

      let dominantGesture = 'none';
      let anyFist         = false;
      let openCount       = 0;

      if (results.multiHandLandmarks && results.multiHandedness) {
        for (let h = 0; h < results.multiHandLandmarks.length; h++) {
          const lm         = results.multiHandLandmarks[h];
          // MediaPipe's "Left" / "Right" is from the model's perspective
          // which is mirrored relative to the person; swap labels so they
          // match the user's natural left / right hand.
          const rawLabel   = results.multiHandedness[h].label as 'Left' | 'Right';
          const handedness = rawLabel === 'Left' ? 'Right' : 'Left';
          const color      = handedness === 'Right' ? '#00BFFF' : '#FF4466';

          // Draw skeleton
          ctx.strokeStyle = color + 'bb';
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

          // Gesture label near wrist
          const wx = lm[0].x * canvas.width;
          const wy = Math.min(lm[0].y * canvas.height, canvas.height - 14);
          ctx.font         = 'bold 9px monospace';
          ctx.fillStyle    = color;
          ctx.strokeStyle  = '#00000088';
          ctx.lineWidth    = 2;
          const label      = `${handedness[0]}: ${g.toUpperCase()}`;
          ctx.strokeText(label, Math.max(2, wx - 22), wy - 6);
          ctx.fillText(label,   Math.max(2, wx - 22), wy - 6);

          // Per-hand swipe tracking (wrist x position)
          const buf = swipeBufs[rawLabel]; // use rawLabel key consistently
          buf.push({ x: lm[0].x, t: now });
        }
      }

      // Prune swipe buffers to last 600ms
      for (const key of Object.keys(swipeBufs)) {
        while (swipeBufs[key][0] && swipeBufs[key][0].t < now - 600) {
          swipeBufs[key].shift();
        }
      }

      // Detect swipe across either hand's trajectory
      let swipeDetected = 'none';
      for (const key of Object.keys(swipeBufs)) {
        const buf = swipeBufs[key];
        if (buf.length >= 4) {
          const dxSwipe = buf[buf.length - 1].x - buf[0].x;
          const dtSwipe = buf[buf.length - 1].t - buf[0].t;
          // Threshold: 15% of frame width (0.15), within 600ms
          if (Math.abs(dxSwipe) > 0.15 && dtSwipe < 600) {
            // Swap left/right because video is mirrored for user
            swipeDetected = dxSwipe > 0 ? 'swipe_left' : 'swipe_right';
            swipeBufs[key] = []; // clear after detection
            break;
          }
        }
      }

      if (swipeDetected !== 'none') dominantGesture = swipeDetected;
      if (openCount >= 2)           dominantGesture  = 'two_hands';

      useStore.getState().setCurrentGesture(dominantGesture);
      useStore.getState().setPaused(anyFist);

      if (numHands === 0) return;

      // ── Gesture → actions ─────────────────────────────────────────────────
      const THEMES: string[] = [
        'modern','luxury','cyberpunk','cabin','beach','japanese','scandinavian','minimal',
      ];
      const CAM_MODES: string[] = ['orbit','cinematic','drone','walkthrough'];
      const store = useStore.getState();

      switch (dominantGesture) {
        case 'open': {
          // Right hand open → Build, Left hand open → Destroy
          for (let h = 0; h < results.multiHandLandmarks.length; h++) {
            const rawLabel = results.multiHandedness[h].label;
            const corrected = rawLabel === 'Left' ? 'Right' : 'Left';
            const g = classifyGesture(results.multiHandLandmarks[h]);
            if (g === 'open') {
              if (corrected === 'Right' && cool('build',   2000)) store.triggerBuild();
              if (corrected === 'Left'  && cool('destroy', 2000)) store.triggerDestroy();
            }
          }
          break;
        }
        case 'two_hands':
          if (cool('rotate', 800)) store.setCameraMode('orbit');
          break;
        case 'swipe_left':
          if (cool('swipe', 1200)) {
            const i = THEMES.indexOf(store.theme);
            store.setTheme(THEMES[(i - 1 + THEMES.length) % THEMES.length] as any);
          }
          break;
        case 'swipe_right':
          if (cool('swipe', 1200)) {
            const i = THEMES.indexOf(store.theme);
            store.setTheme(THEMES[(i + 1) % THEMES.length] as any);
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
        // Load hands.js from our locally-served public/mediapipe-hands/
        await loadScript(`${BASE}/hands.js`);
        if (cancelled) return;

        const HandsCtor = (window as any).Hands;
        if (!HandsCtor) throw new Error('window.Hands not defined after script load');

        const hands = new HandsCtor({
          // All WASM + model files are served locally
          locateFile: (f: string) => `${BASE}/${f}`,
        });

        hands.setOptions({
          maxNumHands:          2,
          modelComplexity:      1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence:  0.5,
        });

        hands.onResults(onResults);
        if (cancelled) { hands.close(); return; }

        setStatus('ready');
        useStore.getState().setMediapipeLoaded(true);

        // rAF loop: send one frame at a time (never concurrent)
        const loop = async () => {
          if (cancelled) return;
          const video = videoRef.current;
          if (video && video.readyState >= 2 && !sending) {
            sending = true;
            try {
              await hands.send({ image: video });
            } catch (e) {
              // Log WASM errors to console so they're visible, but keep running
              console.warn('[GestureWidget] hands.send error:', e);
            }
            sending = false;
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message ?? String(err);
          console.error('[GestureWidget] init failed:', msg);
          setErrorMsg(msg);
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
      useStore.getState().setTrackingFps(0);
    };
  }, [videoRef]);

  // ── Gesture icon map ──────────────────────────────────────────────────────
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
      {/* ── Camera / skeleton preview ─────────────────────────────────────── */}
      <div
        className="relative rounded-xl overflow-hidden border border-white/10"
        style={{ width: 220, height: 160, background: '#020612' }}
      >
        {/* Status overlays */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <div className="w-5 h-5 border-2 border-cyan-500/40 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-[8px] text-white/40 uppercase tracking-[0.2em]">Loading AI</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 z-10 p-2">
            <span className="text-[7px] text-red-400/90 font-bold uppercase tracking-widest">Vision Error</span>
            <span className="text-[6px] text-red-300/60 text-center leading-tight break-all">
              {errorMsg.slice(0, 80)}
            </span>
          </div>
        )}
        {!cameraConnected && status !== 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#020612]/80 z-10">
            <span className="text-2xl">📷</span>
            <span className="text-[7px] text-white/30 text-center px-3 leading-tight">
              Camera not detected.<br/>Grant permission in your browser.
            </span>
          </div>
        )}

        {/* Landmark canvas — scaleX(-1) mirrors it to match the background video */}
        <canvas
          ref={canvasRef}
          width={220}
          height={160}
          className="w-full h-full"
          style={{ transform: 'scaleX(-1)', display: 'block' }}
        />
        <div className="absolute top-1.5 left-2 text-[7px] font-bold text-cyan-400/70 tracking-[0.2em] uppercase z-20">
          AI Vision
        </div>
        {handsDetected > 0 && (
          <div className="absolute top-1.5 right-2 text-[7px] font-bold text-green-400 z-20">
            {handsDetected} ✓
          </div>
        )}
      </div>

      {/* ── Debug strip ──────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-lg px-3 py-2 text-[9px] space-y-1" style={{ minWidth: 220 }}>
        <div className="flex justify-between border-b border-white/5 pb-1 mb-1">
          <span className="text-white/40 uppercase tracking-widest">Gesture Control</span>
          <span className="font-bold" style={{ color: mediapipeLoaded ? '#22d3ee' : '#f87171' }}>
            {mediapipeLoaded ? 'READY' : 'WAIT'}
          </span>
        </div>
        <Row label="Camera"    value={cameraConnected ? 'ON'  : 'OFF'} good={cameraConnected} />
        <Row label="Hands"     value={`${handsDetected}/2`}           good={handsDetected > 0} />
        <Row label="Vision FPS" value={String(trackingFps)}           good={trackingFps > 10} />
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-white/30">Gesture</span>
          <span className="font-bold text-cyan-300 text-[10px]">
            {GESTURE_ICONS[currentGesture] ?? '–'}&nbsp;
            {currentGesture !== 'none' ? currentGesture.replace('_', ' ').toUpperCase() : '—'}
          </span>
        </div>
      </div>

      {/* ── Gesture cheatsheet ────────────────────────────────────────────── */}
      <div className="glass-panel rounded-lg px-3 py-2" style={{ minWidth: 220 }}>
        <div className="text-[8px] text-white/30 uppercase tracking-widest mb-1.5">How to control</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {[
            ['🖐 Right open', 'Build'],
            ['🖐 Left open',  'Destroy'],
            ['✊ Fist',       'Pause'],
            ['🤌 Pinch',     'Explode'],
            ['← Swipe',      'Prev style'],
            ['→ Swipe',      'Next style'],
            ['👍 Thumbs up', 'Camera'],
            ['🙌 Two hands', 'Orbit'],
          ].map(([g, a]) => (
            <React.Fragment key={g}>
              <span className="text-[8px] text-white/30">{g}</span>
              <span className="text-[8px] text-white/50">{a}</span>
            </React.Fragment>
          ))}
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
