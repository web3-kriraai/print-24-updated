import { readdirSync, copyFileSync, existsSync, renameSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist');
const assetsPath = join(distPath, 'assets');

console.log('🔄 Checking for SSR bundle...');

// Method 1: Check for server.js directly in dist (default vite SSR output)
if (existsSync(join(distPath, 'server.js'))) {
  console.log('✅ Found dist/server.js');
  renameSync(join(distPath, 'server.js'), join(distPath, 'ssr.js'));
  console.log('✅ Renamed dist/server.js to dist/ssr.js');
  process.exit(0);
}

// Method 2: Check for hashed server file in assets
if (existsSync(assetsPath)) {
  const files = readdirSync(assetsPath);
  const ssrFile = files.find(f => f.startsWith('server-') && f.endsWith('.js'));

  if (ssrFile) {
    copyFileSync(join(assetsPath, ssrFile), join(distPath, 'ssr.js'));
    console.log(`✅ Copied assets/${ssrFile} to dist/ssr.js`);
    process.exit(0);
  }
}

// Method 3: Check if ssr.js already exists (maybe from previous run or weird config)
if (existsSync(join(distPath, 'ssr.js'))) {
  console.log('✅ dist/ssr.js already exists');
  process.exit(0);
}

console.error('❌ SSR bundle not found in dist or dist/assets');
process.error('Expected dist/server.js or dist/assets/server-*.js');
process.exit(1);
