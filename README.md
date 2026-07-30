# Build your own qubit

An interactive tutorial: ten steps (+ eight bonus) from a coin flip to a qubit.
No physics background needed — just a coin, a chart, and eighteen honest questions.

**Live version:** open `index.html` in any browser, or enable GitHub Pages on this
repo (Settings → Pages → deploy from branch → root) to get a shareable URL.

**Files**
- `index.html` — fully self-contained tutorial (React precompiled and inlined; no CDN, works offline)
- `build-your-own-qubit.jsx` — the React source component (drop into any Vite/CRA project)
- `apple-touch-icon.png` — home-screen icon for iOS/Android (linked from index.html)

**New in this version:** the closing trilogy: "Bonus ⊗ Bonus I & II" (the summit needs a partner; build the partner) and "Bonus: the cleverest factory — Bell's
test." The previous step's tester left one loophole: a classical factory could ship
every pair a complete answer sheet — a pre-agreed answer for every question angle —
and pass the same-question test perfectly. This step concedes the objection, then
sharpens the tester: ask the two halves *different* questions and score the CHSH game.
The learner designs their own answer sheet and watches every one of the sixteen hit
the wall S = ±2 (win rate ≤ 75%), then aims the Bell pair's cosine correlations at
tilt 45° and plays through the wall: S = 2√2, win rate ≈ 85% — the violation of
Bell's inequality that earned Aspect, Clauser, and Zeilinger the 2022 Nobel Prize in
Physics. The correlations are stored in no sheet, no half, no upstairs ledger — only
in the pair.
