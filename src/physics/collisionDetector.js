// src/physics/collisionDetector.js
// Task 11: Simplified link AABB collision detection, table/obstacles, and impact logging.
// SIMPLIFICATION NOTE: Real-time robotics uses convex hulls or GJK/EPA narrow-phase algorithms.
// For our browser WebXR simulator, we use hierarchical AABB (Axis-Aligned Bounding Box) testing
// updated per frame, providing O(N) collision detection at 60 FPS without heavy physics engines.

import * as THREE from 'three';

// Moving arm links to test (shoulder is part of the floor-mounted rotating base)
const LINK_NAMES = [
  'upper_arm_link',
  'forearm_link',
  'wrist_1_link',
  'wrist_2_link',
  'wrist_3_link',
  'ee_link'
];

let obstacles = [];
let lastSafeAngles = {};
let lastCollisionLogTime = 0;
const tempBox = new THREE.Box3();

/**
 * Creates visual work table, safety barrier, and floor collision volumes.
 */
export function createEnvironmentObstacles(scene) {
  obstacles = [];

  // 1. Work Table in front of the robot (where scenarios S1/S2/S3 will take place)
  const tableGroup = new THREE.Group();
  const tableTopGeo = new THREE.BoxGeometry(0.70, 0.03, 0.40);
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.6, metalness: 0.1 });
  const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
  tableTop.position.set(0.0, 0.15, 0.52); // in front of robot base at +Z with clean clearance
  tableGroup.add(tableTop);

  // Table leg supports down to floor
  const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.135);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1f232a });
  const legOffsets = [
    [ 0.30, 0.0675,  0.68],
    [-0.30, 0.0675,  0.68],
    [ 0.30, 0.0675,  0.36],
    [-0.30, 0.0675,  0.36]
  ];
  legOffsets.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, y, z);
    tableGroup.add(leg);
  });
  scene.add(tableGroup);

  const tableBox = new THREE.Box3().setFromObject(tableTop);
  obstacles.push({ name: 'Work Table', box: tableBox, mesh: tableTop });

  // 2. Safety Wall Barrier (acrylic shield on the left side)
  const wallGeo = new THREE.BoxGeometry(0.02, 0.45, 0.55);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.25,
    roughness: 0.2
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(-0.48, 0.25, 0.35);
  scene.add(wall);

  const wallBox = new THREE.Box3().setFromObject(wall);
  obstacles.push({ name: 'Safety Shield', box: wallBox, mesh: wall });

  // 3. Ground Floor boundary (detects penetration below ground level)
  const floorBox = new THREE.Box3(
    new THREE.Vector3(-5, -2, -5),
    new THREE.Vector3(5, -0.01, 5)
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
        let totalDeltaRad = 0;
        Object.keys(lastSafeAngles).forEach((jName) => {
          const current = robot.joints[jName] ? (robot.joints[jName].angle || 0) : 0;
          const safe = lastSafeAngles[jName] || 0;
          totalDeltaRad += Math.abs(current - safe);
        });

        const impactN = Number((Math.min(95, Math.max(12, totalDeltaRad * 160 + Math.random() * 5))).toFixed(1));
        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

        // Rollback all joints to last confirmed safe configuration immediately
        Object.keys(lastSafeAngles).forEach((jName) => {
          robot.setJointValue(jName, lastSafeAngles[jName]);
        });
        robot.updateMatrixWorld(true);

        const event = { linkName, obstacleName: obs.name, impactN, timestamp };

        // Debounce event logging (at most 1 hit per 250ms) to prevent event flood and preserve 60 FPS
        const nowMs = performance.now();
        if (onCollision && (nowMs - lastCollisionLogTime > 250)) {
          lastCollisionLogTime = nowMs;
          onCollision(event);
        }

        return { collided: true, event };
      }
    }
  }

  // No collision: store safe configuration
  Object.keys(robot.joints).forEach((name) => {
    if (robot.joints[name].angle !== undefined) {
      lastSafeAngles[name] = robot.joints[name].angle;
    }
  });

  return { collided: false };
}
