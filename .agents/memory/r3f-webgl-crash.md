---
name: R3F WebGL crash handling
description: How to prevent THREE.WebGLRenderer Error creating WebGL context from crashing the app
---

**Rule:** Always wrap `<Canvas>` in both a pre-flight check and a React ErrorBoundary.

```tsx
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

class CanvasErrorBoundary extends React.Component<{children, fallback}, {error}> {
  static getDerivedStateFromError(e) { return { error: e }; }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}
```

**Why:** Replit's preview sandbox runs without a GPU. `new WebGLRenderer()` throws synchronously inside R3F's Canvas constructor. Without an ErrorBoundary the entire React tree crashes. Without the pre-flight check the error still reaches the ErrorBoundary but causes a React "Context Lost" flash first.

**How to apply:** particle-house pattern — `hasWebGL()` gates the `<Canvas>` render; `<CanvasErrorBoundary fallback={<WebGLFallback />}>` wraps it. The fallback shows a gradient background with a "GPU Unavailable in Preview" message so the UI remains functional.
