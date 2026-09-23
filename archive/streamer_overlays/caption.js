/**
 * caption.js
 * Minimal, clean controller for the independent floating live caption window.
 * Keeps only the streaming green flash indicator and clean subtitle display,
 * while seamlessly receiving appearance styling (background color, transparency,
 * font color, font size) directly from the Studio configuration panel.
 */

let currentFontSize = 16;
let currentBgColor = '#0b0f19';
let currentOpacity = 0.90;
let currentFontColor = '#ffffff';

const container = document.getElementById('caption-window-container');
const emptyHint = document.getElementById('caption-empty-hint');
const captionText = document.getElementById('caption-text');
const seqCounter = document.getElementById('caption-seq-counter');
const btnClose = document.getElementById('btn-caption-close');

/**
 * Converts a hex color string (#rrggbb or #rgb) to RGB components.
 */
function hexToRgb(hex) {
  let c = (hex || '#0b0f19').replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 11, g: 15, b: 25 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Applies background color, opacity, font color, and font size.
 */
function applyStyling(opts = {}, save = true) {
  if (opts.bgColor !== undefined) currentBgColor = opts.bgColor;
  if (opts.opacity !== undefined) currentOpacity = Math.max(0, Math.min(1, parseFloat(opts.opacity)));
  if (opts.fontColor !== undefined) currentFontColor = opts.fontColor;
  if (opts.fontSize !== undefined) currentFontSize = Math.max(10, Math.min(48, parseInt(opts.fontSize, 10)));

  const rgb = hexToRgb(currentBgColor);
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty('--caption-bg-color', currentBgColor);
  rootStyle.setProperty('--caption-bg-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  rootStyle.setProperty('--caption-bg-opacity', currentOpacity.toFixed(2));
  rootStyle.setProperty('--caption-font-color', currentFontColor);
  rootStyle.setProperty('--caption-font-size', `${currentFontSize}px`);

  // Persist locally
  if (save) {
    try {
      localStorage.setItem('mascot_caption_style', JSON.stringify({
        bgColor: currentBgColor,
        opacity: currentOpacity,
        fontColor: currentFontColor,
        fontSize: currentFontSize
      }));
    } catch (e) {
      console.warn('[Caption] Could not save styling to localStorage:', e);
    }
  }
}

// Restore saved styling on startup
try {
  const saved = localStorage.getItem('mascot_caption_style');
  if (saved) {
    const parsed = JSON.parse(saved);
    applyStyling(parsed, false);
  } else {
    applyStyling({
      bgColor: '#0b0f19',
      opacity: 0.90,
      fontColor: '#ffffff',
      fontSize: 16
    }, false);
  }
} catch (e) {
  applyStyling({}, false);
}

// Close window
if (btnClose) {
  btnClose.addEventListener('click', () => {
    const api = window.electronAPI;
    if (api && typeof api.closeLiveCaptionWindow === 'function') {
      api.closeLiveCaptionWindow();
    } else if (api && typeof api.send === 'function') {
      api.send('close-live-caption-window');
    }
  });
}

// IPC Live Subtitle Receiver & Style Sync
const api = window.electronAPI;
if (api && typeof api.on === 'function') {
  // Realtime subtitle broadcast listener
  api.on('live-caption-update', (data) => {
    if (!data) return;

    const text = (typeof data === 'string' ? data : (data.text || data.caption || '')).trim();

    if (text) {
      if (emptyHint) emptyHint.style.display = 'none';
      if (captionText) {
        captionText.style.display = 'block';
        captionText.innerText = text;
        captionText.classList.remove('caption-pop-anim');
        void captionText.offsetWidth;
        captionText.classList.add('caption-pop-anim');
      }
    }

    if (seqCounter) {
      if (data.counter) {
        seqCounter.innerText = data.counter;
        seqCounter.style.display = 'inline-block';
      } else if (data.index !== undefined && data.total !== undefined) {
        seqCounter.innerText = `[${data.index + 1}/${data.total}]`;
        seqCounter.style.display = 'inline-block';
      }
    }
  });

  // Subtitle clearing listener
  api.on('clear-live-caption', () => {
    if (captionText) {
      captionText.innerText = '';
      captionText.style.display = 'none';
    }
    if (emptyHint) {
      emptyHint.style.display = 'flex';
    }
    if (seqCounter) {
      seqCounter.innerText = '';
      seqCounter.style.display = 'none';
    }
  });

  // External style update listener (from Studio Tab)
  api.on('caption-style-update', (data) => {
    if (!data) return;
    applyStyling({
      bgColor: data.bgColor || data.liveCaptionBgColor,
      opacity: data.opacity !== undefined ? data.opacity : data.liveCaptionBgOpacity,
      fontColor: data.fontColor || data.liveCaptionFontColor,
      fontSize: data.fontSize || data.liveCaptionFontSize
    }, true);
  });
}
