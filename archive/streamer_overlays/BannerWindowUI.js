/**
 * BannerWindowUI.js
 * Controls the Sponsor & Ad Banner Window settings in the Studio Panel.
 * Supports image ad playlists with configurable duration, seamless transition
 * animations (Fade, Slide Left, Slide Up, Zoom, 3D Flip), click-through toggles,
 * per-ad target URLs, and real-time IPC synchronization.
 */

export class BannerWindowUI {
  constructor(deps = {}) {
    this.currentSettings = deps.currentSettings || {};
    this.saveSettingsFile = deps.saveSettingsFile;

    // Elements
    this.btnLaunch = null;
    this.statusTag = null;
    this.inputFile = null;
    this.btnUpload = null;
    this.btnClearImage = null;
    this.inputLinkUrl = null;
    this.inputBgColor = null;
    this.labelBgHex = null;
    this.sliderOpacity = null;
    this.labelOpacityVal = null;
    this.checkboxClickThrough = null;
    this.imgPreview = null;
    this.previewEmpty = null;
    this.playlistCount = null;
    this.playlistStrip = null;
    this.previewNav = null;
    this.previewBadge = null;
    this.btnPrev = null;
    this.btnNext = null;
    this.sliderDuration = null;
    this.labelDurationVal = null;
    this.selectTransition = null;
    this.checkboxAutoPlay = null;

    this.selectedIndex = 0;
  }

  init() {
    this.btnLaunch = document.getElementById('btn-studio-launch-banner-window');
    this.statusTag = document.getElementById('studio-banner-window-status');
    this.inputFile = document.getElementById('studio-banner-file-input');
    this.btnUpload = document.getElementById('btn-studio-upload-banner');
    this.btnClearImage = document.getElementById('btn-studio-clear-banner-image');
    this.inputLinkUrl = document.getElementById('studio-banner-link-url');
    this.inputBgColor = document.getElementById('studio-banner-bg-color');
    this.labelBgHex = document.getElementById('studio-banner-bg-hex');
    this.sliderOpacity = document.getElementById('studio-banner-opacity');
    this.labelOpacityVal = document.getElementById('studio-banner-opacity-val');
    this.checkboxClickThrough = document.getElementById('studio-banner-click-through');
    this.imgPreview = document.getElementById('studio-banner-preview-img');
    this.previewEmpty = document.getElementById('studio-banner-preview-empty');
    this.playlistCount = document.getElementById('studio-banner-playlist-count');
    this.playlistStrip = document.getElementById('studio-banner-playlist-strip');
    this.previewNav = document.getElementById('studio-banner-preview-nav');
    this.previewBadge = document.getElementById('studio-banner-preview-badge');
    this.btnPrev = document.getElementById('btn-studio-banner-prev');
    this.btnNext = document.getElementById('btn-studio-banner-next');
    this.sliderDuration = document.getElementById('studio-banner-duration');
    this.labelDurationVal = document.getElementById('studio-banner-duration-val');
    this.selectTransition = document.getElementById('studio-banner-transition');
    this.checkboxAutoPlay = document.getElementById('studio-banner-autoplay');

    // Ensure playlist initialization and backward compatibility
    if (!Array.isArray(this.currentSettings.bannerPlaylist)) {
      this.currentSettings.bannerPlaylist = [];
    }
    if (this.currentSettings.bannerPlaylist.length === 0 && this.currentSettings.bannerImagePath) {
      this.currentSettings.bannerPlaylist.push({
        id: '1',
        imagePath: this.currentSettings.bannerImagePath,
        linkUrl: this.currentSettings.bannerLinkUrl || '',
        name: 'Default Banner'
      });
    }

    this.initWindowControls();
    this.initPlaylistControls();
    this.initRotationControls();
    this.initAppearanceControls();
    this.initIPCListeners();
    this.renderPlaylist();
  }

  initWindowControls() {
    if (this.btnLaunch) {
      this.btnLaunch.addEventListener('click', () => {
        const api = window.electronAPI;
        if (api && typeof api.toggleBannerWindow === 'function') {
          api.toggleBannerWindow();
        } else if (api && typeof api.send === 'function') {
          api.send('toggle-banner-window');
        }
        this.updateStatus('🪟 Banner Window Toggled');
      });
    }

    if (this.checkboxClickThrough) {
      this.checkboxClickThrough.checked = this.currentSettings.bannerClickThrough === true;
      this.checkboxClickThrough.addEventListener('change', () => {
        const enabled = this.checkboxClickThrough.checked;
        this.currentSettings.bannerClickThrough = enabled;
        if (this.saveSettingsFile) this.saveSettingsFile();
        const api = window.electronAPI;
        if (api && typeof api.setBannerClickThrough === 'function') {
          api.setBannerClickThrough(enabled);
        } else if (api && typeof api.send === 'function') {
          api.send('set-banner-click-through', enabled);
        }
        this.updateStatus(enabled ? '🖱️ Click-Through Enabled' : '🖐️ Click-Through Disabled');
      });
    }

    // Auto-sync click-through on startup
    if (this.currentSettings.bannerClickThrough) {
      const api = window.electronAPI;
      if (api && typeof api.setBannerClickThrough === 'function') {
        api.setBannerClickThrough(true);
      } else if (api && typeof api.send === 'function') {
        api.send('set-banner-click-through', true);
      }
    }

    // Auto-open on launch if configured
    if (this.currentSettings.bannerAutoOpen) {
      const api = window.electronAPI;
      if (api && typeof api.openBannerWindow === 'function') {
        api.openBannerWindow();
      } else if (api && typeof api.send === 'function') {
        api.send('open-banner-window');
      }
    }
  }

  initPlaylistControls() {
    if (this.btnUpload && this.inputFile) {
      this.btnUpload.addEventListener('click', () => {
        this.inputFile.click();
      });

      this.inputFile.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        let loadedCount = 0;
        files.forEach((file, idx) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target.result;
            const newItem = {
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              imagePath: dataUrl,
              linkUrl: '',
              name: file.name.replace(/\.[^/.]+$/, "") || `Ad ${this.currentSettings.bannerPlaylist.length + 1}`
            };
            this.currentSettings.bannerPlaylist.push(newItem);
            loadedCount++;

            if (loadedCount === files.length) {
              this.selectedIndex = this.currentSettings.bannerPlaylist.length - 1;
              this.syncPrimaryAdFields();
              if (this.saveSettingsFile) this.saveSettingsFile();
              this.renderPlaylist();
              this.broadcastBannerData();
              this.updateStatus(`🖼️ Added ${files.length} Image Ads`);
            }
          };
          reader.readAsDataURL(file);
        });

        // Reset input so same files can be re-selected if desired
        this.inputFile.value = '';
      });
    }

    if (this.btnClearImage) {
      this.btnClearImage.addEventListener('click', () => {
        this.currentSettings.bannerPlaylist = [];
        this.currentSettings.bannerImagePath = '';
        this.currentSettings.bannerLinkUrl = '';
        this.selectedIndex = 0;
        if (this.inputFile) this.inputFile.value = '';
        this.renderPlaylist();
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastBannerData();
        this.updateStatus('🗑️ All Banner Ads Cleared');
      });
    }

    if (this.inputLinkUrl) {
      const onUrlChange = (e) => {
        const val = e.target.value.trim();
        const playlist = this.currentSettings.bannerPlaylist || [];
        if (playlist[this.selectedIndex]) {
          playlist[this.selectedIndex].linkUrl = val;
        }
        this.syncPrimaryAdFields();
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastBannerData();
      };
      this.inputLinkUrl.addEventListener('input', onUrlChange);
      this.inputLinkUrl.addEventListener('change', onUrlChange);
    }

    // Preview Navigation
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        const playlist = this.currentSettings.bannerPlaylist || [];
        if (playlist.length <= 1) return;
        this.selectedIndex = (this.selectedIndex - 1 + playlist.length) % playlist.length;
        this.renderPlaylist();
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        const playlist = this.currentSettings.bannerPlaylist || [];
        if (playlist.length <= 1) return;
        this.selectedIndex = (this.selectedIndex + 1) % playlist.length;
        this.renderPlaylist();
      });
    }
  }

  initRotationControls() {
    const defaultDur = this.currentSettings.bannerDuration || 5;
    const defaultTrans = this.currentSettings.bannerTransition || 'fade';
    const defaultAuto = this.currentSettings.bannerAutoPlay !== false;

    if (this.sliderDuration) {
      this.sliderDuration.value = defaultDur;
      if (this.labelDurationVal) this.labelDurationVal.innerText = `${defaultDur}s`;
      this.sliderDuration.addEventListener('input', (e) => {
        const sec = parseInt(e.target.value, 10) || 5;
        if (this.labelDurationVal) this.labelDurationVal.innerText = `${sec}s`;
        this.currentSettings.bannerDuration = sec;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastBannerData();
      });
    }

    if (this.selectTransition) {
      this.selectTransition.value = defaultTrans;
      this.selectTransition.addEventListener('change', (e) => {
        this.currentSettings.bannerTransition = e.target.value;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastBannerData();
        this.updateStatus(`✨ Transition: ${e.target.value}`);
      });
    }

    if (this.checkboxAutoPlay) {
      this.checkboxAutoPlay.checked = defaultAuto;
      this.checkboxAutoPlay.addEventListener('change', (e) => {
        const auto = !!e.target.checked;
        this.currentSettings.bannerAutoPlay = auto;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastBannerData();
        this.updateStatus(auto ? '▶ Auto-Play Enabled' : '⏸ Auto-Play Paused');
      });
    }
  }

  initAppearanceControls() {
    const defaultBg = this.currentSettings.bannerBgColor || '#0b0f19';
    const defaultOp = this.currentSettings.bannerBgOpacity !== undefined ? this.currentSettings.bannerBgOpacity : 0.85;

    if (this.inputBgColor) {
      this.inputBgColor.value = defaultBg;
      if (this.labelBgHex) this.labelBgHex.innerText = defaultBg.toUpperCase();
      const onBgChange = (e) => {
        const hex = e.target.value;
        if (this.labelBgHex) this.labelBgHex.innerText = hex.toUpperCase();
        this.currentSettings.bannerBgColor = hex;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastBannerData();
      };
      this.inputBgColor.addEventListener('input', onBgChange);
      this.inputBgColor.addEventListener('change', onBgChange);
    }

    if (this.sliderOpacity) {
      const pct = Math.round(defaultOp * 100);
      this.sliderOpacity.value = pct;
      if (this.labelOpacityVal) this.labelOpacityVal.innerText = `${pct}%`;
      const onOpChange = (e) => {
        const opVal = parseInt(e.target.value, 10) / 100;
        if (this.labelOpacityVal) this.labelOpacityVal.innerText = `${parseInt(e.target.value, 10)}%`;
        this.currentSettings.bannerBgOpacity = opVal;
        if (this.saveSettingsFile) this.saveSettingsFile();
        this.broadcastBannerData();
      };
      this.sliderOpacity.addEventListener('input', onOpChange);
      this.sliderOpacity.addEventListener('change', onOpChange);
    }
  }

  initIPCListeners() {
    const api = window.electronAPI;
    if (api && typeof api.on === 'function') {
      api.on('banner-window-closed', () => {
        this.updateStatus('⚪ Window Closed');
      });
    }
  }

  syncPrimaryAdFields() {
    const playlist = this.currentSettings.bannerPlaylist || [];
    if (playlist.length > 0) {
      const active = playlist[this.selectedIndex] || playlist[0];
      this.currentSettings.bannerImagePath = active.imagePath || '';
      this.currentSettings.bannerLinkUrl = active.linkUrl || '';
    } else {
      this.currentSettings.bannerImagePath = '';
      this.currentSettings.bannerLinkUrl = '';
    }
  }

  renderPlaylist() {
    const playlist = this.currentSettings.bannerPlaylist || [];

    // Clamp selected index
    if (this.selectedIndex >= playlist.length) {
      this.selectedIndex = Math.max(0, playlist.length - 1);
    }

    // Playlist count label
    if (this.playlistCount) {
      this.playlistCount.innerText = `${playlist.length} Ad${playlist.length === 1 ? '' : 's'}`;
    }

    // Active Ad Preview
    if (playlist.length > 0 && playlist[this.selectedIndex]) {
      const activeAd = playlist[this.selectedIndex];
      if (this.imgPreview) {
        this.imgPreview.src = activeAd.imagePath;
        this.imgPreview.style.display = 'block';
      }
      if (this.previewEmpty) {
        this.previewEmpty.style.display = 'none';
      }
      if (this.inputLinkUrl) {
        this.inputLinkUrl.value = activeAd.linkUrl || '';
      }
      if (this.previewNav) {
        this.previewNav.style.display = playlist.length > 1 ? 'flex' : 'none';
      }
      if (this.previewBadge) {
        this.previewBadge.innerText = `${this.selectedIndex + 1}/${playlist.length}`;
      }
    } else {
      if (this.imgPreview) {
        this.imgPreview.src = '';
        this.imgPreview.style.display = 'none';
      }
      if (this.previewEmpty) {
        this.previewEmpty.style.display = 'flex';
      }
      if (this.inputLinkUrl) {
        this.inputLinkUrl.value = '';
      }
      if (this.previewNav) {
        this.previewNav.style.display = 'none';
      }
    }

    // Thumbnail strip rendering
    if (this.playlistStrip) {
      this.playlistStrip.innerHTML = '';
      if (playlist.length === 0) {
        this.playlistStrip.style.display = 'none';
      } else {
        this.playlistStrip.style.display = 'flex';
        playlist.forEach((item, idx) => {
          const thumbCard = document.createElement('div');
          const isSelected = idx === this.selectedIndex;
          thumbCard.style.cssText = `
            position: relative;
            flex-shrink: 0;
            width: 48px;
            height: 34px;
            border-radius: 4px;
            border: 2px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.15)'};
            background: rgba(0,0,0,0.5);
            overflow: hidden;
            cursor: pointer;
            transition: all 0.15s ease;
          `;

          const thumbImg = document.createElement('img');
          thumbImg.src = item.imagePath;
          thumbImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
          thumbCard.appendChild(thumbImg);

          // Delete button on thumbnail
          const btnDel = document.createElement('button');
          btnDel.innerHTML = '✕';
          btnDel.title = 'Remove Ad';
          btnDel.style.cssText = `
            position: absolute;
            top: 1px;
            right: 1px;
            width: 13px;
            height: 13px;
            background: rgba(239, 68, 68, 0.85);
            color: #fff;
            border: none;
            border-radius: 2px;
            font-size: 8px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            line-height: 1;
            padding: 0;
          `;
          btnDel.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeAd(idx);
          });
          thumbCard.appendChild(btnDel);

          thumbCard.addEventListener('click', () => {
            this.selectedIndex = idx;
            this.syncPrimaryAdFields();
            this.renderPlaylist();
          });

          this.playlistStrip.appendChild(thumbCard);
        });
      }
    }
  }

  removeAd(idx) {
    const playlist = this.currentSettings.bannerPlaylist || [];
    if (idx >= 0 && idx < playlist.length) {
      playlist.splice(idx, 1);
      if (this.selectedIndex >= playlist.length) {
        this.selectedIndex = Math.max(0, playlist.length - 1);
      }
      this.syncPrimaryAdFields();
      if (this.saveSettingsFile) this.saveSettingsFile();
      this.renderPlaylist();
      this.broadcastBannerData();
      this.updateStatus('🗑️ Ad Removed');
    }
  }

  broadcastBannerData() {
    const api = window.electronAPI;
    const data = {
      playlist: this.currentSettings.bannerPlaylist || [],
      duration: this.currentSettings.bannerDuration || 5,
      transition: this.currentSettings.bannerTransition || 'fade',
      autoPlay: this.currentSettings.bannerAutoPlay !== false,
      imagePath: this.currentSettings.bannerImagePath || '',
      linkUrl: this.currentSettings.bannerLinkUrl || '',
      bgColor: this.currentSettings.bannerBgColor || '#0b0f19',
      bgOpacity: this.currentSettings.bannerBgOpacity !== undefined ? this.currentSettings.bannerBgOpacity : 0.85
    };

    if (api && typeof api.broadcastBannerData === 'function') {
      api.broadcastBannerData(data);
    } else if (api && typeof api.send === 'function') {
      api.send('broadcast-banner-data', data);
    }
  }

  updateStatus(msg) {
    if (this.statusTag) {
      this.statusTag.innerText = msg;
    }
  }
}

export let bannerWindowUI = null;
export function setupBannerWindowUI(deps = {}) {
  bannerWindowUI = new BannerWindowUI(deps);
  bannerWindowUI.init();
  return bannerWindowUI;
}
