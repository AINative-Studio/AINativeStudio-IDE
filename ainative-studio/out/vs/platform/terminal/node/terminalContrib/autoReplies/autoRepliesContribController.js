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
import { ILogService } from '../../../../log/common/log.js';
import { TerminalAutoResponder } from './terminalAutoResponder.js';
let AutoRepliesPtyServiceContribution = class AutoRepliesPtyServiceContribution {
    constructor(_logService) {
        this._logService = _logService;
        this._autoReplies = new Map();
        this._terminalProcesses = new Map();
        this._autoResponders = new Map();
    }
    async installAutoReply(match, reply) {
        this._autoReplies.set(match, reply);
        // If the auto reply exists on any existing terminals it will be overridden
        for (const persistentProcessId of this._autoResponders.keys()) {
            const process = this._terminalProcesses.get(persistentProcessId);
            if (!process) {
                this._logService.error('Could not find terminal process to install auto reply');
                continue;
            }
            this._processInstallAutoReply(persistentProcessId, process, match, reply);
        }
    }
    async uninstallAllAutoReplies() {
        for (const match of this._autoReplies.keys()) {
            for (const processAutoResponders of this._autoResponders.values()) {
                processAutoResponders.get(match)?.dispose();
                processAutoResponders.delete(match);
            }
        }
    }
    handleProcessReady(persistentProcessId, process) {
        this._terminalProcesses.set(persistentProcessId, process);
        this._autoResponders.set(persistentProcessId, new Map());
        for (const [match, reply] of this._autoReplies.entries()) {
            this._processInstallAutoReply(persistentProcessId, process, match, reply);
        }
    }
    handleProcessDispose(persistentProcessId) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            for (const e of processAutoResponders.values()) {
                e.dispose();
            }
            processAutoResponders.clear();
        }
    }
    handleProcessInput(persistentProcessId, data) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            for (const listener of processAutoResponders.values()) {
                listener.handleInput();
            }
        }
    }
    handleProcessResize(persistentProcessId, cols, rows) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            for (const listener of processAutoResponders.values()) {
                listener.handleResize();
            }
        }
    }
    _processInstallAutoReply(persistentProcessId, terminalProcess, match, reply) {
        const processAutoResponders = this._autoResponders.get(persistentProcessId);
        if (processAutoResponders) {
            processAutoResponders.get(match)?.dispose();
            processAutoResponders.set(match, new TerminalAutoResponder(terminalProcess, match, reply, this._logService));
        }
    }
};
AutoRepliesPtyServiceContribution = __decorate([
    __param(0, ILogService)
], AutoRepliesPtyServiceContribution);
export { AutoRepliesPtyServiceContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b1JlcGxpZXNDb250cmliQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL3Rlcm1pbmFsQ29udHJpYi9hdXRvUmVwbGllcy9hdXRvUmVwbGllc0NvbnRyaWJDb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUU1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUU1RCxJQUFNLGlDQUFpQyxHQUF2QyxNQUFNLGlDQUFpQztJQUs3QyxZQUNjLFdBQXlDO1FBQXhCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTHRDLGlCQUFZLEdBQXdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDOUMsdUJBQWtCLEdBQXVDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDbkUsb0JBQWUsR0FBb0QsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUs5RixDQUFDO0lBRUQsS0FBSyxDQUFDLGdCQUFnQixDQUFDLEtBQWEsRUFBRSxLQUFhO1FBQ2xELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwQywyRUFBMkU7UUFDM0UsS0FBSyxNQUFNLG1CQUFtQixJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUMvRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7WUFDakUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLHVEQUF1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