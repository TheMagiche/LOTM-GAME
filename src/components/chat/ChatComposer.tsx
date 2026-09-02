import type { RefObject } from 'react';
import { Send, Square } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

/**
 * Bottom composer row: active-preset selector, deep-search armed chip,
 * auto-growing input textarea, and the send/stop toggle button.
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
    const settings = useAppStore(s => s.settings);
    const deepArmed = useAppStore(s => s.deepArmed);
    const armedRoll = useAppStore(s => s.armedRoll);
    const armedLoot = useAppStore(s => s.armedLoot);
    const armedOneShot = useAppStore(s => s.armedOneShot);
    const armedAbsoluteCommand = useAppStore(s => s.armedAbsoluteCommand);
    const showPresetPicker = settings.presets.length > 1;

    return (
        <div className={compact ? 'px-2 sm:px-3 pt-1.5 pb-1.5' : 'px-2 sm:px-4 pt-3 sm:pt-4 pb-2'}>
            <div className="flex gap-1 border border-border bg-void focus-within:border-terminal transition-colors items-end p-1 rounded-sm">
                {showPresetPicker && (
                <div className="relative shrink-0 mb-[4px] ml-1">
                    <select
                        value={settings.activePresetId}
                        onChange={(e) => useAppStore.getState().setActivePreset(e.target.value)}
                        className="h-[32px] bg-surface border border-border text-text-dim hover:text-terminal hover:border-terminal/50 pl-3 pr-7 text-[10px] uppercase tracking-widest focus:outline-none focus:border-terminal max-w-[120px] sm:max-w-[150px] truncate cursor-pointer appearance-none rounded transition-colors font-bold"
                        title="Active AI Preset"
                    >
                        {settings.presets.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-dim pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                )}
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
                    className={`flex-1 bg-transparent px-2 text-sm text-text-primary placeholder:text-text-dim/40 font-mono resize-none border-none outline-none leading-5 ${compact ? 'py-1.5 min-h-[32px]' : 'py-2.5 min-h-[40px]'}`}
                />
                <button
                    onClick={isStreaming ? onStop : onSend}
                    disabled={!isStreaming && (!input.trim() || oocBusy)}
                    className={`h-[32px] w-[44px] mb-[4px] rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shrink-0 ${isStreaming ? 'text-amber-500 hover:bg-amber-500/10' : 'text-terminal hover:bg-terminal/10'}`}
                >
                    {isStreaming ? <Square size={16} fill="currentColor" /> : <Send size={16} />}
                </button>
            </div>
        </div>
    );
}
