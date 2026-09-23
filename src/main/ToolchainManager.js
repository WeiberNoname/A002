/**
 * ToolchainManager.js
 * 
 * Auto-detects and provisions compilers and runtime environments for the autonomous coding agent.
 * Handles MSVC discovery, environment extraction, GCC transparent shimming, and runtime diagnostics.
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

class ToolchainManager {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.toolchainDir = options.toolchainDir || path.join(this.rootDir, 'workspace', '.toolchain');
    this.msvcEnv = null;
    this.cachedDiagnostics = null;
    this.isInitialized = false;
  }

  /**
   * Initializes the toolchain environment: locates MSVC, extracts variables, and writes shims.
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this._discoverAndExtractMSVC();
      this._setupGccShim();
      this.isInitialized = true;
    } catch (err) {
      console.warn('[ToolchainManager] Initialization warning:', err.message);
    }
  }

  /**
   * Searches for MSVC vcvars64.bat in standard installation locations.
   */
  _discoverAndExtractMSVC() {
    if (process.platform !== 'win32') return;

    const candidates = [
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\VC\\Auxiliary\\Build\\vcvars64.bat',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\VC\\Auxiliary\\Build\\vcvars64.bat',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat',
      'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\VC\\Auxiliary\\Build\\vcvars64.bat',
      'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat'
    ];

    const found = candidates.find(c => fs.existsSync(c));
    if (!found) {
      return;
    }

    try {
      const raw = cp.execSync(`cmd.exe /c "call "${found}" >nul && set"`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      });

      const lines = raw.split(/\r?\n/);
      const env = {};
      for (const line of lines) {
        const idx = line.indexOf('=');
        if (idx > 0) {
          env[line.slice(0, idx)] = line.slice(idx + 1);
        }
      }

      if (env.INCLUDE && env.LIB) {
        this.msvcEnv = env;
      }
    } catch (err) {
      console.warn('[ToolchainManager] Could not extract MSVC environment:', err.message);
    }
  }

  /**
   * Sets up a transparent gcc.cmd and gcc.ps1 shim that translates GCC CLI invocations to cl.exe
   */
  _setupGccShim() {
    if (process.platform !== 'win32') return;

    try {
      if (!fs.existsSync(this.toolchainDir)) {
        fs.mkdirSync(this.toolchainDir, { recursive: true });
      }

      // Write gcc_shim.js
      const shimJsPath = path.join(this.toolchainDir, 'gcc_shim.js');
      const shimJsContent = `
const cp = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);

// Check if version was requested
if (args.includes('--version') || args.includes('-v')) {
  console.log('gcc (DevLab MSVC Transparent Shim) 19.44 / C99-C17 Compatible');
  console.log('Target: x86_64-pc-windows-msvc');
  process.exit(0);
}

// Check if native gcc is available outside .toolchain
function findNativeGcc() {
  const pathDirs = (process.env.PATH || '').split(path.delimiter);
  for (const d of pathDirs) {
    if (d.toLowerCase().includes('.toolchain')) continue;
    const full = path.join(d, 'gcc.exe');
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const nativeGcc = findNativeGcc();
if (nativeGcc) {
  const res = cp.spawnSync(nativeGcc, args, { stdio: 'inherit', env: process.env });
  process.exit(res.status !== null ? res.status : 0);
}

// Otherwise translate to cl.exe
let outputFile = '';
const otherTokens = ['/nologo'];

for (let i = 0; i < args.length; i++) {
  let a = (args[i] || '').trim();
  if ((a.startsWith('"') && a.endsWith('"')) || (a.startsWith("'") && a.endsWith("'"))) {
    a = a.slice(1, -1);
  }

  if (a === '-o' && i + 1 < args.length) {
    let next = (args[++i] || '').trim();
    if ((next.startsWith('"') && next.endsWith('"')) || (next.startsWith("'") && next.endsWith("'"))) {
      next = next.slice(1, -1);
    }
    outputFile = next;
  } else if (a.startsWith('-o') && a.length > 2) {
    outputFile = a.slice(2);
  } else if (a.startsWith('-O')) {
    otherTokens.push('/' + a.slice(1));
  } else if (a.startsWith('-I')) {
    otherTokens.push('/I"' + a.slice(2) + '"');
  } else if (a.startsWith('-D')) {
    otherTokens.push('/D' + a.slice(2));
  } else if (['-lm', '-Wall', '-Wextra', '-Werror', '-pedantic', '-g'].includes(a) || a.startsWith('-std=')) {
    // GCC specific flags cleanly skipped for MSVC
  } else if (a.length > 0) {
    if (a.includes(' ')) {
      otherTokens.push('"' + a + '"');
    } else {
      otherTokens.push(a);
    }
  }
}

let feToken = '';
if (outputFile) {
  feToken = '/Fe:"' + outputFile + '"';
}

const fullCmd = ['cl.exe', ...otherTokens, feToken].filter(Boolean).join(' ');
try {
  const res = cp.spawnSync(fullCmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
    windowsHide: true
  });
  process.exit(res.status !== null ? res.status : 0);
} catch (err) {
  console.error('Error invoking cl.exe compiler:', err.message);
  process.exit(1);
}
`;
      fs.writeFileSync(shimJsPath, shimJsContent.trim(), 'utf8');

      const nodeBin = this._findNodeBinary();
      const nodeInvocationCmd = nodeBin.includes(' ') ? `"${nodeBin}"` : nodeBin;

      // Write gcc.cmd
      const gccCmdPath = path.join(this.toolchainDir, 'gcc.cmd');
      const gccCmdContent = `@echo off\r\n${nodeInvocationCmd} "%~dp0gcc_shim.js" %*\r\n`;
      fs.writeFileSync(gccCmdPath, gccCmdContent, 'utf8');

      // Write clang.cmd alias
      const clangCmdPath = path.join(this.toolchainDir, 'clang.cmd');
      fs.writeFileSync(clangCmdPath, gccCmdContent, 'utf8');

      // Write gcc.ps1 for PowerShell
      const gccPs1Path = path.join(this.toolchainDir, 'gcc.ps1');
      const gccPs1Content = `& ${nodeInvocationCmd} "$PSScriptRoot\\gcc_shim.js" @args\r\n`;
      fs.writeFileSync(gccPs1Path, gccPs1Content, 'utf8');

      // Write clang.ps1 alias
      const clangPs1Path = path.join(this.toolchainDir, 'clang.ps1');
      fs.writeFileSync(clangPs1Path, gccPs1Content, 'utf8');
    } catch (err) {
      console.warn('[ToolchainManager] Failed to write gcc shim:', err.message);
    }
  }

  _findNodeBinary() {
    if (process.execPath && process.execPath.toLowerCase().endsWith('node.exe')) {
      return process.execPath;
    }
    const standardPaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'nodejs', 'node.exe'),
      path.join(process.env.APPDATA || '', 'npm', 'node.exe')
    ];
    for (const p of standardPaths) {
      if (fs.existsSync(p)) return p;
    }
    return 'node';
  }

  /**
   * Returns merged environment variables for executing commands inside workspace.
   * Consolidates all PATH variations (PATH, Path, path) and guarantees system runtimes are present.
   */
  getExecutionEnvironment() {
    const env = Object.assign({}, process.env);

    if (this.msvcEnv) {
      Object.assign(env, this.msvcEnv);
    }

    // Windows Case-Insensitive PATH Consolidation:
    // Gather all PATH entries regardless of casing (Path, PATH, path)
    const pathSet = new Set();

    // 1. Toolchain dir first so shims have priority
    if (this.toolchainDir) {
      pathSet.add(this.toolchainDir);
    }

    // 2. Existing path directories from process.env and msvcEnv
    const existingRaw = [];
    for (const key of Object.keys(env)) {
      if (key.toLowerCase() === 'path') {
        if (env[key]) existingRaw.push(env[key]);
        delete env[key]; // remove duplicate casing keys
      }
    }
    if (process.env.PATH) existingRaw.push(process.env.PATH);
    if (process.env.Path) existingRaw.push(process.env.Path);

    for (const raw of existingRaw) {
      for (const segment of raw.split(path.delimiter)) {
        const trimmed = segment.trim();
        if (trimmed) pathSet.add(trimmed);
      }
    }

    // 3. Guarantee essential Windows system directories are present
    if (process.platform === 'win32') {
      const sysRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows';
      pathSet.add(path.join(sysRoot, 'System32', 'WindowsPowerShell', 'v1.0'));
      pathSet.add(path.join(sysRoot, 'System32'));
      pathSet.add(sysRoot);
      pathSet.add(path.join(sysRoot, 'System32', 'Wbem'));

      // Guarantee Node.js path is present if available
      try {
        const nodeDir = path.dirname(this._findNodeBinary());
        if (fs.existsSync(nodeDir)) pathSet.add(nodeDir);
      } catch {}
    }

    const unifiedPath = Array.from(pathSet).join(path.delimiter);
    env.PATH = unifiedPath;
    env.Path = unifiedPath;

    return env;
  }

  /**
   * Diagnostic inspector returning toolchain capabilities.
   */
  async checkEnvironment() {
    const env = this.getExecutionEnvironment();
    const result = {
      node: { available: false, version: '' },
      python: { available: false, version: '', path: '' },
      cCompiler: { available: false, name: '', type: 'none', details: '' }
    };

    // 1. Node check
    try {
      result.node = {
        available: true,
        version: process.version
      };
    } catch {}

    // 2. Python check
    try {
      const py = cp.spawnSync('python', ['--version'], { env, encoding: 'utf8', windowsHide: true });
      if (py.status === 0) {
        result.python = {
          available: true,
          version: (py.stdout || py.stderr || '').trim()
        };
      }
    } catch {}

    // 3. C Compiler check (MSVC / GCC)
    try {
      const clCheck = cp.spawnSync('cl.exe', [], { env, encoding: 'utf8', windowsHide: true });
      if (clCheck.status === 0 || (clCheck.stderr && clCheck.stderr.includes('Optimizing Compiler')) || (clCheck.stdout && clCheck.stdout.includes('Optimizing Compiler'))) {
        result.cCompiler = {
          available: true,
          type: 'msvc',
          name: 'MSVC 2022 (cl.exe) + GCC Shim',
          details: 'Visual Studio 2022 C/C++ x64 + Windows SDK'
        };
      } else {
        const gccCheck = cp.spawnSync('gcc', ['--version'], { env, encoding: 'utf8', windowsHide: true });
        if (gccCheck.status === 0) {
          result.cCompiler = {
            available: true,
            type: 'gcc',
            name: 'GCC (GNU Compiler Collection)',
            details: (gccCheck.stdout || '').split('\n')[0]
          };
        }
      }
    } catch {}

    this.cachedDiagnostics = result;
    return result;
  }
}

module.exports = ToolchainManager;
