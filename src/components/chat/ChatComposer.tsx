import type { RefObject } from 'react';
import { Send, Square } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LOTM_EXCLUSIVE_UI } from '../../services/lotm/lotmFlags';
import { ChatComposerControls } from './ChatComposerControls';
import { cuePrimary } from '../../services/uiSounds';

/**
 * Bottom composer row: auto-growing input on the left, player-control
 * icon shortcuts on the right, and the send/stop toggle inside the well.
 */
export function ChatComposer({
    input,
    inputRef,
    isStreaming,
    oocBusy,
    onInputChange,
    onKeyDown,
    onSend,
    onStop,
    compact = false,
}: {
    input: string;
    inputRef: RefObject<HTMLTextAreaElement | null>;
    isStreaming: boolean;
    oocBusy: boolean;
    onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onSend: () => void;
    onStop: () => void;
    compact?: boolean;
}) {
    const deepArmed = useAppStore(s => s.deepArmed);
    const armedRoll = useAppStore(s => s.armedRoll);
    const armedLoot = useAppStore(s => s.armedLoot);
    const armedOneShot = useAppStore(s => s.armedOneShot);
    const armedAbsoluteCommand = useAppStore(s => s.armedAbsoluteCommand);

    return (
        <div className={`chat-composer-pad${compact ? ' is-compact' : ''}`}>
            <div className="chat-composer-well flex gap-1 items-end">
                {deepArmed && (
                    <div className="shrink-0 mb-[4px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/40 rounded animate-pulse">
                        Deep
                    </div>
                )}
                {armedRoll && (
                    <div className="shrink-0 mb-[4px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/40 rounded animate-pulse">
                        Dice
                    </div>
                )}
                {armedLoot && (
                    <div className="shrink-0 mb-[4px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/40 rounded animate-pulse">
                        Loot
                    </div>
                )}
                {armedOneShot && (
                    <div className="shrink-0 mb-[4px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-violet-500/15 text-violet-400 border border-violet-500/40 rounded animate-pulse">
                        Event
                    </div>
                )}
                {armedAbsoluteCommand && (
                    <div className="shrink-0 mb-[4px] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-command-fill text-command-label border border-command-accent/40 rounded animate-pulse">
                        Absolute
                    </div>
                )}
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={onKeyDown}
                    placeholder="What do you do?"
                    className={`chat-composer-input flex-1 bg-transparent px-2 text-sm text-text-primary placeholder:text-text-dim/40 font-mono resize-none border-none outline-none leading-5 ${compact ? 'py-1.5 min-h-[32px]' : 'py-2.5 min-h-[40px]'}`}
                />
                <button
                    type="button"
                    {...cuePrimary}
                    onClick={isStreaming ? onStop : onSend}
                    disabled={!isStreaming && (!input.trim() || oocBusy)}
                    className={`chat-composer-send h-[32px] w-[44px] mb-[4px] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 ${isStreaming ? 'is-stop text-amber-500' : 'text-terminal'}`}
                >
                    {isStreaming ? <Square size={16} fill="currentColor" /> : <Send size={16} />}
                </button>
            </div>
            {LOTM_EXCLUSIVE_UI && <ChatComposerControls />}
        </div>
    );
}
