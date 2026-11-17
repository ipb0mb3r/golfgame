// Keyboard, mouse and touch input. Calls the handlers; owns no game rules. Bound once for the whole
// visit (main.js); the handlers forward to the current hole session.
//   on = { swing(), club(step), start(), again(), toggleDebug(), canAim() }
const $ = id => document.getElementById(id);

// Gate A C7: only a primary press swings. A mouse needs its main (left) button: a right or middle
// click does nothing. Every finger counts on a touch screen (button 0), so two-thumb play works:
// hold Aim with one thumb and tap SWING or the course with the other (decided in Fix pass 1).
const isSwingPress = e => e.button === 0;
// Space swings; with Ctrl / Cmd / Alt held it's a browser shortcut, not a swing
const isSwingKey = e => e.code === 'Space' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey;

export function bindInput(canvas, on) {
  let aimHold = 0;
  const keysDown = new Set();
  const swingPress = e => { e.preventDefault(); if (isSwingPress(e)) on.swing(); };
  canvas.addEventListener('pointerdown', swingPress);
  canvas.addEventListener('contextmenu', e => e.preventDefault()); // a right click on the course opens no menu
  $('swingBtn').addEventListener('pointerdown', swingPress);
  $('clubPrev').addEventListener('click', () => on.club(-1));
  $('clubNext').addEventListener('click', () => on.club(1));
  for (const [id, dir] of [['aimL', -1], ['aimR', 1]]) {
    const b = $(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); if (isSwingPress(e) && on.canAim()) aimHold = dir; });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => { aimHold = 0; });
  }
  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (isSwingKey(e)) on.swing(); }
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
