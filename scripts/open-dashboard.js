import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPath } from '../reporters/open.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'dashboard-report', 'index.html');

if (!fs.existsSync(target)) {
  console.error(`No dashboard found at ${target}\nRun "npm test" first to generate it.`);
  process.exit(1);
}

openPath(target);
