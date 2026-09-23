import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import TelemetryService from '../src/main/TelemetryService.js';
import ToolchainManager from '../src/main/ToolchainManager.js';

console.log('▶ Testing TelemetryService AI feedback bundle & continuous learning...');

const tm = new ToolchainManager();
await tm.init();

const ts = new TelemetryService();
const res = await ts.generateFeedbackBundle(tm);

assert.strictEqual(res.success, true, 'Telemetry bundle generation should succeed');
assert.ok(fs.existsSync(res.bundleJsonPath), 'ai_feedback_bundle.json must be written');
assert.ok(fs.existsSync(res.markdownPath), 'AI_TELEMETRY.md must be written');
assert.ok(res.bundle.environment, 'Bundle must contain environment block');
assert.ok(res.bundle.workspaceInventory, 'Bundle must contain workspace inventory');
assert.ok(res.summaryText.includes('AI Telemetry & Diagnostic Report'), 'Summary text must be formatted');

console.log('✓ Successfully generated AI feedback bundle & telemetry report.');
console.log('✅ TelemetryService unit tests PASSED.');
