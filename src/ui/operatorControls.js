// src/ui/operatorControls.js
// Task 10: Desktop mouse/keyboard & WebXR controller teleoperation.

import * as THREE from 'three';

let isGripperClosed = false;
let gripBadgeEl = null;
let controllerRight = null;
let controllerGrip = null;
const prevControllerPos = new THREE.Vector3();

/**
 * Initializes keyboard shortcuts, gripper HUD badge, and WebXR controller tracking.
 */
export function setupOperatorControls({ scene, renderer, targetSphere, onTargetMoved, onGripChanged }) {
  // 1. Gripper HUD element
  createGripperHUD(onGripChanged);

  // 2. Keyboard bindings for desktop operator
  window.addEventListener('keydown', (e) => {
    // Avoid interfering if typing in an input
    if (e.target.tagName === 'INPUT') return;

    const step = 0.02; // 2 cm keyboard nudge
    let moved = false;

    switch (e.code) {
      case 'Space':
      case 'KeyG':
        e.preventDefault();
        toggleGripper(onGripChanged);
        break;
      case 'KeyW': // Forward (+Z in workspace)
        targetSphere.position.z += step;
        moved = true;
        break;
      case 'KeyS': // Backward (-Z)
        targetSphere.position.z -= step;
        moved = true;
        break;
      case 'KeyA': // Left (-X)
        targetSphere.position.x -= step;
        moved = true;
        break;
      case 'KeyD': // Right (+X)
        targetSphere.position.x += step;
        moved = true;
        break;
      case 'KeyQ': // Up (+Y)
        targetSphere.position.y += step;
        moved = true;
        break;
      case 'KeyE': // Down (-Y)
        targetSphere.position.y -= step;
        moved = true;
        break;
    }

    if (moved && onTargetMoved) onTargetMoved();
  });

  // 3. WebXR Controller Setup
  controllerRight = renderer.xr.getController(0);
  scene.add(controllerRight);

  // Controller ray indicator line
  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -0.3)
  ]);
  const rayMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.7 });
  controllerRight.add(new THREE.Line(rayGeo, rayMat));

  // Trigger / Grip button to toggle gripper in VR
  controllerRight.addEventListener('selectstart', () => toggleGripper(onGripChanged));
  controllerRight.addEventListener('squeezestart', () => toggleGripper(onGripChanged));

  return {
    updateXR: () => {
      if (renderer.xr.isPresenting && controllerRight) {
        const currentPos = new THREE.Vector3();
        controllerRight.getWorldPosition(currentPos);

        // Update target position if controller has moved
        if (currentPos.distanceTo(prevControllerPos) > 0.003) {
          targetSphere.position.copy(currentPos);
          prevControllerPos.copy(currentPos);
          if (onTargetMoved) onTargetMoved();
        }
      }
    },
    isClosed: () => isGripperClosed
  };
}

function createGripperHUD(onGripChanged) {
  const ikSection = document.querySelector('.ik-section');
  if (!ikSection) return;

  const row = document.createElement('div');
  row.className = 'gripper-control-row';
  row.innerHTML = `
    <span class="gripper-label">Gripper (G / Space):</span>
    <button id="gripper-toggle-btn" class="gripper-btn">OPEN (0%)</button>
  `;
  ikSection.appendChild(row);

  gripBadgeEl = row.querySelector('#gripper-toggle-btn');
  gripBadgeEl.addEventListener('click', () => toggleGripper(onGripChanged));
}

function toggleGripper(callback) {
  isGripperClosed = !isGripperClosed;
  if (gripBadgeEl) {
    if (isGripperClosed) {
      gripBadgeEl.textContent = 'CLOSED (100%)';
      gripBadgeEl.classList.add('closed');
    } else {
      gripBadgeEl.textContent = 'OPEN (0%)';
      gripBadgeEl.classList.remove('closed');
    }
  }
  if (callback) callback(isGripperClosed);
}

