// src/kinematics/ik_ccd.js
// Task 7: Inverse Kinematics with Cyclic Coordinate Descent (CCD) [STUDENT-WRITES-MATH]
// Moves robot end-effector to chase a 3D target position iteratively.

import * as THREE from 'three';
import { clampJointAngle } from './jointLimiter.js';

const RAD2DEG = 180 / Math.PI;

/**
 * 1. Concept: 2D Planar CCD Step
 * For a joint at jointPos, end-effector at eePos, and goal at targetPos:
 *
 * Vector to End-Effector : V_ee   = eePos - jointPos
 * Vector to Target Goal  : V_goal = targetPos - jointPos
 *
 * Angle to rotate joint:
 *   angle = atan2(V_ee.x * V_goal.y - V_ee.y * V_goal.x, V_ee.x * V_goal.x + V_ee.y * V_goal.y)
 */

/**
 * Solves Inverse Kinematics for the UR5 robot using Cyclic Coordinate Descent (CCD).
 * Iterates backwards from wrist to base, adjusting each joint angle to reduce distance to target.
 *
 * @param {URDFRobot} robot - The loaded Three.js URDF robot
 * @param {THREE.Vector3} targetWorldPos - The 3D position to reach
 * @param {Object} [options] - Configuration parameters
 * @param {number} [options.maxIterations=20] - Max search cycles per frame
 * @param {number} [options.toleranceMeters=0.005] - Stopping distance (5 mm)
 * @returns {{ iterations: number, finalDistanceMm: number, reached: boolean }}
 */
export function solveCCD(robot, targetWorldPos, options = {}) {
  const maxIterations = options.maxIterations || 20;
  const tolerance = options.toleranceMeters || 0.005; // 5 mm

  // Movable joints ordered from wrist (tip) backwards to base
  const jointChain = [
    robot.joints['wrist_3_joint'],
    robot.joints['wrist_2_joint'],
    robot.joints['wrist_1_joint'],
    robot.joints['elbow_joint'],
    robot.joints['shoulder_lift_joint'],
    robot.joints['shoulder_pan_joint']
  ].filter(Boolean);

  const eeLink = robot.links ? robot.links['ee_link'] : null;
  const eePos = new THREE.Vector3();
  const jointPos = new THREE.Vector3();
  const jointAxisWorld = new THREE.Vector3();
  const vEE = new THREE.Vector3();
  const vTarget = new THREE.Vector3();

  let iterations = 0;
  let distance = Infinity;

  for (let iter = 0; iter < maxIterations; iter++) {
    iterations = iter + 1;

    // Check current end-effector position
    if (eeLink) {
      eeLink.getWorldPosition(eePos);
    } else {
      break;
    }

    distance = eePos.distanceTo(targetWorldPos);
    if (distance <= tolerance) {
      return {
        iterations,
        finalDistanceMm: Number((distance * 1000).toFixed(2)),
        reached: true
      };
    }

    // Step through joints backwards from end-effector to base
    for (const joint of jointChain) {
      // 1. Get joint position in world coordinates
      joint.getWorldPosition(jointPos);

      // 2. Compute vectors from joint to end-effector and joint to target
      vEE.subVectors(eePos, jointPos);
      vTarget.subVectors(targetWorldPos, jointPos);

      // If either vector is very small, skip to prevent numerical instability
      if (vEE.lengthSq() < 1e-6 || vTarget.lengthSq() < 1e-6) continue;

      // 3. Get joint rotation axis in world space
      // Local axis from URDF: [0,0,1] or [0,1,0]
      const localAxis = joint.axis || new THREE.Vector3(0, 0, 1);
      jointAxisWorld.copy(localAxis).transformDirection(joint.matrixWorld).normalize();

      // Project vectors onto plane perpendicular to the rotation axis
      vEE.projectOnPlane(jointAxisWorld).normalize();
      vTarget.projectOnPlane(jointAxisWorld).normalize();

      // TODO [STUDENT-WRITES-MATH]:
      // Angle between vEE and vTarget around jointAxisWorld:
      // Hint 1: dot = vEE.dot(vTarget)
      // Hint 2: cross = (vEE x vTarget).dot(jointAxisWorld)
      // Hint 3: deltaAngle = Math.atan2(cross, dot)
      const dot = Math.min(1, Math.max(-1, vEE.dot(vTarget)));
      const crossVec = new THREE.Vector3().crossVectors(vEE, vTarget);
      const cross = crossVec.dot(jointAxisWorld);
      let deltaAngle = Math.atan2(cross, dot);

      // Apply a damping factor to avoid overshooting
      deltaAngle *= 0.7;

      if (Math.abs(deltaAngle) > 1e-4) {
        const currentAngleRad = joint.angle || 0;
        const proposedAngleDeg = (currentAngleRad + deltaAngle) * (180 / Math.PI);

        // Enforce physical limits from Task 4 single source of truth
        const { clampedDeg } = clampJointAngle(joint.name, proposedAngleDeg);
        robot.setJointValue(joint.name, clampedDeg * (Math.PI / 180));

        // Update world matrices for subsequent joints
        robot.updateMatrixWorld(true);
        eeLink.getWorldPosition(eePos);
      }
    }
  }

  if (eeLink) eeLink.getWorldPosition(eePos);
  distance = eePos.distanceTo(targetWorldPos);

  return {
    iterations,
    finalDistanceMm: Number((distance * 1000).toFixed(2)),
    reached: distance <= tolerance
  };
}

