// Flag, cup, ball, shadow, flight trail and the aim guide.
import * as THREE from 'three';
import { CUP_R, BALL_R } from '../core/config.js';

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
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  pole.position.set(cup.x, cup.y + 1.3, cup.z);
  scene.add(pole);
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.55, 12, 4);
  flagGeo.translate(0.45, 0, 0);
  const flagBase = flagGeo.attributes.position.array.slice();
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshLambertMaterial({ color: sc.flagColor, side: THREE.DoubleSide }));
  flag.position.set(cup.x, cup.y + 2.3, cup.z);
  scene.add(flag);

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
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.22, 10), new THREE.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0.85 }), DOTS);
  dots.frustumCulled = false; scene.add(dots);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.1, 40), new THREE.MeshBasicMaterial({ color: 0xffd447, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; scene.add(ring);
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();

  return {
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
    // from = ball, dir = aim direction, len = guide length, target = ring position, putter = small guide
    setAimGuide(visible, from, dir, len, target, putter) {
      dots.visible = ring.visible = visible;
      if (!visible) return;
      const s = putter ? 0.25 : 1;
      for (let i = 0; i < DOTS; i++) {
        const f = (i + 1) / (DOTS + 1);
        tmpV.set(from.x + dir.x * len * f, 0, from.z + dir.z * len * f); tmpV.y = heightAt(tmpV.x, tmpV.z) + 0.06;
        tmpM.makeRotationX(-Math.PI / 2).setPosition(tmpV);
        tmpM.scale(tmpS.set(s, s, s));
        dots.setMatrixAt(i, tmpM);
      }
      dots.instanceMatrix.needsUpdate = true;
      ring.position.set(target.x, heightAt(target.x, target.z) + 0.08, target.z);
      ring.scale.setScalar(putter ? 0.15 : 1 + len / 80);
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
    },
  };
}
