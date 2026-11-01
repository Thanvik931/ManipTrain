// src/ui/autoDemo.js
// Complete automated demonstration across S1, S2, S3, instructor delay panel, and assessment modal.

import * as THREE from 'three';
import { showResultsModal } from '../assessment/resultsScreen.js';

export function setupAutoDemo(ctx) {
  const overlay = document.getElementById('overlay-info');
  if (overlay) {
    const btn = document.createElement('button');
    btn.id = 'b-autodemo';
    btn.className = 'scen-btn';
    Object.assign(btn.style, { background: '#7c3aed', color: '#fff', borderColor: '#a78bfa', marginLeft: '6px' });
    btn.innerText = 'Auto Demo';
    btn.onclick = () => runDemoSequence(ctx);
    const switcher = document.getElementById('scenario-switcher');
    if (switcher) switcher.appendChild(btn);
  }

  window.runAutoDemo = (cb) => runDemoSequence(ctx, cb);
  if (new URLSearchParams(window.location.search).get('autodemo') === '1') {
    setTimeout(() => runDemoSequence(ctx), 1200);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dismissModal() {
  const m = document.getElementById('results-modal');
  if (m) m.remove();
}

async function smoothMove(targetSphere, runActiveIK, targetPos, durationMs = 700) {
  const start = targetSphere.position.clone();
  const startTime = performance.now();
  return new Promise((resolve) => {
    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(1.0, elapsed / durationMs);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      targetSphere.position.lerpVectors(start, targetPos, ease);
      runActiveIK(targetSphere.position);
      if (t < 1.0) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

function clickElement(id) {
  const el = document.getElementById(id);
  if (el) el.click();
}

async function runDemoSequence(ctx, onComplete) {
  const { targetSphere, runActiveIK, pushDelayedGrip } = ctx;
  console.log('[AutoDemo] Commencing multi-scenario demonstration sequence...');

  // ----------------------------------------------------
  // ACT 1: SCENARIO S1 - Pick & Place (Red, Green, Blue)
  // ----------------------------------------------------
  clickElement('b-s1');
  await sleep(600);
  clickElement('s1-action-btn');
  await sleep(400);

  // Red Block (Pick from [-0.14, 0.185, 0.42] -> Place at [-0.14, 0.185, 0.54])
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.14, 0.28, 0.42), 500);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.14, 0.21, 0.42), 600);
  pushDelayedGrip(50);
  await sleep(400);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.14, 0.28, 0.42), 500);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.14, 0.28, 0.54), 600);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.14, 0.21, 0.54), 500);
  pushDelayedGrip(0);
  await sleep(400);

  // Green Block (Pick from [0.0, 0.185, 0.42] -> Place at [0.0, 0.185, 0.54])
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.28, 0.45), 500);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.21, 0.42), 600);
  pushDelayedGrip(50);
  await sleep(400);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.28, 0.42), 500);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.28, 0.54), 600);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.21, 0.54), 500);
  pushDelayedGrip(0);
  await sleep(400);

  // Blue Block (Pick from [0.14, 0.185, 0.42] -> Place at [0.14, 0.185, 0.54])
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.28, 0.45), 500);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.21, 0.42), 600);
  pushDelayedGrip(50);
  await sleep(400);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.28, 0.42), 500);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.28, 0.54), 600);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.21, 0.54), 500);
  pushDelayedGrip(0);
  await sleep(1500); // Allow S1 victory modal to shine
  dismissModal();
  await sleep(500);

  // ----------------------------------------------------
  // ACT 2: SCENARIO S2 - Suspect Object EOD Handling
  // ----------------------------------------------------
  clickElement('b-s2');
  await sleep(600);
  clickElement('s2-action-btn');
  await sleep(400);

  // Approach cylinder, grip at 48%, lift upright over partition into containment box
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.28, 0.48), 600);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.23, 0.48), 600);
  pushDelayedGrip(48);
  await sleep(400);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.14, 0.32, 0.48), 700);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.14, 0.32, 0.52), 1000);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.14, 0.21, 0.52), 600);
  pushDelayedGrip(0);
  await sleep(1500); // S2 SECURED modal
  dismissModal();
  await sleep(500);

  // ----------------------------------------------------
  // ACT 3: SCENARIO S3 - Confined Space Tunnel Retrieval
  // ----------------------------------------------------
  clickElement('b-s3');
  await sleep(600);
  clickElement('s3-action-btn');
  await sleep(400);

  // Approach tunnel centerline, penetrate to capsule, grip, withdraw, transport to pad
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.22, 0.35), 700);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.22, 0.52), 1000);
  pushDelayedGrip(55);
  await sleep(500);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.0, 0.22, 0.35), 1000);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.22, 0.28, 0.40), 700);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.22, 0.20, 0.40), 600);
  pushDelayedGrip(0);
  await sleep(1500); // S3 RETRIEVED modal
  dismissModal();
  await sleep(500);

  // ----------------------------------------------------
  // ACT 4: INSTRUCTOR PANEL & NETWORK DELAY DEMO
  // ----------------------------------------------------
  clickElement('instructor-toggle-btn');
  await sleep(800);
  const selMode = document.getElementById('sel-delay-mode');
  if (selMode) {
    selMode.value = 'fixed-300';
    selMode.dispatchEvent(new Event('change'));
  }
  const selLoss = document.getElementById('sel-packet-loss');
  if (selLoss) {
    selLoss.value = '5';
    selLoss.dispatchEvent(new Event('change'));
  }
  await sleep(1000);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(0.10, 0.30, 0.42), 600);
  await smoothMove(targetSphere, runActiveIK, new THREE.Vector3(-0.10, 0.30, 0.42), 600);
  if (selMode) {
    selMode.value = 'fixed-0';
    selMode.dispatchEvent(new Event('change'));
  }
  clickElement('instructor-toggle-btn');
  await sleep(500);

  // ----------------------------------------------------
  // ACT 5: FINAL SCORECARD DISPLAY (GRADE A RESULTS SCREEN)
  // ----------------------------------------------------
  const finalReport = {
    sessionId: `eval_${Date.now()}`,
    scenario: 'S3 (Confined Space) + Assessment Suite',
    delayConfig: { mode: 'Fixed Delay', meanLatencyMs: 300.0 },
    outcome: 'SUCCESS',
    completionTimeSec: 24.2,
    score: {
      finalScore: 96,
      grade: 'A',
      penalties: { time: 0.0, collision: 0.0, jerk: 2.1, grip: 1.9, limits: 0.0, outcome: 0.0 }
    },
    metrics: {
      collisionCount: 0,
      maxImpactN: 0.0,
      meanJerkIndex: 22.4,
      gripEvents: { slip: 0, crush: 0 },
      limitHits: 0
    }
  };
  showResultsModal(finalReport);
  console.log('[AutoDemo] Demonstration tour complete.');
  window.__demoCompleted = true;
  if (onComplete) onComplete();
}
