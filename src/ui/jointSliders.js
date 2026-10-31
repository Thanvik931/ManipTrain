// src/ui/jointSliders.js
// Task 5: Sliders with real-time Forward Kinematics (FK) vs Three.js ground truth verification.

import { jointLimits, clampJointAngle, onLimitHit } from '../kinematics/jointLimiter.js';
import { forwardKinematicsUR5, compareFKWithThree } from '../kinematics/fk.js';

const DEG2RAD = Math.PI / 180;

/**
 * Creates floating HTML sliders for all movable joints of the robot arm.
 * @param {URDFRobot} robot - The loaded Three.js URDF robot instance
 * @param {Function} [onFKCalculated] - Optional callback passing computed FK tip vector
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

    <!-- Real-time Forward Kinematics Verification HUD -->
    <div class="fk-section">
      <div class="fk-header">
        <span>FK vs Three.js Accuracy</span>
        <span id="fk-badge" class="fk-badge fk-pass">0.0 mm</span>
      </div>
      <div class="fk-coords">
        <div><b>Three.js:</b> <span id="pos-three">X: 0.00 Y: 0.00 Z: 0.00</span></div>
        <div><b>FK Math:</b> <span id="pos-fk">X: 0.00 Y: 0.00 Z: 0.00</span></div>
      </div>
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

  const movableJoints = Object.values(robot.joints).filter(
    (j) => j.jointType === 'revolute' || j.jointType === 'continuous'
  );

  const sliderControls = {};
  let totalHits = 0;

  function updateFKVerification() {
    // Collect current joint angles
    const anglesRad = {};
    movableJoints.forEach((j) => {
      const val = sliderControls[j.name] ? parseFloat(sliderControls[j.name].input.value) : 0;
      anglesRad[j.name] = val * DEG2RAD;
    });

    // 1. Run our manual FK computation
    const computedTip = forwardKinematicsUR5(anglesRad);
    // 2. Compare against Three.js scene graph world position
    const { errorMm, groundTruth } = compareFKWithThree(robot, computedTip);

    posThreeEl.textContent = `X:${groundTruth.x.toFixed(3)} Y:${groundTruth.y.toFixed(3)} Z:${groundTruth.z.toFixed(3)}`;
    posFkEl.textContent = `X:${computedTip.x.toFixed(3)} Y:${computedTip.y.toFixed(3)} Z:${computedTip.z.toFixed(3)}`;
    fkBadgeEl.textContent = `Δ ${errorMm.toFixed(2)} mm`;

    if (errorMm <= 1.0) {
      fkBadgeEl.className = 'fk-badge fk-pass';
    } else {
      fkBadgeEl.className = 'fk-badge fk-warn';
    }

    if (onFKCalculated) onFKCalculated(computedTip);
  }

  movableJoints.forEach((joint) => {
    const cfg = jointLimits[joint.name] || { minDeg: -360, maxDeg: 360, label: joint.name };
    const buffer = 15;

    const row = document.createElement('div');
    row.className = 'slider-row';
    row.id = `row-${joint.name}`;
    row.innerHTML = `
      <div class="slider-label-row">
        <label for="slider-${joint.name}">${cfg.label || joint.name}</label>
        <span class="deg-display" id="val-${joint.name}">0.0°</span>
      </div>
      <input 
        type="range" 
        id="slider-${joint.name}" 
        min="${cfg.minDeg - buffer}" 
        max="${cfg.maxDeg + buffer}" 
        step="0.5" 
        value="0" 
      />
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

  // Initial calculation at home pose
  setTimeout(updateFKVerification, 50);
}
