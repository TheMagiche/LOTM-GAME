import type { RefObject } from 'react';

export type AutoresizeInputOptions = {
    minHeight?: number;
    maxHeight?: number;
};

/**
 * Composer textarea height management, extracted from ChatArea: grows with
 * content up to `maxHeight`, snaps back to `minHeight` after a send.
 * Classic chat uses 40–240px; illustrated play uses a shorter 32–120px cap.
 */
export function useAutoresizeInput(
    inputRef: RefObject<HTMLTextAreaElement | null>,
    options?: AutoresizeInputOptions,
) {
    const minHeight = options?.minHeight ?? 40;
    const maxHeight = options?.maxHeight ?? 240;

    const resetTextareaHeight = () => {
        if (inputRef.current) {
            inputRef.current.style.height = `${minHeight}px`;
        }
    };

    const resizeToContent = () => {
        if (inputRef.current) {
            inputRef.current.style.height = `${minHeight}px`;
            const newHeight = Math.min(inputRef.current.scrollHeight, maxHeight);
            inputRef.current.style.height = `${newHeight}px`;
        }
    };

    return { resetTextareaHeight, resizeToContent };
}
