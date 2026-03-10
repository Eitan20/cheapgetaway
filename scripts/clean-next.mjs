import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const nextDirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\.next($|[-_].+)/.test(entry.name))
    .map((entry) => entry.name);

for (const dir of nextDirs) {
    rmSync(join(root, dir), { recursive: true, force: true });
    console.log(`Removed ${dir}`);
}

if (!nextDirs.length) {
    console.log('No Next.js build directories found.');
}
