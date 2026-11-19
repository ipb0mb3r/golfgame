// Flag, cup, ball, shadow, flight trail and the aim guide.
import * as THREE from 'three';
import { CUP_R, BALL_R, HUD, TUNE, FLAG_FX } from '../core/config.js';

export function createProps(scene, hole, terrain, cup) {
  const { heightAt, normalAt } = terrain;
  const sc = hole.scenery;

  // Cup + flag (the cup is tilted to match the green)
  const n = normalAt(cup.x, cup.z);
  const tilt = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(n.x, n.y, n.z));
  const cupMesh = new THREE.Mesh(new THREE.CircleGeometry(CUP_R, 24), new THREE.MeshBasicMaterial({ color: 0x111111 }));
  cupMesh.quaternion.copy(tilt); cupMesh.position.set(cup.x, cup.y + 0.02, cup.z);
  scene.add(cupMesh);
  const cupRim = new THREE.Mesh(new THREE.RingGeometry(CUP_R, CUP_R + 0.03, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  cupRim.quaternion.copy(tilt); cupRim.position.set(cup.x, cup.y + 0.021, cup.z);
  scene.add(cupRim);
  // FL1: the flagstick is drawn from the same TUNE.FLAG_R / FLAG_H the ball hits (read once per hole,
  // so ?tune= changes both); FLAG_H 0 = no pole and no cloth. The pole and the cloth hang in one group
  // standing on the cup, so a hit can wobble them around the base (hitPin). setPin(false) hides the
  // stick (core obstacles.pinShown: only on a putt near the cup).
  const stickH = TUNE.FLAG_H, hasStick = stickH > 0;
  const stick = new THREE.Group();
  stick.position.set(cup.x, cup.y, cup.z);
  stick.visible = hasStick;
  scene.add(stick);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(TUNE.FLAG_R, TUNE.FLAG_R, Math.max(stickH, FLAG_FX.minH), 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  pole.position.y = stickH / 2;
  stick.add(pole);
  const flagGeo = new THREE.PlaneGeometry(FLAG_FX.clothW, FLAG_FX.clothH, 12, 4);
  flagGeo.translate(FLAG_FX.clothW / 2, 0, 0);
  const flagBase = flagGeo.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: sc.flagColor, side: THREE.DoubleSide }));
  flag.position.y = stickH - FLAG_FX.clothDrop;
  stick.add(flag);
  let stickShown = hasStick, wobbleT0 = -1, wobbleX = 0, wobbleZ = 0; // wobble: start time, direction the top leans

  // Ball, shadow, flight trail
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 20, 14), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x333333 }));
  scene.add(ballMesh);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 1.1, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  const TRAIL_N = sc.trail;
  const trailPos = new Float32Array(TRAIL_N * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setDrawRange(0, 0);
  const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  trailLine.frustumCulled = false;
  scene.add(trailLine);
  let trailCount = 0;

  // Aim guide: dots along the line + a ring where a full-power shot lands
  const DOTS = 40;
  // K4: the dots past an obstacle the shot would hit, and the ring, turn WARN_COLOR, and a marker
  // shows where it hits (in the air, with a ring on the ground under it)
  const AIM_COLOR = new THREE.Color(0xffd447), WARN_COLOR = new THREE.Color(0xff4a3a);
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.22, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), DOTS);
  dots.frustumCulled = false; scene.add(dots);
  for (let i = 0; i < DOTS; i++) dots.setColorAt(i, AIM_COLOR);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 40), new THREE.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const warnMark = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10), new THREE.MeshBasicMaterial({ color: WARN_COLOR, depthTest: false, transparent: true, opacity: 0.95 }));
  warnMark.renderOrder = 11; scene.add(warnMark);
  const warnFoot = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.3, 28), new THREE.MeshBasicMaterial({ color: WARN_COLOR, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  warnFoot.rotation.x = -Math.PI / 2; scene.add(warnFoot);
  const warnPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), new THREE.MeshBasicMaterial({ color: WARN_COLOR, transparent: true, opacity: 0.7 }));
  scene.add(warnPole);
  warnMark.visible = warnFoot.visible = warnPole.visible = false;
  // S22: full shots end the line in a marker where a 100% (or the lie's capped) straight shot lands, with
  // short bars across the line at the 25/50/75% landings. Since PR #63 (owner: "the landing triangle is way
  // too big") the marker is a small cone pointing DOWN at the landing spot, hovering a little above it,
  // with a small dot on the ground under it; fitMarker() keeps its size on screen modest at any distance.
  // Grey when the lie caps the power, red when the shot would hit an obstacle (K4), blue when it lands
  // in water or out of bounds (S23; the obstacle wins: the ball would never get there).
  const CAP_COLOR = new THREE.Color(0xb8b8b8), HAZARD_COLOR = new THREE.Color(0x46b4ff);
  const P = HUD.aimPin;
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0.95, side: THREE.DoubleSide });
  // A unit pin: 1 m tall, tip at the bottom (y 0) pointing down, base on top
  const pinGeo = new THREE.ConeGeometry(P.radius, 1, 16).rotateX(Math.PI).translate(0, 0.5, 0);
  const markTri = new THREE.Mesh(pinGeo, markMat); // (the S22 name: the marker)
  const markDot = new THREE.Mesh(new THREE.CircleGeometry(P.dotR, 20).rotateX(-Math.PI / 2), markMat);
  scene.add(markTri, markDot);
  let pinScale = 1, pinGround = 0; // the marker's size (m) and the ground under it, for the label (pinTop)
  const TICKS = 8; // more than POWER_SECTIONS − 1 needs
  const ticks = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8, 0.28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide }), TICKS);
  ticks.frustumCulled = false; ticks.count = 0; scene.add(ticks);
  markTri.visible = markDot.visible = false;
  // BC4: a shaped shot (impact point off the centre) also shows its run-out: smaller white dots from
  // the landing to where it stops, and a small white ring there (the yellow dots follow the curve)
  const ROLL_DOTS = 18;
  const rollDots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }), ROLL_DOTS);
  rollDots.frustumCulled = false; rollDots.count = 0; scene.add(rollDots);
  const restRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  scene.add(restRing); restRing.visible = rollDots.visible = false;
  // The point a share f (0..1) of the way along a polyline [{ x, z }], by length
  function along(pts, f, out) {
    let total = 0;
    for (let k = 1; k < pts.length; k++) total += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
    let want = total * f;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], l = Math.hypot(b.x - a.x, b.z - a.z);
      if (want <= l || k === pts.length - 1) { const t = l > 0 ? Math.min(1, want / l) : 0; out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t; return out; }
      want -= l;
    }
    out.x = pts[0].x; out.z = pts[0].z; return out;
  }
  const tmpQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();

  return {
    // PR #63: the landing marker's size follows the camera distance (× AIM_PIN_SIZE), clamped, so it is
    // never huge up close (the 🔍 Landing view) nor a speck far away. Call after the camera has moved.
    fitMarker(camPos) {
      if (!markTri.visible) return;
      const d = Math.hypot(camPos.x - markTri.position.x, camPos.y - pinGround, camPos.z - markTri.position.z);
      pinScale = Math.min(P.max, Math.max(P.min, d * P.screenK)) * TUNE.AIM_PIN_SIZE;
      markTri.scale.setScalar(pinScale); markDot.scale.setScalar(pinScale);
      markTri.position.y = pinGround + P.hover * pinScale;
    },
    // The top of the marker (world y), where its label sits
    pinTop() { return pinGround + (P.hover + 1) * pinScale; },
    // pos = where to draw the ball (world), holed = hide the shadow
    setBall(pos, holed) {
      ballMesh.position.set(pos.x, pos.y + BALL_R, pos.z);
      const gy = heightAt(pos.x, pos.z);
      shadow.position.set(pos.x, gy + 0.03, pos.z);
      shadow.visible = !holed;
      const air = Math.max(pos.y - gy, 0);
      shadow.material.opacity = 0.35 / (1 + air * 0.15);
      shadow.scale.setScalar(1 + air * 0.02);
    },
    resetTrail() { trailCount = 0; trailGeo.setDrawRange(0, 0); },
    addTrail(pos) {
      if (trailCount >= TRAIL_N) return;
      trailPos.set([pos.x, pos.y + BALL_R, pos.z], trailCount * 3);
      trailCount++; trailGeo.setDrawRange(0, trailCount); trailGeo.attributes.position.needsUpdate = true;
    },
    // from = ball, dir = aim direction, len = guide length, target = ring position, putter = small guide,
    // warn = play.aimWarning() (K4): null, or where the shot would hit a tree or a rock,
    // marks = play.aimMarks() (S22, full shots): the marker and the 25/50/75% ticks; putts keep the ring
    setAimGuide(visible, from, dir, len, target, putter, warn = null, marks = null) {
      dots.visible = visible;
      ring.visible = visible && !!putter; // !!: club.putter is undefined on other clubs, and Three.js draws anything not === false (the S22 ring showed on full shots, PR #63)
      markTri.visible = markDot.visible = ticks.visible = visible && !putter && !!marks;
      warnMark.visible = warnFoot.visible = warnPole.visible = visible && !!warn;
      const shape = visible && !putter ? marks?.shape : null; // BC4: the shaped flight's ground track and roll
      rollDots.visible = restRing.visible = !!shape;
      if (!visible) return;
      if (markTri.visible) {
        tmpQ.setFromAxisAngle(UP, Math.atan2(-dir.x, -dir.z)); // (the ticks' orientation)
        pinGround = heightAt(marks.x, marks.z);
        markTri.position.set(marks.x, pinGround + P.hover * pinScale, marks.z);
        markDot.position.set(marks.x, pinGround + 0.08, marks.z);
        markMat.color.copy(warn ? WARN_COLOR : marks.hazard ? HAZARD_COLOR : marks.capped ? CAP_COLOR : AIM_COLOR);
        ticks.count = Math.min(marks.ticks.length, TICKS);
        for (let k = 0; k < ticks.count; k++) {
          const q = marks.ticks[k];
          tmpV.set(q.x, heightAt(q.x, q.z) + 0.09, q.z);
          tmpM.compose(tmpV, tmpQ, tmpS.setScalar(1 + q.dist / 90));
          ticks.setMatrixAt(k, tmpM);
        }
        ticks.instanceMatrix.needsUpdate = true;
      }
      const s = putter ? 0.25 : 1;
      for (let i = 0; i < DOTS; i++) {
        const f = (i + 1) / (DOTS + 1);
        if (shape) along(shape.path, f, tmpV); // BC4: out and back along the shaped flight
        else tmpV.set(from.x + dir.x * len * f, 0, from.z + dir.z * len * f);
        tmpV.y = heightAt(tmpV.x, tmpV.z) + 0.06;
        tmpM.makeRotationX(-Math.PI / 2).setPosition(tmpV);
        tmpM.scale(tmpS.set(s, s, s));
        dots.setMatrixAt(i, tmpM);
        const past = shape ? Math.hypot(tmpV.x - from.x, tmpV.z - from.z) >= warn?.dist : len * f >= warn?.dist;
        dots.setColorAt(i, warn && past ? WARN_COLOR : AIM_COLOR);
      }
      dots.instanceMatrix.needsUpdate = true;
      dots.instanceColor.needsUpdate = true;
      if (shape) {
        const r = shape.rest, run = Math.hypot(r.x - marks.x, r.z - marks.z);
        rollDots.count = Math.min(ROLL_DOTS, Math.max(0, Math.floor(run / 2.5)));
        for (let i = 0; i < rollDots.count; i++) {
          along(shape.roll, (i + 1) / (rollDots.count + 1), tmpV); tmpV.y = heightAt(tmpV.x, tmpV.z) + 0.07;
          tmpM.makeRotationX(-Math.PI / 2).setPosition(tmpV);
          rollDots.setMatrixAt(i, tmpM);
        }
        rollDots.instanceMatrix.needsUpdate = true;
        restRing.position.set(r.x, heightAt(r.x, r.z) + 0.08, r.z);
        restRing.scale.setScalar(1 + Math.hypot(r.x - from.x, r.z - from.z) / 120);
      }
      ring.position.set(target.x, heightAt(target.x, target.z) + 0.08, target.z);
      ring.scale.setScalar(putter ? 0.15 : 1 + len / 80);
      ring.material.color.copy(warn ? WARN_COLOR : AIM_COLOR);
      if (warn) {
        const gy = heightAt(warn.x, warn.z), y = warn.y + BALL_R;
        warnMark.position.set(warn.x, y, warn.z);
        warnMark.scale.setScalar(1 + warn.dist / 120); // stays visible from far away
        warnFoot.position.set(warn.x, gy + 0.1, warn.z);
        warnPole.position.set(warn.x, (gy + y) / 2, warn.z); warnPole.scale.set(1, Math.max(0.01, y - gy), 1);
      }
    },
    // Waving flag, pointing downwind
    animateFlag(t, wind) {
      const fp = flagGeo.attributes.position.array;
      for (let i = 0; i < fp.length; i += 3) {
        const x = flagBase[i];
        fp[i + 2] = Math.sin(x * 6 - t * 6) * 0.07 * x;
      }
      flagGeo.attributes.position.needsUpdate = true;
      flag.rotation.y = Math.atan2(-wind.z, wind.x) || 0;
      // FL1: after a hit the stick rocks away from the ball and settles (a damped swing around its base)
      if (wobbleT0 >= 0) {
        const s = t - wobbleT0;
        const a = s < FLAG_FX.wobbleS ? FLAG_FX.wobble * Math.exp(-s / FLAG_FX.wobbleDecay) * Math.sin(s * FLAG_FX.wobbleHz * 2 * Math.PI) : 0;
        stick.rotation.x = a * wobbleZ; stick.rotation.z = -a * wobbleX;
        if (!a) wobbleT0 = -1;
      }
    },
    // FL1: the ball hit the pole at time t, moving along (dx, dz)
    hitPin(t, dx, dz) {
      const l = Math.hypot(dx, dz) || 1;
      wobbleT0 = t; wobbleX = dx / l; wobbleZ = dz / l;
    },
    // FL1: show the stick, or take it out (putts). Only touches the scene when it changes.
    setPin(on) {
      const v = hasStick && on;
      if (v !== stickShown) { stickShown = v; stick.visible = v; }
    },
  };
}
