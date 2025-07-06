/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExtensionHostStarter_1;
import { Promises } from '../../../base/common/async.js';
import { canceled } from '../../../base/common/errors.js';
import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { WindowUtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
let ExtensionHostStarter = class ExtensionHostStarter extends Disposable {
    static { ExtensionHostStarter_1 = this; }
    static { this._lastId = 0; }
    constructor(_logService, _lifecycleMainService, _windowsMainService, _telemetryService) {
        super();
        this._logService = _logService;
        this._lifecycleMainService = _lifecycleMainService;
        this._windowsMainService = _windowsMainService;
        this._telemetryService = _telemetryService;
        this._extHosts = new Map();
        this._shutdown = false;
        // On shutdown: gracefully await extension host shutdowns
        this._register(this._lifecycleMainService.onWillShutdown(e => {
            this._shutdown = true;
            e.join('extHostStarter', this._waitForAllExit(6000));
        }));
    }
    dispose() {
        // Intentionally not killing the extension host processes
        super.dispose();
    }
    _getExtHost(id) {
        const extHostProcess = this._extHosts.get(id);
        if (!extHostProcess) {
            throw new Error(`Unknown extension host!`);
        }
        return extHostProcess;
    }
    onDynamicStdout(id) {
        return this._getExtHost(id).onStdout;
    }
    onDynamicStderr(id) {
        return this._getExtHost(id).onStderr;
    }
    onDynamicMessage(id) {
        return this._getExtHost(id).onMessage;
    }
    onDynamicExit(id) {
        return this._getExtHost(id).onExit;
    }
    async createExtensionHost() {
        if (this._shutdown) {
            throw canceled();
        }
        const id = String(++ExtensionHostStarter_1._lastId);
        const extHost = new WindowUtilityProcess(this._logService, this._windowsMainService, this._telemetryService, this._lifecycleMainService);
        this._extHosts.set(id, extHost);
        const disposable = extHost.onExit(({ pid, code, signal }) => {
            disposable.dispose();
            this._logService.info(`Extension host with pid ${pid} exited with code: ${code}, signal: ${signal}.`);
            setTimeout(() => {
                extHost.dispose();
                this._extHosts.delete(id);
            });
            // See https://github.com/microsoft/vscode/issues/194477
            // We have observed that sometimes the process sends an exit
            // event, but does not really exit and is stuck in an endless
            // loop. In these cases we kill the process forcefully after
            // a certain timeout.
            setTimeout(() => {
                try {
                    process.kill(pid, 0); // will throw if the process doesn't exist anymore.
                    this._logService.error(`Extension host with pid ${pid} still exists, forcefully killing it...`);
                    process.kill(pid);
                }
                catch (er) {
                    // ignore, as the process is already gone
                }
            }, 1000);
        });
        return { id };
    }
    async start(id, opts) {
        if (this._shutdown) {
            throw canceled();
        }
        const extHost = this._getExtHost(id);
        extHost.start({
            ...opts,
            type: 'extensionHost',
            entryPoint: 'vs/workbench/api/node/extensionHostProcess',
            args: ['--skipWorkspaceStorageLock'],
            execArgv: opts.execArgv,
            allowLoadingUnsignedLibraries: true,
            respondToAuthRequestsFromMainProcess: true,
            correlationId: id
        });
        const pid = await Event.toPromise(extHost.onSpawn);
        return { pid };
    }
    async enableInspectPort(id) {
        if (this._shutdown) {
            throw canceled();
        }
        const extHostProcess = this._extHosts.get(id);
        if (!extHostProcess) {
            return false;
        }
        return extHostProcess.enableInspectPort();
    }
    async kill(id) {
        if (this._shutdown) {
            throw canceled();
        }
        const extHostProcess = this._extHosts.get(id);
        if (!extHostProcess) {
            // already gone!
            return;
        }
        extHostProcess.kill();
    }
    async _killAllNow() {
        for (const [, extHost] of this._extHosts) {
            extHost.kill();
        }
    }
    async _waitForAllExit(maxWaitTimeMs) {
        const exitPromises = [];
        for (const [, extHost] of this._extHosts) {
            exitPromises.push(extHost.waitForExit(maxWaitTimeMs));
        }
        return Promises.settled(exitPromises).then(() => { });
    }
};
ExtensionHostStarter = ExtensionHostStarter_1 = __decorate([
    __param(0, ILogService),
    __param(1, ILifecycleMainService),
    __param(2, IWindowsMainService),
    __param(3, ITelemetryService)
], ExtensionHostStarter);
export { ExtensionHostStarter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdFN0YXJ0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25zL2VsZWN0cm9uLW1haW4vZXh0ZW5zaW9uSG9zdFN0YXJ0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDeEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFdEUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVOzthQUlwQyxZQUFPLEdBQVcsQ0FBQyxBQUFaLENBQWE7SUFLbkMsWUFDYyxXQUF5QyxFQUMvQixxQkFBNkQsRUFDL0QsbUJBQXlELEVBQzNELGlCQUFxRDtRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUxzQixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNkLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDOUMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUMxQyxzQkFBaUIs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