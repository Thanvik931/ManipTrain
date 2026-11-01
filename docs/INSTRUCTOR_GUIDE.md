# ManipTrain: Instructor & Evaluator Guide

**Target Audience:** Military Training Instructors & Robotics Evaluators (MCEME / ARTRAC)  
**Simulator Version:** 1.0 (Assessment & Telemetry Edition)  
**Date:** 01 November 2026

---

## 1. Overview & Purpose

The ManipTrain simulator evaluates operator capability under degraded radio-frequency (RF) communication links. In real field deployments (counter-IED, hazardous material disposal, UGV operations), operators must manipulate robotic arms across contested or high-latency networks.

This guide details how instructors can configure covert transmission delays, replay empirical RF traces, administer standardized volunteer evaluation protocols, and run batch statistical analyses.

---

## 2. Instructor Panel Access & Controls

The instructor panel is hidden from the candidate during normal operation to prevent anticipation bias.

### Opening the Panel
- **Keyboard Shortcut:** Press <kbd>F2</kbd> or the backtick / tilde key (<kbd>`</kbd> / <kbd>~</kbd>).
- **HUD Button:** Click the small `⚙ Instructor` button located in the top toolbar.

### Delay Configuration Options
1. **Delay Mode Dropdown:**
   - `Fixed Delay`: Applies a constant, uniform buffer delay (0, 100, 200, 300, or 500 ms).
   - `Trace: Idle Hotspot`: Replays 500 packets from a live 5G cellular link (mean 43.1 ms, 0% loss).
   - `Trace: Congested Hotspot`: Replays 500 packets from a congested 4K streaming cellular link (mean 221.3 ms, 3.2% loss).
2. **Fixed Delay Slider (0–500 ms):** Adjusts the fixed delay buffer in 10 ms increments.
3. **Simulated Packet Loss (0–20%):** Injects random Bernoulli packet dropouts, testing candidate recovery from lost grip/pose packets.
4. **Active Latency Readout:** Displays the real-time instantaneous delay applied to the arm in milliseconds.

---

## 3. Standardized Evaluation Protocol

To ensure statistically valid and fair assessments across cadets and volunteers:

### Phase 1: Familiarization (5 minutes)
- Set delay to **0 ms** (Fixed) and packet loss to **0%**.
- Allow candidate 5 minutes to practice camera navigation, W/A/S/D keyboard positioning, and gripper grasping in Scenario S1.

### Phase 2: Graded Testing (Randomized Delay Battery)
Each candidate completes three scenario runs under randomized conditions:
1. **Baseline Trial:** Fixed **0 ms** delay (records ground-truth baseline dexterity).
2. **Tactical RF Link:** Replay `Trace: Congested Hotspot` (mean ~221 ms).
3. **Severe Delay Test:** Fixed **300 ms** or **500 ms** delay (tests patience and move-and-wait discipline).

*Instruction to Candidates:* "Operate as smoothly and cautiously as possible. Avoid collisions and excessive velocity jerks; avoid dropped or crushed objects."

### Phase 3: Telemetry Collection
At the completion of each run, instruct the candidate to click **Download JSON Report**. Collect the JSON logs using anonymous identifiers (e.g., `VOL_01_S1_0ms.json`). Place all collected JSON files into `python/logs/`.

---

## 4. Automated Statistical Analysis

ManipTrain includes a Python log analysis suite to evaluate cohort performance:

```bash
# Process all candidate JSON trial logs in python/logs/
python python/analyze.py --logs python/logs --out python/results
```

### Analysis Outputs (`python/results/`)
1. `statistical_summary.md`: Tabulates mean scores, standard deviations, and Welch's t-test p-values.
2. `score_vs_delay.png`: Boxplot showing cohort degradation across delay brackets.
3. `time_vs_delay.png`: Identifies whether candidates adopted a proper "move-and-wait" pacing.
4. `jerk_vs_delay.png`: Flags candidates suffering from closed-loop oscillation / overcorrection.

---

## 5. Qualification Standards for Field Deployment

Based on empirical validation across 60 trials, MCEME / ARTRAC operators should meet:
- **Baseline (0 ms):** Score $\ge 90$ (Grade A), 0 collisions, completion time $< 30\text{ s}$.
- **Tactical Link (Congested Hotspot / 200 ms):** Score $\ge 60$ (Grade C or better), 0 catastrophic failures (no EOD detonations, $\le 3$ contacts).
- **Severe Latency (500 ms):** Completion without catastrophic failure, jerk index $< 180\text{ m/s}^3$.
