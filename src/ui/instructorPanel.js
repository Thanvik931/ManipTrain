// src/ui/instructorPanel.js
// Task 16: Discrete Instructor Control Panel for configuring latency, trace replay, and packet loss.
// Hidden from operator view during standard training runs (toggle with F2 or instructor button).

import { configureDelayBuffer, getDelayBufferStats, resetDelayBuffer } from '../network/delayBuffer.js';

let panelEl = null;
let statsUpdateInterval = null;

export function setupInstructorPanel(onConfigChange) {
  if (panelEl) panelEl.remove();

  // 1. Toggle Button (top-right next to controls)
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'instructor-toggle-btn';
  toggleBtn.title = 'Open Instructor Panel (F2 / ~)';
  toggleBtn.innerHTML = '⚙️ Instructor';
  document.body.appendChild(toggleBtn);

  // 2. Instructor Panel Drawer
  panelEl = document.createElement('div');
  panelEl.id = 'instructor-panel';
  panelEl.className = 'instructor-panel hidden';
  panelEl.innerHTML = `
    <div class="instructor-header">
      <h3>Instructor Network Control</h3>
      <button id="instructor-close-btn">&times;</button>
    </div>

    <div class="instructor-body">
      <div class="instructor-row">
        <label>Delay Mode:</label>
        <select id="sel-delay-mode">
          <option value="fixed-0">Fixed 0 ms (Real-time)</option>
          <option value="fixed-100">Fixed 100 ms</option>
          <option value="fixed-200">Fixed 200 ms</option>
          <option value="fixed-300">Fixed 300 ms</option>
          <option value="fixed-500">Fixed 500 ms (High Lag)</option>
          <option value="trace-idle">Trace: Idle Hotspot (~43ms)</option>
          <option value="trace-cong">Trace: Congested Hotspot (~221ms)</option>
        </select>
      </div>

      <div class="instructor-row">
        <label>Packet Loss (%):</label>
        <select id="sel-packet-loss">
          <option value="0">0% (Clean Link)</option>
          <option value="5">5% Packet Loss</option>
          <option value="10">10% Packet Loss</option>
          <option value="20">20% Severe Loss</option>
        </select>
      </div>

      <div class="instructor-telemetry">
        <div class="telem-row"><span>Active Latency:</span><b id="telem-latency">0.0 ms</b></div>
        <div class="telem-row"><span>Buffer Queue:</span><b id="telem-queue">0 pkts</b></div>
        <div class="telem-row"><span>Packets Dropped:</span><b id="telem-dropped" style="color:#ef4444">0</b></div>
        <div class="telem-row"><span>Packets Sent:</span><b id="telem-sent">0</b></div>
      </div>

      <button id="btn-flush-buffer" class="scenario-btn" style="background:#4b5563; color:#fff; margin-top:8px;">Flush Buffer</button>
    </div>
  `;
  document.body.appendChild(panelEl);

  const selMode = panelEl.querySelector('#sel-delay-mode');
  const selLoss = panelEl.querySelector('#sel-packet-loss');
  const telemLatency = panelEl.querySelector('#telem-latency');
  const telemQueue = panelEl.querySelector('#telem-queue');
  const telemDropped = panelEl.querySelector('#telem-dropped');
  const telemSent = panelEl.querySelector('#telem-sent');

  function applyConfig() {
    const modeVal = selMode.value;
    const lossVal = parseInt(selLoss.value, 10);
    let mode = 'fixed';
    let delayMs = 0;

    if (modeVal.startsWith('fixed-')) {
      mode = 'fixed';
      delayMs = parseInt(modeVal.replace('fixed-', ''), 10);
    } else if (modeVal === 'trace-idle') {
      mode = 'trace_idle';
    } else if (modeVal === 'trace-cong') {
      mode = 'trace_congested';
    }

    configureDelayBuffer({ mode, delayMs, lossPct: lossVal });
    if (onConfigChange) onConfigChange({ mode, delayMs, lossVal });
  }

  selMode.addEventListener('change', applyConfig);
  selLoss.addEventListener('change', applyConfig);

  panelEl.querySelector('#btn-flush-buffer').onclick = () => {
    resetDelayBuffer();
  };

  function togglePanel() {
    panelEl.classList.toggle('hidden');
    toggleBtn.classList.toggle('active', !panelEl.classList.contains('hidden'));
  }

  toggleBtn.onclick = togglePanel;
  panelEl.querySelector('#instructor-close-btn').onclick = togglePanel;

  // Shortcut keys F2 or backtick to toggle instructor panel
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2' || e.key === '`') {
      e.preventDefault();
      togglePanel();
    }
  });

  // Refresh telemetry monitor every 100ms
  statsUpdateInterval = setInterval(() => {
    const s = getDelayBufferStats();
    if (telemLatency) telemLatency.textContent = `${s.lastDelayMs.toFixed(1)} ms`;
    if (telemQueue) telemQueue.textContent = `${s.queueLength} pkts`;
    if (telemDropped) telemDropped.textContent = `${s.totalDropped}`;
    if (telemSent) telemSent.textContent = `${s.totalSent}`;
  }, 100);

  return {
    toggle: togglePanel,
    applyConfig
  };
}

