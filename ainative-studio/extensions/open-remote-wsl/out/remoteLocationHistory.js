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
exports.RemoteLocationHistory = void 0;
exports.getRemoteWorkspaceLocationData = getRemoteWorkspaceLocationData;
const vscode = __importStar(require("vscode"));
const authResolver_1 = require("./authResolver");
class RemoteLocationHistory {
    constructor(context) {
        this.context = context;
        this.remoteLocationHistory = {};
        // context.globalState.update(RemoteLocationHistory.STORAGE_KEY, undefined);
        this.remoteLocationHistory = context.globalState.get(RemoteLocationHistory.STORAGE_KEY) || {};
    }
    getHistory(host) {
        return this.remoteLocationHistory[host] || [];
    }
    async addLocation(host, path) {
        const hostLocations = this.remoteLocationHistory[host] || [];
        if (!hostLocations.includes(path)) {
            hostLocations.unshift(path);
            this.remoteLocationHistory[host] = hostLocations;
            await this.context.globalState.update(RemoteLocationHistory.STORAGE_KEY, this.remoteLocationHistory);
        }
    }
    async removeLocation(host, path) {
        let hostLocations = this.remoteLocationHistory[host] || [];
        hostLocations = hostLocations.filter(l => l !== path);
        this.remoteLocationHistory[host] = hostLocations;
        await this.context.globalState.update(RemoteLocationHistory.STORAGE_KEY, this.remoteLocationHistory);
    }
}
exports.RemoteLocationHistory = RemoteLocationHistory;
RemoteLocationHistory.STORAGE_KEY = 'remoteLocationHistory_v0';
function getRemoteWorkspaceLocationData() {
    let location = vscode.workspace.workspaceFile;
    if (location && location.scheme === 'vscode-remote' && location.authority.startsWith(authResolver_1.REMOTE_WSL_AUTHORITY) && location.path.endsWith('.code-workspace')) {
        const [, distroName] = location.authority.split('+');
        return [distroName, location.path];
    }
    location = vscode.workspace.workspaceFolders?.[0].uri;
    if (location && location.scheme === 'vscode-remote' && location.authority.startsWith(authResolver_1.REMOTE_WSL_AUTHORITY)) {
        const [, distroName] = location.authority.split('+');
        return [distroName, location.path];
    }
    return undefined;
}
//# sourceMappingURL=remoteLocationHistory.js.map