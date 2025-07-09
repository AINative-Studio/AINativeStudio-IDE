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
import { parse } from '../../../base/common/path.js';
import { debounce, throttle } from '../../../base/common/decorators.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { listProcesses } from '../../../base/node/ps.js';
import { ILogService } from '../../log/common/log.js';
var Constants;
(function (Constants) {
    /**
     * The amount of time to throttle checks when the process receives output.
     */
    Constants[Constants["InactiveThrottleDuration"] = 5000] = "InactiveThrottleDuration";
    /**
     * The amount of time to debounce check when the process receives input.
     */
    Constants[Constants["ActiveDebounceDuration"] = 1000] = "ActiveDebounceDuration";
})(Constants || (Constants = {}));
export const ignoreProcessNames = [];
/**
 * Monitors a process for child processes, checking at differing times depending on input and output
 * calls into the monitor.
 */
let ChildProcessMonitor = class ChildProcessMonitor extends Disposable {
    set hasChildProcesses(value) {
        if (this._hasChildProcesses !== value) {
            this._hasChildProcesses = value;
            this._logService.debug('ChildProcessMonitor: Has child processes changed', value);
            this._onDidChangeHasChildProcesses.fire(value);
        }
    }
    /**
     * Whether the process has child processes.
     */
    get hasChildProcesses() { return this._hasChildProcesses; }
    constructor(_pid, _logService) {
        super();
        this._pid = _pid;
        this._logService = _logService;
        this._hasChildProcesses = false;
        this._onDidChangeHasChildProcesses = this._register(new Emitter());
        /**
         * An event that fires when whether the process has child processes changes.
         */
        this.onDidChangeHasChildProcesses = this._onDidChangeHasChildProcesses.event;
    }
    /**
     * Input was triggered on the process.
     */
    handleInput() {
        this._refreshActive();
    }
    /**
     * Output was triggered on the process.
     */
    handleOutput() {
        this._refreshInactive();
    }
    async _refreshActive() {
        if (this._store.isDisposed) {
            return;
        }
        try {
            const processItem = await listProcesses(this._pid);
            this.hasChildProcesses = this._processContainsChildren(processItem);
        }
        catch (e) {
            this._logService.debug('ChildProcessMonitor: Fetching process tree failed', e);
        }
    }
    _refreshInactive() {
        this._refreshActive();
    }
    _processContainsChildren(processItem) {
        // No child processes
        if (!processItem.children) {
            return false;
        }
        // A single child process, handle special cases
        if (processItem.children.length === 1) {
            const item = processItem.children[0];
            let cmd;
            if (item.cmd.startsWith(`"`)) {
                cmd = item.cmd.substring(1, item.cmd.indexOf(`"`, 1));
            }
            else {
                const spaceIndex = item.cmd.indexOf(` `);
                if (spaceIndex === -1) {
                    cmd = item.cmd;
                }
                else {
                    cmd = item.cmd.substring(0, spaceIndex);
                }
            }
            return ignoreProcessNames.indexOf(parse(cmd).name) === -1;
        }
        // Fallback, count child processes
        return processItem.children.length > 0;
    }
};
__decorate([
    debounce(1000 /* Constants.ActiveDebounceDuration */)
], ChildProcessMonitor.prototype, "_refreshActive", null);
__decorate([
    throttle(5000 /* Constants.InactiveThrottleDuration */)
], ChildProcessMonitor.prototype, "_refreshInactive", null);
ChildProcessMonitor = __decorate([
    __param(1, ILogService)
], ChildProcessMonitor);
export { ChildProcessMonitor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hpbGRQcm9jZXNzTW9uaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL2NoaWxkUHJvY2Vzc01vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRXRELElBQVcsU0FTVjtBQVRELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILG9GQUErQixDQUFBO0lBQy9COztPQUVHO0lBQ0gsZ0ZBQTZCLENBQUE7QUFDOUIsQ0FBQyxFQVRVLFNBQVMsS0FBVCxTQUFTLFFBU25CO0FBRUQsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQWEsRUFBRSxDQUFDO0FBRS9DOzs7R0FHRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQUVsRCxJQUFZLGlCQUFpQixDQUFDLEtBQWM7UUFDM0MsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxrREFBa0QsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRixJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hELENBQUM7SUFDRixDQUFDO0lBQ0Q7O09BRUc7SUFDSCxJQUFJLGlCQUFpQixLQUFjLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztJQVFwRSxZQUNrQixJQUFZLEVBQ2hCLFdBQXlDO1FBRXRELEtBQUssRUFBRSxDQUFDO1FBSFMsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBckIvQyx1QkFBa0IsR0FBWSxLQUFLLENBQUM7UUFhM0Isa0NBQTZCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7UUFDeEY7O1dBRUc7UUFDTSxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDO0lBT2pGLENBQUM7SUFFRDs7T0FFRztJQUNILFdBQVc7UUFDVixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWTtRQUNYLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFHYSxBQUFOLEtBQUssQ0FBQyxjQUFjO1FBQzNCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM1QixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsbURBQW1ELEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztJQUNGLENBQUM7SUFHTyxnQkFBZ0I7UUFDdkIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxXQUF3QjtRQUN4RCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCwrQ0FBK0M7UUFDL0MsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLElBQUksR0FBVyxDQUFDO1lBQ2hCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3pDLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZCLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNoQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztnQkFDekMsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxPQUFPLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQ0QsQ0FBQTtBQTNDYztJQURiLFFBQVEsNkNBQWtDO3lEQVcxQztBQUdPO0lBRFAsUUFBUSwrQ0FBb0M7MkRBRzVDO0FBekRXLG1CQUFtQjtJQXNCN0IsV0FBQSxXQUFXLENBQUE7R0F0QkQsbUJBQW1CLENBcUYvQiJ9