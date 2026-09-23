/**
 * HumanoidMascotBuilder.js
 * Procedural 3D Humanoid Mascot with Hierarchical Skeletal Joint Rigging & Procedural Animation Engine.
 * 100% Original IP & Procedural Geometry (No external 3D asset dependencies, 100% commercial-safe).
 */

export function createProceduralHumanoid(THREE, scene) {
  if (!THREE || !scene) return null;

  const characterGroup = new THREE.Group();
  const innerModelGroup = new THREE.Group();
  characterGroup.add(innerModelGroup);

  // --- High-End PBR Shaders & Materials ---
  const armorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2563eb, // Cobalt Cyber Blue
    roughness: 0.2,
    metalness: 0.6,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15
  });

  const whitePlateMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc, // Clean ceramic white
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });

  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark titanium joint
    roughness: 0.5,
    metalness: 0.8
  });

  const visorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x090d16, // Dark obsidian visor
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 1.0
  });

  const emissiveCoreMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Glowing Cyan
    emissive: 0x38bdf8,
    emissiveIntensity: 1.8,
    roughness: 0.2
  });

  const eyeLightMaterial = new THREE.MeshStandardMaterial({
    color: 0x00ffff, // Vivid Cyan Eye Glow
    emissive: 0x00ffff,
    emissiveIntensity: 2.2,
    roughness: 0.1
  });

  // --- Hierarchical Joint Rig Nodes ---
  const rootNode = new THREE.Group(); // Pelvis / Hips
  rootNode.position.set(0, 0, 0);
  innerModelGroup.add(rootNode);

  // Pelvis Mesh
  const pelvisGeom = new THREE.CylinderGeometry(0.35, 0.25, 0.3, 16);
  const pelvisMesh = new THREE.Mesh(pelvisGeom, jointMaterial);
  rootNode.add(pelvisMesh);

  // Torso / Chest Node
  const torsoNode = new THREE.Group();
  torsoNode.position.set(0, 0.25, 0);
  rootNode.add(torsoNode);

  // Chest Armor Plate
  const chestGeom = new THREE.BoxGeometry(0.8, 0.7, 0.5);
  const chestMesh = new THREE.Mesh(chestGeom, whitePlateMaterial);
  chestMesh.position.set(0, 0.35, 0);
  torsoNode.add(chestMesh);

  // Torso Armor Accent
  const armorAccentGeom = new THREE.BoxGeometry(0.84, 0.3, 0.54);
  const armorAccentMesh = new THREE.Mesh(armorAccentGeom, armorMaterial);
  armorAccentMesh.position.set(0, 0.45, 0);
  torsoNode.add(armorAccentMesh);

  // Glowing Reactor Core
  const coreGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
  coreGeom.rotateX(Math.PI / 2);
  const coreMesh = new THREE.Mesh(coreGeom, emissiveCoreMaterial);
  coreMesh.position.set(0, 0.4, 0.27);
  torsoNode.add(coreMesh);

  // Neck & Head Node
  const neckNode = new THREE.Group();
  neckNode.position.set(0, 0.75, 0);
  torsoNode.add(neckNode);

  const headNode = new THREE.Group();
  headNode.position.set(0, 0.15, 0);
  neckNode.add(headNode);

  // Head Helmet
  const helmetGeom = new THREE.SphereGeometry(0.48, 24, 24);
  const helmetMesh = new THREE.Mesh(helmetGeom, whitePlateMaterial);
  headNode.add(helmetMesh);

  // Visor Mask
  const visorGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.22, 16, 1, false, 0, Math.PI);
  visorGeom.rotateY(-Math.PI / 2);
  const visorMesh = new THREE.Mesh(visorGeom, visorMaterial);
  visorMesh.position.set(0, 0.02, 0.1);
  headNode.add(visorMesh);

  // Glowing Eyes
  const eyeGeom = new THREE.BoxGeometry(0.12, 0.04, 0.02);
  const leftEye = new THREE.Mesh(eyeGeom, eyeLightMaterial);
  leftEye.position.set(-0.16, 0.04, 0.48);
  headNode.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeom, eyeLightMaterial);
  rightEye.position.set(0.16, 0.04, 0.48);
  headNode.add(rightEye);

  // Headset Antennae
  const antennaGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12);
  antennaGeom.rotateZ(Math.PI / 2);

  const leftAntenna = new THREE.Mesh(antennaGeom, armorMaterial);
  leftAntenna.position.set(-0.5, 0, 0);
  headNode.add(leftAntenna);

  const rightAntenna = new THREE.Mesh(antennaGeom, armorMaterial);
  rightAntenna.position.set(0.5, 0, 0);
  headNode.add(rightAntenna);

  // --- Left Arm System ---
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.55, 0.6, 0);
  torsoNode.add(leftShoulder);

  const shoulderPadGeom = new THREE.SphereGeometry(0.2, 12, 12);
  const leftShoulderPad = new THREE.Mesh(shoulderPadGeom, armorMaterial);
  leftShoulder.add(leftShoulderPad);

  const leftArmNode = new THREE.Group();
  leftShoulder.add(leftArmNode);

  const upperArmGeom = new THREE.CylinderGeometry(0.1, 0.09, 0.4, 12);
  upperArmGeom.translate(0, -0.2, 0);
  const leftUpperArm = new THREE.Mesh(upperArmGeom, whitePlateMaterial);
  leftArmNode.add(leftUpperArm);

  const leftElbowNode = new THREE.Group();
  leftElbowNode.position.set(0, -0.4, 0);
  leftArmNode.add(leftElbowNode);

  const elbowJointGeom = new THREE.SphereGeometry(0.1, 10, 10);
  const leftElbowJoint = new THREE.Mesh(elbowJointGeom, jointMaterial);
  leftElbowNode.add(leftElbowJoint);

  const forearmGeom = new THREE.CylinderGeometry(0.11, 0.09, 0.38, 12);
  forearmGeom.translate(0, -0.19, 0);
  const leftForearm = new THREE.Mesh(forearmGeom, armorMaterial);
  leftElbowNode.add(leftForearm);

  const handGeom = new THREE.SphereGeometry(0.1, 10, 10);
  const leftHand = new THREE.Mesh(handGeom, whitePlateMaterial);
  leftHand.position.set(0, -0.42, 0);
  leftElbowNode.add(leftHand);

  // --- Right Arm System ---
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.55, 0.6, 0);
  torsoNode.add(rightShoulder);

  const rightShoulderPad = new THREE.Mesh(shoulderPadGeom, armorMaterial);
  rightShoulder.add(rightShoulderPad);

  const rightArmNode = new THREE.Group();
  rightShoulder.add(rightArmNode);

  const rightUpperArm = new THREE.Mesh(upperArmGeom, whitePlateMaterial);
  rightArmNode.add(rightUpperArm);

  const rightElbowNode = new THREE.Group();
  rightElbowNode.position.set(0, -0.4, 0);
  rightArmNode.add(rightElbowNode);

  const rightElbowJoint = new THREE.Mesh(elbowJointGeom, jointMaterial);
  rightElbowNode.add(rightElbowJoint);

  const rightForearm = new THREE.Mesh(forearmGeom, armorMaterial);
  rightElbowNode.add(rightForearm);

  const rightHand = new THREE.Mesh(handGeom, whitePlateMaterial);
  rightHand.position.set(0, -0.42, 0);
  rightElbowNode.add(rightHand);

  // --- Left Leg System ---
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.25, -0.15, 0);
  rootNode.add(leftHip);

  const thighGeom = new THREE.CylinderGeometry(0.14, 0.12, 0.45, 12);
  thighGeom.translate(0, -0.22, 0);
  const leftThigh = new THREE.Mesh(thighGeom, whitePlateMaterial);
  leftHip.add(leftThigh);

  const leftKneeNode = new THREE.Group();
  leftKneeNode.position.set(0, -0.45, 0);
  leftHip.add(leftKneeNode);

  const kneeJoint = new THREE.Mesh(elbowJointGeom, jointMaterial);
  leftKneeNode.add(kneeJoint);

  const shinGeom = new THREE.CylinderGeometry(0.13, 0.11, 0.45, 12);
  shinGeom.translate(0, -0.22, 0);
  const leftShin = new THREE.Mesh(shinGeom, armorMaterial);
  leftKneeNode.add(leftShin);

  const footGeom = new THREE.BoxGeometry(0.18, 0.12, 0.35);
  const leftFoot = new THREE.Mesh(footGeom, whitePlateMaterial);
  leftFoot.position.set(0, -0.48, 0.08);
  leftKneeNode.add(leftFoot);

  // --- Right Leg System ---
  const rightHip = new THREE.Group();
  rightHip.position.set(0.25, -0.15, 0);
  rootNode.add(rightHip);

  const rightThigh = new THREE.Mesh(thighGeom, whitePlateMaterial);
  rightHip.add(rightThigh);

  const rightKneeNode = new THREE.Group();
  rightKneeNode.position.set(0, -0.45, 0);
  rightHip.add(rightKneeNode);

  const rightKneeJoint = new THREE.Mesh(elbowJointGeom, jointMaterial);
  rightKneeNode.add(rightKneeJoint);

  const rightShin = new THREE.Mesh(shinGeom, armorMaterial);
  rightKneeNode.add(rightShin);

  const rightFoot = new THREE.Mesh(footGeom, whitePlateMaterial);
  rightFoot.position.set(0, -0.48, 0.08);
  rightKneeNode.add(rightFoot);

  // Invisible collision proxy box for physics interaction
  const proxyGeom = new THREE.BoxGeometry(1.4, 2.3, 1.0);
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true });
  const collisionProxy = new THREE.Mesh(proxyGeom, proxyMat);
  collisionProxy.position.set(0, 0.2, 0);
  characterGroup.add(collisionProxy);

  // Position entire humanoid gracefully above baseline
  innerModelGroup.position.set(0, 0.2, 0);

  // --- Procedural Skeletal Animation Controller ---
  const joints = {
    root: rootNode,
    torso: torsoNode,
    head: headNode,
    neck: neckNode,
    leftShoulder,
    leftArm: leftArmNode,
    leftElbow: leftElbowNode,
    rightShoulder,
    rightArm: rightArmNode,
    rightElbow: rightElbowNode,
    leftHip,
    leftKnee: leftKneeNode,
    rightHip,
    rightKnee: rightKneeNode
  };

  /**
   * Resets all joint rotations to neutral T-pose/A-pose.
   */
  function resetJoints() {
    Object.values(joints).forEach(j => {
      if (j && j.rotation) j.rotation.set(0, 0, 0);
    });
    joints.leftArm.rotation.z = 0.2;
    joints.rightArm.rotation.z = -0.2;
  }
  resetJoints();

  /**
   * Updates procedural humanoid skeletal animations on every frame tick.
   * @param {number} time - Elapsed time in seconds.
   * @param {string} clipName - Active animation key ('idle', 'wave', 'dance', 'look_around', 'cheer').
   */
  function updateAnimation(time = 0, clipName = 'idle') {
    const t = time;

    switch (clipName.toLowerCase()) {
      case 'wave':
      case 'cheer':
        // Breathing base
        joints.root.position.y = 0.2 + Math.sin(t * 4) * 0.06;
        joints.torso.rotation.y = Math.sin(t * 3) * 0.08;
        joints.head.rotation.z = Math.sin(t * 4) * 0.1;
        joints.head.rotation.y = Math.sin(t * 2) * 0.15;

        // Right Arm Wave
        joints.rightShoulder.rotation.z = 2.4 + Math.sin(t * 8) * 0.4;
        joints.rightShoulder.rotation.x = Math.sin(t * 8) * 0.2;
        joints.rightElbow.rotation.z = 0.6 + Math.sin(t * 8) * 0.3;

        // Left Arm Calm Balance
        joints.leftShoulder.rotation.z = -0.3 + Math.sin(t * 3) * 0.05;
        joints.leftElbow.rotation.z = -0.2;

        // Legs slight bounce
        joints.leftHip.rotation.x = -Math.sin(t * 4) * 0.08;
        joints.rightHip.rotation.x = Math.sin(t * 4) * 0.08;
        break;

      case 'dance':
      case 'victory':
        // Rhythmic Dance Groove
        joints.root.position.y = 0.2 + Math.abs(Math.sin(t * 5)) * 0.12;
        joints.root.position.x = Math.sin(t * 2.5) * 0.15;
        joints.root.rotation.z = Math.sin(t * 2.5) * 0.15;
        joints.torso.rotation.y = Math.sin(t * 5) * 0.3;
        joints.head.rotation.y = -Math.sin(t * 5) * 0.2;

        // Arms Pumping & Grooving
        joints.leftShoulder.rotation.x = Math.sin(t * 5) * 0.8;
        joints.leftShoulder.rotation.z = -0.5 + Math.sin(t * 5) * 0.4;
        joints.leftElbow.rotation.x = 0.8 + Math.sin(t * 5) * 0.4;

        joints.rightShoulder.rotation.x = -Math.sin(t * 5) * 0.8;
        joints.rightShoulder.rotation.z = 0.5 - Math.sin(t * 5) * 0.4;
        joints.rightElbow.rotation.x = 0.8 - Math.sin(t * 5) * 0.4;

        // Stepping Legs
        joints.leftHip.rotation.x = Math.sin(t * 5) * 0.6;
        joints.rightHip.rotation.x = -Math.sin(t * 5) * 0.6;
        joints.leftKnee.rotation.x = Math.max(0, -Math.sin(t * 5) * 0.8);
        joints.rightKnee.rotation.x = Math.max(0, Math.sin(t * 5) * 0.8);
        break;

      case 'look_around':
      case 'observe':
        // Looking around screen
        joints.root.position.y = 0.2 + Math.sin(t * 2) * 0.03;
        joints.torso.rotation.y = Math.sin(t * 1.2) * 0.35;
        joints.head.rotation.y = Math.sin(t * 1.2) * 0.45;
        joints.head.rotation.x = Math.sin(t * 0.8) * 0.15;

        joints.leftShoulder.rotation.z = -0.25 + Math.sin(t * 2) * 0.03;
        joints.rightShoulder.rotation.z = 0.25 - Math.sin(t * 2) * 0.03;
        joints.leftElbow.rotation.z = -0.2;
        joints.rightElbow.rotation.z = 0.2;
        break;

      case 'idle':
      default:
        // Natural Idle Breathing & Gentle Stance Shift
        joints.root.position.y = 0.2 + Math.sin(t * 2.2) * 0.04;
        joints.torso.rotation.x = Math.sin(t * 2.2) * 0.03;
        joints.torso.rotation.y = Math.sin(t * 1.1) * 0.05;
        joints.head.rotation.x = -Math.sin(t * 2.2) * 0.02;
        joints.head.rotation.y = Math.sin(t * 0.9) * 0.1;
        joints.head.rotation.z = Math.sin(t * 1.1) * 0.04;

        // Natural Arm Sway
        joints.leftShoulder.rotation.x = Math.sin(t * 2.2) * 0.08;
        joints.leftShoulder.rotation.z = -0.25 + Math.sin(t * 1.5) * 0.04;
        joints.leftElbow.rotation.z = -0.15 + Math.sin(t * 2.2) * 0.05;

        joints.rightShoulder.rotation.x = -Math.sin(t * 2.2) * 0.08;
        joints.rightShoulder.rotation.z = 0.25 - Math.sin(t * 1.5) * 0.04;
        joints.rightElbow.rotation.z = 0.15 - Math.sin(t * 2.2) * 0.05;

        // Subtle leg stance
        joints.leftHip.rotation.x = -Math.sin(t * 2.2) * 0.02;
        joints.rightHip.rotation.x = Math.sin(t * 2.2) * 0.02;
        break;
    }
  }

  const controller = {
    characterGroup,
    innerModelGroup,
    collisionProxy,
    joints,
    updateAnimation,
    resetJoints,
    availableAnimations: ['Idle', 'Wave', 'Dance', 'Look_Around']
  };

  innerModelGroup.userData.humanoidController = controller;
  return controller;
}
