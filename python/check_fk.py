"""
check_fk.py - Task 6: Python NumPy Forward Kinematics Validator.
Recomputes 6-DOF UR5 end-effector positions and checks agreement with JavaScript FK (< 1 mm).
"""

import os
import sys
import csv
import numpy as np

# Ensure UTF-8 output on Windows terminals
if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DEG2RAD = np.pi / 180.0

def rot_x(rad):
    c, s = np.cos(rad), np.sin(rad)
    return np.array([[1, 0, 0, 0],
                     [0, c, -s, 0],
                     [0, s, c, 0],
                     [0, 0, 0, 1]], dtype=np.float64)

def rot_y(rad):
    c, s = np.cos(rad), np.sin(rad)
    return np.array([[c, 0, s, 0],
                     [0, 1, 0, 0],
                     [-s, 0, c, 0],
                     [0, 0, 0, 1]], dtype=np.float64)

def rot_z(rad):
    c, s = np.cos(rad), np.sin(rad)
    return np.array([[c, -s, 0, 0],
                     [s, c, 0, 0],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]], dtype=np.float64)

def create_link_matrix(tx, ty, tz, roll, pitch, yaw, axis, theta_rad):
    """Constructs 4x4 link transformation identical to Three.js/URDF."""
    R_fixed = rot_z(yaw) @ rot_y(pitch) @ rot_x(roll)
    T = R_fixed.copy()
    T[0:3, 3] = [tx, ty, tz]

    if axis == 'Z':
        T = T @ rot_z(theta_rad)
    elif axis == 'Y':
        T = T @ rot_y(theta_rad)
    elif axis == 'X':
        T = T @ rot_x(theta_rad)

    return T

def forward_kinematics_ur5(q_deg):
    """Computes 3D end-effector position using NumPy 4x4 matrix chain."""
    q_rad = [deg * DEG2RAD for deg in q_deg]

    T_base_j1 = create_link_matrix(0, 0, 0.089159, 0, 0, 0, 'Z', q_rad[0])
    T_j1_j2   = create_link_matrix(0, 0.13585, 0, 0, np.pi / 2, 0, 'Y', q_rad[1])
    T_j2_j3   = create_link_matrix(0, -0.1197, 0.425, 0, 0, 0, 'Y', q_rad[2])
    T_j3_j4   = create_link_matrix(0, 0, 0.39225, 0, np.pi / 2, 0, 'Y', q_rad[3])
    T_j4_j5   = create_link_matrix(0, 0.09465, 0, 0, 0, 0, 'Z', q_rad[4])
    T_j5_j6   = create_link_matrix(0, 0.09465, 0, 0, 0, 0, 'Y', q_rad[5])
    T_j6_ee   = create_link_matrix(0, 0.0823, 0, 0, 0, np.pi / 2, 'NONE', 0)

    # Base orientation: ROS Z-up to Three.js Y-up (rotate -90 deg on X)
    R_base = rot_x(-np.pi / 2)
    T_total = R_base @ T_base_j1 @ T_j1_j2 @ T_j2_j3 @ T_j3_j4 @ T_j4_j5 @ T_j5_j6 @ T_j6_ee
    return T_total[0:3, 3]

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'fk_poses.csv')

    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV file not found at '{csv_path}'")
        sys.exit(1)

    print("=" * 72)
    print(" ManipTrain: Python NumPy vs JavaScript FK Validation")
    print(f" Reading poses from: {csv_path}")
    print("=" * 72)
    print(f"{'Pose':<6} | {'JS Pos (m)':<24} | {'Py Pos (m)':<24} | {'Diff (mm)':<9}")
    print("-" * 72)

    diffs_mm = []

    with open(csv_path, 'r', newline='') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            q_deg = [float(row[f'q{k}_deg']) for k in range(1, 7)]
            js_pos = np.array([float(row['js_x']), float(row['js_y']), float(row['js_z'])])

            py_pos = forward_kinematics_ur5(q_deg)
            diff_mm = np.linalg.norm(py_pos - js_pos) * 1000.0
            diffs_mm.append(diff_mm)

            js_str = f"[{js_pos[0]:.3f}, {js_pos[1]:.3f}, {js_pos[2]:.3f}]"
            py_str = f"[{py_pos[0]:.3f}, {py_pos[1]:.3f}, {py_pos[2]:.3f}]"
            print(f"#{i+1:<5} | {js_str:<24} | {py_str:<24} | {diff_mm:7.4f} mm")

    max_diff = max(diffs_mm)
    mean_diff = sum(diffs_mm) / len(diffs_mm)

    print("-" * 72)
    print(f"Total poses tested : {len(diffs_mm)}")
    print(f"Mean difference    : {mean_diff:.4f} mm")
    print(f"Max difference     : {max_diff:.4f} mm")
    print("=" * 72)

    if max_diff < 1.0:
        print(f"[PASS] Maximum difference ({max_diff:.4f} mm) is STRICTLY UNDER 1 mm target!")
        sys.exit(0)
    else:
        print(f"[FAIL] Maximum difference ({max_diff:.4f} mm) exceeds 1 mm threshold.")
        sys.exit(1)

if __name__ == '__main__':
    main()
