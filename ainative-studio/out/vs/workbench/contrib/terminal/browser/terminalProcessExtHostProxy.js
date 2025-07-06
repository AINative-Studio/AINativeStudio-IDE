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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzRXh0SG9zdFByb3h5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFByb2Nlc3NFeHRIb3N0UHJveHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHMUMsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBTzFELElBQUksY0FBYyxLQUFnQyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQTBCdEYsWUFDUSxVQUFrQixFQUNqQixLQUFhLEVBQ2IsS0FBYSxFQUNILGdCQUFtRDtRQUVyRSxLQUFLLEVBQUUsQ0FBQztRQUxELGVBQVUsR0FBVixVQUFVLENBQVE7UUFDakIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBcEM3RCxPQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ1Asa0JBQWEsR0FBRyxLQUFLLENBQUM7UUFFZCxtQkFBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVUsQ0FBQyxDQUFDO1FBQy9ELGtCQUFhLEdBQWtCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1FBQ2pELG9CQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBc0IsQ0FB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