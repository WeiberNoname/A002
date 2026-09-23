import { AssetRegistryManager } from '../managers/AssetRegistryManager.js';
import { ModelThumbnailGenerator } from '../core/ModelThumbnailGenerator.js';
import { formatHumanLabel } from './uiUtils.js';

export function setupAssetHubUI(deps = {}) {
  const {
    t = (k, fallback) => fallback,
    THREE = window.THREE,
    GLTFLoader = window.GLTFLoader,
    onSelectModel = () => {},
    onApplyTexture = () => {}
  } = deps;

  const registry = AssetRegistryManager.getInstance();
  let currentFilter = 'all';

  const dropzone = document.getElementById('asset-hub-dropzone');
  const fileInput = document.getElementById('asset-hub-file-input');
  const browseBtn = document.getElementById('btn-asset-hub-browse');
  const libraryGrid = document.getElementById('asset-library-grid');
  const countBadge = document.getElementById('asset-count-badge');
  const filterButtons = Array.from(document.querySelectorAll('.asset-filter-btn'));

  // 1. Ingestion File Handling
  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const asset = await registry.registerFile(file);
      if (asset && asset.type === 'model' && (THREE || window.THREE) && (GLTFLoader || window.GLTFLoader)) {
        // Asynchronously capture in-animation 3D beauty thumbnail immediately
        ModelThumbnailGenerator.captureModelSnapshot({
          file: asset.file,
          objectUrl: asset.objectUrl,
          THREE: THREE || window.THREE,
          GLTFLoader: GLTFLoader || window.GLTFLoader
        }).then(thumbDataUrl => {
          if (thumbDataUrl) {
            asset.thumbnailUrl = thumbDataUrl;
            const imgEls = document.querySelectorAll(`img[data-asset-thumb="${asset.id}"], img[data-mascot="${asset.name}"]`);
            const placeholderEl = document.querySelector(`div[data-asset-placeholder="${asset.id}"]`);
            imgEls.forEach(imgEl => {
              imgEl.src = thumbDataUrl;
              imgEl.style.display = 'block';
            });
            if (placeholderEl) {
              placeholderEl.style.display = 'none';
            }
            // Propagate updated thumbnail to all asset grids (Mascot Studio Tab 3, etc.)
            registry.notify();
          }
        });
      }
    }
    renderLibrary();
  };

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropzone) {
    dropzone.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files) {
        handleFiles(dt.files);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        handleFiles(fileInput.files);
        fileInput.value = '';
      }
    });
  }

  // 2. Render Asset Library Cards
  const renderLibrary = () => {
    if (!libraryGrid) return;
    const items = registry.getAssets('all');
    const totalCount = items.length;

    if (countBadge) {
      countBadge.textContent = `${totalCount} Assets`;
    }

    if (items.length === 0) {
      libraryGrid.innerHTML = `
        <div class="asset-empty-state">
          <span style="font-size: 2em; opacity: 0.6;">📦</span>
          <div style="font-size: 0.9em; font-weight: 600; color: #d1d5db; margin-top: 4px;">
            ${t('asset_empty_title', 'No imported assets found')}
          </div>
          <div style="font-size: 0.78em; color: #9ca3af; margin-top: 2px;">
            ${t('asset_empty_sub', 'Drop 3D models or textures above to use them.')}
          </div>
        </div>
      `;
      return;
    }

    libraryGrid.innerHTML = '';
    items.forEach(asset => {
      const card = document.createElement('div');
      card.className = 'studio-select-card asset-card';
      card.setAttribute('data-id', asset.id);

      let thumbnailInner = '';
      if (asset.type === 'texture' && asset.objectUrl) {
        thumbnailInner = `<img src="${asset.objectUrl}" class="asset-thumbnail-img" alt="${asset.name}">`;
      } else if (asset.type === 'model') {
        const hasThumb = !!asset.thumbnailUrl;
        thumbnailInner = `
          <img src="${asset.thumbnailUrl || ''}" class="asset-thumbnail-img" data-asset-thumb="${asset.id}" alt="${asset.name}" style="${hasThumb ? '' : 'display:none;'}">
          <div class="asset-thumbnail-placeholder" data-asset-placeholder="${asset.id}" style="${hasThumb ? 'display:none;' : ''}">
            <span class="asset-placeholder-icon">🧊</span>
            <span class="asset-ext-badge">.${asset.ext.toUpperCase()}</span>
          </div>
        `;
        // Trigger thumbnail generation if not already present
        if (!hasThumb && THREE && GLTFLoader) {
          ModelThumbnailGenerator.captureModelSnapshot({
            file: asset.file,
            objectUrl: asset.objectUrl,
            THREE,
            GLTFLoader
          }).then(thumbDataUrl => {
            if (thumbDataUrl) {
              asset.thumbnailUrl = thumbDataUrl;
              const imgEl = card.querySelector(`img[data-asset-thumb="${asset.id}"]`);
              const placeholderEl = card.querySelector(`div[data-asset-placeholder="${asset.id}"]`);
              if (imgEl) {
                imgEl.src = thumbDataUrl;
                imgEl.style.display = 'block';
              }
              if (placeholderEl) {
                placeholderEl.style.display = 'none';
              }
            }
          });
        }
      } else {
        thumbnailInner = `
          <div class="asset-thumbnail-placeholder">
            <span class="asset-placeholder-icon">${asset.icon}</span>
            <span class="asset-ext-badge">.${asset.ext.toUpperCase()}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="studio-select-thumb asset-thumbnail-wrapper">
          ${thumbnailInner}
          <button class="asset-card-del-btn" data-action="delete" data-id="${asset.id}" title="Remove Asset">×</button>
        </div>
        <div class="studio-select-label asset-card-label" title="${asset.name}">${formatHumanLabel(asset.name)}</div>
        <div class="studio-select-sub asset-card-sub">${asset.category} • ${asset.sizeFormatted}</div>
      `;

      const delBtn = card.querySelector('[data-action="delete"]');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          registry.removeAsset(asset.id);
          renderLibrary();
        });
      }

      card.addEventListener('click', () => {
        libraryGrid.querySelectorAll('.asset-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (asset.type === 'model') {
          onSelectModel(asset);
        } else if (asset.type === 'texture') {
          onApplyTexture(asset);
        }
      });

      libraryGrid.appendChild(card);
    });
  };

  registry.subscribe(() => renderLibrary());
  renderLibrary();
}
