// src/physics/collisionDetector.js
// Task 11: Simplified link AABB collision detection, table/obstacles, and impact logging.
// SIMPLIFICATION NOTE: Full physics engines use iterative GJK/EPA convex mesh clipping.
// For real-time 60 FPS WebXR simulation without heavy dependencies, we use hierarchical
// Axis-Aligned Bounding Boxes (AABB) tested against environmental obstacle boxes.

import * as THREE from 'three';

const LINK_NAMES = [
  'shoulder_link',
  'upper_arm_link',
  'forearm_link',
  'wrist_1_link',
  'wrist_2_link',
  'wrist_3_link',
  'ee_link'
];

let obstacles = [];
let lastSafeAngles = {};
const tempBox = new THREE.Box3();

/**
 * Creates visual work table, safety barrier, and floor collision volumes.
 */
export function createEnvironmentObstacles(scene) {
  obstacles = [];

  // 1. Work Table (where scenarios S1/S2/S3 will take place)
  const tableGroup = new THREE.Group();
  const tableTopGeo = new THREE.BoxGeometry(0.8, 0.04, 0.65);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.5, metalness: 0.1 });
  const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
  tableTop.position.set(0.32, 0.22, 0.18);
  tableGroup.add(tableTop);

  // Table leg supports
  const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.22);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1f232a });
  const legOffsets = [
    [0.68, 0.11, 0.46],
    [-0.04, 0.11, 0.46],
    [0.68, 0.11, -0.10],
    [-0.04, 0.11, -0.10]
  ];
  legOffsets.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    tableGroup.add(leg);
  });
  scene.add(tableGroup);

  const tableBox = new THREE.Box3().setFromObject(tableTop);
  obstacles.push({ name: 'Work Table', box: tableBox, mesh: tableTop });

  // 2. Safety Wall Barrier (rear safety shield)
  const wallGeo = new THREE.BoxGeometry(0.04, 0.6, 0.7);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.25,
    roughness: 0.2
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(-0.35, 0.3, 0.15);
  scene.add(wall);

  const wallBox = new THREE.Box3().setFromObject(wall);
  obstacles.push({ name: 'Safety Shield', box: wallBox, mesh: wall });

  // 3. Ground Floor boundary (cannot drive links through floor)
  const floorBox = new THREE.Box3(
    new THREE.Vector3(-5, -2, -5),
    new THREE.Vector3(5, 0.005, 5)
  );
  obstacles.push({ name: 'Floor Plane', box: floorBox, mesh: null });

  return obstacles;
}

/**
 * Stores current safe angles at initialization or after clean moves.
 */
export function initSafeAngles(robot) {
  lastSafeAngles = {};
  Object.keys(robot.joints).forEach((name) => {
    if (robot.joints[name].angle !== undefined) {
      lastSafeAngles[name] = robot.joints[name].angle;
    }
  });
}

/**
 * Checks all arm links against obstacles using AABBs.
 * Reverts to lastSafeAngles if collision occurs and returns collision telemetry.
 */
export function checkCollisions(robot, onCollision) {
  robot.updateMatrixWorld(true);

  for (const linkName of LINK_NAMES) {
    const linkObj = robot.links[linkName];
    if (!linkObj) continue;

    tempBox.setFromObject(linkObj);
    if (tempBox.isEmpty()) continue;

    for (const obs of obstacles) {
      if (tempBox.intersectsBox(obs.box)) {
        // Calculate impact strength based on angular difference (speed proxy)
        let totalDeltaRad = 0;
        Object.keys(lastSafeAngles).forEach((jName) => {
          const current = robot.joints[jName] ? (robot.joints[jName].angle || 0) : 0;
          const safe = lastSafeAngles[jName] || 0;
          totalDeltaRad += Math.abs(current - safe);
        });

        // Impact force formula (faster/larger bump = higher N)
        const impactN = Number((Math.min(95, Math.max(12, totalDeltaRad * 160 + Math.random() * 5))).toFixed(1));
        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

        // Revert all joints immediately to last safe configuration
        Object.keys(lastSafeAngles).forEach((jName) => {
          robot.setJointValue(jName, lastSafeAngles[jName]);
        });
        robot.updateMatrixWorld(true);

        const event = { linkName, obstacleName: obs.name, impactN, timestamp };
        if (onCollision) onCollision(event);
        return { collided: true, event };
      }
    }
  }

  // No collision: commit current configuration as safe
  Object.keys(robot.joints).forEach((name) => {
    if (robot.joints[name].angle !== undefined) {
      lastSafeAngles[name] = robot.joints[name].angle;
    }
  });

  return { collided: false };
}
