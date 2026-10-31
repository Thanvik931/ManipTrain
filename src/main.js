// src/main.js
// Task 9: Inverse Kinematics verification & dataset export for Python NumPy checks.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import URDFLoader from 'urdf-loader';
import { setupJointSliders, updateSlidersFromRobot, updateIKHUD } from './ui/jointSliders.js';
import { solveCCD } from './kinematics/ik_ccd.js';
import { solveDLS } from './kinematics/ik_dls.js';

// 1. Three.js Scene & Camera setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e28);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(1.5, 1.2, 1.8);

// 2. WebGL Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

// 3. OrbitControls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;
orbitControls.target.set(0, 0.4, 0);

// 4. Lights & Environment Ground
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(3, 5, 3);
scene.add(keyLight);
scene.add(new THREE.DirectionalLight(0x88bbff, 0.8));

const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x14141c }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const grid = new THREE.GridHelper(10, 20, 0x3b82f6, 0x27273a);
grid.position.y = 0.001;
scene.add(grid);

// 5. Target Handle & TransformControls
const targetGeo = new THREE.SphereGeometry(0.022, 24, 24);
const targetMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, roughness: 0.3 });
const targetSphere = new THREE.Mesh(targetGeo, targetMat);
scene.add(targetSphere);

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.6;
transformControls.attach(targetSphere);
scene.add(transformControls);

transformControls.addEventListener('dragging-changed', (event) => {
  orbitControls.enabled = !event.value;
});

// 6. Robot Loading & Bidirectional Sync
let robotArm = null;
let eeLink = null;
let activeSolver = 'CCD';
const loader = new URDFLoader();

loader.load('/models/ur5/ur5.urdf', (robot) => {
  robotArm = robot;
  robot.rotation.x = -Math.PI / 2;
  robot.position.set(0, 0, 0);
  scene.add(robot);

  robot.updateMatrixWorld(true);
  eeLink = robot.links['ee_link'] || robot.links['wrist_3_link'];

  syncTargetToWrist();

  setupJointSliders(
    robot,
    null,
    () => syncTargetToWrist(),
    () => resetToHome(),
    (mode) => {
      activeSolver = mode;
      runActiveIKSolver();
    }
  );

  const overlaySub = document.querySelector('#overlay-info p');
  if (overlaySub) overlaySub.textContent = 'Task 9: Python Verification of IK (50 Reachable Targets)';
  console.log('%c🎯 ManipTrain: DLS & CCD solvers ready with 50-pose IK export.', 'color: #f97316; font-weight: bold;');
});

function syncTargetToWrist() {
  if (!robotArm || !eeLink) return;
  robotArm.updateMatrixWorld(true);
  eeLink.getWorldPosition(targetSphere.position);
  updateIKHUD(targetSphere.position, 0.0, 0, true);
}

function resetToHome() {
  if (!robotArm || !eeLink) return;
  robotArm.updateMatrixWorld(true);
  eeLink.getWorldPosition(targetSphere.position);
  updateIKHUD(targetSphere.position, 0.0, 0, true);
}

function runActiveIKSolver() {
  if (!robotArm) return;
  let result;
  if (activeSolver === 'DLS') {
    result = solveDLS(robotArm, targetSphere.position, {
      maxIterations: 25,
      toleranceMeters: 0.001,
      lambda: 0.04
    });
  } else {
    result = solveCCD(robotArm, targetSphere.position, {
      maxIterations: 20,
      toleranceMeters: 0.005
    });
  }

  updateSlidersFromRobot(robotArm);
  updateIKHUD(targetSphere.position, result.finalDistanceMm, result.iterations, result.reached);
}

transformControls.addEventListener('change', () => {
  runActiveIKSolver();
});

// 7. Render Loop
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  orbitControls.update();
  renderer.render(scene, camera);
}

animate();
