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
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { Client } from '../../../base/parts/ipc/node/ipc.cp.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { parsePtyHostDebugPort } from '../../environment/node/environmentService.js';
let NodePtyHostStarter = class NodePtyHostStarter extends Disposable {
    constructor(_reconnectConstants, _environmentService) {
        super();
        this._reconnectConstants = _reconnectConstants;
        this._environmentService = _environmentService;
    }
    start() {
        const opts = {
            serverName: 'Pty Host',
            args: ['--type=ptyHost', '--logsPath', this._environmentService.logsHome.with({ scheme: Schemas.file }).fsPath],
            env: {
                VSCODE_ESM_ENTRYPOINT: 'vs/platform/terminal/node/ptyHostMain',
                VSCODE_PIPE_LOGGING: 'true',
                VSCODE_VERBOSE_LOGGING: 'true', // transmit console logs from server to client,
                VSCODE_RECONNECT_GRACE_TIME: this._reconnectConstants.graceTime,
                VSCODE_RECONNECT_SHORT_GRACE_TIME: this._reconnectConstants.shortGraceTime,
                VSCODE_RECONNECT_SCROLLBACK: this._reconnectConstants.scrollback
            }
        };
        const ptyHostDebug = parsePtyHostDebugPort(this._environmentService.args, this._environmentService.isBuilt);
        if (ptyHostDebug) {
            if (ptyHostDebug.break && ptyHostDebug.port) {
                opts.debugBrk = ptyHostDebug.port;
            }
            else if (!ptyHostDebug.break && ptyHostDebug.port) {
                opts.debug = ptyHostDebug.port;
            }
        }
        const client = new Client(FileAccess.asFileUri('bootstrap-fork').fsPath, opts);
        const store = new DisposableStore();
        store.add(client);
        return {
            client,
            store,
            onDidProcessExit: client.onDidProcessExit
        };
    }
};
NodePtyHostStarter = __decorate([
    __param(1, IEnvironmentService)
], NodePtyHostStarter);
export { NodePtyHostStarter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVB0eUhvc3RTdGFydGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Rlcm1pbmFsL25vZGUvbm9kZVB0eUhvc3RTdGFydGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsTUFBTSxFQUFlLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUE2QixNQUFNLHlDQUF5QyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBSTlFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUNqRCxZQUNrQixtQkFBd0MsRUFDbkIsbUJBQThDO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBSFMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUFxQjtRQUNuQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQTJCO0lBR3JGLENBQUM7SUFFRCxLQUFLO1FBQ0osTUFBTSxJQUFJLEdBQWdCO1lBQ3pCLFVBQVUsRUFBRSxVQUFVO1lBQ3RCLElBQUksRUFBRSxDQUFDLGdCQUFnQixFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDL0csR0FBRyxFQUFFO2dCQUNKLHFCQUFxQixFQUFFLHVDQUF1QztnQkFDOUQsbUJBQW1CLEVBQUUsTUFBTTtnQkFDM0Isc0JBQXNCLEVBQUUsTUFBTSxFQUFFLCtDQUErQztnQkFDL0UsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVM7Z0JBQy9ELGlDQUFpQyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjO2dCQUMxRSwyQkFBMkIsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVTthQUNoRTtTQUNELENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1RyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksWUFBWSxDQUFDLEtBQUssSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQztZQUNuQyxDQUFDO2lCQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDckQsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQ2hDLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUUvRSxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFbEIsT0FBTztZQUNOLE1BQU07WUFDTixLQUFLO1lBQ0wsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjtTQUN6QyxDQUFDO0lBQ0gsQ0FBQztDQUNELENBQUE7QUExQ1ksa0JBQWtCO0lBRzVCLFdBQUEsbUJBQW1CLENBQUE7R0FIVCxrQkFBa0IsQ0EwQzlCIn0=