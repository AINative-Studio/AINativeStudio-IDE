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
var ExplorerView_1;
import * as nls from '../../../../../nls.js';
import * as perf from '../../../../../base/common/performance.js';
import { memoize } from '../../../../../base/common/decorators.js';
import { ExplorerFolderContext, FilesExplorerFocusedContext, ExplorerFocusedContext, ExplorerRootContext, ExplorerResourceReadonlyContext, ExplorerResourceCut, ExplorerResourceMoveableToTrash, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext, ExplorerCompressedLastFocusContext, ExplorerResourceAvailableEditorIdsContext, VIEW_ID, ExplorerResourceWritableContext, ViewHasSomeCollapsibleRootItemContext, FoldersViewVisibleContext, ExplorerResourceParentReadOnlyContext, ExplorerFindProviderActive } from '../../common/files.js';
import { FileCopiedContext, NEW_FILE_COMMAND_ID, NEW_FOLDER_COMMAND_ID } from '../fileActions.js';
import * as DOM from '../../../../../base/browser/dom.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { ExplorerDecorationsProvider } from './explorerDecorationsProvider.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { IDecorationsService } from '../../../../services/decorations/common/decorations.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { DelayedDragHandler } from '../../../../../base/browser/dnd.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from '../../../../services/editor/common/editorService.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ExplorerDelegate, ExplorerDataSource, FilesRenderer, FilesFilter, FileSorter, FileDragAndDrop, ExplorerCompressionDelegate, isCompressedFolderName, ExplorerFindProvider } from './explorerViewer.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { MenuId, Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ExplorerItem, NewExplorerItem } from '../../common/explorerModel.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { Event } from '../../../../../base/common/event.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { IExplorerService } from '../files.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IEditorResolverService } from '../../../../services/editor/common/editorResolverService.js';
import { EditorOpenSource } from '../../../../../platform/editor/common/editor.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
function hasExpandedRootChild(tree, treeInput) {
    for (const folder of treeInput) {
        if (tree.hasNode(folder) && !tree.isCollapsed(folder)) {
            for (const [, child] of folder.children.entries()) {
                if (tree.hasNode(child) && tree.isCollapsible(child) && !tree.isCollapsed(child)) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Whether or not any of the nodes in the tree are expanded
 */
function hasExpandedNode(tree, treeInput) {
    for (const folder of treeInput) {
        if (tree.hasNode(folder) && !tree.isCollapsed(folder)) {
            return true;
        }
    }
    return false;
}
const identityProvider = {
    getId: (stat) => {
        if (stat instanceof NewExplorerItem) {
            return `new:${stat.getId()}`;
        }
        return stat.getId();
    }
};
export function getContext(focus, selection, respectMultiSelection, compressedNavigationControllerProvider) {
    let focusedStat;
    focusedStat = focus.length ? focus[0] : undefined;
    // If we are respecting multi-select and we have a multi-selection we ignore focus as we want to act on the selection
    if (respectMultiSelection && selection.length > 1) {
        focusedStat = undefined;
    }
    const compressedNavigationControllers = focusedStat && compressedNavigationControllerProvider.getCompressedNavigationController(focusedStat);
    const compressedNavigationController = compressedNavigationControllers && compressedNavigationControllers.length ? compressedNavigationControllers[0] : undefined;
    focusedStat = compressedNavigationController ? compressedNavigationController.current : focusedStat;
    const selectedStats = [];
    for (const stat of selection) {
        const controllers = compressedNavigationControllerProvider.getCompressedNavigationController(stat);
        const controller = controllers && controllers.length ? controllers[0] : undefined;
        if (controller && focusedStat && controller === compressedNavigationController) {
            if (stat === focusedStat) {
                selectedStats.push(stat);
            }
            // Ignore stats which are selected but are part of the same compact node as the focused stat
            continue;
        }
        if (controller) {
            selectedStats.push(...controller.items);
        }
        else {
            selectedStats.push(stat);
        }
    }
    if (!focusedStat) {
        if (respectMultiSelection) {
            return selectedStats;
        }
        else {
            return [];
        }
    }
    if (respectMultiSelection && selectedStats.indexOf(focusedStat) >= 0) {
        return selectedStats;
    }
    return [focusedStat];
}
let ExplorerView = class ExplorerView extends ViewPane {
    static { ExplorerView_1 = this; }
    static { this.TREE_VIEW_STATE_STORAGE_KEY = 'workbench.explorer.treeViewState'; }
    constructor(options, contextMenuService, viewDescriptorService, instantiationService, contextService, progressService, editorService, editorResolverService, layoutService, keybindingService, contextKeyService, configurationService, decorationService, labelService, themeService, telemetryService, hoverService, explorerService, storageService, clipboardService, fileService, uriIdentityService, commandService, openerService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.contextService = contextService;
        this.progressService = progressService;
        this.editorService = editorService;
        this.editorResolverService = editorResolverService;
        this.layoutService = layoutService;
        this.decorationService = decorationService;
        this.labelService = labelService;
        this.telemetryService = telemetryService;
        this.explorerService = explorerService;
        this.storageService = storageService;
        this.clipboardService = clipboardService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.commandService = commandService;
        this._autoReveal = false;
        this.delegate = options.delegate;
        this.resourceContext = instantiationService.createInstance(ResourceContextKey);
        this._register(this.resourceContext);
        this.parentReadonlyContext = ExplorerResourceParentReadOnlyContext.bindTo(contextKeyService);
        this.folderContext = ExplorerFolderContext.bindTo(contextKeyService);
        this.readonlyContext = ExplorerResourceReadonlyContext.bindTo(contextKeyService);
        this.availableEditorIdsContext = ExplorerResourceAvailableEditorIdsContext.bindTo(contextKeyService);
        this.rootContext = ExplorerRootContext.bindTo(contextKeyService);
        this.resourceMoveableToTrash = ExplorerResourceMoveableToTrash.bindTo(contextKeyService);
        this.compressedFocusContext = ExplorerCompressedFocusContext.bindTo(contextKeyService);
        this.compressedFocusFirstContext = ExplorerCompressedFirstFocusContext.bindTo(contextKeyService);
        this.compressedFocusLastContext = ExplorerCompressedLastFocusContext.bindTo(contextKeyService);
        this.viewHasSomeCollapsibleRootItem = ViewHasSomeCollapsibleRootItemContext.bindTo(contextKeyService);
        this.viewVisibleContextKey = FoldersViewVisibleContext.bindTo(contextKeyService);
        this.explorerService.registerView(this);
    }
    get autoReveal() {
        return this._autoReveal;
    }
    set autoReveal(autoReveal) {
        this._autoReveal = autoReveal;
    }
    get name() {
        return this.labelService.getWorkspaceLabel(this.contextService.getWorkspace());
    }
    get title() {
        return this.name;
    }
    set title(_) {
        // noop
    }
    setVisible(visible) {
        this.viewVisibleContextKey.set(visible);
        super.setVisible(visible);
    }
    get fileCopiedContextKey() {
        return FileCopiedContext.bindTo(this.contextKeyService);
    }
    get resourceCutContextKey() {
        return ExplorerResourceCut.bindTo(this.contextKeyService);
    }
    // Split view methods
    renderHeader(container) {
        super.renderHeader(container);
        // Expand on drag over
        this.dragHandler = new DelayedDragHandler(container, () => this.setExpanded(true));
        const titleElement = container.querySelector('.title');
        const setHeader = () => {
            titleElement.textContent = this.name;
            this.updateTitle(this.name);
            this.ariaHeaderLabel = nls.localize('explorerSection', "Explorer Section: {0}", this.name);
            titleElement.setAttribute('aria-label', this.ariaHeaderLabel);
        };
        this._register(this.contextService.onDidChangeWorkspaceName(setHeader));
        this._register(this.labelService.onDidChangeFormatters(setHeader));
        setHeader();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    renderBody(container) {
        super.renderBody(container);
        this.container = container;
        this.treeContainer = DOM.append(container, DOM.$('.explorer-folders-view'));
        this.createTree(this.treeContainer);
        this._register(this.labelService.onDidChangeFormatters(() => {
            this._onDidChangeTitleArea.fire();
        }));
        // Update configuration
        this.onConfigurationUpdated(undefined);
        // When the explorer viewer is loaded, listen to changes to the editor input
        this._register(this.editorService.onDidActiveEditorChange(() => {
            this.selectActiveFile();
        }));
        // Also handle configuration updates
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
        this._register(this.onDidChangeBodyVisibility(async (visible) => {
            if (visible) {
                // Always refresh explorer when it becomes visible to compensate for missing file events #126817
                await this.setTreeInput();
                // Update the collapse / expand  button state
                this.updateAnyCollapsedContext();
                // Find resource to focus from active editor input if set
                this.selectActiveFile(true);
            }
        }));
        // Support for paste of files into explorer
        this._register(DOM.addDisposableListener(DOM.getWindow(this.container), DOM.EventType.PASTE, async (event) => {
            if (!this.hasFocus() || this.readonlyContext.get()) {
                return;
            }
            if (event.clipboardData?.files?.length) {
                await this.commandService.executeCommand('filesExplorer.paste', event.clipboardData?.files);
            }
        }));
    }
    focus() {
        super.focus();
        this.tree.domFocus();
        if (this.tree.getFocusedPart() === 0 /* AbstractTreePart.Tree */) {
            const focused = this.tree.getFocus();
            if (focused.length === 1 && this._autoReveal) {
                this.tree.reveal(focused[0], 0.5);
            }
        }
    }
    hasFocus() {
        return DOM.isAncestorOfActiveElement(this.container);
    }
    getFocus() {
        return this.tree.getFocus();
    }
    focusNext() {
        this.tree.focusNext();
    }
    focusLast() {
        this.tree.focusLast();
    }
    getContext(respectMultiSelection) {
        const focusedItems = this.tree.getFocusedPart() === 1 /* AbstractTreePart.StickyScroll */ ?
            this.tree.getStickyScrollFocus() :
            this.tree.getFocus();
        return getContext(focusedItems, this.tree.getSelection(), respectMultiSelection, this.renderer);
    }
    isItemVisible(item) {
        // If filter is undefined it means the tree hasn't been rendered yet, so nothing is visible
        if (!this.filter) {
            return false;
        }
        return this.filter.filter(item, 1 /* TreeVisibility.Visible */);
    }
    isItemCollapsed(item) {
        return this.tree.isCollapsed(item);
    }
    async setEditable(stat, isEditing) {
        if (isEditing) {
            this.horizontalScrolling = this.tree.options.horizontalScrolling;
            if (this.horizontalScrolling) {
                this.tree.updateOptions({ horizontalScrolling: false });
            }
            await this.tree.expand(stat.parent);
        }
        else {
            if (this.horizontalScrolling !== undefined) {
                this.tree.updateOptions({ horizontalScrolling: this.horizontalScrolling });
            }
            this.horizontalScrolling = undefined;
            this.treeContainer.classList.remove('highlight');
        }
        await this.refresh(false, stat.parent, false);
        if (isEditing) {
            this.treeContainer.classList.add('highlight');
            this.tree.reveal(stat);
        }
        else {
            this.tree.domFocus();
        }
    }
    async selectActiveFile(reveal = this._autoReveal) {
        if (this._autoReveal) {
            const activeFile = EditorResourceAccessor.getCanonicalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (activeFile) {
                const focus = this.tree.getFocus();
                const selection = this.tree.getSelection();
                if (focus.length === 1 && this.uriIdentityService.extUri.isEqual(focus[0].resource, activeFile) && selection.length === 1 && this.uriIdentityService.extUri.isEqual(selection[0].resource, activeFile)) {
                    // No action needed, active file is already focused and selected
                    return;
                }
                return this.explorerService.select(activeFile, reveal);
            }
        }
    }
    createTree(container) {
        this.filter = this.instantiationService.createInstance(FilesFilter);
        this._register(this.filter);
        this._register(this.filter.onDidChange(() => this.refresh(true)));
        const explorerLabels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this._register(explorerLabels);
        this.findProvider = this.instantiationService.createInstance(ExplorerFindProvider, this.filter, () => this.tree);
        const updateWidth = (stat) => this.tree.updateWidth(stat);
        this.renderer = this.instantiationService.createInstance(FilesRenderer, container, explorerLabels, this.findProvider.highlightTree, updateWidth);
        this._register(this.renderer);
        this._register(createFileIconThemableTreeContainerScope(container, this.themeService));
        const isCompressionEnabled = () => this.configurationService.getValue('explorer.compactFolders');
        const getFileNestingSettings = (item) => this.configurationService.getValue({ resource: item?.root.resource }).explorer.fileNesting;
        this.tree = this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'FileExplorer', container, new ExplorerDelegate(), new ExplorerCompressionDelegate(), [this.renderer], this.instantiationService.createInstance(ExplorerDataSource, this.filter, this.findProvider), {
            compressionEnabled: isCompressionEnabled(),
            accessibilityProvider: this.renderer,
            identityProvider,
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (stat) => {
                    if (this.explorerService.isEditable(stat)) {
                        return undefined;
                    }
                    return stat.name;
                },
                getCompressedNodeKeyboardNavigationLabel: (stats) => {
                    if (stats.some(stat => this.explorerService.isEditable(stat))) {
                        return undefined;
                    }
                    return stats.map(stat => stat.name).join('/');
                }
            },
            multipleSelectionSupport: true,
            filter: this.filter,
            sorter: this.instantiationService.createInstance(FileSorter),
            dnd: this.instantiationService.createInstance(FileDragAndDrop, (item) => this.isItemCollapsed(item)),
            collapseByDefault: (e) => {
                if (e instanceof ExplorerItem) {
                    if (e.hasNests && getFileNestingSettings(e).expand) {
                        return false;
                    }
                    if (this.findProvider.isShowingFilterResults()) {
                        return false;
                    }
                }
                return true;
            },
            autoExpandSingleChildren: true,
            expandOnlyOnTwistieClick: (e) => {
                if (e instanceof ExplorerItem) {
                    if (e.hasNests) {
                        return true;
                    }
                    else if (this.configurationService.getValue('workbench.tree.expandMode') === 'doubleClick') {
                        return true;
                    }
                }
                return false;
            },
            paddingBottom: ExplorerDelegate.ITEM_HEIGHT,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            findProvider: this.findProvider,
        });
        this._register(this.tree);
        this._register(this.themeService.onDidColorThemeChange(() => this.tree.rerender()));
        // Bind configuration
        const onDidChangeCompressionConfiguration = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('explorer.compactFolders'));
        this._register(onDidChangeCompressionConfiguration(_ => this.tree.updateOptions({ compressionEnabled: isCompressionEnabled() })));
        // Bind context keys
        FilesExplorerFocusedContext.bindTo(this.tree.contextKeyService);
        ExplorerFocusedContext.bindTo(this.tree.contextKeyService);
        // Update resource context based on focused element
        this._register(this.tree.onDidChangeFocus(e => this.onFocusChanged(e.elements)));
        this.onFocusChanged([]);
        // Open when selecting via keyboard
        this._register(this.tree.onDidOpen(async (e) => {
            const element = e.element;
            if (!element) {
                return;
            }
            // Do not react if the user is expanding selection via keyboard.
            // Check if the item was previously also selected, if yes the user is simply expanding / collapsing current selection #66589.
            const shiftDown = DOM.isKeyboardEvent(e.browserEvent) && e.browserEvent.shiftKey;
            if (!shiftDown) {
                if (element.isDirectory || this.explorerService.isEditable(undefined)) {
                    // Do not react if user is clicking on explorer items while some are being edited #70276
                    // Do not react if clicking on directories
                    return;
                }
                this.telemetryService.publicLog2('workbenchActionExecuted', { id: 'workbench.files.openFile', from: 'explorer' });
                try {
                    this.delegate?.willOpenElement(e.browserEvent);
                    await this.editorService.openEditor({ resource: element.resource, options: { preserveFocus: e.editorOptions.preserveFocus, pinned: e.editorOptions.pinned, source: EditorOpenSource.USER } }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
                }
                finally {
                    this.delegate?.didOpenElement();
                }
            }
        }));
        this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));
        this._register(this.tree.onDidScroll(async (e) => {
            const editable = this.explorerService.getEditable();
            if (e.scrollTopChanged && editable && this.tree.getRelativeTop(editable.stat) === null) {
                await editable.data.onFinish('', false);
            }
        }));
        this._register(this.tree.onDidChangeCollapseState(e => {
            const element = e.node.element?.element;
            if (element) {
                const navigationControllers = this.renderer.getCompressedNavigationController(element instanceof Array ? element[0] : element);
                navigationControllers?.forEach(controller => controller.updateCollapsed(e.node.collapsed));
            }
            // Update showing expand / collapse button
            this.updateAnyCollapsedContext();
        }));
        this.updateAnyCollapsedContext();
        this._register(this.tree.onMouseDblClick(e => {
            // If empty space is clicked, and not scrolling by page enabled #173261
            const scrollingByPage = this.configurationService.getValue('workbench.list.scrollByPage');
            if (e.element === null && !scrollingByPage) {
                // click in empty area -> create a new file #116676
                this.commandService.executeCommand(NEW_FILE_COMMAND_ID);
            }
        }));
        // save view state
        this._register(this.storageService.onWillSaveState(() => {
            this.storeTreeViewState();
        }));
    }
    // React on events
    onConfigurationUpdated(event) {
        if (!event || event.affectsConfiguration('explorer.autoReveal')) {
            const configuration = this.configurationService.getValue();
            this._autoReveal = configuration?.explorer?.autoReveal;
        }
        // Push down config updates to components of viewer
        if (event && (event.affectsConfiguration('explorer.decorations.colors') || event.affectsConfiguration('explorer.decorations.badges'))) {
            this.refresh(true);
        }
    }
    storeTreeViewState() {
        this.storageService.store(ExplorerView_1.TREE_VIEW_STATE_STORAGE_KEY, JSON.stringify(this.tree.getViewState()), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    setContextKeys(stat) {
        const folders = this.contextService.getWorkspace().folders;
        const resource = stat ? stat.resource : folders[folders.length - 1].uri;
        stat = stat || this.explorerService.findClosest(resource);
        this.resourceContext.set(resource);
        this.folderContext.set(!!stat && stat.isDirectory);
        this.readonlyContext.set(!!stat && !!stat.isReadonly);
        this.parentReadonlyContext.set(Boolean(stat?.parent?.isReadonly));
        this.rootContext.set(!!stat && stat.isRoot);
        if (resource) {
            const overrides = resource ? this.editorResolverService.getEditors(resource).map(editor => editor.id) : [];
            this.availableEditorIdsContext.set(overrides.join(','));
        }
        else {
            this.availableEditorIdsContext.reset();
        }
    }
    async onContextMenu(e) {
        if (DOM.isEditableElement(e.browserEvent.target)) {
            return;
        }
        const stat = e.element;
        let anchor = e.anchor;
        // Adjust for compressed folders (except when mouse is used)
        if (DOM.isHTMLElement(anchor)) {
            if (stat) {
                const controllers = this.renderer.getCompressedNavigationController(stat);
                if (controllers && controllers.length > 0) {
                    if (DOM.isKeyboardEvent(e.browserEvent) || isCompressedFolderName(e.browserEvent.target)) {
                        anchor = controllers[0].labels[controllers[0].index];
                    }
                    else {
                        controllers.forEach(controller => controller.last());
                    }
                }
            }
        }
        // update dynamic contexts
        this.fileCopiedContextKey.set(await this.clipboardService.hasResources());
        this.setContextKeys(stat);
        const selection = this.tree.getSelection();
        const roots = this.explorerService.roots; // If the click is outside of the elements pass the root resource if there is only one root. If there are multiple roots pass empty object.
        let arg;
        if (stat instanceof ExplorerItem) {
            const compressedControllers = this.renderer.getCompressedNavigationController(stat);
            arg = compressedControllers && compressedControllers.length ? compressedControllers[0].current.resource : stat.resource;
        }
        else {
            arg = roots.length === 1 ? roots[0].resource : {};
        }
        this.contextMenuService.showContextMenu({
            menuId: MenuId.ExplorerContext,
            menuActionOptions: { arg, shouldForwardArgs: true },
            contextKeyService: this.tree.contextKeyService,
            getAnchor: () => anchor,
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.tree.domFocus();
                }
            },
            getActionsContext: () => stat && selection && selection.indexOf(stat) >= 0
                ? selection.map((fs) => fs.resource)
                : stat instanceof ExplorerItem ? [stat.resource] : []
        });
    }
    onFocusChanged(elements) {
        const stat = elements && elements.length ? elements[0] : undefined;
        this.setContextKeys(stat);
        if (stat) {
            const enableTrash = Boolean(this.configurationService.getValue().files?.enableTrash);
            const hasCapability = this.fileService.hasCapability(stat.resource, 4096 /* FileSystemProviderCapabilities.Trash */);
            this.resourceMoveableToTrash.set(enableTrash && hasCapability);
        }
        else {
            this.resourceMoveableToTrash.reset();
        }
        const compressedNavigationControllers = stat && this.renderer.getCompressedNavigationController(stat);
        if (!compressedNavigationControllers) {
            this.compressedFocusContext.set(false);
            return;
        }
        this.compressedFocusContext.set(true);
        compressedNavigationControllers.forEach(controller => {
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    // General methods
    /**
     * Refresh the contents of the explorer to get up to date data from the disk about the file structure.
     * If the item is passed we refresh only that level of the tree, otherwise we do a full refresh.
     */
    refresh(recursive, item, cancelEditing = true) {
        if (!this.tree || !this.isBodyVisible() || (item && !this.tree.hasNode(item)) || (this.findProvider?.isShowingFilterResults() && recursive)) {
            // Tree node doesn't exist yet, when it becomes visible we will refresh
            return Promise.resolve(undefined);
        }
        if (cancelEditing && this.explorerService.isEditable(undefined)) {
            this.tree.domFocus();
        }
        const toRefresh = item || this.tree.getInput();
        return this.tree.updateChildren(toRefresh, recursive, !!item);
    }
    getOptimalWidth() {
        const parentNode = this.tree.getHTMLElement();
        const childNodes = [].slice.call(parentNode.querySelectorAll('.explorer-item .label-name')); // select all file labels
        return DOM.getLargestChildWidth(parentNode, childNodes);
    }
    async setTreeInput() {
        if (!this.isBodyVisible()) {
            return Promise.resolve(undefined);
        }
        // Wait for the last execution to complete before executing
        if (this.setTreeInputPromise) {
            await this.setTreeInputPromise;
        }
        const initialInputSetup = !this.tree.getInput();
        if (initialInputSetup) {
            perf.mark('code/willResolveExplorer');
        }
        const roots = this.explorerService.roots;
        let input = roots[0];
        if (this.contextService.getWorkbenchState() !== 2 /* WorkbenchState.FOLDER */ || roots[0].error) {
            // Display roots only when multi folder workspace
            input = roots;
        }
        let viewState;
        if (this.tree && this.tree.getInput()) {
            viewState = this.tree.getViewState();
        }
        else {
            const rawViewState = this.storageService.get(ExplorerView_1.TREE_VIEW_STATE_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
            if (rawViewState) {
                viewState = JSON.parse(rawViewState);
            }
        }
        const previousInput = this.tree.getInput();
        const promise = this.setTreeInputPromise = this.tree.setInput(input, viewState).then(async () => {
            if (Array.isArray(input)) {
                if (!viewState || previousInput instanceof ExplorerItem) {
                    // There is no view state for this workspace (we transitioned from a folder workspace?), expand up to five roots.
                    // If there are many roots in a workspace, expanding them all would can cause performance issues #176226
                    for (let i = 0; i < Math.min(input.length, 5); i++) {
                        try {
                            await this.tree.expand(input[i]);
                        }
                        catch (e) { }
                    }
                }
                // Reloaded or transitioned from an empty workspace, but only have a single folder in the workspace.
                if (!previousInput && input.length === 1 && this.configurationService.getValue().explorer.expandSingleFolderWorkspaces) {
                    await this.tree.expand(input[0]).catch(() => { });
                }
                if (Array.isArray(previousInput)) {
                    const previousRoots = new ResourceMap();
                    previousInput.forEach(previousRoot => previousRoots.set(previousRoot.resource, true));
                    // Roots added to the explorer -> expand them.
                    await Promise.all(input.map(async (item) => {
                        if (!previousRoots.has(item.resource)) {
                            try {
                                await this.tree.expand(item);
                            }
                            catch (e) { }
                        }
                    }));
                }
            }
            if (initialInputSetup) {
                perf.mark('code/didResolveExplorer');
            }
        });
        this.progressService.withProgress({
            location: 1 /* ProgressLocation.Explorer */,
            delay: this.layoutService.isRestored() ? 800 : 1500 // reduce progress visibility when still restoring
        }, _progress => promise);
        await promise;
        if (!this.decorationsProvider) {
            this.decorationsProvider = new ExplorerDecorationsProvider(this.explorerService, this.contextService);
            this._register(this.decorationService.registerDecorationsProvider(this.decorationsProvider));
        }
    }
    async selectResource(resource, reveal = this._autoReveal, retry = 0) {
        // do no retry more than once to prevent infinite loops in cases of inconsistent model
        if (retry === 2) {
            return;
        }
        if (!resource || !this.isBodyVisible()) {
            return;
        }
        // If something is refreshing the explorer, we must await it or else a selection race condition can occur
        if (this.setTreeInputPromise) {
            await this.setTreeInputPromise;
        }
        // Expand all stats in the parent chain.
        let item = this.explorerService.findClosestRoot(resource);
        while (item && item.resource.toString() !== resource.toString()) {
            try {
                await this.tree.expand(item);
            }
            catch (e) {
                return this.selectResource(resource, reveal, retry + 1);
            }
            if (!item.children.size) {
                item = null;
            }
            else {
                for (const child of item.children.values()) {
                    if (this.uriIdentityService.extUri.isEqualOrParent(resource, child.resource)) {
                        item = child;
                        break;
                    }
                    item = null;
                }
            }
        }
        if (item) {
            if (item === this.tree.getInput()) {
                this.tree.setFocus([]);
                this.tree.setSelection([]);
                return;
            }
            try {
                // We must expand the nest to have it be populated in the tree
                if (item.nestedParent) {
                    await this.tree.expand(item.nestedParent);
                }
                if ((reveal === true || reveal === 'force') && this.tree.getRelativeTop(item) === null) {
                    // Don't scroll to the item if it's already visible, or if set not to.
                    this.tree.reveal(item, 0.5);
                }
                this.tree.setFocus([item]);
                this.tree.setSelection([item]);
            }
            catch (e) {
                // Element might not be in the tree, try again and silently fail
                return this.selectResource(resource, reveal, retry + 1);
            }
        }
    }
    itemsCopied(stats, cut, previousCut) {
        this.fileCopiedContextKey.set(stats.length > 0);
        this.resourceCutContextKey.set(cut && stats.length > 0);
        previousCut?.forEach(item => this.tree.rerender(item));
        if (cut) {
            stats.forEach(s => this.tree.rerender(s));
        }
    }
    expandAll() {
        if (this.explorerService.isEditable(undefined)) {
            this.tree.domFocus();
        }
        this.tree.expandAll();
    }
    collapseAll() {
        if (this.explorerService.isEditable(undefined)) {
            this.tree.domFocus();
        }
        const treeInput = this.tree.getInput();
        if (Array.isArray(treeInput)) {
            if (hasExpandedRootChild(this.tree, treeInput)) {
                treeInput.forEach(folder => {
                    folder.children.forEach(child => this.tree.hasNode(child) && this.tree.collapse(child, true));
                });
                return;
            }
        }
        this.tree.collapseAll();
    }
    previousCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach(controller => {
            controller.previous();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    nextCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach(controller => {
            controller.next();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    firstCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach(controller => {
            controller.first();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    lastCompressedStat() {
        const focused = this.tree.getFocus();
        if (!focused.length) {
            return;
        }
        const compressedNavigationControllers = this.renderer.getCompressedNavigationController(focused[0]);
        compressedNavigationControllers.forEach(controller => {
            controller.last();
            this.updateCompressedNavigationContextKeys(controller);
        });
    }
    updateCompressedNavigationContextKeys(controller) {
        this.compressedFocusFirstContext.set(controller.index === 0);
        this.compressedFocusLastContext.set(controller.index === controller.count - 1);
    }
    updateAnyCollapsedContext() {
        const treeInput = this.tree.getInput();
        if (treeInput === undefined) {
            return;
        }
        const treeInputArray = Array.isArray(treeInput) ? treeInput : Array.from(treeInput.children.values());
        // Has collapsible root when anything is expanded
        this.viewHasSomeCollapsibleRootItem.set(hasExpandedNode(this.tree, treeInputArray));
        // synchronize state to cache
        this.storeTreeViewState();
    }
    hasPhantomElements() {
        return !!this.findProvider?.isShowingFilterResults();
    }
    dispose() {
        this.dragHandler?.dispose();
        super.dispose();
    }
};
__decorate([
    memoize
], ExplorerView.prototype, "fileCopiedContextKey", null);
__decorate([
    memoize
], ExplorerView.prototype, "resourceCutContextKey", null);
ExplorerView = ExplorerView_1 = __decorate([
    __param(1, IContextMenuService),
    __param(2, IViewDescriptorService),
    __param(3, IInstantiationService),
    __param(4, IWorkspaceContextService),
    __param(5, IProgressService),
    __param(6, IEditorService),
    __param(7, IEditorResolverService),
    __param(8, IWorkbenchLayoutService),
    __param(9, IKeybindingService),
    __param(10, IContextKeyService),
    __param(11, IConfigurationService),
    __param(12, IDecorationsService),
    __param(13, ILabelService),
    __param(14, IThemeService),
    __param(15, ITelemetryService),
    __param(16, IHoverService),
    __param(17, IExplorerService),
    __param(18, IStorageService),
    __param(19, IClipboardService),
    __param(20, IFileService),
    __param(21, IUriIdentityService),
    __param(22, ICommandService),
    __param(23, IOpenerService)
], ExplorerView);
export { ExplorerView };
export function createFileIconThemableTreeContainerScope(container, themeService) {
    container.classList.add('file-icon-themable-tree');
    container.classList.add('show-file-icons');
    const onDidChangeFileIconTheme = (theme) => {
        container.classList.toggle('align-icons-and-twisties', theme.hasFileIcons && !theme.hasFolderIcons);
        container.classList.toggle('hide-arrows', theme.hidesExplorerArrows === true);
    };
    onDidChangeFileIconTheme(themeService.getFileIconTheme());
    return themeService.onDidFileIconThemeChange(onDidChangeFileIconTheme);
}
const CanCreateContext = ContextKeyExpr.or(
// Folder: can create unless readonly
ContextKeyExpr.and(ExplorerFolderContext, ExplorerResourceWritableContext), 
// File: can create unless parent is readonly
ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ExplorerResourceParentReadOnlyContext.toNegated()));
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.createFileFromExplorer',
            title: nls.localize('createNewFile', "New File..."),
            f1: false,
            icon: Codicon.newFile,
            precondition: CanCreateContext,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 10
            }
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand(NEW_FILE_COMMAND_ID);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.createFolderFromExplorer',
            title: nls.localize('createNewFolder', "New Folder..."),
            f1: false,
            icon: Codicon.newFolder,
            precondition: CanCreateContext,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 20
            }
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        commandService.executeCommand(NEW_FOLDER_COMMAND_ID);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.refreshFilesExplorer',
            title: nls.localize2('refreshExplorer', "Refresh Explorer"),
            f1: true,
            icon: Codicon.refresh,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 30,
            },
            metadata: {
                description: nls.localize2('refreshExplorerMetadata', "Forces a refresh of the Explorer.")
            },
            precondition: ExplorerFindProviderActive.negate()
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const explorerService = accessor.get(IExplorerService);
        await viewsService.openView(VIEW_ID);
        await explorerService.refresh();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.files.action.collapseExplorerFolders',
            title: nls.localize2('collapseExplorerFolders', "Collapse Folders in Explorer"),
            f1: true,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VIEW_ID),
                order: 40
            },
            metadata: {
                description: nls.localize2('collapseExplorerFoldersMetadata', "Folds all folders in the Explorer.")
            }
        });
    }
    run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = viewsService.getViewWithId(VIEW_ID);
        if (view !== null) {
            const explorerView = view;
            explorerView.collapseAll();
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwbG9yZXJWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvdmlld3MvZXhwbG9yZXJWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBRTdDLE9BQU8sS0FBSyxJQUFJLE1BQU0sMkNBQTJDLENBQUM7QUFFbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBdUIscUJBQXFCLEVBQUUsMkJBQTJCLEVBQUUsc0JBQXNCLEVBQUUsbUJBQW1CLEVBQUUsK0JBQStCLEVBQUUsbUJBQW1CLEVBQUUsK0JBQStCLEVBQUUsOEJBQThCLEVBQUUsbUNBQW1DLEVBQUUsa0NBQWtDLEVBQUUseUNBQXlDLEVBQUUsT0FBTyxFQUFFLCtCQUErQixFQUFFLHFDQUFxQyxFQUFFLHlCQUF5QixFQUFFLHFDQUFxQyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdmpCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2xHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0YsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFrQixNQUFNLHVEQUF1RCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxxQkFBcUIsRUFBNkIsTUFBTSwrREFBK0QsQ0FBQztBQUNqSSxPQUFPLEVBQUUsa0JB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