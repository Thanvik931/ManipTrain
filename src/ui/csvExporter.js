// src/ui/csvExporter.js
// Exports FK and IK reference datasets to CSV for Python NumPy validation.

import * as THREE from 'three';
import { forwardKinematicsUR5 } from '../kinematics/fk.js';
import { solveDLS } from '../kinematics/ik_dls.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function exportFKPosesCSV() {
  const rows = ['pose_id,q1_deg,q2_deg,q3_deg,q4_deg,q5_deg,q6_deg,js_x,js_y,js_z'];

  for (let i = 0; i < 20; i++) {
    const q = [
      (Math.random() * 360 - 180).toFixed(1),
      (Math.random() * 180 - 120).toFixed(1),
      (Math.random() * 300 - 150).toFixed(1),
      (Math.random() * 360 - 180).toFixed(1),
      (Math.random() * 360 - 180).toFixed(1),
      (Math.random() * 360 - 180).toFixed(1)
    ].map(Number);

    const rads = {
      shoulder_pan_joint: q[0] * DEG2RAD,
      shoulder_lift_joint: q[1] * DEG2RAD,
      elbow_joint: q[2] * DEG2RAD,
      wrist_1_joint: q[3] * DEG2RAD,
      wrist_2_joint: q[4] * DEG2RAD,
      wrist_3_joint: q[5] * DEG2RAD
    };

    const tip = forwardKinematicsUR5(rads);
    rows.push(
      `${i + 1},${q[0]},${q[1]},${q[2]},${q[3]},${q[4]},${q[5]},` +
      `${tip.x.toFixed(6)},${tip.y.toFixed(6)},${tip.z.toFixed(6)}`
    );
  }

  downloadCSV(rows, 'fk_poses.csv');
}

/**
 * Generates 50 reachable 3D targets, runs DLS IK, and exports angles + targets to CSV.
 */
export function exportIKPosesCSV(robot, onComplete) {
  const rows = ['target_id,target_x,target_y,target_z,q1_deg,q2_deg,q3_deg,q4_deg,q5_deg,q6_deg,ik_dist_mm,iters'];
  const jointNames = [
    'shoulder_pan_joint',
    'shoulder_lift_joint',
    'elbow_joint',
    'wrist_1_joint',
    'wrist_2_joint',
    'wrist_3_joint'
  ];

  for (let i = 0; i < 50; i++) {
    // 1. Generate guaranteed reachable 3D target via random joint configurations
    const qSeed = {
      shoulder_pan_joint: (Math.random() * 200 - 100) * DEG2RAD,
      shoulder_lift_joint: (Math.random() * 120 - 90) * DEG2RAD,
      elbow_joint: (Math.random() * 160 - 80) * DEG2RAD,
      wrist_1_joint: (Math.random() * 180 - 90) * DEG2RAD,
      wrist_2_joint: (Math.random() * 180 - 90) * DEG2RAD,
      wrist_3_joint: (Math.random() * 180 - 90) * DEG2RAD
    };
    const targetPos = forwardKinematicsUR5(qSeed);

    // 2. Start from neutral/home pose and solve with DLS
    jointNames.forEach((name) => robot.setJointValue(name, 0));
    robot.updateMatrixWorld(true);

    const result = solveDLS(robot, targetPos, {
      maxIterations: 35,
      toleranceMeters: 0.001,
      lambda: 0.04
    });

    // 3. Read solved joint angles in degrees
    const foundDeg = jointNames.map((name) => {
      const rad = robot.joints[name] ? (robot.joints[name].angle || 0) : 0;
      return (rad * RAD2DEG).toFixed(2);
    });

    rows.push(
      `${i + 1},${targetPos.x.toFixed(6)},${targetPos.y.toFixed(6)},${targetPos.z.toFixed(6)},` +
      `${foundDeg.join(',')},${result.finalDistanceMm},${result.iterations}`
    );
  }

  // Restore arm to 0
  jointNames.forEach((name) => robot.setJointValue(name, 0));
  robot.updateMatrixWorld(true);
  if (onComplete) onComplete();

  downloadCSV(rows, 'ik_poses.csv');
}

function downloadCSV(rows, filename) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}
