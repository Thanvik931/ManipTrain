// src/ui/jointSliders.js
// Task 6: Sliders with real-time FK validation and 20-pose CSV export for Python verification.

import { jointLimits, clampJointAngle, onLimitHit } from '../kinematics/jointLimiter.js';
import { forwardKinematicsUR5, compareFKWithThree } from '../kinematics/fk.js';

const DEG2RAD = Math.PI / 180;

/**
 * Creates floating HTML sliders for all movable joints of the robot arm.
 */
export function setupJointSliders(robot, onFKCalculated) {
  const existing = document.getElementById('joint-controls');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'joint-controls';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>Joint Controls (6-DOF)</h2>
      <button id="reset-joints-btn" title="Reset all joints to 0°">Reset</button>
    </div>
    <div id="sliders-list"></div>

    <div class="fk-section">
      <div class="fk-header">
        <span>FK vs Three.js Accuracy</span>
        <span id="fk-badge" class="fk-badge fk-pass">0.0 mm</span>
      </div>
      <div class="fk-coords">
        <div><b>Three.js:</b> <span id="pos-three">X: 0.00 Y: 0.00 Z: 0.00</span></div>
        <div><b>FK Math:</b> <span id="pos-fk">X: 0.00 Y: 0.00 Z: 0.00</span></div>
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
  const posThreeEl = panel.querySelector('#pos-three');
  const posFkEl = panel.querySelector('#pos-fk');
  const fkBadgeEl = panel.querySelector('#fk-badge');
  const downloadBtn = panel.querySelector('#download-fk-csv-btn');

  const movableJoints = Object.values(robot.joints).filter(
    (j) => j.jointType === 'revolute' || j.jointType === 'continuous'
  );

  const sliderControls = {};
  let totalHits = 0;

  function getCurrentAnglesRad() {
    const anglesRad = {};
    movableJoints.forEach((j) => {
      const val = sliderControls[j.name] ? parseFloat(sliderControls[j.name].input.value) : 0;
      anglesRad[j.name] = val * DEG2RAD;
    });
    return anglesRad;
  }

  function updateFKVerification() {
    const anglesRad = getCurrentAnglesRad();
    const computedTip = forwardKinematicsUR5(anglesRad);
    const { errorMm, groundTruth } = compareFKWithThree(robot, computedTip);

    posThreeEl.textContent = `X:${groundTruth.x.toFixed(3)} Y:${groundTruth.y.toFixed(3)} Z:${groundTruth.z.toFixed(3)}`;
    posFkEl.textContent = `X:${computedTip.x.toFixed(3)} Y:${computedTip.y.toFixed(3)} Z:${computedTip.z.toFixed(3)}`;
    fkBadgeEl.textContent = `Δ ${errorMm.toFixed(2)} mm`;
    fkBadgeEl.className = errorMm <= 1.0 ? 'fk-badge fk-pass' : 'fk-badge fk-warn';

    if (onFKCalculated) onFKCalculated(computedTip);
  }

  movableJoints.forEach((joint) => {
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
    });

    sliderControls[joint.name] = { input, display, row };
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

  panel.querySelector('#reset-joints-btn').addEventListener('click', () => {
    Object.keys(sliderControls).forEach((name) => {
      const { input, display, row } = sliderControls[name];
      input.value = '0';
      display.textContent = '0.0°';
      row.classList.remove('limit-hit');
      robot.setJointValue(name, 0);
    });
    updateFKVerification();
  });

  // Export 20 poses CSV for Python check_fk.py
  downloadBtn.addEventListener('click', () => {
    exportFKPosesCSV(movableJoints, sliderControls);
  });

  setTimeout(updateFKVerification, 50);
}

/**
 * Generates and downloads a CSV of 20 joint configurations and JS FK results.
 */
function exportFKPosesCSV(joints, sliderControls) {
  const rows = ['pose_id,q1_deg,q2_deg,q3_deg,q4_deg,q5_deg,q6_deg,js_x,js_y,js_z'];
  const testAngles = [
    [0, 0, 0, 0, 0, 0],
    [45, -30, 60, 0, 45, 0],
    [-90, 45, -45, 90, -90, 45],
    [180, -90, 90, -45, 45, -90],
    [-45, -60, -60, -60, 90, 0]
  ];

  for (let i = 0; i < 20; i++) {
    const q = testAngles[i] || [
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fk_poses.csv';
  a.click();
  URL.revokeObjectURL(url);
}
