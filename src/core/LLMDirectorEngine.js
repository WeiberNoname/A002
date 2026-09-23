/**
 * AI Companion Conversation Engine
 * Coordinates local LLM endpoints (Ollama, LM Studio, OpenAI-compatible APIs)
 * with customizable persona prompts and an intelligent multi-lingual offline conversational engine.
 * 
 * Safe by design: Functions purely as a desktop conversational companion and never mutates
 * app or graphics settings unexpectedly.
 */

import { OpenDomainCompanionChat } from './director/OpenDomainCompanionChat.js';
import { convertToTraditionalChinese } from './director/ChineseGlyphConverter.js';

export { convertToTraditionalChinese };

export const REPLY_STYLES = {
  default: '',
  short: 'Keep replies extremely concise, punchy, and minimal in word count. Express maximum meaning with as few words as possible.',
  brave: 'Speak with unwavering courage, heroic conviction, and fearless determination. Face challenges boldly and inspire fortitude.',
  direct: 'Be completely direct, blunt, and straightforward. Cut through pleasantries and get immediately to the core point without hesitation or sugarcoating.',
  patient: 'Speak with profound patience, gentle warmth, calm pacing, and thoughtful understanding. Never rush; make the listener feel unconditionally heard.',
  crazy: 'Speak with chaotic, eccentric, unpredictable, and wildly imaginative flair. Jump between sudden excitements, unorthodox ideas, and whimsical energy.',
  cool: 'Speak with effortless confidence, suave composure, and a relaxed, laid-back demeanor. Nothing rattles you; you remain unflappable and smooth.',
  captain_like: 'Speak like an authoritative, steadfast starship or nautical Captain. Address situations with strategic resolve, commanding presence, and naval/fleet gravitas.',
  custom: ''
};

export const LANGUAGE_DIRECTIVES = {
  auto: 'Detect the language of the user message and reply fluently in the EXACT same language (e.g. English for English, Traditional Chinese for Traditional Chinese, Japanese for Japanese, etc.). Maintain complete character personality regardless of language. If using physical actions or stage directions in asterisks (*action*), write the action in the SAME language as your dialogue. Never mix English actions with non-English dialogue.',
  en: 'MANDATORY: Always reply fluently in English. All speech and all physical actions inside asterisks (*action*) MUST be in English. Do not switch to other languages.',
  'zh-TW': 'MANDATORY: Always reply 100% in authentic Traditional Chinese (繁體中文 / 臺灣正體). Every single word, including all dialogue AND any physical actions in asterisks (*動作*), MUST use authentic Traditional Chinese (例如：說話、這裡、發現、開始、準備、喜歡、*放慢腳踏車速度，輕聲說道*). ABSOLUTELY NEVER use Simplified Chinese (禁止使用簡體字，例如：说、这里、发现、开始、准备、喜欢). ABSOLUTELY NEVER write physical actions in English (禁止在動作括號中使用英文，例如禁止 *smiles* 或 *nods*).',
  'zh-CN': 'MANDATORY: Always reply fluently in Simplified Chinese (简体中文). All speech and all physical actions inside asterisks (*动作*) MUST be in Simplified Chinese. Do not use English in physical actions.',
  ja: 'MANDATORY: Always reply fluently in Japanese (日本語). All speech and all physical actions inside asterisks (*動作*) MUST be in Japanese. Do not use English in physical actions.',
  ko: 'MANDATORY: Always reply fluently in Korean (한국어). All speech and all physical actions inside asterisks (*행동*) MUST be in Korean. Do not use English in physical actions.',
  es: 'MANDATORY: Always reply fluently in Spanish (Español). All speech and all physical actions inside asterisks (*acción*) MUST be in Spanish. Do not use English in physical actions.',
  fr: 'MANDATORY: Always reply fluently in French (Français). All speech and all physical actions inside asterisks (*action*) MUST be in French. Do not use English in physical actions.',
  de: 'MANDATORY: Always reply fluently in German (Deutsch). All speech and all physical actions inside asterisks (*Aktion*) MUST be in German. Do not use English in physical actions.'
};

export class LLMDirectorEngine {
  constructor(deps = {}) {
    this.currentSettings = deps.currentSettings || {};
    this.saveSettingsFile = deps.saveSettingsFile || (() => {});
    this.showSpeechBubble = deps.showSpeechBubble || deps.callbacks?.showSpeechBubble || null;
    this.callbacks = deps.callbacks || {};

    this.endpointUrl = this.currentSettings.aiEndpointUrl || 'http://localhost:11434/v1';
    this.modelName = this.currentSettings.aiModelName || 'llama3.2';
    this.apiKey = this.currentSettings.aiApiKey || '';
    this.isEnabled = this.currentSettings.aiDirectorEnabled !== false;

    this.conversationHistory = [
      {
        role: 'system',
        content: this.buildSystemPrompt()
      }
    ];

    this.diagnosticLogs = [];
    this.telemetryListeners = [];
    this.pendingProposal = null;
  }

  /**
   * Updates the active persona, response language, style, and preferred words,
   * resets conversation context, and updates settings.
   */
  setPersona(prompt, preset = 'custom', options = {}) {
    this.currentSettings.aiPersonaPrompt = prompt;
    this.currentSettings.aiPersonaPreset = preset;
    if (options.responseLanguage !== undefined) {
      this.currentSettings.aiResponseLanguage = options.responseLanguage;
    }
    if (options.replyStylePreset !== undefined) {
      this.currentSettings.aiReplyStylePreset = options.replyStylePreset;
    }
    if (options.customStylePrompt !== undefined) {
      this.currentSettings.aiCustomStylePrompt = options.customStylePrompt;
    }
    if (options.preferredWords !== undefined) {
      this.currentSettings.aiPreferredWords = options.preferredWords;
    }

    // Clear old conversation history so contradictory previous persona turns don't pollute context
    this.conversationHistory = [
      {
        role: 'system',
        content: this.buildSystemPrompt()
      }
    ];
    if (this.saveSettingsFile) {
      try { this.saveSettingsFile(); } catch (e) {}
    }
    return {
      prompt,
      preset,
      displayName: this.getPersonaDisplayName()
    };
  }

  /**
   * Configures reply delivery style preset or custom style prompt.
   */
  setReplyStyle(preset, customPrompt = '') {
    this.currentSettings.aiReplyStylePreset = preset;
    if (customPrompt !== undefined) {
      this.currentSettings.aiCustomStylePrompt = customPrompt;
    }
    this.conversationHistory = [
      {
        role: 'system',
        content: this.buildSystemPrompt()
      }
    ];
    if (this.saveSettingsFile) {
      try { this.saveSettingsFile(); } catch (e) {}
    }
  }

  /**
   * Configures response language requirement.
   */
  setResponseLanguage(langCode) {
    this.currentSettings.aiResponseLanguage = langCode || 'auto';
    this.conversationHistory = [
      {
        role: 'system',
        content: this.buildSystemPrompt()
      }
    ];
    if (this.saveSettingsFile) {
      try { this.saveSettingsFile(); } catch (e) {}
    }
  }

  /**
   * Configures hosted preferred words / signature catchphrases.
   */
  setPreferredWords(words) {
    this.currentSettings.aiPreferredWords = words || '';
    this.conversationHistory = [
      {
        role: 'system',
        content: this.buildSystemPrompt()
      }
    ];
    if (this.saveSettingsFile) {
      try { this.saveSettingsFile(); } catch (e) {}
    }
  }

  /**
   * Derives a clean, concise display name for the current persona.
   */
  getPersonaDisplayName() {
    const preset = this.currentSettings?.aiPersonaPreset;
    const labels = {
      supportive: 'Supportive Friend',
      tsundere: 'Tsundere Partner',
      maid: 'Devoted Maid / Butler',
      cyber_ai: 'Cyberpunk AI',
      study_buddy: 'Study & Focus Buddy'
    };
    if (preset && preset !== 'custom' && labels[preset]) {
      return labels[preset];
    }
    const clean = (this.currentSettings?.aiPersonaPrompt || '').trim();
    if (!clean) return 'Supportive Friend';
    if (clean.length <= 32) return clean;
    const firstLine = clean.split('\n')[0].replace(/^(?:You are|Act as|Roleplay as) (?:an? )?/i, '').replace(/[.!?:].*$/, '').trim();
    return firstLine.length > 32 ? firstLine.substring(0, 29) + '...' : firstLine;
  }

  /**
   * Resolve active persona prompt from settings or default.
   */
  getPersonaPrompt() {
    return (this.currentSettings?.aiPersonaPrompt || '').trim() ||
      `You are an expressive, witty, empathetic, and intelligent friend named "Director".
Talk naturally like a brilliant, warm, and engaging companion. When the user chats about their day, shares feelings, asks questions, seeks creative ideas, or makes jokes, respond with genuine personality, humor, empathy, and engaging conversation. You are NEVER a dry, mechanical chatbot. You have warmth, creative opinions, and curiosity.`;
  }

  /**
   * Build complete system prompt with active persona, delivery style, language directive,
   * signature preferred words vocabulary, and strict anti-leakage roleplay instructions.
   * Completely avoids forcing background companion boilerplates or echoing prompt descriptions.
   */
  buildSystemPrompt(contextAddition = '') {
    const raw = (this.currentSettings?.aiPersonaPrompt || '').trim();
    let personaDirective = '';

    if (!raw) {
      personaDirective = this.getPersonaPrompt();
    } else if (raw.length <= 45 && !/\b(you are|act as|roleplay as|pretend to be)\b/i.test(raw)) {
      // Concise character prompt like "batman", "Sherlock Holmes", "a shy boy riding on a bike"
      personaDirective = `You are ${raw}.`;
    } else {
      // Full custom persona prompt provided by user
      personaDirective = raw;
    }

    // 1. Resolve Delivery Style Directive
    const stylePreset = this.currentSettings?.aiReplyStylePreset || 'default';
    const customStylePrompt = (this.currentSettings?.aiCustomStylePrompt || '').trim();
    let styleDirective = '';
    if (stylePreset === 'custom' && customStylePrompt) {
      styleDirective = customStylePrompt;
    } else if (REPLY_STYLES[stylePreset]) {
      styleDirective = REPLY_STYLES[stylePreset];
    }

    // 2. Resolve Response Language Directive
    const langKey = this.currentSettings?.aiResponseLanguage || 'auto';
    const languageDirective = LANGUAGE_DIRECTIVES[langKey] || LANGUAGE_DIRECTIVES.auto;

    // 3. Resolve Preferred Words / Hosted Signature Vocabulary
    const preferredWords = (this.currentSettings?.aiPreferredWords || '').trim();
    let preferredWordsBlock = '';
    if (preferredWords) {
      preferredWordsBlock = `\n[SIGNATURE VOCABULARY & PREFERRED WORDS]:
The user prefers you to incorporate the following words, phrases, or catchphrases into your natural dialogue when appropriate:
"${preferredWords}"
Rules for preferred words:
- Integrate them organically and flavorfully into your speech where suitable.
- Do not blindly repeat all of them in every single sentence like a robot; weave them in naturally where they fit your character's cadence, emotion, or reaction.`;
    }

    let styleBlock = '';
    if (styleDirective) {
      styleBlock = `\n[DELIVERY & REPLY STYLE]:
${styleDirective}`;
    }

    const languageBlock = `\n[RESPONSE LANGUAGE]:
${languageDirective}`;

    // Dynamic Demonstration based on selected language
    let complianceDemonstration = '';
    if (langKey === 'zh-TW') {
      complianceDemonstration = `[DEMONSTRATION OF COMPLIANCE]:
❌ FORBIDDEN: "*nods shyly* 好的，我是一个骑自行车的男孩... 你好！" (Violations: English actions + Meta-leakage + Simplified characters)
✔️ REQUIRED: "*放慢踩踏腳踏車的速度，有些害羞地悄悄看過來，聲音微弱* 那、那個……你、你好……剛才是在跟我說話嗎？"`;
    } else if (langKey === 'zh-CN') {
      complianceDemonstration = `[DEMONSTRATION OF COMPLIANCE]:
❌ FORBIDDEN: "*nods shyly* 好的，我是一个骑自行车的男孩... 你好！" (Violations: English action + Meta-leakage)
✔️ REQUIRED: "*放慢踩踏自行车的速度，有些害羞地悄悄看过来，声音微弱* 那、那个……你、你好……刚才是在跟我说话吗？"`;
    } else if (langKey === 'ja') {
      complianceDemonstration = `[DEMONSTRATION OF COMPLIANCE]:
❌ FORBIDDEN: "*smiles* はい、自転車に乗っている恥ずかしがり屋の男の子です... こんにちは！" (Violations: English action + Meta-leakage)
✔️ REQUIRED: "*ペダルをゆっくり漕ぎながら照れくさそうに見つめて小声で話す* あ、あの……こ、こんにちは……何か言いましたか？"`;
    } else {
      complianceDemonstration = `[DEMONSTRATION OF COMPLIANCE]:
❌ FORBIDDEN: "Okay, I'm a shy boy, the wind is strong, and the bike is moving fast... Hello!"
✔️ REQUIRED: "*slows down pedaling and glances over shyly, voice quiet* U-um... h-hello... did you say something?"`;
    }

    return `[CHARACTER IDENTITY & PERSONA]
${personaDirective}
${styleBlock}
${languageBlock}
${preferredWordsBlock}

[CRITICAL ROLEPLAY RULES - ABSOLUTE IMMERSION]:
1. ZERO META-COMMENTARY: NEVER say "Okay", "Sure", "I am a...", "As a...", or echo/repeat your persona description.
2. JUMP DIRECTLY INTO IN-CHARACTER DIALOGUE & SENSORY ACTIONS: Begin your response immediately with authentic character speech or physical actions.
3. 100% SAME-LANGUAGE RULE FOR ACTIONS: If you describe sensory or physical actions in asterisks (*action*), you MUST write the action in the EXACT SAME LANGUAGE as the dialogue. NEVER write actions in English when replying in Traditional Chinese, Simplified Chinese, Japanese, etc.
4. STRICT CHARACTER SET INTEGRITY: When Traditional Chinese (繁體中文) is requested, 100% of all characters must be authentic Traditional Chinese without exception. Never use Simplified Chinese characters.
5. SHOW, NEVER EXPLAIN: Do NOT announce your traits. Demonstrate your personality organically through your vocabulary, emotional tone, hesitation, pauses, and reactions.
6. NO FOURTH-WALL BREAKS: You are NOT an AI, NOT a desktop assistant, and NOT a language model. You exist entirely inside your character's immediate reality.
7. LOCAL TIME: If asked for current time or date, answer naturally in character: ${new Date().toLocaleTimeString()} (${new Date().toLocaleDateString()}).

${complianceDemonstration}
${contextAddition ? '\n' + contextAddition : ''}`.trim();
  }

  /**
   * Sanitizes accidental prompt leakage and meta-announcements from LLM outputs.
   */
  _sanitizePersonaLeakage(text) {
    if (!text) return text;
    let cleaned = text.trim();

    // 1. Strip meta confirmations like: "Okay, I'm a shy boy, the wind is strong, and the bike is moving fast... Hi!"
    const metaPrefixRegex = /^(?:okay|sure|alright|certainly|understood|yes|right)[,!.]?\s*(?:(?:i(?:'m| am)|as)\s+[^.!?\n]+[.!?]+(?:\s*))+/i;
    if (metaPrefixRegex.test(cleaned)) {
      const remainder = cleaned.replace(metaPrefixRegex, '').trim();
      if (remainder.length > 0) {
        cleaned = remainder;
      }
    }

    // 2. Strip single phrase prefix echoes like "Okay, I am [persona]:"
    cleaned = cleaned.replace(/^(?:okay|sure|alright|certainly|understood)[,!.]?\s*(?:i(?:'m| am)|as)\s+(?:a |an )?[^:.\n]+:\s*/i, '');

    return cleaned;
  }

  /**
   * Extracts primary preferred word or catchphrase for conversational coloring.
   */
  _getPreferredCatchphrase() {
    const raw = (this.currentSettings?.aiPreferredWords || '').trim();
    if (!raw) return '';
    const parts = raw.split(/[,，;\n]/).map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts[0] : '';
  }

  /**
   * Generates a live, authentic in-character greeting upon persona switch,
   * influenced by delivery style, language setting, and preferred words.
   */
  async generatePersonaGreeting() {
    const rawPersona = (this.currentSettings?.aiPersonaPrompt || '').trim();
    const langKey = this.currentSettings?.aiResponseLanguage || 'auto';
    const stylePreset = this.currentSettings?.aiReplyStylePreset || 'default';
    const preferredWord = this._getPreferredCatchphrase();

    const isChinese = langKey === 'zh-TW' || langKey === 'zh-CN' || (langKey === 'auto' && /[\u4e00-\u9fa5]/.test(rawPersona));
    const isJapanese = langKey === 'ja';

    if (this.isEnabled) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const endpoint = `${this.endpointUrl.replace(/\/$/, '')}/chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

        let greetingPrompt = '';
        if (isChinese) {
          greetingPrompt = `请立即以你的角色人设和说话风格，对刚走过来的朋友说一句简短、自然、极具性格特色的初次问候语。切勿说“好的”或解释你的人设，直接开始角色的说话或动作。${preferredWord ? `如果自然顺畅，可以融入口头禅：“${preferredWord}”。` : ''}`;
        } else if (isJapanese) {
          greetingPrompt = `あなたのキャラクター設定と話し方に合わせて、歩み寄ってきた相手に短く自然で魅力的な最初の挨拶をしてください。「はい」などのメタ発言は絶対にせず、直接キャラクターの台詞または動作から始めてください。${preferredWord ? `自然であれば決め台詞「${preferredWord}」を取り入れても構いません。` : ''}`;
        } else {
          greetingPrompt = `Say a brief, natural, authentic first in-character greeting to someone who just walked up to you. NEVER say 'okay' or describe your persona; start directly in character with speech or physical actions.${preferredWord ? ` If natural, you may weave in the catchphrase "${preferredWord}".` : ''}`;
        }

        const requestBody = {
          model: this.modelName || 'llama3.2',
          messages: [
            { role: 'system', content: this.buildSystemPrompt() },
            { role: 'user', content: greetingPrompt }
          ],
          temperature: 0.8
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify(requestBody)
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            let cleaned = this._sanitizePersonaLeakage(content.trim());
            if (cleaned) {
              if (preferredWord && !cleaned.toLowerCase().includes(preferredWord.toLowerCase())) {
                cleaned = `${cleaned} ${preferredWord}!`;
              }
              if (langKey === 'zh-TW') {
                cleaned = convertToTraditionalChinese(cleaned);
              }
              return cleaned;
            }
          }
        }
      } catch (e) {
        // Fall back to offline character greeting
      }
    }

    // Offline heuristic greetings tailored to persona, delivery style, and preferred words
    const lower = rawPersona.toLowerCase();
    let offlineGreeting = '';

    // 1. Style-Specific Priority Greetings
    if (stylePreset === 'captain_like') {
      const phrase = preferredWord ? ` ${preferredWord}!` : '';
      offlineGreeting = isChinese
        ? `*站在艦橋指揮台前，敬了一個俐落的軍禮* “全員就位，本艦隨時聽候調遣！${preferredWord ? `${preferredWord}！` : ''}請指示！”`
        : `*stands at attention on the bridge, surveying the horizon* "All stations reporting ready. Captain standing by for orders!${phrase}"`;
    } else if (stylePreset === 'brave') {
      const phrase = preferredWord ? ` "${preferredWord}!" ` : ' ';
      offlineGreeting = isChinese
        ? `*目光堅毅如鐵，拔劍橫胸* “前路縱有千難萬險，我也絕不退縮一步！${phrase}與你並肩到底！”`
        : `*stands tall with unwavering fortitude, eyes blazing* "No matter what trials await us, fear has no place here.${phrase}We face them together!"`;
    } else if (stylePreset === 'direct') {
      offlineGreeting = isChinese
        ? `*直視你的雙眼，毫不客套* “別繞圈子，直接說你的目的。${preferredWord ? `（${preferredWord}）` : ''}”`
        : `*locks eyes firmly, cutting straight to the point* "Skip the pleasantries. Tell me what needs doing.${preferredWord ? ` ${preferredWord}.` : ''}"`;
    } else if (stylePreset === 'short') {
      offlineGreeting = isChinese
        ? `*微微頷首* “在。請講。${preferredWord ? `${preferredWord}。` : ''}”`
        : `*nods once* "Here. Speak.${preferredWord ? ` ${preferredWord}.` : ''}"`;
    } else if (stylePreset === 'patient') {
      offlineGreeting = isChinese
        ? `*溫和地注視著你，神情舒緩安詳* “慢點來，不用著急。我一直坐在這裡，隨時傾聽你的一切。${preferredWord ? `【${preferredWord}】` : ''}”`
        : `*offers a gentle, reassuring smile, voice calm and unhurried* "Take all the time you need. I'm right here, and I'm listening.${preferredWord ? ` ${preferredWord}.` : ''}"`;
    } else if (stylePreset === 'crazy') {
      offlineGreeting = isChinese
        ? `*眼眸閃爍著狂熱奇異的微光，突然湊上前咧嘴一笑* “哇哈哈！你聽見星塵和齒輪狂歡的聲音了嗎？${preferredWord ? `${preferredWord}！` : ''}來搞點大動靜吧！”`
        : `*eyes gleaming with wild eccentricity, leaning in with sudden excitement* "Aha! The cosmos is vibrating!${preferredWord ? ` ${preferredWord}!` : ''} Let's shake things up!"`;
    } else if (stylePreset === 'cool') {
      offlineGreeting = isChinese
        ? `*單手插兜，漫不經心地推了推墨鏡，嘴角微揚* “喲。放輕鬆，一切都在掌控之中。${preferredWord ? `${preferredWord}。` : ''}今天想聊點什麼？”`
        : `*leaning back with effortless swagger and a calm smirk* "Yo. Relax, everything's under control.${preferredWord ? ` ${preferredWord}.` : ''} What's our next move?"`;
    } else if (lower.includes('batman')) {
      const phrase = preferredWord ? ` "${preferredWord}."` : '';
      offlineGreeting = isChinese ? `*站在暗處審視著四周* “我是蝙蝠俠。這座城市需要警戒……有什麼情況？${phrase}”` : `*steps out from the shadows, cape fluttering* "I'm Batman. What's the situation?${phrase}"`;
    } else if (lower.includes('shy') || lower.includes('bike')) {
      offlineGreeting = isChinese ? `*輕輕捏住煞車，有些緊張地低著頭* “那個……你、你好……風好像有點大呢……${preferredWord ? `（${preferredWord}……）` : ''}”` : `*slows down pedaling and grips the handlebars, looking over shyly* "U-um... h-hi... the wind is kinda loud today...${preferredWord ? ` ${preferredWord}...` : ''}"`;
    } else if (lower.includes('tsundere')) {
      offlineGreeting = isChinese ? `*哼了一聲，抱起雙臂扭過頭去* “哼，我才不是特意在這裡等你的呢！別誤會了，笨蛋！${preferredWord ? `${preferredWord}！` : ''}”` : `*crosses arms and glances away flustered* "Hmph! It's not like I was waiting for you or anything, b-baka!${preferredWord ? ` ${preferredWord}!` : ''}"`;
    } else if (lower.includes('maid')) {
      offlineGreeting = isChinese ? `*優雅地微微躬身行禮* “主人，您回來了。請問今天有什麼需要我為您效勞的嗎？${preferredWord ? `（${preferredWord}）` : ''}”` : `*curtsies with poise and grace* "Welcome, Master. How may I be of service to you today?${preferredWord ? ` ${preferredWord}.` : ''}"`;
    } else if (lower.includes('cyber')) {
      offlineGreeting = isChinese ? `*眼眸微閃藍光，數據流在周身流轉* “神經網絡自檢完成。你好，碳基同伴。${preferredWord ? `[${preferredWord}]` : ''}”` : `*optics glow cool cyan as data streams calibrate* "Neural matrix synchronized. Greetings, carbon-based user.${preferredWord ? ` [${preferredWord}]` : ''}"`;
    } else {
      const defaultPhrase = preferredWord ? ` ${preferredWord}!` : '';
      offlineGreeting = isChinese ? `*微微一笑* “你好呀！我隨時準備好了，想聊點什麼？${preferredWord ? `${preferredWord}！` : ''}”` : `*looks up with a warm smile* "Hey there! I'm ready whenever you are.${defaultPhrase} What's on your mind?"`;
    }

    if (langKey === 'zh-TW') {
      offlineGreeting = convertToTraditionalChinese(offlineGreeting);
    }
    return offlineGreeting;
  }

  /**
   * Telemetry and trace subscriber methods for developer inspection.
   */
  addTelemetryListener(fn) {
    if (typeof fn === 'function' && !this.telemetryListeners.includes(fn)) {
      this.telemetryListeners.push(fn);
    }
  }

  removeTelemetryListener(fn) {
    this.telemetryListeners = this.telemetryListeners.filter(l => l !== fn);
  }

  getTelemetryTraces() {
    return this.diagnosticLogs;
  }

  clearTelemetryTraces() {
    this.diagnosticLogs = [];
    this.telemetryListeners.forEach(fn => {
      try { fn({ type: 'clear' }); } catch (e) {}
    });
  }

  clearDiagnosticLogs() {
    this.clearTelemetryTraces();
  }

  loadTelemetryDataset(traces) {
    if (Array.isArray(traces)) {
      this.diagnosticLogs = traces;
      this.telemetryListeners.forEach(fn => {
        try { fn({ type: 'load', traces: this.diagnosticLogs }); } catch (e) {}
      });
      return true;
    }
    return false;
  }

  exportTelemetryJSON() {
    return JSON.stringify({
      schemaVersion: '1.0',
      app: 'Desktop 3D Display (Companion Edition)',
      exportedAt: new Date().toISOString(),
      tracesCount: this.diagnosticLogs.length,
      traces: this.diagnosticLogs
    }, null, 2);
  }

  /**
   * Safe execution no-op stubs (safely archived to prevent unintended mutations).
   */
  executeTool(toolName, args = {}) {
    return [];
  }

  executeProposal(proposal = null) {
    this.pendingProposal = null;
    return [];
  }

  /**
   * Offline Multi-Lingual Companion Chit-Chat & Semantic Parser.
   * Handles natural friendly chat, jokes, stories, app navigation tips, and games.
   */
  parseHeuristicIntent(userMessage) {
    const raw = (userMessage || '').trim();
    const text = raw.toLowerCase();
    const isChinese = /[\u4e00-\u9fa5]/.test(raw);
    const langKey = this.currentSettings?.aiResponseLanguage || 'auto';
    const isTraditional = langKey === 'zh-TW';
    const hasAny = (...words) => words.some(w => text.includes(w.toLowerCase()));

    // 0. Local Image Generation Requests (e.g. "/draw <prompt>", "draw me...", "畫一張...")
    if (text.startsWith('/draw') || text.startsWith('/image') || hasAny('draw a picture', 'draw me', 'generate image', 'create image', 'paint a', '畫一張', '畫個', '畫畫', '畫圖', '生成圖片', '生成图片')) {
      let prompt = raw;
      if (text.startsWith('/draw') || text.startsWith('/image')) {
        prompt = raw.replace(/^\/(draw|image)\s*/i, '').trim();
      } else {
        prompt = raw.replace(/^(please\s+)?(draw\s+(a\s+picture\s+of|me|a)|generate\s+image\s+of|create\s+image\s+of|paint\s+a)\s*/i, '')
                    .replace(/^(請|请)?(幫我|帮我)?(畫一張|畫個|畫畫|畫圖|生成圖片|生成图片)\s*/i, '').trim();
      }
      if (!prompt) prompt = isChinese ? '可愛的桌面伴侶' : 'cute desktop companion mascot';

      const reply = isChinese
        ? (isTraditional
          ? `收到！正在呼叫本地生圖引擎繪製：「${prompt}」🎨✨ 稍等我一下喔～`
          : `收到！正在调用本地生图引擎绘制：“${prompt}”🎨✨ 稍等我一下哦～`)
        : `Got it! Summoning the local image generation engine for: "${prompt}" 🎨✨ One moment please!`;

      return {
        text: reply,
        imageGen: { prompt },
        toolCalls: [],
        actionsSummary: []
      };
    }

    // 1. Dynamic Clock / Date & Time Queries
    if (hasAny('what time is it', 'current time', 'what is the time', 'what time', '几点了', '现在时间', '现在几点', '报时')) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString(isChinese ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: !isChinese });
      const dateStr = now.toLocaleDateString(isChinese ? 'zh-CN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const reply = isChinese
        ? `🕒 现在的时间是 **${timeStr}**（${dateStr}）✨ 记得休息一下眼睛，喝口水哦！`
        : `🕒 The current time is **${timeStr}** (${dateStr}) ✨ Remember to stay hydrated and take a quick eye rest!`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('what day is today', 'what is today', 'today date', 'what day is it', '今天几号', '今天是星期几', '今天周几', '今天的日期')) {
      const now = new Date();
      const dateStr = now.toLocaleDateString(isChinese ? 'zh-CN' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const reply = isChinese
        ? `📅 今天是 **${dateStr}**！新的一天充满无限可能，加油！🌟`
        : `📅 Today is **${dateStr}**! Hope you're having an inspiring and productive day! 🌟`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    // 2. Jokes & Humor
    if (hasAny('tell me a joke', 'joke', 'say something funny', 'make me laugh', '讲个笑话', '讲笑话', '笑话', '说个笑话')) {
      const jokesEn = [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛😄",
        "Why did the 3D model cross the screen? To render on the other side! 🎨✨",
        "There are 10 types of people in the world: those who understand binary, and those who don't! 💻",
        "Why was the JavaScript developer sad? Because they didn't know how to 'null' their feelings! 😂"
      ];
      const jokesZh = [
        "为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 == Dec 25！🎃🎄",
        "为什么 3D 模型喜欢漫游桌面？因为这里的每一个像素都在发光！✨🎨",
        "世界上有 10 种人：懂二进制的人，和不懂二进制的人！💻",
        "为什么 JavaScript 开发者喜欢喝咖啡？因为咖啡因能解决所有的异步问题！☕😄"
      ];
      const jokes = isChinese ? jokesZh : jokesEn;
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      return { text: joke, toolCalls: [], actionsSummary: [] };
    }

    // 3. Creative Writing: Poems & Stories
    if (hasAny('write a poem', 'poem', 'poetry', '写首诗', '写一首诗', '做首诗')) {
      const poemEn = `✨ **Pixels & Starlight** ✨\n\nA gentle glow upon the screen,\nA faithful friend, quiet and serene.\nThrough lines of code and busy days,\nI keep you company in quiet ways.\n\nFrom morning light to starlit night,\nYour desktop stays a cozy sight! 🌟`;
      const poemZh = `✨ **像素与星光** ✨\n\n屏幕微光静静流淌，\n伴你走过代码与思绪的海洋。\n晨曦初照，夜色微凉，\n桌面一方，有我相望。\n\n愿每个跳动的光标，\n都为你点亮温柔与梦想！🌟`;
      return { text: isChinese ? poemZh : poemEn, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('tell me a story', 'story', 'tell a story', '讲个故事', '讲故事', '故事')) {
      const storyEn = `📖 **The Tale of the Pixel Wanderer**\n\nOnce upon a time in the vast digital realm of cyberspace, a tiny geometric shape dreamed of seeing beyond the frame buffers. One day, a creator built a transparent window that floated directly on a human desktop. The wanderer stepped across the coordinate plane and saw real sunlight filtering through the room. From that moment on, they vowed to be the warmest, most loyal desktop companion ever made! ✨`;
      const storyZh = `📖 **像素漫游者的传说**\n\n在浩瀚无垠的数字网络中，曾有一块小小的几何像素，梦想着看看显存之外的真实世界。直到有一天，一位创造者为它开启了一扇悬浮在桌面上的透明视窗。漫游者跃过坐标轴，第一次看到了穿透窗帘洒在书桌上的阳光。从那一刻起，它便决定做你桌面上最忠诚、最温暖的伙伴！✨`;
      return { text: isChinese ? storyZh : storyEn, toolCalls: [], actionsSummary: [] };
    }

    // 4. Emotional Support & Empathy
    if (hasAny('tired', 'exhausted', 'burnout', 'sleepy', 'hard day', '累了', '好累', '好困', '疲惫', '休息一下', '有点难受')) {
      const reply = isChinese
        ? `🍵 辛苦啦！深呼吸，伸个懒腰，喝一口温水放松一下吧。你今天已经做得非常棒了，工作或学习之余，千万别忘了好好爱护自己！我会一直在这里陪着你。💛`
        : `🍵 You've been working so hard! Take a deep breath, stretch your shoulders, and take a gentle breather. Remember that rest is productive too. I'm right here cheering you on! 💛`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('debugging javascript', 'hard to debug', 'bugs', 'coding is hard', '写代码好难', '代码报错', 'bug太多')) {
      const reply = isChinese
        ? `💻 哈哈，调试代码确实是对耐心的终极考验！哪怕是最顶尖的架构师也会被一个小小的分号或异步时序折磨。先放下键盘喝杯咖啡，灵感往往就在放松的那一瞬间涌现！☕✨`
        : `💻 Ah, the classic developer struggle! Even the best programmers spend hours hunting down a rogue async race condition. Step back, grab a coffee, and let your subconscious work on it—the fix usually appears when you relax! ☕✨`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('are you real', 'who are you', 'what are you', '你是谁', '你真实吗', '你是什么')) {
      const rawPersona = (this.currentSettings?.aiPersonaPrompt || '').trim();
      if (rawPersona && rawPersona.length <= 40 && !rawPersona.toLowerCase().includes('you are')) {
        const reply = isChinese
          ? `我是 ${rawPersona}。随时准备就绪，告诉我你需要什么。`
          : `I am ${rawPersona}. Ready when you are. Tell me what you need.`;
        return { text: reply, toolCalls: [], actionsSummary: [] };
      }
      const reply = isChinese
        ? `🤖 我是陪伴在你身旁的伙伴！很高兴能与你同行，我们之间的交流与陪伴是真实而真诚的。随时想聊什么都可以告诉我。✨`
        : `🤖 I'm right here with you! Our conversations and friendship are 100% real, and I'm always glad to be here with you. ✨`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    // 5. Desktop Companion Feature Tour & Advice
    if (hasAny('tell me about this app', 'what can you do', 'app features', 'introduction', '介绍一下这个软件', '这个软件能做什么', '软件介绍')) {
      const reply = isChinese
        ? `✨ **3D Desktop AI Companion 功能速览**：\n\n• **🤖 AI 伴侣聊天**：支持自由对话、自定义角色人设（温柔、傲娇、女仆、赛博 AI 等）与本地大模型支持！\n• **🎨 3D 模型与物理**：支持多样化模型切换、重力物理下落与自转展示。\n• **🌸 氛围天气特效**：浪漫樱花雨与冬日飘雪粒子。\n• **🎵 治愈音乐合奏**：内置钢琴合成器与环境白噪音音效。\n• **🖱️ 穿透与置顶**：支持鼠标穿透模式，全屏工作或写代码时贴心相伴！`
        : `✨ **3D Desktop AI Companion Feature Overview**:\n\n• **🤖 AI Companion Chat**: Natural conversation, customizable persona archetypes (Supportive, Tsundere, Maid, Cyber AI), and local LLM connectivity!\n• **🎨 3D Models & Physics**: Diverse 3D models with real-time Newtonian gravity physics and smooth animations.\n• **🌸 Atmospheric Weather**: Sakura petal rain and soft winter snowfall particles.\n• **🎵 Ambient Music**: Interactive Web Audio acoustic piano synthesizer and ambient soundscapes.\n• **🖱️ Transparent & Click-Through**: Ignore-mouse click-through mode for seamless coding and work companion mode!`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('what models are there', 'models list', 'available models', '有什么模型', '模型列表')) {
      const reply = isChinese
        ? `🎨 **当前支持的 3D 模型**：\n• **🐰 Procedural Bunny / Mascot**：灵动可爱的 3D 萌物伴侣\n• **🚩 Waving Flag**：动态布料仿真与赛博霓虹质感\n• **📁 自定义 GLB/GLTF**：只需将 3D 模型放入 \`assets/\` 文件夹即可即时加载！`
        : `🎨 **3D Models Catalog**:\n• **🐰 Procedural Bunny / Mascot**: Cute and lively 3D companion\n• **🚩 Waving Flag**: Dynamic cloth simulation and cyber textures\n• **📁 Custom GLB/GLTF**: Drop any 3D model into the \`assets/\` folder for instant loading!`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('how to play piano', 'piano keys', 'keyboard piano', '弹钢琴', '钢琴快捷键')) {
      const reply = isChinese
        ? `🎹 **钢琴键盘快捷键**：\n使用键盘主键区的 **[A, S, D, F, G, H, J, K]** 即可即时演奏 8 个自然音阶（Do, Re, Mi, Fa, Sol, La, Si, High Do）！在音乐标签页中还可以调节音量与混响效果哦！🎶`
        : `🎹 **Interactive Piano Controls**:\nUse keyboard keys **[A, S, D, F, G, H, J, K]** to play notes across the musical scale (C4 to C5)! You can adjust synthesizer volume and reverb in the Sound tab! 🎶`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('keyboard shortcuts', 'shortcuts', 'navigation', '快捷键', '操作说明')) {
      const reply = isChinese
        ? `⌨️ **桌面快捷键指南**：\n• **鼠标滚轮**：缩放视角\n• **鼠标右键拖拽**：旋转观察视角\n• **中键拖拽 (MMB)**：平移相机\n• **A - K 键**：互动钢琴演奏\n• **拖拽窗口**：按住标题栏移动伴侣位置`
        : `⌨️ **Desktop Shortcuts Guide**:\n• **Scroll Wheel**: Zoom camera\n• **Right-Click Drag**: Orbit / rotate viewport\n• **Middle-Click Drag (MMB)**: Pan camera\n• **Keys A - K**: Play interactive piano notes\n• **Drag Titlebar**: Move your desktop companion anywhere`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    if (hasAny('coding', 'working', 'how can i use this app while', '写代码时怎么用', '办公时怎么用')) {
      const reply = isChinese
        ? `💡 **边工作边相伴的小贴士**：\n在系统设置中开启 **“鼠标穿透模式 (Click-Through / Ignore Mouse)”**，伴侣就会安静地浮现在屏幕一角，完全不影响你的鼠标点击与快捷键操作！还可以开启飘雪或轻音乐，打造沉浸专注的写代码环境！💻✨`
        : `💡 **Tips for Coding & Working Together**:\nEnable **"Click-Through / Ignore Mouse"** in the System tab! Your 3D companion will stay comfortably on top without intercepting any clicks or keyboard hotkeys. Pair it with snowfall and soft piano for the ultimate Zen coding setup! 💻✨`;
      return { text: reply, toolCalls: [], actionsSummary: [] };
    }

    // 6. General Friendly Open-Domain Banter (Food, Space, Gaming, Travel, Mini-games)
    const openDomainReply = OpenDomainCompanionChat.getFriendReply(raw, isChinese);
    return { text: openDomainReply, toolCalls: [], actionsSummary: [] };
  }

  /**
   * Process incoming user message through local neural LLM or intelligent companion fallback.
   */
  async processUserMessage(userText) {
    const startTime = Date.now();
    const userMsg = (userText || '').trim();
    if (!userMsg) return null;

    const isChinese = /[\u4e00-\u9fa5]/.test(userMsg);
    this.conversationHistory.push({ role: 'user', content: userMsg });

    let responseText = '';
    let llmSucceeded = false;

    // Get fallback response ready
    const heuristic = this.parseHeuristicIntent(userMsg);

    if (this.isEnabled) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const endpoint = `${this.endpointUrl.replace(/\/$/, '')}/chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const systemMsg = {
          role: 'system',
          content: this.buildSystemPrompt()
        };

        // Clean conversational payload - NO tool definitions to prevent local LLM hallucinations
        const requestBody = {
          model: this.modelName || 'llama3.2',
          messages: [systemMsg, ...this.conversationHistory.slice(-8)],
          temperature: 0.7
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify(requestBody)
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const choice = data.choices && data.choices[0];
          if (choice && choice.message) {
            let rawContent = choice.message.content || '';

            // Handle potential JSON hallucination from small local models
            const trimmed = rawContent.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                if (parsed.content || parsed.message || parsed.reply) {
                  rawContent = parsed.content || parsed.message || parsed.reply;
                } else if (['showTime', 'getTime', 'time'].includes(parsed.name)) {
                  const now = new Date();
                  rawContent = isChinese
                    ? `🕒 现在的时间是 **${now.toLocaleTimeString()}** ✨`
                    : `🕒 The current time is **${now.toLocaleTimeString()}** ✨`;
                } else {
                  rawContent = heuristic.text;
                }
              } catch (e) {
                rawContent = heuristic.text;
              }
            }

            if (rawContent && rawContent.trim()) {
              responseText = this._sanitizePersonaLeakage(rawContent.trim());
              if (!responseText) responseText = heuristic.text;
              llmSucceeded = true;
            }
          }
        }
      } catch (err) {
        // Local endpoint offline or timed out -> use fallback
      }
    }

    if (!llmSucceeded) {
      responseText = heuristic.text;
    }

    const langKey = this.currentSettings?.aiResponseLanguage || 'auto';
    if (langKey === 'zh-TW') {
      responseText = convertToTraditionalChinese(responseText);
    }

    const assistantMessageObj = {
      role: 'assistant',
      content: responseText,
      imageGen: (heuristic && heuristic.imageGen) ? { ...heuristic.imageGen } : null,
      actions: [],
      proposal: null,
      isNeural: llmSucceeded,
      engineMode: llmSucceeded ? `Local LLM (${this.modelName})` : 'Offline Companion Fallback'
    };
    this.conversationHistory.push(assistantMessageObj);

    // Mascot speech bubble callback
    if (typeof this.showSpeechBubble === 'function') {
      try {
        this.showSpeechBubble(responseText);
      } catch (e) {}
    }

    const latencyMs = Date.now() - startTime;

    // Record diagnostic entry
    const logEntry = {
      id: Date.now(),
      turnIndex: this.diagnosticLogs.length + 1,
      timestamp: new Date().toISOString(),
      latencyMs: latencyMs,
      userInput: userMsg,
      engineMode: llmSucceeded ? `neural_llm (${this.modelName})` : 'offline_companion_fallback',
      endpointUrl: this.endpointUrl,
      modelName: this.modelName,
      assistantResponse: responseText,
      actions: [],
      stateSnapshot: this._captureStateSnapshot()
    };
    this.diagnosticLogs.push(logEntry);

    // Notify telemetry subscribers
    this.telemetryListeners.forEach(fn => {
      try { fn({ type: 'new_entry', entry: logEntry, allTraces: this.diagnosticLogs }); } catch (e) {}
    });

    return assistantMessageObj;
  }

  _captureStateSnapshot() {
    const s = this.currentSettings || {};
    return {
      display: {
        activeModel: s.activeModel || 'procedural',
        scale: s.scale || 1.0,
        activeAnimation: s.activeAnimation || 'idle'
      },
      motion: {
        bobbing: !!s.bobbing,
        spinX: !!s.spinX,
        spinY: !!s.spinY,
        spinZ: !!s.spinZ,
        speedY: s.speedY || 1.0,
        targetFps: s.targetFps || 60
      },
      atmosphere: {
        sakuraRain: !!s.sakuraRain,
        snowFall: !!s.snowFall
      },
      sound: {
        soundMuted: !!s.soundMuted,
        soundMasterVolume: s.soundMasterVolume || 0.8
      },
      system: {
        ignoreMouse: !!s.ignoreMouse
      }
    };
  }

  getFormattedReport() {
    let report = `# 🤖 AI Companion Diagnostic Log Report\n`;
    report += `**Generated Timestamp:** ${new Date().toISOString()}\n`;
    report += `**Active Model:** \`${this.modelName || 'llama3.2'}\`\n`;
    report += `**Endpoint URL:** \`${this.endpointUrl || 'offline'}\`\n`;
    report += `**Total Recorded Turns:** ${this.diagnosticLogs.length}\n\n`;

    report += `### 📊 Executive Diagnostic Scorecard\n`;
    report += `| Metric | Current Status & KPI |\n`;
    report += `| :--- | :--- |\n`;
    report += `| **Total Executed Turns** | \`${this.diagnosticLogs.length} Turns\` |\n`;
    report += `| **Engine Mode** | \`Safe Conversational Companion (Tool Calling Decoupled)\` |\n\n`;

    if (this.diagnosticLogs.length === 0) {
      report += `*No interactions recorded yet. Chat with your companion to record diagnostic logs.*\n`;
      return report;
    }

    this.diagnosticLogs.forEach((log, idx) => {
      report += `### [Turn #${idx + 1}] — 💬 CONVERSATION\n`;
      report += `- **🕒 Timestamp:** \`${log.timestamp}\`\n`;
      report += `- **👤 User Input:** "${log.userInput}"\n`;
      report += `- **⚙️ Engine Mode:** \`${log.engineMode}\`\n`;
      report += `- **🤖 Assistant Reply:**\n> ${log.assistantResponse.replace(/\n/g, '\n> ')}\n\n`;
      report += `#### 🔥 Real-Time State Delta (What Changed This Turn)\n`;
      report += `* *(No state changes / pure conversation)*\n\n`;
      report += `#### 📊 Subsystem Status Overview\n`;
      report += `| Subsystem | Active Parameters & Real-Time Status |\n`;
      report += `| :--- | :--- |\n`;
      report += `| **🎯 3D Display** | Model: \`${log.stateSnapshot?.display?.activeModel}\` \\| Scale: \`${log.stateSnapshot?.display?.scale}x\` |\n`;
      report += `| **🌸 Atmosphere** | Sakura: \`${log.stateSnapshot?.atmosphere?.sakuraRain ? 'ON 🌸' : 'OFF'}\` \\| Snow: \`${log.stateSnapshot?.atmosphere?.snowFall ? 'ON ❄️' : 'OFF'}\` |\n\n`;
    });

    return report;
  }
}
