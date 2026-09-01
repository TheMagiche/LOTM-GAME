import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
    DEMO_OPENROUTER_ENDPOINT,
    DEMO_OPENROUTER_MODEL,
    hasUsableDemoProvider,
    IS_DEMO_MODE,
} from '../../config/demoMode';
import { Backdrop } from '../primitives/Backdrop';

export function DemoOnboardingModal() {
    const settings = useAppStore(s => s.settings);
    const updateProvider = useAppStore(s => s.updateProvider);
    const settingsLoaded = useAppStore(s => s.settingsLoaded);
    const forceOpen = useAppStore(s => s.demoOnboardingOpen);
    const closeDemoOnboarding = useAppStore(s => s.closeDemoOnboarding);

    const provider = settings.providers[0];
    const ready = hasUsableDemoProvider(settings.providers);

    useEffect(() => {
        if (!IS_DEMO_MODE || !provider) return;
        const endpoint = (provider.endpoint ?? '').trim();
        const model = (provider.modelName ?? '').trim();
        if (endpoint === DEMO_OPENROUTER_ENDPOINT && model && model !== 'llama3') return;
        updateProvider(provider.id, {
            label: 'OpenRouter',
            endpoint: DEMO_OPENROUTER_ENDPOINT,
            apiFormat: 'openai',
            modelName: !model || model === 'llama3' ? DEMO_OPENROUTER_MODEL : model,
        });
    }, [provider, updateProvider]);

    if (!IS_DEMO_MODE || !settingsLoaded || !provider) return null;
    if (ready && !forceOpen) return null;

    return (
        <Backdrop onClick={() => undefined}>
            <div
                className="lotm-demo-modal lotm-demo-onboard"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lotm-demo-byok-title"
                onClick={e => e.stopPropagation()}
            >
                <p id="lotm-demo-byok-title" className="lotm-demo-modal-title">OpenRouter API key</p>
                <p className="lotm-demo-modal-body">
                    This demo uses OpenRouter only. Add a key to start a chronicle. Keys stay in this browser; chronicles are deleted when you leave.
                </p>
                <label className="lotm-demo-field">
                    <span>Endpoint</span>
                    <input
                        type="text"
                        value={DEMO_OPENROUTER_ENDPOINT}
                        readOnly
                        aria-readonly="true"
                    />
                </label>
                <label className="lotm-demo-field">
                    <span>Model</span>
                    <input
                        type="text"
                        value={provider.modelName || DEMO_OPENROUTER_MODEL}
                        onChange={e => updateProvider(provider.id, { modelName: e.target.value })}
                        placeholder={DEMO_OPENROUTER_MODEL}
                        autoComplete="off"
                    />
                </label>
                <label className="lotm-demo-field">
                    <span>API key</span>
                    <input
                        type="password"
                        value={provider.apiKey}
                        onChange={e => updateProvider(provider.id, { apiKey: e.target.value })}
                        placeholder="sk-or-v1-..."
                        autoComplete="off"
                    />
                </label>
                <div className="lotm-demo-modal-actions">
                    {ready && (
                        <button
                            type="button"
                            className="lotm-demo-skip"
                            onClick={() => closeDemoOnboarding()}
                        >
                            Close
                        </button>
                    )}
                    <button
                        type="button"
                        className="lotm-title-hub-primary"
                        disabled={!hasUsableDemoProvider(settings.providers)}
                        onClick={() => closeDemoOnboarding()}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </Backdrop>
    );
}
