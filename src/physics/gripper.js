// src/physics/gripper.js
// Task 12: Two-finger visual gripper, graspable objects, hold/slip/crush rules, and simple gravity.

import * as THREE from 'three';

let gripperGroup = null;
let leftFinger = null;
let rightFinger = null;
let graspables = [];
let heldObject = null;
const tempWorldPos = new THREE.Vector3();
const tempObjPos = new THREE.Vector3();

/**
 * Attaches a two-finger mechanical gripper to the robot's end-effector flange.
 */
export function attachGripper(eeLink) {
  gripperGroup = new THREE.Group();

  // Gripper mount collar
  const collarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16);
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.4 });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.rotation.x = Math.PI / 2;
  gripperGroup.add(collar);

  // Left and right parallel jaws
  const fingerGeo = new THREE.BoxGeometry(0.008, 0.045, 0.015);
  const fingerMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.3 });

  leftFinger = new THREE.Mesh(fingerGeo, fingerMat);
  leftFinger.position.set(-0.025, 0, 0.03);
  gripperGroup.add(leftFinger);

  rightFinger = new THREE.Mesh(fingerGeo, fingerMat);
  rightFinger.position.set(0.025, 0, 0.03);
  gripperGroup.add(rightFinger);

  eeLink.add(gripperGroup);
  return gripperGroup;
}

/**
 * Creates a solid cube and a fragile glass object resting on the table.
 */
export function createGraspableObjects(scene) {
  graspables = [];

  // 1. Solid Blue Cube
  const cubeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
  const cube = new THREE.Mesh(cubeGeo, cubeMat);
  cube.position.set(0.12, 0.185, 0.50);
  scene.add(cube);
  graspables.push({
    name: 'Solid Cube',
    mesh: cube,
    isFragile: false,
    isCrushed: false,
    isHeld: false,
    vy: 0,
    minGrip: 25,
    maxGrip: 100
  });

  // 2. Fragile Amber Glass Object (detonation/crush sensitive)
  const flaskGeo = new THREE.SphereGeometry(0.022, 20, 20);
  const flaskMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85
  });
  const flask = new THREE.Mesh(flaskGeo, flaskMat);
  flask.position.set(-0.12, 0.185, 0.50);
  scene.add(flask);
  graspables.push({
    name: 'Fragile Object',
    mesh: flask,
    isFragile: true,
    isCrushed: false,
    isHeld: false,
    vy: 0,
    minGrip: 25,
    maxGrip: 75
  });

  return graspables;
}

/**
 * Updates visual fingers and applies simplified grasping rules (hold, slip, crush).
 */
export function updateGrip(gripPercent, onEvent) {
  // Animate jaw gap: 0% -> 50mm gap, 100% -> 8mm gap
  const halfGap = 0.025 - (gripPercent / 100) * 0.021;
  if (leftFinger && rightFinger) {
    leftFinger.position.x = -halfGap;
    rightFinger.position.x = halfGap;
  }

  if (!gripperGroup) return;
  gripperGroup.getWorldPosition(tempWorldPos);

  // 1. If currently holding an object: evaluate hold, slip, or crush
  if (heldObject) {
    if (gripPercent < heldObject.minGrip) {
      // Slip condition
      heldObject.isHeld = false;
      const released = heldObject;
      heldObject = null;
      if (onEvent) onEvent({ type: 'slip', name: released.name, gripPercent });
    } else if (heldObject.isFragile && gripPercent > heldObject.maxGrip && !heldObject.isCrushed) {
      // Crush condition
      heldObject.isCrushed = true;
      heldObject.mesh.material.color.setHex(0xef4444);
      heldObject.mesh.scale.set(1.4, 0.3, 1.4); // squashed
      if (onEvent) onEvent({ type: 'crush', name: heldObject.name, gripPercent });
    } else {
      // Held: follow gripper tip position
      heldObject.mesh.position.copy(tempWorldPos);
    }
    return;
  }

  // 2. Not holding: check if fingers close around a nearby object
  if (gripPercent >= 25) {
    for (const obj of graspables) {
      if (obj.isCrushed) continue;
      obj.mesh.getWorldPosition(tempObjPos);
      if (tempWorldPos.distanceTo(tempObjPos) < 0.055) {
        obj.isHeld = true;
        heldObject = obj;
        if (onEvent) onEvent({ type: 'grab', name: obj.name, gripPercent });
        break;
      }
    }
  }
}

/**
 * Applies simplified downward gravity to any released/slipped objects.
 */
export function updateGravity(dt = 0.016) {
  const tableTopY = 0.185;
  const floorY = 0.02;

  for (const obj of graspables) {
    if (obj.isHeld) continue;

    // Check if directly above table surface (X: [-0.35, 0.35], Z: [0.32, 0.72])
    const onTable = Math.abs(obj.mesh.position.x) <= 0.35 &&
                    obj.mesh.position.z >= 0.30 &&
                    obj.mesh.position.z <= 0.74;
    const targetFloor = onTable ? tableTopY : floorY;

    if (obj.mesh.position.y > targetFloor) {
      obj.vy = (obj.vy || 0) - 9.8 * dt;
      obj.mesh.position.y += obj.vy * dt;
      if (obj.mesh.position.y <= targetFloor) {
        obj.mesh.position.y = targetFloor;
        obj.vy = 0;
      }
    }
  }
}
