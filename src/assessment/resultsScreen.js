// src/assessment/resultsScreen.js
// Task 17: Results screen modal with 0-100 score breakdown and one-click JSON download.

let modalEl = null;

export function showResultsModal(report, onPlayAgain) {
  if (modalEl) modalEl.remove();

  modalEl = document.createElement('div');
  modalEl.id = 'results-modal';
  modalEl.className = 'results-overlay';

  const isSuccess = report.outcome === 'SUCCESS';
  const badgeColor = isSuccess ? '#22c55e' : '#ef4444';
  const score = report.score.finalScore;

  modalEl.innerHTML = `
    <div class="results-card">
      <div class="results-header">
        <h2>${isSuccess ? '🏆 MISSION COMPLETE' : '⚠️ MISSION FAILED'}</h2>
        <span class="results-scenario-tag">${report.scenario} | ${report.delayConfig.mode} (${report.delayConfig.meanLatencyMs}ms)</span>
      </div>

      <div class="score-banner">
        <div class="score-circle" style="border-color:${badgeColor}">
          <span class="score-val">${score}</span>
          <span class="score-max">/ 100</span>
        </div>
        <div class="grade-pill" style="background:${badgeColor}">${report.score.grade}</div>
      </div>

      <div class="results-breakdown-grid">
        <div class="metric-box">
          <span class="metric-label">⏱️ Duration</span>
          <b class="metric-val">${report.completionTimeSec} s</b>
          <small class="penalty-text">-${report.score.penalties.time} pts</small>
        </div>
        <div class="metric-box">
          <span class="metric-label">💥 Collisions</span>
          <b class="metric-val">${report.metrics.collisionCount} (${report.metrics.maxImpactN}N)</b>
          <small class="penalty-text">-${report.score.penalties.collision} pts</small>
        </div>
        <div class="metric-box">
          <span class="metric-label">📈 Motion Jerk</span>
          <b class="metric-val">${report.metrics.meanJerkIndex}</b>
          <small class="penalty-text">-${report.score.penalties.jerk} pts</small>
        </div>
        <div class="metric-box">
          <span class="metric-label">🧲 Grip Errors</span>
          <b class="metric-val">${report.metrics.gripEvents.slip + report.metrics.gripEvents.crush}</b>
          <small class="penalty-text">-${report.score.penalties.grip} pts</small>
        </div>
      </div>

      <div class="results-actions">
        <button id="btn-download-json" class="scenario-btn" style="background:#3b82f6; color:#fff">⬇ Download Assessment (JSON)</button>
        <button id="btn-results-retry" class="scenario-btn" style="background:#f59e0b; color:#111827">Play Again</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector('#btn-download-json').onclick = () => {
    downloadReportJSON(report);
  };

  modalEl.querySelector('#btn-results-retry').onclick = () => {
    modalEl.remove();
    modalEl = null;
    if (onPlayAgain) onPlayAgain();
  };
}

function downloadReportJSON(report) {
  const jsonStr = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ManipTrain_${report.scenario}_${report.sessionId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
