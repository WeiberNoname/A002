/**
 * Live UI DOM State Inspector Module
 * Directly inspects DOM checkboxes, range sliders, and dropdowns
 * to provide a 100% grounded, zero-latency snapshot of current UI reality.
 */

export class UIStateInspector {
  /**
   * Reads all live DOM controls and returns a structured subsystem state.
   */
  static getLiveUIState() {
    if (typeof document === 'undefined') {
      return null;
    }

    const getChecked = (id, def = false) => {
      const el = document.getElementById(id);
      return el ? el.checked : def;
    };

    const getFloat = (id, def = 1.0) => {
      const el = document.getElementById(id);
      if (!el) return def;
      const v = parseFloat(el.value);
      return isNaN(v) ? def : v;
    };

    const getValue = (id, def = '') => {
      const el = document.getElementById(id);
      return el ? el.value : def;
    };

    return {
      display: {
        activeModel: getValue('model-select', 'procedural'),
        scale: getFloat('model-scale', 1.0),
        activeAnimation: getValue('anim-select', 'default'),
        width: getFloat('win-width', 350),
        height: getFloat('win-height', 350)
      },
      motion: {
        bobbing: getChecked('model-bobbing', true),
        spinX: getChecked('spin-x', false),
        spinY: getChecked('spin-y', false),
        spinZ: getChecked('spin-z', false),
        speedX: getFloat('speed-x', 1.0),
        speedY: getFloat('speed-y', 1.0),
        speedZ: getFloat('speed-z', 1.0),
        targetFps: getFloat('target-fps', 60)
      },
      atmosphere: {
        sakuraRain: getChecked('sakura-rain', true),
        snowFall: getChecked('snow-fall', false)
      },
      sound: {
        soundMuted: !getChecked('sound-master-enable', true),
        soundMasterVolume: getFloat('sound-master-vol', 0.8),
        soundSakuraVolume: getFloat('sound-sakura-vol', 0.7),
        soundSnowVolume: getFloat('sound-snow-vol', 0.7),
        soundDrumVolume: getFloat('sound-drum-vol', 0.7),
        soundSakuraSync: getChecked('sound-sakura-sync', true),
        soundSnowSync: getChecked('sound-snow-sync', true),
        pianoVolume: getFloat('piano-vol-slider', 0.85)
      },
      physics: {
        enablePhysics: getChecked('enable-physics', false),
        physicsGravity: getFloat('physics-gravity', 9.8),
        physicsElasticity: getFloat('physics-elasticity', 0.7),
        physicsFloor: getChecked('physics-floor', true)
      },
      system: {
        ignoreMouse: getChecked('ignore-mouse', false) || getChecked('view-only', false),
        enableFPSMode: getChecked('enable-fps-mode', false),
        showXYZCoords: getChecked('show-xyz-coords', false),
        fontSizeScale: getFloat('font-scale', 1.5),
        language: getValue('lang-select', 'en')
      }
    };
  }

  /**
   * Syncs an active settings object from the live DOM UI state.
   */
  static syncSettingsFromUI(settingsObj) {
    const live = UIStateInspector.getLiveUIState();
    if (!live || !settingsObj) return settingsObj;

    settingsObj.scale = live.display.scale;
    settingsObj.activeModel = live.display.activeModel;
    settingsObj.activeAnimation = live.display.activeAnimation;

    settingsObj.bobbing = live.motion.bobbing;
    settingsObj.spinX = live.motion.spinX;
    settingsObj.spinY = live.motion.spinY;
    settingsObj.spinZ = live.motion.spinZ;
    settingsObj.speedX = live.motion.speedX;
    settingsObj.speedY = live.motion.speedY;
    settingsObj.speedZ = live.motion.speedZ;
    settingsObj.targetFps = live.motion.targetFps;

    settingsObj.sakuraRain = live.atmosphere.sakuraRain;
    settingsObj.snowFall = live.atmosphere.snowFall;

    settingsObj.soundMuted = live.sound.soundMuted;
    settingsObj.soundMasterVolume = live.sound.soundMasterVolume;
    settingsObj.soundSakuraVolume = live.sound.soundSakuraVolume;
    settingsObj.soundSnowVolume = live.sound.soundSnowVolume;
    settingsObj.soundDrumVolume = live.sound.soundDrumVolume;
    settingsObj.soundSakuraSync = live.sound.soundSakuraSync;
    settingsObj.soundSnowSync = live.sound.soundSnowSync;
    settingsObj.pianoVolume = live.sound.pianoVolume;

    settingsObj.enablePhysics = live.physics.enablePhysics;
    settingsObj.physicsGravity = live.physics.physicsGravity;
    settingsObj.physicsElasticity = live.physics.elasticity;
    settingsObj.physicsFloor = live.physics.physicsFloor;

    settingsObj.ignoreMouse = live.system.ignoreMouse;
    settingsObj.enableFPSMode = live.system.enableFPSMode;
    settingsObj.showXYZCoords = live.system.showXYZCoords;
    settingsObj.fontSizeScale = live.system.fontSizeScale;

    return settingsObj;
  }

  /**
   * Generates a concise summary string of all live UI toggles and sliders.
   */
  static getRealitySummaryString(isChinese = false) {
    const s = UIStateInspector.getLiveUIState();
    if (!s) return '';

    if (isChinese) {
      return [
        `【当前实时 UI 控制界面状态】`,
        `• 3D 模型: "${s.display.activeModel}" (缩放尺寸: ${s.display.scale}x)`,
        `• 动态旋转: 浮动=${s.motion.bobbing ? '开启' : '关闭'}, 旋转 Y=${s.motion.spinY ? '开启' : '关闭'} (速度: ${s.motion.speedY}x)`,
        `• 天气特效: 樱花雨=${s.atmosphere.sakuraRain ? '开启 🌸' : '关闭'}, 飘雪=${s.atmosphere.snowFall ? '开启 ❄️' : '关闭'}`,
        `• 音频控制: 主音量=${s.sound.soundMuted ? '静音' : Math.round(s.sound.soundMasterVolume * 100) + '%'}, 樱花音乐=${Math.round(s.sound.soundSakuraVolume * 100)}% (同步=${s.sound.soundSakuraSync ? '开' : '关'}), 钢琴音量=${Math.round(s.sound.pianoVolume * 100)}%`,
        `• 物理引擎: ${s.physics.enablePhysics ? '已启用 ⚡' : '已关闭'} (重力: ${s.physics.physicsGravity}m/s²)`,
        `• 系统模式: 鼠标穿透=${s.system.ignoreMouse ? '已开启' : '未开启'}, 字体缩放=${s.system.fontSizeScale}x`
      ].join('\n');
    }

    return [
      `[LIVE APP UI REALITY TOGGLES & SLIDERS]`,
      `• 3D Model: "${s.display.activeModel}" (Scale: ${s.display.scale}x)`,
      `• Motion: Bobbing=${s.motion.bobbing ? 'ON' : 'OFF'}, Spin Y=${s.motion.spinY ? 'ON' : 'OFF'} (Speed: ${s.motion.speedY}x)`,
      `• Weather: Sakura Rain=${s.atmosphere.sakuraRain ? 'ON 🌸' : 'OFF'}, Snowfall=${s.atmosphere.snowFall ? 'ON ❄️' : 'OFF'}`,
      `• Audio: Master=${s.sound.soundMuted ? 'MUTED' : Math.round(s.sound.soundMasterVolume * 100) + '%'}, Sakura Sound=${Math.round(s.sound.soundSakuraVolume * 100)}% (Sync=${s.sound.soundSakuraSync ? 'ON' : 'OFF'}), Piano=${Math.round(s.sound.pianoVolume * 100)}%`,
      `• Physics: Engine=${s.physics.enablePhysics ? 'ENABLED ⚡' : 'DISABLED'} (Gravity: ${s.physics.physicsGravity}m/s²)`,
      `• System: Click-Through=${s.system.ignoreMouse ? 'ENABLED' : 'DISABLED'}, FontScale=${s.system.fontSizeScale}x`
    ].join('\n');
  }
}
