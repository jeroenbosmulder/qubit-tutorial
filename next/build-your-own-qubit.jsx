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
  const bp = conf * q1 + (1 - conf) * q2;
  const bw = conf * sig(q1) + (1 - conf) * sig(q2);
  return (
    <div>
      <p>
        The curve holds every <em>definite</em> coin. But step 3 left an open point: the mystery deterministic coin's belief marker settled <em>inside</em> the curve. Time to fill the interior — by mixing beliefs by hand.
      </p>
      <p>
        Suppose you hold a coin. With weight c you believe its bias is q₁ <span style={{ color: C.teal }}>●</span>, and with weight 1−c you believe its bias is q₂ <span style={{ color: C.red }}>●</span>. Your two numbers — expected outcome and expected band width — are the c-weighted averages. So as you turn c, your belief slides along the straight chord between the two candidate coins: on top of one candidate at c=1, on top of the other at c=0, and strictly <em>inside</em> the curve everywhere in between. Try it:
      </p>
      <Slider value={q1} min={0} max={1} step={0.01} onChange={setQ1}
        label="q₁ — first candidate bias" readout={`q₁=${q1.toFixed(2)}`} />
      <Slider value={q2} min={0} max={1} step={0.01} onChange={setQ2}
        label="q₂ — second candidate bias" readout={`q₂=${q2.toFixed(2)}`} />
      <Slider value={conf} min={0} max={1} step={0.01} onChange={setConf}
        label="c — confidence in the first candidate"
        readout={`c=${conf.toFixed(2)}  →  belief (${bp.toFixed(2)}, ${bw.toFixed(2)})`} />
      <StatePlot segment={[[q1, sig(q1)], [q2, sig(q2)]]} point={[bp, bw]} labels={false} />
      <p>
        The picture now separates the <strong>two kinds of not-knowing</strong> at a glance. A point <em>on the curve</em> is a coin you know exactly — and it is still uncertain! Each flip stays genuinely random; there is nothing left to learn. That is <strong>statistical</strong> uncertainty, and it is there to stay. A point <em>inside</em> the curve carries a second ingredient on top: you also don't know <em>which</em> coin you hold. That is <strong>systematic</strong> uncertainty — and it is curable. Watch the coin's flips long enough and they betray their maker: your confidence c drifts toward the coin you actually hold, and your belief point slides along the chord until it reaches the curve. There it stops, because a definite coin has nothing more to teach.
      </p>
      <p>
        So the geometry itself sorts your ignorance: <em>how far along the arc</em> you sit is a statement about the coin; <em>how deep inside</em> you sit is a statement about you — the part of the uncertainty that is your own missing knowledge rather than the coin's genuine randomness. Set q₁=1, q₂=0, c=½ and you rebuild the mystery deterministic coin from step 3, landing at the exact center of the disk: a coin with no randomness at all, seen through maximal ignorance.
      </p>
      <Notice>
        Two candidate biases plus one confidence reach <em>every</em> point of the upper disk — and no belief can ever leave it, since chords stay inside the circle that they span. So the state space of beliefs is not the curve but the whole disk inside it: <em>definite</em> coins on the rim, <em>uncertainty about the coin</em> in the interior, total ignorance at the exact center. The rim position carries the statistical part, which no data can remove; the depth into the interior is the systematic part, which flips can teach away. Our two main characters sit at the two extremes of the same odds: the fair coin is pure statistics, the mystery coin is pure ignorance.
      </Notice>
    </div>
  );
}

// ================= PLAYGROUND D : THE VIEW FROM THE STATE =================
function StepFrame() {
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
        Every state carries its own private coordinate system — that is the discovery of this playground, and quantum theory's square-root coordinates fall out of it as scenery. Pick any state P on the Bernoulli circle and connect it to the two corners: one chord to always-T, one to always-H. <strong>Thales</strong>: from a point on a circle, a diameter is always seen at a right angle — so the two chords are perpendicular (the little square in the picture), a ready-made pair of axes that every state owns. Measuring their lengths gives exactly
      </p>
      <Formula>|to T| = √p&nbsp;&nbsp;&nbsp;&nbsp;|to H| = √(1 − p)</Formula>
      <p>
        <strong>Pythagoras</strong> finishes the warm-up: legs squared add to the hypotenuse squared, and T–H has length 1 — so p + (1−p) = 1. Now the physicist's move: <em>change the coordinate system</em>. Stand at P and adopt the two chords as your axes. Where, in this personal frame, is the <strong>center</strong> of the Bernoulli circle? No computation needed: the center is the <em>midpoint</em> of T and H, so its coordinates are the average of theirs — T at (√p, 0), H at (0, √(1−p)), center at <strong>(√p, √(1−p))/2</strong>. The same landmark spot, for every state. Doubled, the center's position is the teal point: the pair physicists call the <strong>probability amplitudes</strong>, living on the unit circle since its squares sum to 1. (The dashed ray gives a second reading of the same point: it is also the <em>direction in which the T-corner sees the state</em>, at distance √p — the two viewpoints agree because the triangle corner–center–state is isosceles, two of its sides being radii.)
      </p>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — bearing of the amplitude point (the state sits at 2α)"
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
      <p style={{ marginTop: 14 }}>
        Where did the sign of step 6 go? Run the construction for a state <em>below</em> the axis: the chord lengths are the same, so the center sits at the same (√p, √(1−p))/2 — frame coordinates are twin-blind, like every length. The difference hides in the frame itself: above the axis the ordered pair of axes (toward-T, toward-H) is right-handed, below it left-handed — the handedness <em>is</em> the triangle orientation of step 6, met from inside. Now insist, as physicists always do, that your frame keep a <em>fixed</em> handedness. Crossing always-H or always-T — exactly where one chord shrinks to zero — one axis must then reverse, pointing <em>away</em> from its corner, and the coordinate along it comes out <strong>negative</strong>. A "negative length" is nothing mysterious: an ordinary coordinate along an axis that happens to face the other way. The doubled center-vector now reads the <em>signed</em> amplitude pair (a, b), produced by bookkeeping alone.
      </p>
      <p>
        One more lap, and something remarkable happens. Follow the rule continuously all the way around: crossing H flips one axis, crossing T flips the other — so you come home with <em>both</em> axes reversed and coordinates <strong>−(a, b)</strong>. Same state, opposite amplitude vector; only a <em>second</em> lap restores the frame. That is the <strong>double cover</strong>, live: a state and its overall negative are one and the same object, and only <em>relative</em> signs can ever be physical. Playground E shows the same fact mechanically (ψ and −ψ build the identical table). Physicists will recognize here the seed of the <em>geometric phase</em>: a sign picked up purely by traveling a closed loop.
      </p>
      <Notice>
        Sweep α and watch the readout: the amplitude point turns at <em>half</em> the state's speed — the Bernoulli angle is 2α, so one lap of the state is half a lap of the amplitudes. This is the angle-doubling the polarizer step relies on: turn a polarizer by θ in the lab, and states move 2θ on the ball.
      </Notice>
    </div>
  );
}


// ================= STEP 6 : THE MIRROR TWINS =================
function StepTwins() {
  const [theta, setTheta] = useState(50);
  const th = (theta * Math.PI) / 180;
  const p = 0.5 + 0.5 * Math.cos(th);
  const w = 0.5 * Math.sin(th);
  return (
    <div>
      <p>
        Step 4 left a promise: the curve is exactly half of something. Here is the other half — found not by inventing new states, but by catching your own bookkeeping in the act of throwing a detail away. Attach to every state P its <strong>triangle</strong>: the T–H segment as base, the state as apex. Its two slanted sides have lengths √p and √(1−p) — the apex angle is a right angle (Thales' circle theorem: a diameter is seen at 90° from any point of the circle), so the squared sides sum to the squared base: p + (1−p) = 1. Everything a coin flip can ever teach you is the number p — and p fixes all three side lengths.
      </p>
      <p>
        But a triangle with these side lengths on this base exists in <em>two</em> copies: apex above the axis — or apex below. Mirror images. Same lengths, and one genuine difference: <strong>orientation</strong>. Walk the corners in the fixed order T → apex → H, and the upper triangle turns one way around, the lower one the other (the two arrows in the picture). Your plots have silently kept only the upper copy. Honest bookkeeping keeps both — and gives the band width the job of remembering which:
      </p>
      <Formula>w = ±√(p(1−p))&nbsp;&nbsp;&nbsp;&nbsp;size: twice the triangle's area&nbsp;&nbsp;·&nbsp;&nbsp;sign: its orientation</Formula>
      <p>
        So the semicircle completes to the full <strong>Bernoulli circle</strong>: every set of odds appears twice, once with each orientation. The lower twin of the fair coin, at (½, −½), we call the <strong>anti-coin</strong>. Slide P around and watch its mirror twin P′ shadow it below:
      </p>
      <Slider value={theta} min={5} max={175} step={1} onChange={setTheta}
        label="where P sits on the upper half (P′ mirrors it below)"
        readout={`p=${p.toFixed(2)}   w=${fmt(w)} for P,  ${fmt(-w)} for P′`} />
      <MeasurePlot theta={theta} delta={0} showMirror showOrientation />
      <p style={{ marginTop: 14 }}>
        A physicist's favorite move is a <em>change of coordinate system</em> — to the center of mass, to the rotating frame, to the falling elevator. It pays off here too. Stand at the state and use its two triangle sides as your own axes: in that private frame, the center of the Bernoulli circle hangs at the <em>same</em> spot for every state — half of (√p, √(1−p)), half of exactly the square-root pair physicists call the <strong>probability amplitudes</strong>. The twins share these numbers to the last digit; what distinguishes them is the <em>handedness</em> of their frames. Now insist — as physics always may — that your frame keep one fixed handedness, and the sign takes care of itself: for the twin, one axis must then point <em>away</em> from its corner, and the coordinate along it comes out <strong>negative</strong>. A "negative length" is nothing deeper than that: an ordinary coordinate along an axis that faces the other way. Keep this picture — it is what every minus sign in the coming steps quietly means. The evidence room's playground <em>The view from the state</em> completes the story (follow the frame around one full lap, and there is a surprise).
      </p>
      <Notice>
        Is the twin a real state, or a bookkeeping fiction? The flip cannot say: the twins' triangles have identical side lengths, and side lengths are all a bet on heads-or-tails can feel. To tell P from P′ apart you must ask the coin a <em>different question</em> than heads-or-tails — whether such questions exist, and whether nature answers them, is exactly what the next steps settle.
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

// ================= STEP 7 : MEASURING IS ASKING =================
function StepMeasure() {
  const [theta, setTheta] = useState(50);
  const [delta, setDelta] = useState(0);
  const th = (theta * Math.PI) / 180, dl = (delta * Math.PI) / 180;
  const pPlus = Math.cos((th - dl) / 2) ** 2; // = squared distance from P to the opposite end
  const [labP, labM] = endLabels(delta);
  return (
    <div>
      <p>
        Time to say what "flipping the coin" really is — and to discover that it is only one question among many. Here is the rule of the game. You may never ask a state "where are you?". You may only pick a <strong>diameter</strong> of the circle and ask: "<em>which end?</em>" The state must answer with one of the diameter's two endpoints. The odds of each answer are already drawn in your picture: the chance of an answer is the <strong>squared distance to the opposite end</strong>. Far from "always T" means: probably answers H. (The right angle at P — Thales again, now for <em>any</em> diameter — plus Pythagoras makes the two squared chords sum to 1: the chances of the two answers add up automatically. For the horizontal diameter the chords are exactly the triangle sides √p and √(1−p) of step 6.)
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
        Rotate the question dial until the diameter passes straight through the state: suddenly the state answers with 100% certainty. <em>Every</em> state on the circle is completely certain about exactly one question — and spread out over all the others. The fair coin is certain too: not about heads-or-tails, but about coin-or-anti-coin. No state is "random" in itself. Randomness is a mismatch between the state and the question you happened to ask. And notice the payoff for step 6: a <em>tilted</em> diameter sees P and its mirror twin P′ at different distances from its ends — tilted questions can tell the twins apart. Why the flip alone never can, and how the twins finally split, is the next step.
      </Notice>
    </div>
  );
}

// ================= STEP 8 : WHY THE SIGN HIDES =================
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
        There is a sharper way to say it. From any state, the pair of chords to a diameter's two ends carries <em>two</em> kinds of information. First, their <strong>lengths</strong> — squared, these are the answer odds of step 7. Second, their <strong>orientation</strong>: walking end → state → end, you pass around the diameter one way or the other. The mirror keeps every length and reverses the orientation; the flip reads only lengths. Set the dial to 0° and look at the two shaded triangles below: identical side lengths, opposite turning arrows. Orientation is the <em>only</em> difference, and it is exactly what the sign stores. That is precisely the sign step 6 gave the band width: size from the lengths (twice the triangle's area), sign from the orientation. The signed band width keeps track of both; probabilities keep only the lengths.
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
        (Note this jump is <em>not</em> the learning of step 5 — there, flips could
        only move a belief that still had something to learn; a pure state has nothing
        left to learn about, yet it jumps anyway. That difference is where
        quantum truly begins.) And so <strong>no single question can reveal the whole of
        P</strong>: one
        diameter yields one number, but P is two numbers — you need two different
        questions to pin a state down.
      </p>
      <Notice>
        The lower half of the circle was never hidden from physics — only from one instrument, the coin flip, which is blind to it by symmetry. Classical probability is simply the physics of owning only that one instrument. You have nearly built a qubit: its states are the Bernoulli circle (with the disk of mixed beliefs inside), and its measurements are the diameters. One dial is still hidden — and it is the next step.
      </Notice>
    </div>
  );
}

// ================= STEP 9 : THE COMPLEX DIAL — THE BLOCH SPHERE =================
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
        One dial is still hidden. In step 6 the extra information was a <em>sign</em>: a two-position switch — the orientation of a triangle, one way around or the other — giving each state one mirror twin. Nature keeps more. For her, orientation is not a two-way choice but a matter of <em>degree</em>: the switch ripens into a freely turning <strong>dial</strong>, an angle φ that reaches every intermediate shade between a state and its twin, like the hand of a clock. (In the amplitude coordinates of the evidence room, φ is the turning angle of a <em>complex number</em> — "complex" is nothing but a sign that has learned to turn — step 6's reversed axis swinging around continuously instead of snapping. The picture below needs no coordinates at all.)
      </p>
      <p>
        The picture first lays everything on a table. Your Bernoulli circle lies flat, exactly as you know it — always T on the left, always H on the right, the state P on the far half, its mirror twin on the near half. Read the T–H diameter as an <strong>axle</strong> lying on the table. At each set of odds, a <span style={{ color: C.teal }}>wheel</span> stands upright on that axle, and the dial φ turns the state around it: at φ=0° the state rests at the far edge of the table (that is P); at φ=180° it rests at the near edge (exactly the mirror twin of step 6); and in between it swings <em>up above the table, or down below it</em>. One wheel for every p, and the circle inflates into a <strong>sphere</strong>: pure states on the glassy surface, mixed beliefs filling the ball, total ignorance at the center. Physicists draw the same object centered at zero with radius one and call it the <strong>Bloch sphere</strong>.
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
        T–H axle itself; the contrast question of step 8 is the table's far–near
        diameter; and the dial φ picks among the <em>infinitely many</em> tilted
        contrast questions rising out of the table. Every state on the surface is still
        perfectly certain about exactly one diameter — the one that runs through it.
      </p>
      <Notice>
        Everything you built survives in 3D: answer odds are still squared distances to a diameter's ends, mixing still pulls inward, purity is still the distance from the center. One phenomenon is new. With three axes, certainty about one diameter forces a 50/50 spread over every diameter perpendicular to it: no state can answer two independent questions sharply at the same time. That trade-off has a famous name: <strong>uncertainty</strong>. (This is Heisenberg's uncertainty principle, in its qubit form.) This ball, with its diameters, is the complete qubit — and you built it from a coin. One promise is still outstanding: nothing you own has ever <em>shown</em> you the sign or the dial — no flip can. The final step puts the ball, quite literally, in your hands.
      </Notice>
    </div>
  );
}


// ================= STEP 10 : THE BALL, IN YOUR HANDS =================
// Three-polarizer bench: lamp → P1(0°) → [optional middle sheet(θ)] → P2(90°)
function PolarizerBench({ theta, midIn }) {
  const W = 340, H = 150;
  const grid = [];
  for (let x = 20; x <= 320; x += 30) grid.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={H} stroke={C.grid} strokeWidth={0.8} />);
  for (let y = 15; y <= 145; y += 30) grid.push(<line key={"h" + y} x1={0} y1={y} x2={W} y2={y} stroke={C.grid} strokeWidth={0.8} />);
  const beamY = 75;
  const t = (theta * Math.PI) / 180;
  const Imid = midIn ? Math.cos(t) * Math.cos(t) : 0;
  const Iout = midIn ? Math.cos(t) * Math.cos(t) * Math.sin(t) * Math.sin(t) : 0;
  const sheet = (x, angDeg, color, label) => {
    const a = ((angDeg - 90) * Math.PI) / 180;
    return (
      <g key={label}>
        <rect x={x - 5} y={22} width={10} height={106} rx={4} fill="#fff" stroke={color} strokeWidth={2.5} />
        <line
          x1={x - 14 * Math.cos(a)} y1={beamY - 14 * Math.sin(a)}
          x2={x + 14 * Math.cos(a)} y2={beamY + 14 * Math.sin(a)}
          stroke={color} strokeWidth={3} strokeLinecap="round"
        />
        <text x={x} y={142} textAnchor="middle" fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>{label}</text>
      </g>
    );
  };
  const seg = (x1, x2, I) =>
    I > 0.004 ? (
      <line x1={x1} y1={beamY} x2={x2} y2={beamY} stroke={C.gold} strokeWidth={2 + 9 * I} strokeLinecap="round" opacity={0.45 + 0.55 * I} />
    ) : (
      <line x1={x1} y1={beamY} x2={x2} y2={beamY} stroke={C.gridBold} strokeWidth={1.4} strokeDasharray="3 5" />
    );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {grid}
      <text x={16} y={beamY - 22} fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>lamp</text>
      <line x1={14} y1={beamY} x2={74} y2={beamY} stroke={C.ink} strokeWidth={7} strokeLinecap="round" opacity={0.85} />
      {seg(80, midIn ? 164 : 250, 1)}
      {midIn && seg(176, 250, Imid)}
      {seg(262, 322, Iout)}
      {sheet(77, 0, C.ink, "P1 · 0°")}
      {midIn && sheet(170, theta, C.teal, `P · ${theta}°`)}
      {sheet(256, 90, C.ink, "P2 · 90°")}
      <text x={322} y={beamY - 14} textAnchor="end" fontFamily={mono} fontSize="9.5" fontWeight="600" fill={Iout > 0.004 ? C.gold : C.inkSoft}>
        {Iout > 0.004 ? `light! ${(100 * Iout).toFixed(0)}%` : "dark"}
      </text>
    </svg>
  );
}

// Single rotating sheet against two sources: a surface state vs the center of the ball
function AnalyzerDemo() {
  const [alpha, setAlpha] = useState(0);
  const t = (alpha * Math.PI) / 180;
  const pPure = Math.cos(t) * Math.cos(t);
  return (
    <div>
      <Slider
        value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — turn the sheet in your hand"
        readout={`α=${alpha}°`}
      />
      <ProbBars
        title="POLARIZED LIGHT — A SURFACE STATE"
        probs={[pPure, 1 - pPure]}
        labels={["through", "blocked"]}
      />
      <ProbBars
        title="PLAIN BULB — THE CENTER OF THE BALL"
        probs={[0.5, 0.5]}
        labels={["through", "blocked"]}
        dim
      />
    </div>
  );
}

function StepHands() {
  const [midIn, setMidIn] = useState(false);
  const [bs2, setBs2] = useState(false);
  return (
    <div>
      <p>
        Nine steps of construction on paper — and now the cash-out. The ball you assembled is not a
        diagram waiting for a quantum computer: it exists as everyday hardware, and you may already
        own three pieces of it. The hardware is <strong>polarized light</strong>, and the pieces are
        polarizing sunglasses. The dictionary is exact. Take horizontally and vertically polarized
        light as the two ends of the axle: always&nbsp;H and always&nbsp;T. The +45° diagonal is
        your fair <strong>coin</strong>; the −45° diagonal is the <strong>anti-coin</strong> of
        step&nbsp;6 — same 50/50 odds, opposite sign. And a quarter-turn of the dial away from
        both, at φ&nbsp;=&nbsp;±90° — the top and bottom of step&nbsp;9's standing wheel — sit{" "}
        <strong>left- and right-circular</strong> light, where the field corkscrews one way or the
        other as it flies. Three famous pairs of opposites, three perpendicular diameters of your
        ball. (The fine print of this dictionary — angle-doubling, and what perpendicular diameters
        mean — waits in the evidence room.)
      </p>
      <p>
        Now the first piece of evidence: an experiment you can run at the kitchen table with three
        sunglass lenses. Cross two polarizers, 0° and 90°: darkness — always-H is asked
        "always-T?", and the answer is never. Slide a third sheet <em>between</em> them, at 45°:
      </p>
      <PolarizerBench theta={45} midIn={midIn} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setMidIn((v) => !v)}>{midIn ? "remove middle sheet" : "insert middle sheet"}</Btn>
      </div>
      <p style={{ marginTop: 14 }}>
        Light comes back: you <em>added an obstacle</em> and got <em>more light</em>. No story in
        which filters merely remove light survives this; the story that survives is yours. The
        middle sheet asks the 45° question (step&nbsp;7) and prepares its answer — and two
        contributions of opposite sign, step&nbsp;6's "negative lengths" doing real work, no
        longer cancel. This is <strong>interference</strong>, running here on bright,{" "}
        <em>classical</em> light: Stokes and Poincaré's world. The full bench — Fresnel–Arago's
        1819 blindness law, the angle formula, the waveplates, and the bulb-versus-glare test that
        answers step&nbsp;2's mystery — is <strong>Playground G</strong> of the evidence room.
      </p>
      <p>
        The second piece of evidence is the one that makes it <em>quantum</em>, and it has a
        kitchen-table twin of its own, built from <strong>half-mirrors</strong>. One particle
        meets a half-silvered mirror: reflected or transmitted — two routes, the two ends of an
        axle. Two routes are one qubit. Each detector fires half the time; the particle seems to
        pick a route at random:
      </p>
      <MZPlot phi={0} mix={false} bs2={bs2} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setBs2((v) => !v)}>{bs2 ? "remove second half-mirror" : "insert second half-mirror"}</Btn>
      </div>
      <p style={{ marginTop: 14 }}>
        Insert a <em>second</em> half-mirror where the routes cross — and chance snaps into{" "}
        <em>certainty</em>: one detector now clicks always, the other never. Two 50/50 mirrors in a
        row should give 50/50; instead the routes' two contributions to the silent detector —
        opposite in sign, step&nbsp;6's negative lengths once more — cancel to nothing. And here
        is the quantum part: dim the source to <strong>single photons</strong> and nothing fades
        into noise. Each photon travels <em>both</em> routes as amplitudes, answers as one click,
        and the certainty survives, click by click — a particle behaving the way no particle we
        know behaves. The full bench — the path-length dial φ that sweeps fringes, and the
        mystery-mixture source whose fringes never come — is <strong>Playground H</strong>.
      </p>
      <Notice>
        This is what was hiding all along. The construction began with two kinds of not-knowing and
        a stubborn refusal to throw details away. Interference is the reward for the keeping: the
        sign of step&nbsp;6 and the dial of step&nbsp;9 — details no plain flip could see — reach
        out of the ledger and move light in your hands. Statistics with the details kept does not
        merely <em>describe</em> the world; it turns out to <em>be</em> the world's own
        bookkeeping. The epilogue takes stock — and the "gates" it promises are nothing more than
        these rotations, run in sequence.
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
        And that is the whole secret of the journey: nowhere along the way will we <em>add</em> anything quantum. We only keep adding <strong>detail</strong> — a second score here, a lost sign there, a hidden dial near the end — and after ten such steps the coin's plain statistics has grown, all by itself, into the strange and beautiful geometry physicists call a qubit. Quantum, it turns out, is not statistics plus magic. It is statistics with the details kept.
      </p>
      <Notice>
        This is a laboratory, not a lecture. Every step has coins to flip, guesses to commit to, and sliders to turn — the page is your lab bench. Flip first, guess second, read third: the geometry lands much harder when your own data drew it.
      </Notice>
    </div>
  );
}

// ================= EPILOGUE =================
function StepEpilogue({ openExtra }) {
  return (
    <div>
      <p>
        Look back at what you just did. You flipped a coin and admitted a bet. You met two kinds of not-knowing and invented two scores to keep them apart. The scores drew you a state space — the half-disk with the Bernoulli circle as its rim. Then plain geometry took over: keeping the orientation of one triangle put a twin below every belief, and one last hidden dial stood a wheel upright on every diameter. The half-disk became a disk; the disk became a ball. At no point did you assume anything quantum — you only refused to throw information away.
      </p>
      <p>
        That refusal, it turns out, is Nature's own policy. Your instrument — the bare coin flip — is blind by symmetry to everything below the mirror line, so classical probability contents itself with the upper half-disk. Nature is more <strong>inclusive</strong>. She keeps the lower half too, because she cares about <em>orientation</em>: same lengths but opposite turning count, for her, as two different states. And she is more inclusive still: orientation, for her, is not a two-way choice but a matter of <em>degree</em> — the ± switch ripens into a freely turning dial φ, with every intermediate shade between the twins allowed. Switch to dial, disk to ball.
      </p>
      <p>
        And here is the part that turns mathematics into physics: this ball is not a construction that lives only on paper — it <strong>lives in the wild</strong>. An electron's spin, a photon's polarization — the ball you held in step 10 — two energy levels of an atom: each one <em>is</em> this ball, dial and all. Nature provides the qubits; we only need to tame them. And taming means exactly the moves you learned: every diameter is an axis, every rotation a possible operation — these rotations are the <em>gates</em> of a quantum computer. More information in the state, and more ways to steer it.
      </p>
      <Roadmap />
      <p>
        Read the ladder one last time, left to right: two answers, an interval of bets, a half-disk of beliefs, a disk that remembers orientation, a ball that lets it turn. Each rung was forced by an honest question about an ordinary coin — what may I believe, and what am I throwing away?
      </p>
      {openExtra && (
        <div style={{ marginTop: 16, padding: "12px 14px", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft, marginBottom: 4 }}>
              THE EVIDENCE ROOM
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>
              A nice story, or an actual construction? Behind this door, the professionals' machinery — density matrices, spectral decomposition, statistical distances — is shown to fit your picture without remainder. Optional, playable, and heavier than the ten steps.
            </p>
          </div>
          <Btn onClick={() => openExtra("room")}>enter ⟩</Btn>
        </div>
      )}
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

// ============ PLAYGROUND A : HOW FAR APART ARE TWO COINS? ============
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
        Here is a question the tutorial has quietly prepared: how <em>far apart</em> are two coins? The lazy answer is the gap on the ruler, |p₁ − p₂|. Try to break it. A 0.50-coin and a 0.51-coin are almost impossible to tell apart — you would need thousands of flips. A 0.00-coin and a 0.01-coin? A <em>single head</em> settles it, because the first coin can never produce one. The same gap of 0.01 on the ruler, but very different real separations. The flat ruler is wrong: near the ends, it must stretch.
      </p>
      <p>
        The right ruler is one you already own. Lift both coins to the Bernoulli circle and walk <em>along the arc</em> between them. Near the middle, the circle runs almost flat, and the arc is barely longer than the gap. Near the ends, the circle turns steeply upward, and a tiny gap in p becomes a long walk.
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
        Try the two preset pairs: identical flat gaps, but a tenfold difference in circle distance. The circle is the honest ruler, because it predicts how many flips you actually need to tell the coins apart. This arc has a classical name: the <strong>Bhattacharyya angle</strong> between the two distributions (its straight-line chord is the Hellinger distance). The lesson: distances between coins are not measured through the interval, but along the Bernoulli circle. The circle is not decoration — it is the <em>ruler</em>. The next playground turns this claim into flips: you will race the two duels and count.
      </Notice>
    </div>
  );
}

// ============ PLAYGROUND B : COUNTING THE FLIPS (SPRT RACE) ============
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
        The previous playground made a promise that it has not yet kept: the circle, it claimed, predicts <em>how many flips</em> you need to tell two coins apart. Let us test that. Take two duels with the <strong>same flat-ruler gap of 0.10</strong>. Duel A: a 0.50-coin against a 0.60-coin. Duel B: a 0.00-coin against a 0.10-coin. In each duel, one of the two coins is secretly chosen and handed to you. You flip it and run the honest referee — Wald's <em>sequential test</em>: every flip adds its evidence, and the moment the total crosses a wall (set here for 5% error), the verdict is final. Watch which duel finishes first.
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
        <strong>Move 3 — one law behind both.</strong> For the best possible test, the error after n flips shrinks like the n-th power of the <em>overlap</em> between the two coins — the Bhattacharyya coefficient. And when you lift each coin to its angle θ = arccos √p on the circle, that overlap is simply a dot product of two unit vectors:
      </p>
      <Formula>
        √(p₁p₂) + √((1−p₁)(1−p₂)) = cos θ₁ cos θ₂ + sin θ₁ sin θ₂ = cos(θ₁ − θ₂)
      </Formula>
      <p>
        The overlap of two coins is the <em>cosine of the arc between them</em>. Errors shrink like cosⁿ(Δθ), so the number of flips needed for confidence ε is
      </p>
      <Formula>
        n ≈ ln(1/ε) / (−ln cos Δθ) ≈ 2 ln(1/ε) / (Δθ)²
      </Formula>
      <p>
        Flips ∝ 1/(arc length)². The ruler that counts flips is the arc; |p₁−p₂| appears nowhere. Check it against the race: duel A spans Δθ = {dthA.toFixed(3)}, duel B spans Δθ = {dthB.toFixed(3)}, so the circle predicts a flip ratio of ({dthB.toFixed(3)}/{dthA.toFixed(3)})² ≈ ×{((dthB / dthA) ** 2).toFixed(1)}{tally.races > 0 && avgB > 0 && (<span> — and your own races above measured ×{(avgA / avgB).toFixed(1)} (the sequential referee ends each duel a little differently, but the order of magnitude comes from the arc)</span>)}. The flat ruler predicted ×1.0.
      </p>
      <Notice>
        Why is the arc not just <em>a</em> good ruler but <em>the</em> ruler? Three reasons, each stronger than the last. <strong>Local:</strong> the distinguishing power of one flip is the Fisher information 1/(p(1−p)), which explodes at the edges — exactly the flat ruler's failure. Ask for the coordinate in which one flip buys the same progress everywhere, and you are forced to θ = arccos √p (statisticians met it long ago as the arcsine variance-stabilizing transformation). <strong>Global:</strong> over any finite separation, the operational cost is cos(Δθ) — equal arcs cost equal flips, wherever they sit on the circle. <strong>Unique:</strong> Čencov's theorem: any honest distance may only shrink when you post-process your data, and the Fisher metric — this arc — is the <em>only</em> Riemannian ruler (up to scale) with that property. Keep the cosine in mind: in the quantum picture it returns as the overlap ⟨ψ|φ⟩, and the arc becomes the Bures angle of the hemisphere playground.
      </Notice>
    </div>
  );
}

// ============ PLAYGROUND C : THE BERNOULLI HEMISPHERE ============
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
        One distance is still missing — the one the tutorial opened with. The fair coin and the mystery deterministic coin give the same odds, yet they are different beliefs: one on the rim, one at the center of the disk. So we need distances <em>inside</em> the disk. The flat disk fails for the same reason the flat interval did: on its rim it must reproduce the arcs of playground A, which straight lines on a flat sheet cannot do; and near the rim, tiny steps are again statistically enormous.
      </p>
      <p>
        The cure is the same as before — and here is exactly <em>why</em> it produces a hemisphere. Take any point in the disk and draw the diameter through it and the center. That diameter runs from rim to rim, so it has <strong>length 1</strong>: it is a fresh copy of the interval [0, 1], and your point sits on it at some position λ. But a diameter is a <em>measurement</em> (step 7), and the states along it are the mixtures of its two endpoint states — a Bernoulli family in λ (λ is even the probability of that measurement's ⊕ answer). Playground A told us what to do with a Bernoulli family: lift it by <strong>√(λ(1−λ))</strong>. Now do that to <em>every</em> diameter at once. Each one bends into its own Bernoulli semicircle; they all agree wherever they cross; they share one summit above the center (each has λ = ½ there); and together they form the <strong>Bernoulli hemisphere</strong> — the previous step's cure, applied to every direction of the disk at the same time. On this bowl, distance means the geodesic: the shortest walk along the surface. (Its official name: the <strong>Bures distance</strong>.)
      </p>
      <p>
        Below, your Bernoulli disk lies flat in space, exactly as you know it — always T on the left, always H on the right, the gold coin-half toward the back, the red anti-coin-half toward the front, and the purity circles drawn around the mystery coin at the center. Pull the <em>raise</em> slider and watch the construction happen: the teal T–H route <em>is</em> the base diameter bending into its Bernoulli semicircle, the purity circles rise into latitude rings, and the mystery coin climbs to the shared summit. The flat straight routes inflate into arcs, and their lengths grow into the true statistical distances.
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
        Here is the result the whole tutorial was waiting for: fully raised, the fair coin and the mystery deterministic coin — which give identical odds — sit exactly <strong>π/4 ≈ 0.785</strong> apart, while the flat disk would have claimed ½. Notice also that the shortest road from certain-heads to certain-tails now runs <em>over the summit</em>: through total ignorance. And spin the bowl: rotating the measurement basis turns everything rigidly, so every distance stays exactly the same. You have measured how different two beliefs are <em>without choosing any measurement at all</em>. That basis-independence is the strong hint that these distances belong to the beliefs themselves. (One caution: this bowl is the flat disk <em>bent into the right ruler</em> — its height is an aid for measuring, not the complex dial of step 9.)
      </Notice>
    </div>
  );
}


// ============ PLAYGROUND D : UNDER THE HOOD — THE MATRIX ============
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
  // squaring a pure amplitude vector
  const [alpha, setAlpha] = useState(35);
  const [flipped, setFlipped] = useState(false);
  const sgn = flipped ? -1 : 1;
  const a = sgn * Math.cos((alpha * Math.PI) / 180);
  const b = sgn * Math.sin((alpha * Math.PI) / 180);
  const Mpure = [[a * a, a * b], [a * b, b * b]];
  return (
    <div>
      <p>
        A look inside the machinery, for the mathematically curious — two secrets the pictures have been keeping. <strong>First, the maps.</strong> The whole tutorial used a pipeline: unit circle → Bernoulli circle → interval. The last part is the naive one: read the odds, p = a² and 1−p = b² — squaring each coordinate <em>separately</em>. But that map is built from degree-2 products, and there exist exactly <em>three</em> such products of (a, b): a², ab, and b². All three fit in one master object — the full multiplication table of ψ:
      </p>
      <Slider value={alpha} min={0} max={360} step={1} onChange={setAlpha}
        label="α — the amplitude vector" readout={`ψ = (${a.toFixed(2)}, ${b.toFixed(2)})`} />
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <MatrixBox m={Mpure} highlightRow0 title="ψ ⊗ ψ — THE MULTIPLICATION TABLE" />
        <Btn kind="outline" onClick={() => setFlipped(!flipped)}>flip the sign of ψ</Btn>
      </div>
      <p>
        The pipeline is really three <em>readings</em> of this one table. Read only the diagonal, (a², b²): that is the interval — the coin flip, blind to everything else. Read the highlighted <strong>top row, (a², ab) = (p, w)</strong>: that is the Bernoulli point — the diagonal <em>plus</em> the off-diagonal ab, which is exactly the band width (and nothing more is needed, since b² = 1−a²). So the Bernoulli circle is what you get by refusing to forget the off-diagonal. And press the sign button: ψ and −ψ produce the <em>identical</em> table — a table cannot remember a global sign, only relative ones. The double cover of playground D, finally explained mechanically. (Official names, for the curious: the table map is the degree-2 <em>Veronese map</em> into Sym², the space of symmetric tensors — and any degree-2 map, coordinate-squaring included, must factor through it.)
      </p>
      <p>
        <strong>Second, the disk was matrix-space all along.</strong> Mix beliefs, and the tables average entry by entry. The result is always a symmetric table whose diagonal sums to 1 — so it carries exactly two free numbers, its top row (p, w). Your Bernoulli disk <em>is</em> the space of these tables. Physicists call them <strong>density matrices</strong>. The tutorial has been doing matrix arithmetic in disguise: mixing = averaging tables (which is linear, hence the chords); superposition = adding vectors <em>before</em> squaring (hence a different floor).
      </p>
      <Notice>
        The <strong>multiplication table</strong> builds the circle and explains the missing sign; the <strong>density matrix</strong> is the disk, hiding inside the plain coordinates (p, w) you have plotted since step 3. Everything in this tutorial was tensor algebra, dressed up as coins. But the table keeps one more secret — it chooses its own diameter — and that secret has earned a playground of its own: the next one.
      </Notice>
    </div>
  );
}

// ============ PLAYGROUND E : THE STATE'S OWN AXES — SPECTRAL MEETS PCA ============
function CloudPlot({ beta, tt }) {
  // deterministic gaussian-ish cloud via Box–Muller on hashed uniforms
  const pts = useMemo(() => {
    const fract = (x) => x - Math.floor(x);
    const out = [];
    for (let i = 0; i < 46; i++) {
      const u1 = Math.max(1e-4, fract(Math.sin((i + 1) * 127.1) * 43758.5453));
      const u2 = fract(Math.sin((i + 1) * 311.7) * 26451.2937);
      const r = Math.sqrt(-2 * Math.log(u1));
      out.push([r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)]);
    }
    return out;
  }, []);
  const br = (beta * Math.PI) / 180;
  const sP = 52 * Math.sqrt(2 * (0.5 + tt));   // spread along the major axis
  const sM = 52 * Math.sqrt(2 * (0.5 - tt));   // spread along the minor axis
  const cx = 160, cy = 100;
  const rot = ([x, y]) => [
    cx + (x * sP * Math.cos(br) - y * sM * Math.sin(br)),
    cy - (x * sP * Math.sin(br) + y * sM * Math.cos(br)),
  ];
  const axis = (len, ang, color) => {
    const dx = len * Math.cos(ang), dy = len * Math.sin(ang);
    return <line x1={cx - dx} y1={cy + dy} x2={cx + dx} y2={cy - dy} stroke={color} strokeWidth={2.4} />;
  };
  return (
    <svg viewBox="0 0 320 200" style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {[40, 80, 120, 160].map((y) => <line key={y} x1={0} y1={y} x2={320} y2={y} stroke={C.grid} strokeWidth={1} />)}
      {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={x} x1={x} y1={0} x2={x} y2={200} stroke={C.grid} strokeWidth={1} />)}
      {pts.map((p, i) => {
        const [x, y] = rot(p);
        return <circle key={i} cx={x} cy={y} r={3} fill={C.inkSoft} opacity={0.55} />;
      })}
      {axis(1.55 * sP, br, C.gold)}
      {axis(1.55 * sM, br + Math.PI / 2, C.teal)}
      <text x={8} y={16} fontFamily={mono} fontSize="9.5" letterSpacing="1" fill={C.inkSoft}>THE SAME MOVE ON A DATA CLOUD — PCA</text>
      <text x={8} y={192} fontFamily={mono} fontSize="9.5" fill={C.gold}>major axis ∝ √λ₊</text>
      <text x={312} y={192} textAnchor="end" fontFamily={mono} fontSize="9.5" fill={C.teal}>minor axis ∝ √λ₋</text>
    </svg>
  );
}

function StepSpectral() {
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
        Step 5's mixer left a genuine ambiguity: many different chords pass through one interior point — many ensembles, one belief. The matrix breaks the tie. Its <strong>spectral decomposition</strong> selects one canonical splitting: the <strong>diameter through the state and the center</strong>. The endpoints are the <strong>eigen-states</strong> — the only decomposition into two <em>perpendicular</em>, antipodal coins — and the weights are the <strong>eigenvalues</strong> λ± = ½ ± t, exactly the λ that lifted this same diameter into the hemisphere of playground C. Steer the state and watch its matrix, its eigenvalues, and its own diameter move together:
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
      <p>
        Now the <strong>quantum dictionary</strong>, and it is shorter than its reputation. In quantum speech, a question — a diameter, step 7 — is called an <em>observable</em>. Its <strong>eigen-states</strong> are the diameter's two endpoints: the only states that answer that question with certainty. Its <strong>eigenvalues</strong> are the <em>measured values</em> — the numbers you attach to the two answers, say +1 for one end and −1 for the other; every measurement outcome is such an eigenvalue. The state's own matrix ρ uses the same word differently: <em>its</em> eigenvalues are the <strong>weights</strong> λ± with which the two outcomes appear when you ask the state its own diameter. One geometric object, two readings: the question's matrix stores the <em>values</em> on the endpoints, the state's matrix stores the <em>probabilities</em> over them. Whenever a physicist says "eigen-something," picture a diameter with its two endpoints — nothing more.
      </p>
      <p>
        And if this "find the object's own axes" move feels familiar, it should — data science performs it daily under the name <strong>PCA</strong>, principal component analysis. A cloud of data points has a covariance table: second moments, exactly the kind of table this room is built from. PCA diagonalizes it: the eigenvectors are the cloud's <em>own axes</em>, and the eigenvalues are the spread along each. The density matrix is such a table for a belief, so its spectral decomposition <em>is</em> PCA applied to a belief: the state's diameter is its principal axis, and λ± say how the belief's weight distributes along it. The sliders above steer this cloud too — same t, same β:
      </p>
      <CloudPlot beta={beta} tt={tt} />
      <Notice>
        Ensemble ambiguity is real — many chords through one point — but every state carries one distinguished chord: its own diameter. It is the measurement the state answers most decisively (step 7), the axis of its hemisphere lift (playground C), the eigen-basis of its matrix, and the principal axis of its cloud. Spectral decomposition is not exotic quantum machinery; it is the oldest move in data analysis — let the object choose its own axes — applied to a belief instead of a data set.
      </Notice>
    </div>
  );
}


// ================= THE EVIDENCE ROOM (landing page) =================
function StepEvidenceRoom({ openExtra }) {
  return (
    <div>
      <p>
        Is the tutorial a nice story, or an actual construction? It is a construction — and this room holds the proof: the professionals' machinery fits into your picture without leaving a remainder. The <strong>density matrix</strong>, quantum theory's standard bookkeeping object, turns out to be exactly the disk you drew, hiding inside the coordinates (p, w) you have plotted since step 3. Its <strong>spectral decomposition</strong> is geometry you already own: the diameter through a state, the two opposite endpoints as eigen-states, their weights as eigenvalues. And the statisticians' honest rulers — the <strong>Bhattacharyya angle</strong> between two coins, the <strong>Bures distance</strong> between two beliefs — are nothing but arc length on your circle and on the bowl it bends into; they even predict how many flips a duel takes. Even the <strong>probability amplitudes</strong> — quantum theory's square-root coordinates — turn out to be visible geometry: the center of the Bernoulli circle, seen from the private frame Thales hands every state. None of this was smuggled into the ten steps. All of it was waiting inside them.
      </p>
      <p>
        To hold that evidence in your own hands, eight playgrounds are waiting, and two history exhibits close the room. They are heavier than the ten steps — take them in any dose, or not at all.
      </p>
      {[
        { d: "How far apart are two coins? The flat ruler fails; the arc — the Bhattacharyya angle — is the honest one." },
        { d: "Counting the flips: race two duels with a sequential referee, and find flips ∝ 1/(arc length)²." },
        { d: "The Bernoulli hemisphere: bend the disk into a bowl — the Bures distance; fair ↔ mystery = π/4." },
        { d: "The view from the state: Thales hands every state a private frame; the circle's center hangs at half the amplitudes — and one full lap flips their sign." },
        { d: "Under the hood: the multiplication table builds the circle, and the density matrix is the disk." },
        { d: "Spectral decomposition in pictures: eigen-states, eigenvalues as measured values and weights — and why it is PCA for beliefs." },
        { d: "The polarizer bench, in full: Fresnel–Arago, the angle formula, waveplates — and the bulb-versus-glare test that answers step 2's mystery." },
        { d: "Two paths, one particle: half-mirrors as gates, path length as the dial — fringes from single clicks, and a center that never fringes." },
        { d: "The ball before quantum: Stokes 1852 and Poincaré 1892 — the sphere drawn from classical light, your band width as a Stokes coordinate." },
        { d: "The ball after quantum: von Neumann, Wolf, Bloch — how the interior became a statement about uncertainty, one ball got two names — and Bell posted the boundary." },
      ].map((c, i) => (
        <button
          key={i}
          onClick={() => openExtra(i)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            textAlign: "left", cursor: "pointer", background: "#fff",
            border: `1.5px solid ${C.gridBold}`, borderRadius: 8,
            padding: "8px 10px", marginBottom: 6, fontFamily: serif,
            fontSize: 14, color: C.ink,
          }}
        >
          <span style={{
            flex: "0 0 auto", width: 26, height: 26, borderRadius: "50%",
            border: `1.5px solid ${C.gridBold}`, background: C.goldSoft,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontFamily: mono, fontSize: 12, fontWeight: 600,
          }}>{EXTRAS[i].tag}</span>
          <span><strong>{EXTRAS[i].title}.</strong> {c.d}</span>
        </button>
      ))}
      <Notice>
        Each playground stands on its own, but they read best in order: first the ruler between coins (A), then its price in flips (B), then the ruler between beliefs (C), then the view from the state (D) — where the amplitudes come from, then the machinery under the hood (E), then the state's own axes (F), and finally the two light benches (G, H) where the ball runs in hardware — where the quantum words <em>eigen-state</em> and <em>eigenvalue</em> turn out to be old acquaintances from data analysis. Exhibits I and J are reading rather than play: the ball's double history, before and after quantum. The navigation at the top always brings you back to the main tutorial.
      </Notice>
    </div>
  );
}


// ================= PLAYGROUND G : THE POLARIZER BENCH =================
function StepPolarBench() {
  const [theta, setTheta] = useState(45);
  const [midIn, setMidIn] = useState(true);
  const t = (theta * Math.PI) / 180;
  const Iout = midIn ? Math.cos(t) ** 2 * Math.sin(t) ** 2 : 0;
  return (
    <div>
      <p>
        Step 10 pulled the aha; this bench supplies the machinery and the dictionary's fine print —
        all of it still <em>classical</em>: bright light, the ball of Stokes and Poincaré.
      </p>
      <p>
        The fine print first. Physical angles <strong>double</strong> on the ball (the <em>view
        from the state</em> playground derives it — its readout literally says Bernoulli angle =
        2α). So polarizer axes 90° apart in the lab are <em>antipodal</em> on the ball, and
        antipodal means <strong>perfectly distinguishable</strong>: one question separates them
        without fail. Perpendicular <em>diameters</em>, by contrast, mean{" "}
        <strong>mutually unbiased questions</strong> — certainty on one is a plain 50/50 on the
        others: step 9's uncertainty trade-off, wearing lab clothes. And note that <em>two</em>
        orientations appear in step 10's dictionary, not one. The sign you kept in step 6 was the
        turning direction of a triangle in the picture plane — it separates the two{" "}
        <em>diagonals</em>. The handedness of circular light is a turning direction in{" "}
        <em>time</em> — it separates the two <em>circulars</em>, one dial quarter-turn away. Two
        different shadows of one hidden dial; what they share is that the plain H-or-T flip can
        see neither.
      </p>
      <p>
        Which brings us to the 1819 blindness in full. Fresnel and Arago overlapped H- and V-polarized beams at every relative
        phase and found the brightness simply <em>adds</em> — never a fringe. What does change
        with the phase is the <em>polarization state</em> of the sum: diagonal, then circular,
        then the other diagonal — a walk once around step 9's standing wheel. The dial turns in
        plain sight; brightness, the plain flip, registers nothing — exactly the blindness steps 8
        and 9 predicted, on a lab bench two centuries ago.
      </p>
      <p>
        Now the bench, with the middle sheet's angle set free. A polarizer is a{" "}
        <strong>flip along a diameter, followed by preparation at the surviving end</strong> —
        step 7's "measuring is asking", plus the note that the state jumps to the answer it gave.
        The middle sheet asks the θ-question; the always-H state passes with probability cos²θ and
        leaves <em>prepared at angle θ</em> — a state that finally has an always-T component for
        the last sheet to find:
      </p>
      <PolarizerBench theta={theta} midIn={midIn} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setMidIn((v) => !v)}>{midIn ? "remove middle sheet" : "insert middle sheet"}</Btn>
      </div>
      {midIn && (
        <Slider
          value={theta} min={0} max={90} step={1} onChange={setTheta}
          label="θ — angle of the middle sheet"
          readout={`θ=${theta}° → ${(100 * Iout).toFixed(1)}% of the prepared light gets through`}
        />
      )}
      <Formula>share through = cos²θ · cos²(90°−θ)&nbsp;&nbsp;&nbsp;&nbsp;maximum ¼ at θ = 45°</Formula>
      <p>
        One question has been open since the mystery coins of step 2: is the <em>center</em> of the
        ball — total ignorance, the even mixture — truly a different thing from a surface state
        with the same 50/50 odds? The bench answers this too. An ordinary bulb emits unpolarized
        light: the center. Rotate a <em>single</em> sheet in front of it, and the transmitted
        brightness is a stubborn, flat one-half at every angle — the center is fixed by every
        rotation of the ball, so no turn of the sheet can make it breathe. In front of polarized
        light instead — glare off water, most laptop screens — the brightness swells and dies as
        cos². Same odds at one angle, completely different everywhere else: the two kinds of
        not-knowing, told apart by hardware.
      </p>
      <AnalyzerDemo />
      <p style={{ marginTop: 14 }}>
        (One honest bookkeeping note: a polarizer is a <em>question</em>, not a rotation — it
        collapses and prepares. The pure rotations of step 9 also exist as hardware: a{" "}
        <strong>waveplate</strong>, a slab of crystal that delays one component and simply turns
        the dial, measuring nothing. Optics labs are built from exactly these two parts: waveplates
        to rotate the ball, polarizers to flip it.)
      </p>
      <Notice>
        Everything on this bench runs on bright classical light: Stokes measured these very
        quantities in 1852, Poincaré drew their sphere in 1892 — the ball at work decades before
        quantum mechanics (Exhibits I and J tell that story). The quantum entrance is next door,
        in Playground H: the same curves, drawn one click at a time.
      </Notice>
    </div>
  );
}

// ================= PLAYGROUND H : TWO PATHS, ONE PARTICLE =================
function MZPlot({ phi, mix, bs2 = true }) {
  const W = 340, H = 190;
  const grid = [];
  for (let x = 20; x <= 320; x += 30) grid.push(<line key={"v" + x} x1={x} y1={0} x2={x} y2={H} stroke={C.grid} strokeWidth={0.8} />);
  for (let y = 10; y <= 180; y += 30) grid.push(<line key={"h" + y} x1={0} y1={y} x2={W} y2={y} stroke={C.grid} strokeWidth={0.8} />);
  const yLo = 150, yUp = 60, xBS1 = 85, xBS2 = 245;
  const pPlus = !bs2 ? 0.5 : mix ? 0.5 : Math.cos((phi * Math.PI) / 360) ** 2; // cos²(φ/2)
  const beam = (x1, y1, x2, y2, I) =>
    I > 0.01 ? (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gold} strokeWidth={1.5 + 6 * I} strokeLinecap="round" opacity={0.4 + 0.6 * I} />
    ) : (
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gridBold} strokeWidth={1.2} strokeDasharray="3 5" />
    );
  const halfMirror = (x, y) => (
    <line x1={x - 11} y1={y + 11} x2={x + 11} y2={y - 11} stroke={C.teal} strokeWidth={3.5} strokeLinecap="round" />
  );
  const mirror = (x, y) => (
    <line x1={x - 11} y1={y + 11} x2={x + 11} y2={y - 11} stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", background: "#fff", border: `1.5px solid ${C.gridBold}`, borderRadius: 8, display: "block" }}>
      {grid}
      <text x={14} y={yLo - 10} fontFamily={mono} fontSize="9.5" fill={C.inkSoft}>source</text>
      <line x1={14} y1={yLo} x2={xBS1 - 4} y2={yLo} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
      {/* arms: each carries half the light */}
      {beam(xBS1, yLo, xBS1, yUp, 0.5)}
      {beam(xBS1, yUp, xBS2, yUp, 0.5)}
      {beam(xBS1, yLo, xBS2, yLo, 0.5)}
      {beam(xBS2, yLo, xBS2, yUp, 0.5)}
      {/* outputs */}
      {beam(xBS2, yUp, 322, yUp, pPlus)}
      {beam(xBS2, yUp, xBS2, 16, 1 - pPlus)}
      {/* phase dial on upper arm */}
      <rect x={152} y={yUp - 13} width={26} height={26} rx={6} fill="#fff" stroke={C.gold} strokeWidth={2} />
      <text x={165} y={yUp + 5} textAnchor="middle" fontFamily={mono} fontSize="11" fontWeight="600" fill={C.gold}>φ</text>
      {halfMirror(xBS1, yLo)}
      {mirror(xBS1, yUp)}
      {mirror(xBS2, yLo)}
      {bs2 && halfMirror(xBS2, yUp)}
      <text x={xBS1} y={yLo + 24} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.teal}>½-mirror</text>
      {bs2 && <text x={xBS2} y={yUp + 26} textAnchor="middle" fontFamily={mono} fontSize="9" fill={C.teal}>½-mirror</text>}
      <text x={322} y={yUp - 10} textAnchor="end" fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>D⊕ {(100 * pPlus).toFixed(0)}%</text>
      <text x={xBS2 + 8} y={20} fontFamily={mono} fontSize="10" fontWeight="600" fill={C.ink}>D⊖ {(100 * (1 - pPlus)).toFixed(0)}%</text>
    </svg>
  );
}

function StepTwoPaths() {
  const [phi, setPhi] = useState(0);
  const [mix, setMix] = useState(false);
  const pPlus = mix ? 0.5 : Math.cos((phi * Math.PI) / 360) ** 2;
  return (
    <div>
      <p>
        Take one particle and a <strong>half-silvered mirror</strong>: reflected or transmitted,
        two routes. In ball language the dictionary is short. "Certainly route A" and "certainly
        route B" are the two ends of an axle; the half-mirror is a <strong>gate</strong> — a
        quarter-turn that carries "certainly A" to the fair coin of the routes; extra path length
        in one arm turns the <strong>dial</strong> φ; and bringing the routes back together on a
        second half-mirror in front of two detectors is the <strong>flip</strong>. Two routes, one
        qubit — this is the famous double-slit experiment, stripped to its skeleton.
      </p>
      <Slider value={phi} min={0} max={360} step={1} onChange={setPhi}
        label="φ — extra path length in the upper arm, as dial angle"
        readout={`φ=${phi}°  →  D⊕ odds ${mix ? "50% (mixture)" : (100 * pPlus).toFixed(0) + "%"}`} />
      <MZPlot phi={phi} mix={mix} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 4px" }}>
        <Btn onClick={() => setMix((v) => !v)}>{mix ? "source: mystery mixture — switch back" : "source: qubit — switch to mystery mixture"}</Btn>
      </div>
      <ProbBars title="DETECTOR ODDS" probs={[pPlus, 1 - pPlus]} labels={["D⊕ clicks", "D⊖ clicks"]} dim={mix} />
      <p style={{ marginTop: 14 }}>
        Set φ = 0: two 50/50 mirrors in a row, and yet one detector clicks <em>always</em>. The
        routes' two contributions to the other detector are equal and opposite — step 6's
        "negative lengths" again — and cancel to nothing. Sweep φ and the odds trace{" "}
        <strong>cos²(φ/2)</strong>: fringes, the dial made visible. Then press the source button.
        A mystery-mixture source sends each particle definitely down <em>one</em> route — you just
        don't know which: the center of the ball. The fringes die into a flat 50/50 at every φ,
        because the center is fixed by every rotation. One bench, two verdicts: the dial and the
        sign are physically real, and the interior of the ball really is a different kind of
        not-knowing.
      </p>
      <p>
        Now run it dim: photons one at a time, each a single click at a single detector — and the
        clicks still accumulate to cos²(φ/2). No "it took one route" story survives: each particle
        travels <em>both</em> routes as amplitudes and answers as one particle. And look at what
        you just operated: prepare, rotate, turn a dial, rotate, read. A choreographed sequence of
        gates on one qubit — you have run the smallest quantum computation there is.
      </p>
      <Notice>
        This bench and the polarizer bench are one machine in two costumes: routes instead of
        polarizations, half-mirrors instead of sheets — the same ball, carried by a different pair
        of opposites. Interferometers (this page) and waveplates-plus-polarizers (Playground G)
        are the two standard ways a laboratory rotates and flips the ball; a quantum computer is
        nothing but many such rotations, choreographed across many qubits.
      </Notice>
    </div>
  );
}

// ================= EXHIBIT I : THE BALL BEFORE QUANTUM =================
function StepBallBefore() {
  return (
    <div>
      <p>
        The ball has a birth certificate, and the date on it is a surprise:{" "}
        <strong>1892</strong>, half a century before quantum mechanics. Henri Poincaré drew it in
        his <em>Théorie mathématique de la lumière</em> as a map of the polarization states of
        light: linear polarizations around one great circle, the two circulars at opposite poles,
        elliptical states everywhere in between, opposite points for perfectly distinguishable
        states. He read it as <em>wave geometry</em> — a catalogue of the ellipse shapes a light
        field can trace — and his object was really only the glassy surface.
      </p>
      <p>
        The interior came from an older tradition. In <strong>1852</strong> George Stokes had
        defined four parameters of a light beam <em>operationally</em> — each an intensity
        difference you measure by holding up polarizers and comparing brightnesses: the H/V
        balance, the diagonal balance, the circular balance, and the total. Stokes's parameters
        handle <strong>partially polarized</strong> light with no extra machinery, and on the ball
        the degree of polarization becomes the <em>radius</em>: fully polarized light on the
        surface, partial light inside, and completely unpolarized light — total ignorance — at the
        dead center. Classical optics found the center of your ball without a word of quantum
        theory.
      </p>
      <p>
        Two of your own discoveries hang in this exhibit. First, the <strong>double cover</strong>:
        turn a polarizer by θ in the lab and the state moves by <em>2θ</em> on the sphere — a 90°
        physical turn lands on the antipode. The <em>view from the state</em> playground's angle-doubling, running in glass
        and brass. Second, the <strong>signed band width</strong>. Compute the ball's three axes
        from amplitudes (a, b·e<sup>iφ</sup>): a²−b², 2ab·cosφ, 2ab·sinφ — and these are, up to a
        factor of two, exactly Stokes's three balances. With real amplitudes your band width a·b is
        half the diagonal balance: not a resemblance but a <em>coordinate</em>, a measurable
        number, read off by precisely the 45° sheet of step&nbsp;10 — and measured by Stokes forty
        years before Poincaré drew the sphere.
      </p>
      <Notice>
        An honesty note: neither man read the ball as a ledger of <em>uncertainty</em>. To Stokes,
        partial polarization was a property of a beam; to Poincaré, the sphere was geometry. The
        reading you built — two distinguishable kinds of not-knowing, surface versus interior — was
        not available to them. That reading is the next exhibit.
      </Notice>
    </div>
  );
}

// ================= EXHIBIT J : THE BALL AFTER QUANTUM =================
function StepBallAfter() {
  return (
    <div>
      <p>
        The split this tutorial <em>starts</em> from — "I don't know which state it is in" versus
        "the state itself only gives odds" — is a twentieth-century achievement. Its machinery is
        John von Neumann's <strong>density matrix</strong> (1927): the object of playground E,
        which puts pure states on the surface and mixtures in the interior <em>for statistical
        reasons</em>, and makes "unpolarized light = the even mixture at the center" a theorem
        about uncertainty rather than a description of a beam. Optics arrived at the same structure
        under its own name — the <strong>coherency matrix</strong>, through Norbert Wiener and, in
        the 1950s, Emil Wolf's theory of coherence.
      </p>
      <p>
        In <strong>1946</strong> Felix Bloch, working on nuclear magnetic resonance, described the
        states of any two-level quantum system — and drew the same ball again. Mathematically
        identical, freshly relabeled: what optics calls the <strong>Poincaré sphere</strong>,
        quantum physics calls the <strong>Bloch sphere</strong>. One ball, two names, discovered
        twice.
      </p>
      <p>
        So what, in the end, is genuinely quantum? Not the ball. Two things, and it pays to name
        them exactly. First, the <em>individual event</em>: a bright beam's place on the ball is
        classical bookkeeping, but a single photon clicking through with cos² odds — and the state
        <em>jumping</em> to its answer, though a pure state had nothing left to learn (step 8) —
        is quantum proper. Second, and deeper: <em>composition</em>. One honest clause first: your
        construction shows that statistics <em>permits</em> the sign and the dial; it does not{" "}
        <em>force</em> them — keeping only the sign gives a disk, and that nature runs exactly{" "}
        <em>one</em> dial is her choice, not a theorem. Indeed, a single ball can always be
        explained away: Bell himself wrote down a hidden ledger — a secret list of answers to
        every diameter — that reproduces one qubit's statistics completely. For one ball, "statistics
        with the details kept" is not just a reading; it is provably sufficient.
      </p>
      <p>
        Then comes the boundary, and it has a theorem's sharpness. Take <em>two</em> balls sharing
        one state, and ask whether any single ledger — one joint probability distribution over the
        answers to all questions, consulted locally — could explain what nature returns.{" "}
        <strong>Bell's inequalities</strong> are exactly the conditions such a ledger must obey
        (Fine's theorem: they hold <em>if and only if</em> the joint distribution exists), and
        entangled pairs <em>violate</em> them. Nothing about probability itself breaks — every
        chosen pair of questions still gets honest odds — but the master table behind all the
        questions is gone. The details being kept no longer fit in any classical book. That next
        rung of the ladder — two balls, one state, and the ledger that cannot exist — is a
        tutorial of its own.
      </p>
      <Notice>
        Which makes the closing thesis of the tutorial precise. History drew the ball twice{" "}
        <em>before</em> understanding what it was a picture of: first as wave geometry, then as
        laboratory bookkeeping, and only afterwards as what you built it as from the very first
        step — a ledger of two kinds of uncertainty, with every detail kept. Your route was not the
        historical route, and that is the point: the meaning came last in history, and first in
        this tutorial. And the ladder does not stop here: one ball is statistics all the way up —
        Bell's theorem is the sign at the top saying the next rung is not.
      </Notice>
    </div>
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
  { title: "The mirror twins", comp: StepTwins, tag: "6", label: "STEP 6/10" },
  { title: "Measuring is asking", comp: StepMeasure, tag: "7", label: "STEP 7/10" },
  { title: "Why the sign hides", comp: StepSign, tag: "8", label: "STEP 8/10" },
  { title: "The complex dial — the Bloch sphere", comp: StepBloch, tag: "9", label: "STEP 9/10" },
  { title: "The ball, in your hands", comp: StepHands, tag: "10", label: "STEP 10/10" },
  { title: "The ball in the wild", comp: StepEpilogue, tag: "e", shape: "ket", label: "EPILOGUE" },
];

// hidden playgrounds — reachable only from the epilogue's evidence room
const EXTRAS = [
  { title: "How far apart are two coins?", comp: StepDistance, tag: "A", label: "PLAYGROUND A" },
  { title: "Counting the flips", comp: StepFlipCount, tag: "B", label: "PLAYGROUND B" },
  { title: "The Bernoulli hemisphere", comp: StepBures, tag: "C", label: "PLAYGROUND C" },
  { title: "The view from the state", comp: StepFrame, tag: "D", label: "PLAYGROUND D" },
  { title: "Under the hood — the matrix", comp: StepMatrix, tag: "E", label: "PLAYGROUND E" },
  { title: "The state's own axes", comp: StepSpectral, tag: "F", label: "PLAYGROUND F" },
  { title: "The polarizer bench", comp: StepPolarBench, tag: "G", label: "PLAYGROUND G" },
  { title: "Two paths, one particle", comp: StepTwoPaths, tag: "H", label: "PLAYGROUND H" },
  { title: "The ball before quantum", comp: StepBallBefore, tag: "I", label: "EXHIBIT I" },
  { title: "The ball after quantum", comp: StepBallAfter, tag: "J", label: "EXHIBIT J" },
];
const ROOM = { title: "The evidence room", comp: StepEvidenceRoom, label: "ADDITIONAL MATERIAL" };

export default function BuildYourOwnQubit() {
  const [step, setStep] = useState(0);
  const [extra, setExtra] = useState(null); // null = main; 'room' = evidence room; 0..3 = playgrounds
  const inRoom = extra === "room";
  const inPlayground = typeof extra === "number";
  const inExtra = inRoom || inPlayground;
  const cur = inRoom ? ROOM : inPlayground ? EXTRAS[extra] : STEPS[step];
  const Comp = cur.comp;
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
                active={!inExtra && i === step}
                visited={inExtra ? true : i < step}
                onClick={() => { setExtra(null); setStep(i); }}
                title={sInfo.title}
              />
            ) : (
              <button
                key={i}
                onClick={() => { setExtra(null); setStep(i); }}
                title={sInfo.title}
                style={{
                  width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
                  fontFamily: mono, fontSize: 12, fontWeight: 600, padding: 0,
                  border: `1.5px solid ${!inExtra && i === step ? C.gold : C.gridBold}`,
                  background: !inExtra && i === step ? C.gold : (inExtra || i < step) ? C.goldSoft : "#fff",
                  color: !inExtra && i === step ? "#fff" : C.ink,
                }}
              >
                {sInfo.tag}
              </button>
            )
          )}
        </nav>

        {inExtra && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, fontFamily: mono, fontSize: 11, letterSpacing: 1, color: C.inkSoft }}>
            <button
              onClick={() => setExtra(inRoom ? null : "room")}
              style={{ fontFamily: mono, fontSize: 11, padding: "4px 10px", borderRadius: 12, border: `1.5px solid ${C.gridBold}`, background: "#fff", color: C.ink, cursor: "pointer" }}
            >
              ⟨ {inRoom ? "back to the epilogue" : "evidence room"}
            </button>
            {inPlayground && "ADDITIONAL MATERIAL — THE EVIDENCE ROOM"}
          </div>
        )}

        <h2 style={{ fontSize: 21, fontWeight: 600, margin: "0 0 10px" }}>
          <span style={{ fontFamily: mono, fontSize: 13, color: C.gold, marginRight: 8 }}>
            {cur.label}
          </span>
          {cur.title}
        </h2>

        <Comp key={inExtra ? `x${extra}` : step} openExtra={(i) => setExtra(i)} />

        {/* nav */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          {inRoom ? (
            <>
              <Btn kind="outline" onClick={() => setExtra(null)}>← epilogue</Btn>
              <Btn onClick={() => setExtra(0)}>next →</Btn>
            </>
          ) : inPlayground ? (
            <>
              <Btn kind="outline" onClick={() => (extra === 0 ? setExtra("room") : setExtra(extra - 1))}>
                ← back
              </Btn>
              <Btn onClick={() => setExtra(extra + 1)} disabled={extra === EXTRAS.length - 1}>
                next →
              </Btn>
            </>
          ) : (
            <>
              <Btn kind="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                ← back
              </Btn>
              <Btn onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>
                next →
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
