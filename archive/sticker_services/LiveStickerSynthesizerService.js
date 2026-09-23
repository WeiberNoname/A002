/**
 * LiveStickerSynthesizerService.js
 * 
 * Real-time LINE-Style Sticker Synthesis Engine.
 * Features:
 * - 370x320 LINE Creators Market standard resolution with safe margin
 * - Real-time 3D mascot offscreen snapshot extraction
 * - Thick die-cut white outline silhouette generator with soft drop-shadow
 * - 5 Distinct Style Archetypes: Kawaii Pop, Manga Comic, Cyber Glitch, Prism Hologram, 8-Bit Pixel
 * - PixelProcessor graphical shaders (Chromatic Aberration, Halftone, Pixelate, Holo Sheen)
 * - AnimatedTextSynthesizer integration (Wave, Impact, Glitch, Rainbow)
 * - Direct clipboard copy bridge for instant pasting into LINE / Discord / Slack
 */

import { convertToTraditionalChinese } from '../core/director/ChineseGlyphConverter.js';
import { PixelProcessor } from './PixelProcessor.js';
import { AnimatedTextSynthesizer } from './AnimatedTextSynthesizer.js';

export const STICKER_STYLES = {
  kawaii: {
    id: 'kawaii',
    name: 'Kawaii Pop',
    icon: '🌸',
    textAnim: 'wave',
    hasSheen: true
  },
  manga: {
    id: 'manga',
    name: 'Manga Comic',
    icon: '💥',
    textAnim: 'impact',
    hasSpeedlines: true,
    hasHalftone: true
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyber Glitch',
    icon: '⚡',
    textAnim: 'glitch',
    hasChromatic: true
  },
  hologram: {
    id: 'hologram',
    name: 'Prism Hologram',
    icon: '🌈',
    textAnim: 'rainbow',
    hasHoloSheen: true
  },
  retro_pixel: {
    id: 'retro_pixel',
    name: '8-Bit Retro',
    icon: '👾',
    textAnim: 'wave',
    pixelate: 3
  }
};

export const STICKER_EMOTIONS = {
  cheer: {
    badge: '👍',
    bannerGradient: ['#f59e0b', '#d97706'],
    particles: ['✨', '⭐', '🎉'],
    defaultCaption: { en: 'Good Job!', 'zh-TW': '太棒了！', 'zh-CN': '太棒了！', ja: 'いいね！' }
  },
  salute: {
    badge: '⚓',
    bannerGradient: ['#3b82f6', '#1d4ed8'],
    particles: ['⭐', '✨', '⚡'],
    defaultCaption: { en: 'Roger That!', 'zh-TW': '遵命！', 'zh-CN': '收到！', ja: '了解！' }
  },
  happy: {
    badge: '💖',
    bannerGradient: ['#ec4899', '#be185d'],
    particles: ['💖', '✨', '🌸'],
    defaultCaption: { en: 'Thank You!', 'zh-TW': '謝謝你！', 'zh-CN': '谢谢你！', ja: 'ありがとう！' }
  },
  shy: {
    badge: '💧',
    bannerGradient: ['#a855f7', '#7e22ce'],
    particles: ['🌸', '💦', '✨'],
    defaultCaption: { en: 'U-um...', 'zh-TW': '那個……', 'zh-CN': '那个……', ja: 'あ、あの…' }
  },
  cool: {
    badge: '😎',
    bannerGradient: ['#06b6d4', '#0e7490'],
    particles: ['✨', '🕶️', '⚡'],
    defaultCaption: { en: 'No Problem', 'zh-TW': '沒問題', 'zh-CN': '没问题', ja: '任せて' }
  },
  sleepy: {
    badge: '💤',
    bannerGradient: ['#6366f1', '#4338ca'],
    particles: ['💤', '🌙', '⭐'],
    defaultCaption: { en: 'Good Night', 'zh-TW': '晚安囉', 'zh-CN': '晚安啦', ja: 'おやすみ' }
  },
  thinking: {
    badge: '❓',
    bannerGradient: ['#8b5cf6', '#6d28d9'],
    particles: ['💡', '❓', '✨'],
    defaultCaption: { en: 'Let Me Think', 'zh-TW': '我想想…', 'zh-CN': '我想想…', ja: 'うーん…' }
  },
  brave: {
    badge: '🛡️',
    bannerGradient: ['#ef4444', '#b91c1c'],
    particles: ['🔥', '⚔️', '✨'],
    defaultCaption: { en: 'I Got This!', 'zh-TW': '交給我！', 'zh-CN': '交给我！', ja: '任せろ！' }
  }
};

export class LiveStickerSynthesizerService {
  constructor(deps = {}) {
    this.threeScene = deps.scene || null;
    this.threeCamera = deps.camera || null;
    this.threeRenderer = deps.renderer || null;
    this.characterGroup = deps.characterGroup || null;
    this.innerModelGroup = deps.innerModelGroup || null;
    this.currentSettings = deps.currentSettings || {};
    this.THREE = deps.THREE || (typeof window !== 'undefined' ? window.THREE : null);

    this.animatedTextSynthesizer = new AnimatedTextSynthesizer({
      fontSize: 22
    });
  }

  /**
   * Generates a complete 370x320 LINE-spec sticker PNG data URL.
   * @param {Object} options
   * @param {string} [options.emotion='cheer'] STICKER_EMOTIONS key
   * @param {string} [options.style='kawaii'] STICKER_STYLES key
   * @param {string} [options.caption] Custom text banner caption
   * @param {string} [options.language] Language code (en, zh-TW, zh-CN, ja)
   * @returns {Promise<string>} Base64 PNG Data URL
   */
  async generateSticker(options = {}) {
    const emotionKey = (options.emotion || 'cheer').toLowerCase();
    const styleKey = (options.style || 'kawaii').toLowerCase();
    const styleConfig = STICKER_STYLES[styleKey] || STICKER_STYLES.kawaii;
    const config = STICKER_EMOTIONS[emotionKey] || STICKER_EMOTIONS.cheer;
    const lang = options.language || this.currentSettings?.aiResponseLanguage || 'en';

    // 1. Resolve Caption Text
    let rawCaption = options.caption;
    if (!rawCaption || !rawCaption.trim()) {
      if (config.defaultCaption[lang]) {
        rawCaption = config.defaultCaption[lang];
      } else if (lang.startsWith('zh')) {
        rawCaption = config.defaultCaption['zh-TW'];
      } else {
        rawCaption = config.defaultCaption.en;
      }
    }

    if (lang === 'zh-TW' || this.currentSettings?.aiResponseLanguage === 'zh-TW') {
      rawCaption = convertToTraditionalChinese(rawCaption);
    }

    // 2. LINE Sticker Standard Canvas: 370 x 320 px
    let canvas = null;
    if (typeof document !== 'undefined' && document.createElement) {
      canvas = document.createElement('canvas');
    } else {
      // Mock / headless test environment
      return `data:image/png;base64,mockSticker_${emotionKey}_${encodeURIComponent(rawCaption)}`;
    }
    const width = 370;
    const height = 320;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return `data:image/png;base64,mockSticker_${emotionKey}_${encodeURIComponent(rawCaption)}`;

    ctx.clearRect(0, 0, width, height);

    // 3. Render Background Graphic Accents (e.g. Manga Speedlines)
    if (styleConfig.hasSpeedlines) {
      this._renderMangaSpeedlines(ctx, width / 2, height / 2 - 20, Math.max(width, height) * 0.7);
    }

    // 4. Acquire Mascot Snapshot (3D Viewport or Procedural Robot)
    const isProcedural = options.source === 'procedural_robot' || options.forceProcedural;
    const mascotCanvas = await this._captureMascotSnapshot(width, height, isProcedural, emotionKey);

    // 5. Render Die-Cut White Outline & Shadow via PixelProcessor
    PixelProcessor.applyDieCutOutline(ctx, mascotCanvas, width, height, {
      strokeRadius: 7,
      color: '#ffffff',
      shadow: true
    });

    // 6. Draw the Crisp Mascot Character over the outline
    ctx.drawImage(mascotCanvas, 0, 0, width, height);

    // 7. Manga Halftone Overlay if applicable
    if (styleConfig.hasHalftone) {
      PixelProcessor.applyHalftone(ctx, width, height, { spacing: 8, maxRadius: 2.2, color: 'rgba(0, 0, 0, 0.08)' });
    }

    // 8. Draw Comic Emotion Badges & Floating Elements
    this._renderEmotionDecorations(ctx, config, width, height);

    // 9. Render Styled Speech Ribbon / Banner Frame 0
    this._renderSpeechBanner(ctx, rawCaption, config, styleConfig, width, height, 0);

    // 10. Shaders & Overlays: Sheen, Holo, Glitch, Pixelate
    if (styleConfig.hasSheen) {
      this._renderGlossySheen(ctx, width, height);
    }
    if (styleConfig.hasHoloSheen) {
      PixelProcessor.applyHolographicSheen(ctx, width, height, 0.35);
    }
    if (styleConfig.hasChromatic) {
      PixelProcessor.applyChromaticAberration(ctx, width, height, 3);
    }
    if (styleConfig.pixelate) {
      PixelProcessor.pixelate(ctx, width, height, styleConfig.pixelate);
    }

    return canvas.toDataURL ? canvas.toDataURL('image/png') : `data:image/png;base64,sticker_${emotionKey}`;
  }

  /**
   * Captures the mascot image onto an offscreen canvas.
   * Supports live 3D Three.js snapshot or procedural robot generator.
   */
  async _captureMascotSnapshot(width, height, forceProcedural = false, emotion = 'cheer') {
    if (typeof document === 'undefined') return null;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');

    const THREE = this.THREE || (typeof window !== 'undefined' ? window.THREE : null);
    if (!forceProcedural && this.threeRenderer && this.threeScene && THREE) {
      try {
        const stickerCam = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
        stickerCam.position.set(0, 0.35, 3.6);
        stickerCam.lookAt(0, 0.15, 0);

        const currentClearColor = new THREE.Color();
        this.threeRenderer.getClearColor(currentClearColor);
        const currentClearAlpha = this.threeRenderer.getClearAlpha();

        this.threeRenderer.setClearColor(0x000000, 0);
        this.threeRenderer.render(this.threeScene, stickerCam);

        offCtx.drawImage(this.threeRenderer.domElement, 0, 0, width, height);

        this.threeRenderer.setClearColor(currentClearColor, currentClearAlpha);
        if (this.threeCamera) {
          this.threeRenderer.render(this.threeScene, this.threeCamera);
        }
        return offscreen;
      } catch (e) {
        // Fall back to procedural robot
      }
    }

    // Procedural Fallback / Dedicated Robot Mascot Portrait
    this._renderProceduralMascot(offCtx, width, height, emotion);
    return offscreen;
  }

  /**
   * Creates an interactive live animated sticker loop on a target canvas element.
   * Perfect for in-chat animated stickers and preview drawers.
   */
  async createAnimatedStickerCanvas(targetCanvas, options = {}) {
    if (!targetCanvas) return null;
    const width = 370;
    const height = 320;
    targetCanvas.width = width;
    targetCanvas.height = height;

    const emotionKey = (options.emotion || 'cheer').toLowerCase();
    const styleKey = (options.style || 'kawaii').toLowerCase();
    const styleConfig = STICKER_STYLES[styleKey] || STICKER_STYLES.kawaii;
    const config = STICKER_EMOTIONS[emotionKey] || STICKER_EMOTIONS.cheer;
    const lang = options.language || this.currentSettings?.aiResponseLanguage || 'en';

    let rawCaption = options.caption;
    if (!rawCaption || !rawCaption.trim()) {
      rawCaption = config.defaultCaption[lang] || config.defaultCaption.en;
    }
    if (lang === 'zh-TW' || this.currentSettings?.aiResponseLanguage === 'zh-TW') {
      rawCaption = convertToTraditionalChinese(rawCaption);
    }

    const isProcedural = options.source === 'procedural_robot' || options.forceProcedural;
    const mascotCanvas = await this._captureMascotSnapshot(width, height, isProcedural, emotionKey);

    // Static background renderer pass
    const drawBackground = (ctx, w, h, frame, total) => {
      if (styleConfig.hasSpeedlines) {
        this._renderMangaSpeedlines(ctx, w / 2, h / 2 - 20, Math.max(w, h) * 0.7);
      }
      if (mascotCanvas) {
        PixelProcessor.applyDieCutOutline(ctx, mascotCanvas, w, h, { strokeRadius: 7, color: '#ffffff' });
        ctx.drawImage(mascotCanvas, 0, 0, w, h);
      }
      this._renderEmotionDecorations(ctx, config, w, h);
      this._renderSpeechBannerBase(ctx, rawCaption, config, styleConfig, w, h);

      if (styleConfig.hasSheen) {
        this._renderGlossySheen(ctx, w, h);
      }
      if (styleConfig.hasHoloSheen) {
        const phase = total > 0 ? (frame / total) : 0;
        PixelProcessor.applyHolographicSheen(ctx, w, h, phase);
      }
    };

    return this.animatedTextSynthesizer.createAnimatedLoop(
      targetCanvas,
      drawBackground,
      rawCaption,
      {
        style: styleConfig.textAnim,
        y: height - 28,
        fontSize: 21,
        totalFrames: 18,
        fps: 24
      }
    );
  }

  /**
   * Renders dramatic manga focus lines (集中線).
   */
  _renderMangaSpeedlines(ctx, cx, cy, radius, numLines = 32) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const widthAngle = 0.024;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle - widthAngle, angle + widthAngle);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Renders decorative comic elements (sparkles, hearts, badges) around the character.
   */
  _renderEmotionDecorations(ctx, config, width, height) {
    ctx.save();
    ctx.font = '28px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Top-right feature badge
    if (config.badge) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 6;
      ctx.fillText(config.badge, width - 48, 56);
    }

    // Floating particles
    if (Array.isArray(config.particles)) {
      ctx.font = '22px "Segoe UI Emoji", sans-serif';
      if (config.particles[0]) ctx.fillText(config.particles[0], 52, 60);
      if (config.particles[1]) ctx.fillText(config.particles[1], width / 2, 34);
      if (config.particles[2]) ctx.fillText(config.particles[2], 56, 150);
    }
    ctx.restore();
  }

  /**
   * Renders glossy peel-off vinyl sheen reflection over the top half of the sticker.
   */
  _renderGlossySheen(ctx, width, height) {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, width, height * 0.6);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.06)');
    grad.addColorStop(0.45, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height * 0.6);
    ctx.restore();
  }

  /**
   * Renders base speech bubble background plate.
   */
  _renderSpeechBannerBase(ctx, text, config, styleConfig, width, height) {
    if (!text || !text.trim()) return;

    ctx.save();
    const bannerHeight = 44;
    const bannerWidth = Math.min(width - 32, Math.max(160, text.length * 20 + 44));
    const bx = (width - bannerWidth) / 2;
    const by = height - bannerHeight - 10;
    const radius = 14;

    // Outer die-cut outline
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx - 3, by - 3, bannerWidth + 6, bannerHeight + 6, radius + 2);
    } else {
      ctx.rect(bx - 3, by - 3, bannerWidth + 6, bannerHeight + 6);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Banner Gradient Fill
    const grad = ctx.createLinearGradient(bx, by, bx + bannerWidth, by + bannerHeight);
    grad.addColorStop(0, config.bannerGradient[0]);
    grad.addColorStop(1, config.bannerGradient[1]);

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx, by, bannerWidth, bannerHeight, radius);
    } else {
      ctx.rect(bx, by, bannerWidth, bannerHeight);
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // Top highlight bevel
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bx + 4, by + 3, bannerWidth - 8, bannerHeight / 2 - 2, radius - 2);
    } else {
      ctx.rect(bx + 4, by + 3, bannerWidth - 8, bannerHeight / 2 - 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fill();
    ctx.restore();
  }

  /**
   * Renders speech ribbon + dynamic text frame.
   */
  _renderSpeechBanner(ctx, text, config, styleConfig, width, height, frameIndex = 0) {
    this._renderSpeechBannerBase(ctx, text, config, styleConfig, width, height);

    // Dynamic Typography
    const textY = height - 32;
    this.animatedTextSynthesizer.renderTextFrame(ctx, text, {
      style: styleConfig.textAnim || 'wave',
      x: width / 2,
      y: textY,
      fontSize: 21,
      fillColor: '#ffffff',
      strokeColor: '#1e1b4b',
      outerStrokeColor: '#ffffff'
    }, frameIndex, 12);
  }

  /**
   * Procedural Robot Mascot Portrait with emotion-reactive cyber features.
   */
  _renderProceduralMascot(ctx, width, height, emotion = 'cheer') {
    if (!ctx) return;
    ctx.save();
    const cx = width / 2;
    const cy = height / 2 - 12;

    // 1. Antenna with glowing LED orb
    ctx.beginPath();
    ctx.moveTo(cx, cy - 62);
    ctx.lineTo(cx, cy - 90);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    const antennaColors = {
      cheer: '#f59e0b',
      salute: '#0ea5e9',
      happy: '#ec4899',
      shy: '#f43f5e',
      cool: '#06b6d4',
      sleepy: '#64748b',
      thinking: '#a855f7',
      brave: '#ef4444'
    };
    const orbColor = antennaColors[emotion] || '#38bdf8';

    ctx.beginPath();
    ctx.arc(cx, cy - 95, 11, 0, Math.PI * 2);
    ctx.fillStyle = orbColor;
    ctx.shadowColor = orbColor;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 2. Robot Ear Audio Sensors / Bolts
    const drawEarBolt = (bx) => {
      ctx.beginPath();
      ctx.ellipse(bx, cy - 8, 14, 22, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#475569';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(bx, cy - 8, 6, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = orbColor;
      ctx.fill();
    };
    drawEarBolt(cx - 68);
    drawEarBolt(cx + 68);

    // 3. Robot Torso / Chassis
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cx - 52, cy + 55, 104, 75, 18);
    } else {
      ctx.rect(cx - 52, cy + 55, 104, 75);
    }
    const bodyGrad = ctx.createLinearGradient(cx - 52, cy + 55, cx + 52, cy + 130);
    bodyGrad.addColorStop(0, '#0284c7');
    bodyGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Chest Reactor / Power Core
    ctx.beginPath();
    ctx.arc(cx, cy + 90, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 90, 10, 0, Math.PI * 2);
    ctx.fillStyle = orbColor;
    ctx.shadowColor = orbColor;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // 4. Robot Head Chassis (Rounded Cyber Box)
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cx - 64, cy - 65, 128, 115, 26);
    } else {
      ctx.rect(cx - 64, cy - 65, 128, 115);
    }
    const headGrad = ctx.createLinearGradient(cx - 64, cy - 65, cx + 64, cy + 50);
    headGrad.addColorStop(0, '#f8fafc');
    headGrad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#64748b';
    ctx.stroke();

    // 5. Visor Screen
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cx - 52, cy - 44, 104, 52, 14);
    } else {
      ctx.rect(cx - 52, cy - 44, 104, 52);
    }
    ctx.fillStyle = '#090d16';
    ctx.fill();

    // 6. Emotion-Reactive LED Eyes & Visor Graphics
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = orbColor;
    ctx.fillStyle = orbColor;
    ctx.shadowColor = orbColor;
    ctx.shadowBlur = 8;

    if (emotion === 'cool') {
      // Sleek Sunglasses Visor
      ctx.beginPath();
      ctx.moveTo(cx - 44, cy - 32);
      ctx.lineTo(cx + 44, cy - 32);
      ctx.lineTo(cx + 36, cy - 8);
      ctx.lineTo(cx - 36, cy - 8);
      ctx.closePath();
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();
      // Reflection highlight line
      ctx.beginPath();
      ctx.moveTo(cx - 38, cy - 28);
      ctx.lineTo(cx - 10, cy - 12);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    } else if (emotion === 'happy' || emotion === 'shy') {
      // Curved Smiling Eyes ^ ^
      ctx.beginPath();
      ctx.arc(cx - 24, cy - 14, 11, Math.PI * 1.1, Math.PI * 1.9, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 24, cy - 14, 11, Math.PI * 1.1, Math.PI * 1.9, false);
      ctx.stroke();
      // Shy Rosy LED Cheeks
      ctx.beginPath();
      ctx.arc(cx - 34, cy + 24, 7, 0, Math.PI * 2);
      ctx.arc(cx + 34, cy + 24, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.fill();
    } else if (emotion === 'sleepy') {
      // Horizontal Closed Eye Bars - -
      ctx.beginPath();
      ctx.moveTo(cx - 34, cy - 18);
      ctx.lineTo(cx - 14, cy - 18);
      ctx.moveTo(cx + 14, cy - 18);
      ctx.lineTo(cx + 34, cy - 18);
      ctx.stroke();
      // Zzz floating
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText('z', cx + 42, cy - 36);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('Z', cx + 52, cy - 50);
    } else if (emotion === 'brave') {
      // Angular Fierce Brow Eyes \ /
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy - 24);
      ctx.lineTo(cx - 14, cy - 14);
      ctx.lineTo(cx - 36, cy - 12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 36, cy - 24);
      ctx.lineTo(cx + 14, cy - 14);
      ctx.lineTo(cx + 36, cy - 12);
      ctx.closePath();
      ctx.fill();
    } else if (emotion === 'salute') {
      // Focused Sharp Eyes + Salute Arm
      ctx.beginPath();
      ctx.ellipse(cx - 22, cy - 18, 9, 11, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 22, cy - 18, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // Robotic Salute Arm
      ctx.beginPath();
      ctx.moveTo(cx + 46, cy + 65);
      ctx.lineTo(cx + 72, cy + 10);
      ctx.lineTo(cx + 56, cy - 45);
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();
    } else {
      // Standard / Cheer Glowing Cyber Eyes
      ctx.beginPath();
      ctx.ellipse(cx - 24, cy - 18, 10, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 24, cy - 18, 10, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      // Catchlights
      ctx.beginPath();
      ctx.arc(cx - 21, cy - 22, 3.5, 0, Math.PI * 2);
      ctx.arc(cx + 27, cy - 22, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();

    // 7. Digital LED Mouth Matrix
    ctx.save();
    ctx.strokeStyle = orbColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy + 26, 12, 0.1 * Math.PI, 0.9 * Math.PI, false);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  /**
   * Writes PNG Blob to the system clipboard.
   */
  async copyStickerToClipboard(dataUrl) {
    if (typeof navigator === 'undefined' || !navigator.clipboard || !window.ClipboardItem) {
      throw new Error('ClipboardItem API not supported in current environment');
    }
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const item = new window.ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  }
}
