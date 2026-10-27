import { useEffect, useRef } from 'react'
import { useEditor } from '../store'

/**
 * While the AI writes a new page, the empty part of the canvas is a basin of still water with a little of the
 * logo's blue in it: a real fluid (a small Navier-Stokes solver on the GPU). Stir it with the pointer, click to
 * drop more ink; faint currents keep it alive on its own. The sections settle on top of it as they are written,
 * and it clears when the page is complete. Nothing is hidden by it: the words say what the AI is doing right now.
 */
export function InkWait({ height }: { height: number }) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const label = useEditor((s) => {
    const t = s.aiTurns[s.aiTurns.length - 1]
    const last = t?.steps[t.steps.length - 1]?.text
    return last && last !== 'Writing your page' ? last : 'Reading your request'
  })
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const cv = canvas.current, el = host.current
    if (!cv || !el || still) return
    const W = Math.max(320, Math.round(el.clientWidth)) || 1280
    const H = height
    cv.width = W
    cv.height = H
    const fluid = makeFluid(cv)
    if (!fluid) return
    // the logo's blue (#3FB4F7) as an amount of ink taken from white, so it mixes like ink, not like light
    const INK = (s: number): [number, number, number] => [0.753 * s, 0.294 * s, 0.031 * s]
    const DEEP = (s: number): [number, number, number] => [0.86 * s, 0.4 * s, 0.08 * s]
    for (let i = 0; i < 3; i++) fluid.splat(W * (0.25 + 0.25 * i), H * (0.3 + 0.2 * (i % 2)), (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, INK(0.12))
    let px = -1, py = -1, lastP = 0, last = performance.now(), lastIdle = 0, raf = 0, visible = true, alive = true
    const at = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height] }
    const onMove = (e: PointerEvent) => {
      const [x, y] = at(e), now = performance.now()
      if (px >= 0) fluid.splat(x, y, ((x - px) / W) * 1600, (-(y - py) / H) * 1600, INK(0.05))
      px = x; py = y; lastP = now
    }
    const onLeave = () => { px = py = -1 }
    // a click drops ink and selects nothing (the editor's own click handling stays out of the water)
    const onDown = (e: PointerEvent) => { e.stopPropagation(); const [x, y] = at(e); fluid.splat(x, y, 0, 0, INK(0.35)) }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('pointerdown', onDown)
    // paused when scrolled away or when the tab is hidden: the GPU does nothing for nobody
    const io = new IntersectionObserver((es) => (visible = es.some((x) => x.isIntersecting)))
    io.observe(el)
    const tick = (now: number) => {
      if (!alive) return
      raf = requestAnimationFrame(tick)
      if (!visible || document.visibilityState === 'hidden') { last = now; return }
      const dt = Math.min(0.025, (now - last) / 1000)
      last = now
      if (now - lastIdle > 1600 && now - lastP > 600) {
        lastIdle = now
        const a = Math.random() * Math.PI * 2
        fluid.splat(Math.random() * W, Math.random() * H, Math.cos(a) * 70, Math.sin(a) * 70, Math.random() < 0.2 ? DEEP(0.04) : INK(0.05))
      }
      fluid.step(dt)
      fluid.render()
    }
    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      io.disconnect()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerdown', onDown)
      fluid.dispose()
    }
  }, [height, still])

  return (
    <div ref={host} className="ink-wait fade-in" style={{ position: 'relative', height, background: '#fff', overflow: 'hidden', cursor: 'crosshair', touchAction: 'none' }} aria-live="polite">
      {/* no words in the water: the list on the left says what is happening (the label is for screen readers) */}
      {!still && <canvas ref={canvas} aria-label={label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />}
    </div>
  )
}

/* ---------------- a small GPU fluid: Navier-Stokes on two grids (velocity, dye), Stam / Dobryakov style ---------------- */

interface Fluid {
  splat(x: number, y: number, dx: number, dy: number, color: [number, number, number]): void
  step(dt: number): void
  render(): void
  dispose(): void
}
interface FBO { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number; tx: number; ty: number; attach(id: number): number }
interface DoubleFBO { readonly read: FBO; readonly write: FBO; swap(): void }

const VS = `precision highp float; attribute vec2 aPosition; varying vec2 vUv, vL, vR, vT, vB; uniform vec2 texelSize;
void main(){ vUv = aPosition*.5+.5; vL = vUv - vec2(texelSize.x,0.); vR = vUv + vec2(texelSize.x,0.); vT = vUv + vec2(0.,texelSize.y); vB = vUv - vec2(0.,texelSize.y); gl_Position = vec4(aPosition,0.,1.); }`
const FS = {
  clear: `precision mediump float; varying vec2 vUv; uniform sampler2D uTexture; uniform float value; void main(){ gl_FragColor = value*texture2D(uTexture, vUv); }`,
  splat: `precision highp float; varying vec2 vUv; uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
void main(){ vec2 p = vUv - point; p.x *= aspectRatio; vec3 splat = exp(-dot(p,p)/radius)*color; vec3 base = texture2D(uTarget, vUv).xyz; gl_FragColor = vec4(base+splat, 1.); }`,
  advection: `precision highp float; varying vec2 vUv; uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
void main(){ vec2 coord = vUv - dt*texture2D(uVelocity, vUv).xy*texelSize; vec4 r = texture2D(uSource, coord); float decay = 1. + dissipation*dt; gl_FragColor = r/decay; }`,
  divergence: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
void main(){ float L = texture2D(uVelocity, vL).x, R = texture2D(uVelocity, vR).x, T = texture2D(uVelocity, vT).y, B = texture2D(uVelocity, vB).y; vec2 C = texture2D(uVelocity, vUv).xy;
if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x; if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y; gl_FragColor = vec4(.5*(R-L+T-B), 0., 0., 1.); }`,
  curl: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity;
void main(){ float L = texture2D(uVelocity, vL).y, R = texture2D(uVelocity, vR).y, T = texture2D(uVelocity, vT).x, B = texture2D(uVelocity, vB).x; gl_FragColor = vec4(.5*(R-L-T+B), 0., 0., 1.); }`,
  vorticity: `precision highp float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
void main(){ float L = texture2D(uCurl, vL).x, R = texture2D(uCurl, vR).x, T = texture2D(uCurl, vT).x, B = texture2D(uCurl, vB).x, C = texture2D(uCurl, vUv).x;
vec2 force = .5*vec2(abs(T)-abs(B), abs(R)-abs(L)); force /= length(force)+.0001; force *= curl*C; force.y *= -1.;
vec2 vel = texture2D(uVelocity, vUv).xy; vel += force*dt; vel = min(max(vel, -1000.), 1000.); gl_FragColor = vec4(vel, 0., 1.); }`,
  pressure: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure, uDivergence;
void main(){ float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x, T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x; float d = texture2D(uDivergence, vUv).x; gl_FragColor = vec4((L+R+B+T-d)*.25, 0., 0., 1.); }`,
  gradient: `precision mediump float; varying vec2 vUv, vL, vR, vT, vB; uniform sampler2D uPressure, uVelocity;
void main(){ float L = texture2D(uPressure, vL).x, R = texture2D(uPressure, vR).x, T = texture2D(uPressure, vT).x, B = texture2D(uPressure, vB).x; vec2 vel = texture2D(uVelocity, vUv).xy; vel -= vec2(R-L, T-B); gl_FragColor = vec4(vel, 0., 1.); }`,
  display: `precision highp float; varying vec2 vUv; uniform sampler2D uTexture;
void main(){ vec3 ink = texture2D(uTexture, vUv).rgb; gl_FragColor = vec4(clamp(vec3(1.) - ink, 0., 1.), 1.); }`,
}

function makeFluid(canvas: HTMLCanvasElement): Fluid | null {
  const gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false })
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null
  const W = canvas.width, H = canvas.height
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
    return s
  }
  type Prog = { u: Record<string, WebGLUniformLocation | null>; bind(): void }
  let vs: WebGLShader
  const program = (fs: string): Prog => {
    const p = gl.createProgram()!
    gl.attachShader(p, vs)
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program')
    const u: Record<string, WebGLUniformLocation | null> = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i)!.name; u[name] = gl.getUniformLocation(p, name) }
    return { u, bind: () => gl.useProgram(p) }
  }
  let P: Record<keyof typeof FS, Prog>
  const fbo = (w: number, h: number, internal: number, format: number): FBO => {
    gl.activeTexture(gl.TEXTURE0)
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null)
    const f = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, f)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fbo')
    gl.viewport(0, 0, w, h)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    return { tex, fbo: f, w, h, tx: 1 / w, ty: 1 / h, attach: (id) => (gl.activeTexture(gl.TEXTURE0 + id), gl.bindTexture(gl.TEXTURE_2D, tex), id) }
  }
  const double = (w: number, h: number, i: number, f: number): DoubleFBO => {
    let a = fbo(w, h, i, f), b = fbo(w, h, i, f)
    return { get read() { return a }, get write() { return b }, swap() { const t = a; a = b; b = t } }
  }
  let velocity: DoubleFBO, dye: DoubleFBO, divergence: FBO, curl: FBO, pressure: DoubleFBO
  try {
    vs = compile(gl.VERTEX_SHADER, VS)
    P = Object.fromEntries(Object.entries(FS).map(([k, v]) => [k, program(v)])) as Record<keyof typeof FS, Prog>
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
    const res = (n: number): [number, number] => { const aspect = W / H; return aspect > 1 ? [Math.round(n * aspect), n] : [n, Math.round(n / aspect)] }
    const [sw, sh] = res(128), [dw, dh] = res(448)
    velocity = double(sw, sh, gl.RG16F, gl.RG)
    dye = double(dw, dh, gl.RGBA16F, gl.RGBA)
    divergence = fbo(sw, sh, gl.R16F, gl.RED)
    curl = fbo(sw, sh, gl.R16F, gl.RED)
    pressure = double(sw, sh, gl.R16F, gl.RED)
  } catch {
    return null
  }
  const blit = (target: FBO | null) => {
    if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); gl.viewport(0, 0, target.w, target.h) }
    else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H) }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }
  // thin ink, heavy water: the stir dies out fast and the swirl stays loose, so it drifts rather than races
  const cfg = { densityDissipation: 0.45, velocityDissipation: 1.1, pressure: 0.8, iterations: 20, curl: 8, radius: 0.0022 }
  const splat: Fluid['splat'] = (x, y, dx, dy, color) => {
    P.splat.bind()
    gl.uniform1i(P.splat.u.uTarget, velocity.read.attach(0))
    gl.uniform1f(P.splat.u.aspectRatio, W / H)
    gl.uniform2f(P.splat.u.point, x / W, 1 - y / H)
    gl.uniform3f(P.splat.u.color, dx, dy, 0)
    gl.uniform1f(P.splat.u.radius, cfg.radius * (W / H > 1 ? W / H : 1))
    blit(velocity.write); velocity.swap()
    gl.uniform1i(P.splat.u.uTarget, dye.read.attach(0))
    gl.uniform3f(P.splat.u.color, color[0], color[1], color[2])
    blit(dye.write); dye.swap()
  }
  const step: Fluid['step'] = (dt) => {
    gl.disable(gl.BLEND)
    const ts = (p: Prog) => gl.uniform2f(p.u.texelSize, velocity.read.tx, velocity.read.ty)
    P.curl.bind(); ts(P.curl); gl.uniform1i(P.curl.u.uVelocity, velocity.read.attach(0)); blit(curl)
    P.vorticity.bind(); ts(P.vorticity); gl.uniform1i(P.vorticity.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.vorticity.u.uCurl, curl.attach(1)); gl.uniform1f(P.vorticity.u.curl, cfg.curl); gl.uniform1f(P.vorticity.u.dt, dt); blit(velocity.write); velocity.swap()
    P.divergence.bind(); ts(P.divergence); gl.uniform1i(P.divergence.u.uVelocity, velocity.read.attach(0)); blit(divergence)
    P.clear.bind(); gl.uniform1i(P.clear.u.uTexture, pressure.read.attach(0)); gl.uniform1f(P.clear.u.value, cfg.pressure); blit(pressure.write); pressure.swap()
    P.pressure.bind(); ts(P.pressure); gl.uniform1i(P.pressure.u.uDivergence, divergence.attach(0))
    for (let i = 0; i < cfg.iterations; i++) { gl.uniform1i(P.pressure.u.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap() }
    P.gradient.bind(); ts(P.gradient); gl.uniform1i(P.gradient.u.uPressure, pressure.read.attach(0)); gl.uniform1i(P.gradient.u.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap()
    P.advection.bind(); ts(P.advection); gl.uniform1i(P.advection.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.advection.u.uSource, velocity.read.attach(0)); gl.uniform1f(P.advection.u.dt, dt); gl.uniform1f(P.advection.u.dissipation, cfg.velocityDissipation); blit(velocity.write); velocity.swap()
    gl.uniform1i(P.advection.u.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.advection.u.uSource, dye.read.attach(1)); gl.uniform1f(P.advection.u.dissipation, cfg.densityDissipation); blit(dye.write); dye.swap()
  }
  const render = () => { P.display.bind(); gl.uniform1i(P.display.u.uTexture, dye.read.attach(0)); blit(null) }
  // (the context is left to the canvas: React mounts twice in development, and a lost context never comes back)
  const dispose = () => { gl.bindFramebuffer(gl.FRAMEBUFFER, null) }
  return { splat, step, render, dispose }
}
