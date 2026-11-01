# python/traces/record_traces.py
# Generates realistic cellular hotspot ping traces (500 samples each) for ManipTrain Task 16.
# Profiles based on 4G/5G mobile hotspot telemetry to 8.8.8.8 at MCEME / Hyderabad.

import csv
import os
import numpy as np

np.random.seed(42)

def generate_traces():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(out_dir, exist_ok=True)

    # 1. Idle Hotspot (500 packets, mean ~42ms, min 28ms, no loss)
    idle_base = np.random.normal(loc=40.0, scale=8.0, size=500)
    idle_jitter = np.random.exponential(scale=3.0, size=500)
    idle_delays = np.clip(idle_base + idle_jitter, 28.0, 110.0)

    idle_path = os.path.join(out_dir, 'idle_hotspot.csv')
    with open(idle_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['packet_id', 'delay_ms', 'lost'])
        for i, d in enumerate(idle_delays):
            writer.writerow([i + 1, f"{d:.1f}", 0])

    # 2. Congested Hotspot (500 packets, 4K video load, mean ~185ms, bufferbloat spikes to 490ms, ~3% loss)
    cong_base = np.random.normal(loc=160.0, scale=35.0, size=500)
    cong_spikes = np.random.exponential(scale=30.0, size=500)
    # Burst delays at intervals simulating queue bloat
    for b in range(120, 160):
        cong_spikes[b] += np.random.uniform(80, 220)
    for b in range(310, 360):
        cong_spikes[b] += np.random.uniform(100, 250)

    cong_delays = np.clip(cong_base + cong_spikes, 55.0, 498.0)
    # Mark random ~3.2% packet losses
    lost_indices = set(np.random.choice(500, size=16, replace=False))

    cong_path = os.path.join(out_dir, 'congested_hotspot.csv')
    with open(cong_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['packet_id', 'delay_ms', 'lost'])
        for i, d in enumerate(cong_delays):
            lost = 1 if i in lost_indices else 0
            writer.writerow([i + 1, f"{d:.1f}", lost])

    print(f"Generated {idle_path} (500 samples, mean={np.mean(idle_delays):.1f}ms)")
    print(f"Generated {cong_path} (500 samples, mean={np.mean(cong_delays):.1f}ms, {len(lost_indices)} lost)")

if __name__ == '__main__':
    generate_traces()

