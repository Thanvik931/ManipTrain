// src/kinematics/ik_ccd.js
// Task 7: Robust Cyclic Coordinate Descent (CCD) Inverse Kinematics solver.

import * as THREE from 'three';
import { clampJointAngle } from './jointLimiter.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Solves Inverse Kinematics for the UR5 robot using Cyclic Coordinate Descent (CCD).
 * Smoothly drives end-effector to the target position while enforcing joint limits.
 *
 * @param {URDFRobot} robot - Three.js URDF robot instance
 * @param {THREE.Vector3} targetPos - 3D world target coordinate
 * @param {Object} [options]
 * @returns {{ iterations: number, finalDistanceMm: number, reached: boolean }}
 */
export function solveCCD(robot, targetPos, options = {}) {
  const maxIterations = options.maxIterations || 20;
  const tolerance = options.toleranceMeters || 0.005; // 5 mm

  robot.updateMatrixWorld(true);
  const eeLink = robot.links['ee_link'] || robot.links['wrist_3_link'];
  if (!eeLink) return { iterations: 0, finalDistanceMm: 0, reached: false };

  const eePos = new THREE.Vector3();
  const jointPos = new THREE.Vector3();
  const jointAxisWorld = new THREE.Vector3();
  const parentQuat = new THREE.Quaternion();
  const vEE = new THREE.Vector3();
  const vTarget = new THREE.Vector3();

  // Joint chain backwards from wrist 3 to shoulder pan
  const jointNames = [
    'wrist_3_joint',
    'wrist_2_joint',
    'wrist_1_joint',
    'elbow_joint',
    'shoulder_lift_joint',
    'shoulder_pan_joint'
  ];

  let iterations = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;
    robot.updateMatrixWorld(true);
    eeLink.getWorldPosition(eePos);

    if (eePos.distanceTo(targetPos) <= tolerance) break;

    for (const name of jointNames) {
      const joint = robot.joints[name];
      if (!joint) continue;

      robot.updateMatrixWorld(true);
      joint.getWorldPosition(jointPos);
      eeLink.getWorldPosition(eePos);

      vEE.subVectors(eePos, jointPos);
      vTarget.subVectors(targetPos, jointPos);

      if (vEE.lengthSq() < 1e-6 || vTarget.lengthSq() < 1e-6) continue;

      // Invariant world rotation axis from joint's parent coordinate frame
      if (joint.parent) {
        joint.parent.getWorldQuaternion(parentQuat);
        jointAxisWorld.copy(joint.axis || new THREE.Vector3(0, 0, 1)).applyQuaternion(parentQuat).normalize();
      } else {
        jointAxisWorld.copy(joint.axis || new THREE.Vector3(0, 0, 1)).normalize();
      }

      // Project vectors onto rotation plane
      vEE.projectOnPlane(jointAxisWorld).normalize();
      vTarget.projectOnPlane(jointAxisWorld).normalize();

      const dot = Math.min(1, Math.max(-1, vEE.dot(vTarget)));
      const crossVec = new THREE.Vector3().crossVectors(vEE, vTarget);
      const cross = crossVec.dot(jointAxisWorld);
      let deltaAngle = Math.atan2(cross, dot);

      if (Math.abs(deltaAngle) > 1e-4) {
        // Damping and rate limiting per iteration
        deltaAngle = Math.max(-0.25, Math.min(0.25, deltaAngle * 0.7));

        const currentAngleRad = joint.angle || 0;
        const proposedDeg = (currentAngleRad + deltaAngle) * RAD2DEG;
        const { clampedDeg } = clampJointAngle(joint.name, proposedDeg);

        robot.setJointValue(joint.name, clampedDeg * DEG2RAD);
      }
    }
  }

  robot.updateMatrixWorld(true);
  eeLink.getWorldPosition(eePos);
  const finalDistance = eePos.distanceTo(targetPos);

  return {
    iterations,
    finalDistanceMm: Number((finalDistance * 1000).toFixed(2)),
    reached: finalDistance <= tolerance
  };
}
