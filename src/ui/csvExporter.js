// src/ui/csvExporter.js
// Exports 20 reference poses and FK positions to CSV for Python verification.

import { forwardKinematicsUR5 } from '../kinematics/fk.js';

const DEG2RAD = Math.PI / 180;

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

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fk_poses.csv';
  a.click();
}
