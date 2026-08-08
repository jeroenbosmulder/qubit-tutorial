# Build your own qubit

An interactive tutorial: an introduction, ten steps, and an epilogue — from a coin
flip to a qubit. No physics background needed: just a coin, a chart, and a stubborn
refusal to be sloppy.

**Live version:** open `index.html` in any browser (loads React from a CDN), or enable
GitHub Pages on this repo (Settings → Pages → deploy from branch → root) to get a
shareable URL.

**Files**
- `index.html` — self-contained runnable tutorial (React via CDN + Babel standalone)
- `build-your-own-qubit.jsx` — the React source component (drop into any Vite/CRA project)
- `apple-touch-icon.png` — home-screen / favicon image (linked from index.html)

**New in this version:** the tutorial is refocused on the stepwise construction
(steps 1–10). Four of the former bonus steps return as an optional "evidence room"
reachable only from the epilogue (playgrounds A–D: Bhattacharyya distance, flip
counting, the Bures hemisphere, and the density matrix with its spectral
decomposition) — they never appear in the main navigation. The entanglement bonus
steps remain out. Two bookends frame the journey:

- an **introduction**, "Just statistics — at first" — the promise that nothing quantum
  will be added, only detail kept (Schrödinger's cat may stay asleep in its box);
- an **epilogue**, "The ball in the wild" — Nature's two acts of inclusiveness
  (keeping orientation: half-disk → disk; letting orientation turn freely: disk →
  ball), a five-stage roadmap graphic, and the qubits waiting in electrons, photons,
  and atoms.

A subtle touch in the navigation: the intro and epilogue buttons are shaped as a bra
and a ket, so the stepper reads ⟨i | 1 … 10 | e⟩.
