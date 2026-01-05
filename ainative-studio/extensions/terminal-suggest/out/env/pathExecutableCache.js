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
exports.PathExecutableCache = void 0;
exports.watchPathDirectories = watchPathDirectories;
const fs = __importStar(require("fs/promises"));
const vscode = __importStar(require("vscode"));
const executable_1 = require("../helpers/executable");
const os_1 = require("../helpers/os");
const uri_1 = require("../helpers/uri");
const filesystem = __importStar(require("fs"));
const path = __importStar(require("path"));
const isWindows = (0, os_1.osIsWindows)();
class PathExecutableCache {
    constructor() {
        this._disposables = [];
        if (isWindows) {
            this._cachedWindowsExeExtensions = vscode.workspace.getConfiguration("terminal.integrated.suggest" /* SettingsIds.SuggestPrefix */).get("windowsExecutableExtensions" /* SettingsIds.CachedWindowsExecutableExtensionsSuffixOnly */);
            this._disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration("terminal.integrated.suggest.windowsExecutableExtensions" /* SettingsIds.CachedWindowsExecutableExtensions */)) {
                    this._cachedWindowsExeExtensions = vscode.workspace.getConfiguration("terminal.integrated.suggest" /* SettingsIds.SuggestPrefix */).get("windowsExecutableExtensions" /* SettingsIds.CachedWindowsExecutableExtensionsSuffixOnly */);
                    this._cachedExes = undefined;
                }
            }));
        }
    }
    dispose() {
        for (const d of this._disposables) {
            d.dispose();
        }
    }
    refresh() {
        this._cachedExes = undefined;
        this._cachedPathValue = undefined;
    }
    async getExecutablesInPath(env = process.env) {
        // Create cache key
        let pathValue;
        if (isWindows) {
            const caseSensitivePathKey = Object.keys(env).find(key => key.toLowerCase() === 'path');
            if (caseSensitivePathKey) {
                pathValue = env[caseSensitivePathKey];
            }
        }
        else {
            pathValue = env.PATH;
        }
        if (pathValue === undefined) {
            return;
        }
        // Check cache
        if (this._cachedExes && this._cachedPathValue === pathValue) {
            return this._cachedExes;
        }
        // Extract executables from PATH
        const paths = pathValue.split(isWindows ? ';' : ':');
        const pathSeparator = isWindows ? '\\' : '/';
        const promises = [];
        const labels = new Set();
        for (const path of paths) {
            promises.push(this._getFilesInPath(path, pathSeparator, labels));
        }
        // Merge all results
        const executables = new Set();
        const resultSets = await Promise.all(promises);
        for (const resultSet of resultSets) {
            if (resultSet) {
                for (const executable of resultSet) {
                    executables.add(executable);
                }
            }
        }
        // Return
        this._cachedPathValue = pathValue;
        this._cachedExes = { completionResources: executables, labels };
        return this._cachedExes;
    }
    async _getFilesInPath(path, pathSeparator, labels) {
        try {
            const dirExists = await fs.stat(path).then(stat => stat.isDirectory()).catch(() => false);
            if (!dirExists) {
                return undefined;
            }
            const result = new Set();
            const fileResource = vscode.Uri.file(path);
            const files = await vscode.workspace.fs.readDirectory(fileResource);
            for (const [file, fileType] of files) {
                const formattedPath = (0, uri_1.getFriendlyResourcePath)(vscode.Uri.joinPath(fileResource, file), pathSeparator);
                if (!labels.has(file) && fileType !== vscode.FileType.Unknown && fileType !== vscode.FileType.Directory && await (0, executable_1.isExecutable)(formattedPath, this._cachedWindowsExeExtensions)) {
                    result.add({ label: file, documentation: formattedPath, kind: vscode.TerminalCompletionItemKind.Method });
                    labels.add(file);
                }
            }
            return result;
        }
        catch (e) {
            // Ignore errors for directories that can't be read
            return undefined;
        }
    }
}
exports.PathExecutableCache = PathExecutableCache;
async function watchPathDirectories(context, env, pathExecutableCache) {
    const pathDirectories = new Set();
    const envPath = env.PATH;
    if (envPath) {
        envPath.split(path.delimiter).forEach(p => pathDirectories.add(p));
    }
    const activeWatchers = new Set();
    // Watch each directory
    for (const dir of pathDirectories) {
        try {
            if (activeWatchers.has(dir)) {
                // Skip if already watching or directory doesn't exist
                continue;
            }
            const stat = await fs.stat(dir);
            if (!stat.isDirectory()) {
                continue;
            }
            const watcher = filesystem.watch(dir, { persistent: false }, () => {
                if (pathExecutableCache) {
                    // Refresh cache when directory contents change
                    pathExecutableCache.refresh();
                }
            });
            activeWatchers.add(dir);
            context.subscriptions.push(new vscode.Disposable(() => {
                try {
                    watcher.close();
                    activeWatchers.delete(dir);
                }
                catch { }
                { }
            }));
        }
        catch { }
    }
}
//# sourceMappingURL=pathExecutableCache.js.map