import fs from 'node:fs';
import path from 'node:path';

// warmup.mjs — Pre-compiles all Next.js pages by hitting them after dev server starts
// Run: node scripts/warmup.mjs

const BASE_URL = 'http://localhost:8000';
const MAX_WAIT_MS = 60_000;   // wait up to 60s for server to start
const POLL_INTERVAL_MS = 500;

function getAutoRoutes() {
  const appDir = path.join(process.cwd(), 'apps', 'web', 'app');
  if (!fs.existsSync(appDir)) return ['/'];

  const routes = new Set();
  const files = fs.readdirSync(appDir, { recursive: true });

  for (const file of files) {
    if (typeof file !== 'string') continue;
    
    if (file.endsWith('page.tsx') || file.endsWith('page.jsx')) {
      // Convert Windows paths to POSIX
      let routePath = file.split(path.sep).join('/');
      
      // Remove the page filename at the end
      routePath = routePath.replace(/\/page\.[tj]sx$/, '').replace(/^page\.[tj]sx$/, '');
      
      // Remove Next.js route groups (e.g., "(auth)")
      routePath = routePath
        .split('/')
        .filter(segment => !(segment.startsWith('(') && segment.endsWith(')')))
        .join('/');
      
      // Skip dynamic routes (e.g., "[id]") as we don't know the parameters
      if (routePath.includes('[')) continue;

      // Ensure leading slash
      routePath = routePath ? '/' + routePath : '/';
      routes.add(routePath);
    }
  }

  return Array.from(routes);
}

const ROUTES = getAutoRoutes();

async function waitForServer() {
  const start = Date.now();
  process.stdout.write('⏳ Waiting for Next.js server');
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      await fetch(`${BASE_URL}/`);
      console.log(' ✓');
      return true;
    } catch {
      process.stdout.write('.');
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
  console.log('\n❌ Server did not start in time.');
  return false;
}

async function warmup() {
  const ready = await waitForServer();
  if (!ready) process.exit(1);

  console.log(`🔥 Pre-compiling ${ROUTES.length} auto-detected pages...`);
  for (const route of ROUTES) {
    try {
      process.stdout.write(`   ${route} ...`);
      const start = Date.now();
      await fetch(`${BASE_URL}${route}`);
      console.log(` ✓ ${Date.now() - start}ms`);
    } catch (e) {
      console.log(` ✗ failed`);
    }
  }
  console.log('\n✅ All auto-detected pages compiled! Ready to use.\n');
}

warmup();
