import fs from 'fs';
import path from 'path';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_BOOT_SCRIPT = '<script>window.__LOTM_DEMO_MODE__=true;</script>';

export function isDemoMode() {
    const env = String(process.env.DEMO_MODE || '').trim().toLowerCase();
    if (env === '1' || env === 'true' || env === 'yes' || env === 'demo') return true;
    return process.argv.includes('--demo');
}

export function isTtsDisabled() {
    const env = String(process.env.TTS_DISABLED || '').trim().toLowerCase();
    return isDemoMode() || env === '1' || env === 'true';
}

export function demoMaxCampaignAgeMs() {
    const raw = Number(process.env.DEMO_MAX_CAMPAIGN_AGE_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : DAY_MS;
}

export const DEMO_SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,80}$/;

export function readFrontendDeploymentMode(distDir) {
    try {
        const raw = fs.readFileSync(path.join(distDir, 'deployment-mode.txt'), 'utf8').trim();
        return raw || 'unknown';
    } catch {
        return 'unknown';
    }
}

export function injectDemoBootScript(html) {
    if (!isDemoMode()) return html;
    if (html.includes('__LOTM_DEMO_MODE__')) return html;
    if (html.includes('<head>')) return html.replace('<head>', `<head>${DEMO_BOOT_SCRIPT}`);
    return `${DEMO_BOOT_SCRIPT}${html}`;
}
