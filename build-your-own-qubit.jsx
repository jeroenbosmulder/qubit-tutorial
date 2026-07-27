import { useState, useMemo, useEffect, useRef } from "react";

// ---------- palette ----------
const C = {
  paper: "#FFFFFF",
  grid: "#E1F3FC",
  gridBold: "#AFE0F7",
  ink: "#002157",
  inkSoft: "#5C6E8F",
  gold: "#EE7203",
  goldSoft: "#FDE9D3",
  red: "#F71D25",
  redSoft: "#FDE0E1",
  teal: "#00A1E4",
};

const serif = "'Fraunces', Georgia, 'Times New Roman', serif";
const mono = "'IBM Plex Mono', 'Courier New', monospace";

// ---------- helpers ----------
const flipOne = (p) => (Math.random() < p ? 1 : 0); // 1 = H, 0 = T
const flipSeq = (p, n) => Array.from({ length: n }, () => flipOne(p));
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sampleStd = (a) => {
  const m = mean(a);
  return Math.sqrt(Math.max(0, mean(a.map((v) => v * v)) - m * m));
};
const fmt = (x, d = 2) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(d);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- small UI pieces ----------
function CoinChip({ v }) {
  const isH = v === 1;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        margin: 2,
        fontFamily: mono,
        fontSize: 11,
        fontWeight: 600,
        color: isH ? "#fff" : C.ink,
        background: isH ? C.gold : "#fff",
        border: `1.5px solid ${isH ? C.gold : C.gridBold}`,
      }}
    >
      {isH ? "H" : "T"}
    </span>
  );
}

function Btn({ children, onClick, kind = "solid", disabled }) {
  const solid = kind === "solid";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: mono,
        fontSize: 13,
        padding: "8px 14px",
        borderRadius: 6,
        cursor: disabled ? "default" : "pointer",
        border: `1.5px solid ${C.ink}`,
        background: solid ? C.ink : "transparent",
        color: solid ? C.paper : C.ink,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Notice({ children }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "10px 14px",
        borderLeft: `3px solid ${C.gold}`,
        background: "#FFF4E8",
        fontSize: 14,
        lineHeight: 1.55,
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.gold }}>
        WHAT TO NOTICE —{" "}
      </span>
      {children}
    </div>
  );
}

function Formula({ children }) {
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: 15,
        textAlign: "center",
        padding: "10px 0",
        color: C.ink,
      }}
    >
      {children}
    </div>
  );
}

function Slider({ value, min, max, step, onChange, label, readout }) {
  return (
    <div style={{ margin: "14px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: mono,
          fontSize: 12,
          marginBottom: 4,
          color: C.inkSoft,
        }}
      >
        <span>{label}</span>
        <span style={{ color: C.ink, fontWeight: 600 }}>{readout}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.gold }}
      />
    </div>
  );
}

// ---------- graph-paper state plot (Bernoulli circle) ----------
// p (heads probability) on horizontal axis in [0,1]; band width w on vertical axis.
// The state curve is (p - 1/2)^2 + w^2 = 1/4 : a circle of radius 1/2 centered at p = 1/2.
function StatePlot({
  W = 340,
  showLower = false,
  point = null, // [p, w]
  scatter = [], // [{p, w, color}]
  centroids = [], // [{p, w, color}] rendered as target markers
  segment = null, // [[p1,w1],[p2,w2]] chord between two candidate states
  showSemicircle = true,
  showFullCircle = false,
  labels = true,
}) {
  const S = 240; // px per unit of p
  const r = S / 2; // circle radius in px (= 1/2 unit)
  const H = showLower ? 2 * r + 70 : r + 78;
  const cx = W / 2; // p = 1/2
  const cy = showLower ? H / 2 : H - 44;
  const px = (p, w) => [cx + (p - 0.5) * S, cy - w * S];
  const x0 = px(0, 0)[0], x1 = px(1, 0)[0];

  // graph paper lines every 0.125 units, bold every 0.5
  const lines = [];
  const stepU = 0.125;
  const umin = 0.5 - cx / S, umax = 0.5 + (W - cx) / S;
  const vmin = -(H - cy) / S, vmax = cy / S;
  for (let u = Math.ceil(umin / stepU) * stepU; u <= umax; u += stepU) {
    const bold = Math.abs((u * 2) % 1) < 1e-6;
    lines.push(
      <line
        key={"v" + u.toFixed(3)}
        x1={px(u, 0)[0]} y1={0} x2={px(u, 0)[0]} y2={H}
        stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6}
      />
    );
  }
  for (let v = Math.ceil(vmin / stepU) * stepU; v <= vmax; v += stepU) {
    const bold = Math.abs((v * 2) % 1) < 1e-6;
    lines.push(
      <line
        key={"h" + v.toFixed(3)}
        x1={0} y1={cy - v * S} x2={W} y2={cy - v * S}
        stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6}
      />
    );
  }

  const semiPath = `M ${x0} ${cy} A ${r} ${r} 0 0 1 ${x1} ${cy}`;
  const lowerPath = `M ${x0} ${cy} A ${r} ${r} 0 0 0 ${x1} ${cy}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#FFFFFF", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {lines}
      {/* axes: horizontal at w=0, vertical at p=0 */}
      <line x1={0} y1={cy} x2={W} y2={cy} stroke={C.ink} strokeWidth={1.4} />
      <line x1={x0} y1={0} x2={x0} y2={H} stroke={C.ink} strokeWidth={1.4} />
      {showSemicircle && (
        <path d={semiPath} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" />
      )}
      {showLower && showFullCircle && (
        <path d={lowerPath} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="5 4" />
      )}
      {/* anchor labels */}
      {labels && (
        <>
          <text x={x1} y={cy + 16} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>always H (p=1)</text>
          <text x={x0} y={cy + 16} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>always T (p=0)</text>
          <text x={cx + 6} y={cy - r - 6} fontFamily={mono} fontSize="10" fill={C.teal}>fair coin (½, ½)</text>
          <circle cx={cx} cy={cy - r} r={3.5} fill={C.teal} />
          <circle cx={x1} cy={cy} r={3.5} fill={C.ink} />
          <circle cx={x0} cy={cy} r={3.5} fill={C.ink} />
        </>
      )}
      {/* axis captions */}
      <text x={W - 6} y={cy - 8} textAnchor="end" fontFamily={mono} fontSize="11" fill={C.ink}>p = P(heads)</text>
      <text x={x0 + 8} y={14} fontFamily={mono} fontSize="11" fill={C.ink}>band width</text>
      {segment && (
        <>
          <line
            x1={px(segment[0][0], segment[0][1])[0]} y1={px(segment[0][0], segment[0][1])[1]}
            x2={px(segment[1][0], segment[1][1])[0]} y2={px(segment[1][0], segment[1][1])[1]}
            stroke={C.inkSoft} strokeWidth={1.4}
          />
          <circle cx={px(segment[0][0], segment[0][1])[0]} cy={px(segment[0][0], segment[0][1])[1]} r={4} fill={C.teal} stroke={C.ink} strokeWidth={1.2} />
          <circle cx={px(segment[1][0], segment[1][1])[0]} cy={px(segment[1][0], segment[1][1])[1]} r={4} fill={C.red} stroke={C.ink} strokeWidth={1.2} />
        </>
      )}
      {scatter.map((s, i) => {
        const [sx, sy] = px(s.p, s.w);
        return <circle key={i} cx={sx} cy={sy} r={3} fill={s.color} fillOpacity={0.55} />;
      })}
      {centroids.map((c, i) => {
        const [sx, sy] = px(c.p, c.w);
        return (
          <g key={"c" + i}>
            <circle cx={sx} cy={sy} r={7.5} fill={c.color} stroke="#fff" strokeWidth={2} />
            <circle cx={sx} cy={sy} r={2.5} fill="#fff" />
          </g>
        );
      })}
      {point && (
        <>
          <line x1={cx} y1={cy} x2={px(point[0], point[1])[0]} y2={px(point[0], point[1])[1]} stroke={C.ink} strokeWidth={1.2} />
          <circle cx={px(point[0], point[1])[0]} cy={px(point[0], point[1])[1]} r={6} fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
        </>
      )}
    </svg>
  );
}

// ---------- amplitude bars ----------
function AmpBars({ a, b, title, color = C.gold }) {
  const bar = (val, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "5px 0" }}>
      <span style={{ fontFamily: mono, fontSize: 12, width: 64, color: C.inkSoft }}>{label}</span>
      <div style={{ position: "relative", flex: 1, height: 16, background: "#fff", border: `1px solid ${C.gridBold}`, borderRadius: 3 }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.gridBold }} />
        <div
          style={{
            position: "absolute",
            top: 2,
            bottom: 2,
            left: val >= 0 ? "50%" : `${50 + val * 48}%`,
            width: `${Math.abs(val) * 48}%`,
            background: val >= 0 ? color : C.red,
            borderRadius: 2,
            transition: "all .15s",
          }}
        />
      </div>
      <span style={{ fontFamily: mono, fontSize: 12, width: 52, textAlign: "right" }}>{fmt(val)}</span>
    </div>
  );
  return (
    <div style={{ padding: "10px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, marginBottom: 10 }}>
      {title && <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 6 }}>{title}</div>}
      {bar(a, "a (heads)")}
      {bar(b, "b (tails)")}
    </div>
  );
}

// ================= STEP 1 =================
function Step1() {
  const [runs, setRuns] = useState([]);
  return (
    <div>
      <p>
        Take a fair coin. Before you flip it ten times, ask yourself: <em>which sequences do
        you expect to see?</em> All heads? A neat alternation? Something messy? Write a few
        guesses down, then flip.
      </p>
      <Btn onClick={() => setRuns((r) => [flipSeq(0.5, 10), ...r].slice(0, 6))}>
        Flip 10 times
      </Btn>
      <div style={{ marginTop: 14 }}>
        {runs.length === 0 && (
          <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft }}>
            no flips yet — the page is your lab bench
          </div>
        )}
        {runs.map((seq, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div>{seq.map((v, j) => <CoinChip key={j} v={v} />)}</div>
            <span style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft }}>
              {seq.filter((v) => v === 1).length}H
            </span>
          </div>
        ))}
      </div>
      <Notice>
        Every particular sequence is equally likely — HHHHHHHHHH exactly as likely as
        HTHHTTHTHT. What differs is how <em>many</em> sequences look "mixed" versus "pure".
        Your expectations are about the whole ensemble, not any one run.
      </Notice>
    </div>
  );
}

// ================= STEP 2 =================
function Step2() {
  const coins = useMemo(() => {
    const detSide = Math.random() < 0.5 ? 1 : 0;
    return shuffle([
      { kind: "fair", p: 0.5 },
      { kind: "biased", p: 0.8 },
      { kind: "deterministic", p: detSide },
    ]);
  }, []);
  const [seqs, setSeqs] = useState([[], [], []]);
  const [guess, setGuess] = useState(["", "", ""]);
  const [revealed, setRevealed] = useState(false);
  const names = ["Coin A", "Coin B", "Coin C"];
  const opts = ["fair", "biased", "deterministic"];

  return (
    <div>
      <p>
        Now three <strong>mystery coins</strong>. One is fair, one is biased, one is
        deterministic — it has already made up its mind, but you don't know which side it
        favors. Flip each one and try to identify it.
      </p>
      {coins.map((c, i) => (
        <div key={i} style={{ padding: "10px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <strong style={{ fontFamily: mono, fontSize: 13 }}>{names[i]}</strong>
            <Btn kind="outline" onClick={() =>
              setSeqs((s) => s.map((q, j) => (j === i ? [...q, ...flipSeq(c.p, 10)].slice(-20) : q)))
            }>
              flip ×10
            </Btn>
          </div>
          <div style={{ marginTop: 6, minHeight: 26 }}>
            {seqs[i].map((v, j) => <CoinChip key={j} v={v} />)}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {opts.map((o) => (
              <button
                key={o}
                onClick={() => setGuess((g) => g.map((v, j) => (j === i ? o : v)))}
                style={{
                  fontFamily: mono, fontSize: 11, padding: "4px 8px", borderRadius: 12,
                  border: `1.5px solid ${guess[i] === o ? C.gold : C.gridBold}`,
                  background: guess[i] === o ? C.goldSoft : "transparent",
                  cursor: "pointer", color: C.ink,
                }}
              >
                {o}
              </button>
            ))}
            {revealed && (
              <span style={{ fontFamily: mono, fontSize: 12, color: guess[i] === c.kind ? C.teal : C.red }}>
                {guess[i] === c.kind ? "✓" : "✗"} it's {c.kind}
                {c.kind === "deterministic" ? (c.p === 1 ? " (heads)" : " (tails)") : ""}
              </span>
            )}
          </div>
        </div>
      ))}
      <Btn onClick={() => setRevealed(true)} disabled={guess.some((g) => !g)}>
        Reveal
      </Btn>
      <Notice>
        Before its first flip, what odds would you give the deterministic coin? You don't
        know its side, so… 50 / 50 — <em>the same as the fair coin</em>. The expected
        outcome alone can't tell them apart. You need a second indicator.
      </Notice>
    </div>
  );
}

// ================= STEP 3 =================
function Step3() {
  const [scatter, setScatter] = useState([]);
  const runExperiments = () => {
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const f = flipSeq(0.5, 30);
      pts.push({ p: mean(f), w: sampleStd(f), color: C.teal });
      const side = Math.random() < 0.5 ? 1 : 0; // fresh mystery deterministic coin
      const d = flipSeq(side, 30);
      pts.push({ p: mean(d), w: sampleStd(d), color: C.red });
    }
    setScatter((s) => [...s, ...pts].slice(-160));
  };
  const centroidOf = (color) => {
    const s = scatter.filter((x) => x.color === color);
    if (!s.length) return null;
    return { p: mean(s.map((x) => x.p)), w: mean(s.map((x) => x.w)), color };
  };
  const centroids = [centroidOf(C.teal), centroidOf(C.red)].filter(Boolean);
  const [shown, setShown] = useState([false, false, false]);
  const EXS = [
    {
      seq: [1, 0, 1, 0],
      sol: "p̂ = 2/4 = ½. Deviations: +½, −½, +½, −½. Squares: ¼ each → average ¼ → band width √¼ = ½. (Shortcut: √(½·½) = ½.)",
    },
    {
      seq: [1, 1, 1, 1],
      sol: "p̂ = 1. Every deviation is 0 → band width 0. A sequence without surprises has no spread. (Shortcut: √(1·0) = 0.)",
    },
    {
      seq: [1, 1, 1, 0],
      sol: "p̂ = ¾. Deviations: +¼, +¼, +¼, −¾. Squares: 3·(1/16) + 9/16 = 12/16 → average 3/16 → band width √(3/16) ≈ 0.43. (Shortcut: √(¾·¼) ≈ 0.43.)",
    },
  ];
  return (
    <div>
      <p>
        Give each run of 30 flips <strong>two numbers</strong>: its average outcome
        (counting H&nbsp;=&nbsp;1, T&nbsp;=&nbsp;0, so the average is just the observed
        heads-fraction&nbsp;p) and its spread — call it the <strong>band width</strong> of
        the sequence. Run many experiments with a fair
        coin <span style={{ color: C.teal }}>●</span> and with fresh mystery deterministic
        coins <span style={{ color: C.red }}>●</span>, and drop each run on the chart.
      </p>
      <div style={{ margin: "14px 0", padding: "12px 14px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8 }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 6 }}>
          HOW TO COMPUTE THE BAND WIDTH — try it yourself
        </div>
        <p style={{ margin: "0 0 8px" }}>
          The band width measures how far the flips scatter around their own average.
          The recipe: <strong>(1)</strong> write each flip as a number, H&nbsp;=&nbsp;1
          and T&nbsp;=&nbsp;0; <strong>(2)</strong> compute the average p̂ (just the
          fraction of heads); <strong>(3)</strong> write down each flip's deviation from
          that average; <strong>(4)</strong> square the deviations, average the squares,
          and take the square root. For 0/1 flips this always boils down to the shortcut
          √(p̂(1−p̂)) — verify it in the exercises below.
        </p>
        {EXS.map((ex, i) => (
          <div key={i} style={{ padding: "8px 0", borderTop: `1px solid ${C.grid}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft }}>{i + 1}.</span>
              <span>{ex.seq.map((v, j) => <CoinChip key={j} v={v} />)}</span>
              <button
                onClick={() => setShown((s) => s.map((x, j) => (j === i ? !x : x)))}
                style={{ fontFamily: mono, fontSize: 11, padding: "4px 10px", borderRadius: 12, border: `1.5px solid ${C.gridBold}`, background: shown[i] ? C.goldSoft : "#fff", color: C.ink, cursor: "pointer" }}
              >
                {shown[i] ? "hide solution" : "show solution"}
              </button>
            </div>
            {shown[i] && (
              <div style={{ marginTop: 6, fontFamily: mono, fontSize: 12.5, lineHeight: 1.6, color: C.ink }}>
                {ex.sol}
              </div>
            )}
          </div>
        ))}
      </div>
      <p>
        But here is the important move: your <em>belief</em> about a coin is fixed{" "}
        <strong>before you start flipping</strong>. So its two numbers are{" "}
        <em>expectations over everything that might happen</em> — the average of the whole
        cloud of possible runs, not the run you happen to get. Each belief is one point:
        the centroid of its cloud (the white-ringed markers).
      </p>
      <Btn onClick={runExperiments}>Run 8 experiments of each</Btn>
      <div style={{ marginTop: 12 }}>
        <StatePlot scatter={scatter} centroids={centroids} showSemicircle={scatter.length > 40} labels={false} />
      </div>
      <Notice>
        The fair coin's possible worlds all agree, so its belief marker settles on the
        curve near (½,&nbsp;½). The mystery deterministic coin's worlds <em>disagree</em>:
        each single world lands at a corner, (0,&nbsp;0) or (1,&nbsp;0), but averaging over
        both possibilities drags the belief to (½,&nbsp;0) — same expected outcome as the
        fair coin, zero expected band width, and strictly <em>inside</em> the region the
        curve encloses. Definite coins live on the curve; uncertainty about <em>which</em>{" "}
        coin you hold pulls the belief into the interior. (Had you first peeked at one
        flip, you would have learned the coin's side and jumped to a corner — the interior
        point describes you before learning anything.) And pocket a question for the
        road: the fair coin and the mystery coin now sit at different points — but how
        far apart are they, <em>really</em>? That innocent-sounding, entirely
        non-quantum question is the hidden engine of this whole tutorial. We'll first
        pin down the exact
        shape of the curve, then come back to conquer the interior.
      </Notice>
    </div>
  );
}

// ================= STEP 4 =================
function Step4() {
  const [p, setP] = useState(0.5);
  const w = Math.sqrt(Math.max(0, p * (1 - p)));
  return (
    <div>
      <p>
        There's a formula behind that curve. A coin with heads-probability p has band width
      </p>
      <Formula>σ = √(p(1 − p))</Formula>
      <p>
        which means every state satisfies (p&nbsp;−&nbsp;½)²&nbsp;+&nbsp;σ²&nbsp;=&nbsp;¼:
        a circle of radius ½ centered on fair odds — the <strong>Bernoulli circle</strong>.
        Slide the bias and watch where the state of your belief lives.
      </p>
      <Slider
        value={p} min={0} max={1} step={0.01} onChange={setP}
        label="P(heads)"
        readout={`p=${p.toFixed(2)}   σ=${w.toFixed(2)}`}
      />
      <StatePlot point={[p, w]} />
      <Notice>
        Every possible coin-belief lands on the <em>upper half of the Bernoulli circle</em>.
        The fair coin sits at the top of the arc, at (½,&nbsp;½); the two deterministic
        coins pin down the ends. You have just drawn a state space — but two puzzles
        remain. Step 3's belief marker fell <em>inside</em> this curve, and the curve
        itself is exactly half of something. We take the interior first.
      </Notice>
    </div>
  );
}

// ================= STEP 5 : MIXING BELIEFS =================
function StepMix() {
  const sig = (q) => Math.sqrt(Math.max(0, q * (1 - q)));
  const [q1, setQ1] = useState(0.9);
  const [q2, setQ2] = useState(0.2);
  const [conf, setConf] = useState(0.6);
  const [truth, setTruth] = useState(null);   // which coin you actually hold (1 or 2), sampled from the prior
  const [flips, setFlips] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [stuck, setStuck] = useState(false);  // Bayes fell silent: zero likelihood on the whole list
  const resetLearn = () => { setTruth(null); setFlips([]); setRevealed(false); setStuck(false); };
  const learnFrom = (x) => {
    setFlips((f) => [...f, x].slice(-18));
    const L1 = x ? q1 : 1 - q1, L2 = x ? q2 : 1 - q2;
    const den = conf * L1 + (1 - conf) * L2;
    if (den > 1e-9) setConf(Math.min(1, Math.max(0, (conf * L1) / den)));
    else setStuck(true);
  };
  const flipAndLearn = () => {
    let t = truth;
    if (t === null) { t = Math.random() < conf ? 1 : 2; setTruth(t); }
    const q = t === 1 ? q1 : q2;
    learnFrom(Math.random() < q ? 1 : 0);
  };
  const sneakTail = () => {
    if (truth === null) setTruth(Math.random() < conf ? 1 : 2);
    learnFrom(0);
  };
  const bp = conf * q1 + (1 - conf) * q2;
  const bw = conf * sig(q1) + (1 - conf) * sig(q2);
  return (
    <div>
      <p>
        The curve holds every <em>definite</em> coin. But step 3 left a loose end: the
        mystery deterministic coin's belief marker settled <em>inside</em> the curve.
        Time to conquer the interior — by mixing beliefs by hand.
      </p>
      <p>
        Say you hold a coin and are confident with weight c that its bias is
        q₁ <span style={{ color: C.teal }}>●</span>, and otherwise (weight 1−c) that its
        bias is q₂ <span style={{ color: C.red }}>●</span>. Your two numbers — expected
        outcome and expected band width — are the c-weighted averages, so your belief
        slides along the chord between the two candidate coins.
      </p>
      <Slider value={q1} min={0} max={1} step={0.01} onChange={(v) => { setQ1(v); resetLearn(); }}
        label="q₁ — first candidate bias" readout={`q₁=${q1.toFixed(2)}`} />
      <Slider value={q2} min={0} max={1} step={0.01} onChange={(v) => { setQ2(v); resetLearn(); }}
        label="q₂ — second candidate bias" readout={`q₂=${q2.toFixed(2)}`} />
      <Slider value={conf} min={0} max={1} step={0.01} onChange={(v) => { setConf(v); resetLearn(); }}
        label="c — confidence in the first candidate"
        readout={`c=${conf.toFixed(2)}  →  belief (${bp.toFixed(2)}, ${bw.toFixed(2)})`} />
      <StatePlot segment={[[q1, sig(q1)], [q2, sig(q2)]]} point={[bp, bw]} labels={false} />
      <div style={{ marginTop: 16, padding: "12px 14px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8 }}>
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 6 }}>
          TWO KINDS OF NOT-KNOWING — try to learn
        </div>
        <p style={{ margin: "0 0 8px" }}>
          The interior separates two kinds of uncertainty. <strong>Statistical</strong>:
          even knowing the coin exactly (a point on the curve), each flip stays random —
          there is nothing to learn, and no flip will ever move your belief.{" "}
          <strong>Systematic</strong>: not knowing <em>which</em> coin you hold — and
          that part is curable. Press the button: a real coin is dealt to you according
          to your confidence, each flip Bayes-updates c, and your belief point slides
          along the chord toward the coin you actually hold. Then set c&nbsp;=&nbsp;1
          and flip again: the point freezes — a pure belief is one with nothing left to
          learn. Which is wisdom when you are right, and a prison when you are wrong:
        </p>
        <p style={{ margin: "0 0 8px" }}>
          <strong>A warning, and it is the door to real learning.</strong> Bayes can
          only re-weigh coins that are <em>on your list</em>. Set q₁=1, q₂=0, c=½ — the
          mystery coin. One head makes you certain you hold the always-heads coin. Now{" "}
          <em>sneak in a tail</em>: zero likelihood under every candidate — Bayes falls
          silent. Updating weights can never rescue a hypothesis you refused to include.
          The cure: keep a sliver of belief on <em>every</em> coin, mass smeared along
          the whole rim. Then "updating the parameters" is nothing but reweighting over
          that continuum — and your belief point is free to roam the entire disk instead
          of one chord.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Btn onClick={flipAndLearn}>Flip once &amp; learn</Btn>
          <Btn kind="outline" onClick={sneakTail}>sneak in a tail</Btn>
          <Btn kind="outline" onClick={resetLearn} disabled={truth === null}>reset</Btn>
          <span style={{ minHeight: 24 }}>
            {flips.map((v, j) => <CoinChip key={j} v={v} />)}
          </span>
          {flips.length > 0 && !revealed && (
            <button onClick={() => setRevealed(true)}
              style={{ fontFamily: mono, fontSize: 11, padding: "4px 10px", borderRadius: 12, border: `1.5px solid ${C.gridBold}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
              reveal
            </button>
          )}
          {revealed && (
            <span style={{ fontFamily: mono, fontSize: 12, color: C.teal }}>
              you hold the q{truth === 1 ? "₁" : "₂"} coin — c has moved to {conf.toFixed(2)}
            </span>
          )}
        </div>
        {stuck && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: C.redSoft, border: `1.5px solid ${C.red}`, borderRadius: 8, fontFamily: mono, fontSize: 12.5, color: C.ink }}>
            Bayes is speechless: that flip has zero likelihood under every candidate on
            your list. No reweighting can repair a wrong hypothesis list — you must
            revise the list itself.
          </div>
        )}
      </div>
      <Notice>
        Two candidate biases and a confidence reach <em>every</em> point of the upper disk
        — set q₁=1, q₂=0, c=½ to rebuild the mystery deterministic coin at the exact
        center. And no belief can ever escape the disk: chords stay inside the circle
        they span. So the state space of beliefs is not the curve but the whole disk it
        encloses: <em>definite</em> coins on the rim, <em>uncertainty about the coin</em>{" "}
        in the interior, total ignorance at the dead center. The disk even sorts your
        ignorance: the rim carries the statistical part no data can remove, the depth
        into the interior is the systematic part flips can teach away — purity measures
        how much of your not-knowing is curable. Fittingly, our two protagonists embody
        the extremes at the same odds: the fair coin is pure statistics, the mystery
        coin pure ignorance.
      </Notice>
    </div>
  );
}

// ================= STEP 6 : THALES LIFT =================
function StepThales() {
  const [alpha, setAlpha] = useState(35); // degrees 0..360
  const al = (alpha * Math.PI) / 180;
  const a = Math.cos(al);
  const b = Math.sin(al);
  const p = a * a;
  const w = a * b;
  const W = 340, H = 340, cx = 160, cy = 170, R = 120;
  const px = (u, v) => [cx + u * R, cy - v * R];
  const [Ax, Ay] = px(a, b);
  const [Fx, Fy] = px(p, w);
  const [Ox, Oy] = px(0, 0);
  const [Ux, Uy] = px(1, 0);
  // grid every 0.25
  const lines = [];
  for (let u = -1.25; u <= 1.5001; u += 0.25) {
    const bold = Math.abs(u % 1) < 1e-6;
    lines.push(<line key={"v" + u} x1={px(u, 0)[0]} y1={0} x2={px(u, 0)[0]} y2={H} stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6} />);
    lines.push(<line key={"h" + u} x1={0} y1={px(0, u)[1]} x2={W} y2={px(0, u)[1]} stroke={bold ? C.gridBold : C.grid} strokeWidth={bold ? 1 : 0.6} />);
  }
  // quadrant-I arc of the unit circle (classical lifts), sampled
  const q1 = Array.from({ length: 31 }, (_, i) => px(Math.cos((i / 30) * Math.PI / 2), Math.sin((i / 30) * Math.PI / 2)).join(",")).join(" ");
  // right-angle marker at F (legs toward O and toward (1,0))
  const s = 0.07;
  const sg = b >= 0 ? 1 : -1;
  const e1 = [-a * s, -b * s];
  const e2 = [b * s * sg, -a * s * sg];
  const sq = [
    px(p + e1[0], w + e1[1]),
    px(p + e1[0] + e2[0], w + e1[1] + e2[1]),
    px(p + e2[0], w + e2[1]),
  ];
  const showRA = Math.abs(w) > 0.03;
  return (
    <div>
      <p>
        Go back to the semicircle and pick any belief point on it. Connect it to the two
        corners: one vector to always-T, one to always-H. Two theorems you may remember
        from school now click together. <strong>Thales</strong>: a point on a circle
        always sees a diameter at a right angle — so the two vectors are perpendicular
        (the little square in the picture). And measuring their lengths gives exactly
      </p>
      <Formula>|to T| = √p&nbsp;&nbsp;&nbsp;&nbsp;|to H| = √(1 − p)</Formula>
      <p>
        <strong>Pythagoras</strong> closes the loop: the legs squared add up to the
        hypotenuse squared, and the hypotenuse T–H has length 1 — so
        p&nbsp;+&nbsp;(1−p)&nbsp;=&nbsp;1. The coin's bookkeeping is literally a right
        triangle. Now write the two lengths down as coordinates of their own: the pair
        (√p,&nbsp;√(1−p)) has squares summing to one, so it lives on the{" "}
        <strong>unit circle</strong> (teal). Nothing was invented here — the unit circle
        is simply what appears when you <em>measure each state's two distances</em>. The
        dashed line shows the shortest way to picture the lift: stretch the T-chord out
        to length one, and you have arrived.
      </p>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — angle on the unit circle"
        readout={`α=${alpha}°   Bernoulli angle=2α=${2 * alpha}°`}
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        {lines}
        <line x1={0} y1={cy} x2={W} y2={cy} stroke={C.ink} strokeWidth={1.4} />
        <line x1={cx} y1={0} x2={cx} y2={H} stroke={C.ink} strokeWidth={1.4} />
        {/* unit circle */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.inkSoft} strokeWidth={1.2} />
        <polyline points={q1} fill="none" stroke={C.teal} strokeWidth={2.5} />
        {/* Bernoulli circle: upper gold, lower red */}
        <path d={`M ${Ox} ${Oy} A ${R / 2} ${R / 2} 0 0 1 ${Ux} ${Uy}`} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" />
        <path d={`M ${Ox} ${Oy} A ${R / 2} ${R / 2} 0 0 0 ${Ux} ${Uy}`} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="5 4" />
        {/* lifted direction (the stretched T-chord) and the two right-angled chords */}
        <line x1={Ox} y1={Oy} x2={px(1.12 * a, 1.12 * b)[0]} y2={px(1.12 * a, 1.12 * b)[1]} stroke={C.inkSoft} strokeWidth={1.1} strokeDasharray="3 3" />
        <line x1={Ox} y1={Oy} x2={Fx} y2={Fy} stroke={C.teal} strokeWidth={2.2} />
        <line x1={Ux} y1={Uy} x2={Fx} y2={Fy} stroke={C.gold} strokeWidth={2.2} />
        <text x={px(p * 0.5, w * 0.5)[0] - 8} y={px(p * 0.5, w * 0.5)[1] - 6} textAnchor="end" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.teal}>√p</text>
        <text x={px((1 + p) * 0.5, w * 0.5)[0] + 8} y={px((1 + p) * 0.5, w * 0.5)[1] - 6} textAnchor="start" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.gold}>√(1−p)</text>
        {showRA && <polyline points={`${sq[0].join(",")} ${sq[1].join(",")} ${sq[2].join(",")}`} fill="none" stroke={C.ink} strokeWidth={1} />}
        {/* anchors */}
        <circle cx={Ox} cy={Oy} r={3.5} fill={C.ink} />
        <circle cx={Ux} cy={Uy} r={3.5} fill={C.ink} />
        <text x={Ux + 4} y={Uy + 16} fontFamily={mono} fontSize="10" fill={C.inkSoft}>H (1,0)</text>
        <text x={Ox - 4} y={Oy + 16} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.inkSoft}>T (0,0)</text>
        {/* points */}
        <circle cx={Ax} cy={Ay} r={5.5} fill={C.teal} stroke={C.ink} strokeWidth={1.3} />
        <text x={px(1.22 * a, 1.22 * b)[0]} y={px(1.22 * a, 1.22 * b)[1] + 4} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.teal}>
          {a >= 0 && b >= 0 ? "(√p, √(1−p))" : "(a, b)"}
        </text>
        <circle cx={Fx} cy={Fy} r={6} fill={C.gold} stroke={C.ink} strokeWidth={1.5} />
        <text x={Fx + 9} y={Fy + 15} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>state</text>
      </svg>
      <Notice>
        Sweep α once around the unit circle: the gold point runs around the Bernoulli
        circle <em>twice</em> — the Bernoulli angle is 2α. And the first quarter alone,
        where both coordinates are honest square roots, already paints the whole upper
        semicircle. So the other three quarters revisit the same odds. What new thing
        could they possibly carry? A <em>sign</em>. That's next.
      </Notice>
    </div>
  );
}


// ================= STEP 7 : MISSING HALF =================
function Step5() {
  const [alpha, setAlpha] = useState(35); // degrees, 0..360
  const t = (alpha * Math.PI) / 180;
  const a = Math.cos(t);
  const b = Math.sin(t);
  const p = a * a;
  const w = a * b; // signed band width, = sin(2t)/2
  return (
    <div>
      <p>
        Each point of the unit circle you just swept is really a pair of{" "}
        <strong>amplitudes</strong> (a,&nbsp;b) — square roots that are allowed to carry a
        sign — with p&nbsp;=&nbsp;a² and 1−p&nbsp;=&nbsp;b². Then
      </p>
      <Formula>p = a²&nbsp;&nbsp;&nbsp;&nbsp;σ = √(a²b²) = a·b</Formula>
      <p>
        Squares erase signs — so (a,&nbsp;b) and (a,&nbsp;−b) give the <em>same odds</em>.
        But the band width a·b remembers the sign. Whenever exactly one amplitude is
        negative, the band width is negative: the state lives on the lower half of the
        Bernoulli circle. The fair coin's own mirror twin down at (½,&nbsp;−½) we'll call
        the <strong>anti-coin</strong>. Sweep all the way around and watch every set of
        odds appear twice — once above the axis, once below.
      </p>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α (sweeps the amplitudes)"
        readout={`a=${fmt(a)}  b=${fmt(b)}  →  p=${p.toFixed(2)}  ab=${fmt(w)}`}
      />
      <AmpBars a={a} b={b} title="AMPLITUDES" />
      <StatePlot showLower showFullCircle point={[p, w]} />
      <Notice>
        The lower semicircle is a family of new states: same betting odds as their mirror
        images above, but with a hidden sign. Geometrically the sign is an{" "}
        <em>orientation</em>: flipping b flips the triangle T–state–H to the other side
        of the diameter — same side lengths, opposite way around. Flipping the coin can
        never see it — nothing
        you bet on heads and tails distinguishes a state from its mirror twin. To see the
        sign, you have to ask the coin a <em>different question</em> than heads-or-tails —
        and that is exactly what the next two steps are about.
      </Notice>
    </div>
  );
}

// ---------- shared pieces for the measurement steps ----------
function endLabels(delta) {
  const d = ((delta % 360) + 360) % 360;
  if (d === 0) return ["H", "T"];
  if (d === 90) return ["coin", "anti-coin"];
  if (d === 180) return ["T", "H"];
  if (d === 270) return ["anti-coin", "coin"];
  return ["end ⊕", "end ⊖"];
}

function MeasurePlot({ theta, delta, showMirror = false, showOrientation = false }) {
  const W = 340, H = 264, S = 240;
  const ox = 50, oy = 132;
  const toPx = (x, y) => [ox + x * S, oy - y * S];
  const th = (theta * Math.PI) / 180, dl = (delta * Math.PI) / 180;
  const P = [0.5 + 0.5 * Math.cos(th), 0.5 * Math.sin(th)];
  const Pm = [P[0], -P[1]];
  const Np = [0.5 + 0.5 * Math.cos(dl), 0.5 * Math.sin(dl)];
  const Nm = [0.5 - 0.5 * Math.cos(dl), -0.5 * Math.sin(dl)];
  const [O0x, O0y] = toPx(0, 0);
  const [O1x, O1y] = toPx(1, 0);
  const [Px, Py] = toPx(P[0], P[1]);
  const [Pmx, Pmy] = toPx(Pm[0], Pm[1]);
  const [Npx, Npy] = toPx(Np[0], Np[1]);
  const [Nmx, Nmy] = toPx(Nm[0], Nm[1]);
  const [cxp, cyp] = toPx(0.5, 0);
  const [labP, labM] = endLabels(delta);
  const lines = [];
  for (let u = -0.25; u <= 1.3; u += 0.25) {
    lines.push(<line key={"v" + u} x1={toPx(u, 0)[0]} y1={0} x2={toPx(u, 0)[0]} y2={H} stroke={C.grid} strokeWidth={0.6} />);
  }
  for (let v = -0.5; v <= 0.55; v += 0.25) {
    lines.push(<line key={"h" + v} x1={0} y1={toPx(0, v)[1]} x2={W} y2={toPx(0, v)[1]} stroke={C.grid} strokeWidth={0.6} />);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {lines}
      <line x1={0} y1={oy} x2={W} y2={oy} stroke={C.ink} strokeWidth={1} />
      <path d={`M ${O0x} ${O0y} A ${S / 2} ${S / 2} 0 0 1 ${O1x} ${O1y}`} fill="none" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" />
      <path d={`M ${O0x} ${O0y} A ${S / 2} ${S / 2} 0 0 0 ${O1x} ${O1y}`} fill="none" stroke={C.red} strokeWidth={2} strokeDasharray="5 4" />
      {/* orientation triangles: same lengths, opposite way around */}
      {showOrientation && showMirror && (() => {
        const sgnA = (A, B, Cc) => 0.5 * (A[0] * (B[1] - Cc[1]) + B[0] * (Cc[1] - A[1]) + Cc[0] * (A[1] - B[1]));
        const cent = (A, B, Cc) => [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3];
        const tri = (A, B, Cc) => `${toPx(...A).join(",")} ${toPx(...B).join(",")} ${toPx(...Cc).join(",")}`;
        const g1 = sgnA(Nm, P, Np), g2 = sgnA(Nm, Pm, Np);
        const c1 = toPx(...cent(Nm, P, Np)), c2 = toPx(...cent(Nm, Pm, Np));
        return (
          <>
            <polygon points={tri(Nm, P, Np)} fill={C.gold} fillOpacity={0.16} />
            <polygon points={tri(Nm, Pm, Np)} fill={C.red} fillOpacity={0.13} />
            <text x={c1[0]} y={c1[1] + 6} textAnchor="middle" fontSize="17" fill={C.gold}>{g1 < 0 ? "↻" : "↺"}</text>
            <text x={c2[0]} y={c2[1] + 6} textAnchor="middle" fontSize="17" fill={C.red}>{g2 < 0 ? "↻" : "↺"}</text>
          </>
        );
      })()}
      {/* the question: a diameter */}
      <line x1={Nmx} y1={Nmy} x2={Npx} y2={Npy} stroke={C.ink} strokeWidth={1.8} />
      <circle cx={cxp} cy={cyp} r={2.5} fill={C.inkSoft} />
      {/* chords from P to the two ends */}
      <line x1={Nmx} y1={Nmy} x2={Px} y2={Py} stroke={C.teal} strokeWidth={2} />
      <line x1={Npx} y1={Npy} x2={Px} y2={Py} stroke={C.gold} strokeWidth={2} />
      {showMirror && (
        <>
          <line x1={Nmx} y1={Nmy} x2={Pmx} y2={Pmy} stroke={C.teal} strokeWidth={1.2} strokeDasharray="4 3" />
          <line x1={Npx} y1={Npy} x2={Pmx} y2={Pmy} stroke={C.gold} strokeWidth={1.2} strokeDasharray="4 3" />
          <circle cx={Pmx} cy={Pmy} r={6} fill="#fff" stroke={C.ink} strokeWidth={2} />
          <text x={Pmx + 10} y={Pmy + 14} fontFamily={mono} fontSize="12" fontWeight="600" fill={C.ink}>P′</text>
        </>
      )}
      {/* ends of the diameter */}
      <circle cx={Npx} cy={Npy} r={4.5} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />
      <circle cx={Nmx} cy={Nmy} r={4.5} fill={C.teal} stroke={C.ink} strokeWidth={1.2} />
      <text x={Npx + (Npx < cxp ? -8 : 8)} y={Npy + (Npy > cyp ? 15 : -8)} textAnchor={Npx < cxp ? "end" : "start"} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.gold}>{labP}</text>
      <text x={Nmx + (Nmx < cxp ? -8 : 8)} y={Nmy + (Nmy > cyp ? 15 : -8)} textAnchor={Nmx < cxp ? "end" : "start"} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.teal}>{labM}</text>
      {/* the state */}
      <circle cx={Px} cy={Py} r={6.5} fill={C.ink} stroke="#fff" strokeWidth={2} />
      <text x={Px + 10} y={Py - 8} fontFamily={mono} fontSize="12" fontWeight="600" fill={C.ink}>P</text>
    </svg>
  );
}

function ProbBars({ title, probs, labels, dim = false }) {
  const bar = (q, lab, color) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0" }}>
      <span style={{ fontFamily: mono, fontSize: 11, width: 78, color: C.inkSoft, textAlign: "right" }}>{lab}</span>
      <div style={{ flex: 1, height: 14, background: "#fff", border: `1px solid ${C.gridBold}`, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${q * 100}%`, background: color, opacity: dim ? 0.45 : 1, transition: "width .12s" }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: 11, width: 40, textAlign: "right" }}>{(q * 100).toFixed(0)}%</span>
    </div>
  );
  return (
    <div style={{ padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, marginTop: 8 }}>
      {title && <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 4 }}>{title}</div>}
      {bar(probs[0], labels[0], C.gold)}
      {bar(probs[1], labels[1], C.teal)}
    </div>
  );
}

// ================= STEP 8 : MEASURING IS ASKING =================
function StepMeasure() {
  const [theta, setTheta] = useState(50);
  const [delta, setDelta] = useState(0);
  const th = (theta * Math.PI) / 180, dl = (delta * Math.PI) / 180;
  const pPlus = Math.cos((th - dl) / 2) ** 2; // = squared distance from P to the opposite end
  const [labP, labM] = endLabels(delta);
  return (
    <div>
      <p>
        Time to say what "flipping the coin" really is — and to discover that it is only
        one question among many. Here is the rule of the game: you may never ask a state
        "where are you?". You may only pick a <strong>diameter</strong> of the circle and
        ask "<em>which end?</em>" The state must answer with one of the diameter's two
        endpoints. And the odds of each answer are already drawn in your picture: the
        chance of an answer is the <strong>squared distance to the opposite end</strong>.
        Far from "always T" means: probably answers H. (Thales guarantees the right angle
        at P, so by Pythagoras the two squared chords always add to 1 — the chances of
        the two answers add up, automatically.)
      </p>
      <p>
        The horizontal diameter is the <em>raw</em> question, heads-or-tails: that one is
        the coin flip. But tilted diameters ask <em>combined</em> questions. Compare
        traffic: sometimes the revealing question is not "which weekday is it?" but
        "weekend or midweek?" — a contrast built out of the raw days. The vertical
        diameter asks exactly such a contrast: "coin or anti-coin?".
      </p>
      <Slider value={theta} min={0} max={360} step={1} onChange={setTheta}
        label="where the state sits on the circle" readout={`state angle ${theta}°`} />
      <Slider value={delta} min={0} max={360} step={1} onChange={setDelta}
        label="which question you ask (rotate the diameter)"
        readout={`δ=${delta}°${delta % 180 === 0 ? " — the coin flip" : delta % 180 === 90 ? " — the contrast question" : ""}`} />
      <MeasurePlot theta={theta} delta={delta} />
      <ProbBars title="THE STATE'S ANSWER ODDS" probs={[pPlus, 1 - pPlus]} labels={[`answers ${labP}`, `answers ${labM}`]} />
      <Notice>
        Rotate the question dial until the diameter passes straight through the state:
        suddenly it answers with 100% certainty. <em>Every</em> state on the circle is
        completely certain about exactly one question — and spread out over all the
        others. The fair coin is certain too: not about heads-or-tails, but about
        coin-or-anti-coin. No state is "random" in itself; randomness is a mismatch
        between the state and the question you happened to ask.
      </Notice>
    </div>
  );
}

// ================= STEP 9 : WHY THE SIGN HIDES =================
function StepSign() {
  const [theta, setTheta] = useState(50);
  const [delta, setDelta] = useState(0);
  const th = (theta * Math.PI) / 180, dl = (delta * Math.PI) / 180;
  const pPlus = Math.cos((th - dl) / 2) ** 2;
  const pPlusMirror = Math.cos((-th - dl) / 2) ** 2;
  const [labP, labM] = endLabels(delta);
  return (
    <div>
      <p>
        Now we can finally answer the question this tutorial has been circling: why do
        ordinary coin flips never show the sign? Take a state P and its mirror twin P′
        on the lower half. Look at the horizontal diameter: <em>both of its endpoints lie
        on the mirror line itself</em>. The mirror doesn't move them. So P and P′ are at
        identical distances from "always T" and from "always H" — and give identical
        answer odds to the coin flip. Forever. The flip isn't weak; it is{" "}
        <em>symmetric</em> under exactly the reflection that the sign encodes.
      </p>
      <p>
        There is a sharper way to say it. From any state, the pair of chords to a
        diameter's ends carries <em>two</em> kinds of information: their{" "}
        <strong>lengths</strong> — which, squared, are the answer odds of step 8 — and
        their <strong>orientation</strong>: walking end&nbsp;→&nbsp;state&nbsp;→&nbsp;end,
        you pass around the diameter one way or the other. The mirror keeps every length
        and reverses the orientation; the flip only reads lengths. Set the dial to 0° and
        look at the two shaded triangles below: identical side lengths, opposite turning
        arrows — orientation is the <em>only</em> difference, and it is exactly what the
        sign stores. It even demystifies the band width you have plotted since step 3:
        its magnitude is twice this triangle's area, and its sign is the triangle's
        orientation. The unit circle of step 6 keeps track of both; probabilities keep
        only the lengths.
      </p>
      <p>
        Any tilted diameter breaks that symmetry. Turn the dial to the contrast question
        and watch the twins split apart: P leans toward one end, P′ toward the other. At
        δ=90° they disagree as strongly as possible.
      </p>
      <Slider value={theta} min={5} max={175} step={1} onChange={setTheta}
        label="where P sits on the upper half (P′ mirrors it below)" readout={`state angle ${theta}°`} />
      <Slider value={delta} min={0} max={90} step={1} onChange={setDelta}
        label="which question you ask"
        readout={`δ=${delta}°${delta === 0 ? " — the coin flip" : delta === 90 ? " — the contrast question" : ""}`} />
      <MeasurePlot theta={theta} delta={delta} showMirror showOrientation />
      <ProbBars title="P — ANSWER ODDS" probs={[pPlus, 1 - pPlus]} labels={[`answers ${labP}`, `answers ${labM}`]} />
      <ProbBars title="P′ (MIRROR TWIN) — ANSWER ODDS" probs={[pPlusMirror, 1 - pPlusMirror]} labels={[`answers ${labP}`, `answers ${labM}`]} dim />
      <p style={{ marginTop: 14 }}>
        Three last rules complete the picture. <strong>Asking a tilted question is
        physically possible</strong>: rotate the whole system first, then flip — that is
        all an interferometer or a polarizer does. <strong>After answering, the state
        becomes its answer</strong>: it jumps to the endpoint it named, so repeating the
        same question repeats the same answer, while a fresh question meets fresh chance.
        (Note this jump is <em>not</em> the Bayesian learning of step 5 — a pure state
        has nothing left to learn about, yet it jumps anyway. That difference is where
        quantum truly begins.) And so <strong>no single question can reveal the whole of
        P</strong>: one
        diameter yields one number, but P is two numbers — you need two different
        questions to pin a state down.
      </p>
      <Notice>
        The lower half of the circle was never hidden from physics — only from one
        instrument, the coin flip, which happens to be blind to it by symmetry. Classical
        probability is simply the physics of owning only that one instrument. You have
        nearly built a qubit: its states are the Bernoulli circle (with the disk of mixed
        beliefs inside), and its measurements are the diameters. One dial is still
        hidden, though — and it is the final step.
      </Notice>
    </div>
  );
}

// ================= STEP 10 : THE COMPLEX DIAL — THE BLOCH SPHERE =================
function StepBloch() {
  const [thetaDeg, setThetaDeg] = useState(64);
  const [phiDeg, setPhiDeg] = useState(0);
  const th = (thetaDeg * Math.PI) / 180;
  const ph = (phiDeg * Math.PI) / 180;
  const p = Math.cos(th / 2) ** 2;
  const ab = Math.sin(th) / 2; // band-width magnitude = radius of the phase wheel
  // 3D layout = the table scene: X = p−½ (T left, H right), Y = band width pointing
  // AWAY from the viewer (P on the far half), Z = the new complex direction (up)
  const P3 = [p - 0.5, ab * Math.cos(ph), ab * Math.sin(ph)];
  const T3 = [p - 0.5, -ab * Math.cos(ph), -ab * Math.sin(ph)]; // the twin: far side of the wheel

  const psi = 0.55, eps = 0.5; // same camera as the hemisphere scene
  const W = 340, H = 340, cx = 170, cy = 172, S = 252;
  const px3 = ([X, Y, Z]) => {
    const sx = X * Math.cos(psi) + Y * Math.sin(psi);
    const u = -X * Math.sin(psi) + Y * Math.cos(psi);
    const sy = Z * Math.cos(eps) + u * Math.sin(eps);
    const d = u * Math.cos(eps) - Z * Math.sin(eps); // front iff d < 0
    return [cx + sx * S, cy - sy * S, d];
  };
  const circleSegs = (fn, n = 90) => {
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const v = fn((2 * Math.PI * i) / n);
      return { q: px3(v), v };
    });
    const front = [], back = [];
    for (let i = 0; i < n; i++) {
      const seg = { a: pts[i].q, b: pts[i + 1].q, mid: pts[i].v };
      ((pts[i].q[2] + pts[i + 1].q[2]) / 2 < 0 ? front : back).push(seg);
    }
    return { front, back };
  };
  const segLines = (segs, stroke, wdt, dash, opac = 1, colorFn = null) =>
    segs.map((s, i) => (
      <line key={i} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]}
        stroke={colorFn ? colorFn(s.mid) : stroke} strokeWidth={wdt}
        strokeDasharray={dash} strokeOpacity={opac} strokeLinecap="round" />
    ));

  // wireframe: Bernoulli circle in the table plane, the standing phase wheel,
  // two reference wheels along the axle, and two horizontal latitudes above/below
  const bern = circleSegs((s) => [0.5 * Math.cos(s), 0.5 * Math.sin(s), 0]);
  const bernColor = (v) => (v[1] >= 0 ? C.gold : C.red);
  const wheel = circleSegs((s) => [p - 0.5, ab * Math.cos(s), ab * Math.sin(s)]);
  const rw = Math.sqrt(3) / 4;
  const ringR = circleSegs((s) => [0.25, rw * Math.cos(s), rw * Math.sin(s)]);
  const ringL = circleSegs((s) => [-0.25, rw * Math.cos(s), rw * Math.sin(s)]);
  const latU = circleSegs((s) => [rw * Math.cos(s), rw * Math.sin(s), 0.25]);
  const latD = circleSegs((s) => [rw * Math.cos(s), rw * Math.sin(s), -0.25]);

  const [Ppx, Ppy] = px3(P3);
  const [Tpx, Tpy, Td] = px3(T3);
  const [Hx, Hy] = px3([0.5, 0, 0]);
  const [Tx, Ty] = px3([-0.5, 0, 0]);

  return (
    <div>
      <p>
        One dial is still hidden. In step 7 the extra information was a <em>sign</em> — a
        two-position switch, giving each state one mirror twin. Real quantum amplitudes
        carry more: the tails amplitude can be turned by <em>any</em> angle φ, like a
        clock hand. That is all "complex numbers" mean here: numbers that are little{" "}
        <strong>arrows</strong> rather than a bare + or −. The switch becomes a dial.
      </p>
      <p>
        The picture lays everything on a table first. Your Bernoulli circle lies flat,
        exactly as you know it — always&nbsp;T on the left, always&nbsp;H on the right,
        the state P on the far half, its mirror twin on the near half. Read the T–H
        diameter as an <strong>axle</strong> lying on the table. At each set of odds a{" "}
        <span style={{ color: C.teal }}>wheel</span> stands upright on that axle, and
        the dial φ spins the state around it: at φ=0° it rests at the far edge of the
        table (that is P), at φ=180° at the near edge (precisely the mirror twin of
        step 7) — and in between it swings <em>up above the table, or down below it</em>.
        One wheel for every p, and the circle inflates into a <strong>sphere</strong>:
        pure states on the glassy surface, mixed beliefs filling the ball, total
        ignorance at the center. Physicists draw the same object centered at zero with
        radius one and call it the <strong>Bloch sphere</strong>.
      </p>
      <Slider value={thetaDeg} min={0} max={180} step={1} onChange={setThetaDeg}
        label="θ — sets the odds (moves the wheel along the axle)" readout={`p=${p.toFixed(2)}`} />
      <Slider value={phiDeg} min={0} max={360} step={1} onChange={setPhiDeg}
        label="φ — the complex dial (spins the wheel up out of the table)" readout={`φ=${phiDeg}°`} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <defs>
          <radialGradient id="ballshade" cx="0.36" cy="0.3" r="0.95">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#EDF7FD" />
            <stop offset="80%" stopColor="#CFEAF9" />
            <stop offset="100%" stopColor="#AFD9F2" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={0.5 * S} fill="url(#ballshade)" stroke={C.gridBold} strokeWidth={1.5} />
        {/* back halves (dim, dashed) */}
        {segLines(latU.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(latD.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(ringR.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(ringL.back, C.gridBold, 1, "3 3", 0.65)}
        {segLines(bern.back, null, 1.6, "3 3", 0.5, bernColor)}
        {segLines(wheel.back, C.teal, 1.5, "3 3", 0.5)}
        {/* the axle on the table */}
        <line x1={Tx} y1={Ty} x2={Hx} y2={Hy} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="2 3" />
        {/* front halves */}
        {segLines(latU.front, C.gridBold, 1, null, 0.85)}
        {segLines(latD.front, C.gridBold, 1, null, 0.85)}
        {segLines(ringR.front, C.gridBold, 1, null, 0.85)}
        {segLines(ringL.front, C.gridBold, 1, null, 0.85)}
        {segLines(bern.front, null, 2.6, null, 1, bernColor)}
        {segLines(wheel.front, C.teal, 2.4, null, 1)}
        {/* poles of the axle */}
        <circle cx={Hx} cy={Hy} r={3.5} fill={C.ink} />
        <circle cx={Tx} cy={Ty} r={3.5} fill={C.ink} />
        <text x={Hx + 8} y={Hy + 4} fontFamily={mono} fontSize="10" fill={C.ink}>always H (p=1)</text>
        <text x={Tx - 8} y={Ty + 4} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.ink}>always T (p=0)</text>
        {/* the twin, hollow */}
        <circle cx={Tpx} cy={Tpy} r={5.5} fill="#fff" stroke={C.ink} strokeWidth={1.8} strokeOpacity={Td < 0.05 ? 1 : 0.5} fillOpacity={Td < 0.05 ? 1 : 0.6} />
        <text x={Tpx + 9} y={Tpy + 13} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.inkSoft} opacity={Td < 0.05 ? 1 : 0.55}>twin</text>
        {/* the state: always drawn solid — the glass sphere doesn't hide the star */}
        <line x1={cx} y1={cy} x2={Ppx} y2={Ppy} stroke={C.ink} strokeWidth={1.4} />
        <circle cx={Ppx} cy={Ppy} r={6.5} fill={C.gold} stroke={C.ink} strokeWidth={1.6} />
        <text x={Ppx + 10} y={Ppy - 8} fontFamily={mono} fontSize="12" fontWeight="600" fill={C.ink}>P</text>
        {/* legend */}
        <text x={8} y={H - 22} fontFamily={mono} fontSize="9.5" fill={C.gold}>gold/red: your Bernoulli circle, flat on the table (φ=0/180)</text>
        <text x={8} y={H - 9} fontFamily={mono} fontSize="9.5" fill={C.teal}>blue: the standing wheel of twins — same odds, different dial</text>
      </svg>
      <p style={{ marginTop: 14 }}>
        Questions are still diameters — there are just more of them now. The flip is the
        T–H axle itself; the contrast question of step 9 is the table's far–near
        diameter; and the dial φ picks among the <em>infinitely many</em> tilted
        contrast questions rising out of the table. Every state on the surface is still
        perfectly certain about exactly one diameter — the one that runs through it.
      </p>
      <Notice>
        Everything you built survives in 3D: answer odds are still squared distances to a
        diameter's ends, mixing still pulls inward, purity is still the distance from the
        center. One phenomenon is new: with three axes, certainty about one diameter
        forces 50/50 spread over every diameter perpendicular to it — no state can answer
        two independent questions sharply at once. That trade-off has a famous name:{" "}
        <strong>uncertainty</strong>. This ball, with its diameters, is the complete
        qubit — and you built it from a coin.
      </Notice>
    </div>
  );
}

// ================= BONUS 1 : HOW FAR APART ARE TWO COINS? =================
function StepDistance() {
  const [p1, setP1] = useState(0.5);
  const [p2, setP2] = useState(0.51);
  const clamp01 = (q) => Math.min(1, Math.max(0, q));
  const alph = (q) => Math.acos(Math.sqrt(clamp01(q))); // angle on the unit circle
  const naive = Math.abs(p1 - p2);
  const arc = Math.abs(alph(p1) - alph(p2)); // = arc length along the Bernoulli circle (radius 1/2, double angle)
  const W = 340, H = 252, S = 240, ox = 50, oy = 196;
  const toPx = (x, y) => [ox + x * S, oy - y * S];
  const phiB = (q) => Math.acos(Math.min(1, Math.max(-1, 2 * q - 1))); // central angle, 0..pi
  const onCircle = (phi) => [0.5 + 0.5 * Math.cos(phi), 0.5 * Math.sin(phi)];
  const f1 = phiB(p1), f2 = phiB(p2);
  const lo = Math.min(f1, f2), hi = Math.max(f1, f2);
  const arcPts = Array.from({ length: 41 }, (_, i) => toPx(...onCircle(lo + ((hi - lo) * i) / 40)).join(",")).join(" ");
  const [x1b, y1b] = toPx(p1, 0);
  const [x2b, y2b] = toPx(p2, 0);
  const [x1c, y1c] = toPx(...onCircle(f1));
  const [x2c, y2c] = toPx(...onCircle(f2));
  const semi = Array.from({ length: 61 }, (_, i) => toPx(...onCircle((Math.PI * i) / 60)).join(",")).join(" ");
  const presets = [
    { label: "middle pair: 0.50 vs 0.51", a: 0.5, b: 0.51 },
    { label: "edge pair: 0.00 vs 0.01", a: 0.0, b: 0.01 },
    { label: "fair vs always-H", a: 0.5, b: 1.0 },
  ];
  return (
    <div>
      <p>
        A question the tutorial has quietly earned: how <em>far apart</em> are two coins?
        The lazy answer is the gap on the ruler, |p₁&nbsp;−&nbsp;p₂|. Try to break it:
        a 0.50-coin and a 0.51-coin are almost impossible to tell apart — you would need
        thousands of flips. A 0.00-coin and a 0.01-coin? A <em>single head</em> settles
        it, because the first coin can never produce one. Same gap of 0.01 on the ruler,
        wildly different real separations. The flat ruler is wrong: near the ends it
        must stretch.
      </p>
      <p>
        The right ruler is one you already own. Lift both coins to the Bernoulli circle
        and walk <em>along the arc</em> between them. Near the middle, the circle runs
        flat and the arc barely exceeds the gap; near the ends it turns steeply upward,
        and a tiny gap in p becomes a long walk.
      </p>
      <Slider value={p1} min={0} max={1} step={0.01} onChange={setP1}
        label="first coin" readout={`p₁=${p1.toFixed(2)}`} />
      <Slider value={p2} min={0} max={1} step={0.01} onChange={setP2}
        label="second coin" readout={`p₂=${p2.toFixed(2)}`} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {presets.map((q) => (
          <button key={q.label} onClick={() => { setP1(q.a); setP2(q.b); }}
            style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 12, border: `1.5px solid ${C.gridBold}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
            {q.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <polyline points={semi} fill="none" stroke={C.gold} strokeWidth={1.6} strokeDasharray="5 4" />
        {/* the flat ruler */}
        <line x1={toPx(0, 0)[0]} y1={oy} x2={toPx(1, 0)[0]} y2={oy} stroke={C.ink} strokeWidth={2} />
        {[0, 0.5, 1].map((q) => (
          <g key={q}>
            <line x1={toPx(q, 0)[0]} y1={oy - 4} x2={toPx(q, 0)[0]} y2={oy + 4} stroke={C.ink} strokeWidth={1.4} />
            <text x={toPx(q, 0)[0]} y={oy + 18} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.inkSoft}>{q === 0.5 ? "½" : q}</text>
          </g>
        ))}
        {/* naive gap highlighted on the ruler */}
        <line x1={x1b} y1={oy} x2={x2b} y2={oy} stroke={C.red} strokeWidth={4} />
        {/* lifts */}
        <line x1={x1b} y1={y1b} x2={x1c} y2={y1c} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="3 3" />
        <line x1={x2b} y1={y2b} x2={x2c} y2={y2c} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="3 3" />
        {/* true distance: the arc */}
        <polyline points={arcPts} fill="none" stroke={C.teal} strokeWidth={4} strokeLinecap="round" />
        <circle cx={x1b} cy={y1b} r={4} fill={C.red} stroke={C.ink} strokeWidth={1} />
        <circle cx={x2b} cy={y2b} r={4} fill={C.red} stroke={C.ink} strokeWidth={1} />
        <circle cx={x1c} cy={y1c} r={5} fill={C.teal} stroke={C.ink} strokeWidth={1.4} />
        <circle cx={x2c} cy={y2c} r={5} fill={C.teal} stroke={C.ink} strokeWidth={1.4} />
        <text x={8} y={16} fontFamily={mono} fontSize="10" fill={C.inkSoft}>lift, then walk the arc</text>
      </svg>
      <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, fontFamily: mono, fontSize: 13, display: "flex", gap: 18, flexWrap: "wrap" }}>
        <span style={{ color: C.red }}>flat-ruler gap = {naive.toFixed(3)}</span>
        <span style={{ color: C.teal }}>circle distance = {arc.toFixed(3)}</span>
        <span style={{ color: C.inkSoft }}>ratio ×{naive > 0 ? (arc / naive).toFixed(1) : "—"}</span>
      </div>
      <Notice>
        Try the two preset pairs: identical flat gaps, a tenfold difference in circle
        distance — and the circle is the honest one, because it predicts how many flips
        you actually need to tell the coins apart. This arc has a classical name: the{" "}
        <strong>Bhattacharyya angle</strong> between the two distributions (its
        straight-line chord is the Hellinger distance). The moral: distances between
        coins are not measured through the interval, but along the Bernoulli circle —
        the circle isn't decoration, it is the <em>ruler</em>. The next step cashes this
        claim in flips: you'll race the two duels and count.
      </Notice>
    </div>
  );
}

// ============ BONUS 1½ : APPENDIX — COUNTING THE FLIPS (SPRT RACE) ============
const LN19 = Math.log(19); // sequential-test walls for 5% error either way

// log-likelihood increment of one flip; positive evidence favours coin 2
function llrStep(outcome, c1, c2) {
  const l1 = outcome === 1 ? c1 : 1 - c1;
  const l2 = outcome === 1 ? c2 : 1 - c2;
  if (l1 === 0 && l2 === 0) return 0;
  if (l1 === 0) return Infinity;
  if (l2 === 0) return -Infinity;
  return Math.log(l2 / l1);
}

function EvidenceMeter({ llr, c1, c2, done, verdict }) {
  const t = Math.max(-1, Math.min(1, llr / LN19));
  const pct = 50 + 50 * t;
  return (
    <div style={{ margin: "8px 0 2px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10, color: C.inkSoft, marginBottom: 3 }}>
        <span style={{ color: C.teal, fontWeight: done && verdict === "c1" ? 700 : 400 }}>
          ← it's the {c1.toFixed(2)}-coin
        </span>
        <span>evidence</span>
        <span style={{ color: C.gold, fontWeight: done && verdict === "c2" ? 700 : 400 }}>
          it's the {c2.toFixed(2)}-coin →
        </span>
      </div>
      <div style={{ position: "relative", height: 18, background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 9 }}>
        <div style={{ position: "absolute", left: "50%", top: 2, bottom: 2, width: 1, background: C.gridBold }} />
        <div style={{ position: "absolute", left: 3, top: 2, bottom: 2, width: 3, borderRadius: 2, background: C.teal }} />
        <div style={{ position: "absolute", right: 3, top: 2, bottom: 2, width: 3, borderRadius: 2, background: C.gold }} />
        <div
          style={{
            position: "absolute", top: -3, bottom: -3, width: 4, borderRadius: 2,
            left: `calc(${pct}% - 2px)`,
            background: done ? (verdict === "c2" ? C.gold : C.teal) : C.ink,
            transition: "left .06s linear",
          }}
        />
      </div>
    </div>
  );
}

function StepFlipCount() {
  const mkLane = (name, c1, c2, theory) => ({
    name, c1, c2, theory,
    truth: Math.random() < 0.5 ? "c1" : "c2",
    flips: 0, llr: 0, hist: [], done: false, verdict: null,
  });
  const freshLanes = () => [
    mkLane("duel A — the middle pair", 0.5, 0.6, "≈ 140 flips"),
    mkLane("duel B — the edge pair", 0.0, 0.1, "≈ 20 flips"),
  ];
  const [lanes, setLanes] = useState(freshLanes);
  const [running, setRunning] = useState(false);
  const [tally, setTally] = useState({ races: 0, a: 0, b: 0 });
  const tallied = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLanes((ls) =>
        ls.map((L) => {
          if (L.done) return L;
          let { flips, llr } = L;
          const hist = [...L.hist];
          // one flip per tick while the drama lasts, then fast-forward
          const batch = flips < 30 ? 1 : 6;
          let done = false, verdict = null;
          for (let k = 0; k < batch && !done; k++) {
            const p = L.truth === "c1" ? L.c1 : L.c2;
            const x = flipOne(p);
            const d = llrStep(x, L.c1, L.c2);
            llr = d === Infinity ? LN19 : d === -Infinity ? -LN19 : llr + d;
            flips += 1;
            hist.push(x);
            if (llr >= LN19) { done = true; verdict = "c2"; llr = LN19; }
            else if (llr <= -LN19) { done = true; verdict = "c1"; llr = -LN19; }
            else if (flips >= 900) { done = true; verdict = llr >= 0 ? "c2" : "c1"; }
          }
          return { ...L, flips, llr, hist: hist.slice(-14), done, verdict };
        })
      );
    }, 60);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && lanes.every((l) => l.done) && !tallied.current) {
      tallied.current = true;
      setRunning(false);
      setTally((t) => ({ races: t.races + 1, a: t.a + lanes[0].flips, b: t.b + lanes[1].flips }));
    }
  }, [lanes, running]);

  const start = () => { tallied.current = false; setLanes(freshLanes()); setRunning(true); };
  const avgA = tally.races ? tally.a / tally.races : null;
  const avgB = tally.races ? tally.b / tally.races : null;
  const alph = (q) => Math.acos(Math.sqrt(Math.min(1, Math.max(0, q))));
  const dthA = Math.abs(alph(0.5) - alph(0.6));
  const dthB = Math.abs(alph(0.0) - alph(0.1));

  return (
    <div>
      <p>
        Bonus&nbsp;1 made a promise it hasn't paid: the circle, it claimed, predicts{" "}
        <em>how many flips</em> you need to tell two coins apart. Let's collect. Take two
        duels with the <strong>same flat-ruler gap of 0.10</strong>: duel&nbsp;A pits a
        0.50-coin against a 0.60-coin; duel&nbsp;B pits a 0.00-coin against a 0.10-coin.
        In each duel one of the two coins is secretly chosen and handed to you. You flip
        it and run the honest referee — Wald's <em>sequential test</em>: every flip adds
        its evidence, and the moment the total crosses a wall (set here for 5% error),
        the verdict is called. Watch which duel finishes first.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <Btn onClick={start} disabled={running}>{tally.races ? "race again" : "start the race"}</Btn>
        <Btn kind="outline" onClick={() => { setRunning(false); tallied.current = false; setLanes(freshLanes()); setTally({ races: 0, a: 0, b: 0 }); }}>
          reset
        </Btn>
      </div>
      {lanes.map((L, i) => (
        <div key={i} style={{ padding: "10px 12px", background: "#fff", border: `1.5px solid ${L.done ? (L.verdict === "c2" ? C.gold : C.teal) : C.gridBold}`, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 11, color: C.inkSoft }}>
            <span style={{ letterSpacing: 1 }}>{L.name.toUpperCase()} · {L.c1.toFixed(2)} vs {L.c2.toFixed(2)}</span>
            <span>theory: {L.theory}</span>
          </div>
          <EvidenceMeter llr={L.llr} c1={L.c1} c2={L.c2} done={L.done} verdict={L.verdict} />
          <div style={{ minHeight: 26, marginTop: 4 }}>
            {L.hist.map((v, j) => <CoinChip key={j + "-" + L.flips} v={v} />)}
          </div>
          <div style={{ fontFamily: mono, fontSize: 12, marginTop: 2 }}>
            flips: <strong>{L.flips}</strong>
            {L.done && (
              <span>
                {" — verdict: "}
                <span style={{ color: L.verdict === "c2" ? C.gold : C.teal, fontWeight: 600 }}>
                  the {(L.verdict === "c2" ? L.c2 : L.c1).toFixed(2)}-coin
                </span>
                {" · truth: "}{(L.truth === "c2" ? L.c2 : L.c1).toFixed(2)}
                {" "}{L.verdict === L.truth ? "✓" : "✗ (the 5% at work)"}
              </span>
            )}
          </div>
        </div>
      ))}
      {tally.races > 0 && (
        <div style={{ padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, fontFamily: mono, fontSize: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>races: {tally.races}</span>
          <span>avg A: {avgA.toFixed(0)} flips</span>
          <span>avg B: {avgB.toFixed(0)} flips</span>
          <span style={{ color: C.ink, fontWeight: 600 }}>observed ratio ≈ ×{(avgA / avgB).toFixed(1)}</span>
        </div>
      )}
      <p style={{ marginTop: 16 }}>
        Now the mathematics, in three moves. <strong>Move 1 — duel A by hand.</strong>{" "}
        After n flips the head-fraction wobbles around the true p with spread
        √(p(1−p)/n) ≈ 0.5/√n. Put the decision threshold midway at 0.55 and demand at
        most 5% error either way: you need the wobble to shrink below the half-gap,
        0.05&nbsp;≳&nbsp;1.645&nbsp;·&nbsp;0.5/√n, i.e. <strong>n ≈ 270 flips</strong>{" "}
        for a fixed-length test (the sequential referee above is thriftier — about 145 on
        average — but same order). <strong>Move 2 — duel B by hand.</strong> The
        0.00-coin cannot produce a head, so a single H ends the game. The only possible
        mistake is crowning the 0.00-coin while the 0.10-coin sulks through all tails,
        probability 0.9ⁿ; demanding 0.9ⁿ&nbsp;≤&nbsp;0.05 gives{" "}
        <strong>n ≈ 29 flips</strong>, worst case. Same gap on the flat ruler — a factor
        of ten in flips.
      </p>
      <p>
        <strong>Move 3 — one law behind both.</strong> For the best possible test, the
        error after n flips shrinks like the n-th power of the <em>overlap</em> between
        the two coins, the Bhattacharyya coefficient. And when you lift each coin to its
        angle θ&nbsp;=&nbsp;arccos&nbsp;√p on the circle, that overlap is nothing but a
        dot product of two unit vectors:
      </p>
      <Formula>
        √(p₁p₂) + √((1−p₁)(1−p₂)) = cos θ₁ cos θ₂ + sin θ₁ sin θ₂ = cos(θ₁ − θ₂)
      </Formula>
      <p>
        The overlap of two coins is the <em>cosine of the arc between them</em>. Errors
        shrink like cosⁿ(Δθ), so the flip budget for confidence ε is
      </p>
      <Formula>
        n ≈ ln(1/ε) / (−ln cos Δθ) ≈ 2 ln(1/ε) / (Δθ)²
      </Formula>
      <p>
        Flips ∝ 1/(arc length)². The ruler that counts flips is the arc — nothing about
        |p₁−p₂| appears. Check it against the race: duel A spans
        Δθ&nbsp;=&nbsp;{dthA.toFixed(3)}, duel B spans Δθ&nbsp;=&nbsp;{dthB.toFixed(3)},
        so the circle predicts a flip ratio of ({dthB.toFixed(3)}/{dthA.toFixed(3)})²
        ≈&nbsp;×{((dthB / dthA) ** 2).toFixed(1)}
        {tally.races > 0 && avgB > 0 && (
          <span>
            {" "}— and your own races above clocked ×{(avgA / avgB).toFixed(1)} (the
            sequential referee trims each duel a little differently, but the order of
            magnitude belongs to the arc)
          </span>
        )}
        . The flat ruler predicted ×1.0.
      </p>
      <Notice>
        Why is the arc not just <em>a</em> good ruler but <em>the</em> ruler? Three
        escalating reasons. <strong>Local:</strong> the distinguishing power of one flip
        is the Fisher information 1/(p(1−p)), which explodes at the edges — exactly the
        flat ruler's crime. Ask for the coordinate in which one flip buys the same
        progress everywhere and you are forced to θ&nbsp;=&nbsp;arccos&nbsp;√p
        (statisticians met it long ago as the arcsine variance-stabilizing
        transformation). <strong>Global:</strong> over any finite separation the
        operational cost is cos(Δθ) — equal arcs cost equal flips, wherever they sit on
        the circle. <strong>Unique:</strong> Čencov's theorem: any honest distance may
        only shrink when you post-process your data, and the Fisher metric — this arc —
        is the <em>only</em> Riemannian ruler (up to scale) with that property. And keep
        the cosine in your pocket: in the quantum half of the tutorial it returns as the
        overlap ⟨ψ|φ⟩, the arc becomes the Bures angle of Bonus&nbsp;2, and
        cos²(π/4)&nbsp;=&nbsp;½ is the pass-probability of Bonus&nbsp;3.
      </Notice>
    </div>
  );
}

// ================= BONUS 2 : THE BERNOULLI HEMISPHERE =================
function StepBures() {
  const [spin, setSpin] = useState(0);
  const [raise, setRaise] = useState(0);
  const psi = 0.55 + (spin * Math.PI) / 180;
  const eps = 0.5;
  const W = 340, H = 330, cx = 170, cy = 190, S = 250;
  // 3D layout = the flat picture laid on a table: x = p−½ (T left, H right),
  // y = w pointing AWAY from the viewer (coin half at the back), z = raised height
  const px3 = ([X, Y, Z]) => {
    const sx = X * Math.cos(psi) + Y * Math.sin(psi);
    const u = -X * Math.sin(psi) + Y * Math.cos(psi);
    const sy = Z * Math.cos(eps) + u * Math.sin(eps);
    const d = u * Math.cos(eps) - Z * Math.sin(eps);
    return [cx + sx * S, cy - sy * S, d];
  };
  const hgt = (t) => raise * Math.sqrt(Math.max(0, 0.25 - t * t));
  const circleSegs3 = (fn, n = 90) => {
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const v = fn((2 * Math.PI * i) / n);
      return { q: px3(v), v };
    });
    const front = [], back = [];
    for (let i = 0; i < n; i++) {
      const seg = { a: pts[i].q, b: pts[i + 1].q, mid: pts[i].v };
      ((pts[i].q[2] + pts[i + 1].q[2]) / 2 < 0 ? front : back).push(seg);
    }
    return { front, back };
  };
  const segs = (s, stroke, wd, dash, op = 1, colorFn = null) =>
    s.map((g, i) => (
      <line key={i} x1={g.a[0]} y1={g.a[1]} x2={g.b[0]} y2={g.b[1]}
        stroke={colorFn ? colorFn(g.mid) : stroke} strokeWidth={wd} strokeDasharray={dash} strokeOpacity={op} strokeLinecap="round" />
    ));
  const path3 = (fn, n = 60) =>
    Array.from({ length: n + 1 }, (_, i) => px3(fn(i / n)).slice(0, 2).join(",")).join(" ");
  const len3 = (fn, n = 200) => {
    let L = 0, prev = fn(0);
    for (let i = 1; i <= n; i++) {
      const v = fn(i / n);
      L += Math.hypot(v[0] - prev[0], v[1] - prev[1], v[2] - prev[2]);
      prev = v;
    }
    return L;
  };
  // floor tints: coin half (w>0, back) and anti-coin half (w<0, front)
  const halfPoly = (s0, s1) => {
    const pts = Array.from({ length: 41 }, (_, i) =>
      px3([0.5 * Math.cos(s0 + ((s1 - s0) * i) / 40), 0.5 * Math.sin(s0 + ((s1 - s0) * i) / 40), 0]).slice(0, 2).join(",")
    );
    return pts.join(" ");
  };
  // rim and rising rings (purity circles of the flat disk lifting into latitudes)
  const rim = circleSegs3((s) => [0.5 * Math.cos(s), 0.5 * Math.sin(s), 0]);
  const rimColor = (v) => (v[1] >= 0 ? C.gold : C.red);
  const rings = [0.45, 0.38, 0.28, 0.15].map((t) =>
    circleSegs3((s) => [t * Math.cos(s), t * Math.sin(s), hgt(t)])
  );
  // the two routes: flat chords that inflate into geodesics as the bowl rises
  const routeFair = (u) => [0, 0.5 * Math.cos((u * Math.PI) / 2), raise * 0.5 * Math.sin((u * Math.PI) / 2)];
  const routeHT = (u) => [0.5 * Math.cos(u * Math.PI), 0, raise * 0.5 * Math.sin(u * Math.PI)];
  const dFair = len3(routeFair), dHT = len3(routeHT);
  const [fx, fy] = px3([0, 0.5, 0]);
  const [mx, my] = px3([0, 0, raise * 0.5]);
  const [c0x, c0y] = px3([0, 0, 0]);
  const [hx, hy] = px3([0.5, 0, 0]);
  const [tx, ty] = px3([-0.5, 0, 0]);
  const coinLab = px3([0, 0.27, 0]);
  const antiLab = px3([0, -0.27, 0]);
  return (
    <div>
      <p>
        One distance is still missing — the one the tutorial opened with. The fair coin
        and the mystery deterministic coin give the same odds, yet they are different
        beliefs: one on the rim, one at the center of the disk. So we need distances{" "}
        <em>inside</em> the disk — and the flat disk fails for the same reason the flat
        interval did. On its rim it must reproduce the arcs of the previous step, which
        a flat sheet's straight lines cannot; and near the rim, tiny steps are once
        again statistically enormous.
      </p>
      <p>
        The cure is the same as before — and here is exactly <em>why</em> it produces a
        hemisphere. Take any point in the disk and draw the diameter through it and the
        center. That diameter runs from rim to rim, so it has <strong>length 1</strong>:
        it is a fresh copy of the interval [0,&nbsp;1], and your point sits on it at some
        position λ. But a diameter is a <em>measurement</em> (step 8), and the states
        along it are the mixtures of its two endpoint states — a Bernoulli family in λ
        (λ is even the probability of that measurement's ⊕ answer). The previous step
        told us what to do with a Bernoulli family: lift it by{" "}
        <strong>√(λ(1−λ))</strong>. Now do that to <em>every</em> diameter at once. Each
        one bends into its own Bernoulli semicircle; they all agree wherever they cross
        and share one summit above the center (each has λ&nbsp;=&nbsp;½ there); and
        together they assemble into the <strong>Bernoulli hemisphere</strong> — the
        previous step's cure applied to every direction of the disk simultaneously. On
        this bowl, distance means the geodesic: the shortest walk along the surface. (Its
        official name: the <strong>Bures distance</strong>.)
      </p>
      <p>
        Below, your Bernoulli disk lies flat in space, exactly as you know it —
        always&nbsp;T on the left, always&nbsp;H on the right, the gold coin-half toward
        the back, the red anti-coin-half toward the front, the purity circles drawn
        around the mystery coin at the center. Pull the <em>raise</em> slider and watch
        the construction happen: the teal T–H route <em>is</em> the base diameter
        bending into its Bernoulli semicircle, the purity circles rise into latitude
        rings, and the mystery coin climbs to the shared summit. The flat straight
        routes inflate into arcs, and their lengths grow into the true statistical
        distances.
      </p>
      <Slider value={raise} min={0} max={1} step={0.01} onChange={setRaise}
        label="raise the hemisphere out of the disk" readout={raise === 0 ? "flat disk" : raise === 1 ? "full hemisphere" : `${(raise * 100).toFixed(0)}%`} />
      <Slider value={spin} min={0} max={360} step={1} onChange={setSpin}
        label="spin (rotate the measurement basis)" readout={`${spin}° — every length stays put`} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        {/* floor tints, exactly the familiar disk */}
        <polygon points={halfPoly(0, Math.PI)} fill={C.goldSoft} fillOpacity={0.55} />
        <polygon points={halfPoly(Math.PI, 2 * Math.PI)} fill={C.redSoft} fillOpacity={0.5} />
        <text x={coinLab[0]} y={coinLab[1]} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.gold} opacity={0.9}>coins</text>
        <text x={antiLab[0]} y={antiLab[1]} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.red} opacity={0.9}>anti-coins</text>
        {/* classical base T—H on the floor */}
        <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={C.ink} strokeWidth={1.2} />
        {/* back parts of rim and rings */}
        {segs(rim.back, null, 1.8, "3 3", 0.55, rimColor)}
        {rings.map((r, i) => <g key={"rb" + i}>{segs(r.back, C.gridBold, 1, "3 3", 0.75)}</g>)}
        {/* the raised mystery coin's drop line back to the disk center */}
        {raise > 0.02 && <line x1={c0x} y1={c0y} x2={mx} y2={my} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="2 3" />}
        {/* front parts */}
        {rings.map((r, i) => <g key={"rf" + i}>{segs(r.front, C.gridBold, 1, null, 0.95)}</g>)}
        {segs(rim.front, null, 2.6, null, 1, rimColor)}
        {/* routes */}
        <polyline points={path3(routeHT)} fill="none" stroke={C.teal} strokeWidth={2.6} strokeLinecap="round" />
        <polyline points={path3(routeFair)} fill="none" stroke={C.gold} strokeWidth={3.2} strokeLinecap="round" />
        {/* landmarks */}
        <circle cx={hx} cy={hy} r={3.5} fill={C.ink} />
        <circle cx={tx} cy={ty} r={3.5} fill={C.ink} />
        <text x={hx + 7} y={hy + 4} fontFamily={mono} fontSize="10" fill={C.ink}>always H</text>
        <text x={tx - 7} y={ty + 4} textAnchor="end" fontFamily={mono} fontSize="10" fill={C.ink}>always T</text>
        <circle cx={fx} cy={fy} r={6} fill={C.gold} stroke={C.ink} strokeWidth={1.6} />
        <text x={fx} y={fy - 10} textAnchor="middle" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>fair coin</text>
        <circle cx={mx} cy={my} r={6} fill={C.ink} stroke="#fff" strokeWidth={2} />
        <text x={mx + 10} y={my - 6} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>mystery coin</text>
      </svg>
      <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, fontFamily: mono, fontSize: 13, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span style={{ color: C.gold }}>fair ↔ mystery route = {dFair.toFixed(3)}{raise === 1 ? " = π/4" : ""}</span>
        <span style={{ color: C.teal }}>H ↔ T route = {dHT.toFixed(3)}{raise === 1 ? " = π/2" : ""}</span>
      </div>
      <Notice>
        The punchline the whole tutorial was owed: fully raised, the fair coin and the
        mystery deterministic coin — indistinguishable by their odds — sit a crisp{" "}
        <strong>π/4 ≈ 0.785</strong> apart, while the flat disk would have claimed ½.
        Notice too that the shortest road from certain-heads to certain-tails now runs{" "}
        <em>over the summit</em>: through total ignorance. And spin the bowl: rotating
        the measurement basis turns everything rigidly, so every distance stays exactly
        the same — you have measured how different two beliefs are <em>without choosing
        any measurement at all</em>. That basis-independence is the great clue that
        these distances belong to the beliefs themselves. (One guard-rail: this bowl is
        the flat disk <em>bent into the right ruler</em> — its height is an aid for
        measuring, not the complex dial of step 10.)
      </Notice>
    </div>
  );
}

// ================= BONUS 3 : CASHING IN THE DISTANCE =================
function StepOverlap() {
  const CANDS = [
    { label: "the fair coin itself", pt: [0.5, 0.5] },
    { label: "the mystery coin", pt: [0.5, 0] },
    { label: "always-H", pt: [1, 0] },
    { label: "the anti-coin", pt: [0.5, -0.5] },
  ];
  const [sel, setSel] = useState(1);
  const [trials, setTrials] = useState([]);
  const cand = CANDS[sel];
  const wv = cand.pt[1];
  const P = 0.5 + wv;                    // pass probability of the fair-coin test
  const F = Math.sqrt(Math.max(0, P));   // overlap / fidelity with the fair coin
  const D = Math.acos(Math.min(1, F));   // Bures distance to the fair coin
  const Dlabel = Math.abs(D) < 1e-9 ? "0" : Math.abs(D - Math.PI / 4) < 1e-9 ? "π/4" : Math.abs(D - Math.PI / 2) < 1e-9 ? "π/2" : D.toFixed(3);

  // ---------- visual 1: the hemisphere with the embedded triangle ----------
  // table coords as in the previous step: x = p−½ (T left, H right), y = w away
  // from the viewer, z = the bowl height
  const uu = cand.pt[0] - 0.5, vv = cand.pt[1];
  const hh = Math.sqrt(Math.max(0, 0.25 - uu * uu - vv * vv));
  const Q = [uu, vv, hh];                 // the lifted candidate
  const FAIR = [0, 0.5, 0], ANTI = [0, -0.5, 0];
  const psi = 0.55, eps = 0.5;
  const W = 340, HH = 320, cx = 170, cy = 182, S = 250;
  const px3 = ([X, Y, Z]) => {
    const sx = X * Math.cos(psi) + Y * Math.sin(psi);
    const u = -X * Math.sin(psi) + Y * Math.cos(psi);
    const sy = Z * Math.cos(eps) + u * Math.sin(eps);
    const d = u * Math.cos(eps) - Z * Math.sin(eps);
    return [cx + sx * S, cy - sy * S, d];
  };
  const circleSegs3 = (fn, n = 90) => {
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const v = fn((2 * Math.PI * i) / n);
      return { q: px3(v), v };
    });
    const front = [], back = [];
    for (let i = 0; i < n; i++) {
      const seg = { a: pts[i].q, b: pts[i + 1].q, mid: pts[i].v };
      ((pts[i].q[2] + pts[i + 1].q[2]) / 2 < 0 ? front : back).push(seg);
    }
    return { front, back };
  };
  const segs = (s, stroke, wd, dash, op = 1, colorFn = null) =>
    s.map((g, i) => (
      <line key={i} x1={g.a[0]} y1={g.a[1]} x2={g.b[0]} y2={g.b[1]}
        stroke={colorFn ? colorFn(g.mid) : stroke} strokeWidth={wd} strokeDasharray={dash} strokeOpacity={op} strokeLinecap="round" />
    ));
  const halfPoly = (s0, s1) =>
    Array.from({ length: 41 }, (_, i) =>
      px3([0.5 * Math.cos(s0 + ((s1 - s0) * i) / 40), 0.5 * Math.sin(s0 + ((s1 - s0) * i) / 40), 0]).slice(0, 2).join(",")
    ).join(" ");
  const rim = circleSegs3((s) => [0.5 * Math.cos(s), 0.5 * Math.sin(s), 0]);
  const rimColor = (v) => (v[1] >= 0 ? C.gold : C.red);
  const rings = [0.45, 0.35, 0.2].map((t) =>
    circleSegs3((s) => [t * Math.cos(s), t * Math.sin(s), Math.sqrt(0.25 - t * t)])
  );
  // geodesic from Q to the fair coin (slerp on the radius-1/2 sphere; antipodes go via the summit)
  const slerp = (A, B, n = 30) => {
    const na = A.map((x) => x * 2), nb = B.map((x) => x * 2);
    const dot = Math.max(-1, Math.min(1, na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2]));
    const Om = Math.acos(dot);
    if (Om < 0.02) return [];
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const c1 = Math.sin((1 - t) * Om) / Math.sin(Om), c2 = Math.sin(t * Om) / Math.sin(Om);
      return [0.5 * (c1 * na[0] + c2 * nb[0]), 0.5 * (c1 * na[1] + c2 * nb[1]), 0.5 * (c1 * na[2] + c2 * nb[2])];
    });
  };
  const dotQF = 4 * (Q[0] * FAIR[0] + Q[1] * FAIR[1] + Q[2] * FAIR[2]);
  const geoPts = (dotQF < -0.999
    ? [...slerp(Q, [0, 0, 0.5]), ...slerp([0, 0, 0.5], FAIR)]
    : slerp(Q, FAIR)
  ).map((v) => px3(v).slice(0, 2).join(",")).join(" ");
  // right-angle marker at Q (in the plane of the two chords)
  const norm3 = (v) => { const L = Math.hypot(...v); return v.map((x) => x / L); };
  const showRA = P > 0.02 && P < 0.98;
  let raPts = null;
  if (showRA) {
    const d1 = norm3([ANTI[0] - Q[0], ANTI[1] - Q[1], ANTI[2] - Q[2]]);
    const d2 = norm3([FAIR[0] - Q[0], FAIR[1] - Q[1], FAIR[2] - Q[2]]);
    const s = 0.05;
    const A1 = px3([Q[0] + s * d1[0], Q[1] + s * d1[1], Q[2] + s * d1[2]]);
    const A2 = px3([Q[0] + s * (d1[0] + d2[0]), Q[1] + s * (d1[1] + d2[1]), Q[2] + s * (d1[2] + d2[2])]);
    const A3 = px3([Q[0] + s * d2[0], Q[1] + s * d2[1], Q[2] + s * d2[2]]);
    raPts = `${A1.slice(0, 2).join(",")} ${A2.slice(0, 2).join(",")} ${A3.slice(0, 2).join(",")}`;
  }
  const [Qx, Qy] = px3(Q);
  const [Fx, Fy] = px3(FAIR);
  const [Ax, Ay] = px3(ANTI);
  const [Cx0, Cy0] = px3([0, 0, 0]);

  // ---------- visual 2: the flattened Thales figure ----------
  const TW = 340, THh = 196, tox = 45, toy = 162, Lb = 250;
  const apx = tox + P * Lb, apy = toy - Math.sqrt(Math.max(0, P * (1 - P))) * Lb;
  const thales = Array.from({ length: 61 }, (_, i) => {
    const g = (Math.PI * i) / 60;
    return `${tox + Lb / 2 + (Lb / 2) * Math.cos(g)},${toy - (Lb / 2) * Math.sin(g)}`;
  }).join(" ");
  const angArc = D > 0.05
    ? Array.from({ length: 25 }, (_, i) => {
        const g = (D * i) / 24;
        return `${tox + 30 * Math.cos(g)},${toy - 30 * Math.sin(g)}`;
      }).join(" ")
    : null;

  return (
    <div>
      <p>
        We measured that the fair coin and the mystery coin sit <strong>π/4</strong>{" "}
        apart on the bowl. Time to cash that number in as a probability. Build a tester
        for the question <em>"are you the fair coin?"</em> — and notice it is nothing
        new: it is exactly the contrast question of step 9, the coin/anti-coin diameter.
        Answering "coin" counts as passing. In fact this tester simply <em>reads the
        band width</em>: its pass rate is ½&nbsp;+&nbsp;w.
      </p>
      <p>Feed it a candidate and run it:</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {CANDS.map((c, i) => (
          <button key={i} onClick={() => { setSel(i); setTrials([]); }}
            style={{ fontFamily: mono, fontSize: 11, padding: "5px 10px", borderRadius: 12, border: `1.5px solid ${i === sel ? C.gold : C.gridBold}`, background: i === sel ? C.goldSoft : "#fff", color: C.ink, cursor: "pointer" }}>
            {c.label}
          </button>
        ))}
      </div>
      <p>
        Everything happens on the bowl. The test diameter — anti-coin to fair coin,
        length 1 — lies across the floor. The candidate sits at its <em>lifted</em>{" "}
        position (pure candidates already live on the rim; the mystery coin is the one
        the bowl truly lifts, to the summit). Now connect the candidate to the two ends
        of the test diameter: by Thales the two chords meet at a{" "}
        <strong>right angle</strong> — and their squares are <em>exactly</em> the answer
        odds, mixed states included. That is the bowl's second gift: inside the flat
        disk, step 8's chord rule broke for mixed beliefs; lifted onto the bowl, it is
        exact again. The gold arc is the geodesic to the fair coin: the Bures distance.
      </p>
      <svg viewBox={`0 0 ${W} ${HH}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <polygon points={halfPoly(0, Math.PI)} fill={C.goldSoft} fillOpacity={0.5} />
        <polygon points={halfPoly(Math.PI, 2 * Math.PI)} fill={C.redSoft} fillOpacity={0.45} />
        {segs(rim.back, null, 1.6, "3 3", 0.5, rimColor)}
        {rings.map((r, i) => <g key={"rb" + i}>{segs(r.back, C.gridBold, 1, "3 3", 0.7)}</g>)}
        {/* the test diameter across the floor = the hypotenuse, length 1 */}
        <line x1={Ax} y1={Ay} x2={Fx} y2={Fy} stroke={C.ink} strokeWidth={2} />
        {rings.map((r, i) => <g key={"rf" + i}>{segs(r.front, C.gridBold, 1, null, 0.9)}</g>)}
        {segs(rim.front, null, 2.4, null, 1, rimColor)}
        {/* geodesic = the Bures distance */}
        {geoPts && <polyline points={geoPts} fill="none" stroke={C.gold} strokeWidth={3} strokeLinecap="round" />}
        {/* the two chords of the triangle */}
        {P > 0.001 && <line x1={Ax} y1={Ay} x2={Qx} y2={Qy} stroke={C.ink} strokeWidth={3.2} strokeLinecap="round" />}
        {P < 0.999 && <line x1={Fx} y1={Fy} x2={Qx} y2={Qy} stroke={C.red} strokeWidth={1.8} strokeDasharray="4 3" />}
        {raPts && <polyline points={raPts} fill="none" stroke={C.ink} strokeWidth={1} />}
        {/* drop line when the candidate is genuinely lifted */}
        {hh > 0.02 && <line x1={Cx0} y1={Cy0} x2={Qx} y2={Qy} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="2 3" />}
        {/* landmarks */}
        <circle cx={Fx} cy={Fy} r={5} fill={C.gold} stroke={C.ink} strokeWidth={1.4} />
        <text x={Fx} y={Fy - 9} textAnchor="middle" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>fair coin</text>
        <circle cx={Ax} cy={Ay} r={5} fill={C.red} stroke={C.ink} strokeWidth={1.4} />
        <text x={Ax} y={Ay + 16} textAnchor="middle" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>anti-coin</text>
        <circle cx={Qx} cy={Qy} r={6.5} fill={C.ink} stroke="#fff" strokeWidth={2} />
        <text x={Qx + 10} y={Qy - 7} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>candidate</text>
        <text x={8} y={HH - 22} fontFamily={mono} fontSize="9.5" fill={C.ink}>solid chord² = P(pass) · dashed chord² = P(fail)</text>
        <text x={8} y={HH - 9} fontFamily={mono} fontSize="9.5" fill={C.gold}>gold arc: Bures distance = {Dlabel}</text>
      </svg>
      <div style={{ margin: "10px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Btn onClick={() => setTrials(Array.from({ length: 20 }, () => (Math.random() < P ? 1 : 0)))}>
          Run the test ×20
        </Btn>
        <span style={{ minHeight: 26 }}>
          {trials.map((v, j) => (
            <span key={j} style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: v ? C.teal : C.red, marginRight: 2 }}>
              {v ? "✓" : "✗"}
            </span>
          ))}
          {trials.length > 0 && (
            <span style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, marginLeft: 6 }}>
              passed {trials.filter(Boolean).length}/20
            </span>
          )}
        </span>
      </div>
      <ProbBars title='THE TESTER — "ARE YOU THE FAIR COIN?"' probs={[P, 1 - P]} labels={["pass (answers coin)", "fail (answers anti-coin)"]} />
      <p style={{ marginTop: 14 }}>
        Now relate the pass rate to the distance:
      </p>
      <Formula>P(pass) = cos²(distance)&nbsp;&nbsp;&nbsp;&nbsp;distance = arccos(√P(pass))</Formula>
      <p>
        Check it on the mystery coin: it passes half the time, so √P&nbsp;=&nbsp;1/√2,
        and arccos(1/√2)&nbsp;=&nbsp;<strong>π/4</strong> — exactly its Bures distance.
        And to see why, simply <em>flatten the triangle's plane onto the page</em>. What
        appears is step 6's drawing reborn: the test diameter as the base, the candidate
        on the Thales semicircle above it, legs √P(pass) and √P(fail) — and the
        inscribed angle at the anti-coin corner is the distance itself.
      </p>
      <svg viewBox={`0 0 ${TW} ${THh}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
        <polyline points={thales} fill="none" stroke={C.gridBold} strokeWidth={1.2} strokeDasharray="5 4" />
        {/* base = the test diameter, laid flat */}
        <line x1={tox} y1={toy} x2={tox + Lb} y2={toy} stroke={C.ink} strokeWidth={2} />
        {angArc && <polyline points={angArc} fill="none" stroke={C.ink} strokeWidth={2} strokeLinecap="round" />}
        {/* legs */}
        {P > 0.001 && <line x1={tox} y1={toy} x2={apx} y2={apy} stroke={C.ink} strokeWidth={3.6} strokeLinecap="round" />}
        {P < 0.999 && <line x1={tox + Lb} y1={toy} x2={apx} y2={apy} stroke={C.red} strokeWidth={1.8} strokeDasharray="4 3" />}
        {/* right angle at the apex */}
        {P > 0.02 && P < 0.98 && (() => {
          const s = 13;
          const d1 = [(tox - apx), (toy - apy)], L1 = Math.hypot(...d1);
          const d2 = [(tox + Lb - apx), (toy - apy)], L2 = Math.hypot(...d2);
          const e1 = [d1[0] / L1 * s, d1[1] / L1 * s], e2 = [d2[0] / L2 * s, d2[1] / L2 * s];
          return <polyline points={`${apx + e1[0]},${apy + e1[1]} ${apx + e1[0] + e2[0]},${apy + e1[1] + e2[1]} ${apx + e2[0]},${apy + e2[1]}`} fill="none" stroke={C.ink} strokeWidth={1} />;
        })()}
        <circle cx={tox} cy={toy} r={4.5} fill={C.red} stroke={C.ink} strokeWidth={1.2} />
        <circle cx={tox + Lb} cy={toy} r={4.5} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />
        <text x={tox} y={toy + 18} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.ink}>anti-coin</text>
        <text x={tox + Lb} y={toy + 18} textAnchor="middle" fontFamily={mono} fontSize="10" fill={C.ink}>fair coin</text>
        <circle cx={apx} cy={apy} r={5.5} fill={C.ink} stroke="#fff" strokeWidth={2} />
        <text x={apx + 9} y={apy - 8} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>candidate</text>
        <text x={(tox + apx) / 2 - 8} y={(toy + apy) / 2 - 8} textAnchor="end" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>√P(pass) = {F.toFixed(3)}</text>
        {P < 0.98 && <text x={(tox + Lb + apx) / 2 + 8} y={(toy + apy) / 2 - 8} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.red}>√P(fail)</text>}
        <text x={tox + 40} y={toy - 38} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>distance = {Dlabel}</text>
      </svg>
      <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, fontFamily: mono, fontSize: 13, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>P(pass) = {P.toFixed(3)}</span>
        <span>overlap = √P = {F.toFixed(3)}</span>
        <span style={{ color: C.gold }}>distance = {Dlabel}</span>
      </div>
      <Notice>
        One number, three readings: the <strong>overlap</strong> with the fair coin, its
        square the <strong>pass probability</strong>, its arccos the{" "}
        <strong>Bures distance</strong>. Try the other candidates: always-H also sits at
        π/4 from the fair coin — and sure enough it also passes half the time; the
        anti-coin sits at π/2 — and never passes. Notice the flattened figure is exactly
        step 6's triangle with new labels — the candidate even sits at the Bernoulli
        point of its own pass probability. And here is what basis-independence bought
        you: the π/4 was computed on the bowl <em>without choosing any measurement</em>,
        yet it predicts the outcome of this very concrete tester. The whole of qubit
        statistics, folded into one right triangle — you built a qubit, and now you can
        also measure with it. And one final step back: the question that drove
        everything — <em>how far apart are two beliefs about a coin?</em> — contained no
        quantum physics at all. Answering it honestly forced this entire stage into
        existence: the circle, the disk, the bowl, the diameters. Quantum mechanics, in
        the end, is the discovery that nature actually performs on all of it — lower
        half, phase dial and all.
      </Notice>
    </div>
  );
}

// ================= BONUS 4 : UNDER THE HOOD — THE MATRIX =================
function MatrixBox({ m, highlightRow0 = false, title }) {
  const cell = (v, hot) => (
    <div style={{
      width: 62, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: 13, fontWeight: 600,
      background: hot ? C.goldSoft : "#fff", borderRadius: 4, border: `1px solid ${hot ? C.gold : C.gridBold}`,
    }}>{v.toFixed(2)}</div>
  );
  return (
    <div style={{ display: "inline-block", padding: "8px 10px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8 }}>
      {title && <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: C.inkSoft, marginBottom: 5 }}>{title}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "62px 62px", gap: 4 }}>
        {cell(m[0][0], highlightRow0)}{cell(m[0][1], highlightRow0)}
        {cell(m[1][0], false)}{cell(m[1][1], false)}
      </div>
    </div>
  );
}

function StepMatrix() {
  // part A: squaring a pure amplitude vector
  const [alpha, setAlpha] = useState(35);
  const [flipped, setFlipped] = useState(false);
  const sgn = flipped ? -1 : 1;
  const a = sgn * Math.cos((alpha * Math.PI) / 180);
  const b = sgn * Math.sin((alpha * Math.PI) / 180);
  const Mpure = [[a * a, a * b], [a * b, b * b]];
  // part C: a mixed state and its spectral diameter
  const [tt, setTt] = useState(0.3);
  const [beta, setBeta] = useState(40);
  const br = (beta * Math.PI) / 180;
  const pp = 0.5 + tt * Math.cos(br);
  const ww = tt * Math.sin(br);
  const Mmix = [[pp, ww], [ww, 1 - pp]];
  const Np = [0.5 + 0.5 * Math.cos(br), 0.5 * Math.sin(br)];
  const Nm = [0.5 - 0.5 * Math.cos(br), -0.5 * Math.sin(br)];
  return (
    <div>
      <p>
        A last look under the hood, for the mathematically curious — three secrets the
        pictures have been keeping. <strong>First, the maps.</strong> The whole tutorial
        rode a pipeline: unit circle → Bernoulli circle → interval. The last leg is the
        naive one: read the odds, p&nbsp;=&nbsp;a² and 1−p&nbsp;=&nbsp;b² — squaring
        each coordinate <em>separately</em>. But that map is built from degree-2
        products, and there exist exactly <em>three</em> such products of (a,&nbsp;b):
        a², ab, and b². All three fit in one master object — the full multiplication
        table of ψ:
      </p>
      <Slider value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — the amplitude vector" readout={`ψ = (${a.toFixed(2)}, ${b.toFixed(2)})`} />
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <MatrixBox m={Mpure} highlightRow0 title="ψ ⊗ ψ — THE MULTIPLICATION TABLE" />
        <Btn kind="outline" onClick={() => setFlipped(!flipped)}>flip the sign of ψ</Btn>
      </div>
      <p>
        The pipeline is really three <em>readings</em> of this one table. Read only the
        diagonal, (a²,&nbsp;b²): that is the interval — the coin flip, blind to
        everything else. Read the highlighted <strong>top row, (a²,&nbsp;ab) =
        (p,&nbsp;w)</strong>: that is the Bernoulli point — the diagonal <em>plus</em>{" "}
        the off-diagonal ab, which is exactly the band width (and nothing more is
        needed, since b²&nbsp;=&nbsp;1−a²). So the Bernoulli circle is what you get by
        refusing to forget the off-diagonal. And press the sign button: ψ and −ψ
        produce the <em>identical</em> table — a table cannot remember a global sign,
        only relative ones. The double cover of step 6, finally explained mechanically.
        (Official names, for the curious: the table map is the degree-2{" "}
        <em>Veronese map</em> into Sym², the space of symmetric tensors — and any
        degree-2 map, coordinate-squaring included, must factor through it.)
      </p>
      <p>
        <strong>Second, the disk was matrix-space all along.</strong> Mix beliefs and
        the tables average entrywise: the result is always a symmetric table whose
        diagonal sums to 1 — so it carries exactly two free numbers, its top row
        (p,&nbsp;w). Your Bernoulli disk <em>is</em> the space of these tables. Physicists
        call them <strong>density matrices</strong>; the tutorial has been doing matrix
        arithmetic in disguise: mixing = averaging tables (linear, hence the chords),
        superposition = adding vectors <em>before</em> squaring (hence a different floor).
      </p>
      <p>
        <strong>Third, every table elects its own diameter.</strong> The mixer showed
        that many different chords pass through one interior point — many ensembles,
        one belief. But the matrix breaks the tie: its{" "}
        <strong>spectral decomposition</strong> singles out one canonical splitting —
        the diameter through the state and the center. The endpoints are the
        eigen-states (the only decomposition into two <em>perpendicular</em>, antipodal
        coins), and the weights are the eigenvalues λ±&nbsp;=&nbsp;½&nbsp;±&nbsp;t —
        precisely the λ that lifted this very diameter into the hemisphere.
      </p>
      <Slider value={tt} min={0} max={0.5} step={0.01} onChange={setTt}
        label="t — how mixed (distance from center)" readout={`λ₊=${(0.5 + tt).toFixed(2)}  λ₋=${(0.5 - tt).toFixed(2)}`} />
      <Slider value={beta} min={0} max={360} step={1} onChange={setBeta}
        label="β — direction of the state" readout={`ρ top row = (${pp.toFixed(2)}, ${ww.toFixed(2)})`} />
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 8 }}>
        <MatrixBox m={Mmix} highlightRow0 title="ρ — THE DENSITY MATRIX" />
        <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, lineHeight: 1.7, paddingTop: 4 }}>
          eigenvalues: ½±t = {(0.5 + tt).toFixed(2)}, {(0.5 - tt).toFixed(2)}<br />
          eigen-states: the diameter's two endpoints
        </div>
      </div>
      <StatePlot showLower showFullCircle labels={false} segment={[Np, Nm]} point={[pp, ww]} />
      <Notice>
        So the trilogy closes: the <strong>multiplication table</strong> builds the
        circle and explains the missing sign; the <strong>density matrix</strong> is the disk,
        hiding in the plain coordinates (p,&nbsp;w) you plotted since step 3; and the{" "}
        <strong>spectral decomposition</strong> is geometry you already own — the
        diameter through the state, endpoints as eigen-states, λ±&nbsp;=&nbsp;½±t as
        weights. Ensemble ambiguity is real (many chords through one point), but every
        state carries one distinguished chord: its own diameter — the measurement it
        answers most decisively, the axis of its hemisphere lift, and now the eigen-basis
        of its matrix. Three views, one object. Everything in this tutorial was tensor
        algebra wearing a coin costume.
      </Notice>
    </div>
  );
}

// ================= APP =================
const STEPS = [
  { title: "Flip a fair coin", comp: Step1 },
  { title: "Three mystery coins", comp: Step2 },
  { title: "Two numbers per run", comp: Step3 },
  { title: "The semicircle", comp: Step4 },
  { title: "Mixing beliefs", comp: StepMix },
  { title: "Lift to the unit circle", comp: StepThales },
  { title: "The missing half", comp: Step5 },
  { title: "Measuring is asking", comp: StepMeasure },
  { title: "Why the sign hides", comp: StepSign },
  { title: "The complex dial — the Bloch sphere", comp: StepBloch },
  { title: "Bonus: how far apart are two coins?", comp: StepDistance },
  { title: "Bonus appendix: counting the flips", comp: StepFlipCount },
  { title: "Bonus: the Bernoulli hemisphere", comp: StepBures },
  { title: "Bonus: cashing in the distance", comp: StepOverlap },
  { title: "Bonus: under the hood — the matrix", comp: StepMatrix },
];

export default function BuildYourOwnQubit() {
  const [step, setStep] = useState(0);
  const Comp = STEPS[step].comp;
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        p { line-height: 1.6; font-size: 15px; }
      `}</style>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "28px 18px 60px", fontFamily: serif }}>
        {/* header */}
        <header style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{
            width: 46, height: 46, borderRadius: "50%", margin: "0 auto 10px",
            background: `radial-gradient(circle at 35% 30%, #FFAE5E, ${C.gold})`,
            border: `2px solid ${C.ink}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontFamily: mono, fontWeight: 600, color: "#fff",
          }}>H</div>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>
            Build your own qubit
          </h1>
          <div style={{ fontFamily: mono, fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
            ten steps (+ five bonus) from a coin flip to a qubit
          </div>
        </header>

        {/* stepper */}
        <nav style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={s.title}
              style={{
                width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                fontFamily: mono, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${i === step ? C.gold : C.gridBold}`,
                background: i === step ? C.gold : i < step ? C.goldSoft : "#fff",
                color: i === step ? "#fff" : C.ink,
              }}
            >
              {i + 1}
            </button>
          ))}
        </nav>

        <h2 style={{ fontSize: 21, fontWeight: 600, margin: "0 0 10px" }}>
          <span style={{ fontFamily: mono, fontSize: 13, color: C.gold, marginRight: 8 }}>
            STEP {step + 1}/{STEPS.length}
          </span>
          {STEPS[step].title}
        </h2>

        <Comp key={step} />

        {/* nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <Btn kind="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← back
          </Btn>
          <Btn onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>
            next →
          </Btn>
        </div>
      </div>
    </div>
  );
}
