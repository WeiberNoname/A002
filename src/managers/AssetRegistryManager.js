/**
 * AssetRegistryManager
 * Central reactive registry for managing user-imported 3D models, textures, and audio assets.
 * Backed by EventBus for decoupled real-time synchronization.
 */

import { eventBus } from './EventBus.js';

export class AssetRegistryManager {
  constructor() {
    this.assets = [];
    this.listeners = new Set();
  }

  static getInstance() {
    if (!AssetRegistryManager._instance) {
      AssetRegistryManager._instance = new AssetRegistryManager();
    }
    if (typeof window !== 'undefined') {
      window.__assetRegistryManager = AssetRegistryManager._instance;
    }
    return AssetRegistryManager._instance;
  }

  detectFileType(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['glb', 'gltf', 'fbx', 'obj'].includes(ext)) {
      return { type: 'model', category: '3D Model', icon: '🧊', ext };
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp'].includes(ext)) {
      return { type: 'texture', category: 'Texture', icon: '🖼️', ext };
    }
    if (['mp3', 'wav', 'ogg'].includes(ext)) {
      return { type: 'audio', category: 'Audio Clip', icon: '🎵', format: 'audio', ext };
    }
    if (['mid', 'midi', 'musicxml', 'xml'].includes(ext)) {
      return { type: 'score', category: 'Musical Score', icon: '🎼', format: 'score', ext };
    }
    return { type: 'unknown', category: 'General Asset', icon: '📁', ext };
  }

  async registerFile(file) {
    if (!file) return null;
    const meta = this.detectFileType(file);
    const id = 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const objectUrl = URL.createObjectURL(file);

    let buffer = null;
    if (meta.type === 'audio') {
      try {
        buffer = await file.arrayBuffer();
      } catch (e) {}
    }

    const assetItem = {
      id,
      name: file.name,
      sizeFormatted: this.formatBytes(file.size),
      sizeBytes: file.size,
      type: meta.type,
      category: meta.category,
      icon: meta.icon,
      format: meta.format || null,
      ext: meta.ext,
      objectUrl,
      file,
      buffer,
      thumbnailUrl: null,
      timestamp: Date.now()
    };

    this.assets.unshift(assetItem);
    this.notify();

    // Broadcast across EventBus
    eventBus.emit('asset:registered', assetItem);
    eventBus.emit('assets:changed', this.assets);

    return assetItem;
  }

  setAssetThumbnail(id, thumbnailUrl) {
    const asset = this.getAssetById(id);
    if (asset) {
      asset.thumbnailUrl = thumbnailUrl;
      eventBus.emit('asset:thumbnailUpdated', { id, asset, thumbnailUrl });
      this.notify();
      return true;
    }
    return false;
  }

  getAssets(filterType = 'all') {
    if (!filterType || filterType === 'all') {
      return [...this.assets];
    }
    return this.assets.filter(a => a.type === filterType);
  }

  getAssetById(id) {
    return this.assets.find(a => a.id === id || a.name === id) || null;
  }

  removeAsset(id) {
    const idx = this.assets.findIndex(a => a.id === id);
    if (idx !== -1) {
      const removed = this.assets.splice(idx, 1)[0];
      if (removed.objectUrl) {
        URL.revokeObjectURL(removed.objectUrl);
      }
      this.notify();

      eventBus.emit('asset:removed', { id, asset: removed });
      eventBus.emit('assets:changed', this.assets);
      return true;
    }
    return false;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(this.assets); } catch (e) {}
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
