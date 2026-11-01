# ManipTrain: Operator User Manual

**Target User:** Military Cadet / Field Robotic Teleoperator  
**Simulator Version:** 1.0 (WebXR Production Build)  
**Date:** 01 November 2026

---

## 1. Getting Started

### Launch Options
- **Online:** Open the hosted simulator link in Google Chrome or Microsoft Edge.
- **Offline (Standalone):**
  1. Extract `ManipTrain-v1.0-offline.zip`.
  2. Double-click `start_windows.bat` (Windows) or execute `./start_linux_mac.sh` (Linux/Mac).
  3. The simulator opens locally at `http://localhost:8080/`.

---

## 2. Operator Control Schemes

### A. 3D Camera Navigation
- **Rotate Orbit:** Click and drag with the **Left Mouse Button**.
- **Pan View:** Click and drag with the **Right Mouse Button** (or Shift + Left Click).
- **Zoom In/Out:** Rotate the **Mouse Scroll Wheel**.

### B. End-Effector Positioning
1. **Interactive Transform Gizmo:** Click and drag the red (X), green (Y), or blue (Z) arrows on the orange target sphere.
2. **Click-to-Reach (Raycasting):** Left-click directly on any graspable object (cube, cylinder, or capsule). The robot arm will automatically solve IK and reposition its gripper directly above the target.
3. **Keyboard Nudge Controls:**
   - <kbd>W</kbd> / <kbd>S</kbd>: Move target Forward / Backward (+Z / -Z).
   - <kbd>A</kbd> / <kbd>D</kbd>: Move target Left / Right (-X / +X).
   - <kbd>Q</kbd> / <kbd>E</kbd>: Elevate target Up / Down (+Y / -Y).

### C. Gripper Force Control
- **Keyboard Trigger:** Tap <kbd>Spacebar</kbd> or <kbd>G</kbd> to cycle grip force.
- **HUD Slider:** Adjust the grip slider from $0\%$ to $100\%$ on the right-hand panel.
- **Quick Preset Buttons:**
  - `Release (0%)`: Opens gripper fingers fully.
  - `Hold (50%)`: Applies nominal safe clamping force without crushing.
  - `Crush (90%)`: Applies excessive force (crushes fragile specimens).

### D. WebXR VR Headset Mode
If an Oculus Quest, HTC Vive, or SteamVR headset is connected:
1. Click the **Enter VR** button at the bottom center of the screen.
2. Reach out and pull the controller grip button to snap the virtual target to your hand.
3. Squeeze the index trigger to close the robotic gripper fingers proportionally.

---

## 3. Graded Training Scenarios

Use the top-left HUD buttons (`[S1: Pick & Place]`, `[S2: Suspect EOD]`, `[S3: Confined Space]`) to switch scenarios:

### Scenario S1: 3-Color Pick & Place
- **Objective:** Pick up the 3 colored blocks (Red, Green, Blue) from the work table and transport each into its matching colored landing zone.
- **Par Time:** 25.0 seconds.
- **Safety Hazards:** Avoid colliding link segments with the table edge or transparent safety shield.

### Scenario S2: Suspect Object Handling (EOD Tilt Sensitive)
- **Objective:** Lift the upright hazardous yellow cylinder from the staging table, transport it across the partition, and lower it into the blast-containment bin.
- **Critical Failure Condition:** The object is equipped with a sensitive internal mercury switch. If the cylinder tilts more than **15.0°** from vertical at any point during transit, it **detonates**, failing the run instantly!
- **Guidance:** Monitor the live 3D tilt readout in the center HUD (`Tilt: X.X° / 15°`). Keep all movements level and steady.

### Scenario S3: Confined Space Retrieval
- **Objective:** Reach into a narrow acrylic tunnel ($15\text{ cm} \times 14\text{ cm} \times 20\text{ cm}$), grasp the extraction capsule, and retrieve it cleanly out to the green extraction zone.
- **Critical Failure Condition:** The tunnel walls register physical contact. If the robot arm strikes the tunnel structure more than **5 times**, the structure collapses and the mission fails!
- **Guidance:** Align the wrist orientation parallel to the tunnel axis before inserting the gripper.

---

## 4. Assessment Results & Telemetry Export

Upon completing or failing any scenario run, the automated **Assessment Screen** appears:
- **Grade Badge:** Displays earned mark (**A**, **B**, **C**, **D**, or **F**).
- **Rubric Penalties:** Detailed card showing deductions for elapsed time, collision severity (N), trajectory jerk ($m/s^3$), and grip drops.
- **Download JSON Log:** Click `Download JSON Report` to save the timestamped telemetry file (`run_<timestamp>.json`) for evaluator review or Python log analysis.
