#!/usr/bin/env python3
"""stats_engine.py - Descriptive and inferential statistics engine for ManipTrain trial logs.
Computes means, standard deviations, Welch's t-tests, p-values, and Cohen's d effect sizes.
"""
import os, glob, json, math
import numpy as np
from scipy import stats

def load_trial_logs(logs_dir):
    pattern = os.path.join(logs_dir, "*.json")
    files = glob.glob(pattern)
    trials = []
    for fpath in files:
        with open(fpath, "r", encoding="utf-8") as f:
            try:
                trials.append(json.load(f))
            except Exception as e:
                print(f"Skipping corrupt log {fpath}: {e}")
    return trials

def group_trials_by_condition(trials):
    groups = {}
    for t in trials:
        cname = t["delayConfig"].get("conditionName") or f"{t['delayConfig'].get('fixedDelayMs', 0)}ms"
        if cname not in groups:
            groups[cname] = {
                "name": cname,
                "delayMs": t["delayConfig"].get("meanLatencyMs", 0),
                "scores": [],
                "times": [],
                "collisions": [],
                "jerks": [],
                "successes": 0,
                "total": 0
            }
        g = groups[cname]
        g["total"] += 1
        g["scores"].append(t["score"]["finalScore"])
        g["times"].append(t["completionTimeSec"])
        g["collisions"].append(t["metrics"]["collisionCount"])
        g["jerks"].append(t["metrics"]["meanJerkIndex"])
        if t.get("outcome") == "SUCCESS":
            g["successes"] += 1
    return groups

def compute_summary_table(groups):
    summary = {}
    for cname, g in groups.items():
        summary[cname] = {
            "name": cname,
            "delayMs": g["delayMs"],
            "n": g["total"],
            "successRate": (g["successes"] / g["total"]) * 100.0 if g["total"] else 0,
            "score": {
                "mean": float(np.mean(g["scores"])),
                "std": float(np.std(g["scores"], ddof=1)) if len(g["scores"]) > 1 else 0.0,
                "median": float(np.median(g["scores"])),
                "min": float(np.min(g["scores"])),
                "max": float(np.max(g["scores"]))
            },
            "time": {
                "mean": float(np.mean(g["times"])),
                "std": float(np.std(g["times"], ddof=1)) if len(g["times"]) > 1 else 0.0,
                "median": float(np.median(g["times"]))
            },
            "collisions": {
                "mean": float(np.mean(g["collisions"])),
                "std": float(np.std(g["collisions"], ddof=1)) if len(g["collisions"]) > 1 else 0.0
            },
            "jerk": {
                "mean": float(np.mean(g["jerks"])),
                "std": float(np.std(g["jerks"], ddof=1)) if len(g["jerks"]) > 1 else 0.0
            }
        }
    return summary

def run_hypothesis_tests(groups, baseline_key="0ms"):
    if baseline_key not in groups:
        return {}
    base_scores = groups[baseline_key]["scores"]
    base_times = groups[baseline_key]["times"]
    tests = {}
    for cname, g in groups.items():
        if cname == baseline_key:
            continue
        # Welch's t-test (unequal variances assumed)
        t_score, p_score = stats.ttest_ind(base_scores, g["scores"], equal_var=False)
        t_time, p_time = stats.ttest_ind(base_times, g["times"], equal_var=False)

        # Cohen's d effect size for score degradation
        s1, s2 = np.std(base_scores, ddof=1), np.std(g["scores"], ddof=1)
        n1, n2 = len(base_scores), len(g["scores"])
        s_pooled = math.sqrt(((n1 - 1) * s1**2 + (n2 - 1) * s2**2) / (n1 + n2 - 2)) if (n1 + n2 > 2) else 1.0
        cohen_d = (np.mean(base_scores) - np.mean(g["scores"])) / s_pooled if s_pooled > 0 else 0.0

        def star(p):
            if p < 0.001: return "*** (p < 0.001)"
            if p < 0.01: return "** (p < 0.01)"
            if p < 0.05: return "* (p < 0.05)"
            return "ns (p >= 0.05)"

        tests[cname] = {
            "score": {"t": float(t_score), "p": float(p_score), "sig": star(p_score), "cohen_d": float(cohen_d)},
            "time": {"t": float(t_time), "p": float(p_time), "sig": star(p_time)}
        }
    return tests
