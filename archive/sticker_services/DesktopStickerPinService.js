/**
 * DesktopStickerPinService.js
 * 
 * Manages floating Desktop Sticker Pins (Draggable Desktop Post-It & Reaction Badges).
 * Features:
 * - Live animated looping sticker canvas directly on the desktop overlay
 * - Mouse drag-and-drop repositioning across the screen
 * - Persistent storage in settings.json (restored on app startup)
 * - Individual close / unpin controls (✖)
 */

export class DesktopStickerPinService {
  constructor(deps = {}) {
    this.synthesizer = deps.stickerSynthesizer || null;
    this.currentSettings = deps.currentSettings || {};
    this.saveSettingsFile = deps.saveSettingsFile || (() => {});
    this.container = deps.container || (typeof document !== 'undefined' ? document.getElementById('desktop-sticker-pins') : null);

    this.activePins = new Map(); // id -> { data, element, loopCtrl }
  }

  /**
   * Initializes and restores saved pins from settings.
   */
  init() {
    if (!this.container && typeof document !== 'undefined') {
      this.container = document.getElementById('desktop-sticker-pins');
    }
    const saved = this.currentSettings.pinnedStickers || [];
    if (Array.isArray(saved)) {
      saved.forEach(pinData => this.addPin(pinData, false));
    }
  }

  /**
   * Pins a sticker onto the desktop overlay.
   * @param {Object} pinData
   * @param {string} [pinData.emotion='cheer']
   * @param {string} [pinData.style='kawaii']
   * @param {string} [pinData.caption]
   * @param {number} [pinData.x=60]
   * @param {number} [pinData.y=60]
   * @param {boolean} [persist=true]
   * @returns {string} Pin ID
   */
  async addPin(pinData = {}, persist = true) {
    const id = pinData.id || `pin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const emotion = pinData.emotion || 'cheer';
    const style = pinData.style || 'kawaii';
    const caption = pinData.caption || '';
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 720;
    const x = pinData.x !== undefined ? pinData.x : Math.max(30, Math.min(winW - 180, 50 + this.activePins.size * 25));
    const y = pinData.y !== undefined ? pinData.y : Math.max(30, Math.min(winH - 180, 50 + this.activePins.size * 25));

    if (typeof document === 'undefined' || !this.container) {
      this.activePins.set(id, { data: { id, emotion, style, caption, x, y } });
      if (persist) {
        this._savePins();
      }
      return id;
    }

    // Build Floating Pin Card
    const card = document.createElement('div');
    card.className = 'desktop-pinned-sticker';
    card.id = `pinned-${id}`;
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;

    // Header bar with drag handle and close button
    const header = document.createElement('div');
    header.className = 'desktop-pinned-header';

    const title = document.createElement('span');
    title.className = 'desktop-pinned-title';
    title.textContent = `📌 ${caption || emotion}`;

    const btnClose = document.createElement('button');
    btnClose.className = 'desktop-pinned-close';
    btnClose.innerHTML = '✖';
    btnClose.title = 'Unpin sticker from desktop';
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removePin(id);
    });

    header.appendChild(title);
    header.appendChild(btnClose);

    const source = pinData.source || '3d_scene';

    // Animated Canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'desktop-pinned-canvas';
    canvas.width = 370;
    canvas.height = 320;

    card.appendChild(header);
    card.appendChild(canvas);
    this.container.appendChild(card);

    // Make Card Draggable
    this._attachDraggable(card, header, id);

    // Start Live Animation Loop
    let loopCtrl = null;
    if (this.synthesizer && typeof this.synthesizer.createAnimatedStickerCanvas === 'function') {
      try {
        loopCtrl = await this.synthesizer.createAnimatedStickerCanvas(canvas, {
          emotion,
          style,
          source,
          caption
        });
      } catch (e) {
        console.warn('Failed to start loop on pinned sticker:', e);
      }
    }

    const pinRecord = {
      data: { id, emotion, style, source, caption, x, y },
      element: card,
      loopCtrl
    };

    this.activePins.set(id, pinRecord);

    if (persist) {
      this._savePins();
    }

    return id;
  }

  /**
   * Removes an active pin from the desktop.
   * @param {string} id
   */
  removePin(id) {
    const pin = this.activePins.get(id);
    if (pin) {
      if (pin.loopCtrl && typeof pin.loopCtrl.destroy === 'function') {
        pin.loopCtrl.destroy();
      }
      if (pin.element && pin.element.parentNode) {
        pin.element.parentNode.removeChild(pin.element);
      }
      this.activePins.delete(id);
      this._savePins();
    }
  }

  /**
   * Removes all pins.
   */
  clearAllPins() {
    for (const id of Array.from(this.activePins.keys())) {
      this.removePin(id);
    }
  }

  /**
   * Persists active pins to currentSettings.
   */
  _savePins() {
    const pinsToSave = [];
    for (const [id, pin] of this.activePins.entries()) {
      pinsToSave.push(pin.data);
    }
    this.currentSettings.pinnedStickers = pinsToSave;
    if (typeof this.saveSettingsFile === 'function') {
      this.saveSettingsFile();
    }
  }

  /**
   * Draggable pointer event logic.
   */
  _attachDraggable(card, handle, id) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initLeft = 0;
    let initTop = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initLeft = card.offsetLeft;
      initTop = card.offsetTop;
      card.classList.add('dragging');
      if (handle.setPointerCapture) handle.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newX = Math.max(10, Math.min(window.innerWidth - card.offsetWidth - 10, initLeft + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - card.offsetHeight - 10, initTop + dy));

      card.style.left = `${newX}px`;
      card.style.top = `${newY}px`;

      const pin = this.activePins.get(id);
      if (pin) {
        pin.data.x = newX;
        pin.data.y = newY;
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      card.classList.remove('dragging');
      if (handle.releasePointerCapture) handle.releasePointerCapture(e.pointerId);
      this._savePins();
    };

    handle.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }
}
