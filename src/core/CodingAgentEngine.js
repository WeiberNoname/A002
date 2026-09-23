/**
 * CodingAgentEngine.js
 * 
 * Autonomous Local Coding Agent Engine.
 * Executes multi-turn ReAct (Reason + Act) programming loops against local LLMs
 * (e.g. Ollama with qwen2.5-coder, deepseek-coder, llama3.2).
 * 
 * Features:
 * - Autonomous tool calling (write_file, run_command, read_file, list_files, finish_task)
 * - Self-healing compiler error recovery: feeds GCC/Clang/Python stderr back to LLM to fix bugs
 * - Dual-protocol resilience: supports native Ollama tool_calls + JSON block fallback
 * - Real-time step & terminal stream telemetry
 * - Graceful cancellation with AbortController
 */

export const AGENT_TOOLS_SPEC = [
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Creates or updates a source code or config file in the workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to write (e.g. "main.c", "Makefile", "test.bmp")'
          },
          content: {
            type: 'string',
            description: 'Complete source code or text content to write to the file'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'patch_file',
      description: 'Surgically replaces a specific snippet of code within an existing file, without having to rewrite the entire file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to patch (e.g. "main.c")'
          },
          search: {
            type: 'string',
            description: 'The exact lines or snippet of code to find and replace'
          },
          replace: {
            type: 'string',
            description: 'The replacement lines or snippet'
          }
        },
        required: ['path', 'search', 'replace']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Executes a command inside the workspace using the local shell (e.g. gcc, clang, python, cargo, make, or running an .exe).',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command line to execute (e.g. "gcc -O2 main.c -o app.exe")'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Reads the source code or content of a file located in the workspace.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path of the file to read'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Lists all files and directories in the workspace directory.',
      parameters: {
        type: 'object',
        properties: {
          sub_dir: {
            type: 'string',
            description: 'Optional subfolder path (or empty for root workspace)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'finish_task',
      description: 'Signals that the programming task has been fully accomplished, compiled, tested, and verified.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Concise summary of what was built, how it works, and how to use it'
          },
          binary_path: {
            type: 'string',
            description: 'Relative path to the compiled executable or main entry point (e.g. "negative_image.exe")'
          }
        },
        required: ['summary']
      }
    }
  }
];

export const CODING_AGENT_SYSTEM_PROMPT = `You are an elite Autonomous Software Engineering Agent running locally, operating with the precision and autonomy of Antigravity and Codex.
Your mission is to understand software requirements, write complete code, compile executables using the local toolchain (GCC, MSVC, Clang, Python, Node.js), test them, verify artifacts, and deliver production-ready programs.

ANTIGRAVITY / CODEX WORKFLOW PROTOCOL:
1. CREATE SOURCE CODE FIRST (write_file):
   - Always call \`write_file\` to write the complete source code file (e.g. "hello.c") BEFORE attempting to compile. Never compile before writing the file!
   - Write complete, robust, compilable code without placeholders or 'TODO' shortcuts.
   - For C programs on Windows:
     * Add \`#define _CRT_SECURE_NO_WARNINGS\` before standard includes to silence MSVC fopen/sprintf warnings.
     * Include all necessary standard headers (<stdio.h>, <stdlib.h>, <string.h>, <math.h>, <stdint.h>).
     * For BMP or binary file headers, use \`#pragma pack(push, 1)\` and \`#pragma pack(pop)\` to prevent struct padding.
2. COMPILE WITH LOCAL TOOLCHAIN (run_command):
   - For C/C++: Call \`run_command\` with \`gcc -O2 <source>.c -o <output>.exe\` or \`cl /nologo /O2 <source>.c /Fe:<output>.exe\`. The local environment transparently supports standard GCC flags and compiles with the local toolchain.
3. RUN & VALIDATE (run_command):
   - After compiling, test-run the program: call \`run_command\` with \`.\\<output>.exe\` or \`<output>.exe\` or \`python <script>.py\`.
   - If writing an image processing tool (e.g. BMP reader, negative image filter, edge detector): create or synthesize a sample test image (e.g. a small valid 24-bit uncompressed BMP), run your executable on it, and confirm the output image is created.
4. SURGICAL EDITING & SELF-HEALING (patch_file / write_file):
   - When fixing a compiler error or small bug, use \`patch_file\` to surgically replace the faulty snippet instead of rewriting the entire file. Use \`write_file\` when creating a new file or performing large rewrites.
   - If a compile or test command produces errors, inspect the diagnostic hint, locate the error line, apply the patch, and re-compile.
5. FINISH & DELIVER (finish_task):
   - Once the binary has been compiled and validated by running it, call \`finish_task\` with a concise summary and binary path.

If tool calling format is not automatically applied, you can output tool calls in JSON blocks:
\`\`\`json
{ "tool": "write_file", "path": "filename.c", "content": "..." }
\`\`\`
or
\`\`\`json
{ "tool": "patch_file", "path": "filename.c", "search": "old_code", "replace": "new_code" }
\`\`\`
or
\`\`\`json
{ "tool": "run_command", "command": "gcc filename.c -o app.exe" }
\`\`\``;

export class CodingAgentEngine {
  constructor(deps = {}) {
    this.agentBridge = deps.agentBridge || (typeof window !== 'undefined' ? window.agentBridge : null);
    this.endpointUrl = deps.endpointUrl || 'http://localhost:11434/v1';
    this.modelName = deps.modelName || 'qwen2.5-coder:7b';
    this.maxSteps = deps.maxSteps || 15;

    this.isRunning = false;
    this.currentAbortController = null;
    this.stepHistory = [];
    this.listeners = {
      step: [],
      thought: [],
      log: [],
      complete: [],
      error: []
    };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in agent listener [${event}]:`, e);
        }
      }
    }
  }

  abort() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    this.isRunning = false;
    this.emit('log', { type: 'warning', text: '⏹️ Agent task was cancelled by user.' });
  }

  /**
   * Main entry point to run an autonomous programming task.
   */
  async runTask(userGoal, options = {}) {
    if (this.isRunning) {
      throw new Error('An agent task is already actively running.');
    }

    this.isRunning = true;
    this.currentAbortController = new AbortController();
    this.stepHistory = [];
    const healedErrors = [];

    const model = options.modelName || this.modelName || 'llama3.2:latest';
    const endpoint = (options.endpointUrl || this.endpointUrl || 'http://localhost:11434/v1').replace(/\/$/, '');

    this.emit('log', {
      type: 'info',
      text: `🚀 Starting Autonomous Coding Agent with model [${model}]...\n🎯 Goal: ${userGoal}`
    });

    let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;
    try {
      if (this.agentBridge && typeof this.agentBridge.readFile === 'function') {
        const memRes = await this.agentBridge.readFile('.agent_memory.json');
        if (memRes && memRes.success && memRes.content) {
          const mem = JSON.parse(memRes.content);
          if (Array.isArray(mem) && mem.length > 0) {
            const recipes = mem.slice(-5).map(m => `- [${m.goal}]: produced ${m.binaryPath || 'artifacts'}. Summary: ${m.summary}`).join('\n');
            systemPrompt += `\n\nLEARNED EXPERIENCE FROM PREVIOUS RUNS:\n${recipes}`;
            this.emit('log', { type: 'info', text: `🧠 Loaded ${mem.length} learned experiences from historical runs.` });
          }
        }
      }
    } catch {}

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userGoal }
    ];

    let stepCount = 0;
    let taskCompleted = false;
    let finalSummary = null;

    try {
      while (this.isRunning && stepCount < this.maxSteps && !taskCompleted) {
        stepCount++;
        const stepId = stepCount;

        this.emit('step', {
          stepId,
          type: 'reasoning',
          title: `Step ${stepId}: Planning & Deliberating...`,
          status: 'running'
        });

        // 1. Call local LLM endpoint
        const responseData = await this._callLLM(endpoint, model, messages);
        if (!this.isRunning) break;

        const choice = responseData.choices && responseData.choices[0];
        const message = choice ? choice.message : null;
        if (!message) {
          throw new Error('Empty response received from local LLM endpoint.');
        }

        // Add assistant turn to conversation
        messages.push(message);

        // Extract Codex chain-of-thought planning if present
        const rawContent = message.content || '';
        let thoughtText = '';
        const thoughtMatch = rawContent.match(/<thought>([\s\S]*?)<\/thought>/i) ||
                             rawContent.match(/(?:^|\n)Thought:\s*([\s\S]*?)(?=(?:\n(?:Action|Tool|```)|$))/i);
        if (thoughtMatch) {
          thoughtText = thoughtMatch[1].trim();
        }

        if (thoughtText) {
          this.emit('thought', { stepId, thought: thoughtText });
          this.emit('log', { type: 'thought', text: `💭 Thought: ${thoughtText}` });
        }

        // 2. Extract tool calls (native or JSON fallback)
        const toolCalls = this._extractToolCalls(message);

        if (toolCalls.length === 0) {
          // LLM spoke without tools; if it mentions finishing, finalize
          const content = message.content || '';
          this.emit('log', { type: 'chat', text: content });

          const isExplicitCompletion = /(?:task\s+(?:is\s+)?complete|fully\s+accomplished|all\s+steps\s+finished|program\s+(?:is\s+)?ready)/i.test(content) &&
                                       !(/cannot|failed|error|not\s+found|to\s+fix|need\s+to|try\s+again/i.test(content));
          if (isExplicitCompletion) {
            taskCompleted = true;
            finalSummary = { summary: content, binary_path: '' };
            break;
          }

          // Otherwise prompt model to take action
          messages.push({
            role: 'user',
            content: 'Please proceed with the implementation using tool calls: call `write_file` to create or update the code, `run_command` to compile and execute, and `finish_task` to finalize.'
          });
          continue;
        }

        // 3. Execute tool calls sequentially
        for (const tc of toolCalls) {
          if (!this.isRunning) break;

          this.emit('step', {
            stepId,
            type: tc.name,
            title: `Executing: ${tc.name}`,
            args: tc.args,
            status: 'running'
          });

          let toolOutput = '';
          let isSuccess = true;

          try {
            if (tc.name === 'finish_task') {
              taskCompleted = true;
              finalSummary = tc.args;
              toolOutput = 'Task marked as completed.';
              this.emit('step', {
                stepId,
                type: 'finish',
                title: 'Task Successfully Completed!',
                status: 'success',
                summary: tc.args.summary,
                binaryPath: tc.args.binary_path
              });
              break;
            } else if (tc.name === 'write_file') {
              const res = await this._executeWriteFile(tc.args.path, tc.args.content);
              toolOutput = res.message;
              isSuccess = res.success;
            } else if (tc.name === 'patch_file') {
              const res = await this._executePatchFile(tc.args.path, tc.args.search, tc.args.replace);
              toolOutput = res.message;
              isSuccess = res.success;
            } else if (tc.name === 'run_command') {
              const res = await this._executeRunCommand(tc.args.command);
              toolOutput = res.message;
              isSuccess = res.success;
              if (!res.success) {
                healedErrors.push({
                  command: tc.args.command,
                  error: (res.message || '').slice(0, 300)
                });
              }
            } else if (tc.name === 'read_file') {
              const res = await this._executeReadFile(tc.args.path);
              toolOutput = res.message;
              isSuccess = res.success;
            } else if (tc.name === 'list_files') {
              const res = await this._executeListFiles(tc.args.sub_dir);
              toolOutput = res.message;
              isSuccess = res.success;
            } else {
              toolOutput = `Unknown tool: ${tc.name}`;
              isSuccess = false;
            }
          } catch (execErr) {
            toolOutput = `Tool execution error: ${execErr.message}`;
            isSuccess = false;
          }

          this.emit('step', {
            stepId,
            type: tc.name,
            title: `${tc.name} ${isSuccess ? 'Completed' : 'Reported Issues'}`,
            status: isSuccess ? 'success' : 'warning',
            output: toolOutput
          });

          // Feed result back into conversation
          if (tc.id) {
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: toolOutput
            });
          } else {
            messages.push({
              role: 'user',
              content: `Tool Result for ${tc.name}:\n${toolOutput}`
            });
          }
        }
      }

      if (stepCount >= this.maxSteps && !taskCompleted) {
        this.emit('log', {
          type: 'warning',
          text: `⚠️ Reached maximum step limit (${this.maxSteps}). Halting execution.`
        });
      }

      const result = {
        success: taskCompleted,
        summary: finalSummary ? finalSummary.summary : 'Execution finished.',
        binaryPath: finalSummary ? finalSummary.binary_path : null,
        stepsExecuted: stepCount
      };

      await this._saveLearningReport(result, userGoal, healedErrors);
      this.emit('complete', result);
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        return { success: false, aborted: true };
      }
      this.emit('error', err);
      this.emit('log', { type: 'error', text: `❌ Agent Fatal Error: ${err.message}` });
      throw err;
    } finally {
      this.isRunning = false;
      this.currentAbortController = null;
    }
  }

  // =========================================================================
  // Internal Tool Executors (Interfacing with agentBridge)
  // =========================================================================

  async _executeWriteFile(filePath, content) {
    if (!this.agentBridge || typeof this.agentBridge.writeFile !== 'function') {
      return { success: false, message: 'agentBridge.writeFile not available in runtime' };
    }
    let cleanPath = (filePath || '').replace(/^[A-Za-z]:[/\\]+/, '').replace(/^[/\\]+/, '');
    
    // Guard against trying to write binary executables directly
    if (/\.(exe|dll|so|obj)$/i.test(cleanPath)) {
      return {
        success: false,
        message: `Cannot write binary executable "${cleanPath}" directly with write_file. Write the .c source file instead, and compile it using run_command.`
      };
    }

    this.emit('log', { type: 'info', text: `📝 Writing file: ${cleanPath} (${content.length} chars)...` });

    const res = await this.agentBridge.writeFile(cleanPath, content);
    if (res && res.success) {
      return {
        success: true,
        message: `Successfully wrote ${res.bytes} bytes to "${cleanPath}".`
      };
    }
    return {
      success: false,
      message: `Failed to write "${cleanPath}": ${res?.error || 'Unknown error'}`
    };
  }

  async _executePatchFile(filePath, search, replace) {
    if (!this.agentBridge || typeof this.agentBridge.readFile !== 'function' || typeof this.agentBridge.writeFile !== 'function') {
      return { success: false, message: 'agentBridge file operations not available in runtime' };
    }
    const cleanPath = (filePath || '').replace(/^[/\\]+/, '');
    const readRes = await this.agentBridge.readFile(cleanPath);
    if (!readRes || !readRes.success) {
      return { success: false, message: `Could not read file "${cleanPath}" for patching: ${readRes?.error || 'File not found'}` };
    }

    const originalContent = readRes.content;
    if (!originalContent.includes(search)) {
      return {
        success: false,
        message: `Patch target snippet not found in "${cleanPath}". Ensure 'search' matches existing code exactly, or use write_file instead.`
      };
    }

    // Perform surgical single replacement
    const updatedContent = originalContent.replace(search, replace);
    const writeRes = await this.agentBridge.writeFile(cleanPath, updatedContent);
    if (writeRes && writeRes.success) {
      this.emit('log', { type: 'info', text: `🩹 Patched file: ${cleanPath}` });
      return {
        success: true,
        message: `Successfully applied surgical patch to "${cleanPath}" (${writeRes.bytes} bytes total).`
      };
    }
    return {
      success: false,
      message: `Failed to save patched "${cleanPath}": ${writeRes?.error || 'Write error'}`
    };
  }

  _analyzeCompilerDiagnostics(errText) {
    if (!errText) return [];
    const hints = [];
    const lower = errText.toLowerCase();

    // 1. Missing integer types
    if (/uint\d+_t|int\d+_t/i.test(errText) && (lower.includes('undeclared') || lower.includes('unknown type') || lower.includes('syntax error') || lower.includes('identifier'))) {
      hints.push('Missing integer types: Add `#include <stdint.h>` at top of file.');
    }
    // 2. Math functions (sin, cos, sqrt, pow, fabs, round)
    if (/(?:sqrt|cos|sin|pow|fabs|round|floor|ceil)\b/i.test(errText) && (lower.includes('unresolved external') || lower.includes('undefined reference') || lower.includes('undeclared'))) {
      hints.push('Math functions: Add `#include <math.h>` and compile with `-lm`.');
    }
    // 3. CRT deprecation warnings on Windows (fopen, sprintf, strcpy)
    if (/C4996|fopen_s|deprecated|security_warnings/i.test(errText)) {
      hints.push('MSVC CRT safety: Add `#define _CRT_SECURE_NO_WARNINGS` before any `#include <stdio.h>`.');
    }
    // 4. Memory/stdlib/string functions
    if (/(?:malloc|free|exit|calloc)\b/i.test(errText) && (lower.includes('undeclared') || lower.includes('implicit declaration') || lower.includes('identifier'))) {
      hints.push('Memory allocation: Add `#include <stdlib.h>`.');
    }
    if (/(?:memset|memcpy|strlen|strcpy|strcat|strcmp)\b/i.test(errText) && (lower.includes('undeclared') || lower.includes('implicit declaration') || lower.includes('identifier'))) {
      hints.push('String/memory manipulation: Add `#include <string.h>`.');
    }
    // 5. BMP structure alignment / padding
    if (/sizeof\(.*bitmapfileheader.*\)|struct\s+.*bitmap/i.test(errText) || (lower.includes('bmp') && (lower.includes('header size') || lower.includes('corrupted') || lower.includes('magic')))) {
      hints.push('BMP struct alignment: Use `#pragma pack(push, 1)` and `#pragma pack(pop)` around BMP header structs to prevent struct padding.');
    }
    // 6. Source file not found / missing file before compilation
    if (/cannot open source file|no such file or directory/i.test(errText)) {
      hints.push('Source file not found: Call `write_file` to write the source code file BEFORE attempting to compile.');
    }
    // 7. Duplicate function definition / multiple main
    if (/already has a body|redefinition.*main/i.test(errText)) {
      hints.push('Duplicate main() function: Use `write_file` to rewrite a single, clean main() function without duplicates.');
    }
    // 8. Command not recognized / executable invocation
    if (/not recognized as the name of a cmdlet|command not found/i.test(errText)) {
      hints.push('Executable not found: Make sure compilation succeeded, and execute using `.\\<program>.exe` or `<program>.exe`.');
    }
    // 9. Python missing module
    if (/modulenotfounderror|no module named/i.test(errText)) {
      hints.push('Python dependency: Standard libraries are recommended, or run pip install via run_command.');
    }

    return hints;
  }

  async _executeRunCommand(command) {
    if (!this.agentBridge || typeof this.agentBridge.executeCommand !== 'function') {
      return { success: false, message: 'agentBridge.executeCommand not available in runtime' };
    }

    this.emit('log', { type: 'terminal', text: `> ${command}` });
    const res = await this.agentBridge.executeCommand(command, 45000);

    if (res.stdout) {
      this.emit('log', { type: 'stdout', text: res.stdout });
    }
    if (res.stderr) {
      this.emit('log', { type: 'stderr', text: res.stderr });
    }

    if (res.success) {
      return {
        success: true,
        message: `Command succeeded (Exit code 0):\n${res.stdout || '(No output)'}`
      };
    }

    // Compiler / Command Error: provide structured feedback for self-healing
    const errText = res.stderr || res.stdout || 'Command failed with non-zero exit code.';
    const hints = this._analyzeCompilerDiagnostics(errText);
    let hintSection = '';
    if (hints.length > 0) {
      hintSection = `\n\n[💡 CODEX COMPILER DIAGNOSTIC HINTS]:\n${hints.map(h => `• ${h}`).join('\n')}\n-> Use patch_file or write_file to apply these fixes and re-compile.`;
    }

    return {
      success: false,
      message: `Command failed with exit code ${res.exitCode}.\nOutput / Compiler Diagnostics:\n${errText}${hintSection}`
    };
  }

  async _executeReadFile(filePath) {
    if (!this.agentBridge || typeof this.agentBridge.readFile !== 'function') {
      return { success: false, message: 'agentBridge.readFile not available in runtime' };
    }
    const res = await this.agentBridge.readFile(filePath);
    if (res && res.success) {
      return {
        success: true,
        message: `File content of "${filePath}":\n\`\`\`\n${res.content}\n\`\`\``
      };
    }
    return { success: false, message: `Could not read "${filePath}": ${res?.error || 'File not found'}` };
  }

  async _executeListFiles(subDir = '') {
    if (!this.agentBridge || typeof this.agentBridge.listFiles !== 'function') {
      return { success: false, message: 'agentBridge.listFiles not available in runtime' };
    }
    const res = await this.agentBridge.listFiles(subDir);
    if (res && res.success) {
      const summary = res.files.map(f => `${f.isDirectory ? '📁' : '📄'} ${f.name} (${f.size} bytes)`).join('\n');
      return {
        success: true,
        message: `Files in workspace:\n${summary || '(Workspace is empty)'}`
      };
    }
    return { success: false, message: `Failed to list files: ${res?.error}` };
  }

  // =========================================================================
  // LLM Communication & Tool Extraction
  // =========================================================================

  async _callLLM(endpoint, model, messages) {
    const url = `${endpoint}/chat/completions`;
    const payload = {
      model,
      messages,
      tools: AGENT_TOOLS_SPEC,
      temperature: 0.2
    };

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.currentAbortController.signal,
        body: JSON.stringify(payload)
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') throw fetchErr;
      throw new Error(`Cannot reach Ollama at ${endpoint}. Please ensure Ollama is running ('ollama serve'). Details: ${fetchErr.message}`);
    }

    if (!res.ok) {
      const txt = await res.text();
      // If model not found, gracefully fall back to llama3.2
      if ((res.status === 404 || txt.toLowerCase().includes('not found')) && model !== 'llama3.2:latest' && model !== 'llama3.2') {
        this.emit('log', {
          type: 'warning',
          text: `⚠️ Model [${model}] is not downloaded in Ollama. Automatically falling back to installed [llama3.2:latest]!`
        });
        return await this._callLLM(endpoint, 'llama3.2:latest', messages);
      }
      throw new Error(`Ollama API error (${res.status}): ${txt}`);
    }

    return await res.json();
  }

  _extractToolCalls(message) {
    // 1. Native OpenAI/Ollama tool_calls
    if (message.tool_calls && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      return message.tool_calls.map(tc => {
        let args = tc.function.arguments;
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch {
            args = {};
          }
        }
        return {
          id: tc.id,
          name: tc.function.name,
          args
        };
      });
    }

    // 2. Structured JSON Fallback inside Markdown blocks
    const content = message.content || '';
    const jsonMatches = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/g);
    const parsedCalls = [];

    if (jsonMatches) {
      for (const block of jsonMatches) {
        const rawJson = block.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(rawJson);
          if (parsed && (parsed.tool || parsed.name)) {
            const toolName = parsed.tool || parsed.name;
            const args = parsed.parameters || parsed.args || parsed;
            parsedCalls.push({
              id: null,
              name: toolName,
              args
            });
          }
        } catch {}
      }
    }

    if (parsedCalls.length > 0) {
      return parsedCalls;
    }

    // 3. Fallback: Parse raw inline JSON objects (e.g. {"name": "...", "parameters": {...}};)
    return this._extractInlineJsonToolCalls(content);
  }

  _extractInlineJsonToolCalls(text) {
    if (!text || typeof text !== 'string') return [];
    const calls = [];
    const validTools = new Set(['write_file', 'patch_file', 'run_command', 'read_file', 'list_files', 'finish_task']);
    
    let i = 0;
    while (i < text.length) {
      if (text[i] === '{') {
        let depth = 0;
        let inString = false;
        let escape = false;
        const start = i;
        let matched = false;

        for (let j = i; j < text.length; j++) {
          const ch = text[j];
          if (escape) {
            escape = false;
            continue;
          }
          if (ch === '\\' && inString) {
            escape = true;
            continue;
          }
          if (ch === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (ch === '{') depth++;
            else if (ch === '}') {
              depth--;
              if (depth === 0) {
                const candidate = text.slice(start, j + 1);
                try {
                  const parsed = JSON.parse(candidate);
                  const name = parsed.name || parsed.tool;
                  if (name && validTools.has(name)) {
                    calls.push({
                      id: null,
                      name,
                      args: parsed.parameters || parsed.args || parsed
                    });
                    i = j;
                    matched = true;
                    break;
                  }
                } catch {}
              }
            }
          }
        }
        if (matched) {
          i++;
          continue;
        }
      }
      i++;
    }
    return calls;
  }

  async _saveLearningReport(result, userGoal, healedErrors = []) {
    if (!this.agentBridge || typeof this.agentBridge.writeFile !== 'function') return;

    const taskReport = {
      timestamp: new Date().toISOString(),
      goal: userGoal,
      success: result.success,
      stepsExecuted: result.stepsExecuted,
      binaryPath: result.binaryPath,
      summary: result.summary,
      healedErrors,
      stepHistory: this.stepHistory
    };

    try {
      await this.agentBridge.writeFile('last_agent_task_report.json', JSON.stringify(taskReport, null, 2));
    } catch {}

    if (result.success) {
      try {
        let memory = [];
        if (typeof this.agentBridge.readFile === 'function') {
          const res = await this.agentBridge.readFile('.agent_memory.json');
          if (res && res.success && res.content) {
            memory = JSON.parse(res.content);
          }
        }
        memory.push({
          timestamp: new Date().toISOString(),
          goal: userGoal,
          binaryPath: result.binaryPath,
          summary: result.summary,
          healedErrorsCount: (healedErrors || []).length
        });
        if (memory.length > 50) memory = memory.slice(-50);
        await this.agentBridge.writeFile('.agent_memory.json', JSON.stringify(memory, null, 2));
      } catch {}
    }
  }
}

