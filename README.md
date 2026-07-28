# Build your own qubit

An interactive tutorial: ten steps (+ six bonus) from a coin flip to a qubit.
No physics background needed — just a coin, a chart, and sixteen honest questions.

**Live version:** open `index.html` in any browser (loads React from a CDN), or enable
GitHub Pages on this repo (Settings → Pages → deploy from branch → root) to get a
shareable URL.

**Files**
- `index.html` — self-contained runnable tutorial (React via CDN + Babel standalone)
- `build-your-own-qubit.jsx` — the React source component (drop into any Vite/CRA project)

**New in this version:** the finale, "Bonus ⊗ Bonus: the summit is a Bell pair." The
mystery coin at the center — zero band width, maximal lift height — has spent every
internal knob, so its uncertainty can only be traded away *sideways*: to a partner.
A glued-coin factory fails (the ignorance just moves upstairs, still peekable); the
Bell factory succeeds, and an interactive tester proves it — rotate the question δ and
the glued pairs' agreement decays to a coin flip at 90° while the Bell pairs never
blink, even though every marginal stays pinned at 50%. Then the payoff: a purification
slider showing concurrence = 2√(det ρ) = twice the lift height — the bowl's vertical
coordinate was entanglement with the purifying partner all along, and the mystery coin,
purified honestly, is the Bell pair.
