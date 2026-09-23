/**
 * TestReporter.mjs
 * 
 * Machine-readable test suite reporter.
 * Records test suite execution, assertion results, durations, and outputs
 * structured test_results.json and workspace/test_report.json files
 * so AI agents can inspect test results and self-improve.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TestReporter {
  constructor() {
    this.startTime = Date.now();
    this.suites = [];
    this.currentSuite = null;
    this.isHooked = false;
  }

  hookConsole() {
    if (this.isHooked) return;
    this.isHooked = true;

    const origLog = console.log;
    const origError = console.error;

    console.log = (...args) => {
      origLog(...args);
      const msg = args.map(a => typeof a === 'string' ? a : '').join(' ');
      if (msg.includes('▶ Testing ')) {
        const name = msg.slice(msg.indexOf('▶ Testing ') + 10).replace(/\.\.\.$/, '').trim();
        this.startSuite(name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), name);
      } else if (msg.includes('tests PASSED') || msg.includes('test PASSED')) {
        this.finishSuite(true);
      }
    };

    console.error = (...args) => {
      origError(...args);
      const msg = args.map(a => typeof a === 'string' ? a : '').join(' ');
      if (this.currentSuite) {
        this.finishSuite(false, new Error(msg));
      }
    };
  }

  startSuite(id, name) {
    if (this.currentSuite) {
      this.finishSuite(true);
    }
    this.currentSuite = {
      id,
      name,
      status: 'passed',
      startTime: Date.now(),
      durationMs: 0,
      error: null
    };
    this.suites.push(this.currentSuite);
  }

  finishSuite(passed = true, err = null) {
    if (this.currentSuite) {
      this.currentSuite.durationMs = Date.now() - this.currentSuite.startTime;
      this.currentSuite.status = passed ? 'passed' : 'failed';
      if (err) {
        this.currentSuite.error = {
          message: err.message,
          stack: err.stack
        };
      }
      this.currentSuite = null;
    }
  }

  saveReport() {
    if (this.currentSuite) {
      this.finishSuite(true);
    }

    const totalDuration = Date.now() - this.startTime;
    const passed = this.suites.filter(s => s.status === 'passed').length;
    const failed = this.suites.filter(s => s.status === 'failed').length;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.suites.length,
        passed,
        failed,
        passRate: `${Math.round((passed / (this.suites.length || 1)) * 100)}%`,
        durationMs: totalDuration,
        allPassed: failed === 0
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        cwd: process.cwd()
      },
      suites: this.suites
    };

    // 1. Write tests/test_results.json
    try {
      const testsDir = path.resolve(__dirname);
      fs.writeFileSync(path.join(testsDir, 'test_results.json'), JSON.stringify(report, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to save tests/test_results.json:', e);
    }

    // 2. Write workspace/test_report.json
    try {
      const wsDir = path.resolve(__dirname, '..', 'workspace');
      if (!fs.existsSync(wsDir)) fs.mkdirSync(wsDir, { recursive: true });
      fs.writeFileSync(path.join(wsDir, 'test_report.json'), JSON.stringify(report, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to save workspace/test_report.json:', e);
    }

    return report;
  }
}

export const globalTestReporter = new TestReporter();
globalTestReporter.hookConsole();
