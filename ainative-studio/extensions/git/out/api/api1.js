"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ApiInputBox_inputBox, _ApiChange_resource, _ApiRepositoryState_repository, _ApiRepositoryUIState_sourceControl, _ApiRepository_repository, _ApiGit_model, _ApiImpl_model;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiImpl = exports.ApiGit = exports.ApiRepository = exports.ApiRepositoryUIState = exports.ApiRepositoryState = exports.ApiChange = void 0;
exports.registerAPICommands = registerAPICommands;
const vscode_1 = require("vscode");
const util_1 = require("../util");
const uri_1 = require("../uri");
const git_base_1 = require("../git-base");
class ApiInputBox {
    constructor(inputBox) {
        _ApiInputBox_inputBox.set(this, void 0);
        __classPrivateFieldSet(this, _ApiInputBox_inputBox, inputBox, "f");
    }
    set value(value) { __classPrivateFieldGet(this, _ApiInputBox_inputBox, "f").value = value; }
    get value() { return __classPrivateFieldGet(this, _ApiInputBox_inputBox, "f").value; }
}
_ApiInputBox_inputBox = new WeakMap();
class ApiChange {
    constructor(resource) {
        _ApiChange_resource.set(this, void 0);
        __classPrivateFieldSet(this, _ApiChange_resource, resource, "f");
    }
    get uri() { return __classPrivateFieldGet(this, _ApiChange_resource, "f").resourceUri; }
    get originalUri() { return __classPrivateFieldGet(this, _ApiChange_resource, "f").original; }
    get renameUri() { return __classPrivateFieldGet(this, _ApiChange_resource, "f").renameResourceUri; }
    get status() { return __classPrivateFieldGet(this, _ApiChange_resource, "f").type; }
}
exports.ApiChange = ApiChange;
_ApiChange_resource = new WeakMap();
class ApiRepositoryState {
    constructor(repository) {
        _ApiRepositoryState_repository.set(this, void 0);
        __classPrivateFieldSet(this, _ApiRepositoryState_repository, repository, "f");
        this.onDidChange = __classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").onDidRunGitStatus;
    }
    get HEAD() { return __classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").HEAD; }
    /**
     * @deprecated Use ApiRepository.getRefs() instead.
     */
    get refs() { console.warn('Deprecated. Use ApiRepository.getRefs() instead.'); return []; }
    get remotes() { return [...__classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").remotes]; }
    get submodules() { return [...__classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").submodules]; }
    get rebaseCommit() { return __classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").rebaseCommit; }
    get mergeChanges() { return __classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").mergeGroup.resourceStates.map(r => new ApiChange(r)); }
    get indexChanges() { return __classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").indexGroup.resourceStates.map(r => new ApiChange(r)); }
    get workingTreeChanges() { return __classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").workingTreeGroup.resourceStates.map(r => new ApiChange(r)); }
    get untrackedChanges() { return __classPrivateFieldGet(this, _ApiRepositoryState_repository, "f").untrackedGroup.resourceStates.map(r => new ApiChange(r)); }
}
exports.ApiRepositoryState = ApiRepositoryState;
_ApiRepositoryState_repository = new WeakMap();
class ApiRepositoryUIState {
    constructor(sourceControl) {
        _ApiRepositoryUIState_sourceControl.set(this, void 0);
        __classPrivateFieldSet(this, _ApiRepositoryUIState_sourceControl, sourceControl, "f");
        this.onDidChange = (0, util_1.mapEvent)(__classPrivateFieldGet(this, _ApiRepositoryUIState_sourceControl, "f").onDidChangeSelection, () => null);
    }
    get selected() { return __classPrivateFieldGet(this, _ApiRepositoryUIState_sourceControl, "f").selected; }
}
exports.ApiRepositoryUIState = ApiRepositoryUIState;
_ApiRepositoryUIState_sourceControl = new WeakMap();
class ApiRepository {
    constructor(repository) {
        _ApiRepository_repository.set(this, void 0);
        __classPrivateFieldSet(this, _ApiRepository_repository, repository, "f");
        this.rootUri = vscode_1.Uri.file(__classPrivateFieldGet(this, _ApiRepository_repository, "f").root);
        this.inputBox = new ApiInputBox(__classPrivateFieldGet(this, _ApiRepository_repository, "f").inputBox);
        this.state = new ApiRepositoryState(__classPrivateFieldGet(this, _ApiRepository_repository, "f"));
        this.ui = new ApiRepositoryUIState(__classPrivateFieldGet(this, _ApiRepository_repository, "f").sourceControl);
        this.onDidCommit = (0, util_1.mapEvent)((0, util_1.filterEvent)(__classPrivateFieldGet(this, _ApiRepository_repository, "f").onDidRunOperation, e => e.operation.kind === "Commit" /* OperationKind.Commit */), () => null);
        this.onDidCheckout = (0, util_1.mapEvent)((0, util_1.filterEvent)(__classPrivateFieldGet(this, _ApiRepository_repository, "f").onDidRunOperation, e => e.operation.kind === "Checkout" /* OperationKind.Checkout */ || e.operation.kind === "CheckoutTracking" /* OperationKind.CheckoutTracking */), () => null);
    }
    apply(patch, reverse) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").apply(patch, reverse);
    }
    getConfigs() {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getConfigs();
    }
    getConfig(key) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getConfig(key);
    }
    setConfig(key, value) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").setConfig(key, value);
    }
    unsetConfig(key) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").unsetConfig(key);
    }
    getGlobalConfig(key) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getGlobalConfig(key);
    }
    getObjectDetails(treeish, path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getObjectDetails(treeish, path);
    }
    detectObjectType(object) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").detectObjectType(object);
    }
    buffer(ref, filePath) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").buffer(ref, filePath);
    }
    show(ref, path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").show(ref, path);
    }
    getCommit(ref) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getCommit(ref);
    }
    add(paths) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").add(paths.map(p => vscode_1.Uri.file(p)));
    }
    revert(paths) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").revert(paths.map(p => vscode_1.Uri.file(p)));
    }
    clean(paths) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").clean(paths.map(p => vscode_1.Uri.file(p)));
    }
    diff(cached) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").diff(cached);
    }
    diffWithHEAD(path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").diffWithHEAD(path);
    }
    diffWith(ref, path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").diffWith(ref, path);
    }
    diffIndexWithHEAD(path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").diffIndexWithHEAD(path);
    }
    diffIndexWith(ref, path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").diffIndexWith(ref, path);
    }
    diffBlobs(object1, object2) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").diffBlobs(object1, object2);
    }
    diffBetween(ref1, ref2, path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").diffBetween(ref1, ref2, path);
    }
    hashObject(data) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").hashObject(data);
    }
    createBranch(name, checkout, ref) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").branch(name, checkout, ref);
    }
    deleteBranch(name, force) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").deleteBranch(name, force);
    }
    getBranch(name) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getBranch(name);
    }
    getBranches(query, cancellationToken) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getBranches(query, cancellationToken);
    }
    getBranchBase(name) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getBranchBase(name);
    }
    setBranchUpstream(name, upstream) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").setBranchUpstream(name, upstream);
    }
    getRefs(query, cancellationToken) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getRefs(query, cancellationToken);
    }
    checkIgnore(paths) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").checkIgnore(paths);
    }
    getMergeBase(ref1, ref2) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").getMergeBase(ref1, ref2);
    }
    tag(name, message, ref) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").tag({ name, message, ref });
    }
    deleteTag(name) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").deleteTag(name);
    }
    status() {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").status();
    }
    checkout(treeish) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").checkout(treeish);
    }
    addRemote(name, url) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").addRemote(name, url);
    }
    removeRemote(name) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").removeRemote(name);
    }
    renameRemote(name, newName) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").renameRemote(name, newName);
    }
    fetch(arg0, ref, depth, prune) {
        if (arg0 !== undefined && typeof arg0 !== 'string') {
            return __classPrivateFieldGet(this, _ApiRepository_repository, "f").fetch(arg0);
        }
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").fetch({ remote: arg0, ref, depth, prune });
    }
    pull(unshallow) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").pull(undefined, unshallow);
    }
    push(remoteName, branchName, setUpstream = false, force) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").pushTo(remoteName, branchName, setUpstream, force);
    }
    blame(path) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").blame(path);
    }
    log(options) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").log(options);
    }
    commit(message, opts) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").commit(message, { ...opts, postCommitCommand: null });
    }
    merge(ref) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").merge(ref);
    }
    mergeAbort() {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").mergeAbort();
    }
    applyStash(index) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").applyStash(index);
    }
    popStash(index) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").popStash(index);
    }
    dropStash(index) {
        return __classPrivateFieldGet(this, _ApiRepository_repository, "f").dropStash(index);
    }
}
exports.ApiRepository = ApiRepository;
_ApiRepository_repository = new WeakMap();
class ApiGit {
    constructor(model) {
        _ApiGit_model.set(this, void 0);
        __classPrivateFieldSet(this, _ApiGit_model, model, "f");
    }
    get path() { return __classPrivateFieldGet(this, _ApiGit_model, "f").git.path; }
    get env() {
        if (this._env === undefined) {
            this._env = Object.freeze(__classPrivateFieldGet(this, _ApiGit_model, "f").git.env);
        }
        return this._env;
    }
}
exports.ApiGit = ApiGit;
_ApiGit_model = new WeakMap();
class ApiImpl {
    constructor(model) {
        _ApiImpl_model.set(this, void 0);
        __classPrivateFieldSet(this, _ApiImpl_model, model, "f");
        this.git = new ApiGit(__classPrivateFieldGet(this, _ApiImpl_model, "f"));
    }
    get state() {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").state;
    }
    get onDidChangeState() {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").onDidChangeState;
    }
    get onDidPublish() {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").onDidPublish;
    }
    get onDidOpenRepository() {
        return (0, util_1.mapEvent)(__classPrivateFieldGet(this, _ApiImpl_model, "f").onDidOpenRepository, r => new ApiRepository(r));
    }
    get onDidCloseRepository() {
        return (0, util_1.mapEvent)(__classPrivateFieldGet(this, _ApiImpl_model, "f").onDidCloseRepository, r => new ApiRepository(r));
    }
    get repositories() {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").repositories.map(r => new ApiRepository(r));
    }
    toGitUri(uri, ref) {
        return (0, uri_1.toGitUri)(uri, ref);
    }
    getRepository(uri) {
        const result = __classPrivateFieldGet(this, _ApiImpl_model, "f").getRepository(uri);
        return result ? new ApiRepository(result) : null;
    }
    async init(root, options) {
        const path = root.fsPath;
        await __classPrivateFieldGet(this, _ApiImpl_model, "f").git.init(path, options);
        await __classPrivateFieldGet(this, _ApiImpl_model, "f").openRepository(path);
        return this.getRepository(root) || null;
    }
    async openRepository(root) {
        if (root.scheme !== 'file') {
            return null;
        }
        await __classPrivateFieldGet(this, _ApiImpl_model, "f").openRepository(root.fsPath);
        return this.getRepository(root) || null;
    }
    registerRemoteSourceProvider(provider) {
        const disposables = [];
        if (provider.publishRepository) {
            disposables.push(__classPrivateFieldGet(this, _ApiImpl_model, "f").registerRemoteSourcePublisher(provider));
        }
        disposables.push(git_base_1.GitBaseApi.getAPI().registerRemoteSourceProvider(provider));
        return (0, util_1.combinedDisposable)(disposables);
    }
    registerRemoteSourcePublisher(publisher) {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").registerRemoteSourcePublisher(publisher);
    }
    registerCredentialsProvider(provider) {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").registerCredentialsProvider(provider);
    }
    registerPostCommitCommandsProvider(provider) {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").registerPostCommitCommandsProvider(provider);
    }
    registerPushErrorHandler(handler) {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").registerPushErrorHandler(handler);
    }
    registerSourceControlHistoryItemDetailsProvider(provider) {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").registerSourceControlHistoryItemDetailsProvider(provider);
    }
    registerBranchProtectionProvider(root, provider) {
        return __classPrivateFieldGet(this, _ApiImpl_model, "f").registerBranchProtectionProvider(root, provider);
    }
}
exports.ApiImpl = ApiImpl;
_ApiImpl_model = new WeakMap();
function getRefType(type) {
    switch (type) {
        case 0 /* RefType.Head */: return 'Head';
        case 1 /* RefType.RemoteHead */: return 'RemoteHead';
        case 2 /* RefType.Tag */: return 'Tag';
    }
    return 'unknown';
}
function getStatus(status) {
    switch (status) {
        case 0 /* Status.INDEX_MODIFIED */: return 'INDEX_MODIFIED';
        case 1 /* Status.INDEX_ADDED */: return 'INDEX_ADDED';
        case 2 /* Status.INDEX_DELETED */: return 'INDEX_DELETED';
        case 3 /* Status.INDEX_RENAMED */: return 'INDEX_RENAMED';
        case 4 /* Status.INDEX_COPIED */: return 'INDEX_COPIED';
        case 5 /* Status.MODIFIED */: return 'MODIFIED';
        case 6 /* Status.DELETED */: return 'DELETED';
        case 7 /* Status.UNTRACKED */: return 'UNTRACKED';
        case 8 /* Status.IGNORED */: return 'IGNORED';
        case 9 /* Status.INTENT_TO_ADD */: return 'INTENT_TO_ADD';
        case 10 /* Status.INTENT_TO_RENAME */: return 'INTENT_TO_RENAME';
        case 11 /* Status.TYPE_CHANGED */: return 'TYPE_CHANGED';
        case 12 /* Status.ADDED_BY_US */: return 'ADDED_BY_US';
        case 13 /* Status.ADDED_BY_THEM */: return 'ADDED_BY_THEM';
        case 14 /* Status.DELETED_BY_US */: return 'DELETED_BY_US';
        case 15 /* Status.DELETED_BY_THEM */: return 'DELETED_BY_THEM';
        case 16 /* Status.BOTH_ADDED */: return 'BOTH_ADDED';
        case 17 /* Status.BOTH_DELETED */: return 'BOTH_DELETED';
        case 18 /* Status.BOTH_MODIFIED */: return 'BOTH_MODIFIED';
    }
    return 'UNKNOWN';
}
function registerAPICommands(extension) {
    const disposables = [];
    disposables.push(vscode_1.commands.registerCommand('git.api.getRepositories', () => {
        const api = extension.getAPI(1);
        return api.repositories.map(r => r.rootUri.toString());
    }));
    disposables.push(vscode_1.commands.registerCommand('git.api.getRepositoryState', (uri) => {
        const api = extension.getAPI(1);
        const repository = api.getRepository(vscode_1.Uri.parse(uri));
        if (!repository) {
            return null;
        }
        const state = repository.state;
        const ref = (ref) => (ref && { ...ref, type: getRefType(ref.type) });
        const change = (change) => ({
            uri: change.uri.toString(),
            originalUri: change.originalUri.toString(),
            renameUri: change.renameUri?.toString(),
            status: getStatus(change.status)
        });
        return {
            HEAD: ref(state.HEAD),
            refs: state.refs.map(ref),
            remotes: state.remotes,
            submodules: state.submodules,
            rebaseCommit: state.rebaseCommit,
            mergeChanges: state.mergeChanges.map(change),
            indexChanges: state.indexChanges.map(change),
            workingTreeChanges: state.workingTreeChanges.map(change)
        };
    }));
    disposables.push(vscode_1.commands.registerCommand('git.api.getRemoteSources', (opts) => {
        return vscode_1.commands.executeCommand('git-base.api.getRemoteSources', opts);
    }));
    return vscode_1.Disposable.from(...disposables);
}
//# sourceMappingURL=api1.js.map