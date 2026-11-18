// HUD: scorecard panel, club box, swing meter, wind arrow, flash messages and the cards.
import { M2Y, METER_MIN, MPS_TO_MPH, TIMING, HUD, TUNE, POWER_SECTIONS } from '../core/config.js';
import { sweetHalfWidth, swingClicks } from '../core/swing.js';
import { isAimingState } from '../core/states.js';
import { minimapTicks } from '../core/play.js';
import { dist2D, dirFromAim, rightFromAim, holeLength } from '../core/vec.js';

const $ = id => document.getElementById(id);
export const yd = m => Math.round(m * M2Y);
const HINTS = {
  aim: 'Aim and pick a club, then click or press Space to swing',
  power: 'Click again to set POWER',
  grace: 'MAX! Click now for full power',
  nopower: 'No power! Click for a mini shot, or wait to cancel',
  accuracy: 'Click on the green line for a straight shot!',
};
// S14: a putt is 2 clicks (start, power); the hints that differ
const PUTT_HINTS = {
  ...HINTS,
  aim: 'Putt: click to start, click again to set power',
  power: 'Click again to set POWER (the putt rolls straight)',
  nopower: 'No power! Click for a mini putt, or wait to cancel',
};
// S18: where the default aim points (PM on PR #27: how a new player learns the aim rule).
// S19: 'chip' = the cup because the ball is within CHIP_AIM_RANGE of it (any surface), and the line says so.
// K4: the hint while aiming when the shot would hit an obstacle (play.aimWarning)
const WARN_TEXT = { trunk: 'a tree', leaves: 'the trees', boulder: 'a rock' };
const WARN_AT = { pin: 'at ⚑ power', full: 'at full power', both: 'at ⚑ and full power' }; // PM on PR #33: say which
export const warnHint = w => `⚠ ${WARN_AT[w.at] ?? ''} this shot hits ${WARN_TEXT[w.kind]} (${yd(w.dist)} yd): aim around it or change your power`.replace('⚠ a', '⚠ A');
const AIM_TEXT = { cup: () => 'the cup', chip: () => `the cup (within ${yd(TUNE.CHIP_AIM_RANGE)} yd)`, green: () => 'green centre', tee: () => 'straight ahead (tee)', spot: () => 'test spot target' }; // spot: a scenario's aimAt (K9)
const FLASH_BAND = 60, FLASH_MIN_W = 120; // px: panels this close above/below the flash text count as beside it

export function holeHref(id) { return `?hole=${encodeURIComponent(id)}`; }

// Fill in the page for this hole: titles, intro card, links, minimap size.
// In a round (Phase 6) `round` = { number, of }: the hole is numbered by its place in the round
// ("Hole 4 of 9"), and the links to other holes are hidden (the round moves on by itself, A6).
// links = false hides them too (a hole started from the menu: the menu is the way to other holes, M0).
// green = the green style actually painted (the putt-grid setting, Phase 7): a step's {grid} is replaced by
// the hole's `intro.grid` sentence only when the green has a grid, so the card never mentions a grid you can't see.
export function setupHolePage(hole, round = null, { links = true, green = hole.scenery.paint.green } = {}) {
  const yards = yd(holeLength(hole)); // K12: along the play line on a dogleg
  const num = round ? round.number : hole.number;
  document.title = round ? `Pocket Links: Hole ${num} of ${round.of}` : `Pocket Links: Hole ${num}`;
  $('holeTitle').textContent = round ? `HOLE ${num}/${round.of} · PAR ${hole.par}` : `HOLE ${num} · PAR ${hole.par}`;
  const it = hole.intro;
  $('introSub').innerHTML = (round ? `Hole ${num} of ${round.of} · ` : `Hole ${num} · `) + it.subtitle.replace('{yards}', yards);
  const gridLine = green === 'grid' ? (it.grid ?? '') : '';
  $('introSteps').innerHTML = it.steps.map(s => `<li>${s.replaceAll('{grid}', gridLine)}</li>`).join('');
  $('introBlurb').textContent = it.blurb;
  for (const [id, link] of [['introLink', it.link], ['resultLink', it.resultLink]]) {
    const a = $(id);
    if (link && !round && links) { a.href = holeHref(link.hole); a.textContent = link.text; a.parentElement.style.display = ''; } else a.parentElement.style.display = 'none';
  }
  // Phase 6 (PM on PR #38): holes 2+ of a round open with a compact card instead of the full intro
  if (round) {
    const straight = yd(dist2D(hole.tee, hole.cup));
    $('holeCardTitle').textContent = `Hole ${num} of ${round.of}`;
    $('holeCardSub').textContent = `Par ${hole.par} · ${straight} yd` + (yards > straight ? ` · plays ${yards} yd` : '');
    $('holeCardLine').textContent = it.tagline ?? it.blurb.split(/(?<=\.)\s/)[0];
  }
  // S22 (owner on PR #53): the minimap is MINIMAP_SCALE × the hole's size (canvas pixels too, so it stays sharp)
  const mm = hole.scenery.minimap, root = document.documentElement.style, k = TUNE.MINIMAP_SCALE;
  const px = v => Math.round(v * k);
  $('minimap').width = px(mm.w); $('minimap').height = px(mm.h);
  root.setProperty('--mm-w', `${px(mm.w)}px`);
  root.setProperty('--mm-mobile-w', `${px(mm.mobileW)}px`);
  root.setProperty('--mm-mobile-h', `${px(mm.mobileH)}px`);
  root.setProperty('--mm-h', `${px(mm.h)}px`);
  fitMinimap();
}

// S22 (owner on PR #53): the bigger minimap keeps its shape and shrinks only as far as it must to end
// above the bottom panel (meter, controls), where it is above it; a minimap right of the panel (a wide
// landscape screen) may run down to the bottom edge. ⏩ Skip may sit over its corner while the ball
// moves (PM on PR #53: Skip only shows then; a bigger minimap matters more). Called when a
// hole loads and on every resize (session.resize). Before S22 a CSS rule capped it at 100vh − 240 px.
export function fitMinimap() {
  const mm = $('minimap'), bottom = $('bottom');
  if (!mm || !bottom) return;
  mm.style.width = mm.style.height = '';
  const r = mm.getBoundingClientRect(), b = bottom.getBoundingClientRect();
  if (!r.height) return;
  const { gap, minH } = HUD.minimapFit;
  const aspect = r.width / r.height, screenFloor = (window.visualViewport?.height ?? window.innerHeight) - gap;
  // The tallest it can be at a given height h: its width w = h × aspect, right edge fixed
  const fits = h => {
    const left = r.right - h * aspect;
    let floor = screenFloor;
    if (left < b.right) floor = Math.min(floor, b.top - gap); // over the panel
    return r.top + h <= floor;
  };
  if (fits(r.height)) return;
  // Two ways to fit: stay above the panel, or get narrow enough to sit right of it (wide landscape)
  let lo = 0, hi = r.height;
  for (let k = 0; k < 20; k++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  const narrow = Math.min(r.height, (r.right - b.right - gap) / aspect, screenFloor - r.top);
  const h = Math.max(lo, narrow > 0 ? narrow : 0, minH);
  mm.style.height = `${Math.floor(h)}px`; mm.style.width = `${Math.floor(h * aspect)}px`;
}

export function createHud(play) {
  const { cup, terrain, surfaces, wind, bag } = play;
  let msgTimer = 0;
  // Where a meter value sits on the bar (%). The left end is METER_MIN (the accuracy side), or 0 for a
  // putt (S14: no accuracy side, see layoutBar)
  let barMin = METER_MIN;
  const meterPct = p => ((p - barMin) / (1 - barMin)) * 100;
  // S22 (owner on PR #53): the accuracy window's thin edge lines, from config
  const rs = document.documentElement.style, af = HUD.accFrame;
  rs.setProperty('--acc-w', `${af.widthPx}px`); rs.setProperty('--acc-op', `${af.opacity}`); rs.setProperty('--acc-over', `${af.overPx}px`);
  // S22: the power side of the bar in POWER_SECTIONS equal parts (lines at 25/50/75% for 4)
  const sections = $('sections');
  sections.replaceChildren(...Array.from({ length: POWER_SECTIONS - 1 }, () => document.createElement('div')));
  // S14: the bar for a putt (2 clicks) shows only the power side; for every other club the accuracy
  // side too. Lays out the parts that depend on where the bar starts.
  let barPutt = null;
  function layoutBar(putt) {
    if (putt === barPutt) return;
    barPutt = putt; barMin = putt ? 0 : METER_MIN;
    [...sections.children].forEach((d, k) => { d.style.left = `${meterPct((k + 1) / POWER_SECTIONS)}%`; });
    $('meterFill').style.left = `${meterPct(0)}%`;
    $('meterWrap').classList.toggle('putt', putt);
  }
  layoutBar(false);
  // The lie on the meter (S11): the green impact zone at its real width (SWEET × sweetScale) and the
  // grayed-out part above the power cap.
  function drawLie({ maxPower, sweetScale }) {
    const h = sweetHalfWidth(sweetScale), sw = $('sweet').style;
    sw.left = `${meterPct(-h)}%`; sw.width = `${meterPct(h) - meterPct(-h)}%`;
    // S22 (owner on PR #53): the same window's edges, as thin lines that show above and below the bar.
    // It sits outside the bar (which clips), so it is placed inside the bar's 2 px border by hand.
    const fr = $('sweetFrame').style, a = meterPct(-h) / 100, b = meterPct(h) / 100;
    fr.left = `calc(2px + (100% - 4px) * ${a})`; fr.width = `calc((100% - 4px) * ${b - a})`;
    const cap = $('capShade').style;
    cap.left = `${meterPct(maxPower)}%`; cap.display = maxPower < 1 ? 'block' : 'none';
  }
  // "Rough · max 85% · harder timing". A putt has no timing (S14), so no timing part.
  function lieText({ maxPower, sweetScale }, putt = false) {
    const parts = [surfaces[play.lie].name];
    if (maxPower < 1) parts.push(`max ${Math.round(maxPower * 100)}%`);
    if (putt) return parts.join(' · ');
    if (sweetScale < 1) parts.push('harder timing'); else if (sweetScale > 1) parts.push('easier timing');
    return parts.join(' · ');
  }

  function flash(text, sub = '') {
    const m = $('msg');
    m.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    fitFlash(m);
    m.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => m.classList.remove('show'), TIMING.flash);
  }

  // H1: the flash text is centred and wraps. Its width stops short of any panel beside it (the
  // minimap and wind box, or the scorecard on a wide screen), so it never runs under them.
  function fitFlash(m) {
    const cx = innerWidth / 2, cy = m.getBoundingClientRect().top + m.offsetHeight / 2, gap = 8;
    let half = cx - 12;
    for (const id of ['info', 'side']) {
      const r = $(id).getBoundingClientRect();
      if (r.bottom < cy - FLASH_BAND || r.top > cy + FLASH_BAND) continue; // not beside the text
      if (r.left > cx) half = Math.min(half, r.left - cx - gap);
      else if (r.right < cx) half = Math.min(half, cx - r.right - gap);
    }
    m.style.maxWidth = `${Math.max(half * 2, FLASH_MIN_W)}px`;
  }

  // "Uphill 4% · breaks left": the slope under the ball, relative to where you're aiming
  function slopeText() {
    const { along, side } = play.slope();
    const parts = [];
    if (Math.abs(along) >= HUD.slopeMinPct) parts.push(`${along > 0 ? 'Uphill' : 'Downhill'} ${Math.round(Math.abs(along))}%`);
    if (Math.abs(side) >= HUD.slopeMinPct) parts.push(`breaks ${side > 0 ? 'left' : 'right'}`);
    return parts.length ? parts.join(' · ') : 'Flat';
  }
  // The ↑/↓ elevation hint compares the ground under the ball with the cup, so it is hidden while
  // the ball is in the air (its height then is not the ground's).
  // At the tee of a dogleg (K12 play line longer than the straight line): "· plays 408 yd" (QA feel note)
  const playsYd = yd(holeLength(play.hole)), straightYd = yd(dist2D(play.tee, cup));
  function distText(state) {
    const ball = play.ball.pos, dh = cup.y - ball.y;
    const atTee = state !== 'flight' && state !== 'roll' && dist2D(ball, play.tee) < HUD.atTeeM;
    return `${yd(dist2D(ball, cup))} yd` + (state !== 'flight' && Math.abs(dh) >= HUD.elevMinM ? ` (${dh > 0 ? '↑' : '↓'}${Math.round(Math.abs(dh) * M2Y)})` : '') +
      (atTee && playsYd > straightYd ? ` · plays ${playsYd} yd` : '');
  }

  // state = game state, power = locked power (for the white mark)
  function update(state, power) {
    const aiming = isAimingState(state);
    const club = bag[play.clubIdx];
    const putt = swingClicks(club) === 2;
    layoutBar(putt);
    $('strokeTxt').textContent = Math.min(play.strokes + (aiming ? 1 : 0), play.hole.maxStrokes);
    $('distTxt').textContent = distText(state);
    const lie = play.lieOf();
    $('lieTxt').textContent = lieText(lie, putt);
    $('aimTxt').textContent = AIM_TEXT[play.targetKind]?.() ?? '-';
    drawLie(lie);
    $('slopeTxt').textContent = aiming ? slopeText() : '-';
    $('clubName').textContent = club.name;
    const reach = play.clubReach();
    $('clubDist').textContent = `max ${yd(reach)} yd`;
    // S22 (owner, playtest 1): the ⚑ only for putts; full shots and chips read the aim marker and
    // the bar's sections instead
    const need = club.putter ? play.pinPower() : Infinity;
    $('pinTick').style.left = `calc(${meterPct(Math.min(Math.max(need, 0), 1))}% - 1px)`;
    $('pinTick').style.display = need <= HUD.pinTickMax ? 'block' : 'none';
    $('pinTick').classList.toggle('flip', need > HUD.pinFlagFlip);
    const warn = state === 'aim' ? play.shotWarning() : null;
    $('hint').textContent = warn ? warnHint(warn) : (putt ? PUTT_HINTS : HINTS)[state] || '';
    $('hint').classList.toggle('warn', !!warn);
    const pm = $('powerMark');
    if (state === 'accuracy' || state === 'flight' || state === 'roll') { pm.style.display = 'block'; pm.style.left = `${meterPct(power)}%`; }
    else pm.style.display = 'none';
    $('windTxt').textContent = `${(Math.hypot(wind.x, wind.y, wind.z) * MPS_TO_MPH).toFixed(0)} mph`;
  }

  function updateMeter(state, value, power) {
    $('marker').style.left = `${meterPct(value)}%`;
    const fillTo = state === 'power' ? value : state === 'grace' ? play.lieOf().maxPower : (state === 'aim' || state === 'nopower') ? 0 : power;
    $('meterBar').classList.toggle('nopower', state === 'nopower');
    $('meterFill').style.width = `${meterPct(fillTo) - meterPct(0)}%`;
    // wind arrow relative to the direction you're facing
    const d = dirFromAim(play.aim), r = rightFromAim(play.aim);
    const rel = Math.atan2(wind.x * r.x + wind.z * r.z, wind.x * d.x + wind.z * d.z);
    $('windArrow').style.transform = `rotate(${rel}rad)`;
  }

  function showResult(title, text) {
    $('resultTitle').textContent = title;
    $('resultText').textContent = text;
    $('result').classList.remove('hidden');
  }
  const hideResult = () => $('result').classList.add('hidden');

  // S22: the label at the aim marker. text null = hidden; fx, fy = where on the screen (0..1)
  // S23: hazard = the marker lands in water or out of bounds (blue; an obstacle warning wins)
  function setAimLabel(text, fx = 0, fy = 0, capped = false, warn = false, hazard = false) {
    const el = $('aimLabel');
    if (!text) { el.hidden = true; return; }
    el.hidden = false;
    if (el.textContent !== text) el.textContent = text;
    el.style.left = `${(fx * 100).toFixed(2)}%`; el.style.top = `${(fy * 100).toFixed(2)}%`;
    el.classList.toggle('capped', capped); el.classList.toggle('warn', warn); el.classList.toggle('hazard', hazard && !warn);
  }

  const setDistance = state => { $('distTxt').textContent = distText(state); };
  // The hole is being unloaded (Gate A A2): stop the flash timer and hide what this hole showed
  function dispose() {
    clearTimeout(msgTimer);
    $('msg').classList.remove('show');
    hideResult();
    setAimLabel(null);
  }

  return { flash, update, updateMeter, slopeText, distText, setDistance, showResult, hideResult, setAimLabel, dispose };
}

// Minimap: the painted course, shrunk once, plus the flag, the ball and the aim line.
// K5: the trees in play (leaf circles) and boulders are drawn on it, K4: the warning point as a red ×.
export function createMinimap(hole, courseCanvas, cup, obstacles = []) {
  const mm = $('minimap'), ctx = mm.getContext('2d'), map = hole.map;
  const flagCss = `#${hole.scenery.flagColor.toString(16).padStart(6, '0')}`;
  const xy = (x, z) => [(x - map.x0) / (map.x1 - map.x0) * mm.width, (z - map.z0) / (map.z1 - map.z0) * mm.height];
  const base = document.createElement('canvas');
  base.width = mm.width * 2; base.height = mm.height * 2;
  const bctx = base.getContext('2d');
  bctx.drawImage(courseCanvas, 0, 0, base.width, base.height);
  const sx = base.width / (map.x1 - map.x0), sz = base.height / (map.z1 - map.z0);
  for (const o of obstacles) {
    const px = (o.x - map.x0) * sx, pz = (o.z - map.z0) * sz;
    const r = Math.max(1.5, (o.type === 'tree' ? o.canopy.rx : o.r) * sx);
    bctx.fillStyle = o.type === 'tree' ? 'rgba(28, 74, 32, 0.9)' : 'rgba(120, 118, 112, 0.95)';
    bctx.beginPath(); bctx.arc(px, pz, r, 0, 7); bctx.fill();
  }
  // marks = play.aimMarks() (S22): for a full shot the line ends in a triangle, with ticks at 25/50/75%
  return function draw(ball, target, warn = null, marks = null) {
    ctx.drawImage(base, 0, 0, mm.width, mm.height);
    const [hx, hz] = xy(cup.x, cup.z);
    ctx.fillStyle = flagCss; ctx.fillRect(hx - 1, hz - 7, 2, 7); ctx.fillRect(hx, hz - 7, 5, 3);
    const [bx, bz] = xy(ball.x, ball.z);
    if (target) {
      const [tx, tz] = xy(target.x, target.z);
      const color = marks?.hazard && !warn ? '#46b4ff' : marks?.capped ? '#c8c8c8' : '#ffd447'; // S23: blue = lands in water / OB
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
      ctx.beginPath(); ctx.moveTo(bx, bz); ctx.lineTo(tx, tz); ctx.stroke(); ctx.setLineDash([]);
      if (!marks) { ctx.beginPath(); ctx.arc(tx, tz, 3, 0, 7); ctx.stroke(); }
      else {
        const len = Math.hypot(tx - bx, tz - bz) || 1, ux = (tx - bx) / len, uz = (tz - bz) / len; // along the line, on the map
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(tx + ux * 4, tz + uz * 4); ctx.lineTo(tx - ux * 2 - uz * 3, tz - uz * 2 + ux * 3); ctx.lineTo(tx - ux * 2 + uz * 3, tz - uz * 2 - ux * 3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
        for (const q of minimapTicks(marks)) {
          const [qx, qz] = xy(q.x, q.z);
          ctx.beginPath(); ctx.moveTo(qx - uz * 2.5, qz + ux * 2.5); ctx.lineTo(qx + uz * 2.5, qz - ux * 2.5); ctx.stroke();
        }
      }
    }
    if (warn) {
      const [wx, wz] = xy(warn.x, warn.z);
      ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(wx - 3, wz - 3); ctx.lineTo(wx + 3, wz + 3); ctx.moveTo(wx + 3, wz - 3); ctx.lineTo(wx - 3, wz + 3); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, bz, 2.5, 0, 7); ctx.fill(); ctx.stroke();
  };
}
