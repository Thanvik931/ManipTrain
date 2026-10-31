// src/ui/operatorControls.js
// Task 12: Operator controls with variable grip force (0-100%), presets, and shortcuts.

import * as THREE from 'three';

let currentGripForce = 0;
let forceSliderEl = null;
let forceDisplayEl = null;
let controllerRight = null;
const prevControllerPos = new THREE.Vector3();

export function setupOperatorControls({ scene, renderer, targetSphere, onTargetMoved, onGripChanged }) {
  createGripperHUD((val) => {
    currentGripForce = val;
    if (onGripChanged) onGripChanged(currentGripForce);
  });

  // Desktop keyboard bindings
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;

    const step = 0.02; // 2 cm step
    let moved = false;

    switch (e.code) {
      case 'Space':
      case 'KeyG':
        e.preventDefault();
        // Toggle between 0% (release) and 50% (safe hold)
        setGripForce(currentGripForce > 0 ? 0 : 50, onGripChanged);
        break;
      case 'KeyW':
        targetSphere.position.z += step;
        moved = true;
        break;
      case 'KeyS':
        targetSphere.position.z -= step;
        moved = true;
        break;
      case 'KeyA':
        targetSphere.position.x -= step;
        moved = true;
        break;
      case 'KeyD':
        targetSphere.position.x += step;
        moved = true;
        break;
      case 'KeyQ':
        targetSphere.position.y += step;
        moved = true;
        break;
      case 'KeyE':
        targetSphere.position.y -= step;
        moved = true;
        break;
    }

    if (moved && onTargetMoved) onTargetMoved();
  });

  // WebXR Controller Setup
  controllerRight = renderer.xr.getController(0);
  scene.add(controllerRight);

  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -0.3)
  ]);
  const rayMat = new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.7 });
  controllerRight.add(new THREE.Line(rayGeo, rayMat));

  // Trigger toggles safe grip in VR
  controllerRight.addEventListener('selectstart', () => {
    setGripForce(currentGripForce > 0 ? 0 : 50, onGripChanged);
  });

  return {
    updateXR: () => {
      if (renderer.xr.isPresenting && controllerRight) {
        const currentPos = new THREE.Vector3();
        controllerRight.getWorldPosition(currentPos);
        if (currentPos.distanceTo(prevControllerPos) > 0.003) {
          targetSphere.position.copy(currentPos);
          prevControllerPos.copy(currentPos);
          if (onTargetMoved) onTargetMoved();
        }
      }
    },
    getGripForce: () => currentGripForce
  };
}

function setGripForce(val, callback) {
  currentGripForce = Math.max(0, Math.min(100, Math.round(val)));
  if (forceSliderEl) forceSliderEl.value = currentGripForce;
  if (forceDisplayEl) forceDisplayEl.textContent = `${currentGripForce}%`;
  if (callback) callback(currentGripForce);
}

function createGripperHUD(onGripChange) {
  const ikSection = document.querySelector('.ik-section');
  if (!ikSection) return;

  const row = document.createElement('div');
  row.className = 'gripper-control-row';
  row.innerHTML = `
    <div class="gripper-label-row">
      <span>Grip Force (Space / G):</span>
      <span id="grip-force-val" class="deg-display">0%</span>
    </div>
    <input type="range" id="grip-force-slider" min="0" max="100" step="1" value="0" />
    <div class="gripper-actions">
      <button id="btn-grip-release" class="grip-btn">Release (0%)</button>
      <button id="btn-grip-hold" class="grip-btn hold">Hold (50%)</button>
      <button id="btn-grip-crush" class="grip-btn danger">Crush (90%)</button>
    </div>
  `;
  ikSection.appendChild(row);

  forceSliderEl = row.querySelector('#grip-force-slider');
  forceDisplayEl = row.querySelector('#grip-force-val');

  forceSliderEl.addEventListener('input', (e) => {
    setGripForce(parseFloat(e.target.value), onGripChange);
  });

  row.querySelector('#btn-grip-release').onclick = () => setGripForce(0, onGripChange);
  row.querySelector('#btn-grip-hold').onclick = () => setGripForce(50, onGripChange);
  row.querySelector('#btn-grip-crush').onclick = () => setGripForce(90, onGripChange);
}
