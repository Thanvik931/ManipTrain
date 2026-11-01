# ManipTrain: System Design & Technical Architecture

**Target Project:** Army Training Command (ARTRAC) / MCEME Teleoperation Training  
**Platform:** WebXR / Three.js / Modern Web Browsers (Chrome / Edge / Firefox)  
**Author:** ManipTrain Development Team | **Date:** 01 November 2026

---

## 1. High-Level System Architecture

ManipTrain follows a zero-backend, client-side reactive architecture built with Three.js and WebXR:

```
[ Operator Input ] ───────► [ DelayBuffer ] ────────► [ Robot Arm Runtime ]
 (Mouse / Keys / VR)      (0-500ms / Mobile Traces)    (IK Solver: CCD / DLS)
                                                               │
                                                               ▼
[ 0-100 Scoring Engine ] ◄─── [ AssessmentLogger ] ◄─── [ Collision / Physics ]
 (Time / Bumps / Jerk)         (60 Hz Trajectory)        (AABB Bounding Envelopes)
```

1. **Input Layer (`operatorControls.js`):** Intercepts desktop mouse clicks, keyboard nudges (W/A/S/D/Q/E), Spacebar grip triggers, and WebXR 6-DOF controller poses.
2. **Network Layer (`delayBuffer.js`):** Simulates transmission latency and packet loss between the remote ground station and field manipulator.
3. **Kinematics Engine (`fk.js`, `ik_ccd.js`, `ik_dls.js`):** Solves 6-DOF joint postures matching target positions within sub-millimeter precision.
4. **Physics & Collision Detector (`collisionDetector.js`, `gripper.js`):** Evaluates link bounding boxes against obstacle geometry and simulates object grasping.
5. **Assessment Pipeline (`assessmentLogger.js`, `resultsScreen.js`):** Telemetry sampler computing motion jerk ($d^3p/dt^3$), collision impacts (N), and rubric grading.

---

## 2. Kinematics Pipeline

### Forward Kinematics (FK)
The forward kinematic transformation chain computes Cartesian position $p_{ee} \in \mathbb{R}^3$ from joint angles $\theta = [\theta_1, \dots, \theta_6]^T$:
$$T_0^6(\theta) = T_{\text{base}}^1(\theta_1) \cdot T_1^2(\theta_2) \cdot T_2^3(\theta_3) \cdot T_3^4(\theta_4) \cdot T_4^5(\theta_5) \cdot T_5^6(\theta_6)$$
Each transformation matrix combines link translation $t_i$ and joint axis rotation $R_i(\theta_i)$. Cross-checked against NumPy reference models across 20 poses with error $< 0.0008\text{ mm}$.

### Inverse Kinematics (IK)
Two complementary solvers are integrated:
1. **Cyclic Coordinate Descent (CCD):** Heuristic geometric solver iterating backwards from wrist link 6 to base link 1. Provides fast recovery from arbitrary poses.
2. **Damped Least Squares (DLS):** Numerical Jacobian-based solver:
   $$\Delta \theta = J^T \left( J J^T + \lambda^2 I \right)^{-1} e$$
   where $J = [\partial x_i / \partial \theta_j] \in \mathbb{R}^{3 \times 6}$ is computed via central finite differences, $e = x_{\text{target}} - x_{\text{current}}$, and $\lambda = 0.04$ provides singularity damping. Validated across 50 targets with mean error $0.13\text{ mm}$.

---

## 3. Simplified Physics & Collision Detection

- **Link Bounding Volumes:** Each arm link is enveloped in an Axis-Aligned Bounding Box (AABB) aligned to its visual mesh.
- **Safety Rollback:** Upon detecting an obstacle intersection, the robot automatically rolls back joint positions to the last safe configuration.
- **Impact Calculation:** Impact force in Newtons is calculated as $F = m \cdot (\Delta v / \Delta t)$, logged with link identity.
- **Mechanical Gripper Dynamics:** Two fingers actuate along the lateral axis with force $F \in [0\%, 100\%]$:
  - $F < 35\%$: Grip slips under gravity ($9.8\text{ m/s}^2$).
  - $35\% \le F \le 80\%$: Secure non-destructive hold.
  - $F > 85\%$: Fragile objects crush and trigger penalty.

---

## 4. Teleoperation Delay Buffer

- **Ring Buffer:** Stores timestamped target poses and grip values in chronological order.
- **Delay Modes:**
  1. *Fixed Delay:* Uniform latency selected from 0, 100, 200, 300, or 500 ms.
  2. *Trace Replay:* Replays 500 empirical cellular ping samples recorded at MCEME:
     - `idle_hotspot.csv`: Mean 43.1 ms, 0% packet loss.
     - `congested_hotspot.csv`: Mean 221.3 ms, 3.2% packet loss.
  3. *Packet Loss Injection:* Bernoulli drop rate from 0% to 20%.

---

## 5. Multi-Factor Scoring Engine

Standardized 0–100 evaluation rubric:
$$\text{Score} = \max\left(0, 100 - (P_{\text{time}} + P_{\text{collision}} + P_{\text{jerk}} + P_{\text{grip}} + P_{\text{limits}} + P_{\text{fail}})\right)$$
- **$P_{\text{time}}$:** 1.0 pt per second over scenario par time (max 25 pts).
- **$P_{\text{collision}}$:** 5.0 pts per contact $+ 0.2 \times (F - 10\text{ N})$ (max 40 pts).
- **$P_{\text{jerk}}$:** Evaluates trajectory smoothness $\frac{1}{N}\sum |\dddot{p}_i|$ normalized against $150\text{ m/s}^3$ (max 15 pts).
- **$P_{\text{grip}}$:** 15 pts per dropped object, 30 pts per crushed object.
- **$P_{\text{fail}}$:** 50 pts deduction upon scenario failure (e.g. hazard tilt $> 15^\circ$ or wall budget exhaustion).
Grade thresholds: **A** ($\ge 90$), **B** ($78–89$), **C** ($60–77$), **D** ($45–59$), **F** ($< 45$).

