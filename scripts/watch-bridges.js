const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const WATCH_DIRS = [
  path.join(ROOT_DIR, 'app'),
  path.join(ROOT_DIR, 'src'),
  path.join(ROOT_DIR, 'backend')
];

let debounceTimer = null;

function runGenerator() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    console.log(`[Watcher] Change detected. Regenerating Logic Bridges...`);
    const generatorPath = path.join(__dirname, 'generate-bridges.js');
    const child = spawn('node', [generatorPath], { stdio: 'inherit' });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Watcher] Generator exited with code ${code}`);
      }
    });
  }, 300); // 300ms debounce
}

// Ensure the generator runs once at startup
runGenerator();

// Run fs.watch recursively
WATCH_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`[Watcher] Listening for changes in: ${path.relative(ROOT_DIR, dir)}/`);
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      // Ignore output docs or typical ignore paths
      if (filename && (filename.includes('node_modules') || filename.includes('.git'))) {
        return;
      }
      runGenerator();
    });
  } else {
    console.warn(`[Watcher] Warning: Directory not found: ${dir}`);
  }
});
