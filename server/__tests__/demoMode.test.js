import { describe, expect, it } from 'vitest';
import { isDemoMode, isTtsDisabled, DEMO_SESSION_ID_RE, injectDemoBootScript } from '../lib/demoMode.js';

describe('server demoMode', () => {
    it('is off unless DEMO_MODE or --demo is set', () => {
        const previous = process.env.DEMO_MODE;
        try {
            delete process.env.DEMO_MODE;
            expect(isDemoMode()).toBe(process.argv.includes('--demo'));
            process.env.DEMO_MODE = '1';
            expect(isDemoMode()).toBe(true);
            expect(isTtsDisabled()).toBe(true);
        } finally {
            if (previous === undefined) delete process.env.DEMO_MODE;
            else process.env.DEMO_MODE = previous;
        }
    });

    it('injects the client boot flag into index.html only in demo mode', () => {
        const previous = process.env.DEMO_MODE;
        const html = '<html><head><title>LOTM</title></head></html>';
        try {
            delete process.env.DEMO_MODE;
            expect(injectDemoBootScript(html)).toBe(html);
            process.env.DEMO_MODE = '1';
            const injected = injectDemoBootScript(html);
            expect(injected).toContain('window.__LOTM_DEMO_MODE__=true');
            expect(injected).toContain('<base href="/">');
            expect(injectDemoBootScript(injected)).toBe(injected);
        } finally {
            if (previous === undefined) delete process.env.DEMO_MODE;
            else process.env.DEMO_MODE = previous;
        }
    });

    it('accepts opaque demo session ids', () => {
        expect(DEMO_SESSION_ID_RE.test('demo_abc12345')).toBe(true);
        expect(DEMO_SESSION_ID_RE.test('not')).toBe(false);
    });
});
