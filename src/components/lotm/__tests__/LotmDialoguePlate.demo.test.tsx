import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../types';
import { useMessageEditor } from '../../hooks/useMessageEditor';
import { useSceneContinue } from '../../hooks/useSceneContinue';
import { useSwipeVariants } from '../../hooks/useSwipeVariants';
import { LotmDialoguePlate } from '../LotmDialoguePlate';

vi.mock('../../../config/demoMode', async () => {
    const actual = await vi.importActual<typeof import('../../../config/demoMode')>('../../../config/demoMode');
    return { ...actual, IS_DEMO_MODE: true };
});

afterEach(() => {
    cleanup();
});

const editor = {
    editingMessageId: null,
    startEditing: vi.fn(),
    handleRegenerate: vi.fn(),
    handleDeleteOutput: vi.fn(),
    inlineDraft: '',
    setInlineDraft: vi.fn(),
    handleEditSubmit: vi.fn(),
    cancelEditing: vi.fn(),
} as unknown as ReturnType<typeof useMessageEditor>;

const swipe = {
    swipeGenLoading: false,
    prevSwipe: vi.fn(),
    nextSwipe: vi.fn(),
} as unknown as ReturnType<typeof useSwipeVariants>;

const sceneContinue = {
    continueLoading: false,
    runSceneContinue: vi.fn(),
} as unknown as ReturnType<typeof useSceneContinue>;

function gmMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'gm-demo-1',
        role: 'assistant',
        content: 'The gas lamps hiss.',
        timestamp: Date.now(),
        ...overrides,
    };
}

describe('LotmDialoguePlate demo chrome', () => {
    it('does not mark illustrated GM text as highlight-actionable', () => {
        render(
            <LotmDialoguePlate
                messages={[gmMessage()]}
                isStreaming={false}
                onCreateCharacter={() => {}}
                editor={editor}
                pendingMessageId={null}
                swipe={swipe}
                sceneContinue={sceneContinue}
                onOpenSwipeSheet={() => {}}
            />,
        );

        expect(screen.getByText('The gas lamps hiss.')).toBeInTheDocument();
        expect(screen.getByText('The gas lamps hiss.').closest('[data-lore-checkable="true"]')).toBeNull();
        expect(screen.getByText('The gas lamps hiss.').closest('[data-message-id]')).toBeNull();
    });
});
