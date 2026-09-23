import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.pitch = 0;
    this.yaw = 0;
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
      shift: false
    };
    this.moveSpeed = 0.08;
  }

  handleKeyDown(code) {
    switch (code) {
      case 'KeyW': this.keys.w = true; break;
      case 'KeyA': this.keys.a = true; break;
      case 'KeyS': this.keys.s = true; break;
      case 'KeyD': this.keys.d = true; break;
      case 'Space': this.keys.space = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.shift = true; break;
    }
  }

  handleKeyUp(code) {
    switch (code) {
      case 'KeyW': this.keys.w = false; break;
      case 'KeyA': this.keys.a = false; break;
      case 'KeyS': this.keys.s = false; break;
      case 'KeyD': this.keys.d = false; break;
      case 'Space': this.keys.space = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.keys.shift = false; break;
    }
  }

  updateMovement() {
    if (!this.camera) return;
    const speed = this.keys.shift ? this.moveSpeed * 2.5 : this.moveSpeed;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys.w) this.camera.position.addScaledVector(forward, speed);
    if (this.keys.s) this.camera.position.addScaledVector(forward, -speed);
    if (this.keys.d) this.camera.position.addScaledVector(right, speed);
    if (this.keys.a) this.camera.position.addScaledVector(right, -speed);
    if (this.keys.space) this.camera.position.y += speed;
    if (this.keys.shift && !this.keys.w && !this.keys.s && !this.keys.a && !this.keys.d) {
      this.camera.position.y -= speed;
    }
  }
}
