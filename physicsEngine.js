import * as THREE from 'three';

/**
 * Lightweight Kinematic Physics Engine for Desktop 3D Mascot Pet
 * Supports gravity, elasticity/bouncing, boundary colliders, floor landing,
 * and mouse drag-and-throw momentum.
 */
export class PhysicsEngine {
  constructor() {
    this.enabled = false;
    this.gravity = 9.8;
    this.restitution = 0.7; // Bouncing elasticity coefficient (0.0 to 1.0)
    this.friction = 0.98;   // Air resistance / damping per frame
    this.groundFriction = 0.85; // Extra damping when sliding on ground

    this.enableFloor = true;
    this.floorY = -1.2;

    this.enableBoundary = true;
    this.boundaryX = 1.8;
    this.boundaryY = 1.8;

    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.angularVelocity = new THREE.Vector3(0, 0, 0);

    // Mouse drag tracking for momentum throw
    this.isDragging = false;
    this.dragHistory = [];
    this.maxHistorySize = 5;
    this.throwMultiplier = 0.005;

    // Optional bounce collision callback hook
    this.onBounce = null;
  }

  /**
   * Configure physics settings from user preferences
   * @param {Object} config
   */
  configure(config = {}) {
    if (typeof config.enabled === 'boolean') this.enabled = config.enabled;
    if (typeof config.gravity === 'number') this.gravity = config.gravity;
    if (typeof config.restitution === 'number') this.restitution = Math.max(0, Math.min(1, config.restitution));
    if (typeof config.enableFloor === 'boolean') this.enableFloor = config.enableFloor;
    if (typeof config.enableBoundary === 'boolean') this.enableBoundary = config.enableBoundary;
    if (typeof config.floorY === 'number') this.floorY = config.floorY;
    if (typeof config.throwMultiplier === 'number') this.throwMultiplier = config.throwMultiplier;
  }

  /**
   * Called when user starts dragging mascot
   * @param {number} screenX 
   * @param {number} screenY 
   */
  onDragStart(screenX, screenY) {
    this.isDragging = true;
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.dragHistory = [{ x: screenX, y: screenY, time: performance.now() }];
  }

  /**
   * Called while dragging mascot
   * @param {number} screenX 
   * @param {number} screenY 
   */
  onDragMove(screenX, screenY) {
    if (!this.isDragging) return;
    const now = performance.now();
    this.dragHistory.push({ x: screenX, y: screenY, time: now });
    if (this.dragHistory.length > this.maxHistorySize) {
      this.dragHistory.shift();
    }
  }

  /**
   * Called when mouse drag is released to calculate release velocity vector
   * @param {number} screenX 
   * @param {number} screenY 
   */
  onDragEnd(screenX, screenY) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    if (this.dragHistory.length >= 2 && this.enabled) {
      const now = performance.now();
      const oldest = this.dragHistory[0];
      const dt = (now - oldest.time) / 1000;

      if (dt > 0.001) {
        const dx = screenX - oldest.x;
        const dy = screenY - oldest.y;

        // Invert dy because screen Y is inverted relative to WebGL Y
        const vx = dx * this.throwMultiplier;
        const vy = -dy * this.throwMultiplier;
        
        this.velocity.set(vx, vy, (Math.random() - 0.5) * vx * 0.5);

        // Add subtle angular rotation for organic throw spin
        this.angularVelocity.set(
          -vy * 0.5,
          vx * 0.5,
          (Math.random() - 0.5) * 2.0
        );
      }
    }
    this.dragHistory = [];
  }

  /**
   * Apply an instant impulse force vector
   * @param {THREE.Vector3|Object} force 
   */
  applyImpulse(force) {
    this.velocity.x += force.x || 0;
    this.velocity.y += force.y || 0;
    this.velocity.z += force.z || 0;
  }

  /**
   * Reset physics state and snap position back to origin
   */
  reset() {
    this.position.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
  }

  /**
   * Main Physics Step loop called per frame
   * @param {number} deltaSeconds - Delta time in seconds
   * @param {THREE.Object3D} targetObject - Three.js object to apply transforms to
   */
  update(deltaSeconds, targetObject) {
    if (!this.enabled || !targetObject || this.isDragging) return;

    const dt = Math.min(deltaSeconds, 0.05); // Cap max step time to avoid tunneling

    // 1. Apply Gravity
    this.velocity.y -= this.gravity * dt;

    // 2. Damping / Air Friction
    const dampingFactor = Math.pow(this.friction, dt * 60);
    this.velocity.x *= dampingFactor;
    this.velocity.z *= dampingFactor;

    // 3. Integrate Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 4. Floor Collision & Response
    if (this.enableFloor && this.position.y <= this.floorY) {
      this.position.y = this.floorY;
      
      // Bounce reaction
      if (Math.abs(this.velocity.y) > 0.1) {
        if (this.onBounce && Math.abs(this.velocity.y) > 0.4) {
          try { this.onBounce(Math.abs(this.velocity.y)); } catch (e) {}
        }
        this.velocity.y = -this.velocity.y * this.restitution;
      } else {
        this.velocity.y = 0; // Rest on ground
      }

      // Ground friction (sliding resistance)
      const groundDamping = Math.pow(this.groundFriction, dt * 60);
      this.velocity.x *= groundDamping;
      this.velocity.z *= groundDamping;

      // Dampen angular velocity when grounded
      this.angularVelocity.multiplyScalar(0.85);
    }

    // 5. Canvas / Screen Boundary Collisions
    if (this.enableBoundary) {
      if (this.position.x > this.boundaryX) {
        this.position.x = this.boundaryX;
        this.velocity.x = -this.velocity.x * this.restitution;
      } else if (this.position.x < -this.boundaryX) {
        this.position.x = -this.boundaryX;
        this.velocity.x = -this.velocity.x * this.restitution;
      }

      if (this.position.y > this.boundaryY) {
        this.position.y = this.boundaryY;
        this.velocity.y = -this.velocity.y * this.restitution;
      }
    }

    // 6. Update Target Object Position
    targetObject.position.set(this.position.x, this.position.y, this.position.z);

    // 7. Apply Angular Velocity for thrown spins (gradually settling back to 0)
    if (this.angularVelocity.lengthSq() > 0.0001) {
      targetObject.rotation.x += this.angularVelocity.x * dt;
      targetObject.rotation.y += this.angularVelocity.y * dt;
      targetObject.rotation.z += this.angularVelocity.z * dt;
      this.angularVelocity.multiplyScalar(Math.pow(0.95, dt * 60));
    }
  }
}

export const physicsEngine = new PhysicsEngine();
