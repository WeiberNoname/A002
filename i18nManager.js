import i18next from 'i18next';

// 12 Core Mainstream Languages Scope
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文 (Simplified Chinese)' },
  { code: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ko', label: '한국어 (Korean)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'de', label: 'Deutsch (German)' },
  { code: 'es', label: 'Español - España (Spanish - Spain)' },
  { code: 'es-419', label: 'Español - Latinoamérica (Spanish - Latin America)' },
  { code: 'it', label: 'Italiano (Italian)' },
  { code: 'pt-BR', label: 'Português - Brasil (Portuguese - Brazil)' },
  { code: 'ru', label: 'Русский (Russian)' }
];

// Helper to detect initial user/system language
function detectSystemLanguage() {
  const navLang = navigator.language || 'en';
  if (navLang.startsWith('zh-TW') || navLang.startsWith('zh-HK') || navLang.startsWith('zh-MO')) return 'zh-TW';
  if (navLang.startsWith('zh')) return 'zh-CN';
  if (navLang.startsWith('ja')) return 'ja';
  if (navLang.startsWith('ko')) return 'ko';
  if (navLang.startsWith('pt-BR') || navLang.startsWith('pt')) return 'pt-BR';
  if (navLang.startsWith('es-419') || navLang.includes('MX') || navLang.includes('AR') || navLang.includes('CO') || navLang.includes('CL')) return 'es-419';
  if (navLang.startsWith('es')) return 'es';
  if (navLang.startsWith('de')) return 'de';
  if (navLang.startsWith('fr')) return 'fr';
  if (navLang.startsWith('it')) return 'it';
  if (navLang.startsWith('ru')) return 'ru';
  return 'en';
}

let isInitialized = false;

/**
 * Loads JSON resource files for all 9 supported languages
 */
async function loadLanguageResources() {
  const resources = {};
  for (const langObj of SUPPORTED_LANGUAGES) {
    const code = langObj.code;
    try {
      const response = await fetch(`./locales/${code}/translation.json`);
      if (response.ok) {
        const json = await response.json();
        resources[code] = { translation: json };
      } else {
        console.warn(`[i18n] Failed to fetch translation file for ${code}: ${response.status}`);
      }
    } catch (err) {
      console.error(`[i18n] Error loading translation for ${code}:`, err);
    }
  }
  return resources;
}

/**
 * Initializes the i18next framework
 * @param {string} initialLanguage - Saved or requested language code
 */
export async function initI18n(initialLanguage = null) {
  if (isInitialized) return i18next;

  const targetLang = initialLanguage || detectSystemLanguage();
  const resources = await loadLanguageResources();

  await i18next.init({
    lng: targetLang,
    fallbackLng: 'en',
    debug: false,
    resources: resources,
    interpolation: {
      escapeValue: false // not needed for DOM updates
    }
  });

  isInitialized = true;
  updateDOMTranslations();

  console.log(`[i18n] i18next initialized successfully with active language: ${i18next.language}`);
  return i18next;
}

/**
 * Translate a key with optional dynamic placeholder parameters
 * @param {string} key 
 * @param {object} options 
 */
export function t(key, options = {}) {
  if (!isInitialized) return key;
  return i18next.t(key, options);
}

/**
 * Change the active language dynamically
 * @param {string} langCode 
 */
export async function changeLanguage(langCode) {
  if (!isInitialized) return;
  await i18next.changeLanguage(langCode);
  updateDOMTranslations();
  console.log(`[i18n] Active language switched to: ${langCode}`);
}

/**
 * Get current active language code
 */
export function getCurrentLanguage() {
  return isInitialized ? i18next.language : 'en';
}

/**
 * Scans DOM for data-i18n attributes and updates textContent / titles
 */
export function updateDOMTranslations() {
  if (!isInitialized) return;

  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;

    const translation = i18next.t(key);
    
    // Check if attribute specifically specifies title or placeholder
    if (el.hasAttribute('data-i18n-attr')) {
      const attr = el.getAttribute('data-i18n-attr');
      el.setAttribute(attr, translation);
    } else {
      // Direct text update while preserving HTML nodes if nested
      el.textContent = translation;
    }
  });

  // Also translate title attributes if specified with data-i18n-title
  const titleElements = document.querySelectorAll('[data-i18n-title]');
  titleElements.forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.setAttribute('title', i18next.t(key));
    }
  });
}
