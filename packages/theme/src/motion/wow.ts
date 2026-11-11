// "Wow": on top of lively, the home page's top section gets a moving 3D background (a field of
// points in the site's colours, rippling, leaning towards the pointer), a cursor that follows the
// pointer and grows over links, and buttons that pull towards it. The 3D part runs only on devices
// that can (WebGL, a few cores, not saving data) and only while the top is on screen.
import { animate } from "motion";

export function start() {
  void hero3d();
  if (matchMedia("(pointer: fine)").matches) {
    cursor();
    magnetic();
  }
}

const cssColour = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

async function hero3d() {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-hero-3d]");
  if (!canvas) return;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData || (navigator.hardwareConcurrency ?? 4) < 4) return;
  const gl = document.createElement("canvas").getContext("webgl2");
  if (!gl) return;
  const { BufferAttribute, BufferGeometry, Clock, Color, PerspectiveCamera, Points, Scene, ShaderMaterial, Vector2, WebGLRenderer } = await import("three");

  const host = canvas.parentElement as HTMLElement;
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 2.2, 7);
  camera.lookAt(0, 0, 0);

  // A grid of points; their height is a sum of waves, worked out in the vertex shader.
  const COLS = 120;
  const ROWS = 70;
  const positions = new Float32Array(COLS * ROWS * 3);
  for (let i = 0; i < COLS; i++)
    for (let j = 0; j < ROWS; j++) {
      const k = (i * ROWS + j) * 3;
      positions[k] = (i / (COLS - 1) - 0.5) * 18;
      positions[k + 1] = 0;
      positions[k + 2] = (j / (ROWS - 1) - 0.5) * 10;
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new Vector2(0, 0) },
    uA: { value: new Color(cssColour("--brand-primary", "#3b2bd9")) },
    uB: { value: new Color(cssColour("--brand-accent", "#18e0b8")) },
    uSize: { value: 3.4 * Math.min(devicePixelRatio, 2) },
  };
  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec2 uPointer; uniform float uSize;
      varying float vH;
      void main() {
        vec3 p = position;
        float d = distance(p.xz, uPointer * vec2(9.0, 5.0));
        float h = sin(p.x * 0.6 + uTime * 0.9) * 0.35 + cos(p.z * 0.8 + uTime * 0.7) * 0.25
                + sin((p.x + p.z) * 0.35 + uTime * 0.5) * 0.3 + exp(-d * 0.45) * 0.9;
        p.y = h;
        vH = h;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (6.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB; varying float vH;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        vec3 c = mix(uA, uB, smoothstep(-0.4, 1.0, vH));
        gl_FragColor = vec4(c, smoothstep(0.5, 0.1, r));
      }`,
  });
  scene.add(new Points(geometry, material));

  const size = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  };
  size();
  new ResizeObserver(size).observe(host);

  const target = new Vector2();
  host.addEventListener("pointermove", (e) => {
    const r = host.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  });

  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  }).observe(host);
  const clock = new Clock();
  canvas.classList.add("is-on");
  const frame = () => {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uPointer.value.lerp(target, 0.05);
    renderer.render(scene, camera);
  };
  frame();
}

/** A dot that follows the pointer and a ring that trails it, growing over links and buttons. */
function cursor() {
  const dot = document.createElement("div");
  const ring = document.createElement("div");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  dot.setAttribute("aria-hidden", "true");
  ring.setAttribute("aria-hidden", "true");
  document.body.append(dot, ring);
  document.documentElement.classList.add("has-cursor");
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let rx = x;
  let ry = y;
  addEventListener("pointermove", (e) => {
    x = e.clientX;
    y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    const over = (e.target as Element | null)?.closest?.("a, button, [role=button], input, textarea, select");
    ring.classList.toggle("is-over", !!over);
  });
  addEventListener("pointerdown", () => ring.classList.add("is-down"));
  addEventListener("pointerup", () => ring.classList.remove("is-down"));
  document.addEventListener("pointerleave", () => ring.classList.add("is-away"));
  document.addEventListener("pointerenter", () => ring.classList.remove("is-away"));
  const tick = () => {
    rx += (x - rx) * 0.18;
    ry += (y - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    requestAnimationFrame(tick);
  };
  tick();
}

/** Main buttons pull a little towards the pointer, and spring back when it leaves. */
function magnetic() {
  for (const b of document.querySelectorAll<HTMLElement>(".btn-primary, .hero .btn")) {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.25;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.35;
      animate(b, { x: dx, y: dy }, { duration: 0.25 });
    });
    b.addEventListener("pointerleave", () => animate(b, { x: 0, y: 0 }, { type: "spring", stiffness: 300, damping: 15 }));
  }
}
