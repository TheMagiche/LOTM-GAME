/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_DEPLOYMENT_MODE?: string;
    readonly VITE_DEMO_SESSION_MS?: string;
    readonly VITE_DEMO_IDLE_MS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface Window {
    __LOTM_DEMO_MODE__?: boolean;
}
