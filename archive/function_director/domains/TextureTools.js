/**
 * Texture & Flag Domain Tools
 * Handles flag presets, cloth wave physics, wind speed, wave amplitude,
 * surface roughness, and metalness.
 */

export const TextureTools = {
  name: 'texture',
  tools: [
    {
      name: 'setTextureSettings',
      description: 'Configure flag texture preset, wind speed, wave intensity, roughness, and metalness.',
      parameters: {
        type: 'object',
        properties: {
          flagPreset: { type: 'string', description: 'Preset flag: "dragon", "cyber", "galaxy", "sakura", "aurora", "ocean"' },
          flagWindSpeed: { type: 'number', description: 'Wind speed multiplier (0.5 to 10.0)' },
          flagWaveIntensity: { type: 'number', description: 'Wave amplitude (0.05 to 1.50)' },
          textureRoughness: { type: 'number', description: 'Surface roughness (0.0 to 1.0)' },
          textureMetalness: { type: 'number', description: 'Surface metalness (0.0 to 1.0)' }
        }
      },
      sanitize: (args, settings) => {
        const clamp = (v, min, max, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(min, Math.min(max, num)).toFixed(2));
        };
        const validPresets = ['eclipse', 'prism', 'zen', 'dragon', 'cyber', 'galaxy', 'sakura', 'aurora', 'ocean', 'default', 'world', 'star', 'rainbow'];
        const preset = args.flagPreset && validPresets.includes(args.flagPreset.toLowerCase()) ? args.flagPreset.toLowerCase() : undefined;
        return {
          flagPreset: preset,
          flagWindSpeed: args.flagWindSpeed !== undefined ? clamp(args.flagWindSpeed, 0.5, 10.0, settings.flagWindSpeed || 3.5) : undefined,
          flagWaveIntensity: args.flagWaveIntensity !== undefined ? clamp(args.flagWaveIntensity, 0.05, 1.5, settings.flagWaveIntensity || 0.35) : undefined,
          textureRoughness: args.textureRoughness !== undefined ? clamp(args.textureRoughness, 0.0, 1.0, settings.textureRoughness || 0.5) : undefined,
          textureMetalness: args.textureMetalness !== undefined ? clamp(args.textureMetalness, 0.0, 1.0, settings.textureMetalness || 0.05) : undefined
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        const actions = [];

        if (args.flagPreset !== undefined) {
          s.flagPreset = args.flagPreset;
          s.customTexturePath = null;
          actions.push(`Flag Preset: ${args.flagPreset}`);
          if (ctx.callbacks.applyFlagPreset) ctx.callbacks.applyFlagPreset(args.flagPreset);
        }
        if (args.flagWindSpeed !== undefined) {
          s.flagWindSpeed = args.flagWindSpeed;
          actions.push(`Wind Speed: ${args.flagWindSpeed}x`);
        }
        if (args.flagWaveIntensity !== undefined) {
          s.flagWaveIntensity = args.flagWaveIntensity;
          actions.push(`Wave Amp: ${args.flagWaveIntensity}x`);
        }
        if (args.textureRoughness !== undefined) {
          s.textureRoughness = args.textureRoughness;
          actions.push(`Roughness: ${args.textureRoughness}`);
        }
        if (args.textureMetalness !== undefined) {
          s.textureMetalness = args.textureMetalness;
          actions.push(`Metalness: ${args.textureMetalness}`);
        }

        if (ctx.callbacks.updateTextureShader) ctx.callbacks.updateTextureShader();

        return actions.length > 0 ? actions.join(', ') : 'Texture settings updated';
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // 1. Preset Flag Styles
    let matchedPreset = null;
    let presetLabel = '';
    const hasFlagContext = /\b(flag|texture|banner|cloth|pattern|style|preset|theme)\b/i.test(text) || ['旗', '材质', '旗帜', '风格', '预设', '纹理', '图案'].some(w => text.includes(w));

    if (/\b(eclipse flag|solar eclipse|eclipse preset|日食|日蚀旗|日全食)\b/i.test(text) || (hasFlagContext && /\b(eclipse|solar|日食|日蚀)\b/i.test(text))) {
      matchedPreset = 'eclipse';
      presetLabel = isChinese ? '日蚀之曜' : 'Solar Eclipse';
    } else if (/\b(prism flag|geometric prism|prism preset|棱镜|几何棱镜|包豪斯)\b/i.test(text) || (hasFlagContext && /\b(prism|geometric|bauhaus|棱镜|几何)\b/i.test(text))) {
      matchedPreset = 'prism';
      presetLabel = isChinese ? '几何棱镜' : 'Geometric Prism';
    } else if (/\b(zen flag|zen harmony|enso flag|禅意|禅境|太极和风)\b/i.test(text) || (hasFlagContext && /\b(zen|enso|harmony|balance|禅意|禅境)\b/i.test(text))) {
      matchedPreset = 'zen';
      presetLabel = isChinese ? '禅意和风' : 'Zen Harmony';
    } else if (/\b(dragon flag|dragon banner|mythic dragon|dragon crest|神龙旗|龙旗|神龙图腾)\b/i.test(text) || (hasFlagContext && /\b(dragon|mythic|神龙|龙|龙纹)\b/i.test(text))) {
      matchedPreset = 'dragon';
      presetLabel = isChinese ? '神龙图腾' : 'Mythic Dragon';
    } else if (/\b(cyber neon|cyber flag|neon flag|synthwave flag|赛博霓虹|赛博旗|霓虹旗)\b/i.test(text) || (hasFlagContext && /\b(cyber|neon|synthwave|赛博|霓虹)\b/i.test(text))) {
      matchedPreset = 'cyber';
      presetLabel = isChinese ? '赛博霓虹' : 'Cyber Neon';
    } else if (/\b(cosmic nebula|galaxy flag|nebula flag|space flag|星云宇宙|星云旗|银河旗)\b/i.test(text) || (hasFlagContext && /\b(galaxy|nebula|cosmos|space|starlight|星空|星云|银河)\b/i.test(text))) {
      matchedPreset = 'galaxy';
      presetLabel = isChinese ? '星云宇宙' : 'Cosmic Nebula';
    } else if (/\b(sakura flag|sakura banner|sakura texture|sakura preset|sakura style|落樱旗|樱花旗|落樱和风)\b/i.test(text) || (hasFlagContext && /\b(sakura|cherry blossom|樱花|落樱)\b/i.test(text))) {
      matchedPreset = 'sakura';
      presetLabel = isChinese ? '落樱和风' : 'Sakura Blossom';
    } else if (/\b(nordic aurora|aurora flag|aurora preset|aurora style|极光幻境|极光旗|北极光旗)\b/i.test(text) || (hasFlagContext && /\b(aurora|nordic|northern lights|极光|北极光)\b/i.test(text))) {
      matchedPreset = 'aurora';
      presetLabel = isChinese ? '极光幻境' : 'Nordic Aurora';
    } else if (/\b(abyssal wave|ocean flag|wave flag|tidal flag|沧海浪潮|沧海旗|浪潮旗|海浪旗)\b/i.test(text) || (hasFlagContext && /\b(ocean|abyss|tidal|sea|wave|大海|海浪|浪潮)\b/i.test(text))) {
      matchedPreset = 'ocean';
      presetLabel = isChinese ? '沧海浪潮' : 'Abyssal Wave';
    }

    // 2. Wind Speed & Wave Physics
    const isWindTopic = /\b(wind|wave|cloth|breeze|flutter|ripples?)\b/i.test(text) ||
                        ['风速', '风力', '飘动', '波动', '旗帜波浪', '波纹'].some(w => text.includes(w));

    let windSpeed = undefined;
    let waveAmp = undefined;

    if (isWindTopic) {
      const curSpeed = currentSettings.flagWindSpeed || 3.5;
      const speedMatch = text.match(/wind\s*(?:speed)?\s*(?:to|=)?\s*([0-9]+(?:\.[0-9]+)?)/i) || text.match(/风速\s*([0-9]+(?:\.[0-9]+)?)/);
      if (speedMatch) {
        windSpeed = parseFloat(speedMatch[1]);
      } else if (/\b(increase|faster|more|stronger|high|up)\b/i.test(text) || ['加大', '变快', '变大', '大风', '快点', '增加'].some(w => text.includes(w))) {
        windSpeed = Math.min(10.0, curSpeed + 2.0);
      } else if (/\b(decrease|slower|less|gentle|calm|low|down)\b/i.test(text) || ['减小', '变慢', '微风', '慢点', '降低'].some(w => text.includes(w))) {
        windSpeed = Math.max(0.5, curSpeed - 1.5);
      }
    }

    if (matchedPreset || windSpeed !== undefined || waveAmp !== undefined) {
      toolCalls.push({
        name: 'setTextureSettings',
        args: {
          flagPreset: matchedPreset || undefined,
          flagWindSpeed: windSpeed !== undefined ? parseFloat(windSpeed.toFixed(1)) : undefined,
          flagWaveIntensity: waveAmp !== undefined ? parseFloat(waveAmp.toFixed(2)) : undefined
        }
      });

      if (matchedPreset) {
        actionsSummary.push(isChinese ? `应用了${presetLabel}旗帜样式` : `applied ${presetLabel} flag style`);
      }
      if (windSpeed !== undefined) {
        actionsSummary.push(isChinese ? `将旗帜风速调整为 ${windSpeed.toFixed(1)}x` : `set flag wind speed to ${windSpeed.toFixed(1)}x`);
      }
    }

    return { toolCalls, actionsSummary };
  }
};
