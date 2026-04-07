const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'project_docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'logic_bridges.md');

// Helper to find files recursively
function findFiles(dir, matchRegex, skipRegex = /node_modules|\.git|\.expo/) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (skipRegex.test(fullPath)) continue;
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, matchRegex, skipRegex));
    } else if (matchRegex.test(file)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Extract routes from app/
function extractRoutes() {
  const routes = [];
  const appDir = path.join(ROOT_DIR, 'app');
  const files = findFiles(appDir, /\.tsx?$/);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(appDir, file).replace(/\\/g, '/');
    let routePath = relativePath.replace(/\/index\.tsx$/, '').replace(/\.tsx$/, '') || '/';
    routePath = routePath.replace(/\/\([^)]+\)/g, ''); // Remove (tabs), (auth) etc for clean URL
    if (routePath === '') routePath = '/';
    
    // Find exported default function
    const match = content.match(/export\s+default\s+function\s+(\w+)/);
    const componentName = match ? match[1] : 'Unknown';
    
    routes.push({ file: relativePath, routePath, componentName });
  }
  return routes;
}

// Extract API calls
function extractApis() {
  const apis = [];
  const apiDir = path.join(ROOT_DIR, 'src', 'modules');
  const files = findFiles(apiDir, /Api\.ts$/);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const moduleMatch = file.match(/modules[\\/](.*?)[\\/]api/);
    const mod = moduleMatch ? moduleMatch[1] : 'Unknown';
    
    // Find all blocks like `methodName(args) { ... request(url, { method: "X" }) ... }`
    // Alternatively, just grab all request(...) calls and try to find the nearest function backwards.
    const requestRegex = /request(?:<[^>]+>)?\(\s*([`"'][^`"']+[`"'])(?:.*?method:\s*["']([A-Z]+)["'])?/gs;
    let match;
    while ((match = requestRegex.exec(content)) !== null) {
      let endpoint = match[1].replace(/[`"']/g, '');
      let method = match[2] || 'GET'; // GET is default usually
      
      // Look behind to find function name
      const prefix = content.substring(0, match.index);
      const funcMatch = prefix.match(/(?:async\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?::\s*Promise<[^>]+>\s*)?{/g);
      let functionName = 'Unknown';
      if (funcMatch && funcMatch.length > 0) {
        // Go backwards to find a valid function name
        for (let i = funcMatch.length - 1; i >= 0; i--) {
            const nameExtracted = funcMatch[i].match(/(?:async\s+)?([a-zA-Z0-9_]+)/);
            if (nameExtracted && !['if', 'catch', 'while', 'for', 'switch'].includes(nameExtracted[1])) {
                functionName = nameExtracted[1];
                break;
            }
        }
      }
      
      apis.push({
        module: mod,
        functionName,
        endpoint,
        method,
        file: path.relative(ROOT_DIR, file).replace(/\\/g, '/')
      });
    }
  }
  return apis;
}

// Extract Zustand Actions
function extractZustandStores() {
  const stores = [];
  const storeDir = path.join(ROOT_DIR, 'src', 'modules');
  const files = findFiles(storeDir, /Store\.ts$/);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const moduleMatch = file.match(/modules[\\/](.*?)[\\/]store/);
    const mod = moduleMatch ? moduleMatch[1] : 'Unknown';
    
    // Match common Zustand action names
    const regex = /([a-zA-Z0-9_]+):\s*(?:async\s+)?\([^)]*\)\s*=>/g;
    let match;
    const actions = [];
    while ((match = regex.exec(content)) !== null) {
      actions.push(match[1]);
    }
    stores.push({
      module: mod,
      actions: [...new Set(actions)],
      file: path.relative(ROOT_DIR, file).replace(/\\/g, '/')
    });
  }
  return stores;
}

// Extract Lambda Handlers
function extractLambdaHandlers() {
  const handlers = [];
  const backendDir = path.join(ROOT_DIR, 'backend');
  const files = findFiles(backendDir, /handler\.js$/);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const mod = path.basename(path.dirname(path.dirname(file)));
    
    // Try to find exact matches: if (method === "POST" && path === "/api...")
    const regexExact = /method\s*===\s*["']([A-Z]+)["']\s*&&\s*path\s*===\s*["']([^"']+)["']/g;
    let match;
    while ((match = regexExact.exec(content)) !== null) {
      handlers.push({
        module: mod,
        method: match[1],
        route: match[2],
        type: 'exact',
        file: path.relative(ROOT_DIR, file).replace(/\\/g, '/')
      });
    }
    
    // Try to find regex matches: path.match(postHypesPattern)
    const regexPattern = /const\s+(\w+)Pattern\s*=\s*\/(.+?)\//g;
    const patterns = {};
    while ((match = regexPattern.exec(content)) !== null) {
      patterns[match[1] + 'Pattern'] = '/' + match[2] + '/';
    }
    
    const regexUsage = /method\s*===\s*["']([A-Z]+)["']\s*&&\s*\w+\.match\(([^)]+)\)/g;
    while ((match = regexUsage.exec(content)) !== null) {
      handlers.push({
        module: mod,
        method: match[1],
        route: patterns[match[2]] || match[2],
        type: 'regex',
        file: path.relative(ROOT_DIR, file).replace(/\\/g, '/')
      });
    }
  }
  return handlers;
}

// Extract Repositories & SQL
function extractRepositories() {
  const repos = [];
  const backendDir = path.join(ROOT_DIR, 'backend');
  const files = findFiles(backendDir, /Repository\.js$/);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const mod = path.basename(path.dirname(path.dirname(path.dirname(file))));
    
    const funcRegex = /export\s+const\s+(\w+)\s*=/g;
    let match;
    const functions = [];
    
    // Quick heuristic: find function name, then look forward for client.query or SQL keywords
    const parts = content.split(/export\s+const\s+/);
    for (const part of parts) {
      if (!part.trim()) continue;
      const nameMatch = part.match(/^(\w+)/);
      if (!nameMatch) continue;
      const funcName = nameMatch[1];
      
      const tables = new Set();
      const sqlMatch = part.match(/(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z0-9_\.]+)/ig);
      if (sqlMatch) {
         sqlMatch.forEach(m => {
           const tbl = m.replace(/(FROM|JOIN|INTO|UPDATE)\s+/i, '').trim();
           if (tbl && !['$1','ANY','SELECT'].includes(tbl.toUpperCase())) {
             tables.add(tbl);
           }
         });
      }
      functions.push({
        name: funcName,
        tables: [...tables]
      });
    }
    
    repos.push({
      module: mod,
      file: path.relative(ROOT_DIR, file).replace(/\\/g, '/'),
      functions
    });
  }
  return repos;
}

function generateMarkdown() {
  const routes = extractRoutes();
  const apis = extractApis();
  const stores = extractZustandStores();
  const handlers = extractLambdaHandlers();
  const repos = extractRepositories();

  let md = `# Deep Logic Bridges Map\n\n`;
  md += `> **Auto-generated file** - Do not edit manually. Generated on: ${new Date().toISOString()}\n\n`;

  md += `## 📱 Frontend Routes (Expo Router)\n`;
  md += `| Route Path | Component Name | File |\n`;
  md += `|---|---|---|\n`;
  routes.forEach(r => {
    md += `| \`${r.routePath}\` | ${r.componentName} | \`${r.file}\` |\n`;
  });

  md += `\n## 🔄 State Management (Zustand)\n`;
  stores.forEach(s => {
    md += `### Module: ${s.module}\n`;
    md += `- **File**: \`${s.file}\`\n`;
    md += `- **Actions**: ${s.actions.map(a => `\`${a}\``).join(', ')}\n\n`;
  });

  md += `## 🌐 API Integrations\n`;
  md += `| Module | Function | HTTP Method | Endpoint | File |\n`;
  md += `|---|---|---|---|---|\n`;
  apis.forEach(api => {
    md += `| ${api.module} | \`${api.functionName}\` | \`${api.method}\` | \`${api.endpoint}\` | \`${api.file}\` |\n`;
  });

  md += `\n## ⚡ Backend Lambda Routes\n`;
  md += `| Backend Module | HTTP Method | Route Match | Type | File |\n`;
  md += `|---|---|---|---|---|\n`;
  handlers.forEach(h => {
    md += `| ${h.module} | \`${h.method}\` | \`${h.route}\` | ${h.type} | \`${h.file}\` |\n`;
  });

  md += `\n## 🗄️ Database Repositories\n`;
  repos.forEach(repo => {
    md += `### ${repo.module} - \`${repo.file}\`\n`;
    repo.functions.forEach(f => {
      md += `- **\`${f.name}\`** -> Tables Accessed: ${f.tables.length > 0 ? f.tables.map(t => `\`${t}\``).join(', ') : '_None or dynamic_'}\n`;
    });
    md += `\n`;
  });

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, md, 'utf8');
  console.log(`✅ Successfully generated logic bridges map at ${OUTPUT_FILE}`);
}

generateMarkdown();
