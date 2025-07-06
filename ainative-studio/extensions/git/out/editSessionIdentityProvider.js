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
exports.GitEditSessionIdentityProvider = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
class GitEditSessionIdentityProvider {
    constructor(model) {
        this.model = model;
        this.providerRegistration = vscode.workspace.registerEditSessionIdentityProvider('file', this);
        vscode.workspace.onWillCreateEditSessionIdentity((e) => {
            e.waitUntil(this._onWillCreateEditSessionIdentity(e.workspaceFolder));
        });
    }
    dispose() {
        this.providerRegistration.dispose();
    }
    async provideEditSessionIdentity(workspaceFolder, token) {
        await this.model.openRepository(path.dirname(workspaceFolder.uri.fsPath));
        const repository = this.model.getRepository(workspaceFolder.uri);
        await repository?.status();
        if (!repository || !repository?.HEAD?.upstream) {
            return undefined;
        }
        const remoteUrl = repository.remotes.find((remote) => remote.name === repository.HEAD?.upstream?.remote)?.pushUrl?.replace(/^(git@[^\/:]+)(:)/i, 'ssh://$1/');
        const remote = remoteUrl ? await vscode.workspace.getCanonicalUri(vscode.Uri.parse(remoteUrl), { targetScheme: 'https' }, token) : null;
        return JSON.stringify({
            remote: remote?.toString() ?? remoteUrl,
            ref: repository.HEAD?.upstream?.name ?? null,
            sha: repository.HEAD?.commit ?? null,
        });
    }
    provideEditSessionIdentityMatch(identity1, identity2) {
        try {
            const normalizedIdentity1 = normalizeEditSessionIdentity(identity1);
            const normalizedIdentity2 = normalizeEditSessionIdentity(identity2);
            if (normalizedIdentity1.remote === normalizedIdentity2.remote &&
                normalizedIdentity1.ref === normalizedIdentity2.ref &&
                normalizedIdentity1.sha === normalizedIdentity2.sha) {
                // This is a perfect match
                return vscode.EditSessionIdentityMatch.Complete;
            }
            else if (normalizedIdentity1.remote === normalizedIdentity2.remote &&
                normalizedIdentity1.ref === normalizedIdentity2.ref &&
                normalizedIdentity1.sha !== normalizedIdentity2.sha) {
                // Same branch and remote but different SHA
                return vscode.EditSessionIdentityMatch.Partial;
            }
            else {
                return vscode.EditSessionIdentityMatch.None;
            }
        }
        catch (ex) {
            return vscode.EditSessionIdentityMatch.Partial;
        }
    }
    async _onWillCreateEditSessionIdentity(workspaceFolder) {
        await this._doPublish(workspaceFolder);
    }
    async _doPublish(workspaceFolder) {
        await this.model.openRepository(path.dirname(workspaceFolder.uri.fsPath));
        const repository = this.model.getRepository(workspaceFolder.uri);
        if (!repository) {
            return;
        }
        await repository.status();
        // If this branch hasn't been published to the remote yet,
        // ensure that it is published before Continue On is invoked
        if (!repository.HEAD?.upstream && repository.HEAD?.type === 0 /* RefType.Head */) {
            const publishBranch = vscode.l10n.t('Publish Branch');
            const selection = await vscode.window.showInformationMessage(vscode.l10n.t('The current branch is not published to the remote. Would you like to publish it to access your changes elsewhere?'), { modal: true }, publishBranch);
            if (selection !== publishBranch) {
                throw new vscode.CancellationError();
            }
            await vscode.commands.executeCommand('git.publish');
        }
    }
}
exports.GitEditSessionIdentityProvider = GitEditSessionIdentityProvider;
function normalizeEditSessionIdentity(identity) {
    let { remote, ref, sha } = JSON.parse(identity);
    if (typeof remote === 'string' && remote.endsWith('.git')) {
        remote = remote.slice(0, remote.length - 4);
    }
    return {
        remote,
        ref,
        sha
    };
}
//# sourceMappingURL=editSessionIdentityProvider.js.map