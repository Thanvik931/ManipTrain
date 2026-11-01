// src/kinematics/jointLimiter.js
// Task 4: Central joint limits management, clamping, and timestamped event logging.

import rawLimits from './jointLimits.json';

// Single source of truth for all joint limits
export const jointLimits = rawLimits;

// In-memory array of limit hit events for real-time inspection and scenario assessment
export const limitHitLogs = [];

// Event listeners to notify UI when a limit is triggered
const listeners = [];

/**
 * Register a callback to be invoked whenever any joint hits or exceeds its limit.
 * @param {Function} callback - Function receiving the log entry
 */
export function onLimitHit(callback) {
  listeners.push(callback);
}

/**
 * Clamps a proposed joint angle in degrees to its configured boundaries.
 * @param {string} jointName - Name of the joint (e.g. 'elbow_joint')
 * @param {number} requestedDeg - Proposed angle in degrees
 * @returns {{ clampedDeg: number, isAtLimit: boolean, limitType: 'min'|'max'|null }}
 */
export function clampJointAngle(jointName, requestedDeg) {
  const cfg = jointLimits[jointName];
  if (!cfg) {
    return { clampedDeg: requestedDeg, isAtLimit: false, limitType: null };
  }

  let clampedDeg = requestedDeg;
  let isAtLimit = false;
  let limitType = null;

  if (requestedDeg <= cfg.minDeg) {
    clampedDeg = cfg.minDeg;
    isAtLimit = true;
    limitType = 'min';
  } else if (requestedDeg >= cfg.maxDeg) {
    clampedDeg = cfg.maxDeg;
    isAtLimit = true;
    limitType = 'max';
  }

  if (isAtLimit) {
    recordLimitHit(jointName, requestedDeg, clampedDeg, limitType, cfg.label);
  }

  return { clampedDeg, isAtLimit, limitType };
}

/**
 * Internal helper to record and broadcast a limit hit event with ISO and local timestamp.
 */
function recordLimitHit(jointName, requestedDeg, clampedDeg, limitType, label) {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

  const logEntry = {
    timestamp: timeStr,
    isoTime: now.toISOString(),
    jointName,
    label: label || jointName,
    requestedDeg: Number(requestedDeg.toFixed(1)),
    clampedDeg: Number(clampedDeg.toFixed(1)),
    limitType
  };

  limitHitLogs.unshift(logEntry); // Keep newest at the top
  if (limitHitLogs.length > 50) limitHitLogs.pop(); // Keep buffer bounded

  // Notify registered subscribers (UI, assessment logger)
  listeners.forEach((fn) => fn(logEntry));

  console.warn(
    `%c[${timeStr}] Joint Limit Hit: %c${logEntry.label} %cclamped to ${clampedDeg}° (requested: ${requestedDeg.toFixed(1)}°)`,
    'color: #f87171; font-weight: bold;',
    'color: #facc15; font-weight: bold;',
    'color: #d1d5db;'
  );
}

