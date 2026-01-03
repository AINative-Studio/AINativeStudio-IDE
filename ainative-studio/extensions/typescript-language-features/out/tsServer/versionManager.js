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
exports.TypeScriptVersionManager = void 0;
const vscode = __importStar(require("vscode"));
const async_1 = require("../utils/async");
const dispose_1 = require("../utils/dispose");
const useWorkspaceTsdkStorageKey = 'typescript.useWorkspaceTsdk';
const suppressPromptWorkspaceTsdkStorageKey = 'typescript.suppressPromptWorkspaceTsdk';
class TypeScriptVersionManager extends dispose_1.Disposable {
    constructor(configuration, versionProvider, workspaceState) {
        super();
        this.configuration = configuration;
        this.versionProvider = versionProvider;
        this.workspaceState = workspaceState;
        this._onDidPickNewVersion = this._register(new vscode.EventEmitter());
        this.onDidPickNewVersion = this._onDidPickNewVersion.event;
        this._currentVersion = this.versionProvider.defaultVersion;
        if (this.useWorkspaceTsdkSetting) {
            if (vscode.workspace.isTrusted) {
                const localVersion = this.versionProvider.localVersion;
                if (localVersion) {
                    this._currentVersion = localVersion;
                }
            }
            else {
                this._disposables.push(vscode.workspace.onDidGrantWorkspaceTrust(() => {
                    if (this.versionProvider.localVersion) {
                        this.updateActiveVersion(this.versionProvider.localVersion);
                    }
                }));
            }
        }
        if (this.isInPromptWorkspaceTsdkState(configuration)) {
            (0, async_1.setImmediate)(() => {
                this.promptUseWorkspaceTsdk();
            });
        }
    }
    updateConfiguration(nextConfiguration) {
        const lastConfiguration = this.configuration;
        this.configuration = nextConfiguration;
        if (!this.isInPromptWorkspaceTsdkState(lastConfiguration)
            && this.isInPromptWorkspaceTsdkState(nextConfiguration)) {
            this.promptUseWorkspaceTsdk();
        }
    }
    get currentVersion() {
        return this._currentVersion;
    }
    reset() {
        this._currentVersion = this.versionProvider.bundledVersion;
    }
    async promptUserForVersion() {
        const selected = await vscode.window.showQuickPick([
            this.getBundledPickItem(),
            ...this.getLocalPickItems(),
            {
                kind: vscode.QuickPickItemKind.Separator,
                label: '',
                run: () => { },
            },
            LearnMorePickItem,
        ], {
            placeHolder: vscode.l10n.t("Select the TypeScript version used for JavaScript and TypeScript language features"),
        });
        return selected?.run();
    }
    getBundledPickItem() {
        const bundledVersion = this.versionProvider.defaultVersion;
        return {
            label: (!this.useWorkspaceTsdkSetting || !vscode.workspace.isTrusted
                ? '• '
                : '') + vscode.l10n.t("Use VS Code's Version"),
            description: bundledVersion.displayName,
            detail: bundledVersion.pathLabel,
            run: async () => {
                await this.workspaceState.update(useWorkspaceTsdkStorageKey, false);
                this.updateActiveVersion(bundledVersion);
            },
        };
    }
    getLocalPickItems() {
        return this.versionProvider.localVersions.map(version => {
            return {
                label: (this.useWorkspaceTsdkSetting && vscode.workspace.isTrusted && this.currentVersion.eq(version)
                    ? '• '
                    : '') + vscode.l10n.t("Use Workspace Version"),
                description: version.displayName,
                detail: version.pathLabel,
                run: async () => {
                    const trusted = await vscode.workspace.requestWorkspaceTrust();
                    if (trusted) {
                        await this.workspaceState.update(useWorkspaceTsdkStorageKey, true);
                        const tsConfig = vscode.workspace.getConfiguration('typescript');
                        await tsConfig.update('tsdk', version.pathLabel, false);
                        this.updateActiveVersion(version);
                    }
                },
            };
        });
    }
    async promptUseWorkspaceTsdk() {
        const workspaceVersion = this.versionProvider.localVersion;
        if (workspaceVersion === undefined) {
            throw new Error('Could not prompt to use workspace TypeScript version because no workspace version is specified');
        }
        const allowIt = vscode.l10n.t("Allow");
        const dismissPrompt = vscode.l10n.t("Dismiss");
        const suppressPrompt = vscode.l10n.t("Never in this Workspace");
        const result = await vscode.window.showInformationMessage(vscode.l10n.t("This workspace contains a TypeScript version. Would you like to use the workspace TypeScript version for TypeScript and JavaScript language features?"), allowIt, dismissPrompt, suppressPrompt);
        if (result === allowIt) {
            await this.workspaceState.update(useWorkspaceTsdkStorageKey, true);
            this.updateActiveVersion(workspaceVersion);
        }
        else if (result === suppressPrompt) {
            await this.workspaceState.update(suppressPromptWorkspaceTsdkStorageKey, true);
        }
    }
    updateActiveVersion(pickedVersion) {
        const oldVersion = this.currentVersion;
        this._currentVersion = pickedVersion;
        if (!oldVersion.eq(pickedVersion)) {
            this._onDidPickNewVersion.fire();
        }
    }
    get useWorkspaceTsdkSetting() {
        return this.workspaceState.get(useWorkspaceTsdkStorageKey, false);
    }
    get suppressPromptWorkspaceTsdkSetting() {
        return this.workspaceState.get(suppressPromptWorkspaceTsdkStorageKey, false);
    }
    isInPromptWorkspaceTsdkState(configuration) {
        return (configuration.localTsdk !== null
            && configuration.enablePromptUseWorkspaceTsdk === true
            && this.suppressPromptWorkspaceTsdkSetting === false
            && this.useWorkspaceTsdkSetting === false);
    }
}
exports.TypeScriptVersionManager = TypeScriptVersionManager;
const LearnMorePickItem = {
    label: vscode.l10n.t("Learn more about managing TypeScript versions"),
    description: '',
    run: () => {
        vscode.env.openExternal(vscode.Uri.parse('https://go.microsoft.com/fwlink/?linkid=839919'));
    }
};
//# sourceMappingURL=versionManager.js.map