/* Interactive figures for the Three Arches deck — grab the points directly, no sliders.
   Geometry + palette follow the deck's static diagrams / the tutorial's interactives. */
const { useState, useRef, useEffect } = React;

/* One-way figure sync: drags in the main (presenter) window broadcast state;
   the ?present mirror applies it. Mirror never sends. */
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
      RED = "#F71D25", LBLUE = "#AFE0F7", PEACH = "#FDE9D3";
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

// arc in math orientation (CCW, y up), degrees
function arcPath(cx, cy, r, a0, a1) {
  const d = norm360(a1 - a0);
  const p = (a) => [cx + r * Math.cos(a / DEG), cy - r * Math.sin(a / DEG)];
  const [x0, y0] = p(a0), [x1, y1] = p(a0 + d);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${d > 180 ? 1 : 0} 0 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

const svgStyle = { width: "100%", display: "block", touchAction: "none", userSelect: "none" };

// ── slide I·3 : semicircle + blends ──
function FigMix() {
  const [st, setSt] = useSynced("mix", { q1: 0.9, q2: 0.2, lam: 0.45 });
  const { q1, q2, lam } = st;
  const A = (q) => ({ x: 150 + 600 * q, y: 430 - 600 * Math.sqrt(Math.max(0, q * (1 - q))) });
  const P1 = A(q1), P2 = A(q2);
  const f = useFig((id, pt) => {
    if (id === "q1") setSt((s) => ({ ...s, q1: clamp((pt.x - 150) / 600, 0.03, 0.97) }));
    else if (id === "q2") setSt((s) => ({ ...s, q2: clamp((pt.x - 150) / 600, 0.03, 0.97) }));
    else {
      const dx = P1.x - P2.x, dy = P1.y - P2.y, L2 = dx * dx + dy * dy || 1;
      setSt((s) => ({ ...s, lam: clamp(((pt.x - P2.x) * dx + (pt.y - P2.y) * dy) / L2, 0, 1) }));
    }
  });
  const B = { x: P2.x + lam * (P1.x - P2.x), y: P2.y + lam * (P1.y - P2.y) };
  const m = lam * q1 + (1 - lam) * q2;
  return (
    <svg ref={f.ref} viewBox="0 0 900 520" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <path d="M 150 430 A 300 300 0 0 1 750 430 Z" fill={PEACH} fillOpacity="0.5" />
      <line x1="90" y1="430" x2="810" y2="430" stroke={INK} strokeWidth="3" />
      <path d="M 150 430 A 300 300 0 0 1 750 430" fill="none" stroke={GOLD} strokeWidth="5" strokeDasharray="10 9" />
      <line x1={P1.x} y1={P1.y} x2={P2.x} y2={P2.y} stroke={SOFT} strokeWidth="2.5" strokeDasharray="6 5" />
      <circle cx="150" cy="430" r="9" fill={INK} />
      <circle cx="750" cy="430" r="9" fill={INK} />
      <Txt x={150} y={474}>always T</Txt>
      <Txt x={750} y={474}>always H</Txt>
      <Txt x={P1.x} y={P1.y - 32} fill={TEAL} bold>candidate 1</Txt>
      <Txt x={P2.x - 18} y={P2.y - 40} fill={RED} bold>candidate 2</Txt>
      <Txt x={B.x} y={B.y + 48} fill={GOLD} bold size={25}>your blend</Txt>
      <Grab x={P1.x} y={P1.y} fill={TEAL} onDown={f.down("q1")} />
      <Grab x={P2.x} y={P2.y} fill={RED} onDown={f.down("q2")} />
      <Grab x={B.x} y={B.y} fill={GOLD} onDown={f.down("lam")} />
      <Txt x={450} y={510} size={25} fill={INK}>{`λ = ${lam.toFixed(2)} · blend average = ${m.toFixed(2)} — drag the three points`}</Txt>
    </svg>
  );
}

// ── slide I·4 : Thales lift ──
function FigThales() {
  const [st, setSt] = useSynced("thales", { p: 0.62 });
  const p = st.p;
  const f = useFig((id, pt) => setSt({ p: clamp((pt.x - 170) / 560, 0.03, 0.97) }));
  const T = { x: 170, y: 470 }, H = { x: 730, y: 470 };
  const P = { x: 170 + 560 * p, y: 470 - 560 * Math.sqrt(p * (1 - p)) };
  const unit = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return { x: dx / L, y: dy / L }; };
  const u = unit(P, T), v = unit(P, H);
  const sq = `${(P.x + 20 * u.x).toFixed(1)},${(P.y + 20 * u.y).toFixed(1)} ${(P.x + 20 * (u.x + v.x)).toFixed(1)},${(P.y + 20 * (u.y + v.y)).toFixed(1)} ${(P.x + 20 * v.x).toFixed(1)},${(P.y + 20 * v.y).toFixed(1)}`;
  const angT = Math.atan2(P.y - T.y, P.x - T.x) * DEG;
  const angH = Math.atan2(H.y - P.y, H.x - P.x) * DEG;
  const midT = { x: (T.x + P.x) / 2 + Math.sin(angT / DEG) * 28, y: (T.y + P.y) / 2 - Math.cos(angT / DEG) * 28 };
  const midH = { x: (H.x + P.x) / 2 + Math.sin(angH / DEG) * 28, y: (H.y + P.y) / 2 - Math.cos(angH / DEG) * 28 };
  return (
    <svg ref={f.ref} viewBox="0 0 900 560" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="110" y1="470" x2="790" y2="470" stroke={INK} strokeWidth="4" />
      <path d="M 170 470 A 280 280 0 0 1 730 470" fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="10 9" />
      <line x1={T.x} y1={T.y} x2={P.x} y2={P.y} stroke={TEAL} strokeWidth="4" />
      <line x1={H.x} y1={H.y} x2={P.x} y2={P.y} stroke={GOLD} strokeWidth="4" />
      <polyline points={sq} fill="none" stroke={INK} strokeWidth="2.5" />
      <circle cx={T.x} cy={T.y} r="10" fill={INK} />
      <circle cx={H.x} cy={H.y} r="10" fill={INK} />
      <Txt x={T.x} y={516} size={25}>T</Txt>
      <Txt x={H.x} y={516} size={25}>H</Txt>
      <Txt x={midT.x} y={midT.y} size={25} fill={TEAL} bold transform={`rotate(${angT.toFixed(1)} ${midT.x.toFixed(1)} ${midT.y.toFixed(1)})`}>length √p</Txt>
      <Txt x={midH.x} y={midH.y} size={25} fill={GOLD} bold transform={`rotate(${angH.toFixed(1)} ${midH.x.toFixed(1)} ${midH.y.toFixed(1)})`}>length √(1−p)</Txt>
      <Txt x={P.x} y={P.y - 36} size={26} fill={INK} bold>your belief</Txt>
      <Grab x={P.x} y={P.y} r={12} fill={GOLD} onDown={f.down("p")} />
      <Txt x={850} y={70} anchor="end" size={25} fill={TEAL} bold>{`√p = ${Math.sqrt(p).toFixed(2)}`}</Txt>
      <Txt x={850} y={106} anchor="end" size={25} fill={GOLD} bold>{`√(1−p) = ${Math.sqrt(1 - p).toFixed(2)}`}</Txt>
      <Txt x={450} y={548} size={25} fill={INK}>{`p + (1−p) = ${p.toFixed(2)} + ${(1 - p).toFixed(2)} = 1 — Pythagoras, on a coin`}</Txt>
    </svg>
  );
}

// ── slide I·5 : square-root embedding, α → 2α ──
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
  return (
    <svg ref={f.ref} viewBox="0 0 900 596" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <line x1="180" y1="300" x2="720" y2="300" stroke={SOFT} strokeWidth="2" strokeDasharray="4 5" />
      <circle cx="450" cy="300" r="230" fill="none" stroke={TEAL} strokeWidth="4" />
      <circle cx="565" cy="300" r="115" fill="none" stroke={GOLD} strokeWidth="4" strokeDasharray="9 8" />
      <line x1="450" y1="300" x2={U.x} y2={U.y} stroke={INK} strokeWidth="3" />
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
      <Txt x={B.x + 44 * Math.cos(2 * ar)} y={B.y + (B.y < 300 ? 42 : -26)} size={24} fill={GOLD} bold>coin</Txt>
      <Grab x={U.x} y={U.y} fill={TEAL} onDown={f.down("amp")} />
      <Grab x={B.x} y={B.y} fill={GOLD} onDown={f.down("coin")} />
      <Txt x={326} y={94} anchor="end" fill={TEAL}>unit circle</Txt>
      <Txt x={480} y={458} fill={GOLD}>Bernoulli circle</Txt>
      <Txt x={450} y={584} size={25} fill={lap2 ? RED : INK}>
        {`α = ${Math.round(alpha)}° → 2α = ${Math.round(two)}°${lap2 ? " ≡ " + Math.round(norm360(two)) + "° — second lap of the coin" : ""} — drag either point`}
      </Txt>
    </svg>
  );
}

// ── slide I·6 : the hidden twin ──
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
      <circle cx={T.x} cy={T.y} r="9" fill={INK} />
      <circle cx={H.x} cy={H.y} r="9" fill={INK} />
      <Txt x={196} y={342} anchor="end">T</Txt>
      <Txt x={704} y={342} anchor="start">H</Txt>
      <Txt x={pl.x} y={pl.y} size={26} fill={INK} bold>P</Txt>
      <Txt x={ql.x} y={ql.y} size={26} fill={INK} bold>P′</Txt>
      <Grab x={P.x} y={P.y} fill={GOLD} onDown={f.down("p")} />
      <Grab x={Q.x} y={Q.y} fill="#FFFFFF" onDown={f.down("twin")} />
      <Txt x={450} y={586} size={25} fill={INK}>{`θ = ${Math.round(norm360(th))}° — same odds, opposite turning — drag P`}</Txt>
    </svg>
  );
}

// ── slide I·7 : the Bloch ball ──
function FigBloch() {
  const [st, setSt] = useSynced("bloch", { s: { x: 559, y: 140 }, phi: 70 });
  const { s, phi } = st;
  const f = useFig((id, pt) => {
    if (id === "s") {
      let dx = pt.x - 450, dy = pt.y - 300;
      const r = Math.hypot(dx, dy);
      if (r > 238) { dx *= 238 / r; dy *= 238 / r; }
      setSt((prev) => ({ ...prev, s: { x: 450 + dx, y: 300 + dy } }));
    } else {
      setSt((prev) => ({ ...prev, phi: norm360(Math.atan2((300 - pt.y) / 229, (pt.x - 522) / 52) * DEG) }));
    }
  });
  const rr = Math.hypot(s.x - 450, s.y - 300) / 238;
  const W = { x: 522 + 52 * Math.cos(phi / DEG), y: 300 - 229 * Math.sin(phi / DEG) };
  return (
    <svg ref={f.ref} viewBox="0 0 900 620" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <defs>
        <radialGradient id="figball" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#EDF7FD" />
          <stop offset="80%" stopColor="#CFEAF9" />
          <stop offset="100%" stopColor="#AFD9F2" />
        </radialGradient>
      </defs>
      <circle cx="450" cy="300" r="240" fill="url(#figball)" stroke={LBLUE} strokeWidth="2.5" />
      <ellipse cx="450" cy="300" rx="240" ry="62" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="9 8" />
      <line x1="210" y1="300" x2="690" y2="300" stroke={SOFT} strokeWidth="2" strokeDasharray="4 5" />
      <ellipse cx="522" cy="300" rx="52" ry="229" fill="none" stroke={TEAL} strokeWidth="3.5" />
      <circle cx="210" cy="300" r="8" fill={INK} />
      <circle cx="690" cy="300" r="8" fill={INK} />
      <Txt x={185} y={306} anchor="end" fill={INK}>always T</Txt>
      <Txt x={715} y={306} anchor="start" fill={INK}>always H</Txt>
      <line x1="450" y1="300" x2={s.x} y2={s.y} stroke={INK} strokeWidth="2.5" />
      <circle cx="450" cy="300" r="6" fill={SOFT} />
      <Txt x={s.x} y={s.y - 32} size={26} fill={INK} bold>state</Txt>
      <Txt x={W.x + (W.y < 300 ? 34 : 34)} y={W.y + 8} anchor="start" size={25} fill={TEAL} bold>φ</Txt>
      <Grab x={s.x} y={s.y} r={12} fill={GOLD} onDown={f.down("s")} />
      <Grab x={W.x} y={W.y} r={10} fill={TEAL} onDown={f.down("phi")} />
      <Txt x={595} y={62} anchor="start" size={25} fill={TEAL} bold>φ spins the wheel</Txt>
      <Txt x={180} y={568} anchor="start" size={24} fill={GOLD}>gold: your Bernoulli circle, lying flat</Txt>
      <Txt x={450} y={606} size={24} fill={INK}>
        {`state radius = ${rr.toFixed(2)}${rr > 0.97 ? " — pure, on the surface" : " — mixed, inside"} · φ = ${Math.round(phi)}°`}
      </Txt>
    </svg>
  );
}

// ── slide I·8 : a bit swaps, a qubit rotates ──
function FigRotate() {
  const [st, setSt] = useSynced("rotate", { del: 28 });
  const del = st.del;
  const f = useFig((id, pt) => {
    const a = norm360(Math.atan2(270 - pt.y, pt.x - 620) * DEG);
    setSt({ del: id === "e2" ? norm360(a + 180) : a });
  });
  const dr = del / DEG;
  const E1 = { x: 620 + 145 * Math.cos(dr), y: 270 - 145 * Math.sin(dr) };
  const E2 = { x: 620 - 145 * Math.cos(dr), y: 270 + 145 * Math.sin(dr) };
  return (
    <svg ref={f.ref} viewBox="0 0 900 560" onPointerMove={f.move} onPointerUp={f.up} style={svgStyle}>
      <defs>
        <radialGradient id="figball2" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#CFEAF9" />
          <stop offset="100%" stopColor="#AFD9F2" />
        </radialGradient>
      </defs>
      <circle cx="170" cy="270" r="48" fill={GOLD} stroke={INK} strokeWidth="3" />
      <text x="170" y="286" textAnchor="middle" fontFamily={MONO} fontSize="42" fontWeight="600" fill="#FFFFFF">H</text>
      <circle cx="300" cy="270" r="48" fill="#FFFFFF" stroke={LBLUE} strokeWidth="3" />
      <text x="300" y="286" textAnchor="middle" fontFamily={MONO} fontSize="42" fontWeight="600" fill={INK}>T</text>
      <text x="235" y="185" textAnchor="middle" fontSize="58" fill={SOFT}>⇄</text>
      <Txt x={235} y={420} size={25}>the bit: swap — that's all</Txt>
      <circle cx="620" cy="270" r="145" fill="url(#figball2)" stroke={LBLUE} strokeWidth="2.5" />
      <ellipse cx="620" cy="270" rx="145" ry="38" fill="none" stroke={GOLD} strokeWidth="3" strokeDasharray="7 6" />
      <ellipse cx="620" cy="270" rx="38" ry="145" fill="none" stroke={TEAL} strokeWidth="3" strokeDasharray="7 6" />
      <line x1={E2.x} y1={E2.y} x2={E1.x} y2={E1.y} stroke={INK} strokeWidth="3.5" />
      <Grab x={E1.x} y={E1.y} fill={GOLD} onDown={f.down("e1")} />
      <Grab x={E2.x} y={E2.y} r={10} fill="#FFFFFF" onDown={f.down("e2")} />
      <Txt x={450} y={490} size={25} fill={INK} bold>{`the qubit: any axis, any angle — δ = ${Math.round(del)}°`}</Txt>
      <Txt x={450} y={526} size={24}>drag an end of the axis</Txt>
    </svg>
  );
}

module.exports = { FigMix, FigThales, FigEmbed, FigTwin, FigBloch, FigRotate };
