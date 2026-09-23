import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert';
import ToolchainManager from '../src/main/ToolchainManager.js';

console.log('▶ Testing Hello World in C with GCC shim and PowerShell...');

const tm = new ToolchainManager({
  rootDir: process.cwd(),
  toolchainDir: path.join(process.cwd(), 'workspace', '.toolchain')
});
await tm.init();

const env = tm.getExecutionEnvironment();
const testDir = path.resolve('workspace');
const testC = path.join(testDir, 'hello.c');
const testExe = path.join(testDir, 'hello.exe');

fs.writeFileSync(testC, `#include <stdio.h>
int main() {
    printf("Hello, World!\\n");
    return 0;
}
`, 'utf8');

const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows';
const psCandidates = [
  path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  path.join(sysRoot, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
  'powershell.exe'
];
const psExe = psCandidates.find(c => fs.existsSync(c)) || 'powershell.exe';

const cmd = 'gcc -O2 "hello.c" -o "hello.exe" -lm; if ($?) { .\\hello.exe }';
const res = cp.spawnSync(psExe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', cmd], {
  cwd: testDir,
  env,
  encoding: 'utf8'
});

console.log('Exit status:', res.status);
console.log('Stdout:', res.stdout);
console.log('Stderr:', res.stderr);

assert.strictEqual(res.status, 0, 'Command must exit with 0');
assert.ok(res.stdout.includes('Hello, World!'), 'Executable output must contain Hello, World!');
console.log('✅ Hello World in C compilation and execution PASSED!');
