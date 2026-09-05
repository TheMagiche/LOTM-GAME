import type { AppSettings, LLMProvider } from '../types';

/** True when Vite baked `VITE_DEPLOYMENT_MODE=demo` into this bundle. */
export const IS_DEMO_BUILD = import.meta.env.VITE_DEPLOYMENT_MODE === 'demo';

export function resolveIsDemoMode(
    buildMode = import.meta.env.VITE_DEPLOYMENT_MODE,
    runtimeFlag = typeof window !== 'undefined' ? window.__LOTM_DEMO_MODE__ : undefined,
): boolean {
    return buildMode === 'demo' || runtimeFlag === true;
}

/**
 * Player-only demo. True for a demo Vite build, or when the server injects
 * `window.__LOTM_DEMO_MODE__` because `DEMO_MODE=1` (Coolify / compose).
 */
export const IS_DEMO_MODE = resolveIsDemoMode();

/** Public marketing page stays at `/`. The playable demo boots at this path. */
export const DEMO_PLAY_PATH = '/play';

export function normalizePathname(pathname: string): string {
    const trimmed = pathname.replace(/\/+$/, '');
    return trimmed === '' ? '/' : trimmed;
}

export function isDemoPlayPath(pathname: string): boolean {
    return normalizePathname(pathname) === DEMO_PLAY_PATH;
}

/** Demo visitors see the landing page until they follow the play link. */
export function shouldShowDemoLanding(isDemo: boolean, pathname: string): boolean {
    return isDemo && !isDemoPlayPath(pathname);
}

const FIVE_MIN_MS = 5 * 60 * 1000;

export function resolveDemoSessionMs(
    sessionEnv?: string,
    idleEnv?: string,
    fallback = FIVE_MIN_MS,
): number {
    const session = Number(sessionEnv);
    if (Number.isFinite(session) && session > 0) return session;
    const idle = Number(idleEnv);
    if (Number.isFinite(idle) && idle > 0) return idle;
    return fallback;
}

/** Hard play-session cap. Default 5 minutes. */
export const DEMO_SESSION_MS = resolveDemoSessionMs(
    import.meta.env.VITE_DEMO_SESSION_MS,
    import.meta.env.VITE_DEMO_IDLE_MS,
);

/** @deprecated Use DEMO_SESSION_MS. Kept for older demo env names. */
export const DEMO_IDLE_MS = DEMO_SESSION_MS;

/** Warn this long before session logout. */
export const DEMO_SESSION_WARN_MS = 60 * 1000;

/** @deprecated Use DEMO_SESSION_WARN_MS. */
export const DEMO_IDLE_WARN_MS = DEMO_SESSION_WARN_MS;

export function formatDemoCountdown(remainingMs: number): string {
    const total = Math.max(0, Math.ceil(remainingMs / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const DEMO_SESSION_STORAGE_KEY = 'lotm_demo_session_id';

export const DEMO_OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1';
export const DEMO_OPENROUTER_MODEL = 'openrouter/free';

export function isOpenRouterEndpoint(endpoint: string): boolean {
    const trimmed = endpoint.trim();
    if (!trimmed) return false;
    try {
        const host = new URL(trimmed).hostname;
        return host === 'openrouter.ai' || host.endsWith('.openrouter.ai');
    } catch {
        return /openrouter\.ai/i.test(trimmed);
    }
}

/** Demo uses the full Sequence 9 starter roster (`lotm_pc_*.json`). */
export function isDemoPlayablePcFile(pathOrName: string): boolean {
    const base = pathOrName.split('/').pop() || pathOrName;
    return /^lotm_pc_[a-z0-9_]+\.json$/i.test(base);
}

function lockDemoProvider<T extends Pick<LLMProvider, 'endpoint' | 'apiKey' | 'apiFormat' | 'modelName' | 'label'>>(provider: T): T {
    const model = (provider.modelName ?? '').trim();
    return {
        ...provider,
        label: 'OpenRouter',
        endpoint: DEMO_OPENROUTER_ENDPOINT,
        apiFormat: 'openai',
        modelName: !model || model === 'llama3' ? DEMO_OPENROUTER_MODEL : model,
    };
}

export function applyDemoLocks<T extends Partial<AppSettings>>(settings: T): T {
    if (!IS_DEMO_MODE) return settings;
    const providers = Array.isArray(settings.providers)
        ? settings.providers.map((provider, index) => (index === 0 ? lockDemoProvider(provider) : provider))
        : settings.providers;
    return {
        ...settings,
        providers,
        uiViewMode: 'player',
        aiTier: 'lite',
        ttsEnabled: false,
        indexingSpeed: 'aggressive',
        indexingSpeedPrompted: true,
        debugMode: false,
    };
}

/** Demo play requires an OpenRouter key. Local Ollama / other vendors are not accepted. */
export function hasUsableDemoProvider(providers: Pick<LLMProvider, 'endpoint' | 'apiKey'>[]): boolean {
    return providers.some((provider) => {
        const key = (provider.apiKey ?? '').trim();
        return key.length > 0 && isOpenRouterEndpoint(provider.endpoint ?? '');
    });
}
