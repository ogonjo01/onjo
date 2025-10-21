// scripts/copy-redirects.js
import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// __dirname shim in ES modules:
const __dirname = dirname(fileURLToPath(import.meta.url));

const source = join(__dirname, '..', 'public', '_redirects');
const dest   = join(__dirname, '..', 'dist', '_redirects');

if (existsSync(source)) {
  copyFileSync(source, dest);
  console.log('✅  Copied _redirects to dist/');
} else {
  console.log('⚠️  No _redirects file found at', source);
}
