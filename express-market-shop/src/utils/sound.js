let _ctx = null;

function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}

function tone(freq, start, dur, vol = 0.25, type = 'sine') {
  const c = ctx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g); g.connect(c.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(vol, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.01);
}

export function playSound(name) {
  try {
    switch (name) {
      case 'cash':    tone(880, 0, 0.06); tone(1100, 0.07, 0.10); break;
      case 'place':   tone(300, 0, 0.05, 0.15, 'square'); break;
      case 'order':   tone(440, 0, 0.08); tone(660, 0.09, 0.10); break;
      case 'serve':   tone(523, 0, 0.07); tone(659, 0.08, 0.07); tone(784, 0.16, 0.12); break;
      case 'upgrade': tone(440, 0, 0.10); tone(554, 0.11, 0.10); tone(659, 0.22, 0.10); tone(880, 0.33, 0.15); break;
      case 'save':    tone(660, 0, 0.06); tone(880, 0.07, 0.12); break;
    }
  } catch (_) {}
}
