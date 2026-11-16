// Debug overlay (backtick key): state, speed, surface, slope, wind, wetness, meter values, fps.
const REFRESH = 0.1; // seconds between redraws of the text

export function createDebug(el) {
  let on = false, acc = 0, frames = 0, fps = 0;
  return {
    get visible() { return on; },
    toggle() { on = !on; el.classList.toggle('hidden', !on); },
    // rawDt = real frame time; info() builds the lines only when the overlay is shown
    frame(rawDt, info) {
      frames++; acc += rawDt;
      if (acc < REFRESH) return;
      fps = frames / acc; frames = 0; acc = 0;
      if (on) el.textContent = info(fps);
    },
  };
}
