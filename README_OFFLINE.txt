================================================================================
ManipTrain: 6-DOF Robotic Arm Delayed-Teleoperation Simulator (Offline Edition)
================================================================================

This package contains the complete, self-contained offline production build of
ManipTrain. It runs 100% locally with zero internet access or npm installation required.

QUICK START INSTRUCTIONS:
-------------------------
Option A (Windows - 1 Click):
  Double-click "start_windows.bat".
  Your default web browser will automatically open to http://localhost:8080.

Option B (Linux / macOS - Terminal):
  Open terminal in this directory and execute:
    chmod +x start_linux_mac.sh
    ./start_linux_mac.sh

Option C (Direct Python):
  Run:
    python run_offline.py

CONTROLS & KEYBOARD SHORTCUTS:
------------------------------
- Target Movement: W/A/S/D (XZ Plane), Q/E (Y Up/Down)
- Gripper Control: Spacebar or 'G' key (0% release to 90% crush force)
- Camera: Left-click + drag to rotate, Right-click + drag to pan, Scroll to zoom
- Scenario Selection: Top-left buttons (S1: Pick & Place, S2: Suspect EOD, S3: Confined Space)
- Instructor Panel: Press F2 or ~ to configure communication delay and packet loss

SYSTEM REQUIREMENTS:
--------------------
- Modern web browser (Google Chrome, Microsoft Edge, or Mozilla Firefox)
- Python 3.7+ installed on the host system
- WebXR compatible headset supported (Meta Quest / HTC Vive) but optional
================================================================================
