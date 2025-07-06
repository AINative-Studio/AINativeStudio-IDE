"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubRemoteSourceProvider = void 0;
const vscode_1 = require("vscode");
const auth_1 = require("./auth");
const util_1 = require("./util");
const links_1 = require("./links");
function asRemoteSource(raw) {
    const protocol = vscode_1.workspace.getConfiguration('github').get('gitProtocol');
    return {
        name: `$(github) ${raw.full_name}`,
        description: `${raw.stargazers_count > 0 ? `$(star-full) ${raw.stargazers_count}` : ''}`,
        detail: raw.description || undefined,
        url: protocol === 'https' ? raw.clone_url : raw.ssh_url
    };
}
class GithubRemoteSourceProvider {
    constructor() {
        this.name = 'GitHub';
        this.icon = 'github';
        this.supportsQuery = true;
        this.userReposCache = [];
    }
    async getRemoteSources(query) {
        const octokit = await (0, auth_1.getOctokit)();
        if (query) {
            const repository = (0, util_1.getRepositoryFromUrl)(query);
            if (repository) {
                const raw = await octokit.repos.get(repository);
                return [asRemoteSource(raw.data)];
            }
        }
        const all = await Promise.all([
            this.getQueryRemoteSources(octokit, query),
            this.getUserRemoteSources(octokit, query),
        ]);
        const map = new Map();
        for (const group of all) {
            for (const remoteSource of group) {
                map.set(remoteSource.name, remoteSource);
            }
        }
        return [...map.values()];
    }
    async getUserRemoteSources(octokit, query) {
        if (!query) {
            const user = await octokit.users.getAuthenticated({});
            const username = user.data.login;
            const res = await octokit.repos.listForAuthenticatedUser({ username, sort: 'updated', per_page: 100 });
            this.userReposCache = res.data.map(asRemoteSource);
        }
        return this.userReposCache;
    }
    async getQueryRemoteSources(octokit, query) {
        if (!query) {
            return [];
        }
        const repository = (0, util_1.getRepositoryFromQuery)(query);
        if (repository) {
            query = `user:${repository.owner}+${repository.repo}`;
        }
        query += ` fork:true`;
        const raw = await octokit.search.repos({ q: query, sort: 'stars' });
        return raw.data.items.map(asRemoteSource);
    }
    async getBranches(url) {
        const repository = (0, util_1.getRepositoryFromUrl)(url);
        if (!repository) {
            return [];
        }
        const octokit = await (0, auth_1.getOctokit)();
        const branches = [];
        let page = 1;
        while (true) {
            const res = await octokit.repos.listBranches({ ...repository, per_page: 100, page });
            if (res.data.length === 0) {
                break;
            }
            branches.push(...res.data.map(b => b.name));
            page++;
        }
        const repo = await octokit.repos.get(repository);
        const defaultBranch = repo.data.default_branch;
        return branches.sort((a, b) => a === defaultBranch ? -1 : b === defaultBranch ? 1 : 0);
    }
    async getRemoteSourceActions(url) {
        const repository = (0, util_1.getRepositoryFromUrl)(url);
        if (!repository) {
            return [];
        }
        return [{
                label: vscode_1.l10n.t('Open on GitHub'),
                icon: 'github',
                run(branch) {
                    const link = (0, links_1.getBranchLink)(url, branch);
                    vscode_1.env.openExternal(vscode_1.Uri.parse(link));
                }
            }, {
                label: vscode_1.l10n.t('Checkout on vscode.dev'),
                icon: 'globe',
                run(branch) {
                    const link = (0, links_1.getBranchLink)(url, branch, (0, links_1.getVscodeDevHost)());
                    vscode_1.env.openExternal(vscode_1.Uri.parse(link));
                }
            }];
    }
}
exports.GithubRemoteSourceProvider = GithubRemoteSourceProvider;
//# sourceMappingURL=remoteSourceProvider.js.map