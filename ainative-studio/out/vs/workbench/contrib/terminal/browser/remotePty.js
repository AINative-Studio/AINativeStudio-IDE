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
import { Barrier } from '../../../../base/common/async.js';
import { ITerminalLogService } from '../../../../platform/terminal/common/terminal.js';
import { BasePty } from '../common/basePty.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
let RemotePty = class RemotePty extends BasePty {
    constructor(id, shouldPersist, _remoteTerminalChannel, _remoteAgentService, _logService) {
        super(id, shouldPersist);
        this._remoteTerminalChannel = _remoteTerminalChannel;
        this._remoteAgentService = _remoteAgentService;
        this._logService = _logService;
        this._startBarrier = new Barrier();
    }
    async start() {
        // Fetch the environment to check shell permissions
        const env = await this._remoteAgentService.getEnvironment();
        if (!env) {
            // Extension host processes are only allowed in remote extension hosts currently
            throw new Error('Could not fetch remote environment');
        }
        this._logService.trace('Spawning remote agent process', { terminalId: this.id });
        const startResult = await this._remoteTerminalChannel.start(this.id);
        if (startResult && 'message' in startResult) {
            // An error occurred
            return startResult;
        }
        this._startBarrier.open();
        return startResult;
    }
    async detach(forcePersist) {
        await this._startBarrier.wait();
        return this._remoteTerminalChannel.detachFromProcess(this.id, forcePersist);
    }
    shutdown(immediate) {
        this._startBarrier.wait().then(_ => {
            this._remoteTerminalChannel.shutdown(this.id, immediate);
        });
    }
    input(data) {
        if (this._inReplay) {
            return;
        }
        this._startBarrier.wait().then(_ => {
            this._remoteTerminalChannel.input(this.id, data);
        });
    }
    processBinary(e) {
        return this._remoteTerminalChannel.processBinary(this.id, e);
    }
    resize(cols, rows) {
        if (this._inReplay || this._lastDimensions.cols === cols && this._lastDimensions.rows === rows) {
            return;
        }
        this._startBarrier.wait().then(_ => {
            this._lastDimensions.cols = cols;
            this._lastDimensions.rows = rows;
            this._remoteTerminalChannel.resize(this.id, cols, rows);
        });
    }
    async clearBuffer() {
        await this._remoteTerminalChannel.clearBuffer(this.id);
    }
    freePortKillProcess(port) {
        if (!this._remoteTerminalChannel.freePortKillProcess) {
            throw new Error('freePortKillProcess does not exist on the local pty service');
        }
        return this._remoteTerminalChannel.freePortKillProcess(port);
    }
    acknowledgeDataEvent(charCount) {
        // Support flow control for server spawned processes
        if (this._inReplay) {
            return;
        }
        this._startBarrier.wait().then(_ => {
            this._remoteTerminalChannel.acknowledgeDataEvent(this.id, charCount);
        });
    }
    async setUnicodeVersion(version) {
        return this._remoteTerminalChannel.setUnicodeVersion(this.id, version);
    }
    async refreshProperty(type) {
        return this._remoteTerminalChannel.refreshProperty(this.id, type);
    }
    async updateProperty(type, value) {
        return this._remoteTerminalChannel.updateProperty(this.id, type, value);
    }
    handleOrphanQuestion() {
        this._remoteTerminalChannel.orphanQuestionReply(this.id);
    }
};
RemotePty = __decorate([
    __param(3, IRemoteAgentService),
    __param(4, ITerminalLogService)
], RemotePty);
export { RemotePty };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlUHR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvcmVtb3RlUHR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQW9FLG1CQUFtQixFQUF1QixNQUFNLGtEQUFrRCxDQUFDO0FBQzlLLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUUvQyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUVyRixJQUFNLFNBQVMsR0FBZixNQUFNLFNBQVUsU0FBUSxPQUFPO0lBR3JDLFlBQ0MsRUFBVSxFQUNWLGFBQXNCLEVBQ0wsc0JBQW1ELEVBQzlCLG1CQUF3QyxFQUN4QyxXQUFnQztRQUV0RSxLQUFLLENBQUMsRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBSlIsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUE2QjtRQUM5Qix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3hDLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUd0RSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFLO1FBQ1YsbURBQW1EO1FBQ25ELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzVELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLGdGQUFnRjtZQUNoRixNQUFNLElBQUksS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUVELElBQUks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