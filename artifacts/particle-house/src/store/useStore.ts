import { create } from 'zustand';
import * as THREE from 'three';

export type Floor = 'basement' | 'ground' | 'first' | 'second' | 'roof';
export type VizMode = 'normal' | 'wireframe' | 'blueprint' | 'glass' | 'xray';
export type CameraMode = 'orbit' | 'cinematic' | 'drone' | 'walkthrough' | 'firstperson';
export type Theme = 'modern' | 'luxury' | 'cyberpunk' | 'cabin' | 'beach' | 'japanese' | 'scandinavian' | 'minimal';

interface AppState {
  buildProgress: number;
  isBuilding: boolean;
  isDestroying: boolean;
  selectedRoom: string | null;
  activeFloor: Floor | null;
  vizMode: VizMode;
  cameraMode: CameraMode;
  theme: Theme;
  particleDensity: number;
  animationSpeed: number;
  bloomIntensity: number;
  isDayMode: boolean;
  fps: number;
  triggerEvent: number;
  lastEventType: 'build' | 'destroy' | 'explode' | 'rebuild' | null;
  explodeTarget: THREE.Vector3 | null;

  // Gesture / camera tracking state
  cameraConnected: boolean;
  mediapipeLoaded: boolean;
  handsDetected: number;
  currentGesture: string;
  trackingFps: number;
  isPaused: boolean;

  // actions
  triggerBuild: () => void;
  triggerDestroy: () => void;
  triggerExplode: (target?: THREE.Vector3) => void;
  triggerRebuild: () => void;
  selectRoom: (room: string | null) => void;
  setFloor: (floor: Floor | null) => void;
  setVizMode: (mode: VizMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTheme: (theme: Theme) => void;
  setParticleDensity: (n: number) => void;
  setAnimationSpeed: (s: number) => void;
  setBloomIntensity: (b: number) => void;
  toggleDayNight: () => void;
  setFps: (fps: number) => void;
  setBuildProgress: (progress: number) => void;

  // Gesture / camera setters
  setCameraConnected: (v: boolean) => void;
  setMediapipeLoaded: (v: boolean) => void;
  setHandsDetected: (n: number) => void;
  setCurrentGesture: (g: string) => void;
  setTrackingFps: (fps: number) => void;
  setPaused: (paused: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  buildProgress: 0,
  isBuilding: false,
  isDestroying: false,
  selectedRoom: null,
  activeFloor: null,
  vizMode: 'normal',
  cameraMode: 'orbit',
  theme: 'modern',
  particleDensity: 100000,
  animationSpeed: 1.0,
  bloomIntensity: 1.5,
  isDayMode: false,
  fps: 0,
  triggerEvent: 0,
  lastEventType: null,
  explodeTarget: null,

  // Gesture / camera defaults
  cameraConnected: false,
  mediapipeLoaded: false,
  handsDetected: 0,
  currentGesture: 'none',
  trackingFps: 0,
  isPaused: false,

  triggerBuild: () => set((state) => ({
    isBuilding: true,
    isDestroying: false,
    triggerEvent: state.triggerEvent + 1,
    lastEventType: 'build',
  })),
  triggerDestroy: () => set((state) => ({
    isBuilding: false,
    isDestroying: true,
    triggerEvent: state.triggerEvent + 1,
    lastEventType: 'destroy',
  })),
  triggerExplode: (target?: THREE.Vector3) => set((state) => ({
    triggerEvent: state.triggerEvent + 1,
    lastEventType: 'explode',
    explodeTarget: target || null,
  })),
  triggerRebuild: () => set((state) => ({
    triggerEvent: state.triggerEvent + 1,
    lastEventType: 'rebuild',
  })),

  selectRoom: (room) => set({ selectedRoom: room }),
  setFloor: (floor) => set({ activeFloor: floor }),
  setVizMode: (mode) => set({ vizMode: mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setTheme: (theme) => set({ theme }),
  setParticleDensity: (n) => set({ particleDensity: n }),
  setAnimationSpeed: (s) => set({ animationSpeed: s }),
  setBloomIntensity: (b) => set({ bloomIntensity: b }),
  toggleDayNight: () => set((state) => ({ isDayMode: !state.isDayMode })),
  setFps: (fps) => set({ fps }),
  setBuildProgress: (progress) => set({ buildProgress: progress }),

  setCameraConnected: (v) => set({ cameraConnected: v }),
  setMediapipeLoaded: (v) => set({ mediapipeLoaded: v }),
  setHandsDetected: (n) => set({ handsDetected: n }),
  setCurrentGesture: (g) => set({ currentGesture: g }),
  setTrackingFps: (fps) => set({ trackingFps: fps }),
  setPaused: (paused) => set({ isPaused: paused }),
}));
