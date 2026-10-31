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

  const collarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 16);
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.4 });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.rotation.x = Math.PI / 2;
  gripperGroup.add(collar);

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
 * Evaluates grasp state transitions (grab, hold, slip, crush).
 * Called only when grip force changes.
 */
export function updateGrip(gripPercent, onEvent) {
  const halfGap = 0.025 - (gripPercent / 100) * 0.021;
  if (leftFinger && rightFinger) {
    leftFinger.position.x = -halfGap;
    rightFinger.position.x = halfGap;
  }

  if (!gripperGroup) return;
  gripperGroup.getWorldPosition(tempWorldPos);

  if (heldObject) {
    if (gripPercent < heldObject.minGrip) {
      heldObject.isHeld = false;
      const released = heldObject;
      heldObject = null;
      if (onEvent) onEvent({ type: 'slip', name: released.name, gripPercent });
    } else if (heldObject.isFragile && gripPercent > heldObject.maxGrip && !heldObject.isCrushed) {
      heldObject.isCrushed = true;
      heldObject.mesh.material.color.setHex(0xef4444);
      heldObject.mesh.scale.set(1.4, 0.3, 1.4);
      if (onEvent) onEvent({ type: 'crush', name: heldObject.name, gripPercent });
    } else {
      heldObject.mesh.position.copy(tempWorldPos);
    }
    return;
  }

  if (gripPercent >= 25) {
    for (const obj of graspables) {
      if (obj.isCrushed) continue;
      obj.mesh.getWorldPosition(tempObjPos);
      if (tempWorldPos.distanceTo(tempObjPos) < 0.06) {
        obj.isHeld = true;
        heldObject = obj;
        if (onEvent) onEvent({ type: 'grab', name: obj.name, gripPercent });
        break;
      }
    }
  }
}

/**
 * Keeps held object attached to the gripper during animation loop.
 */
export function syncHeldObject() {
  if (heldObject && gripperGroup) {
    gripperGroup.getWorldPosition(tempWorldPos);
    heldObject.mesh.position.copy(tempWorldPos);
  }
}

/**
 * Steps simple downward gravity for unheld items.
 */
export function updateGravity(dt = 0.016) {
  const tableTopY = 0.185;
  const floorY = 0.02;

  for (const obj of graspables) {
    if (obj.isHeld) continue;

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
