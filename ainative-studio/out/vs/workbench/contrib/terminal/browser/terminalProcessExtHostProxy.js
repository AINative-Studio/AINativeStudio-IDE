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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITerminalService } from './terminal.js';
let TerminalProcessExtHostProxy = class TerminalProcessExtHostProxy extends Disposable {
    get onProcessReady() { return this._onProcessReady.event; }
    constructor(instanceId, _cols, _rows, _terminalService) {
        super();
        this.instanceId = instanceId;
        this._cols = _cols;
        this._rows = _rows;
        this._terminalService = _terminalService;
        this.id = 0;
        this.shouldPersist = false;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReady = this._register(new Emitter());
        this._onStart = this._register(new Emitter());
        this.onStart = this._onStart.event;
        this._onInput = this._register(new Emitter());
        this.onInput = this._onInput.event;
        this._onBinary = this._register(new Emitter());
        this.onBinary = this._onBinary.event;
        this._onResize = this._register(new Emitter());
        this.onResize = this._onResize.event;
        this._onAcknowledgeDataEvent = this._register(new Emitter());
        this.onAcknowledgeDataEvent = this._onAcknowledgeDataEvent.event;
        this._onShutdown = this._register(new Emitter());
        this.onShutdown = this._onShutdown.event;
        this._onRequestInitialCwd = this._register(new Emitter());
        this.onRequestInitialCwd = this._onRequestInitialCwd.event;
        this._onRequestCwd = this._register(new Emitter());
        this.onRequestCwd = this._onRequestCwd.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._pendingInitialCwdRequests = [];
        this._pendingCwdRequests = [];
    }
    emitData(data) {
        this._onProcessData.fire(data);
    }
    emitTitle(title) {
        this._onDidChangeProperty.fire({ type: "title" /* ProcessPropertyType.Title */, value: title });
    }
    emitReady(pid, cwd) {
        this._onProcessReady.fire({ pid, cwd, windowsPty: undefined });
    }
    emitProcessProperty({ type, value }) {
        switch (type) {
            case "cwd" /* ProcessPropertyType.Cwd */:
                this.emitCwd(value);
                break;
            case "initialCwd" /* ProcessPropertyType.InitialCwd */:
                this.emitInitialCwd(value);
                break;
            case "title" /* ProcessPropertyType.Title */:
                this.emitTitle(value);
                break;
            case "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */:
                this.emitOverrideDimensions(value);
                break;
            case "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */:
                this.emitResolvedShellLaunchConfig(value);
                break;
        }
    }
    emitExit(exitCode) {
        this._onProcessExit.fire(exitCode);
        this.dispose();
    }
    emitOverrideDimensions(dimensions) {
        this._onDidChangeProperty.fire({ type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */, value: dimensions });
    }
    emitResolvedShellLaunchConfig(shellLaunchConfig) {
        this._onDidChangeProperty.fire({ type: "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */, value: shellLaunchConfig });
    }
    emitInitialCwd(initialCwd) {
        while (this._pendingInitialCwdRequests.length > 0) {
            this._pendingInitialCwdRequests.pop()(initialCwd);
        }
    }
    emitCwd(cwd) {
        while (this._pendingCwdRequests.length > 0) {
            this._pendingCwdRequests.pop()(cwd);
        }
    }
    async start() {
        return this._terminalService.requestStartExtensionTerminal(this, this._cols, this._rows);
    }
    shutdown(immediate) {
        this._onShutdown.fire(immediate);
    }
    input(data) {
        this._onInput.fire(data);
    }
    resize(cols, rows) {
        this._onResize.fire({ cols, rows });
    }
    clearBuffer() {
        // no-op
    }
    acknowledgeDataEvent() {
        // Flow control is disabled for extension terminals
    }
    async setUnicodeVersion(version) {
        // No-op
    }
    async processBinary(data) {
        // Disabled for extension terminals
        this._onBinary.fire(data);
    }
    getInitialCwd() {
        return new Promise(resolve => {
            this._onRequestInitialCwd.fire();
            this._pendingInitialCwdRequests.push(resolve);
        });
    }
    getCwd() {
        return new Promise(resolve => {
            this._onRequestCwd.fire();
            this._pendingCwdRequests.push(resolve);
        });
    }
    async refreshProperty(type) {
        // throws if called in extHostTerminalService
    }
    async updateProperty(type, value) {
        // throws if called in extHostTerminalService
    }
};
TerminalProcessExtHostProxy = __decorate([
    __param(3, ITerminalService)
], TerminalProcessExtHostProxy);
export { TerminalProcessExtHostProxy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzRXh0SG9zdFByb3h5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxQcm9jZXNzRXh0SG9zdFByb3h5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRzFDLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQU8xRCxJQUFJLGNBQWMsS0FBZ0MsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUEwQnRGLFlBQ1EsVUFBa0IsRUFDakIsS0FBYSxFQUNiLEtBQWEsRUFDSCxnQkFBbUQ7UUFFckUsS0FBSyxFQUFFLENBQUM7UUFMRCxlQUFVLEdBQVYsVUFBVSxDQUFRO1FBQ2pCLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQXBDN0QsT0FBRSxHQUFHLENBQUMsQ0FBQztRQUNQLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBRWQsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFVLENBQUMsQ0FBQztRQUMvRCxrQkFBYSxHQUFrQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQztRQUNqRCxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXNCLENB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