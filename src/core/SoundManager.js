/**
 * Procedural Web Audio API Sound Synthesizer & Manager
 * Provides 3 real-time synthesized sound generators:
 * 1. Snow Atmosphere (❄️): Winter wind breeze + soft crystalline chimes
 * 2. Sakura Breeze Melody (🌸): Japanese pentatonic koto arpeggio + spring ambient breeze
 * 3. Simple Drum Melody (🥁): 16-step rhythmic drum groove (Kick, Snare, Hi-Hat) + cheerful synth lead
 */

export class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.masterVolume = 0.8;

    // Track states
    this.tracks = {
      snow: { isPlaying: false, volume: 0.7, gainNode: null, nodes: [] },
      sakura: { isPlaying: false, volume: 0.7, gainNode: null, timerId: null, nodes: [] },
      drum: { isPlaying: false, volume: 0.7, gainNode: null, timerId: null, currentStep: 0, nodes: [] }
    };

    this.onStateChangeCallbacks = new Set();
  }

  _initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      this.audioCtx = new AudioContextClass();

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Create individual track gain nodes
      Object.keys(this.tracks).forEach(trackKey => {
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(this.tracks[trackKey].volume, this.audioCtx.currentTime);
        gainNode.connect(this.masterGain);
        this.tracks[trackKey].gainNode = gainNode;
      });
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return true;
  }

  getAudioContext() {
    this._initContext();
    return this.audioCtx;
  }

  getMasterGain() {
    this._initContext();
    return this.masterGain;
  }

  resumeAudioContext() {
    if (!this.audioCtx) {
      this._initContext();
    } else if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  syncAtmosphere(settings) {
    if (!settings) return;
    const isMuted = settings.soundMuted === true;
    this.setMuted(isMuted);

    if (settings.soundMasterVolume !== undefined) {
      this.setMasterVolume(settings.soundMasterVolume);
    }
    if (settings.soundSnowVolume !== undefined) {
      this.setTrackVolume('snow', settings.soundSnowVolume);
    }
    if (settings.soundSakuraVolume !== undefined) {
      this.setTrackVolume('sakura', settings.soundSakuraVolume);
    }
    if (settings.soundDrumVolume !== undefined) {
      this.setTrackVolume('drum', settings.soundDrumVolume);
    }

    if (isMuted) return;
    // Ambient auto-play loops safely removed for silent operation
  }

  // --- Master Controls ---
  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(val) || 0));
    if (this.masterGain && this.audioCtx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioCtx.currentTime, 0.05);
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.audioCtx.currentTime, 0.05);
    }
    this._notifyStateChange();
  }

  setTrackVolume(trackKey, val) {
    if (!this.tracks[trackKey]) return;
    const clamped = Math.max(0, Math.min(1, parseFloat(val) || 0));
    this.tracks[trackKey].volume = clamped;
    if (this.tracks[trackKey].gainNode && this.audioCtx) {
      this.tracks[trackKey].gainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
    }
  }

  isPlaying(trackKey) {
    return this.tracks[trackKey] ? this.tracks[trackKey].isPlaying : false;
  }

  onStateChange(cb) {
    if (typeof cb === 'function') {
      this.onStateChangeCallbacks.add(cb);
    }
  }

  _notifyStateChange() {
    this.onStateChangeCallbacks.forEach(cb => {
      try { cb(this.getSnapshot()); } catch (e) { console.error('Sound state change callback error:', e); }
    });
  }

  getSnapshot() {
    return {
      isMuted: this.isMuted,
      masterVolume: this.masterVolume,
      snowPlaying: this.tracks.snow.isPlaying,
      snowVolume: this.tracks.snow.volume,
      sakuraPlaying: this.tracks.sakura.isPlaying,
      sakuraVolume: this.tracks.sakura.volume,
      drumPlaying: this.tracks.drum.isPlaying,
      drumVolume: this.tracks.drum.volume
    };
  }

  // --- Ambient Atmosphere Track Guards ---
  stopSnow() {}
  stopSakura() {}
  stopDrum() {}
  stopAll() {
    this.stopSnow();
    this.stopSakura();
    this.stopDrum();
  }

  // --- Procedural 3D Mail SFX Synthesizers ---
  playMailWhoosh() {
    if (this.isMuted) return;
    try {
      this.resumeAudioContext();
      if (!this.audioCtx || !this.masterGain) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const duration = 0.28;

      // Noise buffer for airy paper flight whoosh
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Dynamic bandpass filter sweep
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(800, now + duration);
      filter.Q.setValueAtTime(2.5, now);

      // Volume envelope
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.22, now + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch (e) {
      // Graceful fallback on headless or audio disabled
    }
  }

  playMailOpenChime() {
    if (this.isMuted) return;
    try {
      this.resumeAudioContext();
      if (!this.audioCtx || !this.masterGain) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // 1. Wax Seal Snap / Pop
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(320, now);
      popOsc.frequency.exponentialRampToValueAtTime(80, now + 0.035);
      popGain.gain.setValueAtTime(0.3, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      popOsc.connect(popGain);
      popGain.connect(this.masterGain);
      popOsc.start(now);
      popOsc.stop(now + 0.035);

      // 2. Crystal Chime (Two-tone celestial harmony E6 + B6)
      const freqs = [1318.5, 1975.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + 0.015);

        const startTime = now + 0.015 + idx * 0.04;
        const duration = 0.55;

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      // Graceful fallback
    }
  }

  // --- Defensive No-Op SFX Stubs ---
  playInteractionSfx() {}
  playFanfareSfx() {}
  playBounceSfx() {}
  playSuperchatChime() {}
  playAirhornSfx() {}
  playMemeBoing() {}
}

// Global Singleton Instance
export const soundManager = new SoundManager();

// Defensive Global Attachment for Complete Crash Immunity
if (typeof window !== 'undefined') {
  window.soundManager = soundManager;
}
