/* Interactive figures for the Fifteen Steps deck — grab points directly, no sliders.
   Geometry + palette follow the tutorial's interactives (next/build-your-own-qubit.jsx).
   Sync: drags in the presenter window broadcast state; the ?present mirror applies it. */
const { useState, useRef, useEffect } = React;

const figBC = 'BroadcastChannel' in window ? new BroadcastChannel('three-arches-figs') : null;
const isMirror = /[?&]present/.test(location.search) || location.hash.indexOf('present') >= 0;
const figCache = {};
if (figBC) {
  if (isMirror) figBC.postMessage({ hello: true });
  else figBC.addEventListener('message', (e) => {
    if (e.data && e.data.hello) Object.keys(figCache).forEach((k) => figBC.postMessage({ fig: k, state: figCache[k] }));
  });
}
function useSynced(figKey, initial) {
  const [st, setSt] = useState(initial);
  useEffect(() => {
    if (!figBC || !isMirror) return;
    const fn = (e) => { const d = e.data; if (d && d.fig === figKey) setSt(d.state); };
    figBC.addEventListener('message', fn);
    return () => figBC.removeEventListener('message', fn);
  }, []);
  const set = (updater) => setSt((prev) => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (figBC && !isMirror) { figCache[figKey] = next; figBC.postMessage({ fig: figKey, state: next }); }
    return next;
  });
  return [st, set];
}

const INK = "#002157", SOFT = "#5C6E8F", GOLD = "#EE7203", TEAL = "#00A1E4",
      RED = "#F71D25", LBLUE = "#AFE0F7", PEACH = "#FDE9D3", GRID = "#E1F3FC";
const MONO = "'IBM Plex Mono', 'Courier New', monospace";
const DEG = 180 / Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm360 = (a) => ((a % 360) + 360) % 360;

function useFig(onMove) {
  const ref = useRef(null);
  const act = useRef(null);
  const loc = (e) => {
    const s = ref.current, r = s.getBoundingClientRect(), vb = s.viewBox.baseVal;
    return { x: (e.clientX - r.left) * vb.width / r.width, y: (e.clientY - r.top) * vb.height / r.height };
  };
  return {
    ref,
    down: (id) => (e) => { act.current = id; e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault(); },
    move: (e) => { if (act.current != null) onMove(act.current, loc(e)); },
    up: () => { act.current = null; },
  };
}

function Grab({ x, y, r = 11, fill, stroke = INK, onDown }) {
  return (
    <g style={{ cursor: "grab" }} onPointerDown={onDown}>
      <circle cx={x} cy={y} r={30} fill="rgba(0,0,0,0)" />
      <circle cx={x} cy={y} r={r + 7} fill="none" stroke={fill === "#FFFFFF" ? stroke : fill} strokeWidth="1.5" opacity="0.45" />
      <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth="3" />
    </g>
  );
}

function Txt({ x, y, size = 24, fill = SOFT, anchor = "middle", bold, transform, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={size}
      fontWeight={bold ? 600 : 400} fill={fill} transform={transform}>{children}</text>
  );
}

function Button({ onClick, ghost, children }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: MONO, fontSize: 22, fontWeight: 600, letterSpacing: 0.5,
      padding: "12px 24px", borderRadius: 10, cursor: "pointer",
      background: ghost ? "#FFFFFF" : GOLD, color: ghost ? INK : "#FFFFFF",
      border: ghost ? `2.5px solid ${LBLUE}` : `2.5px solid ${INK}`,
    }}>{children}</button>
  );
}

const svgStyle = { width: "100%", display: "block", touchAction: "none", userSelect: "none" };

/* deterministic pseudo-random from a seed so both windows draw identical outcomes */
function seeded(seed) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

// ── STEP 1 : flip a fair coin ──
function FigFlip() {
  const [st, setSt] = useSynced("s1flip", { n: 0, seed: 7 });
  const rnd = seeded(st.seed);
  const flips = Array.from({ length: st.n }, () => (rnd() < 0.5 ? 1 : 0));
  const nH = flips.reduce((a, b) => a + b, 0);
  // running fraction path
  let run = "", h = 0;
  flips.forEach((v, i) => { h += v; const x = 90 + (i / Math.max(1, st.n - 1)) * 720; run += `${x.toFixed(1)},${(430 - 280 * (h / (i + 1))).toFixed(1)} `; });
  const shown = flips.slice(-40);
  return (
    <div>
      <svg viewBox="0 0 900 500" style={svgStyle}>
        <line x1="90" y1="430" x2="810" y2="430" stroke={INK} strokeWidth="3" />
        <line x1="90" y1="150" x2="810" y2="150" stroke={INK} strokeWidth="3" opacity="0.25" />
        <line x1="90" y1="290" x2="810" y2="290" stroke={SOFT} strokeWidth="2.5" strokeDasharray="8 7" />
        <Txt x={62} y={438} anchor="end">0</Txt>
        <Txt x={62} y={298} anchor="end">½</Txt>
        <Txt x={62} y={158} anchor="end">1</Txt>
        <Txt x={450} y={478} size={24}>running fraction of heads, flip by flip</Txt>
        {st.n > 1 && <polyline points={run} fill="none" stroke={GOLD} strokeWidth="4" strokeLinejoin="round" />}
        {st.n > 0 && (() => { const x = 810, y = 430 - 280 * (nH / st.n); return <circle cx={x - 0} cy={y} r="10" fill={GOLD} stroke={INK} strokeWidth="3" />; })()}
        {shown.map((v, i) => (
          <circle key={i} cx={110 + i * 17.5} cy={80} r={7} fill={v ? GOLD : "#FFFFFF"} stroke={v ? INK : SOFT} strokeWidth="2.5" />
        ))}
        <Txt x={450} y={40} size={25} fill={INK} bold>
          {st.n === 0 ? "no flips yet — what do you expect to see?" : `${st.n} flips · heads ${nH} · fraction ${(nH / st.n).toFixed(2)}`}
        </Txt>
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
        <Button onClick={() => setSt((s) => ({ ...s, n: s.n + 1 }))}>flip once</Button>
        <Button onClick={() => setSt((s) => ({ ...s, n: s.n + 25 }))}>flip ×25</Button>
        <Button ghost onClick={() => setSt({ n: 0, seed: (Math.random() * 1e9) | 0 })}>reset</Button>
      </div>
    </div>
  );
}

// ── STEP 2 : three mystery coins ──
function FigMystery() {
  const [st, setSt] = useSynced("s2myst", { seed: 11, counts: [[0, 0], [0, 0], [0, 0]], revealed: false });
  const r0 = seeded(st.seed);
  const order = [0, 1, 2].sort(() => r0() - 0.5); // which slot is fair / biased / deterministic
  const kinds = ["fair · p = ½", "biased · p = 0.8", "deterministic"];
  const detSide = r0() < 0.5 ? 1 : 0;
  const pOf = (slot) => (order[slot] === 0 ? 0.5 : order[slot] === 1 ? 0.8 : detSide);
  const flip = (slot, n) => setSt((s) => {
    const c = s.counts.map((x) => x.slice());
    const rr = seeded((s.seed ^ (slot * 7919)) + c[slot][0] + c[slot][1] * 131);
    for (let i = 0; i < n; i++) c[slot][rr() < pOf(slot) ? 0 : 1]++;
    return { ...s, counts: c };
  });
  return (
    <div>
      <svg viewBox="0 0 900 380" style={svgStyle}>
        {[0, 1, 2].map((i) => {
          const [h, t] = st.counts[i], n = h + t, x = 180 + i * 270;
          return (
            <g key={i}>
              <circle cx={x} cy={110} r={64} fill={st.revealed ? PEACH : "#FFFFFF"} stroke={INK} strokeWidth="4" />
              <text x={x} y={128} textAnchor="middle" fontFamily={MONO} fontSize="50" fontWeight="600" fill={INK}>{st.revealed ? "" : "?"}</text>
              {st.revealed && <Txt x={x} y={118} size={23} fill={INK} bold>{kinds[order[i]].split(" · ")[0]}</Txt>}
              {st.revealed && kinds[order[i]].includes("·") && <Txt x={x} y={146} size={20} fill={GOLD} bold>{kinds[order[i]].split(" · ")[1]}</Txt>}
              <Txt x={x} y={230} size={26} fill={INK} bold>{n ? `H ${h} · T ${t}` : "unflipped"}</Txt>
              <Txt x={x} y={268} size={24} fill={GOLD} bold>{n ? `fraction ${(h / n).toFixed(2)}` : " "}</Txt>
              <rect x={x - 90} y={292} width={180} height={20} rx={8} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2" />
              {n > 0 && <rect x={x - 90} y={292} width={180 * (h / n)} height={20} rx={8} fill={GOLD} opacity="0.85" />}
            </g>
          );
        })}
        <Txt x={450} y={360} size={24}>one is fair, one is biased, one has already made up its mind — which is which?</Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 6, flexWrap: "wrap" }}>
        {[0, 1, 2].map((i) => <Button key={i} onClick={() => flip(i, 10)}>{`coin ${"ABC"[i]} ×10`}</Button>)}
        <Button ghost onClick={() => setSt((s) => ({ ...s, revealed: !s.revealed }))}>{st.revealed ? "hide" : "reveal"}</Button>
        <Button ghost onClick={() => setSt({ seed: (Math.random() * 1e9) | 0, counts: [[0, 0], [0, 0], [0, 0]], revealed: false })}>new coins</Button>
      </div>
    </div>
  );
}

// ── STEP 3 : two numbers per run ──
function FigScatter() {
  const [st, setSt] = useSynced("s3scat", { runs: [] });
  const run = (kind) => setSt((s) => {
    const p = kind === "fair" ? 0.5 : Math.random() < 0.5 ? 0 : 1;
    let h = 0;
    for (let i = 0; i < 30; i++) if (Math.random() < p) h++;
    const ph = h / 30, sd = Math.sqrt(ph * (1 - ph));
    return { runs: [...s.runs, { p: ph, s: sd, kind }].slice(-120) };
  });
  const X = (p) => 130 + 640 * p, Y = (s) => 430 - 560 * s;
  return (
    <div>
      <svg viewBox="0 0 900 500" style={svgStyle}>
        <line x1="130" y1="430" x2="770" y2="430" stroke={INK} strokeWidth="3" />
        <line x1="130" y1="430" x2="130" y2="120" stroke={INK} strokeWidth="3" />
        <Txt x={130} y={470}>0</Txt><Txt x={450} y={470}>½</Txt><Txt x={770} y={470}>1</Txt>
        <Txt x={450} y={498} size={24}>average p̂ (fraction of heads)</Txt>
        <Txt x={92} y={130} anchor="end" size={24} transform="rotate(-90 92 130)"> </Txt>
        <Txt x={104} y={148} anchor="end">½</Txt>
        <Txt x={40} y={290} size={24} transform="rotate(-90 40 290)">band width</Txt>
        {st.runs.map((r, i) => (
          <circle key={i} cx={X(r.p)} cy={Y(r.s)} r={8} fill={r.kind === "fair" ? GOLD : "#FFFFFF"}
            stroke={r.kind === "fair" ? INK : RED} strokeWidth="2.5" opacity="0.8" />
        ))}
        {/* belief markers: expectations, fixed before flipping */}
        <g>
          <line x1={X(0.5) - 16} y1={Y(0.5)} x2={X(0.5) + 16} y2={Y(0.5)} stroke={GOLD} strokeWidth="4" />
          <line x1={X(0.5)} y1={Y(0.5) - 16} x2={X(0.5)} y2={Y(0.5) + 16} stroke={GOLD} strokeWidth="4" />
          <Txt x={X(0.5)} y={Y(0.5) - 26} size={23} fill={GOLD} bold>fair-coin belief</Txt>
          <line x1={X(0.5) - 16} y1={Y(0) - 0} x2={X(0.5) + 16} y2={Y(0)} stroke={RED} strokeWidth="4" />
          <line x1={X(0.5)} y1={Y(0) - 16} x2={X(0.5)} y2={Y(0) + 16} stroke={RED} strokeWidth="4" />
          <Txt x={X(0.5)} y={Y(0) - 24} size={23} fill={RED} bold>mystery-coin belief — inside!</Txt>
        </g>
      </svg>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
        <Button onClick={() => run("fair")}>run 30 flips · fair coin</Button>
        <Button onClick={() => run("det")}>run 30 · mystery deterministic</Button>
        <Button ghost onClick={() => setSt({ runs: [] })}>clear</Button>
      </div>
    </div>
  );
}

// ── STEP 4 : the semicircle ──
function FigArc() {
  const [st, setSt] = useSynced("s4arc", { p: 0.7 });
  const p = st.p;
  const f = useFig((id, pt) => setSt({ p: clamp((pt.x - 150) / 600, 0, 1) }));
  const P = { x: 150 + 600 * p, y: 430 - 600 * Math.sqrt(Math.max(0, p * (1 - p))) };
  const sd = Math.sqrt(p * (1 - p));
  return (
    <svg ref={f.ref} viewBox="0 0 900 520" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="90" y1="430" x2="810" y2="430" stroke={INK} strokeWidth="3" />
      <path d="M 150 430 A 300 300 0 0 1 750 430" fill="none" stroke={GOLD} strokeWidth="5" strokeDasharray="10 9" />
      <line x1={P.x} y1={430} x2={P.x} y2={P.y} stroke={TEAL} strokeWidth="3" strokeDasharray="7 6" />
      <circle cx="150" cy="430" r="9" fill={INK} /><circle cx="750" cy="430" r="9" fill={INK} />
      <circle cx="450" cy="430" r="7" fill={SOFT} />
      <Txt x={150} y={474}>always T</Txt><Txt x={750} y={474}>always H</Txt><Txt x={450} y={474}>fair odds</Txt>
      <Txt x={P.x} y={P.y - 34} size={26} fill={INK} bold>your coin</Txt>
      <Grab x={P.x} y={P.y} fill={GOLD} onDown={f.down("p")} />
      <Txt x={450} y={70} size={27} fill={INK} bold>{`(p − ½)² + band width² = ¼`}</Txt>
      <Txt x={450} y={110} size={25} fill={GOLD}>the Bernoulli circle — radius ½, centered on fair odds</Txt>
      <Txt x={450} y={510} size={25} fill={INK}>{`p = ${p.toFixed(2)} · band width = √(p(1−p)) = ${sd.toFixed(2)} — drag the coin`}</Txt>
    </svg>
  );
}

// ── STEP 5 : mixing beliefs (chords fill the half-disk) ──
function FigMix() {
  const [st, setSt] = useSynced("mix", { q1: 0, q2: 1, lam: 0.5 });
  const { q1, q2, lam } = st;
  const A = (q) => ({ x: 150 + 600 * q, y: 430 - 600 * Math.sqrt(Math.max(0, q * (1 - q))) });
  const P1 = A(q1), P2 = A(q2);
  const f = useFig((id, pt) => {
    if (id === "q1") setSt((s) => ({ ...s, q1: clamp((pt.x - 150) / 600, 0, 1) }));
    else if (id === "q2") setSt((s) => ({ ...s, q2: clamp((pt.x - 150) / 600, 0, 1) }));
    else {
      const dx = P1.x - P2.x, dy = P1.y - P2.y, L2 = dx * dx + dy * dy || 1;
      setSt((s) => ({ ...s, lam: clamp(((pt.x - P2.x) * dx + (pt.y - P2.y) * dy) / L2, 0, 1) }));
    }
  });
  const B = { x: P2.x + lam * (P1.x - P2.x), y: P2.y + lam * (P1.y - P2.y) };
  const m = lam * q1 + (1 - lam) * q2;
  const spread = (430 - B.y) / 600;
  return (
    <svg ref={f.ref} viewBox="0 0 900 520" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <path d="M 150 430 A 300 300 0 0 1 750 430 Z" fill={PEACH} fillOpacity="0.5" />
      <line x1="90" y1="430" x2="810" y2="430" stroke={INK} strokeWidth="3" />
      <path d="M 150 430 A 300 300 0 0 1 750 430" fill="none" stroke={GOLD} strokeWidth="5" strokeDasharray="10 9" />
      <line x1={P1.x} y1={P1.y} x2={P2.x} y2={P2.y} stroke={SOFT} strokeWidth="2.5" strokeDasharray="6 5" />
      <circle cx="150" cy="430" r="9" fill={INK} /><circle cx="750" cy="430" r="9" fill={INK} />
      <Txt x={150} y={474}>always T</Txt><Txt x={750} y={474}>always H</Txt>
      <Txt x={P1.x} y={P1.y - 32} fill={TEAL} bold>candidate 1</Txt>
      <Txt x={P2.x - 18} y={P2.y - 40} fill={RED} bold>candidate 2</Txt>
      <Txt x={B.x} y={B.y + 48} fill={GOLD} bold size={25}>your blend</Txt>
      <Grab x={P1.x} y={P1.y} fill={TEAL} onDown={f.down("q1")} />
      <Grab x={P2.x} y={P2.y} fill={RED} onDown={f.down("q2")} />
      <Grab x={B.x} y={B.y} fill={GOLD} onDown={f.down("lam")} />
      <Txt x={450} y={510} size={25} fill={INK}>{`weight = ${lam.toFixed(2)} · average = ${m.toFixed(2)} · spread = ${spread.toFixed(2)} — drag all three`}</Txt>
    </svg>
  );
}

// ── STEPS 6 & 12 : the two-wiggle wave (step 12 unlocks the timing dial δ) ──
function WaveCore({ figKey, withDelay }) {
  const [st, setSt] = useSynced(figKey, { beta: 30, delta: withDelay ? 90 : 0, run: true });
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!st.run) return;
    let id;
    const loop = () => { setT((x) => x + 0.045); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [st.run]);
  const beta = st.beta, delta = st.delta;
  const br = beta / DEG, a = Math.cos(br), b = Math.sin(br), d = delta / DEG;
  const N = 46, x0 = 40, x1 = 470, yH = 120, yV = 300, amp = 66;
  const pts = (A, ph) => Array.from({ length: N + 1 }, (_, i) => {
    const x = x0 + (i * (x1 - x0)) / N;
    return `${x.toFixed(1)},${(-A * amp * Math.sin(i * 0.3 - t - ph)).toFixed(1)}`;
  }).join(" ");
  const fcx = 690, fcy = 210, fr = 130;
  const trail = Array.from({ length: 36 }, (_, k) => {
    const tt = t - k * 0.13;
    return [fcx + fr * a * Math.sin(tt), fcy - fr * b * Math.sin(tt - d), 1 - k / 38];
  });
  // drag: front-view handle sets beta (line angle); outer ring sets delta
  const bh = { x: fcx + (fr + 34) * Math.cos(br), y: fcy - (fr + 34) * Math.sin(br) };
  const dh = { x: fcx + (fr + 70) * Math.cos(d), y: fcy - (fr + 70) * Math.sin(d) };
  const f = useFig((id, pt) => {
    const ang = norm360(Math.atan2(fcy - pt.y, pt.x - fcx) * DEG);
    if (id === "beta") setSt((s) => ({ ...s, beta: clamp(ang > 180 ? 0 : ang, 0, 90) }));
    else setSt((s) => ({ ...s, delta: ang }));
  });
  const shape = !withDelay || delta % 180 === 0 ? "a tilted line" :
    (Math.abs(beta - 45) < 3 && (Math.abs(delta - 90) < 4 || Math.abs(delta - 270) < 4)) ? "a circle!" : "an ellipse";
  // sheet-reading curve I(θ) for the current wave — the rotating sheet's verdict
  const I = (thd) => {
    const c = Math.cos(thd / DEG), s = Math.sin(thd / DEG);
    return a * a * c * c + b * b * s * s + 2 * a * b * Math.cos(d) * s * c;
  };
  let breath = "";
  for (let tt = 0; tt <= 180; tt += 2) breath += `${(90 + tt * 4).toFixed(1)},${(250 - 180 * I(tt)).toFixed(1)} `;
  const flat = Math.abs(a * a - 0.5) < 0.02 && Math.abs(Math.cos(d)) < 0.06;
  return (
    <div>
      <svg ref={f.ref} viewBox="0 0 900 430" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        <line x1={x0} y1={yH} x2={x1} y2={yH} stroke={LBLUE} strokeWidth="1.5" />
        <line x1={x0} y1={yV} x2={x1} y2={yV} stroke={LBLUE} strokeWidth="1.5" />
        <g transform={`translate(0 ${yH})`}><polyline points={pts(a, 0)} fill="none" stroke={GOLD} strokeWidth="5" strokeLinejoin="round" /></g>
        <g transform={`translate(0 ${yV})`}><polyline points={pts(b, d)} fill="none" stroke={TEAL} strokeWidth="5" strokeLinejoin="round" /></g>
        <Txt x={x0} y={34} anchor="start" size={24} fill={GOLD} bold>{`H wiggle · a = ${a.toFixed(2)}`}</Txt>
        <Txt x={x0} y={222} anchor="start" size={24} fill={TEAL} bold>{`V wiggle · b = ${b.toFixed(2)}`}</Txt>
        <Txt x={x0} y={412} anchor="start" size={22}>the wave, flying to the right →</Txt>
        <rect x={fcx - fr - 14} y={fcy - fr - 14} width={2 * fr + 28} height={2 * fr + 28} rx={14} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
        <line x1={fcx - fr} y1={fcy} x2={fcx + fr} y2={fcy} stroke={GRID} strokeWidth="2" />
        <line x1={fcx} y1={fcy - fr} x2={fcx} y2={fcy + fr} stroke={GRID} strokeWidth="2" />
        {trail.map(([x, y, o], k) => (
          <circle key={k} cx={x} cy={y} r={k === 0 ? 9 : 4.5} fill={INK} opacity={k === 0 ? 1 : 0.3 * o} />
        ))}
        <Txt x={fcx} y={fcy + fr + 42} size={22}>{`front view — the tip draws ${shape}`}</Txt>
        <path d={`M ${fcx + fr + 34} ${fcy} A ${fr + 34} ${fr + 34} 0 0 0 ${fcx} ${fcy - fr - 34}`} fill="none" stroke={GOLD} strokeWidth="2" strokeDasharray="3 6" opacity="0.6" />
        <Grab x={bh.x} y={bh.y} r={10} fill={GOLD} onDown={f.down("beta")} />
        <Txt x={bh.x + 20} y={bh.y - 12} anchor="start" size={22} fill={GOLD} bold>β</Txt>
        {withDelay && <>
          <circle cx={fcx} cy={fcy} r={fr + 70} fill="none" stroke={TEAL} strokeWidth="2" strokeDasharray="3 6" opacity="0.6" />
          <Grab x={dh.x} y={dh.y} r={10} fill={TEAL} onDown={f.down("delta")} />
          <Txt x={dh.x} y={dh.y - 22} size={22} fill={TEAL} bold>δ</Txt>
        </>}
      </svg>
      {withDelay && (
        <svg viewBox="0 0 900 300" style={{ ...svgStyle, marginTop: 10 }}>
          <line x1="90" y1="250" x2="810" y2="250" stroke={INK} strokeWidth="3" />
          <line x1="90" y1="70" x2="810" y2="70" stroke={INK} strokeWidth="2" opacity="0.25" />
          <line x1="90" y1="160" x2="810" y2="160" stroke={SOFT} strokeWidth="2" strokeDasharray="7 6" />
          <text x="62" y="258" textAnchor="end" fontFamily={MONO} fontSize="22" fill={SOFT}>0</text>
          <text x="62" y="168" textAnchor="end" fontFamily={MONO} fontSize="22" fill={SOFT}>½</text>
          <text x="62" y="78" textAnchor="end" fontFamily={MONO} fontSize="22" fill={SOFT}>1</text>
          <polyline points={breath} fill="none" stroke={flat ? RED : GOLD} strokeWidth="5" strokeLinejoin="round" />
          <Txt x={450} y={290} size={22}>sheet reading vs. sheet angle θ (0°…180°)</Txt>
          <Txt x={450} y={38} size={24} fill={flat ? RED : INK} bold>
            {flat ? "FLAT — every sheet reads: \u201cdead center, same as the bulb\u201d" : "breathing — a rotating sheet can see this beam"}
          </Txt>
        </svg>
      )}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
        {!withDelay && <Button onClick={() => setSt((s) => ({ ...s, delta: s.delta === 0 ? 180 : 0 }))}>
          {delta === 0 ? "wiggles in step → flip one" : "opposite step → put back in step"}
        </Button>}
        <Button ghost onClick={() => setSt((s) => ({ ...s, run: !s.run }))}>{st.run ? "pause" : "play"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 22, color: INK }}>
          {withDelay ? `β = ${Math.round(beta)}° · δ = ${Math.round(delta)}°` : `β = ${Math.round(beta)}° · b = ${delta === 180 ? "−" : "+"}${b.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}
function FigWave() { return <WaveCore figKey="s6wave" withDelay={false} />; }
function FigWaveDelay() { return <WaveCore figKey="s12wave" withDelay={true} />; }

// ── STEP 6 companion : dim the lamp — photons ──
function FigPhoton() {
  const [st, setSt] = useSynced("s6phot", { beta: 30, log: [] });
  const pPass = Math.cos(st.beta / DEG) ** 2;
  const fire = (n) => setSt((s) => ({ ...s, log: [...s.log, ...Array.from({ length: n }, () => (Math.random() < Math.cos(s.beta / DEG) ** 2 ? 1 : 0))].slice(-300) }));
  const nT = st.log.filter((v) => v).length;
  const shown = st.log.slice(-44);
  const f = useFig((id, pt) => setSt((s) => ({ ...s, beta: clamp(Math.round(norm360(Math.atan2(160 - pt.y, pt.x - 120) * DEG)), 0, 90), log: [] })));
  const bh = { x: 120 + 120 * Math.cos(st.beta / DEG), y: 160 - 120 * Math.sin(st.beta / DEG) };
  return (
    <div>
      <svg ref={f.ref} viewBox="0 0 900 320" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        <path d={`M 240 160 A 120 120 0 0 0 120 40`} fill="none" stroke={GOLD} strokeWidth="2.5" strokeDasharray="4 7" opacity="0.7" />
        <line x1={120} y1={160} x2={bh.x} y2={bh.y} stroke={GOLD} strokeWidth="4" />
        <line x1={40} y1={160} x2={200} y2={160} stroke={SOFT} strokeWidth="2" strokeDasharray="5 5" />
        <Grab x={bh.x} y={bh.y} r={10} fill={GOLD} onDown={f.down("b")} />
        <Txt x={120} y={214} size={23} fill={INK} bold>{`wave at β = ${Math.round(st.beta)}°`}</Txt>
        <Txt x={120} y={248} size={22}>{`sheet keeps a² = ${(100 * pPass).toFixed(0)}%`}</Txt>
        <rect x={300} y={40} width={560} height={130} rx={12} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
        {shown.map((v, i) => (
          <circle key={i} cx={326 + (i % 22) * 24} cy={i < 22 ? 78 : 132} r={9}
            fill={v ? GOLD : "#FFFFFF"} stroke={v ? INK : SOFT} strokeWidth="2.5" opacity={v ? 1 : 0.55} />
        ))}
        {shown.length === 0 && <Txt x={580} y={112} size={23}>…the detector is waiting…</Txt>}
        <Txt x={580} y={214} size={25} fill={INK} bold>
          {st.log.length ? `through ${nT}/${st.log.length} = ${((100 * nT) / st.log.length).toFixed(0)}% · predicted a² = ${(100 * pPass).toFixed(0)}%` : "each grain: through whole, or blocked whole"}
        </Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 4 }}>
        <Button onClick={() => fire(1)}>send 1 photon</Button>
        <Button onClick={() => fire(25)}>send 25</Button>
        <Button ghost onClick={() => setSt((s) => ({ ...s, log: [] }))}>reset</Button>
      </div>
    </div>
  );
}

// ── STEP 7 : the same disk, in glass — drag the beam anywhere in the disk ──
function FigDisk() {
  const [st, setSt] = useSynced("s7disk", { ang: 60, V: 1, theta: 30 });
  const CX = 300, CY = 280, R = 210;
  const S = { x: CX + st.V * R * Math.cos(st.ang / DEG), y: CY - st.V * R * Math.sin(st.ang / DEG) };
  const th = { x: 740, y: 120 };
  const thh = { x: th.x + 84 * Math.cos(st.theta / DEG), y: th.y - 84 * Math.sin(st.theta / DEG) };
  const f = useFig((id, pt) => {
    if (id === "S") {
      const dx = pt.x - CX, dy = CY - pt.y;
      setSt((s) => ({ ...s, ang: norm360(Math.atan2(dy, dx) * DEG), V: clamp(Math.hypot(dx, dy) / R, 0, 1) }));
    } else setSt((s) => ({ ...s, theta: clamp(norm360(Math.atan2(th.y - pt.y, pt.x - th.x) * DEG) % 180, 0, 180) }));
  });
  const beta = st.ang / 2; // lab angle: drawing angle counts double
  const frac = st.V * Math.cos((st.theta - beta) / DEG) ** 2 + (1 - st.V) * 0.5;
  const lower = st.ang > 180;
  return (
    <svg ref={f.ref} viewBox="0 0 900 560" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY} Z`} fill={PEACH} fillOpacity="0.45" />
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke={GOLD} strokeWidth="4.5" strokeDasharray="9 8" />
      <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 0 ${CX + R} ${CY}`} fill="none" stroke={RED} strokeWidth="4" strokeDasharray="4 9" opacity="0.8" />
      <line x1={CX - R - 45} y1={CY} x2={CX + R + 45} y2={CY} stroke={INK} strokeWidth="3" />
      <circle cx={CX - R} cy={CY} r="9" fill={INK} /><circle cx={CX + R} cy={CY} r="9" fill={INK} />
      <circle cx={CX} cy={CY} r="7" fill={SOFT} />
      <Txt x={CX - R} y={CY + 44}>always T</Txt><Txt x={CX + R} y={CY + 44} anchor="middle">always H</Txt>
      <Txt x={CX} y={CY + 44} size={22}>bulb</Txt>
      {lower && <Txt x={CX} y={CY + R + 44} size={23} fill={RED} bold>below the axis — no seat drawn yet…</Txt>}
      <line x1={CX} y1={CY} x2={S.x} y2={S.y} stroke={SOFT} strokeWidth="2" strokeDasharray="5 5" />
      <Grab x={S.x} y={S.y} fill={lower ? RED : GOLD} onDown={f.down("S")} />
      <Txt x={CX} y={54} size={24} fill={INK} bold>{`beam: β = ${Math.round(norm360(beta))}° (lab) → ${Math.round(st.ang)}° here · purity ${st.V.toFixed(2)}`}</Txt>
      {/* asking sheet dial + meter */}
      <circle cx={th.x} cy={th.y} r={84} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
      <line x1={th.x - 84 * Math.cos(st.theta / DEG)} y1={th.y + 84 * Math.sin(st.theta / DEG)} x2={thh.x} y2={thh.y} stroke={INK} strokeWidth="4" />
      <Grab x={thh.x} y={thh.y} r={9} fill="#FFFFFF" onDown={f.down("th")} />
      <Txt x={th.x} y={th.y + 130} size={23} fill={INK} bold>{`asking sheet · θ = ${Math.round(st.theta)}°`}</Txt>
      <rect x={620} y={300} width={240} height={44} rx={10} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2.5" />
      <rect x={620} y={300} width={240 * frac} height={44} rx={10} fill={GOLD} opacity="0.85" />
      <Txt x={740} y={378} size={25} fill={INK} bold>{`meter: ${(100 * frac).toFixed(0)}%`}</Txt>
      <Txt x={740} y={416} size={22}>V·cos²(θ−β) + (1−V)/2</Txt>
      <Txt x={450} y={540} size={24} fill={INK}>drag the beam anywhere in the disk · drag the sheet's axis to ask</Txt>
    </svg>
  );
}

// ── STEP 8 : the mirror twins ──
function FigTwin() {
  const [st, setSt] = useSynced("twin", { th: 40 });
  const th = st.th;
  const f = useFig((id, pt) => {
    const a = norm360(Math.atan2(300 - pt.y, pt.x - 450) * DEG);
    setSt({ th: id === "twin" ? norm360(-a) : a });
  });
  const ar = th / DEG;
  const P = { x: 450 + 230 * Math.cos(ar), y: 300 - 230 * Math.sin(ar) };
  const Q = { x: P.x, y: 600 - P.y };
  const T = { x: 220, y: 300 }, H = { x: 680, y: 300 };
  const out = (pt) => { const dx = pt.x - 450, dy = pt.y - 300, L = Math.hypot(dx, dy) || 1; return { x: pt.x + 38 * dx / L, y: pt.y + 38 * dy / L + 8 }; };
  const pl = out(P), ql = out(Q);
  return (
    <svg ref={f.ref} viewBox="0 0 900 600" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="140" y1="300" x2="760" y2="300" stroke={SOFT} strokeWidth="2.5" strokeDasharray="6 6" />
      <path d="M 220 300 A 230 230 0 0 1 680 300" fill="none" stroke={GOLD} strokeWidth="4.5" strokeDasharray="9 8" />
      <path d="M 220 300 A 230 230 0 0 0 680 300" fill="none" stroke={RED} strokeWidth="4.5" strokeDasharray="9 8" />
      <line x1={T.x} y1={T.y} x2={P.x} y2={P.y} stroke={GOLD} strokeWidth="3" />
      <line x1={H.x} y1={H.y} x2={P.x} y2={P.y} stroke={TEAL} strokeWidth="3" />
      <line x1={T.x} y1={T.y} x2={Q.x} y2={Q.y} stroke={GOLD} strokeWidth="2.5" strokeDasharray="6 5" />
      <line x1={H.x} y1={H.y} x2={Q.x} y2={Q.y} stroke={TEAL} strokeWidth="2.5" strokeDasharray="6 5" />
      <text x="499" y="256" textAnchor="middle" fontSize="46" fill={GOLD}>↺</text>
      <text x="499" y="386" textAnchor="middle" fontSize="46" fill={RED}>↻</text>
      <circle cx={T.x} cy={T.y} r="9" fill={INK} /><circle cx={H.x} cy={H.y} r="9" fill={INK} />
      <Txt x={196} y={342} anchor="end">T</Txt><Txt x={704} y={342} anchor="start">H</Txt>
      <Txt x={pl.x} y={pl.y} size={26} fill={INK} bold>P · the 45°-side beam</Txt>
      <Txt x={ql.x} y={ql.y} size={26} fill={INK} bold>P′ · the 135° twin</Txt>
      <Grab x={P.x} y={P.y} fill={GOLD} onDown={f.down("p")} />
      <Grab x={Q.x} y={Q.y} fill="#FFFFFF" onDown={f.down("twin")} />
      <Txt x={450} y={586} size={25} fill={INK}>same odds, opposite turning — the orientation is the sign — drag P</Txt>
    </svg>
  );
}

// ── STEPS 9 & 10 : measuring is asking / why the sign hides ──
function AskCore({ figKey, showTwin }) {
  const [st, setSt] = useSynced(figKey, { th: 55, eta: showTwin ? 0 : 30 });
  const CX = 430, CY = 300, R = 230;
  const ar = st.th / DEG, er = st.eta / DEG;
  const P = { x: CX + R * Math.cos(ar), y: CY - R * Math.sin(ar) };
  const Q = { x: P.x, y: 2 * CY - P.y };
  const E1 = { x: CX + R * Math.cos(er), y: CY - R * Math.sin(er) };
  const E2 = { x: 2 * CX - E1.x, y: 2 * CY - E1.y };
  const f = useFig((id, pt) => {
    const a = norm360(Math.atan2(CY - pt.y, pt.x - CX) * DEG);
    if (id === "P") setSt((s) => ({ ...s, th: a }));
    else setSt((s) => ({ ...s, eta: a }));
  });
  const d2 = (A, B) => ((A.x - B.x) ** 2 + (A.y - B.y) ** 2) / (2 * R) ** 2;
  const p1 = d2(P, E2); // odds of answering E1 = squared distance to opposite end
  const q1 = d2(Q, E2);
  const bar = (x, y, v, col, lab) => (
    <g key={lab}>
      <rect x={x} y={y} width={200} height={30} rx={8} fill="#FFFFFF" stroke={LBLUE} strokeWidth="2" />
      <rect x={x} y={y} width={200 * clamp(v, 0, 1)} height={30} rx={8} fill={col} opacity="0.85" />
      <Txt x={x + 216} y={y + 23} anchor="start" size={22} fill={INK} bold>{lab} {(100 * v).toFixed(0)}%</Txt>
    </g>
  );
  const flat = Math.abs(((st.eta % 180) + 180) % 180) < 3 || Math.abs(((st.eta % 180) + 180) % 180) > 177;
  return (
    <svg ref={f.ref} viewBox="0 0 900 600" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <circle cx={CX} cy={CY} r={R} fill={PEACH} fillOpacity="0.35" stroke={GOLD} strokeWidth="4" strokeDasharray="9 8" />
      <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke={SOFT} strokeWidth="2" strokeDasharray="5 6" />
      <line x1={E1.x} y1={E1.y} x2={E2.x} y2={E2.y} stroke={INK} strokeWidth="3.5" />
      <line x1={P.x} y1={P.y} x2={E1.x} y2={E1.y} stroke={TEAL} strokeWidth="3" />
      <line x1={P.x} y1={P.y} x2={E2.x} y2={E2.y} stroke={GOLD} strokeWidth="3" />
      {showTwin && <>
        <line x1={Q.x} y1={Q.y} x2={E1.x} y2={E1.y} stroke={TEAL} strokeWidth="2.5" strokeDasharray="6 5" />
        <line x1={Q.x} y1={Q.y} x2={E2.x} y2={E2.y} stroke={GOLD} strokeWidth="2.5" strokeDasharray="6 5" />
        <Grab x={Q.x} y={Q.y} r={10} fill="#FFFFFF" onDown={f.down("P")} />
        <Txt x={Q.x + 30} y={Q.y + 30} size={25} fill={INK} bold>P′</Txt>
      </>}
      <circle cx={E1.x} cy={E1.y} r="10" fill={INK} />
      <circle cx={E2.x} cy={E2.y} r="10" fill="#FFFFFF" stroke={INK} strokeWidth="3" />
      <Grab x={E1.x} y={E1.y} r={9} fill={INK} onDown={f.down("E")} />
      <Grab x={P.x} y={P.y} fill={GOLD} onDown={f.down("P")} />
      <Txt x={P.x + 30} y={P.y - 18} size={25} fill={INK} bold>P</Txt>
      <Txt x={E1.x + 34 * Math.cos(er)} y={E1.y - 34 * Math.sin(er) + 8} size={23} fill={INK} bold>this end?</Txt>
      {!showTwin && <>
        {bar(636, 120, p1, TEAL, "yes")}
        {bar(636, 170, 1 - p1, GOLD, "no ")}
        <Txt x={636} y={90} anchor="start" size={23} fill={INK} bold>odds = squared chord</Txt>
      </>}
      {showTwin && <>
        <Txt x={630} y={90} anchor="start" size={23} fill={INK} bold>{`P answers yes: ${(100 * p1).toFixed(0)}%`}</Txt>
        <Txt x={630} y={128} anchor="start" size={23} fill={INK} bold>{`P′ answers yes: ${(100 * q1).toFixed(0)}%`}</Txt>
        <Txt x={630} y={172} anchor="start" size={24} fill={flat ? RED : TEAL} bold>{flat ? "identical — the flip is blind" : "different — the tilt sees the sign"}</Txt>
      </>}
      <Txt x={450} y={586} size={25} fill={INK}>
        {showTwin ? "drag the black diameter end: flat = blind, tilted = telling" : "drag P and drag the diameter — every diameter is a question"}
      </Txt>
    </svg>
  );
}
function FigAsk() { return <AskCore figKey="s9ask" showTwin={false} />; }
function FigSign() { return <AskCore figKey="s10sign" showTwin={true} />; }

// ── STEP 11 : the view from the state — amplitudes, α → 2α, double cover ──
function FigEmbed() {
  const [st, setSt] = useSynced("embed", { alpha: 40 });
  const alpha = st.alpha;
  const f = useFig((id, pt) => {
    if (id === "amp") {
      setSt({ alpha: norm360(Math.atan2(300 - pt.y, pt.x - 450) * DEG) });
    } else {
      const a = norm360(Math.atan2(300 - pt.y, pt.x - 565) * DEG);
      const c1 = a / 2, c2 = a / 2 + 180;
      const d = (x) => Math.abs(((x - alpha + 540) % 360) - 180);
      setSt({ alpha: d(c1) <= d(c2) ? c1 : c2 });
    }
  });
  const ar = alpha / DEG;
  const U = { x: 450 + 230 * Math.cos(ar), y: 300 - 230 * Math.sin(ar) };
  const B = { x: 565 + 115 * Math.cos(2 * ar), y: 300 - 115 * Math.sin(2 * ar) };
  const two = 2 * alpha;
  const lap2 = alpha >= 180;
  const aLab = { x: 450 + 84 * Math.cos(ar / 2), y: 300 - 84 * Math.sin(ar / 2) + 8 };
  const bLab = { x: 565 + 76 * Math.cos((norm360(two) / 2) / DEG), y: 300 - 76 * Math.sin((norm360(two) / 2) / DEG) + 8 };
  const arcPath = (cx, cy, r, a0, a1) => {
    const d = norm360(a1 - a0);
    const p = (a) => [cx + r * Math.cos(a / DEG), cy - r * Math.sin(a / DEG)];
    const [x0, y0] = p(a0), [x1, y1] = p(a0 + d);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${d > 180 ? 1 : 0} 0 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  return (
    <svg ref={f.ref} viewBox="0 0 900 596" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="180" y1="300" x2="720" y2="300" stroke={SOFT} strokeWidth="2" strokeDasharray="4 5" />
      <circle cx="450" cy="300" r="230" fill="none" stroke={TEAL} strokeWidth="4" />
      <circle cx="565" cy="300" r="115" fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="9 8" />
      <line x1="450" y1="300" x2={U.x} y2={U.y} stroke={INK} strokeWidth="3" />
      <line x1="450" y1="300" x2={B.x} y2={B.y} stroke={TEAL} strokeWidth="4" />
      <line x1="680" y1="300" x2={B.x} y2={B.y} stroke={GOLD} strokeWidth="4" />
      <line x1="565" y1="300" x2={B.x} y2={B.y} stroke={GOLD} strokeWidth="3" />
      <path d={arcPath(450, 300, 55, 0, alpha)} fill="none" stroke={INK} strokeWidth="2.5" />
      <path d={arcPath(565, 300, 48, 0, norm360(two))} fill="none" stroke={GOLD} strokeWidth="2.5" />
      <Txt x={aLab.x} y={aLab.y} size={25} fill={INK} bold>α</Txt>
      <Txt x={bLab.x} y={bLab.y} size={25} fill={GOLD} bold>2α</Txt>
      <circle cx="450" cy="300" r="9" fill={INK} />
      <circle cx="680" cy="300" r="9" fill={INK} />
      <Txt x={434} y={338}>0</Txt>
      <Txt x={692} y={338} anchor="start">1</Txt>
      <Txt x={U.x + 34 * Math.cos(ar)} y={U.y - 34 * Math.sin(ar) + 8} size={24} fill={TEAL} bold>(a, b)</Txt>
      <Txt x={B.x + 44 * Math.cos(2 * ar)} y={B.y + (B.y < 300 ? 42 : -26)} size={24} fill={GOLD} bold>state</Txt>
      <Grab x={U.x} y={U.y} fill={TEAL} onDown={f.down("amp")} />
      <Grab x={B.x} y={B.y} fill={GOLD} onDown={f.down("coin")} />
      <Txt x={326} y={94} anchor="end" fill={TEAL}>amplitudes · unit circle</Txt>
      <Txt x={480} y={458} fill={GOLD}>states · Bernoulli circle</Txt>
      <Txt x={450} y={584} size={25} fill={lap2 ? RED : INK}>
        {`α = ${Math.round(alpha)}° → 2α = ${Math.round(two)}°${lap2 ? " ≡ " + Math.round(norm360(two)) + "° — second lap: (a,b) and (−a,−b), one state" : ""} — drag either point`}
      </Txt>
    </svg>
  );
}

// ── STEP 13 : the delay dial — the standing wheel, disk to ball ──
function FigBloch() {
  const [st, setSt] = useSynced("bloch", { p: 0.73, phi: 0 });
  const { p, phi } = st;
  const sb = -50 / 240, cb = Math.sqrt(1 - sb * sb), se = 62 / 240, ce = Math.sqrt(1 - se * se);
  const X = 240 * (2 * p - 1);
  const Rw = Math.sqrt(240 * 240 - X * X);
  const pr = phi / DEG;
  const wpt = (a) => ({
    x: 450 + X * cb - Rw * sb * Math.cos(a),
    y: 300 - Rw * ce * Math.sin(a) - X * sb * se - Rw * cb * se * Math.cos(a),
  });
  const S = wpt(pr), P = wpt(0), Q = wpt(Math.PI);
  const T = { x: 450 - 240 * cb, y: 300 + 240 * sb * se }, H = { x: 450 + 240 * cb, y: 300 - 240 * sb * se };
  const knob = { x: 450 + X * cb, y: 300 + X * sb * se * -1 };
  const f = useFig((id, pt) => {
    if (id === "phi") {
      setSt((prev) => {
        const X2 = 240 * (2 * prev.p - 1), R2 = Math.sqrt(240 * 240 - X2 * X2);
        const c = clamp((pt.x - 450 - X2 * cb) / (-sb * R2), -1, 1);
        const s = (300 - pt.y - X2 * sb * se - R2 * cb * se * c) / (R2 * ce);
        return { ...prev, phi: norm360(Math.atan2(s, c) * DEG) };
      });
    } else {
      setSt((prev) => ({ ...prev, p: clamp(((pt.x - 450) / cb / 240 + 1) / 2, 0.01, 0.99) }));
    }
  });
  let wh = "";
  for (let t = 0; t <= 360; t += 4) {
    const w = wpt(t / DEG);
    wh += `${w.x.toFixed(1)},${w.y.toFixed(1)} `;
  }
  return (
    <svg ref={f.ref} viewBox="0 0 900 620" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <defs>
        <radialGradient id="figball15" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#EDF7FD" />
          <stop offset="80%" stopColor="#CFEAF9" />
          <stop offset="100%" stopColor="#AFD9F2" />
        </radialGradient>
      </defs>
      <circle cx="450" cy="300" r="240" fill="url(#figball15)" stroke={LBLUE} strokeWidth="2.5" />
      <ellipse cx="450" cy="300" rx="240" ry="62" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="9 8" />
      <line x1={T.x} y1={T.y} x2={H.x} y2={H.y} stroke={SOFT} strokeWidth="2" strokeDasharray="4 5" />
      <polyline points={wh} fill="none" stroke={TEAL} strokeWidth="3.5" />
      <circle cx={T.x} cy={T.y} r="8" fill={INK} />
      <circle cx={H.x} cy={H.y} r="8" fill={INK} />
      <Txt x={T.x - 25} y={T.y + 6} anchor="end" fill={INK}>always T</Txt>
      <Txt x={H.x + 25} y={H.y + 6} anchor="start" fill={INK}>always H</Txt>
      <line x1="450" y1="300" x2={S.x} y2={S.y} stroke={INK} strokeWidth="2.5" />
      <circle cx="450" cy="300" r="6" fill={SOFT} />
      <circle cx={P.x} cy={P.y} r="7" fill={INK} />
      <circle cx={Q.x} cy={Q.y} r="7" fill={INK} />
      <Txt x={P.x + 24} y={P.y + 8} anchor="start" size={26} fill={INK} bold>P</Txt>
      <Txt x={Q.x - 20} y={Q.y + 34} anchor="end" size={26} fill={INK} bold>P′</Txt>
      <Txt x={S.x} y={S.y - 32} size={26} fill={INK} bold>state</Txt>
      <Grab x={knob.x} y={knob.y} r={10} fill="#FFFFFF" onDown={f.down("p")} />
      <Grab x={S.x} y={S.y} r={12} fill={GOLD} onDown={f.down("phi")} />
      <Txt x={850} y={62} anchor="end" size={25} fill={TEAL} bold>φ — the delay dial</Txt>
      <Txt x={180} y={568} anchor="start" size={24} fill={GOLD}>φ=0 is P · φ=180° the twin · φ=±90° circular light</Txt>
      <Txt x={450} y={606} size={24} fill={INK}>
        {`p = ${p.toFixed(2)} · φ = ${Math.round(norm360(phi))}° — drag the state or the axle knob`}
      </Txt>
    </svg>
  );
}

// ── STEP 14 : three sheets — light resurrected ──
function FigSheets() {
  const [st, setSt] = useSynced("s14sheets", { m: 45, midIn: false });
  const mr = st.m / DEG;
  const out = st.midIn ? Math.cos(mr) ** 2 * Math.sin(mr) ** 2 : 0;
  const mid1 = Math.cos(mr) ** 2;
  const f = useFig((id, pt) => setSt((s) => ({ ...s, m: clamp(norm360(Math.atan2(210 - pt.y, pt.x - 450) * DEG), 0, 90) })));
  const sheet = (x, ang, col, lab, ghost) => {
    const a = (ang - 90) / DEG;
    return (
      <g opacity={ghost ? 0.35 : 1} key={lab}>
        <rect x={x - 12} y={80} width={24} height={260} rx={10} fill="#FFFFFF" stroke={col} strokeWidth="4" />
        <line x1={x - 40 * Math.cos(a)} y1={210 - 40 * Math.sin(a)} x2={x + 40 * Math.cos(a)} y2={210 + 40 * Math.sin(a)} stroke={col} strokeWidth="6" strokeLinecap="round" />
        <Txt x={x} y={378} size={23} fill={INK} bold>{lab}</Txt>
      </g>
    );
  };
  const seg = (x1, x2, I) => I > 0.004
    ? <line x1={x1} y1={210} x2={x2} y2={210} stroke={GOLD} strokeWidth={4 + 22 * I} strokeLinecap="round" opacity={0.45 + 0.55 * I} />
    : <line x1={x1} y1={210} x2={x2} y2={210} stroke={LBLUE} strokeWidth="3" strokeDasharray="6 9" />;
  const mh = { x: 450 + 96 * Math.cos(mr), y: 210 - 96 * Math.sin(mr) };
  return (
    <div>
      <svg ref={f.ref} viewBox="0 0 900 420" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        <line x1="30" y1="210" x2="150" y2="210" stroke={INK} strokeWidth="12" strokeLinecap="round" opacity="0.85" />
        <Txt x={40} y={160} anchor="start" size={22}>lamp</Txt>
        {seg(160, 240, 1)}
        {sheet(250, 0, INK, "P1 · 0°")}
        {seg(262, 438, 1)}
        {sheet(450, st.m, TEAL, `middle · ${Math.round(st.m)}°`, !st.midIn)}
        {seg(462, 638, st.midIn ? mid1 : 1)}
        {sheet(650, 90, INK, "P2 · 90°")}
        {seg(662, 800, out)}
        <text x="836" y="222" textAnchor="middle" fontFamily={MONO} fontSize="27" fontWeight="600" fill={out > 0.004 ? GOLD : SOFT}>{(100 * out).toFixed(0)}%</text>
        {st.midIn && <>
          <circle cx={450} cy={210} r={96} fill="none" stroke={TEAL} strokeWidth="2" strokeDasharray="3 7" opacity="0.6" />
          <Grab x={mh.x} y={mh.y} r={10} fill={TEAL} onDown={f.down("m")} />
        </>}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", marginTop: 4 }}>
        <Button onClick={() => setSt((s) => ({ ...s, midIn: !s.midIn }))}>{st.midIn ? "remove middle sheet" : "insert middle sheet at 45°"}</Button>
        <span style={{ fontFamily: MONO, fontSize: 22, color: INK }}>
          {st.midIn ? `output = cos²·sin² of ${Math.round(st.m)}° — drag the teal axis` : "crossed sheets: darkness"}
        </span>
      </div>
    </div>
  );
}

// ── STEP 15 : one photon at a time — two paths, the delay dial in distance ──
function FigMZ() {
  const [st, setSt] = useSynced("s15mz", { phi: 0, bs2: true, mix: false });
  const pr = st.phi / DEG;
  const pTop = st.bs2 ? (st.mix ? 0.5 : Math.cos(pr / 2) ** 2) : 0.5;
  const f = useFig((id, pt) => setSt((s) => ({ ...s, phi: norm360(Math.atan2(150 - pt.y, pt.x - 690) * DEG) })));
  const dh = { x: 690 + 92 * Math.cos(pr), y: 150 - 92 * Math.sin(pr) };
  let curve = "";
  for (let t = 0; t <= 360; t += 3) curve += `${(90 + t * 2).toFixed(1)},${(560 - 130 * (st.bs2 ? (st.mix ? 0.5 : Math.cos(t / DEG / 2) ** 2) : 0.5)).toFixed(1)} `;
  return (
    <div>
      <svg ref={f.ref} viewBox="0 0 900 600" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
        {/* routes */}
        <line x1="60" y1="240" x2="180" y2="240" stroke={INK} strokeWidth="9" strokeLinecap="round" opacity="0.85" />
        <Txt x={62} y={210} anchor="start" size={22}>{st.mix ? "mystery-mixture source" : "one photon"}</Txt>
        <rect x="180" y="222" width="36" height="36" rx="6" fill={LBLUE} stroke={INK} strokeWidth="2.5" transform="rotate(45 198 240)" />
        <path d="M 216 240 L 380 240 L 380 110 L 520 110" fill="none" stroke={GOLD} strokeWidth="5" opacity="0.8" />
        <path d="M 216 240 L 380 240 L 380 370 L 520 370" fill="none" stroke={TEAL} strokeWidth="5" opacity="0.8" />
        <Txt x={452} y={92} size={22} fill={GOLD} bold>route A</Txt>
        <Txt x={452} y={404} size={22} fill={TEAL} bold>route B · + path length φ</Txt>
        {st.bs2 && <rect x="520" y="222" width="36" height="36" rx="6" fill={LBLUE} stroke={INK} strokeWidth="2.5" transform="rotate(45 538 240)" />}
        <path d="M 520 110 L 538 110 L 538 222" fill="none" stroke={GOLD} strokeWidth="4" opacity="0.6" />
        <path d="M 520 370 L 538 370 L 538 258" fill="none" stroke={TEAL} strokeWidth="4" opacity="0.6" />
        <line x1="556" y1="240" x2="600" y2="240" stroke={GOLD} strokeWidth="4" opacity={pTop} />
        <line x1="538" y1="258" x2="538" y2="300" stroke={TEAL} strokeWidth="4" opacity={1 - pTop} />
        <rect x="600" y="218" width="20" height="44" rx="5" fill={pTop > 0.02 ? GOLD : "#FFFFFF"} stroke={INK} strokeWidth="2.5" />
        <rect x="516" y="300" width="44" height="20" rx="5" fill={1 - pTop > 0.02 ? TEAL : "#FFFFFF"} stroke={INK} strokeWidth="2.5" />
        <Txt x={652} y={246} anchor="start" size={23} fill={INK} bold>{`D1 · ${(100 * pTop).toFixed(0)}%`}</Txt>
        <Txt x={538} y={352} size={23} fill={INK} bold>{`D2 · ${(100 * (1 - pTop)).toFixed(0)}%`}</Txt>
        {/* phi dial */}
        <circle cx="690" cy="150" r="92" fill="#FFFFFF" stroke={TEAL} strokeWidth="2.5" strokeDasharray="3 7" />
        <line x1="690" y1="150" x2={dh.x} y2={dh.y} stroke={TEAL} strokeWidth="4" />
        <Grab x={dh.x} y={dh.y} r={10} fill={TEAL} onDown={f.down("phi")} />
        <Txt x={690} y={286} size={23} fill={INK} bold>{`φ = ${Math.round(st.phi)}°`}</Txt>
        {/* fringe curve */}
        <line x1="90" y1="560" x2="810" y2="560" stroke={INK} strokeWidth="3" />
        <line x1="90" y1="430" x2="810" y2="430" stroke={SOFT} strokeWidth="2" strokeDasharray="6 6" opacity="0.5" />
        <polyline points={curve} fill="none" stroke={st.mix || !st.bs2 ? RED : GOLD} strokeWidth="4.5" />
        <circle cx={90 + st.phi * 2} cy={560 - 130 * pTop} r="9" fill={GOLD} stroke={INK} strokeWidth="3" />
        <Txt x={450} y={592} size={23}>D1 clicks vs φ — {st.mix ? "the mixture never fringes" : st.bs2 ? "fringes: cos²(φ/2)" : "no second mirror: flat 50/50"}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
        <Button onClick={() => setSt((s) => ({ ...s, bs2: !s.bs2 }))}>{st.bs2 ? "remove 2nd half-mirror" : "insert 2nd half-mirror"}</Button>
        <Button onClick={() => setSt((s) => ({ ...s, mix: !s.mix }))}>{st.mix ? "source: amplitudes" : "source: mystery mixture"}</Button>
      </div>
    </div>
  );
}

module.exports = {
  FigFlip, FigMystery, FigScatter, FigArc, FigMix,
  FigWave, FigPhoton, FigDisk, FigTwin, FigAsk, FigSign,
  FigEmbed, FigWaveDelay, FigBloch, FigSheets, FigMZ,
};
