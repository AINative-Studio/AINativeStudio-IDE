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
var BulkEditPane_1;
import { ButtonBar } from '../../../../../base/browser/ui/button/button.js';
import { CachedFunction, LRUCachedFunction } from '../../../../../base/common/cache.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import './bulkEdit.css';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { WorkbenchAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { BulkEditPreviewProvider, BulkFileOperations } from './bulkEditPreview.js';
import { BulkEditAccessibilityProvider, BulkEditDataSource, BulkEditDelegate, BulkEditIdentityProvider, BulkEditNaviLabelProvider, BulkEditSorter, CategoryElement, CategoryElementRenderer, compareBulkFileOperations, FileElement, FileElementRenderer, TextEditElement, TextEditElementRenderer } from './bulkEditTree.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
var State;
(function (State) {
    State["Data"] = "data";
    State["Message"] = "message";
})(State || (State = {}));
let BulkEditPane = class BulkEditPane extends ViewPane {
    static { BulkEditPane_1 = this; }
    static { this.ID = 'refactorPreview'; }
    static { this.Schema = 'vscode-bulkeditpreview-multieditor'; }
    static { this.ctxHasCategories = new RawContextKey('refactorPreview.hasCategories', false); }
    static { this.ctxGroupByFile = new RawContextKey('refactorPreview.groupByFile', true); }
    static { this.ctxHasCheckedChanges = new RawContextKey('refactorPreview.hasCheckedChanges', true); }
    static { this._memGroupByFile = `${this.ID}.groupByFile`; }
    constructor(options, _instaService, _editorService, _labelService, _textModelService, _dialogService, _contextMenuService, _storageService, contextKeyService, viewDescriptorService, keybindingService, contextMenuService, configurationService, openerService, themeService, hoverService) {
        super({ ...options, titleMenuId: MenuId.BulkEditTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, _instaService, openerService, themeService, hoverService);
        this._instaService = _instaService;
        this._editorService = _editorService;
        this._labelService = _labelService;
        this._textModelService = _textModelService;
        this._dialogService = _dialogService;
        this._contextMenuService = _contextMenuService;
        this._storageService = _storageService;
        this._treeViewStates = new Map();
        this._disposables = new DisposableStore();
        this._sessionDisposables = new DisposableStore();
        this._computeResourceDiffEditorInputs = new LRUCachedFunction(async (fileOperations) => {
            const computeDiffEditorInput = new CachedFunction(async (fileOperation) => {
                const fileOperationUri = fileOperation.uri;
                const previewUri = this._currentProvider.asPreviewUri(fileOperationUri);
                // delete
                if (fileOperation.type & 4 /* BulkFileOperationType.Delete */) {
                    return {
                        original: { resource: URI.revive(previewUri) },
                        modified: { resource: undefined },
                        goToFileResource: fileOperation.uri,
                    };
                }
                // rename, create, edits
                else {
                    let leftResource;
                    try {
                        (await this._textModelService.createModelReference(fileOperationUri)).dispose();
                        leftResource = fileOperationUri;
                    }
                    catch {
                        leftResource = BulkEditPreviewProvider.emptyPreview;
                    }
                    return {
                        original: { resource: URI.revive(leftResource) },
                        modified: { resource: URI.revive(previewUri) },
                        goToFileResource: leftResource,
                    };
                }
            });
            const sortedFileOperations = fileOperations.slice().sort(compareBulkFileOperations);
            const resources = [];
            for (const operation of sortedFileOperations) {
                resources.push(await computeDiffEditorInput.get(operation));
            }
            const getResourceDiffEditorInputIdOfOperation = async (operation) => {
                const resource = await computeDiffEditorInput.get(operation);
                return { original: resource.original.resource, modified: resource.modified.resource };
            };
            return {
                resources,
                getResourceDiffEditorInputIdOfOperation
            };
        });
        this.element.classList.add('bulk-edit-panel', 'show-file-icons');
        this._ctxHasCategories = BulkEditPane_1.ctxHasCategories.bindTo(contextKeyService);
        this._ctxGroupByFile = BulkEditPane_1.ctxGroupByFile.bindTo(contextKeyService);
        this._ctxHasCheckedChanges = BulkEditPane_1.ctxHasCheckedChanges.bindTo(contextKeyService);
    }
    dispose() {
        this._tree.dispose();
        this._disposables.dispose();
        super.dispose();
    }
    renderBody(parent) {
        super.renderBody(parent);
        const resourceLabels = this._instaService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this._disposables.add(resourceLabels);
        const contentContainer = document.createElement('div');
        contentContainer.className = 'content';
        parent.appendChild(contentContainer);
        // tree
        const treeContainer = document.createElement('div');
        contentContainer.appendChild(treeContainer);
        this._treeDataSource = this._instaService.createInstance(BulkEditDataSource);
        this._treeDataSource.groupByFile = this._storageService.getBoolean(BulkEditPane_1._memGroupByFile, 0 /* StorageScope.PROFILE */, true);
        this._ctxGroupByFile.set(this._treeDataSource.groupByFile);
        this._tree = this._instaService.createInstance((WorkbenchAsyncDataTree), this.id, treeContainer, new BulkEditDelegate(), [this._instaService.createInstance(TextEditElementRenderer), this._instaService.createInstance(FileElementRenderer, resourceLabels), this._instaService.createInstance(CategoryElementRenderer)], this._treeDataSource, {
            accessibilityProvider: this._instaService.createInstance(BulkEditAccessibilityProvider),
            identityProvider: new BulkEditIdentityProvider(),
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            keyboardNavigationLabelProvider: new BulkEditNaviLabelProvider(),
            sorter: new BulkEditSorter(),
            selectionNavigation: true
        });
        this._disposables.add(this._tree.onContextMenu(this._onContextMenu, this));
        this._disposables.add(this._tree.onDidOpen(e => this._openElementInMultiDiffEditor(e)));
        // buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons';
        contentContainer.appendChild(buttonsContainer);
        const buttonBar = new ButtonBar(buttonsContainer);
        this._disposables.add(buttonBar);
        const btnConfirm = buttonBar.addButton({ supportIcons: true, ...defaultButtonStyles });
        btnConfirm.label = localize('ok', 'Apply');
        btnConfirm.onDidClick(() => this.accept(), this, this._disposables);
        const btnCancel = buttonBar.addButton({ ...defaultButtonStyles, secondary: true });
        btnCancel.label = localize('cancel', 'Discard');
        btnCancel.onDidClick(() => this.discard(), this, this._disposables);
        // message
        this._message = document.createElement('span');
        this._message.className = 'message';
        this._message.innerText = localize('empty.msg', "Invoke a code action, like rename, to see a preview of its changes here.");
        parent.appendChild(this._message);
        //
        this._setState("message" /* State.Message */);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        const treeHeight = height - 50;
        this._tree.getHTMLElement().parentElement.style.height = `${treeHeight}px`;
        this._tree.layout(treeHeight, width);
    }
    _setState(state) {
        this.element.dataset['state'] = state;
    }
    async setInput(edit, token) {
        this._setState("data" /* State.Data */);
        this._sessionDisposables.clear();
        this._treeViewStates.clear();
        if (this._currentResolve) {
            this._currentResolve(undefined);
            this._currentResolve = undefined;
        }
        const input = await this._instaService.invokeFunction(BulkFileOperations.create, edit);
        this._currentProvider = this._instaService.createInstance(BulkEditPreviewProvider, input);
        this._sessionDisposables.add(this._currentProvider);
        this._sessionDisposables.add(input);
        //
        const hasCategories = input.categories.length > 1;
        this._ctxHasCategories.set(hasCategories);
        this._treeDataSource.groupByFile = !hasCategories || this._treeDataSource.groupByFile;
        this._ctxHasCheckedChanges.set(input.checked.checkedCount > 0);
        this._currentInput = input;
        return new Promise(resolve => {
            token.onCancellationRequested(() => resolve(undefined));
            this._currentResolve = resolve;
            this._setTreeInput(input);
            // refresh when check state changes
            this._sessionDisposables.add(input.checked.onDidChange(() => {
                this._tree.updateChildren();
                this._ctxHasCheckedChanges.set(input.checked.checkedCount > 0);
            }));
        });
    }
    hasInput() {
        return Boolean(this._currentInput);
    }
    async _setTreeInput(input) {
        const viewState = this._treeViewStates.get(this._treeDataSource.groupByFile);
        await this._tree.setInput(input, viewState);
        this._tree.domFocus();
        if (viewState) {
            return;
        }
        // async expandAll (max=10) is the default when no view state is given
        const expand = [...this._tree.getNode(input).children].slice(0, 10);
        while (expand.length > 0) {
            const { element } = expand.shift();
            if (element instanceof FileElement) {
                await this._tree.expand(element, true);
            }
            if (element instanceof CategoryElement) {
                await this._tree.expand(element, true);
                expand.push(...this._tree.getNode(element).children);
            }
        }
    }
    accept() {
        const conflicts = this._currentInput?.conflicts.list();
        if (!conflicts || conflicts.length === 0) {
            this._done(true);
            return;
        }
        let message;
        if (conflicts.length === 1) {
            message = localize('conflict.1', "Cannot apply refactoring because '{0}' has changed in the meantime.", this._labelService.getUriLabel(conflicts[0], { relative: true }));
        }
        else {
            message = localize('conflict.N', "Cannot apply refactoring because {0} other files have changed in the meantime.", conflicts.length);
        }
        this._dialogService.warn(message).finally(() => this._done(false));
    }
    discard() {
        this._done(false);
    }
    _done(accept) {
        this._currentResolve?.(accept ? this._currentInput?.getWorkspaceEdit() : undefined);
        this._currentInput = undefined;
        this._setState("message" /* State.Message */);
        this._sessionDisposables.clear();
    }
    toggleChecked() {
        const [first] = this._tree.getFocus();
        if ((first instanceof FileElement || first instanceof TextEditElement) && !first.isDisabled()) {
            first.setChecked(!first.isChecked());
        }
        else if (first instanceof CategoryElement) {
            first.setChecked(!first.isChecked());
        }
    }
    groupByFile() {
        if (!this._treeDataSource.groupByFile) {
            this.toggleGrouping();
        }
    }
    groupByType() {
        if (this._treeDataSource.groupByFile) {
            this.toggleGrouping();
        }
    }
    toggleGrouping() {
        const input = this._tree.getInput();
        if (input) {
            // (1) capture view state
            const oldViewState = this._tree.getViewState();
            this._treeViewStates.set(this._treeDataSource.groupByFile, oldViewState);
            // (2) toggle and update
            this._treeDataSource.groupByFile = !this._treeDataSource.groupByFile;
            this._setTreeInput(input);
            // (3) remember preference
            this._storageService.store(BulkEditPane_1._memGroupByFile, this._treeDataSource.groupByFile, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            this._ctxGroupByFile.set(this._treeDataSource.groupByFile);
        }
    }
    async _openElementInMultiDiffEditor(e) {
        const fileOperations = this._currentInput?.fileOperations;
        if (!fileOperations) {
            return;
        }
        let selection = undefined;
        let fileElement;
        if (e.element instanceof TextEditElement) {
            fileElement = e.element.parent;
            selection = e.element.edit.textEdit.textEdit.range;
        }
        else if (e.element instanceof FileElement) {
            fileElement = e.element;
            selection = e.element.edit.textEdits[0]?.textEdit.textEdit.range;
        }
        else {
            // invalid event
            return;
        }
        const result = await this._computeResourceDiffEditorInputs.get(fileOperations);
        const resourceId = await result.getResourceDiffEditorInputIdOfOperation(fileElement.edit);
        const options = {
            ...e.editorOptions,
            viewState: {
                revealData: {
                    resource: resourceId,
                    range: selection,
                }
            }
        };
        const multiDiffSource = URI.from({ scheme: BulkEditPane_1.Schema });
        const label = 'Refactor Preview';
        this._editorService.openEditor({
            multiDiffSource,
            label,
            options,
            isTransient: true,
            description: label,
            resources: result.resources
        }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
    }
    _onContextMenu(e) {
        this._contextMenuService.showContextMenu({
            menuId: MenuId.BulkEditContext,
            contextKeyService: this.contextKeyService,
            getAnchor: () => e.anchor
        });
    }
};
BulkEditPane = BulkEditPane_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IEditorService),
    __param(3, ILabelService),
    __param(4, ITextModelService),
    __param(5, IDialogService),
    __param(6, IContextMenuService),
    __param(7, IStorageService),
    __param(8, IContextKeyService),
    __param(9, IViewDescriptorService),
    __param(10, IKeybindingService),
    __param(11, IContextMenuService),
    __param(12, IConfigurationService),
    __param(13, IOpenerService),
    __param(14, IThemeService),
    __param(15, IHoverService)
], BulkEditPane);
export { BulkEditPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9wcmV2aWV3L2J1bGtFZGl0UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUd4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sZ0JBQWdCLENBQUM7QUFJeEIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDekgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztB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