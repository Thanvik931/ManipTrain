# Third-Party Licenses, Resources, and Credits

ManipTrain is built upon open-source software, official robotics specifications, mathematical algorithms, and community resources.

---

## 1. 3D Graphics & Simulation Framework
- **Three.js Engine**
  - **Author:** Ricardo Cabello (mrdoob) and the Three.js contributors
  - **Repository:** [mrdoob/three.js](https://github.com/mrdoob/three.js)
  - **License:** MIT License
  - **Modules Utilized:**
    - `THREE.WebGLRenderer`, `THREE.Scene`, `THREE.PerspectiveCamera`
    - `OrbitControls` (`three/examples/jsm/controls/OrbitControls.js`)
    - `TransformControls` (`three/examples/jsm/controls/TransformControls.js`)
    - `VRButton` (`three/examples/jsm/webxr/VRButton.js`)
    - `Stats.js` (`three/examples/jsm/libs/stats.module.js`, MIT License)

- **urdf-loader**
  - **Author:** Garrett Johnson
  - **Repository:** [gkjohnson/urdf-loaders](https://github.com/gkjohnson/urdf-loaders)
  - **License:** Apache License 2.0
  - **Role:** Parses URDF XML robot kinematics definitions and attaches Collada visual meshes.

- **Vite Frontend Tooling**
  - **Author:** Evan You and Vite Core Team
  - **Repository:** [vitejs/vite](https://github.com/vitejs/vite)
  - **License:** MIT License

---

## 2. Robotics Assets & Description
- **Universal Robots UR5 Robot Description & CAD Meshes**
  - **Source:** [ros-industrial/universal_robot](https://github.com/ros-industrial/universal_robot)
  - **URDF Kinematic Tree:** BSD-3-Clause License (ROS-Industrial Consortium)
  - **CAD Visual Meshes (`.dae`):** Provided by Universal Robots A/S under the Universal Robots "Terms and Conditions for use of Graphical Documentation" for simulation, education, and research purposes.
  - **Original Meshes:** `base.dae`, `shoulder.dae`, `upperarm.dae`, `forearm.dae`, `wrist1.dae`, `wrist2.dae`, `wrist3.dae`.

---

## 3. Mathematical Foundations & Kinematics References
- **Universal Robots UR5 Kinematic Calibration & DH Parameters**
  - **Reference:** Hawkins, K. P. (2013). *Analytic Inverse Kinematics for the Universal Robots UR-5/UR-10 Arms*. Georgia Institute of Technology.
  - **Application:** Exact link offset vectors, joint rotation axes, and forward kinematics transformation chain validation.

- **Cyclic Coordinate Descent (CCD) Algorithm**
  - **Reference:** Wang, L.-C. T., & Chen, C. C. (1991). *A combined optimization method for solving the inverse kinematics problems of mechanical manipulators*. IEEE Transactions on Robotics and Automation.
  - **Application:** Link-by-link heuristic inverse kinematics solver for intuitive target chasing.

- **Damped Least Squares (DLS) & Singularity Robust Inverse Kinematics**
  - **Reference:** Wampler, C. W. (1986). *Manipulator inverse kinematic solutions based on vector formulations and damped least-squares methods*. IEEE Transactions on Systems, Man, and Cybernetics.
  - **Reference:** Nakamura, Y., & Hanafusa, H. (1986). *Inverse kinematic solutions with singularity robustness for robot manipulator control*. ASME Journal of Dynamic Systems, Measurement, and Control.
  - **Application:** Multi-joint simultaneous Jacobian inversion with Levenberg-Marquardt damping ($\lambda^2 I$) to prevent velocity explosion near workspace singularities.

---

## 4. Scientific Verification & Analysis
- **NumPy**
  - **Author:** NumPy Developers
  - **Website:** [numpy.org](https://numpy.org)
  - **License:** BSD-3-Clause License
  - **Role:** Independent ground-truth forward kinematics recalculation and numerical cross-validation.

- **Matplotlib**
  - **Author:** Matplotlib Development Team
  - **Website:** [matplotlib.org](https://matplotlib.org)
  - **License:** PSF License / Matplotlib License
  - **Role:** Automated visualization of 50-target position error distribution histograms and tracking charts.

---

## 5. WebXR Standards
- **W3C WebXR Device API Specification**
  - **Specification:** [W3C WebXR Device API](https://www.w3.org/TR/webxr/)
  - **Role:** Immersive virtual reality session management, head tracking, and 6-DOF handheld controller teleoperation in modern web browsers.

---

## 6. Project Context & Attribution
- **ManipTrain Project:** Browser-based delayed-teleoperation training platform developed for explosive ordnance disposal (EOD) and robotic manipulator simulation.
- **Institutional Context:** Developed following training guidelines inspired by HQ Army Training Command and MCEME simulation objectives.
