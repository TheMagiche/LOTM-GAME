import { useEffect, useRef, useState } from 'react';
import { Dices, MoreHorizontal, Package, Scroll } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { IS_DEMO_MODE } from '../../config/demoMode';
import { useChatPersistence } from '../../hooks/useChatPersistence';
import { toast } from '../Toast';
import { ArcInjectorButton } from '../ArcInjectorButton';
import { OneShotInjectorButton } from '../OneShotInjectorButton';
import { AbsoluteCommandButton } from '../AbsoluteCommandButton';

/**
 * Icon shortcuts beside the player composer: Dice, Loot, Inject Arc,
 * Inject Event, plus a More menu for Absolute Command, Archive, and AI Preset.
 */
export function ChatComposerControls() {
    const settings = useAppStore(s => s.settings);
    const context = useAppStore(s => s.context);
    const activeCampaignId = useAppStore(s => s.activeCampaignId);
    const pipelinePhase = useAppStore(s => s.pipelinePhase);
    const armedRoll = useAppStore(s => s.armedRoll);
    const setArmedRoll = useAppStore(s => s.setArmedRoll);
    const openDiceRollModal = useAppStore(s => s.openDiceRollModal);
    const armedLoot = useAppStore(s => s.armedLoot);
    const openLootRollModal = useAppStore(s => s.openLootRollModal);
    const { handleOpenArchive } = useChatPersistence();
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const isStreaming = pipelinePhase !== 'idle';
    const showInject = !IS_DEMO_MODE && !!activeCampaignId;

    useEffect(() => {
        if (!moreOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMoreOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [moreOpen]);

    return (
        <div className="chat-composer-shortcuts" role="toolbar" aria-label="Player controls">
            <button
                type="button"
                className={`chat-composer-shortcut${armedRoll ? ' is-armed' : ''}`}
                disabled={isStreaming || !activeCampaignId}
                title={armedRoll ? 'Dice armed — click to disarm, or send to roll' : 'Dice'}
                aria-label="Dice"
                onClick={() => {
                    if (armedRoll) setArmedRoll(null);
                    else openDiceRollModal();
                }}
            >
                <Dices size={16} />
            </button>
            <button
                type="button"
                className={`chat-composer-shortcut${armedLoot ? ' is-armed' : ''}`}
                disabled={isStreaming || !activeCampaignId}
                title={armedLoot ? `Loot armed (${armedLoot.rolls}) — send to drop` : 'Loot'}
                aria-label="Loot"
                onClick={() => {
                    if (!context?.lootTree) {
                        toast.warning('No loot table for this world');
                        return;
                    }
                    openLootRollModal();
                }}
            >
                <Package size={16} />
            </button>
            {showInject && <ArcInjectorButton layout="icon" />}
            {showInject && <OneShotInjectorButton layout="icon" />}
            <div className="chat-composer-more" ref={moreRef}>
                <button
                    type="button"
                    className={`chat-composer-shortcut${moreOpen ? ' is-open' : ''}`}
                    title="More"
                    aria-label="More"
                    aria-expanded={moreOpen}
                    aria-haspopup="menu"
                    onClick={() => setMoreOpen(open => !open)}
                >
                    <MoreHorizontal size={16} />
                </button>
                <div
                    role="menu"
                    aria-label="More player controls"
                    className={`chat-composer-more-menu${moreOpen ? ' is-open' : ''}`}
                    aria-hidden={!moreOpen}
                    inert={!moreOpen}
                >
                    {showInject && (
                        <div onClick={() => setMoreOpen(false)}>
                            <AbsoluteCommandButton layout="nav" />
                        </div>
                    )}
                    {moreOpen && (
                        <>
                            <button
                                type="button"
                                role="menuitem"
                                disabled={!activeCampaignId}
                                className="chat-composer-more-item"
                                onClick={() => {
                                    handleOpenArchive();
                                    setMoreOpen(false);
                                }}
                            >
                                <Scroll size={14} className="shrink-0" />
                                <span>Archive</span>
                            </button>
                            <label className="chat-composer-more-preset">
                                <span>AI Preset</span>
                                <select
                                    value={settings.activePresetId}
                                    onChange={e => useAppStore.getState().setActivePreset(e.target.value)}
                                    title="Active AI Preset"
                                >
                                    {settings.presets.map(preset => (
                                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                                    ))}
                                </select>
                            </label>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
