// src/scenarios/s3_confined_space.js
// Task 15: Scenario S3 - Confined space retrieval through a narrow aperture with wall contact budget (<=5).

import * as THREE from 'three';
import { setGraspableObjects, getHeldObject } from '../physics/gripper.js';
import { startRunAssessment, finishRunAssessment } from '../assessment/assessmentLogger.js';
import { showResultsModal } from '../assessment/resultsScreen.js';

let isRunning = false;
let isFailed = false;
let startTime = 0;
let finalTime = 0;
let wallContacts = 0;
const MAX_CONTACTS = 5;

let specimen = null;
let tunnelGroup = null;
let extractionPad = null;
let extractionRing = null;
let tunnelObstacles = [];
let uiElements = {};

const SPECIMEN_POS = [0.0, 0.20, 0.56];
const EXTRACT_POS = [0.22, 0.166, 0.40];

export function initScenarioS3(scene, onComplete) {
  clearSceneS3(scene);
  isFailed = false;
  wallContacts = 0;

  tunnelGroup = new THREE.Group();
  tunnelObstacles = [];
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.2 });

  const walls = [
    { name: 'Tunnel Left Wall', s: [0.012, 0.14, 0.20], p: [-0.08, 0.235, 0.52] },
    { name: 'Tunnel Right Wall', s: [0.012, 0.14, 0.20], p: [0.08, 0.235, 0.52] },
    { name: 'Tunnel Roof', s: [0.172, 0.012, 0.20], p: [0.0, 0.31, 0.52] },
    { name: 'Tunnel Back Wall', s: [0.172, 0.14, 0.012], p: [0.0, 0.235, 0.62] }
  ];
  walls.forEach((w) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...w.s), wallMat);
    mesh.position.set(...w.p);
    tunnelGroup.add(mesh);
    tunnelObstacles.push({ name: w.name, mesh, box: new THREE.Box3().setFromObject(mesh) });
  });
  scene.add(tunnelGroup);

  extractionPad = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.003, 24), new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.35 }));
  extractionPad.position.set(...EXTRACT_POS);

  extractionRing = new THREE.Mesh(new THREE.RingGeometry(0.042, 0.048, 24), new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide }));
  extractionRing.rotation.x = -Math.PI / 2;
  extractionRing.position.set(EXTRACT_POS[0], EXTRACT_POS[1] + 0.002, EXTRACT_POS[2]);
  scene.add(extractionPad, extractionRing);

  const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 20), new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, roughness: 0.2 }));
  capMesh.position.set(...SPECIMEN_POS);
  scene.add(capMesh);

  specimen = {
    name: 'Confined Specimen',
    mesh: capMesh,
    initialPos: new THREE.Vector3(...SPECIMEN_POS),
    isFragile: false,
    isCrushed: false,
    isHeld: false,
    vy: 0,
    minGrip: 25,
    maxGrip: 100
  };

  setGraspableObjects([specimen]);
  mountS3UI(onComplete);
}

export function getS3Obstacles() {
  return tunnelObstacles;
}

export function clearSceneS3(scene) {
  if (specimen && specimen.mesh) scene.remove(specimen.mesh);
  if (tunnelGroup) scene.remove(tunnelGroup);
  if (extractionPad) scene.remove(extractionPad);
  if (extractionRing) scene.remove(extractionRing);
  tunnelObstacles = [];
}

function mountS3UI(onComplete) {
  let panel = document.getElementById('scenario-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'scenario-panel';
    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="scenario-header">
      <span class="scenario-title">Scenario S3: Confined Space</span>
      <span id="s3-status" class="scenario-badge">IDLE</span>
    </div>
    <div class="scenario-stats">
      <div><b>Time:</b> <span id="s3-timer">00.0 s</span></div>
      <div><b>Contacts:</b> <span id="s3-contacts">0 / 5</span></div>
    </div>
    <div class="tilt-bar-bg"><div id="s3-contact-bar" class="tilt-bar-fill"></div></div>
    <button id="s3-action-btn" class="scenario-btn">Start S3 Run</button>
  `;

  uiElements = {
    status: panel.querySelector('#s3-status'), timer: panel.querySelector('#s3-timer'),
    contacts: panel.querySelector('#s3-contacts'), bar: panel.querySelector('#s3-contact-bar'),
    btn: panel.querySelector('#s3-action-btn')
  };

  uiElements.btn.onclick = () => {
    if (isRunning) resetS3();
    else startS3(onComplete);
  };
}

export function startS3() {
  resetS3();
  isRunning = true;
  startTime = performance.now();
  startRunAssessment('S3');
  uiElements.status.textContent = 'RUNNING';
  uiElements.status.className = 'scenario-badge running';
  uiElements.btn.textContent = 'Reset S3';
}

export function resetS3() {
  isRunning = false;
  isFailed = false;
  wallContacts = 0;
  finalTime = 0;

  if (specimen) {
    specimen.mesh.position.copy(specimen.initialPos);
    specimen.isHeld = false;
    specimen.vy = 0;
  }
  if (extractionPad) extractionPad.material.opacity = 0.35;
  if (uiElements.status) {
    uiElements.status.textContent = 'IDLE';
    uiElements.status.className = 'scenario-badge';
    uiElements.timer.textContent = '00.0 s';
    uiElements.contacts.textContent = `0 / ${MAX_CONTACTS}`;
    if (uiElements.bar) { uiElements.bar.style.width = '0%'; uiElements.bar.className = 'tilt-bar-fill'; }
    uiElements.btn.textContent = 'Start S3 Run';
  }
}

export function recordS3Bump() {
  if (!isRunning) return;
  wallContacts += 1;
  const pct = Math.min(100, (wallContacts / MAX_CONTACTS) * 100);
  if (uiElements.contacts) uiElements.contacts.textContent = `${wallContacts} / ${MAX_CONTACTS}`;
  if (uiElements.bar) {
    uiElements.bar.style.width = `${pct}%`;
    uiElements.bar.className = wallContacts >= MAX_CONTACTS ? 'tilt-bar-fill danger' : 'tilt-bar-fill';
  }
  if (wallContacts > MAX_CONTACTS && !isFailed) {
    isFailed = true;
    isRunning = false;
    uiElements.status.textContent = 'CONTACT LIMIT EXCEEDED';
    uiElements.status.className = 'scenario-badge danger';
    uiElements.btn.textContent = 'Restart S3';
    const report = finishRunAssessment({ success: false, reason: 'contact_limit', contacts: wallContacts });
    showResultsModal(report, () => resetS3());
    if (onComplete) onComplete(report);
  }
}

export function updateS3(onComplete) {
  if (!isRunning || !specimen) return;
  const elapsed = (performance.now() - startTime) / 1000;
  if (uiElements.timer) uiElements.timer.textContent = `${elapsed.toFixed(1)} s`;

  const held = getHeldObject();
  const dx = specimen.mesh.position.x - EXTRACT_POS[0];
  const dz = specimen.mesh.position.z - EXTRACT_POS[2];
  const distXZ = Math.sqrt(dx * dx + dz * dz);

  if (distXZ <= 0.05 && specimen.mesh.position.y <= 0.22 && held !== specimen && wallContacts <= MAX_CONTACTS) {
    isRunning = false;
    finalTime = elapsed;
    if (extractionPad) extractionPad.material.opacity = 0.85;
    uiElements.status.textContent = 'RETRIEVED';
    uiElements.status.className = 'scenario-badge completed';
    uiElements.btn.textContent = 'Restart S3';
    const report = finishRunAssessment({ success: true, time: finalTime, contacts: wallContacts });
    showResultsModal(report, () => resetS3());
    if (onComplete) onComplete(report);
  }
}
