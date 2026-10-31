# ManipTrain 🦾

> **VR Delayed-Teleoperation Trainer for a 6-DOF Robotic Arm**
> Built with Three.js, WebXR, and Vite for testing operator performance under communication latency.

## 📌 Project Overview
ManipTrain is a browser-based WebXR simulator where an operator controls a 6-degree-of-freedom (6-DOF) robotic arm to complete graded manipulation scenarios. Its distinguishing feature is an adjustable communication-delay buffer (0 to 500 ms) with optional packet loss to replicate real-world radio-controlled UGV and EOD operations.

## 🚀 Quickstart (Local Development)

### Prerequisites
- Node.js (v18+ recommended)
- Modern web browser (Google Chrome recommended)

### Run Locally
```bash
# Install dependencies
npm install

# Start Vite local development server
npm run dev
```
Open `http://localhost:5173` in Chrome to view the simulator.

## 📁 Repository Structure
```
ManipTrain/
├── docs/                # Architecture, manuals, PROGRESS.md, CREDITS.md
├── public/models/       # URDF and 3D mesh assets
├── python/              # Kinematics validation scripts & log analysis
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
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial project setup with vite and three.js"
   git branch -M main
   git remote add origin https://github.com/Thanvik931/ManipTrain.git
   git push -u origin main
   ```
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import `Thanvik931/ManipTrain` from GitHub.
4. Keep the default settings (Framework preset: `Vite`, Build command: `vite build`, Output directory: `dist`).
5. Click **Deploy**. Vercel will build and assign a live public URL.
