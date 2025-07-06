"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubCredentialProviderManager = void 0;
const vscode_1 = require("vscode");
const auth_1 = require("./auth");
const EmptyDisposable = { dispose() { } };
class GitHubCredentialProvider {
    async getCredentials(host) {
        if (!/github\.com/i.test(host.authority)) {
            return;
        }
        const session = await (0, auth_1.getSession)();
        return { username: session.account.id, password: session.accessToken };
    }
}
class GithubCredentialProviderManager {
    set enabled(enabled) {
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        if (enabled) {
            this.providerDisposable = this.gitAPI.registerCredentialsProvider(new GitHubCredentialProvider());
        }
        else {
            this.providerDisposable.dispose();
        }
    }
    constructor(gitAPI) {
        this.gitAPI = gitAPI;
        this.providerDisposable = EmptyDisposable;
        this._enabled = false;
        this.disposable = vscode_1.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('github')) {
                this.refresh();
            }
        });
        this.refresh();
    }
    refresh() {
        const config = vscode_1.workspace.getConfiguration('github', null);
        const enabled = config.get('gitAuthentication', true);
        this.enabled = !!enabled;
    }
    dispose() {
        this.enabled = false;
        this.disposable.dispose();
    }
}
exports.GithubCredentialProviderManager = GithubCredentialProviderManager;
//# sourceMappingURL=credentialProvider.js.map