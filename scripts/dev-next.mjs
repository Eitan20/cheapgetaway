import { mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const rawArgs = process.argv.slice(2);
const forwardArgs = [];

let clean = false;

for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === '--clean') {
        clean = true;
        continue;
    }

    if ((arg === '--port' || arg === '-p') && rawArgs[index + 1]) {
        forwardArgs.push(arg, rawArgs[index + 1]);
        index += 1;
        continue;
    }

    forwardArgs.push(arg);
}

const distDir = process.env.NEXT_DIST_DIR || '.next-dev';
const lockPath = resolve(process.cwd(), '.next-dev.lock');

if (clean) {
    rmSync(resolve(process.cwd(), distDir), { recursive: true, force: true });
}

mkdirSync(resolve(process.cwd(), distDir), { recursive: true });

try {
    const existingLock = JSON.parse(readFileSync(lockPath, 'utf8'));
    if (existingLock?.pid && existingLock.pid !== process.pid) {
        try {
            process.kill(existingLock.pid, 0);
            console.error(`Another dev server for this repo is already running (PID ${existingLock.pid}). Stop it before starting a new one.`);
            process.exit(1);
        } catch {
            unlinkSync(lockPath);
        }
    }
} catch {
    // No lock file, or it was invalid.
}

writeFileSync(lockPath, JSON.stringify({ pid: process.pid }, null, 2));

function clearLock() {
    try {
        const activeLock = JSON.parse(readFileSync(lockPath, 'utf8'));
        if (activeLock?.pid === process.pid) {
            unlinkSync(lockPath);
        }
    } catch {
        // Ignore missing or invalid lock files.
    }
}

process.on('exit', clearLock);
process.on('SIGINT', () => {
    clearLock();
    process.exit(130);
});
process.on('SIGTERM', () => {
    clearLock();
    process.exit(143);
});

const child = spawn(
    process.execPath,
    [resolve('node_modules', 'next', 'dist', 'bin', 'next'), 'dev', ...forwardArgs],
    {
        stdio: 'inherit',
        env: {
            ...process.env,
            NEXT_DIST_DIR: distDir,
        },
    }
);

child.on('exit', (code, signal) => {
    clearLock();
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
