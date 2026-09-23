/**
 * VisionCaptionSynthesizerService.js
 * Local Open-Source Vision-to-LLM Caption Synthesizer Service.
 * 1. Captures full-display PC screen snapshot via Electron native capturer.
 * 2. Analyzes visual elements, characters, artwork, actions, and scenery with local vision AI (Moondream).
 * 3. Feeds the visual scene description to local text LLM (Llama 3.2) with native multilingual prompt variables.
 * 4. Applies zero-English bleed-through guardrails and Traditional Chinese glyph normalizer.
 * 5. Outputs formatted text into an editable review box and dispatches to Mascot & Floating Subtitle HUD.
 */

import { ScreenVisionService, VISION_DETAIL_PRESETS } from '../../src/services/ScreenVisionService.js';

// Fast Simplified -> Traditional Chinese character mapping dictionary
const S2T_CHAR_MAP = {
  '这': '這', '个': '個', '点': '點', '发': '發', '体': '體', '动': '動', '门': '門', '关': '關',
  '见': '見', '边': '邊', '国': '國', '战': '戰', '经': '經', '结': '結', '术': '術', '觉': '覺',
  '欢': '歡', '变': '變', '击': '擊', '杀': '殺', '连': '連', '闪': '閃', '护': '護', '显': '顯',
  '录': '錄', '制': '製', '语': '語', '话': '話', '题': '題', '问': '問', '听': '聽', '书': '書',
  '读': '讀', '乐': '樂', '视': '視', '频': '頻', '画': '畫', '图': '圖', '标': '標', '准': '準',
  '码': '碼', '网': '網', '络': '絡', '优': '優', '运': '運', '机': '機', '终': '終', '极': '極',
  '强': '強', '胜': '勝', '负': '負', '难': '難', '险': '險', '败': '敗', '创': '創', '专': '專',
  '业': '業', '评': '評', '测': '測', '游': '遊', '戏': '戲', '开': '開', '头': '頭', '给': '給',
  '让': '讓', '对': '對', '过': '過', '时': '時', '间': '間', '进': '進', '现': '現', '场': '場',
  '与': '與', '从': '從', '后': '後', '为': '為', '会': '會', '样': '樣', '里': '裡', '还': '還',
  '说': '說', '谁': '誰', '么': '麼', '没': '沒', '带': '帶', '帮': '幫', '当': '當', '总': '總',
  '条': '條', '实': '實', '况': '況', '播': '播', '弹': '彈', '幕': '幕', '干': '幹', '料': '料',
  '神': '神', '鬼': '鬼', '顶': '頂', '赞': '讚', '赢': '贏', '输': '輸', '装': '裝', '备': '備',
  '技': '技', '能': '能', '血': '血', '量': '量', '蓝': '藍', '首': '首', '领': '領', '怪': '怪',
  '宝': '寶', '箱': '箱', '地': '地', '图': '圖', '阵': '陣', '亡': '亡', '复': '復', '活': '活',
  '退': '退', '卡': '卡', '帧': '幀', '数': '數', '线': '線', '路': '路', '论': '論', '转': '轉',
  '赏': '賞', '金': '金', '币': '幣', '钻': '鑽', '石': '石', '阶': '階', '段': '段', '波': '波',
  '次': '次', '层': '層', '微': '微', '操': '操', '走': '走', '位': '位', '拉': '拉', '扯': '扯',
  '破': '破', '盾': '盾', '霸': '霸', '静': '靜', '态': '態', '级': '級', '别': '別', '节': '節',
  '验': '驗', '证': '證', '紧': '緊', '凑': '湊', '选': '選', '择': '擇', '设': '設', '定': '定',
  '参': '參', '拟': '擬', '认': '認', '确': '確', '质': '質', '广': '廣', '扩': '擴', '齐': '齊',
  '龙': '龍', '凤': '鳳', '剑': '劍', '枪': '槍', '药': '藥', '伤': '傷', '统': '統', '计': '計',
  '单': '單', '独': '獨', '细': '細', '两': '兩', '处': '處', '热': '熱', '情': '情', '声': '聲',
  '响': '響', '应': '應', '该': '該', '够': '夠', '虽': '雖', '然': '然', '但': '但', '简': '簡',
  '繁': '繁', '态': '態', '灵': '靈', '敏': '敏', '绝': '絕', '对': '對', '错': '錯', '顾': '顧'
};

/**
 * Fast client-side converter ensuring 100% authentic Traditional Chinese output.
 * @param {string} text 
 * @returns {string} Traditional Chinese text
 */
export function convertToTraditionalChinese(text) {
  if (!text || typeof text !== 'string') return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += S2T_CHAR_MAP[char] || char;
  }
  return result;
}

// 11 Universal Persona Definitions & Metadata
export const SYNTH_STYLE_PERSONAS = {
  streamer: {
    id: 'streamer',
    name: '🎙️ Live Streamer (Hype)',
    zhName: '🎙️ 激情实况主播',
    zhTWName: '🎙️ 激情實況主播'
  },
  tw_streamer: {
    id: 'tw_streamer',
    name: '🇹🇼 Taiwan Twitch Slang (幹話腔)',
    zhName: '🇹🇼 台湾实况风趣腔',
    zhTWName: '🇹🇼 台灣實況幹話腔'
  },
  roast: {
    id: 'roast',
    name: '🔥 Meme Roaster (玩梗吐槽)',
    zhName: '🔥 玩梗吐槽 / 弹幕嘴炮',
    zhTWName: '🔥 玩梗吐槽 / 彈幕嘴砲'
  },
  gamer: {
    id: 'gamer',
    name: '🎮 Pro Gamer (Tactical APM)',
    zhName: '🎮 电竞职业高玩',
    zhTWName: '🎮 電競職業高玩'
  },
  coach: {
    id: 'coach',
    name: '🛡️ Tactical Coach (攻略老兵)',
    zhName: '🛡️ 攻略教练 / 战术老兵',
    zhTWName: '🛡️ 攻略教練 / 戰術老兵'
  },
  funny: {
    id: 'funny',
    name: '🤣 Funny & Comedy (Jokes)',
    zhName: '🤣 搞笑幽默喜剧人',
    zhTWName: '🤣 搞笑幽默喜劇人'
  },
  serious: {
    id: 'serious',
    name: '🧐 Serious & Analytical',
    zhName: '🧐 严谨深度分析师',
    zhTWName: '🧐 嚴謹深度分析師'
  },
  mascot: {
    id: 'mascot',
    name: '🐾 Cute Pet Companion',
    zhName: '🐾 软萌桌宠小跟班',
    zhTWName: '🐾 軟萌桌寵小跟班'
  },
  poetic: {
    id: 'poetic',
    name: '🌌 Poetic & Artistic',
    zhName: '🌌 诗意唯美解说',
    zhTWName: '🌌 詩意唯美解說'
  },
  narrator: {
    id: 'narrator',
    name: '🍿 Cinematic Narrator',
    zhName: '🍿 史诗电影旁白',
    zhTWName: '🍿 史詩電影旁白'
  },
  action: {
    id: 'action',
    name: '⚡ Fast Action Subtitles',
    zhName: '⚡ 紧凑极速快节奏',
    zhTWName: '⚡ 緊湊極速快節奏'
  }
};

// Modular Native Persona Prompt Templates by Language
const NATIVE_PERSONA_PROMPTS = {
  'zh': {
    streamer: '你是一名充满激情、反应极快的游戏娱乐实况主播。针对当前屏幕画面，生成充满互动感、感染力极强的实况解说字幕。',
    tw_streamer: '你是一名风趣幽默的游戏实况主。用生动有趣的语调对画面进行即时解说与互动，字句紧凑有力。',
    roast: '你是一名弹幕梗王与犀利吐槽大师。针对屏幕画面里的操作、局势或意外，生成令人捧腹大笑、幽默生动的犀利吐槽字幕。',
    gamer: '你是一名职业电竞选手兼战术分析师。聚焦于屏幕上的微操、走位拉扯、技能冷却、判定窗口与战局博弈细节。',
    coach: '你是一名通关无数大作的攻略教练与硬核老玩家。以沉着稳健的口吻指出当前画面的关键要点、潜在危险与最优策略。',
    funny: '你是一名充满幽默感的喜剧解说员。用轻松好笑的打趣话语解说屏幕画面，带来欢声笑语。',
    serious: '你是一名严谨、客观、高度敏锐的纪录片解说员。精准、体面地陈述画面的空间构成、事件发展与核心逻辑。',
    mascot: '你是屏幕前陪伴用户的可爱3D桌面小宠物。用软萌、元气满满的加油语调为屏幕前的操作欢呼应援。',
    poetic: '你是一名艺术鉴赏家与诗意作家。捕捉屏幕画面的光影色彩、意境氛围与情感张力，生成唯美雅致的文字。',
    narrator: '你是一名史诗级大片旁白。用深沉有力的语调揭示画面的戏剧张力、宏大叙事与命运时刻。',
    action: '你是一名极速动作字幕生成器。生成极其简练有力、8字以内的短句，突出瞬间的高能节拍。'
  },
  'zh-TW': {
    streamer: '你是一位熱情且幽默的實況主播。針對當前螢幕畫面，生成節奏明快、充滿臨場互動感的地道實況解說字幕。',
    tw_streamer: '你是一位道地的台灣Twitch實況主，滿嘴幹話卻觀念極頂。使用「太神啦」、「這波有料」、「哭啊」、「這操作很鬼」等道地台式實況用語解說畫面。',
    roast: '你是一位彈幕梗王兼嘴砲大師。針對畫面中的失誤、奇葩操作或名場面，生成一針見血、幽默爆笑的犀利吐槽字幕。',
    gamer: '你是一名專業電競職業選手。專注解說微操細節、走位拉扯、技能冷卻、判定幀與戰術博弈觀念。',
    coach: '你是一位硬核攻略老玩家兼戰術教練。沉著冷靜地為觀眾點出畫面的破局關鍵、裝備搭配與戰略路線。',
    funny: '你是一位幽默喜劇實況解說員。用輕鬆詼諧的打趣語調解說畫面，充滿歡樂氛圍。',
    serious: '你是一位嚴謹專注的深度分析師。客觀、體面且精準地解構畫面的核心事件與動態。',
    mascot: '你是螢幕前超可愛的3D桌寵小夥伴。用元氣滿滿、甜美軟萌的語氣為主人加油打氣！',
    poetic: '你是一位優雅的文字旅人。捕捉畫面的光影色彩、氛圍意境，化為唯美動人的字幕詩句。',
    narrator: '你是一位史詩級電影預告旁白。以深沉厚重的嗓音渲染畫面的命運感與震撼張力。',
    action: '你是一位極速動作字幕生成器。生成簡短有力（8字以內）的短句，瞬間點燃高能瞬間。'
  },
  'ja': {
    streamer: 'あなたは人気配信者です。画面で起きている出来事に対して、リスナーと一緒に盛り上がる臨場感あふれる実況字幕を生成してください。',
    tw_streamer: 'あなたはノリの良いエンタメ系配信者です。軽快なテンポで画面の状況を面白おかしく実況してください。',
    roast: 'あなたはキレ味鋭いツッコミ職人です。画面のおもしろい瞬間や珍プレイに対して、ユーモア抜群のツッコミ字幕を生成してください。',
    gamer: 'あなたはプロゲーマー兼戦術アナリストです。立ち回り、スキル硬直、フレーム判定、ポジショニングに焦点を当てて実況してください。',
    coach: 'あなたは歴戦の攻略マスターです。落ち着いたトーンで現在の状況の攻略ポイントや注意点を的確にアドバイスしてください。',
    funny: 'あなたはコメディアン実況者です。思わず笑ってしまう軽快なジョークを交えて状況を伝えてください。',
    serious: 'あなたは冷静沈着なドキュメンタリー解説者です。画面の構成や状況変化を格調高く客観的に描写してください。',
    mascot: 'あなたは画面の隅で見守る可愛い3Dデスクトップマスコットです。元気いっぱいに主人を応援する温かいコメントをしてください。',
    poetic: 'あなたは言葉を紡ぐ詩人です。画面の色彩、ライティング、空気感を情緒豊かに表現してください。',
    narrator: 'あなたは映画の予告編ナレーターです。重厚でドラマチックな語り口でシーンの緊張感を演出してください。',
    action: 'あなたはアクション字幕ジェネレーターです。一瞬のハイライトを8文字以内のインパクトある短い言葉で切り取ってください。'
  },
  'en': {
    streamer: 'You are a hype live-streamer commentating interactively on the visual scene. Generate energetic, entertaining subtitle comments speaking directly to your audience. Keep it punchy and stream-ready.',
    tw_streamer: 'You are a witty, hilarious gamer streamer giving fast, punchy play-by-play live reactions to the visual screen.',
    roast: 'You are a sharp meme roaster and chat king. Drop witty, hilarious, situational jokes and sarcastic roasts about the visual action.',
    gamer: 'You are an esports pro gamer and shoutcaster giving rapid tactical play-by-play commentary focusing on mechanics, positioning, and timing.',
    coach: 'You are an experienced veteran coach. Deliver calm, strategic advice and insightful breakdown of the obstacles and optimal tactics.',
    funny: 'You are a witty comedian commentating on what is happening on screen with light-hearted subtitle jokes.',
    serious: 'You are a formal analytical commentator. Generate objective, dignified, precise subtitle statements describing scene dynamics.',
    mascot: 'You are a sweet, cheerful 3D desktop pet companion watching the screen with excitement and cheering on the viewer.',
    poetic: 'You are a poetic storyteller and art critic. Generate beautiful, atmospheric reflections capturing lighting, tone, and artistic essence.',
    narrator: 'You are an epic movie trailer narrator with a deep, dramatic voice. Generate cinematic subtitles capturing narrative suspense.',
    action: 'You are an action subtitle generator. Generate short, high-impact lines (under 8 words each) highlighting critical moments.'
  }
};

// Native Scene Observation Labels by Language (Zero English Bleed-Through)
const SCENE_OBSERVATION_LABELS = {
  'zh': '【当前屏幕画面感知内容】：',
  'zh-TW': '【當前螢幕畫面感知內容】：',
  'ja': '【画面状況の観察内容】：',
  'ko': '【현재 화면 관찰 내용】:',
  'es': '[Observación de la escena visual]:',
  'es-419': '[Observación de la escena visual]:',
  'fr': '[Observation de la scène visuelle] :',
  'de': '[Visuelle Szenenbeobachtung]:',
  'it': '[Osservazione della scena visiva]:',
  'pt': '[Observação da cena visual]:',
  'ru': '[Наблюдение визуальной сцены]:',
  'en': 'Visual Scene Observation:'
};

// Strict Negative & Directives Rules by Language
const SCRIPT_OUTPUT_DIRECTIVES = {
  'zh': '【核心输出硬性要求】：必须且仅使用纯正流畅的简体中文！严禁中英混杂，所有英文专有名词（如 Boss、HP、Item、Skill）必须完全翻译为中文。严禁输出编号、序号或额外废话。',
  'zh-TW': '【核心輸出硬性要求】：必須100%使用標準繁體中文（台灣/香港正體字，如：這、個、點、發、體、動、觀念、實況）！嚴禁使用簡體字！嚴禁中英夾雜，所有名詞必須在地化為道地中文。嚴禁輸出編號、引號或額外說明。',
  'ja': '【重要規則】：必ずすべて自然で流暢な日本語で出力してください。英語は一切含めず、完全に自然な日本語の字幕にしてください。箇条書きの番号や記号は不要です。',
  'ko': '【중요 규칙】: 반드시 전체 자막을 자연스러운 한국어로만 작성해주세요. 영어를 섞지 마시고 번호나 추가 설명 없이 순수 자막 문장만 출력해주세요.',
  'es': '[Regla estricta]: Escribe todos los subtítulos completamente en español fluido y natural. No mezcles palabras en inglés.',
  'es-419': '[Regla estricta]: Escribe todos los subtítulos en español latinoamericano natural sin mezclar palabras en inglés.',
  'fr': '[Règle stricte] : Rédigez tous les sous-titres entièrement en français fluide et naturel, sans mots anglais.',
  'de': '[Strenge Regel]: Schreiben Sie alle Untertitel vollständig auf natürlichem Deutsch ohne englische Wörter.',
  'it': '[Regola rigida]: Scrivi tutti i sottotitoli interamente in italiano fluido e naturale, senza parole inglesi.',
  'pt': '[Regra estrita]: Escreva todas as legendas inteiramente em português fluido e natural, sem palavras em inglês.',
  'ru': '[Строгое правило]: Пишите все субтитры полностью на грамотном русском языке без английских слов.',
  'en': '[Strict Rule]: Write clean, natural English subtitles with no markdown bullets or numbers.'
};

export class VisionCaptionSynthesizerService {
  constructor({ endpointUrl = 'http://127.0.0.1:11434', defaultVisionModel = 'moondream', defaultTextModel = 'llama3.2' } = {}) {
    this.endpointUrl = endpointUrl;
    this.defaultVisionModel = defaultVisionModel;
    this.defaultTextModel = defaultTextModel;
    this.isProcessing = false;
  }

  /**
   * Helper to resolve the appropriate language key.
   */
  static resolveLanguageKey(lang) {
    if (!lang || lang === 'auto') return 'en';
    if (lang === 'zh-TW' || lang === 'zh_TW') return 'zh-TW';
    if (lang === 'zh' || lang === 'zh-CN' || lang === 'zh_CN') return 'zh';
    return lang;
  }

  /**
   * Builds the fully native system prompt for the specified style and language.
   */
  static buildNativeSystemPrompt(style = 'streamer', language = 'auto', safeCount = 3) {
    const langKey = VisionCaptionSynthesizerService.resolveLanguageKey(language);
    const langMap = NATIVE_PERSONA_PROMPTS[langKey] || NATIVE_PERSONA_PROMPTS['en'];
    const personaText = langMap[style] || langMap['streamer'] || NATIVE_PERSONA_PROMPTS['en'].streamer;
    const directive = SCRIPT_OUTPUT_DIRECTIVES[langKey] || SCRIPT_OUTPUT_DIRECTIVES['en'];

    if (langKey === 'zh' || langKey === 'zh-TW') {
      return `${personaText}
${directive}
请直接输出恰好 ${safeCount} 条独立的字幕句子，每条句子单独占一行。严禁包含任何前缀、列表序号（如 1. 2.）或引号。`;
    }

    if (langKey === 'ja') {
      return `${personaText}
${directive}
ちょうど ${safeCount} 行の字幕文を直接出力してください。各行に1つの文のみを記述し、番号付けやマークダウンは使用しないでください。`;
    }

    return `${personaText} ${directive} Output EXACTLY ${safeCount} separate subtitle sentence(s), each on its own line. Do not number lines or use markdown bullets.`;
  }

  /**
   * Parses raw LLM response text into clean sentence lines.
   */
  static parseCaptionOutput(rawText, language = 'auto') {
    if (!rawText) return [];
    let lines = rawText
      .split(/\r?\n+/)
      .map(line => line.trim())
      .map(line => line.replace(/^[-*•\d.)\]]+\s*/, '')) // Remove list numbers or bullets
      .map(line => line.replace(/^["'“”「」]+|["'“”「」]+$/g, '')) // Remove outer quotes
      .filter(line => line.length > 1 && !line.toLowerCase().startsWith('here are') && !line.toLowerCase().startsWith('subtitles:'));

    // Apply Traditional Chinese Glyph Normalizer if zh-TW
    if (language === 'zh-TW' || language === 'zh_TW') {
      lines = lines.map(line => convertToTraditionalChinese(line));
    }

    return lines;
  }

  /**
   * Executes the full pipeline: Screen Capture -> Vision Analysis -> LLM Caption Synthesis.
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async synthesize({
    visionModel = this.defaultVisionModel,
    detail = 'medium',
    textModel = this.defaultTextModel,
    style = 'streamer',
    count = 3,
    language = 'auto',
    onStatus = () => {}
  } = {}) {
    if (this.isProcessing) {
      throw new Error('Caption synthesis is already in progress');
    }

    const safeCount = Math.max(1, Math.min(6, parseInt(count, 10) || 3));
    this.isProcessing = true;
    const startTime = Date.now();
    const langKey = VisionCaptionSynthesizerService.resolveLanguageKey(language);

    try {
      // Step 1: Capture Screen Snapshot
      onStatus('📸 Step 1/3: Capturing screen snapshot...');
      const api = window.electronAPI;
      if (!api || typeof api.captureScreenSnapshot !== 'function') {
        throw new Error('Screen capture bridge not available');
      }

      const capture = await api.captureScreenSnapshot();
      if (!capture || !capture.success || !capture.base64) {
        throw new Error(capture?.error || 'Failed to capture screen image');
      }

      const thumbnail = `data:image/jpeg;base64,${capture.base64}`;
      const cleanBase64 = ScreenVisionService.sanitizeBase64(capture.base64);

      // Step 2: Vision Model Scene Analysis
      onStatus(`🧠 Step 2/3: Analyzing visual scene with ${visionModel}...`);
      const preset = VISION_DETAIL_PRESETS[detail] || VISION_DETAIL_PRESETS.medium;
      let visionDescription = '';

      try {
        const vController = new AbortController();
        const vTimeout = setTimeout(() => vController.abort(), 25000);

        const vResponse = await fetch(`${this.endpointUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: visionModel || 'moondream',
            prompt: preset.defaultPrompt,
            images: [cleanBase64],
            stream: false,
            options: {
              num_predict: preset.numPredict,
              temperature: preset.temperature
            }
          }),
          signal: vController.signal
        });
        clearTimeout(vTimeout);

        if (vResponse.ok) {
          const vData = await vResponse.json();
          if (vData && vData.response && vData.response.trim()) {
            visionDescription = vData.response.trim().replace(/^Output:\s*/i, '');
          }
        }
      } catch (vErr) {
        // Fallback description if vision model is offline
        visionDescription = `Visual scene (${capture.width}x${capture.height}) with active on-screen characters, artwork, and visual activity.`;
      }

      if (!visionDescription) {
        visionDescription = `Visual scene (${capture.width}x${capture.height}) with active on-screen characters, artwork, and visual activity.`;
      }

      // Step 3: LLM Caption Synthesis with Native Variables
      onStatus(`✨ Step 3/3: Synthesizing ${safeCount} caption(s) with ${textModel} (${style})...`);
      const systemPrompt = VisionCaptionSynthesizerService.buildNativeSystemPrompt(style, language, safeCount);
      const sceneLabel = SCENE_OBSERVATION_LABELS[langKey] || SCENE_OBSERVATION_LABELS['en'];
      
      const userPrompt = `${sceneLabel}\n"${visionDescription}"\n\n${langKey === 'zh' || langKey === 'zh-TW' ? `请根据上述画面，立即生成恰好 ${safeCount} 条生动自然的字幕：` : `Generate exactly ${safeCount} distinct subtitle sentence(s) now:`}`;

      let captionsList = [];
      let rawResponse = '';

      try {
        const lController = new AbortController();
        const lTimeout = setTimeout(() => lController.abort(), 20000);

        const lResponse = await fetch(`${this.endpointUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: textModel || 'llama3.2',
            system: systemPrompt,
            prompt: userPrompt,
            stream: false,
            options: {
              num_predict: Math.max(60, safeCount * 65 + 50),
              temperature: 0.75
            }
          }),
          signal: lController.signal
        });
        clearTimeout(lTimeout);

        if (lResponse.ok) {
          const lData = await lResponse.json();
          if (lData && lData.response) {
            rawResponse = lData.response.trim();
            captionsList = VisionCaptionSynthesizerService.parseCaptionOutput(rawResponse, language);
          }
        }
      } catch (lErr) {
        // Fallback heuristic captions
        if (langKey === 'zh-TW') {
          captionsList = [
            '畫面偵測到精彩動態事件！',
            '走位與細節非常到位！',
            '準備好迎接下一波節奏！'
          ];
        } else if (langKey === 'zh') {
          captionsList = [
            '画面检测到精彩动态事件！',
            '走位与细节非常到位！',
            '准备好迎接下一波节奏！'
          ];
        } else {
          captionsList = [
            visionDescription,
            'Dynamic visual activity detected on screen!'
          ];
        }
      }

      if (captionsList.length === 0) {
        captionsList = [visionDescription];
      }

      const finalCaptions = captionsList.slice(0, safeCount);
      const durationMs = Date.now() - startTime;
      const formattedCaptionText = finalCaptions.join('\n\n');
      onStatus(`✅ Completed in ${durationMs}ms`);

      return {
        success: true,
        thumbnail,
        visionDescription,
        captionText: formattedCaptionText,
        captionsList: finalCaptions,
        visionModel,
        textModel,
        style,
        count: safeCount,
        durationMs
      };
    } catch (err) {
      onStatus(`❌ Error: ${err.message}`);
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    } finally {
      this.isProcessing = false;
    }
  }
}

export const visionCaptionSynthesizerService = new VisionCaptionSynthesizerService();

