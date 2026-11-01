// src/main.js
// Task 16: Delayed teleoperation with 0-500ms delay buffer, mobile traces, packet loss & instructor panel.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import URDFLoader from 'urdf-loader';
import { setupJointSliders, updateSlidersFromRobot, updateIKHUD, logCollisionEvent, logGripperEvent } from './ui/jointSliders.js';
import { setupOperatorControls, createGripperHUD } from './ui/operatorControls.js';
import { setupInstructorPanel } from './ui/instructorPanel.js';
import { pushDelayedTarget, pushDelayedGrip, updateDelayBuffer, resetDelayBuffer } from './network/delayBuffer.js';
import { sampleTrajectory, recordAssessmentCollision, recordAssessmentGrip } from './assessment/assessmentLogger.js';
import { solveCCD } from './kinematics/ik_ccd.js';
import { solveDLS } from './kinematics/ik_dls.js';
import { createEnvironmentObstacles, initSafeAngles, checkCollisions, setScenarioObstacles } from './physics/collisionDetector.js';
import { attachGripper, updateGrip, syncHeldObject, updateGravity, getGraspableObjects } from './physics/gripper.js';
import { initScenarioS1, recordS1Bump, updateS1 } from './scenarios/s1_pick_place.js';
import { initScenarioS2, recordS2Bump, updateS2 } from './scenarios/s2_suspect_object.js';
import { initScenarioS3, recordS3Bump, updateS3, getS3Obstacles } from './scenarios/s3_confined_space.js';

// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e28);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(1.5, 1.2, 1.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

const stats = new Stats();
Object.assign(stats.dom.style, { position: 'fixed', top: 'auto', bottom: '16px', left: '16px', zIndex: '100' });
document.body.appendChild(stats.dom);
const orbit = new OrbitControls(camera, renderer.domElement);
Object.assign(orbit, { enableDamping: true, dampingFactor: 0.05 });
orbit.target.set(0, 0.4, 0);

// 2. Lighting, Floor & Obstacles
const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(3, 5, 3);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x14141c }));
floor.rotation.x = -Math.PI / 2;
scene.add(new THREE.AmbientLight(0xffffff, 0.8), keyLight, new THREE.DirectionalLight(0x88bbff, 0.8), floor, new THREE.GridHelper(10, 20, 0x3b82f6, 0x27273a));
createEnvironmentObstacles(scene);

// 3. Scenario Switching System
let currentScenario = 'S3';
export function switchScenario(type) {
  currentScenario = type;
  if (type === 'S1') { initScenarioS1(scene, (r) => console.log('S1:', r)); setScenarioObstacles([]); }
  else if (type === 'S2') { initScenarioS2(scene, (r) => console.log('S2:', r)); setScenarioObstacles([]); }
  else { initScenarioS3(scene, (r) => console.log('S3:', r)); setScenarioObstacles(getS3Obstacles()); }
  const sub = document.querySelector('#overlay-info p');
  if (sub) sub.innerHTML = `Mode: <b>${type}</b> | ⌨️ WASD/QE Move | Space Grip | <i>F2 / ~: Instructor Panel</i>`;
}

function mountScenarioButtons() {
  const overlay = document.getElementById('overlay-info');
  const bar = document.createElement('div');
  bar.id = 'scenario-switcher';
  bar.innerHTML = `<button id="b-s1" class="scen-btn">S1: Pick & Place</button><button id="b-s2" class="scen-btn">S2: Suspect EOD</button><button id="b-s3" class="scen-btn active">S3: Confined Space</button>`;
  (overlay || document.body).appendChild(bar);
  ['S1', 'S2', 'S3'].forEach((name) => {
    bar.querySelector(`#b-${name.toLowerCase()}`).onclick = (e) => {
      bar.querySelectorAll('.scen-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');
      switchScenario(name);
      syncTargetToWrist();
    };
  });
}

// 4. Target & TransformControls
const targetSphere = new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 24), new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x7c2d12, roughness: 0.3 }));
scene.add(targetSphere);

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.size = 0.6;
transformControls.attach(targetSphere);
scene.add(transformControls);
transformControls.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; });
transformControls.addEventListener('change', () => pushDelayedTarget(targetSphere.position));

// 5. Robot Loading & IK
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

  mountScenarioButtons();
  setupInstructorPanel(() => resetDelayBuffer(targetSphere.position));
  switchScenario('S3');
  syncTargetToWrist();

  setupJointSliders(robot, null, () => onManualSlider(), () => resetHome(), (m) => { activeSolver = m; runActiveIK(targetSphere.position); });
  createGripperHUD((f) => pushDelayedGrip(f));
});

function syncTargetToWrist() {
  if (!robotArm || !eeLink) return;
  robotArm.updateMatrixWorld(true);
  eeLink.getWorldPosition(targetSphere.position);
  resetDelayBuffer(targetSphere.position);
  updateIKHUD(targetSphere.position, 0.0, 0, true);
}

function resetHome() {
  if (robotArm) initSafeAngles(robotArm);
  syncTargetToWrist();
}

function handleCollision(evt) {
  logCollisionEvent(evt);
  recordAssessmentCollision(evt);
  if (currentScenario === 'S1') recordS1Bump();
  else if (currentScenario === 'S2') recordS2Bump();
  else recordS3Bump();
}

function onManualSlider() {
  if (!robotArm) return;
  const col = checkCollisions(robotArm, (e) => handleCollision(e));
  if (col.collided) updateSlidersFromRobot(robotArm);
  syncTargetToWrist();
}

function runActiveIK(targetPos = targetSphere.position) {
  if (!robotArm) return;
  const opts = activeSolver === 'DLS' ? { maxIterations: 12, toleranceMeters: 0.002, lambda: 0.04 } : { maxIterations: 12, toleranceMeters: 0.005 };
  const res = activeSolver === 'DLS' ? solveDLS(robotArm, targetPos, opts) : solveCCD(robotArm, targetPos, opts);
  if (checkCollisions(robotArm, (e) => handleCollision(e)).collided) syncTargetToWrist();
  updateSlidersFromRobot(robotArm);
  updateIKHUD(targetPos, res.finalDistanceMm, res.iterations, res.reached);
}

// 6. Operator Controls & Raycast Click
const operator = setupOperatorControls({
  scene,
  renderer,
  targetSphere,
  onTargetMoved: () => pushDelayedTarget(targetSphere.position),
  onGripChanged: (f) => pushDelayedGrip(f)
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
renderer.domElement.addEventListener('pointerup', (e) => {
  if (e.button !== 0 || transformControls.dragging) return;
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(getGraspableObjects().map((g) => g.mesh), true);
  if (hits.length > 0) {
    hits[0].object.getWorldPosition(targetSphere.position);
    targetSphere.position.y += 0.035;
    pushDelayedTarget(targetSphere.position);
  }
});

// 7. WebXR Render Loop
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const tempEePos = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  stats.begin();
  if (operator) operator.updateXR();
  if (eeLink) { eeLink.getWorldPosition(tempEePos); sampleTrajectory(tempEePos); }
  updateDelayBuffer(
    (pos) => runActiveIK(pos),
    (force) => updateGrip(force, (evt) => { logGripperEvent(evt); recordAssessmentGrip(evt.type); })
  );
  syncHeldObject();
  updateGravity(0.016);
  if (currentScenario === 'S1') updateS1();
  else if (currentScenario === 'S2') updateS2();
  else updateS3();
  orbit.update();
  renderer.render(scene, camera);
  stats.end();
});
