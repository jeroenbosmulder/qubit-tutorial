import { useState, useMemo } from "react";

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
        Take a fair coin. Before you flip it ten times, ask yourself: <em>which sequences do you expect to see?</em> All heads? A regular pattern? Something messy? Write down a few guesses, then flip.
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
        Every particular sequence is equally likely — HHHHHHHHHH is exactly as likely as HTHHTTHTHT. What differs is how <em>many</em> sequences look "mixed" and how many look "pure". Your expectations are about the whole collection of possible runs, not about any single run.
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
        Now three <strong>mystery coins</strong>. One is fair. One is biased. One is deterministic: it has already made up its mind, but you do not know which side it favors. Flip each one and try to identify it.
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
        Before its first flip, what odds would you give the deterministic coin? You do not know its side, so: 50/50 — <em>the same as the fair coin</em>. The expected outcome alone cannot tell them apart. You need a second indicator.
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
        Give each run of 30 flips <strong>two numbers</strong>: its average outcome (count H = 1 and T = 0, so the average is simply the observed heads-fraction p) and its spread — we call it the <strong>band width</strong> of the sequence. Run many experiments with a fair coin <span style={{ color: C.teal }}>●</span> and with fresh mystery deterministic coins <span style={{ color: C.red }}>●</span>, and drop each run on the chart.
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
        Here is the important move: your <em>belief</em> about a coin is fixed <strong>before you start flipping</strong>. So its two numbers are <em>expectations over everything that might happen</em>: the average over the whole cloud of possible runs, not the one run you happen to get. Each belief is one point — the center of its cloud (the markers with a white ring).
      </p>
      <Btn onClick={runExperiments}>Run 8 experiments of each</Btn>
      <div style={{ marginTop: 12 }}>
        <StatePlot scatter={scatter} centroids={centroids} showSemicircle={scatter.length > 40} labels={false} />
      </div>
      <Notice>
        The fair coin's possible runs all behave alike, so its belief marker settles on the curve, near (½, ½). The mystery deterministic coin's possible worlds <em>disagree</em>: each single world lands at a corner, (0, 0) or (1, 0). Averaging over both possibilities pulls the belief to (½, 0): the same expected outcome as the fair coin, zero expected band width, and strictly <em>inside</em> the region that the curve encloses. Definite coins live on the curve; uncertainty about <em>which</em> coin you hold pulls the belief into the interior. (If you had first peeked at one flip, you would have learned the coin's side and jumped to a corner. The interior point describes you <em>before</em> learning anything.) And save one question for later: the fair coin and the mystery coin now sit at different points — but how far apart are they, <em>really</em>? That simple, completely non-quantum question drives this whole tutorial. First we find the exact shape of the curve. Then we return for the interior.
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
        There is a formula behind that curve. A coin with heads-probability p has band width
      </p>
      <Formula>σ = √(p(1 − p))</Formula>
      <p>
        which means every state satisfies (p − ½)² + σ² = ¼: a circle of radius ½, centered on fair odds — the <strong>Bernoulli circle</strong>. Slide the bias and watch where your belief lives.
      </p>
      <Slider
        value={p} min={0} max={1} step={0.01} onChange={setP}
        label="P(heads)"
        readout={`p=${p.toFixed(2)}   σ=${w.toFixed(2)}`}
      />
      <StatePlot point={[p, w]} />
      <Notice>
        Every possible coin-belief lands on the <em>upper half of the Bernoulli circle</em>. The fair coin sits at the top of the arc, at (½, ½); the two deterministic coins sit at the two ends. You have just drawn a state space — but two puzzles remain. In step 3, the belief marker fell <em>inside</em> this curve. And the curve itself is exactly half of something. We take the interior first.
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
        The curve holds every <em>definite</em> coin. But step 3 left an open point: the mystery deterministic coin's belief marker settled <em>inside</em> the curve. Time to fill the interior — by mixing beliefs by hand.
      </p>
      <p>
        Suppose you hold a coin. With weight c you believe its bias is q₁ <span style={{ color: C.teal }}>●</span>, and with weight 1−c you believe its bias is q₂ <span style={{ color: C.red }}>●</span>. Your two numbers — expected outcome and expected band width — are the c-weighted averages. So your belief slides along the straight chord between the two candidate coins.
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
        Two candidate biases plus one confidence reach <em>every</em> point of the upper disk. Set q₁=1, q₂=0, c=½ and you rebuild the mystery deterministic coin at the exact center. And no belief can ever leave the disk: chords stay inside the circle that they span. So the state space of beliefs is not the curve but the whole disk inside it: <em>definite</em> coins on the rim, <em>uncertainty about the coin</em> in the interior, total ignorance at the exact center. The disk even sorts your ignorance into two kinds. The rim carries the statistical part, which no data can remove. The depth into the interior is the systematic part, which flips can teach away. Purity measures how much of your not-knowing is curable. Our two main characters sit at the two extremes of the same odds: the fair coin is pure statistics, the mystery coin is pure ignorance.
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
        Go back to the semicircle and pick any belief point on it. Connect it to the two corners: one vector to always-T, one to always-H. Two theorems you may remember from school now work together. <strong>Thales</strong>: from a point on a circle, a diameter is always seen at a right angle — so the two vectors are perpendicular (the little square in the picture). Measuring their lengths gives exactly
      </p>
      <Formula>|to T| = √p&nbsp;&nbsp;&nbsp;&nbsp;|to H| = √(1 − p)</Formula>
      <p>
        <strong>Pythagoras</strong> finishes the argument: the two legs squared add up to the hypotenuse squared, and the hypotenuse T–H has length 1 — so p + (1−p) = 1. The coin's arithmetic is literally a right triangle. Now use the two lengths as coordinates of their own: the pair (√p, √(1−p)) has squares that sum to one, so it lives on the <strong>unit circle</strong> (teal). Nothing was invented here: the unit circle simply appears when you <em>measure each state's two distances</em>. The dashed line shows the shortest way to picture the lift: stretch the T-chord to length one, and you have arrived.
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
        Sweep α once around the unit circle: the gold point runs around the Bernoulli circle <em>twice</em> — the Bernoulli angle is 2α. And the first quarter alone, where both coordinates are honest square roots, already paints the whole upper semicircle. So the other three quarters revisit the same odds. What new thing could they carry? A <em>sign</em>. That is the next step.
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
        Each point of the unit circle you just swept is really a pair of <strong>amplitudes</strong> (a, b) — square roots that are allowed to carry a sign — with p = a² and 1−p = b². Then
      </p>
      <Formula>p = a²&nbsp;&nbsp;&nbsp;&nbsp;σ = √(a²b²) = a·b</Formula>
      <p>
        Squares erase signs — so (a, b) and (a, −b) give the <em>same odds</em>. But the band width a·b remembers the sign. Whenever exactly one amplitude is negative, the band width is negative: the state lives on the lower half of the Bernoulli circle. The fair coin's own mirror twin, down at (½, −½), we call the <strong>anti-coin</strong>. Sweep all the way around and watch every set of odds appear twice — once above the axis, once below.
      </p>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α (sweeps the amplitudes)"
        readout={`a=${fmt(a)}  b=${fmt(b)}  →  p=${p.toFixed(2)}  ab=${fmt(w)}`}
      />
      <AmpBars a={a} b={b} title="AMPLITUDES" />
      <StatePlot showLower showFullCircle point={[p, w]} />
      <Notice>
        The lower semicircle is a family of new states: the same betting odds as their mirror images above, but with a hidden sign. Geometrically, the sign is an <em>orientation</em>: flipping b flips the triangle T–state–H to the other side of the diameter — same side lengths, opposite way around. Flipping the coin can never see this: no bet on heads and tails distinguishes a state from its mirror twin. To see the sign, you must ask the coin a <em>different question</em> than heads-or-tails. That is exactly what the next two steps are about.
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
        One change of viewpoint before we begin, and it deserves to be announced. In
        steps 1–3, "flipping" meant: take a fresh coin from a source, look at the
        outcome, repeat. Every flip used a new copy. From this step on, a new kind of
        experiment is allowed: ask a question to <em>one single state</em> — and then
        ask it again, or ask it something different. The source picture simply has no
        answer for that second question; the rules of this step and the next supply
        one. (When you want the old many-flips picture back, imagine a machine that
        hands you a fresh copy of the state each time.)
      </p>
      <p>
        Time to say what "flipping the coin" really is — and to discover that it is only one question among many. Here is the rule of the game. You may never ask a state "where are you?". You may only pick a <strong>diameter</strong> of the circle and ask: "<em>which end?</em>" The state must answer with one of the diameter's two endpoints. The odds of each answer are already drawn in your picture: the chance of an answer is the <strong>squared distance to the opposite end</strong>. Far from "always T" means: probably answers H. (Thales guarantees the right angle at P, so by Pythagoras the two squared chords always add up to 1 — the chances of the two answers add up automatically.)
      </p>
      <p>
        The horizontal diameter is the <em>raw</em> question, heads-or-tails: that one is the coin flip. Tilted diameters ask <em>combined</em> questions. Compare it to traffic: sometimes the revealing question is not "which weekday is it?" but "weekend or midweek?" — a contrast built out of the raw days. The vertical diameter asks exactly such a contrast: "coin or anti-coin?".
      </p>
      <Slider value={theta} min={0} max={360} step={1} onChange={setTheta}
        label="where the state sits on the circle" readout={`state angle ${theta}°`} />
      <Slider value={delta} min={0} max={360} step={1} onChange={setDelta}
        label="which question you ask (rotate the diameter)"
        readout={`δ=${delta}°${delta % 180 === 0 ? " — the coin flip" : delta % 180 === 90 ? " — the contrast question" : ""}`} />
      <MeasurePlot theta={theta} delta={delta} />
      <ProbBars title="THE STATE'S ANSWER ODDS" probs={[pPlus, 1 - pPlus]} labels={[`answers ${labP}`, `answers ${labM}`]} />
      <Notice>
        Rotate the question dial until the diameter passes straight through the state: suddenly the state answers with 100% certainty. <em>Every</em> state on the circle is completely certain about exactly one question — and spread out over all the others. The fair coin is certain too: not about heads-or-tails, but about coin-or-anti-coin. No state is "random" in itself. Randomness is a mismatch between the state and the question you happened to ask.
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
        Now we can finally answer the question this tutorial has been circling: why do ordinary coin flips never show the sign? Take a state P and its mirror twin P′ on the lower half. Look at the horizontal diameter: <em>both of its endpoints lie on the mirror line itself</em>. The mirror does not move them. So P and P′ are at identical distances from "always T" and from "always H" — and they give identical answer odds to the coin flip. Forever. The flip is not weak; it is <em>symmetric</em> under exactly the reflection that the sign encodes.
      </p>
      <p>
        There is a sharper way to say it. From any state, the pair of chords to a diameter's two ends carries <em>two</em> kinds of information. First, their <strong>lengths</strong> — squared, these are the answer odds of step 8. Second, their <strong>orientation</strong>: walking end → state → end, you pass around the diameter one way or the other. The mirror keeps every length and reverses the orientation; the flip reads only lengths. Set the dial to 0° and look at the two shaded triangles below: identical side lengths, opposite turning arrows. Orientation is the <em>only</em> difference, and it is exactly what the sign stores. This also explains the band width you have plotted since step 3: its size is twice this triangle's area, and its sign is the triangle's orientation. The unit circle of step 6 keeps track of both; probabilities keep only the lengths.
      </p>
      <p>
        Any tilted diameter breaks that symmetry. Turn the dial to the contrast question and watch the twins split apart: P leans toward one end, P′ toward the other. At δ=90° they disagree as strongly as possible.
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
        The lower half of the circle was never hidden from physics — only from one instrument, the coin flip, which is blind to it by symmetry. Classical probability is simply the physics of owning only that one instrument. You have nearly built a qubit: its states are the Bernoulli circle (with the disk of mixed beliefs inside), and its measurements are the diameters. One dial is still hidden — and it is the final step.
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
        One dial is still hidden. In step 7 the extra information was a <em>sign</em>: a two-position switch, giving each state one mirror twin. Real quantum amplitudes carry more: the tails amplitude can be turned by <em>any</em> angle φ, like the hand of a clock. That is all that "complex numbers" mean here: numbers that are small <strong>arrows</strong> rather than a bare + or −. The switch becomes a dial.
      </p>
      <p>
        The picture first lays everything on a table. Your Bernoulli circle lies flat, exactly as you know it — always T on the left, always H on the right, the state P on the far half, its mirror twin on the near half. Read the T–H diameter as an <strong>axle</strong> lying on the table. At each set of odds, a <span style={{ color: C.teal }}>wheel</span> stands upright on that axle, and the dial φ turns the state around it: at φ=0° the state rests at the far edge of the table (that is P); at φ=180° it rests at the near edge (exactly the mirror twin of step 7); and in between it swings <em>up above the table, or down below it</em>. One wheel for every p, and the circle inflates into a <strong>sphere</strong>: pure states on the glassy surface, mixed beliefs filling the ball, total ignorance at the center. Physicists draw the same object centered at zero with radius one and call it the <strong>Bloch sphere</strong>.
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
        Everything you built survives in 3D: answer odds are still squared distances to a diameter's ends, mixing still pulls inward, purity is still the distance from the center. One phenomenon is new. With three axes, certainty about one diameter forces a 50/50 spread over every diameter perpendicular to it: no state can answer two independent questions sharply at the same time. That trade-off has a famous name: <strong>uncertainty</strong>. (This is Heisenberg's uncertainty principle, in its qubit form.) This ball, with its diameters, is the complete qubit — and you built it from a coin.
      </Notice>
    </div>
  );
}

// ---------- the roadmap: bit → interval → half-disk → disk → ball ----------
function Roadmap({ preview = false }) {
  const stages = [
    { l1: "a bit", l2: "two answers" },
    { l1: "a probability", l2: "the interval" },
    { l1: "two indicators", l2: "the half-disk" },
    { l1: "orientation kept", l2: "the full disk" },
    { l1: "a turning dial", l2: "the ball — a qubit" },
  ];
  const W = 640, H = 128, cy = 46;
  const xs = [64, 192, 320, 448, 576];
  const fadeFrom = preview ? 3 : 5;
  const op = (i) => (i >= fadeFrom ? 0.32 : 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block", margin: "14px 0" }}>
      <defs>
        <radialGradient id="roadshade" cx="0.36" cy="0.3" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#EDF7FD" />
          <stop offset="80%" stopColor="#CFEAF9" />
          <stop offset="100%" stopColor="#AFD9F2" />
        </radialGradient>
      </defs>

      {/* arrows */}
      {xs.slice(0, 4).map((x, i) => (
        <g key={i} opacity={op(i + 1)}>
          <line x1={x + 42} y1={cy} x2={xs[i + 1] - 44} y2={cy}
            stroke={C.inkSoft} strokeWidth={1.4}
            strokeDasharray={preview && i + 1 >= fadeFrom ? "4 4" : null} />
          <path d={`M ${xs[i + 1] - 44} ${cy} l -7 -4 v 8 z`} fill={C.inkSoft} />
        </g>
      ))}

      {/* 1 — the bit: two lone answers */}
      <g opacity={op(0)}>
        <circle cx={xs[0] - 15} cy={cy} r={8} fill={C.ink} />
        <circle cx={xs[0] + 15} cy={cy} r={8} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />
        <text x={xs[0] - 15} y={cy + 3} textAnchor="middle" fontFamily={mono} fontSize="8.5" fontWeight="600" fill="#fff">T</text>
        <text x={xs[0] + 15} y={cy + 3} textAnchor="middle" fontFamily={mono} fontSize="8.5" fontWeight="600" fill="#fff">H</text>
      </g>

      {/* 2 — the interval [0,1] */}
      <g opacity={op(1)}>
        <line x1={xs[1] - 28} y1={cy + 6} x2={xs[1] + 28} y2={cy + 6} stroke={C.ink} strokeWidth={1.6} />
        <line x1={xs[1] - 28} y1={cy + 1} x2={xs[1] - 28} y2={cy + 11} stroke={C.ink} strokeWidth={1.6} />
        <line x1={xs[1] + 28} y1={cy + 1} x2={xs[1] + 28} y2={cy + 11} stroke={C.ink} strokeWidth={1.6} />
        <text x={xs[1] - 28} y={cy + 23} textAnchor="middle" fontFamily={mono} fontSize="8.5" fill={C.inkSoft}>0</text>
        <text x={xs[1] + 28} y={cy + 23} textAnchor="middle" fontFamily={mono} fontSize="8.5" fill={C.inkSoft}>1</text>
        <circle cx={xs[1] + 9} cy={cy + 6} r={4.5} fill={C.gold} stroke={C.ink} strokeWidth={1.2} />
      </g>

      {/* 3 — the upper half-disk */}
      <g opacity={op(2)}>
        <path d={`M ${xs[2] - 26} ${cy + 16} A 26 26 0 0 1 ${xs[2] + 26} ${cy + 16} Z`}
          fill={C.goldSoft} stroke="none" />
        <path d={`M ${xs[2] - 26} ${cy + 16} A 26 26 0 0 1 ${xs[2] + 26} ${cy + 16}`}
          fill="none" stroke={C.gold} strokeWidth={2.4} />
        <line x1={xs[2] - 26} y1={cy + 16} x2={xs[2] + 26} y2={cy + 16} stroke={C.inkSoft} strokeWidth={1.2} strokeDasharray="3 3" />
      </g>

      {/* 4 — the full disk: upper arc gold, lower arc red */}
      <g opacity={op(3)}>
        <circle cx={xs[3]} cy={cy} r={26} fill="#FFF7EF" />
        <path d={`M ${xs[3] - 26} ${cy} A 26 26 0 0 1 ${xs[3] + 26} ${cy}`}
          fill="none" stroke={C.gold} strokeWidth={2.4} />
        <path d={`M ${xs[3] - 26} ${cy} A 26 26 0 0 0 ${xs[3] + 26} ${cy}`}
          fill="none" stroke={C.red} strokeWidth={2.4} />
        <line x1={xs[3] - 26} y1={cy} x2={xs[3] + 26} y2={cy} stroke={C.inkSoft} strokeWidth={1} strokeDasharray="2 3" />
      </g>

      {/* 5 — the ball, with a standing wheel */}
      <g opacity={op(4)}>
        <circle cx={xs[4]} cy={cy} r={26} fill="url(#roadshade)" stroke={C.gridBold} strokeWidth={1.4} />
        <ellipse cx={xs[4]} cy={cy} rx={26} ry={8} fill="none" stroke={C.gold} strokeWidth={1.6} strokeDasharray="3 3" />
        <ellipse cx={xs[4]} cy={cy} rx={9} ry={26} fill="none" stroke={C.teal} strokeWidth={1.8} />
      </g>

      {preview && (
        <text x={(xs[3] + xs[4]) / 2} y={14} textAnchor="middle" fontFamily={mono} fontSize="9.5" letterSpacing="1" fill={C.inkSoft} opacity={0.8}>
          WHERE WE ARE HEADED
        </text>
      )}

      {/* labels */}
      {stages.map((s, i) => (
        <g key={i} opacity={op(i)}>
          <text x={xs[i]} y={H - 26} textAnchor="middle" fontFamily={mono} fontSize="9.5" fontWeight="600" fill={C.ink}>{s.l1}</text>
          <text x={xs[i]} y={H - 12} textAnchor="middle" fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>{s.l2}</text>
        </g>
      ))}
    </svg>
  );
}

// ================= INTRODUCTION =================
function StepIntro() {
  return (
    <div>
      <p>
        This tutorial makes a slightly outrageous promise: starting from nothing but an ordinary coin, you will build — with your own hands, on this page — a <strong>quantum bit</strong>. You will not need any physics to get there, and Schrödinger's famous cat — dead and alive at once, the usual doorway into all things quantum — may stay peacefully asleep in its box. The only equipment is a coin you can flip, and a stubborn refusal to be sloppy.
      </p>
      <p>
        We begin as naively as possible: flip, count, bet. Plain statistics. But at every step we pause and ask the question a careful person cannot help asking. <em>Are all fifty-fifties the same fifty-fifty? Can one number really hold everything I believe? What does my bookkeeping quietly throw away?</em> Each question has one honest answer, and each answer is a door into the next room. You never leap — every step is simply the logical next one.
      </p>
      <p>
        And that is the whole secret of the journey: nowhere along the way will we <em>add</em> anything quantum. We only keep adding <strong>detail</strong> — a second score here, a lost sign there, a hidden dial at the very end — and after ten such steps the coin's plain statistics has grown, all by itself, into the strange and beautiful geometry physicists call a qubit. Quantum, it turns out, is not statistics plus magic. It is statistics with the details kept.
      </p>
      <Notice>
        This is a laboratory, not a lecture. Every step has coins to flip, guesses to commit to, and sliders to turn — the page is your lab bench. Flip first, guess second, read third: the geometry lands much harder when your own data drew it.
      </Notice>
    </div>
  );
}

// ================= EPILOGUE =================
function StepEpilogue() {
  return (
    <div>
      <p>
        Look back at what you just did. You flipped a coin and admitted a bet. You met two kinds of not-knowing and invented two scores to keep them apart. The scores drew you a state space — the half-disk with the Bernoulli circle as its rim. Then plain geometry took over: the square-root lift put a twin below every belief, orientation told the twins apart, and one last hidden dial stood a wheel upright on every diameter. The half-disk became a disk; the disk became a ball. At no point did you assume anything quantum — you only refused to throw information away.
      </p>
      <p>
        That refusal, it turns out, is Nature's own policy. Your instrument — the bare coin flip — is blind by symmetry to everything below the mirror line, so classical probability contents itself with the upper half-disk. Nature is more <strong>inclusive</strong>. She keeps the lower half too, because she cares about <em>orientation</em>: same lengths but opposite turning count, for her, as two different states. And she is more inclusive still: orientation, for her, is not a two-way choice but a matter of <em>degree</em> — the ± switch ripens into a freely turning dial φ, with every intermediate shade between the twins allowed. Switch to dial, disk to ball.
      </p>
      <p>
        And here is the part that turns mathematics into physics: this ball is not a construction that lives only on paper — it <strong>lives in the wild</strong>. An electron's spin, a photon's polarization, two energy levels of an atom: each one <em>is</em> this ball, dial and all. Nature provides the qubits; we only need to tame them. And taming means exactly the moves you learned: every diameter is an axis, every rotation a possible operation — these rotations are the <em>gates</em> of a quantum computer. More information in the state, and more ways to steer it.
      </p>
      <Roadmap />
      <p>
        Read the ladder one last time, left to right: two answers, an interval of bets, a half-disk of beliefs, a disk that remembers orientation, a ball that lets it turn. Each rung was forced by an honest question about an ordinary coin — what may I believe, and what am I throwing away?
      </p>
      <Notice>
        The stage you built contains no quantum physics — only honest bookkeeping about uncertainty, pushed as far as geometry allows. Quantum mechanics is the discovery that nature actually <em>performs</em> on this stage. You built a qubit from a coin; nature had built it first.
      </Notice>
    </div>
  );
}

// ---------- bra / ket shaped stepper buttons ----------
function BraKetBtn({ shape, label, active, visited, onClick, title }) {
  const W = 36, H = 30, notch = 9, inset = 0.75;
  const d =
    shape === "bra"
      ? `M ${W - inset} ${inset} L ${notch} ${inset} L 1 ${H / 2} L ${notch} ${H - inset} L ${W - inset} ${H - inset} Z`
      : `M ${inset} ${inset} L ${W - notch} ${inset} L ${W - 1} ${H / 2} L ${W - notch} ${H - inset} L ${inset} ${H - inset} Z`;
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: W, height: H, padding: 0, border: "none", background: "transparent",
        cursor: "pointer", display: "block",
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }}>
        <path
          d={d}
          fill={active ? C.gold : visited ? C.goldSoft : "#fff"}
          stroke={active ? C.gold : C.gridBold}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <text
          x={shape === "bra" ? W / 2 + 3.5 : W / 2 - 3.5}
          y={H / 2 + 4.5}
          textAnchor="middle"
          fontFamily={mono}
          fontSize="12"
          fontWeight="600"
          fill={active ? "#fff" : C.ink}
        >
          {label}
        </text>
      </svg>
    </button>
  );
}

// ================= APP =================
const STEPS = [
  { title: "Just statistics — at first", comp: StepIntro, tag: "i", shape: "bra", label: "INTRODUCTION" },
  { title: "Flip a fair coin", comp: Step1, tag: "1", label: "STEP 1/10" },
  { title: "Three mystery coins", comp: Step2, tag: "2", label: "STEP 2/10" },
  { title: "Two numbers per run", comp: Step3, tag: "3", label: "STEP 3/10" },
  { title: "The semicircle", comp: Step4, tag: "4", label: "STEP 4/10" },
  { title: "Mixing beliefs", comp: StepMix, tag: "5", label: "STEP 5/10" },
  { title: "Lift to the unit circle", comp: StepThales, tag: "6", label: "STEP 6/10" },
  { title: "The missing half", comp: Step5, tag: "7", label: "STEP 7/10" },
  { title: "Measuring is asking", comp: StepMeasure, tag: "8", label: "STEP 8/10" },
  { title: "Why the sign hides", comp: StepSign, tag: "9", label: "STEP 9/10" },
  { title: "The complex dial — the Bloch sphere", comp: StepBloch, tag: "10", label: "STEP 10/10" },
  { title: "The ball in the wild", comp: StepEpilogue, tag: "e", shape: "ket", label: "EPILOGUE" },
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
            an introduction, ten steps, and an epilogue — from a coin flip to a qubit
          </div>
        </header>

        {/* stepper */}
        <nav style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {STEPS.map((sInfo, i) =>
            sInfo.shape ? (
              <BraKetBtn
                key={i}
                shape={sInfo.shape}
                label={sInfo.tag}
                active={i === step}
                visited={i < step}
                onClick={() => setStep(i)}
                title={sInfo.title}
              />
            ) : (
              <button
                key={i}
                onClick={() => setStep(i)}
                title={sInfo.title}
                style={{
                  width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                  fontFamily: mono, fontSize: 12, fontWeight: 600, padding: 0,
                  border: `1.5px solid ${i === step ? C.gold : C.gridBold}`,
                  background: i === step ? C.gold : i < step ? C.goldSoft : "#fff",
                  color: i === step ? "#fff" : C.ink,
                }}
              >
                {sInfo.tag}
              </button>
            )
          )}
        </nav>

        <h2 style={{ fontSize: 21, fontWeight: 600, margin: "0 0 10px" }}>
          <span style={{ fontFamily: mono, fontSize: 13, color: C.gold, marginRight: 8 }}>
            {STEPS[step].label}
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
