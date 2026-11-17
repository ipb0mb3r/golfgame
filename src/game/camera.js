// Camera that follows the ball and the ground up and down the hills.
import * as THREE from 'three';
import { isAimView, isBallMoving } from '../core/states.js';

export function createCameraRig(camera, heightAt) {
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  const keepAboveGround = (p, clearance) => { p.y = Math.max(p.y, heightAt(p.x, p.z) + clearance); };

  // v = { state, ball, dir (aim), putter (club is the putter), isPutt (the moving ball is a putt), shotDir }
  function goal(v) {
    const { ball, dir: d } = v;
    const gy = heightAt(ball.x, ball.z);
    if (isAimView(v.state)) { // incl. the S8 phases grace / nopower (Gate A A3: this list used to miss them)
      if (v.putter) {
        wantPos.set(ball.x - d.x * 3.5, gy + 1.6, ball.z - d.z * 3.5);
        wantLook.set(ball.x + d.x * 5, 0, ball.z + d.z * 5); wantLook.y = heightAt(wantLook.x, wantLook.z);
        keepAboveGround(wantPos, 0.8);
      } else {
        wantPos.set(ball.x - d.x * 7, gy + 2.6, ball.z - d.z * 7);
        wantLook.set(ball.x + d.x * 30, 0, ball.z + d.z * 30); wantLook.y = heightAt(wantLook.x, wantLook.z);
        keepAboveGround(wantPos, 1.5);
      }
      return 5;
    }
    if (isBallMoving(v.state)) {
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
    snap(v) { goal(v); camPos.copy(wantPos); camLook.copy(wantLook); },
    update(v, dt) {
      const k = goal(v);
      const a = 1 - Math.exp(-k * dt);
      camPos.lerp(wantPos, a); camLook.lerp(wantLook, a);
      keepAboveGround(camPos, 0.5);
      camera.position.copy(camPos); camera.lookAt(camLook);
    },
  };
}
