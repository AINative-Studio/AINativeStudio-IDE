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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlckNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZmlsZXMvbm9kZS93YXRjaGVyL3dhdGNoZXJDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFbkUsT0FBTyxFQUFFLDhCQUE4QixFQUFrQyxNQUFNLHlCQUF5QixDQUFDO0FBRXpHLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSw4QkFBOEI7SUFFekUsWUFDQyxhQUErQyxFQUMvQyxZQUF3QyxFQUN4QyxjQUF1QjtRQUV2QixLQUFLLENBQUMsYUFBYSxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDYixDQUFDO0lBRWtCLGFBQWEsQ0FBQyxXQUE0QjtRQUU1RCw0REFBNEQ7UUFDNUQsNkRBQTZEO1FBQzdELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxNQUFNLENBQ3hDLFVBQVUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQzdDO1lBQ0MsVUFBVSxFQUFFLGNBQWM7WUFDMUIsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUM7WUFDNUIsR0FBRyxFQUFFO2dCQUNKLHFCQUFxQixFQUFFLDRDQUE0QztnQkFDbkUsbUJBQW1CLEVBQUUsTUFBTTtnQkFDM0Isc0JBQXNCLEVBQUUsTUFBTSxDQUFDLDhDQUE4QzthQUM3RTtTQUNELENBQ0QsQ0FBQyxDQUFDO1FBRUgseURBQXlEO1FBQ3pELFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsa0NBQWtDLElBQUksYUFBYSxNQUFNLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVsSixPQUFPLFlBQVksQ0FBQyxTQUFTLENBQW9CLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BHLENBQUM7Q0FDRCJ9