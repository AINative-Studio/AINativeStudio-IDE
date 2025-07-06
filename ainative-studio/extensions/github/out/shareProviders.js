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
exports.VscodeDevShareProvider = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("./util");
const links_1 = require("./links");
class VscodeDevShareProvider {
    set hasGitHubRepositories(value) {
        vscode.commands.executeCommand('setContext', 'github.hasGitHubRepo', value);
        this._hasGitHubRepositories = value;
        this.ensureShareProviderRegistration();
    }
    constructor(gitAPI) {
        this.gitAPI = gitAPI;
        this.id = 'copyVscodeDevLink';
        this.label = vscode.l10n.t('Copy vscode.dev Link');
        this.priority = 10;
        this._hasGitHubRepositories = false;
        this.disposables = [];
        this.initializeGitHubRepoContext();
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
    initializeGitHubRepoContext() {
        if (this.gitAPI.repositories.find(repo => (0, util_1.repositoryHasGitHubRemote)(repo))) {
            this.hasGitHubRepositories = true;
            vscode.commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
        }
        else {
            this.disposables.push(this.gitAPI.onDidOpenRepository(async (e) => {
                await e.status();
                if ((0, util_1.repositoryHasGitHubRemote)(e)) {
                    vscode.commands.executeCommand('setContext', 'github.hasGitHubRepo', true);
                    this.hasGitHubRepositories = true;
                }
            }));
        }
        this.disposables.push(this.gitAPI.onDidCloseRepository(() => {
            if (!this.gitAPI.repositories.find(repo => (0, util_1.repositoryHasGitHubRemote)(repo))) {
                this.hasGitHubRepositories = false;
            }
        }));
    }
    ensureShareProviderRegistration() {
        if (vscode.env.appHost !== 'codespaces' && !this.shareProviderRegistration && this._hasGitHubRepositories) {
            const shareProviderRegistration = vscode.window.registerShareProvider({ scheme: 'file' }, this);
            this.shareProviderRegistration = shareProviderRegistration;
            this.disposables.push(shareProviderRegistration);
        }
        else if (this.shareProviderRegistration && !this._hasGitHubRepositories) {
            this.shareProviderRegistration.dispose();
            this.shareProviderRegistration = undefined;
        }
    }
    async provideShare(item, _token) {
        const repository = (0, links_1.getRepositoryForFile)(this.gitAPI, item.resourceUri);
        if (!repository) {
            return;
        }
        await (0, links_1.ensurePublished)(repository, item.resourceUri);
        let repo;
        repository.state.remotes.find(remote => {
            if (remote.fetchUrl) {
                const foundRepo = (0, util_1.getRepositoryFromUrl)(remote.fetchUrl);
                if (foundRepo && (remote.name === repository.state.HEAD?.upstream?.remote)) {
                    repo = foundRepo;
                    return;
                }
                else if (foundRepo && !repo) {
                    repo = foundRepo;
                }
            }
            return;
        });
        if (!repo) {
            return;
        }
        const blobSegment = repository?.state.HEAD?.name ? (0, links_1.encodeURIComponentExceptSlashes)(repository.state.HEAD?.name) : repository?.state.HEAD?.commit;
        const filepathSegment = (0, links_1.encodeURIComponentExceptSlashes)(item.resourceUri.path.substring(repository?.rootUri.path.length));
        const rangeSegment = getRangeSegment(item);
        return vscode.Uri.parse(`${this.getVscodeDevHost()}/${repo.owner}/${repo.repo}/blob/${blobSegment}${filepathSegment}${rangeSegment}`);
    }
    getVscodeDevHost() {
        return `https://${vscode.env.appName.toLowerCase().includes('insiders') ? 'insiders.' : ''}vscode.dev/github`;
    }
}
exports.VscodeDevShareProvider = VscodeDevShareProvider;
function getRangeSegment(item) {
    if (item.resourceUri.scheme === 'vscode-notebook-cell') {
        const notebookEditor = vscode.window.visibleNotebookEditors.find(editor => editor.notebook.uri.fsPath === item.resourceUri.fsPath);
        const cell = notebookEditor?.notebook.getCells().find(cell => cell.document.uri.fragment === item.resourceUri?.fragment);
        const cellIndex = cell?.index ?? notebookEditor?.selection.start;
        return (0, links_1.notebookCellRangeString)(cellIndex, item.selection);
    }
    return (0, links_1.rangeString)(item.selection);
}
//# sourceMappingURL=shareProviders.js.map