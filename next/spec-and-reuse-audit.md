# Coins to Qubit — Spec sheet and reuse audit

Companion to `storyboard-coins-to-qubit.md` v0.2 (frozen, 19 scenes). Section 1 is the architecture the spec assumes. Section 2 is the spec: one block per scene. Section 3 is the wire protocol and the hidden-secret roster. Section 4 is the reuse audit against `next/build-your-own-qubit.jsx`, `presentation/fifteen-steps.html` + `fifteen-figures.jsx`, and the Present Anything relay. Section 5 lists decisions still open and the build order.

---

## 1. Architecture (what "tutorial + presentation combined" means in code)

Three roles, two documents, one channel.

- **Presenter** = the `fifteen-steps.html` deck (deck-stage engine), reworked to the 19 scenes. Its figures are the *aggregate* plots: all phones' dots, named. The presenter also owns the "question" (polarizer angle, delay on/off) and the scene index.
- **Participant** = the tutorial (`next/`, React) opened in **room mode**: it follows the presenter's scene index, shows the same plot with the participant's own dot highlighted, and carries the controls (flip, measure, drag). So the new tutorial steps *are* the participant pages; outside a session the same steps work standalone with local simulation. One codebase, one set of step components.
- **Mirror** = the projector window (existing `present-sync.js` behaviour).
- **Channel** = Supabase Realtime broadcast, no tables (the `relay-supabase.js` built earlier for Present Anything). The deck's current `useSynced(figKey)` and the tutorial's new `useRoom()` both sit on this channel. See §3.

Design rule for robustness: phones never send *events*, they send their **current tally** (`{n, heads}` etc.) as a snapshot keyed by device id, last-write-wins. Late joins, reconnects and the presenter reloading all recover from the latest snapshot per phone; nothing is ever lost or double-counted.

---

## 2. Spec sheet

Per scene: **Phone plot** (what the participant sees) · **Control** (what they can do) · **Up** (snapshot the phone sends) · **Down** (state the presenter pushes) · **Presenter plot** (the aggregate on the big screen). "Same as phone" means the presenter plot is the phone plot with all dots.

### Part I — Coins

**S1 Two coins, one prediction**
- Phone plot: two coin faces; running fraction of H for the current round.
- Control: `Flip` (one flip per tap; ten taps per round). Round A: p = 0.5. Round B: p = `bias` from the roster (hidden).
- Up: `tally:{round, n, heads}`.
- Down: `scene:1`, `round:'A'|'B'`.
- Presenter plot: pooled fraction vs total flips, both rounds, converging to 0.5; live tick per incoming flip.

**S2 Two sources of uncertainty**
- Phone plot: your own bar for round A and round B, with the room's bars faded behind.
- Control: none (may re-flip round B to sharpen).
- Up: same tally as S1.
- Down: `scene:2`.
- Presenter plot: per-phone bars, tagged, round A row (all ≈ 0.5) above round B row (spread). Room mean marked on both.

**S3 One number is not enough → the bandwidth**
- Phone plot: half-plane p (x) × bandwidth (y); your round-A dot and round-B dot.
- Control: none.
- Up: nothing new (presenter computes p̂, σ̂ from the tally).
- Down: `scene:3`, `showBandAxis:true` (the y-axis appears on a click).
- Presenter plot: all round-A dots near (0.5, 0.5); round-B dots spread on the arc; then the pooled round-B belief as one big dot *inside*. This is aha 1: the semicircle is not drawn yet, the dots draw it.

**S4 The Bernoulli circle**
- Phone plot: Bernoulli semicircle with a dot riding it.
- Control: slider `p` (synced from the presenter by default; a phone may detach and drag its own).
- Up: `p` only if detached (optional, cosmetic).
- Down: `scene:4`, `p`.
- Presenter plot: the semicircle, the presenter's dot, S3's dots ghosted behind it. Technical panel "How far apart are two beliefs?" (arc = distance; uniqueness).

**S5 From the state's own point of view**
- Phone plot: left, Bernoulli circle with Thales triangle and the centre→state *pointer*; right, the state's frame with the *needle* (√p, √(1−p)) on perpendicular axes. One slider drives both; angle readout 2θ vs θ.
- Control: slider `p`.
- Up: none.
- Down: `scene:5`, `p`.
- Presenter plot: same as phone, larger; a click toggles "opposite → perpendicular" caption.

**S6 Two doubts** — presenter-only slide. Phone shows the two questions as text. Down: `scene:6`.

### Part II — Linear light

**S7 Two pairs of sunglasses**
- Phone plot: lamp → lens 1 → lens 2 → brightness meter; wave animation (H and V wiggles) between the lenses.
- Control: drag lens 2's angle (0–180°).
- Up: none.
- Down: `scene:7`.
- Presenter plot: the same bench, plus the transmitted fraction vs angle (cos²) filling in as the presenter drags.

**S8 The polarizer is the coin toss**
- Phone plot: photon source → H-sheet → detector; click log; running fraction. The beam's angle `theta` is hidden (from roster).
- Control: `Send 1 photon`, `Send 25`.
- Up: `beam:{n, passed}`.
- Down: `scene:8`, `question:0` (H-sheet).
- Presenter plot: per-phone fraction on the p-axis, tagged; a photon-stream animation per incoming click.

**S9 The half circle, in glass**
- Phone plot: (p̂, σ̂) of your beam on the Bernoulli half-plane; then reveal: your beam's angle θ next to your needle — overlaid, they coincide (aha 4b).
- Control: `Reveal my angle` (only after the presenter unlocks).
- Up: none new.
- Down: `scene:9`, `reveal:true`.
- Presenter plot: all beams' dots on the rim with Malus's curve overlaid; on reveal, every dot grows a small needle drawn *from the wave's actual wiggle direction* — they line up.

**S10 Mixed light**
- Phone plot: your beam's dot; a "noise" control that makes θ wander during measurement; dot sinks toward the centre.
- Control: slider `noise` (0–1); `Send 25` again.
- Up: `beam:{n, passed, noise}`.
- Down: `scene:10`, then `spotlight:[idA, idB]` — the presenter picks one 45°-beam phone and one fully noisy phone, both at p̂ ≈ 0.5.
- Presenter plot: the disk with interior dots; the two spotlighted dots pulsing at (0.5, 0.5) and (0.5, ~0): "fair coin, mystery coin".

**S11 Ask a different question**
- Phone plot: same bench as S8 but the sheet angle is now the presenter's; your dot jumps when the question changes. Below: the three-lens bench (0° | draggable middle | 90°).
- Control: `Send 25` after the question changes; drag the middle lens.
- Up: `beam:{question, n, passed}` (a tally per question; the phone keeps one per angle asked).
- Down: `scene:11`, `question:45`.
- Presenter plot: (1) dots jump: 45°-beam → 100%, noisy → 50%. (2) The plot *T₄₅ − ½ against σ̂*: a straight line through the origin, with sign (aha 6). (3) Needle projection animation: add components, then square. (4) Three-lens bench.

**S12 Angle doubling** — presenter-only technical slide: θ on the bench, 2θ on the circle, the 45° question as the circle rotated by 90°. Down: `scene:12`. Phone shows the readout only.

**S13 The twins split**
- Phone plot: your dot and, if you are in a mirrored pair, your twin's dot (tagged).
- Control: none.
- Up: none.
- Down: `scene:13`, `pairs:[[idA,idB],…]`, `question:0` then `question:45`.
- Presenter plot: full disk; under `question:0` the pair is one dot; under `question:45` it splits across the H–T diameter. Then the needle's quarter circle extends to a half circle with negative bandwidth.

### Part III — The missing dimension

**S14 The shadow**
- Phone plot: (left) field tip bouncing on a diameter; (right) a point circling and its shadow; (below) the needle with a clock on each component.
- Control: play/pause; a "offset the clocks" slider that is *locked* until S15.
- Up: none.
- Down: `scene:14`.
- Presenter plot: same, larger.

**S15 The impostor**
- Phone plot: your beam under three questions: H-sheet, 45°-sheet, and "delay + sheet". Tallies and estimates for each; your dot on the disk, then lifted. From here the roster gives each beam a hidden `delta` too.
- Control: `Send 25` per question; toggle the delay element.
- Up: `beam3:{H:{n,passed}, D:{n,passed}, C:{n,passed}}` (the Stokes tallies).
- Down: `scene:15`, `unlockDelay:true`.
- Presenter plot: the room's dots on the disk from H and 45° — several *pure* beams appear inside the disk, and the impostor beams sit at the centre; then the third tally lifts them out. Aha 8 lives in the moment the presenter says "these are pure" before lifting.

**S16 The ball**
- Phone plot: the 3D Bernoulli ball with your dot; sliders θ (odds) and δ (delay).
- Control: drag θ, δ.
- Up: none (the room's dots come from S15).
- Down: `scene:16`, `theta`, `phi` (the presenter's demo dot).
- Presenter plot: the delay dial sweeping the disk into the ball; all S15 dots placed on/in the ball, tagged.

### Part IV — Conclusion

**S17 The dictionary** — presenter-only slide; phone shows the ladder half-disk → disk → ball, rebit → qubit. Down: `scene:17`.

**S18 One photon at a time**
- Phone plot: "You are photon #k." A single big button; once pressed, your click (pass/blocked) for the presenter's current question.
- Control: `Be measured` (one press, then it greys out until the presenter resets).
- Up: `photon:{question, result}`.
- Down: `scene:18`, `question`, `armed:true` (resets everyone's button).
- Presenter plot: clicks arriving one at a time as dots on the detector row; the fraction converging; the ball with the prepared state and the question's diameter. Run it twice with two questions.

**S19 The room decoheres (optional)**
- Phone plot: the ball; your random delay contribution as an arrow.
- Control: `Add my noise` (draws a random δ).
- Up: `noise:{delta}`.
- Down: `scene:19`, `state:{theta, phi}`.
- Presenter plot: the presenter's pure dot; as noise arrives, the *average* Bloch vector shrinks toward the centre.

---

## 3. Protocol and roster

### 3.1 Messages

All on one broadcast channel, event `pf`, as in `relay-supabase.js`:

| Direction | Shape | Notes |
|---|---|---|
| presenter → all | `{type:'state', patch:{scene, round, question, p, theta, phi, reveal, unlockDelay, armed, spotlight, pairs}}` | Coalesced 80 ms batches; late joiners get a full snapshot on `sync-request`. |
| participant → presenter | `{type:'up', name:'hello', data:{tag}, from}` | On join; presenter answers with a roster slot (below). |
| participant → presenter | `{type:'up', name:'tally', data:{…}, from}` | Snapshot, not event. Payload names per scene: `tally`, `beam`, `beam3`, `photon`, `noise`. |
| presenter → one | `{type:'state', patch:{roster:{[from]:{slot, bias, theta, delta, twin}}}}` | Sent to everyone but keyed by `from`; each phone reads only its own entry. |

The presenter keeps `room = {[from]: {tag, slot, latestByScene}}` in memory and recomputes every aggregate from it. Reload-safe because phones re-send their latest snapshot on reconnect.

### 3.2 Roster (hidden secrets, 20 slots)

Assigned in join order; slots are designed, not random, so the plots fill evenly and the twin reveal is guaranteed.

| Slot | bias (S1 round B) | theta (S8+) | delta (S15+) | twin |
|---|---|---|---|---|
| 1, 2 | 0.05, 0.95 | 10°, 170° | 0°, 0° | 1↔2 |
| 3, 4 | 0.15, 0.85 | 30°, 150° | 0°, 0° | 3↔4 |
| 5, 6 | 0.25, 0.75 | 45°, 135° | 0°, 0° | 5↔6 (the fair coin / anti-coin pair) |
| 7, 8 | 0.35, 0.65 | 60°, 120° | 0°, 0° | 7↔8 |
| 9, 10 | 0.45, 0.55 | 80°, 100° | 0°, 0° | 9↔10 |
| 11, 12 | 0.50, 0.50 | 0°, 90° | 0°, 0° | — (always-H, always-T) |
| 13, 14 | 0.10, 0.90 | 45°, 45° | 90°, −90° | — (the two impostors: circular L/R) |
| 15, 16 | 0.30, 0.70 | 45°, 135° | 45°, 45° | — (elliptical) |
| 17–20 | 0.20, 0.40, 0.60, 0.80 | 20°, 70°, 110°, 160° | 0°, 90°, 30°, 60° | — |

Fewer than 20 phones: slots are taken in order, so pairs 1–10 always exist first. For S10 the presenter needs one phone at θ = 45°, δ = 0 (slot 5) and any phone at high noise — spotlight them by tag. Slots 13–14 are the S15 impostors; until S15 their delay is invisible (all linear-sheet tallies read 50%), which is exactly the point.

---

## 4. Reuse audit

Inventory read: tutorial v2 (`next/`: intro, steps 1–15, epilogue, playgrounds A–H, evidence room; `lab.html`), deck `fifteen-steps.html` (23 slides, figures `FigFlip … FigMZ` in `fifteen-figures.jsx`, synced by BroadcastChannel `three-arches-figs`), `present-sync.js`, `deck-stage.js`, and the Present Anything shell + `relay-supabase.js` from the earlier session (not in this repo).

Legend: **as is** — drop in; **adapt** — keep the component, change its data source or props; **new** — write it.

| Scene | Tutorial (jsx) | Deck (slide · figure) | Verdict |
|---|---|---|---|
| S1 | `Step1` (flipSeq, CoinChip) | 3–4 · `FigFlip` | **adapt**: flips come from `useRoom`, not `Math.random` on the presenter; the coin-flip counter demo already has the pooled-fraction plot. |
| S2 | `Step2` three mystery coins | 5 · `FigMystery` | **adapt**: three coins → one bias per phone; per-phone bars are new but trivial. |
| S3 | `Step3` + `StatePlot(scatter)` + Tech "honest doubt" | 6 · `FigScatter` | **adapt**: `StatePlot` as is, scatter fed from room; keep Step 3's bandwidth recipe text. |
| S4 | `Step4` + `StatePlot(point, showCenterVector)` | 7 · `FigArc` | **as is** for the plot. Technical note = playground A `StepDistance` (arc = distance, variance-vs-bandwidth toggle) **as is**, collapsed; playground C `StepBures` optional. |
| S5 | `NeedleView` (Step 4) + `StepFrame` (normalised needle, 2α readout) | 13 · `FigEmbed`, `FigThales` (interactive-figures) | **adapt**: put `StatePlot(showChords, showCenterVector)` and `NeedleView` side by side on one slider; keep `StepFrame`'s unit-circle normalisation as the technical panel only. |
| S6 | Step 3 tech note, Step 5 closing prose | 8 (last line) | **new** slide, text only. |
| S7 | `WaveDuo` (Step 6), `PolarizerBench(midIn=false)`, `lab.html` sunglasses text | 9 · `FigWave` | **adapt**: `PolarizerBench` already draws a two/three-lens bench; add a drag handle on lens 2 and the cos² readout. `WaveDuo` as is. |
| S8 | `PhotonCounter` (Step 6) | 10 · `FigPhoton` | **adapt**: `pPass` from the hidden roster θ; buttons send `beam` snapshot upstream. |
| S9 | `LightRunsChart`, `StatePlot(scatter)`, `StepFrame` payoff prose, `WaveDuo` front view | 11 · `FigDisk`; 16 "amplitudes were the light all along" | **adapt** the plots; **new** small overlay: the beam's front-view direction drawn on top of the needle (both exist, the overlay does not). |
| S10 | `StepLightDisk` (`LightBench` with `mix`), `StepMix` | 8 · `FigMix`, 11 | **adapt**: `mix` becomes the per-phone `noise`; the spotlight of two dots is **new** (trivial). `StepPolarBench` has the "centre vs surface 50/50" prose to reuse. |
| S11 | `StepMeasure`/`StepSign` (`MeasurePlot` with `delta` = question), `StepLightDisk` θ-sheet, `PolarizerBench(midIn)`, `StepHands` three-lens prose | 14 · `FigAsk`, 15 · `FigSign`, 21 "light resurrected" | **adapt**: question angle becomes presenter-owned (`Down`). The *T₄₅−½ vs σ̂* line plot is **new** (one scatter). Needle-projection animation is **new**, small. |
| S12 | `StepFrame` readout "Bernoulli angle = 2α", `StepPolarBench` fine print | index deck 12 "one turn, two laps" | **as is** as a technical slide. |
| S13 | `StepTwins` (`MeasurePlot showMirror`), `StepSign` | 12 · `FigTwin` | **adapt**: highlight the roster pair instead of a slider-driven P/P′. |
| S14 | `WaveDuo` front view, Step 6 flip switch | 17 | **new**: shadow-of-a-circle animation and the two clocks on the needle. Small, pure SVG. |
| S15 | `StepCircular` (`CircularBench` with plate), **`MysteryBeamLab`** (playground F: H sheet / 45° sheet / waveplate+sheet tallies with reveal) | 18 · `FigWaveDelay` | **as is**: `MysteryBeamLab` is already the per-phone crowd-tomography page; wire its hidden beam to the roster and its tallies upstream. Presenter aggregate on the disk-then-lift is **adapt** of `StatePlot` + `PolarBall`. |
| S16 | `StepBloch` (table + wheel, θ/φ), `PolarBall` (StepHands) | 19 · `FigBloch` | **as is**; add room dots to `PolarBall`. |
| S17 | `StepHands` dictionary, `Roadmap`, `StepEpilogue` | 22–23; index deck 16 | **as is** (trim text). |
| S18 | `PhotonCounter` logic; `StepTwoPaths` (`MZBall`, `MZPlot`) | 20 · `FigMZ` | **adapt**: one press per phone → one click; the aggregate detector row is **new** (trivial). Keep the Mach–Zehnder as an optional deeper slide, not the main beat. |
| S19 | `StepBloch` ball | — | **new**, small: average of Bloch vectors as phones send δ. |

### Infrastructure

| Piece | Exists | Verdict |
|---|---|---|
| Cross-device relay (`relay-supabase.js`, `relay-config.js`) | Present Anything session, not in this repo | **as is** — copy into `presentation/`. |
| Deck sync (`present-sync.js`, `useSynced` in `fifteen-figures.jsx`) | BroadcastChannel only | **adapt**: `useSynced` publishes to the relay as well as `figBC`; add `useRoom()` (presenter side) that reduces `up` snapshots into `room`. |
| Participant page | Present Anything shows the *deck* on phones | **change**: participant = tutorial in room mode (§1), not the deck. Add `?session=…&role=participant` handling and a `useRoom()` (participant side) to `next/`. |
| Invite (QR) button, session code, late-join snapshot | Present Anything shell | **as is**. |
| Speaker notes panel | `present-sync.js` (toggle N) | **as is** — put the storyboard's "Say" lines there. |
| Presenter roster / slot assignment | — | **new** (§3.2), ~60 lines. |
| `lab.html` kitchen lab | hardware | park; becomes the props layer later. |

Rough count: 12 scenes are adapt-with-existing-components, 4 are reuse as is, and the genuinely new UI is five small pieces (S9 overlay, S11 line plot + projection animation, S14 shadow/clocks, S18 detector row, S19 average) plus the roster and the two `useRoom` hooks.

---

## 5. Open decisions and build order

Decisions I made in the spec that you should confirm or overrule:
1. Participant = tutorial in room mode, presenter = deck (§1). The alternative (phones show the deck, as Present Anything does now) gives less to touch and no standalone tutorial.
2. Snapshots not events (§1). Slightly more per-message bytes, much simpler recovery.
3. Roster is designed, not random (§3.2).
4. Mach–Zehnder demoted to an optional slide after S18.

Build order (each slice tested with two phones before the next):
1. **Plumbing**: relay into `presentation/`, `useRoom` both sides, roster, invite/QR, S1 end to end. This is the coin-flip counter demo re-homed.
2. **Part I** (S2–S6): mostly `StatePlot` fed from the room.
3. **Part II** (S7–S13): the largest slice; presenter-owned `question` is the key new state.
4. **Parts III–IV** (S14–S19): `MysteryBeamLab` and `StepBloch` do most of the work.
5. Speaker notes from the storyboard; a dry run with the full roster simulated by a script that plays 20 fake phones.
