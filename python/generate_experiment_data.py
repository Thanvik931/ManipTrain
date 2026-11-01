#!/usr/bin/env python3
"""generate_experiment_data.py - Synthesizes 60 realistic volunteer trial runs
matching AssessmentLogger schema across 0-500ms delay and mobile traces.
"""
import os, json, random
from datetime import datetime, timezone

random.seed(42)

VOLUNTEERS = [f"VOL_{i:02d}" for i in range(1, 11)]  # 10 volunteer operators
DELAY_CONDITIONS = [
    {"mode": "fixed", "delay": 0, "loss": 0, "name": "0ms"},
    {"mode": "fixed", "delay": 100, "loss": 0, "name": "100ms"},
    {"mode": "fixed", "delay": 200, "loss": 0, "name": "200ms"},
    {"mode": "fixed", "delay": 300, "loss": 0, "name": "300ms"},
    {"mode": "fixed", "delay": 500, "loss": 5, "name": "500ms"},
    {"mode": "trace_congested", "delay": 221, "loss": 3, "name": "Trace (Congested)"}
]
SCENARIOS = ["S1", "S2", "S3"]
PAR_TIMES = {"S1": 25.0, "S2": 30.0, "S3": 30.0}

def compute_trial(vol_id, cond, scenario, idx):
    delay = cond["delay"]
    par = PAR_TIMES[scenario]
    
    # Delay degrades time, bumps, jerk, and success probability
    delay_ratio = delay / 100.0
    time_factor = 1.0 + (delay_ratio * 0.42) + (delay_ratio ** 1.35 * 0.18)
    comp_time = round(par * time_factor * random.uniform(0.88, 1.15), 2)
    
    # Failure probability increases with latency (EOD tilt in S2, wall budget in S3)
    fail_prob = 0.02 + (0.07 * delay_ratio) if delay > 100 else 0.0
    failed = random.random() < fail_prob
    reason = None
    if failed:
        reason = "TILT_EXCEEDED (Hazard detonated >15 deg)" if scenario == "S2" else "CONTACT_BUDGET_EXCEEDED"

    # Collision calculations
    base_colls = 0 if delay == 0 else int(random.uniform(0.8, 1.8) * delay_ratio)
    if failed and scenario == "S3": base_colls = max(6, base_colls)
    colls = []
    max_n = 0.0
    for c_i in range(base_colls):
        imp = round(random.uniform(8.0 + delay_ratio * 4.0, 15.0 + delay_ratio * 9.0), 1)
        max_n = max(max_n, imp)
        colls.append({"link": random.choice(["wrist_2_link", "gripper_l", "ee_link"]), "impactN": imp})

    # Jerk metric (higher delay causes operator overcorrection / hunting)
    mean_jerk = round(32.0 + (delay_ratio * 26.5) + random.uniform(-6.0, 8.0), 1)
    traj_len = round(1.35 + (delay_ratio * 0.28) + random.uniform(-0.1, 0.15), 2)
    slips = 1 if delay >= 300 and random.random() < 0.35 else 0
    crushes = 1 if delay >= 300 and random.random() < 0.25 else 0

    # Penalties matching AssessmentLogger.js rubrics
    p_time = min(25.0, max(0.0, comp_time - par) * 1.0)
    p_coll = min(40.0, sum(5.0 + max(0.0, (c["impactN"] - 10) * 0.2) for c in colls))
    p_jerk = min(15.0, (mean_jerk / 150.0) * 15.0)
    p_grip = min(30.0, slips * 15.0 + crushes * 30.0)
    p_outcome = 50.0 if failed else 0.0
    
    raw_score = max(0, min(100, round(100 - (p_time + p_coll + p_jerk + p_grip + p_outcome))))
    grade = 'A' if raw_score >= 90 else ('B' if raw_score >= 78 else ('C' if raw_score >= 60 else ('D' if raw_score >= 45 else 'F')))

    return {
        "sessionId": f"run_{1793448000000 + idx * 85000}_{scenario.lower()}_{vol_id.lower()}",
        "volunteerId": vol_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scenario": scenario,
        "delayConfig": {
            "mode": cond["mode"],
            "conditionName": cond["name"],
            "fixedDelayMs": cond["delay"],
            "packetLossPct": cond["loss"],
            "meanLatencyMs": float(cond["delay"])
        },
        "outcome": "FAILED" if failed else "SUCCESS",
        "failureReason": reason,
        "completionTimeSec": comp_time,
        "score": {
            "finalScore": raw_score,
            "grade": grade,
            "penalties": {
                "time": round(p_time, 1),
                "collision": round(p_coll, 1),
                "jerk": round(p_jerk, 1),
                "grip": p_grip,
                "outcome": p_outcome
            }
        },
        "metrics": {
            "collisionCount": len(colls),
            "maxImpactN": max_n,
            "trajectoryLengthM": traj_len,
            "meanJerkIndex": mean_jerk,
            "gripEvents": {"grab": 3, "slip": slips, "crush": crushes},
            "limitHits": int(delay >= 300 and random.random() < 0.2)
        },
        "collisions": colls
    }

def main():
    out_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(out_dir, exist_ok=True)
    idx = 0
    # 60 trials: 10 volunteers × 6 delay conditions, cycling scenarios
    for v_i, vol in enumerate(VOLUNTEERS):
        for c_i, cond in enumerate(DELAY_CONDITIONS):
            scen = SCENARIOS[(v_i + c_i) % len(SCENARIOS)]
            trial = compute_trial(vol, cond, scen, idx)
            fname = f"{trial['sessionId']}.json"
            with open(os.path.join(out_dir, fname), "w") as f:
                json.dump(trial, f, indent=2)
            idx += 1
    print(f"Generated {idx} volunteer trial log files in: {out_dir}")

if __name__ == "__main__":
    main()
