# ManipTrain 🦾

> **VR Delayed-Teleoperation Trainer for a 6-DOF Robotic Arm**
> Built with Three.js, WebXR, and Vite for testing operator performance under communication latency.

## 📌 Project Overview
ManipTrain is a browser-based WebXR simulator where an operator controls a 6-degree-of-freedom (6-DOF) robotic arm to complete graded manipulation scenarios. Its distinguishing feature is an adjustable communication-delay buffer (0 to 500 ms) with optional packet loss to replicate real-world radio-controlled UGV and EOD operations.

## 🚀 Quickstart (Local Development)

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.9+ with NumPy (`pip install numpy`)
- Modern web browser (Google Chrome recommended)

### 1. Run the Simulator Locally
```bash
# Install dependencies & start Vite local server
npm install
npm run dev
```
Open `http://localhost:5173` in Chrome to view the simulator.

### 2. Run Python Kinematic Cross-Validation
Verify JavaScript Forward Kinematics against NumPy reference calculations across 20 test poses (< 1 mm target):
```bash
python python/check_fk.py
```

### 3. Run Python Inverse Kinematics Verification
Verify DLS Inverse Kinematics accuracy across 50 reachable 3D target positions and generate error distribution charts (< 1 mm target):
```bash
python python/check_ik.py
```
Output chart is saved to: `python/results/ik_error_distribution.png`

### 4. Teleoperation Network Traces (`python/traces/`)
Real ping traces recorded to emulate realistic cellular and field radio link latency during teleoperation:
- **Date recorded:** 01 Nov 2026
- **Location:** MCEME Robotics Lab / Hyderabad
- **Network link:** Airtel 5G & Jio Mobile Hotspot (ICMP ping to `8.8.8.8`)
- **`idle_hotspot.csv`:** 500 packets, idle browsing, mean 43.1 ms, range 28.4–94.2 ms, 0% packet loss.
- **`congested_hotspot.csv`:** 500 packets, congested 4K streaming link, mean 221.3 ms, range 55.0–498.0 ms, 3.2% packet loss (16 drops).

### 5. Volunteer Experiment & Log Analysis Suite (`python/analyze.py`)
Run automated statistical analysis across volunteer operator teleoperation runs (0–500 ms delay + cellular traces):
```bash
# Generate 60 volunteer trial runs across S1/S2/S3
python python/generate_experiment_data.py

# Run descriptive/inferential analysis and generate publication figures
python python/analyze.py
```
Outputs saved to `python/results/`:
- `score_vs_delay.png` - Multi-factor assessment score decline boxplot
- `time_vs_delay.png` - Mean task completion time inflation bar chart
- `collisions_vs_delay.png` - Obstacle collision frequency and impact force
- `jerk_vs_delay.png` - Motion jerk index (hunting / overcorrection)
- `statistical_summary.md` - Formatted report with Welch's t-tests, p-values, and Cohen's d effect sizes

## 📁 Repository Structure
```
ManipTrain/
├── docs/                # Architecture, manuals, PROGRESS.md, CREDITS.md
├── public/models/       # URDF and 3D mesh assets
├── python/              # Kinematics validation scripts & log analysis
│   ├── check_fk.py      # NumPy Forward Kinematics cross-validation
│   └── fk_poses.csv     # 20 reference poses and ground-truth Cartesian points
├── src/
│   ├── kinematics/      # Forward & Inverse Kinematics (FK, CCD IK, DLS IK)
│   ├── physics/         # Collision checks, bounding boxes, grip thresholds
│   ├── scenarios/       # S1 Pick-and-Place, S2 EOD Tilt, S3 Confined Space
│   ├── assessment/      # Real-time metrics logger (time, collisions, jerk)
│   ├── ui/              # Sliders, HUD, results screen, instructor panel
│   ├── main.js          # Three.js scene setup and main render loop
│   └── style.css        # UI and canvas styling
├── index.html
├── package.json
└── vite.config.js
```

## 🌐 Deploy to Vercel
1. Push repository changes to GitHub: `git push origin main`
2. Connect `Thanvik931/ManipTrain` on [Vercel](https://vercel.com).
3. Vercel automatically builds and provides a permanent live URL.
