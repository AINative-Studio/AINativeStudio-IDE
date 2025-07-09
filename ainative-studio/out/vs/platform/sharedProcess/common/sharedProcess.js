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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zaGFyZWRQcm9jZXNzL2NvbW1vbi9zaGFyZWRQcm9jZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHO0lBQ3JDLElBQUksRUFBRSwyQ0FBMkM7SUFDakQsUUFBUSxFQUFFLGdEQUFnRDtJQUMxRCxRQUFRLEVBQUUsZ0RBQWdEO0NBQzFELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRztJQUM3QyxPQUFPLEVBQUUsNkNBQTZDO0lBQ3RELFFBQVEsRUFBRSxtREFBbUQ7Q0FDN0QsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHO0lBQ3pDLE9BQU8sRUFBRSx5Q0FBeUM7SUFDbEQsUUFBUSxFQUFFLCtDQUErQztDQUN6RCxDQUFDIn0=