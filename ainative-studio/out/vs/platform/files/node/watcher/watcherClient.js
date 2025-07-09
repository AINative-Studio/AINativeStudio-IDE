/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FileAccess } from '../../../../base/common/network.js';
import { getNextTickChannel, ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Client } from '../../../../base/parts/ipc/node/ipc.cp.js';
import { AbstractUniversalWatcherClient } from '../../common/watcher.js';
export class UniversalWatcherClient extends AbstractUniversalWatcherClient {
    constructor(onFileChanges, onLogMessage, verboseLogging) {
        super(onFileChanges, onLogMessage, verboseLogging);
        this.init();
    }
    createWatcher(disposables) {
        // Fork the universal file watcher and build a client around
        // its server for passing over requests and receiving events.
        const client = disposables.add(new Client(FileAccess.asFileUri('bootstrap-fork').fsPath, {
            serverName: 'File Watcher',
            args: ['--type=fileWatcher'],
            env: {
                VSCODE_ESM_ENTRYPOINT: 'vs/platform/files/node/watcher/watcherMain',
                VSCODE_PIPE_LOGGING: 'true',
                VSCODE_VERBOSE_LOGGING: 'true' // transmit console logs from server to client
            }
        }));
        // React on unexpected termination of the watcher process
        disposables.add(client.onDidProcessExit(({ code, signal }) => this.onError(`terminated by itself with code ${code}, signal: ${signal} (ETERM)`)));
        return ProxyChannel.toService(getNextTickChannel(client.getChannel('watcher')));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlckNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9ub2RlL3dhdGNoZXIvd2F0Y2hlckNsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsOEJBQThCLEVBQWtDLE1BQU0seUJBQXlCLENBQUM7QUFFekcsTUFBTSxPQUFPLHNCQUF1QixTQUFRLDhCQUE4QjtJQUV6RSxZQUNDLGFBQStDLEVBQy9DLFlBQXdDLEVBQ3hDLGNBQXVCO1FBRXZCLEtBQUssQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRW5ELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNiLENBQUM7SUFFa0IsYUFBYSxDQUFDLFdBQTRCO1FBRTVELDREQUE0RDtRQUM1RCw2REFBNkQ7UUFDN0QsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FDeEMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFDN0M7WUFDQyxVQUFVLEVBQUUsY0FBYztZQUMxQixJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQztZQUM1QixHQUFHLEVBQUU7Z0JBQ0oscUJBQXFCLEVBQUUsNENBQTRDO2dCQUNuRSxtQkFBbUIsRUFBRSxNQUFNO2dCQUMzQixzQkFBc0IsRUFBRSxNQUFNLENBQUMsOENBQThDO2FBQzdFO1NBQ0QsQ0FDRCxDQUFDLENBQUM7UUFFSCx5REFBeUQ7UUFDekQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxrQ0FBa0MsSUFBSSxhQUFhLE1BQU0sVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWxKLE9BQU8sWUFBWSxDQUFDLFNBQVMsQ0FBb0Isa0JBQWtCLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEcsQ0FBQztDQUNEIn0=