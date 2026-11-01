# ManipTrain: 3-Minute Demonstration Video Script

**Target Duration:** 2 minutes 50 seconds (< 3 minutes total)  
**Target Audience:** HQ Army Training Command (ARTRAC) / MCEME Technical Review Panel  
**Audio Style:** Clear, professional, technical voiceover

---

## [0:00 – 0:20] The Problem: Latency in Hazardous Robotic Teleoperation (20s)

- **Visual:** Split screen / title slide with ManipTrain logo and real footage / CAD rendering of an EOD robot operating in contested field conditions.
- **Voiceover:**
  > "In explosive ordnance disposal and hazardous military robotics, human operators rarely enjoy high-speed fiber connections. Field operations rely on tactical radio and cellular links where transmission delays range from 50 to 500 milliseconds. Under feedback latency, human operators instinctively overcorrect, causing destructive collisions and catastrophic detonation failures. This is ManipTrain: a browser-based WebXR delayed-teleoperation trainer designed to assess and train robotic operators before field deployment."

---

## [0:20 – 1:50] Live Simulator Demonstration: Three Scenarios & Latency Injection (90s)

### A. 6-DOF Robot & Kinematics [0:20 – 0:40]
- **Visual:** Show Three.js viewport in browser. Orbit camera around UR5 arm. Drag the orange target sphere. Click DLS IK toggle.
- **Voiceover:**
  > "Built with Three.js and WebXR, ManipTrain simulates an authentic 6-degree-of-freedom UR5 robotic arm. Joint kinematics are solved in real time using a Damped Least Squares numerical Jacobian solver with sub-millimeter precision, clamped against physical joint limits."

### B. Scenario S1: Pick & Place [0:40 – 0:55]
- **Visual:** Switch to S1. Show robot picking up the red block and placing it into the red target square. Spacebar actsuate gripper fingers.
- **Voiceover:**
  > "Scenario 1 evaluates basic multi-colored sorting. Operators use mouse raycasting or W-A-S-D keyboard nudging with variable-force two-finger gripper actuation."

### C. Scenario S2: EOD Hazard Handling [0:55 – 1:15]
- **Visual:** Switch to S2. Show hazard cylinder with live 3D tilt HUD. Demonstrate gentle lift into containment chamber. Show simulated tilt failure banner (`> 15° Detonation`).
- **Voiceover:**
  > "Scenario 2 replicates EOD hazard handling. The cylinder contains a virtual tilt sensor. Tilting beyond 15 degrees triggers instant detonation, training operators in level transit discipline."

### D. Scenario S3: Confined Space & Latency Buffer [1:15 – 1:35]
- **Visual:** Switch to S3. Open Instructor Panel with <kbd>F2</kbd>. Dial latency to 300 ms and inject 3% packet loss. Reach into narrow acrylic tunnel. Show arm lagging behind target and candidate hunting.
- **Voiceover:**
  > "In Scenario 3, operators extract a specimen from a narrow 15-centimeter tunnel with a strict 5-wall-contact budget. By pressing F2, instructors inject up to 500 milliseconds of latency or replay real congested cellular traces. Notice the severe visual lag and oscillatory hunting induced by latency."

### E. Multi-Factor Assessment Engine [1:35 – 1:50]
- **Visual:** Complete run. Assessment results modal pops up displaying Grade A/B/C/F, time deductions, collision impacts, jerk index, and JSON download button.
- **Voiceover:**
  > "Upon completion, our multi-factor scoring engine evaluates time against par, collision impacts in Newtons, motion jerk index, and grip integrity, outputting a standardized 0-to-100 rubric grade."

---

## [1:50 – 2:30] Empirical Results & Statistical Findings (40s)

- **Visual:** Full-screen presentation of the 4 generated publication charts (`score_vs_delay.png`, `time_vs_delay.png`, `collisions_vs_delay.png`, and `jerk_vs_delay.png`).
- **Voiceover:**
  > "We tested 60 volunteer operator trials across six latency conditions. Our automated Python analysis suite revealed three critical empirical findings:
  > First, 200 milliseconds represents the critical breakdown threshold. Beyond 200 ms, operator scores collapse from 95 to below passing grade (Welch's t = 8.71, p < 0.001, Cohen's d = 3.90).
  > Second, completion times exhibit exponential inflation, rising by over 3.2 times at 500 milliseconds as operators adopt a move-and-wait strategy.
  > Third, delayed feedback directly causes involuntary corrective jerks, increasing obstacle collision rates by 460%."

---

## [2:30 – 2:50] Key Learnings & Engineering Conclusion (20s)

- **Visual:** Show offline 1-click execution (`start_windows.bat`), GitHub repository, and live web demo.
- **Voiceover:**
  > "Through ManipTrain, we learned that DLS singularity damping is essential for stable teleoperation near kinematic limits, and that 60 Hz motion jerk profiling objectively quantifies human hesitation. With zero-install offline packaging and full WebXR VR readiness, ManipTrain brings accessible, high-fidelity teleoperation assessment to military training commands."

---

## [2:50] End Screen
- **Visual:** Title card: *ManipTrain – Delayed-Teleoperation Simulator* | GitHub: github.com/Thanvik931/ManipTrain | Live Demo Link.
