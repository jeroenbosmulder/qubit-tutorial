# Build your own qubit

An interactive tutorial: ten steps (+ five bonus) from a coin flip to a qubit.
No physics background needed — just a coin, a chart, and fifteen honest questions.

**Live version:** open `index.html` in any browser (loads React from a CDN), or enable
GitHub Pages on this repo (Settings → Pages → deploy from branch → root) to get a
shareable URL.

**Files**
- `index.html` — self-contained runnable tutorial (React via CDN + Babel standalone)
- `build-your-own-qubit.jsx` — the React source component (drop into any Vite/CRA project)

**New in this version:** a mathematical appendix to Bonus 1 ("counting the flips") — a
live sequential-test race between the 0.50-vs-0.60 and 0.00-vs-0.10 duels, the
Bhattacharyya-cosine law (flips ∝ 1/arc², since overlap = cos Δθ), and the argument
that the Bernoulli circle is the unique honest statistical ruler (Fisher information,
the arcsine variance-stabilizing coordinate, Čencov's theorem).
