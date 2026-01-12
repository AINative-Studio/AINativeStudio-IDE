/*---------------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------------*/
import { useEffect, useCallback } from 'react';
/**
 * Hook to listen for VSCode messages
 */
export function useVSCodeMessage(handler, dependencies = []) {
    useEffect(() => {
        const handleMessage = (event) => {
            const customEvent = event;
            handler(customEvent.detail);
        };
        window.addEventListener('vscode-message', handleMessage);
        return () => {
            window.removeEventListener('vscode-message', handleMessage);
        };
    }, [handler, ...dependencies]);
}
/**
 * Hook for sending async messages to VSCode
 */
export function useSendToVSCode() {
    const sendMessage = useCallback(async (type, data = {}) => {
        try {
            const result = await window.sendToVSCodeAsync(type, data);
            return { success: true, data: result };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }, []);
    return sendMessage;
}
/**
 * Hook for keyboard shortcuts (e.g., Escape to close)
 */
export function useKeyboardShortcut(key, handler, dependencies = []) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === key) {
                handler();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [key, handler, ...dependencies]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9va3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvcmVhY3Qvc3JjL2F1dGgtY29tcG9uZW50cy9ob29rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUcvQzs7R0FFRztBQUNILE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsT0FBc0MsRUFDdEMsZUFBc0IsRUFBRTtJQUV4QixTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2QsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFZLEVBQUUsRUFBRTtZQUN0QyxNQUFNLFdBQVcsR0FBRyxLQUFnQyxDQUFDO1lBQ3JELE9BQU8sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0IsQ0FBQyxDQUFDO1FBRUYsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLGFBQThCLENBQUMsQ0FBQztRQUUxRSxPQUFPLEdBQUcsRUFBRTtZQUNYLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsRUFBRSxhQUE4QixDQUFDLENBQUM7UUFDOUUsQ0FBQyxDQUFDO0lBQ0gsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsZUFBZTtJQUM5QixNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLElBQVksRUFBRSxPQUFZLEVBQUUsRUFBRSxFQUFFO1FBQ3RFLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUMvRCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUVQLE9BQU8sV0FBVyxDQUFDO0FBQ3BCLENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsR0FBVyxFQUNYLE9BQW1CLEVBQ25CLGVBQXNCLEVBQUU7SUFFeEIsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNkLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBZ0IsRUFBRSxFQUFFO1lBQzFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLENBQUM7WUFDWCxDQUFDO1FBQ0YsQ0FBQyxDQUFDO1FBRUYsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNwRCxPQUFPLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDckUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDckMsQ0FBQyJ9