import { UIStateInspector } from '../UIStateInspector.js';

/**
 * Display & Model Domain Tools
 * Handles mascot scale, floating bobbing, continuous rotation/spin,
 * active model switching, frame rate targeting, and camera re-centering.
 */

export const DisplayTools = {
  name: 'display',
  tools: [
    {
      name: 'setModelScale',
      description: 'Set mascot size/scale multiplier between 0.2x and 3.0x.',
      parameters: {
        type: 'object',
        properties: {
          scale: { type: 'number', description: 'Scale multiplier (e.g. 1.0 is default, 1.5 is 150%, 0.8 is smaller)' }
        },
        required: ['scale']
      },
      sanitize: (args, settings) => {
        let val = parseFloat(args.scale);
        if (isNaN(val)) val = settings.scale || 1.0;
        // Auto-clamp guardrail between 0.2 and 3.0
        return { scale: parseFloat(Math.max(0.2, Math.min(3.0, val)).toFixed(2)) };
      },
      execute: (args, ctx) => {
        ctx.currentSettings.scale = args.scale;
        ctx.syncUI('model-scale', args.scale);
        const valEl = typeof document !== 'undefined' ? document.getElementById('val-model-scale') : null;
        if (valEl) valEl.innerText = `${args.scale}x`;
        return `Model Scale: ${args.scale}x`;
      }
    },
    {
      name: 'setBobbing',
      description: 'Enable or disable floating bobbing animation.',
      parameters: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', description: 'True to enable bobbing, false to freeze height' }
        },
        required: ['enabled']
      },
      sanitize: (args) => ({ enabled: !!args.enabled }),
      execute: (args, ctx) => {
        ctx.currentSettings.bobbing = args.enabled;
        ctx.syncUI('model-bobbing', args.enabled, true);
        return `Floating Bobbing: ${args.enabled ? 'ON' : 'OFF'}`;
      }
    },
    {
      name: 'setSpinRotation',
      description: 'Control continuous turntable spin rotation on X, Y, and Z axes with speed multipliers.',
      parameters: {
        type: 'object',
        properties: {
          spinX: { type: 'boolean', description: 'Enable pitch rotation around X axis' },
          spinY: { type: 'boolean', description: 'Enable yaw rotation around Y axis' },
          spinZ: { type: 'boolean', description: 'Enable roll rotation around Z axis' },
          speedX: { type: 'number', description: 'Rotation speed multiplier for X (0.1 - 5.0)' },
          speedY: { type: 'number', description: 'Rotation speed multiplier for Y (0.1 - 5.0)' },
          speedZ: { type: 'number', description: 'Rotation speed multiplier for Z (0.1 - 5.0)' }
        }
      },
      sanitize: (args, settings) => {
        const clamp = (v, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(0.1, Math.min(5.0, num)).toFixed(2));
        };
        return {
          spinX: args.spinX !== undefined ? !!args.spinX : settings.spinX,
          spinY: args.spinY !== undefined ? !!args.spinY : settings.spinY,
          spinZ: args.spinZ !== undefined ? !!args.spinZ : settings.spinZ,
          speedX: clamp(args.speedX, settings.speedX || 1.0),
          speedY: clamp(args.speedY, settings.speedY || 1.0),
          speedZ: clamp(args.speedZ, settings.speedZ || 1.0)
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        s.spinX = args.spinX;
        s.spinY = args.spinY;
        s.spinZ = args.spinZ;
        s.speedX = args.speedX;
        s.speedY = args.speedY;
        s.speedZ = args.speedZ;

        ctx.syncUI('spin-x', args.spinX, true);
        ctx.syncUI('spin-y', args.spinY, true);
        ctx.syncUI('spin-z', args.spinZ, true);
        ctx.syncUI('speed-x', args.speedX);
        ctx.syncUI('speed-y', args.speedY);
        ctx.syncUI('speed-z', args.speedZ);

        const valSpeedX = typeof document !== 'undefined' ? document.getElementById('val-speed-x') : null;
        if (valSpeedX) valSpeedX.innerText = `${args.speedX}x`;
        const valSpeedY = typeof document !== 'undefined' ? document.getElementById('val-speed-y') : null;
        if (valSpeedY) valSpeedY.innerText = `${args.speedY}x`;
        const valSpeedZ = typeof document !== 'undefined' ? document.getElementById('val-speed-z') : null;
        if (valSpeedZ) valSpeedZ.innerText = `${args.speedZ}x`;

        return `Spin Rotation: X=${args.spinX}, Y=${args.spinY}, Z=${args.spinZ} (Speed Y=${args.speedY}x)`;
      }
    },
    {
      name: 'setActiveModel',
      description: 'Switch active 3D companion mascot (e.g. "procedural" bunny, "humanoid" cyber android, or "flag" waving banner).',
      parameters: {
        type: 'object',
        properties: {
          modelName: { type: 'string', description: 'Model identifier: "procedural", "humanoid", or "flag"' }
        },
        required: ['modelName']
      },
      sanitize: (args) => {
        const valid = ['procedural', 'humanoid', 'flag'];
        let name = (args.modelName || '').toLowerCase().trim();
        if (name.includes('human') || name.includes('robot') || name.includes('android') || name.includes('cyborg') || name.includes('bot')) name = 'humanoid';
        if (name.includes('bunny') || name.includes('rabbit') || name.includes('pet')) name = 'procedural';
        if (name.includes('flag') || name.includes('banner')) name = 'flag';
        if (!valid.includes(name)) name = 'procedural';
        return { modelName: name };
      },
      execute: (args, ctx) => {
        ctx.currentSettings.activeModel = args.modelName;
        ctx.syncUI('model-select', args.modelName);
        if (ctx.callbacks.switchModel) ctx.callbacks.switchModel(args.modelName);
        return `Active Model: ${args.modelName}`;
      }
    },
    {
      name: 'setWindowSize',
      description: 'Set electron companion window size (width and height in pixels, min 200 to max 1200).',
      parameters: {
        type: 'object',
        properties: {
          width: { type: 'number', description: 'Window width in pixels (200-1200)' },
          height: { type: 'number', description: 'Window height in pixels (200-1200)' }
        }
      },
      sanitize: (args, settings) => {
        const clamp = (v, min, max, def) => {
          const num = parseInt(v, 10);
          if (isNaN(num)) return def;
          return Math.max(min, Math.min(max, num));
        };
        return {
          width: clamp(args.width, 200, 1200, settings.winWidth || 350),
          height: clamp(args.height, 200, 1200, settings.winHeight || 350)
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        s.winWidth = args.width;
        s.winHeight = args.height;
        ctx.syncUI('win-width', args.width);
        ctx.syncUI('win-height', args.height);
        const valW = typeof document !== 'undefined' ? document.getElementById('val-win-width') : null;
        if (valW) valW.innerText = `${args.width}px`;
        const valH = typeof document !== 'undefined' ? document.getElementById('val-win-height') : null;
        if (valH) valH.innerText = `${args.height}px`;
        if (ctx.callbacks.resizeWindow) ctx.callbacks.resizeWindow(args.width, args.height);
        return `Window Size: ${args.width}x${args.height}px`;
      }
    },
    {
      name: 'setTargetFps',
      description: 'Set target frame rate limit (30, 60, 120, 144).',
      parameters: {
        type: 'object',
        properties: {
          targetFps: { type: 'number', description: 'Target FPS (30, 60, 120, 144)' }
        },
        required: ['targetFps']
      },
      sanitize: (args) => {
        const allowed = [30, 60, 120, 144];
        let val = parseInt(args.targetFps, 10);
        if (!allowed.includes(val)) val = 60;
        return { targetFps: val };
      },
      execute: (args, ctx) => {
        ctx.currentSettings.targetFps = args.targetFps;
        ctx.syncUI('target-fps', args.targetFps);
        return `Target FPS: ${args.targetFps}`;
      }
    },
    {
      name: 'resetPosition',
      description: 'Reset mascot position and camera to the center of the screen.',
      parameters: {
        type: 'object',
        properties: {}
      },
      execute: (args, ctx) => {
        if (ctx.callbacks.resetCameraAndPosition) ctx.callbacks.resetCameraAndPosition();
        return `Reset Window & Camera Position`;
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // 1. General "Stop All Animations"
    if (/\b(stop|disable|clear)\s+(?:all\s+)?animations?\b/i.test(text) || text.includes('停止所有动画') || text.includes('停止动画')) {
      toolCalls.push({ name: 'setSpinRotation', args: { spinX: false, spinY: false, spinZ: false } });
      toolCalls.push({ name: 'setBobbing', args: { enabled: false } });
      actionsSummary.push(isChinese ? '停止了所有旋转与浮动动画' : 'stopped all animations');
    }

    // 2. Scale Intent (Differentiating Window/App Container Size vs Mascot/Model Scale)
    const isWindowScale = /\b(window|app|application|companion window|desktop window|screen window|frame)\b/i.test(text) ||
                          ['窗口', '应用', '程序', '界面大小', '窗口尺寸', '应用大小', '软件', '框体'].some(w => text.includes(w));
    const isModelExplicit = /\b(model|mascot|character|pet|bunny|rabbit|avatar|flag|falg|procedural|figure)\b/i.test(text) ||
                            ['模型', '角色', '宠物', '兔子', '旗帜', '看板娘'].some(w => text.includes(w));
    const isScaleTopic = /\b(scale|size|resize|zoom|big|bigger|large|larger|giant|huge|small|smaller|tiny|shrink|grow|double|half|twice|expand|enlarge)\b/i.test(text) ||
                         ['放大', '缩小', '变大', '变小', '尺寸', '缩放', '调大', '调小', '大一点', '小一点', '大些', '小些', '倍', '大', '小'].some(w => text.includes(w));

    // Get live zero-latency dimensions from DOM or current settings
    const liveUI = typeof UIStateInspector !== 'undefined' ? UIStateInspector.getLiveUIState() : null;

    if (isWindowScale && !isModelExplicit && isScaleTopic) {
      const curW = liveUI?.display?.width || currentSettings.winWidth || 350;
      const curH = liveUI?.display?.height || currentSettings.winHeight || 350;
      const isABit = /\b(a bit|a little|slightly|little bit)\b/i.test(text) || ['一点', '稍微', '些许', '小幅'].some(w => text.includes(w));
      const isSmaller = /\b(smaller|tiny|shrink|narrow|decrease)\b/i.test(text) || ['缩小', '变小', '调小', '小一点', '小些'].some(w => text.includes(w));
      const isBigger = /\b(bigger|larger|giant|huge|grow|expand|increase|enlarge)\b/i.test(text) || ['放大', '变大', '调大', '大一点', '大些', '扩大'].some(w => text.includes(w));

      let targetW = curW;
      let targetH = curH;

      const dimMatch = text.match(/([0-9]{3,4})\s*(?:x|\*|\s*by\s*)\s*([0-9]{3,4})/i);
      const singleNumMatch = text.match(/(?:window|app|width|height|size|窗口|尺寸)?\s*(?:to|=)?\s*([0-9]{3,4})\s*(?:px)?\b/i);

      if (dimMatch) {
        targetW = parseInt(dimMatch[1], 10);
        targetH = parseInt(dimMatch[2], 10);
      } else if (/\b(twice as big|twice as large|double the size|double its size|double size|2x bigger|2x size)\b/i.test(text) || ['两倍大', '双倍大', '大一倍', '变大一倍'].some(w => text.includes(w))) {
        targetW = Math.min(1200, Math.round(curW * 2));
        targetH = Math.min(1200, Math.round(curH * 2));
      } else if (/\b(half the size|half its size|half as big|half size|0\.5x size)\b/i.test(text) || ['一半大', '缩小一半', '小一半'].some(w => text.includes(w))) {
        targetW = Math.max(200, Math.round(curW * 0.5));
        targetH = Math.max(200, Math.round(curH * 0.5));
      } else if (singleNumMatch && parseInt(singleNumMatch[1], 10) >= 200) {
        targetW = parseInt(singleNumMatch[1], 10);
        targetH = targetW;
      } else if (isSmaller) {
        const delta = isABit ? 50 : 100;
        targetW = Math.max(200, curW - delta);
        targetH = Math.max(200, curH - delta);
      } else if (isBigger || isScaleTopic) {
        const delta = isABit ? 50 : 100;
        targetW = Math.min(1200, curW + delta);
        targetH = Math.min(1200, curH + delta);
      }

      toolCalls.push({ name: 'setWindowSize', args: { width: targetW, height: targetH } });
      actionsSummary.push(isChinese ? `将窗口尺寸调整为 ${targetW}x${targetH}px` : `set window size to ${targetW}x${targetH}px`);
    } else if (isScaleTopic) {
      const curScale = liveUI?.display?.scale || currentSettings.scale || 1.0;
      let targetScale = null;
      // Look for relative multipliers like "double the size", "twice as big", "half the size"
      if (/\b(twice as big|twice as large|double the size|double its size|double size|2x bigger|2x size)\b/i.test(text) || ['两倍大', '双倍大', '大一倍', '变大一倍'].some(w => text.includes(w))) {
        targetScale = Math.min(3.0, curScale * 2.0);
      } else if (/\b(half the size|half its size|half as big|half size|0\.5x size)\b/i.test(text) || ['一半大', '缩小一半', '小一半'].some(w => text.includes(w))) {
        targetScale = Math.max(0.2, curScale * 0.5);
      } else {
        // Look for explicit number with or without x (e.g. 100x, 2.5x, 0.8, 150%)
        const numMatch = text.match(/(?:scale|size|resize|zoom|放大|缩小|尺寸|缩放)?\s*(?:to|=)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:x|倍|\%)/i) ||
                         text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*x\b/i);
        const isABit = /\b(a bit|a little|slightly|little bit)\b/i.test(text) || ['一点', '稍微', '些许', '小幅'].some(w => text.includes(w));
        const isSmaller = /\b(smaller|tiny|shrink)\b/i.test(text) || ['缩小', '变小', '调小', '小一点', '小些'].some(w => text.includes(w));
        const isBigger = /\b(bigger|larger|giant|huge|grow|enlarge)\b/i.test(text) || ['放大', '变大', '调大', '大一点', '大些'].some(w => text.includes(w));

        if (numMatch && parseFloat(numMatch[1]) > 0) {
          let val = parseFloat(numMatch[1]);
          if (text.includes('%')) val = val / 100;
          targetScale = Math.max(0.2, Math.min(3.0, val));
        } else if (isSmaller) {
          const delta = isABit ? 0.2 : 0.4;
          targetScale = Math.max(0.3, (currentSettings.scale || 1.0) - delta);
        } else if (isBigger || isScaleTopic) {
          const delta = isABit ? 0.2 : 0.4;
          targetScale = Math.min(3.0, (currentSettings.scale || 1.0) + delta);
        }
      }

      if (targetScale !== null) {
        targetScale = parseFloat(targetScale.toFixed(2));
        toolCalls.push({ name: 'setModelScale', args: { scale: targetScale } });
        actionsSummary.push(isChinese ? `将模型尺寸调整为 ${targetScale}x` : `scaled model to ${targetScale}x`);
      }
    }

    // 3. Bobbing Intent (Floating)
    const isBobbingTopic = /\b(bobbing|floating|float|hover|breathe)\b/i.test(text) ||
                           ['漂浮', '悬浮', '浮动', '上下浮动'].some(w => text.includes(w));
    if (isBobbingTopic) {
      const isStop = /\b(stop|disable|turn off|shut off|no)\s+(?:bobbing|floating|float)\b/i.test(text) ||
                     ['停止浮动', '关闭浮动', '关掉浮动', '别漂', '不要浮动'].some(w => text.includes(w));
      const enabled = !isStop;
      toolCalls.push({ name: 'setBobbing', args: { enabled } });
      actionsSummary.push(isChinese ? (enabled ? '开启了浮动动画' : '停止了浮动动画') : (enabled ? 'enabled gentle bobbing' : 'stopped bobbing'));
    }

    // 4. Spin Intent (Continuous Rotation)
    const isDiceGame = /\b(dice|die|roll a dice|roll the dice)\b/i.test(text) || ['掷骰子', '扔骰子', '骰子'].some(w => text.includes(w));
    const isSpinTopic = !isDiceGame && (/\b(spin|rotate|rotation|turntable|revolve|barrel roll)\b/i.test(text) ||
                        (/\broll\b/i.test(text) && !isDiceGame) ||
                        ['旋转', '自转', '转动', '转圈', '转快', '转慢', '转起来'].some(w => text.includes(w)));
    if (isSpinTopic) {
      const isStop = /\b(stop|disable|turn off|shut off|no)\s+(?:spin|rotation|rotating)\b/i.test(text) ||
                     ['停止旋转', '关闭旋转', '关掉旋转', '别转', '不要转', '停下'].some(w => text.includes(w));
      if (isStop) {
        toolCalls.push({ name: 'setSpinRotation', args: { spinX: false, spinY: false, spinZ: false } });
        actionsSummary.push(isChinese ? '停止了旋转' : 'stopped rotation');
      } else {
        const curSpeed = currentSettings.speedY || 1.0;
        let speed = 1.0;

        if (/\b(twice as fast|2x as fast|double the speed|double speed|2x faster)\b/i.test(text) || ['两倍速', '双倍速', '快一倍'].some(w => text.includes(w))) {
          speed = Math.min(5.0, curSpeed * 2.0);
        } else if (/\b(three times as fast|3x as fast|triple the speed|3x faster)\b/i.test(text) || ['三倍速', '三倍快'].some(w => text.includes(w))) {
          speed = Math.min(5.0, curSpeed * 3.0);
        } else if (/\b(half speed|half as fast|slow down by half|0\.5x speed)\b/i.test(text) || ['一半速度', '慢一半', '减半'].some(w => text.includes(w))) {
          speed = Math.max(0.1, curSpeed * 0.5);
        } else {
          const speedMatch = text.match(/(?:speed|faster|at|速度|倍速)\s*([0-9]+(?:\.[0-9]+)?)/i) || text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:x|倍速)/i);
          if (speedMatch) speed = parseFloat(speedMatch[1]);
          else if (/\b(faster|fast|really fast)\b/i.test(text) || ['快点', '加速', '转快'].some(w => text.includes(w))) speed = Math.min(5.0, Math.max(2.5, curSpeed + 1.0));
          else if (/\b(slow|slower)\b/i.test(text) || ['慢点', '减速', '转慢'].some(w => text.includes(w))) speed = Math.max(0.2, curSpeed - 0.5);
        }

        speed = parseFloat(speed.toFixed(2));

        const spinX = /\b(x axis|pitch)\b/i.test(text) || text.includes('x轴');
        const spinZ = /\b(z axis|barrel)\b/i.test(text) || text.includes('z轴');
        const spinY = /\b(y axis|yaw)\b/i.test(text) || text.includes('y轴') || (!spinX && !spinZ);

        toolCalls.push({
          name: 'setSpinRotation',
          args: { spinX, spinY, spinZ, speedX: speed, speedY: speed, speedZ: speed }
        });
        actionsSummary.push(isChinese ? `开启了旋转 (${speed}x)` : `set spin rotation to ${speed}x`);
      }
    }

    // 5. Model Switching Intent (Typo tolerant: falg, buny, mascot, pet, character)
    const isModelSwitch = /\b(switch\s+(?:to\s+)?(?:the\s+)?(?:model|mascot|character|pet)|change\s+(?:the\s+)?(?:model|mascot|character|pet)|load\s+(?:the\s+)?(?:model|mascot)|use\s+(?:the\s+)?(?:model|mascot)|set\s+(?:default\s+)?(?:the\s+)?(?:model|mascot|character|pet)|choose\s+(?:the\s+)?(?:model|mascot)|switch\s+to\s+(?:flag|falg|procedural|bunny))\b/i.test(text) ||
                          /\b(flag model|falg model|procedural model|bunny model|default mascot|flag mascot|falg mascot|bunny mascot)\b/i.test(text) ||
                          ['切换模型', '换模型', '换角色', '更换宠物', '默认模型', '程序化模型', '旗帜模型', '换旗帜'].some(w => text.includes(w));
    if (isModelSwitch) {
      const modelName = /\b(flag|falg)\b/i.test(text) || text.includes('旗帜') ? 'flag' : 'procedural';
      toolCalls.push({ name: 'setActiveModel', args: { modelName } });
      actionsSummary.push(isChinese ? `切换模型为 ${modelName}` : `switched model to ${modelName}`);
    }

    // 6. FPS Target Intent
    const fpsMatch = text.match(/(?:fps|frame rate|帧率|帧数|刷新率)(?: to)?\s*(30|60|120|144)/i) ||
                     text.match(/(30|60|120|144)\s*(?:fps|帧)/i);
    if (fpsMatch) {
      const fps = parseInt(fpsMatch[1], 10);
      toolCalls.push({ name: 'setTargetFps', args: { targetFps: fps } });
      actionsSummary.push(isChinese ? `设置帧率为 ${fps} FPS` : `set target to ${fps} FPS`);
    }

    // 7. Reset Position Intent
    if (/\b(reset|center|home|re-center|back in the center|center position)\b/i.test(text) ||
        ['复位', '重置', '居中', '回到中心', '归位', '初始位置', '还原'].some(w => text.includes(w))) {
      toolCalls.push({ name: 'resetPosition', args: {} });
      actionsSummary.push(isChinese ? '将视角与位置居中复位' : 're-centered position & camera');
    }

    return { toolCalls, actionsSummary };
  }
};
