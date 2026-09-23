/**
 * MascotMailService.js
 * 
 * Manages procedural 3D mail envelope creation and animated flight trajectories
 * between the user's viewport controls and the 3D mascot.
 * 
 * Features:
 * - Procedural Three.js 3D mail envelope with folded triangular flap and wax seal
 * - Quadratic Bézier flight trajectory with aerodynamic banking, flutter, and scaling
 * - Dual directional delivery: User -> Mascot & Mascot -> User
 * - Particle trail and arrival dissolve effects
 * - 100% Offline with zero external asset dependencies
 */

export class MascotMailService {
  constructor(options = {}) {
    this.THREE = options.THREE || (typeof window !== 'undefined' ? window.THREE : null);
    this.scene = options.scene || null;
    this.camera = options.camera || null;
    this.characterGroup = options.characterGroup || null;

    this.activeMails = [];
    this.activeParticles = [];
  }

  /**
   * Constructs a procedural 3D envelope mesh with hinged flap and interior letter sheet.
   * @returns {Object} THREE.Group
   */
  createMailMesh() {
    const THREE = this.THREE;
    if (!THREE) return null;

    const mailGroup = new THREE.Group();

    // 1. Envelope Body (Rectangular folded paper casing)
    const bodyGeo = new THREE.BoxGeometry(0.48, 0.32, 0.024);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7,
      roughness: 0.35,
      metalness: 0.05
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.name = 'envelopeBody';
    mailGroup.add(bodyMesh);

    // 2. Interior Parchment Letter Sheet (Slides out on arrival)
    const letterGeo = new THREE.BoxGeometry(0.42, 0.26, 0.008);
    const letterMat = new THREE.MeshStandardMaterial({
      color: 0xfffdf8,
      roughness: 0.28,
      metalness: 0.02
    });
    const letterMesh = new THREE.Mesh(letterGeo, letterMat);
    letterMesh.name = 'letterSheet';
    letterMesh.position.set(0, 0.02, 0.006);
    mailGroup.add(letterMesh);

    // 3. Hinged Triangular Flap Pivot Group (Hinged at top edge y = 0.16)
    const flapPivot = new THREE.Group();
    flapPivot.name = 'flapPivot';
    flapPivot.position.set(0, 0.16, 0.013);

    // Flap geometry relative to hinge
    const flapGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.24,  0.0,   0.001,
       0.24,  0.0,   0.001,
       0.0,  -0.18,  0.004,

      // Backside for double-sided rendering
       0.24,  0.0,   0.001,
      -0.24,  0.0,   0.001,
       0.0,  -0.18,  0.004
    ]);
    flapGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    flapGeo.computeVertexNormals();

    const flapMat = new THREE.MeshStandardMaterial({
      color: 0xf3ede2,
      roughness: 0.4,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    const flapMesh = new THREE.Mesh(flapGeo, flapMat);
    flapPivot.add(flapMesh);

    // 4. Golden-Red Wax Seal (Positioned on flap tip)
    const sealGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.012, 16);
    const sealMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Golden amber wax seal
      roughness: 0.25,
      metalness: 0.35
    });
    const sealMesh = new THREE.Mesh(sealGeo, sealMat);
    sealMesh.rotation.x = Math.PI / 2;
    sealMesh.position.set(0, -0.18, 0.007);
    sealMesh.name = 'waxSeal';
    flapPivot.add(sealMesh);

    mailGroup.add(flapPivot);

    // 5. Subtle Ambient Glow Halo
    const glowGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.28
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.name = 'glowHalo';
    mailGroup.add(glowMesh);

    mailGroup.scale.set(0.85, 0.85, 0.85);

    // Store references on the root group for quick animation access
    mailGroup.userData = {
      bodyMesh,
      letterMesh,
      flapPivot,
      sealMesh,
      glowMesh
    };

    return mailGroup;
  }

  /**
   * Spawns a shimmering golden stardust particle at a given position.
   */
  spawnParticle(pos, vel, color = 0xfbbf24) {
    if (!this.THREE || !this.scene) return;
    const THREE = this.THREE;
    try {
      const geo = new THREE.SphereGeometry(0.022, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.08,
        pos.y + (Math.random() - 0.5) * 0.08,
        pos.z + (Math.random() - 0.5) * 0.08
      );
      this.scene.add(mesh);

      const pVel = vel || new THREE.Vector3(
        (Math.random() - 0.5) * 0.25,
        (Math.random() - 0.5) * 0.25 + 0.1,
        (Math.random() - 0.5) * 0.25
      );

      this.activeParticles.push({
        mesh,
        vel: pVel,
        life: 0.45,
        maxLife: 0.45
      });
    } catch (e) {
      // Graceful fallback
    }
  }

  /**
   * Spawns a burst of celebratory sparkle particles.
   */
  spawnBurst(pos, count = 10, color = 0xf59e0b) {
    for (let i = 0; i < count; i++) {
      const vel = this.THREE ? new this.THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8 + 0.3,
        (Math.random() - 0.5) * 0.8
      ) : null;
      this.spawnParticle(pos, vel, color);
    }
  }

  /**
   * Converts 2D screen pixels to 3D point in camera frustum.
   */
  screenTo3D(screenX, screenY, depth = 0.5) {
    if (!this.THREE || !this.camera || typeof window === 'undefined') {
      return this.THREE ? new this.THREE.Vector3(0, -0.5, 1.5) : { x: 0, y: -0.5, z: 1.5 };
    }
    const ndcX = (screenX / window.innerWidth) * 2 - 1;
    const ndcY = -(screenY / window.innerHeight) * 2 + 1;

    const vec = new this.THREE.Vector3(ndcX, ndcY, depth);
    vec.unproject(this.camera);
    return vec;
  }

  getCharacterPosition() {
    if (!this.characterGroup || !this.characterGroup.position) {
      return this.THREE ? new this.THREE.Vector3(0, 0, 0) : { x: 0, y: 0, z: 0 };
    }
    if (typeof this.characterGroup.position.clone === 'function') {
      return this.characterGroup.position.clone();
    }
    return new this.THREE.Vector3(
      this.characterGroup.position.x || 0,
      this.characterGroup.position.y || 0,
      this.characterGroup.position.z || 0
    );
  }

  /**
   * Dispatches a mail from the user's input location toward the mascot.
   * @param {Object} startScreenPos { x, y }
   * @param {Function} onDelivered Callback when mail arrives at mascot
   */
  sendUserMail(startScreenPos, onDelivered) {
    if (!this.THREE || !this.scene) {
      if (onDelivered) onDelivered();
      return;
    }

    const mail = this.createMailMesh();
    if (!mail) {
      if (onDelivered) onDelivered();
      return;
    }

    const startPos = this.screenTo3D(startScreenPos.x, startScreenPos.y, 0.4);

    const targetPos = this.getCharacterPosition();
    targetPos.y += 0.35; // Target chest/face

    // Midpoint curve control
    const midPos = startPos.clone().lerp(targetPos, 0.5);
    midPos.y += 0.65; // High parabolic arc
    midPos.x += (Math.random() - 0.5) * 0.3;

    mail.position.copy(startPos);
    this.scene.add(mail);

    const animation = {
      mesh: mail,
      direction: 'to_mascot',
      phase: 'flight',
      startPos,
      midPos,
      targetPos,
      duration: 0.85, // seconds
      elapsed: 0,
      particleTimer: 0,
      onDelivered
    };

    this.activeMails.push(animation);
  }

  /**
   * Dispatches a return mail from the mascot toward the user/camera,
   * unfolding its flap and letter upon arrival before presenting speech bubble.
   * @param {Object} targetScreenPos { x, y }
   * @param {Function} onDelivered Callback when mail opens near screen
   */
  sendMascotMail(targetScreenPos, onDelivered) {
    if (!this.THREE || !this.scene) {
      if (onDelivered) onDelivered();
      return;
    }

    const mail = this.createMailMesh();
    if (!mail) {
      if (onDelivered) onDelivered();
      return;
    }

    const startPos = this.getCharacterPosition();
    startPos.y += 0.35;
    startPos.z += 0.15;

    const targetPos = this.screenTo3D(
      targetScreenPos ? targetScreenPos.x : (typeof window !== 'undefined' ? window.innerWidth / 2 : 200),
      targetScreenPos ? targetScreenPos.y : (typeof window !== 'undefined' ? window.innerHeight - 80 : 350),
      0.35
    );

    const midPos = startPos.clone().lerp(targetPos, 0.5);
    midPos.y += 0.45;

    mail.position.copy(startPos);
    mail.scale.set(0.2, 0.2, 0.2); // Starts small from mascot
    this.scene.add(mail);

    const animation = {
      mesh: mail,
      direction: 'to_user',
      phase: 'flight', // 'flight' -> 'opening' -> 'completed'
      startPos,
      midPos,
      targetPos,
      flightDuration: 0.65,
      openDuration: 0.40,
      elapsed: 0,
      openElapsed: 0,
      particleTimer: 0,
      deliveredCalled: false,
      onDelivered
    };

    this.activeMails.push(animation);
  }

  /**
   * Advances active mail flight animations and particle life cycles per frame.
   * @param {number} delta Seconds since last frame
   */
  update(delta = 0.016) {
    // 1. Update active particles
    for (let j = this.activeParticles.length - 1; j >= 0; j--) {
      const p = this.activeParticles[j];
      p.life -= delta;
      if (p.life <= 0) {
        this._disposeMesh(p.mesh);
        this.activeParticles.splice(j, 1);
      } else {
        const ratio = p.life / p.maxLife;
        p.mesh.position.x += p.vel.x * delta;
        p.mesh.position.y += p.vel.y * delta;
        p.mesh.position.z += p.vel.z * delta;
        if (p.mesh.scale && typeof p.mesh.scale.set === 'function') {
          p.mesh.scale.set(ratio, ratio, ratio);
        }
        if (p.mesh.material) {
          p.mesh.material.opacity = ratio * 0.85;
        }
      }
    }

    if (!this.activeMails || this.activeMails.length === 0) return;

    // 2. Update active mail flight and opening animations
    for (let i = this.activeMails.length - 1; i >= 0; i--) {
      const anim = this.activeMails[i];
      const mail = anim.mesh;
      const uData = mail.userData || {};

      // Spawn periodic stardust particles during flight
      anim.particleTimer = (anim.particleTimer || 0) + delta;
      if (anim.phase === 'flight' && anim.particleTimer >= 0.04) {
        anim.particleTimer = 0;
        this.spawnParticle(mail.position);
      }

      if (anim.direction === 'to_mascot') {
        anim.elapsed += delta;
        const t = Math.min(1.0, anim.elapsed / anim.duration);

        // Quadratic Bézier curve: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
        const invT = 1.0 - t;
        const x = invT * invT * anim.startPos.x + 2 * invT * t * anim.midPos.x + t * t * anim.targetPos.x;
        const y = invT * invT * anim.startPos.y + 2 * invT * t * anim.midPos.y + t * t * anim.targetPos.y;
        const z = invT * invT * anim.startPos.z + 2 * invT * t * anim.midPos.z + t * t * anim.targetPos.z;
        mail.position.set(x, y, z);

        mail.rotation.y += delta * 6.5;
        mail.rotation.z = Math.sin(t * Math.PI * 2) * 0.35;
        mail.rotation.x = -0.2 + (t * 0.4);

        // Disappear/dissolve into mascot upon arrival
        if (t > 0.65) {
          const dissolveScale = Math.max(0.01, 1.0 - (t - 0.65) / 0.35);
          mail.scale.set(dissolveScale, dissolveScale, dissolveScale);
        }

        if (t >= 1.0) {
          this.spawnBurst(anim.targetPos, 8, 0xfbbf24);
          if (typeof anim.onDelivered === 'function') {
            try { anim.onDelivered(); } catch (err) { console.warn('Mail delivery callback error:', err); }
          }
          this._disposeMesh(mail);
          this.activeMails.splice(i, 1);
        }
      } else {
        // --- direction: 'to_user' ---
        if (anim.phase === 'flight') {
          anim.elapsed += delta;
          const t = Math.min(1.0, anim.elapsed / anim.flightDuration);

          const invT = 1.0 - t;
          const x = invT * invT * anim.startPos.x + 2 * invT * t * anim.midPos.x + t * t * anim.targetPos.x;
          const y = invT * invT * anim.startPos.y + 2 * invT * t * anim.midPos.y + t * t * anim.targetPos.y;
          const z = invT * invT * anim.startPos.z + 2 * invT * t * anim.midPos.z + t * t * anim.targetPos.z;
          mail.position.set(x, y, z);

          const growScale = 0.2 + t * 0.8;
          mail.scale.set(growScale, growScale, growScale);
          mail.rotation.y = Math.sin(t * Math.PI) * 0.5;
          mail.rotation.x = 0.15 * (1.0 - t);
          mail.rotation.z = Math.sin(t * Math.PI * 1.5) * 0.2;

          if (t >= 1.0) {
            anim.phase = 'opening';
            const excess = anim.elapsed - anim.flightDuration;
            if (excess > 0) {
              anim.openElapsed += excess;
            }
          }
        }
        if (anim.phase === 'opening') {
          // Envelope Opening Sequence: Flap swings open & parchment letter slides upward
          anim.openElapsed += delta;
          const tOpen = Math.min(1.0, anim.openElapsed / anim.openDuration);

          // Ease out cubic
          const easeT = 1.0 - Math.pow(1.0 - tOpen, 3);

          // 1. Flap swings open 180 degrees (-Math.PI)
          if (uData.flapPivot) {
            uData.flapPivot.rotation.x = -Math.PI * 0.95 * easeT;
          }

          // 2. Parchment letter sheet slides upward out of envelope
          if (uData.letterMesh) {
            uData.letterMesh.position.y = 0.02 + 0.18 * easeT;
            const letterScale = 1.0 + 0.08 * easeT;
            if (uData.letterMesh.scale && typeof uData.letterMesh.scale.set === 'function') {
              uData.letterMesh.scale.set(letterScale, letterScale, letterScale);
            }
          }

          // Gentle hover bob
          mail.position.y = anim.targetPos.y + Math.sin(anim.openElapsed * 8) * 0.015;

          // Trigger speech bubble revelation at flap opening crest
          if (tOpen >= 0.75 && !anim.deliveredCalled) {
            anim.deliveredCalled = true;
            this.spawnBurst(mail.position, 6, 0xfde047);
            if (typeof anim.onDelivered === 'function') {
              try { anim.onDelivered(); } catch (err) { console.warn('Mail delivery callback error:', err); }
            }
          }

          // Fade out 3D envelope once bubble is active
          if (tOpen >= 1.0) {
            this._disposeMesh(mail);
            this.activeMails.splice(i, 1);
          }
        }
      }
    }
  }

  /**
   * Safely cleans up a mail mesh from scene and memory.
   */
  _disposeMesh(mesh) {
    if (!mesh) return;
    if (this.scene) {
      this.scene.remove(mesh);
    }
    mesh.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry && typeof child.geometry.dispose === 'function') child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m && typeof m.dispose === 'function' && m.dispose());
          } else if (typeof child.material.dispose === 'function') {
            child.material.dispose();
          }
        }
      }
    });
  }
}
