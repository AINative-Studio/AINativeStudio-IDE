/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
import { Client as IPCElectronClient } from '../../../base/parts/ipc/electron-sandbox/ipc.electron.js';
/**
 * An implementation of `IMainProcessService` that leverages Electron's IPC.
 */
export class ElectronIPCMainProcessService extends Disposable {
    constructor(windowId) {
        super();
        this.mainProcessConnection = this._register(new IPCElectronClient(`window:${windowId}`));
    }
    getChannel(channelName) {
        return this.mainProcessConnection.getChannel(channelName);
    }
    registerChannel(channelName, channel) {
        this.mainProcessConnection.registerChannel(channelName, channel);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblByb2Nlc3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2lwYy9lbGVjdHJvbi1zYW5kYm94L21haW5Qcm9jZXNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsT0FBTyxFQUFFLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBR3ZHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLDZCQUE4QixTQUFRLFVBQVU7SUFNNUQsWUFDQyxRQUFnQjtRQUVoQixLQUFLLEVBQUUsQ0FBQztRQUVSLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksaUJBQWlCLENBQUMsVUFBVSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELFVBQVUsQ0FBQyxXQUFtQjtRQUM3QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVELGVBQWUsQ0FBQyxXQUFtQixFQUFFLE9BQStCO1FBQ25FLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2xFLENBQUM7Q0FDRCJ9