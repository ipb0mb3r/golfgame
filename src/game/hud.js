// HUD: scorecard panel, club box, swing meter, wind arrow, flash messages and the cards.
import { M2Y, METER_MIN, MPS_TO_MPH, TIMING, HUD } from '../core/config.js';
import { sweetHalfWidth } from '../core/swing.js';
import { dist2D, dirFromAim, rightFromAim } from '../core/vec.js';

const $ = id => document.getElementById(id);
export const yd = m => Math.round(m * M2Y);
const meterPct = p => ((p - METER_MIN) / (1 - METER_MIN)) * 100;
const HINTS = {
  aim: 'Aim and pick a club, then click or press Space to swing',
  power: 'Click again to set POWER',
  grace: 'MAX! Click now for full power',
  nopower: 'No power! Click for a mini shot, or wait to cancel',
  accuracy: 'Click on the green line for a straight shot!',
};
const FLASH_BAND = 60, FLASH_MIN_W = 120; // px: panels this close above/below the flash text count as beside it
const isAiming = s => s === 'aim' || s === 'power' || s === 'grace' || s === 'nopower' || s === 'accuracy';

export function holeHref(id) { return `?hole=${encodeURIComponent(id)}`; }

// Fill in the page for this hole: titles, intro card, links, minimap size.
export function setupHolePage(hole, tee, cup) {
  const yards = yd(dist2D(tee, cup));
  document.title = `Pocket Links: Hole ${hole.number}`;
  $('holeTitle').textContent = `HOLE ${hole.number} · PAR ${hole.par}`;
  const it = hole.intro;
  $('introSub').innerHTML = `Hole ${hole.number} · ` + it.subtitle.replace('{yards}', yards);
  $('introSteps').innerHTML = it.steps.map(s => `<li>${s}</li>`).join('');
  $('introBlurb').textContent = it.blurb;
  for (const [id, link] of [['introLink', it.link], ['resultLink', it.resultLink]]) {
    const a = $(id);
    if (link) { a.href = holeHref(link.hole); a.textContent = link.text; } else a.parentElement.style.display = 'none';
  }
  const mm = hole.scenery.minimap, root = document.documentElement.style;
  $('minimap').width = mm.w; $('minimap').height = mm.h;
  root.setProperty('--mm-mobile-w', `${mm.mobileW}px`);
  root.setProperty('--mm-mobile-h', `${mm.mobileH}px`);
  root.setProperty('--mm-h', `${mm.h}px`);
}

export function createHud(play) {
  const { cup, terrain, surfaces, wind, bag } = play;
  let msgTimer = 0;
  // The lie on the meter (S11): the green impact zone at its real width (SWEET × sweetScale) and the
  // grayed-out part above the power cap.
  function drawLie({ maxPower, sweetScale }) {
    const h = sweetHalfWidth(sweetScale), sw = $('sweet').style;
    sw.left = `${meterPct(-h)}%`; sw.width = `${meterPct(h) - meterPct(-h)}%`;
    const cap = $('capShade').style;
    cap.left = `${meterPct(maxPower)}%`; cap.display = maxPower < 1 ? 'block' : 'none';
  }
  // "Rough · max 85% · harder timing"
  function lieText({ maxPower, sweetScale }) {
    const parts = [surfaces[play.lie].name];
    if (maxPower < 1) parts.push(`max ${Math.round(maxPower * 100)}%`);
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
  function distText(state) {
    const ball = play.ball.pos, dh = cup.y - ball.y;
    return `${yd(dist2D(ball, cup))} yd` + (state !== 'flight' && Math.abs(dh) >= HUD.elevMinM ? ` (${dh > 0 ? '↑' : '↓'}${Math.round(Math.abs(dh) * M2Y)})` : '');
  }

  // state = game state, power = locked power (for the white mark)
  function update(state, power) {
    const aiming = isAiming(state);
    const club = bag[play.clubIdx];
    $('strokeTxt').textContent = Math.min(play.strokes + (aiming ? 1 : 0), play.hole.maxStrokes);
    $('distTxt').textContent = distText(state);
    const lie = play.lieOf();
    $('lieTxt').textContent = lieText(lie);
    drawLie(lie);
    $('slopeTxt').textContent = aiming ? slopeText() : '-';
    $('clubName').textContent = club.name;
    const reach = play.clubReach();
    $('clubDist').textContent = `max ${yd(reach)} yd`;
    const need = play.pinPower();
    $('pinTick').style.left = `calc(${meterPct(Math.min(Math.max(need, 0), 1))}% - 1px)`;
    $('pinTick').style.display = need <= HUD.pinTickMax ? 'block' : 'none';
    $('pinTick').classList.toggle('flip', need > HUD.pinFlagFlip);
    $('hint').textContent = HINTS[state] || '';
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

  return { flash, update, updateMeter, slopeText, distText, showResult, hideResult };
}

// Minimap: the painted course, shrunk once, plus the flag, the ball and the aim line.
export function createMinimap(hole, courseCanvas, cup) {
  const mm = $('minimap'), ctx = mm.getContext('2d'), map = hole.map;
  const flagCss = `#${hole.scenery.flagColor.toString(16).padStart(6, '0')}`;
  const xy = (x, z) => [(x - map.x0) / (map.x1 - map.x0) * mm.width, (z - map.z0) / (map.z1 - map.z0) * mm.height];
  const base = document.createElement('canvas');
  base.width = mm.width * 2; base.height = mm.height * 2;
  base.getContext('2d').drawImage(courseCanvas, 0, 0, base.width, base.height);
  return function draw(ball, target) {
    ctx.drawImage(base, 0, 0, mm.width, mm.height);
    const [hx, hz] = xy(cup.x, cup.z);
    ctx.fillStyle = flagCss; ctx.fillRect(hx - 1, hz - 7, 2, 7); ctx.fillRect(hx, hz - 7, 5, 3);
    const [bx, bz] = xy(ball.x, ball.z);
    if (target) {
      const [tx, tz] = xy(target.x, target.z);
      ctx.strokeStyle = '#ffd447'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
      ctx.beginPath(); ctx.moveTo(bx, bz); ctx.lineTo(tx, tz); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, tz, 3, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(bx, bz, 2.5, 0, 7); ctx.fill(); ctx.stroke();
  };
}
