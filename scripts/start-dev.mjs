#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import concurrently from 'concurrently';

const args = process.argv.slice(2);
const demo = args.includes('--demo');
const lan = args.includes('--lan');

const env = { ...process.env };
if (demo) {
    env.DEMO_MODE = '1';
    env.TTS_DISABLED = '1';
    env.VITE_DEPLOYMENT_MODE = 'demo';
}

const serverArgs = ['server.js'];
if (demo) serverArgs.push('--demo');

const viteArgs = [];
if (lan) viteArgs.push('--host', '0.0.0.0');
if (demo) viteArgs.push('--mode', 'demo');

const quote = (value) => JSON.stringify(value);
const nodeCmd = [quote(process.execPath), ...serverArgs.map(quote)].join(' ');
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const viteCmd = [quote(process.execPath), quote(viteBin), ...viteArgs.map(quote)].join(' ');

const { result } = concurrently(
    [
        { command: nodeCmd, name: 'api', env, prefixColor: 'cyan' },
        { command: viteCmd, name: 'web', env, prefixColor: 'magenta' },
    ],
    { killOthersOn: ['failure', 'success'] },
);

try {
    await result;
} catch {
    process.exitCode = 1;
}
