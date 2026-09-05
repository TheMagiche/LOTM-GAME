import { describe, expect, it } from 'vitest';
import {
    applyDemoLocks,
    formatDemoCountdown,
    hasUsableDemoProvider,
    isDemoPlayablePcFile,
    isDemoPlayPath,
    resolveDemoSessionMs,
    resolveIsDemoMode,
    shouldShowDemoLanding,
} from '../demoMode';

describe('demoMode helpers', () => {
    it('treats every bundled lotm_pc_*.json file as a demo starter', () => {
        expect(isDemoPlayablePcFile('lotm_pc_clara_whitlock.json')).toBe(true);
        expect(isDemoPlayablePcFile('../../people/lotm_pc_benedict_faulkner.json')).toBe(true);
        expect(isDemoPlayablePcFile('lotm_pc_arthur_pendel.json')).toBe(true);
        expect(isDemoPlayablePcFile('lotm_pc_cassian_dray.json')).toBe(true);
        expect(isDemoPlayablePcFile('lotm_pc_jacob_thorne.json')).toBe(true);
        expect(isDemoPlayablePcFile('lotm_pc_silas_croft.json')).toBe(true);
        expect(isDemoPlayablePcFile('lotm_pc_isadora_quill.json')).toBe(true);
        expect(isDemoPlayablePcFile('lotm_pc_margaret_odell.json')).toBe(true);
        expect(isDemoPlayablePcFile('npc_dunn_smith.json')).toBe(false);
        expect(isDemoPlayablePcFile('clara_whitlock.json')).toBe(false);
    });

    it('requires an OpenRouter endpoint and API key', () => {
        expect(hasUsableDemoProvider([{ endpoint: '', apiKey: '' }])).toBe(false);
        expect(hasUsableDemoProvider([{
            endpoint: 'https://openrouter.ai/api/v1',
            apiKey: 'sk-or-v1-x',
        }])).toBe(true);
        expect(hasUsableDemoProvider([{
            endpoint: 'http://localhost:11434',
            apiKey: '',
        }])).toBe(false);
        expect(hasUsableDemoProvider([{
            endpoint: 'http://localhost:11434',
            apiKey: 'ignored',
        }])).toBe(false);
    });

    it('treats a server-injected runtime flag as demo even when the Vite build is full', () => {
        expect(resolveIsDemoMode(undefined, true)).toBe(true);
        expect(resolveIsDemoMode('demo', false)).toBe(true);
        expect(resolveIsDemoMode(undefined, false)).toBe(false);
    });

    it('treats /play as the demo game route and everything else as the landing page', () => {
        expect(isDemoPlayPath('/play')).toBe(true);
        expect(isDemoPlayPath('/play/')).toBe(true);
        expect(isDemoPlayPath('/')).toBe(false);
        expect(shouldShowDemoLanding(true, '/')).toBe(true);
        expect(shouldShowDemoLanding(true, '/play')).toBe(false);
        expect(shouldShowDemoLanding(false, '/')).toBe(false);
    });

    it('does not rewrite settings when the demo build flag is off', () => {
        const out = applyDemoLocks({ uiViewMode: 'gm', aiTier: 'max', ttsEnabled: true });
        expect(out.uiViewMode).toBe('gm');
        expect(out.aiTier).toBe('max');
        expect(out.ttsEnabled).toBe(true);
    });

    it('defaults the hard session cap to 5 minutes and prefers VITE_DEMO_SESSION_MS', () => {
        expect(resolveDemoSessionMs(undefined, undefined)).toBe(5 * 60 * 1000);
        expect(resolveDemoSessionMs('300000', '2700000')).toBe(300000);
        expect(resolveDemoSessionMs(undefined, '2700000')).toBe(2700000);
        expect(resolveDemoSessionMs('nope', 'nope')).toBe(5 * 60 * 1000);
    });

    it('formats remaining session time as m:ss', () => {
        expect(formatDemoCountdown(0)).toBe('0:00');
        expect(formatDemoCountdown(1000)).toBe('0:01');
        expect(formatDemoCountdown(4 * 60 * 1000 + 32 * 1000)).toBe('4:32');
        expect(formatDemoCountdown(5 * 60 * 1000)).toBe('5:00');
    });
});
