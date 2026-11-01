// src/network/delayBuffer.js
// Task 16: Teleoperation Delay Buffer with fixed delays (0-500ms), trace replay, and packet loss.

import * as THREE from 'three';
import { idleHotspotTrace, congestedHotspotTrace } from './tracesData.js';

let delayMode = 'fixed'; // 'fixed' | 'trace_idle' | 'trace_congested'
let fixedDelayMs = 0; // 0, 100, 200, 300, 500
let packetLossPct = 0; // 0, 5, 10, 20
let traceIndex = 0;

const commandQueue = [];
const delayedTargetPos = new THREE.Vector3();
let delayedGripForce = 0;
let hasInitializedTarget = false;

const stats = {
  mode: 'fixed',
  fixedDelayMs: 0,
  packetLossPct: 0,
  queueLength: 0,
  lastDelayMs: 0,
  totalSent: 0,
  totalExecuted: 0,
  totalDropped: 0
};

let onPacketDropCallback = null;

export function configureDelayBuffer({ mode = 'fixed', delayMs = 0, lossPct = 0, onDrop = null }) {
  delayMode = mode;
  fixedDelayMs = delayMs;
  packetLossPct = Math.max(0, Math.min(100, lossPct));
  if (onDrop) onPacketDropCallback = onDrop;

  stats.mode = mode;
  stats.fixedDelayMs = fixedDelayMs;
  stats.packetLossPct = packetLossPct;
}

export function pushDelayedTarget(targetPos) {
  stats.totalSent += 1;
  const now = performance.now();

  // 1. Evaluate Packet Loss
  if (packetLossPct > 0 && Math.random() * 100 < packetLossPct) {
    stats.totalDropped += 1;
    if (onPacketDropCallback) onPacketDropCallback({ type: 'target', reason: 'random_loss' });
    return;
  }

  // 2. Compute Latency per configured mode
  let latencyMs = 0;
  if (delayMode === 'fixed') {
    latencyMs = fixedDelayMs;
  } else if (delayMode === 'trace_idle') {
    latencyMs = idleHotspotTrace[traceIndex % idleHotspotTrace.length];
    traceIndex += 1;
  } else if (delayMode === 'trace_congested') {
    const sample = congestedHotspotTrace[traceIndex % congestedHotspotTrace.length];
    traceIndex += 1;
    if (sample.l === 1) {
      stats.totalDropped += 1;
      if (onPacketDropCallback) onPacketDropCallback({ type: 'target', reason: 'trace_congested_drop' });
      return;
    }
    latencyMs = sample.d;
  }

  stats.lastDelayMs = latencyMs;

  // 3. Queue command for release at now + latencyMs
  commandQueue.push({
    executeTime: now + latencyMs,
    type: 'target',
    payload: { x: targetPos.x, y: targetPos.y, z: targetPos.z }
  });
}

export function pushDelayedGrip(forceVal) {
  stats.totalSent += 1;
  const now = performance.now();
  const latencyMs = delayMode === 'fixed' ? fixedDelayMs : (stats.lastDelayMs || 50);

  commandQueue.push({
    executeTime: now + latencyMs,
    type: 'grip',
    payload: forceVal
  });
}

export function updateDelayBuffer(onTargetReady, onGripReady) {
  const now = performance.now();

  // Zero delay fast-path
  if (delayMode === 'fixed' && fixedDelayMs === 0 && commandQueue.length > 0) {
    while (commandQueue.length > 0) {
      const cmd = commandQueue.shift();
      stats.totalExecuted += 1;
      if (cmd.type === 'target') {
        delayedTargetPos.set(cmd.payload.x, cmd.payload.y, cmd.payload.z);
        if (onTargetReady) onTargetReady(delayedTargetPos);
      } else if (cmd.type === 'grip') {
        delayedGripForce = cmd.payload;
        if (onGripReady) onGripReady(delayedGripForce);
      }
    }
    stats.queueLength = 0;
    return;
  }

  // Standard delayed release FIFO
  while (commandQueue.length > 0 && commandQueue[0].executeTime <= now) {
    const cmd = commandQueue.shift();
    stats.totalExecuted += 1;

    if (cmd.type === 'target') {
      delayedTargetPos.set(cmd.payload.x, cmd.payload.y, cmd.payload.z);
      if (onTargetReady) onTargetReady(delayedTargetPos);
    } else if (cmd.type === 'grip') {
      delayedGripForce = cmd.payload;
      if (onGripReady) onGripReady(delayedGripForce);
    }
  }

  stats.queueLength = commandQueue.length;
}

export function resetDelayBuffer(initialPos = null) {
  commandQueue.length = 0;
  traceIndex = 0;
  if (initialPos) delayedTargetPos.copy(initialPos);
  stats.totalSent = 0;
  stats.totalExecuted = 0;
  stats.totalDropped = 0;
  stats.queueLength = 0;
}

export function getDelayedTarget() {
  return delayedTargetPos;
}

export function getDelayBufferStats() {
  return stats;
}

