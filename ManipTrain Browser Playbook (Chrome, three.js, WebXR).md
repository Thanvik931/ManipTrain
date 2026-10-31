# ManipTrain Browser Playbook (Chrome, three.js, WebXR): Antigravity, One Task at a Time

**This replaces the Unity playbook.** The product, experiment and scoring from the PRD stay the same. Only the platform changes: it runs in **Chrome**, needs no install, and can be shared as a live link.\
**Goal:** finished, demo-ready ManipTrain by **18 Nov 2026**; apply before 20 Nov.

## 0. What changes, and what to be honest about

1. **Stack (all free):** Vite + JavaScript, three.js (3D), the urdf-loader library (loads a real robot description), WebXR (VR in the browser), Python + numpy (checks and charts), GitHub, Vercel (hosting). You already know GitHub and Vercel.
2. **No headset needed.** In Chrome you can use a WebXR emulator extension (search the Chrome Web Store for "Immersive Web Emulator"; check it is current) and a mouse/keyboard fallback.
3. **Physics is simplified.** Collisions use bounding boxes and grasping uses simple rules (hold, slip, crush), not a full rigid-body engine. Say this clearly in your design document and in the interview; it is a prototype.
4. **Match to the posting:** they list Unity or Unreal. A browser/WebXR build proves the same skills (kinematics, VR, real-time simulation), but write "three.js / WebXR" on your resume. Do **not** write Unity unless you actually use it. If you finish early, a short Unity tutorial is worth doing and you can say "learning Unity" truthfully.
5. **They asked for an "executable".** Task 19 includes packaging a downloadable offline version in addition to the live link.
6. **There is no AI model to train.** "Real data" is: a real open-source robot description, real network delay traces you measure, and real operator data from volunteers.
7. **You must be able to explain the kinematics.** In Tasks 5, 7 and 8 you write the maths; Antigravity gives hints and skeletons.

## 1. Master prompt (paste into Antigravity at the start of every session)

```
You are my patient coding teacher and pair programmer for a browser project called ManipTrain: a WebXR/three.js simulator for a 6-DOF robotic arm with a communication-delay mode and an automated assessment module.

RULES YOU MUST FOLLOW:
1. Do ONE task at a time. Only the task I name. Do not touch other files or add extra features.
2. Before writing any code, explain the task to me like I am 5 years old: a short story or toy example, no jargon. Then list every new word with a one-line meaning.
3. Then give a short plan: which files you will create or change.
4. Write the code in small, readable pieces with comments explaining WHY. Keep it simple: plain JavaScript (ES modules), no clever tricks, no extra frameworks.
5. After the code, give me a VERIFICATION CHECKLIST: exact steps to run it in Chrome and exactly what I should see. Wait for me to reply 'verified' or paste my errors.
6. If I report an error, fix only that error. Do not refactor unrelated code.
7. Do NOT move to the next task until I say 'verified, next task'.
8. For tasks marked STUDENT-WRITES-MATH (forward kinematics, CCD IK, damped-least-squares IK): do not give me the full solution first. Give hints, the formulas explained simply, and a code skeleton with TODOs. Only give the full solution if I say 'show full solution' after I have tried.
9. After each task, give me a one-line git commit message and a 3-bullet summary I can say out loud in an interview.
10. Keep docs/PROGRESS.md and append one line per finished task with the date.

Project facts: Vite + JavaScript, three.js, urdf-loader with an open-source UR-class 6-DOF arm description, WebXR with a mouse/keyboard fallback, Python numpy for reference checks, scenarios S1 pick-and-place, S2 suspect-object handling, S3 confined space, delay 0-500 ms plus replay of real ping traces, JSON run logs, hosted on Vercel.

Acknowledge these rules in two lines and wait for my first task.
```

(If Antigravity has a workspace rules area, save the same text there. Menus change, so check it.)

## 2. Daily routine (15 minutes)

- Paste the master prompt, then the task prompt.
- Run the checklist, commit to GitHub, add one line to `docs/PROGRESS.md`.
- Take one screenshot or short recording per finished task for the video and report.
- Stuck for more than 90 minutes? Send me the error text and what you tried.

## 3. The tasks

Each task has **Kid explanation**, **Ask Antigravity** (copy and paste) and **Verify** (all must pass).

### Task 1: Project setup, GitHub and live link

**Kid explanation:** We make a toy box with labelled drawers, and we put a window on it so anyone can look inside from the internet.

**Ask Antigravity:** "Task 1. Create a Vite JavaScript project named maniptrain. Folders: src/kinematics, src/physics, src/scenarios, src/assessment, src/ui, public/models, python, docs. Install three. Show a rotating cube. Add .gitignore, README, and explain how to push to GitHub and deploy to Vercel."

**Verify:** `npm run dev` shows a spinning cube in Chrome; repo on GitHub; Vercel link shows the same cube.

### Task 2: Load the robot arm

**Kid explanation:** We borrow a real robot's body from a robotics library, so our arm has real lengths and joints.

**Ask Antigravity:** "Task 2. Add the urdf-loader library and load an open-source UR-class arm description (URDF with meshes) into the scene with lights, a floor and OrbitControls. Put the licence in docs/CREDITS.md. List the 6 movable joints in the console. No other features."

**Verify:** the arm is visible and you can rotate the camera; the console lists 6 joints with names; CREDITS.md exists; Vercel link still works.

### Task 3: Move joints with sliders

**Kid explanation:** A puppet with six strings. Each slider pulls one string.

**Ask Antigravity:** "Task 3. Add 6 HTML sliders, one per joint, that set the joint angle, with the current angle in degrees shown beside each slider."

**Verify:** each slider moves exactly one joint; displayed angles match what you see.

### Task 4: Joint limits

**Kid explanation:** Your elbow cannot bend backwards. Each joint has a stop, like a door hitting the wall.

**Ask Antigravity:** "Task 4. Create a joint-limits JSON file as the single source of limits. Clamp every joint to it, flash that joint's label red when a limit is hit, and log each hit with a timestamp."

**Verify:** dragging past the limit stops the joint and flashes red; the log shows hits; editing the JSON changes the limit.

### Task 5: Forward kinematics (STUDENT-WRITES-MATH)

**Kid explanation:** If you know how much each arm bone is bent, you can say where the fingertip is. It is just adding up the bends.

**Ask Antigravity:** "Task 5, STUDENT-WRITES-MATH. Teach me forward kinematics with a 2-joint flat arm (links of length 1), then the 6-joint version using transformation matrices. Give me hints and a skeleton in src/kinematics/fk.js. I will write the maths. Then compare my gripper position to the end-effector's world position from three.js."

**Verify:** you solve the 2-joint cases by hand; your FK matches three.js within 1 mm for 5 slider poses; you can explain it in three sentences.

### Task 6: Python check of FK

**Kid explanation:** To check homework we ask a second, different calculator.

**Ask Antigravity:** "Task 6. Add a button that downloads a CSV of joint angles and my computed gripper positions. Write python/check\_fk.py (numpy) that recomputes FK from the angles and prints the difference."

**Verify:** maximum difference over 20 poses is under 1 mm; the README has the one command to run it.

### Task 7: Inverse kinematics with CCD (STUDENT-WRITES-MATH)

**Kid explanation:** You want to touch a cookie. You wiggle your wrist, then elbow, then shoulder, again and again until your finger touches it.

**Ask Antigravity:** "Task 7, STUDENT-WRITES-MATH. Explain CCD IK with the 2-joint arm first. Give me a skeleton in src/kinematics/ik\_ccd.js and hints; I will write it. Add a draggable target sphere (TransformControls) that the gripper chases. Show the iteration count on screen."

**Verify:** the gripper reaches reachable targets within 5 mm; unreachable targets stop cleanly without spinning.

### Task 8: Damped least squares IK (STUDENT-WRITES-MATH)

**Kid explanation:** Instead of guessing by wiggling, we ask "if I nudge each joint a tiny bit, how far does my finger move?" and pick smart nudges. The "damped" part stops the arm going crazy when it is almost straight.

**Ask Antigravity:** "Task 8, STUDENT-WRITES-MATH. Explain the Jacobian (estimated by tiny finite changes of each joint) and damped least squares with a 2-joint example. Give a skeleton in src/kinematics/ik\_dls.js; I will write it. Keep CCD and add a toggle between the two."

**Verify:** smoother than CCD; no jitter near a stretched arm; error under 1 mm for reachable targets; you can explain why damping is needed.

### Task 9: Python check of IK

**Kid explanation:** We ask the second calculator again, this time to check the answers our arm found.

**Ask Antigravity:** "Task 9. Add a button that runs my IK on 50 random reachable targets and downloads a CSV (target, found angles). Write python/check\_ik.py that runs FK on the angles, reports position errors, and saves a chart."

**Verify:** mean error under 1 mm; chart saved in python/results; you can say the worst case and why.

### Task 10: Operator controls (mouse, keyboard, WebXR)

**Kid explanation:** The operator holds a magic wand. Where the wand goes, the arm's hand tries to go.

**Ask Antigravity:** "Task 10. Make the target follow mouse/TransformControls on desktop, and the right controller pose when in WebXR (add an Enter VR button). Add keys for grip close/open. Add stats.js to show frame rate."

**Verify:** the arm follows your input in Chrome; with the WebXR emulator the arm follows the virtual controller; frame rate is 60 FPS or higher.

### Task 11: Collisions (simplified)

**Kid explanation:** Things are solid. If the arm bumps the table, it must stop and we write down "oops".

**Ask Antigravity:** "Task 11. Add a table and walls. For each arm link compute a bounding box and test it against obstacles. When a move would cause a collision, revert to the last safe angles, flash red, and log time, link and an impact strength based on speed. Explain the simplification in comments."

**Verify:** the arm never passes through the table; every bump creates a log entry; fast bumps log stronger impacts than slow ones.

### Task 12: Gripper and grasping (simplified rules)

**Kid explanation:** Holding an egg needs a gentle hand: too soft and it falls, too hard and it breaks.

**Ask Antigravity:** "Task 12. Add a simple two-finger gripper to the arm's end. Add a cube and a fragile object. Grip force goes 0 to 100 percent. Below a minimum force the object slips and falls; above a maximum the fragile object is marked crushed; in between it is held and moves with the gripper. When released it falls to the table with simple gravity. Log drops and crushes."

**Verify:** you can lift and place the cube; you can crush and drop the fragile object on purpose; events are logged.

### Task 13: Scenario S1, pick-and-place

**Kid explanation:** A tidy-up game: put three blocks into three coloured boxes.

**Ask Antigravity:** "Task 13. Create a ScenarioManager (start, reset, end) and scenario S1: 3 blocks, 3 target zones, a timer, win when all placed, fail on timeout, plus a result screen."

**Verify:** S1 can be won; reset works; timer and result values are correct.

### Task 14: Scenario S2, suspect-object handling

**Kid explanation:** Carry a full glass of water without spilling. Tilt too much and you lose.

**Ask Antigravity:** "Task 14. Create S2: lift a tilt-sensitive object and place it in a containment box. If tilt exceeds a threshold the run fails and a plain red screen says 'Failed: tilt limit exceeded' (no graphic content). Log maximum tilt."

**Verify:** a careful run succeeds; a tilted run fails; max tilt appears in the log.

### Task 15: Scenario S3, confined space

**Kid explanation:** Reach into a narrow tunnel without touching the sides.

**Ask Antigravity:** "Task 15. Create S3: a narrow box-shaped structure with an object inside. Retrieve it while keeping wall contacts under a threshold. Count and log contacts."

**Verify:** a slow run succeeds; a rushed run produces contacts and a worse result; counts match what you see.

### Task 16: Delay buffer with real network traces

**Kid explanation:** Shouting across a canyon: your friend hears you a moment late. We make the arm "hear" the operator late.

**Do this yourself first (real data, do it on Day 1):** run `ping` about 500 times to a public server on your phone hotspot, once idle and once while streaming a video. Save each as a CSV of `delay_ms` per packet in python/traces, with date, network and place in the README.

**Ask Antigravity:** "Task 16. Create a DelayBuffer that holds each command and releases it after a delay. Modes: fixed (0, 100, 200, 300, 500 ms) and trace replay from my CSV files. Add optional packet loss percent. Delay setting is hidden from the operator and shown only in an instructor panel."

**Verify:** at 500 ms the arm clearly lags your input; replay mode follows the CSV values (log delay per command to prove it); 0 ms behaves like earlier tasks.

### Task 17: Assessment logger and score

**Kid explanation:** A quiet teacher writing down how fast you were, how many bumps, how smooth.

**Ask Antigravity:** "Task 17. Create an AssessmentLogger that records per run: scenario, delay mode, completion time, collisions with severity, path smoothness (jerk), grip errors, drops, limit hits, outcome. At the end download one JSON file. Compute a 0 to 100 score with documented weights and show a breakdown on the results screen."

**Verify:** each run produces a JSON file with every field; careful and rushed play give clearly different scores; weights are written down for the design document.

### Task 18: Run the experiment and analyze

**Kid explanation:** We let friends try the game under different "echo" levels and see who does better when the echo is big.

**Do this:** 8 to 10 volunteers (classmates, cadets) open the live link, practise 5 minutes, then do one scenario at each delay in randomized order. Use anonymous IDs only. Collect each JSON file.

**Ask Antigravity:** "Task 18. Write python/analyze.py that reads all JSON logs, groups by delay, reports mean and standard deviation of time, collisions and score, a paired comparison against 0 ms, and saves charts and a one-page summary with limitations (small sample, learning effect)."

**Verify:** charts of score and time against delay exist; the summary states at least one concrete finding with numbers; limitations are written honestly.

### Task 19: Documents, offline package and video

**Kid explanation:** A user guide so anyone can play, and a short movie to show how it works.

**Ask Antigravity:** "Task 19. Make a production build and package it as a downloadable zip that runs offline with one simple command or script, with instructions. Generate drafts of the README, design document (architecture, FK/IK, simplified physics, scoring weights, delay modes), user manual, instructor guide, and a demo video script of 3 minutes or less." Then record the video: 20 seconds problem, 90 seconds demo, 40 seconds results chart, 20 seconds what you learned.

**Verify:** a friend can run the offline zip from the README alone; the live link works; the video is under 3 minutes and shows all three scenarios, the delay mode and the results chart.

### Task 20: Resume, profile and application

Send me: GitHub link, live link, video link, key experiment numbers, CodeChef rating and MongoDB certificate date. I will finalize the resume (NCC details, project, certifications). Update your profile links **before** you press apply.

### Task 21 (optional): small model on your own data

Only after Task 20 is safe. With scikit-learn fit a simple regression predicting completion time or score from delay and scenario using your logged runs, with cross-validation and an honest note on sample size. This is the only part involving "training".

## 4. Day-by-day schedule (all tasks)

| Date | Tasks | Done when |
| --- | --- | --- |
| Sun 1 Nov | Task 1, Task 2, Task 3. Also record both ping traces. | Arm moves with sliders on a live Vercel link; traces on GitHub |
| Mon 2 Nov | Task 4, start Task 5 | Limits work; 2-joint FK by hand |
| Tue 3 Nov | Finish Task 5, Task 6 | JS and Python FK agree within 1 mm |
| Wed 4 Nov | Task 7 | CCD reaches targets within 5 mm |
| Thu 5 Nov | Task 8, Task 9 | Smooth IK; mean error under 1 mm |
| Fri 6 Nov | Task 10, Task 11, Task 12 | Arm follows input, stops at table, lifts a cube |
| Sat 7 Nov | Task 13, Task 14, Task 15 | Three scenarios can be finished and failed on purpose |
| Sun 8 Nov | Task 16 | 500 ms lags clearly; replay matches CSV |
| Mon 9 Nov | Task 17 | Careful and rushed runs score differently; JSON saved |
| Tue 10 Nov | Buffer day; recruit 8 to 10 volunteers | Full run of all scenarios without errors |
| Wed 11 to Fri 13 Nov | Task 18 | Volunteer data, charts, one-page summary |
| Sat 14 to Mon 16 Nov | Task 19 | Offline zip, documents, video done |
| Tue 17 Nov | Task 20 prep: resume final, links updated | Links open in a private window |
| Wed 18 Nov | Apply | Submission confirmed |
| Spare time only | Task 21 | Cross-validated result with limits |

**Honest warning:** Week 1 needs 2 to 3 tasks a day, and Tasks 5, 7 and 8 need real thinking. If you are more than a day behind on Wed 4 Nov, use the 10 Nov buffer and move Task 15 to 8 Nov. Never skip a verification step to catch up. If you must cut, cut in this order: Task 21, Task 15 (S3), trace replay (keep fixed delays), then WebXR (keep mouse control).

## 5. Interview readiness

Practise answering out loud:

1. Forward versus inverse kinematics?
2. Why does IK need damping near a stretched arm?
3. How does the delay buffer work and what real data did you use?
4. How is the score computed and why those weights?
5. What is simplified in your physics, and how would you do it properly on real hardware (ROS 2, rigid-body engine, haptics)?
6. What are the limits of your experiment?
