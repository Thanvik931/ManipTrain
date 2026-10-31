// src/ui/jointSliders.js
// Task 3: Interactive UI sliders to control each of the 6 robot arm joints.

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Creates floating HTML sliders for all movable joints of the robot arm.
 * @param {URDFRobot} robot - The loaded Three.js URDF robot instance
 */
export function setupJointSliders(robot) {
  // Remove any existing controls container if re-initialized
  const existing = document.getElementById('joint-controls');
  if (existing) existing.remove();

  // Create floating panel container
  const panel = document.createElement('div');
  panel.id = 'joint-controls';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>Joint Controls (6-DOF)</h2>
      <button id="reset-joints-btn" title="Reset all joints to 0°">Reset</button>
    </div>
    <div id="sliders-list"></div>
  `;
  document.body.appendChild(panel);

  const slidersList = panel.querySelector('#sliders-list');
  const movableJoints = Object.values(robot.joints).filter(
    (j) => j.jointType === 'revolute' || j.jointType === 'continuous'
  );

  const sliderInputs = [];

  // Friendly names for the 6 UR5 joints
  const jointLabels = {
    shoulder_pan_joint: 'J1: Shoulder Pan',
    shoulder_lift_joint: 'J2: Shoulder Lift',
    elbow_joint: 'J3: Elbow',
    wrist_1_joint: 'J4: Wrist 1',
    wrist_2_joint: 'J5: Wrist 2',
    wrist_3_joint: 'J6: Wrist 3'
  };

  movableJoints.forEach((joint) => {
    // Determine min/max in degrees from URDF limits (clamp continuous to +/-360)
    const minDeg = joint.limit ? Math.round(joint.limit.lower * RAD2DEG) : -360;
    const maxDeg = joint.limit ? Math.round(joint.limit.upper * RAD2DEG) : 360;
    const displayName = jointLabels[joint.name] || joint.name;

    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <div class="slider-label-row">
        <label for="slider-${joint.name}">${displayName}</label>
        <span class="deg-display" id="val-${joint.name}">0.0°</span>
      </div>
      <input 
        type="range" 
        id="slider-${joint.name}" 
        min="${minDeg}" 
        max="${maxDeg}" 
        step="0.5" 
        value="0" 
      />
    `;

    const input = row.querySelector('input');
    const display = row.querySelector('.deg-display');

    // Update joint angle when slider moves
    input.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      display.textContent = `${deg.toFixed(1)}°`;
      robot.setJointValue(joint.name, deg * DEG2RAD);
    });

    sliderInputs.push({ input, display, jointName: joint.name });
    slidersList.appendChild(row);
  });

  // Reset button to return arm to zero home pose
  const resetBtn = panel.querySelector('#reset-joints-btn');
  resetBtn.addEventListener('click', () => {
    sliderInputs.forEach(({ input, display, jointName }) => {
      input.value = '0';
      display.textContent = '0.0°';
      robot.setJointValue(jointName, 0);
    });
  });
}
