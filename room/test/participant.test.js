// node room/test/participant.test.js — renders the tutorial in room mode (jsdom) against a presenter store.
// Requires: npm i react@18 react-dom@18 jsdom @babel/core @babel/preset-react (dev only; see room/README.md)
const path = require('path'), fs = require('fs'), assert = require('assert');
const tool = process.env.TOOL_DIR || path.join(__dirname, '..', '..', 'node_modules');
const req = (m) => require(path.join(tool, m));
const { JSDOM } = req('jsdom');
const babel = req('@babel/core');

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/next/index.html?session=TEST', pretendToBeVisual: true });
const window = dom.window;
global.window = window; global.document = window.document; global.navigator = window.navigator;
global.location = window.location; global.history = window.history;
global.sessionStorage = window.sessionStorage; global.BroadcastChannel = BroadcastChannel; window.BroadcastChannel = BroadcastChannel;
global.HTMLElement = window.HTMLElement; global.getComputedStyle = window.getComputedStyle;
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = req('react'), ReactDOM = req('react-dom/client'), { act } = req('react');
window.React = React; global.React = React; window.ReactDOM = ReactDOM;

require('../relay-config.js'); require('../relay-transport.js'); require('../room.js');
const Room = window.Room;

// compile the tutorial jsx into this scope
let src = fs.readFileSync(path.join(__dirname, '..', '..', 'next', 'build-your-own-qubit.jsx'), 'utf8')
  .replace('import { useState, useMemo, useEffect, useRef } from "react";', 'const { useState, useMemo, useEffect, useRef } = React;')
  .replace(/^export default (\w+);\s*$/m, '').replace('export default function ', 'function ');
const code = babel.transformSync(src, { presets: [[req('@babel/preset-react'), { runtime: 'classic', development: false }]], filename: 'tutorial.jsx', sourceType: 'script' }).code;
const App = new Function('React', 'Room', 'window', 'document', 'location', code + '\nreturn App;')(React, Room, window, document, location);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const byText = (re) => Array.from(document.querySelectorAll('button')).find((b) => re.test(b.textContent));
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };

(async () => {
  // the big screen
  const P = Room.createPresenter({ session: 'TEST', role: 'presenter', transport: window.RoomTransport.open({ session: 'TEST', role: 'presenter', clientId: 'pres' }) });
  P.publish({ scene: 0, round: 'A' }, true);

  const root = ReactDOM.createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(App)); });
  await act(async () => { await sleep(150); });
  assert(/joining session/.test(document.body.textContent), 'join screen shown');

  // pick a tag and join
  await click(byText(/🦊/)); await click(byText(/join as/));
  await act(async () => { await sleep(150); });
  assert.strictEqual(P.get().phones[Object.keys(P.get().phones)[0]].tag, '🦊', 'presenter sees the phone');
  assert(/seat #1/.test(document.body.textContent), 'phone shows its seat');

  // presenter moves to scene 1 → RoomStep1
  await act(async () => { P.publish({ scene: 1, round: 'A' }, true); await sleep(150); });
  assert(/Round A/.test(document.body.textContent), 'scene 1 round A rendered');
  for (let i = 0; i < 10; i++) await click(byText(/^Flip$/));
  await act(async () => { await sleep(120); });
  let T = P.tallies('A');
  assert.strictEqual(T.n, 10, 'ten flips arrived as a snapshot'); assert.strictEqual(T.phones[0].tag, '🦊');
  assert(/ten done/.test(document.body.textContent));

  // round B uses the secret bias (slot 1 → 0.05): 40 flips should be mostly tails
  await act(async () => { P.publish({ round: 'B' }, true); await sleep(120); });
  assert(/Round B/.test(document.body.textContent));
  for (let i = 0; i < 40; i++) await click(byText(/^Flip$/));
  await act(async () => { await sleep(120); });
  T = P.tallies('B'); assert.strictEqual(T.n, 40); assert(T.frac < 0.35, 'bias 0.05 shows: frac=' + T.frac);
  assert.strictEqual(P.tallies('A').n, 10, 'round A untouched');

  // presenter resets round B → phone clears and re-sends
  await act(async () => { P.resetRound('B'); await sleep(200); });
  assert.strictEqual(P.tallies('B').n, 0, 'reset propagated');
  assert(/0 flips/.test(document.body.textContent), 'phone shows 0 flips after reset');

  // a scene without a room step falls back to the tutorial step
  await act(async () => { P.publish({ scene: 4 }, true); await sleep(120); });
  assert(/SCENE 4/.test(document.body.textContent) && /not built yet/.test(document.body.textContent), 'fallback rendered');

  console.log('participant.test.js: all assertions passed');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
