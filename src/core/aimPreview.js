// X14 (owner: "aiming on PC stutters a lot… not out of bounds, but a lot on the fairway"): smooth aiming.
// Pure (no DOM, no Three.js): the game gives it the clock, so tests drive it frame by frame.
//
// 1. aimTurn: how far a held aim key / button turns in one frame (frame-rate independent, gentle
//    acceleration, Shift = fine).
// 2. createAimPreview: the K4 warning (play.shotWarning) without blocking a frame. The warning checks
//    the full-power arc (cheap: one flight to the first obstacle or the ground) and the ⚑ arc, and the
//    ⚑ power is a search over whole rolled-out shots (play.pinPower: ~20–40 ms on a long fairway, which
//    made every aim frame drop). Here that search runs as a job (play.pinPowerJob) a few ms per frame;
//    until it has the answer for the current aim the warning uses the last ⚑ power it found (the aim
//    moved a hair, the ⚑ barely moves). While the aim moves a new search starts at most every gapMs;
//    when the aim is still, the exact search for that aim runs at once, so the warning when the aim
//    stops is exactly play.shotWarning() (the same answer as before X14).
import { AIM_SPEED, AIM_SPEED_PUTT, AIM_TURN, AIM_PREVIEW } from './config.js';

// ∫ of the speed multiplier from 0 to s (piecewise linear, so the integral is exact)
function turnedK(s, T = AIM_TURN) {
  if (s <= 0) return 0;
  const a = Math.min(s, T.rampS);
  let k = T.startK * a + (1 - T.startK) * a * a / (2 * T.rampS);
  if (s <= T.rampS) return k;
  k += Math.min(s, T.fastAfterS) - T.rampS;
  if (s <= T.fastAfterS) return k;
  const b = Math.min(s - T.fastAfterS, T.fastRampS);
  k += b + (T.fastK - 1) * b * b / (2 * T.fastRampS);
  if (s - T.fastAfterS > T.fastRampS) k += T.fastK * (s - T.fastAfterS - T.fastRampS);
  return k;
}
// The speed multiplier after holding for s seconds (for tests and the debug overlay)
export function aimSpeedK(s, T = AIM_TURN) {
  if (s < T.rampS) return T.startK + (1 - T.startK) * Math.max(0, s) / T.rampS;
  if (s < T.fastAfterS) return 1;
  return Math.min(T.fastK, 1 + (T.fastK - 1) * (s - T.fastAfterS) / T.fastRampS);
}
// Radians (≥ 0) the aim turns in a frame of dt seconds, when it has been held `held` seconds before it
export function aimTurn(held, dt, { putter = false, fine = false } = {}) {
  const speed = (putter ? AIM_SPEED_PUTT : AIM_SPEED) * (fine ? AIM_TURN.fineK : 1);
  return speed * (turnedK(held + dt) - turnedK(held));
}

// play = createHolePlay(...); clock() = ms (performance.now in the game). update() once per frame while
// aiming returns the warning to show (null or play.shotWarning's shape).
export function createAimPreview(play, { clock, budgetMs = AIM_PREVIEW.budgetMs, gapMs = AIM_PREVIEW.gapMs } = {}) {
  let job = null;        // the ⚑ search running (play.pinPowerJob)
  let lastStart = -Infinity;
  let lastPin = null;    // { club, shot, value }: the latest ⚑ power found for this club and shot
  let prevAim = NaN, prevClub = -1;
  const shotKey = () => `${play.ball.pos.x}|${play.ball.pos.z}|${play.target.x}|${play.target.z}`;
  return {
    update() {
      const i = play.clubIdx, a = play.aim, shot = shotKey();
      const still = a === prevAim && i === prevClub;
      prevAim = a; prevClub = i;
      if (i === play.PUTTER || !play.obstacles.length) return play.shotWarning(); // cheap: null
      if (lastPin && (lastPin.club !== i || lastPin.shot !== shot)) lastPin = null;
      if (job && (job.club !== i || job.shot !== shot)) job = null;
      const known = play.pinPowerKnown(i);
      if (known !== undefined) { job = null; lastPin = { club: i, shot, value: known }; return play.shotWarning(i, a, known); }
      const now = clock();
      // Still: the exact search for this aim, now (an older one is dropped). Moving: let the running one
      // finish (its answer is a few frames old), and start the next at most every gapMs.
      if (job && still && job.aim !== a) job = null;
      if (!job && (still || !lastPin || now - lastStart >= gapMs)) {
        job = play.pinPowerJob(i); job.shot = shot; lastStart = now;
      }
      if (job) {
        const t0 = clock();
        if (job.step(() => clock() - t0 >= budgetMs)) { lastPin = { club: i, shot, value: job.value }; job = null; }
      }
      if (play.pinPowerKnown(i) !== undefined) return play.shotWarning(i, a, play.pinPowerKnown(i));
      // Not known yet: the last ⚑ found (or, before the first one, only the full-power arc)
      return play.shotWarning(i, a, lastPin ? lastPin.value : Infinity);
    },
    // Is the exact warning for the current aim known (no search pending)? For tests and tools.
    get settled() { return play.club.putter || !play.obstacles.length || play.pinPowerKnown(play.clubIdx) !== undefined; },
    reset() { job = null; lastPin = null; prevAim = NaN; prevClub = -1; lastStart = -Infinity; },
  };
}
