"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const logger_1 = __importDefault(require("./common/logger"));
const authResolver_1 = require("./authResolver");
const commands_1 = require("./commands");
const hostTreeView_1 = require("./hostTreeView");
const remoteLocationHistory_1 = require("./remoteLocationHistory");
async function activate(context) {
    const logger = new logger_1.default('Remote - SSH');
    context.subscriptions.push(logger);
    const remoteSSHResolver = new authResolver_1.RemoteSSHResolver(context, logger);
    context.subscriptions.push(vscode.workspace.registerRemoteAuthorityResolver(authResolver_1.REMOTE_SSH_AUTHORITY, remoteSSHResolver));
    context.subscriptions.push(remoteSSHResolver);
    const locationHistory = new remoteLocationHistory_1.RemoteLocationHistory(context);
    const locationData = (0, remoteLocationHistory_1.getRemoteWorkspaceLocationData)();
    if (locationData) {
        await locationHistory.addLocation(locationData[0], locationData[1]);
    }
    const hostTreeDataProvider = new hostTreeView_1.HostTreeDataProvider(locationHistory);
    context.subscriptions.push(vscode.window.createTreeView('sshHosts', { treeDataProvider: hostTreeDataProvider }));
    context.subscriptions.push(hostTreeDataProvider);
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.openEmptyWindow', () => (0, commands_1.promptOpenRemoteSSHWindow)(false)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.openEmptyWindowInCurrentWindow', () => (0, commands_1.promptOpenRemoteSSHWindow)(true)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.openConfigFile', () => (0, commands_1.openSSHConfigFile)()));
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.showLog', () => logger.show()));
}
function deactivate() {
}
//# sourceMappingURL=extension.js.map