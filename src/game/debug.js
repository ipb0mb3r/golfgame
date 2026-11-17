// Debug overlay (backtick key, or ?debug=1 on a phone, Gate A C5): state, speed, surface, slope,
// wind, wetness, meter values, render quality, fps.
const REFRESH = 0.1; // seconds between redraws of the text
const GAP = 8;       // px between the overlay and the HUD panels next to it
const SHORT_SCREEN = '(max-height: 500px)'; // same as the media query in index.html

// H1 (X7): on a short screen (phone landscape) the overlay sits at the top, between the scorecard
// and the wind box / minimap, so it never covers the HUD. Elsewhere the CSS position is used.
function place(el) {
  const s = el.style;
  if (!window.matchMedia(SHORT_SCREEN).matches) { s.left = s.width = ''; return; }
  const info = document.getElementById('info').getBoundingClientRect();
  const side = document.getElementById('side').getBoundingClientRect();
  s.left = `${info.right + GAP}px`;
  s.width = `${Math.max(0, side.left - GAP - info.right - GAP)}px`;
}

export function createDebug(el) {
  let on = false, acc = 0, frames = 0, fps = 0;
  window.addEventListener('resize', () => { if (on) place(el); });
  return {
    get visible() { return on; },
    toggle() { on = !on; el.classList.toggle('hidden', !on); if (on) place(el); },
    // rawDt = real frame time; info() builds the lines only when the overlay is shown
    frame(rawDt, info) {
      frames++; acc += rawDt;
      if (acc < REFRESH) return;
      fps = frames / acc; frames = 0; acc = 0;
      if (on) el.textContent = info(fps);
    },
  };
}
