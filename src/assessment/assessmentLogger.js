// src/assessment/assessmentLogger.js
// Task 17: Multi-factor assessment engine (0-100 score) logging time, collisions, jerk, grip, and delay telemetry.

import * as THREE from 'three';
import { getDelayBufferStats } from '../network/delayBuffer.js';

let activeRun = null;
let lastEePos = new THREE.Vector3();
let lastEeVel = new THREE.Vector3();
let lastEeAcc = new THREE.Vector3();
let lastSampleTime = 0;
let jerkSum = 0;
let jerkSamples = 0;
let trajectoryLength = 0;

const PAR_TIMES = { S1: 25.0, S2: 30.0, S3: 30.0 };

export function startRunAssessment(scenario) {
  const now = performance.now();
  const netStats = getDelayBufferStats();

  activeRun = {
    sessionId: `run_${Date.now()}_${scenario.toLowerCase()}`,
    startTime: now,
    scenario,
    delayConfig: {
      mode: netStats.mode,
      fixedDelayMs: netStats.fixedDelayMs,
      packetLossPct: netStats.packetLossPct,
      meanLatencyMs: Number((netStats.lastDelayMs || netStats.fixedDelayMs || 0).toFixed(1))
    },
    collisions: [],
    maxImpactN: 0,
    gripEvents: { grab: 0, slip: 0, crush: 0 },
    limitHits: 0,
    outcome: 'RUNNING'
  };

  jerkSum = 0;
  jerkSamples = 0;
  trajectoryLength = 0;
  lastSampleTime = now;
  lastEeVel.set(0, 0, 0);
  lastEeAcc.set(0, 0, 0);
}

export function sampleTrajectory(eeWorldPos) {
  if (!activeRun) return;
  const now = performance.now();
  const dt = (now - lastSampleTime) / 1000;
  if (dt < 0.015) return; // ~60 Hz sampling

  if (lastSampleTime > 0) {
    const dist = eeWorldPos.distanceTo(lastEePos);
    trajectoryLength += dist;

    // Velocity = dp/dt, Accel = dv/dt, Jerk = da/dt
    const vel = new THREE.Vector3().subVectors(eeWorldPos, lastEePos).divideScalar(dt);
    const acc = new THREE.Vector3().subVectors(vel, lastEeVel).divideScalar(dt);
    const jerk = new THREE.Vector3().subVectors(acc, lastEeAcc).divideScalar(dt);

    jerkSum += jerk.length();
    jerkSamples += 1;

    lastEeVel.copy(vel);
    lastEeAcc.copy(acc);
  }

  lastEePos.copy(eeWorldPos);
  lastSampleTime = now;
}

export function recordAssessmentCollision(evt) {
  if (!activeRun) return;
  activeRun.collisions.push(evt);
  if (evt.impactN > activeRun.maxImpactN) activeRun.maxImpactN = evt.impactN;
}

export function recordAssessmentGrip(type) {
  if (!activeRun) return;
  if (activeRun.gripEvents[type] !== undefined) activeRun.gripEvents[type] += 1;
}

export function recordAssessmentLimitHit() {
  if (!activeRun) return;
  activeRun.limitHits += 1;
}

export function finishRunAssessment(outcomeDetails) {
  if (!activeRun) return null;
  const elapsedSec = (performance.now() - activeRun.startTime) / 1000;
  activeRun.outcome = outcomeDetails.success ? 'SUCCESS' : 'FAILED';
  activeRun.failureReason = outcomeDetails.reason || null;
  activeRun.completionTimeSec = Number(elapsedSec.toFixed(2));

  // 1. Compute penalties
  const par = PAR_TIMES[activeRun.scenario] || 25.0;
  const timeOver = Math.max(0, elapsedSec - par);
  const pTime = Math.min(25, timeOver * 1.0);

  let pColl = 0;
  activeRun.collisions.forEach((c) => {
    pColl += 5.0 + Math.max(0, (c.impactN - 10) * 0.2);
  });
  pColl = Math.min(40, pColl);

  const meanJerk = jerkSamples > 0 ? jerkSum / jerkSamples : 0;
  const pJerk = Math.min(15, (meanJerk / 150.0) * 15.0);

  const pGrip = Math.min(30, activeRun.gripEvents.slip * 15 + activeRun.gripEvents.crush * 30);
  const pLimits = Math.min(10, activeRun.limitHits * 2.0);
  const pOutcome = activeRun.outcome === 'FAILED' ? 50.0 : 0.0;

  // 2. Compute 0-100 Score
  const totalDeduction = pTime + pColl + pJerk + pGrip + pLimits + pOutcome;
  const rawScore = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));

  let grade = 'F';
  if (rawScore >= 90) grade = 'A';
  else if (rawScore >= 78) grade = 'B';
  else if (rawScore >= 60) grade = 'C';
  else if (rawScore >= 45) grade = 'D';

  const report = {
    sessionId: activeRun.sessionId,
    timestamp: new Date().toISOString(),
    scenario: activeRun.scenario,
    delayConfig: activeRun.delayConfig,
    outcome: activeRun.outcome,
    failureReason: activeRun.failureReason,
    completionTimeSec: activeRun.completionTimeSec,
    score: {
      finalScore: rawScore,
      grade,
      penalties: {
        time: Number(pTime.toFixed(1)),
        collision: Number(pColl.toFixed(1)),
        jerk: Number(pJerk.toFixed(1)),
        grip: pGrip,
        limits: pLimits,
        outcome: pOutcome
      }
    },
    metrics: {
      collisionCount: activeRun.collisions.length,
      maxImpactN: activeRun.maxImpactN,
      trajectoryLengthM: Number(trajectoryLength.toFixed(2)),
      meanJerkIndex: Number(meanJerk.toFixed(1)),
      gripEvents: activeRun.gripEvents,
      limitHits: activeRun.limitHits
    },
    collisions: activeRun.collisions
  };

  activeRun = null;
  return report;
}
