/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const SharedProcessLifecycle = {
    exit: 'vscode:electron-main->shared-process=exit',
    ipcReady: 'vscode:shared-process->electron-main=ipc-ready',
    initDone: 'vscode:shared-process->electron-main=init-done'
};
export const SharedProcessChannelConnection = {
    request: 'vscode:createSharedProcessChannelConnection',
    response: 'vscode:createSharedProcessChannelConnectionResult'
};
export const SharedProcessRawConnection = {
    request: 'vscode:createSharedProcessRawConnection',
    response: 'vscode:createSharedProcessRawConnectionResult'
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc2hhcmVkUHJvY2Vzcy9jb21tb24vc2hhcmVkUHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRztJQUNyQyxJQUFJLEVBQUUsMkNBQTJDO0lBQ2pELFFBQVEsRUFBRSxnREFBZ0Q7SUFDMUQsUUFBUSxFQUFFLGdEQUFnRDtDQUMxRCxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUc7SUFDN0MsT0FBTyxFQUFFLDZDQUE2QztJQUN0RCxRQUFRLEVBQUUsbURBQW1EO0NBQzdELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRztJQUN6QyxPQUFPLEVBQUUseUNBQXlDO0lBQ2xELFFBQVEsRUFBRSwrQ0FBK0M7Q0FDekQsQ0FBQyJ9