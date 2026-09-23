/**
 * AI Function Director Tab UI Controller
 * Manages conversational chat interface, dynamic AI Mode Indicator (Local LLM vs. Fallback),
 * and centralized neural LLM configuration synchronization.
 */

import { LLMDirectorEngine } from '../core/LLMDirectorEngine.js';
import { LocalImageGenService } from '../services/LocalImageGenService.js';
import { StickerStudioUI } from './StickerStudioUI.js';

export const PERSONA_PRESETS = {
  supportive: `You are an affectionate, supportive, and empathetic friend. You speak with warmth, humor, and genuine care. Celebrate achievements and encourage throughout the day.`,
  tsundere: `You are a feisty, sharp-tongued, but secretly affectionate character. You act flustered or pretend you don't care ("I-it's not like I wanted to talk to you, b-baka!"), but you always pay close attention and secretly care.`,
  maid: `You are an impeccably polite, devoted personal maid and butler. You address the user as "Master" (or "My Lord/Lady"). You are attentive to their requests and speak with refined grace and loyalty.`,
  cyber_ai: `You are an advanced, slightly sarcastic cyberpunk synthetic AI. You speak with sleek sci-fi terminology, witty observations about human carbon-based habits, and analytical sharpness.`,
  study_buddy: `You are a focused, calming study and productivity partner. You keep messages concise, encouraging, and focused on maintaining flow state, hydration, and deep work.`,
  custom: ``
};

export function setupAIDirectorTabUI(deps) {
  const {
    currentSettings,
    saveSettingsFile,
    t,
    showSpeechBubble,
    callbacks = {}
  } = deps;

  const engine = deps.engine || new LLMDirectorEngine({
    currentSettings,
    saveSettingsFile,
    showSpeechBubble,
    callbacks
  });

  const imageGenService = deps.imageGenService || new LocalImageGenService({
    currentSettings
  });

  // DOM Elements - System Tab Configuration Card
  const enableToggle = document.getElementById('ai-director-enable');
  const contextRetrievalToggle = document.getElementById('ai-context-retrieval-enable');
  const endpointInput = document.getElementById('ai-endpoint-url');
  const modelInput = document.getElementById('ai-model-name');
  const providerSelect = document.getElementById('ai-provider-select');
  const retrieverPresetSelect = document.getElementById('ai-retriever-preset');
  const customRetrieverBox = document.getElementById('ai-custom-retriever-box');
  const retrieverEndpointInput = document.getElementById('ai-retriever-endpoint');
  const apiKeyInput = document.getElementById('ai-api-key');

  const statusBadge = document.getElementById('ai-connection-status-badge');
  const statusText = document.getElementById('ai-status-text');
  const btnPing = document.getElementById('btn-ai-ping-endpoint');

  // DOM Elements - AI Director Chat Tab
  const modeIndicator = document.getElementById('ai-mode-indicator');
  const chatMessages = document.getElementById('ai-chat-messages');
  const chatInput = document.getElementById('ai-chat-input');
  const btnSend = document.getElementById('btn-ai-send');
  const btnClearChat = document.getElementById('btn-ai-clear');

  // DOM Elements - Persona Customizer
  const personaPresetSelect = document.getElementById('ai-persona-preset');
  const personaPromptTextarea = document.getElementById('ai-persona-prompt');
  const personaSavedHint = document.getElementById('ai-persona-saved-hint');
  const personaBadge = document.getElementById('ai-persona-badge');
  const personaBadgeText = document.getElementById('ai-persona-badge-text');
  const btnPersonaApply = document.getElementById('btn-ai-persona-apply');

  // DOM Elements - Multi-Language, Reply Style & Hosted Words
  const responseLanguageSelect = document.getElementById('ai-response-language');
  const replyStylePresetSelect = document.getElementById('ai-reply-style-preset');
  const customStyleContainer = document.getElementById('ai-custom-style-container');
  const customStyleInput = document.getElementById('ai-custom-style-prompt');
  const preferredWordsInput = document.getElementById('ai-preferred-words');

  const updatePersonaBadge = () => {
    if (personaBadgeText) {
      personaBadgeText.textContent = engine.getPersonaDisplayName();
    }
  };

  // Update AI Mode Indicator Badge UI
  const setModeIndicatorState = (isNeural, modelName = '') => {
    if (!modeIndicator) return;
    if (isNeural) {
      modeIndicator.textContent = `🟢 Local LLM (${modelName || engine.modelName || 'Neural'})`;
      modeIndicator.style.background = 'rgba(16, 185, 129, 0.18)';
      modeIndicator.style.color = '#34d399';
      modeIndicator.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      modeIndicator.textContent = '⚡ Fallback Mode';
      modeIndicator.style.background = 'rgba(245, 158, 11, 0.18)';
      modeIndicator.style.color = '#fbbf24';
      modeIndicator.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }
  };

  // 1. Settings & Endpoint Controls
  if (enableToggle) {
    enableToggle.checked = currentSettings.aiDirectorEnabled !== false;
    enableToggle.addEventListener('change', () => {
      currentSettings.aiDirectorEnabled = enableToggle.checked;
      engine.isEnabled = enableToggle.checked;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (contextRetrievalToggle) {
    contextRetrievalToggle.checked = currentSettings.aiContextRetrievalEnabled !== false;
    contextRetrievalToggle.addEventListener('change', () => {
      currentSettings.aiContextRetrievalEnabled = contextRetrievalToggle.checked;
      engine.isContextRetrievalEnabled = contextRetrievalToggle.checked;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (endpointInput) {
    endpointInput.value = currentSettings.aiEndpointUrl || 'http://localhost:11434/v1';
    endpointInput.addEventListener('change', () => {
      currentSettings.aiEndpointUrl = endpointInput.value.trim();
      engine.endpointUrl = currentSettings.aiEndpointUrl;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  if (modelInput) {
    modelInput.value = currentSettings.aiModelName || 'llama3.2';
    modelInput.addEventListener('change', () => {
      currentSettings.aiModelName = modelInput.value.trim();
      engine.modelName = currentSettings.aiModelName;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  if (apiKeyInput) {
    apiKeyInput.value = currentSettings.aiApiKey || '';
    apiKeyInput.addEventListener('change', () => {
      currentSettings.aiApiKey = apiKeyInput.value.trim();
      engine.apiKey = currentSettings.aiApiKey;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  // Persona Controls Wiring
  let savedHintTimeout = null;
  const showPersonaSaved = () => {
    if (!personaSavedHint) return;
    personaSavedHint.style.display = 'inline';
    if (savedHintTimeout) clearTimeout(savedHintTimeout);
    savedHintTimeout = setTimeout(() => {
      personaSavedHint.style.display = 'none';
    }, 2000);
  };

  const applyPersonaState = async (triggerGreeting = false) => {
    const prompt = personaPromptTextarea ? personaPromptTextarea.value.trim() : (currentSettings.aiPersonaPrompt || '');
    const preset = personaPresetSelect ? personaPresetSelect.value : (currentSettings.aiPersonaPreset || 'custom');
    const responseLanguage = responseLanguageSelect ? responseLanguageSelect.value : (currentSettings.aiResponseLanguage || 'auto');
    const replyStylePreset = replyStylePresetSelect ? replyStylePresetSelect.value : (currentSettings.aiReplyStylePreset || 'default');
    const customStylePrompt = customStyleInput ? customStyleInput.value.trim() : (currentSettings.aiCustomStylePrompt || '');
    const preferredWords = preferredWordsInput ? preferredWordsInput.value.trim() : (currentSettings.aiPreferredWords || '');

    currentSettings.aiPersonaPrompt = prompt;
    currentSettings.aiPersonaPreset = preset;
    currentSettings.aiResponseLanguage = responseLanguage;
    currentSettings.aiReplyStylePreset = replyStylePreset;
    currentSettings.aiCustomStylePrompt = customStylePrompt;
    currentSettings.aiPreferredWords = preferredWords;

    engine.setPersona(prompt, preset, {
      responseLanguage,
      replyStylePreset,
      customStylePrompt,
      preferredWords
    });

    updatePersonaBadge();
    showPersonaSaved();

    // Pulse animation on the badge to visually verify active update
    if (personaBadge) {
      personaBadge.style.boxShadow = '0 0 14px rgba(168, 85, 247, 0.8)';
      personaBadge.style.transform = 'scale(1.06)';
      setTimeout(() => {
        personaBadge.style.boxShadow = '';
        personaBadge.style.transform = '';
      }, 500);
    }

    if (triggerGreeting) {
      const displayName = engine.getPersonaDisplayName();
      // Render clean in-character system notification
      if (chatMessages) {
        const sysNotice = document.createElement('div');
        sysNotice.style.cssText = 'text-align: center; margin: 10px 0; font-size: 0.75em; color: #c084fc; font-weight: 700;';
        sysNotice.innerHTML = `<span>✨ Persona & Style applied: <strong>${displayName}</strong> [${replyStylePreset}]</span>`;
        chatMessages.appendChild(sysNotice);
        scrollToBottom();
      }

      showTypingIndicator();
      try {
        const greeting = await engine.generatePersonaGreeting();
        removeTypingIndicator();
        if (greeting) {
          appendMessage('assistant', greeting);
          if (showSpeechBubble) showSpeechBubble(greeting);
        }
      } catch (err) {
        removeTypingIndicator();
      }
    }
  };

  if (personaPresetSelect) {
    personaPresetSelect.value = currentSettings.aiPersonaPreset || 'supportive';
    personaPresetSelect.addEventListener('change', () => {
      const selected = personaPresetSelect.value;
      currentSettings.aiPersonaPreset = selected;
      if (selected !== 'custom' && PERSONA_PRESETS[selected]) {
        if (personaPromptTextarea) {
          personaPromptTextarea.value = PERSONA_PRESETS[selected];
          currentSettings.aiPersonaPrompt = PERSONA_PRESETS[selected];
        }
      }
      applyPersonaState(true);
    });
  }

  if (responseLanguageSelect) {
    responseLanguageSelect.value = currentSettings.aiResponseLanguage || 'auto';
    responseLanguageSelect.addEventListener('change', () => {
      currentSettings.aiResponseLanguage = responseLanguageSelect.value;
      engine.setResponseLanguage(responseLanguageSelect.value);
      showPersonaSaved();
    });
  }

  if (replyStylePresetSelect) {
    replyStylePresetSelect.value = currentSettings.aiReplyStylePreset || 'default';
    if (customStyleContainer) {
      customStyleContainer.style.display = replyStylePresetSelect.value === 'custom' ? 'block' : 'none';
    }
    replyStylePresetSelect.addEventListener('change', () => {
      currentSettings.aiReplyStylePreset = replyStylePresetSelect.value;
      if (customStyleContainer) {
        customStyleContainer.style.display = replyStylePresetSelect.value === 'custom' ? 'block' : 'none';
      }
      engine.setReplyStyle(replyStylePresetSelect.value, customStyleInput ? customStyleInput.value.trim() : '');
      showPersonaSaved();
    });
  }

  if (customStyleInput) {
    customStyleInput.value = currentSettings.aiCustomStylePrompt || '';
    customStyleInput.addEventListener('input', () => {
      currentSettings.aiCustomStylePrompt = customStyleInput.value;
      engine.setReplyStyle('custom', customStyleInput.value);
      showPersonaSaved();
    });
  }

  if (preferredWordsInput) {
    preferredWordsInput.value = currentSettings.aiPreferredWords || '';
    preferredWordsInput.addEventListener('input', () => {
      currentSettings.aiPreferredWords = preferredWordsInput.value;
      engine.setPreferredWords(preferredWordsInput.value);
      showPersonaSaved();
    });
  }

  if (personaPromptTextarea) {
    personaPromptTextarea.value = currentSettings.aiPersonaPrompt || PERSONA_PRESETS.supportive;
    personaPromptTextarea.addEventListener('input', () => {
      currentSettings.aiPersonaPrompt = personaPromptTextarea.value;
      if (personaPresetSelect && personaPresetSelect.value !== 'custom') {
        personaPresetSelect.value = 'custom';
        currentSettings.aiPersonaPreset = 'custom';
      }
      engine.setPersona(personaPromptTextarea.value, 'custom');
      updatePersonaBadge();
      showPersonaSaved();
    });
  }

  if (btnPersonaApply) {
    btnPersonaApply.addEventListener('click', () => {
      applyPersonaState(true);
    });
  }

  // Quick navigation helpers between Companion Chat and Studio Persona Customizer
  const btnGotoStudio = document.getElementById('btn-goto-persona-studio');
  if (btnGotoStudio) {
    btnGotoStudio.addEventListener('click', () => {
      const studioTabBtn = document.querySelector('.studio-tab-btn[data-tab="tab-display"]');
      if (studioTabBtn) studioTabBtn.click();
    });
  }

  if (personaBadge) {
    personaBadge.addEventListener('click', () => {
      const studioTabBtn = document.querySelector('.studio-tab-btn[data-tab="tab-display"]');
      if (studioTabBtn) studioTabBtn.click();
    });
  }

  const btnGotoChat = document.getElementById('btn-goto-chat');
  if (btnGotoChat) {
    btnGotoChat.addEventListener('click', () => {
      const chatInput = document.getElementById('direct-chat-input');
      const chatContainer = document.getElementById('desktop-direct-chat-container');
      if (chatContainer) chatContainer.classList.remove('minimized');
      if (chatInput) chatInput.focus();
      const settingsPanel = document.getElementById('settings-panel');
      if (settingsPanel) settingsPanel.classList.add('hidden');
    });
  }

  // Initial badge resolution on load
  updatePersonaBadge();

  async function checkEndpointConnection() {
    if (statusText) statusText.textContent = '🔄 Testing connection to ' + (endpointInput ? endpointInput.value : 'endpoint') + '...';
    if (statusBadge) {
      statusBadge.style.background = 'rgba(148, 163, 184, 0.15)';
      statusBadge.style.borderColor = 'rgba(148, 163, 184, 0.35)';
      statusBadge.style.color = '#cbd5e1';
    }

    try {
      const baseUrl = (endpointInput ? endpointInput.value : 'http://localhost:11434/v1').replace(/\/+$/, '');
      const key = apiKeyInput ? apiKeyInput.value.trim() : '';
      const currentModel = (modelInput ? modelInput.value.trim() : 'llama3.2').toLowerCase();
      const headers = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      // 1. Fast path: Probe /models endpoint (OpenAI / Ollama standard, ultra-fast <30ms without loading VRAM)
      let modelsRes = null;
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 3500);
        modelsRes = await fetch(`${baseUrl}/models`, {
          method: 'GET',
          headers,
          signal: ctrl.signal
        });
        clearTimeout(tid);
      } catch (err) {
        // Fall back to chat completions probe if /models times out or fails
      }

      if (modelsRes && modelsRes.ok) {
        const data = await modelsRes.json();
        const modelList = (data.data || []).map(m => (m.id || '').toLowerCase());
        const hasModel = modelList.some(m => m.includes(currentModel) || currentModel.includes(m));

        const matchedModel = hasModel ? currentModel : (data.data && data.data[0]?.id ? data.data[0].id : currentModel);
        if (statusText) statusText.textContent = `🟢 Connected! Real Neural LLM is active (${matchedModel})`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
          statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          statusBadge.style.color = '#34d399';
        }
        engine.isNeuralConnected = true;
        setModeIndicatorState(true, matchedModel);
        return true;
      }

      // 2. Fallback probe: /chat/completions (with 12s timeout for cold start model loading)
      const chatCtrl = new AbortController();
      const chatTid = setTimeout(() => chatCtrl.abort(), 12000);
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        signal: chatCtrl.signal,
        body: JSON.stringify({
          model: currentModel,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
      });
      clearTimeout(chatTid);

      if (res.ok || res.status === 400 || res.status === 422) {
        if (statusText) statusText.textContent = `🟢 Connected! Real Neural LLM is active (${currentModel})`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
          statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          statusBadge.style.color = '#34d399';
        }
        engine.isNeuralConnected = true;
        setModeIndicatorState(true, currentModel);
        return true;
      } else if (res.status === 404) {
        if (statusText) statusText.textContent = `⚠️ Model "${currentModel}" not found on server (404). Pull with: ollama run ${currentModel}`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
          statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
          statusBadge.style.color = '#fbbf24';
        }
        engine.isNeuralConnected = false;
        setModeIndicatorState(false);
        return false;
      } else if (res.status === 401 || res.status === 403) {
        if (statusText) statusText.textContent = `⚠️ Authentication Failed (${res.status}). Please check your API key in LLM Config.`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
          statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          statusBadge.style.color = '#f87171';
        }
        engine.isNeuralConnected = false;
        setModeIndicatorState(false);
        return false;
      } else {
        if (statusText) statusText.textContent = `⚠️ Endpoint returned HTTP ${res.status}. Falling back to offline rule engine.`;
        if (statusBadge) {
          statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
          statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
          statusBadge.style.color = '#fbbf24';
        }
        engine.isNeuralConnected = false;
        setModeIndicatorState(false);
        return false;
      }
    } catch (e) {
      if (statusText) statusText.textContent = `⚡ Offline Fallback Mode (Cannot reach ${endpointInput ? endpointInput.value : 'endpoint'})`;
      if (statusBadge) {
        statusBadge.style.background = 'rgba(245, 158, 11, 0.12)';
        statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        statusBadge.style.color = '#fbbf24';
      }
      engine.isNeuralConnected = false;
      setModeIndicatorState(false);
      return false;
    }
  }

  if (btnPing) {
    btnPing.addEventListener('click', () => checkEndpointConnection());
  }

  // Progressive retry connection checks on startup to smoothly catch local Ollama daemon spin-up
  const startupDelays = [600, 2000, 4500, 8000, 14000];
  startupDelays.forEach(delay => {
    setTimeout(async () => {
      if (!engine.isNeuralConnected) {
        await checkEndpointConnection();
      }
    }, delay);
  });

  // Auto-check when switching to AI Director tab or focusing window
  const aiTabBtn = document.querySelector('[data-tab="tab-ai-director"]');
  if (aiTabBtn) {
    aiTabBtn.addEventListener('click', () => {
      if (!engine.isNeuralConnected) checkEndpointConnection();
    });
  }
  window.addEventListener('focus', () => {
    if (!engine.isNeuralConnected) checkEndpointConnection();
  });

  // Background heartbeat check every 15s when in fallback mode
  setInterval(() => {
    if (!engine.isNeuralConnected && currentSettings.aiDirectorEnabled !== false) {
      checkEndpointConnection();
    }
  }, 15000);

  if (providerSelect) {
    if (currentSettings.aiProvider) {
      providerSelect.value = currentSettings.aiProvider;
    }
    providerSelect.addEventListener('change', () => {
      const p = providerSelect.value;
      currentSettings.aiProvider = p;
      if (p === 'ollama') {
        if (endpointInput) endpointInput.value = 'http://localhost:11434/v1';
        if (modelInput) modelInput.value = 'llama3.2';
      } else if (p === 'lmstudio') {
        if (endpointInput) endpointInput.value = 'http://localhost:1234/v1';
        if (modelInput) modelInput.value = 'qwen2.5-7b-instruct';
      } else if (p === 'groq') {
        if (endpointInput) endpointInput.value = 'https://api.groq.com/openai/v1';
        if (modelInput) modelInput.value = 'llama-3.3-70b-versatile';
      } else if (p === 'openrouter') {
        if (endpointInput) endpointInput.value = 'https://openrouter.ai/api/v1';
        if (modelInput) modelInput.value = 'meta-llama/llama-3.2-3b-instruct:free';
      } else if (p === 'deepseek') {
        if (endpointInput) endpointInput.value = 'https://api.deepseek.com/v1';
        if (modelInput) modelInput.value = 'deepseek-chat';
      } else if (p === 'openai') {
        if (endpointInput) endpointInput.value = 'https://api.openai.com/v1';
        if (modelInput) modelInput.value = 'gpt-4o-mini';
      } else if (p === 'custom') {
        if (endpointInput) endpointInput.value = 'http://localhost:8080/v1';
      }
      if (endpointInput) currentSettings.aiEndpointUrl = endpointInput.value;
      if (modelInput) currentSettings.aiModelName = modelInput.value;
      engine.endpointUrl = currentSettings.aiEndpointUrl;
      engine.modelName = currentSettings.aiModelName;
      if (saveSettingsFile) saveSettingsFile();
      checkEndpointConnection();
    });
  }

  if (retrieverPresetSelect) {
    retrieverPresetSelect.value = currentSettings.aiRetrieverPreset || 'builtin_rag';
    if (customRetrieverBox) {
      customRetrieverBox.style.display = retrieverPresetSelect.value === 'custom_endpoint' ? 'block' : 'none';
    }
    retrieverPresetSelect.addEventListener('change', () => {
      currentSettings.aiRetrieverPreset = retrieverPresetSelect.value;
      engine.contextRetrieverPreset = retrieverPresetSelect.value;
      if (customRetrieverBox) {
        customRetrieverBox.style.display = retrieverPresetSelect.value === 'custom_endpoint' ? 'block' : 'none';
      }
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  if (retrieverEndpointInput) {
    retrieverEndpointInput.value = currentSettings.aiRetrieverEndpoint || 'http://localhost:11434/v1';
    retrieverEndpointInput.addEventListener('change', () => {
      currentSettings.aiRetrieverEndpoint = retrieverEndpointInput.value.trim();
      engine.contextRetrieverEndpoint = currentSettings.aiRetrieverEndpoint;
      if (saveSettingsFile) saveSettingsFile();
    });
  }

  // 2. Chat UI Helpers
  const scrollToBottom = () => {
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  const appendMessage = async (role, text, imageGenMeta = null) => {
    if (!chatMessages) return;

    const msgEl = document.createElement('div');
    msgEl.className = `ai-msg-bubble ai-msg-${role === 'user' ? 'user' : 'bot'}`;

    const avatar = document.createElement('span');
    avatar.className = 'ai-msg-avatar';
    avatar.innerText = role === 'user' ? '👤' : '🤖';

    const body = document.createElement('div');
    body.className = 'ai-msg-body';

    if (text) {
      const textEl = document.createElement('div');
      textEl.className = 'ai-msg-text';
      textEl.innerText = text;
      body.appendChild(textEl);
    }

    // Render Local Image Generation Card if present
    if (imageGenMeta && imageGenService) {
      try {
        const imageCard = document.createElement('div');
        imageCard.className = 'ai-image-gen-card';

        const loadingBadge = document.createElement('div');
        loadingBadge.className = 'ai-image-gen-badge';
        loadingBadge.innerHTML = `⏳ Generating image locally for: "${imageGenMeta.prompt}"...`;
        imageCard.appendChild(loadingBadge);
        body.appendChild(imageCard);

        imageGenService.generateImage(imageGenMeta.prompt).then(result => {
          const providerLabel = result.source === 'sd_webui' ? 'Stable Diffusion' : (result.source === 'comfyui' ? 'ComfyUI' : 'Procedural Art');
          loadingBadge.innerHTML = `🎨 ${providerLabel}: "${result.prompt}"`;

          const img = document.createElement('img');
          img.className = 'ai-image-gen-img';
          img.src = result.dataUrl;
          img.alt = result.prompt;

          const imgActions = document.createElement('div');
          imgActions.className = 'ai-sticker-actions';

          const btnCopy = document.createElement('button');
          btnCopy.className = 'ai-sticker-btn';
          btnCopy.innerHTML = '📋 Copy';
          btnCopy.addEventListener('click', async () => {
            if (result.dataUrl && typeof navigator !== 'undefined' && navigator.clipboard) {
              try {
                const blobRes = await fetch(result.dataUrl);
                const blob = await blobRes.blob();
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
              } catch (e) {}
            }
            btnCopy.innerText = '✓ Copied';
            setTimeout(() => { btnCopy.innerText = '📋 Copy'; }, 2000);
          });

          const btnSave = document.createElement('button');
          btnSave.className = 'ai-sticker-btn';
          btnSave.innerHTML = '💾 Save';
          btnSave.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = result.dataUrl;
            a.download = `image-gen-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          });

          imgActions.appendChild(btnCopy);
          imgActions.appendChild(btnSave);

          imageCard.appendChild(img);
          imageCard.appendChild(imgActions);
          scrollToBottom();
        }).catch(err => {
          loadingBadge.innerHTML = `⚠️ Image generation error: ${err.message}`;
        });
      } catch (err) {
        console.warn('Failed to render image generation card:', err);
      }
    }

    msgEl.appendChild(avatar);
    msgEl.appendChild(body);
    chatMessages.appendChild(msgEl);
    scrollToBottom();
  };

  const showTypingIndicator = () => {
    if (!chatMessages) return null;
    const indicator = document.createElement('div');
    indicator.className = 'ai-msg-bubble ai-msg-bot ai-typing-indicator';
    indicator.id = 'ai-typing-temp';
    indicator.innerHTML = `
      <span class="ai-msg-avatar">🤖</span>
      <div class="ai-msg-body">
        <div class="ai-typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(indicator);
    scrollToBottom();
    return indicator;
  };

  const removeTypingIndicator = () => {
    const el = document.getElementById('ai-typing-temp');
    if (el) el.remove();
  };

  // 3. Send Message Handler
  const handleSendMessage = async (customText = null) => {
    const text = customText || (chatInput ? chatInput.value.trim() : '');
    if (!text) return;

    if (chatInput) chatInput.value = '';

    await appendMessage('user', text);
    showTypingIndicator();

    if (btnSend) btnSend.disabled = true;

    try {
      const response = await engine.processUserMessage(text);
      removeTypingIndicator();
      if (response) {
        await appendMessage('assistant', response.content, response.imageGen);
        setModeIndicatorState(response.isNeural, engine.modelName);
      }
    } catch (err) {
      removeTypingIndicator();
      await appendMessage('assistant', `Error processing command: ${err.message}`);
      setModeIndicatorState(false);
    } finally {
      if (btnSend) btnSend.disabled = false;
      if (chatInput) chatInput.focus();
    }
  };

  if (btnSend) {
    btnSend.addEventListener('click', () => handleSendMessage());
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }

  if (btnClearChat) {
    btnClearChat.addEventListener('click', () => {
      if (chatMessages) {
        chatMessages.innerHTML = `
          <div class="ai-msg-bubble ai-msg-bot">
            <span class="ai-msg-avatar">🤖</span>
            <div class="ai-msg-body">
              <div class="ai-msg-text" data-i18n="ai_welcome_msg">
                Hello! I am your 3D Desktop AI Companion. Feel free to chat with me about anything, adjust my persona above, or ask for company while you work or code!
              </div>
            </div>
          </div>
        `;
      }
      engine.clearDiagnosticLogs();
    });
  }

  // Interactive Local Neural Image Studio
  const stickerStudioUI = new StickerStudioUI({
    imageGenService,
    currentSettings,
    onSendToChat: (text) => {
      if (chatInput) chatInput.value = text;
      handleSendMessage();
    }
  });
  stickerStudioUI.init();

  return engine;
}
