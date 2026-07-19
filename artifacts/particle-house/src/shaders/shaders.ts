/**
 * Particle vertex shader.
 * Works with THREE.Points — one vertex per particle.
 * No instanceMatrix (that's InstancedMesh-only).
 * gl_PointSize and gl_PointCoord only work with gl.POINTS.
 */
export const particleVertShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uExplodeForce;
  uniform vec3  uExplodeCenter;
  uniform float uActiveFloor;

  attribute vec3  aTargetPosition;
  attribute vec3  aScatterPosition;
  attribute float aPhase;
  attribute float aSize;
  attribute vec3  aColor;
  attribute float aFloorIndex;
  attribute float aRoomIndex;

  varying vec3  vColor;
  varying float vAlpha;

  vec3 hash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7,  74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453123);
  }

  void main() {
    vColor = aColor;
    vAlpha = 1.0;

    // Floor filter: push clipped particle off-screen instead of discarding
    // (discard only works in fragment shader; here we move behind the far plane)
    if (uActiveFloor >= 0.0 && abs(aFloorIndex - uActiveFloor) > 0.1) {
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      return;
    }

    // Per-particle staggered progress
    float p = clamp(uProgress * 1.5 - aPhase * 0.5, 0.0, 1.0);
    // Smoothstep for non-linear (ease-in-out) assembly
    p = p * p * (3.0 - 2.0 * p);

    // Lerp scatter → target
    vec3 pos = mix(aScatterPosition, aTargetPosition, p);

    // Gentle noise hover when fully assembled
    if (p > 0.98) {
      vec3 n = hash3(aTargetPosition + uTime * 0.1) - 0.5;
      pos += n * 0.015;
      pos.y += sin(uTime * 2.0 + aPhase * 10.0) * 0.008;
    }

    // Explosion push
    if (uExplodeForce > 0.0) {
      vec3 diff = pos - uExplodeCenter;
      float dist = length(diff) + 0.001;
      vec3 dir   = diff / dist;
      float falloff = 1.0 / (1.0 + dist * dist * 0.1);
      pos += dir * uExplodeForce * falloff * (0.5 + aPhase);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    // Size attenuation — larger when scattered (p~0) for dramatic effect
    float sizeMultiplier = mix(1.4, 0.8, p);
    gl_PointSize = aSize * (60.0 / -mvPosition.z) * sizeMultiplier;
    gl_PointSize = max(gl_PointSize, 1.0); // never below 1 px

    gl_Position = projectionMatrix * mvPosition;
  }
`;

/**
 * Particle fragment shader.
 * Draws a soft glowing circle using gl_PointCoord.
 * gl_PointCoord is (0..1, 0..1) across the point sprite quad.
 */
export const particleFragShader = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    // Distance from sprite centre (0.5, 0.5)
    vec2  coord = gl_PointCoord - vec2(0.5);
    float dist  = length(coord);

    // Discard outside the circle
    if (dist > 0.5) discard;

    // Soft falloff: full brightness at centre, fades to edge
    float alpha = smoothstep(0.5, 0.05, dist) * vAlpha;

    // Bright hot core
    vec3 core  = mix(vColor, vec3(1.0), smoothstep(0.25, 0.0, dist) * 0.6);

    gl_FragColor = vec4(core, alpha);
  }
`;
