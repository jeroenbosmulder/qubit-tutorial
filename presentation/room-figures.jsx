/* room-figures.jsx — presenter figures that read the room (phones) via Room.usePresenter().
   Slice 1: FigJoin (scene 0c) and FigFlipRoom (scene 1).
   Same palette/helpers as fifteen-figures.jsx; requires ../room/{relay-config,relay-transport,room}.js
   loaded before this module (see room-slice1.dc.html). */
const { useState, useRef, useEffect } = React;

const INK = "#002157", SOFT = "#5C6E8F", GOLD = "#EE7203", TEAL = "#00A1E4",
      RED = "#F71D25", LBLUE = "#AFE0F7", PEACH = "#FDE9D3", GRID = "#E1F3FC", PURP = "#6D3FC0";
const MONO = "'IBM Plex Mono', 'Courier New', monospace";
const svgStyle = { width: "100%", display: "block", touchAction: "none", userSelect: "none" };

function Txt({ x, y, size = 16, fill = SOFT, anchor = "middle", bold, transform, children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={size}
      fontWeight={bold ? 600 : 400} fill={fill} transform={transform}>{children}</text>
  );
}
function Button({ onClick, ghost, active, children }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: MONO, fontSize: 15, fontWeight: 600, letterSpacing: 0.4,
      padding: "6px 12px", borderRadius: 8, cursor: "pointer",
      background: ghost ? "#FFFFFF" : active === false ? PEACH : GOLD,
      color: ghost ? INK : active === false ? INK : "#FFFFFF",
      border: ghost ? `2px solid ${LBLUE}` : `2px solid ${INK}`,
    }}>{children}</button>
  );
}
function StatusPill({ status, crossDevice }) {
  const col = status === "connected" ? TEAL : status === "error" ? RED : status === "connecting" ? GOLD : SOFT;
  const label = status === "local" ? (crossDevice ? "local" : "local mode — no Supabase configured")
    : status === "connected" ? "live — other devices can join" : status;
  return (
    <span style={{ fontFamily: MONO, fontSize: 13, color: "#FFFFFF", background: col, padding: "3px 10px", borderRadius: 12 }}>{label}</span>
  );
}

/* lazy QR (qrcodejs from cdnjs); falls back to the plain URL */
let qrLoading = null;
function ensureQR() {
  if (window.QRCode) return Promise.resolve();
  if (!qrLoading) qrLoading = new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = res; s.onerror = rej; document.head.appendChild(s);
  });
  return qrLoading;
}
function QR({ text, size = 260 }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    ensureQR().then(() => {
      if (!alive || !ref.current) return;
      ref.current.innerHTML = "";
      new window.QRCode(ref.current, { text, width: size, height: size, colorDark: INK, colorLight: "#FFFFFF", correctLevel: window.QRCode.CorrectLevel.M });
      setOk(true);
    }).catch(() => setOk(false));
    return () => { alive = false; };
  }, [text, size]);
  return <div ref={ref} style={{ width: size, height: size, background: "#FFFFFF", padding: 10, borderRadius: 12, border: `2px solid ${LBLUE}`, display: ok ? "block" : "none" }} />;
}

// ── SCENE 0c : join ──
function FigJoin() {
  const room = Room.usePresenter();
  const url = room.participantUrl();
  const roster = room.state.roster || {};
  const phones = Object.keys(roster).map((f) => ({ from: f, ...roster[f] })).sort((a, b) => a.slot - b.slot);
  const copy = () => { try { navigator.clipboard.writeText(url); } catch (e) {} };
  const fresh = () => {
    if (!confirm("Start a new session code? Phones on the current code will have to rejoin.")) return;
    const u = new URL(location.href); u.searchParams.set("session", Room.newSession()); location.href = u.toString();
  };
  return (
    <div style={{ display: "flex", gap: 28, alignItems: "stretch", width: "100%" }}>
      <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <QR text={url} />
        <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 700, color: INK, letterSpacing: 6 }}>{room.session}</div>
        <div style={{ fontFamily: MONO, fontSize: 12, color: SOFT, maxWidth: 280, wordBreak: "break-all", textAlign: "center" }}>{url}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button ghost onClick={copy}>copy link</Button>
          <Button ghost onClick={fresh}>new code</Button>
        </div>
        <StatusPill status={room.status} crossDevice={room.transport ? room.transport.crossDevice : false} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg viewBox="0 0 700 420" style={svgStyle}>
          <Txt x={350} y={40} size={22} fill={INK} bold>
            {phones.length === 0 ? "scan to join — waiting for the first phone" : `${phones.length} joined`}
          </Txt>
          {phones.map((p, i) => {
            const cols = 5, cx = 70 + (i % cols) * 140, cy = 110 + Math.floor(i / cols) * 90;
            return (
              <g key={p.from}>
                <circle cx={cx} cy={cy} r="28" fill="#FFFFFF" stroke={GOLD} strokeWidth="3" />
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="28">{p.tag}</text>
                <Txt x={cx} y={cy + 50} size={13}>{`#${p.slot}`}</Txt>
              </g>
            );
          })}
          {phones.length > 0 && <Txt x={350} y={405} size={14}>each phone gets a seat number — it decides the secrets it will carry later</Txt>}
        </svg>
      </div>
    </div>
  );
}

// ── SCENE 1 : two coins, one prediction — pooled flips from the room ──
function FigFlipRoom() {
  const room = Room.usePresenter();
  const round = room.state.round || "A";
  const T = room.tallies(round);
  const key = "hist:" + round;
  const hist = room.memo[key] || [];
  // append a point whenever the pooled count changes (history survives slide changes: it lives in the store)
  useEffect(() => {
    const last = hist.length ? hist[hist.length - 1] : null;
    if (T.n > 0 && (!last || last[0] !== T.n)) room.setMemo(key, [...hist, [T.n, T.frac]].slice(-2000));
    if (T.n === 0 && hist.length) room.setMemo(key, []);
  }, [T.n, T.heads, round]);

  const X0 = 90, X1 = 810, Y0 = 400, Y1 = 120;
  const maxN = Math.max(60, T.n);
  const X = (n) => X0 + (n / maxN) * (X1 - X0), Y = (f) => Y0 - f * (Y0 - Y1);
  const path = hist.map(([n, f]) => `${X(n).toFixed(1)},${Y(f).toFixed(1)}`).join(" ");
  const own = T.phones.slice().sort((a, b) => a.slot - b.slot);

  return (
    <div>
      <svg viewBox="0 0 900 520" style={svgStyle}>
        <Txt x={450} y={36} size={19} fill={INK} bold>
          {round === "A" ? "round A — everyone flips the same fair coin" : "round B — everyone flips their own secret coin"}
        </Txt>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={INK} strokeWidth="3" />
        <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke={INK} strokeWidth="3" opacity="0.25" />
        <line x1={X0} y1={Y(0.5)} x2={X1} y2={Y(0.5)} stroke={SOFT} strokeWidth="2.5" strokeDasharray="8 7" />
        <Txt x={X0 - 28} y={Y0 + 6} anchor="end">0</Txt>
        <Txt x={X0 - 28} y={Y(0.5) + 6} anchor="end">½</Txt>
        <Txt x={X0 - 28} y={Y1 + 6} anchor="end">1</Txt>
        <Txt x={X1} y={Y0 + 30} anchor="end" size={14}>{`${T.n} flips from ${T.phones.length} phones`}</Txt>
        <Txt x={450} y={Y1 - 26} size={15}>pooled fraction of heads, flip by flip, as they arrive</Txt>
        {hist.length > 1 && <polyline points={path} fill="none" stroke={round === "A" ? TEAL : GOLD} strokeWidth="4" strokeLinejoin="round" />}
        {T.n > 0 && <circle cx={X(T.n)} cy={Y(T.frac)} r="10" fill={round === "A" ? TEAL : GOLD} stroke={INK} strokeWidth="3" />}
        {T.n > 0 && <Txt x={Math.min(X(T.n), X1 - 40)} y={Y(T.frac) - 18} size={16} fill={INK} bold>{T.frac.toFixed(2)}</Txt>}
        {T.n === 0 && <Txt x={450} y={260} size={17}>{`no flips yet — phones: tap Flip (round ${round})`}</Txt>}
        {/* strip: each phone's own fraction (preview of scene 2) */}
        <line x1={X0} y1={480} x2={X1} y2={480} stroke={SOFT} strokeWidth="2" />
        <Txt x={X0} y={505} size={13}>0</Txt><Txt x={(X0 + X1) / 2} y={505} size={13}>½</Txt><Txt x={X1} y={505} size={13}>1</Txt>
        <Txt x={450} y={452} size={13}>each phone's own fraction</Txt>
        {own.map((p) => (
          <g key={p.from}>
            <circle cx={X0 + p.frac * (X1 - X0)} cy={480} r={7 + Math.min(6, p.n / 5)} fill={round === "A" ? TEAL : GOLD} opacity="0.55" stroke={INK} strokeWidth="1.5" />
            <text x={X0 + p.frac * (X1 - X0)} y={472} textAnchor="middle" fontSize="16">{p.tag}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <Button active={round === "A"} onClick={() => room.publish({ round: "A" }, true)}>round A · fair coin</Button>
        <Button active={round === "B"} onClick={() => room.publish({ round: "B" }, true)}>round B · secret coins</Button>
        <Button ghost onClick={() => room.resetRound(round)}>{`reset round ${round}`}</Button>
      </div>
    </div>
  );
}


// ───────────────────────── shared geometry (Bernoulli half-plane) ─────────────────────────
/* p on x, bandwidth on y; the circle of radius ½ centred at (½, 0). */
function Plane({ W = 900, H = 520, showBand = true, showArc = true, children }) {
  const S = 640, cx = W / 2, cy = H - 60;                 // px per unit p; origin p=½ at cx
  const X = (p) => cx + (p - 0.5) * S, Y = (w) => cy - w * S;
  const lines = [];
  for (let u = 0; u <= 1.0001; u += 0.125) {
    const bold = Math.abs((u * 2) % 1) < 1e-6;
    lines.push(<line key={"v" + u} x1={X(u)} y1={Y(0.6)} x2={X(u)} y2={cy} stroke={bold ? LBLUE : GRID} strokeWidth={bold ? 1.5 : 1} />);
  }
  if (showBand) for (let v = 0.125; v <= 0.6; v += 0.125) {
    const bold = Math.abs((v * 2) % 1) < 1e-6;
    lines.push(<line key={"h" + v} x1={X(0)} y1={Y(v)} x2={X(1)} y2={Y(v)} stroke={bold ? LBLUE : GRID} strokeWidth={bold ? 1.5 : 1} />);
  }
  return { X, Y, S, cx, cy, svg: (
    <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle}>
      {lines}
      <line x1={X(0)} y1={cy} x2={X(1)} y2={cy} stroke={INK} strokeWidth="3" />
      <Txt x={X(0)} y={cy + 30} size={15} fill={INK} bold>always-T</Txt>
      <Txt x={X(1)} y={cy + 30} size={15} fill={INK} bold>always-H</Txt>
      <Txt x={X(0.5)} y={cy + 30} size={15}>fair · p = ½</Txt>
      {showBand && <>
        <line x1={X(0)} y1={cy} x2={X(0)} y2={Y(0.6)} stroke={INK} strokeWidth="3" opacity="0.5" />
        <Txt x={X(0) - 14} y={Y(0.5) + 6} anchor="end" size={14}>½</Txt>
        <Txt x={X(0) - 14} y={Y(0.25) + 6} anchor="end" size={14}>¼</Txt>
        <Txt x={X(0.5)} y={Y(0.6) - 14} size={15}>bandwidth — the spread you expect</Txt>
      </>}
      {showArc && <path d={`M ${X(0)} ${cy} A ${S / 2} ${S / 2} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="7 6" opacity="0.6" />}
      {children({ X, Y, S, cx, cy })}
    </svg>
  ) };
}
const sig = (p) => Math.sqrt(Math.max(0, p * (1 - p)));
const phoneDots = (T) => T.phones.map((x) => ({ ...x, p: x.frac, w: sig(x.frac) }));
const pooled = (dots) => dots.length ? { p: dots.reduce((a, d) => a + d.p, 0) / dots.length, w: dots.reduce((a, d) => a + d.w, 0) / dots.length } : null;

// ── SCENE 2 : two sources of uncertainty — every phone's own fraction, round A over round B ──
function FigBarsRoom() {
  const room = Room.usePresenter();
  const A = room.tallies("A"), B = room.tallies("B");
  const slots = {};
  A.phones.forEach((x) => { slots[x.slot] = { ...(slots[x.slot] || {}), tag: x.tag, a: x }; });
  B.phones.forEach((x) => { slots[x.slot] = { ...(slots[x.slot] || {}), tag: x.tag, b: x }; });
  const rows = Object.keys(slots).map(Number).sort((a, b) => a - b);
  const W = 900, x0 = 150, x1 = 860, bw = Math.min(24, 600 / Math.max(1, rows.length));
  const X = (f) => x0 + f * (x1 - x0);
  const Row = ({ y, label, field, mean, col }) => (
    <g>
      <Txt x={x0 - 16} y={y + 5} anchor="end" size={16} fill={INK} bold>{label}</Txt>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={SOFT} strokeWidth="2" />
      <line x1={X(0.5)} y1={y - 44} x2={X(0.5)} y2={y + 16} stroke={SOFT} strokeWidth="2" strokeDasharray="6 5" />
      {rows.map((sl) => { const d = slots[sl][field]; if (!d) return null;
        const x = X(d.frac);
        return (<g key={sl}>
          <rect x={x - bw / 2} y={y - 6 - Math.min(36, d.n * 3)} width={bw} height={Math.min(36, d.n * 3)} fill={col} opacity="0.35" stroke={col} strokeWidth="1.5" />
          <text x={x} y={y - 12 - Math.min(36, d.n * 3)} textAnchor="middle" fontSize="18">{slots[sl].tag}</text>
        </g>); })}
      {mean !== null && <g>
        <polygon points={`${X(mean)},${y + 2} ${X(mean) - 9},${y + 18} ${X(mean) + 9},${y + 18}`} fill={INK} />
        <Txt x={X(mean)} y={y + 34} size={13} fill={INK} bold>{`room ${mean.toFixed(2)}`}</Txt>
      </g>}
    </g>
  );
  return (
    <div>
      <svg viewBox={`0 0 ${W} 460`} style={svgStyle}>
        <Txt x={W / 2} y={36} size={19} fill={INK} bold>each phone's fraction of heads · ten flips each</Txt>
        <Row y={170} label="round A" field="a" mean={A.frac} col={TEAL} />
        <Row y={340} label="round B" field="b" mean={B.frac} col={GOLD} />
        <Txt x={x0} y={400} size={14}>0</Txt><Txt x={X(0.5)} y={400} size={14}>½</Txt><Txt x={x1} y={400} size={14}>1</Txt>
        <Txt x={W / 2} y={440} size={15}>{`round A: same coin, only the throws differ — statistical. round B: the coins themselves differ — systematic. Both rooms average ≈ ½.`}</Txt>
      </svg>
    </div>
  );
}

// ── SCENE 3 : one number is not enough → the bandwidth axis ──
function FigHalfPlaneRoom() {
  const room = Room.usePresenter();
  const showBand = !!room.state.showBandAxis, reveal = !!room.state.revealCoins, showPooled = !!room.state.showPooled;
  const A = phoneDots(room.tallies("A")), B = phoneDots(room.tallies("B"));
  const pA = pooled(A), pB = pooled(B);
  const plane = Plane({ showBand, showArc: showBand, children: ({ X, Y }) => (<>
    {A.map((d) => <circle key={"a" + d.slot} cx={X(d.p)} cy={showBand ? Y(d.w) : Y(0)} r="9" fill={TEAL} opacity="0.7" stroke={INK} strokeWidth="1.5" />)}
    {B.map((d) => (<g key={"b" + d.slot}>
      <circle cx={X(d.p)} cy={showBand ? Y(d.w) : Y(0)} r="9" fill={GOLD} opacity="0.75" stroke={INK} strokeWidth="1.5" />
      <text x={X(d.p)} y={(showBand ? Y(d.w) : Y(0)) - 14} textAnchor="middle" fontSize="16">{d.tag}</text>
      {reveal && showBand && (() => { const b = Room.secrets(d.slot).bias; return <circle cx={X(b)} cy={Y(sig(b))} r="7" fill="none" stroke={GOLD} strokeWidth="2.5" strokeDasharray="3 3" />; })()}
    </g>))}
    {showPooled && showBand && pA && <g><circle cx={X(pA.p)} cy={Y(pA.w)} r="15" fill={TEAL} stroke={INK} strokeWidth="3" /><Txt x={X(pA.p)} y={Y(pA.w) - 24} size={15} fill={INK} bold>room, round A</Txt></g>}
    {showPooled && showBand && pB && <g><circle cx={X(pB.p)} cy={Y(pB.w)} r="15" fill={GOLD} stroke={INK} strokeWidth="3" /><Txt x={X(pB.p)} y={Y(pB.w) + 34} size={15} fill={INK} bold>room, round B</Txt></g>}
  </>) });
  const pub = (k) => () => room.publish({ [k]: !room.state[k] }, true);
  return (
    <div>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <Button active={showBand} onClick={pub("showBandAxis")}>{showBand ? "bandwidth axis: on" : "add the second number"}</Button>
        <Button active={showPooled} onClick={pub("showPooled")}>{showPooled ? "room dots: on" : "pool each round"}</Button>
        <Button ghost onClick={pub("revealCoins")}>{reveal ? "hide the true coins" : "reveal the true coins"}</Button>
      </div>
    </div>
  );
}

// ── SCENE 4 : the Bernoulli circle — one synced dot rides the arc ──
function FigArcRoom() {
  const room = Room.usePresenter();
  const p = room.state.p ?? 0.5;
  const B = phoneDots(room.tallies("B"));
  const plane = Plane({ children: ({ X, Y, cx, cy }) => (<>
    {B.map((d) => <circle key={d.slot} cx={X(d.p)} cy={Y(d.w)} r="7" fill={GOLD} opacity="0.25" />)}
    <path d={`M ${X(0)} ${cy} A ${320} ${320} 0 0 1 ${X(1)} ${cy}`} fill="none" stroke={INK} strokeWidth="4" />
    <line x1={X(p)} y1={cy} x2={X(p)} y2={Y(sig(p))} stroke={PURP} strokeWidth="2" strokeDasharray="5 4" />
    <circle cx={X(p)} cy={Y(sig(p))} r="13" fill={PURP} stroke={INK} strokeWidth="3" />
    <Txt x={X(p)} y={Y(sig(p)) - 24} size={16} fill={INK} bold>{`p = ${p.toFixed(2)} · bandwidth ${sig(p).toFixed(2)}`}</Txt>
  </>) });
  return (
    <div>
      {plane.svg}
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>p (every phone follows)</span>
        <input type="range" min="0" max="1" step="0.01" value={p} onChange={(e) => room.publish({ p: parseFloat(e.target.value) })} style={{ width: 420, accentColor: GOLD }} />
      </div>
    </div>
  );
}

// ── SCENE 5 : from the state's own point of view — pointer (angle 2θ) and needle (angle θ) ──
function FigNeedleRoom() {
  const room = Room.usePresenter();
  const p = room.state.p ?? 0.5;
  const th = Math.atan2(Math.sqrt(1 - p), Math.sqrt(p));           // needle angle from the H axis
  const deg = (r) => (r * 180 / Math.PI).toFixed(0);
  // left: Bernoulli circle with Thales triangle + pointer
  const L = { cx: 240, cy: 330, R: 190 };
  const XL = (q) => L.cx + (q - 0.5) * 2 * L.R, YL = (w) => L.cy - w * 2 * L.R;
  const Px = XL(p), Py = YL(sig(p));
  // right: the state's frame — perpendicular axes, needle at angle θ, quarter circle
  const N = { ox: 560, oy: 330, S: 300 };
  const XN = (u) => N.ox + u * N.S, YN = (v) => N.oy - v * N.S;
  const a = Math.sqrt(p), b = Math.sqrt(1 - p);
  return (
    <div>
      <svg viewBox="0 0 900 430" style={svgStyle}>
        <Txt x={240} y={34} size={17} fill={INK} bold>Bernoulli circle · the pointer</Txt>
        <line x1={XL(0)} y1={L.cy} x2={XL(1)} y2={L.cy} stroke={INK} strokeWidth="3" />
        <path d={`M ${XL(0)} ${L.cy} A ${L.R} ${L.R} 0 0 1 ${XL(1)} ${L.cy}`} fill="none" stroke={INK} strokeWidth="3" />
        <Txt x={XL(0)} y={L.cy + 26} size={14} fill={INK} bold>always-T</Txt>
        <Txt x={XL(1)} y={L.cy + 26} size={14} fill={INK} bold>always-H</Txt>
        <line x1={XL(0)} y1={L.cy} x2={Px} y2={Py} stroke={TEAL} strokeWidth="3" />
        <line x1={XL(1)} y1={L.cy} x2={Px} y2={Py} stroke={GOLD} strokeWidth="3" />
        <line x1={L.cx} y1={L.cy} x2={Px} y2={Py} stroke={PURP} strokeWidth="4" />
        <circle cx={L.cx} cy={L.cy} r="5" fill={INK} />
        <Txt x={L.cx} y={L.cy + 26} size={13}>no information</Txt>
        <circle cx={Px} cy={Py} r="11" fill={PURP} stroke={INK} strokeWidth="3" />
        <Txt x={L.cx + 60} y={L.cy - 16} size={14} fill={PURP} bold>{`2θ = ${deg(2 * th)}°`}</Txt>
        <Txt x={240} y={410} size={14}>{`right angle at the state (Thales) · legs² = ${p.toFixed(2)} and ${(1 - p).toFixed(2)}`}</Txt>

        <Txt x={680} y={34} size={17} fill={INK} bold>from the state itself · the needle</Txt>
        <line x1={N.ox} y1={N.oy} x2={XN(1.05)} y2={N.oy} stroke={GOLD} strokeWidth="3" />
        <line x1={N.ox} y1={N.oy} x2={N.ox} y2={YN(1.0)} stroke={TEAL} strokeWidth="3" />
        <Txt x={XN(1.05)} y={N.oy + 26} anchor="end" size={14} fill={GOLD} bold>toward always-H</Txt>
        <Txt x={N.ox + 8} y={YN(0.98)} anchor="start" size={14} fill={TEAL} bold>toward always-T</Txt>
        <path d={`M ${XN(1)} ${N.oy} A ${N.S} ${N.S} 0 0 0 ${N.ox} ${YN(1)}`} fill="none" stroke={SOFT} strokeWidth="2" strokeDasharray="6 5" />
        <line x1={XN(a)} y1={N.oy} x2={XN(a)} y2={YN(b)} stroke={TEAL} strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={N.ox} y1={YN(b)} x2={XN(a)} y2={YN(b)} stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1={N.ox} y1={N.oy} x2={XN(a)} y2={YN(b)} stroke={PURP} strokeWidth="5" strokeLinecap="round" />
        <circle cx={XN(a)} cy={YN(b)} r="11" fill={PURP} stroke={INK} strokeWidth="3" />
        <Txt x={N.ox + 70} y={N.oy - 14} size={14} fill={PURP} bold>{`θ = ${deg(th)}°`}</Txt>
        <Txt x={680} y={410} size={14}>{`needle = (√p, √(1−p)) = (${a.toFixed(2)}, ${b.toFixed(2)}) · squared: ${p.toFixed(2)} + ${(1 - p).toFixed(2)} = 1`}</Txt>
      </svg>
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center", marginTop: 8 }}>
        <span style={{ fontFamily: MONO, fontSize: 15, color: SOFT }}>p</span>
        <input type="range" min="0" max="1" step="0.01" value={p} onChange={(e) => room.publish({ p: parseFloat(e.target.value) })} style={{ width: 420, accentColor: GOLD }} />
        <span style={{ fontFamily: MONO, fontSize: 15, color: INK, fontWeight: 600 }}>{`opposite (180° apart) → perpendicular (90° apart) · the angle halves`}</span>
      </div>
    </div>
  );
}

module.exports = { FigJoin, FigFlipRoom, FigBarsRoom, FigHalfPlaneRoom, FigArcRoom, FigNeedleRoom };
