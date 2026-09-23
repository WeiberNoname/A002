/**
 * E2E Visual Regression Test Launcher
 * Spawns Electron with the e2e_runner harness and asserts successful execution.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Launching Electron Visual Regression Suite...');

const harnessScript = path.resolve(__dirname, 'e2e_runner.js');

const child = spawn('npx', ['electron', `"${harnessScript}"`], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ End-to-End Visual Regression Suite completed successfully with exit code 0.');
    process.exit(0);
  } else {
    console.error(`❌ Visual Regression Suite failed with exit code: ${code}`);
    process.exit(code || 1);
  }
});
