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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const logger_1 = __importDefault(require("./common/logger"));
const authResolver_1 = require("./authResolver");
const commands_1 = require("./commands");
const distroTreeView_1 = require("./distroTreeView");
const remoteLocationHistory_1 = require("./remoteLocationHistory");
const wslManager_1 = require("./wsl/wslManager");
const platform_1 = require("./common/platform");
async function activate(context) {
    if (!platform_1.isWindows) {
        return;
    }
    const logger = new logger_1.default('Remote - WSL');
    context.subscriptions.push(logger);
    const wslManager = new wslManager_1.WSLManager(logger);
    const remoteWSLResolver = new authResolver_1.RemoteWSLResolver(wslManager, logger);
    context.subscriptions.push(vscode.workspace.registerRemoteAuthorityResolver(authResolver_1.REMOTE_WSL_AUTHORITY, remoteWSLResolver));
    context.subscriptions.push(remoteWSLResolver);
    const locationHistory = new remoteLocationHistory_1.RemoteLocationHistory(context);
    const locationData = (0, remoteLocationHistory_1.getRemoteWorkspaceLocationData)();
    if (locationData) {
        await locationHistory.addLocation(locationData[0], locationData[1]);
    }
    const distroTreeDataProvider = new distroTreeView_1.DistroTreeDataProvider(locationHistory, wslManager);
    context.subscriptions.push(vscode.window.createTreeView('wslTargets', { treeDataProvider: distroTreeDataProvider }));
    context.subscriptions.push(distroTreeDataProvider);
    context.subscriptions.push(vscode.commands.registerCommand('openremotewsl.connect', () => (0, commands_1.promptOpenRemoteWSLWindow)(wslManager, true, true)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotewsl.connectInNewWindow', () => (0, commands_1.promptOpenRemoteWSLWindow)(wslManager, true, false)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotewsl.connectUsingDistro', () => (0, commands_1.promptOpenRemoteWSLWindow)(wslManager, false, true)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotewsl.connectUsingDistroInNewWindow', () => (0, commands_1.promptOpenRemoteWSLWindow)(wslManager, false, false)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotewsl.showLog', () => logger.show()));
}
function deactivate() {
}
//# sourceMappingURL=extension.js.map