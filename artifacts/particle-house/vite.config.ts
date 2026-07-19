import path from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// ── Copy MediaPipe Hands assets into public/mediapipe-hands/ ──────────────────
//
//  Why not CDN?  Replit's CSP blocks cross-origin WASM evaluation, so loading
//  from cdn.jsdelivr.net silently fails.
//
//  Why not symlinkSync / cpSync?  pnpm stores packages as symlinks in
//  node_modules.  Both fs helpers mishandle the top-level symlink and either
//  recreate it (failing with EEXIST on restart) or produce an empty directory.
//
//  Fix: resolve the real path with `realpath`, then copy with `cp -rL` which
//  dereferences all symlinks and copies actual files.  Guard on hands.js so
//  we skip if files are already present.
//
try {
  const dest = path.join(import.meta.dirname, 'public/mediapipe-hands');
  if (!existsSync(path.join(dest, 'hands.js'))) {
    const real = execSync('realpath node_modules/@mediapipe/hands', {
      cwd: import.meta.dirname,
    }).toString().trim();
    execSync(`rm -rf "${dest}" && cp -rL "${real}" "${dest}"`, {
      cwd: import.meta.dirname,
    });
    console.log('[vite] MediaPipe Hands assets copied to public/mediapipe-hands/');
  }
} catch (e: any) {
  console.warn('[vite] Could not copy MediaPipe assets:', e?.message ?? e);
}

// ── Port / base-path validation ───────────────────────────────────────────────
const rawPort = process.env.PORT || "5173";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          // cartographer intentionally omitted — it injects data-component-name
          // HTML attributes that crash R3F's applyProps() on Three.js objects.
          await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, '..', '..', 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { strict: false },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
