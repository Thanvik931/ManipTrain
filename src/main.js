// src/main.js
// Task 3: Control each of the 6 robot arm joints using interactive UI sliders.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from 'urdf-loader';
import { setupJointSliders } from './ui/jointSliders.js';

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e28);

// 2. Camera Setup
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.05,
  100
);
camera.position.set(1.5, 1.2, 1.8);

// 3. WebGL Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const appContainer = document.getElementById('app');
appContainer.appendChild(renderer.domElement);

// 4. OrbitControls: left-drag rotate, scroll zoom, right-drag pan
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.4, 0);
controls.update();

// 5. Lighting: key, fill, and ambient
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(3, 5, 3);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x88bbff, 0.8);
fillLight.position.set(-3, 3, -3);
scene.add(fillLight);

// 6. Floor & Reference Grid
const floorGeometry = new THREE.PlaneGeometry(10, 10);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x14141c,
  roughness: 0.8,
  metalness: 0.1
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(10, 20, 0x3b82f6, 0x27273a);
gridHelper.position.y = 0.001;
scene.add(gridHelper);

// 7. Load UR5 Robot via URDFLoader
let robotArm = null;
const loader = new URDFLoader();

loader.load(
  '/models/ur5/ur5.urdf',
  (robot) => {
    robotArm = robot;

    // Convert ROS coordinate frame (Z-up) to Three.js (Y-up)
    robot.rotation.x = -Math.PI / 2;
    robot.position.set(0, 0, 0);
    scene.add(robot);

    // Initialize the interactive 6-DOF slider controls
    setupJointSliders(robot);

    // Update overlay status
    const overlaySub = document.querySelector('#overlay-info p');
    if (overlaySub) {
      overlaySub.textContent = 'Task 4: Joint Limits & Event Logging';
    }

    console.log('%c🤖 ManipTrain: Ready! Use sliders to manipulate joints.', 'color: #4ade80; font-weight: bold;');
  },
  undefined,
  (error) => {
    console.error('Failed to load URDF robot:', error);
    const overlaySub = document.querySelector('#overlay-info p');
    if (overlaySub) {
      overlaySub.textContent = 'Error loading robot model. Check console.';
      overlaySub.style.color = '#ef4444';
    }
  }
);

// 8. Window Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 9. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
