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

/** Idle logout. Default 45 minutes. */
export const DEMO_IDLE_MS = Number(import.meta.env.VITE_DEMO_IDLE_MS) || 45 * 60 * 1000;

/** Warn this long before idle logout. */
export const DEMO_IDLE_WARN_MS = 5 * 60 * 1000;

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

/**
 * Starter roster for the public demo: Fool (Clara), combat (Jacob / Red Priest),
 * divination-adjacent (Edmund / Door), Tingen Nighthawk flavour (Arthur / Darkness).
 */
export const DEMO_PLAYABLE_PC_FILES = [
    'lotm_pc_clara_whitlock.json',
    'lotm_pc_jacob_thorne.json',
    'lotm_pc_edmund_vale.json',
    'lotm_pc_arthur_pendel.json',
] as const;

export function isDemoPlayablePcFile(pathOrName: string): boolean {
    const base = pathOrName.split('/').pop() || pathOrName;
    return (DEMO_PLAYABLE_PC_FILES as readonly string[]).includes(base);
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
