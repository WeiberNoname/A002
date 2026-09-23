const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class Logger {
  static getAssetsPath() {
    if (app && app.isPackaged) {
      return path.join(path.dirname(process.execPath), 'assets');
    }
    return app ? path.join(app.getAppPath(), 'assets') : path.join(process.cwd(), 'assets');
  }

  static logDiagnostic(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    console.log(`[Diagnostic] ${message}`);
    try {
      const assetsDir = Logger.getAssetsPath();
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }
      const readmePath = path.join(assetsDir, 'README.md');
      if (!fs.existsSync(readmePath)) {
        try {
          const readmeContent = `# 3D Mascot Assets Folder\n\nPlace any custom 3D models (\`.glb\` or \`.gltf\` format) in this directory.\n\n- The application will automatically discover custom models placed here.\n- Thumbnail previews will be generated automatically in \`.previews/\`.\n- If no custom models are present, the application will use the built-in procedural mascot.\n`;
          fs.writeFileSync(readmePath, readmeContent, 'utf8');
        } catch (_) {}
      }
      const diagnosticsLogPath = path.join(assetsDir, 'diagnostics.log');
      
      if (fs.existsSync(diagnosticsLogPath)) {
        const stats = fs.statSync(diagnosticsLogPath);
        if (stats.size > 100 * 1024) {
          const data = fs.readFileSync(diagnosticsLogPath, 'utf8');
          const lines = data.split('\n');
          const truncatedData = lines.slice(-100).join('\n') + '\n';
          fs.writeFileSync(diagnosticsLogPath, truncatedData, 'utf8');
        }
      }
      
      fs.appendFileSync(diagnosticsLogPath, logLine);
    } catch (e) {
      console.error("Failed to write to diagnostics.log:", e);
    }
  }
}

module.exports = Logger;
