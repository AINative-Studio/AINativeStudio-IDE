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
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { parsePtyHostDebugPort } from '../../environment/node/environmentService.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { NullTelemetryService } from '../../telemetry/common/telemetryUtils.js';
import { UtilityProcess } from '../../utilityProcess/electron-main/utilityProcess.js';
import { Client as MessagePortClient } from '../../../base/parts/ipc/electron-main/ipc.mp.js';
import { validatedIpcMain } from '../../../base/parts/ipc/electron-main/ipcMain.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { Emitter } from '../../../base/common/event.js';
import { deepClone } from '../../../base/common/objects.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Schemas } from '../../../base/common/network.js';
let ElectronPtyHostStarter = class ElectronPtyHostStarter extends Disposable {
    constructor(_reconnectConstants, _configurationService, _environmentMainService, _lifecycleMainService, _logService) {
        super();
        this._reconnectConstants = _reconnectConstants;
        this._configurationService = _configurationService;
        this._environmentMainService = _environmentMainService;
        this._lifecycleMainService = _lifecycleMainService;
        this._logService = _logService;
        this.utilityProcess = undefined;
        this._onRequestConnection = new Emitter();
        this.onRequestConnection = this._onRequestConnection.event;
        this._onWillShutdown = new Emitter();
        this.onWillShutdown = this._onWillShutdown.event;
        this._register(this._lifecycleMainService.onWillShutdown(() => this._onWillShutdown.fire()));
        // Listen for new windows to establish connection directly to pty host
        validatedIpcMain.on('vscode:createPtyHostMessageChannel', (e, nonce) => this._onWindowConnection(e, nonce));
        this._register(toDisposable(() => {
            validatedIpcMain.removeHandler('vscode:createPtyHostMessageChannel');
        }));
    }
    start() {
        this.utilityProcess = new UtilityProcess(this._logService, NullTelemetryService, this._lifecycleMainService);
        const inspectParams = parsePtyHostDebugPort(this._environmentMainService.args, this._environmentMainService.isBuilt);
        const execArgv = inspectParams.port ? [
            '--nolazy',
            `--inspect${inspectParams.break ? '-brk' : ''}=${inspectParams.port}`
        ] : undefined;
        this.utilityProcess.start({
            type: 'ptyHost',
            entryPoint: 'vs/platform/terminal/node/ptyHostMain',
            execArgv,
            args: ['--logsPath', this._environmentMainService.logsHome.with({ scheme: Schemas.file }).fsPath],
            env: this._createPtyHostConfiguration()
        });
        const port = this.utilityProcess.connect();
        const client = new MessagePortClient(port, 'ptyHost');
        const store = new DisposableStore();
        store.add(client);
        store.add(toDisposable(() => {
            this.utilityProcess?.kill();
            this.utilityProcess?.dispose();
            this.utilityProcess = undefined;
        }));
        return {
            client,
            store,
            onDidProcessExit: this.utilityProcess.onExit
        };
    }
    _createPtyHostConfiguration() {
        this._environmentMainService.unsetSnapExportedVariables();
        const config = {
            ...deepClone(process.env),
            VSCODE_ESM_ENTRYPOINT: 'vs/platform/terminal/node/ptyHostMain',
            VSCODE_PIPE_LOGGING: 'true',
            VSCODE_VERBOSE_LOGGING: 'true', // transmit console logs from server to client,
            VSCODE_RECONNECT_GRACE_TIME: String(this._reconnectConstants.graceTime),
            VSCODE_RECONNECT_SHORT_GRACE_TIME: String(this._reconnectConstants.shortGraceTime),
            VSCODE_RECONNECT_SCROLLBACK: String(this._reconnectConstants.scrollback),
        };
        const simulatedLatency = this._configurationService.getValue("terminal.integrated.developer.ptyHost.latency" /* TerminalSettingId.DeveloperPtyHostLatency */);
        if (simulatedLatency && typeof simulatedLatency === 'number') {
            config.VSCODE_LATENCY = String(simulatedLatency);
        }
        const startupDelay = this._configurationService.getValue("terminal.integrated.developer.ptyHost.startupDelay" /* TerminalSettingId.DeveloperPtyHostStartupDelay */);
        if (startupDelay && typeof startupDelay === 'number') {
            config.VSCODE_STARTUP_DELAY = String(startupDelay);
        }
        this._environmentMainService.restoreSnapExportedVariables();
        return config;
    }
    _onWindowConnection(e, nonce) {
        this._onRequestConnection.fire();
        const port = this.utilityProcess.connect();
        // Check back if the requesting window meanwhile closed
        // Since shared process is delayed on startup there is
        // a chance that the window close before the shared process
        // was ready for a connection.
        if (e.sender.isDestroyed()) {
            port.close();
            return;
        }
        e.sender.postMessage('vscode:createPtyHostMessageChannelResult', nonce, [port]);
    }
};
ElectronPtyHostStarter = __decorate([
    __param(1, IConfigurationService),
    __param(2, IEnvironmentMainService),
    __param(3, ILifecycleMainService),
    __param(4, ILogService)
], ElectronPtyHostStarter);
export { ElectronPtyHostStarter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25QdHlIb3N0U3RhcnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL2VsZWN0cm9uLW1haW4vZWxlY3Ryb25QdHlIb3N0U3RhcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLElBQUksaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUU5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNwRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUVuRCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7SUFT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