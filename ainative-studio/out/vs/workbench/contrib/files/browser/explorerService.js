/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExplorerService_1;
import { Event } from '../../../../base/common/event.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ExplorerItem, ExplorerModel } from '../common/explorerModel.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { dirname, basename } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IBulkEditService } from '../../../../editor/browser/services/bulkEditService.js';
import { UndoRedoSource } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { ResourceGlobMatcher } from '../../../common/resources.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
export const UNDO_REDO_SOURCE = new UndoRedoSource();
let ExplorerService = class ExplorerService {
    static { ExplorerService_1 = this; }
    static { this.EXPLORER_FILE_CHANGES_REACT_DELAY = 500; } // delay in ms to react to file changes to give our internal events a chance to react first
    constructor(fileService, configurationService, contextService, clipboardService, editorService, uriIdentityService, bulkEditService, progressService, hostService, filesConfigurationService) {
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.clipboardService = clipboardService;
        this.editorService = editorService;
        this.uriIdentityService = uriIdentityService;
        this.bulkEditService = bulkEditService;
        this.progressService = progressService;
        this.filesConfigurationService = filesConfigurationService;
        this.disposables = new DisposableStore();
        this.fileChangeEvents = [];
        this.config = this.configurationService.getValue('explorer');
        this.model = new ExplorerModel(this.contextService, this.uriIdentityService, this.fileService, this.configurationService, this.filesConfigurationService);
        this.disposables.add(this.model);
        this.disposables.add(this.fileService.onDidRunOperation(e => this.onDidRunOperation(e)));
        this.onFileChangesScheduler = new RunOnceScheduler(async () => {
            const events = this.fileChangeEvents;
            this.fileChangeEvents = [];
            // Filter to the ones we care
            const types = [2 /* FileChangeType.DELETED */];
            if (this.config.sortOrder === "modified" /* SortOrder.Modified */) {
                types.push(0 /* FileChangeType.UPDATED */);
            }
            let shouldRefresh = false;
            // For DELETED and UPDATED events go through the explorer model and check if any of the items got affected
            this.roots.forEach(r => {
                if (this.view && !shouldRefresh) {
                    shouldRefresh = doesFileEventAffect(r, this.view, events, types);
                }
            });
            // For ADDED events we need to go through all the events and check if the explorer is already aware of some of them
            // Or if they affect not yet resolved parts of the explorer. If that is the case we will not refresh.
            events.forEach(e => {
                if (!shouldRefresh) {
                    for (const resource of e.rawAdded) {
                        const parent = this.model.findClosest(dirname(resource));
                        // Parent of the added resource is resolved and the explorer model is not aware of the added resource - we need to refresh
                        if (parent && !parent.getChild(basename(resource))) {
                            shouldRefresh = true;
                            break;
                        }
                    }
                }
            });
            if (shouldRefresh) {
                await this.refresh(false);
            }
        }, ExplorerService_1.EXPLORER_FILE_CHANGES_REACT_DELAY);
        this.disposables.add(this.fileService.onDidFilesChange(e => {
            this.fileChangeEvents.push(e);
            // Don't mess with the file tree while in the process of editing. #112293
            if (this.editable) {
                return;
            }
            if (!this.onFileChangesScheduler.isScheduled()) {
                this.onFileChangesScheduler.schedule();
            }
        }));
        this.disposables.add(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        this.disposables.add(Event.any(this.fileService.onDidChangeFileSystemProviderRegistrations, this.fileService.onDidChangeFileSystemProviderCapabilities)(async (e) => {
            let affected = false;
            this.model.roots.forEach(r => {
                if (r.resource.scheme === e.scheme) {
                    affected = true;
                    r.forgetChildren();
                }
            });
            if (affected) {
                if (this.view) {
                    await this.view.setTreeInput();
                }
            }
        }));
        this.disposables.add(this.model.onDidChangeRoots(() => {
            this.view?.setTreeInput();
        }));
        // Refresh explorer when window gets focus to compensate for missing file events #126817
        this.disposables.add(hostService.onDidChangeFocus(hasFocus => {
            if (hasFocus) {
                this.refresh(false);
            }
        }));
        this.revealExcludeMatcher = new ResourceGlobMatcher((uri) => getRevealExcludes(configurationService.getValue({ resource: uri })), (event) => event.affectsConfiguration('explorer.autoRevealExclude'), contextService, configurationService);
        this.disposables.add(this.revealExcludeMatcher);
    }
    get roots() {
        return this.model.roots;
    }
    get sortOrderConfiguration() {
        return {
            sortOrder: this.config.sortOrder,
            lexicographicOptions: this.config.sortOrderLexicographicOptions,
            reverse: this.config.sortOrderReverse,
        };
    }
    registerView(contextProvider) {
        this.view = contextProvider;
    }
    getContext(respectMultiSelection, ignoreNestedChildren = false) {
        if (!this.view) {
            return [];
        }
        const items = new Set(this.view.getContext(respectMultiSelection));
        items.forEach(item => {
            try {
                if (respectMultiSelection && !ignoreNestedChildren && this.view?.isItemCollapsed(item) && item.nestedChildren) {
                    for (const child of item.nestedChildren) {
                        items.add(child);
                    }
                }
            }
            catch {
                // We will error out trying to resolve collapsed nodes that have not yet been resolved.
                // So we catch and ignore them in the multiSelect context
                return;
            }
        });
        return [...items];
    }
    async applyBulkEdit(edit, options) {
        const cancellationTokenSource = new CancellationTokenSource();
        const location = options.progressLocation ?? 10 /* ProgressLocation.Window */;
        let progressOptions;
        if (location === 10 /* ProgressLocation.Window */) {
            progressOptions = {
                location: location,
                title: options.progressLabel,
                cancellable: edit.length > 1,
            };
        }
        else {
            progressOptions = {
                location: location,
                title: options.progressLabel,
                cancellable: edit.length > 1,
                delay: 500,
            };
        }
        const promise = this.progressService.withProgress(progressOptions, async (progress) => {
            await this.bulkEditService.apply(edit, {
                undoRedoSource: UNDO_REDO_SOURCE,
                label: options.undoLabel,
                code: 'undoredo.explorerOperation',
                progress,
                token: cancellationTokenSource.token,
                confirmBeforeUndo: options.confirmBeforeUndo
            });
        }, () => cancellationTokenSource.cancel());
        await this.progressService.withProgress({ location: 1 /* ProgressLocation.Explorer */, delay: 500 }, () => promise);
        cancellationTokenSource.dispose();
    }
    hasViewFocus() {
        return !!this.view && this.view.hasFocus();
    }
    // IExplorerService methods
    findClosest(resource) {
        return this.model.findClosest(resource);
    }
    findClosestRoot(resource) {
        const parentRoots = this.model.roots.filter(r => this.uriIdentityService.extUri.isEqualOrParent(resource, r.resource))
            .sort((first, second) => second.resource.path.length - first.resource.path.length);
        return parentRoots.length ? parentRoots[0] : null;
    }
    async setEditable(stat, data) {
        if (!this.view) {
            return;
        }
        if (!data) {
            this.editable = undefined;
        }
        else {
            this.editable = { stat, data };
        }
        const isEditing = this.isEditable(stat);
        try {
            await this.view.setEditable(stat, isEditing);
        }
        catch {
            return;
        }
        if (!this.editable && this.fileChangeEvents.length && !this.onFileChangesScheduler.isScheduled()) {
            this.onFileChangesScheduler.schedule();
        }
    }
    async setToCopy(items, cut) {
        const previouslyCutItems = this.cutItems;
        this.cutItems = cut ? items : undefined;
        await this.clipboardService.writeResources(items.map(s => s.resource));
        this.view?.itemsCopied(items, cut, previouslyCutItems);
    }
    isCut(item) {
        return !!this.cutItems && this.cutItems.some(i => this.uriIdentityService.extUri.isEqual(i.resource, item.resource));
    }
    getEditable() {
        return this.editable;
    }
    getEditableData(stat) {
        return this.editable && this.editable.stat === stat ? this.editable.data : undefined;
    }
    isEditable(stat) {
        return !!this.editable && (this.editable.stat === stat || !stat);
    }
    async select(resource, reveal) {
        if (!this.view) {
            return;
        }
        // If file or parent matches exclude patterns, do not reveal unless reveal argument is 'force'
        const ignoreRevealExcludes = reveal === 'force';
        const fileStat = this.findClosest(resource);
        if (fileStat) {
            if (!this.shouldAutoRevealItem(fileStat, ignoreRevealExcludes)) {
                return;
            }
            await this.view.selectResource(fileStat.resource, reveal);
            return Promise.resolve(undefined);
        }
        // Stat needs to be resolved first and then revealed
        const options = { resolveTo: [resource], resolveMetadata: this.config.sortOrder === "modified" /* SortOrder.Modified */ };
        const root = this.findClosestRoot(resource);
        if (!root) {
            return undefined;
        }
        try {
            const stat = await this.fileService.resolve(root.resource, options);
            // Convert to model
            const modelStat = ExplorerItem.create(this.fileService, this.configurationService, this.filesConfigurationService, stat, undefined, options.resolveTo);
            // Update Input with disk Stat
            ExplorerItem.mergeLocalWithDisk(modelStat, root);
            const item = root.find(resource);
            await this.view.refresh(true, root);
            // Once item is resolved, check again if folder should be expanded
            if (item && !this.shouldAutoRevealItem(item, ignoreRevealExcludes)) {
                return;
            }
            await this.view.selectResource(item ? item.resource : undefined, reveal);
        }
        catch (error) {
            root.error = error;
            await this.view.refresh(false, root);
        }
    }
    async refresh(reveal = true) {
        // Do not refresh the tree when it is showing temporary nodes (phantom elements)
        if (this.view?.hasPhantomElements()) {
            return;
        }
        this.model.roots.forEach(r => r.forgetChildren());
        if (this.view) {
            await this.view.refresh(true);
            const resource = this.editorService.activeEditor?.resource;
            const autoReveal = this.configurationService.getValue().explorer.autoReveal;
            if (reveal && resource && autoReveal) {
                // We did a top level refresh, reveal the active file #67118
                this.select(resource, autoReveal);
            }
        }
    }
    // File events
    async onDidRunOperation(e) {
        // When nesting, changes to one file in a folder may impact the rendered structure
        // of all the folder's immediate children, thus a recursive refresh is needed.
        // Ideally the tree would be able to recusively refresh just one level but that does not yet exist.
        const shouldDeepRefresh = this.config.fileNesting.enabled;
        // Add
        if (e.isOperation(0 /* FileOperation.CREATE */) || e.isOperation(3 /* FileOperation.COPY */)) {
            const addedElement = e.target;
            const parentResource = dirname(addedElement.resource);
            const parents = this.model.findAll(parentResource);
            if (parents.length) {
                // Add the new file to its parent (Model)
                await Promise.all(parents.map(async (p) => {
                    // We have to check if the parent is resolved #29177
                    const resolveMetadata = this.config.sortOrder === `modified`;
                    if (!p.isDirectoryResolved) {
                        const stat = await this.fileService.resolve(p.resource, { resolveMetadata });
                        if (stat) {
                            const modelStat = ExplorerItem.create(this.fileService, this.configurationService, this.filesConfigurationService, stat, p.parent);
                            ExplorerItem.mergeLocalWithDisk(modelStat, p);
                        }
                    }
                    const childElement = ExplorerItem.create(this.fileService, this.configurationService, this.filesConfigurationService, addedElement, p.parent);
                    // Make sure to remove any previous version of the file if any
                    p.removeChild(childElement);
                    p.addChild(childElement);
                    // Refresh the Parent (View)
                    await this.view?.refresh(shouldDeepRefresh, p);
                }));
            }
        }
        // Move (including Rename)
        else if (e.isOperation(2 /* FileOperation.MOVE */)) {
            const oldResource = e.resource;
            const newElement = e.target;
            const oldParentResource = dirname(oldResource);
            const newParentResource = dirname(newElement.resource);
            const modelElements = this.model.findAll(oldResource);
            const sameParentMove = modelElements.every(e => !e.nestedParent) && this.uriIdentityService.extUri.isEqual(oldParentResource, newParentResource);
            // Handle Rename
            if (sameParentMove) {
                await Promise.all(modelElements.map(async (modelElement) => {
                    // Rename File (Model)
                    modelElement.rename(newElement);
                    await this.view?.refresh(shouldDeepRefresh, modelElement.parent);
                }));
            }
            // Handle Move
            else {
                const newParents = this.model.findAll(newParentResource);
                if (newParents.length && modelElements.length) {
                    // Move in Model
                    await Promise.all(modelElements.map(async (modelElement, index) => {
                        const oldParent = modelElement.parent;
                        const oldNestedParent = modelElement.nestedParent;
                        modelElement.move(newParents[index]);
                        if (oldNestedParent) {
                            await this.view?.refresh(false, oldNestedParent);
                        }
                        await this.view?.refresh(false, oldParent);
                        await this.view?.refresh(shouldDeepRefresh, newParents[index]);
                    }));
                }
            }
        }
        // Delete
        else if (e.isOperation(1 /* FileOperation.DELETE */)) {
            const modelElements = this.model.findAll(e.resource);
            await Promise.all(modelElements.map(async (modelElement) => {
                if (modelElement.parent) {
                    // Remove Element from Parent (Model)
                    const parent = modelElement.parent;
                    parent.removeChild(modelElement);
                    this.view?.focusNext();
                    const oldNestedParent = modelElement.nestedParent;
                    if (oldNestedParent) {
                        oldNestedParent.removeChild(modelElement);
                        await this.view?.refresh(false, oldNestedParent);
                    }
                    // Refresh Parent (View)
                    await this.view?.refresh(shouldDeepRefresh, parent);
                    if (this.view?.getFocus().length === 0) {
                        this.view?.focusLast();
                    }
                }
            }));
        }
    }
    // Check if an item matches a explorer.autoRevealExclude pattern
    shouldAutoRevealItem(item, ignore) {
        if (item === undefined || ignore) {
            return true;
        }
        if (this.revealExcludeMatcher.matches(item.resource, name => !!(item.parent && item.parent.getChild(name)))) {
            return false;
        }
        const root = item.root;
        let currentItem = item.parent;
        while (currentItem !== root) {
            if (currentItem === undefined) {
                return true;
            }
            if (this.revealExcludeMatcher.matches(currentItem.resource)) {
                return false;
            }
            currentItem = currentItem.parent;
        }
        return true;
    }
    async onConfigurationUpdated(event) {
        if (!event.affectsConfiguration('explorer')) {
            return;
        }
        let shouldRefresh = false;
        if (event.affectsConfiguration('explorer.fileNesting')) {
            shouldRefresh = true;
        }
        const configuration = this.configurationService.getValue();
        const configSortOrder = configuration?.explorer?.sortOrder || "default" /* SortOrder.Default */;
        if (this.config.sortOrder !== configSortOrder) {
            shouldRefresh = this.config.sortOrder !== undefined;
        }
        const configLexicographicOptions = configuration?.explorer?.sortOrderLexicographicOptions || "default" /* LexicographicOptions.Default */;
        if (this.config.sortOrderLexicographicOptions !== configLexicographicOptions) {
            shouldRefresh = shouldRefresh || this.config.sortOrderLexicographicOptions !== undefined;
        }
        const sortOrderReverse = configuration?.explorer?.sortOrderReverse || false;
        if (this.config.sortOrderReverse !== sortOrderReverse) {
            shouldRefresh = shouldRefresh || this.config.sortOrderReverse !== undefined;
        }
        this.config = configuration.explorer;
        if (shouldRefresh) {
            await this.refresh();
        }
    }
    dispose() {
        this.disposables.dispose();
    }
};
ExplorerService = ExplorerService_1 = __decorate([
    __param(0, IFileService),
    __param(1, IConfigurationService),
    __param(2, IWorkspaceContextService),
    __param(3, IClipboardService),
    __param(4, IEditorService),
    __param(5, IUriIdentityService),
    __param(6, IBulkEditService),
    __param(7, IProgressService),
    __param(8, IHostService),
    __param(9, IFilesConfigurationService)
], ExplorerService);
export { ExplorerService };
function doesFileEventAffect(item, view, events, types) {
    for (const [_name, child] of item.children) {
        if (view.isItemVisible(child)) {
            if (events.some(e => e.contains(child.resource, ...types))) {
                return true;
            }
            if (child.isDirectory && child.isDirectoryResolved) {
                if (doesFileEventAffect(child, view, events, types)) {
                    return true;
                }
            }
        }
    }
    return false;
}
function getRevealExcludes(configuration) {
    const revealExcludes = configuration && configuration.explorer && configuration.explorer.autoRevealExclude;
    if (!revealExcludes) {
        return {};
    }
    return revealExcludes;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9leHBsb3JlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUV6RSxPQUFPLEVBQXFDLFlBQVksRUFBeUQsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwSyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBNkIsTUFBTSw0REFBNEQsQ0FBQztBQUM5SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGdCQUFnQixFQUFvQixNQUFNLHdEQUF3RCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQWlFLE1BQU0sa0RBQWtELENBQUM7QUFDbkosT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixF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