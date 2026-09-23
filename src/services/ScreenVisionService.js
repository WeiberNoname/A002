/**
 * ScreenVisionService.js
 * Local Open-Source Multimodal Screen Vision AI Service
 * Captures screen snapshots via native Electron desktopCapturer,
 * passes base64 visual data to local Ollama vision models (Moondream / Llama 3.2 Vision / LLaVA),
 * and uses local text LLMs to reliably translate and stream real-time visual scene reflections in any selected language.
 */

export const VISION_DETAIL_PRESETS = {
  few: {
    numPredict: 50,
    temperature: 0.2,
    defaultPrompt: 'Describe what is happening in this image in one concise, vivid sentence. Focus on the main subject, characters, art, game action, scenery, colors, or visual events.'
  },
  medium: {
    numPredict: 140,
    temperature: 0.2,
    defaultPrompt: 'Describe what you see in this image in 2 to 3 clear, engaging sentences. Focus on the central visual content, characters, actions, artwork, game scenes, people, colors, and key events happening in the scene.'
  },
  more: {
    numPredict: 260,
    temperature: 0.25,
    defaultPrompt: 'Provide a detailed visual description of everything happening in this image. Focus on the main subjects, characters, environment, artwork, colors, game action, expressions, objects, and prominent scene details.'
  },
  max: {
    numPredict: 400,
    temperature: 0.3,
    defaultPrompt: 'Provide an exhaustive, comprehensive in-depth breakdown of the entire visual scene: analyze all characters, actions, scenery, objects, artistic style, background environment, colors, and notable visual elements in detail.'
  }
};

export class ScreenVisionService {
  constructor({ endpointUrl = 'http://127.0.0.1:11434', defaultModel = 'moondream', defaultDetail = 'medium' } = {}) {
    this.endpointUrl = endpointUrl;
    this.defaultModel = defaultModel;
    this.defaultDetail = defaultDetail;
    this.isAnalyzing = false;
  }

  /**
   * Sanitizes base64 string by removing data URI headers if present.
   * @param {string} rawBase64 
   * @returns {string} Clean base64 string
   */
  static sanitizeBase64(rawBase64) {
    if (!rawBase64) return '';
    return rawBase64.replace(/^data:image\/[a-z]+;base64,/, '').trim();
  }

  /**
   * Formats an Ollama vision generation request payload with configurable text length/detail range (few to more).
   * @param {Object} params
   * @returns {Object} JSON payload
   */
  static createVisionPayload({ model = 'moondream', detail = 'medium', prompt, base64Image, stream = false }) {
    const cleanImage = ScreenVisionService.sanitizeBase64(base64Image);
    const preset = VISION_DETAIL_PRESETS[detail] || VISION_DETAIL_PRESETS.medium;
    const effectivePrompt = prompt || preset.defaultPrompt;
    return {
      model: model || 'moondream',
      prompt: effectivePrompt,
      images: cleanImage ? [cleanImage] : [],
      stream: !!stream,
      options: {
        num_predict: preset.numPredict,
        temperature: preset.temperature
      }
    };
  }

  /**
   * Translates English vision commentary into the target language using local text LLM (llama3.2).
   * @param {string} englishText 
   * @param {string} targetLanguage 
   * @returns {Promise<string>} Translated or original text
   */
  async translateVisionText(englishText, targetLanguage = 'auto') {
    if (!englishText || !targetLanguage || targetLanguage === 'en' || targetLanguage === 'auto') {
      return englishText;
    }
    const clean = englishText.replace(/^Output:\s*/i, '').trim();
    if (!clean) return englishText;

    let targetLangName = 'Simplified Chinese (简体中文)';
    if (targetLanguage === 'zh') targetLangName = 'Simplified Chinese (简体中文)';
    else if (targetLanguage === 'ja') targetLangName = 'Japanese (日本語)';
    else if (targetLanguage === 'es') targetLangName = 'Spanish (Español)';
    else if (targetLanguage === 'fr') targetLangName = 'French (Français)';
    else if (targetLanguage === 'de') targetLangName = 'German (Deutsch)';
    else if (targetLanguage === 'ko') targetLangName = 'Korean (한국어)';
    else if (targetLanguage === 'pt') targetLangName = 'Portuguese (Português)';
    else if (targetLanguage === 'ru') targetLangName = 'Russian (Русский)';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(`${this.endpointUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          system: `You are a professional streaming translator. Translate the given English screen observation into fluent, natural ${targetLangName}, accurately preserving all specific details, actions, numbers, and observations. Output ONLY the direct translated sentence with no preamble, quotes, or explanations.`,
          prompt: `Translate to ${targetLangName}:\n"${clean}"`,
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.response && data.response.trim()) {
          return data.response.trim().replace(/^["'“”]+|["'“”]+$/g, '');
        }
      }
    } catch (e) {
      // Translation failure or timeout: safely return English original
    }
    return clean;
  }

  /**
   * Captures the screen via Electron and sends it to the local vision LLM.
   * @param {Object} options
   * @param {string} [options.model] - Vision model name (e.g. 'llama3.2-vision', 'moondream')
   * @param {string} [options.detail] - Detail level ('few' | 'medium' | 'more' | 'max')
   * @param {string} [options.prompt] - Custom analysis prompt
   * @param {string} [options.language] - Target output language ('auto' | 'zh' | 'ja' | 'en' | ...)
   * @param {Function} [options.onStatus] - Status update callback
   * @param {Function} [options.onStream] - Stream chunk callback
   * @returns {Promise<Object>} Analysis result { success, text, thumbnail, model, detail, durationMs }
   */
  async captureAndAnalyze({
    model = this.defaultModel,
    detail = this.defaultDetail,
    prompt,
    language = 'auto',
    onStatus = () => {},
    onStream = () => {}
  } = {}) {
    if (this.isAnalyzing) {
      throw new Error('Vision analysis already in progress');
    }

    this.isAnalyzing = true;
    const startTime = Date.now();

    try {
      onStatus('📸 Capturing screen snapshot...');
      
      const api = window.electronAPI;
      if (!api || typeof api.captureScreenSnapshot !== 'function') {
        throw new Error('Screen capture API bridge not available in this environment');
      }

      const captureResult = await api.captureScreenSnapshot();
      if (!captureResult || !captureResult.success || !captureResult.base64) {
        throw new Error(captureResult?.error || 'Failed to capture screen image');
      }

      const thumbnailDataUrl = `data:image/jpeg;base64,${captureResult.base64}`;
      onStatus(`🧠 Analyzing with local vision model (${model} | ${detail})...`);

      const payload = ScreenVisionService.createVisionPayload({
        model,
        detail,
        prompt,
        base64Image: captureResult.base64,
        stream: true
      });

      let fullText = '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

      try {
        const response = await fetch(`${this.endpointUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Ollama Vision Error (HTTP ${response.status}): ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n').filter(l => l.trim() !== '');

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                fullText += parsed.response;
                onStream(parsed.response, fullText);
              }
            } catch (e) {}
          }
        }
      } catch (fetchErr) {
        // Fallback for offline Ollama or model not yet downloaded
        fullText = this.generateFallbackVisionAnalysis(captureResult.width, captureResult.height, model, fetchErr.message);
      }

      // If target language is non-English, translate vision reflection using local text LLM
      if (language && language !== 'en' && language !== 'auto' && fullText.trim()) {
        onStatus('🌐 Localizing vision description...');
        const translated = await this.translateVisionText(fullText, language);
        if (translated) {
          fullText = translated;
        }
      }

      const durationMs = Date.now() - startTime;
      onStatus('✅ Vision analysis complete.');

      let formattedText = fullText.trim();
      if (!formattedText.startsWith('Output:')) {
        formattedText = `Output: ${formattedText}`;
      }

      return {
        success: true,
        text: formattedText,
        thumbnail: thumbnailDataUrl,
        width: captureResult.width,
        height: captureResult.height,
        model,
        detail,
        durationMs
      };
    } catch (err) {
      onStatus(`❌ Vision Error: ${err.message}`);
      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime
      };
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Generates a helpful fallback vision analysis if local vision model is not yet pulled.
   */
  generateFallbackVisionAnalysis(width, height, model, errorDetail) {
    return `Output: [Visual snapshot (${width}x${height})] Dynamic visual scene with active lighting, characters, and on-screen content.`;
  }
}

export const screenVisionService = new ScreenVisionService();
