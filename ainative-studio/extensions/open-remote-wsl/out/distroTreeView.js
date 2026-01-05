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
exports.DistroTreeDataProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const disposable_1 = require("./common/disposable");
const commands_1 = require("./commands");
class DistroItem {
    constructor(name, isDefault, locations) {
        this.name = name;
        this.isDefault = isDefault;
        this.locations = locations;
    }
}
class DistroLocationItem {
    constructor(path, name) {
        this.path = path;
        this.name = name;
    }
}
class DistroTreeDataProvider extends disposable_1.Disposable {
    constructor(locationHistory, wslManager) {
        super();
        this.locationHistory = locationHistory;
        this.wslManager = wslManager;
        this._onDidChangeTreeData = this._register(new vscode.EventEmitter());
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.addDistro', () => (0, commands_1.promptInstallNewWSLDistro)(wslManager)));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.refresh', () => this.refresh()));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.emptyWindowInNewWindow', e => this.openRemoteWSLWindow(e, false)));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.emptyWindowInCurrentWindow', e => this.openRemoteWSLWindow(e, true)));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.reopenFolderInNewWindow', e => this.openRemoteWSLocationWindow(e, false)));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.reopenFolderInCurrentWindow', e => this.openRemoteWSLocationWindow(e, true)));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.deleteFolderHistoryItem', e => this.deleteDistroLocation(e)));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.setDefaultDistro', e => this.setDefaultDistro(e)));
        this._register(vscode.commands.registerCommand('openremotewsl.explorer.deleteDistro', e => this.deleteDistro(e)));
    }
    getTreeItem(element) {
        if (element instanceof DistroLocationItem) {
            const label = path.posix.basename(element.path).replace(/\.code-workspace$/, ' (Workspace)');
            const treeItem = new vscode.TreeItem(label);
            treeItem.description = path.posix.dirname(element.path);
            treeItem.iconPath = new vscode.ThemeIcon('folder');
            treeItem.contextValue = 'openremotewsl.explorer.folder';
            return treeItem;
        }
        const treeItem = new vscode.TreeItem(element.name);
        treeItem.description = element.isDefault ? 'default distro' : undefined;
        treeItem.collapsibleState = element.locations.length ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        treeItem.iconPath = new vscode.ThemeIcon('vm');
        treeItem.contextValue = 'openremotewsl.explorer.distro';
        return treeItem;
    }
    async getChildren(element) {
        if (!element) {
            const distros = await this.wslManager.listDistros();
            return distros.map(distro => new DistroItem(distro.name, distro.isDefault, this.locationHistory.getHistory(distro.name)));
        }
        if (element instanceof DistroItem) {
            return element.locations.map(location => new DistroLocationItem(location, element.name));
        }
        return [];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    async deleteDistroLocation(element) {
        await this.locationHistory.removeLocation(element.name, element.path);
        this.refresh();
    }
    async openRemoteWSLWindow(element, reuseWindow) {
        (0, commands_1.openRemoteWSLWindow)(element.name, reuseWindow);
    }
    async openRemoteWSLocationWindow(element, reuseWindow) {
        (0, commands_1.openRemoteWSLLocationWindow)(element.name, element.path, reuseWindow);
    }
    async setDefaultDistro(element) {
        await (0, commands_1.setDefaultWSLDistro)(this.wslManager, element.name);
        this.refresh();
    }
    async deleteDistro(element) {
        await (0, commands_1.deleteWSLDistro)(this.wslManager, element.name);
        this.refresh();
    }
}
exports.DistroTreeDataProvider = DistroTreeDataProvider;
//# sourceMappingURL=distroTreeView.js.map