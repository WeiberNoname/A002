/**
 * Atmosphere Domain Tools
 * Handles ambient weather particle systems (cherry blossom sakura petals & winter snowfall).
 */

export const AtmosphereTools = {
  name: 'atmosphere',
  tools: [
    {
      name: 'setWeather',
      description: 'Configure ambient weather particle systems (sakura petals and snowfall).',
      parameters: {
        type: 'object',
        properties: {
          sakuraRain: { type: 'boolean', description: 'Enable falling cherry blossom sakura petals' },
          snowFall: { type: 'boolean', description: 'Enable snowfall winter particles' }
        }
      },
      sanitize: (args, settings) => ({
        sakuraRain: args.sakuraRain !== undefined ? !!args.sakuraRain : settings.sakuraRain,
        snowFall: args.snowFall !== undefined ? !!args.snowFall : settings.snowFall
      }),
      execute: (args, ctx) => {
        const s = ctx.currentSettings;
        if (args.sakuraRain !== undefined) {
          s.sakuraRain = args.sakuraRain;
          ctx.syncUI('sakura-rain', args.sakuraRain, true);
        }
        if (args.snowFall !== undefined) {
          s.snowFall = args.snowFall;
          ctx.syncUI('snow-fall', args.snowFall, true);
        }
        return `Weather: Sakura=${s.sakuraRain ? 'ON' : 'OFF'}, Snow=${s.snowFall ? 'ON' : 'OFF'}`;
      }
    }
  ],

  parseIntent: (text, currentSettings, isChinese) => {
    const toolCalls = [];
    const actionsSummary = [];

    // Comprehensive negation detector (handles phrases, contractions, and words before OR after topic)
    const isNegated = /\b(disable|disabled|disabling|turn off|turned off|turning off|shut off|stop|stopped|stopping|clear|cleared|clearing|remove|removed|removing|no|off|close|closed|closing|hide|hidden|hiding|cancel|canceled|cancelling|none|zero|mute|muted|don't|dont|do not|doesn't|doesnt|does not|did not|didn't|won't|wont|would not|never|without|no more|not want|dont want|don't want|dont need|don't need|not need|dont like|don't like|not like|don't see|dont see|not see)\b/i.test(text) ||
                      ['关闭', '关掉', '关', '停止', '停', '别', '不要', '不想', '不需要', '不用', '无', '禁用', '取消', '静音', '隐藏', '别下', '别出', '看不见', '不想看到', '别显示'].some(w => text.includes(w));

    // Visual keywords indicator
    const hasVisualKeywords = /\b(rain|petals?|particles?|falling|drop|effect|effects|visual|weather|see|look|snow and sakura)\b/i.test(text) ||
                              ['雨', '花瓣', '飘落', '粒子', '特效', '效果', '视觉', '天气', '看', '看到', '出现'].some(w => text.includes(w));

    // Pure audio indicator (no visual particles mentioned)
    const isPureAudio = (/\b(sound|music|audio|melody|tune|track|noise|still there|too loud|mute|volume|song)\b/i.test(text) ||
                        ['声音', '音乐', '音频', '音效', '静音', '还在响', '还在播', '太吵'].some(w => text.includes(w))) && !hasVisualKeywords;

    // 1. General Weather Turn Off ("turn off the weather", "clear weather", "关掉天气")
    const isGeneralWeatherClear = (/\b(turn off|stop|disable|clear|close)\s+(?:all\s+)?(?:the\s+)?weather\b/i.test(text) || text.includes('关闭天气') || text.includes('关掉天气')) && !isPureAudio;
    if (isGeneralWeatherClear) {
      toolCalls.push({ name: 'setWeather', args: { sakuraRain: false, snowFall: false } });
      actionsSummary.push(isChinese ? '关闭了所有天气特效' : 'turned off weather effects');
      return { toolCalls, actionsSummary };
    }

    // 2. Sakura Cherry Blossoms (Visual Petals / Effects)
    const isSakuraTopic = (/\b(sakura|cherry blossom|petals?)\b/i.test(text) || ['樱花', '花瓣'].some(w => text.includes(w))) &&
                          (!isPureAudio || hasVisualKeywords);

    if (isSakuraTopic) {
      const enable = !isNegated;
      toolCalls.push({ name: 'setWeather', args: { sakuraRain: enable } });
      actionsSummary.push(isChinese ? (enable ? '开启了樱花雨 🌸' : '关闭了樱花雨') : (enable ? 'turned on sakura petals 🌸' : 'turned off sakura petals'));
    }

    // 3. Snowfall (Visual Flakes / Effects)
    const isSnowTopic = (/\b(snow|snowfall|blizzard|winter)\b/i.test(text) || ['雪', '下雪', '落雪', '雪花', '开下雪'].some(w => text.includes(w))) &&
                        (!isPureAudio || hasVisualKeywords);

    if (isSnowTopic) {
      const enable = !isNegated;
      toolCalls.push({ name: 'setWeather', args: { snowFall: enable } });
      actionsSummary.push(isChinese ? (enable ? '开启了飘雪效果 ❄️' : '关闭了飘雪效果') : (enable ? 'activated snowfall particles ❄️' : 'turned off snowfall'));
    }

    return { toolCalls, actionsSummary };
  }
};
