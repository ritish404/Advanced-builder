import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { generateHousePoints } from '../utils/houseGeometry';
import { themes } from '../utils/themes';
import { particleVertShader, particleFragShader } from '../shaders/shaders';

// -----------------------------------------------------------------
// ParticleSystem — THREE.Points (gl.POINTS draw mode).
// gl_PointSize / gl_PointCoord only work with gl.POINTS, not
// gl.TRIANGLES used by InstancedMesh.
// -----------------------------------------------------------------

const ROOM_MAP: Record<number, { name: string; center: THREE.Vector3; stats: string }> = {
  1: { name: 'LIVING ROOM',    center: new THREE.Vector3(-3, 1,  3), stats: '450 SQ FT' },
  2: { name: 'KITCHEN',        center: new THREE.Vector3( 3, 1, -3), stats: '200 SQ FT' },
  3: { name: 'MASTER BEDROOM', center: new THREE.Vector3(-3, 5, -3), stats: '350 SQ FT' },
  4: { name: 'BATHROOM',       center: new THREE.Vector3( 3, 5,  3), stats: '120 SQ FT' },
  5: { name: 'ROOF DECK',      center: new THREE.Vector3( 0, 9,  0), stats: '800 SQ FT' },
  6: { name: 'GARDEN',         center: new THREE.Vector3( 8, 0,  8), stats: '1200 SQ FT' },
};

export function ParticleSystem() {
  const pointsRef   = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const particleDensity = useStore(s => s.particleDensity);
  const themeId         = useStore(s => s.theme);
  const triggerEvent    = useStore(s => s.triggerEvent);
  const lastEventType   = useStore(s => s.lastEventType);
  const explodeTarget   = useStore(s => s.explodeTarget);
  const activeFloor     = useStore(s => s.activeFloor);
  const triggerExplode  = useStore(s => s.triggerExplode);
  const selectRoom      = useStore(s => s.selectRoom);

  const theme = themes[themeId] ?? themes['modern'];

  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Local animation state — kept in refs to avoid triggering re-renders
  const animState = useRef({
    progress:       0,
    targetProgress: 1,
    explodeForce:   0,
    explodeCenter:  new THREE.Vector3(),
    frozenTime:     0,  // accumulated time when paused
    lastRealTime:   -1, // clock.elapsedTime at last un-paused frame
  });

  // ── Particle data (regenerated when count or theme changes) ──────────────
  const particleData = useMemo(
    () => generateHousePoints(particleDensity, theme),
    [particleDensity, theme],
  );

  // ── Stable uniforms (values mutated in useFrame, object never recreated) ──
  const uniforms = useMemo(() => ({
    uTime:          { value: 0 },
    uProgress:      { value: 0 },
    uExplodeForce:  { value: 0 },
    uExplodeCenter: { value: new THREE.Vector3() },
    uActiveFloor:   { value: -1.0 },
  }), []);

  // ── React to build/destroy/explode/rebuild events ────────────────────────
  useEffect(() => {
    const anim = animState.current;
    if (lastEventType === 'build') {
      anim.targetProgress = 1;
      anim.explodeForce   = 0;
    } else if (lastEventType === 'destroy') {
      anim.targetProgress = 0;
      anim.explodeForce   = 0;
    } else if (lastEventType === 'explode') {
      if (explodeTarget) anim.explodeCenter.copy(explodeTarget);
      else               anim.explodeCenter.set(
        (Math.random() - 0.5) * 5, Math.random() * 5, (Math.random() - 0.5) * 5,
      );
      anim.explodeForce = 5.0;
    } else if (lastEventType === 'rebuild') {
      anim.targetProgress = 1;
      anim.explodeForce   = 0;
    }
  }, [triggerEvent, lastEventType, explodeTarget]);

  // ── Per-frame update ─────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;

    const { isPaused, animationSpeed, activeFloor: floor } = useStore.getState();
    const anim = animState.current;

    if (isPaused) {
      // Freeze: keep uTime static so hover noise stops
      anim.lastRealTime = -1; // reset so we re-sync on unpause
    } else {
      // Advance frozen accumulated time by real delta
      if (anim.lastRealTime < 0) {
        anim.lastRealTime = state.clock.elapsedTime;
      }
      anim.frozenTime += state.clock.elapsedTime - anim.lastRealTime;
      anim.lastRealTime = state.clock.elapsedTime;

      mat.uniforms.uTime.value = anim.frozenTime;

      // Animate assembly progress
      if (anim.progress < anim.targetProgress) {
        anim.progress = Math.min(anim.targetProgress, anim.progress + delta * 0.3 * animationSpeed);
        useStore.getState().setBuildProgress(anim.progress);
      } else if (anim.progress > anim.targetProgress) {
        anim.progress = Math.max(anim.targetProgress, anim.progress - delta * 0.5 * animationSpeed);
        useStore.getState().setBuildProgress(anim.progress);
      }

      // Decay explosion force
      if (anim.explodeForce > 0) {
        anim.explodeForce = Math.max(0, anim.explodeForce - delta * 2.0);
      }
    }

    mat.uniforms.uProgress.value      = anim.progress;
    mat.uniforms.uExplodeForce.value   = anim.explodeForce;
    mat.uniforms.uExplodeCenter.value.copy(anim.explodeCenter);

    const floorMap: Record<string, number> = {
      basement: 0, ground: 1, first: 2, second: 2, roof: 3,
    };
    mat.uniforms.uActiveFloor.value = floor ? (floorMap[floor] ?? -1) : -1;
  });

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const idx = e.index;
    if (idx !== undefined) {
      const roomIdx = particleData.roomIndices[idx];
      const room    = ROOM_MAP[roomIdx];
      if (room) {
        selectRoom(room.name);
        triggerExplode(room.center);
      } else {
        triggerExplode(e.point);
      }
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const idx = e.index;
    if (idx !== undefined) {
      const room = ROOM_MAP[particleData.roomIndices[idx]];
      if (room) {
        setHoveredRoom(room.name);
        document.body.style.cursor = 'pointer';
        return;
      }
    }
    setHoveredRoom(null);
    document.body.style.cursor = 'default';
  };

  const handlePointerOut = () => {
    setHoveredRoom(null);
    document.body.style.cursor = 'default';
  };

  const activeFloorNum = activeFloor
    ? ({ basement: 0, ground: 1, first: 2, second: 2, roof: 3 } as Record<string, number>)[activeFloor] ?? -1
    : -1;

  return (
    <group>
      <points
        ref={pointsRef}
        frustumCulled={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <bufferGeometry>
          {/* 'position' required for raycasting / bounding sphere */}
          <bufferAttribute attach="attributes-position"       args={[particleData.targetPositions,  3]} />
          <bufferAttribute attach="attributes-aTargetPosition" args={[particleData.targetPositions,  3]} />
          <bufferAttribute attach="attributes-aScatterPosition" args={[particleData.scatterPositions, 3]} />
          <bufferAttribute attach="attributes-aPhase"          args={[particleData.phases,           1]} />
          <bufferAttribute attach="attributes-aSize"           args={[particleData.sizes,            1]} />
          <bufferAttribute attach="attributes-aColor"          args={[particleData.colors,           3]} />
          <bufferAttribute attach="attributes-aFloorIndex"     args={[particleData.floorIndices,     1]} />
          <bufferAttribute attach="attributes-aRoomIndex"      args={[particleData.roomIndices,      1]} />
        </bufferGeometry>

        <shaderMaterial
          ref={materialRef}
          vertexShader={particleVertShader}
          fragmentShader={particleFragShader}
          uniforms={uniforms}
          transparent={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Floating room labels */}
      {Object.entries(ROOM_MAP).map(([id, room]) => {
        const roomNum  = parseInt(id);
        const floorIdx = roomNum === 5 ? 3 : roomNum >= 3 ? 2 : roomNum === 6 ? 0 : 1;
        const isBuilt  = animState.current.progress > 0.8;
        const isHov    = hoveredRoom === room.name;
        const floorOk  = activeFloorNum === -1 || activeFloorNum === floorIdx;
        if (!floorOk) return null;

        return (
          <Html
            key={id}
            position={room.center}
            center
            style={{ transition: 'opacity 0.3s', opacity: isBuilt && isHov ? 1 : 0, pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(3,6,16,0.85)',
              border: '1px solid rgba(0,191,255,0.4)',
              borderRadius: '8px',
              padding: '6px 12px',
              minWidth: '120px',
              textAlign: 'center',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: '10px', color: '#00BFFF', fontWeight: 'bold', letterSpacing: '0.15em' }}>
                {room.name}
              </div>
              <div style={{ fontSize: '9px', color: '#888', marginTop: '3px' }}>
                {room.stats}
              </div>
            </div>
          </Html>
        );
      })}
    </group>
  );
}
