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
exports.HostTreeDataProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const sshConfig_1 = __importStar(require("./ssh/sshConfig"));
const disposable_1 = require("./common/disposable");
const commands_1 = require("./commands");
const sshDestination_1 = __importDefault(require("./ssh/sshDestination"));
class HostItem {
    constructor(hostname, locations) {
        this.hostname = hostname;
        this.locations = locations;
    }
}
class HostLocationItem {
    constructor(path, hostname) {
        this.path = path;
        this.hostname = hostname;
    }
}
class HostTreeDataProvider extends disposable_1.Disposable {
    constructor(locationHistory) {
        super();
        this.locationHistory = locationHistory;
        this._onDidChangeTreeData = this._register(new vscode.EventEmitter());
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._register(vscode.commands.registerCommand('openremotessh.explorer.add', () => (0, commands_1.addNewHost)()));
        this._register(vscode.commands.registerCommand('openremotessh.explorer.configure', () => (0, commands_1.openSSHConfigFile)()));
        this._register(vscode.commands.registerCommand('openremotessh.explorer.refresh', () => this.refresh()));
        this._register(vscode.commands.registerCommand('openremotessh.explorer.emptyWindowInNewWindow', e => this.openRemoteSSHWindow(e, false)));
        this._register(vscode.commands.registerCommand('openremotessh.explorer.emptyWindowInCurrentWindow', e => this.openRemoteSSHWindow(e, true)));
        this._register(vscode.commands.registerCommand('openremotessh.explorer.reopenFolderInNewWindow', e => this.openRemoteSSHLocationWindow(e, false)));
        this._register(vscode.commands.registerCommand('openremotessh.explorer.reopenFolderInCurrentWindow', e => this.openRemoteSSHLocationWindow(e, true)));
        this._register(vscode.commands.registerCommand('openremotessh.explorer.deleteFolderHistoryItem', e => this.deleteHostLocation(e)));
        this._register(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('remote.SSH.configFile')) {
                this.refresh();
            }
        }));
        this._register(vscode.workspace.onDidSaveTextDocument(e => {
            if (e.uri.fsPath === (0, sshConfig_1.getSSHConfigPath)()) {
                this.refresh();
            }
        }));
    }
    getTreeItem(element) {
        if (element instanceof HostLocationItem) {
            const label = path.posix.basename(element.path).replace(/\.code-workspace$/, ' (Workspace)');
            const treeItem = new vscode.TreeItem(label);
            treeItem.description = path.posix.dirname(element.path);
            treeItem.iconPath = new vscode.ThemeIcon('folder');
            treeItem.contextValue = 'openremotessh.explorer.folder';
            return treeItem;
        }
        const treeItem = new vscode.TreeItem(element.hostname);
        treeItem.collapsibleState = element.locations.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        treeItem.iconPath = new vscode.ThemeIcon('vm');
        treeItem.contextValue = 'openremotessh.explorer.host';
        return treeItem;
    }
    async getChildren(element) {
        if (!element) {
            const sshConfigFile = await sshConfig_1.default.loadFromFS();
            const hosts = sshConfigFile.getAllConfiguredHosts();
            return hosts.map(hostname => new HostItem(hostname, this.locationHistory.getHistory(hostname)));
        }
        if (element instanceof HostItem) {
            return element.locations.map(location => new HostLocationItem(location, element.hostname));
        }
        return [];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    async deleteHostLocation(element) {
        await this.locationHistory.removeLocation(element.hostname, element.path);
        this.refresh();
    }
    async openRemoteSSHWindow(element, reuseWindow) {
        const sshDest = new sshDestination_1.default(element.hostname);
        (0, commands_1.openRemoteSSHWindow)(sshDest.toEncodedString(), reuseWindow);
    }
    async openRemoteSSHLocationWindow(element, reuseWindow) {
        const sshDest = new sshDestination_1.default(element.hostname);
        (0, commands_1.openRemoteSSHLocationWindow)(sshDest.toEncodedString(), element.path, reuseWindow);
    }
}
exports.HostTreeDataProvider = HostTreeDataProvider;
//# sourceMappingURL=hostTreeView.js.map