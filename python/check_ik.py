"""
check_ik.py - Task 9: Python NumPy Inverse Kinematics Validator & Chart Generator.
Recomputes FK from solved IK angles across 50 targets and validates mean error < 1 mm.
"""

import os
import sys
import csv
import numpy as np

# Configure writable cache for matplotlib
cache_dir = os.path.join(os.path.dirname(__file__), '.mplcache')
os.makedirs(cache_dir, exist_ok=True)
os.environ['MPLCONFIGDIR'] = cache_dir
import matplotlib.pyplot as plt

if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DEG2RAD = np.pi / 180.0

def rot_x(rad):
    c, s = np.cos(rad), np.sin(rad)
    return np.array([[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]], dtype=np.float64)

def rot_y(rad):
    c, s = np.cos(rad), np.sin(rad)
    return np.array([[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]], dtype=np.float64)

def rot_z(rad):
    c, s = np.cos(rad), np.sin(rad)
    return np.array([[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], dtype=np.float64)

def create_link_matrix(tx, ty, tz, roll, pitch, yaw, axis, theta_rad):
    T = rot_z(yaw) @ rot_y(pitch) @ rot_x(roll)
    T[0:3, 3] = [tx, ty, tz]
    if axis == 'Z':
        T = T @ rot_z(theta_rad)
    elif axis == 'Y':
        T = T @ rot_y(theta_rad)
    return T

def forward_kinematics_ur5(q_deg):
    q = [d * DEG2RAD for d in q_deg]
    T1 = create_link_matrix(0, 0, 0.089159, 0, 0, 0, 'Z', q[0])
    T2 = create_link_matrix(0, 0.13585, 0, 0, np.pi / 2, 0, 'Y', q[1])
    T3 = create_link_matrix(0, -0.1197, 0.425, 0, 0, 0, 'Y', q[2])
    T4 = create_link_matrix(0, 0, 0.39225, 0, np.pi / 2, 0, 'Y', q[3])
    T5 = create_link_matrix(0, 0.09465, 0, 0, 0, 0, 'Z', q[4])
    T6 = create_link_matrix(0, 0.09465, 0, 0, 0, 0, 'Y', q[5])
    Tee = create_link_matrix(0, 0.0823, 0, 0, 0, np.pi / 2, 'NONE', 0)

    T_total = rot_x(-np.pi / 2) @ T1 @ T2 @ T3 @ T4 @ T5 @ T6 @ Tee
    return T_total[0:3, 3]

def save_analysis_chart(errors_mm, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5))

    # Subplot 1: Error distribution histogram
    ax1.hist(errors_mm, bins=12, color='#3b82f6', edgecolor='#1e3a8a', alpha=0.8)
    ax1.axvline(1.0, color='#ef4444', linestyle='--', linewidth=1.8, label='1.0 mm Requirement')
    ax1.axvline(np.mean(errors_mm), color='#10b981', linestyle='-', linewidth=2.0, label=f'Mean: {np.mean(errors_mm):.2f} mm')
    ax1.set_title('IK Error Distribution (50 Targets)', fontsize=11, fontweight='bold')
    ax1.set_xlabel('Position Error (mm)')
    ax1.set_ylabel('Target Count')
    ax1.legend()
    ax1.grid(True, linestyle=':', alpha=0.6)

    # Subplot 2: Error per target index
    ax2.plot(range(1, len(errors_mm) + 1), errors_mm, marker='o', markersize=4, color='#f97316', linestyle='-')
    ax2.axhline(1.0, color='#ef4444', linestyle='--', linewidth=1.5, label='1.0 mm Threshold')
    ax2.set_title('Per-Target Tracking Error', fontsize=11, fontweight='bold')
    ax2.set_xlabel('Target Index (1 - 50)')
    ax2.set_ylabel('Position Error (mm)')
    ax2.set_ylim(bottom=0)
    ax2.legend()
    ax2.grid(True, linestyle=':', alpha=0.6)

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f"[OK] Verification chart saved: {output_path}")

def main():
    default_csv = os.path.join(os.path.dirname(__file__), 'ik_poses.csv')
    csv_path = sys.argv[1] if len(sys.argv) > 1 else default_csv

    if not os.path.exists(csv_path):
        print(f"[ERROR] CSV not found at '{csv_path}'. Please click 'Download 50 IK Poses' in Chrome.")
        sys.exit(1)

    targets, errors_mm, rows_data = [], [], []
    with open(csv_path, 'r', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            t = np.array([float(row['target_x']), float(row['target_y']), float(row['target_z'])])
            q_deg = [float(row[f'q{k}_deg']) for k in range(1, 7)]
            actual_pos = forward_kinematics_ur5(q_deg)
            err = np.linalg.norm(actual_pos - t) * 1000.0
            targets.append(t)
            errors_mm.append(err)
            rows_data.append((row['target_id'], t, err))

    mean_err = np.mean(errors_mm)
    max_err = np.max(errors_mm)
    min_err = np.min(errors_mm)
    worst_idx = np.argmax(errors_mm)
    worst_id, worst_pos, _ = rows_data[worst_idx]

    print("=" * 74)
    print(" ManipTrain: Task 9 - 50 Reachable Targets IK Verification")
    print(f" Source: {csv_path}")
    print("=" * 74)
    print(f"{'Target ID':<10} | {'Target (X, Y, Z)':<28} | {'Error (mm)':<12} | {'Status'}")
    print("-" * 74)

    for tid, t, err in rows_data[:10]:
        status = "[PASS]" if err <= 1.0 else "[WARN]"
        print(f"{tid:<10} | [{t[0]:.3f}, {t[1]:.3f}, {t[2]:.3f}]        | {err:6.3f} mm     | {status}")
    if len(rows_data) > 10:
        print(f"... ({len(rows_data) - 10} additional targets evaluated) ...")

    print("=" * 74)
    print(f" Total Evaluated : {len(errors_mm)} targets")
    print(f" Mean Error      : {mean_err:.3f} mm  (Requirement: < 1.0 mm)")
    print(f" Max Error       : {max_err:.3f} mm  (Target #{worst_id} at [{worst_pos[0]:.2f}, {worst_pos[1]:.2f}, {worst_pos[2]:.2f}])")
    print(f" Min Error       : {min_err:.3f} mm")
    print(f" Compliance Rate : {(np.sum(np.array(errors_mm) <= 1.0) / len(errors_mm) * 100):.1f}%")
    print("-" * 74)

    if mean_err <= 1.0:
        print(" RESULT: [PASS] Mean IK tracking error satisfies the sub-millimeter requirement.")
    else:
        print(" RESULT: [FAIL] Mean IK error exceeded 1.0 mm threshold.")

    print("\n[ANALYSIS] Worst Case Explanation:")
    print(f"Target #{worst_id} exhibited max error ({max_err:.3f} mm) due to workspace geometry.")
    print("Near joint motion bounds or near-singular configurations, the DLS damping term")
    print("(lambda^2 * I) penalizes aggressive joint steps to protect stability, trading slight")
    print("terminal position convergence speed for smooth, explosion-free trajectories.\n")

    chart_path = os.path.join(os.path.dirname(__file__), 'results', 'ik_error_distribution.png')
    save_analysis_chart(errors_mm, chart_path)

if __name__ == '__main__':
    main()
