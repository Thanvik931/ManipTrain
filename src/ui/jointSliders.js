// src/ui/jointSliders.js
// Task 8: 6-DOF controls with CCD/DLS solver toggle, FK badge, and limits log.

import { jointLimits, clampJointAngle, onLimitHit } from '../kinematics/jointLimiter.js';
import { forwardKinematicsUR5, compareFKWithThree } from '../kinematics/fk.js';
import { exportFKPosesCSV } from './csvExporter.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

let currentSliders = {};
let movableJointsList = [];
let currentSolver = 'CCD';

export function setupJointSliders(robot, onFKCalculated, onTargetSync, onReset, onSolverChange) {
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
        <span>IK Solver (<span id="active-solver-name">CCD</span>)</span>
        <span id="ik-badge" class="fk-badge fk-pass">0.0 mm</span>
      </div>
      <div class="solver-toggle-group">
        <button id="btn-solver-ccd" class="solver-btn active">CCD</button>
        <button id="btn-solver-dls" class="solver-btn">DLS (Jacobian)</button>
      </div>
      <div class="stat-coords">
        <div><b>Target:</b> <span id="ik-target-pos">X:0.00 Y:0.00 Z:0.00</span></div>
        <div><b>Iterations:</b> <span id="ik-iters">0 / 25</span></div>
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
  const solverNameEl = panel.querySelector('#active-solver-name');
  const btnCCD = panel.querySelector('#btn-solver-ccd');
  const btnDLS = panel.querySelector('#btn-solver-dls');

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
      if (onTargetSync) onTargetSync();
    });

    currentSliders[joint.name] = { input, display, row };
    slidersList.appendChild(row);
  });

  // Solver mode selection
  function setSolver(mode) {
    currentSolver = mode;
    solverNameEl.textContent = mode;
    if (mode === 'CCD') {
      btnCCD.classList.add('active');
      btnDLS.classList.remove('active');
    } else {
      btnDLS.classList.add('active');
      btnCCD.classList.remove('active');
    }
    if (onSolverChange) onSolverChange(mode);
  }

  btnCCD.addEventListener('click', () => setSolver('CCD'));
  btnDLS.addEventListener('click', () => setSolver('DLS'));

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

  if (targetPosEl) {
    targetPosEl.textContent = `X:${targetPos.x.toFixed(2)} Y:${targetPos.y.toFixed(2)} Z:${targetPos.z.toFixed(2)}`;
  }
  if (itersEl) itersEl.textContent = `${iters} iters`;
  if (badgeEl) {
    badgeEl.textContent = `${distanceMm.toFixed(1)} mm`;
    badgeEl.className = reached ? 'fk-badge fk-pass' : 'fk-badge fk-warn';
  }
}
