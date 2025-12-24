import { readdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist');
const assetsPath = join(distPath, 'assets');

if (existsSync(assetsPath)) {
  const files = readdirSync(assetsPath);
  const ssrFile = files.find(f => f.startsWith('server-') && f.endsWith('.js'));
  
  if (ssrFile) {
    copyFileSync(join(assetsPath, ssrFile), join(distPath, 'ssr.js'));
    console.log(`✅ Copied ${ssrFile} to ssr.js`);
  } else {
    console.error('❌ SSR file not found in assets folder');
    process.exit(1);
  }
} else {
  console.error('❌ Assets folder not found');
  process.exit(1);
}

