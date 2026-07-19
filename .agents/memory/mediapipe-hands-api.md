---
name: MediaPipe Hands 0.4.x API
description: Correct initialization pattern for @mediapipe/hands@0.4.1675469240 via CDN
---

**Rule:** Do NOT call `hands.initialize()` — it does not exist in 0.4.x. The WASM graph loads lazily on the first `hands.send()` call.

Correct pattern:
```ts
await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js');
const hands = new (window as any).Hands({
  locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`,
});
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, ... });
hands.onResults(onResults);
// NO initialize() call — just start the rAF loop
requestAnimationFrame(async function loop() {
  if (video.readyState >= 2) await hands.send({ image: video });
  requestAnimationFrame(loop);
});
```

**Why:** Calling `hands.initialize()` throws `Cannot read properties of undefined (reading 'loadGraph')` because that method doesn't exist. The WASM binary is loaded automatically when send() is first called.

**How to apply:** Any time MediaPipe Hands is integrated via CDN in this project.
