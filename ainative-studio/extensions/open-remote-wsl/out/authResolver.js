"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteWSLResolver = exports.REMOTE_WSL_AUTHORITY = void 0;
exports.getRemoteAuthority = getRemoteAuthority;
const vscode = __importStar(require("vscode"));
const serverSetup_1 = require("./serverSetup");
exports.REMOTE_WSL_AUTHORITY = 'wsl';
function getRemoteAuthority(distro) {
    return `${exports.REMOTE_WSL_AUTHORITY}+${distro}`;
}
class Tunnel {
    constructor(remoteAddress, localAddress) {
        this.remoteAddress = remoteAddress;
        this.localAddress = localAddress;
        this._onDidDisposeEmitter = new vscode.EventEmitter();
        this.onDidDispose = this._onDidDisposeEmitter.event;
        // If ipv6 localhost 0:0:0:0:0:0:0:1 or [::1] replace with localhost
        if (localAddress.host !== 'localhost' && localAddress.host !== '127.0.0.1') {
            localAddress.host = 'localhost';
        }
    }
    dispose() {
        this._onDidDisposeEmitter.fire();
    }
}
class RemoteWSLResolver {
    constructor(wslManager, logger) {
        this.wslManager = wslManager;
        this.logger = logger;
    }
    resolve(authority, context) {
        const [type, distroName] = authority.split('+');
        if (type !== exports.REMOTE_WSL_AUTHORITY) {
            throw new Error(`Invalid authority type for WSL resolver: ${type}`);
        }
        this.logger.info(`Resolving wsl remote authority '${authority}' (attemp #${context.resolveAttempt})`);
        // It looks like default values are not loaded yet when resolving a remote,
        // so let's hardcode the default values here
        const remoteSSHconfig = vscode.workspace.getConfiguration('remote.WSL');
        const serverDownloadUrlTemplate = remoteSSHconfig.get('serverDownloadUrlTemplate');
        return vscode.window.withProgress({
            title: `Setting up WSL Distro: ${distroName}`,
            location: vscode.ProgressLocation.Notification,
            cancellable: false
        }, async () => {
            try {
                const installResult = await (0, serverSetup_1.installCodeServer)(this.wslManager, distroName, serverDownloadUrlTemplate, [], [], this.logger);
                this.labelFormatterDisposable?.dispose();
                this.labelFormatterDisposable = vscode.workspace.registerResourceLabelFormatter({
                    scheme: 'vscode-remote',
                    authority: `${exports.REMOTE_WSL_AUTHORITY}+*`,
                    formatting: {
                        label: '${path}',
                        separator: '/',
                        tildify: true,
                        workspaceSuffix: `WSL: ${distroName}`,
                        workspaceTooltip: `Running in ${distroName}`
                    }
                });
                return new vscode.ResolvedAuthority('127.0.0.1', installResult.listeningOn, installResult.connectionToken);
            }
            catch (e) {
                this.logger.error(`Error resolving authority`, e);
                // Initial connection
                if (context.resolveAttempt === 1) {
                    this.logger.show();
                    const closeRemote = 'Close Remote';
                    const retry = 'Retry';
                    const result = await vscode.window.showErrorMessage(`Could not establish connection to WSL distro "${distroName}"`, { modal: true }, closeRemote, retry);
                    if (result === closeRemote) {
                        await vscode.commands.executeCommand('workbench.action.remote.close');
                    }
                    else if (result === retry) {
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }
                if (e instanceof serverSetup_1.ServerInstallError || !(e instanceof Error)) {
                    throw vscode.RemoteAuthorityResolverError.NotAvailable(e instanceof Error ? e.message : String(e));
                }
                else {
                    throw vscode.RemoteAuthorityResolverError.TemporarilyNotAvailable(e.message);
                }
            }
        });
    }
    async tunnelFactory(tunnelOptions) {
        return new Tunnel(tunnelOptions.remoteAddress, {
            host: tunnelOptions.remoteAddress.host,
            port: tunnelOptions.localAddressPort ?? tunnelOptions.remoteAddress.port
        });
    }
    dispose() {
        this.labelFormatterDisposable?.dispose();
    }
}
exports.RemoteWSLResolver = RemoteWSLResolver;
//# sourceMappingURL=authResolver.js.map