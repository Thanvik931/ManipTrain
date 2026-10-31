// src/ui/jointSliders.js
// Task 4: Sliders with central limit clamping, red flashing, and timestamped hit logging.

import { jointLimits, clampJointAngle, onLimitHit } from '../kinematics/jointLimiter.js';

const DEG2RAD = Math.PI / 180;

/**
 * Creates floating HTML sliders for all movable joints of the robot arm.
 * @param {URDFRobot} robot - The loaded Three.js URDF robot instance
 */
export function setupJointSliders(robot) {
  const existing = document.getElementById('joint-controls');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'joint-controls';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>Joint Controls & Limits</h2>
      <button id="reset-joints-btn" title="Reset all joints to 0°">Reset</button>
    </div>
    <div id="sliders-list"></div>
    <div class="log-section">
      <div class="log-header">
        <span>Limit Violation Log</span>
        <span id="log-count">0 hits</span>
      </div>
      <div id="limit-log-feed">Waiting for input...</div>
    </div>
  `;
  document.body.appendChild(panel);

  const slidersList = panel.querySelector('#sliders-list');
  const logFeed = panel.querySelector('#limit-log-feed');
  const logCount = panel.querySelector('#log-count');

  const movableJoints = Object.values(robot.joints).filter(
    (j) => j.jointType === 'revolute' || j.jointType === 'continuous'
  );

  const sliderControls = {};
  let totalHits = 0;

  movableJoints.forEach((joint) => {
    // Read single source of truth from jointLimits.json
    const cfg = jointLimits[joint.name] || { minDeg: -360, maxDeg: 360, label: joint.name };
    const buffer = 15; // 15° overdrag room so dragging past limit is demonstrable

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
      // Central clamping enforcement
      const { clampedDeg, isAtLimit } = clampJointAngle(joint.name, requestedDeg);

      // Display clamped value and drive robot
      display.textContent = `${clampedDeg.toFixed(1)}°`;
      robot.setJointValue(joint.name, clampedDeg * DEG2RAD);

      // Trigger red flash when limit is hit or exceeded
      if (isAtLimit) {
        row.classList.remove('limit-hit');
        void row.offsetWidth; // Force CSS animation restart
        row.classList.add('limit-hit');
      } else {
        row.classList.remove('limit-hit');
      }
    });

    sliderControls[joint.name] = { input, display, row };
    slidersList.appendChild(row);
  });

  // Listen to limit violations and update real-time feed
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

  // Reset button returns arm to zero
  panel.querySelector('#reset-joints-btn').addEventListener('click', () => {
    Object.keys(sliderControls).forEach((name) => {
      const { input, display, row } = sliderControls[name];
      input.value = '0';
      display.textContent = '0.0°';
      row.classList.remove('limit-hit');
      robot.setJointValue(name, 0);
    });
  });
}
