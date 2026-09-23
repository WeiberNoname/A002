/**
 * banner.js
 * Controller for the independent floating sponsor & ad banner window.
 * Supports image ad playlists with configurable duration, seamless transition
 * animations (Fade, Slide Left, Slide Up, Zoom, 3D Flip), and per-ad click destination URLs.
 */

let currentBgColor = '#0b0f19';
let currentOpacity = 0.85;
let currentImagePath = '';
let currentLinkUrl = '';
let playlist = [];
let currentIndex = 0;
let duration = 5; // seconds per ad
let transition = 'fade'; // 'fade', 'slide-left', 'slide-up', 'zoom', 'flip'
let autoPlay = true;
let isHovered = false;
let rotationTimer = null;
let activeSlot = 'a'; // 'a' or 'b'
let isTransitioning = false;

// DOM Elements
const container = document.getElementById('banner-window-container');
const bannerBody = document.getElementById('banner-body');
const bannerPlaceholder = document.getElementById('banner-placeholder');
const bannerStage = document.getElementById('banner-stage');
const slideA = document.getElementById('banner-slide-a');
const slideB = document.getElementById('banner-slide-b');
const pageIndicator = document.getElementById('banner-page-indicator');
const btnPrev = document.getElementById('btn-banner-prev');
const btnNext = document.getElementById('btn-banner-next');
const btnClose = document.getElementById('btn-banner-close');

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
 * Starts or restarts the auto-play slideshow rotation timer.
 */
function restartSlideshow() {
  if (rotationTimer) {
    clearInterval(rotationTimer);
    rotationTimer = null;
  }

  if (autoPlay && playlist.length > 1) {
    const intervalMs = Math.max(1, duration) * 1000;
    rotationTimer = setInterval(() => {
      if (!isHovered && !isTransitioning) {
        nextSlide();
      }
    }, intervalMs);
  }
}

/**
 * Cleans up all animation classes from both slide elements.
 */
function clearAnimationClasses(el) {
  if (!el) return;
  el.className = 'banner-slide';
}

/**
 * Switches to a specific slide with selected transition animation.
 */
function showSlide(targetIndex, animate = true) {
  if (!playlist || playlist.length === 0) {
    if (slideA) { slideA.src = ''; slideA.style.display = 'none'; }
    if (slideB) { slideB.src = ''; slideB.style.display = 'none'; }
    if (bannerPlaceholder) bannerPlaceholder.style.display = 'flex';
    if (pageIndicator) pageIndicator.style.display = 'none';
    if (btnPrev) btnPrev.style.display = 'none';
    if (btnNext) btnNext.style.display = 'none';
    currentLinkUrl = '';
    bannerBody.classList.remove('clickable');
    bannerBody.removeAttribute('title');
    return;
  }

  if (bannerPlaceholder) bannerPlaceholder.style.display = 'none';

  // Normalize index
  currentIndex = ((targetIndex % playlist.length) + playlist.length) % playlist.length;
  const currentAd = playlist[currentIndex];
  currentLinkUrl = (currentAd && currentAd.linkUrl) ? currentAd.linkUrl.trim() : '';

  // Update Clickable URL attributes
  if (currentLinkUrl) {
    bannerBody.classList.add('clickable');
    bannerBody.title = `Click to visit: ${currentLinkUrl}`;
  } else {
    bannerBody.classList.remove('clickable');
    bannerBody.removeAttribute('title');
  }

  // Update Page Indicator & Navigation Buttons
  if (playlist.length > 1) {
    if (pageIndicator) {
      pageIndicator.innerText = `[${currentIndex + 1}/${playlist.length}]`;
      pageIndicator.style.display = 'inline-block';
    }
    if (btnPrev) btnPrev.style.display = 'inline-block';
    if (btnNext) btnNext.style.display = 'inline-block';
  } else {
    if (pageIndicator) pageIndicator.style.display = 'none';
    if (btnPrev) btnPrev.style.display = 'none';
    if (btnNext) btnNext.style.display = 'none';
  }

  const currentImgEl = activeSlot === 'a' ? slideA : slideB;
  const nextImgEl = activeSlot === 'a' ? slideB : slideA;

  if (!animate || playlist.length === 1) {
    clearAnimationClasses(currentImgEl);
    clearAnimationClasses(nextImgEl);
    currentImgEl.src = currentAd.imagePath || '';
    currentImgEl.style.display = 'block';
    currentImgEl.classList.add('active');
    nextImgEl.style.display = 'none';
    return;
  }

  // Perform animated transition
  isTransitioning = true;
  nextImgEl.src = currentAd.imagePath || '';
  nextImgEl.style.display = 'block';

  // Choose animation classes
  let outClass = 'anim-fade-out';
  let inClass = 'anim-fade-in';
  let prepClass = '';

  switch (transition) {
    case 'slide-left':
      outClass = 'anim-slide-left-out';
      inClass = 'anim-slide-left-in';
      prepClass = 'anim-slide-left-prep';
      break;
    case 'slide-up':
      outClass = 'anim-slide-up-out';
      inClass = 'anim-slide-up-in';
      prepClass = 'anim-slide-up-prep';
      break;
    case 'zoom':
      outClass = 'anim-zoom-out';
      inClass = 'anim-zoom-in';
      prepClass = 'anim-zoom-prep';
      break;
    case 'flip':
      outClass = 'anim-flip-out';
      inClass = 'anim-flip-in';
      prepClass = 'anim-flip-prep';
      break;
    case 'fade':
    default:
      outClass = 'anim-fade-out';
      inClass = 'anim-fade-in';
      prepClass = 'anim-fade-out';
      break;
  }

  // Prep next image
  clearAnimationClasses(nextImgEl);
  if (prepClass) nextImgEl.classList.add(prepClass);

  // Force reflow
  void nextImgEl.offsetWidth;

  // Execute transition
  currentImgEl.classList.add(outClass);
  nextImgEl.classList.remove(prepClass);
  nextImgEl.classList.add(inClass);

  setTimeout(() => {
    clearAnimationClasses(currentImgEl);
    clearAnimationClasses(nextImgEl);
    nextImgEl.classList.add('active');
    currentImgEl.style.display = 'none';
    activeSlot = activeSlot === 'a' ? 'b' : 'a';
    isTransitioning = false;
  }, 500);
}

/**
 * Advance to next slide.
 */
function nextSlide() {
  if (playlist.length <= 1) return;
  showSlide(currentIndex + 1, true);
}

/**
 * Return to previous slide.
 */
function prevSlide() {
  if (playlist.length <= 1) return;
  showSlide(currentIndex - 1, true);
}

/**
 * Applies background color, opacity, image, and playlist updates.
 */
function applyBannerData(data = {}, save = true) {
  if (data.bgColor !== undefined) currentBgColor = data.bgColor;
  if (data.opacity !== undefined) currentOpacity = Math.max(0, Math.min(1, parseFloat(data.opacity)));
  if (data.duration !== undefined) duration = Math.max(1, Math.min(60, parseInt(data.duration, 10) || 5));
  if (data.transition !== undefined) transition = data.transition;
  if (data.autoPlay !== undefined) autoPlay = !!data.autoPlay;

  const rgb = hexToRgb(currentBgColor);
  const rootStyle = document.documentElement.style;

  rootStyle.setProperty('--banner-bg-color', currentBgColor);
  rootStyle.setProperty('--banner-bg-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  rootStyle.setProperty('--banner-bg-opacity', currentOpacity.toFixed(2));

  // Update Playlist
  if (Array.isArray(data.playlist) && data.playlist.length > 0) {
    playlist = [...data.playlist];
  } else if (data.imagePath && data.imagePath.trim()) {
    playlist = [{
      id: 'default',
      imagePath: data.imagePath,
      linkUrl: data.linkUrl || '',
      name: 'Default Sponsor'
    }];
  } else {
    playlist = [];
  }

  // Clamp current index
  if (currentIndex >= playlist.length) {
    currentIndex = 0;
  }

  showSlide(currentIndex, false);
  restartSlideshow();

  // Save to localStorage
  if (save) {
    try {
      localStorage.setItem('mascot_banner_data', JSON.stringify({
        bgColor: currentBgColor,
        opacity: currentOpacity,
        playlist: playlist,
        duration: duration,
        transition: transition,
        autoPlay: autoPlay,
        imagePath: playlist[0]?.imagePath || '',
        linkUrl: playlist[0]?.linkUrl || ''
      }));
    } catch (e) {
      console.warn('[Banner] Could not cache banner state:', e);
    }
  }
}

// Restore saved styling on startup
try {
  const saved = localStorage.getItem('mascot_banner_data');
  if (saved) {
    applyBannerData(JSON.parse(saved), false);
  } else {
    applyBannerData({
      bgColor: '#0b0f19',
      opacity: 0.85,
      playlist: [],
      duration: 5,
      transition: 'fade',
      autoPlay: true
    }, false);
  }
} catch (e) {
  applyBannerData({}, false);
}

// Handle Banner Body Click (Navigate to Link if present)
if (bannerBody) {
  bannerBody.addEventListener('click', (e) => {
    // Ignore clicks on header or navigation buttons
    if (e.target === btnClose || e.target === btnPrev || e.target === btnNext) return;
    if (!currentLinkUrl || !currentLinkUrl.trim()) return;
    try {
      const url = currentLinkUrl.trim();
      const api = window.electronAPI;
      if (api && typeof api.openExternalUrl === 'function') {
        api.openExternalUrl(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('[Banner] Failed to open link:', err);
    }
  });

  // Pause rotation on hover
  bannerBody.addEventListener('mouseenter', () => {
    isHovered = true;
  });
  bannerBody.addEventListener('mouseleave', () => {
    isHovered = false;
  });
}

// Navigation Buttons
if (btnPrev) {
  btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    prevSlide();
    restartSlideshow();
  });
}

if (btnNext) {
  btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    nextSlide();
    restartSlideshow();
  });
}

// Close button
if (btnClose) {
  btnClose.addEventListener('click', (e) => {
    e.stopPropagation();
    const api = window.electronAPI;
    if (api && typeof api.closeBannerWindow === 'function') {
      api.closeBannerWindow();
    } else if (api && typeof api.send === 'function') {
      api.send('close-banner-window');
    }
  });
}

// IPC Listener for Live Banner Updates
const api = window.electronAPI;
if (api && typeof api.on === 'function') {
  api.on('banner-data-update', (data) => {
    if (!data) return;
    applyBannerData({
      bgColor: data.bgColor,
      opacity: data.opacity !== undefined ? data.opacity : data.bgOpacity,
      playlist: data.playlist,
      duration: data.duration,
      transition: data.transition,
      autoPlay: data.autoPlay,
      imagePath: data.imagePath,
      linkUrl: data.linkUrl
    }, true);
  });
}
