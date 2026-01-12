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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG9va3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9haWRldmVsb3Blci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FpbmF0aXZlL2Jyb3dzZXIvcmVhY3Qvc3JjMi9hdXRoLWNvbXBvbmVudHMvaG9va3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFHL0M7O0dBRUc7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQy9CLE9BQXNDLEVBQ3RDLGVBQXNCLEVBQUU7SUFFeEIsU0FBUyxDQUFDLEdBQUcsRUFBRTtRQUNkLE1BQU0sYUFBYSxHQUFHLENBQUMsS0FBWSxFQUFFLEVBQUU7WUFDdEMsTUFBTSxXQUFXLEdBQUcsS0FBZ0MsQ0FBQztZQUNyRCxPQUFPLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLENBQUMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFBRSxhQUE4QixDQUFDLENBQUM7UUFFMUUsT0FBTyxHQUFHLEVBQUU7WUFDWCxNQUFNLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLEVBQUUsYUFBOEIsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQztJQUNILENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGVBQWU7SUFDOUIsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxJQUFZLEVBQUUsT0FBWSxFQUFFLEVBQUUsRUFBRTtRQUN0RSxJQUFJLENBQUM7WUFDSixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO1FBQ3hDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ04sT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDL0QsQ0FBQztRQUNILENBQUM7SUFDRixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFUCxPQUFPLFdBQVcsQ0FBQztBQUNwQixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLEdBQVcsRUFDWCxPQUFtQixFQUNuQixlQUFzQixFQUFFO0lBRXhCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDZCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQWdCLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxDQUFDO1lBQ1gsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDcEQsT0FBTyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ3JFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMifQ==