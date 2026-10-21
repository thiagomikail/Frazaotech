import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector4,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * The home page's energy terrain: a calm surface, like a heat map you fly
 * over. Hot spots rise, glow amber and fade; points of data drift across it.
 *
 * The height is computed twice — in GLSL for the surface and in TypeScript
 * for the drifting points, which ride on it — so the two formulas below must
 * stay identical.
 */

const SIZE = 80;
const SEGMENTS = 220;
const POINT_COUNT = 260;
const TRAIL = 16; // samples behind each point; they overlap into a fading streak
const FIELD = 26; // the points live in a disc of this radius
const HEAT_MAX = 2.6; // the tallest hot spot; heat is read as a fraction of it
const STILL_AT = 78; // the moment drawn when the visitor asked for reduced motion

const COLORS = {
  background: '#161616',
  low: '#121417',
  high: '#353b43',
  line: '#46525e',
  hot: '#e0a000',
  core: '#ffe7a3',
  data: '#7fb2ff',
};

/** Hot spots: a slow Lissajous drift, and an amplitude that rises and fades to nothing. */
const SPOTS = [
  { cx: -6, cz: -4, ax: 4, az: 3, wx: 0.05, wz: 0.04, amp: 2.4, rate: 0.21, phase: 0.0, radius: 3.2 },
  { cx: 7, cz: -7, ax: 3, az: 4, wx: 0.04, wz: 0.06, amp: 2.0, rate: 0.17, phase: 1.7, radius: 2.6 },
  { cx: 3, cz: 6, ax: 5, az: 2, wx: 0.03, wz: 0.05, amp: 2.6, rate: 0.13, phase: 3.1, radius: 3.6 },
  { cx: -9, cz: 7, ax: 2, az: 4, wx: 0.06, wz: 0.03, amp: 1.8, rate: 0.25, phase: 4.4, radius: 2.4 },
  { cx: 12, cz: 3, ax: 3, az: 3, wx: 0.05, wz: 0.05, amp: 2.2, rate: 0.19, phase: 5.6, radius: 3.0 },
  { cx: -2, cz: -12, ax: 4, az: 2, wx: 0.04, wz: 0.07, amp: 2.0, rate: 0.15, phase: 2.4, radius: 2.8 },
];

const smoothstep01 = (x: number) => x * x * (3 - 2 * x);

function spotState(t: number, out: Float32Array) {
  SPOTS.forEach((s, i) => {
    const pulse = smoothstep01(0.5 + 0.5 * Math.sin(s.rate * t + s.phase));
    out[i * 4] = s.cx + s.ax * Math.sin(s.wx * t + s.phase);
    out[i * 4 + 1] = s.cz + s.az * Math.cos(s.wz * t + s.phase);
    out[i * 4 + 2] = s.amp * pulse;
    out[i * 4 + 3] = s.radius;
  });
}

// Keep in step with baseHeight() in the vertex shader.
const baseHeight = (x: number, z: number, t: number) =>
  0.55 * Math.sin(x * 0.21 + t * 0.05) * Math.cos(z * 0.17 - t * 0.04) +
  0.25 * Math.sin(x * 0.43 - z * 0.31 + t * 0.09) +
  0.12 * Math.sin(x * 0.9 + z * 0.7 - t * 0.13);

function heatAt(x: number, z: number, spots: Float32Array) {
  let h = 0;
  for (let i = 0; i < SPOTS.length; i++) {
    const dx = x - spots[i * 4];
    const dz = z - spots[i * 4 + 1];
    const r = spots[i * 4 + 3];
    h += spots[i * 4 + 2] * Math.exp(-(dx * dx + dz * dz) / (r * r));
  }
  return h;
}

const terrainVertex = /* glsl */ `
  uniform float uTime;
  uniform vec4 uSpots[${SPOTS.length}];
  varying float vHeat;
  varying float vBase;
  varying vec2 vXZ;
  varying vec3 vWorld;
  varying float vDepth;

  float baseHeight(vec2 p, float t) {
    return 0.55 * sin(p.x * 0.21 + t * 0.05) * cos(p.y * 0.17 - t * 0.04)
         + 0.25 * sin(p.x * 0.43 - p.y * 0.31 + t * 0.09)
         + 0.12 * sin(p.x * 0.9 + p.y * 0.7 - t * 0.13);
  }

  void main() {
    vec3 p = position;
    float base = baseHeight(p.xz, uTime);
    float heat = 0.0;
    for (int i = 0; i < ${SPOTS.length}; i++) {
      vec2 d = p.xz - uSpots[i].xy;
      heat += uSpots[i].z * exp(-dot(d, d) / (uSpots[i].w * uSpots[i].w));
    }
    p.y = base + heat;
    vBase = base;
    vHeat = heat;
    vXZ = p.xz;
    vWorld = p;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const terrainFragment = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uLine;
  uniform vec3 uHot;
  uniform vec3 uCore;
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vHeat;
  varying float vBase;
  varying vec2 vXZ;
  varying vec3 vWorld;
  varying float vDepth;

  float gridLine(vec2 p) {
    vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    // Relief: light from the upper left, from the surface's own slope.
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (n.y < 0.0) n = -n;
    float light = max(dot(n, normalize(vec3(-0.45, 0.75, 0.35))), 0.0);
    vec3 col = mix(uLow, uHigh, smoothstep(-0.9, 0.9, vBase)) * (0.5 + 0.8 * light);

    // Hot spots keep the shading, so they read as mounds rather than paint;
    // only the very top turns pale and blooms.
    float heat = clamp(vHeat / ${HEAT_MAX.toFixed(2)}, 0.0, 1.0);
    col = mix(col, uHot * (0.45 + 0.75 * light), smoothstep(0.1, 0.7, heat));
    col = mix(col, uCore * (0.75 + 0.35 * light), 0.9 * smoothstep(0.86, 1.0, heat));

    // A fine plotted grid, warming up where the surface is hot.
    col += gridLine(vXZ) * mix(uLine, uHot, heat) * 0.35;

    // Contour lines on the total height.
    float h = (vBase + vHeat) * 3.0;
    float contour = 1.0 - min(abs(fract(h - 0.5) - 0.5) / fwidth(h), 1.0);
    col += contour * mix(uLine * 0.6, uHot, heat) * 0.5;

    float fog = smoothstep(uFogNear, uFogFar, vDepth);
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }
`;

// The sky is drawn like the terrain, in the fog's color: a clear color would be
// converted twice on its way through the bloom and come out gray.
const skyFragment = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

const pointsVertex = /* glsl */ `
  attribute float aHeat;
  attribute float aSeed;
  attribute float aLife;
  attribute float aTail; // 0 at the head of a point, 1 at the end of its streak
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vHeat;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float twinkle = 0.8 + 0.2 * sin(uTime * 2.0 + aSeed * 40.0);
    float taper = 1.0 - 0.6 * aTail;
    gl_PointSize = (7.0 + 5.0 * aHeat) * taper * twinkle * uPixelRatio * (12.0 / -mv.z);
    vHeat = aHeat;
    // Fade out in the distance, and right in front of the lens, where a point would be a blot.
    float depth = -mv.z;
    vAlpha = 0.6 * aLife * pow(1.0 - aTail, 1.5) * smoothstep(4.0, 9.0, depth) * (1.0 - smoothstep(18.0, 46.0, depth));
    gl_Position = projectionMatrix * mv;
  }
`;

const pointsFragment = /* glsl */ `
  uniform vec3 uCool;
  uniform vec3 uHot;
  varying float vHeat;
  varying float vAlpha;

  void main() {
    float a = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
    vec3 col = mix(uCool, uHot, clamp(vHeat * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(col * (1.2 + vHeat), a * a * vAlpha);
  }
`;

export interface Terrain {
  /** Stops the animation and frees the GPU. */
  dispose: () => void;
}

/**
 * Draws the terrain into `canvas`, which fills its parent. With `still`, one
 * frame and no animation (for visitors who asked the system to reduce motion).
 * Throws if WebGL is not available; the page keeps its plain background then.
 */
export function mountTerrain(canvas: HTMLCanvasElement, { still = false } = {}): Terrain {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(COLORS.background);

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 120);

  const spots = new Float32Array(SPOTS.length * 4);
  const spotUniform = SPOTS.map(() => new Vector4());

  const ground = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  ground.rotateX(-Math.PI / 2);
  const terrainMaterial = new ShaderMaterial({
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    uniforms: {
      uTime: { value: 0 },
      uSpots: { value: spotUniform },
      uLow: { value: new Color(COLORS.low) },
      uHigh: { value: new Color(COLORS.high) },
      uLine: { value: new Color(COLORS.line) },
      uHot: { value: new Color(COLORS.hot) },
      uCore: { value: new Color(COLORS.core) },
      uFog: { value: new Color(COLORS.background) },
      uFogNear: { value: 14 },
      uFogFar: { value: 46 },
    },
  });
  scene.add(new Mesh(ground, terrainMaterial));

  const skyGeometry = new SphereGeometry(100, 16, 8);
  const skyMaterial = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fragmentShader: skyFragment,
    uniforms: { uColor: { value: new Color(COLORS.background) } },
  });
  scene.add(new Mesh(skyGeometry, skyMaterial));

  // Drifting data points: each keeps a heading near the flow's that wanders
  // slowly, fades in after a respawn, and is drawn as a head plus TRAIL fading
  // samples behind it.
  const heads = new Float32Array(POINT_COUNT * 2);
  const offsets = new Float32Array(POINT_COUNT);
  const speeds = new Float32Array(POINT_COUNT);
  const wander = new Float32Array(POINT_COUNT);
  const life = new Float32Array(POINT_COUNT);
  const SAMPLES = TRAIL + 1;
  const positions = new Float32Array(POINT_COUNT * SAMPLES * 3);
  const heats = new Float32Array(POINT_COUNT * SAMPLES);
  const lives = new Float32Array(POINT_COUNT * SAMPLES);
  const seeds = new Float32Array(POINT_COUNT * SAMPLES);
  const tails = new Float32Array(POINT_COUNT * SAMPLES);
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  // Anywhere in the disc at the start; afterwards on its upstream edge, so the
  // flow stays even.
  const spawn = (i: number, flow: number | null) => {
    const r = flow === null ? FIELD * Math.sqrt(Math.random()) : FIELD * rand(0.9, 1);
    const angle = flow === null ? rand(0, Math.PI * 2) : flow + Math.PI + rand(-1.3, 1.3);
    heads[i * 2] = Math.cos(angle) * r;
    heads[i * 2 + 1] = Math.sin(angle) * r;
    offsets[i] = rand(-0.45, 0.45);
    speeds[i] = rand(0.35, 0.9);
    life[i] = flow === null ? 1 : 0;
  };
  for (let i = 0; i < POINT_COUNT; i++) {
    wander[i] = Math.random();
    spawn(i, null);
    for (let k = 0; k < SAMPLES; k++) {
      seeds[i * SAMPLES + k] = wander[i];
      tails[i * SAMPLES + k] = k / TRAIL;
    }
  }
  const cloud = new BufferGeometry();
  cloud.setAttribute('position', new BufferAttribute(positions, 3));
  cloud.setAttribute('aHeat', new BufferAttribute(heats, 1));
  cloud.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  cloud.setAttribute('aLife', new BufferAttribute(lives, 1));
  cloud.setAttribute('aTail', new BufferAttribute(tails, 1));
  const pointsMaterial = new ShaderMaterial({
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uCool: { value: new Color(COLORS.data) },
      uHot: { value: new Color(COLORS.hot) },
    },
  });
  const points = new Points(cloud, pointsMaterial);
  points.frustumCulled = false; // the points move every frame; their bounds are never recomputed
  scene.add(points);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.8, 0.55, 0.62);
  composer.addPass(bloom);
  const output = new OutputPass();
  composer.addPass(output);

  // The pointer tilts the view a little.
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  let t = still ? STILL_AT : 0;
  let last = performance.now();
  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!still) t += dt;

    spotState(t, spots);
    spotUniform.forEach((v, i) => v.set(spots[i * 4], spots[i * 4 + 1], spots[i * 4 + 2], spots[i * 4 + 3]));
    terrainMaterial.uniforms.uTime.value = t;
    pointsMaterial.uniforms.uTime.value = t;

    // The camera's orbit angle. The data flows across the view, left to right and
    // a little away, wherever the orbit is: coming at the camera it reads as rain.
    const a = t * 0.035;
    const flow = a - Math.PI / 2 - 0.35;
    for (let i = 0; i < POINT_COUNT; i++) {
      offsets[i] += Math.sin(t * 0.3 + wander[i] * 10) * 0.12 * dt;
      const dx = Math.cos(flow + offsets[i]);
      const dz = Math.sin(flow + offsets[i]);
      let x = heads[i * 2] + dx * speeds[i] * dt;
      let z = heads[i * 2 + 1] + dz * speeds[i] * dt;
      if (x * x + z * z > FIELD * FIELD) {
        spawn(i, flow);
        x = heads[i * 2];
        z = heads[i * 2 + 1];
      }
      heads[i * 2] = x;
      heads[i * 2 + 1] = z;
      life[i] = Math.min(1, life[i] + dt * 0.6);

      // The streak hugs the surface; faster points leave longer ones.
      const gap = 0.025 + speeds[i] * 0.015;
      for (let k = 0; k < SAMPLES; k++) {
        const v = i * SAMPLES + k;
        const sx = x - dx * gap * k;
        const sz = z - dz * gap * k;
        const heat = heatAt(sx, sz, spots);
        positions[v * 3] = sx;
        positions[v * 3 + 1] = baseHeight(sx, sz, t) + heat + 0.18;
        positions[v * 3 + 2] = sz;
        heats[v] = Math.min(heat / HEAT_MAX, 1);
        lives[v] = life[i];
      }
    }
    cloud.attributes.position.needsUpdate = true;
    cloud.attributes.aHeat.needsUpdate = true;
    cloud.attributes.aLife.needsUpdate = true;

    // A slow orbit, looking ahead and in toward the middle of the field. A tall,
    // narrow screen (a phone) flies higher and looks down, so the field fills it.
    pointer.sx += (pointer.x - pointer.sx) * 0.04;
    pointer.sy += (pointer.y - pointer.sy) * 0.04;
    const portrait = camera.aspect < 0.9;
    const radius = portrait ? 15 : 17;
    const height = portrait ? 11 : 6.2;
    const reach = portrait ? 2 : 5;
    camera.position.set(
      Math.cos(a) * radius,
      height + Math.sin(t * 0.07) * 0.5 - pointer.sy * 0.8,
      Math.sin(a) * radius,
    );
    camera.lookAt(Math.cos(a + 0.85) * reach, 0.3, Math.sin(a + 0.85) * reach);
    camera.rotateY(-pointer.sx * 0.06);

    composer.render();
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement ?? canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    // Narrow screens see the field from farther back, so the hot spots stay in frame.
    camera.fov = w < 640 ? 54 : 42;
    // On a wide screen the text sits on the left: shift the view so the middle
    // of the field lands right of center instead of behind the headline.
    if (w / h > 1.2) camera.setViewOffset(w, h, -0.16 * w, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    // Resizing clears the canvas: draw again now, without moving time on, so it
    // never shows blank — the still frame has no next frame to wait for.
    step(last);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement ?? canvas);
  resize();

  // Only animate while the hero is on screen and the tab is visible.
  let frame = 0;
  let onScreen = true;
  const loop = (now: number) => {
    step(now);
    frame = requestAnimationFrame(loop);
  };
  const run = () => {
    if (still || frame || !onScreen || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };
  const halt = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) run();
    else halt();
  });
  visibility.observe(canvas);
  const onVisibility = () => (document.hidden ? halt() : run());
  document.addEventListener('visibilitychange', onVisibility);
  run();

  return {
    dispose: () => {
      halt();
      observer.disconnect();
      visibility.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      ground.dispose();
      skyGeometry.dispose();
      skyMaterial.dispose();
      cloud.dispose();
      terrainMaterial.dispose();
      pointsMaterial.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
