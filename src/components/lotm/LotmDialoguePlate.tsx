import { MessageMarkdown } from '../message/MessageMarkdown';
import { ChatEmptyState } from '../chat/ChatEmptyState';
import type { ChatMessage } from '../../types';

export function LotmDialoguePlate({
    speakerName,
    message,
    isStreaming,
    onCreateCharacter,
}: {
    speakerName: string;
    message: ChatMessage | null;
    isStreaming: boolean;
    onCreateCharacter: () => void;
}) {
    if (!message) {
        return (
            <div className="lotm-plate relative z-10 mx-3 mb-2">
                <ChatEmptyState onCreateCharacter={onCreateCharacter} />
            </div>
        );
    }

    const text = message.displayContent || message.content || '';

    return (
        <div className="lotm-plate relative z-10 mx-3 mb-1">
            <div className="lotm-plate-nameplate">
                <span>{speakerName}</span>
                {isStreaming && <span className="lotm-plate-streaming">writing</span>}
            </div>
            <div className="lotm-plate-body gm-prose">
                <MessageMarkdown content={text} />
            </div>
        </div>
    );
}
