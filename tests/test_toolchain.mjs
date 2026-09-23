import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert';
import { ToolchainManager } from '../src/core/ToolchainManager.js';

console.log('▶ Testing ToolchainManager discovery, environment injection & GCC shim...');

const toolchain = new ToolchainManager({
  rootDir: process.cwd(),
  toolchainDir: path.join(process.cwd(), 'workspace', '.toolchain')
});

await toolchain.init();

const diagnostics = await toolchain.checkEnvironment();
console.log('Toolchain Diagnostics:', JSON.stringify(diagnostics, null, 2));

assert.ok(diagnostics.node.available, 'Node.js must be available');
assert.ok(diagnostics.python.available, 'Python 3.13 must be detected');
assert.ok(diagnostics.cCompiler.available, 'C compiler must be detected');

// Test compiling a program using 'gcc' command line through the transparent shim!
const testDir = path.resolve('workspace');
const testCPath = path.join(testDir, 'gcc_shim_test.c');
const testExePath = path.join(testDir, 'gcc_shim_test.exe');

fs.writeFileSync(testCPath, `
#include <stdio.h>
int main() {
    printf("GCC_SHIM_SUCCESS\\n");
    return 0;
}
`, 'utf8');

const execEnv = toolchain.getExecutionEnvironment();

// Run gcc via cmd.exe or powershell inside workspace
const compileRes = cp.spawnSync('cmd.exe', ['/c', 'gcc -O2 -Wall gcc_shim_test.c -o gcc_shim_test.exe -lm'], {
  cwd: testDir,
  env: execEnv,
  encoding: 'utf8'
});

console.log('Compile stdout:', compileRes.stdout);
console.log('Compile stderr:', compileRes.stderr);
assert.strictEqual(compileRes.status, 0, 'gcc shim compilation must succeed with exit code 0');
assert.ok(fs.existsSync(testExePath), 'gcc_shim_test.exe must be generated');

const runRes = cp.spawnSync(testExePath, [], { cwd: testDir, encoding: 'utf8' });
assert.strictEqual(runRes.status, 0, 'Compiled executable must run successfully');
assert.ok(runRes.stdout.includes('GCC_SHIM_SUCCESS'), 'Executable output must match expected text');

console.log('✓ gcc shim successfully compiled C code with GCC flags and executed .exe!');

// Test PowerShell compilation
const psCompileRes = cp.spawnSync('powershell.exe', [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-Command',
  'gcc -O2 gcc_shim_test.c -o gcc_shim_test.exe'
], {
  cwd: testDir,
  env: execEnv,
  encoding: 'utf8'
});
console.log('PowerShell compile status:', psCompileRes.status);
assert.strictEqual(psCompileRes.status, 0, 'PowerShell gcc shim compilation must succeed');
console.log('✓ gcc shim successfully compiled C code via PowerShell!');

// Clean up
try {
  if (fs.existsSync(testCPath)) fs.unlinkSync(testCPath);
  if (fs.existsSync(testExePath)) fs.unlinkSync(testExePath);
  const objPath = path.join(testDir, 'gcc_shim_test.obj');
  if (fs.existsSync(objPath)) fs.unlinkSync(objPath);
} catch {}

console.log('✅ ToolchainManager & GCC shim test PASSED.');
