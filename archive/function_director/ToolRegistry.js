/**
 * Tool Registry & Safety Dispatcher for AI Function Director
 * Provides schema validation, parameter clamping guardrails,
 * multi-lingual intent synonym mapping, and atomic UI/state synchronization.
 */

export class ToolRegistry {
  constructor(deps = {}) {
    this.currentSettings = deps.currentSettings || {};
    this.saveSettingsFile = deps.saveSettingsFile || (() => {});
    this.callbacks = deps.callbacks || {};

    this.tools = new Map();
    this.domainModules = new Map();
  }

  /**
   * Register a domain module containing tools and semantic intent rules.
   */
  registerDomain(domainName, domainModule) {
    this.domainModules.set(domainName, domainModule);
    if (domainModule.tools && Array.isArray(domainModule.tools)) {
      domainModule.tools.forEach(tool => this.registerTool(tool, domainName));
    }
  }

  /**
   * Register an individual tool with strict guardrails and execution logic.
   */
  registerTool(tool, domainName = 'general') {
    if (!tool.name) throw new Error('Tool must have a name');
    this.tools.set(tool.name, {
      ...tool,
      domain: domainName
    });
  }

  /**
   * Return OpenAPI / OpenAI compatible function definition schemas for all registered tools.
   */
  getOpenAISchemas() {
    const schemas = [];
    this.tools.forEach(tool => {
      schemas.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters || {
            type: 'object',
            properties: {}
          }
        }
      });
    });
    return schemas;
  }

  /**
   * Execute a tool safely with input sanitation, guardrail clamping, and error isolation.
   */
  execute(toolName, rawArgs = {}) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.warn(`[ToolRegistry] Unknown tool requested: ${toolName}`);
      return { success: false, message: `Unknown tool: ${toolName}` };
    }

    try {
      // 1. Sanitize & Guardrail Clamping
      const sanitizedArgs = tool.sanitize ? tool.sanitize(rawArgs, this.currentSettings) : rawArgs;

      // 2. Validate
      if (tool.validate) {
        const validation = tool.validate(sanitizedArgs, this.currentSettings);
        if (validation && validation.valid === false) {
          return { success: false, message: validation.error || 'Invalid arguments' };
        }
      }

      // 3. Execution Context with Robust DOM UI Synchronization & Event Dispatch
      const context = {
        currentSettings: this.currentSettings,
        callbacks: this.callbacks,
        syncUI: (elementId, value, isChecked = false) => {
          if (typeof document === 'undefined') return;

          // Map possible legacy/domain IDs to exact HTML DOM IDs
          const idMap = {
            'setting-scale': 'model-scale',
            'setting-bobbing': 'model-bobbing',
            'setting-spinX': 'spin-x',
            'setting-spinY': 'spin-y',
            'setting-spinZ': 'spin-z',
            'setting-speedX': 'speed-x',
            'setting-speedY': 'speed-y',
            'setting-speedZ': 'speed-z',
            'setting-sakuraRain': 'sakura-rain',
            'setting-snowFall': 'snow-fall',
            'setting-enablePhysics': 'enable-physics',
            'setting-physicsGravity': 'physics-gravity',
            'setting-physicsElasticity': 'physics-elasticity',
            'setting-physicsFloor': 'physics-floor',
            'setting-model': 'model-select'
          };

          const targetId = idMap[elementId] || elementId;
          const el = document.getElementById(targetId);
          if (el) {
            if (isChecked) {
              el.checked = !!value;
            } else {
              el.value = value;
            }

            // Also update any companion text/numerical indicators (e.g. val-model-scale, val-speed-y)
            const possibleValIds = [`val-${targetId}`, `val-${elementId}`, targetId.replace(/^(model|spin|speed|physics|sound)-/, 'val-')];
            for (const valId of possibleValIds) {
              const valEl = document.getElementById(valId);
              if (valEl) {
                if (typeof value === 'number') {
                  valEl.innerText = Number.isInteger(value) ? `${value}x` : `${value.toFixed(2)}x`;
                } else if (typeof value === 'string') {
                  valEl.innerText = value;
                }
              }
            }

            // Dispatch DOM events so Three.js render loops & form listeners execute immediately
            try {
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (e) {}
          }
        },
        saveSettings: () => {
          if (this.saveSettingsFile) this.saveSettingsFile();
        }
      };

      // 4. Run tool execution
      const actionResult = tool.execute(sanitizedArgs, context);

      // 5. Persist atomically
      context.saveSettings();

      // 6. Mascot Speech Reaction (removed non-essential text notification on mascot 3D display)

      return {
        success: true,
        actionTaken: actionResult,
        args: sanitizedArgs
      };
    } catch (err) {
      console.error(`[ToolRegistry] Error executing tool ${toolName}:`, err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Multi-lingual semantic intent matching across all registered domain modules.
   */
  matchSemanticIntent(userMessage) {
    const raw = (userMessage || '').trim();
    let text = raw.toLowerCase()
      .replace(/\bturn\s+of\b/g, 'turn off')
      .replace(/\bof\s+sakura\b/g, 'off sakura')
      .replace(/\bof\s+snow\b/g, 'off snow')
      .replace(/\bof\s+physics\b/g, 'off physics')
      .replace(/\bof\s+bobbing\b/g, 'off bobbing');

    const toolCalls = [];
    const actionsSummary = [];
    const isChinese = /[\u4e00-\u9fa5]/.test(raw);

    this.domainModules.forEach(domain => {
      if (domain.parseIntent && typeof domain.parseIntent === 'function') {
        const result = domain.parseIntent(text, this.currentSettings, isChinese);
        if (result && result.toolCalls && result.toolCalls.length > 0) {
          toolCalls.push(...result.toolCalls);
          if (result.actionsSummary && result.actionsSummary.length > 0) {
            actionsSummary.push(...result.actionsSummary);
          }
        }
      }
    });

    return {
      toolCalls,
      actionsSummary,
      isChinese
    };
  }
}
