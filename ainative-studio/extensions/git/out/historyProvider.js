"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHistoryProvider = void 0;
const vscode_1 = require("vscode");
const repository_1 = require("./repository");
const util_1 = require("./util");
const uri_1 = require("./uri");
const emoji_1 = require("./emoji");
const historyItemDetailsProvider_1 = require("./historyItemDetailsProvider");
function toSourceControlHistoryItemRef(repository, ref) {
    const rootUri = vscode_1.Uri.file(repository.root);
    switch (ref.type) {
        case 1 /* RefType.RemoteHead */:
            return {
                id: `refs/remotes/${ref.name}`,
                name: ref.name ?? '',
                description: ref.commit ? vscode_1.l10n.t('Remote branch at {0}', (0, util_1.getCommitShortHash)(rootUri, ref.commit)) : undefined,
                revision: ref.commit,
                icon: new vscode_1.ThemeIcon('cloud'),
                category: vscode_1.l10n.t('remote branches')
            };
        case 2 /* RefType.Tag */:
            return {
                id: `refs/tags/${ref.name}`,
                name: ref.name ?? '',
                description: ref.commit ? vscode_1.l10n.t('Tag at {0}', (0, util_1.getCommitShortHash)(rootUri, ref.commit)) : undefined,
                revision: ref.commit,
                icon: new vscode_1.ThemeIcon('tag'),
                category: vscode_1.l10n.t('tags')
            };
        default:
            return {
                id: `refs/heads/${ref.name}`,
                name: ref.name ?? '',
                description: ref.commit ? (0, util_1.getCommitShortHash)(rootUri, ref.commit) : undefined,
                revision: ref.commit,
                icon: new vscode_1.ThemeIcon('git-branch'),
                category: vscode_1.l10n.t('branches')
            };
    }
}
function compareSourceControlHistoryItemRef(ref1, ref2) {
    const getOrder = (ref) => {
        if (ref.id.startsWith('refs/heads/')) {
            return 1;
        }
        else if (ref.id.startsWith('refs/remotes/')) {
            return 2;
        }
        else if (ref.id.startsWith('refs/tags/')) {
            return 3;
        }
        return 99;
    };
    const ref1Order = getOrder(ref1);
    const ref2Order = getOrder(ref2);
    if (ref1Order !== ref2Order) {
        return ref1Order - ref2Order;
    }
    return ref1.name.localeCompare(ref2.name);
}
class GitHistoryProvider {
    get currentHistoryItemRef() { return this._currentHistoryItemRef; }
    get currentHistoryItemRemoteRef() { return this._currentHistoryItemRemoteRef; }
    get currentHistoryItemBaseRef() { return this._currentHistoryItemBaseRef; }
    constructor(historyItemDetailProviderRegistry, repository, logger) {
        this.historyItemDetailProviderRegistry = historyItemDetailProviderRegistry;
        this.repository = repository;
        this.logger = logger;
        this._onDidChangeDecorations = new vscode_1.EventEmitter();
        this.onDidChangeFileDecorations = this._onDidChangeDecorations.event;
        this._onDidChangeCurrentHistoryItemRefs = new vscode_1.EventEmitter();
        this.onDidChangeCurrentHistoryItemRefs = this._onDidChangeCurrentHistoryItemRefs.event;
        this._onDidChangeHistoryItemRefs = new vscode_1.EventEmitter();
        this.onDidChangeHistoryItemRefs = this._onDidChangeHistoryItemRefs.event;
        this._historyItemRefs = [];
        this.historyItemDecorations = new Map();
        this.disposables = [];
        const onDidRunWriteOperation = (0, util_1.filterEvent)(repository.onDidRunOperation, e => !e.operation.readOnly);
        this.disposables.push(onDidRunWriteOperation(this.onDidRunWriteOperation, this));
        this.disposables.push(vscode_1.window.registerFileDecorationProvider(this));
    }
    async onDidRunWriteOperation(result) {
        if (!this.repository.HEAD) {
            this.logger.trace('[GitHistoryProvider][onDidRunWriteOperation] repository.HEAD is undefined');
            this._currentHistoryItemRef = this._currentHistoryItemRemoteRef = this._currentHistoryItemBaseRef = undefined;
            this._onDidChangeCurrentHistoryItemRefs.fire();
            return;
        }
        // Refs (alphabetically)
        const historyItemRefs = this.repository.refs
            .map(ref => toSourceControlHistoryItemRef(this.repository, ref))
            .sort((a, b) => a.id.localeCompare(b.id));
        const delta = (0, util_1.deltaHistoryItemRefs)(this._historyItemRefs, historyItemRefs);
        this._historyItemRefs = historyItemRefs;
        let historyItemRefId = '';
        let historyItemRefName = '';
        switch (this.repository.HEAD.type) {
            case 0 /* RefType.Head */: {
                if (this.repository.HEAD.name !== undefined) {
                    // Branch
                    historyItemRefId = `refs/heads/${this.repository.HEAD.name}`;
                    historyItemRefName = this.repository.HEAD.name;
                    // Remote
                    if (this.repository.HEAD.upstream) {
                        if (this.repository.HEAD.upstream.remote === '.') {
                            // Local branch
                            this._currentHistoryItemRemoteRef = {
                                id: `refs/heads/${this.repository.HEAD.upstream.name}`,
                                name: this.repository.HEAD.upstream.name,
                                revision: this.repository.HEAD.upstream.commit,
                                icon: new vscode_1.ThemeIcon('gi-branch')
                            };
                        }
                        else {
                            // Remote branch
                            this._currentHistoryItemRemoteRef = {
                                id: `refs/remotes/${this.repository.HEAD.upstream.remote}/${this.repository.HEAD.upstream.name}`,
                                name: `${this.repository.HEAD.upstream.remote}/${this.repository.HEAD.upstream.name}`,
                                revision: this.repository.HEAD.upstream.commit,
                                icon: new vscode_1.ThemeIcon('cloud')
                            };
                        }
                    }
                    else {
                        this._currentHistoryItemRemoteRef = undefined;
                    }
                    // Base
                    if (this._HEAD?.name !== this.repository.HEAD.name) {
                        // Compute base if the branch has changed
                        const mergeBase = await this.resolveHEADMergeBase();
                        this._currentHistoryItemBaseRef = mergeBase && mergeBase.name && mergeBase.remote &&
                            (mergeBase.remote !== this.repository.HEAD.upstream?.remote ||
                                mergeBase.name !== this.repository.HEAD.upstream?.name) ? {
                            id: `refs/remotes/${mergeBase.remote}/${mergeBase.name}`,
                            name: `${mergeBase.remote}/${mergeBase.name}`,
                            revision: mergeBase.commit,
                            icon: new vscode_1.ThemeIcon('cloud')
                        } : undefined;
                    }
                    else {
                        // Update base revision if it has changed
                        const mergeBaseModified = delta.modified
                            .find(ref => ref.id === this._currentHistoryItemBaseRef?.id);
                        if (this._currentHistoryItemBaseRef && mergeBaseModified) {
                            this._currentHistoryItemBaseRef = {
                                ...this._currentHistoryItemBaseRef,
                                revision: mergeBaseModified.revision
                            };
                        }
                    }
                }
                else {
                    // Detached commit
                    historyItemRefId = this.repository.HEAD.commit ?? '';
                    historyItemRefName = this.repository.HEAD.commit ?? '';
                    this._currentHistoryItemRemoteRef = undefined;
                    this._currentHistoryItemBaseRef = undefined;
                }
                break;
            }
            case 2 /* RefType.Tag */: {
                // Tag
                historyItemRefId = `refs/tags/${this.repository.HEAD.name}`;
                historyItemRefName = this.repository.HEAD.name ?? this.repository.HEAD.commit ?? '';
                this._currentHistoryItemRemoteRef = undefined;
                this._currentHistoryItemBaseRef = undefined;
                break;
            }
        }
        this._HEAD = this.repository.HEAD;
        this._currentHistoryItemRef = {
            id: historyItemRefId,
            name: historyItemRefName,
            revision: this.repository.HEAD.commit,
            icon: new vscode_1.ThemeIcon('target'),
        };
        this._onDidChangeCurrentHistoryItemRefs.fire();
        this.logger.trace(`[GitHistoryProvider][onDidRunWriteOperation] currentHistoryItemRef: ${JSON.stringify(this._currentHistoryItemRef)}`);
        this.logger.trace(`[GitHistoryProvider][onDidRunWriteOperation] currentHistoryItemRemoteRef: ${JSON.stringify(this._currentHistoryItemRemoteRef)}`);
        this.logger.trace(`[GitHistoryProvider][onDidRunWriteOperation] currentHistoryItemBaseRef: ${JSON.stringify(this._currentHistoryItemBaseRef)}`);
        // Auto-fetch
        const silent = result.operation.kind === "Fetch" /* OperationKind.Fetch */ && result.operation.showProgress === false;
        this._onDidChangeHistoryItemRefs.fire({ ...delta, silent });
        const deltaLog = {
            added: delta.added.map(ref => ref.id),
            modified: delta.modified.map(ref => ref.id),
            removed: delta.removed.map(ref => ref.id),
            silent
        };
        this.logger.trace(`[GitHistoryProvider][onDidRunWriteOperation] historyItemRefs: ${JSON.stringify(deltaLog)}`);
    }
    async provideHistoryItemRefs(historyItemRefs) {
        const refs = await this.repository.getRefs({ pattern: historyItemRefs });
        const branches = [];
        const remoteBranches = [];
        const tags = [];
        for (const ref of refs) {
            switch (ref.type) {
                case 1 /* RefType.RemoteHead */:
                    remoteBranches.push(toSourceControlHistoryItemRef(this.repository, ref));
                    break;
                case 2 /* RefType.Tag */:
                    tags.push(toSourceControlHistoryItemRef(this.repository, ref));
                    break;
                default:
                    branches.push(toSourceControlHistoryItemRef(this.repository, ref));
                    break;
            }
        }
        return [...branches, ...remoteBranches, ...tags];
    }
    async provideHistoryItems(options) {
        if (!this.currentHistoryItemRef || !options.historyItemRefs) {
            return [];
        }
        // Deduplicate refNames
        const refNames = Array.from(new Set(options.historyItemRefs));
        let logOptions = { refNames, shortStats: true };
        try {
            if (options.limit === undefined || typeof options.limit === 'number') {
                logOptions = { ...logOptions, maxEntries: options.limit ?? 50 };
            }
            else if (typeof options.limit.id === 'string') {
                // Get the common ancestor commit, and commits
                const commit = await this.repository.getCommit(options.limit.id);
                const commitParentId = commit.parents.length > 0 ? commit.parents[0] : await this.repository.getEmptyTree();
                logOptions = { ...logOptions, range: `${commitParentId}..` };
            }
            if (typeof options.skip === 'number') {
                logOptions = { ...logOptions, skip: options.skip };
            }
            const commits = await this.repository.log({ ...logOptions, silent: true });
            // Avatars
            const avatarQuery = {
                commits: commits.map(c => ({
                    hash: c.hash,
                    authorName: c.authorName,
                    authorEmail: c.authorEmail
                })),
                size: 20
            };
            const commitAvatars = await (0, historyItemDetailsProvider_1.provideSourceControlHistoryItemAvatar)(this.historyItemDetailProviderRegistry, this.repository, avatarQuery);
            await (0, emoji_1.ensureEmojis)();
            const historyItems = [];
            for (const commit of commits) {
                const message = (0, emoji_1.emojify)(commit.message);
                const messageWithLinks = await (0, historyItemDetailsProvider_1.provideSourceControlHistoryItemMessageLinks)(this.historyItemDetailProviderRegistry, this.repository, message) ?? message;
                const newLineIndex = message.indexOf('\n');
                const subject = newLineIndex !== -1
                    ? `${message.substring(0, newLineIndex)}\u2026`
                    : message;
                const avatarUrl = commitAvatars?.get(commit.hash);
                const references = this._resolveHistoryItemRefs(commit);
                historyItems.push({
                    id: commit.hash,
                    parentIds: commit.parents,
                    subject,
                    message: messageWithLinks,
                    author: commit.authorName,
                    authorEmail: commit.authorEmail,
                    authorIcon: avatarUrl ? vscode_1.Uri.parse(avatarUrl) : new vscode_1.ThemeIcon('account'),
                    displayId: (0, util_1.getCommitShortHash)(vscode_1.Uri.file(this.repository.root), commit.hash),
                    timestamp: commit.authorDate?.getTime(),
                    statistics: commit.shortStat ?? { files: 0, insertions: 0, deletions: 0 },
                    references: references.length !== 0 ? references : undefined
                });
            }
            return historyItems;
        }
        catch (err) {
            this.logger.error(`[GitHistoryProvider][provideHistoryItems] Failed to get history items with options '${JSON.stringify(options)}': ${err}`);
            return [];
        }
    }
    async provideHistoryItemChanges(historyItemId, historyItemParentId) {
        historyItemParentId = historyItemParentId ?? await this.repository.getEmptyTree();
        const historyItemChangesUri = [];
        const historyItemChanges = [];
        const changes = await this.repository.diffTrees(historyItemParentId, historyItemId);
        for (const change of changes) {
            const historyItemUri = change.uri.with({
                query: `ref=${historyItemId}`
            });
            // History item change
            historyItemChanges.push({
                uri: historyItemUri,
                ...(0, uri_1.toMultiFileDiffEditorUris)(change, historyItemParentId, historyItemId)
            });
            // History item change decoration
            const letter = repository_1.Resource.getStatusLetter(change.status);
            const tooltip = repository_1.Resource.getStatusText(change.status);
            const color = repository_1.Resource.getStatusColor(change.status);
            const fileDecoration = new vscode_1.FileDecoration(letter, tooltip, color);
            this.historyItemDecorations.set(historyItemUri.toString(), fileDecoration);
            historyItemChangesUri.push(historyItemUri);
        }
        this._onDidChangeDecorations.fire(historyItemChangesUri);
        return historyItemChanges;
    }
    async resolveHistoryItemRefsCommonAncestor(historyItemRefs) {
        try {
            if (historyItemRefs.length === 0) {
                // TODO@lszomoru - log
                return undefined;
            }
            else if (historyItemRefs.length === 1 && historyItemRefs[0] === this.currentHistoryItemRef?.id) {
                // Remote
                if (this.currentHistoryItemRemoteRef) {
                    const ancestor = await this.repository.getMergeBase(historyItemRefs[0], this.currentHistoryItemRemoteRef.id);
                    return ancestor;
                }
                // Base
                if (this.currentHistoryItemBaseRef) {
                    const ancestor = await this.repository.getMergeBase(historyItemRefs[0], this.currentHistoryItemBaseRef.id);
                    return ancestor;
                }
                // First commit
                const commits = await this.repository.log({ maxParents: 0, refNames: ['HEAD'] });
                if (commits.length > 0) {
                    return commits[0].hash;
                }
            }
            else if (historyItemRefs.length > 1) {
                const ancestor = await this.repository.getMergeBase(historyItemRefs[0], historyItemRefs[1], ...historyItemRefs.slice(2));
                return ancestor;
            }
        }
        catch (err) {
            this.logger.error(`[GitHistoryProvider][resolveHistoryItemRefsCommonAncestor] Failed to resolve common ancestor for ${historyItemRefs.join(',')}: ${err}`);
        }
        return undefined;
    }
    provideFileDecoration(uri) {
        return this.historyItemDecorations.get(uri.toString());
    }
    _resolveHistoryItemRefs(commit) {
        const references = [];
        for (const ref of commit.refNames) {
            if (ref === 'refs/remotes/origin/HEAD') {
                continue;
            }
            switch (true) {
                case ref.startsWith('HEAD -> refs/heads/'):
                    references.push({
                        id: ref.substring('HEAD -> '.length),
                        name: ref.substring('HEAD -> refs/heads/'.length),
                        revision: commit.hash,
                        category: vscode_1.l10n.t('branches'),
                        icon: new vscode_1.ThemeIcon('target')
                    });
                    break;
                case ref.startsWith('refs/heads/'):
                    references.push({
                        id: ref,
                        name: ref.substring('refs/heads/'.length),
                        revision: commit.hash,
                        category: vscode_1.l10n.t('branches'),
                        icon: new vscode_1.ThemeIcon('git-branch')
                    });
                    break;
                case ref.startsWith('refs/remotes/'):
                    references.push({
                        id: ref,
                        name: ref.substring('refs/remotes/'.length),
                        revision: commit.hash,
                        category: vscode_1.l10n.t('remote branches'),
                        icon: new vscode_1.ThemeIcon('cloud')
                    });
                    break;
                case ref.startsWith('tag: refs/tags/'):
                    references.push({
                        id: ref.substring('tag: '.length),
                        name: ref.substring('tag: refs/tags/'.length),
                        revision: commit.hash,
                        category: vscode_1.l10n.t('tags'),
                        icon: new vscode_1.ThemeIcon('tag')
                    });
                    break;
            }
        }
        return references.sort(compareSourceControlHistoryItemRef);
    }
    async resolveHEADMergeBase() {
        try {
            if (this.repository.HEAD?.type !== 0 /* RefType.Head */ || !this.repository.HEAD?.name) {
                return undefined;
            }
            const mergeBase = await this.repository.getBranchBase(this.repository.HEAD.name);
            return mergeBase;
        }
        catch (err) {
            this.logger.error(`[GitHistoryProvider][resolveHEADMergeBase] Failed to resolve merge base for ${this.repository.HEAD?.name}: ${err}`);
            return undefined;
        }
    }
    dispose() {
        (0, util_1.dispose)(this.disposables);
    }
}
exports.GitHistoryProvider = GitHistoryProvider;
//# sourceMappingURL=historyProvider.js.map