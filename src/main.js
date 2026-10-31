// src/main.js
// Task 14: Scenario S2 suspect-object EOD & S1 switcher with raycast click-to-reach.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import URDFLoader from 'urdf-loader';
import { setupJointSliders, updateSlidersFromRobot, updateIKHUD, logCollisionEvent, logGripperEvent } from './ui/jointSliders.js';
import { setupOperatorControls, createGripperHUD } from './ui/operatorControls.js';
import { solveCCD } from './kinematics/ik_ccd.js';
import { solveDLS } from './kinematics/ik_dls.js';
import { createEnvironmentObstacles, initSafeAngles, checkCollisions } from './physics/collisionDetector.js';
import { attachGripper, updateGrip, syncHeldObject, updateGravity, getGraspableObjects } from './physics/gripper.js';
import { initScenarioS1, recordS1Bump, updateS1 } from './scenarios/s1_pick_place.js';
import { initScenarioS2, recordS2Bump, updateS2 } from './scenarios/s2_suspect_object.js';

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

// 3. Stats & OrbitControls
const stats = new Stats();
Object.assign(stats.dom.style, { position: 'fixed', top: 'auto', bottom: '16px', left: '16px', zIndex: '100' });
document.body.appendChild(stats.dom);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.05;
orbit.target.set(0, 0.4, 0);

// 4. Lighting & Floor
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

// 5. Obstacles & Scenario System
createEnvironmentObstacles(scene);
let currentScenario = 'S2';

export function switchScenario(type) {
  currentScenario = type;
  if (type === 'S1') initScenarioS1(scene, (r) => console.log('S1:', r));
  else initScenarioS2(scene, (r) => console.log('S2:', r));
  const sub = document.querySelector('#overlay-info p');
  if (sub) {
    sub.innerHTML = `Mode: <b>${type}</b> | ⌨️ WASD/QE Move | Space Grip | <i>Click object in 3D to reach</i>`;
  }
}

// 6. Target Sphere & TransformControls
const targetGeo = new THREE.SphereGeometry(0.022, 24, 24);
const targetMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, roughness: 0.3 });
const targetSphere = new THREE.Mesh(targetGeo, targetMat);
scene.add(targetSphere);

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.6;
transformControls.attach(targetSphere);
scene.add(transformControls);
transformControls.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; });

// 7. Robot Loading & IK Solvers
let robotArm = null;
let eeLink = null;
let activeSolver = 'CCD';
const loader = new URDFLoader();

loader.load('/models/ur5/ur5.urdf', (robot) => {
  robotArm = robot;
  robot.rotation.x = -Math.PI / 2;
  scene.add(robot);
  robot.updateMatrixWorld(true);

  eeLink = robot.links['ee_link'] || robot.links['wrist_3_link'];
  attachGripper(eeLink);
  initSafeAngles(robot);

  switchScenario('S2');
  syncTargetToWrist();
  setupJointSliders(robot, null, () => onManualSlider(), () => resetHome(), (m) => {
    activeSolver = m;
    runActiveIK();
  });
  createGripperHUD((f) => updateGrip(f, (evt) => logGripperEvent(evt)));
});

function syncTargetToWrist() {
  if (!robotArm || !eeLink) return;
  robotArm.updateMatrixWorld(true);
  eeLink.getWorldPosition(targetSphere.position);
  updateIKHUD(targetSphere.position, 0.0, 0, true);
}

function resetHome() {
  if (!robotArm || !eeLink) return;
  initSafeAngles(robotArm);
  robotArm.updateMatrixWorld(true);
  eeLink.getWorldPosition(targetSphere.position);
  updateIKHUD(targetSphere.position, 0.0, 0, true);
}

function handleCollision(evt) {
  logCollisionEvent(evt);
  if (currentScenario === 'S1') recordS1Bump();
  else recordS2Bump();
}

function onManualSlider() {
  if (!robotArm) return;
  const col = checkCollisions(robotArm, (e) => handleCollision(e));
  if (col.collided) updateSlidersFromRobot(robotArm);
  syncTargetToWrist();
}

function runActiveIK() {
  if (!robotArm) return;
  const opts = activeSolver === 'DLS'
    ? { maxIterations: 12, toleranceMeters: 0.002, lambda: 0.04 }
    : { maxIterations: 12, toleranceMeters: 0.005 };
  const res = activeSolver === 'DLS' ? solveDLS(robotArm, targetSphere.position, opts) : solveCCD(robotArm, targetSphere.position, opts);

  const col = checkCollisions(robotArm, (e) => handleCollision(e));
  if (col.collided) syncTargetToWrist();
  updateSlidersFromRobot(robotArm);
  updateIKHUD(targetSphere.position, res.finalDistanceMm, res.iterations, res.reached);
}

transformControls.addEventListener('change', () => runActiveIK());

// 8. Operator Controls & Raycast Object Click-to-Reach
const operator = setupOperatorControls({
  scene,
  renderer,
  targetSphere,
  onTargetMoved: () => runActiveIK(),
  onGripChanged: (f) => updateGrip(f, (evt) => logGripperEvent(evt))
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button !== 0 || transformControls.dragging) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const meshes = getGraspableObjects().map((g) => g.mesh);
  const hits = raycaster.intersectObjects(meshes, true);
  if (hits.length > 0) {
    hits[0].object.getWorldPosition(targetSphere.position);
    targetSphere.position.y += 0.035;
    runActiveIK();
  }
});

// 9. Resize & WebXR Render Loop
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  stats.begin();
  if (operator) operator.updateXR();
  syncHeldObject();
  updateGravity(0.016);
  if (currentScenario === 'S1') updateS1();
  else updateS2();
  orbit.update();
  renderer.render(scene, camera);
  stats.end();
});
