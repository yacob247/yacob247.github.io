import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as THREE from 'three';

export class PlayerController {
    constructor(character = null) {
        // 所有会参与射线碰撞检测的对象集合（地形、墙体、障碍物等）。
        this.collisionTargets = [];
        this.character = null;
        this.getCameraYaw = null;

        this.moveSpeed = 3;
        this.jumpSpeed = 8;
        this.gravity = -20;

        this.wallCheckDistance = 0.5;
        this.groundProbeHeight = 0.5;
        this.groundSnapDistance = 0.1;
        this.fallResetY = -20;
        this.fallResetPosition = new THREE.Vector3(0, 10, 0);

        this.inputTarget = document;
        this.enableKeyboard = true;
        this.enableJoystick = true;
        this.joystickDeadZone = 0.12;
        this.isConnected = false;

        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            shift: false,
            f: false
        };
        this.pressedKeys = new Set();
        this.keyBindings = {
            forward: ['w'],
            backward: ['s'],
            left: ['a'],
            right: ['d'],
            jump: ['space'],
            sprint: ['shift'],
            attack: ['f']
        };

        this.joystick = {
            moveX: 0,
            moveZ: 0,
            jumpPressed: false,
            sprintPressed: false,
            attackPressed: false
        };

        this.attackJustPressed = false;
        this.isAttacking = false;
        this.onAttack = null;

        this.velocity = new THREE.Vector3();
        this.isOnGround = false;
        this.animationActions = {
            idle: null,
            walk: null,
            run: null,
            jump: null,
            attack: null
        };
        this.animationClips = {
            idle: null,
            walk: null,
            run: null,
            jump: null,
            attack: null
        };
        this.currentAction = null;
        this.animationFadeDuration = 0.2;
        this.animationMixer = null;
        this.defaultAnimationUrls = {
            idle: "https://static.seeles.ai/data/asset/export/test/87aa70b9-6623-443f-ae9b-a89cd397b1e1/35629/source.fbx",
            walk: "https://static.seeles.ai/data/asset/export/test/161cf558-31b3-4f27-8524-4b9f75612290/35686/source.fbx",
            run: "https://static.seeles.ai/data/asset/export/test/e950bcb9-411e-43a3-8268-b2b1fa82858b/35704/source.fbx",
            jump: "https://static.seeles.ai/data/asset/export/test/1ce8f3f8-3f22-4f83-b5ce-7c20196694ed/35645/source.fbx",
            attack: "https://static.seeles.ai/data/asset/export/test/dacc901f-ec9d-4996-a5b0-f8a5aa53f909/35678/source.fbx"
        };

        this.groundRaycaster = new THREE.Raycaster();
        this.wallRaycaster = new THREE.Raycaster();
        this.tmpInputDirection = new THREE.Vector3();
        this.tmpWorldDirection = new THREE.Vector3();
        this.downDirection = new THREE.Vector3(0, -1, 0);

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);

        this._setCharacter(character);
    }

    get object() {
        return this.character;
    }

    // 推荐方式：直接传入相机对象，内部自动用 YXZ 欧拉顺序从四元数提取偏航角，
    // 避免 camera.rotation.y 在俯仰/lookAt 场景下不可靠的问题。
    setCamera(camera) {
        this._camera = camera;
        this.getCameraYaw = () => {
            const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
            return euler.y;
        };
    }

    setCameraYawGetter(getter) {
        this.getCameraYaw = getter;
    }

    setMoveSpeed(value) {
        this.moveSpeed = Number(value);
    }

    setJumpSpeed(value) {
        this.jumpSpeed = Number(value);
    }

    setGravity(value) {
        this.gravity = Number(value);
    }

    setCollisionConfig({ wallCheckDistance, groundProbeHeight, groundSnapDistance } = {}) {
        if (wallCheckDistance !== undefined) this.wallCheckDistance = Number(wallCheckDistance);
        if (groundProbeHeight !== undefined) this.groundProbeHeight = Number(groundProbeHeight);
        if (groundSnapDistance !== undefined) this.groundSnapDistance = Number(groundSnapDistance);
    }

    setFallReset({ y, position } = {}) {
        if (y !== undefined) this.fallResetY = Number(y);
        if (position) this.fallResetPosition.copy(position);
    }

    setAnimationUrls(urls = {}) {
        Object.assign(this.defaultAnimationUrls, urls);
    }

    setAttackCallback(callback) {
        this.onAttack = typeof callback === 'function' ? callback : null;
    }

    // 统一配置输入行为；如果当前已连接，会先断开再重连以应用新配置。
    setInputConfig({
        inputTarget,
        enableKeyboard,
        enableJoystick,
        joystickDeadZone
    } = {}) {
        const wasConnected = this.isConnected;
        if (wasConnected) this._disconnect();

        if (inputTarget !== undefined) this.inputTarget = inputTarget;
        if (enableKeyboard !== undefined) this.enableKeyboard = Boolean(enableKeyboard);
        if (enableJoystick !== undefined) this.enableJoystick = Boolean(enableJoystick);
        if (joystickDeadZone !== undefined) this.joystickDeadZone = Number(joystickDeadZone);

        if (wasConnected) this._connect();
    }

    _normalizeKeyName(key) {
        if (key === ' ') return 'space';
        return String(key).toLowerCase();
    }

    _normalizeKeyList(keys) {
        if (keys === undefined || keys === null) return [];
        const list = Array.isArray(keys) ? keys : [keys];
        return list.map((key) => this._normalizeKeyName(key));
    }

    // 自定义键位映射，默认保持 WASD + Space + Shift（冲刺）+ F（攻击）。
    setKeyBindings({ forward, backward, left, right, jump, sprint, attack } = {}) {
        if (forward !== undefined) this.keyBindings.forward = this._normalizeKeyList(forward);
        if (backward !== undefined) this.keyBindings.backward = this._normalizeKeyList(backward);
        if (left !== undefined) this.keyBindings.left = this._normalizeKeyList(left);
        if (right !== undefined) this.keyBindings.right = this._normalizeKeyList(right);
        if (jump !== undefined) this.keyBindings.jump = this._normalizeKeyList(jump);
        if (sprint !== undefined) this.keyBindings.sprint = this._normalizeKeyList(sprint);
        if (attack !== undefined) this.keyBindings.attack = this._normalizeKeyList(attack);
        this._syncKeyboardState();
    }

    _syncKeyboardState() {
        this.keys.w = this.keyBindings.forward.some((key) => this.pressedKeys.has(key));
        this.keys.a = this.keyBindings.left.some((key) => this.pressedKeys.has(key));
        this.keys.s = this.keyBindings.backward.some((key) => this.pressedKeys.has(key));
        this.keys.d = this.keyBindings.right.some((key) => this.pressedKeys.has(key));
        this.keys.space = this.keyBindings.jump.some((key) => this.pressedKeys.has(key));
        this.keys.shift = this.keyBindings.sprint.some((key) => this.pressedKeys.has(key));
        this.keys.f = this.keyBindings.attack.some((key) => this.pressedKeys.has(key));
    }

    _connect() {
        if (this.isConnected) return;

        if (this.enableKeyboard && this.inputTarget) {
            this.inputTarget.addEventListener('keydown', this.onKeyDown);
            this.inputTarget.addEventListener('keyup', this.onKeyUp);
        }

        this.isConnected = true;
    }

    _disconnect() {
        if (!this.isConnected) return;

        if (this.enableKeyboard && this.inputTarget) {
            this.inputTarget.removeEventListener('keydown', this.onKeyDown);
            this.inputTarget.removeEventListener('keyup', this.onKeyUp);
        }

        this.pressedKeys.clear();
        this._syncKeyboardState();

        this.isConnected = false;
    }

    onKeyDown(event) {
        const key = this._normalizeKeyName(event.key);
        if (!this.pressedKeys.has(key)) {
            // 边沿检测：仅在首次按下时触发攻击，持续按住不连击。
            const attackKeys = this.keyBindings.attack || [];
            if (attackKeys.includes(key)) {
                this.attackJustPressed = true;
            }
        }
        this.pressedKeys.add(key);
        this._syncKeyboardState();
    }

    onKeyUp(event) {
        const key = this._normalizeKeyName(event.key);
        this.pressedKeys.delete(key);
        this._syncKeyboardState();
    }

    setJoystickMove(moveX = 0, moveZ = 0) {
        const rawX = Number(moveX);
        const rawZ = Number(moveZ);
        const clampedX = Number.isFinite(rawX) ? Math.max(-1, Math.min(1, rawX)) : 0;
        const clampedZ = Number.isFinite(rawZ) ? Math.max(-1, Math.min(1, rawZ)) : 0;

        const length = Math.hypot(clampedX, clampedZ);
        // 摇杆死区：小幅抖动不产生移动。
        if (length < this.joystickDeadZone) {
            this.joystick.moveX = 0;
            this.joystick.moveZ = 0;
            return;
        }

        if (length > 1) {
            this.joystick.moveX = clampedX / length;
            this.joystick.moveZ = clampedZ / length;
            return;
        }

        this.joystick.moveX = clampedX;
        this.joystick.moveZ = clampedZ;
    }

    setJoystickJump(isPressed) {
        this.joystick.jumpPressed = Boolean(isPressed);
    }

    setJoystickSprint(isPressed) {
        this.joystick.sprintPressed = Boolean(isPressed);
    }

    // 边沿检测：只在首次按下时触发攻击，持续调用 true 不连击。
    setJoystickAttack(isPressed) {
        const pressed = Boolean(isPressed);
        if (pressed && !this.joystick.attackPressed) {
            this.attackJustPressed = true;
        }
        this.joystick.attackPressed = pressed;
    }

    _resetJoystickInput() {
        this.joystick.moveX = 0;
        this.joystick.moveZ = 0;
        this.joystick.jumpPressed = false;
        this.joystick.sprintPressed = false;
        this.joystick.attackPressed = false;
    }

    _getInputIntent() {
        const keyboardX = (this.keys.d ? 1 : 0) + (this.keys.a ? -1 : 0);
        const keyboardZ = (this.keys.s ? 1 : 0) + (this.keys.w ? -1 : 0);
        const joystickX = this.enableJoystick ? this.joystick.moveX : 0;
        const joystickZ = this.enableJoystick ? this.joystick.moveZ : 0;
        const joystickJump = this.enableJoystick ? this.joystick.jumpPressed : false;
        const moveX = Math.max(-1, Math.min(1, keyboardX + joystickX));
        const moveZ = Math.max(-1, Math.min(1, keyboardZ + joystickZ));

        // 摇杆推满（幅度 > 0.7）自动判定为冲刺，无需额外按钮；也支持显式调用 setJoystickSprint()。
        const joystickMagnitude = Math.hypot(joystickX, joystickZ);
        const joystickSprint = this.enableJoystick && (this.joystick.sprintPressed || joystickMagnitude > 0.7);

        const attack = this.attackJustPressed;
        this.attackJustPressed = false;

        return {
            moveX,
            moveZ,
            jump: this.keys.space || joystickJump,
            sprint: this.keys.shift || joystickSprint,
            attack
        };
    }

    // 批量设置碰撞目标。建议把场景中所有可碰撞对象传进来。
    setCollisionTargets(targets = []) {
        if (!Array.isArray(targets)) {
            this.collisionTargets = [];
            return;
        }

        this.collisionTargets = targets.filter(Boolean);
    }

    addCollisionTarget(target) {
        if (!target) return;
        if (!this.collisionTargets.includes(target)) {
            this.collisionTargets.push(target);
        }
    }

    removeCollisionTarget(target) {
        if (!target) return;
        this.collisionTargets = this.collisionTargets.filter((item) => item !== target);
    }

    clearCollisionTargets() {
        this.collisionTargets = [];
    }

    _setCharacter(character) {
        this.character = character;
        this.animationMixer = character ? new THREE.AnimationMixer(character) : null;
        this.currentAction = null;
        this._rebuildAnimationActions();

        if (character && !this.isConnected) {
            this._connect();
        }
    }

    getState() {
        return {
            hasCharacter: Boolean(this.character),
            isOnGround: this.isOnGround,
            velocity: this.velocity.clone(),
            position: this.character ? this.character.position.clone() : null,
            rotationY: this.character ? this.character.rotation.y : null,
            moveSpeed: this.moveSpeed,
            jumpSpeed: this.jumpSpeed,
            gravity: this.gravity
        };
    }

    reset({ position = null, rotationY = null, keepVelocity = false } = {}) {
        if (!this.character) return;

        if (position) {
            this.character.position.copy(position);
        } else {
            this.character.position.copy(this.fallResetPosition);
        }

        if (rotationY !== null && rotationY !== undefined) {
            const nextRotation = Number(rotationY);
            if (Number.isFinite(nextRotation)) {
                this.character.rotation.y = nextRotation;
            }
        }

        if (!keepVelocity) {
            this.velocity.set(0, 0, 0);
        }

        this.isOnGround = false;
        this.isAttacking = false;
        this.attackJustPressed = false;
        this.pressedKeys.clear();
        this._syncKeyboardState();
        this._resetJoystickInput();

        if (this.animationActions.idle) {
            this._playManagedAnimation(this.animationActions.idle);
        }
    }

    // 仅加载玩家动作资源（Idle/Walk/Run/Jump/Attack），不负责加载角色模型本体。
    // skipAnimation: true 时跳过 FBX 加载，移动/碰撞/重力功能不受影响。
    async init({ skipAnimation = false } = {}) {
        if (skipAnimation) {
            return {
                mixer: this.animationMixer,
                animations: this.animationActions
            };
        }

        const loader = new FBXLoader();

        this.animationClips = {
            idle: null,
            walk: null,
            run: null,
            jump: null,
            attack: null
        };

        const entries = Object.entries(this.defaultAnimationUrls);

        await Promise.all(entries.map(async ([name, url]) => {
            try {
                const object = await loader.loadAsync(url);
                if (!object.animations || object.animations.length === 0) return;
                const lowerName = name.toLowerCase();
                if (lowerName in this.animationClips) {
                    this.animationClips[lowerName] = object.animations[0];
                }
            } catch (error) {
                console.error(`${name} animation load error:`, error);
            }
        }));

        this._rebuildAnimationActions();

        if (this.animationActions.idle) {
            this._playManagedAnimation(this.animationActions.idle);
        }

        return {
            mixer: this.animationMixer,
            animations: this.animationActions
        };
    }

    // 动作 clip 和角色绑定后才能生成可播放的 action。
    _rebuildAnimationActions() {
        this.animationActions.idle = null;
        this.animationActions.walk = null;
        this.animationActions.run = null;
        this.animationActions.jump = null;
        this.animationActions.attack = null;

        if (!this.animationMixer || !this.animationClips) return;

        if (this.animationClips.idle) {
            this.animationActions.idle = this.animationMixer.clipAction(this.animationClips.idle);
        }
        if (this.animationClips.walk) {
            this.animationActions.walk = this.animationMixer.clipAction(this.animationClips.walk);
        }
        if (this.animationClips.run) {
            this.animationActions.run = this.animationMixer.clipAction(this.animationClips.run);
        }
        if (this.animationClips.jump) {
            this.animationActions.jump = this.animationMixer.clipAction(this.animationClips.jump);
            this.animationActions.jump.clampWhenFinished = true;
            this.animationActions.jump.setLoop(THREE.LoopOnce, 1);
        }
        if (this.animationClips.attack) {
            this.animationActions.attack = this.animationMixer.clipAction(this.animationClips.attack);
            this.animationActions.attack.clampWhenFinished = true;
            this.animationActions.attack.setLoop(THREE.LoopOnce, 1);
        }
    }

    _playManagedAnimation(action) {
        if (!action) return;
        if (this.currentAction === action) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(this.animationFadeDuration);
        }

        action.reset().fadeIn(this.animationFadeDuration).play();
        this.currentAction = action;
    }

    _updateManagedAnimation(delta, state) {
        const { idle, walk, run, jump, attack } = this.animationActions;

        // 攻击动画播完后解除攻击状态
        if (this.isAttacking && attack && !attack.isRunning()) {
            this.isAttacking = false;
        }

        if (!this.isAttacking) {
            if (state.didJump && jump) {
                this._playManagedAnimation(jump);
            } else if (state.isOnGround) {
                if (state.isMoving) {
                    if (state.isSprinting && run) {
                        this._playManagedAnimation(run);
                    } else if (walk) {
                        this._playManagedAnimation(walk);
                    } else if (run) {
                        // walk 不可用时回退到 run
                        this._playManagedAnimation(run);
                    }
                } else if (idle) {
                    this._playManagedAnimation(idle);
                }
            }
        }

        if (this.animationMixer) {
            this.animationMixer.update(delta);
        }
    }

    // 从角色脚下向下发射射线，判断是否落地并做轻微贴地修正。
    _checkGroundCollision(model = this.character) {
        if (!model || this.collisionTargets.length === 0) return false;

        const origin = model.position.clone();
        origin.y += this.groundProbeHeight;

        this.groundRaycaster.set(origin, this.downDirection);
        const intersects = this.groundRaycaster.intersectObjects(this.collisionTargets, true);

        if (intersects.length > 0) {
            const distance = intersects[0].distance - this.groundProbeHeight;
            if (distance < this.groundSnapDistance) {
                model.position.y = intersects[0].point.y;
                return true;
            }
        }

        return false;
    }

    // 朝移动方向发射射线，判断前方是否有墙体阻挡。
    _checkWallCollision(direction, position = this.character ? this.character.position : null) {
        if (this.collisionTargets.length === 0 || !position || direction.lengthSq() === 0) return false;

        const origin = position.clone();
        origin.y += 1;

        this.wallRaycaster.set(origin, direction.clone().normalize());
        const intersects = this.wallRaycaster.intersectObjects(this.collisionTargets, true);

        return intersects.length > 0 && intersects[0].distance < this.wallCheckDistance;
    }

    // 每帧更新入口：输入 -> 移动/跳跃/攻击 -> 碰撞 -> 动作。
    // 不传 intent 时，使用内部输入（键盘 + 外部喂入的摇杆状态）。
    update(delta, intent = null) {
        if (!this.character) {
            return { isMoving: false, isOnGround: false, didJump: false };
        }

        this.velocity.y += this.gravity * delta;

        const resolvedIntent = intent || this._getInputIntent();

        const moveX = Number(resolvedIntent.moveX || 0);
        const moveZ = Number(resolvedIntent.moveZ || 0);
        const jump = Boolean(resolvedIntent.jump);
        const sprint = Boolean(resolvedIntent.sprint);
        const attackTriggered = Boolean(resolvedIntent.attack);
        const yaw = resolvedIntent.yaw !== undefined
            ? Number(resolvedIntent.yaw)
            : (this.getCameraYaw ? this.getCameraYaw() : 0);

        // 触发攻击：攻击中不能再次触发，直到当前攻击动画播完。
        if (attackTriggered && !this.isAttacking && this.animationActions.attack) {
            this.isAttacking = true;
            this._playManagedAnimation(this.animationActions.attack);
            if (this.onAttack) {
                this.onAttack({ character: this.character, controller: this });
            }
        }

        this.tmpInputDirection.set(0, 0, 0);
        this.tmpInputDirection.x = moveX;
        this.tmpInputDirection.z = moveZ;

        const isMoving = this.tmpInputDirection.lengthSq() > 0;

        if (isMoving) {
            if (this.tmpInputDirection.lengthSq() > 1) {
                this.tmpInputDirection.normalize();
            }

            // 把本地输入方向按相机 yaw 旋转到世界坐标。
            const angle = -yaw;
            this.tmpWorldDirection.x = this.tmpInputDirection.x * Math.cos(angle) - this.tmpInputDirection.z * Math.sin(angle);
            this.tmpWorldDirection.z = this.tmpInputDirection.x * Math.sin(angle) + this.tmpInputDirection.z * Math.cos(angle);

            const nextPosX = this.character.position.x + this.tmpWorldDirection.x * this.moveSpeed * delta;
            const nextPosZ = this.character.position.z + this.tmpWorldDirection.z * this.moveSpeed * delta;

            if (!this._checkWallCollision(this.tmpWorldDirection)) {
                this.character.position.x = nextPosX;
                this.character.position.z = nextPosZ;
            }

            // 让角色始终朝向当前移动方向，避免"后背朝前走"。
            this.character.rotation.y = Math.atan2(this.tmpWorldDirection.x, this.tmpWorldDirection.z);
        }

        let didJump = false;
        if (jump && this.isOnGround) {
            this.velocity.y = this.jumpSpeed;
            this.isOnGround = false;
            didJump = true;
        }

        this.character.position.y += this.velocity.y * delta;

        this.isOnGround = this._checkGroundCollision();
        if (this.isOnGround) {
            this.velocity.y = 0;
        }

        if (this.character.position.y < this.fallResetY) {
            this.character.position.copy(this.fallResetPosition);
            this.velocity.y = 0;
            this.isOnGround = false;
        }

        const state = {
            isMoving,
            isOnGround: this.isOnGround,
            didJump,
            isSprinting: sprint
        };

        this._updateManagedAnimation(delta, state);

        return state;
    }

    destroy() {
        this._disconnect();
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationMixer = null;
        }
        this.collisionTargets = [];
        this.character = null;
    }
}