import * as THREE from 'three';

class AudioManager {
    constructor() {
        this._listener = null;
        this._context = null;

        this._masterGain = null;
        this._bgmGain = null;
        this._sfxGain = null;
        this._voiceGain = null;

        this._masterVolume = 1;
        this._bgmVolume = 1;
        this._sfxVolume = 1;
        this._voiceVolume = 1;
        this._muted = false;

        this._bgmAudio = null;

        this._sfxPool = {};
        this._sfxPoolMaxSize = 6;

        this._bufferCache = {};
        this._loadPromises = {};

        this._paused = false;
        this._playingBeforePause = new Set();

        this._unlocked = false;
        this._unlockHandler = this._unlock.bind(this);
    }

    // Attach the listener to the camera so positional audio follows the view.
    init(camera = null) {
        this._listener = new THREE.AudioListener();
        if (camera) camera.add(this._listener);
        this._context = this._listener.context;

        // Audio route: source -> audio.gain -> categoryGain -> masterGain -> destination.
        this._masterGain = this._context.createGain();
        this._masterGain.gain.value = this._masterVolume;
        this._masterGain.connect(this._context.destination);

        this._bgmGain = this._context.createGain();
        this._bgmGain.gain.value = this._bgmVolume;
        this._bgmGain.connect(this._masterGain);

        this._sfxGain = this._context.createGain();
        this._sfxGain.gain.value = this._sfxVolume;
        this._sfxGain.connect(this._masterGain);

        this._voiceGain = this._context.createGain();
        this._voiceGain.gain.value = this._voiceVolume;
        this._voiceGain.connect(this._masterGain);

        // Browsers require a user gesture before AudioContext can start.
        if (this._context.state === 'suspended') {
            ['click', 'keydown', 'touchstart'].forEach(e => {
                document.addEventListener(e, this._unlockHandler, { once: true });
            });
        } else {
            this._unlocked = true;
        }

        return this;
    }

    _unlock() {
        if (this._unlocked || !this._context) return;
        this._context.resume().then(() => { this._unlocked = true; });
    }

    // THREE.Audio connects audio.gain to the listener master output by default.
    // Re-route through category gain nodes to avoid double routing.
    _routeToGain(audio, gainNode) {
        audio.gain.disconnect();
        audio.gain.connect(gainNode);
    }

    async preload(urls) {
        const list = Array.isArray(urls) ? urls : [urls];
        await Promise.all(list.map(url => this._loadBuffer(url)));
    }

    _loadBuffer(url) {
        if (this._bufferCache[url]) return Promise.resolve(this._bufferCache[url]);
        if (this._loadPromises[url]) return this._loadPromises[url];

        this._loadPromises[url] = new Promise((resolve, reject) => {
            new THREE.AudioLoader().load(url, buffer => {
                this._bufferCache[url] = buffer;
                delete this._loadPromises[url];
                resolve(buffer);
            }, undefined, reject);
        });

        return this._loadPromises[url];
    }

    async playBGM(url, { volume = 1, loop = true, fadeIn = 0.5 } = {}) {
        if (!this._listener) return;
        const buffer = await this._loadBuffer(url);

        if (this._bgmAudio && this._bgmAudio.isPlaying) {
            const old = this._bgmAudio;
            this._fadeTo(old, 0, fadeIn, () => { if (old.isPlaying) old.stop(); });
        }

        const audio = new THREE.Audio(this._listener);
        this._routeToGain(audio, this._bgmGain);
        audio.setBuffer(buffer);
        audio.setLoop(loop);
        audio.setVolume(0);
        audio.play();
        this._fadeTo(audio, volume, fadeIn);
        this._bgmAudio = audio;
    }

    stopBGM(fadeOut = 0.5) {
        if (!this._bgmAudio || !this._bgmAudio.isPlaying) return;
        const audio = this._bgmAudio;
        this._bgmAudio = null;
        this._fadeTo(audio, 0, fadeOut, () => { if (audio.isPlaying) audio.stop(); });
    }

    _fadeTo(audio, targetVolume, duration, onComplete) {
        if (!this._context || duration <= 0) {
            audio.setVolume(targetVolume);
            if (onComplete) onComplete();
            return;
        }
        const gain = audio.gain.gain;
        gain.setValueAtTime(gain.value, this._context.currentTime);
        gain.linearRampToValueAtTime(targetVolume, this._context.currentTime + duration);
        if (onComplete) setTimeout(onComplete, duration * 1000);
    }

    async playSFX(url, { volume = 1 } = {}) {
        if (!this._listener) return null;
        const buffer = await this._loadBuffer(url);

        if (!this._sfxPool[url]) this._sfxPool[url] = [];
        const pool = this._sfxPool[url];

        let audio = pool.find(a => !a.isPlaying);

        if (!audio) {
            if (pool.length < this._sfxPoolMaxSize) {
                audio = new THREE.Audio(this._listener);
                this._routeToGain(audio, this._sfxGain);
                audio.setBuffer(buffer);
                pool.push(audio);
            } else {
                // Reuse the oldest instance when the pool is full.
                audio = pool[0];
                if (audio.isPlaying) audio.stop();
            }
        }

        audio.setVolume(volume);
        audio.play();
        return audio;
    }

    async playVoice(url, { volume = 1 } = {}) {
        if (!this._listener) return null;
        const buffer = await this._loadBuffer(url);

        const audio = new THREE.Audio(this._listener);
        this._routeToGain(audio, this._voiceGain);
        audio.setBuffer(buffer);
        audio.setVolume(volume);
        audio.play();
        return audio;
    }

    // Attach 3D SFX to object3D and remove it automatically after playback.
    async playSFX3D(url, object3D, { volume = 1, refDistance = 5, rolloffFactor = 1, maxDistance = 100 } = {}) {
        if (!this._listener || !object3D) return null;
        const buffer = await this._loadBuffer(url);

        const audio = new THREE.PositionalAudio(this._listener);
        this._routeToGain(audio, this._sfxGain);
        audio.setBuffer(buffer);
        audio.setRefDistance(refDistance);
        audio.setRolloffFactor(rolloffFactor);
        audio.setMaxDistance(maxDistance);
        audio.setVolume(volume);
        object3D.add(audio);
        audio.play();

        setTimeout(() => {
            if (audio.isPlaying) audio.stop();
            object3D.remove(audio);
        }, (buffer.duration + 0.1) * 1000);

        return audio;
    }

    setMasterVolume(value) {
        this._masterVolume = Math.max(0, Math.min(1, Number(value)));
        if (this._masterGain) {
            this._masterGain.gain.value = this._muted ? 0 : this._masterVolume;
        }
    }

    setBGMVolume(value) {
        this._bgmVolume = Math.max(0, Math.min(1, Number(value)));
        if (this._bgmGain) this._bgmGain.gain.value = this._bgmVolume;
    }

    setSFXVolume(value) {
        this._sfxVolume = Math.max(0, Math.min(1, Number(value)));
        if (this._sfxGain) this._sfxGain.gain.value = this._sfxVolume;
    }

    setVoiceVolume(value) {
        this._voiceVolume = Math.max(0, Math.min(1, Number(value)));
        if (this._voiceGain) this._voiceGain.gain.value = this._voiceVolume;
    }

    setSFXPoolMaxSize(value) {
        const next = Math.max(1, Math.floor(Number(value)));
        if (Number.isFinite(next)) this._sfxPoolMaxSize = next;
    }

    setMuted(muted) {
        this._muted = Boolean(muted);
        if (this._masterGain) {
            this._masterGain.gain.value = this._muted ? 0 : this._masterVolume;
        }
    }

    toggleMute() {
        this.setMuted(!this._muted);
    }

    pause() {
        if (this._paused) return;
        this._paused = true;
        this._playingBeforePause.clear();

        const collect = audio => {
            if (audio && audio.isPlaying) {
                this._playingBeforePause.add(audio);
                audio.pause();
            }
        };

        collect(this._bgmAudio);
        Object.values(this._sfxPool).forEach(pool => pool.forEach(collect));

        if (this._context) this._context.suspend();
    }

    resume() {
        if (!this._paused) return;
        this._paused = false;

        const resumeAll = () => {
            this._playingBeforePause.forEach(audio => {
                try { audio.play(); } catch (_) {}
            });
            this._playingBeforePause.clear();
        };

        if (this._context && this._context.state === 'suspended') {
            this._context.resume().then(resumeAll);
        } else {
            resumeAll();
        }
    }

    getListener() {
        return this._listener;
    }

    destroy() {
        this.stopBGM(0);

        Object.values(this._sfxPool).forEach(pool => {
            pool.forEach(audio => { if (audio.isPlaying) audio.stop(); });
        });
        this._sfxPool = {};

        ['click', 'keydown', 'touchstart'].forEach(e => {
            document.removeEventListener(e, this._unlockHandler);
        });

        this._bufferCache = {};
        this._loadPromises = {};
        this._playingBeforePause.clear();
        this._bgmAudio = null;
        this._listener = null;
        this._context = null;
    }
}

export default AudioManager;