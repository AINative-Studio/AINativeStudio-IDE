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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.CommandCenter = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const unique_names_generator_1 = require("@joaomoreno/unique-names-generator");
const repository_1 = require("./repository");
const staging_1 = require("./staging");
const uri_1 = require("./uri");
const util_1 = require("./util");
const timelineProvider_1 = require("./timelineProvider");
const api1_1 = require("./api/api1");
const remoteSource_1 = require("./remoteSource");
class CheckoutCommandItem {
    get description() { return ''; }
    get alwaysShow() { return true; }
}
class CreateBranchItem extends CheckoutCommandItem {
    get label() { return vscode_1.l10n.t('{0} Create new branch...', '$(plus)'); }
}
class CreateBranchFromItem extends CheckoutCommandItem {
    get label() { return vscode_1.l10n.t('{0} Create new branch from...', '$(plus)'); }
}
class CheckoutDetachedItem extends CheckoutCommandItem {
    get label() { return vscode_1.l10n.t('{0} Checkout detached...', '$(debug-disconnect)'); }
}
class RefItemSeparator {
    get kind() { return vscode_1.QuickPickItemKind.Separator; }
    get label() {
        switch (this.refType) {
            case 0 /* RefType.Head */:
                return vscode_1.l10n.t('branches');
            case 1 /* RefType.RemoteHead */:
                return vscode_1.l10n.t('remote branches');
            case 2 /* RefType.Tag */:
                return vscode_1.l10n.t('tags');
            default:
                return '';
        }
    }
    constructor(refType) {
        this.refType = refType;
    }
}
class RefItem {
    get label() {
        switch (this.ref.type) {
            case 0 /* RefType.Head */:
                return `$(git-branch) ${this.ref.name ?? this.shortCommit}`;
            case 1 /* RefType.RemoteHead */:
                return `$(cloud) ${this.ref.name ?? this.shortCommit}`;
            case 2 /* RefType.Tag */:
                return `$(tag) ${this.ref.name ?? this.shortCommit}`;
            default:
                return '';
        }
    }
    get description() {
        if (this.ref.commitDetails?.commitDate) {
            return (0, util_1.fromNow)(this.ref.commitDetails.commitDate, true, true);
        }
        switch (this.ref.type) {
            case 0 /* RefType.Head */:
                return this.shortCommit;
            case 1 /* RefType.RemoteHead */:
                return vscode_1.l10n.t('Remote branch at {0}', this.shortCommit);
            case 2 /* RefType.Tag */:
                return vscode_1.l10n.t('Tag at {0}', this.shortCommit);
            default:
                return '';
        }
    }
    get detail() {
        if (this.ref.commitDetails?.authorName && this.ref.commitDetails?.message) {
            return `${this.ref.commitDetails?.authorName}$(circle-small-filled)${this.ref.commitDetails?.message}`;
        }
        return undefined;
    }
    get refName() { return this.ref.name; }
    get refRemote() { return this.ref.remote; }
    get shortCommit() { return (this.ref.commit || '').substr(0, 8); }
    get buttons() { return this._buttons; }
    set buttons(newButtons) { this._buttons = newButtons; }
    constructor(ref) {
        this.ref = ref;
    }
}
class BranchItem extends RefItem {
    get description() {
        const description = [];
        if (typeof this.ref.behind === 'number' && typeof this.ref.ahead === 'number') {
            description.push(`${this.ref.behind}↓ ${this.ref.ahead}↑`);
        }
        if (this.ref.commitDetails?.commitDate) {
            description.push((0, util_1.fromNow)(this.ref.commitDetails.commitDate, true, true));
        }
        return description.length > 0 ? description.join('$(circle-small-filled)') : this.shortCommit;
    }
    constructor(ref) {
        super(ref);
        this.ref = ref;
    }
}
class CheckoutItem extends BranchItem {
    async run(repository, opts) {
        if (!this.ref.name) {
            return;
        }
        const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
        const pullBeforeCheckout = config.get('pullBeforeCheckout', false) === true;
        const treeish = opts?.detached ? this.ref.commit ?? this.ref.name : this.ref.name;
        await repository.checkout(treeish, { ...opts, pullBeforeCheckout });
    }
}
class CheckoutProtectedItem extends CheckoutItem {
    get label() {
        return `$(lock) ${this.ref.name ?? this.shortCommit}`;
    }
}
class CheckoutRemoteHeadItem extends RefItem {
    async run(repository, opts) {
        if (!this.ref.name) {
            return;
        }
        if (opts?.detached) {
            await repository.checkout(this.ref.commit ?? this.ref.name, opts);
            return;
        }
        const branches = await repository.findTrackingBranches(this.ref.name);
        if (branches.length > 0) {
            await repository.checkout(branches[0].name, opts);
        }
        else {
            await repository.checkoutTracking(this.ref.name, opts);
        }
    }
}
class CheckoutTagItem extends RefItem {
    async run(repository, opts) {
        if (!this.ref.name) {
            return;
        }
        await repository.checkout(this.ref.name, opts);
    }
}
class BranchDeleteItem extends BranchItem {
    async run(repository, force) {
        if (this.ref.type === 0 /* RefType.Head */ && this.refName) {
            await repository.deleteBranch(this.refName, force);
        }
        else if (this.ref.type === 1 /* RefType.RemoteHead */ && this.refRemote && this.refName) {
            const refName = this.refName.substring(this.refRemote.length + 1);
            await repository.deleteRemoteRef(this.refRemote, refName, { force });
        }
    }
}
class TagDeleteItem extends RefItem {
    async run(repository) {
        if (this.ref.name) {
            await repository.deleteTag(this.ref.name);
        }
    }
}
class RemoteTagDeleteItem extends RefItem {
    get description() {
        return vscode_1.l10n.t('Remote tag at {0}', this.shortCommit);
    }
    async run(repository, remote) {
        if (this.ref.name) {
            await repository.deleteRemoteRef(remote, this.ref.name);
        }
    }
}
class MergeItem extends BranchItem {
    async run(repository) {
        if (this.ref.name || this.ref.commit) {
            await repository.merge(this.ref.name ?? this.ref.commit);
        }
    }
}
class RebaseItem extends BranchItem {
    async run(repository) {
        if (this.ref?.name) {
            await repository.rebase(this.ref.name);
        }
    }
}
class RebaseUpstreamItem extends RebaseItem {
    get description() {
        return '(upstream)';
    }
}
class HEADItem {
    constructor(repository) {
        this.repository = repository;
    }
    get label() { return 'HEAD'; }
    get description() { return (this.repository.HEAD && this.repository.HEAD.commit || '').substr(0, 8); }
    get alwaysShow() { return true; }
    get refName() { return 'HEAD'; }
}
class AddRemoteItem {
    constructor(cc) {
        this.cc = cc;
    }
    get label() { return '$(plus) ' + vscode_1.l10n.t('Add a new remote...'); }
    get description() { return ''; }
    get alwaysShow() { return true; }
    async run(repository) {
        await this.cc.addRemote(repository);
    }
}
class RemoteItem {
    get label() { return `$(cloud) ${this.remote.name}`; }
    get description() { return this.remote.fetchUrl; }
    get remoteName() { return this.remote.name; }
    constructor(repository, remote) {
        this.repository = repository;
        this.remote = remote;
    }
    async run() {
        await this.repository.fetch({ remote: this.remote.name });
    }
}
class FetchAllRemotesItem {
    get label() { return vscode_1.l10n.t('{0} Fetch all remotes', '$(cloud-download)'); }
    constructor(repository) {
        this.repository = repository;
    }
    async run() {
        await this.repository.fetch({ all: true });
    }
}
class RepositoryItem {
    get label() { return `$(repo) ${getRepositoryLabel(this.path)}`; }
    get description() { return this.path; }
    constructor(path) {
        this.path = path;
    }
}
class StashItem {
    get label() { return `#${this.stash.index}: ${this.stash.description}`; }
    get description() { return this.stash.branchName; }
    constructor(stash) {
        this.stash = stash;
    }
}
const Commands = [];
function command(commandId, options = {}) {
    return (_target, key, descriptor) => {
        if (!(typeof descriptor.value === 'function')) {
            throw new Error('not supported');
        }
        Commands.push({ commandId, key, method: descriptor.value, options });
    };
}
// const ImageMimetypes = [
// 	'image/png',
// 	'image/gif',
// 	'image/jpeg',
// 	'image/webp',
// 	'image/tiff',
// 	'image/bmp'
// ];
async function categorizeResourceByResolution(resources) {
    const selection = resources.filter(s => s instanceof repository_1.Resource);
    const merge = selection.filter(s => s.resourceGroupType === 0 /* ResourceGroupType.Merge */);
    const isBothAddedOrModified = (s) => s.type === 18 /* Status.BOTH_MODIFIED */ || s.type === 16 /* Status.BOTH_ADDED */;
    const isAnyDeleted = (s) => s.type === 15 /* Status.DELETED_BY_THEM */ || s.type === 14 /* Status.DELETED_BY_US */;
    const possibleUnresolved = merge.filter(isBothAddedOrModified);
    const promises = possibleUnresolved.map(s => (0, util_1.grep)(s.resourceUri.fsPath, /^<{7}\s|^={7}$|^>{7}\s/));
    const unresolvedBothModified = await Promise.all(promises);
    const resolved = possibleUnresolved.filter((_s, i) => !unresolvedBothModified[i]);
    const deletionConflicts = merge.filter(s => isAnyDeleted(s));
    const unresolved = [
        ...merge.filter(s => !isBothAddedOrModified(s) && !isAnyDeleted(s)),
        ...possibleUnresolved.filter((_s, i) => unresolvedBothModified[i])
    ];
    return { merge, resolved, unresolved, deletionConflicts };
}
async function createCheckoutItems(repository, detached = false) {
    const config = vscode_1.workspace.getConfiguration('git');
    const checkoutTypeConfig = config.get('checkoutType');
    const showRefDetails = config.get('showReferenceDetails') === true;
    let checkoutTypes;
    if (checkoutTypeConfig === 'all' || !checkoutTypeConfig || checkoutTypeConfig.length === 0) {
        checkoutTypes = ['local', 'remote', 'tags'];
    }
    else if (typeof checkoutTypeConfig === 'string') {
        checkoutTypes = [checkoutTypeConfig];
    }
    else {
        checkoutTypes = checkoutTypeConfig;
    }
    if (detached) {
        // Remove tags when in detached mode
        checkoutTypes = checkoutTypes.filter(t => t !== 'tags');
    }
    const refs = await repository.getRefs({ includeCommitDetails: showRefDetails });
    const refProcessors = checkoutTypes.map(type => getCheckoutRefProcessor(repository, type))
        .filter(p => !!p);
    const buttons = await getRemoteRefItemButtons(repository);
    const itemsProcessor = new CheckoutItemsProcessor(repository, refProcessors, buttons, detached);
    return itemsProcessor.processRefs(refs);
}
async function getRemoteRefItemButtons(repository) {
    // Compute actions for all known remotes
    const remoteUrlsToActions = new Map();
    const getButtons = async (remoteUrl) => (await (0, remoteSource_1.getRemoteSourceActions)(remoteUrl)).map((action) => ({ iconPath: new vscode_1.ThemeIcon(action.icon), tooltip: action.label, actual: action }));
    for (const remote of repository.remotes) {
        if (remote.fetchUrl) {
            const actions = remoteUrlsToActions.get(remote.fetchUrl) ?? [];
            actions.push(...await getButtons(remote.fetchUrl));
            remoteUrlsToActions.set(remote.fetchUrl, actions);
        }
        if (remote.pushUrl && remote.pushUrl !== remote.fetchUrl) {
            const actions = remoteUrlsToActions.get(remote.pushUrl) ?? [];
            actions.push(...await getButtons(remote.pushUrl));
            remoteUrlsToActions.set(remote.pushUrl, actions);
        }
    }
    return remoteUrlsToActions;
}
class RefProcessor {
    get items() {
        const items = this.refs.map(r => new this.ctor(r));
        return items.length === 0 ? items : [new RefItemSeparator(this.type), ...items];
    }
    constructor(type, ctor = RefItem) {
        this.type = type;
        this.ctor = ctor;
        this.refs = [];
    }
    processRef(ref) {
        if (!ref.name && !ref.commit) {
            return false;
        }
        if (ref.type !== this.type) {
            return false;
        }
        this.refs.push(ref);
        return true;
    }
}
class RefItemsProcessor {
    constructor(repository, processors, options = {}) {
        this.repository = repository;
        this.processors = processors;
        this.options = options;
    }
    processRefs(refs) {
        const refsToSkip = this.getRefsToSkip();
        for (const ref of refs) {
            if (ref.name && refsToSkip.includes(ref.name)) {
                continue;
            }
            for (const processor of this.processors) {
                if (processor.processRef(ref)) {
                    break;
                }
            }
        }
        const result = [];
        for (const processor of this.processors) {
            result.push(...processor.items);
        }
        return result;
    }
    getRefsToSkip() {
        const refsToSkip = ['origin/HEAD'];
        if (this.options.skipCurrentBranch && this.repository.HEAD?.name) {
            refsToSkip.push(this.repository.HEAD.name);
        }
        if (this.options.skipCurrentBranchRemote && this.repository.HEAD?.upstream) {
            refsToSkip.push(`${this.repository.HEAD.upstream.remote}/${this.repository.HEAD.upstream.name}`);
        }
        return refsToSkip;
    }
}
class CheckoutRefProcessor extends RefProcessor {
    get items() {
        const items = this.refs.map(ref => {
            return this.repository.isBranchProtected(ref) ?
                new CheckoutProtectedItem(ref) :
                new CheckoutItem(ref);
        });
        return items.length === 0 ? items : [new RefItemSeparator(this.type), ...items];
    }
    constructor(repository) {
        super(0 /* RefType.Head */);
        this.repository = repository;
    }
}
class CheckoutItemsProcessor extends RefItemsProcessor {
    constructor(repository, processors, buttons, detached = false) {
        super(repository, processors);
        this.buttons = buttons;
        this.detached = detached;
        // Default button(s)
        const remote = repository.remotes.find(r => r.pushUrl === repository.HEAD?.remote || r.fetchUrl === repository.HEAD?.remote) ?? repository.remotes[0];
        const remoteUrl = remote?.pushUrl ?? remote?.fetchUrl;
        if (remoteUrl) {
            this.defaultButtons = buttons.get(remoteUrl);
        }
    }
    processRefs(refs) {
        for (const ref of refs) {
            if (!this.detached && ref.name === 'origin/HEAD') {
                continue;
            }
            for (const processor of this.processors) {
                if (processor.processRef(ref)) {
                    break;
                }
            }
        }
        const result = [];
        for (const processor of this.processors) {
            for (const item of processor.items) {
                if (!(item instanceof RefItem)) {
                    result.push(item);
                    continue;
                }
                // Button(s)
                if (item.refRemote) {
                    const matchingRemote = this.repository.remotes.find((remote) => remote.name === item.refRemote);
                    const buttons = [];
                    if (matchingRemote?.pushUrl) {
                        buttons.push(...this.buttons.get(matchingRemote.pushUrl) ?? []);
                    }
                    if (matchingRemote?.fetchUrl && matchingRemote.fetchUrl !== matchingRemote.pushUrl) {
                        buttons.push(...this.buttons.get(matchingRemote.fetchUrl) ?? []);
                    }
                    if (buttons.length) {
                        item.buttons = buttons;
                    }
                }
                else {
                    item.buttons = this.defaultButtons;
                }
                result.push(item);
            }
        }
        return result;
    }
}
function getCheckoutRefProcessor(repository, type) {
    switch (type) {
        case 'local':
            return new CheckoutRefProcessor(repository);
        case 'remote':
            return new RefProcessor(1 /* RefType.RemoteHead */, CheckoutRemoteHeadItem);
        case 'tags':
            return new RefProcessor(2 /* RefType.Tag */, CheckoutTagItem);
        default:
            return undefined;
    }
}
function getRepositoryLabel(repositoryRoot) {
    const workspaceFolder = vscode_1.workspace.getWorkspaceFolder(vscode_1.Uri.file(repositoryRoot));
    return workspaceFolder?.uri.toString() === repositoryRoot ? workspaceFolder.name : path.basename(repositoryRoot);
}
function compareRepositoryLabel(repositoryRoot1, repositoryRoot2) {
    return getRepositoryLabel(repositoryRoot1).localeCompare(getRepositoryLabel(repositoryRoot2));
}
function sanitizeBranchName(name, whitespaceChar) {
    return name ? name.trim().replace(/^-+/, '').replace(/^\.|\/\.|\.\.|~|\^|:|\/$|\.lock$|\.lock\/|\\|\*|\s|^\s*$|\.$|\[|\]$/g, whitespaceChar) : name;
}
function sanitizeRemoteName(name) {
    name = name.trim();
    return name && name.replace(/^\.|\/\.|\.\.|~|\^|:|\/$|\.lock$|\.lock\/|\\|\*|\s|^\s*$|\.$|\[|\]$/g, '-');
}
var PushType;
(function (PushType) {
    PushType[PushType["Push"] = 0] = "Push";
    PushType[PushType["PushTo"] = 1] = "PushTo";
    PushType[PushType["PushFollowTags"] = 2] = "PushFollowTags";
    PushType[PushType["PushTags"] = 3] = "PushTags";
})(PushType || (PushType = {}));
class CommandErrorOutputTextDocumentContentProvider {
    constructor() {
        this.items = new Map();
    }
    set(uri, contents) {
        this.items.set(uri.path, contents);
    }
    delete(uri) {
        this.items.delete(uri.path);
    }
    provideTextDocumentContent(uri) {
        return this.items.get(uri.path);
    }
}
async function evaluateDiagnosticsCommitHook(repository, options) {
    const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
    const enabled = config.get('diagnosticsCommitHook.Enabled', false) === true;
    const sourceSeverity = config.get('diagnosticsCommitHook.Sources', { '*': 'error' });
    if (!enabled) {
        return true;
    }
    const changes = [];
    if (repository.indexGroup.resourceStates.length > 0) {
        // Staged files
        changes.push(...repository.indexGroup.resourceStates.map(r => r.resourceUri));
    }
    else if (options.all === 'tracked') {
        // Tracked files
        changes.push(...repository.workingTreeGroup.resourceStates
            .filter(r => r.type !== 7 /* Status.UNTRACKED */ && r.type !== 8 /* Status.IGNORED */)
            .map(r => r.resourceUri));
    }
    else {
        // All files
        changes.push(...repository.workingTreeGroup.resourceStates.map(r => r.resourceUri));
        changes.push(...repository.untrackedGroup.resourceStates.map(r => r.resourceUri));
    }
    const diagnostics = vscode_1.languages.getDiagnostics();
    const changesDiagnostics = diagnostics.filter(([uri, diags]) => {
        // File
        if (uri.scheme !== 'file' || !changes.find(c => (0, util_1.pathEquals)(c.fsPath, uri.fsPath))) {
            return false;
        }
        // Diagnostics
        return diags.find(d => {
            // No source or ignored source
            if (!d.source || (Object.keys(sourceSeverity).includes(d.source) && sourceSeverity[d.source] === 'none')) {
                return false;
            }
            // Source severity
            if (Object.keys(sourceSeverity).includes(d.source) &&
                d.severity <= (0, util_1.toDiagnosticSeverity)(sourceSeverity[d.source])) {
                return true;
            }
            // Wildcard severity
            if (Object.keys(sourceSeverity).includes('*') &&
                d.severity <= (0, util_1.toDiagnosticSeverity)(sourceSeverity['*'])) {
                return true;
            }
            return false;
        });
    });
    if (changesDiagnostics.length === 0) {
        return true;
    }
    // Show dialog
    const commit = vscode_1.l10n.t('Commit Anyway');
    const view = vscode_1.l10n.t('View Problems');
    const message = changesDiagnostics.length === 1
        ? vscode_1.l10n.t('The following file has unresolved diagnostics: \'{0}\'.\n\nHow would you like to proceed?', path.basename(changesDiagnostics[0][0].fsPath))
        : vscode_1.l10n.t('There are {0} files that have unresolved diagnostics.\n\nHow would you like to proceed?', changesDiagnostics.length);
    const choice = await vscode_1.window.showWarningMessage(message, { modal: true }, commit, view);
    // Commit Anyway
    if (choice === commit) {
        return true;
    }
    // View Problems
    if (choice === view) {
        vscode_1.commands.executeCommand('workbench.panel.markers.view.focus');
    }
    return false;
}
class CommandCenter {
    constructor(git, model, globalState, logger, telemetryReporter) {
        this.git = git;
        this.model = model;
        this.globalState = globalState;
        this.logger = logger;
        this.telemetryReporter = telemetryReporter;
        this.commandErrors = new CommandErrorOutputTextDocumentContentProvider();
        this.disposables = Commands.map(({ commandId, key, method, options }) => {
            const command = this.createCommand(commandId, key, method, options);
            return vscode_1.commands.registerCommand(commandId, command);
        });
        this.disposables.push(vscode_1.workspace.registerTextDocumentContentProvider('git-output', this.commandErrors));
    }
    showOutput() {
        this.logger.show();
    }
    async refresh(repository) {
        await repository.refresh();
    }
    async openResource(resource) {
        const repository = this.model.getRepository(resource.resourceUri);
        if (!repository) {
            return;
        }
        await resource.open();
    }
    async openChanges(repository) {
        for (const resource of [...repository.workingTreeGroup.resourceStates, ...repository.untrackedGroup.resourceStates]) {
            if (resource.type === 6 /* Status.DELETED */ || resource.type === 15 /* Status.DELETED_BY_THEM */ ||
                resource.type === 14 /* Status.DELETED_BY_US */ || resource.type === 17 /* Status.BOTH_DELETED */) {
                continue;
            }
            void vscode_1.commands.executeCommand('vscode.open', resource.resourceUri, { background: true, preview: false, });
        }
    }
    async openMergeEditor(uri) {
        if (uri === undefined) {
            // fallback to active editor...
            if (vscode_1.window.tabGroups.activeTabGroup.activeTab?.input instanceof vscode_1.TabInputText) {
                uri = vscode_1.window.tabGroups.activeTabGroup.activeTab.input.uri;
            }
        }
        if (!(uri instanceof vscode_1.Uri)) {
            return;
        }
        const repo = this.model.getRepository(uri);
        if (!repo) {
            return;
        }
        const isRebasing = Boolean(repo.rebaseCommit);
        const mergeUris = (0, uri_1.toMergeUris)(uri);
        let isStashConflict = false;
        try {
            // Look at the conflict markers to check if this is a stash conflict
            const document = await vscode_1.workspace.openTextDocument(uri);
            const firstConflictInfo = findFirstConflictMarker(document);
            isStashConflict = firstConflictInfo?.incomingChangeLabel === 'Stashed changes';
        }
        catch (error) {
            console.error(error);
        }
        const current = { uri: mergeUris.ours, title: vscode_1.l10n.t('Current') };
        const incoming = { uri: mergeUris.theirs, title: vscode_1.l10n.t('Incoming') };
        if (isStashConflict) {
            incoming.title = vscode_1.l10n.t('Stashed Changes');
        }
        try {
            const [head, rebaseOrMergeHead, diffBetween] = await Promise.all([
                repo.getCommit('HEAD'),
                isRebasing ? repo.getCommit('REBASE_HEAD') : repo.getCommit('MERGE_HEAD'),
                await repo.diffBetween(isRebasing ? 'REBASE_HEAD' : 'MERGE_HEAD', 'HEAD')
            ]);
            const diffFile = diffBetween?.find(diff => diff.uri.fsPath === uri.fsPath);
            // ours (current branch and commit)
            current.detail = head.refNames.map(s => s.replace(/^HEAD ->/, '')).join(', ');
            current.description = '$(git-commit) ' + head.hash.substring(0, 7);
            current.uri = (0, uri_1.toGitUri)(uri, head.hash);
            // theirs
            incoming.detail = rebaseOrMergeHead.refNames.join(', ');
            incoming.description = '$(git-commit) ' + rebaseOrMergeHead.hash.substring(0, 7);
            if (diffFile) {
                incoming.uri = (0, uri_1.toGitUri)(diffFile.originalUri, rebaseOrMergeHead.hash);
            }
            else {
                incoming.uri = (0, uri_1.toGitUri)(uri, rebaseOrMergeHead.hash);
            }
        }
        catch (error) {
            // not so bad, can continue with just uris
            console.error('FAILED to read HEAD, MERGE_HEAD commits');
            console.error(error);
        }
        const options = {
            base: mergeUris.base,
            input1: isRebasing ? current : incoming,
            input2: isRebasing ? incoming : current,
            output: uri
        };
        await vscode_1.commands.executeCommand('_open.mergeEditor', options);
        function findFirstConflictMarker(doc) {
            const conflictMarkerStart = '<<<<<<<';
            const conflictMarkerEnd = '>>>>>>>';
            let inConflict = false;
            let currentChangeLabel = '';
            let incomingChangeLabel = '';
            let hasConflict = false;
            for (let lineIdx = 0; lineIdx < doc.lineCount; lineIdx++) {
                const lineStr = doc.lineAt(lineIdx).text;
                if (!inConflict) {
                    if (lineStr.startsWith(conflictMarkerStart)) {
                        currentChangeLabel = lineStr.substring(conflictMarkerStart.length).trim();
                        inConflict = true;
                        hasConflict = true;
                    }
                }
                else {
                    if (lineStr.startsWith(conflictMarkerEnd)) {
                        incomingChangeLabel = lineStr.substring(conflictMarkerStart.length).trim();
                        inConflict = false;
                        break;
                    }
                }
            }
            if (hasConflict) {
                return {
                    currentChangeLabel,
                    incomingChangeLabel
                };
            }
            return undefined;
        }
    }
    async cloneRepository(url, parentPath, options = {}) {
        if (!url || typeof url !== 'string') {
            url = await (0, remoteSource_1.pickRemoteSource)({
                providerLabel: provider => vscode_1.l10n.t('Clone from {0}', provider.name),
                urlLabel: vscode_1.l10n.t('Clone from URL')
            });
        }
        if (!url) {
            /* __GDPR__
                "clone" : {
                    "owner": "lszomoru",
                    "outcome" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the git operation" }
                }
            */
            this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'no_URL' });
            return;
        }
        url = url.trim().replace(/^git\s+clone\s+/, '');
        if (!parentPath) {
            const config = vscode_1.workspace.getConfiguration('git');
            let defaultCloneDirectory = config.get('defaultCloneDirectory') || os.homedir();
            defaultCloneDirectory = defaultCloneDirectory.replace(/^~/, os.homedir());
            const uris = await vscode_1.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode_1.Uri.file(defaultCloneDirectory),
                title: vscode_1.l10n.t('Choose a folder to clone {0} into', url),
                openLabel: vscode_1.l10n.t('Select as Repository Destination')
            });
            if (!uris || uris.length === 0) {
                /* __GDPR__
                    "clone" : {
                        "owner": "lszomoru",
                        "outcome" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the git operation" }
                    }
                */
                this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'no_directory' });
                return;
            }
            const uri = uris[0];
            parentPath = uri.fsPath;
        }
        try {
            const opts = {
                location: vscode_1.ProgressLocation.Notification,
                title: vscode_1.l10n.t('Cloning git repository "{0}"...', url),
                cancellable: true
            };
            const repositoryPath = await vscode_1.window.withProgress(opts, (progress, token) => this.git.clone(url, { parentPath: parentPath, progress, recursive: options.recursive, ref: options.ref }, token));
            const config = vscode_1.workspace.getConfiguration('git');
            const openAfterClone = config.get('openAfterClone');
            let PostCloneAction;
            (function (PostCloneAction) {
                PostCloneAction[PostCloneAction["Open"] = 0] = "Open";
                PostCloneAction[PostCloneAction["OpenNewWindow"] = 1] = "OpenNewWindow";
                PostCloneAction[PostCloneAction["AddToWorkspace"] = 2] = "AddToWorkspace";
            })(PostCloneAction || (PostCloneAction = {}));
            let action = undefined;
            if (openAfterClone === 'always') {
                action = PostCloneAction.Open;
            }
            else if (openAfterClone === 'alwaysNewWindow') {
                action = PostCloneAction.OpenNewWindow;
            }
            else if (openAfterClone === 'whenNoFolderOpen' && !vscode_1.workspace.workspaceFolders) {
                action = PostCloneAction.Open;
            }
            if (action === undefined) {
                let message = vscode_1.l10n.t('Would you like to open the cloned repository?');
                const open = vscode_1.l10n.t('Open');
                const openNewWindow = vscode_1.l10n.t('Open in New Window');
                const choices = [open, openNewWindow];
                const addToWorkspace = vscode_1.l10n.t('Add to Workspace');
                if (vscode_1.workspace.workspaceFolders) {
                    message = vscode_1.l10n.t('Would you like to open the cloned repository, or add it to the current workspace?');
                    choices.push(addToWorkspace);
                }
                const result = await vscode_1.window.showInformationMessage(message, { modal: true }, ...choices);
                action = result === open ? PostCloneAction.Open
                    : result === openNewWindow ? PostCloneAction.OpenNewWindow
                        : result === addToWorkspace ? PostCloneAction.AddToWorkspace : undefined;
            }
            /* __GDPR__
                "clone" : {
                    "owner": "lszomoru",
                    "outcome" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the git operation" },
                    "openFolder": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Indicates whether the folder is opened following the clone operation" }
                }
            */
            this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'success' }, { openFolder: action === PostCloneAction.Open || action === PostCloneAction.OpenNewWindow ? 1 : 0 });
            const uri = vscode_1.Uri.file(repositoryPath);
            if (action === PostCloneAction.Open) {
                vscode_1.commands.executeCommand('vscode.openFolder', uri, { forceReuseWindow: true });
            }
            else if (action === PostCloneAction.AddToWorkspace) {
                vscode_1.workspace.updateWorkspaceFolders(vscode_1.workspace.workspaceFolders.length, 0, { uri });
            }
            else if (action === PostCloneAction.OpenNewWindow) {
                vscode_1.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
            }
        }
        catch (err) {
            if (/already exists and is not an empty directory/.test(err && err.stderr || '')) {
                /* __GDPR__
                    "clone" : {
                        "owner": "lszomoru",
                        "outcome" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the git operation" }
                    }
                */
                this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'directory_not_empty' });
            }
            else if (/Cancelled/i.test(err && (err.message || err.stderr || ''))) {
                return;
            }
            else {
                /* __GDPR__
                    "clone" : {
                        "owner": "lszomoru",
                        "outcome" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The outcome of the git operation" }
                    }
                */
                this.telemetryReporter.sendTelemetryEvent('clone', { outcome: 'error' });
            }
            throw err;
        }
    }
    async continueInLocalClone() {
        if (this.model.repositories.length === 0) {
            return;
        }
        // Pick a single repository to continue working on in a local clone if there's more than one
        const items = this.model.repositories.reduce((items, repository) => {
            const remote = repository.remotes.find((r) => r.name === repository.HEAD?.upstream?.remote);
            if (remote?.pushUrl) {
                items.push({ repository: repository, label: remote.pushUrl });
            }
            return items;
        }, []);
        let selection = items[0];
        if (items.length > 1) {
            const pick = await vscode_1.window.showQuickPick(items, { canPickMany: false, placeHolder: vscode_1.l10n.t('Choose which repository to clone') });
            if (pick === undefined) {
                return;
            }
            selection = pick;
        }
        const uri = selection.label;
        const ref = selection.repository.HEAD?.upstream?.name;
        if (uri !== undefined) {
            let target = `${vscode_1.env.uriScheme}://vscode.git/clone?url=${encodeURIComponent(uri)}`;
            const isWeb = vscode_1.env.uiKind === vscode_1.UIKind.Web;
            const isRemote = vscode_1.env.remoteName !== undefined;
            if (isWeb || isRemote) {
                if (ref !== undefined) {
                    target += `&ref=${encodeURIComponent(ref)}`;
                }
                if (isWeb) {
                    // Launch desktop client if currently in web
                    return vscode_1.Uri.parse(target);
                }
                if (isRemote) {
                    // If already in desktop client but in a remote window, we need to force a new window
                    // so that the git extension can access the local filesystem for cloning
                    target += `&windowId=_blank`;
                    return vscode_1.Uri.parse(target);
                }
            }
            // Otherwise, directly clone
            void this.clone(uri, undefined, { ref: ref });
        }
    }
    async clone(url, parentPath, options) {
        await this.cloneRepository(url, parentPath, options);
    }
    async cloneRecursive(url, parentPath) {
        await this.cloneRepository(url, parentPath, { recursive: true });
    }
    async init(skipFolderPrompt = false) {
        let repositoryPath = undefined;
        let askToOpen = true;
        if (vscode_1.workspace.workspaceFolders) {
            if (skipFolderPrompt && vscode_1.workspace.workspaceFolders.length === 1) {
                repositoryPath = vscode_1.workspace.workspaceFolders[0].uri.fsPath;
                askToOpen = false;
            }
            else {
                const placeHolder = vscode_1.l10n.t('Pick workspace folder to initialize git repo in');
                const pick = { label: vscode_1.l10n.t('Choose Folder...') };
                const items = [
                    ...vscode_1.workspace.workspaceFolders.map(folder => ({ label: folder.name, description: folder.uri.fsPath, folder })),
                    pick
                ];
                const item = await vscode_1.window.showQuickPick(items, { placeHolder, ignoreFocusOut: true });
                if (!item) {
                    return;
                }
                else if (item.folder) {
                    repositoryPath = item.folder.uri.fsPath;
                    askToOpen = false;
                }
            }
        }
        if (!repositoryPath) {
            const homeUri = vscode_1.Uri.file(os.homedir());
            const defaultUri = vscode_1.workspace.workspaceFolders && vscode_1.workspace.workspaceFolders.length > 0
                ? vscode_1.Uri.file(vscode_1.workspace.workspaceFolders[0].uri.fsPath)
                : homeUri;
            const result = await vscode_1.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri,
                openLabel: vscode_1.l10n.t('Initialize Repository')
            });
            if (!result || result.length === 0) {
                return;
            }
            const uri = result[0];
            if (homeUri.toString().startsWith(uri.toString())) {
                const yes = vscode_1.l10n.t('Initialize Repository');
                const answer = await vscode_1.window.showWarningMessage(vscode_1.l10n.t('This will create a Git repository in "{0}". Are you sure you want to continue?', uri.fsPath), yes);
                if (answer !== yes) {
                    return;
                }
            }
            repositoryPath = uri.fsPath;
            if (vscode_1.workspace.workspaceFolders && vscode_1.workspace.workspaceFolders.some(w => w.uri.toString() === uri.toString())) {
                askToOpen = false;
            }
        }
        const config = vscode_1.workspace.getConfiguration('git');
        const defaultBranchName = config.get('defaultBranchName', 'main');
        const branchWhitespaceChar = config.get('branchWhitespaceChar', '-');
        await this.git.init(repositoryPath, { defaultBranch: sanitizeBranchName(defaultBranchName, branchWhitespaceChar) });
        let message = vscode_1.l10n.t('Would you like to open the initialized repository?');
        const open = vscode_1.l10n.t('Open');
        const openNewWindow = vscode_1.l10n.t('Open in New Window');
        const choices = [open, openNewWindow];
        if (!askToOpen) {
            await this.model.openRepository(repositoryPath);
            return;
        }
        const addToWorkspace = vscode_1.l10n.t('Add to Workspace');
        if (vscode_1.workspace.workspaceFolders) {
            message = vscode_1.l10n.t('Would you like to open the initialized repository, or add it to the current workspace?');
            choices.push(addToWorkspace);
        }
        const result = await vscode_1.window.showInformationMessage(message, ...choices);
        const uri = vscode_1.Uri.file(repositoryPath);
        if (result === open) {
            vscode_1.commands.executeCommand('vscode.openFolder', uri);
        }
        else if (result === addToWorkspace) {
            vscode_1.workspace.updateWorkspaceFolders(vscode_1.workspace.workspaceFolders.length, 0, { uri });
        }
        else if (result === openNewWindow) {
            vscode_1.commands.executeCommand('vscode.openFolder', uri, true);
        }
        else {
            await this.model.openRepository(repositoryPath);
        }
    }
    async openRepository(path) {
        if (!path) {
            const result = await vscode_1.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: vscode_1.Uri.file(os.homedir()),
                openLabel: vscode_1.l10n.t('Open Repository')
            });
            if (!result || result.length === 0) {
                return;
            }
            path = result[0].fsPath;
        }
        await this.model.openRepository(path, true);
    }
    async reopenClosedRepositories() {
        if (this.model.closedRepositories.length === 0) {
            return;
        }
        const closedRepositories = [];
        const title = vscode_1.l10n.t('Reopen Closed Repositories');
        const placeHolder = vscode_1.l10n.t('Pick a repository to reopen');
        const allRepositoriesLabel = vscode_1.l10n.t('All Repositories');
        const allRepositoriesQuickPickItem = { label: allRepositoriesLabel };
        const repositoriesQuickPickItems = this.model.closedRepositories
            .sort(compareRepositoryLabel).map(r => new RepositoryItem(r));
        const items = this.model.closedRepositories.length === 1 ? [...repositoriesQuickPickItems] :
            [...repositoriesQuickPickItems, { label: '', kind: vscode_1.QuickPickItemKind.Separator }, allRepositoriesQuickPickItem];
        const repositoryItem = await vscode_1.window.showQuickPick(items, { title, placeHolder });
        if (!repositoryItem) {
            return;
        }
        if (repositoryItem === allRepositoriesQuickPickItem) {
            // All Repositories
            closedRepositories.push(...this.model.closedRepositories.values());
        }
        else {
            // One Repository
            closedRepositories.push(repositoryItem.path);
        }
        for (const repository of closedRepositories) {
            await this.model.openRepository(repository, true);
        }
    }
    async close(repository, ...args) {
        const otherRepositories = args
            .map(sourceControl => this.model.getRepository(sourceControl))
            .filter(util_1.isDefined);
        for (const r of [repository, ...otherRepositories]) {
            this.model.close(r);
        }
    }
    async closeOtherRepositories(repository, ...args) {
        const otherRepositories = args
            .map(sourceControl => this.model.getRepository(sourceControl))
            .filter(util_1.isDefined);
        const selectedRepositories = [repository, ...otherRepositories];
        for (const r of this.model.repositories) {
            if (selectedRepositories.includes(r)) {
                continue;
            }
            this.model.close(r);
        }
    }
    async openFile(arg, ...resourceStates) {
        const preserveFocus = arg instanceof repository_1.Resource;
        let uris;
        if (arg instanceof vscode_1.Uri) {
            if ((0, uri_1.isGitUri)(arg)) {
                uris = [vscode_1.Uri.file((0, uri_1.fromGitUri)(arg).path)];
            }
            else if (arg.scheme === 'file') {
                uris = [arg];
            }
        }
        else {
            let resource = arg;
            if (!(resource instanceof repository_1.Resource)) {
                // can happen when called from a keybinding
                resource = this.getSCMResource();
            }
            if (resource) {
                uris = [resource, ...resourceStates]
                    .filter(r => r.type !== 6 /* Status.DELETED */ && r.type !== 2 /* Status.INDEX_DELETED */)
                    .map(r => r.resourceUri);
            }
            else if (vscode_1.window.activeTextEditor) {
                uris = [vscode_1.window.activeTextEditor.document.uri];
            }
        }
        if (!uris) {
            return;
        }
        const activeTextEditor = vscode_1.window.activeTextEditor;
        // Must extract these now because opening a new document will change the activeTextEditor reference
        const previousVisibleRanges = activeTextEditor?.visibleRanges;
        const previousURI = activeTextEditor?.document.uri;
        const previousSelection = activeTextEditor?.selection;
        for (const uri of uris) {
            const opts = {
                preserveFocus,
                preview: false,
                viewColumn: vscode_1.ViewColumn.Active
            };
            await vscode_1.commands.executeCommand('vscode.open', uri, {
                ...opts,
                override: arg instanceof repository_1.Resource && arg.type === 18 /* Status.BOTH_MODIFIED */ ? false : undefined
            });
            const document = vscode_1.window.activeTextEditor?.document;
            // If the document doesn't match what we opened then don't attempt to select the range
            // Additionally if there was no previous document we don't have information to select a range
            if (document?.uri.toString() !== uri.toString() || !activeTextEditor || !previousURI || !previousSelection) {
                continue;
            }
            // Check if active text editor has same path as other editor. we cannot compare via
            // URI.toString() here because the schemas can be different. Instead we just go by path.
            if (previousURI.path === uri.path && document) {
                // preserve not only selection but also visible range
                opts.selection = previousSelection;
                const editor = await vscode_1.window.showTextDocument(document, opts);
                // This should always be defined but just in case
                if (previousVisibleRanges && previousVisibleRanges.length > 0) {
                    let rangeToReveal = previousVisibleRanges[0];
                    if (previousSelection && previousVisibleRanges.length > 1) {
                        // In case of multiple visible ranges, find the one that intersects with the selection
                        rangeToReveal = previousVisibleRanges.find(r => r.intersection(previousSelection)) ?? rangeToReveal;
                    }
                    editor.revealRange(rangeToReveal);
                }
            }
        }
    }
    async openFile2(arg, ...resourceStates) {
        this.openFile(arg, ...resourceStates);
    }
    async openHEADFile(arg) {
        let resource = undefined;
        const preview = !(arg instanceof repository_1.Resource);
        if (arg instanceof repository_1.Resource) {
            resource = arg;
        }
        else if (arg instanceof vscode_1.Uri) {
            resource = this.getSCMResource(arg);
        }
        else {
            resource = this.getSCMResource();
        }
        if (!resource) {
            return;
        }
        const HEAD = resource.leftUri;
        const basename = path.basename(resource.resourceUri.fsPath);
        const title = `${basename} (HEAD)`;
        if (!HEAD) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('HEAD version of "{0}" is not available.', path.basename(resource.resourceUri.fsPath)));
            return;
        }
        const opts = {
            preview
        };
        return await vscode_1.commands.executeCommand('vscode.open', HEAD, opts, title);
    }
    async openChange(arg, ...resourceStates) {
        let resources = undefined;
        if (arg instanceof vscode_1.Uri) {
            const resource = this.getSCMResource(arg);
            if (resource !== undefined) {
                resources = [resource];
            }
        }
        else {
            let resource = undefined;
            if (arg instanceof repository_1.Resource) {
                resource = arg;
            }
            else {
                resource = this.getSCMResource();
            }
            if (resource) {
                resources = [...resourceStates, resource];
            }
        }
        if (!resources) {
            return;
        }
        for (const resource of resources) {
            await resource.openChange();
        }
    }
    async rename(repository, fromUri) {
        fromUri = fromUri ?? vscode_1.window.activeTextEditor?.document.uri;
        if (!fromUri) {
            return;
        }
        const from = (0, util_1.relativePath)(repository.root, fromUri.fsPath);
        let to = await vscode_1.window.showInputBox({
            value: from,
            valueSelection: [from.length - path.basename(from).length, from.length]
        });
        to = to?.trim();
        if (!to) {
            return;
        }
        await repository.move(from, to);
        // Close active editor and open the renamed file
        await vscode_1.commands.executeCommand('workbench.action.closeActiveEditor');
        await vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.file(path.join(repository.root, to)), { viewColumn: vscode_1.ViewColumn.Active });
    }
    async stage(...resourceStates) {
        this.logger.debug(`[CommandCenter][stage] git.stage ${resourceStates.length} `);
        resourceStates = resourceStates.filter(s => !!s);
        if (resourceStates.length === 0 || (resourceStates[0] && !(resourceStates[0].resourceUri instanceof vscode_1.Uri))) {
            const resource = this.getSCMResource();
            this.logger.debug(`[CommandCenter][stage] git.stage.getSCMResource ${resource ? resource.resourceUri.toString() : null} `);
            if (!resource) {
                return;
            }
            resourceStates = [resource];
        }
        const selection = resourceStates.filter(s => s instanceof repository_1.Resource);
        const { resolved, unresolved, deletionConflicts } = await categorizeResourceByResolution(selection);
        if (unresolved.length > 0) {
            const message = unresolved.length > 1
                ? vscode_1.l10n.t('Are you sure you want to stage {0} files with merge conflicts?', unresolved.length)
                : vscode_1.l10n.t('Are you sure you want to stage {0} with merge conflicts?', path.basename(unresolved[0].resourceUri.fsPath));
            const yes = vscode_1.l10n.t('Yes');
            const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes);
            if (pick !== yes) {
                return;
            }
        }
        try {
            await this.runByRepository(deletionConflicts.map(r => r.resourceUri), async (repository, resources) => {
                for (const resource of resources) {
                    await this._stageDeletionConflict(repository, resource);
                }
            });
        }
        catch (err) {
            if (/Cancelled/.test(err.message)) {
                return;
            }
            throw err;
        }
        const workingTree = selection.filter(s => s.resourceGroupType === 2 /* ResourceGroupType.WorkingTree */);
        const untracked = selection.filter(s => s.resourceGroupType === 3 /* ResourceGroupType.Untracked */);
        const scmResources = [...workingTree, ...untracked, ...resolved, ...unresolved];
        this.logger.debug(`[CommandCenter][stage] git.stage.scmResources ${scmResources.length} `);
        if (!scmResources.length) {
            return;
        }
        const resources = scmResources.map(r => r.resourceUri);
        await this.runByRepository(resources, async (repository, resources) => repository.add(resources));
    }
    async stageAll(repository) {
        const resources = [...repository.workingTreeGroup.resourceStates, ...repository.untrackedGroup.resourceStates];
        const uris = resources.map(r => r.resourceUri);
        if (uris.length > 0) {
            const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
            const untrackedChanges = config.get('untrackedChanges');
            await repository.add(uris, untrackedChanges === 'mixed' ? undefined : { update: true });
        }
    }
    async _stageDeletionConflict(repository, uri) {
        const uriString = uri.toString();
        const resource = repository.mergeGroup.resourceStates.filter(r => r.resourceUri.toString() === uriString)[0];
        if (!resource) {
            return;
        }
        if (resource.type === 15 /* Status.DELETED_BY_THEM */) {
            const keepIt = vscode_1.l10n.t('Keep Our Version');
            const deleteIt = vscode_1.l10n.t('Delete File');
            const result = await vscode_1.window.showInformationMessage(vscode_1.l10n.t('File "{0}" was deleted by them and modified by us.\n\nWhat would you like to do?', path.basename(uri.fsPath)), { modal: true }, keepIt, deleteIt);
            if (result === keepIt) {
                await repository.add([uri]);
            }
            else if (result === deleteIt) {
                await repository.rm([uri]);
            }
            else {
                throw new Error('Cancelled');
            }
        }
        else if (resource.type === 14 /* Status.DELETED_BY_US */) {
            const keepIt = vscode_1.l10n.t('Keep Their Version');
            const deleteIt = vscode_1.l10n.t('Delete File');
            const result = await vscode_1.window.showInformationMessage(vscode_1.l10n.t('File "{0}" was deleted by us and modified by them.\n\nWhat would you like to do?', path.basename(uri.fsPath)), { modal: true }, keepIt, deleteIt);
            if (result === keepIt) {
                await repository.add([uri]);
            }
            else if (result === deleteIt) {
                await repository.rm([uri]);
            }
            else {
                throw new Error('Cancelled');
            }
        }
    }
    async stageAllTracked(repository) {
        const resources = repository.workingTreeGroup.resourceStates
            .filter(r => r.type !== 7 /* Status.UNTRACKED */ && r.type !== 8 /* Status.IGNORED */);
        const uris = resources.map(r => r.resourceUri);
        await repository.add(uris);
    }
    async stageAllUntracked(repository) {
        const resources = [...repository.workingTreeGroup.resourceStates, ...repository.untrackedGroup.resourceStates]
            .filter(r => r.type === 7 /* Status.UNTRACKED */ || r.type === 8 /* Status.IGNORED */);
        const uris = resources.map(r => r.resourceUri);
        await repository.add(uris);
    }
    async stageAllMerge(repository) {
        const resources = repository.mergeGroup.resourceStates.filter(s => s instanceof repository_1.Resource);
        const { merge, unresolved, deletionConflicts } = await categorizeResourceByResolution(resources);
        try {
            for (const deletionConflict of deletionConflicts) {
                await this._stageDeletionConflict(repository, deletionConflict.resourceUri);
            }
        }
        catch (err) {
            if (/Cancelled/.test(err.message)) {
                return;
            }
            throw err;
        }
        if (unresolved.length > 0) {
            const message = unresolved.length > 1
                ? vscode_1.l10n.t('Are you sure you want to stage {0} files with merge conflicts?', merge.length)
                : vscode_1.l10n.t('Are you sure you want to stage {0} with merge conflicts?', path.basename(merge[0].resourceUri.fsPath));
            const yes = vscode_1.l10n.t('Yes');
            const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes);
            if (pick !== yes) {
                return;
            }
        }
        const uris = resources.map(r => r.resourceUri);
        if (uris.length > 0) {
            await repository.add(uris);
        }
    }
    async stageChange(uri, changes, index) {
        if (!uri) {
            return;
        }
        const textEditor = vscode_1.window.visibleTextEditors.filter(e => e.document.uri.toString() === uri.toString())[0];
        if (!textEditor) {
            return;
        }
        await this._stageChanges(textEditor, [changes[index]]);
        const firstStagedLine = changes[index].modifiedStartLineNumber;
        textEditor.selections = [new vscode_1.Selection(firstStagedLine, 0, firstStagedLine, 0)];
    }
    async diffStageHunk(changes) {
        this.diffStageHunkOrSelection(changes);
    }
    async diffStageSelection(changes) {
        this.diffStageHunkOrSelection(changes);
    }
    async diffStageHunkOrSelection(changes) {
        if (!changes) {
            return;
        }
        let modifiedUri = changes.modifiedUri;
        let modifiedDocument;
        if (!modifiedUri) {
            const textEditor = vscode_1.window.activeTextEditor;
            if (!textEditor) {
                return;
            }
            modifiedDocument = textEditor.document;
            modifiedUri = modifiedDocument.uri;
        }
        if (modifiedUri.scheme !== 'file') {
            return;
        }
        if (!modifiedDocument) {
            modifiedDocument = await vscode_1.workspace.openTextDocument(modifiedUri);
        }
        const result = changes.originalWithModifiedChanges;
        await this.runByRepository(modifiedUri, async (repository, resource) => await repository.stage(resource, result, modifiedDocument.encoding));
    }
    async stageSelectedChanges() {
        const textEditor = vscode_1.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const workingTreeDiffInformation = (0, staging_1.getWorkingTreeDiffInformation)(textEditor);
        if (!workingTreeDiffInformation) {
            return;
        }
        const workingTreeLineChanges = (0, staging_1.toLineChanges)(workingTreeDiffInformation);
        this.logger.trace(`[CommandCenter][stageSelectedChanges] diffInformation: ${JSON.stringify(workingTreeDiffInformation)}`);
        this.logger.trace(`[CommandCenter][stageSelectedChanges] diffInformation changes: ${JSON.stringify(workingTreeLineChanges)}`);
        const modifiedDocument = textEditor.document;
        const selectedLines = (0, staging_1.toLineRanges)(textEditor.selections, modifiedDocument);
        const selectedChanges = workingTreeLineChanges
            .map(change => selectedLines.reduce((result, range) => result || (0, staging_1.intersectDiffWithRange)(modifiedDocument, change, range), null))
            .filter(d => !!d);
        this.logger.trace(`[CommandCenter][stageSelectedChanges] selectedChanges: ${JSON.stringify(selectedChanges)}`);
        if (!selectedChanges.length) {
            vscode_1.window.showInformationMessage(vscode_1.l10n.t('The selection range does not contain any changes.'));
            return;
        }
        await this._stageChanges(textEditor, selectedChanges);
    }
    async stageFile(uri) {
        if (!uri) {
            return;
        }
        const repository = this.model.getRepository(uri);
        if (!repository) {
            return;
        }
        const resources = [
            ...repository.workingTreeGroup.resourceStates,
            ...repository.untrackedGroup.resourceStates
        ]
            .filter(r => r.multiFileDiffEditorModifiedUri?.toString() === uri.toString())
            .map(r => r.resourceUri);
        if (resources.length === 0) {
            return;
        }
        await repository.add(resources);
    }
    async acceptMerge(_uri) {
        const { activeTab } = vscode_1.window.tabGroups.activeTabGroup;
        if (!activeTab) {
            return;
        }
        if (!(activeTab.input instanceof vscode_1.TabInputTextMerge)) {
            return;
        }
        const uri = activeTab.input.result;
        const repository = this.model.getRepository(uri);
        if (!repository) {
            console.log(`FAILED to complete merge because uri ${uri.toString()} doesn't belong to any repository`);
            return;
        }
        const result = await vscode_1.commands.executeCommand('mergeEditor.acceptMerge');
        if (result.successful) {
            await repository.add([uri]);
            await vscode_1.commands.executeCommand('workbench.view.scm');
        }
        /*
        if (!(uri instanceof Uri)) {
            return;
        }




        // make sure to save the merged document
        const doc = workspace.textDocuments.find(doc => doc.uri.toString() === uri.toString());
        if (!doc) {
            console.log(`FAILED to complete merge because uri ${uri.toString()} doesn't match a document`);
            return;
        }
        if (doc.isDirty) {
            await doc.save();
        }

        // find the merge editor tabs for the resource in question and close them all
        let didCloseTab = false;
        const mergeEditorTabs = window.tabGroups.all.map(group => group.tabs.filter(tab => tab.input instanceof TabInputTextMerge && tab.input.result.toString() === uri.toString())).flat();
        if (mergeEditorTabs.includes(activeTab)) {
            didCloseTab = await window.tabGroups.close(mergeEditorTabs, true);
        }

        // Only stage if the merge editor has been successfully closed. That means all conflicts have been
        // handled or unhandled conflicts are OK by the user.
        if (didCloseTab) {
            await repository.add([uri]);
            await commands.executeCommand('workbench.view.scm');
        }*/
    }
    async runGitMergeNoDiff3() {
        await this.runGitMerge(false);
    }
    async runGitMergeDiff3() {
        await this.runGitMerge(true);
    }
    async runGitMerge(diff3) {
        const { activeTab } = vscode_1.window.tabGroups.activeTabGroup;
        if (!activeTab) {
            return;
        }
        const input = activeTab.input;
        if (!(input instanceof vscode_1.TabInputTextMerge)) {
            return;
        }
        const result = await this.git.mergeFile({
            basePath: input.base.fsPath,
            input1Path: input.input1.fsPath,
            input2Path: input.input2.fsPath,
            diff3,
        });
        const doc = vscode_1.workspace.textDocuments.find(doc => doc.uri.toString() === input.result.toString());
        if (!doc) {
            return;
        }
        const e = new vscode_1.WorkspaceEdit();
        e.replace(input.result, new vscode_1.Range(new vscode_1.Position(0, 0), new vscode_1.Position(doc.lineCount, 0)), result);
        await vscode_1.workspace.applyEdit(e);
    }
    async _stageChanges(textEditor, changes) {
        const modifiedDocument = textEditor.document;
        const modifiedUri = modifiedDocument.uri;
        if (modifiedUri.scheme !== 'file') {
            return;
        }
        const originalUri = (0, uri_1.toGitUri)(modifiedUri, '~');
        const originalDocument = await vscode_1.workspace.openTextDocument(originalUri);
        const result = (0, staging_1.applyLineChanges)(originalDocument, modifiedDocument, changes);
        await this.runByRepository(modifiedUri, async (repository, resource) => await repository.stage(resource, result, modifiedDocument.encoding));
    }
    async revertChange(uri, changes, index) {
        if (!uri) {
            return;
        }
        const textEditor = vscode_1.window.visibleTextEditors.filter(e => e.document.uri.toString() === uri.toString())[0];
        if (!textEditor) {
            return;
        }
        await this._revertChanges(textEditor, [...changes.slice(0, index), ...changes.slice(index + 1)]);
        const firstStagedLine = changes[index].modifiedStartLineNumber;
        textEditor.selections = [new vscode_1.Selection(firstStagedLine, 0, firstStagedLine, 0)];
    }
    async revertSelectedRanges() {
        const textEditor = vscode_1.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const workingTreeDiffInformation = (0, staging_1.getWorkingTreeDiffInformation)(textEditor);
        if (!workingTreeDiffInformation) {
            return;
        }
        const workingTreeLineChanges = (0, staging_1.toLineChanges)(workingTreeDiffInformation);
        this.logger.trace(`[CommandCenter][revertSelectedRanges] diffInformation: ${JSON.stringify(workingTreeDiffInformation)}`);
        this.logger.trace(`[CommandCenter][revertSelectedRanges] diffInformation changes: ${JSON.stringify(workingTreeLineChanges)}`);
        const modifiedDocument = textEditor.document;
        const selections = textEditor.selections;
        const selectedChanges = workingTreeLineChanges.filter(change => {
            const modifiedRange = (0, staging_1.getModifiedRange)(modifiedDocument, change);
            return selections.every(selection => !selection.intersection(modifiedRange));
        });
        if (selectedChanges.length === workingTreeLineChanges.length) {
            vscode_1.window.showInformationMessage(vscode_1.l10n.t('The selection range does not contain any changes.'));
            return;
        }
        this.logger.trace(`[CommandCenter][revertSelectedRanges] selectedChanges: ${JSON.stringify(selectedChanges)}`);
        const selectionsBeforeRevert = textEditor.selections;
        await this._revertChanges(textEditor, selectedChanges);
        textEditor.selections = selectionsBeforeRevert;
    }
    async _revertChanges(textEditor, changes) {
        const modifiedDocument = textEditor.document;
        const modifiedUri = modifiedDocument.uri;
        if (modifiedUri.scheme !== 'file') {
            return;
        }
        const originalUri = (0, uri_1.toGitUri)(modifiedUri, '~');
        const originalDocument = await vscode_1.workspace.openTextDocument(originalUri);
        const visibleRangesBeforeRevert = textEditor.visibleRanges;
        const result = (0, staging_1.applyLineChanges)(originalDocument, modifiedDocument, changes);
        const edit = new vscode_1.WorkspaceEdit();
        edit.replace(modifiedUri, new vscode_1.Range(new vscode_1.Position(0, 0), modifiedDocument.lineAt(modifiedDocument.lineCount - 1).range.end), result);
        vscode_1.workspace.applyEdit(edit);
        await modifiedDocument.save();
        textEditor.revealRange(visibleRangesBeforeRevert[0]);
    }
    async unstage(...resourceStates) {
        resourceStates = resourceStates.filter(s => !!s);
        if (resourceStates.length === 0 || (resourceStates[0] && !(resourceStates[0].resourceUri instanceof vscode_1.Uri))) {
            const resource = this.getSCMResource();
            if (!resource) {
                return;
            }
            resourceStates = [resource];
        }
        const scmResources = resourceStates
            .filter(s => s instanceof repository_1.Resource && s.resourceGroupType === 1 /* ResourceGroupType.Index */);
        if (!scmResources.length) {
            return;
        }
        const resources = scmResources.map(r => r.resourceUri);
        await this.runByRepository(resources, async (repository, resources) => repository.revert(resources));
    }
    async unstageAll(repository) {
        await repository.revert([]);
    }
    async unstageSelectedRanges() {
        const textEditor = vscode_1.window.activeTextEditor;
        if (!textEditor) {
            return;
        }
        const modifiedDocument = textEditor.document;
        const modifiedUri = modifiedDocument.uri;
        if (!(0, uri_1.isGitUri)(modifiedUri)) {
            return;
        }
        const { ref } = (0, uri_1.fromGitUri)(modifiedUri);
        if (ref !== '') {
            return;
        }
        const repository = this.model.getRepository(modifiedUri);
        if (!repository) {
            return;
        }
        const resource = repository.indexGroup.resourceStates
            .find(r => (0, util_1.pathEquals)(r.resourceUri.fsPath, modifiedUri.fsPath));
        if (!resource) {
            return;
        }
        const indexDiffInformation = (0, staging_1.getIndexDiffInformation)(textEditor);
        if (!indexDiffInformation) {
            return;
        }
        const indexLineChanges = (0, staging_1.toLineChanges)(indexDiffInformation);
        this.logger.trace(`[CommandCenter][unstageSelectedRanges] diffInformation: ${JSON.stringify(indexDiffInformation)}`);
        this.logger.trace(`[CommandCenter][unstageSelectedRanges] diffInformation changes: ${JSON.stringify(indexLineChanges)}`);
        const originalUri = (0, uri_1.toGitUri)(resource.original, 'HEAD');
        const originalDocument = await vscode_1.workspace.openTextDocument(originalUri);
        const selectedLines = (0, staging_1.toLineRanges)(textEditor.selections, modifiedDocument);
        const selectedDiffs = indexLineChanges
            .map(change => selectedLines.reduce((result, range) => result || (0, staging_1.intersectDiffWithRange)(modifiedDocument, change, range), null))
            .filter(c => !!c);
        if (!selectedDiffs.length) {
            vscode_1.window.showInformationMessage(vscode_1.l10n.t('The selection range does not contain any changes.'));
            return;
        }
        const invertedDiffs = selectedDiffs.map(staging_1.invertLineChange);
        this.logger.trace(`[CommandCenter][unstageSelectedRanges] selectedDiffs: ${JSON.stringify(selectedDiffs)}`);
        this.logger.trace(`[CommandCenter][unstageSelectedRanges] invertedDiffs: ${JSON.stringify(invertedDiffs)}`);
        const result = (0, staging_1.applyLineChanges)(modifiedDocument, originalDocument, invertedDiffs);
        await repository.stage(modifiedUri, result, modifiedDocument.encoding);
    }
    async unstageFile(uri) {
        if (!uri) {
            return;
        }
        const repository = this.model.getRepository(uri);
        if (!repository) {
            return;
        }
        const resources = repository.indexGroup.resourceStates
            .filter(r => r.multiFileDiffEditorModifiedUri?.toString() === uri.toString())
            .map(r => r.resourceUri);
        if (resources.length === 0) {
            return;
        }
        await repository.revert(resources);
    }
    async clean(...resourceStates) {
        // Remove duplicate resources
        const resourceUris = new Set();
        resourceStates = resourceStates.filter(s => {
            if (s === undefined) {
                return false;
            }
            if (resourceUris.has(s.resourceUri.toString())) {
                return false;
            }
            resourceUris.add(s.resourceUri.toString());
            return true;
        });
        if (resourceStates.length === 0 || (resourceStates[0] && !(resourceStates[0].resourceUri instanceof vscode_1.Uri))) {
            const resource = this.getSCMResource();
            if (!resource) {
                return;
            }
            resourceStates = [resource];
        }
        const scmResources = resourceStates.filter(s => s instanceof repository_1.Resource
            && (s.resourceGroupType === 2 /* ResourceGroupType.WorkingTree */ || s.resourceGroupType === 3 /* ResourceGroupType.Untracked */));
        if (!scmResources.length) {
            return;
        }
        await this._cleanAll(scmResources);
    }
    async cleanAll(repository) {
        await this._cleanAll(repository.workingTreeGroup.resourceStates);
    }
    async cleanAllTracked(repository) {
        const resources = repository.workingTreeGroup.resourceStates
            .filter(r => r.type !== 7 /* Status.UNTRACKED */ && r.type !== 8 /* Status.IGNORED */);
        if (resources.length === 0) {
            return;
        }
        await this._cleanTrackedChanges(resources);
    }
    async cleanAllUntracked(repository) {
        const resources = [...repository.workingTreeGroup.resourceStates, ...repository.untrackedGroup.resourceStates]
            .filter(r => r.type === 7 /* Status.UNTRACKED */ || r.type === 8 /* Status.IGNORED */);
        if (resources.length === 0) {
            return;
        }
        await this._cleanUntrackedChanges(resources);
    }
    async _cleanAll(resources) {
        if (resources.length === 0) {
            return;
        }
        const trackedResources = resources.filter(r => r.type !== 7 /* Status.UNTRACKED */ && r.type !== 8 /* Status.IGNORED */);
        const untrackedResources = resources.filter(r => r.type === 7 /* Status.UNTRACKED */ || r.type === 8 /* Status.IGNORED */);
        if (untrackedResources.length === 0) {
            // Tracked files only
            await this._cleanTrackedChanges(resources);
        }
        else if (trackedResources.length === 0) {
            // Untracked files only
            await this._cleanUntrackedChanges(resources);
        }
        else {
            // Tracked & Untracked files
            const [untrackedMessage, untrackedMessageDetail] = this.getDiscardUntrackedChangesDialogDetails(untrackedResources);
            const trackedMessage = trackedResources.length === 1
                ? vscode_1.l10n.t('\n\nAre you sure you want to discard changes in \'{0}\'?', path.basename(trackedResources[0].resourceUri.fsPath))
                : vscode_1.l10n.t('\n\nAre you sure you want to discard ALL changes in {0} files?', trackedResources.length);
            const yesTracked = trackedResources.length === 1
                ? vscode_1.l10n.t('Discard 1 Tracked File')
                : vscode_1.l10n.t('Discard All {0} Tracked Files', trackedResources.length);
            const yesAll = vscode_1.l10n.t('Discard All {0} Files', resources.length);
            const pick = await vscode_1.window.showWarningMessage(`${untrackedMessage} ${untrackedMessageDetail}${trackedMessage}\n\nThis is IRREVERSIBLE!\nYour current working set will be FOREVER LOST if you proceed.`, { modal: true }, yesTracked, yesAll);
            if (pick === yesTracked) {
                resources = trackedResources;
            }
            else if (pick !== yesAll) {
                return;
            }
            const resourceUris = resources.map(r => r.resourceUri);
            await this.runByRepository(resourceUris, async (repository, resources) => repository.clean(resources));
        }
    }
    async _cleanTrackedChanges(resources) {
        const allResourcesDeleted = resources.every(r => r.type === 6 /* Status.DELETED */);
        const message = allResourcesDeleted
            ? resources.length === 1
                ? vscode_1.l10n.t('Are you sure you want to restore \'{0}\'?', path.basename(resources[0].resourceUri.fsPath))
                : vscode_1.l10n.t('Are you sure you want to restore ALL {0} files?', resources.length)
            : resources.length === 1
                ? vscode_1.l10n.t('Are you sure you want to discard changes in \'{0}\'?', path.basename(resources[0].resourceUri.fsPath))
                : vscode_1.l10n.t('Are you sure you want to discard ALL changes in {0} files?\n\nThis is IRREVERSIBLE!\nYour current working set will be FOREVER LOST if you proceed.', resources.length);
        const yes = allResourcesDeleted
            ? resources.length === 1
                ? vscode_1.l10n.t('Restore File')
                : vscode_1.l10n.t('Restore All {0} Files', resources.length)
            : resources.length === 1
                ? vscode_1.l10n.t('Discard File')
                : vscode_1.l10n.t('Discard All {0} Files', resources.length);
        const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes);
        if (pick !== yes) {
            return;
        }
        const resourceUris = resources.map(r => r.resourceUri);
        await this.runByRepository(resourceUris, async (repository, resources) => repository.clean(resources));
    }
    async _cleanUntrackedChanges(resources) {
        const [message, messageDetail, primaryAction] = this.getDiscardUntrackedChangesDialogDetails(resources);
        const pick = await vscode_1.window.showWarningMessage(message, { detail: messageDetail, modal: true }, primaryAction);
        if (pick !== primaryAction) {
            return;
        }
        const resourceUris = resources.map(r => r.resourceUri);
        await this.runByRepository(resourceUris, async (repository, resources) => repository.clean(resources));
    }
    getDiscardUntrackedChangesDialogDetails(resources) {
        const config = vscode_1.workspace.getConfiguration('git');
        const discardUntrackedChangesToTrash = config.get('discardUntrackedChangesToTrash', true) && !util_1.isRemote && !util_1.isLinuxSnap;
        const messageWarning = !discardUntrackedChangesToTrash
            ? resources.length === 1
                ? '\n\nThis is IRREVERSIBLE!\nThis file will be FOREVER LOST if you proceed.'
                : '\n\nThis is IRREVERSIBLE!\nThese files will be FOREVER LOST if you proceed.'
            : '';
        const message = resources.length === 1
            ? vscode_1.l10n.t('Are you sure you want to DELETE the following untracked file: \'{0}\'?{1}', path.basename(resources[0].resourceUri.fsPath), messageWarning)
            : vscode_1.l10n.t('Are you sure you want to DELETE the {0} untracked files?{1}', resources.length, messageWarning);
        const messageDetail = discardUntrackedChangesToTrash
            ? util_1.isWindows
                ? resources.length === 1
                    ? 'You can restore this file from the Recycle Bin.'
                    : 'You can restore these files from the Recycle Bin.'
                : resources.length === 1
                    ? 'You can restore this file from the Trash.'
                    : 'You can restore these files from the Trash.'
            : '';
        const primaryAction = discardUntrackedChangesToTrash
            ? util_1.isWindows
                ? vscode_1.l10n.t('Move to Recycle Bin')
                : vscode_1.l10n.t('Move to Trash')
            : resources.length === 1
                ? vscode_1.l10n.t('Delete File')
                : vscode_1.l10n.t('Delete All {0} Files', resources.length);
        return [message, messageDetail, primaryAction];
    }
    async smartCommit(repository, getCommitMessage, opts) {
        const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
        let promptToSaveFilesBeforeCommit = config.get('promptToSaveFilesBeforeCommit');
        // migration
        if (promptToSaveFilesBeforeCommit === true) {
            promptToSaveFilesBeforeCommit = 'always';
        }
        else if (promptToSaveFilesBeforeCommit === false) {
            promptToSaveFilesBeforeCommit = 'never';
        }
        let enableSmartCommit = config.get('enableSmartCommit') === true;
        const enableCommitSigning = config.get('enableCommitSigning') === true;
        let noStagedChanges = repository.indexGroup.resourceStates.length === 0;
        let noUnstagedChanges = repository.workingTreeGroup.resourceStates.length === 0;
        if (!opts.empty) {
            if (promptToSaveFilesBeforeCommit !== 'never') {
                let documents = vscode_1.workspace.textDocuments
                    .filter(d => !d.isUntitled && d.isDirty && (0, util_1.isDescendant)(repository.root, d.uri.fsPath));
                if (promptToSaveFilesBeforeCommit === 'staged' || repository.indexGroup.resourceStates.length > 0) {
                    documents = documents
                        .filter(d => repository.indexGroup.resourceStates.some(s => (0, util_1.pathEquals)(s.resourceUri.fsPath, d.uri.fsPath)));
                }
                if (documents.length > 0) {
                    const message = documents.length === 1
                        ? vscode_1.l10n.t('The following file has unsaved changes which won\'t be included in the commit if you proceed: {0}.\n\nWould you like to save it before committing?', path.basename(documents[0].uri.fsPath))
                        : vscode_1.l10n.t('There are {0} unsaved files.\n\nWould you like to save them before committing?', documents.length);
                    const saveAndCommit = vscode_1.l10n.t('Save All & Commit Changes');
                    const commit = vscode_1.l10n.t('Commit Changes');
                    const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, saveAndCommit, commit);
                    if (pick === saveAndCommit) {
                        await Promise.all(documents.map(d => d.save()));
                        // After saving the dirty documents, if there are any documents that are part of the
                        // index group we have to add them back in order for the saved changes to be committed
                        documents = documents
                            .filter(d => repository.indexGroup.resourceStates.some(s => (0, util_1.pathEquals)(s.resourceUri.fsPath, d.uri.fsPath)));
                        await repository.add(documents.map(d => d.uri));
                        noStagedChanges = repository.indexGroup.resourceStates.length === 0;
                        noUnstagedChanges = repository.workingTreeGroup.resourceStates.length === 0;
                    }
                    else if (pick !== commit) {
                        return; // do not commit on cancel
                    }
                }
            }
            // no changes, and the user has not configured to commit all in this case
            if (!noUnstagedChanges && noStagedChanges && !enableSmartCommit && !opts.all && !opts.amend) {
                const suggestSmartCommit = config.get('suggestSmartCommit') === true;
                if (!suggestSmartCommit) {
                    return;
                }
                // prompt the user if we want to commit all or not
                const message = vscode_1.l10n.t('There are no staged changes to commit.\n\nWould you like to stage all your changes and commit them directly?');
                const yes = vscode_1.l10n.t('Yes');
                const always = vscode_1.l10n.t('Always');
                const never = vscode_1.l10n.t('Never');
                const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes, always, never);
                if (pick === always) {
                    enableSmartCommit = true;
                    config.update('enableSmartCommit', true, true);
                }
                else if (pick === never) {
                    config.update('suggestSmartCommit', false, true);
                    return;
                }
                else if (pick === yes) {
                    enableSmartCommit = true;
                }
                else {
                    // Cancel
                    return;
                }
            }
            // smart commit
            if (enableSmartCommit && !opts.all) {
                opts = { ...opts, all: noStagedChanges };
            }
        }
        // enable signing of commits if configured
        opts.signCommit = enableCommitSigning;
        if (config.get('alwaysSignOff')) {
            opts.signoff = true;
        }
        if (config.get('useEditorAsCommitInput')) {
            opts.useEditor = true;
            if (config.get('verboseCommit')) {
                opts.verbose = true;
            }
        }
        const smartCommitChanges = config.get('smartCommitChanges');
        if ((
        // no changes
        (noStagedChanges && noUnstagedChanges)
            // or no staged changes and not `all`
            || (!opts.all && noStagedChanges)
            // no staged changes and no tracked unstaged changes
            || (noStagedChanges && smartCommitChanges === 'tracked' && repository.workingTreeGroup.resourceStates.every(r => r.type === 7 /* Status.UNTRACKED */)))
            // amend allows changing only the commit message
            && !opts.amend
            && !opts.empty
            // merge not in progress
            && !repository.mergeInProgress
            // rebase not in progress
            && repository.rebaseCommit === undefined) {
            const commitAnyway = vscode_1.l10n.t('Create Empty Commit');
            const answer = await vscode_1.window.showInformationMessage(vscode_1.l10n.t('There are no changes to commit.'), commitAnyway);
            if (answer !== commitAnyway) {
                return;
            }
            opts.empty = true;
        }
        if (opts.noVerify) {
            if (!config.get('allowNoVerifyCommit')) {
                await vscode_1.window.showErrorMessage(vscode_1.l10n.t('Commits without verification are not allowed, please enable them with the "git.allowNoVerifyCommit" setting.'));
                return;
            }
            if (config.get('confirmNoVerifyCommit')) {
                const message = vscode_1.l10n.t('You are about to commit your changes without verification, this skips pre-commit hooks and can be undesirable.\n\nAre you sure to continue?');
                const yes = vscode_1.l10n.t('OK');
                const neverAgain = vscode_1.l10n.t('OK, Don\'t Ask Again');
                const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes, neverAgain);
                if (pick === neverAgain) {
                    config.update('confirmNoVerifyCommit', false, true);
                }
                else if (pick !== yes) {
                    return;
                }
            }
        }
        const message = await getCommitMessage();
        if (!message && !opts.amend && !opts.useEditor) {
            return;
        }
        if (opts.all && smartCommitChanges === 'tracked') {
            opts.all = 'tracked';
        }
        if (opts.all && config.get('untrackedChanges') !== 'mixed') {
            opts.all = 'tracked';
        }
        // Diagnostics commit hook
        const diagnosticsResult = await evaluateDiagnosticsCommitHook(repository, opts);
        if (!diagnosticsResult) {
            return;
        }
        // Branch protection commit hook
        const branchProtectionPrompt = config.get('branchProtectionPrompt');
        if (repository.isBranchProtected() && (branchProtectionPrompt === 'alwaysPrompt' || branchProtectionPrompt === 'alwaysCommitToNewBranch')) {
            const commitToNewBranch = vscode_1.l10n.t('Commit to a New Branch');
            let pick = commitToNewBranch;
            if (branchProtectionPrompt === 'alwaysPrompt') {
                const message = vscode_1.l10n.t('You are trying to commit to a protected branch and you might not have permission to push your commits to the remote.\n\nHow would you like to proceed?');
                const commit = vscode_1.l10n.t('Commit Anyway');
                pick = await vscode_1.window.showWarningMessage(message, { modal: true }, commitToNewBranch, commit);
            }
            if (!pick) {
                return;
            }
            else if (pick === commitToNewBranch) {
                const branchName = await this.promptForBranchName(repository);
                if (!branchName) {
                    return;
                }
                await repository.branch(branchName, true);
            }
        }
        await repository.commit(message, opts);
    }
    async commitWithAnyInput(repository, opts) {
        const message = repository.inputBox.value;
        const root = vscode_1.Uri.file(repository.root);
        const config = vscode_1.workspace.getConfiguration('git', root);
        const getCommitMessage = async () => {
            let _message = message;
            if (!_message && !config.get('useEditorAsCommitInput')) {
                const value = undefined;
                if (opts && opts.amend && repository.HEAD && repository.HEAD.commit) {
                    return undefined;
                }
                const branchName = repository.headShortName;
                let placeHolder;
                if (branchName) {
                    placeHolder = vscode_1.l10n.t('Message (commit on "{0}")', branchName);
                }
                else {
                    placeHolder = vscode_1.l10n.t('Commit message');
                }
                _message = await vscode_1.window.showInputBox({
                    value,
                    placeHolder,
                    prompt: vscode_1.l10n.t('Please provide a commit message'),
                    ignoreFocusOut: true
                });
            }
            return _message;
        };
        await this.smartCommit(repository, getCommitMessage, opts);
    }
    async commit(repository, postCommitCommand) {
        await this.commitWithAnyInput(repository, { postCommitCommand });
    }
    async commitAmend(repository) {
        await this.commitWithAnyInput(repository, { amend: true });
    }
    async commitSigned(repository) {
        await this.commitWithAnyInput(repository, { signoff: true });
    }
    async commitStaged(repository) {
        await this.commitWithAnyInput(repository, { all: false });
    }
    async commitStagedSigned(repository) {
        await this.commitWithAnyInput(repository, { all: false, signoff: true });
    }
    async commitStagedAmend(repository) {
        await this.commitWithAnyInput(repository, { all: false, amend: true });
    }
    async commitAll(repository) {
        await this.commitWithAnyInput(repository, { all: true });
    }
    async commitAllSigned(repository) {
        await this.commitWithAnyInput(repository, { all: true, signoff: true });
    }
    async commitAllAmend(repository) {
        await this.commitWithAnyInput(repository, { all: true, amend: true });
    }
    async commitMessageAccept(arg) {
        if (!arg && !vscode_1.window.activeTextEditor) {
            return;
        }
        arg ?? (arg = vscode_1.window.activeTextEditor.document.uri);
        // Close the tab
        this._closeEditorTab(arg);
    }
    async commitMessageDiscard(arg) {
        if (!arg && !vscode_1.window.activeTextEditor) {
            return;
        }
        arg ?? (arg = vscode_1.window.activeTextEditor.document.uri);
        // Clear the contents of the editor
        const editors = vscode_1.window.visibleTextEditors
            .filter(e => e.document.languageId === 'git-commit' && e.document.uri.toString() === arg.toString());
        if (editors.length !== 1) {
            return;
        }
        const commitMsgEditor = editors[0];
        const commitMsgDocument = commitMsgEditor.document;
        const editResult = await commitMsgEditor.edit(builder => {
            const firstLine = commitMsgDocument.lineAt(0);
            const lastLine = commitMsgDocument.lineAt(commitMsgDocument.lineCount - 1);
            builder.delete(new vscode_1.Range(firstLine.range.start, lastLine.range.end));
        });
        if (!editResult) {
            return;
        }
        // Save the document
        const saveResult = await commitMsgDocument.save();
        if (!saveResult) {
            return;
        }
        // Close the tab
        this._closeEditorTab(arg);
    }
    _closeEditorTab(uri) {
        const tabToClose = vscode_1.window.tabGroups.all.map(g => g.tabs).flat()
            .filter(t => t.input instanceof vscode_1.TabInputText && t.input.uri.toString() === uri.toString());
        vscode_1.window.tabGroups.close(tabToClose);
    }
    async _commitEmpty(repository, noVerify) {
        const root = vscode_1.Uri.file(repository.root);
        const config = vscode_1.workspace.getConfiguration('git', root);
        const shouldPrompt = config.get('confirmEmptyCommits') === true;
        if (shouldPrompt) {
            const message = vscode_1.l10n.t('Are you sure you want to create an empty commit?');
            const yes = vscode_1.l10n.t('Yes');
            const neverAgain = vscode_1.l10n.t('Yes, Don\'t Show Again');
            const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes, neverAgain);
            if (pick === neverAgain) {
                await config.update('confirmEmptyCommits', false, true);
            }
            else if (pick !== yes) {
                return;
            }
        }
        await this.commitWithAnyInput(repository, { empty: true, noVerify });
    }
    async commitEmpty(repository) {
        await this._commitEmpty(repository);
    }
    async commitNoVerify(repository) {
        await this.commitWithAnyInput(repository, { noVerify: true });
    }
    async commitStagedNoVerify(repository) {
        await this.commitWithAnyInput(repository, { all: false, noVerify: true });
    }
    async commitStagedSignedNoVerify(repository) {
        await this.commitWithAnyInput(repository, { all: false, signoff: true, noVerify: true });
    }
    async commitAmendNoVerify(repository) {
        await this.commitWithAnyInput(repository, { amend: true, noVerify: true });
    }
    async commitSignedNoVerify(repository) {
        await this.commitWithAnyInput(repository, { signoff: true, noVerify: true });
    }
    async commitStagedAmendNoVerify(repository) {
        await this.commitWithAnyInput(repository, { all: false, amend: true, noVerify: true });
    }
    async commitAllNoVerify(repository) {
        await this.commitWithAnyInput(repository, { all: true, noVerify: true });
    }
    async commitAllSignedNoVerify(repository) {
        await this.commitWithAnyInput(repository, { all: true, signoff: true, noVerify: true });
    }
    async commitAllAmendNoVerify(repository) {
        await this.commitWithAnyInput(repository, { all: true, amend: true, noVerify: true });
    }
    async commitEmptyNoVerify(repository) {
        await this._commitEmpty(repository, true);
    }
    async restoreCommitTemplate(repository) {
        repository.inputBox.value = await repository.getCommitTemplate();
    }
    async undoCommit(repository) {
        const HEAD = repository.HEAD;
        if (!HEAD || !HEAD.commit) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('Can\'t undo because HEAD doesn\'t point to any commit.'));
            return;
        }
        const commit = await repository.getCommit('HEAD');
        if (commit.parents.length > 1) {
            const yes = vscode_1.l10n.t('Undo merge commit');
            const result = await vscode_1.window.showWarningMessage(vscode_1.l10n.t('The last commit was a merge commit. Are you sure you want to undo it?'), { modal: true }, yes);
            if (result !== yes) {
                return;
            }
        }
        if (commit.parents.length > 0) {
            await repository.reset('HEAD~');
        }
        else {
            await repository.deleteRef('HEAD');
            await this.unstageAll(repository);
        }
        repository.inputBox.value = commit.message;
    }
    async checkout(repository, treeish) {
        return this._checkout(repository, { treeish });
    }
    async checkout2(repository, historyItem, historyItemRefId) {
        const historyItemRef = historyItem?.references?.find(r => r.id === historyItemRefId);
        if (!historyItemRef) {
            return;
        }
        const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
        const pullBeforeCheckout = config.get('pullBeforeCheckout', false) === true;
        // Branch, tag
        if (historyItemRef.id.startsWith('refs/heads/') || historyItemRef.id.startsWith('refs/tags/')) {
            await repository.checkout(historyItemRef.name, { pullBeforeCheckout });
            return;
        }
        // Remote branch
        const branches = await repository.findTrackingBranches(historyItemRef.name);
        if (branches.length > 0) {
            await repository.checkout(branches[0].name, { pullBeforeCheckout });
        }
        else {
            await repository.checkoutTracking(historyItemRef.name);
        }
    }
    async checkoutDetached(repository, treeish) {
        return this._checkout(repository, { detached: true, treeish });
    }
    async checkoutDetached2(repository, historyItem) {
        if (!historyItem) {
            return false;
        }
        return this._checkout(repository, { detached: true, treeish: historyItem.id });
    }
    async _checkout(repository, opts) {
        if (typeof opts?.treeish === 'string') {
            await repository.checkout(opts?.treeish, opts);
            return true;
        }
        const createBranch = new CreateBranchItem();
        const createBranchFrom = new CreateBranchFromItem();
        const checkoutDetached = new CheckoutDetachedItem();
        const picks = [];
        const commands = [];
        if (!opts?.detached) {
            commands.push(createBranch, createBranchFrom, checkoutDetached);
        }
        const disposables = [];
        const quickPick = vscode_1.window.createQuickPick();
        quickPick.busy = true;
        quickPick.sortByLabel = false;
        quickPick.matchOnDetail = false;
        quickPick.placeholder = opts?.detached
            ? vscode_1.l10n.t('Select a branch to checkout in detached mode')
            : vscode_1.l10n.t('Select a branch or tag to checkout');
        quickPick.show();
        picks.push(...await createCheckoutItems(repository, opts?.detached));
        const setQuickPickItems = () => {
            switch (true) {
                case quickPick.value === '':
                    quickPick.items = [...commands, ...picks];
                    break;
                case commands.length === 0:
                    quickPick.items = picks;
                    break;
                case picks.length === 0:
                    quickPick.items = commands;
                    break;
                default:
                    quickPick.items = [...picks, { label: '', kind: vscode_1.QuickPickItemKind.Separator }, ...commands];
                    break;
            }
        };
        setQuickPickItems();
        quickPick.busy = false;
        const choice = await new Promise(c => {
            disposables.push(quickPick.onDidHide(() => c(undefined)));
            disposables.push(quickPick.onDidAccept(() => c(quickPick.activeItems[0])));
            disposables.push((quickPick.onDidTriggerItemButton((e) => {
                const button = e.button;
                const item = e.item;
                if (button.actual && item.refName) {
                    button.actual.run(item.refRemote ? item.refName.substring(item.refRemote.length + 1) : item.refName);
                }
                c(undefined);
            })));
            disposables.push(quickPick.onDidChangeValue(() => setQuickPickItems()));
        });
        (0, util_1.dispose)(disposables);
        quickPick.dispose();
        if (!choice) {
            return false;
        }
        if (choice === createBranch) {
            await this._branch(repository, quickPick.value);
        }
        else if (choice === createBranchFrom) {
            await this._branch(repository, quickPick.value, true);
        }
        else if (choice === checkoutDetached) {
            return this._checkout(repository, { detached: true });
        }
        else {
            const item = choice;
            try {
                await item.run(repository, opts);
            }
            catch (err) {
                if (err.gitErrorCode !== "DirtyWorkTree" /* GitErrorCodes.DirtyWorkTree */) {
                    throw err;
                }
                const stash = vscode_1.l10n.t('Stash & Checkout');
                const migrate = vscode_1.l10n.t('Migrate Changes');
                const force = vscode_1.l10n.t('Force Checkout');
                const choice = await vscode_1.window.showWarningMessage(vscode_1.l10n.t('Your local changes would be overwritten by checkout.'), { modal: true }, stash, migrate, force);
                if (choice === force) {
                    await this.cleanAll(repository);
                    await item.run(repository, opts);
                }
                else if (choice === stash || choice === migrate) {
                    if (await this._stash(repository, true)) {
                        await item.run(repository, opts);
                        if (choice === migrate) {
                            await this.stashPopLatest(repository);
                        }
                    }
                }
            }
        }
        return true;
    }
    async branch(repository, historyItem) {
        await this._branch(repository, undefined, false, historyItem?.id);
    }
    async branchFrom(repository) {
        await this._branch(repository, undefined, true);
    }
    async generateRandomBranchName(repository, separator) {
        const config = vscode_1.workspace.getConfiguration('git');
        const branchRandomNameDictionary = config.get('branchRandomName.dictionary');
        const dictionaries = [];
        for (const dictionary of branchRandomNameDictionary) {
            if (dictionary.toLowerCase() === 'adjectives') {
                dictionaries.push(unique_names_generator_1.adjectives);
            }
            if (dictionary.toLowerCase() === 'animals') {
                dictionaries.push(unique_names_generator_1.animals);
            }
            if (dictionary.toLowerCase() === 'colors') {
                dictionaries.push(unique_names_generator_1.colors);
            }
            if (dictionary.toLowerCase() === 'numbers') {
                dictionaries.push(unique_names_generator_1.NumberDictionary.generate({ length: 3 }));
            }
        }
        if (dictionaries.length === 0) {
            return '';
        }
        // 5 attempts to generate a random branch name
        for (let index = 0; index < 5; index++) {
            const randomName = (0, unique_names_generator_1.uniqueNamesGenerator)({
                dictionaries,
                length: dictionaries.length,
                separator
            });
            // Check for local ref conflict
            const refs = await repository.getRefs({ pattern: `refs/heads/${randomName}` });
            if (refs.length === 0) {
                return randomName;
            }
        }
        return '';
    }
    async promptForBranchName(repository, defaultName, initialValue) {
        const config = vscode_1.workspace.getConfiguration('git');
        const branchPrefix = config.get('branchPrefix');
        const branchWhitespaceChar = config.get('branchWhitespaceChar');
        const branchValidationRegex = config.get('branchValidationRegex');
        const branchRandomNameEnabled = config.get('branchRandomName.enable', false);
        if (defaultName) {
            return sanitizeBranchName(defaultName, branchWhitespaceChar);
        }
        const getBranchName = async () => {
            const branchName = branchRandomNameEnabled ? await this.generateRandomBranchName(repository, branchWhitespaceChar) : '';
            return `${branchPrefix}${branchName}`;
        };
        const getValueSelection = (value) => {
            return value.startsWith(branchPrefix) ? [branchPrefix.length, value.length] : undefined;
        };
        const getValidationMessage = (name) => {
            const validateName = new RegExp(branchValidationRegex);
            const sanitizedName = sanitizeBranchName(name, branchWhitespaceChar);
            if (validateName.test(sanitizedName)) {
                // If the sanitized name that we will use is different than what is
                // in the input box, show an info message to the user informing them
                // the branch name that will be used.
                return name === sanitizedName
                    ? undefined
                    : {
                        message: vscode_1.l10n.t('The new branch will be "{0}"', sanitizedName),
                        severity: vscode_1.InputBoxValidationSeverity.Info
                    };
            }
            return vscode_1.l10n.t('Branch name needs to match regex: {0}', branchValidationRegex);
        };
        const disposables = [];
        const inputBox = vscode_1.window.createInputBox();
        inputBox.placeholder = vscode_1.l10n.t('Branch name');
        inputBox.prompt = vscode_1.l10n.t('Please provide a new branch name');
        inputBox.buttons = branchRandomNameEnabled ? [
            {
                iconPath: new vscode_1.ThemeIcon('refresh'),
                tooltip: vscode_1.l10n.t('Regenerate Branch Name'),
                location: vscode_1.QuickInputButtonLocation.Inline
            }
        ] : [];
        inputBox.value = initialValue ?? await getBranchName();
        inputBox.valueSelection = getValueSelection(inputBox.value);
        inputBox.validationMessage = getValidationMessage(inputBox.value);
        inputBox.ignoreFocusOut = true;
        inputBox.show();
        const branchName = await new Promise((resolve) => {
            disposables.push(inputBox.onDidHide(() => resolve(undefined)));
            disposables.push(inputBox.onDidAccept(() => resolve(inputBox.value)));
            disposables.push(inputBox.onDidChangeValue(value => {
                inputBox.validationMessage = getValidationMessage(value);
            }));
            disposables.push(inputBox.onDidTriggerButton(async () => {
                inputBox.value = await getBranchName();
                inputBox.valueSelection = getValueSelection(inputBox.value);
            }));
        });
        (0, util_1.dispose)(disposables);
        inputBox.dispose();
        return sanitizeBranchName(branchName || '', branchWhitespaceChar);
    }
    async _branch(repository, defaultName, from = false, target) {
        target = target ?? 'HEAD';
        const config = vscode_1.workspace.getConfiguration('git');
        const showRefDetails = config.get('showReferenceDetails') === true;
        if (from) {
            const getRefPicks = async () => {
                const refs = await repository.getRefs({ includeCommitDetails: showRefDetails });
                const refProcessors = new RefItemsProcessor(repository, [
                    new RefProcessor(0 /* RefType.Head */),
                    new RefProcessor(1 /* RefType.RemoteHead */),
                    new RefProcessor(2 /* RefType.Tag */)
                ]);
                return [new HEADItem(repository), ...refProcessors.processRefs(refs)];
            };
            const placeHolder = vscode_1.l10n.t('Select a ref to create the branch from');
            const choice = await vscode_1.window.showQuickPick(getRefPicks(), { placeHolder });
            if (!choice) {
                return;
            }
            if (choice instanceof RefItem && choice.refName) {
                target = choice.refName;
            }
        }
        const branchName = await this.promptForBranchName(repository, defaultName);
        if (!branchName) {
            return;
        }
        await repository.branch(branchName, true, target);
    }
    async pickRef(items, placeHolder) {
        const disposables = [];
        const quickPick = vscode_1.window.createQuickPick();
        quickPick.placeholder = placeHolder;
        quickPick.sortByLabel = false;
        quickPick.busy = true;
        quickPick.show();
        quickPick.items = await items;
        quickPick.busy = false;
        const choice = await new Promise(resolve => {
            disposables.push(quickPick.onDidHide(() => resolve(undefined)));
            disposables.push(quickPick.onDidAccept(() => resolve(quickPick.activeItems[0])));
        });
        (0, util_1.dispose)(disposables);
        quickPick.dispose();
        return choice;
    }
    async deleteBranch(repository, name, force) {
        await this._deleteBranch(repository, undefined, name, { remote: false, force });
    }
    async deleteBranch2(repository, historyItem, historyItemRefId) {
        const historyItemRef = historyItem?.references?.find(r => r.id === historyItemRefId);
        if (!historyItemRef) {
            return;
        }
        // Local branch
        if (historyItemRef.id.startsWith('refs/heads/')) {
            if (historyItemRef.id === repository.historyProvider.currentHistoryItemRef?.id) {
                vscode_1.window.showInformationMessage(vscode_1.l10n.t('The active branch cannot be deleted.'));
                return;
            }
            await this._deleteBranch(repository, undefined, historyItemRef.name, { remote: false });
            return;
        }
        // Remote branch
        if (historyItemRef.id === repository.historyProvider.currentHistoryItemRemoteRef?.id) {
            vscode_1.window.showInformationMessage(vscode_1.l10n.t('The remote branch of the active branch cannot be deleted.'));
            return;
        }
        const index = historyItemRef.name.indexOf('/');
        if (index === -1) {
            return;
        }
        const remoteName = historyItemRef.name.substring(0, index);
        const refName = historyItemRef.name.substring(index + 1);
        await this._deleteBranch(repository, remoteName, refName, { remote: true });
    }
    async deleteRemoteBranch(repository) {
        await this._deleteBranch(repository, undefined, undefined, { remote: true });
    }
    async _deleteBranch(repository, remote, name, options) {
        let run;
        const config = vscode_1.workspace.getConfiguration('git');
        const showRefDetails = config.get('showReferenceDetails') === true;
        if (!options.remote && typeof name === 'string') {
            // Local branch
            run = force => repository.deleteBranch(name, force);
        }
        else if (options.remote && typeof remote === 'string' && typeof name === 'string') {
            // Remote branch
            run = force => repository.deleteRemoteRef(remote, name, { force });
        }
        else {
            const getBranchPicks = async () => {
                const pattern = options.remote ? 'refs/remotes' : 'refs/heads';
                const refs = await repository.getRefs({ pattern, includeCommitDetails: showRefDetails });
                const processors = options.remote
                    ? [new RefProcessor(1 /* RefType.RemoteHead */, BranchDeleteItem)]
                    : [new RefProcessor(0 /* RefType.Head */, BranchDeleteItem)];
                const itemsProcessor = new RefItemsProcessor(repository, processors, {
                    skipCurrentBranch: true,
                    skipCurrentBranchRemote: true
                });
                return itemsProcessor.processRefs(refs);
            };
            const placeHolder = !options.remote
                ? vscode_1.l10n.t('Select a branch to delete')
                : vscode_1.l10n.t('Select a remote branch to delete');
            const choice = await this.pickRef(getBranchPicks(), placeHolder);
            if (!(choice instanceof BranchDeleteItem) || !choice.refName) {
                return;
            }
            name = choice.refName;
            run = force => choice.run(repository, force);
        }
        try {
            await run(options.force);
        }
        catch (err) {
            if (err.gitErrorCode !== "BranchNotFullyMerged" /* GitErrorCodes.BranchNotFullyMerged */) {
                throw err;
            }
            const message = vscode_1.l10n.t('The branch "{0}" is not fully merged. Delete anyway?', name);
            const yes = vscode_1.l10n.t('Delete Branch');
            const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes);
            if (pick === yes) {
                await run(true);
            }
        }
    }
    async renameBranch(repository) {
        const currentBranchName = repository.HEAD && repository.HEAD.name;
        const branchName = await this.promptForBranchName(repository, undefined, currentBranchName);
        if (!branchName) {
            return;
        }
        try {
            await repository.renameBranch(branchName);
        }
        catch (err) {
            switch (err.gitErrorCode) {
                case "InvalidBranchName" /* GitErrorCodes.InvalidBranchName */:
                    vscode_1.window.showErrorMessage(vscode_1.l10n.t('Invalid branch name'));
                    return;
                case "BranchAlreadyExists" /* GitErrorCodes.BranchAlreadyExists */:
                    vscode_1.window.showErrorMessage(vscode_1.l10n.t('A branch named "{0}" already exists', branchName));
                    return;
                default:
                    throw err;
            }
        }
    }
    async merge(repository) {
        const config = vscode_1.workspace.getConfiguration('git');
        const showRefDetails = config.get('showReferenceDetails') === true;
        const getQuickPickItems = async () => {
            const refs = await repository.getRefs({ includeCommitDetails: showRefDetails });
            const itemsProcessor = new RefItemsProcessor(repository, [
                new RefProcessor(0 /* RefType.Head */, MergeItem),
                new RefProcessor(1 /* RefType.RemoteHead */, MergeItem),
                new RefProcessor(2 /* RefType.Tag */, MergeItem)
            ], {
                skipCurrentBranch: true,
                skipCurrentBranchRemote: true
            });
            return itemsProcessor.processRefs(refs);
        };
        const placeHolder = vscode_1.l10n.t('Select a branch or tag to merge from');
        const choice = await this.pickRef(getQuickPickItems(), placeHolder);
        if (choice instanceof MergeItem) {
            await choice.run(repository);
        }
    }
    async abortMerge(repository) {
        await repository.mergeAbort();
    }
    async rebase(repository) {
        const config = vscode_1.workspace.getConfiguration('git');
        const showRefDetails = config.get('showReferenceDetails') === true;
        const getQuickPickItems = async () => {
            const refs = await repository.getRefs({ includeCommitDetails: showRefDetails });
            const itemsProcessor = new RefItemsProcessor(repository, [
                new RefProcessor(0 /* RefType.Head */, RebaseItem),
                new RefProcessor(1 /* RefType.RemoteHead */, RebaseItem)
            ], {
                skipCurrentBranch: true,
                skipCurrentBranchRemote: true
            });
            const quickPickItems = itemsProcessor.processRefs(refs);
            if (repository.HEAD?.upstream) {
                const upstreamRef = refs.find(ref => ref.type === 1 /* RefType.RemoteHead */ &&
                    ref.name === `${repository.HEAD.upstream.remote}/${repository.HEAD.upstream.name}`);
                if (upstreamRef) {
                    quickPickItems.splice(0, 0, new RebaseUpstreamItem(upstreamRef));
                }
            }
            return quickPickItems;
        };
        const placeHolder = vscode_1.l10n.t('Select a branch to rebase onto');
        const choice = await this.pickRef(getQuickPickItems(), placeHolder);
        if (choice instanceof RebaseItem) {
            await choice.run(repository);
        }
    }
    async createTag(repository, historyItem) {
        const inputTagName = await vscode_1.window.showInputBox({
            placeHolder: vscode_1.l10n.t('Tag name'),
            prompt: vscode_1.l10n.t('Please provide a tag name'),
            ignoreFocusOut: true
        });
        if (!inputTagName) {
            return;
        }
        const inputMessage = await vscode_1.window.showInputBox({
            placeHolder: vscode_1.l10n.t('Message'),
            prompt: vscode_1.l10n.t('Please provide a message to annotate the tag'),
            ignoreFocusOut: true
        });
        const name = inputTagName.replace(/^\.|\/\.|\.\.|~|\^|:|\/$|\.lock$|\.lock\/|\\|\*|\s|^\s*$|\.$/g, '-');
        await repository.tag({ name, message: inputMessage, ref: historyItem?.id });
    }
    async deleteTag(repository) {
        const config = vscode_1.workspace.getConfiguration('git');
        const showRefDetails = config.get('showReferenceDetails') === true;
        const tagPicks = async () => {
            const remoteTags = await repository.getRefs({ pattern: 'refs/tags', includeCommitDetails: showRefDetails });
            return remoteTags.length === 0 ? [{ label: vscode_1.l10n.t('$(info) This repository has no tags.') }] : remoteTags.map(ref => new TagDeleteItem(ref));
        };
        const placeHolder = vscode_1.l10n.t('Select a tag to delete');
        const choice = await this.pickRef(tagPicks(), placeHolder);
        if (choice instanceof TagDeleteItem) {
            await choice.run(repository);
        }
    }
    async deleteTag2(repository, historyItem, historyItemRefId) {
        const historyItemRef = historyItem?.references?.find(r => r.id === historyItemRefId);
        if (!historyItemRef) {
            return;
        }
        await repository.deleteTag(historyItemRef.name);
    }
    async deleteRemoteTag(repository) {
        const remotePicks = repository.remotes
            .filter(r => r.pushUrl !== undefined)
            .map(r => new RemoteItem(repository, r));
        if (remotePicks.length === 0) {
            vscode_1.window.showErrorMessage(vscode_1.l10n.t("Your repository has no remotes configured to push to."));
            return;
        }
        let remoteName = remotePicks[0].remoteName;
        if (remotePicks.length > 1) {
            const remotePickPlaceholder = vscode_1.l10n.t('Select a remote to delete a tag from');
            const remotePick = await vscode_1.window.showQuickPick(remotePicks, { placeHolder: remotePickPlaceholder });
            if (!remotePick) {
                return;
            }
            remoteName = remotePick.remoteName;
        }
        const remoteTagPicks = async () => {
            const remoteTagsRaw = await repository.getRemoteRefs(remoteName, { tags: true });
            // Deduplicate annotated and lightweight tags
            const remoteTagNames = new Set();
            const remoteTags = [];
            for (const tag of remoteTagsRaw) {
                const tagName = (tag.name ?? '').replace(/\^{}$/, '');
                if (!remoteTagNames.has(tagName)) {
                    remoteTags.push({ ...tag, name: tagName });
                    remoteTagNames.add(tagName);
                }
            }
            return remoteTags.length === 0 ? [{ label: vscode_1.l10n.t('$(info) Remote "{0}" has no tags.', remoteName) }] : remoteTags.map(ref => new RemoteTagDeleteItem(ref));
        };
        const tagPickPlaceholder = vscode_1.l10n.t('Select a remote tag to delete');
        const remoteTagPick = await vscode_1.window.showQuickPick(remoteTagPicks(), { placeHolder: tagPickPlaceholder });
        if (remoteTagPick instanceof RemoteTagDeleteItem) {
            await remoteTagPick.run(repository, remoteName);
        }
    }
    async fetch(repository) {
        if (repository.remotes.length === 0) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('This repository has no remotes configured to fetch from.'));
            return;
        }
        if (repository.remotes.length === 1) {
            await repository.fetchDefault();
            return;
        }
        const remoteItems = repository.remotes.map(r => new RemoteItem(repository, r));
        if (repository.HEAD?.upstream?.remote) {
            // Move default remote to the top
            const defaultRemoteIndex = remoteItems
                .findIndex(r => r.remoteName === repository.HEAD.upstream.remote);
            if (defaultRemoteIndex !== -1) {
                remoteItems.splice(0, 0, ...remoteItems.splice(defaultRemoteIndex, 1));
            }
        }
        const quickpick = vscode_1.window.createQuickPick();
        quickpick.placeholder = vscode_1.l10n.t('Select a remote to fetch');
        quickpick.canSelectMany = false;
        quickpick.items = [...remoteItems, { label: '', kind: vscode_1.QuickPickItemKind.Separator }, new FetchAllRemotesItem(repository)];
        quickpick.show();
        const remoteItem = await new Promise(resolve => {
            quickpick.onDidAccept(() => resolve(quickpick.activeItems[0]));
            quickpick.onDidHide(() => resolve(undefined));
        });
        quickpick.hide();
        if (!remoteItem) {
            return;
        }
        await remoteItem.run();
    }
    async fetchPrune(repository) {
        if (repository.remotes.length === 0) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('This repository has no remotes configured to fetch from.'));
            return;
        }
        await repository.fetchPrune();
    }
    async fetchAll(repository) {
        if (repository.remotes.length === 0) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('This repository has no remotes configured to fetch from.'));
            return;
        }
        await repository.fetchAll();
    }
    async fetchRef(repository, ref) {
        ref = ref ?? repository?.historyProvider.currentHistoryItemRemoteRef?.id;
        if (!repository || !ref) {
            return;
        }
        const branch = await repository.getBranch(ref);
        await repository.fetch({ remote: branch.remote, ref: branch.name });
    }
    async pullFrom(repository) {
        const remotes = repository.remotes;
        if (remotes.length === 0) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('Your repository has no remotes configured to pull from.'));
            return;
        }
        let remoteName = remotes[0].name;
        if (remotes.length > 1) {
            const remotePicks = remotes.filter(r => r.fetchUrl !== undefined).map(r => ({ label: r.name, description: r.fetchUrl }));
            const placeHolder = vscode_1.l10n.t('Pick a remote to pull the branch from');
            const remotePick = await vscode_1.window.showQuickPick(remotePicks, { placeHolder });
            if (!remotePick) {
                return;
            }
            remoteName = remotePick.label;
        }
        const getBranchPicks = async () => {
            const remoteRefs = await repository.getRefs({ pattern: `refs/remotes/${remoteName}/` });
            return remoteRefs.map(r => new RefItem(r));
        };
        const branchPlaceHolder = vscode_1.l10n.t('Pick a branch to pull from');
        const branchPick = await this.pickRef(getBranchPicks(), branchPlaceHolder);
        if (!branchPick || !branchPick.refName) {
            return;
        }
        const remoteCharCnt = remoteName.length;
        await repository.pullFrom(false, remoteName, branchPick.refName.slice(remoteCharCnt + 1));
    }
    async pull(repository) {
        const remotes = repository.remotes;
        if (remotes.length === 0) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('Your repository has no remotes configured to pull from.'));
            return;
        }
        await repository.pull(repository.HEAD);
    }
    async pullRebase(repository) {
        const remotes = repository.remotes;
        if (remotes.length === 0) {
            vscode_1.window.showWarningMessage(vscode_1.l10n.t('Your repository has no remotes configured to pull from.'));
            return;
        }
        await repository.pullWithRebase(repository.HEAD);
    }
    async pullRef(repository, ref) {
        ref = ref ?? repository?.historyProvider.currentHistoryItemRemoteRef?.id;
        if (!repository || !ref) {
            return;
        }
        const branch = await repository.getBranch(ref);
        await repository.pullFrom(false, branch.remote, branch.name);
    }
    async _push(repository, pushOptions) {
        const remotes = repository.remotes;
        if (remotes.length === 0) {
            if (pushOptions.silent) {
                return;
            }
            const addRemote = vscode_1.l10n.t('Add Remote');
            const result = await vscode_1.window.showWarningMessage(vscode_1.l10n.t('Your repository has no remotes configured to push to.'), addRemote);
            if (result === addRemote) {
                await this.addRemote(repository);
            }
            return;
        }
        const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
        let forcePushMode = undefined;
        if (pushOptions.forcePush) {
            if (!config.get('allowForcePush')) {
                await vscode_1.window.showErrorMessage(vscode_1.l10n.t('Force push is not allowed, please enable it with the "git.allowForcePush" setting.'));
                return;
            }
            const useForcePushWithLease = config.get('useForcePushWithLease') === true;
            const useForcePushIfIncludes = config.get('useForcePushIfIncludes') === true;
            forcePushMode = useForcePushWithLease ? useForcePushIfIncludes ? 2 /* ForcePushMode.ForceWithLeaseIfIncludes */ : 1 /* ForcePushMode.ForceWithLease */ : 0 /* ForcePushMode.Force */;
            if (config.get('confirmForcePush')) {
                const message = vscode_1.l10n.t('You are about to force push your changes, this can be destructive and could inadvertently overwrite changes made by others.\n\nAre you sure to continue?');
                const yes = vscode_1.l10n.t('OK');
                const neverAgain = vscode_1.l10n.t('OK, Don\'t Ask Again');
                const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes, neverAgain);
                if (pick === neverAgain) {
                    config.update('confirmForcePush', false, true);
                }
                else if (pick !== yes) {
                    return;
                }
            }
        }
        if (pushOptions.pushType === PushType.PushFollowTags) {
            await repository.pushFollowTags(undefined, forcePushMode);
            return;
        }
        if (pushOptions.pushType === PushType.PushTags) {
            await repository.pushTags(undefined, forcePushMode);
        }
        if (!repository.HEAD || !repository.HEAD.name) {
            if (!pushOptions.silent) {
                vscode_1.window.showWarningMessage(vscode_1.l10n.t('Please check out a branch to push to a remote.'));
            }
            return;
        }
        if (pushOptions.pushType === PushType.Push) {
            try {
                await repository.push(repository.HEAD, forcePushMode);
            }
            catch (err) {
                if (err.gitErrorCode !== "NoUpstreamBranch" /* GitErrorCodes.NoUpstreamBranch */) {
                    throw err;
                }
                if (pushOptions.silent) {
                    return;
                }
                if (this.globalState.get('confirmBranchPublish', true)) {
                    const branchName = repository.HEAD.name;
                    const message = vscode_1.l10n.t('The branch "{0}" has no remote branch. Would you like to publish this branch?', branchName);
                    const yes = vscode_1.l10n.t('OK');
                    const neverAgain = vscode_1.l10n.t('OK, Don\'t Ask Again');
                    const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes, neverAgain);
                    if (pick === yes || pick === neverAgain) {
                        if (pick === neverAgain) {
                            this.globalState.update('confirmBranchPublish', false);
                        }
                        await this.publish(repository);
                    }
                }
                else {
                    await this.publish(repository);
                }
            }
        }
        else {
            const branchName = repository.HEAD.name;
            if (!pushOptions.pushTo?.remote) {
                const addRemote = new AddRemoteItem(this);
                const picks = [...remotes.filter(r => r.pushUrl !== undefined).map(r => ({ label: r.name, description: r.pushUrl })), addRemote];
                const placeHolder = vscode_1.l10n.t('Pick a remote to publish the branch "{0}" to:', branchName);
                const choice = await vscode_1.window.showQuickPick(picks, { placeHolder });
                if (!choice) {
                    return;
                }
                if (choice === addRemote) {
                    const newRemote = await this.addRemote(repository);
                    if (newRemote) {
                        await repository.pushTo(newRemote, branchName, undefined, forcePushMode);
                    }
                }
                else {
                    await repository.pushTo(choice.label, branchName, undefined, forcePushMode);
                }
            }
            else {
                await repository.pushTo(pushOptions.pushTo.remote, pushOptions.pushTo.refspec || branchName, pushOptions.pushTo.setUpstream, forcePushMode);
            }
        }
    }
    async push(repository) {
        await this._push(repository, { pushType: PushType.Push });
    }
    async pushForce(repository) {
        await this._push(repository, { pushType: PushType.Push, forcePush: true });
    }
    async pushFollowTags(repository) {
        await this._push(repository, { pushType: PushType.PushFollowTags });
    }
    async pushFollowTagsForce(repository) {
        await this._push(repository, { pushType: PushType.PushFollowTags, forcePush: true });
    }
    async pushRef(repository) {
        if (!repository) {
            return;
        }
        await this._push(repository, { pushType: PushType.Push });
    }
    async cherryPick(repository) {
        const hash = await vscode_1.window.showInputBox({
            placeHolder: vscode_1.l10n.t('Commit Hash'),
            prompt: vscode_1.l10n.t('Please provide the commit hash'),
            ignoreFocusOut: true
        });
        if (!hash) {
            return;
        }
        await repository.cherryPick(hash);
    }
    async cherryPick2(repository, historyItem) {
        if (!historyItem) {
            return;
        }
        await repository.cherryPick(historyItem.id);
    }
    async cherryPickAbort(repository) {
        await repository.cherryPickAbort();
    }
    async pushTo(repository, remote, refspec, setUpstream) {
        await this._push(repository, { pushType: PushType.PushTo, pushTo: { remote: remote, refspec: refspec, setUpstream: setUpstream } });
    }
    async pushToForce(repository, remote, refspec, setUpstream) {
        await this._push(repository, { pushType: PushType.PushTo, pushTo: { remote: remote, refspec: refspec, setUpstream: setUpstream }, forcePush: true });
    }
    async pushTags(repository) {
        await this._push(repository, { pushType: PushType.PushTags });
    }
    async addRemote(repository) {
        const url = await (0, remoteSource_1.pickRemoteSource)({
            providerLabel: provider => vscode_1.l10n.t('Add remote from {0}', provider.name),
            urlLabel: vscode_1.l10n.t('Add remote from URL')
        });
        if (!url) {
            return;
        }
        const resultName = await vscode_1.window.showInputBox({
            placeHolder: vscode_1.l10n.t('Remote name'),
            prompt: vscode_1.l10n.t('Please provide a remote name'),
            ignoreFocusOut: true,
            validateInput: (name) => {
                if (!sanitizeRemoteName(name)) {
                    return vscode_1.l10n.t('Remote name format invalid');
                }
                else if (repository.remotes.find(r => r.name === name)) {
                    return vscode_1.l10n.t('Remote "{0}" already exists.', name);
                }
                return null;
            }
        });
        const name = sanitizeRemoteName(resultName || '');
        if (!name) {
            return;
        }
        await repository.addRemote(name, url.trim());
        await repository.fetch({ remote: name });
        return name;
    }
    async removeRemote(repository) {
        const remotes = repository.remotes;
        if (remotes.length === 0) {
            vscode_1.window.showErrorMessage(vscode_1.l10n.t('Your repository has no remotes.'));
            return;
        }
        const picks = repository.remotes.map(r => new RemoteItem(repository, r));
        const placeHolder = vscode_1.l10n.t('Pick a remote to remove');
        const remote = await vscode_1.window.showQuickPick(picks, { placeHolder });
        if (!remote) {
            return;
        }
        await repository.removeRemote(remote.remoteName);
    }
    async _sync(repository, rebase) {
        const HEAD = repository.HEAD;
        if (!HEAD) {
            return;
        }
        else if (!HEAD.upstream) {
            this._push(repository, { pushType: PushType.Push });
            return;
        }
        const remoteName = HEAD.remote || HEAD.upstream.remote;
        const remote = repository.remotes.find(r => r.name === remoteName);
        const isReadonly = remote && remote.isReadOnly;
        const config = vscode_1.workspace.getConfiguration('git');
        const shouldPrompt = !isReadonly && config.get('confirmSync') === true;
        if (shouldPrompt) {
            const message = vscode_1.l10n.t('This action will pull and push commits from and to "{0}/{1}".', HEAD.upstream.remote, HEAD.upstream.name);
            const yes = vscode_1.l10n.t('OK');
            const neverAgain = vscode_1.l10n.t('OK, Don\'t Show Again');
            const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, yes, neverAgain);
            if (pick === neverAgain) {
                await config.update('confirmSync', false, true);
            }
            else if (pick !== yes) {
                return;
            }
        }
        await repository.sync(HEAD, rebase);
    }
    async sync(repository) {
        const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
        const rebase = config.get('rebaseWhenSync', false) === true;
        try {
            await this._sync(repository, rebase);
        }
        catch (err) {
            if (/Cancelled/i.test(err && (err.message || err.stderr || ''))) {
                return;
            }
            throw err;
        }
    }
    async syncAll() {
        await Promise.all(this.model.repositories.map(async (repository) => {
            const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
            const rebase = config.get('rebaseWhenSync', false) === true;
            const HEAD = repository.HEAD;
            if (!HEAD || !HEAD.upstream) {
                return;
            }
            await repository.sync(HEAD, rebase);
        }));
    }
    async syncRebase(repository) {
        try {
            await this._sync(repository, true);
        }
        catch (err) {
            if (/Cancelled/i.test(err && (err.message || err.stderr || ''))) {
                return;
            }
            throw err;
        }
    }
    async publish(repository) {
        const branchName = repository.HEAD && repository.HEAD.name || '';
        const remotes = repository.remotes;
        if (remotes.length === 0) {
            const publishers = this.model.getRemoteSourcePublishers();
            if (publishers.length === 0) {
                vscode_1.window.showWarningMessage(vscode_1.l10n.t('Your repository has no remotes configured to publish to.'));
                return;
            }
            let publisher;
            if (publishers.length === 1) {
                publisher = publishers[0];
            }
            else {
                const picks = publishers
                    .map(provider => ({ label: (provider.icon ? `$(${provider.icon}) ` : '') + vscode_1.l10n.t('Publish to {0}', provider.name), alwaysShow: true, provider }));
                const placeHolder = vscode_1.l10n.t('Pick a provider to publish the branch "{0}" to:', branchName);
                const choice = await vscode_1.window.showQuickPick(picks, { placeHolder });
                if (!choice) {
                    return;
                }
                publisher = choice.provider;
            }
            await publisher.publishRepository(new api1_1.ApiRepository(repository));
            this.model.firePublishEvent(repository, branchName);
            return;
        }
        if (remotes.length === 1) {
            await repository.pushTo(remotes[0].name, branchName, true);
            this.model.firePublishEvent(repository, branchName);
            return;
        }
        const addRemote = new AddRemoteItem(this);
        const picks = [...repository.remotes.map(r => ({ label: r.name, description: r.pushUrl })), addRemote];
        const placeHolder = vscode_1.l10n.t('Pick a remote to publish the branch "{0}" to:', branchName);
        const choice = await vscode_1.window.showQuickPick(picks, { placeHolder });
        if (!choice) {
            return;
        }
        if (choice === addRemote) {
            const newRemote = await this.addRemote(repository);
            if (newRemote) {
                await repository.pushTo(newRemote, branchName, true);
                this.model.firePublishEvent(repository, branchName);
            }
        }
        else {
            await repository.pushTo(choice.label, branchName, true);
            this.model.firePublishEvent(repository, branchName);
        }
    }
    async ignore(...resourceStates) {
        resourceStates = resourceStates.filter(s => !!s);
        if (resourceStates.length === 0 || (resourceStates[0] && !(resourceStates[0].resourceUri instanceof vscode_1.Uri))) {
            const resource = this.getSCMResource();
            if (!resource) {
                return;
            }
            resourceStates = [resource];
        }
        const resources = resourceStates
            .filter(s => s instanceof repository_1.Resource)
            .map(r => r.resourceUri);
        if (!resources.length) {
            return;
        }
        await this.runByRepository(resources, async (repository, resources) => repository.ignore(resources));
    }
    async revealInExplorer(resourceState) {
        if (!resourceState) {
            return;
        }
        if (!(resourceState.resourceUri instanceof vscode_1.Uri)) {
            return;
        }
        await vscode_1.commands.executeCommand('revealInExplorer', resourceState.resourceUri);
    }
    async revealFileInOS(resourceState) {
        if (!resourceState) {
            return;
        }
        if (!(resourceState.resourceUri instanceof vscode_1.Uri)) {
            return;
        }
        await vscode_1.commands.executeCommand('revealFileInOS', resourceState.resourceUri);
    }
    async _stash(repository, includeUntracked = false, staged = false) {
        const noUnstagedChanges = repository.workingTreeGroup.resourceStates.length === 0
            && (!includeUntracked || repository.untrackedGroup.resourceStates.length === 0);
        const noStagedChanges = repository.indexGroup.resourceStates.length === 0;
        if (staged) {
            if (noStagedChanges) {
                vscode_1.window.showInformationMessage(vscode_1.l10n.t('There are no staged changes to stash.'));
                return false;
            }
        }
        else {
            if (noUnstagedChanges && noStagedChanges) {
                vscode_1.window.showInformationMessage(vscode_1.l10n.t('There are no changes to stash.'));
                return false;
            }
        }
        const config = vscode_1.workspace.getConfiguration('git', vscode_1.Uri.file(repository.root));
        const promptToSaveFilesBeforeStashing = config.get('promptToSaveFilesBeforeStash');
        if (promptToSaveFilesBeforeStashing !== 'never') {
            let documents = vscode_1.workspace.textDocuments
                .filter(d => !d.isUntitled && d.isDirty && (0, util_1.isDescendant)(repository.root, d.uri.fsPath));
            if (promptToSaveFilesBeforeStashing === 'staged' || repository.indexGroup.resourceStates.length > 0) {
                documents = documents
                    .filter(d => repository.indexGroup.resourceStates.some(s => (0, util_1.pathEquals)(s.resourceUri.fsPath, d.uri.fsPath)));
            }
            if (documents.length > 0) {
                const message = documents.length === 1
                    ? vscode_1.l10n.t('The following file has unsaved changes which won\'t be included in the stash if you proceed: {0}.\n\nWould you like to save it before stashing?', path.basename(documents[0].uri.fsPath))
                    : vscode_1.l10n.t('There are {0} unsaved files.\n\nWould you like to save them before stashing?', documents.length);
                const saveAndStash = vscode_1.l10n.t('Save All & Stash');
                const stash = vscode_1.l10n.t('Stash Anyway');
                const pick = await vscode_1.window.showWarningMessage(message, { modal: true }, saveAndStash, stash);
                if (pick === saveAndStash) {
                    await Promise.all(documents.map(d => d.save()));
                }
                else if (pick !== stash) {
                    return false; // do not stash on cancel
                }
            }
        }
        let message;
        if (config.get('useCommitInputAsStashMessage') && (!repository.sourceControl.commitTemplate || repository.inputBox.value !== repository.sourceControl.commitTemplate)) {
            message = repository.inputBox.value;
        }
        message = await vscode_1.window.showInputBox({
            value: message,
            prompt: vscode_1.l10n.t('Optionally provide a stash message'),
            placeHolder: vscode_1.l10n.t('Stash message')
        });
        if (typeof message === 'undefined') {
            return false;
        }
        try {
            await repository.createStash(message, includeUntracked, staged);
            return true;
        }
        catch (err) {
            if (/You do not have the initial commit yet/.test(err.stderr || '')) {
                vscode_1.window.showInformationMessage(vscode_1.l10n.t('The repository does not have any commits. Please make an initial commit before creating a stash.'));
                return false;
            }
            throw err;
        }
    }
    async stash(repository) {
        const result = await this._stash(repository);
        return result;
    }
    async stashStaged(repository) {
        const result = await this._stash(repository, false, true);
        return result;
    }
    async stashIncludeUntracked(repository) {
        const result = await this._stash(repository, true);
        return result;
    }
    async stashPop(repository) {
        const placeHolder = vscode_1.l10n.t('Pick a stash to pop');
        const stash = await this.pickStash(repository, placeHolder);
        if (!stash) {
            return;
        }
        await repository.popStash(stash.index);
    }
    async stashPopLatest(repository) {
        const stashes = await repository.getStashes();
        if (stashes.length === 0) {
            vscode_1.window.showInformationMessage(vscode_1.l10n.t('There are no stashes in the repository.'));
            return;
        }
        await repository.popStash();
    }
    async stashPopEditor(uri) {
        const result = await this.getStashFromUri(uri);
        if (!result) {
            return;
        }
        await vscode_1.commands.executeCommand('workbench.action.closeActiveEditor');
        await result.repository.popStash(result.stash.index);
    }
    async stashApply(repository) {
        const placeHolder = vscode_1.l10n.t('Pick a stash to apply');
        const stash = await this.pickStash(repository, placeHolder);
        if (!stash) {
            return;
        }
        await repository.applyStash(stash.index);
    }
    async stashApplyLatest(repository) {
        const stashes = await repository.getStashes();
        if (stashes.length === 0) {
            vscode_1.window.showInformationMessage(vscode_1.l10n.t('There are no stashes in the repository.'));
            return;
        }
        await repository.applyStash();
    }
    async stashApplyEditor(uri) {
        const result = await this.getStashFromUri(uri);
        if (!result) {
            return;
        }
        await vscode_1.commands.executeCommand('workbench.action.closeActiveEditor');
        await result.repository.applyStash(result.stash.index);
    }
    async stashDrop(repository) {
        const placeHolder = vscode_1.l10n.t('Pick a stash to drop');
        const stash = await this.pickStash(repository, placeHolder);
        if (!stash) {
            return;
        }
        await this._stashDrop(repository, stash);
    }
    async stashDropAll(repository) {
        const stashes = await repository.getStashes();
        if (stashes.length === 0) {
            vscode_1.window.showInformationMessage(vscode_1.l10n.t('There are no stashes in the repository.'));
            return;
        }
        // request confirmation for the operation
        const yes = vscode_1.l10n.t('Yes');
        const question = stashes.length === 1 ?
            vscode_1.l10n.t('Are you sure you want to drop ALL stashes? There is 1 stash that will be subject to pruning, and MAY BE IMPOSSIBLE TO RECOVER.') :
            vscode_1.l10n.t('Are you sure you want to drop ALL stashes? There are {0} stashes that will be subject to pruning, and MAY BE IMPOSSIBLE TO RECOVER.', stashes.length);
        const result = await vscode_1.window.showWarningMessage(question, { modal: true }, yes);
        if (result !== yes) {
            return;
        }
        await repository.dropStash();
    }
    async stashDropEditor(uri) {
        const result = await this.getStashFromUri(uri);
        if (!result) {
            return;
        }
        if (await this._stashDrop(result.repository, result.stash)) {
            await vscode_1.commands.executeCommand('workbench.action.closeActiveEditor');
        }
    }
    async _stashDrop(repository, stash) {
        const yes = vscode_1.l10n.t('Yes');
        const result = await vscode_1.window.showWarningMessage(vscode_1.l10n.t('Are you sure you want to drop the stash: {0}?', stash.description), { modal: true }, yes);
        if (result !== yes) {
            return false;
        }
        await repository.dropStash(stash.index);
        return true;
    }
    async stashView(repository) {
        const placeHolder = vscode_1.l10n.t('Pick a stash to view');
        const stash = await this.pickStash(repository, placeHolder);
        if (!stash) {
            return;
        }
        const stashChanges = await repository.showStash(stash.index);
        if (!stashChanges || stashChanges.length === 0) {
            return;
        }
        // A stash commit can have up to 3 parents:
        // 1. The first parent is the commit that was HEAD when the stash was created.
        // 2. The second parent is the commit that represents the index when the stash was created.
        // 3. The third parent (when present) represents the untracked files when the stash was created.
        const stashFirstParentCommit = stash.parents.length > 0 ? stash.parents[0] : `${stash.hash}^`;
        const stashUntrackedFilesParentCommit = stash.parents.length === 3 ? stash.parents[2] : undefined;
        const stashUntrackedFiles = [];
        if (stashUntrackedFilesParentCommit) {
            const untrackedFiles = await repository.getObjectFiles(stashUntrackedFilesParentCommit);
            stashUntrackedFiles.push(...untrackedFiles.map(f => path.join(repository.root, f.file)));
        }
        const title = `Git Stash #${stash.index}: ${stash.description}`;
        const multiDiffSourceUri = (0, uri_1.toGitUri)(vscode_1.Uri.file(repository.root), `stash@{${stash.index}}`, { scheme: 'git-stash' });
        const resources = [];
        for (const change of stashChanges) {
            const isChangeUntracked = !!stashUntrackedFiles.find(f => (0, util_1.pathEquals)(f, change.uri.fsPath));
            const modifiedUriRef = !isChangeUntracked ? stash.hash : stashUntrackedFilesParentCommit ?? stash.hash;
            resources.push((0, uri_1.toMultiFileDiffEditorUris)(change, stashFirstParentCommit, modifiedUriRef));
        }
        vscode_1.commands.executeCommand('_workbench.openMultiDiffEditor', { multiDiffSourceUri, title, resources });
    }
    async pickStash(repository, placeHolder) {
        const getStashQuickPickItems = async () => {
            const stashes = await repository.getStashes();
            return stashes.length > 0 ?
                stashes.map(stash => new StashItem(stash)) :
                [{ label: vscode_1.l10n.t('$(info) This repository has no stashes.') }];
        };
        const result = await vscode_1.window.showQuickPick(getStashQuickPickItems(), { placeHolder });
        return result instanceof StashItem ? result.stash : undefined;
    }
    async getStashFromUri(uri) {
        if (!uri || uri.scheme !== 'git-stash') {
            return undefined;
        }
        const stashUri = (0, uri_1.fromGitUri)(uri);
        // Repository
        const repository = this.model.getRepository(stashUri.path);
        if (!repository) {
            return undefined;
        }
        // Stash
        const regex = /^stash@{(\d+)}$/;
        const match = regex.exec(stashUri.ref);
        if (!match) {
            return undefined;
        }
        const [, index] = match;
        const stashes = await repository.getStashes();
        const stash = stashes.find(stash => stash.index === parseInt(index));
        if (!stash) {
            return undefined;
        }
        return { repository, stash };
    }
    async timelineOpenDiff(item, uri, _source) {
        const cmd = this.resolveTimelineOpenDiffCommand(item, uri, {
            preserveFocus: true,
            preview: true,
            viewColumn: vscode_1.ViewColumn.Active
        });
        if (cmd === undefined) {
            return undefined;
        }
        return vscode_1.commands.executeCommand(cmd.command, ...(cmd.arguments ?? []));
    }
    resolveTimelineOpenDiffCommand(item, uri, options) {
        if (uri === undefined || uri === null || !timelineProvider_1.GitTimelineItem.is(item)) {
            return undefined;
        }
        const basename = path.basename(uri.fsPath);
        let title;
        if ((item.previousRef === 'HEAD' || item.previousRef === '~') && item.ref === '') {
            title = vscode_1.l10n.t('{0} (Working Tree)', basename);
        }
        else if (item.previousRef === 'HEAD' && item.ref === '~') {
            title = vscode_1.l10n.t('{0} (Index)', basename);
        }
        else {
            title = vscode_1.l10n.t('{0} ({1}) ↔ {0} ({2})', basename, item.shortPreviousRef, item.shortRef);
        }
        return {
            command: 'vscode.diff',
            title: vscode_1.l10n.t('Open Comparison'),
            arguments: [(0, uri_1.toGitUri)(uri, item.previousRef), item.ref === '' ? uri : (0, uri_1.toGitUri)(uri, item.ref), title, options]
        };
    }
    async timelineViewCommit(item, uri, _source) {
        if (!timelineProvider_1.GitTimelineItem.is(item)) {
            return;
        }
        const cmd = await this._resolveTimelineOpenCommitCommand(item, uri, {
            preserveFocus: true,
            preview: true,
            viewColumn: vscode_1.ViewColumn.Active
        });
        if (cmd === undefined) {
            return undefined;
        }
        return vscode_1.commands.executeCommand(cmd.command, ...(cmd.arguments ?? []));
    }
    async _resolveTimelineOpenCommitCommand(item, uri, options) {
        if (uri === undefined || uri === null || !timelineProvider_1.GitTimelineItem.is(item)) {
            return undefined;
        }
        const repository = await this.model.getRepository(uri.fsPath);
        if (!repository) {
            return undefined;
        }
        const commit = await repository.getCommit(item.ref);
        const commitParentId = commit.parents.length > 0 ? commit.parents[0] : await repository.getEmptyTree();
        const changes = await repository.diffTrees(commitParentId, commit.hash);
        const resources = changes.map(c => (0, uri_1.toMultiFileDiffEditorUris)(c, commitParentId, commit.hash));
        const title = `${item.shortRef} - ${(0, util_1.truncate)(commit.message)}`;
        const multiDiffSourceUri = vscode_1.Uri.from({ scheme: 'scm-history-item', path: `${repository.root}/${commitParentId}..${commit.hash}` });
        return {
            command: '_workbench.openMultiDiffEditor',
            title: vscode_1.l10n.t('Open Commit'),
            arguments: [{ multiDiffSourceUri, title, resources }, options]
        };
    }
    async timelineCopyCommitId(item, _uri, _source) {
        if (!timelineProvider_1.GitTimelineItem.is(item)) {
            return;
        }
        vscode_1.env.clipboard.writeText(item.ref);
    }
    async timelineCopyCommitMessage(item, _uri, _source) {
        if (!timelineProvider_1.GitTimelineItem.is(item)) {
            return;
        }
        vscode_1.env.clipboard.writeText(item.message);
    }
    async timelineSelectForCompare(item, uri, _source) {
        if (!timelineProvider_1.GitTimelineItem.is(item) || !uri) {
            return;
        }
        this._selectedForCompare = { uri, item };
        await vscode_1.commands.executeCommand('setContext', 'git.timeline.selectedForCompare', true);
    }
    async timelineCompareWithSelected(item, uri, _source) {
        if (!timelineProvider_1.GitTimelineItem.is(item) || !uri || !this._selectedForCompare || uri.toString() !== this._selectedForCompare.uri.toString()) {
            return;
        }
        const { item: selected } = this._selectedForCompare;
        const basename = path.basename(uri.fsPath);
        let leftTitle;
        if ((selected.previousRef === 'HEAD' || selected.previousRef === '~') && selected.ref === '') {
            leftTitle = vscode_1.l10n.t('{0} (Working Tree)', basename);
        }
        else if (selected.previousRef === 'HEAD' && selected.ref === '~') {
            leftTitle = vscode_1.l10n.t('{0} (Index)', basename);
        }
        else {
            leftTitle = vscode_1.l10n.t('{0} ({1})', basename, selected.shortRef);
        }
        let rightTitle;
        if ((item.previousRef === 'HEAD' || item.previousRef === '~') && item.ref === '') {
            rightTitle = vscode_1.l10n.t('{0} (Working Tree)', basename);
        }
        else if (item.previousRef === 'HEAD' && item.ref === '~') {
            rightTitle = vscode_1.l10n.t('{0} (Index)', basename);
        }
        else {
            rightTitle = vscode_1.l10n.t('{0} ({1})', basename, item.shortRef);
        }
        const title = vscode_1.l10n.t('{0} ↔ {1}', leftTitle, rightTitle);
        await vscode_1.commands.executeCommand('vscode.diff', selected.ref === '' ? uri : (0, uri_1.toGitUri)(uri, selected.ref), item.ref === '' ? uri : (0, uri_1.toGitUri)(uri, item.ref), title);
    }
    async rebaseAbort(repository) {
        if (repository.rebaseCommit) {
            await repository.rebaseAbort();
        }
        else {
            await vscode_1.window.showInformationMessage(vscode_1.l10n.t('No rebase in progress.'));
        }
    }
    closeDiffEditors(repository) {
        repository.closeDiffEditors(undefined, undefined, true);
    }
    closeUnmodifiedEditors() {
        const editorTabsToClose = [];
        // Collect all modified files
        const modifiedFiles = [];
        for (const repository of this.model.repositories) {
            modifiedFiles.push(...repository.indexGroup.resourceStates.map(r => r.resourceUri.fsPath));
            modifiedFiles.push(...repository.workingTreeGroup.resourceStates.map(r => r.resourceUri.fsPath));
            modifiedFiles.push(...repository.untrackedGroup.resourceStates.map(r => r.resourceUri.fsPath));
            modifiedFiles.push(...repository.mergeGroup.resourceStates.map(r => r.resourceUri.fsPath));
        }
        // Collect all editor tabs that are not dirty and not modified
        for (const tab of vscode_1.window.tabGroups.all.map(g => g.tabs).flat()) {
            if (tab.isDirty) {
                continue;
            }
            if (tab.input instanceof vscode_1.TabInputText || tab.input instanceof vscode_1.TabInputNotebook) {
                const { uri } = tab.input;
                if (!modifiedFiles.find(p => (0, util_1.pathEquals)(p, uri.fsPath))) {
                    editorTabsToClose.push(tab);
                }
            }
        }
        // Close editors
        vscode_1.window.tabGroups.close(editorTabsToClose, true);
    }
    async openRepositoriesInParentFolders() {
        const parentRepositories = [];
        const title = vscode_1.l10n.t('Open Repositories In Parent Folders');
        const placeHolder = vscode_1.l10n.t('Pick a repository to open');
        const allRepositoriesLabel = vscode_1.l10n.t('All Repositories');
        const allRepositoriesQuickPickItem = { label: allRepositoriesLabel };
        const repositoriesQuickPickItems = this.model.parentRepositories
            .sort(compareRepositoryLabel).map(r => new RepositoryItem(r));
        const items = this.model.parentRepositories.length === 1 ? [...repositoriesQuickPickItems] :
            [...repositoriesQuickPickItems, { label: '', kind: vscode_1.QuickPickItemKind.Separator }, allRepositoriesQuickPickItem];
        const repositoryItem = await vscode_1.window.showQuickPick(items, { title, placeHolder });
        if (!repositoryItem) {
            return;
        }
        if (repositoryItem === allRepositoriesQuickPickItem) {
            // All Repositories
            parentRepositories.push(...this.model.parentRepositories);
        }
        else {
            // One Repository
            parentRepositories.push(repositoryItem.path);
        }
        for (const parentRepository of parentRepositories) {
            await this.model.openParentRepository(parentRepository);
        }
    }
    async manageUnsafeRepositories() {
        const unsafeRepositories = [];
        const quickpick = vscode_1.window.createQuickPick();
        quickpick.title = vscode_1.l10n.t('Manage Unsafe Repositories');
        quickpick.placeholder = vscode_1.l10n.t('Pick a repository to mark as safe and open');
        const allRepositoriesLabel = vscode_1.l10n.t('All Repositories');
        const allRepositoriesQuickPickItem = { label: allRepositoriesLabel };
        const repositoriesQuickPickItems = this.model.unsafeRepositories
            .sort(compareRepositoryLabel).map(r => new RepositoryItem(r));
        quickpick.items = this.model.unsafeRepositories.length === 1 ? [...repositoriesQuickPickItems] :
            [...repositoriesQuickPickItems, { label: '', kind: vscode_1.QuickPickItemKind.Separator }, allRepositoriesQuickPickItem];
        quickpick.show();
        const repositoryItem = await new Promise(resolve => {
            quickpick.onDidAccept(() => resolve(quickpick.activeItems[0]));
            quickpick.onDidHide(() => resolve(undefined));
        });
        quickpick.hide();
        if (!repositoryItem) {
            return;
        }
        if (repositoryItem.label === allRepositoriesLabel) {
            // All Repositories
            unsafeRepositories.push(...this.model.unsafeRepositories);
        }
        else {
            // One Repository
            unsafeRepositories.push(repositoryItem.path);
        }
        for (const unsafeRepository of unsafeRepositories) {
            // Mark as Safe
            await this.git.addSafeDirectory(this.model.getUnsafeRepositoryPath(unsafeRepository));
            // Open Repository
            await this.model.openRepository(unsafeRepository);
            this.model.deleteUnsafeRepository(unsafeRepository);
        }
    }
    async viewChanges(repository) {
        await this._viewResourceGroupChanges(repository, repository.workingTreeGroup);
    }
    async viewStagedChanges(repository) {
        await this._viewResourceGroupChanges(repository, repository.indexGroup);
    }
    async viewUnstagedChanges(repository) {
        await this._viewResourceGroupChanges(repository, repository.untrackedGroup);
    }
    async _viewResourceGroupChanges(repository, resourceGroup) {
        if (resourceGroup.resourceStates.length === 0) {
            switch (resourceGroup.id) {
                case 'index':
                    vscode_1.window.showInformationMessage(vscode_1.l10n.t('The repository does not have any staged changes.'));
                    break;
                case 'workingTree':
                    vscode_1.window.showInformationMessage(vscode_1.l10n.t('The repository does not have any changes.'));
                    break;
                case 'untracked':
                    vscode_1.window.showInformationMessage(vscode_1.l10n.t('The repository does not have any untracked changes.'));
                    break;
            }
            return;
        }
        await vscode_1.commands.executeCommand('_workbench.openScmMultiDiffEditor', {
            title: `${repository.sourceControl.label}: ${resourceGroup.label}`,
            repositoryUri: vscode_1.Uri.file(repository.root),
            resourceGroupId: resourceGroup.id
        });
    }
    async copyCommitId(repository, historyItem) {
        if (!repository || !historyItem) {
            return;
        }
        vscode_1.env.clipboard.writeText(historyItem.id);
    }
    async copyCommitMessage(repository, historyItem) {
        if (!repository || !historyItem) {
            return;
        }
        vscode_1.env.clipboard.writeText(historyItem.message);
    }
    async viewCommit(repository, historyItemId) {
        if (!repository || !historyItemId) {
            return;
        }
        const rootUri = vscode_1.Uri.file(repository.root);
        const commit = await repository.getCommit(historyItemId);
        const title = `${(0, util_1.getCommitShortHash)(rootUri, historyItemId)} - ${(0, util_1.truncate)(commit.message)}`;
        const historyItemParentId = commit.parents.length > 0 ? commit.parents[0] : await repository.getEmptyTree();
        const multiDiffSourceUri = vscode_1.Uri.from({ scheme: 'scm-history-item', path: `${repository.root}/${historyItemParentId}..${historyItemId}` });
        const changes = await repository.diffTrees(historyItemParentId, historyItemId);
        const resources = changes.map(c => (0, uri_1.toMultiFileDiffEditorUris)(c, historyItemParentId, historyItemId));
        await vscode_1.commands.executeCommand('_workbench.openMultiDiffEditor', { multiDiffSourceUri, title, resources });
    }
    async copyContentToClipboard(content) {
        if (typeof content !== 'string') {
            return;
        }
        vscode_1.env.clipboard.writeText(content);
    }
    toggleBlameEditorDecoration() {
        this._toggleBlameSetting('blame.editorDecoration.enabled');
    }
    toggleBlameStatusBarItem() {
        this._toggleBlameSetting('blame.statusBarItem.enabled');
    }
    _toggleBlameSetting(setting) {
        const config = vscode_1.workspace.getConfiguration('git');
        const enabled = config.get(setting) === true;
        config.update(setting, !enabled, true);
    }
    createCommand(id, key, method, options) {
        const result = (...args) => {
            let result;
            if (!options.repository) {
                result = Promise.resolve(method.apply(this, args));
            }
            else {
                // try to guess the repository based on the first argument
                const repository = this.model.getRepository(args[0]);
                let repositoryPromise;
                if (repository) {
                    repositoryPromise = Promise.resolve(repository);
                }
                else if (this.model.repositories.length === 1) {
                    repositoryPromise = Promise.resolve(this.model.repositories[0]);
                }
                else {
                    repositoryPromise = this.model.pickRepository();
                }
                result = repositoryPromise.then(repository => {
                    if (!repository) {
                        return Promise.resolve();
                    }
                    return Promise.resolve(method.apply(this, [repository, ...args.slice(1)]));
                });
            }
            /* __GDPR__
                "git.command" : {
                    "owner": "lszomoru",
                    "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command id of the command being executed" }
                }
            */
            this.telemetryReporter.sendTelemetryEvent('git.command', { command: id });
            return result.catch(err => {
                const options = {
                    modal: true
                };
                let message;
                let type = 'error';
                const choices = new Map();
                const openOutputChannelChoice = vscode_1.l10n.t('Open Git Log');
                const outputChannelLogger = this.logger;
                choices.set(openOutputChannelChoice, () => outputChannelLogger.show());
                const showCommandOutputChoice = vscode_1.l10n.t('Show Command Output');
                if (err.stderr) {
                    choices.set(showCommandOutputChoice, async () => {
                        const timestamp = new Date().getTime();
                        const uri = vscode_1.Uri.parse(`git-output:/git-error-${timestamp}`);
                        let command = 'git';
                        if (err.gitArgs) {
                            command = `${command} ${err.gitArgs.join(' ')}`;
                        }
                        else if (err.gitCommand) {
                            command = `${command} ${err.gitCommand}`;
                        }
                        this.commandErrors.set(uri, `> ${command}\n${err.stderr}`);
                        try {
                            const doc = await vscode_1.workspace.openTextDocument(uri);
                            await vscode_1.window.showTextDocument(doc);
                        }
                        finally {
                            this.commandErrors.delete(uri);
                        }
                    });
                }
                switch (err.gitErrorCode) {
                    case "DirtyWorkTree" /* GitErrorCodes.DirtyWorkTree */:
                        message = vscode_1.l10n.t('Please clean your repository working tree before checkout.');
                        break;
                    case "PushRejected" /* GitErrorCodes.PushRejected */:
                        message = vscode_1.l10n.t('Can\'t push refs to remote. Try running "Pull" first to integrate your changes.');
                        break;
                    case "ForcePushWithLeaseRejected" /* GitErrorCodes.ForcePushWithLeaseRejected */:
                    case "ForcePushWithLeaseIfIncludesRejected" /* GitErrorCodes.ForcePushWithLeaseIfIncludesRejected */:
                        message = vscode_1.l10n.t('Can\'t force push refs to remote. The tip of the remote-tracking branch has been updated since the last checkout. Try running "Pull" first to pull the latest changes from the remote branch first.');
                        break;
                    case "Conflict" /* GitErrorCodes.Conflict */:
                        message = vscode_1.l10n.t('There are merge conflicts. Please resolve them before committing your changes.');
                        type = 'warning';
                        choices.clear();
                        choices.set(vscode_1.l10n.t('Show Changes'), () => vscode_1.commands.executeCommand('workbench.view.scm'));
                        options.modal = false;
                        break;
                    case "StashConflict" /* GitErrorCodes.StashConflict */:
                        message = vscode_1.l10n.t('There are merge conflicts while applying the stash. Please resolve them before committing your changes.');
                        type = 'warning';
                        choices.clear();
                        choices.set(vscode_1.l10n.t('Show Changes'), () => vscode_1.commands.executeCommand('workbench.view.scm'));
                        options.modal = false;
                        break;
                    case "AuthenticationFailed" /* GitErrorCodes.AuthenticationFailed */: {
                        const regex = /Authentication failed for '(.*)'/i;
                        const match = regex.exec(err.stderr || String(err));
                        message = match
                            ? vscode_1.l10n.t('Failed to authenticate to git remote:\n\n{0}', match[1])
                            : vscode_1.l10n.t('Failed to authenticate to git remote.');
                        break;
                    }
                    case "NoUserNameConfigured" /* GitErrorCodes.NoUserNameConfigured */:
                    case "NoUserEmailConfigured" /* GitErrorCodes.NoUserEmailConfigured */:
                        message = vscode_1.l10n.t('Make sure you configure your "user.name" and "user.email" in git.');
                        choices.set(vscode_1.l10n.t('Learn More'), () => vscode_1.commands.executeCommand('vscode.open', vscode_1.Uri.parse('https://aka.ms/vscode-setup-git')));
                        break;
                    case "EmptyCommitMessage" /* GitErrorCodes.EmptyCommitMessage */:
                        message = vscode_1.l10n.t('Commit operation was cancelled due to empty commit message.');
                        choices.clear();
                        type = 'information';
                        options.modal = false;
                        break;
                    case "CherryPickEmpty" /* GitErrorCodes.CherryPickEmpty */:
                        message = vscode_1.l10n.t('The changes are already present in the current branch.');
                        choices.clear();
                        type = 'information';
                        options.modal = false;
                        break;
                    case "CherryPickConflict" /* GitErrorCodes.CherryPickConflict */:
                        message = vscode_1.l10n.t('There were merge conflicts while cherry picking the changes. Resolve the conflicts before committing them.');
                        type = 'warning';
                        choices.set(vscode_1.l10n.t('Show Changes'), () => vscode_1.commands.executeCommand('workbench.view.scm'));
                        options.modal = false;
                        break;
                    default: {
                        const hint = (err.stderr || err.message || String(err))
                            .replace(/^error: /mi, '')
                            .replace(/^> husky.*$/mi, '')
                            .split(/[\r\n]/)
                            .filter((line) => !!line)[0];
                        message = hint
                            ? vscode_1.l10n.t('Git: {0}', hint)
                            : vscode_1.l10n.t('Git error');
                        break;
                    }
                }
                if (!message) {
                    console.error(err);
                    return;
                }
                // We explicitly do not await this promise, because we do not
                // want the command execution to be stuck waiting for the user
                // to take action on the notification.
                this.showErrorNotification(type, message, options, choices);
            });
        };
        // patch this object, so people can call methods directly
        this[key] = result;
        return result;
    }
    async showErrorNotification(type, message, options, choices) {
        let result;
        const allChoices = Array.from(choices.keys());
        switch (type) {
            case 'error':
                result = await vscode_1.window.showErrorMessage(message, options, ...allChoices);
                break;
            case 'warning':
                result = await vscode_1.window.showWarningMessage(message, options, ...allChoices);
                break;
            case 'information':
                result = await vscode_1.window.showInformationMessage(message, options, ...allChoices);
                break;
        }
        if (result) {
            const resultFn = choices.get(result);
            resultFn?.();
        }
    }
    getSCMResource(uri) {
        uri = uri ? uri : (vscode_1.window.activeTextEditor && vscode_1.window.activeTextEditor.document.uri);
        this.logger.debug(`[CommandCenter][getSCMResource] git.getSCMResource.uri: ${uri && uri.toString()}`);
        for (const r of this.model.repositories.map(r => r.root)) {
            this.logger.debug(`[CommandCenter][getSCMResource] repo root: ${r}`);
        }
        if (!uri) {
            return undefined;
        }
        if ((0, uri_1.isGitUri)(uri)) {
            const { path } = (0, uri_1.fromGitUri)(uri);
            uri = vscode_1.Uri.file(path);
        }
        if (uri.scheme === 'file') {
            const uriString = uri.toString();
            const repository = this.model.getRepository(uri);
            if (!repository) {
                return undefined;
            }
            return repository.workingTreeGroup.resourceStates.filter(r => r.resourceUri.toString() === uriString)[0]
                || repository.indexGroup.resourceStates.filter(r => r.resourceUri.toString() === uriString)[0]
                || repository.mergeGroup.resourceStates.filter(r => r.resourceUri.toString() === uriString)[0];
        }
        return undefined;
    }
    async runByRepository(arg, fn) {
        const resources = arg instanceof vscode_1.Uri ? [arg] : arg;
        const isSingleResource = arg instanceof vscode_1.Uri;
        const groups = resources.reduce((result, resource) => {
            let repository = this.model.getRepository(resource);
            if (!repository) {
                console.warn('Could not find git repository for ', resource);
                return result;
            }
            // Could it be a submodule?
            if ((0, util_1.pathEquals)(resource.fsPath, repository.root)) {
                repository = this.model.getRepositoryForSubmodule(resource) || repository;
            }
            const tuple = result.filter(p => p.repository === repository)[0];
            if (tuple) {
                tuple.resources.push(resource);
            }
            else {
                result.push({ repository, resources: [resource] });
            }
            return result;
        }, []);
        const promises = groups
            .map(({ repository, resources }) => fn(repository, isSingleResource ? resources[0] : resources));
        return Promise.all(promises);
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
exports.CommandCenter = CommandCenter;
__decorate([
    command('git.showOutput')
], CommandCenter.prototype, "showOutput", null);
__decorate([
    command('git.refresh', { repository: true })
], CommandCenter.prototype, "refresh", null);
__decorate([
    command('git.openResource')
], CommandCenter.prototype, "openResource", null);
__decorate([
    command('git.openAllChanges', { repository: true })
], CommandCenter.prototype, "openChanges", null);
__decorate([
    command('git.openMergeEditor')
], CommandCenter.prototype, "openMergeEditor", null);
__decorate([
    command('git.continueInLocalClone')
], CommandCenter.prototype, "continueInLocalClone", null);
__decorate([
    command('git.clone')
], CommandCenter.prototype, "clone", null);
__decorate([
    command('git.cloneRecursive')
], CommandCenter.prototype, "cloneRecursive", null);
__decorate([
    command('git.init')
], CommandCenter.prototype, "init", null);
__decorate([
    command('git.openRepository', { repository: false })
], CommandCenter.prototype, "openRepository", null);
__decorate([
    command('git.reopenClosedRepositories', { repository: false })
], CommandCenter.prototype, "reopenClosedRepositories", null);
__decorate([
    command('git.close', { repository: true })
], CommandCenter.prototype, "close", null);
__decorate([
    command('git.closeOtherRepositories', { repository: true })
], CommandCenter.prototype, "closeOtherRepositories", null);
__decorate([
    command('git.openFile')
], CommandCenter.prototype, "openFile", null);
__decorate([
    command('git.openFile2')
], CommandCenter.prototype, "openFile2", null);
__decorate([
    command('git.openHEADFile')
], CommandCenter.prototype, "openHEADFile", null);
__decorate([
    command('git.openChange')
], CommandCenter.prototype, "openChange", null);
__decorate([
    command('git.rename', { repository: true })
], CommandCenter.prototype, "rename", null);
__decorate([
    command('git.stage')
], CommandCenter.prototype, "stage", null);
__decorate([
    command('git.stageAll', { repository: true })
], CommandCenter.prototype, "stageAll", null);
__decorate([
    command('git.stageAllTracked', { repository: true })
], CommandCenter.prototype, "stageAllTracked", null);
__decorate([
    command('git.stageAllUntracked', { repository: true })
], CommandCenter.prototype, "stageAllUntracked", null);
__decorate([
    command('git.stageAllMerge', { repository: true })
], CommandCenter.prototype, "stageAllMerge", null);
__decorate([
    command('git.stageChange')
], CommandCenter.prototype, "stageChange", null);
__decorate([
    command('git.diff.stageHunk')
], CommandCenter.prototype, "diffStageHunk", null);
__decorate([
    command('git.diff.stageSelection')
], CommandCenter.prototype, "diffStageSelection", null);
__decorate([
    command('git.stageSelectedRanges')
], CommandCenter.prototype, "stageSelectedChanges", null);
__decorate([
    command('git.stageFile')
], CommandCenter.prototype, "stageFile", null);
__decorate([
    command('git.acceptMerge')
], CommandCenter.prototype, "acceptMerge", null);
__decorate([
    command('git.runGitMerge')
], CommandCenter.prototype, "runGitMergeNoDiff3", null);
__decorate([
    command('git.runGitMergeDiff3')
], CommandCenter.prototype, "runGitMergeDiff3", null);
__decorate([
    command('git.revertChange')
], CommandCenter.prototype, "revertChange", null);
__decorate([
    command('git.revertSelectedRanges')
], CommandCenter.prototype, "revertSelectedRanges", null);
__decorate([
    command('git.unstage')
], CommandCenter.prototype, "unstage", null);
__decorate([
    command('git.unstageAll', { repository: true })
], CommandCenter.prototype, "unstageAll", null);
__decorate([
    command('git.unstageSelectedRanges')
], CommandCenter.prototype, "unstageSelectedRanges", null);
__decorate([
    command('git.unstageFile')
], CommandCenter.prototype, "unstageFile", null);
__decorate([
    command('git.clean')
], CommandCenter.prototype, "clean", null);
__decorate([
    command('git.cleanAll', { repository: true })
], CommandCenter.prototype, "cleanAll", null);
__decorate([
    command('git.cleanAllTracked', { repository: true })
], CommandCenter.prototype, "cleanAllTracked", null);
__decorate([
    command('git.cleanAllUntracked', { repository: true })
], CommandCenter.prototype, "cleanAllUntracked", null);
__decorate([
    command('git.commit', { repository: true })
], CommandCenter.prototype, "commit", null);
__decorate([
    command('git.commitAmend', { repository: true })
], CommandCenter.prototype, "commitAmend", null);
__decorate([
    command('git.commitSigned', { repository: true })
], CommandCenter.prototype, "commitSigned", null);
__decorate([
    command('git.commitStaged', { repository: true })
], CommandCenter.prototype, "commitStaged", null);
__decorate([
    command('git.commitStagedSigned', { repository: true })
], CommandCenter.prototype, "commitStagedSigned", null);
__decorate([
    command('git.commitStagedAmend', { repository: true })
], CommandCenter.prototype, "commitStagedAmend", null);
__decorate([
    command('git.commitAll', { repository: true })
], CommandCenter.prototype, "commitAll", null);
__decorate([
    command('git.commitAllSigned', { repository: true })
], CommandCenter.prototype, "commitAllSigned", null);
__decorate([
    command('git.commitAllAmend', { repository: true })
], CommandCenter.prototype, "commitAllAmend", null);
__decorate([
    command('git.commitMessageAccept')
], CommandCenter.prototype, "commitMessageAccept", null);
__decorate([
    command('git.commitMessageDiscard')
], CommandCenter.prototype, "commitMessageDiscard", null);
__decorate([
    command('git.commitEmpty', { repository: true })
], CommandCenter.prototype, "commitEmpty", null);
__decorate([
    command('git.commitNoVerify', { repository: true })
], CommandCenter.prototype, "commitNoVerify", null);
__decorate([
    command('git.commitStagedNoVerify', { repository: true })
], CommandCenter.prototype, "commitStagedNoVerify", null);
__decorate([
    command('git.commitStagedSignedNoVerify', { repository: true })
], CommandCenter.prototype, "commitStagedSignedNoVerify", null);
__decorate([
    command('git.commitAmendNoVerify', { repository: true })
], CommandCenter.prototype, "commitAmendNoVerify", null);
__decorate([
    command('git.commitSignedNoVerify', { repository: true })
], CommandCenter.prototype, "commitSignedNoVerify", null);
__decorate([
    command('git.commitStagedAmendNoVerify', { repository: true })
], CommandCenter.prototype, "commitStagedAmendNoVerify", null);
__decorate([
    command('git.commitAllNoVerify', { repository: true })
], CommandCenter.prototype, "commitAllNoVerify", null);
__decorate([
    command('git.commitAllSignedNoVerify', { repository: true })
], CommandCenter.prototype, "commitAllSignedNoVerify", null);
__decorate([
    command('git.commitAllAmendNoVerify', { repository: true })
], CommandCenter.prototype, "commitAllAmendNoVerify", null);
__decorate([
    command('git.commitEmptyNoVerify', { repository: true })
], CommandCenter.prototype, "commitEmptyNoVerify", null);
__decorate([
    command('git.restoreCommitTemplate', { repository: true })
], CommandCenter.prototype, "restoreCommitTemplate", null);
__decorate([
    command('git.undoCommit', { repository: true })
], CommandCenter.prototype, "undoCommit", null);
__decorate([
    command('git.checkout', { repository: true })
], CommandCenter.prototype, "checkout", null);
__decorate([
    command('git.graph.checkout', { repository: true })
], CommandCenter.prototype, "checkout2", null);
__decorate([
    command('git.checkoutDetached', { repository: true })
], CommandCenter.prototype, "checkoutDetached", null);
__decorate([
    command('git.graph.checkoutDetached', { repository: true })
], CommandCenter.prototype, "checkoutDetached2", null);
__decorate([
    command('git.branch', { repository: true })
], CommandCenter.prototype, "branch", null);
__decorate([
    command('git.branchFrom', { repository: true })
], CommandCenter.prototype, "branchFrom", null);
__decorate([
    command('git.deleteBranch', { repository: true })
], CommandCenter.prototype, "deleteBranch", null);
__decorate([
    command('git.graph.deleteBranch', { repository: true })
], CommandCenter.prototype, "deleteBranch2", null);
__decorate([
    command('git.deleteRemoteBranch', { repository: true })
], CommandCenter.prototype, "deleteRemoteBranch", null);
__decorate([
    command('git.renameBranch', { repository: true })
], CommandCenter.prototype, "renameBranch", null);
__decorate([
    command('git.merge', { repository: true })
], CommandCenter.prototype, "merge", null);
__decorate([
    command('git.mergeAbort', { repository: true })
], CommandCenter.prototype, "abortMerge", null);
__decorate([
    command('git.rebase', { repository: true })
], CommandCenter.prototype, "rebase", null);
__decorate([
    command('git.createTag', { repository: true })
], CommandCenter.prototype, "createTag", null);
__decorate([
    command('git.deleteTag', { repository: true })
], CommandCenter.prototype, "deleteTag", null);
__decorate([
    command('git.graph.deleteTag', { repository: true })
], CommandCenter.prototype, "deleteTag2", null);
__decorate([
    command('git.deleteRemoteTag', { repository: true })
], CommandCenter.prototype, "deleteRemoteTag", null);
__decorate([
    command('git.fetch', { repository: true })
], CommandCenter.prototype, "fetch", null);
__decorate([
    command('git.fetchPrune', { repository: true })
], CommandCenter.prototype, "fetchPrune", null);
__decorate([
    command('git.fetchAll', { repository: true })
], CommandCenter.prototype, "fetchAll", null);
__decorate([
    command('git.fetchRef', { repository: true })
], CommandCenter.prototype, "fetchRef", null);
__decorate([
    command('git.pullFrom', { repository: true })
], CommandCenter.prototype, "pullFrom", null);
__decorate([
    command('git.pull', { repository: true })
], CommandCenter.prototype, "pull", null);
__decorate([
    command('git.pullRebase', { repository: true })
], CommandCenter.prototype, "pullRebase", null);
__decorate([
    command('git.pullRef', { repository: true })
], CommandCenter.prototype, "pullRef", null);
__decorate([
    command('git.push', { repository: true })
], CommandCenter.prototype, "push", null);
__decorate([
    command('git.pushForce', { repository: true })
], CommandCenter.prototype, "pushForce", null);
__decorate([
    command('git.pushWithTags', { repository: true })
], CommandCenter.prototype, "pushFollowTags", null);
__decorate([
    command('git.pushWithTagsForce', { repository: true })
], CommandCenter.prototype, "pushFollowTagsForce", null);
__decorate([
    command('git.pushRef', { repository: true })
], CommandCenter.prototype, "pushRef", null);
__decorate([
    command('git.cherryPick', { repository: true })
], CommandCenter.prototype, "cherryPick", null);
__decorate([
    command('git.graph.cherryPick', { repository: true })
], CommandCenter.prototype, "cherryPick2", null);
__decorate([
    command('git.cherryPickAbort', { repository: true })
], CommandCenter.prototype, "cherryPickAbort", null);
__decorate([
    command('git.pushTo', { repository: true })
], CommandCenter.prototype, "pushTo", null);
__decorate([
    command('git.pushToForce', { repository: true })
], CommandCenter.prototype, "pushToForce", null);
__decorate([
    command('git.pushTags', { repository: true })
], CommandCenter.prototype, "pushTags", null);
__decorate([
    command('git.addRemote', { repository: true })
], CommandCenter.prototype, "addRemote", null);
__decorate([
    command('git.removeRemote', { repository: true })
], CommandCenter.prototype, "removeRemote", null);
__decorate([
    command('git.sync', { repository: true })
], CommandCenter.prototype, "sync", null);
__decorate([
    command('git._syncAll')
], CommandCenter.prototype, "syncAll", null);
__decorate([
    command('git.syncRebase', { repository: true })
], CommandCenter.prototype, "syncRebase", null);
__decorate([
    command('git.publish', { repository: true })
], CommandCenter.prototype, "publish", null);
__decorate([
    command('git.ignore')
], CommandCenter.prototype, "ignore", null);
__decorate([
    command('git.revealInExplorer')
], CommandCenter.prototype, "revealInExplorer", null);
__decorate([
    command('git.revealFileInOS.linux'),
    command('git.revealFileInOS.mac'),
    command('git.revealFileInOS.windows')
], CommandCenter.prototype, "revealFileInOS", null);
__decorate([
    command('git.stash', { repository: true })
], CommandCenter.prototype, "stash", null);
__decorate([
    command('git.stashStaged', { repository: true })
], CommandCenter.prototype, "stashStaged", null);
__decorate([
    command('git.stashIncludeUntracked', { repository: true })
], CommandCenter.prototype, "stashIncludeUntracked", null);
__decorate([
    command('git.stashPop', { repository: true })
], CommandCenter.prototype, "stashPop", null);
__decorate([
    command('git.stashPopLatest', { repository: true })
], CommandCenter.prototype, "stashPopLatest", null);
__decorate([
    command('git.stashPopEditor')
], CommandCenter.prototype, "stashPopEditor", null);
__decorate([
    command('git.stashApply', { repository: true })
], CommandCenter.prototype, "stashApply", null);
__decorate([
    command('git.stashApplyLatest', { repository: true })
], CommandCenter.prototype, "stashApplyLatest", null);
__decorate([
    command('git.stashApplyEditor')
], CommandCenter.prototype, "stashApplyEditor", null);
__decorate([
    command('git.stashDrop', { repository: true })
], CommandCenter.prototype, "stashDrop", null);
__decorate([
    command('git.stashDropAll', { repository: true })
], CommandCenter.prototype, "stashDropAll", null);
__decorate([
    command('git.stashDropEditor')
], CommandCenter.prototype, "stashDropEditor", null);
__decorate([
    command('git.stashView', { repository: true })
], CommandCenter.prototype, "stashView", null);
__decorate([
    command('git.timeline.openDiff', { repository: false })
], CommandCenter.prototype, "timelineOpenDiff", null);
__decorate([
    command('git.timeline.viewCommit', { repository: false })
], CommandCenter.prototype, "timelineViewCommit", null);
__decorate([
    command('git.timeline.copyCommitId', { repository: false })
], CommandCenter.prototype, "timelineCopyCommitId", null);
__decorate([
    command('git.timeline.copyCommitMessage', { repository: false })
], CommandCenter.prototype, "timelineCopyCommitMessage", null);
__decorate([
    command('git.timeline.selectForCompare', { repository: false })
], CommandCenter.prototype, "timelineSelectForCompare", null);
__decorate([
    command('git.timeline.compareWithSelected', { repository: false })
], CommandCenter.prototype, "timelineCompareWithSelected", null);
__decorate([
    command('git.rebaseAbort', { repository: true })
], CommandCenter.prototype, "rebaseAbort", null);
__decorate([
    command('git.closeAllDiffEditors', { repository: true })
], CommandCenter.prototype, "closeDiffEditors", null);
__decorate([
    command('git.closeAllUnmodifiedEditors')
], CommandCenter.prototype, "closeUnmodifiedEditors", null);
__decorate([
    command('git.openRepositoriesInParentFolders')
], CommandCenter.prototype, "openRepositoriesInParentFolders", null);
__decorate([
    command('git.manageUnsafeRepositories')
], CommandCenter.prototype, "manageUnsafeRepositories", null);
__decorate([
    command('git.viewChanges', { repository: true })
], CommandCenter.prototype, "viewChanges", null);
__decorate([
    command('git.viewStagedChanges', { repository: true })
], CommandCenter.prototype, "viewStagedChanges", null);
__decorate([
    command('git.viewUntrackedChanges', { repository: true })
], CommandCenter.prototype, "viewUnstagedChanges", null);
__decorate([
    command('git.copyCommitId', { repository: true })
], CommandCenter.prototype, "copyCommitId", null);
__decorate([
    command('git.copyCommitMessage', { repository: true })
], CommandCenter.prototype, "copyCommitMessage", null);
__decorate([
    command('git.viewCommit', { repository: true })
], CommandCenter.prototype, "viewCommit", null);
__decorate([
    command('git.copyContentToClipboard')
], CommandCenter.prototype, "copyContentToClipboard", null);
__decorate([
    command('git.blame.toggleEditorDecoration')
], CommandCenter.prototype, "toggleBlameEditorDecoration", null);
__decorate([
    command('git.blame.toggleStatusBarItem')
], CommandCenter.prototype, "toggleBlameStatusBarItem", null);
//# sourceMappingURL=commands.js.map