/**
 * Chatterbox-Nano sidecar lifecycle manager.
 *
 * Owns the Python venv under data/.tts_cache/chatterbox-venv/, the pip install,
 * the spawned sidecar process, and its health. The provider (chatterboxNano.js)
 * calls ensureRunning() before every generate; everything else is lazy.
 *
 * Setup stages are reported through onStage so the UI can show real progress
 * ("Creating Python environment", "Installing dependencies", "Loading model")
 * instead of a bare spinner — the first run downloads a few hundred MB.
 *
 * Two things make the install non-trivial:
 *
 *  1. The Nano/Turbo entrypoint (chatterbox.tts_turbo) does not exist in ANY
 *     PyPI release of chatterbox-tts — only on the GitHub repo. So we install
 *     from git, not from PyPI.
 *  2. chatterbox-tts hard-pins torch==2.6.0, which has no macOS x86_64 wheel
 *     (PyTorch stopped building Intel Mac binaries after 2.2.2). On that
 *     platform we install a pinned, wheel-available dependency set and add
 *     chatterbox with --no-deps so its impossible torch pin is bypassed.
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { fileURLToPath } from 'url';
import { CACHE_DIR, ensureCacheDir } from './cache.js';

const __sidecarDir = path.dirname(fileURLToPath(import.meta.url));
const SIDECAR_SCRIPT = path.join(__sidecarDir, '..', '..', 'tts_sidecar', 'chatterbox_server.py');
const VENV_DIR = process.env.CHATTERBOX_VENV_DIR || path.join(CACHE_DIR, 'chatterbox-venv');
const VOICES_DIR = path.join(CACHE_DIR, 'chatterbox', 'voices');
const DEFAULT_PORT = 3117;

/** Written only after a fully successful install, so a half-finished venv is
 *  never mistaken for a usable one. */
const INSTALL_MARKER = path.join(VENV_DIR, '.chatterbox-install.json');

const CHATTERBOX_GIT = process.env.CHATTERBOX_GIT_URL
    || 'git+https://github.com/resemble-ai/chatterbox.git';

/**
 * torch 2.6 (chatterbox's own pin) supports Python 3.10–3.13, and the model
 * code uses `match` statements and modern typing, so 3.9 is not an option.
 */
const MIN_PY = [3, 10];
const MAX_PY = [3, 13];

/**
 * What chatterbox.tts_turbo and its model modules actually import. We install
 * this list explicitly rather than letting pip resolve chatterbox's own
 * dependencies, because those additionally pull gradio (a demo UI we never use)
 * and pin torch to a version that doesn't exist everywhere.
 */
const RUNTIME_DEPS = [
    'numpy<2',
    'librosa==0.11.0',
    'transformers==4.46.3',
    'diffusers==0.29.0',
    'conformer==0.3.2',
    'safetensors',
    'omegaconf',
    'pyloudnorm',
    'resemble-perth==1.0.1',
    's3tokenizer',
];

/**
 * Extra pins for platforms where chatterbox's torch==2.6.0 is unsatisfiable.
 * Each is the newest version still publishing a macOS x86_64 wheel — notably
 * llvmlite (via numba, via librosa), which ships source-only from 0.49 onward
 * and would otherwise try to compile LLVM locally and fail.
 */
const LEGACY_PINS = [
    'torch==2.2.2',
    'torchaudio==2.2.2',
    'numba==0.61.2',
    'llvmlite==0.44.0',
];

let proc = null;
let port = null;
let setupPromise = null;
let lastError = null;
/** Ring buffer of recent sidecar stdout/stderr, for error messages. */
let recentOutput = [];

function noteOutput(line) {
    recentOutput.push(line);
    if (recentOutput.length > 40) recentOutput.shift();
}

function venvPython() {
    // Windows venv layout differs from POSIX.
    return process.platform === 'win32'
        ? path.join(VENV_DIR, 'Scripts', 'python.exe')
        : path.join(VENV_DIR, 'bin', 'python');
}

export function getVoicesDir() {
    return VOICES_DIR;
}

/** List reference-clip WAVs the user has dropped into the voices folder. */
export function listVoiceClips() {
    try {
        if (!fs.existsSync(VOICES_DIR)) return [];
        return fs.readdirSync(VOICES_DIR)
            .filter(f => /\.(wav|mp3|flac)$/i.test(f))
            .sort();
    } catch {
        return [];
    }
}

/**
 * True when a previous install ran to completion. The model weights themselves
 * download lazily inside the sidecar on first load, so "installed" here means
 * "ready to attempt startup".
 */
export function isSidecarInstalled() {
    return fs.existsSync(venvPython()) && fs.existsSync(INSTALL_MARKER);
}

export function getSetupError() {
    return lastError;
}

// ── Python interpreter discovery ────────────────────────────────────────

function pyVersion(exe) {
    try {
        const r = spawnSync(exe, ['-c', 'import sys;print("%d.%d" % sys.version_info[:2])'], {
            encoding: 'utf-8',
            timeout: 10_000,
            env: pythonEnv(),
        });
        if (r.status !== 0) return null;
        const [maj, min] = String(r.stdout).trim().split('.').map(Number);
        return Number.isFinite(maj) && Number.isFinite(min) ? [maj, min] : null;
    } catch {
        return null;
    }
}

/** Homebrew keg-only Pythons (python@3.11) often aren't on PATH. */
function pythonEnv() {
    const extra = ['/usr/local/bin', '/usr/local/opt/python@3.11/bin', '/usr/local/opt/python@3.10/bin',
        '/opt/homebrew/bin', '/opt/homebrew/opt/python@3.11/bin', '/opt/homebrew/opt/python@3.10/bin'];
    return { ...process.env, PATH: `${extra.join(':')}:${process.env.PATH || ''}` };
}

function inRange([maj, min]) {
    if (maj !== MIN_PY[0]) return false;
    return min >= MIN_PY[1] && min <= MAX_PY[1];
}

/**
 * Find a Python the sidecar can actually run under. `python3` is checked last
 * because the system default is frequently too old (macOS ships 3.9).
 */
function findPython() {
    const candidates = [];
    if (process.env.CHATTERBOX_PYTHON) candidates.push(process.env.CHATTERBOX_PYTHON);
    for (let m = MAX_PY[1]; m >= MIN_PY[1]; m--) {
        candidates.push(`python3.${m}`);
        // Homebrew installs are often keg-only / unlinked, so PATH lookup misses them.
        candidates.push(`/usr/local/bin/python3.${m}`);
        candidates.push(`/usr/local/opt/python@3.${m}/bin/python3.${m}`);
        candidates.push(`/opt/homebrew/bin/python3.${m}`);
        candidates.push(`/opt/homebrew/opt/python@3.${m}/bin/python3.${m}`);
        candidates.push(`/Library/Frameworks/Python.framework/Versions/3.${m}/bin/python3.${m}`);
    }
    candidates.push('python3', 'python');

    const seen = [];
    for (const c of candidates) {
        const v = pyVersion(c);
        if (!v) continue;
        if (inRange(v)) return { exe: c, version: v.join('.') };
        seen.push(`${c} (${v.join('.')})`);
    }

    const found = seen.length ? ` Found: ${[...new Set(seen)].join(', ')}.` : '';
    throw setupError(
        `No compatible Python found for Chatterbox-Nano. Need ${MIN_PY.join('.')}–${MAX_PY.join('.')}.${found}`
        + ' Install one (e.g. `brew install python@3.11`) or set CHATTERBOX_PYTHON to its path.',
    );
}

// ── Platform capability ─────────────────────────────────────────────────

/**
 * True on platforms where chatterbox's own torch==2.6.0 pin cannot be
 * satisfied. PyTorch dropped macOS x86_64 (Intel Mac) wheels after 2.2.2, so
 * there we install a pinned legacy set instead of chatterbox's dependencies.
 */
function needsLegacyPins() {
    return process.platform === 'darwin' && process.arch === 'x64';
}

function setupError(message, detail) {
    const err = new Error(detail ? `${message}\n${detail}` : message);
    err.statusCode = 500;
    // Setup diagnostics are the actionable payload here, so let them through
    // the central handler's 5xx masking. Prefer the last diagnostic lines —
    // pip prints pages of "Requirement already satisfied" before the real error.
    err.publicMessage = detail ? `${message} ${lastUsefulLines(detail, 4)}` : message;
    return err;
}

function lastUsefulLines(text, n) {
    const noise = /^(Requirement already satisfied|Collecting |Using cached|Looking in indexes|Downloading |Installing collected)/i;
    const lines = String(text).split('\n').map(l => l.trim()).filter(l => l && !noise.test(l));
    const picked = lines.slice(-n);
    return (picked.length ? picked : String(text).split('\n').filter(Boolean).slice(-n)).join(' ');
}

/**
 * Ensure a failure from pip/venv reaches the user instead of being masked as a
 * generic 500 — these are local toolchain problems only they can fix.
 */
function asSetupError(err) {
    if (err.publicMessage) return err;
    return setupError('Chatterbox-Nano setup failed.', err.message);
}

// ── Process helpers ─────────────────────────────────────────────────────

function pushTail(tail, line, onLine) {
    const t = String(line).trim();
    if (!t) return;
    tail.push(t);
    if (tail.length > 80) tail.shift();
    onLine?.(t);
}

function summarizeFailure(cmd, code, tail) {
    const errPat = /^(ERROR|error:|×|╰─>|note:|ResolutionImpossible|Failed building|Could not find)/i;
    const errLines = tail.filter(l => errPat.test(l));
    const noise = /^(Requirement already satisfied|Collecting |Using cached|Looking in indexes)/i;
    const useful = tail.filter(l => !noise.test(l));
    const detail = (errLines.length ? errLines.slice(-8) : useful.slice(-8)).join('\n');
    return `${path.basename(cmd)} failed (exit ${code})\n${detail}`;
}

/**
 * Run a command to completion, streaming lines to onLine. On failure the
 * rejection carries the tail of the output — pip's actual complaint is the only
 * thing that makes these errors diagnosable.
 */
function run(cmd, args, onLine) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: pythonEnv() });
        const tail = [];
        const streamClosed = [];
        const feed = (stream) => {
            stream.setEncoding('utf-8');
            let buf = '';
            const flush = () => {
                if (buf) { pushTail(tail, buf, onLine); buf = ''; }
            };
            stream.on('data', (d) => {
                buf += d;
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) pushTail(tail, line, onLine);
            });
            streamClosed.push(new Promise((done) => {
                stream.on('end', flush);
                stream.on('close', done);
            }));
        };
        feed(child.stdout);
        feed(child.stderr);
        child.on('error', (err) => {
            reject(err.code === 'ENOENT'
                ? new Error(`${cmd} not found on PATH`)
                : err);
        });
        // 'close' fires after stdio has drained; 'exit' can race the last line.
        child.on('close', (code) => {
            Promise.all(streamClosed).then(() => {
                if (code === 0) resolve();
                else reject(new Error(summarizeFailure(cmd, code, tail)));
            });
        });
    });
}

// ── Install ─────────────────────────────────────────────────────────────

async function createVenv(python, onStage) {
    // Always rebuild when the install marker is missing. A leftover 3.9 venv
    // from a failed first attempt would otherwise be reused (venv/bin/python
    // exists, so the old "if exists, skip" path kept pip-installing into it).
    if (fs.existsSync(VENV_DIR)) {
        const existing = pyVersion(venvPython());
        onStage?.(`Replacing Python ${existing ? existing.join('.') : 'incomplete'} environment...`);
        fs.rmSync(VENV_DIR, { recursive: true, force: true });
    }
    onStage?.('Creating Python environment...');
    ensureCacheDir();
    await run(python, ['-m', 'venv', '--clear', VENV_DIR], l => onStage?.(l));
    const created = pyVersion(venvPython());
    if (!created || !inRange(created)) {
        throw setupError(
            `Venv Python is ${created ? created.join('.') : 'unreadable'}; need ${MIN_PY.join('.')}–${MAX_PY.join('.')}.`,
        );
    }
}

const PIP_FLAGS = ['--disable-pip-version-check', '--no-input'];

async function pipInstall(onStage) {
    const py = venvPython();
    const v = pyVersion(py);
    if (!v || !inRange(v)) {
        throw setupError(
            `Refusing to install Chatterbox into Python ${v ? v.join('.') : 'unknown'}. Need ${MIN_PY.join('.')}–${MAX_PY.join('.')}.`,
        );
    }
    const legacy = needsLegacyPins();

    await run(py, ['-m', 'pip', 'install', '--upgrade', 'pip', '--quiet', ...PIP_FLAGS],
        l => onStage?.(l));

    if (legacy) {
        onStage?.('Installing Chatterbox dependencies (CPU torch, pinned for this platform)...');
        // One resolve pass for everything: split invocations let pip upgrade a
        // package an earlier step installed and silently break the pin set.
        await run(py, ['-m', 'pip', 'install', ...LEGACY_PINS, ...RUNTIME_DEPS, ...PIP_FLAGS],
            l => onStage?.(l));
    } else {
        onStage?.('Installing CPU torch...');
        // CPU-only wheels so torch doesn't drag in the full CUDA build.
        await run(py, [
            '-m', 'pip', 'install', 'torch==2.6.0', 'torchaudio==2.6.0',
            '--index-url', 'https://download.pytorch.org/whl/cpu',
            ...PIP_FLAGS,
        ], l => onStage?.(l));

        onStage?.('Installing Chatterbox dependencies...');
        await run(py, ['-m', 'pip', 'install', ...RUNTIME_DEPS, ...PIP_FLAGS], l => onStage?.(l));
    }

    onStage?.('Installing Chatterbox-Nano...');
    // --no-deps: chatterbox pins torch==2.6.0 (unavailable on some platforms)
    // and pulls gradio. Its real imports are covered by RUNTIME_DEPS above.
    await run(py, ['-m', 'pip', 'install', '--no-deps', CHATTERBOX_GIT, ...PIP_FLAGS],
        l => onStage?.(l));

    return legacy ? 'legacy' : 'standard';
}

/** Confirm the Nano entrypoint actually imports before we call the install good. */
async function verifyImport(onStage) {
    onStage?.('Verifying Chatterbox-Nano install...');
    await run(venvPython(), ['-c', 'import chatterbox.tts_turbo'], l => onStage?.(l));
}

// ── Sidecar process ─────────────────────────────────────────────────────

function findFreePort(start) {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.listen(start, '127.0.0.1', () => {
            const addr = srv.address();
            srv.close(() => resolve(addr.port));
        });
        srv.on('error', () => resolve(findFreePort(start + 1)));
    });
}

function spawnSidecar(onLine) {
    return new Promise((resolve, reject) => {
        findFreePort(DEFAULT_PORT).then((p) => {
            recentOutput = [];
            proc = spawn(venvPython(), [
                SIDECAR_SCRIPT,
                '--port', String(p),
                '--voices-dir', VOICES_DIR,
            ], {
                stdio: ['ignore', 'pipe', 'pipe'],
                // Keep model weights beside the rest of the TTS cache so they
                // live in the user data dir, not a read-only packaged path.
                env: { ...pythonEnv(), HF_HOME: CACHE_DIR },
            });

            const feed = (stream) => {
                stream.setEncoding('utf-8');
                let buf = '';
                stream.on('data', (d) => {
                    buf += d;
                    const lines = buf.split('\n');
                    buf = lines.pop() ?? '';
                    for (const line of lines) {
                        const t = line.trim();
                        if (!t) continue;
                        noteOutput(t);
                        onLine?.(t);
                    }
                });
            };
            feed(proc.stdout);
            feed(proc.stderr);

            proc.on('error', (err) => {
                proc = null;
                reject(err);
            });
            proc.on('exit', () => { proc = null; });

            port = p;
            resolve(p);
        });
    });
}

/**
 * Poll /health until the model reports ready. The sidecar answers 503 with
 * {ok:false,error} when the model fails to load, so the body is inspected
 * regardless of HTTP status — otherwise a load failure would silently burn the
 * whole timeout before reporting something useless.
 */
async function waitForHealth(timeoutMs = 15 * 60 * 1000) {
    // Long timeout: first boot downloads model weights inside the sidecar.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (!proc) {
            throw setupError(
                'Chatterbox-Nano sidecar exited during startup.',
                recentOutput.slice(-12).join('\n'),
            );
        }
        try {
            const res = await fetch(`http://127.0.0.1:${port}/health`);
            const body = await res.json().catch(() => ({}));
            if (body.ok) return true;
            if (body.error) throw setupError(`Chatterbox-Nano failed to load: ${body.error}`);
        } catch (e) {
            // Connection refused simply means it hasn't bound the port yet.
            if (!isConnectionError(e)) throw e;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    throw setupError('Chatterbox-Nano startup timed out.', recentOutput.slice(-12).join('\n'));
}

function isConnectionError(e) {
    const msg = String(e?.message || e);
    return /fetch failed|ECONNREFUSED|socket hang up|Failed to fetch/i.test(msg);
}

/**
 * Ensure the sidecar is installed and healthy. Safe to call concurrently —
 * concurrent callers share one setup promise. onStage receives progress lines.
 */
export async function ensureRunning(onStage) {
    if (proc && port) {
        // Already up — but re-verify cheaply.
        try {
            const res = await fetch(`http://127.0.0.1:${port}/health`);
            const body = await res.json().catch(() => ({}));
            if (body.ok) return;
            if (body.error) throw setupError(`Chatterbox-Nano failed to load: ${body.error}`);
        } catch (e) {
            if (!isConnectionError(e)) throw e;
            // Health endpoint unreachable — fall through to restart below.
        }
    }

    if (setupPromise) return setupPromise;
    setupPromise = (async () => {
        try {
            if (!isSidecarInstalled()) {
                const { exe, version } = findPython();
                onStage?.(`Using Python ${version}`);
                console.log(`[TTS] Chatterbox-Nano using Python ${version} (${exe})`);
                await createVenv(exe, onStage);
                const profile = await pipInstall(onStage);
                await verifyImport(onStage);
                fs.writeFileSync(INSTALL_MARKER, JSON.stringify({
                    profile,
                    python: version,
                    platform: `${process.platform}-${process.arch}`,
                    completedAt: new Date().toISOString(),
                }, null, 2));
            }
            onStage?.('Starting sidecar...');
            await spawnSidecar(l => onStage?.(l));
            onStage?.('Loading Chatterbox-Nano model (first run downloads weights)...');
            await waitForHealth();
            lastError = null;
            console.log('[TTS] Chatterbox-Nano sidecar ready');
        } catch (err) {
            killSidecar();
            const wrapped = asSetupError(err);
            lastError = wrapped.publicMessage;
            console.error(`[TTS] Chatterbox-Nano setup failed: ${wrapped.message}`);
            throw wrapped;
        } finally {
            setupPromise = null;
        }
    })();
    return setupPromise;
}

export function killSidecar() {
    if (proc) {
        try { proc.kill(); } catch { /* already dead */ }
        proc = null;
    }
    port = null;
}

export function getSidecarPort() {
    return port;
}
