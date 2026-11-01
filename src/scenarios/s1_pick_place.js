// src/scenarios/s1_pick_place.js
// Task 13: Scenario S1 - Pick and place 3 colored blocks into matching target zones.

import * as THREE from 'three';
import { setGraspableObjects, getHeldObject } from '../physics/gripper.js';
import { startRunAssessment, finishRunAssessment } from '../assessment/assessmentLogger.js';
import { showResultsModal } from '../assessment/resultsScreen.js';

let isRunning = false;
let startTime = 0;
let finalTime = 0;
let bumpCount = 0;
let blocks = [];
let targetZones = [];
let uiElements = {};

const BLOCK_CONFIG = [
  { name: 'Red Block', color: 0xef4444, start: [-0.14, 0.185, 0.42], target: [-0.14, 0.166, 0.54] },
  { name: 'Green Block', color: 0x10b981, start: [0.0, 0.185, 0.42], target: [0.0, 0.166, 0.54] },
  { name: 'Blue Block', color: 0x3b82f6, start: [0.14, 0.185, 0.42], target: [0.14, 0.166, 0.54] }
];

export function initScenarioS1(scene, onComplete) {
  clearSceneObjects(scene);
  blocks = [];
  targetZones = [];

  // 1. Create 3 target zones on table surface
  BLOCK_CONFIG.forEach((cfg) => {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.003, 24),
      new THREE.MeshStandardMaterial({ color: cfg.color, transparent: true, opacity: 0.35, roughness: 0.2 })
    );
    pad.position.set(...cfg.target);
    scene.add(pad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.036, 0.040, 24),
      new THREE.MeshBasicMaterial({ color: cfg.color, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cfg.target[0], cfg.target[1] + 0.002, cfg.target[2]);
    scene.add(ring);

    targetZones.push({ config: cfg, pad, ring, isPlaced: false });
  });

  // 2. Create 3 colored blocks
  BLOCK_CONFIG.forEach((cfg) => {
    const geo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
    const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.3, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cfg.start[0], cfg.start[1], cfg.start[2]);
    scene.add(mesh);

    blocks.push({
      name: cfg.name,
      mesh,
      initialPos: new THREE.Vector3(...cfg.start),
      isFragile: false,
      isCrushed: false,
      isHeld: false,
      vy: 0,
      minGrip: 25,
      maxGrip: 100
    });
  });

  setGraspableObjects(blocks);
  mountS1UI(onComplete);
}

export function clearSceneObjects(scene) {
  blocks.forEach((b) => scene.remove(b.mesh));
  targetZones.forEach((z) => {
    scene.remove(z.pad);
    scene.remove(z.ring);
  });
}

function mountS1UI(onComplete) {
  let panel = document.getElementById('scenario-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'scenario-panel';
    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="scenario-header">
      <span class="scenario-title">Scenario S1: Pick & Place</span>
      <span id="s1-status" class="scenario-badge">IDLE</span>
    </div>
    <div class="scenario-stats">
      <div><b>Time:</b> <span id="s1-timer">00.0 s</span></div>
      <div><b>Bumps:</b> <span id="s1-bumps">0</span></div>
      <div><b>Placed:</b> <span id="s1-placed">0 / 3</span></div>
    </div>
    <button id="s1-action-btn" class="scenario-btn">Start Run</button>
  `;

  uiElements = {
    status: panel.querySelector('#s1-status'), timer: panel.querySelector('#s1-timer'),
    bumps: panel.querySelector('#s1-bumps'), placed: panel.querySelector('#s1-placed'),
    btn: panel.querySelector('#s1-action-btn')
  };

  uiElements.btn.onclick = () => {
    if (isRunning) resetS1();
    else startS1(onComplete);
  };
}

export function startS1() {
  resetS1();
  isRunning = true;
  startTime = performance.now();
  startRunAssessment('S1');
  uiElements.status.textContent = 'RUNNING';
  uiElements.status.className = 'scenario-badge running';
  uiElements.btn.textContent = 'Reset S1';
}

export function resetS1() {
  isRunning = false;
  bumpCount = 0;
  finalTime = 0;

  blocks.forEach((b) => {
    b.mesh.position.copy(b.initialPos);
    b.isHeld = false;
    b.vy = 0;
  });

  targetZones.forEach((z) => {
    z.isPlaced = false;
    z.pad.material.opacity = 0.35;
  });

  if (uiElements.status) {
    uiElements.status.textContent = 'IDLE';
    uiElements.status.className = 'scenario-badge';
    uiElements.timer.textContent = '00.0 s';
    uiElements.bumps.textContent = '0';
    uiElements.placed.textContent = '0 / 3';
    uiElements.btn.textContent = 'Start Run';
  }
}

export function recordS1Bump() {
  if (!isRunning) return;
  bumpCount += 1;
  if (uiElements.bumps) uiElements.bumps.textContent = `${bumpCount}`;
}

export function updateS1(onComplete) {
  if (!isRunning) return;

  const elapsed = (performance.now() - startTime) / 1000;
  if (uiElements.timer) uiElements.timer.textContent = `${elapsed.toFixed(1)} s`;

  const held = getHeldObject();
  let placedCount = 0;

  targetZones.forEach((zone, idx) => {
    const block = blocks[idx];
    const dx = block.mesh.position.x - zone.config.target[0];
    const dz = block.mesh.position.z - zone.config.target[2];
    const distXZ = Math.sqrt(dx * dx + dz * dz);

    // Placed if inside target circle, resting near table surface, and released
    if (distXZ <= 0.045 && held !== block && Math.abs(block.mesh.position.y - 0.185) < 0.03) {
      zone.isPlaced = true;
      zone.pad.material.opacity = 0.85; // Glow
      placedCount += 1;
    } else {
      zone.isPlaced = false;
      zone.pad.material.opacity = 0.35;
    }
  });

  if (uiElements.placed) uiElements.placed.textContent = `${placedCount} / 3`;

  // Check victory condition: all 3 blocks placed
  if (placedCount === 3) {
    isRunning = false;
    finalTime = elapsed;
    uiElements.status.textContent = 'COMPLETED';
    uiElements.status.className = 'scenario-badge completed';
    uiElements.btn.textContent = 'Restart Run';
    const report = finishRunAssessment({ success: true, time: finalTime, bumps: bumpCount });
    showResultsModal(report, () => resetS1());
    if (onComplete) onComplete(report);
  }
}

