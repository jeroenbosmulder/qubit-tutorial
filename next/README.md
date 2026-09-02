# Build your own qubit

An interactive tutorial: an introduction, fifteen steps, and an epilogue — from a coin
flip to a qubit. No physics background needed: just a coin, a chart, and a stubborn
refusal to be sloppy.

**Live version:** open `index.html` in any browser (loads React from a CDN), or enable
GitHub Pages on this repo (Settings → Pages → deploy from branch → root) to get a
shareable URL.

**Files**
- `index.html` — self-contained runnable tutorial (React via CDN + Babel standalone)
- `build-your-own-qubit.jsx` — the React source component (drop into any Vite/CRA project)
- `apple-touch-icon.png` — home-screen / favicon image (linked from index.html)

**New in this version:** steps 6 and 12 gained a combined wave visual (`WaveDuo`):
the familiar side-on wiggles + front view on top, and below it the same wave as a
draggable 3D object in space — H in the horizontal plane, V in the vertical plane,
their vector sum as the dark curve, with dashed component stems, the unit circle of
amplitude pairs on the front plane, and a subtle ring marking the turning point
(a, b). Preset buttons (3D / side / head-on) morph between the views; both panels
run on one shared clock, so the front-view dot, the wiggles, and the 3D tip are
phase-locked (fixing a half-period offset that hid in the original 2D panel). At
δ=90° in step 12 the 3D wave is the circular-polarization corkscrew itself.
