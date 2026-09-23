/**
 * System & Environment Domain Tools
 * Handles click-through mode (ignore mouse), always on top,
 * FPS camera perspective, and spatial XYZ HUD display.
 */

export const SystemTools = {
  name: 'system',
  tools: [
    {
      name: 'setSystemSettings',
      description: 'Configure click-through mode (ignore mouse), always-on-top window, FPS perspective, and spatial HUD.',
      parameters: {
        type: 'object',
        properties: {
          ignoreMouse: { type: 'boolean', description: 'Enable mouse click-through mode' },
          alwaysOnTop: { type: 'boolean', description: 'Keep window always on top' },
          fpsMode: { type: 'boolean', description: 'Enable First-Person Perspective mode' },
          showXyz: { type: 'boolean', description: 'Show live XYZ spatial coordinates HUD' }
        }
      },
      sanitize: (args) => ({
        ignoreMouse: args.ignoreMouse !== undefined ? !!args.ignoreMouse : undefined,
        alwaysOnTop: args.alwaysOnTop !== undefined ? !!args.alwaysOnTop : undefined,
        fpsMode: args.fpsMode !== undefined ? !!args.fpsMode : undefined,
        showXyz: args.showXyz !== undefined ? !!args.showXyz : undefined
      }),
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        const actions = [];

        if (args.ignoreMouse !== undefined) {
          s.ignoreMouse = args.ignoreMouse;
          ctx.syncUI('ignore-mouse', args.ignoreMouse, true);
          if (ctx.callbacks.updateIgnoreMouseState) ctx.callbacks.updateIgnoreMouseState();
          actions.push(`Click-Through: ${args.ignoreMouse ? 'ENABLED' : 'DISABLED'}`);
        }
        if (args.fpsMode !== undefined) {
          s.enableFPSMode = args.fpsMode;
          ctx.syncUI('enable-fps-mode', args.fpsMode, true);
          actions.push(`FPS Camera: ${args.fpsMode ? 'ON' : 'OFF'}`);
        }
        if (args.showXyz !== undefined) {
          s.showXYZCoords = args.showXyz;
          ctx.syncUI('show-xyz-coords', args.showXyz, true);
          if (ctx.callbacks.updateXYZVisibility) ctx.callbacks.updateXYZVisibility();
          actions.push(`XYZ HUD: ${args.showXyz ? 'ON' : 'OFF'}`);
        }

        return actions.length > 0 ? actions.join(', ') : 'System settings updated';
      }
    },
    {
      name: 'setPerformanceSettings',
      description: 'Configure GPU performance optimization, dynamic battery saver, idle frame rate saver, and mouse proxy.',
      parameters: {
        type: 'object',
        properties: {
          dynamicBatterySaver: { type: 'boolean', description: 'Auto-throttle FPS when idle/unfocused' },
          idleFpsSaver: { type: 'boolean', description: 'Cap idle rendering to 30 FPS' },
          gpuOptimize: { type: 'boolean', description: 'Force high-performance dedicated GPU' },
          gpuLowPower: { type: 'boolean', description: 'Force integrated low-power GPU battery saver' },
          mouseOptimize: { type: 'boolean', description: 'Seamless performance throttled proxy' }
        }
      },
      sanitize: (args) => ({
        dynamicBatterySaver: args.dynamicBatterySaver !== undefined ? !!args.dynamicBatterySaver : undefined,
        idleFpsSaver: args.idleFpsSaver !== undefined ? !!args.idleFpsSaver : undefined,
        gpuOptimize: args.gpuOptimize !== undefined ? !!args.gpuOptimize : undefined,
        gpuLowPower: args.gpuLowPower !== undefined ? !!args.gpuLowPower : undefined,
        mouseOptimize: args.mouseOptimize !== undefined ? !!args.mouseOptimize : undefined
      }),
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        const actions = [];

        if (args.dynamicBatterySaver !== undefined) {
          s.dynamicBatterySaver = args.dynamicBatterySaver;
          ctx.syncUI('dynamic-battery-saver', args.dynamicBatterySaver, true);
          actions.push(`Dynamic Battery Saver: ${args.dynamicBatterySaver ? 'ON' : 'OFF'}`);
        }
        if (args.idleFpsSaver !== undefined) {
          s.idleFpsSaver = args.idleFpsSaver;
          ctx.syncUI('idle-fps-saver', args.idleFpsSaver, true);
          actions.push(`Idle 30 FPS Saver: ${args.idleFpsSaver ? 'ON' : 'OFF'}`);
        }
        if (args.gpuOptimize !== undefined) {
          s.gpuOptimize = args.gpuOptimize;
          ctx.syncUI('gpu-optimize', args.gpuOptimize, true);
          actions.push(`High-Perf GPU: ${args.gpuOptimize ? 'ON' : 'OFF'}`);
        }
        if (args.gpuLowPower !== undefined) {
          s.gpuLowPower = args.gpuLowPower;
          ctx.syncUI('gpu-low-power', args.gpuLowPower, true);
          actions.push(`Low-Power GPU: ${args.gpuLowPower ? 'ON' : 'OFF'}`);
        }
        if (args.mouseOptimize !== undefined) {
          s.mouseOptimize = args.mouseOptimize;
          ctx.syncUI('mouse-optimize', args.mouseOptimize, true);
          actions.push(`Seamless Mouse: ${args.mouseOptimize ? 'ON' : 'OFF'}`);
        }

        return actions.length > 0 ? actions.join(', ') : 'Performance settings updated';
      }
    },
    {
      name: 'saveAndRefresh',
      description: 'Save all active settings atomically to persistent disk storage and refresh the 3D companion scene.',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: (args, ctx) => {
        if (ctx.saveSettingsFile) ctx.saveSettingsFile();
        if (typeof document !== 'undefined') {
          const saveBtn = document.getElementById('save-btn');
          if (saveBtn) saveBtn.click();
        }
        if (ctx.callbacks.saveAndRefresh) ctx.callbacks.saveAndRefresh();
        return 'Saved Settings & Refreshed Scene';
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // 1. Mouse Click-Through Mode (ignoreMouse)
    const isClickThrough = /\b(click[- ]?through|ignore[- ]?mouse|mouse[- ]?through|pass[- ]?through)\b/i.test(text) ||
                           ['鼠标穿透', '穿透模式', '忽略鼠标', '点击穿透', '穿透'].some(w => text.includes(w));
    if (isClickThrough) {
      const isDisable = /\b(disable|turn off|stop|shut off|cancel|exit)\b/i.test(text) ||
                        ['关闭穿透', '关掉穿透', '取消穿透', '禁用穿透'].some(w => text.includes(w));
      const enable = !isDisable;
      toolCalls.push({ name: 'setSystemSettings', args: { ignoreMouse: enable } });
      actionsSummary.push(isChinese ? (enable ? '开启了鼠标穿透模式' : '关闭了鼠标穿透模式') : (enable ? 'enabled mouse click-through mode' : 'disabled mouse click-through'));
    }

    // 2. FPS Perspective Camera Mode
    const isFpsMode = /\b(fps mode|first person|fps camera|fpv)\b/i.test(text) ||
                      ['第一人称', 'fps视角', '第一视角'].some(w => text.includes(w));
    if (isFpsMode) {
      const isDisable = /\b(disable|turn off|stop|exit)\b/i.test(text) || ['退出第一人称', '关闭第一人称'].some(w => text.includes(w));
      const enable = !isDisable;
      toolCalls.push({ name: 'setSystemSettings', args: { fpsMode: enable } });
      actionsSummary.push(isChinese ? (enable ? '开启了第一人称视角' : '退出了第一人称视角') : (enable ? 'enabled first-person camera mode' : 'disabled first-person mode'));
    }

    // 3. Spatial XYZ Coordinates HUD
    const isXyzHud = /\b(xyz coords?|spatial coords?|coordinates hud|xyz overlay)\b/i.test(text) ||
                     ['空间坐标', 'xyz坐标', '坐标显示', '坐标hud'].some(w => text.includes(w));
    if (isXyzHud) {
      const isDisable = /\b(hide|turn off|disable|close)\b/i.test(text) || ['隐藏坐标', '关闭坐标'].some(w => text.includes(w));
      const enable = !isDisable;
      toolCalls.push({ name: 'setSystemSettings', args: { showXyz: enable } });
      actionsSummary.push(isChinese ? (enable ? '显示了 XYZ 空间坐标 HUD' : '隐藏了 XYZ 空间坐标') : (enable ? 'showed XYZ coordinates HUD' : 'hid XYZ coordinates'));
    }

    // 4. Performance over Battery Disambiguation
    const isPerfOverBattery = /\b(performance\s+over\s+battery|performance\s+instead\s+of\s+battery|prefer\s+performance|perf\s+over\s+battery|performance\s+first)\b/i.test(text) ||
                              ['性能优先', '性能为主', '要性能不要省电', '偏向性能'].some(w => text.includes(w));

    // 5. Dynamic Battery Saver & Eco Mode
    const isBatteryTopic = !isPerfOverBattery && (
      /\b(battery|eco mode|power saver|power saving|battery saving|save battery|dynamic battery)\b/i.test(text) ||
      ['省电', '节能', '电池', '低功耗', '动态省电', '省电模式'].some(w => text.includes(w))
    );

    if (isBatteryTopic) {
      const isDisable = /\b(disable|turn off|stop|shut off|cancel)\b/i.test(text) || ['关闭省电', '关掉省电'].some(w => text.includes(w));
      const enable = !isDisable;
      toolCalls.push({
        name: 'setPerformanceSettings',
        args: { dynamicBatterySaver: enable, idleFpsSaver: enable, gpuLowPower: enable }
      });
      actionsSummary.push(isChinese ? (enable ? '开启了动态智能省电模式 🔋' : '关闭了省电模式') : (enable ? 'enabled dynamic battery saving mode 🔋' : 'disabled battery saving'));
    }

    // 6. Performance Optimization Modes (Recommended / High-Performance / Extreme)
    const isPerfTopic = isPerfOverBattery ||
                        /\b(performance|gpu optimize|high perf|ultra perf|max perf|smooth mode|optimize|optimized|optimise|optimised|speed up|boost)\b/i.test(text) ||
                        ['性能', '性能优化', '优化性能', '最高性能', '极速模式', '推荐性能', '优化应用', '优化', '流畅'].some(w => text.includes(w));

    if (isPerfTopic && !isBatteryTopic) {
      const isMaxPerf = isPerfOverBattery ||
                        /\b(max|ultra|extreme|high|highest|best|gaming|maximum)\b/i.test(text) ||
                        ['最高', '极限', '游戏', '最佳性能', '极致性能', '最强'].some(w => text.includes(w));
      if (isMaxPerf) {
        toolCalls.push({
          name: 'setPerformanceSettings',
          args: { gpuOptimize: true, dynamicBatterySaver: false, idleFpsSaver: false }
        });
        actionsSummary.push(isChinese ? '开启了极致高性能模式 🚀' : 'activated maximum GPU performance mode 🚀');
      } else {
        // Balanced Recommended Performance
        toolCalls.push({
          name: 'setPerformanceSettings',
          args: { dynamicBatterySaver: true, idleFpsSaver: true, mouseOptimize: true }
        });
        actionsSummary.push(isChinese ? '开启了推荐性能均衡模式 ⚡' : 'applied recommended balanced performance settings ⚡');
      }
    }

    // 7. Save & Refresh Intent
    const isSaveRefresh = /\b(save and refresh|save & refresh|save settings|refresh and save|save configuration|save config|save the game|save state|refresh the app|save to disk|save companion|refresh companion)\b/i.test(text) ||
                          ['保存并刷新', '保存设置', '刷新并保存', '保存游戏', '保存配置', '保存状态', '刷新应用', '保存到硬盘'].some(w => text.includes(w));
    if (isSaveRefresh) {
      toolCalls.push({ name: 'saveAndRefresh', args: {} });
      actionsSummary.push(isChinese ? '保存了当前所有设置并刷新了应用' : 'saved settings & refreshed companion scene');
    }

    return { toolCalls, actionsSummary };
  }
};
