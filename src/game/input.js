// Keyboard, mouse and touch input. Calls the handlers; owns no game rules.
//   on = { swing(), club(step), start(), again(), toggleDebug(), canAim() }
const $ = id => document.getElementById(id);

export function bindInput(canvas, on) {
  let aimHold = 0;
  const keysDown = new Set();
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); on.swing(); });
  $('swingBtn').addEventListener('pointerdown', e => { e.preventDefault(); on.swing(); });
  $('clubPrev').addEventListener('click', () => on.club(-1));
  $('clubNext').addEventListener('click', () => on.club(1));
  for (const [id, dir] of [['aimL', -1], ['aimR', 1]]) {
    const b = $(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); if (on.canAim()) aimHold = dir; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { aimHold = 0; });
  }
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) on.swing(); }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keysDown.add('L'); e.preventDefault(); }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { keysDown.add('R'); e.preventDefault(); }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); on.club(-1); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); on.club(1); }
    if (e.code === 'Backquote' && !e.repeat) on.toggleDebug();
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysDown.delete('L');
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keysDown.delete('R');
  });
  window.addEventListener('blur', () => { keysDown.clear(); aimHold = 0; });
  $('startBtn').addEventListener('click', on.start);
  $('againBtn').addEventListener('click', on.again);
  return {
    // −1 / 0 / +1 from the arrow keys and the hold-to-aim buttons
    aimDir() { return Math.sign((keysDown.has('R') ? 1 : 0) - (keysDown.has('L') ? 1 : 0) + aimHold); },
    releaseAim() { aimHold = 0; },
  };
}
