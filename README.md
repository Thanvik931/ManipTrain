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
