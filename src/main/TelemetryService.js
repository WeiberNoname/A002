/**
 * TelemetryService.js
 * 
 * Aggregates test results, compiler diagnostics, toolchain status,
 * and workspace history into accessible AI feedback bundles.
 * Enables autonomous self-improvement for both internal agents and external AI pair-programmers.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

class TelemetryService {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.workspaceDir = options.workspaceDir || path.join(this.rootDir, 'workspace');
  }

  /**
   * Generates a unified telemetry bundle accessible to AI assistants and the user.
   */
  async generateFeedbackBundle(toolchainManager) {
    const timestamp = new Date().toISOString();

    // 1. Toolchain status
    let toolchainDiag = null;
    if (toolchainManager && typeof toolchainManager.checkEnvironment === 'function') {
      try {
        toolchainDiag = await toolchainManager.checkEnvironment();
      } catch (e) {
        toolchainDiag = { error: e.message };
      }
    }

    // 2. Read latest test results
    let testReport = null;
    const testReportPaths = [
      path.join(this.workspaceDir, 'test_report.json'),
      path.join(this.rootDir, 'tests', 'test_results.json')
    ];

    for (const p of testReportPaths) {
      if (fs.existsSync(p)) {
        try {
          testReport = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        } catch {}
      }
    }

    // 3. Read agent learning memory
    let agentMemory = [];
    const memoryPath = path.join(this.workspaceDir, '.agent_memory.json');
    if (fs.existsSync(memoryPath)) {
      try {
        agentMemory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
      } catch {}
    }

    // 4. Read last agent task report
    let lastTaskReport = null;
    const lastTaskPath = path.join(this.workspaceDir, 'last_agent_task_report.json');
    if (fs.existsSync(lastTaskPath)) {
      try {
        lastTaskReport = JSON.parse(fs.readFileSync(lastTaskPath, 'utf8'));
      } catch {}
    }

    // 5. Inventory workspace files
    const workspaceFiles = [];
    if (fs.existsSync(this.workspaceDir)) {
      try {
        const entries = fs.readdirSync(this.workspaceDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name === '.toolchain') continue;
          let size = 0;
          let mtime = null;
          try {
            const stat = fs.statSync(path.join(this.workspaceDir, e.name));
            size = stat.size;
            mtime = stat.mtime;
          } catch {}
          workspaceFiles.push({
            name: e.name,
            isDirectory: e.isDirectory(),
            size,
            mtime
          });
        }
      } catch {}
    }

    // 6. Read latest diagnostics log snippet
    let diagnosticSnippet = '';
    const diagLogPath = path.join(this.rootDir, 'assets', 'diagnostics.log');
    if (fs.existsSync(diagLogPath)) {
      try {
        const raw = fs.readFileSync(diagLogPath, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        diagnosticSnippet = lines.slice(-40).join('\n');
      } catch {}
    }

    const bundle = {
      version: '1.0.0',
      timestamp,
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        toolchain: toolchainDiag
      },
      testSuiteResults: testReport,
      agentLearningMemory: {
        totalLearnedRecipes: agentMemory.length,
        recentRecipes: agentMemory.slice(-10)
      },
      lastTaskReport,
      workspaceInventory: {
        totalFiles: workspaceFiles.length,
        files: workspaceFiles
      },
      systemDiagnosticLogSnippet: diagnosticSnippet
    };

    // Save bundle to workspace/ai_feedback_bundle.json
    const bundleJsonPath = path.join(this.workspaceDir, 'ai_feedback_bundle.json');
    try {
      if (!fs.existsSync(this.workspaceDir)) fs.mkdirSync(this.workspaceDir, { recursive: true });
      fs.writeFileSync(bundleJsonPath, JSON.stringify(bundle, null, 2), 'utf8');
    } catch (e) {
      console.warn('[TelemetryService] Failed to write ai_feedback_bundle.json:', e);
    }

    // Also write a human-readable Markdown summary to workspace/AI_TELEMETRY.md
    const markdownSummary = this._formatMarkdownSummary(bundle);
    const mdPath = path.join(this.workspaceDir, 'AI_TELEMETRY.md');
    try {
      fs.writeFileSync(mdPath, markdownSummary, 'utf8');
    } catch {}

    return {
      success: true,
      bundle,
      bundleJsonPath,
      markdownPath: mdPath,
      summaryText: this._formatClipSummary(bundle)
    };
  }

  _formatClipSummary(bundle) {
    const ts = bundle.testSuiteResults?.summary;
    const tc = bundle.environment?.toolchain;
    const mem = bundle.agentLearningMemory;

    return `=== AI Telemetry & Diagnostic Report (${bundle.timestamp}) ===\n` +
      `• Tests: ${ts ? `${ts.passed}/${ts.total} passed (${ts.passRate}) in ${ts.durationMs}ms` : 'No test run recorded'}\n` +
      `• C Compiler: ${tc?.cCompiler?.name || 'N/A'}\n` +
      `• Python: ${tc?.python?.version || 'N/A'} | Node: ${tc?.node?.version || bundle.environment.node}\n` +
      `• Workspace Files: ${bundle.workspaceInventory.totalFiles} items\n` +
      `• Learned Self-Healing Recipes: ${mem.totalLearnedRecipes} stored in memory\n` +
      `Full report saved to: workspace/ai_feedback_bundle.json`;
  }

  _formatMarkdownSummary(bundle) {
    const ts = bundle.testSuiteResults?.summary;
    const tc = bundle.environment?.toolchain;

    return `# AI Telemetry & Continuous Improvement Report
Generated: ${bundle.timestamp}

## 1. Toolchain & Runtime Environment
- **Platform**: ${bundle.environment.platform} (${bundle.environment.arch})
- **Node.js**: ${tc?.node?.version || bundle.environment.node}
- **Python**: ${tc?.python?.version || 'Not Detected'}
- **C/C++ Compiler**: ${tc?.cCompiler?.name || 'MSVC / GCC'} (${tc?.cCompiler?.details || ''})

## 2. Test Suite Validation Results
- **Summary**: ${ts ? `${ts.passed} / ${ts.total} Suites Passed (${ts.passRate}) in ${ts.durationMs}ms` : 'No test results loaded'}
- **Status**: ${ts?.allPassed ? '✅ 100% SUCCESS' : '⚠️ FAILURES DETECTED'}

${bundle.testSuiteResults?.suites ? `### Individual Suites
${bundle.testSuiteResults.suites.map(s => `- [${s.status === 'passed' ? 'x' : ' '}] **${s.name}** (${s.durationMs}ms)`).join('\n')}` : ''}

## 3. Workspace Artifacts (${bundle.workspaceInventory.totalFiles} files)
${bundle.workspaceInventory.files.map(f => `- ${f.isDirectory ? '📁' : '📄'} \`${f.name}\` (${f.size} bytes)`).join('\n')}

## 4. Agent Continuous Improvement Memory (${bundle.agentLearningMemory.totalLearnedRecipes} recipes)
${bundle.agentLearningMemory.recentRecipes.length > 0 
  ? bundle.agentLearningMemory.recentRecipes.map(r => `### Recipe: ${r.goal}\n- Result: ${r.success ? 'Success' : 'Failed'} (${r.stepsExecuted} steps)\n- Solution Notes: ${r.solutionNotes || 'N/A'}\n- Fixed Errors: ${r.healedErrors?.join(', ') || 'None'}`).join('\n\n')
  : '_No historical recipes recorded yet._'}
`;
  }
}

module.exports = TelemetryService;
