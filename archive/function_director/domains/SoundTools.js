/**
 * Sound & Audio Domain Tools
 * Handles procedural synthesizer volume, drum grooves,
 * sakura & snow ambient weather audio loops, master volume, explicit percentage extraction, and muting.
 */

import { soundManager } from '../../SoundManager.js';

export const SoundTools = {
  name: 'sound',
  tools: [
    {
      name: 'setSoundVolume',
      description: 'Configure master audio, synthesizer volume, ambient weather loops (sakura/snow), drums, and mute status.',
      parameters: {
        type: 'object',
        properties: {
          masterVolume: { type: 'number', description: 'Master sound volume (0.0 to 1.0)' },
          drumVolume: { type: 'number', description: 'Drum sound effects volume (0.0 to 1.0)' },
          sakuraVolume: { type: 'number', description: 'Sakura ambient melody volume (0.0 to 1.0)' },
          snowVolume: { type: 'number', description: 'Snow ambient breeze volume (0.0 to 1.0)' },
          sakuraSync: { type: 'boolean', description: 'Auto-sync sakura sound with sakura rain' },
          snowSync: { type: 'boolean', description: 'Auto-sync snow sound with snowfall' },
          muted: { type: 'boolean', description: 'True to mute all audio' }
        }
      },
      sanitize: (args, settings) => {
        const clamp = (v, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(0, Math.min(1.0, num)).toFixed(2));
        };
        return {
          masterVolume: args.masterVolume !== undefined ? clamp(args.masterVolume, settings.soundMasterVolume !== undefined ? settings.soundMasterVolume : 0.8) : undefined,
          drumVolume: args.drumVolume !== undefined ? clamp(args.drumVolume, settings.soundDrumVolume !== undefined ? settings.soundDrumVolume : 0.7) : undefined,
          sakuraVolume: args.sakuraVolume !== undefined ? clamp(args.sakuraVolume, settings.soundSakuraVolume !== undefined ? settings.soundSakuraVolume : 0.7) : undefined,
          snowVolume: args.snowVolume !== undefined ? clamp(args.snowVolume, settings.soundSnowVolume !== undefined ? settings.soundSnowVolume : 0.7) : undefined,
          sakuraSync: args.sakuraSync !== undefined ? !!args.sakuraSync : undefined,
          snowSync: args.snowSync !== undefined ? !!args.snowSync : undefined,
          muted: args.muted !== undefined ? !!args.muted : undefined
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        const actions = [];

        if (args.muted !== undefined) {
          s.soundMuted = args.muted;
          ctx.syncUI('sound-master-enable', !args.muted, true);
          if (soundManager) soundManager.setMuted(args.muted);
          actions.push(`Audio Mute: ${args.muted ? 'MUTED' : 'UNMUTED'}`);
        }
        if (args.masterVolume !== undefined) {
          s.soundMasterVolume = args.masterVolume;
          ctx.syncUI('sound-master-vol', args.masterVolume);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-sound-master-vol') : null;
          if (valEl) valEl.innerText = Math.round(args.masterVolume * 100) + '%';
          if (soundManager) soundManager.setMasterVolume(args.masterVolume);
          actions.push(`Master Vol: ${Math.round(args.masterVolume * 100)}%`);
        }
        if (args.sakuraVolume !== undefined) {
          s.soundSakuraVolume = args.sakuraVolume;
          ctx.syncUI('sound-sakura-vol', args.sakuraVolume);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-sound-sakura-vol') : null;
          if (valEl) valEl.innerText = Math.round(args.sakuraVolume * 100) + '%';
          if (soundManager) {
            soundManager.setTrackVolume('sakura', args.sakuraVolume);
            if (args.sakuraVolume === 0) soundManager.stopSakura();
          }
          actions.push(`Sakura Sound: ${Math.round(args.sakuraVolume * 100)}%`);
        }
        if (args.sakuraSync !== undefined) {
          s.soundSakuraSync = args.sakuraSync;
          ctx.syncUI('sound-sakura-sync', args.sakuraSync, true);
          if (!args.sakuraSync && soundManager) soundManager.stopSakura();
        }
        if (args.snowVolume !== undefined) {
          s.soundSnowVolume = args.snowVolume;
          ctx.syncUI('sound-snow-vol', args.snowVolume);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-sound-snow-vol') : null;
          if (valEl) valEl.innerText = Math.round(args.snowVolume * 100) + '%';
          if (soundManager) {
            soundManager.setTrackVolume('snow', args.snowVolume);
            if (args.snowVolume === 0) soundManager.stopSnow();
          }
          actions.push(`Snow Sound: ${Math.round(args.snowVolume * 100)}%`);
        }
        if (args.snowSync !== undefined) {
          s.soundSnowSync = args.snowSync;
          ctx.syncUI('sound-snow-sync', args.snowSync, true);
          if (!args.snowSync && soundManager) soundManager.stopSnow();
        }
        if (args.drumVolume !== undefined) {
          s.soundDrumVolume = args.drumVolume;
          ctx.syncUI('sound-drum-vol', args.drumVolume);
          const valEl = typeof document !== 'undefined' ? document.getElementById('val-sound-drum-vol') : null;
          if (valEl) valEl.innerText = Math.round(args.drumVolume * 100) + '%';
          if (soundManager) soundManager.setTrackVolume('drum', args.drumVolume);
          actions.push(`Drum Vol: ${Math.round(args.drumVolume * 100)}%`);
        }

        if (soundManager) soundManager.syncAtmosphere(s);

        return actions.length > 0 ? actions.join(', ') : 'Audio volume updated';
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // Comprehensive negation detector
    const isNegated = /\b(disable|disabled|turn off|turned off|shut off|stop|stopped|clear|remove|no|off|close|mute|muted|silence|silent|shut up|still there|stop playing|quiet|don't|dont|do not|doesn't|doesnt|does not|did not|didn't|won't|wont|would not|never|without|no more|not want|dont want|don't want|dont need|don't need|not need|dont like|don't like|not like|don't hear|dont hear|not hear)\b/i.test(text) ||
                      ['静音', '关闭', '关掉', '停止', '停', '别响', '还在响', '还在播', '关声音', '无声', '别播', '不要', '不想', '不需要', '不用', '吵', '太吵'].some(w => text.includes(w));

    // Helper: extracts explicit percentage (e.g. "30%", "30 percent", "0.3", "for 30 percent", "at 30 percent")
    const extractExplicitVolume = (str, fallback = 0.7) => {
      const pMatch = str.match(/(?:at\s+|to\s+|for\s+|volume\s+)?(\d+(?:\.\d+)?)\s*(?:%|percent|分之|成)/i);
      if (pMatch) {
        const p = parseFloat(pMatch[1]);
        if (!isNaN(p)) return parseFloat(Math.max(0, Math.min(1.0, p / 100)).toFixed(2));
      }
      const dMatch = str.match(/\b(0\.\d+)\b/);
      if (dMatch) {
        const d = parseFloat(dMatch[1]);
        if (!isNaN(d)) return parseFloat(Math.max(0, Math.min(1.0, d)).toFixed(2));
      }
      return fallback;
    };

    // 1. Sakura Sound / Music / Audio
    const isSakuraSound = /\b(sakura (?:sound|music|audio|melody|tune|track)|sound (?:of )?sakura)\b/i.test(text) ||
                          (/\b(sakura|cherry)\b/i.test(text) && /\b(sound|music|audio|melody|track|noise|still there|mute|volume|loud|quiet|hear)\b/i.test(text)) ||
                          ['樱花音乐', '樱花声音', '樱花音效', '樱花音频', '樱花还在响'].some(w => text.includes(w));

    if (isSakuraSound) {
      if (isNegated || /\b(still there|too loud|turn down)\b/i.test(text)) {
        toolCalls.push({
          name: 'setSoundVolume',
          args: { sakuraVolume: 0.0, sakuraSync: false }
        });
        actionsSummary.push(isChinese ? '静音了樱花背景音乐 🌸' : 'muted sakura ambient sound 🌸');
      } else {
        const vol = extractExplicitVolume(text, 0.7);
        toolCalls.push({
          name: 'setSoundVolume',
          args: { sakuraVolume: vol, sakuraSync: true }
        });
        actionsSummary.push(isChinese ? `开启了樱花背景音乐 (${Math.round(vol * 100)}%) 🌸` : `set sakura ambient sound to ${Math.round(vol * 100)}% 🌸`);
      }
      return { toolCalls, actionsSummary };
    }

    // 2. Snow Sound / Music / Audio
    const isSnowSound = /\b(snow (?:sound|music|audio|breeze|wind|track)|sound (?:of )?snow)\b/i.test(text) ||
                        (/\b(snow|winter)\b/i.test(text) && /\b(sound|music|audio|wind|breeze|track|noise|still there|mute|volume|hear)\b/i.test(text)) ||
                        ['雪花声音', '下雪声音', '飘雪音乐', '雪天音效'].some(w => text.includes(w));

    if (isSnowSound) {
      if (isNegated || /\b(still there|too loud|turn down)\b/i.test(text)) {
        toolCalls.push({
          name: 'setSoundVolume',
          args: { snowVolume: 0.0, snowSync: false }
        });
        actionsSummary.push(isChinese ? '静音了飘雪背景风声 ❄️' : 'muted snowfall ambient sound ❄️');
      } else {
        const vol = extractExplicitVolume(text, 0.7);
        toolCalls.push({
          name: 'setSoundVolume',
          args: { snowVolume: vol, snowSync: true }
        });
        actionsSummary.push(isChinese ? `开启了飘雪背景风声 (${Math.round(vol * 100)}%) ❄️` : `set snowfall ambient sound to ${Math.round(vol * 100)}% ❄️`);
      }
      return { toolCalls, actionsSummary };
    }

    // 3. Drum Sound / Rhythm
    const isDrumSound = /\b(drum|rhythm|beat|groove|percussion)\b/i.test(text) ||
                        ['鼓声', '架子鼓', '鼓点', '节奏'].some(w => text.includes(w));
    if (isDrumSound) {
      if (isNegated) {
        toolCalls.push({ name: 'setSoundVolume', args: { drumVolume: 0.0 } });
        actionsSummary.push(isChinese ? '关闭了节奏鼓声 🥁' : 'muted drum beat 🥁');
      } else {
        const vol = extractExplicitVolume(text, 0.7);
        toolCalls.push({ name: 'setSoundVolume', args: { drumVolume: vol } });
        actionsSummary.push(isChinese ? `设置节奏鼓声音量为 ${Math.round(vol * 100)}% 🥁` : `set drum beat volume to ${Math.round(vol * 100)}% 🥁`);
      }
      return { toolCalls, actionsSummary };
    }

    // 4. General Master Sound / Mute / Volume
    const isSoundTopic = /\b(sound|volume|mute|muted|audio|master volume|louder|quieter|turn down|turn up|be quiet|silence)\b/i.test(text) ||
                         ['音量', '声音', '静音', '大声点', '小声点', '调小音量', '调大音量', '关闭声音', '主音量'].some(w => text.includes(w));

    if (isSoundTopic) {
      if (/\b(mute|muted|silence|silent|shut up|be quiet)\b/i.test(text) || text.includes('静音') || text.includes('关掉声音') || text.includes('关闭声音')) {
        toolCalls.push({ name: 'setSoundVolume', args: { muted: true } });
        actionsSummary.push(isChinese ? '静音了所有声音' : 'muted all application audio');
      } else if (/\b(unmute|turn on sound|enable sound)\b/i.test(text) || text.includes('取消静音') || text.includes('打开声音')) {
        const vol = extractExplicitVolume(text, 0.8);
        toolCalls.push({ name: 'setSoundVolume', args: { muted: false, masterVolume: vol } });
        actionsSummary.push(isChinese ? '恢复了声音播放' : 'unmuted audio');
      } else {
        const hasExplicit = /(?:\d+(?:\.\d+)?)\s*(?:%|percent)/i.test(text);
        let newVol = hasExplicit ? extractExplicitVolume(text, 0.8) : (currentSettings.soundMasterVolume !== undefined ? currentSettings.soundMasterVolume : 0.8);
        if (!hasExplicit) {
          if (/\b(louder|increase|up)\b/i.test(text) || text.includes('大声')) newVol = Math.min(1.0, newVol + 0.2);
          else if (/\b(quieter|lower|down)\b/i.test(text) || text.includes('小声')) newVol = Math.max(0.1, newVol - 0.2);
        }
        newVol = parseFloat(newVol.toFixed(2));
        toolCalls.push({ name: 'setSoundVolume', args: { masterVolume: newVol, muted: false } });
        actionsSummary.push(isChinese ? `调整主音量为 ${Math.round(newVol * 100)}%` : `set master volume to ${Math.round(newVol * 100)}%`);
      }
    }

    return { toolCalls, actionsSummary };
  }
};
