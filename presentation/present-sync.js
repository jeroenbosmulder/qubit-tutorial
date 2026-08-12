/* Presenter mirror for the Three Arches deck.
   Press P (or call openPresenterWindow()) in the main window to open a second
   window that shows the current slide without the sidebar and follows
   navigation live (BroadcastChannel, same browser). */
(function () {
  if (!('BroadcastChannel' in window)) return;
  var isMirror = /[?&]present/.test(location.search) || location.hash.indexOf('present') >= 0;
  var bc = new BroadcastChannel('three-arches-deck');
  var stage = function () { return document.querySelector('deck-stage'); };
  if (isMirror) {
    var apply = function () {
      var s = stage();
      if (!s) return void setTimeout(apply, 200);
      s.setAttribute('no-rail', '');
      bc.postMessage({ hello: true });
    };
    apply();
    bc.onmessage = function (e) {
      var d = e.data || {};
      if (typeof d.index === 'number') { var s = stage(); if (s && s.goTo) s.goTo(d.index); }
    };
  } else {
    var last = 0;
    document.addEventListener('slidechange', function (e) {
      if (e.detail) { last = e.detail.index; bc.postMessage({ index: last }); }
    });
    bc.onmessage = function (e) { if (e.data && e.data.hello) bc.postMessage({ index: last }); };
    window.openPresenterWindow = function () {
      window.open(location.pathname + '?present=1', 'threeArchesPresent', 'width=1280,height=760');
    };
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'p' || e.key === 'P') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        var t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return;
        window.openPresenterWindow();
      }
    });
  }
})();
