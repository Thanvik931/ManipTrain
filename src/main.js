// src/main.js
// Task 2: Load open-source 6-DOF UR5 robotic arm with lights, floor, and OrbitControls.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import URDFLoader from 'urdf-loader';

// 1. Create the Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e28);

// 2. Camera Setup
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.05,
  100
);
// Position camera at a nice angle looking at the robot
camera.position.set(1.5, 1.2, 1.8);

// 3. WebGL Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const appContainer = document.getElementById('app');
appContainer.appendChild(renderer.domElement);

// 4. OrbitControls: click and drag to rotate, scroll to zoom, right-click to pan
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0.4, 0); // Focus on arm center height
controls.update();

// 5. Lighting: key, fill, and ambient for clear visibility of metallic arm parts
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
floor.rotation.x = -Math.PI / 2; // Lie flat horizontally on XZ plane
floor.receiveShadow = true;
scene.add(floor);

const gridHelper = new THREE.GridHelper(10, 20, 0x3b82f6, 0x27273a);
gridHelper.position.y = 0.001; // Slightly above floor to prevent z-fighting
scene.add(gridHelper);

// 7. Load UR5 Robot via URDFLoader
let robotArm = null;
const loader = new URDFLoader();

// URDF files from ROS use Z-up; we orient the robot model so Z-up becomes Y-up in Three.js
loader.load(
  '/models/ur5/ur5.urdf',
  (robot) => {
    robotArm = robot;

    // Stand robot upright on the floor (ROS Z-up to Three.js Y-up)
    robot.rotation.x = -Math.PI / 2;
    robot.position.set(0, 0, 0);

    scene.add(robot);

    // List the 6 movable joints in the browser console
    console.log('%c🤖 ManipTrain: Robot Arm Loaded Successfully!', 'color: #4ade80; font-weight: bold; font-size: 14px;');
    console.log('%c--- 6 Movable Joints (revolute) ---', 'color: #60a5fa; font-weight: bold;');

    const movableJoints = Object.values(robot.joints).filter(
      (joint) => joint.jointType === 'revolute' || joint.jointType === 'continuous'
    );

    movableJoints.forEach((joint, index) => {
      const lowerDeg = ((joint.limit.lower * 180) / Math.PI).toFixed(1);
      const upperDeg = ((joint.limit.upper * 180) / Math.PI).toFixed(1);
      console.log(
        `%cJoint ${index + 1}: %c${joint.name}%c | Range: [${lowerDeg}°, ${upperDeg}°]`,
        'color: #a78bfa; font-weight: bold;',
        'color: #facc15; font-weight: bold;',
        'color: #9ca3af;'
      );
    });

    // Update overlay text to confirm
    const overlaySub = document.querySelector('#overlay-info p');
    if (overlaySub) {
      overlaySub.textContent = `Task 2: UR5 Arm Loaded (${movableJoints.length} movable joints)`;
    }
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

// 8. Handle Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 9. Main Animation Loop
function animate() {
  requestAnimationFrame(animate);

  // Update OrbitControls smoothly
  controls.update();

  renderer.render(scene, camera);
}

animate();
