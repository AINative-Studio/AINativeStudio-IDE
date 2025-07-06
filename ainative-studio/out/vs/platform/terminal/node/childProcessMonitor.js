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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hpbGRQcm9jZXNzTW9uaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvY2hpbGRQcm9jZXNzTW9uaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQsSUFBVyxTQVNWO0FBVEQsV0FBVyxTQUFTO0lBQ25COztPQUVHO0lBQ0gsb0ZBQStCLENBQUE7SUFDL0I7O09BRUc7SUFDSCxnRkFBNkIsQ0FBQTtBQUM5QixDQUFDLEVBVFUsU0FBUyxLQUFULFNBQVMsUUFTbkI7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBYSxFQUFFLENBQUM7QUFFL0M7OztHQUdHO0FBQ0ksSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBRWxELElBQVksaUJBQWlCLENBQUMsS0FBYztRQUMzQyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGtEQUFrRCxFQUFFLEtBQUssQ0FBQyxD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