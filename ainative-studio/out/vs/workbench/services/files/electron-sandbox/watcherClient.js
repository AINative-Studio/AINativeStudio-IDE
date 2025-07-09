/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getDelayedChannel, ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { AbstractUniversalWatcherClient } from '../../../../platform/files/common/watcher.js';
export class UniversalWatcherClient extends AbstractUniversalWatcherClient {
    constructor(onFileChanges, onLogMessage, verboseLogging, utilityProcessWorkerWorkbenchService) {
        super(onFileChanges, onLogMessage, verboseLogging);
        this.utilityProcessWorkerWorkbenchService = utilityProcessWorkerWorkbenchService;
        this.init();
    }
    createWatcher(disposables) {
        const watcher = ProxyChannel.toService(getDelayedChannel((async () => {
            // Acquire universal watcher via utility process worker
            //
            // We explicitly do not add the worker as a disposable
            // because we need to call `stop` on disposal to prevent
            // a crash on shutdown (see below).
            //
            // The utility process worker services ensures to terminate
            // the process automatically when the window closes or reloads.
            const { client, onDidTerminate } = disposables.add(await this.utilityProcessWorkerWorkbenchService.createWorker({
                moduleId: 'vs/platform/files/node/watcher/watcherMain',
                type: 'fileWatcher'
            }));
            // React on unexpected termination of the watcher process
            // by listening to the `onDidTerminate` event. We do not
            // consider an exit code of `0` as abnormal termination.
            onDidTerminate.then(({ reason }) => {
                if (reason?.code === 0) {
                    this.trace(`terminated by itself with code ${reason.code}, signal: ${reason.signal}`);
                }
                else {
                    this.onError(`terminated by itself unexpectedly with code ${reason?.code}, signal: ${reason?.signal} (ETERM)`);
                }
            });
            return client.getChannel('watcher');
        })()));
        return watcher;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2F0Y2hlckNsaWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZmlsZXMvZWxlY3Ryb24tc2FuZGJveC93YXRjaGVyQ2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUzRixPQUFPLEVBQUUsOEJBQThCLEVBQWtDLE1BQU0sOENBQThDLENBQUM7QUFHOUgsTUFBTSxPQUFPLHNCQUF1QixTQUFRLDhCQUE4QjtJQUV6RSxZQUNDLGFBQStDLEVBQy9DLFlBQXdDLEVBQ3hDLGNBQXVCLEVBQ04sb0NBQTJFO1FBRTVGLEtBQUssQ0FBQyxhQUFhLEVBQUUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRmxDLHlDQUFvQyxHQUFwQyxvQ0FBb0MsQ0FBdUM7UUFJNUYsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2IsQ0FBQztJQUVrQixhQUFhLENBQUMsV0FBNEI7UUFDNUQsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FBb0IsaUJBQWlCLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUV2Rix1REFBdUQ7WUFDdkQsRUFBRTtZQUNGLHNEQUFzRDtZQUN0RCx3REFBd0Q7WUFDeEQsbUNBQW1DO1lBQ25DLEVBQUU7WUFDRiwyREFBMkQ7WUFDM0QsK0RBQStEO1lBQy9ELE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxZQUFZLENBQUM7Z0JBQy9HLFFBQVEsRUFBRSw0Q0FBNEM7Z0JBQ3RELElBQUksRUFBRSxhQUFhO2FBQ25CLENBQUMsQ0FBQyxDQUFDO1lBRUoseURBQXlEO1lBQ3pELHdEQUF3RDtZQUN4RCx3REFBd0Q7WUFFeEQsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRTtnQkFDbEMsSUFBSSxNQUFNLEVBQUUsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxNQUFNLENBQUMsSUFBSSxhQUFhLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsTUFBTSxFQUFFLElBQUksYUFBYSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUMsQ0FBQztnQkFDaEgsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRVAsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUNEIn0=