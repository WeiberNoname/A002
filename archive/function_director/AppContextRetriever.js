/**
 * App Knowledge & Context Retrieval Engine (RAG)
 * Retrieves relevant feature capabilities, system specifications, keyboard shortcuts,
 * and live telemetry to augment AI prompts with deep contextual understanding.
 */

import { UIStateInspector } from './UIStateInspector.js';

export class AppContextRetriever {
  static KNOWLEDGE_BASE = {
    display_mesh: {
      title: '🎯 3D Display, Models & Kinematics',
      keywords: ['model', 'mesh', 'bunny', 'flag', 'procedural', 'scale', 'size', 'resize', 'bobbing', 'floating', 'spin', 'rotate', 'fps', 'mascot', 'character', 'pet', 'falg'],
      content: 'Supports 3D Procedural Bunny mascot and waving Cloth Flag (with custom texture upload). Mascot scale ranges from 0.2x to 3.0x. Motion includes gentle floating bobbing and continuous 3-axis rotation (X, Y, Z) with 0.1x-5.0x speed multipliers. Target frame rates: 30, 60, 120, 144 FPS. Window size is independently resizable from 200x200px to 1200x1200px.'
    },
    weather_atmosphere: {
      title: '🌸 Weather Atmosphere & Particles',
      keywords: ['weather', 'sakura', 'cherry', 'blossom', 'petals', 'rain', 'snow', 'snowfall', 'winter', 'particles', 'falling'],
      content: 'Ambient GPU particle systems include falling Sakura Petals (spring cherry blossom) and Winter Snowfall with dynamic gravity wind drift. Both can be toggled on/off independently or synchronized with audio melody tracks.'
    },
    sound_audio: {
      title: '🎵 Web Audio Synthesizer & Sound FX',
      keywords: ['sound', 'audio', 'music', 'volume', 'mute', 'piano', 'drum', 'groove', 'sakura sound', 'snow sound', 'melody', 'synthesizer', 'midi', 'musicxml'],
      content: 'Web Audio synthesizer includes an acoustic piano playable via keyboard keys A-K, drum rhythm generator, and looping ambient soundscapes for sakura and snowfall. Supports master volume (0-100%), per-channel volume sliders, auto-sync with weather, and binary MIDI/MusicXML score parsing.'
    },
    physics_simulation: {
      title: '⚡ Newtonian Physics & Colliders',
      keywords: ['physics', 'gravity', 'elasticity', 'bounce', 'floor', 'collider', 'throw', 'toss', 'momentum', 'drop', 'falling'],
      content: 'Real-time Newtonian physics engine simulates gravitational acceleration (0-50 m/s²), velocity momentum, window drag tossing, collision restitution (elasticity 0.0-1.0), and a taskbar floor collider keeping the pet grounded.'
    },
    stage_lighting: {
      title: '🔦 Multi-Source Stage Spotlights',
      keywords: ['light', 'spotlight', 'stage', 'lighting', 'beam', 'cone', 'ambient', 'dark stage', 'concert', 'cyan', 'gold', 'pink'],
      content: 'Up to 10 independent stage spotlights with customizable horizontal/vertical orbit angles, beam cone spread, brightness intensity, and preset color palettes (white, warm gold, cyberpunk neon cyan, stage pink, laser red), plus master ambient studio light.'
    },
    texture_cloth: {
      title: '🎨 Flag Cloth Physics & Shader Presets',
      keywords: ['flag', 'cloth', 'wave', 'wind', 'texture', 'roughness', 'metalness', 'cyber', 'matrix', 'star', 'rainbow', 'world'],
      content: 'Dynamic cloth vertex deformation shader for waving flags. Features 5 built-in presets: Default, World, Cyber Neon, Star, and Rainbow. Parameters include wind speed (0.5x-10.0x), wave amplitude (0.05x-1.50x), roughness, and metalness.'
    },
    performance_system: {
      title: '⚙️ Performance Optimization & System Controls',
      keywords: ['performance', 'battery', 'power', 'eco', 'gpu', 'saver', 'dynamic battery', 'fps saver', 'click through', 'ignore mouse', 'xyz', 'hud', 'fps mode'],
      content: 'Performance features include Dynamic Battery Saver (auto-throttles FPS when unfocused), Idle 30 FPS Saver, Force High-Performance Dedicated GPU, Integrated Low-Power GPU, and Seamless Mouse Performance Proxy. System modes include transparent Click-Through (Ignore Mouse), FPS Camera perspective, and live XYZ spatial coordinates HUD.'
    },
    shortcuts_viewport: {
      title: '🖱️ Viewport Controls & Blender Shortcuts',
      keywords: ['shortcut', 'key', 'blender', 'orbit', 'pan', 'zoom', 'ortho', 'view only', 'ctrl+v', 'mmb'],
      content: 'Blender-style viewport navigation: MMB (or Alt+Left Drag) to Orbit, Shift+MMB to Pan, Scroll Wheel to Zoom, Ctrl+Left Arc Drag for Z-Roll. Numpad keys: 1 (Front), 3 (Right), 7 (Top), 9 (180° Flip), Key . or F (Reset View). Ctrl+V toggles View-Only Mode.'
    },
    save_refresh: {
      title: '💾 Save & Refresh Game Companion State',
      keywords: ['save', 'refresh', 'persist', 'save settings', 'save and refresh', 'refresh and save', 'save the game', 'save state'],
      content: 'Atomically saves all active companion parameters (mesh, size, physics, weather, lighting, audio volume, performance) to persistent disk storage in assets/settings JSON and reloads/refreshes the 3D scene.'
    }
  };

  /**
   * Generates dynamic live reality information for a given knowledge topic.
   */
  static getDynamicTopicContent(topicKey, currentSettings = {}, liveState = null, isChinese = false) {
    const s = currentSettings || {};
    const live = liveState || {};

    switch (topicKey) {
      case 'display_mesh': {
        const m = live.display?.activeModel || s.activeModel || 'procedural';
        const sc = live.display?.scale || s.scale || 1.0;
        const w = live.display?.width || s.winWidth || 350;
        const h = live.display?.height || s.winHeight || 350;
        const bob = (live.motion?.bobbing !== undefined ? live.motion.bobbing : (s.bobbing !== false)) ? 'ON' : 'OFF';
        const spY = (live.motion?.spinY !== undefined ? live.motion.spinY : s.spinY) ? `ON (${live.motion?.speedY || s.speedY || 1}x)` : 'OFF';
        return `• Description: Supports 3D Procedural Bunny and Waving Flag. Scale ranges 0.2x-3.0x, Window size 200-1200px.
• 🔴 CURRENT LIVE REALITY: Active Model="${m}", Mascot Scale=${sc}x, Window Size=${w}x${h}px, Bobbing=${bob}, Spin Y=${spY}.`;
      }
      case 'weather_atmosphere': {
        const sak = (live.atmosphere?.sakuraRain !== undefined ? live.atmosphere.sakuraRain : (s.sakuraRain !== false)) ? 'ON 🌸' : 'OFF 🔴';
        const snw = (live.atmosphere?.snowFall !== undefined ? live.atmosphere.snowFall : s.snowFall) ? 'ON ❄️' : 'OFF 🔴';
        return `• Description: GPU particle systems: falling Sakura Petals and Winter Snowfall with wind drift.
• 🔴 CURRENT LIVE REALITY: Sakura Rain=${sak}, Snowfall=${snw}.`;
      }
      case 'sound_audio': {
        const muted = (live.sound?.soundMuted !== undefined ? live.sound.soundMuted : s.soundMuted) ? 'MUTED 🔇' : 'UNMUTED 🔊';
        const mVol = Math.round(((live.sound?.soundMasterVolume !== undefined ? live.sound.soundMasterVolume : s.soundMasterVolume) || 0.8) * 100);
        const sakVol = Math.round(((live.sound?.soundSakuraVolume !== undefined ? live.sound.soundSakuraVolume : s.soundSakuraVolume) || 0.7) * 100);
        const pVol = Math.round(((live.sound?.pianoVolume !== undefined ? live.sound.pianoVolume : s.pianoVolume) || 0.85) * 100);
        return `• Description: Web Audio synthesizer with acoustic piano (A-K keys), drum loops, ambient weather sounds.
• 🔴 CURRENT LIVE REALITY: Master Audio=${muted} (${mVol}%), Sakura Sound=${sakVol}%, Piano Vol=${pVol}%.`;
      }
      case 'physics_simulation': {
        const phy = (live.physics?.enablePhysics !== undefined ? live.physics.enablePhysics : s.enablePhysics) ? 'ENABLED ⚡' : 'DISABLED';
        const grav = live.physics?.physicsGravity !== undefined ? live.physics.physicsGravity : (s.physicsGravity || 9.8);
        return `• Description: Real-time Newtonian physics with gravity (0-50m/s²), floor collision, and tossing momentum.
• 🔴 CURRENT LIVE REALITY: Physics Engine=${phy}, Gravity=${grav} m/s², Taskbar Floor Collider=ENABLED.`;
      }
      case 'texture_cloth': {
        const preset = live.texture?.flagPreset || s.flagPreset || 'default';
        const wind = live.texture?.flagWindSpeed || s.flagWindSpeed || 3.5;
        const wave = live.texture?.flagWaveIntensity || s.flagWaveIntensity || 0.35;
        return `• Description: Cloth vertex deformation. Presets: default, world, cyber, star, rainbow.
• 🔴 CURRENT LIVE REALITY: Active Preset="${preset}", Wind Speed=${wind}x, Wave Amplitude=${wave}x.`;
      }
      case 'performance_system': {
        const dBat = (live.system?.dynamicBatterySaver !== undefined ? live.system.dynamicBatterySaver : s.dynamicBatterySaver) ? 'ON 🔋' : 'OFF';
        const idle = (live.system?.idleFpsSaver !== undefined ? live.system.idleFpsSaver : s.idleFpsSaver) ? 'ON (30 FPS)' : 'OFF';
        const gHigh = (live.system?.gpuOptimize !== undefined ? live.system.gpuOptimize : s.gpuOptimize) ? 'ON 🚀' : 'OFF';
        const gLow = (live.system?.gpuLowPower !== undefined ? live.system.gpuLowPower : s.gpuLowPower) ? 'ON' : 'OFF';
        const mouse = (live.system?.mouseOptimize !== undefined ? live.system.mouseOptimize : s.mouseOptimize) ? 'ON' : 'OFF';
        return `• Description: Dynamic Battery Saver, 30 FPS Idle Saver, High-Perf GPU, Low-Power GPU, Seamless Mouse.
• 🔴 CURRENT LIVE REALITY: Dynamic Battery Saver=${dBat}, Idle 30 FPS=${idle}, High-Perf Dedicated GPU=${gHigh}, Low-Power GPU=${gLow}, Seamless Mouse=${mouse}.`;
      }
      case 'save_refresh': {
        return `• Description: Saves all active settings atomically to persistent assets/settings JSON and re-renders companion scene.
• 🔴 CURRENT LIVE REALITY: Persistent Storage = Ready (Auto-saves on every action).`;
      }
      default:
        return AppContextRetriever.KNOWLEDGE_BASE[topicKey]?.content || '';
    }
  }

  /**
   * Retrieves relevant context snippets dynamically fused with live zero-latency UI reality.
   */
  static retrieveContext(userPrompt, options = {}) {
    const isChinese = /[\u4e00-\u9fa5]/.test(userPrompt);
    const lower = userPrompt.toLowerCase();
    const currentSettings = options.currentSettings || {};
    const liveUI = UIStateInspector.getLiveUIState();
    const matchedTopics = [];

    Object.entries(AppContextRetriever.KNOWLEDGE_BASE).forEach(([key, topic]) => {
      const isMatch = topic.keywords.some(kw => lower.includes(kw));
      if (isMatch) {
        const dynamicContent = AppContextRetriever.getDynamicTopicContent(key, currentSettings, liveUI, isChinese);
        matchedTopics.push(`### ${topic.title}\n${dynamicContent}`);
      }
    });

    // If no specific topic keywords matched, include general dynamic overview
    if (matchedTopics.length === 0) {
      const dispContent = AppContextRetriever.getDynamicTopicContent('display_mesh', currentSettings, liveUI, isChinese);
      const perfContent = AppContextRetriever.getDynamicTopicContent('performance_system', currentSettings, liveUI, isChinese);
      matchedTopics.push(
        `### 🎯 3D Companion Real-Time State Overview\n${dispContent}\n\n${perfContent}`
      );
    }

    const liveUIReality = UIStateInspector.getRealitySummaryString(isChinese);

    const contextHeader = isChinese
      ? `【智能上下文补充与实时应用知识检索 (RAG)】`
      : `[APP KNOWLEDGE BASE & REAL-TIME RUNTIME TELEMETRY (RAG)]`;

    return [
      contextHeader,
      `Below is verified domain knowledge and EXACT CURRENT LIVE RUNTIME STATE of this application:`,
      matchedTopics.join('\n\n'),
      `\n${liveUIReality}`,
      `Use this live context to accurately understand what is ALREADY active and execute the user's requested modifications accurately.`
    ].join('\n\n');
  }

  /**
   * Performs an asynchronous query to a secondary AI context retrieval agent if configured.
   */
  static async querySecondaryContextAgent(userPrompt, endpointUrl, modelName = 'llama3.2') {
    if (!endpointUrl) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const endpoint = endpointUrl.replace(/\/+$/, '') + '/chat/completions';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'You are an App Information Retrieval Agent. Analyze the user prompt and extract key parameters, target domains, and intended settings for a 3D desktop companion application in 2 concise sentences.'
            },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3
        })
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
      }
    } catch (e) {
      // Secondary endpoint offline or timed out
    }
    return null;
  }
}
