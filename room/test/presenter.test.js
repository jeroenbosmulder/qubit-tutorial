// node room/test/presenter.test.js — renders the presenter figures (jsdom) with three simulated phones.
const path = require('path'), fs = require('fs'), assert = require('assert');
const tool = process.env.TOOL_DIR || path.join(__dirname, '..', '..', 'node_modules');
const req = (m) => require(path.join(tool, m));
const { JSDOM } = req('jsdom'); const babel = req('@babel/core');
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/presentation/room-slice1.dc.html?session=TEST', pretendToBeVisual: true });
const window = dom.window;
global.window = window; global.document = window.document; global.navigator = window.navigator; global.location = window.location;
global.history = window.history; global.sessionStorage = window.sessionStorage; global.BroadcastChannel = BroadcastChannel; window.BroadcastChannel = BroadcastChannel;
global.IS_REACT_ACT_ENVIRONMENT = true; global.confirm = () => false;
const React = req('react'), ReactDOM = req('react-dom/client'), { act } = req('react');
window.React = React; global.React = React;
require('../relay-config.js'); require('../relay-transport.js'); require('../room.js');
const Room = window.Room;

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'presentation', 'room-figures.jsx'), 'utf8');
const code = babel.transformSync(src, { presets: [[req('@babel/preset-react'), { runtime: 'classic' }]], filename: 'room-figures.jsx', sourceType: 'script' }).code;
const mod = { exports: {} };
new Function('React', 'Room', 'window', 'document', 'location', 'navigator', 'module', 'confirm', code)(React, Room, window, document, location, navigator, mod, global.confirm);
const { FigJoin, FigFlipRoom } = mod.exports;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const byText = (re) => Array.from(document.querySelectorAll('button')).find((b) => re.test(b.textContent));
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };

(async () => {
  const phone = (id, tag) => { const p = Room.createParticipant({ session: 'TEST', clientId: id, transport: window.RoomTransport.open({ session: 'TEST', role: 'participant', clientId: id }) }); p.join(tag); return p; };
  const root = ReactDOM.createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(FigJoin)); });
  await act(async () => { await sleep(400); });               // presenter announces state
  const a = phone('a', '🦊'), b = phone('b', '🐙'), c = phone('c', '🦉');
  await act(async () => { await sleep(150); });
  assert(/3 joined/.test(document.body.textContent), 'join figure counts phones: ' + document.body.textContent.slice(0, 120));
  assert(/#1/.test(document.body.textContent) && /#3/.test(document.body.textContent), 'seat numbers shown');
  assert.strictEqual(a.get().me.slot, 1); assert.strictEqual(c.get().me.theta, 30);

  await act(async () => { root.render(React.createElement(FigFlipRoom)); await sleep(50); });
  assert(/round A/.test(document.body.textContent));
  a.send('tally', { A: { n: 10, heads: 6 }, B: { n: 0, heads: 0 } });
  b.send('tally', { A: { n: 10, heads: 4 }, B: { n: 0, heads: 0 } });
  await act(async () => { await sleep(80); });
  c.send('tally', { A: { n: 10, heads: 5 }, B: { n: 0, heads: 0 } });
  await act(async () => { await sleep(80); });
  const txt = document.body.textContent;
  assert(/30 flips from 3 phones/.test(txt), 'pooled count: ' + txt.slice(0, 200));
  assert(/0\.50/.test(txt), 'pooled fraction shown');
  const P = Room.presenter();
  assert((P.get().memo['hist:A'] || []).length >= 2, 'history accumulates in the store');
  assert(document.querySelectorAll('polyline').length === 1, 'running line drawn');

  await click(byText(/round B/)); await act(async () => { await sleep(120); });
  assert.strictEqual(a.get().state.round, 'B', 'phones follow the round button');
  assert(/round B/.test(document.body.textContent) && /no flips yet/.test(document.body.textContent));
  a.send('tally', { A: { n: 10, heads: 6 }, B: { n: 7, heads: 1 } });
  await act(async () => { await sleep(80); });
  assert(/7 flips from 1 phones/.test(document.body.textContent));
  await click(byText(/reset round B/)); await act(async () => { await sleep(120); });
  assert(/no flips yet/.test(document.body.textContent), 'reset clears the plot');
  assert.strictEqual(a.get().state.resetToken, 1);

  console.log('presenter.test.js: all assertions passed');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
