/**
 * CodingAgentUI.js
 * 
 * DevLab Autonomous Coding Agent Console UI Controller.
 * Antigravity & Codex-class paired programming environment featuring:
 * - Environment Doctor status diagnostics (C/C++ MSVC/GCC, Python 3.13, Node.js)
 * - Multi-turn ReAct timeline & compiler self-healing telemetry
 * - Interactive live terminal shell with 1-click error auto-fix
 * - In-place code viewer & editor modal with save & run
 * - Visual artifact image viewer (BMP, PNG, SVG) for image processing results
 * - Smart 1-click workspace execution runners (.c, .py, .js, .exe)
 */

import { CodingAgentEngine } from '../core/CodingAgentEngine.js';

export const AGENT_TEMPLATES = {
  c_negative: 'Write a complete C program in negative_image.c that reads a 24-bit uncompressed BMP image, inverts all RGB pixel bytes (255 - pixel) to produce a negative image, and writes the output BMP file. Also create a small test BMP image, compile with GCC (gcc -O2 negative_image.c -o negative_image.exe), test the executable, and verify it worked.',
  c_edge_detect: 'Write a complete C program in edge_detect.c that reads a 24-bit BMP image, applies a 3x3 Sobel edge detection filter in grayscale, and writes the edge-detected output BMP. Generate a test image, compile with GCC (gcc -O2 edge_detect.c -o edge_detect.exe), run it, and verify the output.',
  c_fractal: 'Write a complete C program in mandelbrot.c that computes a 400x400 Mandelbrot fractal with smooth colors, outputs mandelbrot.bmp (24-bit BMP), compiles with GCC (gcc -O2 mandelbrot.c -o mandelbrot.exe -lm), runs it, and verifies the generated BMP image.',
  c_raytracer: 'Write a standalone C terminal raytracer/donut visualizer in ascii_art.c, compile it with GCC (gcc -O2 ascii_art.c -o ascii_art.exe -lm), test run it, and verify the binary works.',
  python_data: 'Write a Python data generation script in process_data.py that generates 50 sample items with random metrics, calculates summary statistics, exports to summary.csv, and runs python process_data.py to test it.'
};

export class CodingAgentUI {
  constructor(deps = {}) {
    this.currentSettings = deps.currentSettings || {};
    this.agentBridge = deps.agentBridge || (typeof window !== 'undefined' ? window.agentBridge : null);
    this.agentEngine = deps.agentEngine || new CodingAgentEngine({
      agentBridge: this.agentBridge,
      endpointUrl: this.currentSettings.aiEndpointUrl || 'http://localhost:11434/v1',
      modelName: this.currentSettings.aiCodingModel || 'llama3.2:latest'
    });

    this.isOpen = false;
    this.isTaskRunning = false;
    this.activeWorkspacePath = '';
    this.lastFailedCommand = '';
    this.lastStderr = '';
    this.currentModalFile = null;
    this.installedModels = new Set();

    // DOM Elements
    this.panel = null;
    this.btnToggle = null;
    this.btnClose = null;
    this.btnRun = null;
    this.btnStop = null;
    this.btnOpenFolder = null;
    this.inputPrompt = null;
    this.selectModel = null;
    this.timelineContainer = null;
    this.terminalOutput = null;
    this.statusBadge = null;
    this.fileListEl = null;

    // Environment Doctor & Terminal Elements
    this.envCVal = null;
    this.envPyVal = null;
    this.envNodeVal = null;
    this.cliInput = null;
    this.btnCliExec = null;
    this.btnAskFix = null;
    this.btnCopyTerminal = null;

    // Code & Artifact Modals
    this.codeModal = null;
    this.codeTitle = null;
    this.codeEditor = null;
    this.btnCodeRun = null;
    this.btnCodeSave = null;
    this.btnCodeCopy = null;
    this.btnCodeClose = null;

    this.artifactModal = null;
    this.artifactTitle = null;
    this.artifactMeta = null;
    this.artifactImg = null;
    this.btnArtifactClose = null;

    this._bindEngineEvents();
  }

  _bindEngineEvents() {
    this.agentEngine.on('log', (log) => this._appendTerminalLog(log));
    this.agentEngine.on('step', (step) => this._updateStep(step));
    this.agentEngine.on('thought', (data) => this._renderThought(data));
    this.agentEngine.on('complete', (res) => this._handleComplete(res));
    this.agentEngine.on('error', (err) => this._handleError(err));
  }

  init() {
    if (typeof document === 'undefined') return;

    this.panel = document.getElementById('devlab-agent-panel');
    this.btnToggle = document.getElementById('btn-toggle-devlab');
    this.btnClose = document.getElementById('btn-close-devlab');
    this.btnRun = document.getElementById('btn-devlab-run');
    this.btnStop = document.getElementById('btn-devlab-stop');
    this.btnOpenFolder = document.getElementById('btn-devlab-open-folder');
    this.inputPrompt = document.getElementById('devlab-prompt-input');
    this.selectModel = document.getElementById('devlab-model-select');
    this.timelineContainer = document.getElementById('devlab-timeline');
    this.terminalOutput = document.getElementById('devlab-terminal-output');
    this.statusBadge = document.getElementById('devlab-status-badge');
    this.fileListEl = document.getElementById('devlab-workspace-files');
    this.filesCountBadge = document.getElementById('devlab-files-count');

    // Environment Doctor
    const envCEl = document.getElementById('devlab-env-c');
    if (envCEl) this.envCVal = envCEl.querySelector('.devlab-env-val');
    const envPyEl = document.getElementById('devlab-env-python');
    if (envPyEl) this.envPyVal = envPyEl.querySelector('.devlab-env-val');
    const envNodeEl = document.getElementById('devlab-env-node');
    if (envNodeEl) this.envNodeVal = envNodeEl.querySelector('.devlab-env-val');

    // Terminal Interactive CLI
    this.cliInput = document.getElementById('devlab-terminal-input');
    this.btnCliExec = document.getElementById('btn-devlab-terminal-exec');
    this.btnAskFix = document.getElementById('btn-devlab-ask-agent-fix');
    this.btnCopyTerminal = document.getElementById('btn-devlab-copy-terminal');
    this.btnPullModel = document.getElementById('btn-devlab-pull-model');

    // Canvas Tabs
    this.tabBtnCode = document.getElementById('tab-btn-code');
    this.tabBtnTerminal = document.getElementById('tab-btn-terminal');
    this.tabBtnFiles = document.getElementById('tab-btn-files');
    this.paneCode = document.getElementById('devlab-tab-pane-code');
    this.paneTerminal = document.getElementById('devlab-tab-pane-terminal');
    this.paneFiles = document.getElementById('devlab-tab-pane-files');

    if (this.tabBtnCode) this.tabBtnCode.addEventListener('click', () => this.switchCanvasTab('code'));
    if (this.tabBtnTerminal) this.tabBtnTerminal.addEventListener('click', () => this.switchCanvasTab('terminal'));
    if (this.tabBtnFiles) this.tabBtnFiles.addEventListener('click', () => this.switchCanvasTab('files'));

    // Clear Stream Button
    const btnClearStream = document.getElementById('btn-devlab-clear-stream');
    if (btnClearStream && this.timelineContainer) {
      btnClearStream.addEventListener('click', () => {
        this.timelineContainer.innerHTML = `
          <div class="devlab-empty-timeline">
            <div class="devlab-empty-icon">✨</div>
            <div class="devlab-empty-title">Codex Autonomous Studio</div>
            <div class="devlab-empty-subtitle">Instruct the agent below to write C/C++ image tools, algorithms, or scripts. It will plan, compile, heal compiler errors, and run binaries automatically.</div>
          </div>
        `;
      });
    }

    if (this.selectModel) {
      this.selectModel.addEventListener('change', () => {
        if (this.btnPullModel) {
          const val = this.selectModel.value;
          this.btnPullModel.style.display = (this.installedModels.size > 0 && !this.installedModels.has(val)) ? 'inline-block' : 'none';
        }
      });
    }

    if (this.btnPullModel) {
      this.btnPullModel.addEventListener('click', async () => {
        const targetModel = this.selectModel ? this.selectModel.value : '';
        if (targetModel) {
          await this.runTerminalCommand(`ollama pull ${targetModel}`);
          await this.populateOllamaModels();
        }
      });
    }

    // AI Telemetry Bundle Export
    this.btnAiBundle = document.getElementById('btn-devlab-ai-bundle');
    if (this.btnAiBundle && this.agentBridge && typeof this.agentBridge.generateTelemetryBundle === 'function') {
      this.btnAiBundle.addEventListener('click', async () => {
        try {
          const res = await this.agentBridge.generateTelemetryBundle();
          if (res && res.success) {
            this._appendTerminalLog({ type: 'info', text: res.summaryText });
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(res.summaryText);
              }
            } catch {}
            const prev = this.btnAiBundle.innerHTML;
            this.btnAiBundle.innerHTML = '✓ Copied!';
            setTimeout(() => { if (this.btnAiBundle) this.btnAiBundle.innerHTML = prev; }, 2200);
            this.refreshWorkspaceFiles();
          }
        } catch (e) {
          console.warn('Failed to generate AI telemetry bundle:', e);
        }
      });
    }

    // Integrated Code Canvas Elements
    this.codeTitle = document.getElementById('devlab-active-filename');
    this.codeEditor = document.getElementById('devlab-code-editor');
    this.btnCodeRun = document.getElementById('btn-devlab-code-run');
    this.btnCodeSave = document.getElementById('btn-devlab-code-save');
    this.btnCodeCopy = document.getElementById('btn-devlab-code-copy');

    // Legacy Code Modal fallback (if ever needed)
    this.codeModal = document.getElementById('devlab-code-modal');
    this.btnCodeClose = document.getElementById('btn-devlab-code-close');

    // Artifact Modal
    this.artifactModal = document.getElementById('devlab-artifact-modal');
    this.artifactTitle = document.getElementById('devlab-artifact-filename');
    this.artifactMeta = document.getElementById('devlab-artifact-meta');
    this.artifactImg = document.getElementById('devlab-artifact-img');
    this.btnArtifactClose = document.getElementById('btn-devlab-artifact-close');

    // 1. Toggle Open / Close
    if (this.btnToggle) {
      this.btnToggle.addEventListener('click', () => this.togglePanel());
    }
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.closePanel());
    }

    // 2. Open Workspace Folder
    if (this.btnOpenFolder) {
      this.btnOpenFolder.addEventListener('click', async () => {
        if (this.agentBridge && typeof this.agentBridge.openWorkspaceFolder === 'function') {
          await this.agentBridge.openWorkspaceFolder();
        }
      });
    }

    // 3. Prompt Suggestion Chips (supporting both .devlab-chip and .devlab-template-chip)
    const chips = document.querySelectorAll('.devlab-chip, .devlab-template-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const key = chip.getAttribute('data-template');
        if (AGENT_TEMPLATES[key] && this.inputPrompt) {
          this.inputPrompt.value = AGENT_TEMPLATES[key];
          this.inputPrompt.focus();
        }
      });
    });

    // 4. Start Agent Task
    if (this.btnRun && this.inputPrompt) {
      this.btnRun.addEventListener('click', () => this.startTask());
      this.inputPrompt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.startTask();
        }
      });
    }

    // 5. Stop Agent Task
    if (this.btnStop) {
      this.btnStop.addEventListener('click', () => {
        this.agentEngine.abort();
        this._setRunningState(false);
      });
    }

    // 6. Copy Live Terminal Output
    if (this.btnCopyTerminal && this.terminalOutput) {
      this.btnCopyTerminal.addEventListener('click', async () => {
        const text = this.terminalOutput.innerText || '';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          }
          const prev = this.btnCopyTerminal.innerHTML;
          this.btnCopyTerminal.innerHTML = '✓ Copied!';
          setTimeout(() => {
            if (this.btnCopyTerminal) this.btnCopyTerminal.innerHTML = prev;
          }, 2000);
        } catch (e) {
          console.warn('Failed to copy terminal text:', e);
        }
      });
    }

    // 7. Interactive Terminal CLI Input
    if (this.cliInput && this.btnCliExec) {
      const execCli = async () => {
        const cmd = (this.cliInput.value || '').trim();
        if (!cmd) return;
        this.cliInput.value = '';
        await this.runTerminalCommand(cmd);
      };

      this.btnCliExec.addEventListener('click', execCli);
      this.cliInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          execCli();
        }
      });
    }

    // 8. Ask Agent to Fix Error
    if (this.btnAskFix) {
      this.btnAskFix.addEventListener('click', () => {
        if (this.inputPrompt && this.lastStderr) {
          this.inputPrompt.value = `Fix the following error encountered when executing "${this.lastFailedCommand}":\n\n${this.lastStderr.trim()}`;
          this.inputPrompt.focus();
          this.btnAskFix.style.display = 'none';
          this.startTask();
        }
      });
    }

    // 9. Code Modal Actions
    if (this.btnCodeClose) {
      this.btnCodeClose.addEventListener('click', () => this.closeCodeModal());
    }
    if (this.btnCodeCopy && this.codeEditor) {
      this.btnCodeCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(this.codeEditor.value || '');
          const prev = this.btnCodeCopy.innerHTML;
          this.btnCodeCopy.innerHTML = '✓ Copied!';
          setTimeout(() => { if (this.btnCodeCopy) this.btnCodeCopy.innerHTML = prev; }, 1800);
        } catch {}
      });
    }
    if (this.btnCodeSave && this.codeEditor) {
      this.btnCodeSave.addEventListener('click', async () => {
        if (this.currentModalFile && this.agentBridge?.writeFile) {
          const res = await this.agentBridge.writeFile(this.currentModalFile, this.codeEditor.value);
          if (res.success) {
            const prev = this.btnCodeSave.innerHTML;
            this.btnCodeSave.innerHTML = '✓ Saved!';
            setTimeout(() => { if (this.btnCodeSave) this.btnCodeSave.innerHTML = prev; }, 1800);
            this.refreshWorkspaceFiles();
          }
        }
      });
    }
    if (this.btnCodeRun) {
      this.btnCodeRun.addEventListener('click', async () => {
        if (this.currentModalFile) {
          const fileToRun = this.currentModalFile;
          this.closeCodeModal();
          await this.executeFileAction(fileToRun);
        }
      });
    }

    // 10. Artifact Modal Actions
    if (this.btnArtifactClose) {
      this.btnArtifactClose.addEventListener('click', () => this.closeArtifactModal());
    }

    // 11. Focus Tracking for Electron Click-Through
    if (this.panel) {
      this.panel.addEventListener('mouseenter', () => this._setFocusState(true));
      this.panel.addEventListener('mouseleave', () => {
        if (!this.inputPrompt || document.activeElement !== this.inputPrompt) {
          this._setFocusState(false);
        }
      });
    }

    if (this.inputPrompt) {
      this.inputPrompt.addEventListener('focus', () => this._setFocusState(true));
      this.inputPrompt.addEventListener('blur', () => this._setFocusState(false));
    }
    if (this.cliInput) {
      this.cliInput.addEventListener('focus', () => this._setFocusState(true));
      this.cliInput.addEventListener('blur', () => this._setFocusState(false));
    }
    if (this.codeEditor) {
      this.codeEditor.addEventListener('focus', () => this._setFocusState(true));
      this.codeEditor.addEventListener('blur', () => this._setFocusState(false));
    }

    // Escape closes modals or panel
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.codeModal && !this.codeModal.classList.contains('hidden')) {
          this.closeCodeModal();
        } else if (this.artifactModal && !this.artifactModal.classList.contains('hidden')) {
          this.closeArtifactModal();
        } else if (this.isOpen) {
          this.closePanel();
        }
      }
    });

    // Initial scans
    this.refreshEnvironmentDoctor();
    this.populateOllamaModels();
    this.refreshWorkspaceFiles();
  }

  _setFocusState(isFocused) {
    if (typeof window !== 'undefined') {
      window.isHoveringDevLab = isFocused;
      if (typeof window.updateIgnoreMouseState === 'function') {
        window.updateIgnoreMouseState();
      }
    }
  }

  async refreshEnvironmentDoctor() {
    if (!this.agentBridge || typeof this.agentBridge.checkEnvironment !== 'function') return;

    try {
      const diag = await this.agentBridge.checkEnvironment();
      if (!diag) return;

      if (this.envCVal && diag.cCompiler) {
        this.envCVal.innerText = diag.cCompiler.name || 'MSVC / GCC Ready';
      }
      if (this.envPyVal && diag.python) {
        this.envPyVal.innerText = diag.python.version || 'Python 3.13';
      }
      if (this.envNodeVal && diag.node) {
        this.envNodeVal.innerText = `Node.js ${diag.node.version || ''}`;
      }
    } catch (e) {
      console.warn('[DevLab] Environment check error:', e);
    }
  }

  async populateOllamaModels() {
    try {
      const endpoint = (this.currentSettings.aiEndpointUrl || 'http://localhost:11434/v1').replace(/\/v1\/?$/, '');
      const res = await fetch(`${endpoint}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const models = data.models || [];
        this.installedModels = new Set(models.map(m => m.name));

        if (this.selectModel) {
          // If llama3.2 is installed and currently selected isn't installed, pick llama3.2
          const currentVal = this.selectModel.value;
          if (!this.installedModels.has(currentVal)) {
            for (const m of this.installedModels) {
              if (m.startsWith('llama3.2') || m.includes('coder')) {
                this.selectModel.value = m;
                break;
              }
            }
          }
          if (this.btnPullModel) {
            this.btnPullModel.style.display = (this.installedModels.size > 0 && !this.installedModels.has(this.selectModel.value)) ? 'inline-block' : 'none';
          }
        }
      }
    } catch (e) {
      console.warn('[DevLab] Could not query Ollama tags:', e);
    }
  }

  togglePanel() {
    this.isOpen = !this.isOpen;
    if (typeof window !== 'undefined') {
      window.isDevLabOpen = this.isOpen;
      if (typeof window.updateIgnoreMouseState === 'function') {
        window.updateIgnoreMouseState();
      }
    }
    if (this.panel) {
      this.panel.classList.toggle('hidden', !this.isOpen);
      if (this.isOpen) {
        this.refreshEnvironmentDoctor();
        this.populateOllamaModels();
        this.refreshWorkspaceFiles();
        if (this.inputPrompt) this.inputPrompt.focus();
      }
    }
  }

  openPanel() {
    this.isOpen = true;
    if (typeof window !== 'undefined') {
      window.isDevLabOpen = true;
      if (typeof window.updateIgnoreMouseState === 'function') {
        window.updateIgnoreMouseState();
      }
    }
    if (this.panel) {
      this.panel.classList.remove('hidden');
      this.refreshEnvironmentDoctor();
      this.populateOllamaModels();
      this.refreshWorkspaceFiles();
      if (this.inputPrompt) this.inputPrompt.focus();
    }
  }

  closePanel() {
    this.isOpen = false;
    if (typeof window !== 'undefined') {
      window.isDevLabOpen = false;
      window.isHoveringDevLab = false;
      if (typeof window.updateIgnoreMouseState === 'function') {
        window.updateIgnoreMouseState();
      }
    }
    if (this.panel) {
      this.panel.classList.add('hidden');
    }
  }

  async startTask() {
    if (this.isTaskRunning) return;
    const prompt = (this.inputPrompt ? this.inputPrompt.value : '').trim();
    if (!prompt) return;

    const model = this.selectModel ? this.selectModel.value : 'llama3.2:latest';

    // Clear previous timeline & terminal
    if (this.timelineContainer) {
      this.timelineContainer.innerHTML = '';
      const userBubble = document.createElement('div');
      userBubble.className = 'devlab-user-card';
      userBubble.innerHTML = `<strong>🎯 Goal:</strong> ${this._escapeHtml(prompt)}`;
      this.timelineContainer.appendChild(userBubble);
    }
    if (this.terminalOutput) this.terminalOutput.innerText = '';
    if (this.btnAskFix) this.btnAskFix.style.display = 'none';

    this._setRunningState(true);

    try {
      await this.agentEngine.runTask(prompt, { modelName: model });
    } catch (err) {
      // Handled via engine events
    } finally {
      this._setRunningState(false);
      this.refreshWorkspaceFiles();
    }
  }

  _setRunningState(isRunning) {
    this.isTaskRunning = isRunning;
    if (this.btnRun) this.btnRun.disabled = isRunning;
    if (this.btnStop) this.btnStop.style.display = isRunning ? 'inline-block' : 'none';
    if (this.statusBadge) {
      this.statusBadge.innerText = isRunning ? '⚡ Running...' : 'Ready';
      this.statusBadge.className = isRunning ? 'devlab-badge running' : 'devlab-badge ready';
    }
  }

  switchCanvasTab(tabName) {
    if (this.tabBtnCode) this.tabBtnCode.classList.toggle('active', tabName === 'code');
    if (this.tabBtnTerminal) this.tabBtnTerminal.classList.toggle('active', tabName === 'terminal');
    if (this.tabBtnFiles) this.tabBtnFiles.classList.toggle('active', tabName === 'files');

    if (this.paneCode) this.paneCode.classList.toggle('active', tabName === 'code');
    if (this.paneTerminal) this.paneTerminal.classList.toggle('active', tabName === 'terminal');
    if (this.paneFiles) this.paneFiles.classList.toggle('active', tabName === 'files');

    if (this.btnCopyTerminal) {
      this.btnCopyTerminal.style.display = tabName === 'terminal' ? 'inline-block' : 'none';
    }

    if (tabName === 'files') {
      this.refreshWorkspaceFiles();
    }
  }

  async loadCodeIntoCanvas(fileName, directContent = null) {
    if (!fileName) return;
    this.currentModalFile = fileName;
    if (this.codeTitle) this.codeTitle.innerText = fileName;

    if (directContent !== null) {
      if (this.codeEditor) this.codeEditor.value = directContent;
      this.switchCanvasTab('code');
      return;
    }

    if (this.agentBridge && typeof this.agentBridge.readFile === 'function') {
      try {
        const res = await this.agentBridge.readFile(fileName);
        if (res && res.success && this.codeEditor) {
          this.codeEditor.value = res.content || '';
          this.switchCanvasTab('code');
        }
      } catch (e) {
        console.warn('Failed to load code into canvas:', e);
      }
    }
  }

  _renderThought(data) {
    if (!this.timelineContainer) return;
    const card = document.createElement('div');
    card.className = 'devlab-thought-card';
    card.innerHTML = `💭 <strong>Codex Plan & Deliberation:</strong><br>${this._escapeHtml(data.thought)}`;
    this.timelineContainer.appendChild(card);
    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
  }

  _updateStep(step) {
    if (!this.timelineContainer) return;

    let stepCard = document.getElementById(`devlab-step-${step.stepId}`);
    if (!stepCard) {
      stepCard = document.createElement('div');
      stepCard.id = `devlab-step-${step.stepId}`;
      stepCard.className = 'devlab-step-card';
      this.timelineContainer.appendChild(stepCard);
    }

    const icon = step.type === 'finish' ? '🎉' : (step.type === 'write_file' ? '📝' : (step.type === 'patch_file' ? '🩹' : (step.type === 'run_command' ? '⚙️' : '🧠')));
    const statusClass = step.status || 'running';

    stepCard.innerHTML = `
      <div class="devlab-step-header">
        <span class="devlab-step-icon">${icon}</span>
        <span class="devlab-step-title">${step.title}</span>
        <span class="devlab-step-badge ${statusClass}">${statusClass.toUpperCase()}</span>
      </div>
      ${step.args?.path ? `<div class="devlab-step-meta">File: <code>${step.args.path}</code></div>` : ''}
      ${step.args?.command ? `<div class="devlab-step-meta">Command: <code>${step.args.command}</code></div>` : ''}
      ${step.output ? `<pre class="devlab-step-output">${this._escapeHtml(step.output.slice(0, 300))}${step.output.length > 300 ? '...' : ''}</pre>` : ''}
    `;

    // Real-time Code Canvas Streaming: automatically display created or patched files
    if (step.type === 'write_file' && step.args?.path && step.args?.content) {
      this.loadCodeIntoCanvas(step.args.path, step.args.content);
    } else if (step.type === 'patch_file' && step.args?.path) {
      this.loadCodeIntoCanvas(step.args.path);
    }

    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
  }

  _appendTerminalLog(log) {
    if (!this.terminalOutput) return;

    let prefix = '';
    if (log.type === 'terminal') prefix = '\n$ ';
    else if (log.type === 'info') prefix = 'ℹ️ ';
    else if (log.type === 'warning') prefix = '⚠️ ';
    else if (log.type === 'error') prefix = '❌ ';

    this.terminalOutput.innerText += `${prefix}${log.text}\n`;
    this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
  }

  _handleComplete(result) {
    this._setRunningState(false);
    this._appendTerminalLog({
      type: 'info',
      text: `✅ Task Finished! Success: ${result.success}. Steps: ${result.stepsExecuted}`
    });
    this.refreshWorkspaceFiles();
  }

  _handleError(err) {
    this._setRunningState(false);
    this._appendTerminalLog({
      type: 'error',
      text: `Task failed: ${err.message}`
    });
  }

  async runTerminalCommand(command) {
    if (!this.agentBridge || typeof this.agentBridge.executeCommand !== 'function') return;

    this._appendTerminalLog({ type: 'terminal', text: command });
    const runRes = await this.agentBridge.executeCommand(command);

    if (runRes.stdout) this._appendTerminalLog({ type: 'stdout', text: runRes.stdout });
    if (runRes.stderr) this._appendTerminalLog({ type: 'stderr', text: runRes.stderr });

    if (!runRes.success || runRes.exitCode !== 0) {
      this.lastFailedCommand = command;
      this.lastStderr = runRes.stderr || runRes.stdout || `Process exited with code ${runRes.exitCode}`;
      if (this.btnAskFix) this.btnAskFix.style.display = 'inline-block';
    } else {
      if (this.btnAskFix) this.btnAskFix.style.display = 'none';
    }

    this.refreshWorkspaceFiles();
  }

  async executeFileAction(fileName) {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    const baseName = fileName.slice(0, fileName.lastIndexOf('.'));

    this.switchCanvasTab('terminal');

    if (ext === '.c' || ext === '.cpp') {
      const exeName = `${baseName}.exe`;
      const compileAndRunCmd = `gcc -O2 "${fileName}" -o "${exeName}" -lm; if ($?) { .\\${exeName} }`;
      await this.runTerminalCommand(compileAndRunCmd);
    } else if (ext === '.py') {
      await this.runTerminalCommand(`python "${fileName}"`);
    } else if (ext === '.js') {
      await this.runTerminalCommand(`node "${fileName}"`);
    } else if (ext === '.exe') {
      await this.runTerminalCommand(`.\\${fileName}`);
    }
  }

  async openCodeModal(fileName) {
    // Seamlessly forward to integrated Code Canvas
    await this.loadCodeIntoCanvas(fileName);
  }

  closeCodeModal() {
    if (this.codeModal) {
      this.codeModal.classList.add('hidden');
    }
    this.currentModalFile = null;
  }

  async openArtifactModal(fileName) {
    if (!this.artifactModal || !this.agentBridge || typeof this.agentBridge.readFileBase64 !== 'function') return;

    if (this.artifactTitle) this.artifactTitle.innerText = fileName;

    try {
      const res = await this.agentBridge.readFileBase64(fileName);
      if (res && res.success && this.artifactImg) {
        this.artifactImg.src = res.dataUrl;
        if (this.artifactMeta) {
          this.artifactMeta.innerText = `${res.mimeType} • ${this._formatBytes(res.size)}`;
        }
        this.artifactModal.classList.remove('hidden');
      }
    } catch (e) {
      console.warn('Could not load artifact preview:', e);
    }
  }

  closeArtifactModal() {
    if (this.artifactModal) {
      this.artifactModal.classList.add('hidden');
    }
  }

  async refreshWorkspaceFiles() {
    if (!this.fileListEl || !this.agentBridge || typeof this.agentBridge.listFiles !== 'function') return;

    try {
      const res = await this.agentBridge.listFiles();
      if (res && res.success) {
        // Filter out internal .toolchain folder
        const visibleFiles = (res.files || []).filter(f => f.name !== '.toolchain');

        if (this.filesCountBadge) {
          this.filesCountBadge.innerText = `(${visibleFiles.length})`;
        }

        if (visibleFiles.length === 0) {
          this.fileListEl.innerHTML = '<div class="devlab-empty-files">Workspace is empty. Run a prompt to generate code & binaries!</div>';
          return;
        }

        this.fileListEl.innerHTML = '';
        visibleFiles.forEach(f => {
          const item = document.createElement('div');
          item.className = 'devlab-file-item';
          const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
          const isExe = ext === '.exe';
          const isC = ext === '.c' || ext === '.cpp' || ext === '.h';
          const isPy = ext === '.py';
          const isJs = ext === '.js';
          const isImage = ext === '.bmp' || ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.svg';
          
          let icon = '📦';
          if (f.isDirectory) icon = '📁';
          else if (isExe) icon = '🚀';
          else if (isC) icon = '⚙️';
          else if (isPy) icon = '🐍';
          else if (isJs) icon = '⚡';
          else if (isImage) icon = '🖼️';

          item.innerHTML = `
            <div class="devlab-file-info">
              <span>${icon}</span>
              <span class="devlab-file-name" title="${f.name}">${f.name}</span>
              <span class="devlab-file-size">${this._formatBytes(f.size)}</span>
            </div>
            <div class="devlab-file-actions">
              ${isC ? `<button class="devlab-btn-file-action compile" data-action="compile" title="Compile with GCC/MSVC and Run">▶ Compile</button>` : ''}
              ${isPy ? `<button class="devlab-btn-file-action compile" data-action="run" title="Run with Python 3.13">▶ Run</button>` : ''}
              ${isJs ? `<button class="devlab-btn-file-action compile" data-action="run" title="Run with Node.js">▶ Run</button>` : ''}
              ${isExe ? `<button class="devlab-btn-file-action compile" data-action="run" title="Execute binary">▶ Run</button>` : ''}
              ${isImage ? `<button class="devlab-btn-file-action" data-action="preview" title="Preview image artifact">👁️ Preview</button>` : ''}
              ${!f.isDirectory ? `<button class="devlab-btn-file-action" data-action="view" title="View & edit in Code Canvas">📄 View</button>` : ''}
            </div>
          `;

          // Bind Action Buttons
          const btnCompile = item.querySelector('[data-action="compile"]');
          if (btnCompile) {
            btnCompile.addEventListener('click', (e) => {
              e.stopPropagation();
              this.executeFileAction(f.name);
            });
          }

          const btnRun = item.querySelector('[data-action="run"]');
          if (btnRun) {
            btnRun.addEventListener('click', (e) => {
              e.stopPropagation();
              this.executeFileAction(f.name);
            });
          }

          const btnPreview = item.querySelector('[data-action="preview"]');
          if (btnPreview) {
            btnPreview.addEventListener('click', (e) => {
              e.stopPropagation();
              this.openArtifactModal(f.name);
            });
          }

          const btnView = item.querySelector('[data-action="view"]');
          if (btnView) {
            btnView.addEventListener('click', (e) => {
              e.stopPropagation();
              this.loadCodeIntoCanvas(f.name);
            });
          }

          this.fileListEl.appendChild(item);
        });
      }
    } catch (e) {
      console.warn('Failed to refresh workspace files:', e);
    }
  }

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  _escapeHtml(text) {
    return (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
