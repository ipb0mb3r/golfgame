// Debug overlay (backtick key, or ?debug=1 on a phone, Gate A C5): state, speed, surface, slope,
// wind, wetness, meter values, render quality, fps.
const REFRESH = 0.1; // seconds between redraws of the text
const GAP = 8;       // px between the overlay and the HUD panels next to it
const SHORT_SCREEN = '(max-height: 500px)'; // same as the media query in index.html

// H1 (X7): on a short screen (phone landscape) the overlay sits at the top, between the scorecard
// and the wind box / minimap, so it never covers the HUD. Elsewhere it sits just above the bottom
// panel (meter, hint and TUNED badge, X10 Q1), and the CSS keeps it narrower than the screen.
// It is placed again on every refresh (X10 Q2): the panels change size when a hole loads.
// X11: it also stays clear of the ⏩ Skip button (R1), whose space is kept free even while Skip is
// hidden so the overlay doesn't jump when a shot starts. On a short screen it must end above the
// bottom panel (R2: 667x375, 568x320): if the text is too tall it gets a smaller font, and as a
// last resort the bottom lines are cut off (debug only, never over the HUD).
const FONT_STEPS = [10, 9, 8, 7]; // px, short screens only (the first is the CSS size)
const MIN_W = 180;                 // px: narrower than this isn't worth trying
const PAUSE_W = 44;                // px: the pause button (index.html #pauseBtn), beside the scorecard on short screens
let skipSize = { w: 110, h: 38 };  // px, measured whenever Skip is shown (it is hidden between shots)

function skipBox(bottom) {
  const btn = document.getElementById('skipBtn');
  const r = btn?.getBoundingClientRect();
  if (r && r.width > 0) skipSize = { w: r.width, h: r.height };
  // Skip sits right-aligned just above the bottom panel (index.html #skipBtn)
  return { left: bottom.right - skipSize.w, right: bottom.right, top: bottom.top - GAP - skipSize.h };
}

function place(el) {
  const s = el.style;
  const bottom = document.getElementById('bottom').getBoundingClientRect();
  const skip = skipBox(bottom);
  if (!window.matchMedia(SHORT_SCREEN).matches) {
    s.left = s.width = s.maxHeight = s.fontSize = s.overflow = '';
    // above the bottom panel and above Skip (it is on the right of the same row, and the overlay
    // may be as wide as the screen)
    s.bottom = `${Math.max(0, window.innerHeight - skip.top + GAP)}px`;
    return;
  }
  s.bottom = '';
  const info = document.getElementById('info').getBoundingClientRect();
  const side = document.getElementById('side').getBoundingClientRect();
  // Phase 7: the pause button sits right of the scorecard here; its place is kept free even while it is hidden
  const pause = document.getElementById('pauseBtn');
  const left = Math.max(info.right, pause ? info.right + GAP + PAUSE_W : 0) + GAP;
  // Two ways to fit: the whole gap between the scorecard and the minimap, ending above Skip where
  // they overlap sideways; or narrower, ending left of Skip, down to the bottom panel. The one that
  // keeps the bigger font wins (the wide one on a tie).
  const wide = { right: side.left - GAP };
  wide.floor = (left < skip.right && wide.right > skip.left) ? skip.top : bottom.top;
  const narrow = { right: Math.min(wide.right, skip.left - GAP), floor: bottom.top };
  let best = null;
  for (const c of [wide, narrow]) {
    if (c.right - left < MIN_W) continue;
    const r = fit(el, left, c.right, c.floor);
    if (!best || r.px > best.px || (r.fits && !best.fits)) best = { ...c, ...r };
  }
  if (!best) best = { ...wide, ...fit(el, left, wide.right, wide.floor) };
  fit(el, left, best.right, best.floor);
}

// Put the overlay between `left` and `right`, from its top down to `floor` at most, with the
// biggest font of FONT_STEPS that fits; if none does, the smallest and the bottom lines cut off.
function fit(el, left, right, floor) {
  const s = el.style;
  s.left = `${left}px`;
  s.width = `${Math.max(0, right - left - GAP)}px`;
  s.maxHeight = ''; s.overflow = '';
  const room = Math.max(0, floor - GAP - el.getBoundingClientRect().top);
  for (const px of FONT_STEPS) {
    s.fontSize = `${px}px`;
    if (el.scrollHeight <= room) return { px, fits: true };
  }
  s.maxHeight = `${room}px`; s.overflow = 'hidden';
  return { px: 0, fits: false };
}

export function createDebug(el) {
  let on = false, acc = 0, frames = 0, fps = 0;
  window.addEventListener('resize', () => { if (on) place(el); });
  return {
    get visible() { return on; },
    toggle() { on = !on; el.classList.toggle('hidden', !on); if (on) place(el); },
    // Phase 7: the Settings value when a game starts, closed in the menus
    show(v) { if (!!v !== on) this.toggle(); },
    // rawDt = real frame time; info() builds the lines only when the overlay is shown
    frame(rawDt, info) {
      frames++; acc += rawDt;
      if (acc < REFRESH) return;
      fps = frames / acc; frames = 0; acc = 0;
      if (on) { el.textContent = info(fps); place(el); }
    },
  };
}
