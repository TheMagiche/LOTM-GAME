import { describe, expect, it } from 'vitest';
import { applyDemoLocks, hasUsableDemoProvider, isDemoPlayablePcFile } from '../demoMode';

describe('demoMode helpers', () => {
    it('recognizes the four demo starter PC files', () => {
        expect(isDemoPlayablePcFile('lotm_pc_clara_whitlock.json')).toBe(true);
        expect(isDemoPlayablePcFile('../../people/lotm_pc_jacob_thorne.json')).toBe(true);
        expect(isDemoPlayablePcFile('lotm_pc_silas_croft.json')).toBe(false);
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

    it('does not rewrite settings when the demo build flag is off', () => {
        const out = applyDemoLocks({ uiViewMode: 'gm', aiTier: 'max', ttsEnabled: true });
        expect(out.uiViewMode).toBe('gm');
        expect(out.aiTier).toBe('max');
        expect(out.ttsEnabled).toBe(true);
    });
});
