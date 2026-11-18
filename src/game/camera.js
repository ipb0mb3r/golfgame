// The camera rig: eases the Three.js camera toward the view core asks for. Where to stand is decided
// in core/views.js (pure, tested); this file only follows it and keeps the camera above the ground.
import * as THREE from 'three';
import { isAimView, isBallMoving, isFlyover } from '../core/states.js';
import { CAM } from '../core/config.js';
import { aimView, landingView, readView } from '../core/views.js';

export function createCameraRig(camera, heightAt) {
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  const keepAboveGround = (p, clearance) => { p.y = Math.max(p.y, heightAt(p.x, p.z) + clearance); };
  let memoKey = '', memoView = null; // the aiming view is solved again only when its inputs change
  const r3 = n => n.toFixed(3);

  const want = w => { wantPos.set(w.pos.x, w.pos.y, w.pos.z); wantLook.set(w.look.x, w.look.y, w.look.z); };

  // v = { state, ball, dir (aim), putter (club is the putter), isPutt (the moving ball is a putt), shotDir,
  //       mark (the aim marker, or a putt's end point), cup, view (V2 button view: null | 'landing' | 'above' | 'low'),
  //       frame ({ aspect, fov, top, bottom }: the free band of the screen, see core/views.js) }
  let lookK = 0, cut = false; // set by goal(): the look eases at its own speed (0 = with the position); cut = jump there now
  function goal(v) {
    const { ball, dir: d } = v;
    lookK = 0; cut = false;
    if (isFlyover(v.state) && v.fly) { want(v.fly); cut = true; return 0; } // V4: the path is already smooth
    const gy = heightAt(ball.x, ball.z);
    if (isAimView(v.state)) { // incl. the S8 phases grace / nopower (Gate A A3: this list used to miss them)
      if (v.view === 'landing' && v.mark) { want(landingView(heightAt, { ball, dir: d, mark: v.mark }, v.frame)); return CAM.ease.view; }
      if ((v.view === 'above' || v.view === 'low') && v.cup) { want(readView(heightAt, { ball, dir: d, cup: v.cup }, v.view, v.frame)); return CAM.ease.view; }
      if (v.mark && v.frame) {
        const f = v.frame, m = v.mark;
        const key = [ball.x, ball.y, ball.z, d.x, d.z, m.x, m.y, m.z, f.aspect, f.top, f.bottom, v.putter].map(x => (typeof x === 'number' ? r3(x) : x)).join('|');
        if (key !== memoKey) { memoKey = key; memoView = aimView(heightAt, { ball, dir: d, mark: m, putt: v.putter }, f); }
        want(memoView);
        return CAM.ease.aim;
      }
      return CAM.ease.aim; // nothing to aim at yet: stay
    }
    if (isBallMoving(v.state)) {
      // V3: a standing camera (side / landing) watches the ball from its spot; the shot starts with a cut to it
      const f = v.flight;
      if (f && f.spot && !f.dropped) {
        wantPos.set(f.spot.x, f.spot.y, f.spot.z); wantLook.set(ball.x, ball.y, ball.z);
        if (f.cut) { f.cut = false; cut = true; }
        lookK = CAM.flightEase.look;
        return 0;
      }
      const back = v.isPutt ? 3.5 : 11, s = v.shotDir;
      wantPos.set(ball.x - s.x * back, 0, ball.z - s.z * back);
      wantPos.y = gy + Math.max((ball.y - gy) * 0.6, 0) + (v.isPutt ? 1.6 : 3.5);
      keepAboveGround(wantPos, v.isPutt ? 0.8 : 1.5);
      wantLook.set(ball.x, ball.y, ball.z);
      return v.isPutt ? 3 : 2.2;
    }
    return 1.5; // wait / holed / result: drift toward the last goal
  }
  return {
    snap(v) { goal(v); camPos.copy(wantPos); camLook.copy(wantLook); camera.position.copy(camPos); camera.lookAt(camLook); },
    update(v, dt) {
      const k = goal(v);
      if (cut) { camPos.copy(wantPos); camLook.copy(wantLook); }
      else {
        const a = 1 - Math.exp(-k * dt), al = lookK ? 1 - Math.exp(-lookK * dt) : a;
        camPos.lerp(wantPos, a); camLook.lerp(wantLook, al);
      }
      keepAboveGround(camPos, 0.5);
      camera.position.copy(camPos); camera.lookAt(camLook);
    },
  };
}
