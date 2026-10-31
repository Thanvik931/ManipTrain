// src/ui/jointSliders.js
// Task 7: Sliders with bidirectional target tracking and clean home-reset sync.

import { jointLimits, clampJointAngle, onLimitHit } from '../kinematics/jointLimiter.js';
import { forwardKinematicsUR5, compareFKWithThree } from '../kinematics/fk.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

let currentSliders = {};
let movableJointsList = [];

export function setupJointSliders(robot, onFKCalculated, onTargetSync, onReset) {
  const existing = document.getElementById('joint-controls');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'joint-controls';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>ManipTrain Controls (6-DOF)</h2>
      <button id="reset-joints-btn" title="Reset all joints to 0°">Reset</button>
    </div>
    <div id="sliders-list"></div>

    <div class="ik-section">
      <div class="panel-sub-header">
        <span>IK Solver (CCD Target Chasing)</span>
        <span id="ik-badge" class="fk-badge fk-pass">0.0 mm</span>
      </div>
      <div class="stat-coords">
        <div><b>Target:</b> <span id="ik-target-pos">X:0.00 Y:0.00 Z:0.00</span></div>
        <div><b>Iterations:</b> <span id="ik-iters">0 / 20</span></div>
      </div>
    </div>

    <div class="fk-section">
      <div class="panel-sub-header">
        <span>FK vs Three.js Verification</span>
        <span id="fk-badge" class="fk-badge fk-pass">0.0 mm</span>
      </div>
      <button id="download-fk-csv-btn" class="csv-download-btn">⬇ Download 20 FK Poses (CSV)</button>
    </div>

    <div class="log-section">
      <div class="log-header">
        <span>Limit Violation Log</span>
        <span id="log-count">0 hits</span>
      </div>
      <div id="limit-log-feed">No violations</div>
    </div>
  `;
  document.body.appendChild(panel);

  const slidersList = panel.querySelector('#sliders-list');
  const logFeed = panel.querySelector('#limit-log-feed');
  const logCount = panel.querySelector('#log-count');
  const fkBadgeEl = panel.querySelector('#fk-badge');

  movableJointsList = Object.values(robot.joints).filter(
    (j) => j.jointType === 'revolute' || j.jointType === 'continuous'
  );

  currentSliders = {};
  let totalHits = 0;

  function updateFKVerification() {
    const anglesRad = {};
    movableJointsList.forEach((j) => {
      const val = currentSliders[j.name] ? parseFloat(currentSliders[j.name].input.value) : 0;
      anglesRad[j.name] = val * DEG2RAD;
    });

    const computedTip = forwardKinematicsUR5(anglesRad);
    const { errorMm } = compareFKWithThree(robot, computedTip);

    fkBadgeEl.textContent = `Δ ${errorMm.toFixed(2)} mm`;
    fkBadgeEl.className = errorMm <= 1.0 ? 'fk-badge fk-pass' : 'fk-badge fk-warn';

    if (onFKCalculated) onFKCalculated(computedTip);
  }

  movableJointsList.forEach((joint) => {
    const cfg = jointLimits[joint.name] || { minDeg: -360, maxDeg: 360, label: joint.name };
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.id = `row-${joint.name}`;
    row.innerHTML = `
      <div class="slider-label-row">
        <label for="slider-${joint.name}">${cfg.label || joint.name}</label>
        <span class="deg-display" id="val-${joint.name}">0.0°</span>
      </div>
      <input type="range" id="slider-${joint.name}" min="${cfg.minDeg - 15}" max="${cfg.maxDeg + 15}" step="0.5" value="0" />
    `;

    const input = row.querySelector('input');
    const display = row.querySelector('.deg-display');

    input.addEventListener('input', (e) => {
      const requestedDeg = parseFloat(e.target.value);
      const { clampedDeg, isAtLimit } = clampJointAngle(joint.name, requestedDeg);
      display.textContent = `${clampedDeg.toFixed(1)}°`;
      robot.setJointValue(joint.name, clampedDeg * DEG2RAD);

      if (isAtLimit) {
        row.classList.remove('limit-hit');
        void row.offsetWidth;
        row.classList.add('limit-hit');
      } else {
        row.classList.remove('limit-hit');
      }
      updateFKVerification();

      // Keep target point attached to wrist when sliders move manually
      if (onTargetSync) onTargetSync();
    });

    currentSliders[joint.name] = { input, display, row };
    slidersList.appendChild(row);
  });

  onLimitHit((entry) => {
    totalHits += 1;
    logCount.textContent = `${totalHits} hit${totalHits === 1 ? '' : 's'}`;
    logFeed.innerHTML = `
      <div class="log-entry">
        <span class="log-time">[${entry.timestamp}]</span>
        <span class="log-msg"><b>${entry.label}</b> limit (${entry.clampedDeg}°)</span>
      </div>
    `;
  });

  // Reset button: resets joints to 0.0° and triggers home position sync
  panel.querySelector('#reset-joints-btn').addEventListener('click', () => {
    Object.keys(currentSliders).forEach((name) => {
      const { input, display, row } = currentSliders[name];
      input.value = '0';
      display.textContent = '0.0°';
      row.classList.remove('limit-hit');
      robot.setJointValue(name, 0);
    });
    robot.updateMatrixWorld(true);
    updateFKVerification();
    if (onReset) onReset();
  });

  panel.querySelector('#download-fk-csv-btn').addEventListener('click', () => {
    exportFKPosesCSV();
  });

  setTimeout(updateFKVerification, 50);
}

export function updateSlidersFromRobot(robot) {
  movableJointsList.forEach((j) => {
    const s = currentSliders[j.name];
    if (s && j.angle !== undefined) {
      const deg = j.angle * RAD2DEG;
      s.input.value = deg.toFixed(1);
      s.display.textContent = `${deg.toFixed(1)}°`;
    }
  });
}

export function updateIKHUD(targetPos, distanceMm, iters, reached) {
  const targetPosEl = document.getElementById('ik-target-pos');
  const itersEl = document.getElementById('ik-iters');
  const badgeEl = document.getElementById('ik-badge');

  if (targetPosEl) targetPosEl.textContent = `X:${targetPos.x.toFixed(2)} Y:${targetPos.y.toFixed(2)} Z:${targetPos.z.toFixed(2)}`;
  if (itersEl) itersEl.textContent = `${iters} / 20 iters`;
  if (badgeEl) {
    badgeEl.textContent = `${distanceMm.toFixed(1)} mm`;
    badgeEl.className = reached ? 'fk-badge fk-pass' : 'fk-badge fk-warn';
  }
}

function exportFKPosesCSV() {
  const rows = ['pose_id,q1_deg,q2_deg,q3_deg,q4_deg,q5_deg,q6_deg,js_x,js_y,js_z'];
  for (let i = 0; i < 20; i++) {
    const q = [
      (Math.random() * 360 - 180).toFixed(1),
      (Math.random() * 180 - 120).toFixed(1),
      (Math.random() * 300 - 150).toFixed(1),
      (Math.random() * 360 - 180).toFixed(1),
      (Math.random() * 360 - 180).toFixed(1),
      (Math.random() * 360 - 180).toFixed(1)
    ].map(Number);

    const rads = {
      shoulder_pan_joint: q[0] * DEG2RAD,
      shoulder_lift_joint: q[1] * DEG2RAD,
      elbow_joint: q[2] * DEG2RAD,
      wrist_1_joint: q[3] * DEG2RAD,
      wrist_2_joint: q[4] * DEG2RAD,
      wrist_3_joint: q[5] * DEG2RAD
    };
    const tip = forwardKinematicsUR5(rads);
    rows.push(`${i + 1},${q[0]},${q[1]},${q[2]},${q[3]},${q[4]},${q[5]},${tip.x.toFixed(6)},${tip.y.toFixed(6)},${tip.z.toFixed(6)}`);
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fk_poses.csv';
  a.click();
}
