// src/main.js
// Task 1: Basic setup - Scene, Camera, Renderer, and a rotating test cube.

import * as THREE from 'three';

// 1. Create the Scene (the 3D world container)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a24);

// 2. Create the Camera (our viewpoint into the 3D world)
// PerspectiveCamera(field of view in degrees, aspect ratio, near clip plane, far clip plane)
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(2, 2, 3);
camera.lookAt(0, 0, 0);

// 3. Create the WebGL Renderer (draws the scene onto the canvas)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const appContainer = document.getElementById('app');
appContainer.appendChild(renderer.domElement);

// 4. Add a light source so 3D objects have depth and shadows
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// 5. Add a simple ground grid to give spatial orientation
const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
scene.add(gridHelper);

// 6. Create our rotating test cube
// BoxGeometry(width, height, depth)
const geometry = new THREE.BoxGeometry(1, 1, 1);
// MeshStandardMaterial reacts realistically to lights
const material = new THREE.MeshStandardMaterial({
  color: 0x3b82f6, // Vibrant blue
  roughness: 0.3,
  metalness: 0.2
});
const cube = new THREE.Mesh(geometry, material);
cube.position.y = 0.5; // Sit on the grid
scene.add(cube);

// 7. Handle window resize so the scene doesn't stretch or distort
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. Animation loop: rotates the cube and renders every frame
function animate() {
  requestAnimationFrame(animate);

  // Rotate cube slightly every frame
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.015;

  renderer.render(scene, camera);
}

// Start animation loop
animate();
