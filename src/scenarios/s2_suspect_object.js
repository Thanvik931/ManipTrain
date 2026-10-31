// src/scenarios/s2_suspect_object.js
// Task 14: Scenario S2 - Suspect-object handling with tilt-sensitive detonation (<15 deg).

import * as THREE from 'three';
import { setGraspableObjects, getHeldObject } from '../physics/gripper.js';

let isRunning = false;
let isDetonated = false;
let startTime = 0;
let finalTime = 0;
let bumpCount = 0;
let suspectObject = null;
let containmentBox = null;
let containmentMeshGroup = null;
let uiElements = {};
const tempQuat = new THREE.Quaternion();
const tempUp = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const START_POS = [0.14, 0.20, 0.48];
const BOX_POS = [-0.14, 0.19, 0.52];

export function initScenarioS2(scene, onComplete) {
  clearSceneS2(scene);
  isDetonated = false;

  // 1. Create Containment Box (open top)
  containmentMeshGroup = new THREE.Group();
  containmentMeshGroup.position.set(...BOX_POS);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.01, 0.10), wallMat);
  containmentMeshGroup.add(base);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.10), wallMat);
  leftWall.position.set(-0.045, 0.04, 0);
  containmentMeshGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.10), wallMat);
  rightWall.position.set(0.045, 0.04, 0);
  containmentMeshGroup.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), wallMat);
  backWall.position.set(0, 0.04, 0.045);
  containmentMeshGroup.add(backWall);

  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), wallMat);
  frontWall.position.set(0, 0.04, -0.045);
  containmentMeshGroup.add(frontWall);

  scene.add(containmentMeshGroup);
  containmentBox = new THREE.Box3().setFromObject(containmentMeshGroup);

  // 2. Create Upright Suspect Cylinder (Hazard yellow with red stripes)
  const cylGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.07, 24);
  const cylMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.3,
    metalness: 0.2
  });
  const mesh = new THREE.Mesh(cylGeo, cylMat);
  mesh.position.set(...START_POS);
  scene.add(mesh);

  suspectObject = {
    name: 'Suspect Cylinder',
    mesh,
    initialPos: new THREE.Vector3(...START_POS),
    isFragile: true,
    isCrushed: false,
    isHeld: false,
    vy: 0,
    minGrip: 25,
    maxGrip: 85
  };

  setGraspableObjects([suspectObject]);
  mountS2UI(onComplete);
}

function clearSceneS2(scene) {
  if (suspectObject && suspectObject.mesh) scene.remove(suspectObject.mesh);
  if (containmentMeshGroup) scene.remove(containmentMeshGroup);
}

function mountS2UI(onComplete) {
  let panel = document.getElementById('scenario-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'scenario-panel';
    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="scenario-header">
      <span class="scenario-title">Scenario S2: Suspect Object (EOD)</span>
      <span id="s2-status" class="scenario-badge">IDLE</span>
    </div>
    <div class="scenario-stats">
      <div><b>Time:</b> <span id="s2-timer">00.0 s</span></div>
      <div><b>Bumps:</b> <span id="s2-bumps">0</span></div>
      <div><b>Tilt:</b> <span id="s2-tilt">0.0°</span> / 15°</div>
    </div>
    <div class="tilt-bar-bg"><div id="s2-tilt-bar" class="tilt-bar-fill"></div></div>
    <button id="s2-action-btn" class="scenario-btn">Start S2 Run</button>
  `;

  uiElements = {
    status: panel.querySelector('#s2-status'),
    timer: panel.querySelector('#s2-timer'),
    bumps: panel.querySelector('#s2-bumps'),
    tilt: panel.querySelector('#s2-tilt'),
    tiltBar: panel.querySelector('#s2-tilt-bar'),
    btn: panel.querySelector('#s2-action-btn')
  };

  uiElements.btn.onclick = () => {
    if (isRunning) resetS2();
    else startS2(onComplete);
  };
}

export function startS2() {
  resetS2();
  isRunning = true;
  startTime = performance.now();
  uiElements.status.textContent = 'RUNNING';
  uiElements.status.className = 'scenario-badge running';
  uiElements.btn.textContent = 'Reset S2';
}

export function resetS2() {
  isRunning = false;
  isDetonated = false;
  bumpCount = 0;
  finalTime = 0;

  if (suspectObject) {
    suspectObject.mesh.position.copy(suspectObject.initialPos);
    suspectObject.mesh.rotation.set(0, 0, 0);
    suspectObject.mesh.material.color.setHex(0xfbbf24);
    suspectObject.isHeld = false;
    suspectObject.isCrushed = false;
    suspectObject.vy = 0;
  }

  if (uiElements.status) {
    uiElements.status.textContent = 'IDLE';
    uiElements.status.className = 'scenario-badge';
    uiElements.timer.textContent = '00.0 s';
    uiElements.bumps.textContent = '0';
    uiElements.tilt.textContent = '0.0°';
    if (uiElements.tiltBar) uiElements.tiltBar.style.width = '0%';
    uiElements.btn.textContent = 'Start S2 Run';
  }
}

export function recordS2Bump() {
  if (!isRunning) return;
  bumpCount += 1;
  if (uiElements.bumps) uiElements.bumps.textContent = `${bumpCount}`;
}

export function updateS2(onComplete) {
  if (!isRunning || !suspectObject) return;

  const elapsed = (performance.now() - startTime) / 1000;
  if (uiElements.timer) uiElements.timer.textContent = `${elapsed.toFixed(1)} s`;

  // 1. Calculate tilt angle relative to vertical world Y axis
  suspectObject.mesh.getWorldQuaternion(tempQuat);
  tempUp.set(0, 1, 0).applyQuaternion(tempQuat);
  const dot = Math.min(1, Math.max(-1, tempUp.dot(WORLD_UP)));
  const tiltDeg = Math.acos(dot) * (180 / Math.PI);

  if (uiElements.tilt) uiElements.tilt.textContent = `${tiltDeg.toFixed(1)}°`;
  if (uiElements.tiltBar) {
    const pct = Math.min(100, (tiltDeg / 15.0) * 100);
    uiElements.tiltBar.style.width = `${pct}%`;
    uiElements.tiltBar.className = tiltDeg > 12.0 ? 'tilt-bar-fill danger' : 'tilt-bar-fill';
  }

  // 2. Detonation condition: tilt > 15 degrees while handled
  if (suspectObject.isHeld && tiltDeg > 15.0 && !isDetonated) {
    isDetonated = true;
    isRunning = false;
    suspectObject.mesh.material.color.setHex(0xef4444);
    uiElements.status.textContent = '💥 DETONATED';
    uiElements.status.className = 'scenario-badge danger';
    uiElements.btn.textContent = 'Restart S2';
    if (onComplete) onComplete({ success: false, reason: 'detonated', tiltDeg, time: elapsed });
    return;
  }

  // 3. Victory condition: safely placed inside containment box
  const held = getHeldObject();
  const dx = suspectObject.mesh.position.x - BOX_POS[0];
  const dz = suspectObject.mesh.position.z - BOX_POS[2];
  const distXZ = Math.sqrt(dx * dx + dz * dz);

  if (distXZ <= 0.045 && suspectObject.mesh.position.y <= 0.22 && held !== suspectObject) {
    isRunning = false;
    finalTime = elapsed;
    uiElements.status.textContent = 'SECURED';
    uiElements.status.className = 'scenario-badge completed';
    uiElements.btn.textContent = 'Restart S2';
    if (onComplete) onComplete({ success: true, time: finalTime, bumps: bumpCount, maxTilt: tiltDeg });
  }
}
