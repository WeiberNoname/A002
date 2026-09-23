/**
 * Lighting Domain Tools
 * Handles stage spotlights, intensity, colors, and ambient brightness.
 */

export const LightingTools = {
  name: 'lighting',
  tools: [
    {
      name: 'setLighting',
      description: 'Configure 3D stage lighting and spotlight intensity (0.0 to 3.0).',
      parameters: {
        type: 'object',
        properties: {
          spotIntensity: { type: 'number', description: 'Spotlight brightness intensity (0.0 to 3.0)' },
          ambientIntensity: { type: 'number', description: 'Ambient fill light intensity (0.0 to 2.0)' }
        }
      },
      sanitize: (args, settings) => {
        const clamp = (v, min, max, def) => {
          const num = parseFloat(v);
          if (isNaN(num)) return def;
          return parseFloat(Math.max(min, Math.min(max, num)).toFixed(2));
        };
        return {
          spotIntensity: args.spotIntensity !== undefined ? clamp(args.spotIntensity, 0, 3.0, settings.spot1Intensity || 1.5) : undefined,
          ambientIntensity: args.ambientIntensity !== undefined ? clamp(args.ambientIntensity, 0, 2.0, settings.ambientIntensity || 0.6) : undefined
        };
      },
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        if (args.spotIntensity !== undefined) {
          s.spot1Intensity = args.spotIntensity;
          ctx.syncUI('setting-spot1Intensity', args.spotIntensity);
        }
        if (args.ambientIntensity !== undefined) {
          s.ambientIntensity = args.ambientIntensity;
          ctx.syncUI('setting-ambientIntensity', args.ambientIntensity);
        }
        return `Lighting: Spot=${s.spot1Intensity || 1.5}x, Ambient=${s.ambientIntensity || 0.6}x`;
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // Ensure we do NOT match 'slightly', 'lightly', 'flight'
    const isLightingTopic = /\b(stage light|stage lights|spotlights?|lighting|stage brightness|ambient light)\b/i.test(text) ||
                            /\b(?:make|set|turn)\b.*\b(?:brighter|dimmer|darker|bright|dim)\b/i.test(text) ||
                            ['灯光', '光照', '聚光灯', '舞台灯', '舞台光', '变亮', '变暗'].some(w => text.includes(w));

    if (isLightingTopic) {
      let spot = currentSettings.spot1Intensity || 1.5;
      if (/\b(brighter|bright)\b/i.test(text) || text.includes('变亮') || text.includes('亮一点')) {
        spot = Math.min(3.0, spot + 0.5);
      } else if (/\b(dark|dim|dimmer)\b/i.test(text) || text.includes('变暗') || text.includes('暗一点')) {
        spot = Math.max(0.2, spot - 0.5);
      }
      spot = parseFloat(spot.toFixed(2));
      toolCalls.push({ name: 'setLighting', args: { spotIntensity: spot } });
      actionsSummary.push(isChinese ? `调整舞台灯光亮度为 ${spot}x` : `adjusted stage lighting to ${spot}x`);
    }

    return { toolCalls, actionsSummary };
  }
};
