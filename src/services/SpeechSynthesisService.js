/**
 * SpeechSynthesisService.js
 * High-performance zero-latency offline Voice Synthesis (TTS) Engine.
 * Powered by native Web Speech API in Electron / Windows.
 * Automatically resolves localized voice packs, controls pitch/speed/volume,
 * and tracks real-time speaking state for mascot lip-sync animation.
 */

export class SpeechSynthesisService {
  constructor() {
    this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.voices = [];
    this.isSpeakingState = false;
    this.activeUtterance = null;
    this.onStateChangeCallbacks = new Set();

    if (this.synth) {
      this.loadVoices();
      if (typeof this.synth.onvoiceschanged !== 'undefined') {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return [];
    try {
      this.voices = this.synth.getVoices() || [];
    } catch (e) {
      this.voices = [];
    }
    return this.voices;
  }

  /**
   * Registers a callback for speech state changes (speaking vs silent).
   * @param {Function} cb - (isSpeaking: boolean) => void
   */
  onStateChange(cb) {
    if (typeof cb === 'function') {
      this.onStateChangeCallbacks.add(cb);
    }
  }

  /**
   * Unregisters a state change callback.
   */
  offStateChange(cb) {
    this.onStateChangeCallbacks.delete(cb);
  }

  _notifyState(isSpeaking) {
    this.isSpeakingState = isSpeaking;
    this.onStateChangeCallbacks.forEach(cb => {
      try {
        cb(isSpeaking);
      } catch (e) {
        console.error('[SpeechSynthesisService] Error in state callback:', e);
      }
    });
  }

  /**
   * Returns all available voices with detected gender and language metadata.
   * @returns {Array<{ voice: SpeechSynthesisVoice, name: string, lang: string, gender: string, default: boolean }>}
   */
  getInstalledVoices() {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }
    return (this.voices || []).map(v => {
      const lower = (v.name + ' ' + v.lang).toLowerCase();
      let gender = 'neutral';
      if (
        lower.includes('zira') || lower.includes('female') || lower.includes('woman') ||
        lower.includes('girl') || lower.includes('huihui') || lower.includes('hanhan') ||
        lower.includes('yaoyao') || lower.includes('haruka') || lower.includes('ayumi') ||
        lower.includes('sayaka') || lower.includes('hedda') || lower.includes('hortense') ||
        lower.includes('elsa') || lower.includes('helena') || lower.includes('sabina') ||
        lower.includes('yating') || lower.includes('xiaoxiao') || lower.includes('jenny')
      ) {
        gender = 'female';
      } else if (
        lower.includes('david') || lower.includes('male') || lower.includes('man') ||
        lower.includes('boy') || lower.includes('mark') || lower.includes('ichiro') ||
        lower.includes('kangkang') || lower.includes('stefan') || lower.includes('paul') ||
        lower.includes('cosimo') || lower.includes('guy') || lower.includes('george')
      ) {
        gender = 'male';
      }
      return {
        voice: v,
        name: v.name,
        lang: v.lang,
        default: !!v.default,
        gender
      };
    });
  }

  /**
   * Sets app settings reference for default voice preferences.
   * @param {Object} settings
   */
  setSettings(settings) {
    this.currentSettings = settings;
  }

  /**
   * Finds the best matching voice for a given language code and optional criteria.
   * @param {string} langCode - e.g. 'zh-TW', 'zh-CN', 'zh', 'ja', 'en', 'es', etc.
   * @param {Object} [options={}] - { voiceName?: string, gender?: string, preset?: string }
   * @returns {SpeechSynthesisVoice|null}
   */
  getBestVoice(langCode = 'en', options = {}) {
    if (!this.voices || this.voices.length === 0) {
      this.loadVoices();
    }
    if (!this.voices || this.voices.length === 0) return null;

    // A. Explicit voice name takes priority
    if (options && options.voiceName && options.voiceName !== 'auto') {
      const matchByName = this.voices.find(v => v.name === options.voiceName || v.name.toLowerCase().includes(options.voiceName.toLowerCase()));
      if (matchByName) return matchByName;
    }

    const norm = (langCode || 'en').toLowerCase().replace('_', '-');
    const primary = norm.split('-')[0];

    const isFemale = options && (
      options.gender === 'female' ||
      options.preset === 'female_anime' ||
      options.preset === 'female_natural' ||
      options.preset === 'cute_pet'
    );
    const isMale = options && (
      options.gender === 'male' ||
      options.preset === 'male_gentle'
    );

    const isFemaleVoice = (v) => {
      const lower = (v.name + ' ' + v.lang).toLowerCase();
      return (
        lower.includes('zira') || lower.includes('female') || lower.includes('woman') ||
        lower.includes('girl') || lower.includes('huihui') || lower.includes('hanhan') ||
        lower.includes('yaoyao') || lower.includes('haruka') || lower.includes('ayumi') ||
        lower.includes('sayaka') || lower.includes('hedda') || lower.includes('hortense') ||
        lower.includes('elsa') || lower.includes('helena') || lower.includes('sabina') ||
        lower.includes('yating') || lower.includes('xiaoxiao') || lower.includes('jenny')
      );
    };

    const isMaleVoice = (v) => {
      const lower = (v.name + ' ' + v.lang).toLowerCase();
      return (
        lower.includes('david') || lower.includes('male') || lower.includes('man') ||
        lower.includes('boy') || lower.includes('mark') || lower.includes('ichiro') ||
        lower.includes('kangkang') || lower.includes('stefan') || lower.includes('paul') ||
        lower.includes('cosimo') || lower.includes('guy') || lower.includes('george')
      );
    };

    // If gender preference requested, try to find matching voice in requested language
    if (isFemale) {
      const femaleMatch = this.voices.find(v => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return (vLang === norm || vLang.startsWith(primary)) && isFemaleVoice(v);
      });
      if (femaleMatch) return femaleMatch;

      const anyFemale = this.voices.find(v => isFemaleVoice(v));
      if (anyFemale && norm.startsWith('en')) return anyFemale;
    } else if (isMale) {
      const maleMatch = this.voices.find(v => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return (vLang === norm || vLang.startsWith(primary)) && isMaleVoice(v);
      });
      if (maleMatch) return maleMatch;
    }

    // Standard fallback matching (preserves 100% test compatibility)
    // 1. Exact BCP-47 match
    const exact = this.voices.find(v => v.lang.toLowerCase().replace('_', '-') === norm);
    if (exact) return exact;

    // 2. Specific script matches (e.g. zh-TW vs zh-CN)
    if (norm === 'zh-tw' || norm === 'zh-hant' || norm === 'tw') {
      const twVoice = this.voices.find(v => {
        const l = v.lang.toLowerCase();
        return l.includes('zh-tw') || l.includes('zh-hk') || l.includes('hant') || v.name.includes('Taiwan') || v.name.includes('Traditional');
      });
      if (twVoice) return twVoice;
    }

    if (norm === 'zh' || norm === 'zh-cn' || norm === 'zh-hans') {
      const cnVoice = this.voices.find(v => {
        const l = v.lang.toLowerCase();
        return l.includes('zh-cn') || l.includes('chinese') || v.name.includes('China') || v.name.includes('Mandarin');
      });
      if (cnVoice) return cnVoice;
    }

    // 3. Primary language code prefix (e.g. 'ja' matches 'ja-JP')
    const prefixMatch = this.voices.find(v => v.lang.toLowerCase().startsWith(primary));
    if (prefixMatch) return prefixMatch;

    // 4. Default voice
    return this.voices.find(v => v.default) || this.voices[0] || null;
  }

  /**
   * Speaks the provided text using native speech synthesis.
   * @param {string} text - Text to speak
   * @param {Object} options
   * @param {string} [options.language='auto']
   * @param {number} [options.pitch] - Range: 0.5 to 2.0
   * @param {number} [options.rate] - Range: 0.5 to 2.0
   * @param {number} [options.volume] - Range: 0.0 to 1.0
   * @param {string} [options.voiceName]
   * @param {string} [options.preset]
   * @param {string} [options.gender]
   * @param {Function} [options.onStart]
   * @param {Function} [options.onEnd]
   * @param {Function} [options.onError]
   */
  speak(text, {
    language = 'auto',
    pitch = null,
    rate = null,
    volume = null,
    voiceName = null,
    preset = null,
    gender = null,
    onStart = () => {},
    onEnd = () => {},
    onError = () => {}
  } = {}) {
    if (!this.synth || !text || !text.trim()) {
      return false;
    }

    // Stop any ongoing speech cleanly
    this.stop();

    const cleanText = text.replace(/[*_~`#\[\]\(\)]/g, '').trim();
    if (!cleanText) return false;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Determine voice options from parameters or currentSettings fallback
      const effectiveVoiceName = voiceName || this.currentSettings?.mascotVoiceName || 'auto';
      const effectivePreset = preset || this.currentSettings?.mascotVoicePreset || 'female_anime';
      const effectiveGender = gender || (effectivePreset.startsWith('female') ? 'female' : (effectivePreset.startsWith('male') ? 'male' : 'auto'));

      const voice = this.getBestVoice(language, {
        voiceName: effectiveVoiceName,
        preset: effectivePreset,
        gender: effectiveGender
      });

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else if (language && language !== 'auto') {
        utterance.lang = language;
      }

      // Resolve pitch, rate, and volume
      const rawPitch = pitch !== null && pitch !== undefined ? pitch : (this.currentSettings?.mascotVoicePitch ?? 1.25);
      const rawRate = rate !== null && rate !== undefined ? rate : (this.currentSettings?.mascotVoiceRate ?? 1.0);
      const rawVolume = volume !== null && volume !== undefined ? volume : 1.0;

      utterance.pitch = Math.max(0.5, Math.min(2.0, parseFloat(rawPitch) || 1.0));
      utterance.rate = Math.max(0.5, Math.min(2.0, parseFloat(rawRate) || 1.0));
      utterance.volume = Math.max(0.0, Math.min(1.0, parseFloat(rawVolume) !== undefined ? parseFloat(rawVolume) : 1.0));

      utterance.onstart = () => {
        this._notifyState(true);
        onStart();
      };

      utterance.onend = () => {
        this.activeUtterance = null;
        this._notifyState(false);
        onEnd();
      };

      utterance.onerror = (err) => {
        this.activeUtterance = null;
        this._notifyState(false);
        onError(err);
      };

      this.activeUtterance = utterance;
      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.error('[SpeechSynthesisService] Failed to speak utterance:', err);
      this._notifyState(false);
      return false;
    }
  }

  /**
   * Stops any currently playing speech synthesis.
   */
  stop() {
    if (!this.synth) return;
    try {
      this.synth.cancel();
    } catch (e) {}
    this.activeUtterance = null;
    this._notifyState(false);
  }

  /**
   * Returns whether the speech engine is currently active.
   */
  isSpeaking() {
    return this.isSpeakingState || (this.synth ? this.synth.speaking : false);
  }
}

export const speechSynthesisService = new SpeechSynthesisService();
