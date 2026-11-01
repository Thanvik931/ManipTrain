#!/usr/bin/env python3
"""plot_results.py - Generates publication-ready figures for ManipTrain delay experiment analysis.
Outputs score, completion time, collisions, and jerk comparison charts in python/results/.
"""
import os, tempfile
os.environ["MPLCONFIGDIR"] = tempfile.gettempdir()

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ORDERED_KEYS = ["0ms", "100ms", "200ms", "300ms", "500ms", "Trace (Congested)"]

def setup_style():
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.size"] = 10
    plt.rcParams["axes.titlesize"] = 12
    plt.rcParams["axes.labelsize"] = 10

def generate_all_plots(groups, out_dir):
    setup_style()
    os.makedirs(out_dir, exist_ok=True)
    labels = [k for k in ORDERED_KEYS if k in groups]
    if not labels:
        labels = list(groups.keys())

    # 1. Score vs Delay
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
    scores_data = [groups[k]["scores"] for k in labels]
    box = ax.boxplot(scores_data, tick_labels=labels, patch_artist=True, medianprops=dict(color="#d97706", linewidth=2.0))
    colors = ["#4ade80", "#a3e635", "#facc15", "#fb923c", "#f87171", "#c084fc"]
    for patch, c in zip(box["boxes"], colors[:len(labels)]):
        patch.set_facecolor(c)
        patch.set_alpha(0.75)
    ax.axhline(78, color="#9ca3af", linestyle="--", linewidth=1, label="B Grade Threshold (78)")
    ax.axhline(60, color="#ef4444", linestyle=":", linewidth=1, label="Passing Threshold (60)")
    ax.set_title("ManipTrain Assessment Score vs. Communication Delay", pad=12, fontweight="bold")
    ax.set_ylabel("Final Score (0–100 Rubric)")
    ax.set_xlabel("Latency Condition")
    ax.set_ylim(0, 105)
    ax.legend(loc="lower left", frameon=True)
    plt.tight_layout()
    p1 = os.path.join(out_dir, "score_vs_delay.png")
    fig.savefig(p1)
    plt.close(fig)

    # 2. Completion Time vs Delay
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
    means_time = [np.mean(groups[k]["times"]) for k in labels]
    stds_time = [np.std(groups[k]["times"], ddof=1) for k in labels]
    ax.bar(labels, means_time, yerr=stds_time, capsize=5, color="#3b82f6", alpha=0.8, edgecolor="#1d4ed8", width=0.55)
    ax.plot(labels, means_time, color="#1e40af", marker="o", linewidth=2)
    ax.set_title("Task Completion Time vs. Communication Delay", pad=12, fontweight="bold")
    ax.set_ylabel("Mean Completion Time (seconds ± 1 SD)")
    ax.set_xlabel("Latency Condition")
    for i, m in enumerate(means_time):
        ax.text(i, m + stds_time[i] + 2.5, f"{m:.1f}s", ha="center", fontsize=9, fontweight="bold")
    ax.set_ylim(0, max(means_time) * 1.35)
    plt.tight_layout()
    p2 = os.path.join(out_dir, "time_vs_delay.png")
    fig.savefig(p2)
    plt.close(fig)

    # 3. Collision Count vs Delay
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
    means_col = [np.mean(groups[k]["collisions"]) for k in labels]
    stds_col = [np.std(groups[k]["collisions"], ddof=1) for k in labels]
    bars = ax.bar(labels, means_col, yerr=stds_col, capsize=5, color="#f97316", alpha=0.85, edgecolor="#c2410c", width=0.55)
    ax.set_title("Obstacle Collision Frequency vs. Communication Delay", pad=12, fontweight="bold")
    ax.set_ylabel("Mean Collision Count (contacts ± 1 SD)")
    ax.set_xlabel("Latency Condition")
    for i, m in enumerate(means_col):
        ax.text(i, m + stds_col[i] + 0.15, f"{m:.2f}", ha="center", fontsize=9, fontweight="bold")
    ax.set_ylim(0, max(means_col) * 1.5 + 1.0)
    plt.tight_layout()
    p3 = os.path.join(out_dir, "collisions_vs_delay.png")
    fig.savefig(p3)
    plt.close(fig)

    # 4. Trajectory Jerk Index vs Delay
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=300)
    means_jerk = [np.mean(groups[k]["jerks"]) for k in labels]
    stds_jerk = [np.std(groups[k]["jerks"], ddof=1) for k in labels]
    ax.plot(labels, means_jerk, color="#ec4899", marker="s", linewidth=2.5, markersize=8, label="Mean Jerk Index")
    ax.fill_between(labels, [m - s for m, s in zip(means_jerk, stds_jerk)],
                    [m + s for m, s in zip(means_jerk, stds_jerk)], color="#fbcfe8", alpha=0.5, label="±1 SD")
    ax.set_title("Motion Jerk Index (Hunting / Overcorrection) vs. Delay", pad=12, fontweight="bold")
    ax.set_ylabel(r"Mean End-Effector Jerk ($m/s^3$)")
    ax.set_xlabel("Latency Condition")
    ax.legend(loc="upper left")
    plt.tight_layout()
    p4 = os.path.join(out_dir, "jerk_vs_delay.png")
    fig.savefig(p4)
    plt.close(fig)

    return [p1, p2, p3, p4]
