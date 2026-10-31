// src/main.js
// Task 11: Simplified link AABB collisions, obstacles, and impact logging.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import URDFLoader from 'urdf-loader';
import {
  setupJointSliders,
  updateSlidersFromRobot,
  updateIKHUD,
  logCollisionEvent
} from './ui/jointSliders.js';
import { setupOperatorControls } from './ui/operatorControls.js';
import { solveCCD } from './kinematics/ik_ccd.js';
import { solveDLS } from './kinematics/ik_dls.js';
import {
  createEnvironmentObstacles,
  initSafeAngles,
  checkCollisions
} from './physics/collisionDetector.js';

// 1. Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e28);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(1.5, 1.2, 1.8);

// 2. WebGL Renderer with WebXR
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.xr.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// 3. Stats.js Performance Monitor (bottom-left corner to avoid title overlap)
const stats = new Stats();
stats.dom.style.position = 'fixed';
stats.dom.style.top = 'auto';
stats.dom.style.bottom = '16px';
stats.dom.style.left = '16px';
stats.dom.style.zIndex = '100';
document.body.appendChild(stats.dom);

// 4. OrbitControls
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.05;
orbitControls.target.set(0, 0.4, 0);

// 5. Lights & Floor
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

// 6. Obstacles (Work Table, Legs, Safety Shield, Floor)
createEnvironmentObstacles(scene);

// 7. Target Sphere & TransformControls
const targetGeo = new THREE.SphereGeometry(0.022, 24, 24);
const targetMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, roughness: 0.3 });
const targetSphere = new THREE.Mesh(targetGeo, targetMat);
scene.add(targetSphere);

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.6;
transformControls.attach(targetSphere);
scene.add(transformControls);

transformControls.addEventListener('dragging-changed', (e) => {
  orbitControls.enabled = !e.value;
});

// 8. Robot Loading & Bidirectional Sync
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
  initSafeAngles(robot);

  syncTargetToWrist();
  setupJointSliders(
    robot,
    null,
    () => onManualSliderMove(),
    () => resetToHome(),
    (mode) => {
      activeSolver = mode;
      runActiveIKSolver();
    }
  );

  const overlaySub = document.querySelector('#overlay-info p');
  if (overlaySub) overlaySub.textContent = 'Task 11: Simplified Collisions & Impact Logging';
  console.log('%c🎯 ManipTrain: Obstacles & collision detection active.', 'color: #f97316; font-weight: bold;');
});

function syncTargetToWrist() {
  if (!robotArm || !eeLink) return;
  robotArm.updateMatrixWorld(true);
  eeLink.getWorldPosition(targetSphere.position);
  updateIKHUD(targetSphere.position, 0.0, 0, true);
}

function resetToHome() {
  if (!robotArm || !eeLink) return;
  initSafeAngles(robotArm);
  robotArm.updateMatrixWorld(true);
  eeLink.getWorldPosition(targetSphere.position);
  updateIKHUD(targetSphere.position, 0.0, 0, true);
}

function onManualSliderMove() {
  if (!robotArm) return;
  const col = checkCollisions(robotArm, (event) => {
    logCollisionEvent(event);
  });
  if (col.collided) {
    updateSlidersFromRobot(robotArm);
  }
  syncTargetToWrist();
}

function runActiveIKSolver() {
  if (!robotArm) return;
  let result;
  if (activeSolver === 'DLS') {
    result = solveDLS(robotArm, targetSphere.position, { maxIterations: 25, toleranceMeters: 0.001, lambda: 0.04 });
  } else {
    result = solveCCD(robotArm, targetSphere.position, { maxIterations: 20, toleranceMeters: 0.005 });
  }

  // Check collision for the newly computed posture
  const col = checkCollisions(robotArm, (event) => {
    logCollisionEvent(event);
  });

  if (col.collided) {
    syncTargetToWrist();
  }

  updateSlidersFromRobot(robotArm);
  updateIKHUD(targetSphere.position, result.finalDistanceMm, result.iterations, result.reached);
}

transformControls.addEventListener('change', () => runActiveIKSolver());

// 9. Operator Controls (Keyboard & WebXR Controller)
const operator = setupOperatorControls({
  scene,
  renderer,
  targetSphere,
  onTargetMoved: () => runActiveIKSolver(),
  onGripChanged: (closed) => console.log(`[Operator] Gripper ${closed ? 'CLOSED' : 'OPEN'}`)
});

// 10. WebXR Render Loop
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  stats.begin();
  if (operator) operator.updateXR();
  orbitControls.update();
  renderer.render(scene, camera);
  stats.end();
});
