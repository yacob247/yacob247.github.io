/* ==========================================================================
   PLAYER CONTROLLER  —  real walking, jumping, impenetrable terrain
   Drop-in: <script src="player-controller.js"></script>
   ========================================================================== */
(function () {
  'use strict';

  function PlayerController(opts) {
    opts = opts || {};
    this.canvas = opts.canvas || document.querySelector('canvas');
    this.audio = opts.audio || null;
    this.groundFn = opts.groundFn || function () { return 0; };
    this.surfaceFn = opts.surfaceFn || function () { return 'rock'; };
    this.maxDist = opts.maxDist || 40;

    this.pos = opts.pos ? opts.pos.slice() : [0, 1.7, 0];
    this.vel = [0, 0, 0];
    this.radius = 0.35;
    this.height = 1.7;
    this.gravity = 22;
    this.walkSpeed = 4.5;
    this.runSpeed = 9.0;
    this.jumpSpeed = 7.5;
    this.groundY = this.groundFn(this.pos[0], this.pos[2]);
    this.pos[1] = this.groundY + this.height;
    this.onGround = true;

    this.keys = {};
    this.yaw = 0;
    this.pitch = 0;
    this.pointerLocked = false;

    this.stepAccum = 0;
    this.stepInterval = 0.5;
    this.lastSurface = 'rock';
    this.lastFootX = 0; this.lastFootZ = 0;

    this._bind();
    this._installUI();
  }
  PlayerController.prototype._bind = function () {
    var self = this;
    var c = this.canvas;

    window.addEventListener('keydown', function (e) { self.keys[e.code] = true; });
    window.addEventListener('keyup',   function (e) { self.keys[e.code] = false; });

    c.addEventListener('mousedown', function () {
      if (!self.pointerLocked && c.requestPointerLock) c.requestPointerLock();
    });
    window.addEventListener('pointerlockchange', function () {
      self.pointerLocked = !!document.pointerLockElement;
    });
    window.addEventListener('mousemove', function (e) {
      if (!self.pointerLocked) return;
      self.yaw   -= e.movementX * 0.002;
      self.pitch -= e.movementY * 0.002;
      self.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, self.pitch));
    });
  };

  PlayerController.prototype._installUI = function () {
    var hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
      'background:rgba(0,0,0,0.55);color:#fff;padding:14px 22px;border-radius:8px;' +
      'font:14px ui-monospace,Menlo,Consolas,monospace;pointer-events:none;text-align:center';
    hint.innerHTML = 'Click to enter<br><b>WASD</b> walk &nbsp;<b>Shift</b> run &nbsp;<b>Space</b> jump<br>' +
      'Real soil · impenetrable rocks · spatial audio · footsteps<br>' +
      'Click anywhere to begin';
    document.body.appendChild(hint);
    this._hint = hint;

    var self = this;
    var start = function () {
      hint.style.display = 'none';
      if (self.canvas.requestPointerLock) self.canvas.requestPointerLock();
      if (self.audio) self.audio.start();
    };
    this.canvas.addEventListener('mousedown', start, { once: true });
  };

  PlayerController.prototype._vectors = function () {
    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    var cy = Math.cos(this.yaw),   sy = Math.sin(this.yaw);
    var fwd = [sy * cp, sp, -cy * cp];
    var fwdFlat = [sy, 0, -cy];
    var fl = Math.sqrt(fwdFlat[0] * fwdFlat[0] + fwdFlat[2] * fwdFlat[2]) || 1;
    fwdFlat[0] /= fl; fwdFlat[2] /= fl;
    var rx = fwdFlat[2], rz = -fwdFlat[0];
    return { fwdFlat: fwdFlat, rx: rx, rz: rz };
  };

  PlayerController.prototype._surfaceAt = function (x, z) {
    if (typeof this.surfaceFn === 'function') return this.surfaceFn(x, z);
    return 'rock';
  };

  PlayerController.prototype._resolveTerrain = function () {
    var ground = this.groundFn(this.pos[0], this.pos[2]);
    var floor = ground + 0.25;
    if (this.pos[1] < floor) {
      this.pos[1] = floor;
      this.vel[1] = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    return ground;
  };

  PlayerController.prototype.update = function (dt) {
    dt = Math.min(dt, 0.05);
    var v = this._vectors();

    var moveX = 0, moveZ = 0;
    if (this.keys['KeyW']) { moveX += v.fwdFlat[0]; moveZ += v.fwdFlat[2]; }
    if (this.keys['KeyS']) { moveX -= v.fwdFlat[0]; moveZ -= v.fwdFlat[2]; }
    if (this.keys['KeyA']) { moveX -= v.rx; moveZ -= v.rz; }
    if (this.keys['KeyD']) { moveX += v.rx; moveZ += v.rz; }

    var speed = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) ? this.runSpeed : this.walkSpeed;
    var len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    var walking = false;
    if (len > 0.001) {
      walking = true;
      moveX = moveX / len * speed;
      moveZ = moveZ / len * speed;
    }

    var nx = this.pos[0] + moveX * dt;
    var nz = this.pos[2] + moveZ * dt;
    var g = this.groundFn(nx, nz);
    var floor = g + this.height;
    if (this.pos[1] < floor + 0.05) this.pos[1] = floor;

    this.pos[0] = nx;
    this.pos[2] = nz;

    this.vel[1] -= this.gravity * dt;
    this.pos[1] += this.vel[1] * dt;

    var ground = this.groundFn(this.pos[0], this.pos[2]);
    var floor = ground + this.height;
    var justLanded = false, impact = 0;
    if (this.pos[1] <= floor) {
      if (!this.onGround && this.vel[1] < -1.0) {
        justLanded = true;
        impact = Math.min(4.5, -this.vel[1] * 0.55);
      }
      this.pos[1] = floor;
      this.vel[1] = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    if (this.keys['Space'] && this.onGround) {
      this.vel[1] = this.jumpSpeed;
      this.onGround = false;
    }

    if (this.onGround && walking) {
      this.stepAccum += dt * (speed > this.walkSpeed + 0.5 ? 1.5 : 1.0);
      var stride = (speed > this.walkSpeed + 0.5 ? 0.42 : 0.52);
      if (this.stepAccum >= stride) {
        this.stepAccum -= stride;
        var side = this.stepAccum < 0 ? 1 : -1;
        var footX = this.pos[0] + v.rx * side * 0.22;
        var footZ = this.pos[2] + v.rz * side * 0.22;
        var surf = this._surfaceAt(footX, footZ);
        this.lastSurface = surf;
        this.lastFootX = footX; this.lastFootZ = footZ;
        var force = speed > this.walkSpeed + 0.5 ? 1.4 : 0.95;
        if (this.audio) this.audio.footstepSpatial(surf, force, footX, this.pos[1], footZ, this.maxDist);
      }
    } else if (!walking) {
      this.stepAccum = Math.min(this.stepAccum, 0.52 * 0.5);
    }

    if (justLanded && impact > 0.5) {
      if (this.audio) this.audio.footstepSpatial(this.lastSurface, impact, this.pos[0], this.pos[1], this.pos[2], this.maxDist);
    }

    if (this.audio && typeof this.audio.setListener === 'function') {
      this.audio.setListener(this.pos[0], this.pos[1], this.pos[2]);
    }

    return { pos: this.pos.slice(), vel: this.vel.slice(), onGround: this.onGround, yaw: this.yaw, pitch: this.pitch };
  };

  window.PlayerController = PlayerController;
})();
console.log('[player-controller] loaded');

