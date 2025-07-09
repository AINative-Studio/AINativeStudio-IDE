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
import './outlinePane.css';
import * as dom from '../../../../base/browser/dom.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { TimeoutTimer, timeout } from '../../../../base/common/async.js';
import { toDisposable, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchDataTree } from '../../../../platform/list/browser/listService.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { basename } from '../../../../base/common/resources.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { OutlineViewState } from './outlineViewState.js';
import { IOutlineService } from '../../../services/outline/browser/outline.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { AbstractTreeViewState, TreeFindMode } from '../../../../base/browser/ui/tree/abstractTree.js';
import { ctxAllCollapsed, ctxFilterOnType, ctxFocused, ctxFollowsCursor, ctxSortMode } from './outline.js';
import { defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
class OutlineTreeSorter {
    constructor(_comparator, order) {
        this._comparator = _comparator;
        this.order = order;
    }
    compare(a, b) {
        if (this.order === 2 /* OutlineSortOrder.ByKind */) {
            return this._comparator.compareByType(a, b);
        }
        else if (this.order === 1 /* OutlineSortOrder.ByName */) {
            return this._comparator.compareByName(a, b);
        }
        else {
            return this._comparator.compareByPosition(a, b);
        }
    }
}
let OutlinePane = class OutlinePane extends ViewPane {
    static { this.Id = 'outline'; }
    constructor(options, _outlineService, _instantiationService, viewDescriptorService, _storageService, _editorService, configurationService, keybindingService, contextKeyService, contextMenuService, openerService, themeService, hoverService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, _instantiationService, openerService, themeService, hoverService);
        this._outlineService = _outlineService;
        this._instantiationService = _instantiationService;
        this._storageService = _storageService;
        this._editorService = _editorService;
        this._disposables = new DisposableStore();
        this._editorControlDisposables = new DisposableStore();
        this._editorPaneDisposables = new DisposableStore();
        this._outlineViewState = new OutlineViewState();
        this._editorListener = new MutableDisposable();
        this._treeStates = new LRUCache(10);
        this._editorControlChangePromise = Promise.resolve();
        this._outlineViewState.restore(this._storageService);
        this._disposables.add(this._outlineViewState);
        contextKeyService.bufferChangeEvents(() => {
            this._ctxFollowsCursor = ctxFollowsCursor.bindTo(contextKeyService);
            this._ctxFilterOnType = ctxFilterOnType.bindTo(contextKeyService);
            this._ctxSortMode = ctxSortMode.bindTo(contextKeyService);
            this._ctxAllCollapsed = ctxAllCollapsed.bindTo(contextKeyService);
        });
        const updateContext = () => {
            this._ctxFollowsCursor.set(this._outlineViewState.followCursor);
            this._ctxFilterOnType.set(this._outlineViewState.filterOnType);
            this._ctxSortMode.set(this._outlineViewState.sortBy);
        };
        updateContext();
        this._disposables.add(this._outlineViewState.onDidChange(updateContext));
    }
    dispose() {
        this._disposables.dispose();
        this._editorPaneDisposables.dispose();
        this._editorControlDisposables.dispose();
        this._editorListener.dispose();
        super.dispose();
    }
    focus() {
        this._editorControlChangePromise.then(() => {
            super.focus();
            this._tree?.domFocus();
        });
    }
    renderBody(container) {
        super.renderBody(container);
        this._domNode = container;
        container.classList.add('outline-pane');
        const progressContainer = dom.$('.outline-progress');
        this._message = dom.$('.outline-message');
        this._progressBar = new ProgressBar(progressContainer, defaultProgressBarStyles);
        this._treeContainer = dom.$('.outline-tree');
        dom.append(container, progressContainer, this._message, this._treeContainer);
        this._disposables.add(this.onDidChangeBodyVisibility(visible => {
            if (!visible) {
                // stop everything when not visible
                this._editorListener.clear();
                this._editorPaneDisposables.clear();
                this._editorControlDisposables.clear();
            }
            else if (!this._editorListener.value) {
                const event = Event.any(this._editorService.onDidActiveEditorChange, this._outlineService.onDidChange);
                this._editorListener.value = event(() => this._handleEditorChanged(this._editorService.activeEditorPane));
                this._handleEditorChanged(this._editorService.activeEditorPane);
            }
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this._tree?.layout(height, width);
        this._treeDimensions = new dom.Dimension(width, height);
    }
    collapseAll() {
        this._tree?.collapseAll();
    }
    expandAll() {
        this._tree?.expandAll();
    }
    get outlineViewState() {
        return this._outlineViewState;
    }
    _showMessage(message) {
        this._domNode.classList.add('message');
        this._progressBar.stop().hide();
        this._message.innerText = message;
    }
    _captureViewState(uri) {
        if (this._tree) {
            const oldOutline = this._tree.getInput();
            if (!uri) {
                uri = oldOutline?.uri;
            }
            if (oldOutline && uri) {
                this._treeStates.set(`${oldOutline.outlineKind}/${uri}`, this._tree.getViewState());
                return true;
            }
        }
        return false;
    }
    _handleEditorChanged(pane) {
        this._editorPaneDisposables.clear();
        if (pane) {
            // react to control changes from within pane (https://github.com/microsoft/vscode/issues/134008)
            this._editorPaneDisposables.add(pane.onDidChangeControl(() => {
                this._editorControlChangePromise = this._handleEditorControlChanged(pane);
            }));
        }
        this._editorControlChangePromise = this._handleEditorControlChanged(pane);
    }
    async _handleEditorControlChanged(pane) {
        // persist state
        const resource = EditorResourceAccessor.getOriginalUri(pane?.input);
        const didCapture = this._captureViewState();
        this._editorControlDisposables.clear();
        if (!pane || !this._outlineService.canCreateOutline(pane) || !resource) {
            return this._showMessage(localize('no-editor', "The active editor cannot provide outline information."));
        }
        let loadingMessage;
        if (!didCapture) {
            loadingMessage = new TimeoutTimer(() => {
                this._showMessage(localize('loading', "Loading document symbols for '{0}'...", basename(resource)));
            }, 100);
        }
        this._progressBar.infinite().show(500);
        const cts = new CancellationTokenSource();
        this._editorControlDisposables.add(toDisposable(() => cts.dispose(true)));
        const newOutline = await this._outlineService.createOutline(pane, 1 /* OutlineTarget.OutlinePane */, cts.token);
        loadingMessage?.dispose();
        if (!newOutline) {
            return;
        }
        if (cts.token.isCancellationRequested) {
            newOutline?.dispose();
            return;
        }
        this._editorControlDisposables.add(newOutline);
        this._progressBar.stop().hide();
        const sorter = new OutlineTreeSorter(newOutline.config.comparator, this._outlineViewState.sortBy);
        const tree = this._instantiationService.createInstance((WorkbenchDataTree), 'OutlinePane', this._treeContainer, newOutline.config.delegate, newOutline.config.renderers, newOutline.config.treeDataSource, {
            ...newOutline.config.options,
            sorter,
            expandOnDoubleClick: false,
            expandOnlyOnTwistieClick: true,
            multipleSelectionSupport: false,
            hideTwistiesOfChildlessElements: true,
            defaultFindMode: this._outlineViewState.filterOnType ? TreeFindMode.Filter : TreeFindMode.Highlight,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles
        });
        ctxFocused.bindTo(tree.contextKeyService);
        // update tree, listen to changes
        const updateTree = () => {
            if (newOutline.isEmpty) {
                // no more elements
                this._showMessage(localize('no-symbols', "No symbols found in document '{0}'", basename(resource)));
                this._captureViewState(resource);
                tree.setInput(undefined);
            }
            else if (!tree.getInput()) {
                // first: init tree
                this._domNode.classList.remove('message');
                const state = this._treeStates.get(`${newOutline.outlineKind}/${newOutline.uri}`);
                tree.setInput(newOutline, state && AbstractTreeViewState.lift(state));
            }
            else {
                // update: refresh tree
                this._domNode.classList.remove('message');
                tree.updateChildren();
            }
        };
        updateTree();
        this._editorControlDisposables.add(newOutline.onDidChange(updateTree));
        tree.findMode = this._outlineViewState.filterOnType ? TreeFindMode.Filter : TreeFindMode.Highlight;
        // feature: apply panel background to tree
        this._editorControlDisposables.add(this.viewDescriptorService.onDidChangeLocation(({ views }) => {
            if (views.some(v => v.id === this.id)) {
                tree.updateOptions({ overrideStyles: this.getLocationBasedColors().listOverrideStyles });
            }
        }));
        // feature: filter on type - keep tree and menu in sync
        this._editorControlDisposables.add(tree.onDidChangeFindMode(mode => this._outlineViewState.filterOnType = mode === TreeFindMode.Filter));
        // feature: reveal outline selection in editor
        // on change -> reveal/select defining range
        let idPool = 0;
        this._editorControlDisposables.add(tree.onDidOpen(async (e) => {
            const myId = ++idPool;
            const isDoubleClick = e.browserEvent?.type === 'dblclick';
            if (!isDoubleClick) {
                // workaround for https://github.com/microsoft/vscode/issues/206424
                await timeout(150);
                if (myId !== idPool) {
                    return;
                }
            }
            await newOutline.reveal(e.element, e.editorOptions, e.sideBySide, isDoubleClick);
        }));
        // feature: reveal editor selection in outline
        const revealActiveElement = () => {
            if (!this._outlineViewState.followCursor || !newOutline.activeElement) {
                return;
            }
            let item = newOutline.activeElement;
            while (item) {
                const top = tree.getRelativeTop(item);
                if (top === null) {
                    // not visible -> reveal
                    tree.reveal(item, 0.5);
                }
                if (tree.getRelativeTop(item) !== null) {
                    tree.setFocus([item]);
                    tree.setSelection([item]);
                    break;
                }
                // STILL not visible -> try parent
                item = tree.getParentElement(item);
            }
        };
        revealActiveElement();
        this._editorControlDisposables.add(newOutline.onDidChange(revealActiveElement));
        // feature: update view when user state changes
        this._editorControlDisposables.add(this._outlineViewState.onDidChange((e) => {
            this._outlineViewState.persist(this._storageService);
            if (e.filterOnType) {
                tree.findMode = this._outlineViewState.filterOnType ? TreeFindMode.Filter : TreeFindMode.Highlight;
            }
            if (e.followCursor) {
                revealActiveElement();
            }
            if (e.sortBy) {
                sorter.order = this._outlineViewState.sortBy;
                tree.resort();
            }
        }));
        // feature: expand all nodes when filtering (not when finding)
        let viewState;
        this._editorControlDisposables.add(tree.onDidChangeFindPattern(pattern => {
            if (tree.findMode === TreeFindMode.Highlight) {
                return;
            }
            if (!viewState && pattern) {
                viewState = tree.getViewState();
                tree.expandAll();
            }
            else if (!pattern && viewState) {
                tree.setInput(tree.getInput(), viewState);
                viewState = undefined;
            }
        }));
        // feature: update all-collapsed context key
        const updateAllCollapsedCtx = () => {
            this._ctxAllCollapsed.set(tree.getNode(null).children.every(node => !node.collapsible || node.collapsed));
        };
        this._editorControlDisposables.add(tree.onDidChangeCollapseState(updateAllCollapsedCtx));
        this._editorControlDisposables.add(tree.onDidChangeModel(updateAllCollapsedCtx));
        updateAllCollapsedCtx();
        // last: set tree property and wire it up to one of our context keys
        tree.layout(this._treeDimensions?.height, this._treeDimensions?.width);
        this._tree = tree;
        this._editorControlDisposables.add(toDisposable(() => {
            tree.dispose();
            this._tree = undefined;
        }));
    }
};
OutlinePane = __decorate([
    __param(1, IOutlineService),
    __param(2, IInstantiationService),
    __param(3, IViewDescriptorService),
    __param(4, IStorageService),
    __param(5, IEditorService),
    __param(6, IConfigurationService),
    __param(7, IKeybindingService),
    __param(8, IContextKeyService),
    __param(9, IContextMenuService),
    __param(10, IOpenerService),
    __param(11, IThemeService),
    __param(12, IHoverService)
], OutlinePane);
export { OutlinePane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZVBhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0bGluZS9icm93c2VyL291dGxpbmVQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sbUJBQW1CLENBQUM7QUFDM0IsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RSxPQUFPLEVBQWUsWUFBWSxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3JILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixP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