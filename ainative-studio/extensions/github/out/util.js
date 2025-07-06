"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequentialize = exports.DisposableStore = void 0;
exports.groupBy = groupBy;
exports.getRepositoryFromUrl = getRepositoryFromUrl;
exports.getRepositoryFromQuery = getRepositoryFromQuery;
exports.repositoryHasGitHubRemote = repositoryHasGitHubRemote;
exports.getRepositoryDefaultRemoteUrl = getRepositoryDefaultRemoteUrl;
exports.getRepositoryDefaultRemote = getRepositoryDefaultRemote;
class DisposableStore {
    constructor() {
        this.disposables = new Set();
    }
    add(disposable) {
        this.disposables.add(disposable);
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.clear();
    }
}
exports.DisposableStore = DisposableStore;
function decorate(decorator) {
    return (_target, key, descriptor) => {
        let fnKey = null;
        let fn = null;
        if (typeof descriptor.value === 'function') {
            fnKey = 'value';
            fn = descriptor.value;
        }
        else if (typeof descriptor.get === 'function') {
            fnKey = 'get';
            fn = descriptor.get;
        }
        if (!fn || !fnKey) {
            throw new Error('not supported');
        }
        descriptor[fnKey] = decorator(fn, key);
    };
}
function _sequentialize(fn, key) {
    const currentKey = `__$sequence$${key}`;
    return function (...args) {
        const currentPromise = this[currentKey] || Promise.resolve(null);
        const run = async () => await fn.apply(this, args);
        this[currentKey] = currentPromise.then(run, run);
        return this[currentKey];
    };
}
exports.sequentialize = decorate(_sequentialize);
function groupBy(data, compare) {
    const result = [];
    let currentGroup = undefined;
    for (const element of data.slice(0).sort(compare)) {
        if (!currentGroup || compare(currentGroup[0], element) !== 0) {
            currentGroup = [element];
            result.push(currentGroup);
        }
        else {
            currentGroup.push(element);
        }
    }
    return result;
}
function getRepositoryFromUrl(url) {
    const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/i.exec(url)
        || /^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/i.exec(url);
    return match ? { owner: match[1], repo: match[2] } : undefined;
}
function getRepositoryFromQuery(query) {
    const match = /^([^/]+)\/([^/]+)$/i.exec(query);
    return match ? { owner: match[1], repo: match[2] } : undefined;
}
function repositoryHasGitHubRemote(repository) {
    return !!repository.state.remotes.find(remote => remote.fetchUrl ? getRepositoryFromUrl(remote.fetchUrl) : undefined);
}
function getRepositoryDefaultRemoteUrl(repository) {
    const remotes = repository.state.remotes
        .filter(remote => remote.fetchUrl && getRepositoryFromUrl(remote.fetchUrl));
    if (remotes.length === 0) {
        return undefined;
    }
    // upstream -> origin -> first
    const remote = remotes.find(remote => remote.name === 'upstream')
        ?? remotes.find(remote => remote.name === 'origin')
        ?? remotes[0];
    return remote.fetchUrl;
}
function getRepositoryDefaultRemote(repository) {
    const fetchUrl = getRepositoryDefaultRemoteUrl(repository);
    return fetchUrl ? getRepositoryFromUrl(fetchUrl) : undefined;
}
//# sourceMappingURL=util.js.map