// src/kinematics/ik_dls.js
// Task 8: Damped Least Squares (DLS) Inverse Kinematics [STUDENT-WRITES-MATH].
// Uses numerical Jacobian and damping to smoothly solve IK without singularity jitter.

import * as THREE from 'three';
import { forwardKinematicsUR5 } from './fk.js';
import { clampJointAngle } from './jointLimiter.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const JOINT_NAMES = [
  'shoulder_pan_joint',
  'shoulder_lift_joint',
  'elbow_joint',
  'wrist_1_joint',
  'wrist_2_joint',
  'wrist_3_joint'
];

/**
 * Inverts a 3x3 symmetric matrix analytically using Cramer's rule / adjugate matrix.
 */
function invert3x3(m) {
  // m is 3x3 array [[a,b,c], [d,e,f], [g,h,i]]
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];

  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1.0 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (g * b - a * h) * invDet, (a * e - b * d) * invDet]
  ];
}

/**
 * Computes 3x6 numerical Jacobian using tiny finite differences on forward kinematics.
 * Column j represents: d(position) / d(theta_j)
 */
function computeJacobian(currentAnglesRad, basePos, eps = 1e-4) {
  const J = [
    [0, 0, 0, 0, 0, 0], // dx/dq1 .. dx/dq6
    [0, 0, 0, 0, 0, 0], // dy/dq1 .. dy/dq6
    [0, 0, 0, 0, 0, 0]  // dz/dq1 .. dz/dq6
  ];

  for (let j = 0; j < 6; j++) {
    const qPerturbed = { ...currentAnglesRad };
    const name = JOINT_NAMES[j];
    qPerturbed[name] = (qPerturbed[name] || 0) + eps;

    const perturbedPos = forwardKinematicsUR5(qPerturbed);

    J[0][j] = (perturbedPos.x - basePos.x) / eps;
    J[1][j] = (perturbedPos.y - basePos.y) / eps;
    J[2][j] = (perturbedPos.z - basePos.z) / eps;
  }
  return J;
}

/**
 * Solves Inverse Kinematics using Damped Least Squares (DLS).
 * Formula: deltaTheta = J^T * (J * J^T + lambda^2 * I)^(-1) * error
 *
 * @param {URDFRobot} robot - URDF robot
 * @param {THREE.Vector3} targetPos - Desired 3D Cartesian position
 * @param {Object} [options]
 * @returns {{ iterations: number, finalDistanceMm: number, reached: boolean }}
 */
export function solveDLS(robot, targetPos, options = {}) {
  const maxIterations = options.maxIterations || 25;
  const tolerance = options.toleranceMeters || 0.001; // 1 mm target
  const lambda = options.lambda || 0.04;              // Damping factor lambda

  const anglesRad = {};
  JOINT_NAMES.forEach((name) => {
    anglesRad[name] = robot.joints[name] ? (robot.joints[name].angle || 0) : 0;
  });

  let iterations = 0;
  let currentPos = forwardKinematicsUR5(anglesRad);
  let distance = currentPos.distanceTo(targetPos);

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    if (distance <= tolerance) break;

    // Error vector e = target - current
    const e = [targetPos.x - currentPos.x, targetPos.y - currentPos.y, targetPos.z - currentPos.z];

    // Compute 3x6 Jacobian J
    const J = computeJacobian(anglesRad, currentPos);

    // TODO [STUDENT-WRITES-MATH]:
    // Compute A = J * J^T + lambda^2 * I (3x3 matrix)
    const A = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = 0; k < 6; k++) sum += J[r][k] * J[c][k];
        A[r][c] = sum + (r === c ? lambda * lambda : 0);
      }
    }

    // Invert the damped 3x3 matrix: invA = A^(-1)
    const invA = invert3x3(A);
    if (!invA) break;

    // y = invA * e (3x1 vector)
    const y = [
      invA[0][0] * e[0] + invA[0][1] * e[1] + invA[0][2] * e[2],
      invA[1][0] * e[0] + invA[1][1] * e[1] + invA[1][2] * e[2],
      invA[2][0] * e[0] + invA[2][1] * e[1] + invA[2][2] * e[2]
    ];

    // deltaTheta = J^T * y (6x1 vector of joint angle changes)
    let maxDelta = 0;
    for (let j = 0; j < 6; j++) {
      let deltaQ = J[0][j] * y[0] + J[1][j] * y[1] + J[2][j] * y[2];
      deltaQ = Math.max(-0.2, Math.min(0.2, deltaQ)); // Step limit
      maxDelta = Math.max(maxDelta, Math.abs(deltaQ));

      const name = JOINT_NAMES[j];
      const proposedDeg = (anglesRad[name] + deltaQ) * RAD2DEG;
      const { clampedDeg } = clampJointAngle(name, proposedDeg);
      anglesRad[name] = clampedDeg * DEG2RAD;
      robot.setJointValue(name, anglesRad[name]);
    }

    currentPos = forwardKinematicsUR5(anglesRad);
    distance = currentPos.distanceTo(targetPos);
    if (maxDelta < 1e-4) break; // Converged
  }

  robot.updateMatrixWorld(true);
  return {
    iterations,
    finalDistanceMm: Number((distance * 1000).toFixed(2)),
    reached: distance <= tolerance
  };
}
