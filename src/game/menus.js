// The menus (Phase 7, DESIGN §8 "Menus"): main menu, Play (mode), Solo courses, Practice holes and
// test spots, How to Play and Settings. DOM only: what is listed and where each item leads comes
// from core/menu.js, the courses from sets.js (no hardcoded list, M2).
//
//   const menus = createMenus({ sets, holes, scenarios, readBest, settings, onLaunch(launch), onSettings(settings) })
//   menus.show('main')   open a screen ('main' | 'play' | 'solo' | 'practice' | 'how' | 'settings')
//   menus.back()         one screen back (Esc); false when already on the main menu
//   menus.hide()
import { MODES, PUTT_GRID, soloCourses, practiceItems } from '../core/menu.js';
import { toParText } from '../core/round.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Each screen's parent, for Back and Esc
const PARENT = { play: 'main', solo: 'play', practice: 'play', how: 'main', settings: 'main' };
const GRID_TEXT = { hole: 'Hole default', on: 'Every green', off: 'Off' };

export function createMenus({ sets, holes, scenarios, readBest, settings, onLaunch, onSettings }) {
  const root = $('menu');
  let screen = 'main';
  let saved = null; // did the last settings change get saved on this device?

  // Every button with data-go opens that screen; data-back goes one up
  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled || !root.contains(b)) return;
    if (b.dataset.go) show(b.dataset.go);
    else if (b.dataset.back != null) back();
    else if (b.dataset.launch) onLaunch(JSON.parse(b.dataset.launch));
    else if (b.dataset.setting) changeSetting(b.dataset.setting, b.dataset.value);
  });

  // The Play menu: Solo, vs AI (shown, but "Coming soon" until Phase T), Practice
  $('menuModes').innerHTML = MODES.map(m => `
    <button class="item mode" ${m.enabled ? `data-go="${m.id}"` : 'disabled aria-disabled="true"'} id="mode-${m.id}">
      <b>${esc(m.name)}</b>${m.enabled ? '' : ' <span class="tag soon">Coming soon</span>'}<small>${esc(m.line)}</small>
    </button>`).join('');

  const launchAttr = l => esc(JSON.stringify(l));

  // Solo: every course in sets.js, with its length, par and personal best (read when the screen opens)
  function renderSolo() {
    $('menuCourses').innerHTML = soloCourses(sets, holes).map(c => {
      const best = readBest(c.id);
      return `<button class="item" data-launch="${launchAttr(c.launch)}" data-id="${esc(c.id)}">
        <b>${esc(c.name)}</b>${c.tag ? ` <span class="tag">${esc(c.tag)}</span>` : ''}
        <small>${c.holes} hole${c.holes > 1 ? 's' : ''} · par ${c.par}${best ? ` · best ${toParText(best.toPar)} (${best.strokes})` : ''}</small>
      </button>`;
    }).join('');
  }

  // Practice: the practice holes, then the test spots under their hole
  {
    const p = practiceItems(sets, holes, scenarios);
    const byHole = new Map();
    for (const s of p.spots) { if (!byHole.has(s.holeId)) byHole.set(s.holeId, []); byHole.get(s.holeId).push(s); }
    $('menuPracticeHoles').innerHTML = p.holes.map(h => `
      <button class="item" data-launch="${launchAttr(h.launch)}" data-id="${esc(h.id)}">
        <b>${esc(h.name)}</b> <span class="tag par">Par ${h.par}</span><small>${esc(h.line)}</small>
      </button>`).join('');
    $('menuSpots').innerHTML = [...byHole].map(([id, list]) => `
      <h4>Hole ${holes[id].number}</h4>
      ${list.map(s => `<button class="item small" data-launch="${launchAttr(s.launch)}" data-id="${esc(s.id)}"><b>${esc(s.name)}</b><small>${esc(s.line)}</small></button>`).join('')}`).join('');
  }

  function renderSettings() {
    const on = settings.debug;
    const d = $('setDebug');
    d.setAttribute('aria-checked', String(on)); d.textContent = on ? 'On' : 'Off'; d.classList.toggle('on', on);
    $('setGrid').innerHTML = PUTT_GRID.map(v => `<button data-setting="puttGrid" data-value="${v}" aria-pressed="${settings.puttGrid === v}" class="${settings.puttGrid === v ? 'on' : ''}">${GRID_TEXT[v]}</button>`).join('');
    $('setSaved').textContent = saved === false ? 'This browser can\'t save settings, so they only last until you close the page.' : 'Settings are saved on this device. They apply from the next hole you start.';
  }

  function changeSetting(name, value) {
    if (name === 'debug') settings.debug = !settings.debug;
    if (name === 'puttGrid') settings.puttGrid = value;
    saved = onSettings(settings);
    renderSettings();
  }

  function show(name) {
    screen = name;
    if (name === 'solo') renderSolo();
    if (name === 'settings') renderSettings();
    for (const s of root.querySelectorAll('[data-screen]')) s.hidden = s.dataset.screen !== name;
    root.classList.remove('hidden');
    document.body.classList.add('inMenu');
    root.scrollTop = 0;
    // Keyboard players land on the first button of the screen
    root.querySelector(`[data-screen="${name}"] button:not([disabled])`)?.focus({ preventScroll: true });
  }
  function hide() { root.classList.add('hidden'); document.body.classList.remove('inMenu'); }
  function back() { if (!PARENT[screen]) return false; show(PARENT[screen]); return true; }

  return {
    show, hide, back,
    get visible() { return !root.classList.contains('hidden'); },
    get screen() { return screen; },
  };
}
