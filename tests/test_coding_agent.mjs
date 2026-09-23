import assert from 'node:assert';
import {
  CodingAgentEngine,
  AGENT_TOOLS_SPEC,
  CODING_AGENT_SYSTEM_PROMPT
} from '../src/core/CodingAgentEngine.js';

console.log('▶ Testing CodingAgentEngine autonomous ReAct loop & tool execution...');

// 1. Tool Spec Verification
assert.ok(Array.isArray(AGENT_TOOLS_SPEC), 'AGENT_TOOLS_SPEC must be an array');
const toolNames = AGENT_TOOLS_SPEC.map(t => t.function.name);
assert.ok(toolNames.includes('write_file'), 'Tools must include write_file');
assert.ok(toolNames.includes('patch_file'), 'Tools must include patch_file');
assert.ok(toolNames.includes('run_command'), 'Tools must include run_command');
assert.ok(toolNames.includes('read_file'), 'Tools must include read_file');
assert.ok(toolNames.includes('list_files'), 'Tools must include list_files');
assert.ok(toolNames.includes('finish_task'), 'Tools must include finish_task');
assert.ok(CODING_AGENT_SYSTEM_PROMPT.includes('Autonomous Software Engineering Agent'), 'System prompt must define autonomous persona');

// 2. Engine Event Emitter Verification
const engine = new CodingAgentEngine();
let logReceived = null;
const logListener = (log) => { logReceived = log; };
engine.on('log', logListener);
engine.emit('log', { type: 'info', text: 'Test log event' });
assert.strictEqual(logReceived?.text, 'Test log event', 'Event emitter should deliver log payload');
engine.off('log', logListener);
engine.emit('log', { type: 'info', text: 'Second log event' });
assert.strictEqual(logReceived?.text, 'Test log event', 'Unsubscribed listener should not receive event');

// 3. Tool Extraction Logic (Native & JSON Fallback)
const nativeMessage = {
  role: 'assistant',
  tool_calls: [
    {
      id: 'call_123',
      function: {
        name: 'write_file',
        arguments: JSON.stringify({ path: 'main.c', content: '#include <stdio.h>\nint main(){return 0;}' })
      }
    }
  ]
};
const nativeExtracted = engine._extractToolCalls(nativeMessage);
assert.strictEqual(nativeExtracted.length, 1);
assert.strictEqual(nativeExtracted[0].name, 'write_file');
assert.strictEqual(nativeExtracted[0].args.path, 'main.c');

const markdownJsonMessage = {
  role: 'assistant',
  content: 'I will now compile the C executable:\n```json\n{\n  "tool": "run_command",\n  "command": "gcc -O2 main.c -o main.exe"\n}\n```'
};
const fallbackExtracted = engine._extractToolCalls(markdownJsonMessage);
assert.strictEqual(fallbackExtracted.length, 1);
assert.strictEqual(fallbackExtracted[0].name, 'run_command');
assert.strictEqual(fallbackExtracted[0].args.command, 'gcc -O2 main.c -o main.exe');

// 4. Mock Autonomous ReAct Loop with Compiler Self-Healing Simulation
const mockFiles = new Map();
const mockExecutedCommands = [];

const mockAgentBridge = {
  writeFile: async (filePath, content) => {
    mockFiles.set(filePath, content);
    return { success: true, bytes: content.length };
  },
  readFile: async (filePath) => {
    if (mockFiles.has(filePath)) {
      return { success: true, content: mockFiles.get(filePath) };
    }
    return { success: false, error: 'File not found' };
  },
  listFiles: async () => {
    const files = Array.from(mockFiles.keys()).map(name => ({
      name,
      isDirectory: false,
      size: (mockFiles.get(name) || '').length
    }));
    return { success: true, files };
  },
  executeCommand: async (cmd) => {
    mockExecutedCommands.push(cmd);
    // Simulate first compilation attempt failing with syntax error, and second attempt succeeding
    if (cmd.includes('gcc') && mockExecutedCommands.filter(c => c.includes('gcc')).length === 1) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'negative_image.c:42:5: error: expected \';\' before \'return\''
      };
    }
    return {
      success: true,
      exitCode: 0,
      stdout: 'Compilation successful. negative_image.exe built.',
      stderr: ''
    };
  }
};

const reactEngine = new CodingAgentEngine({
  agentBridge: mockAgentBridge,
  maxSteps: 10
});

// Mock LLM Multi-Turn Responses:
// Turn 1: Write buggy C code
// Turn 2: Run gcc (which fails)
// Turn 3: Fix C code
// Turn 4: Run gcc again (succeeds)
// Turn 5: Finish task
let turnCount = 0;
reactEngine._callLLM = async (endpoint, model, messages) => {
  turnCount++;
  if (turnCount === 1) {
    return {
      choices: [{
        message: {
          role: 'assistant',
          tool_calls: [{
            id: 'call_1',
            function: {
              name: 'write_file',
              arguments: JSON.stringify({
                path: 'negative_image.c',
                content: '// C Negative Image Code with deliberate bug'
              })
            }
          }]
        }
      }]
    };
  } else if (turnCount === 2) {
    return {
      choices: [{
        message: {
          role: 'assistant',
          tool_calls: [{
            id: 'call_2',
            function: {
              name: 'run_command',
              arguments: JSON.stringify({ command: 'gcc -O2 negative_image.c -o negative_image.exe' })
            }
          }]
        }
      }]
    };
  } else if (turnCount === 3) {
    // Check that previous tool response in messages contains compiler error
    const lastMsg = messages[messages.length - 1];
    assert.ok(lastMsg.content.includes('expected \';\''), 'Agent must receive compiler diagnostic feedback for self-healing');
    return {
      choices: [{
        message: {
          role: 'assistant',
          tool_calls: [{
            id: 'call_3',
            function: {
              name: 'write_file',
              arguments: JSON.stringify({
                path: 'negative_image.c',
                content: '// C Negative Image Code with bug FIXED;'
              })
            }
          }]
        }
      }]
    };
  } else if (turnCount === 4) {
    return {
      choices: [{
        message: {
          role: 'assistant',
          tool_calls: [{
            id: 'call_4',
            function: {
              name: 'run_command',
              arguments: JSON.stringify({ command: 'gcc -O2 negative_image.c -o negative_image.exe' })
            }
          }]
        }
      }]
    };
  } else {
    return {
      choices: [{
        message: {
          role: 'assistant',
          tool_calls: [{
            id: 'call_5',
            function: {
              name: 'finish_task',
              arguments: JSON.stringify({
                summary: 'Successfully compiled negative_image.exe after self-healing syntax error.',
                binary_path: 'negative_image.exe'
              })
            }
          }]
        }
      }]
    };
  }
};

const taskResult = await reactEngine.runTask('Build C negative image filter tool and produce an exe');

assert.strictEqual(taskResult.success, true, 'ReAct task should succeed');
assert.strictEqual(taskResult.binaryPath, 'negative_image.exe', 'Binary path must match executable');
assert.ok(mockFiles.has('negative_image.c'), 'C source file must have been written');
assert.ok(mockFiles.get('negative_image.c').includes('FIXED'), 'Self-healing code update must be applied');
assert.strictEqual(mockExecutedCommands.length, 2, 'Should have executed compilation twice (failure + healed success)');

// 5. Abort Cancellation Verification
const abortEngine = new CodingAgentEngine({ agentBridge: mockAgentBridge });
abortEngine._callLLM = async () => {
  abortEngine.abort();
  const err = new Error('The operation was aborted');
  err.name = 'AbortError';
  throw err;
};
const abortResult = await abortEngine.runTask('Task to cancel');
assert.strictEqual(abortResult.aborted, true, 'Task should return aborted: true on cancellation');

// 6. Surgical Patch File Verification
mockFiles.set('patch_target.c', 'int add(int a, int b) {\n  return a - b;\n}');
const patchEngine = new CodingAgentEngine({ agentBridge: mockAgentBridge });
const patchRes = await patchEngine._executePatchFile('patch_target.c', 'return a - b;', 'return a + b;');
assert.strictEqual(patchRes.success, true, 'Surgical patch should succeed');
assert.ok(mockFiles.get('patch_target.c').includes('return a + b;'), 'Patched content must contain replacement');

// 7. Compiler Diagnostic Analysis Verification
const diagTest1 = patchEngine._analyzeCompilerDiagnostics('error C2065: "uint32_t": undeclared identifier');
assert.ok(diagTest1.some(h => h.includes('stdint.h')), 'Should identify missing stdint.h');

const diagTest2 = patchEngine._analyzeCompilerDiagnostics("warning C4996: 'fopen': This function or variable may be unsafe");
assert.ok(diagTest2.some(h => h.includes('_CRT_SECURE_NO_WARNINGS')), 'Should identify MSVC CRT warning');

const diagTest3 = patchEngine._analyzeCompilerDiagnostics('undefined reference to `sqrt`');
assert.ok(diagTest3.some(h => h.includes('math.h')), 'Should identify missing math library');

// 8. Thought Event Emission Verification
let thoughtCaptured = null;
patchEngine.on('thought', (data) => { thoughtCaptured = data; });
patchEngine.emit('thought', { stepId: 1, thought: 'Designing BMP negative algorithm' });
assert.strictEqual(thoughtCaptured?.thought, 'Designing BMP negative algorithm', 'Thought event must be emitted');

console.log('✅ CodingAgentEngine autonomous ReAct loop & self-healing tests PASSED.');
