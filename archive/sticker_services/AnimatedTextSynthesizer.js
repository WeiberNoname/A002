/**
 * AnimatedTextSynthesizer.js
 * 
 * Multi-frame dynamic typography and animated text engine for stickers and UI.
 * Styles:
 * - 'wave': Kawaii phase-shifted sine-wave letter bounce
 * - 'impact': Manga comic elastic scale pop-in with dynamic burst
 * - 'glitch': Cyberpunk horizontal slice displacement & RGB jitter
 * - 'rainbow': Holographic cycling color sweep
 */

import { PixelProcessor } from './PixelProcessor.js';

export class AnimatedTextSynthesizer {
  constructor(deps = {}) {
    this.defaultFontSize = deps.fontSize || 22;
    this.fontFamily = deps.fontFamily || '"Segoe UI", "PingFang TC", "Microsoft JhengHei", "Noto Sans", sans-serif';
  }

  /**
   * Renders a single frame of animated text onto a 2D canvas context.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {Object} options
   * @param {string} [options.style='wave'] 'wave' | 'impact' | 'glitch' | 'rainbow'
   * @param {number} [options.x] Target center X
   * @param {number} [options.y] Target center Y
   * @param {number} [options.fontSize=22]
   * @param {string} [options.fillColor='#ffffff']
   * @param {string} [options.strokeColor='#1e1b4b']
   * @param {string} [options.outerStrokeColor='#ffffff']
   * @param {number} [frameIndex=0] Current frame
   * @param {number} [totalFrames=12] Total frames in loop
   */
  renderTextFrame(ctx, text, options = {}, frameIndex = 0, totalFrames = 12) {
    if (!ctx || !text || typeof text !== 'string') return;
    const style = (options.style || 'wave').toLowerCase();
    const x = options.x !== undefined ? options.x : (ctx.canvas ? ctx.canvas.width / 2 : 185);
    const y = options.y !== undefined ? options.y : (ctx.canvas ? ctx.canvas.height - 32 : 288);
    const fontSize = options.fontSize || this.defaultFontSize;
    const t = totalFrames > 0 ? (frameIndex % totalFrames) / totalFrames : 0;

    ctx.save();
    ctx.font = `900 ${fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    switch (style) {
      case 'impact':
        this._renderImpactFrame(ctx, text, x, y, fontSize, options, t);
        break;
      case 'glitch':
        this._renderGlitchFrame(ctx, text, x, y, fontSize, options, t, frameIndex);
        break;
      case 'rainbow':
        this._renderRainbowFrame(ctx, text, x, y, fontSize, options, t);
        break;
      case 'wave':
      default:
        this._renderWaveFrame(ctx, text, x, y, fontSize, options, t);
        break;
    }

    ctx.restore();
  }

  /**
   * Kawaii Sine-Wave floating bounce: each character oscillates with a phase shift.
   */
  _renderWaveFrame(ctx, text, centerX, centerY, fontSize, options, t) {
    const chars = Array.from(text);
    const totalChars = chars.length;
    const charWidth = fontSize * 0.95;
    const totalWidth = totalChars * charWidth;
    let startX = centerX - totalWidth / 2 + charWidth / 2;

    const strokeColor = options.strokeColor || '#1e1b4b';
    const outerStrokeColor = options.outerStrokeColor || '#ffffff';
    const fillColor = options.fillColor || '#ffffff';

    for (let i = 0; i < totalChars; i++) {
      const char = chars[i];
      // Phase offset per letter
      const phase = (t * Math.PI * 2) + (i * 0.55);
      const offsetY = Math.sin(phase) * 6;
      const charX = startX + i * charWidth;
      const charY = centerY + offsetY;

      // 1. Outer White Die-Cut Contour
      ctx.lineWidth = 8;
      ctx.strokeStyle = outerStrokeColor;
      ctx.lineJoin = 'round';
      ctx.strokeText(char, charX, charY);

      // 2. Inner Dark Contrast Stroke
      ctx.lineWidth = 4;
      ctx.strokeStyle = strokeColor;
      ctx.strokeText(char, charX, charY);

      // 3. Crisp Fill
      ctx.fillStyle = fillColor;
      ctx.fillText(char, charX, charY);
    }
  }

  /**
   * Manga Comic Impact Burst: elastic pop-in scale curve.
   */
  _renderImpactFrame(ctx, text, centerX, centerY, fontSize, options, t) {
    // Elastic ease cycle
    const scale = 1.0 + Math.sin(t * Math.PI * 2) * 0.12;
    const strokeColor = options.strokeColor || '#991b1b';
    const outerStrokeColor = options.outerStrokeColor || '#ffffff';
    const fillColor = options.fillColor || '#fef08a';

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Comic exclamation drop-shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    // Outermost thick white stroke
    ctx.lineWidth = 10;
    ctx.strokeStyle = outerStrokeColor;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 0);

    ctx.shadowColor = 'transparent';

    // Bold Manga red/dark stroke
    ctx.lineWidth = 5;
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, 0, 0);

    // Punchy yellow/orange gradient fill
    const grad = ctx.createLinearGradient(0, -fontSize / 2, 0, fontSize / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, fillColor);
    grad.addColorStop(1, '#f97316');
    ctx.fillStyle = grad;
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }

  /**
   * Cyberpunk Horizontal Slice & RGB Jitter.
   */
  _renderGlitchFrame(ctx, text, centerX, centerY, fontSize, options, t, frameIndex) {
    const isGlitching = (frameIndex % 4 === 1 || frameIndex % 4 === 2);
    const shiftX = isGlitching ? ((frameIndex % 2 === 0 ? 3 : -3)) : 0;
    const strokeColor = options.strokeColor || '#082f49';
    const outerStrokeColor = options.outerStrokeColor || '#06b6d4';

    // 1. Cyan Glow / Outer Outline
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = isGlitching ? 12 : 6;
    ctx.lineWidth = 6;
    ctx.strokeStyle = outerStrokeColor;
    ctx.strokeText(text, centerX + shiftX, centerY);
    ctx.shadowColor = 'transparent';

    // 2. Inner Dark Outline
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, centerX, centerY);

    // 3. Neon Fill
    ctx.fillStyle = isGlitching ? '#e0f2fe' : '#ffffff';
    ctx.fillText(text, centerX, centerY);

    // Sliced glitch sub-band if active
    if (isGlitching && ctx.canvas) {
      PixelProcessor.applyChromaticAberration(ctx, ctx.canvas.width, ctx.canvas.height, 2);
    }
  }

  /**
   * Holographic Iridescent Color-Cycling Sweep.
   */
  _renderRainbowFrame(ctx, text, centerX, centerY, fontSize, options, t) {
    const strokeColor = options.strokeColor || '#312e81';
    const outerStrokeColor = options.outerStrokeColor || '#ffffff';

    // 1. Outer White Die-Cut
    ctx.lineWidth = 8;
    ctx.strokeStyle = outerStrokeColor;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, centerX, centerY);

    // 2. Inner Dark Contrast Stroke
    ctx.lineWidth = 4;
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, centerX, centerY);

    // 3. Shimmering Rainbow Linear Gradient
    const grad = ctx.createLinearGradient(centerX - 100, centerY, centerX + 100, centerY);
    const h1 = (t * 360) % 360;
    const h2 = (t * 360 + 120) % 360;
    const h3 = (t * 360 + 240) % 360;
    grad.addColorStop(0, `hsl(${h1}, 95%, 70%)`);
    grad.addColorStop(0.5, `hsl(${h2}, 95%, 75%)`);
    grad.addColorStop(1, `hsl(${h3}, 95%, 70%)`);

    ctx.fillStyle = grad;
    ctx.fillText(text, centerX, centerY);
  }

  /**
   * Creates an interactive live animated loop on an HTML5 canvas element.
   * @param {HTMLCanvasElement} canvas
   * @param {Function} drawBackgroundFn Draw static mascot + background onto canvas
   * @param {string} text
   * @param {Object} [options]
   * @returns {Object} Loop controller with .play(), .pause(), and .destroy()
   */
  createAnimatedLoop(canvas, drawBackgroundFn, text, options = {}) {
    if (!canvas || typeof window === 'undefined') {
      return { play: () => {}, pause: () => {}, destroy: () => {} };
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return { play: () => {}, pause: () => {}, destroy: () => {} };

    let isRunning = true;
    let animId = null;
    let frame = 0;
    const totalFrames = options.totalFrames || 18;
    const fps = options.fps || 24;
    const frameInterval = 1000 / fps;
    let lastTime = 0;

    const tick = (now) => {
      if (!isRunning) return;
      if (!lastTime) lastTime = now;
      const elapsed = now - lastTime;

      if (elapsed >= frameInterval) {
        lastTime = now - (elapsed % frameInterval);

        // 1. Draw static background & mascot
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (typeof drawBackgroundFn === 'function') {
          drawBackgroundFn(ctx, canvas.width, canvas.height, frame, totalFrames);
        }

        // 2. Render dynamic animated text frame
        this.renderTextFrame(ctx, text, options, frame, totalFrames);

        frame = (frame + 1) % totalFrames;
      }

      animId = window.requestAnimationFrame(tick);
    };

    animId = window.requestAnimationFrame(tick);

    return {
      play: () => {
        if (!isRunning) {
          isRunning = true;
          lastTime = 0;
          animId = window.requestAnimationFrame(tick);
        }
      },
      pause: () => {
        isRunning = false;
        if (animId) window.cancelAnimationFrame(animId);
      },
      destroy: () => {
        isRunning = false;
        if (animId) window.cancelAnimationFrame(animId);
      }
    };
  }
}
