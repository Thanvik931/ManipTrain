// src/kinematics/fk.js
// Task 5: Forward Kinematics (FK) - STUDENT-WRITES-MATH Skeleton.
// Calculates the end-effector (gripper) position from joint angles.

import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

/**
 * 1. Planar 2-Joint Arm (Warm-up)
 * Both links have length L1 = 1.0, L2 = 1.0.
 *
 * @param {number} theta1Deg - Angle of joint 1 in degrees
 * @param {number} theta2Deg - Relative angle of joint 2 in degrees
 * @param {number} [L1=1.0] - Length of link 1
 * @param {number} [L2=1.0] - Length of link 2
 * @returns {{ x: number, y: number }} Computed 2D tip position
 */
export function forwardKinematics2D(theta1Deg, theta2Deg, L1 = 1.0, L2 = 1.0) {
  const t1 = theta1Deg * DEG2RAD;
  const t2 = theta2Deg * DEG2RAD;

  // TODO [STUDENT-WRITES-MATH]:
  // Hint 1: The elbow position is at:
  //   x1 = L1 * Math.cos(t1)
  //   y1 = L1 * Math.sin(t1)
  // Hint 2: The global angle of link 2 is (t1 + t2).
  //   x2 = x1 + L2 * Math.cos(t1 + t2)
  //   y2 = y1 + L2 * Math.sin(t1 + t2)

  // Replace this placeholder with your formula:
  const x = L1 * Math.cos(t1) + L2 * Math.cos(t1 + t2);
  const y = L1 * Math.sin(t1) + L2 * Math.sin(t1 + t2);

  return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
}

/**
 * Helper to build a 4x4 transformation matrix from translation, RPY rotation, and joint rotation.
 */
function createLinkMatrix(tx, ty, tz, roll, pitch, yaw, jointAxis, jointAngleRad) {
  const mat = new THREE.Matrix4();

  // 1. Fixed origin translation and RPY orientation from URDF
  const pos = new THREE.Vector3(tx, ty, tz);
  const rot = new THREE.Euler(roll, pitch, yaw, 'ZYX');
  mat.makeRotationFromEuler(rot);
  mat.setPosition(pos);

  // 2. Variable joint rotation around its specified axis ('X', 'Y', or 'Z')
  const jointRot = new THREE.Matrix4();
  if (jointAxis === 'Z') jointRot.makeRotationZ(jointAngleRad);
  else if (jointAxis === 'Y') jointRot.makeRotationY(jointAngleRad);
  else if (jointAxis === 'X') jointRot.makeRotationX(jointAngleRad);

  mat.multiply(jointRot);
  return mat;
}

/**
 * 2. 6-DOF UR5 Forward Kinematics
 * Multiplies transformation matrices from base to tool flange.
 *
 * @param {Object} angles - Joint angles in radians { shoulder_pan_joint, ... }
 * @returns {THREE.Vector3} End-effector position in Three.js world coordinates
 */
export function forwardKinematicsUR5(angles) {
  const q1 = angles.shoulder_pan_joint || 0;
  const q2 = angles.shoulder_lift_joint || 0;
  const q3 = angles.elbow_joint || 0;
  const q4 = angles.wrist_1_joint || 0;
  const q5 = angles.wrist_2_joint || 0;
  const q6 = angles.wrist_3_joint || 0;

  // UR5 Link Transformations (derived from our verified URDF blueprint)
  const T_base_to_j1 = createLinkMatrix(0, 0, 0.089159, 0, 0, 0, 'Z', q1);
  const T_j1_to_j2   = createLinkMatrix(0, 0.13585, 0, 0, Math.PI / 2, 0, 'Y', q2);
  const T_j2_to_j3   = createLinkMatrix(0, -0.1197, 0.425, 0, 0, 0, 'Y', q3);
  const T_j3_to_j4   = createLinkMatrix(0, 0, 0.39225, 0, Math.PI / 2, 0, 'Y', q4);
  const T_j4_to_j5   = createLinkMatrix(0, 0.09465, 0, 0, 0, 0, 'Z', q5);
  const T_j5_to_j6   = createLinkMatrix(0, 0, 0.09465, 0, 0, 0, 'Y', q6);
  const T_j6_to_ee   = createLinkMatrix(0, 0.0823, 0, 0, 0, Math.PI / 2, 'NONE', 0);

  // TODO [STUDENT-WRITES-MATH]:
  // Chain-multiply the transformation matrices from base to end-effector:
  // T_total = T_base * T1 * T2 * T3 * T4 * T5 * T6 * T_ee
  const T_total = new THREE.Matrix4();
  T_total.multiply(T_base_to_j1)
         .multiply(T_j1_to_j2)
         .multiply(T_j2_to_j3)
         .multiply(T_j3_to_j4)
         .multiply(T_j4_to_j5)
         .multiply(T_j5_to_j6)
         .multiply(T_j6_to_ee);

  // Apply robot base world orientation: rotated -90 deg on X (ROS Z-up to Three.js Y-up)
  const robotBaseOrientation = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  T_total.premultiply(robotBaseOrientation);

  // Extract translation vector (position of end-effector)
  const tipPosition = new THREE.Vector3();
  tipPosition.setFromMatrixPosition(T_total);

  return tipPosition;
}

/**
 * Compares computed FK position with Three.js scene graph ground truth.
 * @param {URDFRobot} robot - URDF robot instance
 * @param {THREE.Vector3} computedPos - Computed FK position
 * @returns {{ errorMm: number, groundTruth: THREE.Vector3, computed: THREE.Vector3 }}
 */
export function compareFKWithThree(robot, computedPos) {
  const groundTruth = new THREE.Vector3();
  // Find ee_link in the robot scene graph
  const eeLink = robot.links ? robot.links['ee_link'] : null;

  if (eeLink) {
    eeLink.getWorldPosition(groundTruth);
  } else {
    robot.getWorldPosition(groundTruth);
  }

  // Euclidean distance converted from meters to millimeters
  const errorMm = groundTruth.distanceTo(computedPos) * 1000;
  return { errorMm, groundTruth, computed: computedPos };
}
