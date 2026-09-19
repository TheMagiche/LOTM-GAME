#!/usr/bin/env node
/**
 * Upload Electron installers from release/ to TheMagiche/LOTM-SITE GitHub
 * Releases, then delete the local copies that were uploaded or are already
 * published on that tag.
 *
 *   npm run electron:release
 *   npm run electron:release -- --tag v2.0.1
 *
 * Auth: GH_TOKEN / GITHUB_TOKEN, or `git credential fill` for github.com.
 */
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);

function flagValue(name, fallback) {
    const idx = args.indexOf(name);
    if (idx === -1 || !args[idx + 1]) return fallback;
    return args[idx + 1];
}

const repo = flagValue('--repo', process.env.LOTM_SITE_REPO || 'TheMagiche/LOTM-SITE');
const releaseDir = flagValue('--dir', join(root, 'release'));
const createMissing = args.includes('--create');
const pruneUnpacked = !args.includes('--keep-unpacked');

const INSTALLER_EXT = /\.(dmg|exe|appimage|deb)$/i;
const IGNORE_EXT = /\.(blockmap|yml|yaml)$/i;
const UNPACKED_DIRS = new Set([
    'mac',
    'mac-arm64',
    'mac-x64',
    'win-unpacked',
    'linux-unpacked',
    'linux-arm64-unpacked',
]);

function die(message) {
    console.error(message);
    process.exit(1);
}

function tokenFromGitCredential() {
    const result = spawnSync('git', ['credential', 'fill'], {
        input: 'protocol=https\nhost=github.com\n\n',
        encoding: 'utf8',
    });
    if (result.status !== 0) return '';
    return result.stdout.match(/^password=(.*)$/m)?.[1]?.trim() || '';
}

function githubToken() {
    return process.env.GH_TOKEN || process.env.GITHUB_TOKEN || tokenFromGitCredential();
}

async function githubJson(token, path, { method = 'GET', body } = {}) {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
        method,
        headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'lotm-electron-release',
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
        const detail = data?.message || text || res.statusText;
        const error = new Error(`GitHub ${method} ${path} failed: ${res.status} ${detail}`);
        error.status = res.status;
        throw error;
    }
    return data;
}

function listInstallers(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .filter((name) => INSTALLER_EXT.test(name) && !IGNORE_EXT.test(name))
        .map((name) => join(dir, name))
        .filter((path) => statSync(path).isFile());
}

function deleteLocal(path) {
    if (!existsSync(path)) return;
    rmSync(path);
    console.log(`deleted ${basename(path)}`);
    const blockmap = `${path}.blockmap`;
    if (existsSync(blockmap)) {
        rmSync(blockmap);
        console.log(`deleted ${basename(blockmap)}`);
    }
}

function pruneUnpackedDirs(dir) {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
        if (!UNPACKED_DIRS.has(name)) continue;
        rmSync(join(dir, name), { recursive: true, force: true });
        console.log(`deleted unpacked ${name}/`);
    }
}

async function resolveRelease(token, tagInput) {
    if (!tagInput || tagInput === 'latest') {
        return githubJson(token, '/releases/latest');
    }
    try {
        return await githubJson(token, `/releases/tags/${encodeURIComponent(tagInput)}`);
    } catch (error) {
        if (!createMissing || error.status !== 404) {
            die(error.status === 404
                ? `Release ${tagInput} not found. Pass --create to make it.`
                : error.message);
        }
        const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
        const notes = `Desktop installers for Lord of the Mysteries ${tagInput} (app ${pkg.version}).`;
        console.log(`creating release ${tagInput}`);
        return githubJson(token, '/releases', {
            method: 'POST',
            body: {
                tag_name: tagInput,
                name: tagInput,
                body: notes,
                target_commitish: 'main',
            },
        });
    }
}

async function uploadAsset(token, uploadUrlBase, path) {
    const name = basename(path);
    const size = statSync(path).size;
    const url = `${uploadUrlBase}?name=${encodeURIComponent(name)}`;
    console.log(`uploading ${name} (${size} bytes)`);
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(size),
            'User-Agent': 'lotm-electron-release',
        },
        body: createReadStream(path),
        duplex: 'half',
    });
    const text = await res.text();
    if (!res.ok) {
        die(`upload ${name} failed: ${res.status} ${text.slice(0, 500)}`);
    }
    const data = JSON.parse(text);
    console.log(`uploaded ${data.name} → ${data.browser_download_url}`);
}

async function main() {
    const token = githubToken();
    if (!token) die('No GitHub token. Set GH_TOKEN or store github.com credentials in git.');

    const tagInput = flagValue('--tag', 'latest');
    const release = await resolveRelease(token, tagInput);
    const tag = release.tag_name;
    const uploadUrl = String(release.upload_url || '').split('{')[0];
    const remoteNames = new Set((release.assets || []).map((asset) => asset.name));
    console.log(`release ${tag} (${release.html_url})`);

    const local = listInstallers(releaseDir);
    if (local.length === 0) {
        console.log(`no installer files in ${releaseDir}`);
    }

    for (const path of local) {
        const name = basename(path);
        if (remoteNames.has(name)) {
            console.log(`already on ${tag}: ${name}`);
            deleteLocal(path);
            continue;
        }
        await uploadAsset(token, uploadUrl, path);
        remoteNames.add(name);
        deleteLocal(path);
    }

    if (existsSync(releaseDir)) {
        for (const name of readdirSync(releaseDir)) {
            if (remoteNames.has(name)) deleteLocal(join(releaseDir, name));
        }
    }

    if (existsSync(releaseDir)) {
        for (const name of readdirSync(releaseDir)) {
            if (/\.(zip|blockmap|yml|yaml)$/i.test(name)) {
                rmSync(join(releaseDir, name));
                console.log(`deleted leftover ${name}`);
            }
        }
    }
    if (pruneUnpacked) pruneUnpackedDirs(releaseDir);
    console.log(`done. ${tag} now has: ${[...remoteNames].sort().join(', ') || '(no assets)'}`);
}

try {
    await main();
} catch (error) {
    die(error.message || String(error));
}
