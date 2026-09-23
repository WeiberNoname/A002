/**
 * PixelProcessor.js
 * 
 * High-performance 2D Canvas & ImageData pixel-level processing engine.
 * Provides GPU-like graphical shaders without external dependencies:
 * - Chromatic Aberration (RGB channel split & horizontal glitch displacement)
 * - Retro 8-bit / Pixel Art downsampler (Nearest-neighbor quantization)
 * - Manga Halftone Screen-Tone dot generator
 * - Holographic Iridescent Sheen overlay
 * - Multi-layer Die-Cut silhouette generator with soft drop-shadow
 */

export class PixelProcessor {
  /**
   * Applies horizontal Chromatic Aberration (RGB channel displacement).
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {number} [offset=3] Horizontal pixel shift
   * @returns {boolean} Success
   */
  static applyChromaticAberration(ctx, width, height, offset = 3) {
    if (!ctx || !ctx.getImageData || width <= 0 || height <= 0) return false;
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      const copy = new Uint8ClampedArray(data);

      const shift = Math.max(1, Math.round(offset));
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
          const idx = (rowOffset + x) * 4;
          if (copy[idx + 3] === 0 && data[idx + 3] === 0) continue;

          // Red channel sampled from (x - shift)
          const rx = Math.max(0, x - shift);
          const rIdx = (rowOffset + rx) * 4;
          data[idx] = copy[rIdx];

          // Blue channel sampled from (x + shift)
          const bx = Math.min(width - 1, x + shift);
          const bIdx = (rowOffset + bx) * 4;
          data[idx + 2] = copy[bIdx + 2];
        }
      }
      ctx.putImageData(imgData, 0, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Downscales and upscales using nearest-neighbor interpolation to create an authentic 8-bit pixel art effect.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {number} [pixelSize=4] Block size
   * @returns {boolean} Success
   */
  static pixelate(ctx, width, height, pixelSize = 4) {
    if (!ctx || !ctx.drawImage || typeof document === 'undefined') return false;
    try {
      const size = Math.max(1, Math.floor(pixelSize));
      if (size === 1) return true;

      const sw = Math.max(1, Math.ceil(width / size));
      const sh = Math.max(1, Math.ceil(height / size));

      const offscreen = document.createElement('canvas');
      offscreen.width = sw;
      offscreen.height = sh;
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return false;

      offCtx.imageSmoothingEnabled = false;
      offCtx.drawImage(ctx.canvas, 0, 0, sw, sh);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(offscreen, 0, 0, width, height);
      ctx.restore();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Applies a manga/comic book halftone screen-tone dot matrix pattern over opaque pixels.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {Object} [options]
   * @param {number} [options.spacing=6] Spacing between dots
   * @param {number} [options.maxRadius=2.4] Max dot radius
   * @param {string} [options.color='rgba(0,0,0,0.18)'] Dot color
   */
  static applyHalftone(ctx, width, height, options = {}) {
    if (!ctx || width <= 0 || height <= 0) return false;
    const spacing = options.spacing || 7;
    const maxRadius = options.maxRadius || 2.5;
    const color = options.color || 'rgba(0, 0, 0, 0.16)';

    ctx.save();
    ctx.fillStyle = color;
    for (let y = spacing / 2; y < height; y += spacing) {
      for (let x = spacing / 2; x < width; x += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, maxRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    return true;
  }

  /**
   * Applies an iridescent holographic gradient sheen sweep over the canvas content.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   * @param {number} [phase=0.0] Motion phase 0.0 to 1.0
   */
  static applyHolographicSheen(ctx, width, height, phase = 0.0) {
    if (!ctx || width <= 0 || height <= 0) return false;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';

    const p = (phase % 1.0 + 1.0) % 1.0;
    const sx = (p * 2 - 0.5) * width;
    const grad = ctx.createLinearGradient(sx - width * 0.4, 0, sx + width * 0.4, height);

    grad.addColorStop(0.0, 'rgba(255, 154, 158, 0.0)');
    grad.addColorStop(0.2, 'rgba(254, 207, 239, 0.28)');
    grad.addColorStop(0.4, 'rgba(161, 196, 253, 0.35)');
    grad.addColorStop(0.6, 'rgba(194, 233, 251, 0.35)');
    grad.addColorStop(0.8, 'rgba(212, 252, 121, 0.28)');
    grad.addColorStop(1.0, 'rgba(150, 230, 161, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return true;
  }

  /**
   * Renders a multi-angle dilated white die-cut sticker outline with ambient drop shadow.
   * @param {CanvasRenderingContext2D} targetCtx
   * @param {HTMLCanvasElement|CanvasImageSource} sourceCanvas
   * @param {number} width
   * @param {number} height
   * @param {Object} [options]
   * @param {number} [options.strokeRadius=7] Dilation thickness
   * @param {string} [options.color='#ffffff'] Outline color
   * @param {boolean} [options.shadow=true] Whether to apply soft drop-shadow
   */
  static applyDieCutOutline(targetCtx, sourceCanvas, width, height, options = {}) {
    if (!targetCtx || !sourceCanvas || typeof document === 'undefined') return false;
    const strokeRadius = options.strokeRadius !== undefined ? options.strokeRadius : 7;
    const color = options.color || '#ffffff';
    const hasShadow = options.shadow !== false;

    targetCtx.save();
    if (hasShadow) {
      targetCtx.shadowColor = 'rgba(0, 0, 0, 0.32)';
      targetCtx.shadowBlur = 10;
      targetCtx.shadowOffsetX = 0;
      targetCtx.shadowOffsetY = 4;
    }

    const outlineCanvas = document.createElement('canvas');
    outlineCanvas.width = width;
    outlineCanvas.height = height;
    const outCtx = outlineCanvas.getContext('2d');
    if (!outCtx) {
      targetCtx.restore();
      return false;
    }

    // Mask solid silhouette
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) {
      targetCtx.restore();
      return false;
    }

    tempCtx.drawImage(sourceCanvas, 0, 0);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, width, height);

    // 16-angle circular dilation
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.cos(angle) * strokeRadius;
      const dy = Math.sin(angle) * strokeRadius;
      outCtx.drawImage(tempCanvas, dx, dy);
    }
    outCtx.drawImage(tempCanvas, 0, 0);

    targetCtx.drawImage(outlineCanvas, 0, 0);
    targetCtx.restore();
    return true;
  }
}
