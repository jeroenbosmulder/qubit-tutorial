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

module.exports = { FigJoin, FigFlipRoom };
