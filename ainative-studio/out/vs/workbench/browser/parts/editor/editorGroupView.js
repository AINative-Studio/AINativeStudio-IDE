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
var EditorGroupView_1;
import './media/editorgroupview.css';
import { EditorGroupModel, isGroupEditorCloseEvent, isGroupEditorOpenEvent, isSerializedEditorGroupModel } from '../../../common/editor/editorGroupModel.js';
import { EditorResourceAccessor, DEFAULT_EDITOR_ASSOCIATION, SideBySideEditor, EditorCloseContext, TEXT_DIFF_EDITOR_ID } from '../../../common/editor.js';
import { ActiveEditorGroupLockedContext, ActiveEditorDirtyContext, EditorGroupEditorsCountContext, ActiveEditorStickyContext, ActiveEditorPinnedContext, ActiveEditorLastInGroupContext, ActiveEditorFirstInGroupContext, ResourceContextKey, applyAvailableEditorIds, ActiveEditorAvailableEditorIdsContext, ActiveEditorCanSplitInGroupContext, SideBySideEditorActiveContext, TextCompareEditorVisibleContext, TextCompareEditorActiveContext, ActiveEditorContext, ActiveEditorReadonlyContext, ActiveEditorCanRevertContext, ActiveEditorCanToggleReadonlyContext, ActiveCompareEditorCanSwapContext, MultipleEditorsSelectedInGroupContext, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey } from '../../../common/contextkeys.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { Emitter, Relay } from '../../../../base/common/event.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Dimension, trackFocus, addDisposableListener, EventType, EventHelper, findParentWithClass, isAncestor, isMouseEvent, isActiveElement, getWindow, getActiveElement, $ } from '../../../../base/browser/dom.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { editorBackground, contrastBorder } from '../../../../platform/theme/common/colorRegistry.js';
import { EDITOR_GROUP_HEADER_TABS_BACKGROUND, EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND, EDITOR_GROUP_EMPTY_BACKGROUND, EDITOR_GROUP_HEADER_BORDER } from '../../../common/theme.js';
import { EditorPanes } from './editorPanes.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
import { EditorProgressIndicator } from '../../../services/progress/browser/progressIndicator.js';
import { localize } from '../../../../nls.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DeferredPromise, Promises, RunOnceWorker } from '../../../../base/common/async.js';
import { EventType as TouchEventType } from '../../../../base/browser/touch.js';
import { fillActiveEditorViewState } from './editor.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { hash } from '../../../../base/common/hash.js';
import { getMimeTypes } from '../../../../editor/common/services/languagesAssociations.js';
import { extname, isEqual } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IFileDialogService, IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { URI } from '../../../../base/common/uri.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { isLinux, isMacintosh, isNative, isWindows } from '../../../../base/common/platform.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { TelemetryTrustedValue } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { EditorGroupWatermark } from './editorGroupWatermark.js';
import { EditorTitleControl } from './editorTitleControl.js';
import { EditorPane } from './editorPane.js';
import { IEditorResolverService } from '../../../services/editor/common/editorResolverService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IFileService } from '../../../../platform/files/common/files.js';
let EditorGroupView = EditorGroupView_1 = class EditorGroupView extends Themable {
    //#region factory
    static createNew(editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, null, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    static createFromSerialized(serialized, editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, serialized, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    static createCopy(copyFrom, editorPartsView, groupsView, groupsLabel, groupIndex, instantiationService, options) {
        return instantiationService.createInstance(EditorGroupView_1, copyFrom, editorPartsView, groupsView, groupsLabel, groupIndex, options);
    }
    constructor(from, editorPartsView, groupsView, groupsLabel, _index, options, instantiationService, contextKeyService, themeService, telemetryService, keybindingService, menuService, contextMenuService, fileDialogService, editorService, filesConfigurationService, uriIdentityService, logService, editorResolverService, hostService, dialogService, fileService) {
        super(themeService);
        this.editorPartsView = editorPartsView;
        this.groupsView = groupsView;
        this.groupsLabel = groupsLabel;
        this._index = _index;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.telemetryService = telemetryService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextMenuService = contextMenuService;
        this.fileDialogService = fileDialogService;
        this.editorService = editorService;
        this.filesConfigurationService = filesConfigurationService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.editorResolverService = editorResolverService;
        this.hostService = hostService;
        this.dialogService = dialogService;
        this.fileService = fileService;
        //#region events
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onWillDispose = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this._onDidModelChange = this._register(new Emitter());
        this.onDidModelChange = this._onDidModelChange.event;
        this._onDidActiveEditorChange = this._register(new Emitter());
        this.onDidActiveEditorChange = this._onDidActiveEditorChange.event;
        this._onDidOpenEditorFail = this._register(new Emitter());
        this.onDidOpenEditorFail = this._onDidOpenEditorFail.event;
        this._onWillCloseEditor = this._register(new Emitter());
        this.onWillCloseEditor = this._onWillCloseEditor.event;
        this._onDidCloseEditor = this._register(new Emitter());
        this.onDidCloseEditor = this._onDidCloseEditor.event;
        this._onWillMoveEditor = this._register(new Emitter());
        this.onWillMoveEditor = this._onWillMoveEditor.event;
        this._onWillOpenEditor = this._register(new Emitter());
        this.onWillOpenEditor = this._onWillOpenEditor.event;
        this.disposedEditorsWorker = this._register(new RunOnceWorker(editors => this.handleDisposedEditors(editors), 0));
        this.mapEditorToPendingConfirmation = new Map();
        this.containerToolBarMenuDisposable = this._register(new MutableDisposable());
        this.whenRestoredPromise = new DeferredPromise();
        this.whenRestored = this.whenRestoredPromise.p;
        this._disposed = false;
        //#endregion
        //#region ISerializableView
        this.element = $('div');
        this._onDidChange = this._register(new Relay());
        this.onDidChange = this._onDidChange.event;
        if (from instanceof EditorGroupView_1) {
            this.model = this._register(from.model.clone());
        }
        else if (isSerializedEditorGroupModel(from)) {
            this.model = this._register(instantiationService.createInstance(EditorGroupModel, from));
        }
        else {
            this.model = this._register(instantiationService.createInstance(EditorGroupModel, undefined));
        }
        //#region create()
        {
            // Scoped context key service
            this.scopedContextKeyService = this._register(this.contextKeyService.createScoped(this.element));
            // Container
            this.element.classList.add(...coalesce(['editor-group-container', this.model.isLocked ? 'locked' : undefined]));
            // Container listeners
            this.registerContainerListeners();
            // Container toolbar
            this.createContainerToolbar();
            // Container context menu
            this.createContainerContextMenu();
            // Watermark & shortcuts
            this._register(this.instantiationService.createInstance(EditorGroupWatermark, this.element));
            // Progress bar
            this.progressBar = this._register(new ProgressBar(this.element, defaultProgressBarStyles));
            this.progressBar.hide();
            // Scoped instantiation service
            this.scopedInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService], [IEditorProgressService, this._register(new EditorProgressIndicator(this.progressBar, this))])));
            // Context keys
            this.resourceContext = this._register(this.scopedInstantiationService.createInstance(ResourceContextKey));
            this.handleGroupContextKeys();
            // Title container
            this.titleContainer = $('.title');
            this.element.appendChild(this.titleContainer);
            // Title control
            this.titleControl = this._register(this.scopedInstantiationService.createInstance(EditorTitleControl, this.titleContainer, this.editorPartsView, this.groupsView, this, this.model));
            // Editor container
            this.editorContainer = $('.editor-container');
            this.element.appendChild(this.editorContainer);
            // Editor pane
            this.editorPane = this._register(this.scopedInstantiationService.createInstance(EditorPanes, this.element, this.editorContainer, this));
            this._onDidChange.input = this.editorPane.onDidChangeSizeConstraints;
            // Track Focus
            this.doTrackFocus();
            // Update containers
            this.updateTitleContainer();
            this.updateContainer();
            // Update styles
            this.updateStyles();
        }
        //#endregion
        // Restore editors if provided
        const restoreEditorsPromise = this.restoreEditors(from, options) ?? Promise.resolve();
        // Signal restored once editors have restored
        restoreEditorsPromise.finally(() => {
            this.whenRestoredPromise.complete();
        });
        // Register Listeners
        this.registerListeners();
    }
    handleGroupContextKeys() {
        const groupActiveEditorDirtyContext = this.editorPartsView.bind(ActiveEditorDirtyContext, this);
        const groupActiveEditorPinnedContext = this.editorPartsView.bind(ActiveEditorPinnedContext, this);
        const groupActiveEditorFirstContext = this.editorPartsView.bind(ActiveEditorFirstInGroupContext, this);
        const groupActiveEditorLastContext = this.editorPartsView.bind(ActiveEditorLastInGroupContext, this);
        const groupActiveEditorStickyContext = this.editorPartsView.bind(ActiveEditorStickyContext, this);
        const groupEditorsCountContext = this.editorPartsView.bind(EditorGroupEditorsCountContext, this);
        const groupLockedContext = this.editorPartsView.bind(ActiveEditorGroupLockedContext, this);
        const multipleEditorsSelectedContext = MultipleEditorsSelectedInGroupContext.bindTo(this.scopedContextKeyService);
        const twoEditorsSelectedContext = TwoEditorsSelectedInGroupContext.bindTo(this.scopedContextKeyService);
        const selectedEditorsHaveFileOrUntitledResourceContext = SelectedEditorsInGroupFileOrUntitledResourceContextKey.bindTo(this.scopedContextKeyService);
        const groupActiveEditorContext = this.editorPartsView.bind(ActiveEditorContext, this);
        const groupActiveEditorIsReadonly = this.editorPartsView.bind(ActiveEditorReadonlyContext, this);
        const groupActiveEditorCanRevert = this.editorPartsView.bind(ActiveEditorCanRevertContext, this);
        const groupActiveEditorCanToggleReadonly = this.editorPartsView.bind(ActiveEditorCanToggleReadonlyContext, this);
        const groupActiveCompareEditorCanSwap = this.editorPartsView.bind(ActiveCompareEditorCanSwapContext, this);
        const groupTextCompareEditorVisibleContext = this.editorPartsView.bind(TextCompareEditorVisibleContext, this);
        const groupTextCompareEditorActiveContext = this.editorPartsView.bind(TextCompareEditorActiveContext, this);
        const groupActiveEditorAvailableEditorIds = this.editorPartsView.bind(ActiveEditorAvailableEditorIdsContext, this);
        const groupActiveEditorCanSplitInGroupContext = this.editorPartsView.bind(ActiveEditorCanSplitInGroupContext, this);
        const groupActiveEditorIsSideBySideEditorContext = this.editorPartsView.bind(SideBySideEditorActiveContext, this);
        const activeEditorListener = this._register(new MutableDisposable());
        const observeActiveEditor = () => {
            activeEditorListener.clear();
            this.scopedContextKeyService.bufferChangeEvents(() => {
                const activeEditor = this.activeEditor;
                const activeEditorPane = this.activeEditorPane;
                this.resourceContext.set(EditorResourceAccessor.getOriginalUri(activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY }));
                applyAvailableEditorIds(groupActiveEditorAvailableEditorIds, activeEditor, this.editorResolverService);
                if (activeEditor) {
                    groupActiveEditorCanSplitInGroupContext.set(activeEditor.hasCapability(32 /* EditorInputCapabilities.CanSplitInGroup */));
                    groupActiveEditorIsSideBySideEditorContext.set(activeEditor.typeId === SideBySideEditorInput.ID);
                    groupActiveEditorDirtyContext.set(activeEditor.isDirty() && !activeEditor.isSaving());
                    activeEditorListener.value = activeEditor.onDidChangeDirty(() => {
                        groupActiveEditorDirtyContext.set(activeEditor.isDirty() && !activeEditor.isSaving());
                    });
                }
                else {
                    groupActiveEditorCanSplitInGroupContext.set(false);
                    groupActiveEditorIsSideBySideEditorContext.set(false);
                    groupActiveEditorDirtyContext.set(false);
                }
                if (activeEditorPane) {
                    groupActiveEditorContext.set(activeEditorPane.getId());
                    groupActiveEditorCanRevert.set(!activeEditorPane.input.hasCapability(4 /* EditorInputCapabilities.Untitled */));
                    groupActiveEditorIsReadonly.set(!!activeEditorPane.input.isReadonly());
                    const primaryEditorResource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.PRIMARY });
                    const secondaryEditorResource = EditorResourceAccessor.getOriginalUri(activeEditorPane.input, { supportSideBySide: SideBySideEditor.SECONDARY });
                    groupActiveCompareEditorCanSwap.set(activeEditorPane.input instanceof DiffEditorInput && !activeEditorPane.input.original.isReadonly() && !!primaryEditorResource && (this.fileService.hasProvider(primaryEditorResource) || primaryEditorResource.scheme === Schemas.untitled) && !!secondaryEditorResource && (this.fileService.hasProvider(secondaryEditorResource) || secondaryEditorResource.scheme === Schemas.untitled));
                    groupActiveEditorCanToggleReadonly.set(!!primaryEditorResource && this.fileService.hasProvider(primaryEditorResource) && !this.fileService.hasCapability(primaryEditorResource, 2048 /* FileSystemProviderCapabilities.Readonly */));
                    const activePaneDiffEditor = activeEditorPane?.getId() === TEXT_DIFF_EDITOR_ID;
                    groupTextCompareEditorActiveContext.set(activePaneDiffEditor);
                    groupTextCompareEditorVisibleContext.set(activePaneDiffEditor);
                }
                else {
                    groupActiveEditorContext.reset();
                    groupActiveEditorCanRevert.reset();
                    groupActiveEditorIsReadonly.reset();
                    groupActiveCompareEditorCanSwap.reset();
                    groupActiveEditorCanToggleReadonly.reset();
                }
            });
        };
        // Update group contexts based on group changes
        const updateGroupContextKeys = (e) => {
            switch (e.kind) {
                case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                    groupLockedContext.set(this.isLocked);
                    break;
                case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                    groupActiveEditorFirstContext.set(this.model.isFirst(this.model.activeEditor));
                    groupActiveEditorLastContext.set(this.model.isLast(this.model.activeEditor));
                    groupActiveEditorPinnedContext.set(this.model.activeEditor ? this.model.isPinned(this.model.activeEditor) : false);
                    groupActiveEditorStickyContext.set(this.model.activeEditor ? this.model.isSticky(this.model.activeEditor) : false);
                    break;
                case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                    groupActiveEditorPinnedContext.set(this.model.activeEditor ? this.model.isPinned(this.model.activeEditor) : false);
                    groupActiveEditorStickyContext.set(this.model.activeEditor ? this.model.isSticky(this.model.activeEditor) : false);
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    groupActiveEditorFirstContext.set(this.model.isFirst(this.model.activeEditor));
                    groupActiveEditorLastContext.set(this.model.isLast(this.model.activeEditor));
                    break;
                case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                    if (e.editor && e.editor === this.model.activeEditor) {
                        groupActiveEditorPinnedContext.set(this.model.isPinned(this.model.activeEditor));
                    }
                    break;
                case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                    if (e.editor && e.editor === this.model.activeEditor) {
                        groupActiveEditorStickyContext.set(this.model.isSticky(this.model.activeEditor));
                    }
                    break;
                case 4 /* GroupModelChangeKind.EDITORS_SELECTION */:
                    multipleEditorsSelectedContext.set(this.model.selectedEditors.length > 1);
                    twoEditorsSelectedContext.set(this.model.selectedEditors.length === 2);
                    selectedEditorsHaveFileOrUntitledResourceContext.set(this.model.selectedEditors.every(e => e.resource && (this.fileService.hasProvider(e.resource) || e.resource.scheme === Schemas.untitled)));
                    break;
            }
            // Group editors count context
            groupEditorsCountContext.set(this.count);
        };
        this._register(this.onDidModelChange(e => updateGroupContextKeys(e)));
        // Track the active editor and update context key that reflects
        // the dirty state of this editor
        this._register(this.onDidActiveEditorChange(() => observeActiveEditor()));
        // Update context keys on startup
        observeActiveEditor();
        updateGroupContextKeys({ kind: 8 /* GroupModelChangeKind.EDITOR_ACTIVE */ });
        updateGroupContextKeys({ kind: 3 /* GroupModelChangeKind.GROUP_LOCKED */ });
    }
    registerContainerListeners() {
        // Open new file via doubleclick on empty container
        this._register(addDisposableListener(this.element, EventType.DBLCLICK, e => {
            if (this.isEmpty) {
                EventHelper.stop(e);
                this.editorService.openEditor({
                    resource: undefined,
                    options: {
                        pinned: true,
                        override: DEFAULT_EDITOR_ASSOCIATION.id
                    }
                }, this.id);
            }
        }));
        // Close empty editor group via middle mouse click
        this._register(addDisposableListener(this.element, EventType.AUXCLICK, e => {
            if (this.isEmpty && e.button === 1 /* Middle Button */) {
                EventHelper.stop(e, true);
                this.groupsView.removeGroup(this);
            }
        }));
    }
    createContainerToolbar() {
        // Toolbar Container
        const toolbarContainer = $('.editor-group-container-toolbar');
        this.element.appendChild(toolbarContainer);
        // Toolbar
        const containerToolbar = this._register(new ActionBar(toolbarContainer, {
            ariaLabel: localize('ariaLabelGroupActions', "Empty editor group actions"),
            highlightToggledItems: true
        }));
        // Toolbar actions
        const containerToolbarMenu = this._register(this.menuService.createMenu(MenuId.EmptyEditorGroup, this.scopedContextKeyService));
        const updateContainerToolbar = () => {
            // Clear old actions
            this.containerToolBarMenuDisposable.value = toDisposable(() => containerToolbar.clear());
            // Create new actions
            const actions = getActionBarActions(containerToolbarMenu.getActions({ arg: { groupId: this.id }, shouldForwardArgs: true }), 'navigation');
            for (const action of [...actions.primary, ...actions.secondary]) {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                containerToolbar.push(action, { icon: true, label: false, keybinding: keybinding?.getLabel() });
            }
        };
        updateContainerToolbar();
        this._register(containerToolbarMenu.onDidChange(updateContainerToolbar));
    }
    createContainerContextMenu() {
        this._register(addDisposableListener(this.element, EventType.CONTEXT_MENU, e => this.onShowContainerContextMenu(e)));
        this._register(addDisposableListener(this.element, TouchEventType.Contextmenu, () => this.onShowContainerContextMenu()));
    }
    onShowContainerContextMenu(e) {
        if (!this.isEmpty) {
            return; // only for empty editor groups
        }
        // Find target anchor
        let anchor = this.element;
        if (e) {
            anchor = new StandardMouseEvent(getWindow(this.element), e);
        }
        // Show it
        this.contextMenuService.showContextMenu({
            menuId: MenuId.EmptyEditorGroupContext,
            contextKeyService: this.contextKeyService,
            getAnchor: () => anchor,
            onHide: () => this.focus()
        });
    }
    doTrackFocus() {
        // Container
        const containerFocusTracker = this._register(trackFocus(this.element));
        this._register(containerFocusTracker.onDidFocus(() => {
            if (this.isEmpty) {
                this._onDidFocus.fire(); // only when empty to prevent duplicate events from `editorPane.onDidFocus`
            }
        }));
        // Title Container
        const handleTitleClickOrTouch = (e) => {
            let target;
            if (isMouseEvent(e)) {
                if (e.button !== 0 /* middle/right mouse button */ || (isMacintosh && e.ctrlKey /* macOS context menu */)) {
                    return undefined;
                }
                target = e.target;
            }
            else {
                target = e.initialTarget;
            }
            if (findParentWithClass(target, 'monaco-action-bar', this.titleContainer) ||
                findParentWithClass(target, 'monaco-breadcrumb-item', this.titleContainer)) {
                return; // not when clicking on actions or breadcrumbs
            }
            // timeout to keep focus in editor after mouse up
            setTimeout(() => {
                this.focus();
            });
        };
        this._register(addDisposableListener(this.titleContainer, EventType.MOUSE_DOWN, e => handleTitleClickOrTouch(e)));
        this._register(addDisposableListener(this.titleContainer, TouchEventType.Tap, e => handleTitleClickOrTouch(e)));
        // Editor pane
        this._register(this.editorPane.onDidFocus(() => {
            this._onDidFocus.fire();
        }));
    }
    updateContainer() {
        // Empty Container: add some empty container attributes
        if (this.isEmpty) {
            this.element.classList.add('empty');
            this.element.tabIndex = 0;
            this.element.setAttribute('aria-label', localize('emptyEditorGroup', "{0} (empty)", this.ariaLabel));
        }
        // Non-Empty Container: revert empty container attributes
        else {
            this.element.classList.remove('empty');
            this.element.removeAttribute('tabIndex');
            this.element.removeAttribute('aria-label');
        }
        // Update styles
        this.updateStyles();
    }
    updateTitleContainer() {
        this.titleContainer.classList.toggle('tabs', this.groupsView.partOptions.showTabs === 'multiple');
        this.titleContainer.classList.toggle('show-file-icons', this.groupsView.partOptions.showIcons);
    }
    restoreEditors(from, groupViewOptions) {
        if (this.count === 0) {
            return; // nothing to show
        }
        // Determine editor options
        let options;
        if (from instanceof EditorGroupView_1) {
            options = fillActiveEditorViewState(from); // if we copy from another group, ensure to copy its active editor viewstate
        }
        else {
            options = Object.create(null);
        }
        const activeEditor = this.model.activeEditor;
        if (!activeEditor) {
            return;
        }
        options.pinned = this.model.isPinned(activeEditor); // preserve pinned state
        options.sticky = this.model.isSticky(activeEditor); // preserve sticky state
        options.preserveFocus = true; // handle focus after editor is restored
        const internalOptions = {
            preserveWindowOrder: true, // handle window order after editor is restored
            skipTitleUpdate: true, // update the title later for all editors at once
        };
        const activeElement = getActiveElement();
        // Show active editor (intentionally not using async to keep
        // `restoreEditors` from executing in same stack)
        const result = this.doShowEditor(activeEditor, { active: true, isNew: false /* restored */ }, options, internalOptions).then(() => {
            // Set focused now if this is the active group and focus has
            // not changed meanwhile. This prevents focus from being
            // stolen accidentally on startup when the user already
            // clicked somewhere.
            if (this.groupsView.activeGroup === this && activeElement && isActiveElement(activeElement) && !groupViewOptions?.preserveFocus) {
                this.focus();
            }
        });
        // Restore editors in title control
        this.titleControl.openEditors(this.editors);
        return result;
    }
    //#region event handling
    registerListeners() {
        // Model Events
        this._register(this.model.onDidModelChange(e => this.onDidGroupModelChange(e)));
        // Option Changes
        this._register(this.groupsView.onDidChangeEditorPartOptions(e => this.onDidChangeEditorPartOptions(e)));
        // Visibility
        this._register(this.groupsView.onDidVisibilityChange(e => this.onDidVisibilityChange(e)));
        // Focus
        this._register(this.onDidFocus(() => this.onDidGainFocus()));
    }
    onDidGroupModelChange(e) {
        // Re-emit to outside
        this._onDidModelChange.fire(e);
        // Handle within
        switch (e.kind) {
            case 3 /* GroupModelChangeKind.GROUP_LOCKED */:
                this.element.classList.toggle('locked', this.isLocked);
                break;
            case 4 /* GroupModelChangeKind.EDITORS_SELECTION */:
                this.onDidChangeEditorSelection();
                break;
        }
        if (!e.editor) {
            return;
        }
        switch (e.kind) {
            case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                if (isGroupEditorOpenEvent(e)) {
                    this.onDidOpenEditor(e.editor, e.editorIndex);
                }
                break;
            case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                if (isGroupEditorCloseEvent(e)) {
                    this.handleOnDidCloseEditor(e.editor, e.editorIndex, e.context, e.sticky);
                }
                break;
            case 15 /* GroupModelChangeKind.EDITOR_WILL_DISPOSE */:
                this.onWillDisposeEditor(e.editor);
                break;
            case 14 /* GroupModelChangeKind.EDITOR_DIRTY */:
                this.onDidChangeEditorDirty(e.editor);
                break;
            case 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */:
                this.onDidChangeEditorTransient(e.editor);
                break;
            case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                this.onDidChangeEditorLabel(e.editor);
                break;
        }
    }
    onDidOpenEditor(editor, editorIndex) {
        /* __GDPR__
            "editorOpened" : {
                "owner": "isidorn",
                "${include}": [
                    "${EditorTelemetryDescriptor}"
                ]
            }
        */
        this.telemetryService.publicLog('editorOpened', this.toEditorTelemetryDescriptor(editor));
        // Update container
        this.updateContainer();
    }
    handleOnDidCloseEditor(editor, editorIndex, context, sticky) {
        // Before close
        this._onWillCloseEditor.fire({ groupId: this.id, editor, context, index: editorIndex, sticky });
        // Handle event
        const editorsToClose = [editor];
        // Include both sides of side by side editors when being closed
        if (editor instanceof SideBySideEditorInput) {
            editorsToClose.push(editor.primary, editor.secondary);
        }
        // For each editor to close, we call dispose() to free up any resources.
        // However, certain editors might be shared across multiple editor groups
        // (including being visible in side by side / diff editors) and as such we
        // only dispose when they are not opened elsewhere.
        for (const editor of editorsToClose) {
            if (this.canDispose(editor)) {
                editor.dispose();
            }
        }
        // Update container
        this.updateContainer();
        // Event
        this._onDidCloseEditor.fire({ groupId: this.id, editor, context, index: editorIndex, sticky });
    }
    canDispose(editor) {
        for (const groupView of this.editorPartsView.groups) {
            if (groupView instanceof EditorGroupView_1 && groupView.model.contains(editor, {
                strictEquals: true, // only if this input is not shared across editor groups
                supportSideBySide: SideBySideEditor.ANY // include any side of an opened side by side editor
            })) {
                return false;
            }
        }
        return true;
    }
    toResourceTelemetryDescriptor(resource) {
        if (!resource) {
            return undefined;
        }
        const path = resource ? resource.scheme === Schemas.file ? resource.fsPath : resource.path : undefined;
        if (!path) {
            return undefined;
        }
        // Remove query parameters from the resource extension
        let resourceExt = extname(resource);
        const queryStringLocation = resourceExt.indexOf('?');
        resourceExt = queryStringLocation !== -1 ? resourceExt.substr(0, queryStringLocation) : resourceExt;
        return {
            mimeType: new TelemetryTrustedValue(getMimeTypes(resource).join(', ')),
            scheme: resource.scheme,
            ext: resourceExt,
            path: hash(path)
        };
    }
    toEditorTelemetryDescriptor(editor) {
        const descriptor = editor.getTelemetryDescriptor();
        const resource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH });
        if (URI.isUri(resource)) {
            descriptor['resource'] = this.toResourceTelemetryDescriptor(resource);
            /* __GDPR__FRAGMENT__
                "EditorTelemetryDescriptor" : {
                    "resource": { "${inline}": [ "${URIDescriptor}" ] }
                }
            */
            return descriptor;
        }
        else if (resource) {
            if (resource.primary) {
                descriptor['resource'] = this.toResourceTelemetryDescriptor(resource.primary);
            }
            if (resource.secondary) {
                descriptor['resourceSecondary'] = this.toResourceTelemetryDescriptor(resource.secondary);
            }
            /* __GDPR__FRAGMENT__
                "EditorTelemetryDescriptor" : {
                    "resource": { "${inline}": [ "${URIDescriptor}" ] },
                    "resourceSecondary": { "${inline}": [ "${URIDescriptor}" ] }
                }
            */
            return descriptor;
        }
        return descriptor;
    }
    onWillDisposeEditor(editor) {
        // To prevent race conditions, we handle disposed editors in our worker with a timeout
        // because it can happen that an input is being disposed with the intent to replace
        // it with some other input right after.
        this.disposedEditorsWorker.work(editor);
    }
    handleDisposedEditors(disposedEditors) {
        // Split between visible and hidden editors
        let activeEditor;
        const inactiveEditors = [];
        for (const disposedEditor of disposedEditors) {
            const editorFindResult = this.model.findEditor(disposedEditor);
            if (!editorFindResult) {
                continue; // not part of the model anymore
            }
            const editor = editorFindResult[0];
            if (!editor.isDisposed()) {
                continue; // editor got reopened meanwhile
            }
            if (this.model.isActive(editor)) {
                activeEditor = editor;
            }
            else {
                inactiveEditors.push(editor);
            }
        }
        // Close all inactive editors first to prevent UI flicker
        for (const inactiveEditor of inactiveEditors) {
            this.doCloseEditor(inactiveEditor, true);
        }
        // Close active one last
        if (activeEditor) {
            this.doCloseEditor(activeEditor, true);
        }
    }
    onDidChangeEditorPartOptions(event) {
        // Title container
        this.updateTitleContainer();
        // Title control
        this.titleControl.updateOptions(event.oldPartOptions, event.newPartOptions);
        // Title control switch between singleEditorTabs, multiEditorTabs and multiRowEditorTabs
        if (event.oldPartOptions.showTabs !== event.newPartOptions.showTabs ||
            event.oldPartOptions.tabHeight !== event.newPartOptions.tabHeight ||
            (event.oldPartOptions.showTabs === 'multiple' && event.oldPartOptions.pinnedTabsOnSeparateRow !== event.newPartOptions.pinnedTabsOnSeparateRow)) {
            // Re-layout
            this.relayout();
            // Ensure to show active editor if any
            if (this.model.activeEditor) {
                this.titleControl.openEditors(this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */));
            }
        }
        // Styles
        this.updateStyles();
        // Pin preview editor once user disables preview
        if (event.oldPartOptions.enablePreview && !event.newPartOptions.enablePreview) {
            if (this.model.previewEditor) {
                this.pinEditor(this.model.previewEditor);
            }
        }
    }
    onDidChangeEditorDirty(editor) {
        // Always show dirty editors pinned
        this.pinEditor(editor);
        // Forward to title control
        this.titleControl.updateEditorDirty(editor);
    }
    onDidChangeEditorTransient(editor) {
        const transient = this.model.isTransient(editor);
        // Transient state overrides the `enablePreview` setting,
        // so when an editor leaves the transient state, we have
        // to ensure its preview state is also cleared.
        if (!transient && !this.groupsView.partOptions.enablePreview) {
            this.pinEditor(editor);
        }
    }
    onDidChangeEditorLabel(editor) {
        // Forward to title control
        this.titleControl.updateEditorLabel(editor);
    }
    onDidChangeEditorSelection() {
        // Forward to title control
        this.titleControl.updateEditorSelections();
    }
    onDidVisibilityChange(visible) {
        // Forward to active editor pane
        this.editorPane.setVisible(visible);
    }
    onDidGainFocus() {
        if (this.activeEditor) {
            // We aggressively clear the transient state of editors
            // as soon as the group gains focus. This is to ensure
            // that the transient state is not staying around when
            // the user interacts with the editor.
            this.model.setTransient(this.activeEditor, false);
        }
    }
    //#endregion
    //#region IEditorGroupView
    get index() {
        return this._index;
    }
    get label() {
        if (this.groupsLabel) {
            return localize('groupLabelLong', "{0}: Group {1}", this.groupsLabel, this._index + 1);
        }
        return localize('groupLabel', "Group {0}", this._index + 1);
    }
    get ariaLabel() {
        if (this.groupsLabel) {
            return localize('groupAriaLabelLong', "{0}: Editor Group {1}", this.groupsLabel, this._index + 1);
        }
        return localize('groupAriaLabel', "Editor Group {0}", this._index + 1);
    }
    get disposed() {
        return this._disposed;
    }
    get isEmpty() {
        return this.count === 0;
    }
    get titleHeight() {
        return this.titleControl.getHeight();
    }
    notifyIndexChanged(newIndex) {
        if (this._index !== newIndex) {
            this._index = newIndex;
            this.model.setIndex(newIndex);
        }
    }
    notifyLabelChanged(newLabel) {
        if (this.groupsLabel !== newLabel) {
            this.groupsLabel = newLabel;
            this.model.setLabel(newLabel);
        }
    }
    setActive(isActive) {
        this.active = isActive;
        // Clear selection when group no longer active
        if (!isActive && this.activeEditor && this.selectedEditors.length > 1) {
            this.setSelection(this.activeEditor, []);
        }
        // Update container
        this.element.classList.toggle('active', isActive);
        this.element.classList.toggle('inactive', !isActive);
        // Update title control
        this.titleControl.setActive(isActive);
        // Update styles
        this.updateStyles();
        // Update model
        this.model.setActive(undefined /* entire group got active */);
    }
    //#endregion
    //#region basics()
    get id() {
        return this.model.id;
    }
    get windowId() {
        return this.groupsView.windowId;
    }
    get editors() {
        return this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */);
    }
    get count() {
        return this.model.count;
    }
    get stickyCount() {
        return this.model.stickyCount;
    }
    get activeEditorPane() {
        return this.editorPane ? this.editorPane.activeEditorPane ?? undefined : undefined;
    }
    get activeEditor() {
        return this.model.activeEditor;
    }
    get selectedEditors() {
        return this.model.selectedEditors;
    }
    get previewEditor() {
        return this.model.previewEditor;
    }
    isPinned(editorOrIndex) {
        return this.model.isPinned(editorOrIndex);
    }
    isSticky(editorOrIndex) {
        return this.model.isSticky(editorOrIndex);
    }
    isSelected(editor) {
        return this.model.isSelected(editor);
    }
    isTransient(editorOrIndex) {
        return this.model.isTransient(editorOrIndex);
    }
    isActive(editor) {
        return this.model.isActive(editor);
    }
    async setSelection(activeSelectedEditor, inactiveSelectedEditors) {
        if (!this.isActive(activeSelectedEditor)) {
            // The active selected editor is not yet opened, so we go
            // through `openEditor` to show it. We pass the inactive
            // selection as internal options
            await this.openEditor(activeSelectedEditor, { activation: EditorActivation.ACTIVATE }, { inactiveSelection: inactiveSelectedEditors });
        }
        else {
            this.model.setSelection(activeSelectedEditor, inactiveSelectedEditors);
        }
    }
    contains(candidate, options) {
        return this.model.contains(candidate, options);
    }
    getEditors(order, options) {
        return this.model.getEditors(order, options);
    }
    findEditors(resource, options) {
        const canonicalResource = this.uriIdentityService.asCanonicalUri(resource);
        return this.getEditors(1 /* EditorsOrder.SEQUENTIAL */).filter(editor => {
            if (editor.resource && isEqual(editor.resource, canonicalResource)) {
                return true;
            }
            // Support side by side editor primary side if specified
            if (options?.supportSideBySide === SideBySideEditor.PRIMARY || options?.supportSideBySide === SideBySideEditor.ANY) {
                const primaryResource = EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
                if (primaryResource && isEqual(primaryResource, canonicalResource)) {
                    return true;
                }
            }
            // Support side by side editor secondary side if specified
            if (options?.supportSideBySide === SideBySideEditor.SECONDARY || options?.supportSideBySide === SideBySideEditor.ANY) {
                const secondaryResource = EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.SECONDARY });
                if (secondaryResource && isEqual(secondaryResource, canonicalResource)) {
                    return true;
                }
            }
            return false;
        });
    }
    getEditorByIndex(index) {
        return this.model.getEditorByIndex(index);
    }
    getIndexOfEditor(editor) {
        return this.model.indexOf(editor);
    }
    isFirst(editor) {
        return this.model.isFirst(editor);
    }
    isLast(editor) {
        return this.model.isLast(editor);
    }
    focus() {
        // Pass focus to editor panes
        if (this.activeEditorPane) {
            this.activeEditorPane.focus();
        }
        else {
            this.element.focus();
        }
        // Event
        this._onDidFocus.fire();
    }
    pinEditor(candidate = this.activeEditor || undefined) {
        if (candidate && !this.model.isPinned(candidate)) {
            // Update model
            const editor = this.model.pin(candidate);
            // Forward to title control
            if (editor) {
                this.titleControl.pinEditor(editor);
            }
        }
    }
    stickEditor(candidate = this.activeEditor || undefined) {
        this.doStickEditor(candidate, true);
    }
    unstickEditor(candidate = this.activeEditor || undefined) {
        this.doStickEditor(candidate, false);
    }
    doStickEditor(candidate, sticky) {
        if (candidate && this.model.isSticky(candidate) !== sticky) {
            const oldIndexOfEditor = this.getIndexOfEditor(candidate);
            // Update model
            const editor = sticky ? this.model.stick(candidate) : this.model.unstick(candidate);
            if (!editor) {
                return;
            }
            // If the index of the editor changed, we need to forward this to
            // title control and also make sure to emit this as an event
            const newIndexOfEditor = this.getIndexOfEditor(editor);
            if (newIndexOfEditor !== oldIndexOfEditor) {
                this.titleControl.moveEditor(editor, oldIndexOfEditor, newIndexOfEditor, true);
            }
            // Forward sticky state to title control
            if (sticky) {
                this.titleControl.stickEditor(editor);
            }
            else {
                this.titleControl.unstickEditor(editor);
            }
        }
    }
    //#endregion
    //#region openEditor()
    async openEditor(editor, options, internalOptions) {
        return this.doOpenEditor(editor, options, {
            // Appply given internal open options
            ...internalOptions,
            // Allow to match on a side-by-side editor when same
            // editor is opened on both sides. In that case we
            // do not want to open a new editor but reuse that one.
            supportSideBySide: SideBySideEditor.BOTH
        });
    }
    async doOpenEditor(editor, options, internalOptions) {
        // Guard against invalid editors. Disposed editors
        // should never open because they emit no events
        // e.g. to indicate dirty changes.
        if (!editor || editor.isDisposed()) {
            return;
        }
        // Fire the event letting everyone know we are about to open an editor
        this._onWillOpenEditor.fire({ editor, groupId: this.id });
        // Determine options
        const pinned = options?.sticky
            || (!this.groupsView.partOptions.enablePreview && !options?.transient)
            || editor.isDirty()
            || (options?.pinned ?? typeof options?.index === 'number' /* unless specified, prefer to pin when opening with index */)
            || (typeof options?.index === 'number' && this.model.isSticky(options.index))
            || editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */);
        const openEditorOptions = {
            index: options ? options.index : undefined,
            pinned,
            sticky: options?.sticky || (typeof options?.index === 'number' && this.model.isSticky(options.index)),
            transient: !!options?.transient,
            inactiveSelection: internalOptions?.inactiveSelection,
            active: this.count === 0 || !options || !options.inactive,
            supportSideBySide: internalOptions?.supportSideBySide
        };
        if (!openEditorOptions.active && !openEditorOptions.pinned && this.model.activeEditor && !this.model.isPinned(this.model.activeEditor)) {
            // Special case: we are to open an editor inactive and not pinned, but the current active
            // editor is also not pinned, which means it will get replaced with this one. As such,
            // the editor can only be active.
            openEditorOptions.active = true;
        }
        let activateGroup = false;
        let restoreGroup = false;
        if (options?.activation === EditorActivation.ACTIVATE) {
            // Respect option to force activate an editor group.
            activateGroup = true;
        }
        else if (options?.activation === EditorActivation.RESTORE) {
            // Respect option to force restore an editor group.
            restoreGroup = true;
        }
        else if (options?.activation === EditorActivation.PRESERVE) {
            // Respect option to preserve active editor group.
            activateGroup = false;
            restoreGroup = false;
        }
        else if (openEditorOptions.active) {
            // Finally, we only activate/restore an editor which is
            // opening as active editor.
            // If preserveFocus is enabled, we only restore but never
            // activate the group.
            activateGroup = !options || !options.preserveFocus;
            restoreGroup = !activateGroup;
        }
        // Actually move the editor if a specific index is provided and we figure
        // out that the editor is already opened at a different index. This
        // ensures the right set of events are fired to the outside.
        if (typeof openEditorOptions.index === 'number') {
            const indexOfEditor = this.model.indexOf(editor);
            if (indexOfEditor !== -1 && indexOfEditor !== openEditorOptions.index) {
                this.doMoveEditorInsideGroup(editor, openEditorOptions);
            }
        }
        // Update model and make sure to continue to use the editor we get from
        // the model. It is possible that the editor was already opened and we
        // want to ensure that we use the existing instance in that case.
        const { editor: openedEditor, isNew } = this.model.openEditor(editor, openEditorOptions);
        // Conditionally lock the group
        if (isNew && // only if this editor was new for the group
            this.count === 1 && // only when this editor was the first editor in the group
            this.editorPartsView.groups.length > 1 // only allow auto locking if more than 1 group is opened
        ) {
            // only when the editor identifier is configured as such
            if (openedEditor.editorId && this.groupsView.partOptions.autoLockGroups?.has(openedEditor.editorId)) {
                this.lock(true);
            }
        }
        // Show editor
        const showEditorResult = this.doShowEditor(openedEditor, { active: !!openEditorOptions.active, isNew }, options, internalOptions);
        // Finally make sure the group is active or restored as instructed
        if (activateGroup) {
            this.groupsView.activateGroup(this);
        }
        else if (restoreGroup) {
            this.groupsView.restoreGroup(this);
        }
        return showEditorResult;
    }
    doShowEditor(editor, context, options, internalOptions) {
        // Show in editor control if the active editor changed
        let openEditorPromise;
        if (context.active) {
            openEditorPromise = (async () => {
                const { pane, changed, cancelled, error } = await this.editorPane.openEditor(editor, options, internalOptions, { newInGroup: context.isNew });
                // Return early if the operation was cancelled by another operation
                if (cancelled) {
                    return undefined;
                }
                // Editor change event
                if (changed) {
                    this._onDidActiveEditorChange.fire({ editor });
                }
                // Indicate error as an event but do not bubble them up
                if (error) {
                    this._onDidOpenEditorFail.fire(editor);
                }
                // Without an editor pane, recover by closing the active editor
                // (if the input is still the active one)
                if (!pane && this.activeEditor === editor) {
                    this.doCloseEditor(editor, options?.preserveFocus, { fromError: true });
                }
                return pane;
            })();
        }
        else {
            openEditorPromise = Promise.resolve(undefined); // inactive: return undefined as result to signal this
        }
        // Show in title control after editor control because some actions depend on it
        // but respect the internal options in case title control updates should skip.
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.openEditor(editor, internalOptions);
        }
        return openEditorPromise;
    }
    //#endregion
    //#region openEditors()
    async openEditors(editors) {
        // Guard against invalid editors. Disposed editors
        // should never open because they emit no events
        // e.g. to indicate dirty changes.
        const editorsToOpen = coalesce(editors).filter(({ editor }) => !editor.isDisposed());
        // Use the first editor as active editor
        const firstEditor = editorsToOpen.at(0);
        if (!firstEditor) {
            return;
        }
        const openEditorsOptions = {
            // Allow to match on a side-by-side editor when same
            // editor is opened on both sides. In that case we
            // do not want to open a new editor but reuse that one.
            supportSideBySide: SideBySideEditor.BOTH
        };
        await this.doOpenEditor(firstEditor.editor, firstEditor.options, openEditorsOptions);
        // Open the other ones inactive
        const inactiveEditors = editorsToOpen.slice(1);
        const startingIndex = this.getIndexOfEditor(firstEditor.editor) + 1;
        await Promises.settled(inactiveEditors.map(({ editor, options }, index) => {
            return this.doOpenEditor(editor, {
                ...options,
                inactive: true,
                pinned: true,
                index: startingIndex + index
            }, {
                ...openEditorsOptions,
                // optimization: update the title control later
                // https://github.com/microsoft/vscode/issues/130634
                skipTitleUpdate: true
            });
        }));
        // Update the title control all at once with all editors
        this.titleControl.openEditors(inactiveEditors.map(({ editor }) => editor));
        // Opening many editors at once can put any editor to be
        // the active one depending on options. As such, we simply
        // return the active editor pane after this operation.
        return this.editorPane.activeEditorPane ?? undefined;
    }
    //#endregion
    //#region moveEditor()
    moveEditors(editors, target) {
        // Optimization: knowing that we move many editors, we
        // delay the title update to a later point for this group
        // through a method that allows for bulk updates but only
        // when moving to a different group where many editors
        // are more likely to occur.
        const internalOptions = {
            skipTitleUpdate: this !== target
        };
        let moveFailed = false;
        const movedEditors = new Set();
        for (const { editor, options } of editors) {
            if (this.moveEditor(editor, target, options, internalOptions)) {
                movedEditors.add(editor);
            }
            else {
                moveFailed = true;
            }
        }
        // Update the title control all at once with all editors
        // in source and target if the title update was skipped
        if (internalOptions.skipTitleUpdate) {
            target.titleControl.openEditors(Array.from(movedEditors));
            this.titleControl.closeEditors(Array.from(movedEditors));
        }
        return !moveFailed;
    }
    moveEditor(editor, target, options, internalOptions) {
        // Move within same group
        if (this === target) {
            this.doMoveEditorInsideGroup(editor, options);
            return true;
        }
        // Move across groups
        else {
            return this.doMoveOrCopyEditorAcrossGroups(editor, target, options, { ...internalOptions, keepCopy: false });
        }
    }
    doMoveEditorInsideGroup(candidate, options) {
        const moveToIndex = options ? options.index : undefined;
        if (typeof moveToIndex !== 'number') {
            return; // do nothing if we move into same group without index
        }
        // Update model and make sure to continue to use the editor we get from
        // the model. It is possible that the editor was already opened and we
        // want to ensure that we use the existing instance in that case.
        const currentIndex = this.model.indexOf(candidate);
        const editor = this.model.getEditorByIndex(currentIndex);
        if (!editor) {
            return;
        }
        // Move when index has actually changed
        if (currentIndex !== moveToIndex) {
            const oldStickyCount = this.model.stickyCount;
            // Update model
            this.model.moveEditor(editor, moveToIndex);
            this.model.pin(editor);
            // Forward to title control
            this.titleControl.moveEditor(editor, currentIndex, moveToIndex, oldStickyCount !== this.model.stickyCount);
            this.titleControl.pinEditor(editor);
        }
        // Support the option to stick the editor even if it is moved.
        // It is important that we call this method after we have moved
        // the editor because the result of moving the editor could have
        // caused a change in sticky state.
        if (options?.sticky) {
            this.stickEditor(editor);
        }
    }
    doMoveOrCopyEditorAcrossGroups(editor, target, openOptions, internalOptions) {
        const keepCopy = internalOptions?.keepCopy;
        // Validate that we can move
        if (!keepCopy || editor.hasCapability(8 /* EditorInputCapabilities.Singleton */) /* singleton editors will always move */) {
            const canMoveVeto = editor.canMove(this.id, target.id);
            if (typeof canMoveVeto === 'string') {
                this.dialogService.error(canMoveVeto, localize('moveErrorDetails', "Try saving or reverting the editor first and then try again."));
                return false;
            }
        }
        // When moving/copying an editor, try to preserve as much view state as possible
        // by checking for the editor to be a text editor and creating the options accordingly
        // if so
        const options = fillActiveEditorViewState(this, editor, {
            ...openOptions,
            pinned: true, // always pin moved editor
            sticky: openOptions?.sticky ?? (!keepCopy && this.model.isSticky(editor)) // preserve sticky state only if editor is moved or explicitly wanted (https://github.com/microsoft/vscode/issues/99035)
        });
        // Indicate will move event
        if (!keepCopy) {
            this._onWillMoveEditor.fire({
                groupId: this.id,
                editor,
                target: target.id
            });
        }
        // A move to another group is an open first...
        target.doOpenEditor(keepCopy ? editor.copy() : editor, options, internalOptions);
        // ...and a close afterwards (unless we copy)
        if (!keepCopy) {
            this.doCloseEditor(editor, true /* do not focus next one behind if any */, { ...internalOptions, context: EditorCloseContext.MOVE });
        }
        return true;
    }
    //#endregion
    //#region copyEditor()
    copyEditors(editors, target) {
        // Optimization: knowing that we move many editors, we
        // delay the title update to a later point for this group
        // through a method that allows for bulk updates but only
        // when moving to a different group where many editors
        // are more likely to occur.
        const internalOptions = {
            skipTitleUpdate: this !== target
        };
        for (const { editor, options } of editors) {
            this.copyEditor(editor, target, options, internalOptions);
        }
        // Update the title control all at once with all editors
        // in target if the title update was skipped
        if (internalOptions.skipTitleUpdate) {
            const copiedEditors = editors.map(({ editor }) => editor);
            target.titleControl.openEditors(copiedEditors);
        }
    }
    copyEditor(editor, target, options, internalOptions) {
        // Move within same group because we do not support to show the same editor
        // multiple times in the same group
        if (this === target) {
            this.doMoveEditorInsideGroup(editor, options);
        }
        // Copy across groups
        else {
            this.doMoveOrCopyEditorAcrossGroups(editor, target, options, { ...internalOptions, keepCopy: true });
        }
    }
    //#endregion
    //#region closeEditor()
    async closeEditor(editor = this.activeEditor || undefined, options) {
        return this.doCloseEditorWithConfirmationHandling(editor, options);
    }
    async doCloseEditorWithConfirmationHandling(editor = this.activeEditor || undefined, options, internalOptions) {
        if (!editor) {
            return false;
        }
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation([editor]);
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseEditor(editor, options?.preserveFocus, internalOptions);
        return true;
    }
    doCloseEditor(editor, preserveFocus = (this.groupsView.activeGroup !== this), internalOptions) {
        // Forward to title control unless skipped via internal options
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.beforeCloseEditor(editor);
        }
        // Closing the active editor of the group is a bit more work
        if (this.model.isActive(editor)) {
            this.doCloseActiveEditor(preserveFocus, internalOptions);
        }
        // Closing inactive editor is just a model update
        else {
            this.doCloseInactiveEditor(editor, internalOptions);
        }
        // Forward to title control unless skipped via internal options
        if (!internalOptions?.skipTitleUpdate) {
            this.titleControl.closeEditor(editor);
        }
    }
    doCloseActiveEditor(preserveFocus = (this.groupsView.activeGroup !== this), internalOptions) {
        const editorToClose = this.activeEditor;
        const restoreFocus = !preserveFocus && this.shouldRestoreFocus(this.element);
        // Optimization: if we are about to close the last editor in this group and settings
        // are configured to close the group since it will be empty, we first set the last
        // active group as empty before closing the editor. This reduces the amount of editor
        // change events that this operation emits and will reduce flicker. Without this
        // optimization, this group (if active) would first trigger a active editor change
        // event because it became empty, only to then trigger another one when the next
        // group gets active.
        const closeEmptyGroup = this.groupsView.partOptions.closeEmptyGroups;
        if (closeEmptyGroup && this.active && this.count === 1) {
            const mostRecentlyActiveGroups = this.groupsView.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
            const nextActiveGroup = mostRecentlyActiveGroups[1]; // [0] will be the current one, so take [1]
            if (nextActiveGroup) {
                if (restoreFocus) {
                    nextActiveGroup.focus();
                }
                else {
                    this.groupsView.activateGroup(nextActiveGroup, true);
                }
            }
        }
        // Update model
        if (editorToClose) {
            this.model.closeEditor(editorToClose, internalOptions?.context);
        }
        // Open next active if there are more to show
        const nextActiveEditor = this.model.activeEditor;
        if (nextActiveEditor) {
            let activation = undefined;
            if (preserveFocus && this.groupsView.activeGroup !== this) {
                // If we are opening the next editor in an inactive group
                // without focussing it, ensure we preserve the editor
                // group sizes in case that group is minimized.
                // https://github.com/microsoft/vscode/issues/117686
                activation = EditorActivation.PRESERVE;
            }
            const options = {
                preserveFocus,
                activation,
                // When closing an editor due to an error we can end up in a loop where we continue closing
                // editors that fail to open (e.g. when the file no longer exists). We do not want to show
                // repeated errors in this case to the user. As such, if we open the next editor and we are
                // in a scope of a previous editor failing, we silence the input errors until the editor is
                // opened by setting ignoreError: true.
                ignoreError: internalOptions?.fromError
            };
            const internalEditorOpenOptions = {
                // When closing an editor, we reveal the next one in the group.
                // However, this can be a result of moving an editor to another
                // window so we explicitly disable window reordering in this case.
                preserveWindowOrder: true
            };
            this.doOpenEditor(nextActiveEditor, options, internalEditorOpenOptions);
        }
        // Otherwise we are empty, so clear from editor control and send event
        else {
            // Forward to editor pane
            if (editorToClose) {
                this.editorPane.closeEditor(editorToClose);
            }
            // Restore focus to group container as needed unless group gets closed
            if (restoreFocus && !closeEmptyGroup) {
                this.focus();
            }
            // Events
            this._onDidActiveEditorChange.fire({ editor: undefined });
            // Remove empty group if we should
            if (closeEmptyGroup) {
                this.groupsView.removeGroup(this, preserveFocus);
            }
        }
    }
    shouldRestoreFocus(target) {
        const activeElement = getActiveElement();
        if (activeElement === target.ownerDocument.body) {
            return true; // always restore focus if nothing is focused currently
        }
        // otherwise check for the active element being an ancestor of the target
        return isAncestor(activeElement, target);
    }
    doCloseInactiveEditor(editor, internalOptions) {
        // Update model
        this.model.closeEditor(editor, internalOptions?.context);
    }
    async handleCloseConfirmation(editors) {
        if (!editors.length) {
            return false; // no veto
        }
        const editor = editors.shift();
        // To prevent multiple confirmation dialogs from showing up one after the other
        // we check if a pending confirmation is currently showing and if so, join that
        let handleCloseConfirmationPromise = this.mapEditorToPendingConfirmation.get(editor);
        if (!handleCloseConfirmationPromise) {
            handleCloseConfirmationPromise = this.doHandleCloseConfirmation(editor);
            this.mapEditorToPendingConfirmation.set(editor, handleCloseConfirmationPromise);
        }
        let veto;
        try {
            veto = await handleCloseConfirmationPromise;
        }
        finally {
            this.mapEditorToPendingConfirmation.delete(editor);
        }
        // Return for the first veto we got
        if (veto) {
            return veto;
        }
        // Otherwise continue with the remainders
        return this.handleCloseConfirmation(editors);
    }
    async doHandleCloseConfirmation(editor, options) {
        if (!this.shouldConfirmClose(editor)) {
            return false; // no veto
        }
        if (editor instanceof SideBySideEditorInput && this.model.contains(editor.primary)) {
            return false; // primary-side of editor is still opened somewhere else
        }
        // Note: we explicitly decide to ask for confirm if closing a normal editor even
        // if it is opened in a side-by-side editor in the group. This decision is made
        // because it may be less obvious that one side of a side by side editor is dirty
        // and can still be changed.
        // The only exception is when the same editor is opened on both sides of a side
        // by side editor (https://github.com/microsoft/vscode/issues/138442)
        if (this.editorPartsView.groups.some(groupView => {
            if (groupView === this) {
                return false; // skip (we already handled our group above)
            }
            const otherGroup = groupView;
            if (otherGroup.contains(editor, { supportSideBySide: SideBySideEditor.BOTH })) {
                return true; // exact editor still opened (either single, or split-in-group)
            }
            if (editor instanceof SideBySideEditorInput && otherGroup.contains(editor.primary)) {
                return true; // primary side of side by side editor still opened
            }
            return false;
        })) {
            return false; // editor is still editable somewhere else
        }
        // In some cases trigger save before opening the dialog depending
        // on auto-save configuration.
        // However, make sure to respect `skipAutoSave` option in case the automated
        // save fails which would result in the editor never closing.
        // Also, we only do this if no custom confirmation handling is implemented.
        let confirmation = 2 /* ConfirmResult.CANCEL */;
        let saveReason = 1 /* SaveReason.EXPLICIT */;
        let autoSave = false;
        if (!editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) && !options?.skipAutoSave && !editor.closeHandler) {
            // Auto-save on focus change: save, because a dialog would steal focus
            // (see https://github.com/microsoft/vscode/issues/108752)
            if (this.filesConfigurationService.getAutoSaveMode(editor).mode === 3 /* AutoSaveMode.ON_FOCUS_CHANGE */) {
                autoSave = true;
                confirmation = 0 /* ConfirmResult.SAVE */;
                saveReason = 3 /* SaveReason.FOCUS_CHANGE */;
            }
            // Auto-save on window change: save, because on Windows and Linux, a
            // native dialog triggers the window focus change
            // (see https://github.com/microsoft/vscode/issues/134250)
            else if ((isNative && (isWindows || isLinux)) && this.filesConfigurationService.getAutoSaveMode(editor).mode === 4 /* AutoSaveMode.ON_WINDOW_CHANGE */) {
                autoSave = true;
                confirmation = 0 /* ConfirmResult.SAVE */;
                saveReason = 4 /* SaveReason.WINDOW_CHANGE */;
            }
        }
        // No auto-save on focus change or custom confirmation handler: ask user
        if (!autoSave) {
            // Switch to editor that we want to handle for confirmation unless showing already
            if (!this.activeEditor || !this.activeEditor.matches(editor)) {
                await this.doOpenEditor(editor);
            }
            // Ensure our window has focus since we are about to show a dialog
            await this.hostService.focus(getWindow(this.element));
            // Let editor handle confirmation if implemented
            if (typeof editor.closeHandler?.confirm === 'function') {
                confirmation = await editor.closeHandler.confirm([{ editor, groupId: this.id }]);
            }
            // Show a file specific confirmation
            else {
                let name;
                if (editor instanceof SideBySideEditorInput) {
                    name = editor.primary.getName(); // prefer shorter names by using primary's name in this case
                }
                else {
                    name = editor.getName();
                }
                confirmation = await this.fileDialogService.showSaveConfirm([name]);
            }
        }
        // It could be that the editor's choice of confirmation has changed
        // given the check for confirmation is long running, so we check
        // again to see if anything needs to happen before closing for good.
        // This can happen for example if `autoSave: onFocusChange` is configured
        // so that the save happens when the dialog opens.
        // However, we only do this unless a custom confirm handler is installed
        // that may not be fit to be asked a second time right after.
        if (!editor.closeHandler && !this.shouldConfirmClose(editor)) {
            return confirmation === 2 /* ConfirmResult.CANCEL */ ? true : false;
        }
        // Otherwise, handle accordingly
        switch (confirmation) {
            case 0 /* ConfirmResult.SAVE */: {
                const result = await editor.save(this.id, { reason: saveReason });
                if (!result && autoSave) {
                    // Save failed and we need to signal this back to the user, so
                    // we handle the dirty editor again but this time ensuring to
                    // show the confirm dialog
                    // (see https://github.com/microsoft/vscode/issues/108752)
                    return this.doHandleCloseConfirmation(editor, { skipAutoSave: true });
                }
                return editor.isDirty(); // veto if still dirty
            }
            case 1 /* ConfirmResult.DONT_SAVE */:
                try {
                    // first try a normal revert where the contents of the editor are restored
                    await editor.revert(this.id);
                    return editor.isDirty(); // veto if still dirty
                }
                catch (error) {
                    this.logService.error(error);
                    // if that fails, since we are about to close the editor, we accept that
                    // the editor cannot be reverted and instead do a soft revert that just
                    // enables us to close the editor. With this, a user can always close a
                    // dirty editor even when reverting fails.
                    await editor.revert(this.id, { soft: true });
                    return editor.isDirty(); // veto if still dirty
                }
            case 2 /* ConfirmResult.CANCEL */:
                return true; // veto
        }
    }
    shouldConfirmClose(editor) {
        if (editor.closeHandler) {
            return editor.closeHandler.showConfirm(); // custom handling of confirmation on close
        }
        return editor.isDirty() && !editor.isSaving(); // editor must be dirty and not saving
    }
    //#endregion
    //#region closeEditors()
    async closeEditors(args, options) {
        if (this.isEmpty) {
            return true;
        }
        const editors = this.doGetEditorsToClose(args);
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation(editors.slice(0));
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseEditors(editors, options);
        return true;
    }
    doGetEditorsToClose(args) {
        if (Array.isArray(args)) {
            return args;
        }
        const filter = args;
        const hasDirection = typeof filter.direction === 'number';
        let editorsToClose = this.model.getEditors(hasDirection ? 1 /* EditorsOrder.SEQUENTIAL */ : 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, filter); // in MRU order only if direction is not specified
        // Filter: saved or saving only
        if (filter.savedOnly) {
            editorsToClose = editorsToClose.filter(editor => !editor.isDirty() || editor.isSaving());
        }
        // Filter: direction (left / right)
        else if (hasDirection && filter.except) {
            editorsToClose = (filter.direction === 0 /* CloseDirection.LEFT */) ?
                editorsToClose.slice(0, this.model.indexOf(filter.except, editorsToClose)) :
                editorsToClose.slice(this.model.indexOf(filter.except, editorsToClose) + 1);
        }
        // Filter: except
        else if (filter.except) {
            editorsToClose = editorsToClose.filter(editor => filter.except && !editor.matches(filter.except));
        }
        return editorsToClose;
    }
    doCloseEditors(editors, options) {
        // Close all inactive editors first
        let closeActiveEditor = false;
        for (const editor of editors) {
            if (!this.isActive(editor)) {
                this.doCloseInactiveEditor(editor);
            }
            else {
                closeActiveEditor = true;
            }
        }
        // Close active editor last if contained in editors list to close
        if (closeActiveEditor) {
            this.doCloseActiveEditor(options?.preserveFocus);
        }
        // Forward to title control
        if (editors.length) {
            this.titleControl.closeEditors(editors);
        }
    }
    //#endregion
    //#region closeAllEditors()
    async closeAllEditors(options) {
        if (this.isEmpty) {
            // If the group is empty and the request is to close all editors, we still close
            // the editor group is the related setting to close empty groups is enabled for
            // a convenient way of removing empty editor groups for the user.
            if (this.groupsView.partOptions.closeEmptyGroups) {
                this.groupsView.removeGroup(this);
            }
            return true;
        }
        // Apply the `excludeConfirming` filter if present
        let editors = this.model.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */, options);
        if (options?.excludeConfirming) {
            editors = editors.filter(editor => !this.shouldConfirmClose(editor));
        }
        // Check for confirmation and veto
        const veto = await this.handleCloseConfirmation(editors);
        if (veto) {
            return false;
        }
        // Do close
        this.doCloseAllEditors(options);
        return true;
    }
    doCloseAllEditors(options) {
        let editors = this.model.getEditors(1 /* EditorsOrder.SEQUENTIAL */, options);
        if (options?.excludeConfirming) {
            editors = editors.filter(editor => !this.shouldConfirmClose(editor));
        }
        // Close all inactive editors first
        const editorsToClose = [];
        for (const editor of editors) {
            if (!this.isActive(editor)) {
                this.doCloseInactiveEditor(editor);
            }
            editorsToClose.push(editor);
        }
        // Close active editor last (unless we skip it, e.g. because it is sticky)
        if (this.activeEditor && editorsToClose.includes(this.activeEditor)) {
            this.doCloseActiveEditor();
        }
        // Forward to title control
        if (editorsToClose.length) {
            this.titleControl.closeEditors(editorsToClose);
        }
    }
    //#endregion
    //#region replaceEditors()
    async replaceEditors(editors) {
        // Extract active vs. inactive replacements
        let activeReplacement;
        const inactiveReplacements = [];
        for (let { editor, replacement, forceReplaceDirty, options } of editors) {
            const index = this.getIndexOfEditor(editor);
            if (index >= 0) {
                const isActiveEditor = this.isActive(editor);
                // make sure we respect the index of the editor to replace
                if (options) {
                    options.index = index;
                }
                else {
                    options = { index };
                }
                options.inactive = !isActiveEditor;
                options.pinned = options.pinned ?? true; // unless specified, prefer to pin upon replace
                const editorToReplace = { editor, replacement, forceReplaceDirty, options };
                if (isActiveEditor) {
                    activeReplacement = editorToReplace;
                }
                else {
                    inactiveReplacements.push(editorToReplace);
                }
            }
        }
        // Handle inactive first
        for (const { editor, replacement, forceReplaceDirty, options } of inactiveReplacements) {
            // Open inactive editor
            await this.doOpenEditor(replacement, options);
            // Close replaced inactive editor unless they match
            if (!editor.matches(replacement)) {
                let closed = false;
                if (forceReplaceDirty) {
                    this.doCloseEditor(editor, true, { context: EditorCloseContext.REPLACE });
                    closed = true;
                }
                else {
                    closed = await this.doCloseEditorWithConfirmationHandling(editor, { preserveFocus: true }, { context: EditorCloseContext.REPLACE });
                }
                if (!closed) {
                    return; // canceled
                }
            }
        }
        // Handle active last
        if (activeReplacement) {
            // Open replacement as active editor
            const openEditorResult = this.doOpenEditor(activeReplacement.replacement, activeReplacement.options);
            // Close replaced active editor unless they match
            if (!activeReplacement.editor.matches(activeReplacement.replacement)) {
                if (activeReplacement.forceReplaceDirty) {
                    this.doCloseEditor(activeReplacement.editor, true, { context: EditorCloseContext.REPLACE });
                }
                else {
                    await this.doCloseEditorWithConfirmationHandling(activeReplacement.editor, { preserveFocus: true }, { context: EditorCloseContext.REPLACE });
                }
            }
            await openEditorResult;
        }
    }
    //#endregion
    //#region Locking
    get isLocked() {
        return this.model.isLocked;
    }
    lock(locked) {
        this.model.lock(locked);
    }
    //#endregion
    //#region Editor Actions
    createEditorActions(disposables) {
        let actions = { primary: [], secondary: [] };
        let onDidChange;
        // Editor actions require the editor control to be there, so we retrieve it via service
        const activeEditorPane = this.activeEditorPane;
        if (activeEditorPane instanceof EditorPane) {
            const editorScopedContextKeyService = activeEditorPane.scopedContextKeyService ?? this.scopedContextKeyService;
            const editorTitleMenu = disposables.add(this.menuService.createMenu(MenuId.EditorTitle, editorScopedContextKeyService, { emitEventsForSubmenuChanges: true, eventDebounceDelay: 0 }));
            onDidChange = editorTitleMenu.onDidChange;
            const shouldInlineGroup = (action, group) => group === 'navigation' && action.actions.length <= 1;
            actions = getActionBarActions(editorTitleMenu.getActions({ arg: this.resourceContext.get(), shouldForwardArgs: true }), 'navigation', shouldInlineGroup);
        }
        else {
            // If there is no active pane in the group (it's the last group and it's empty)
            // Trigger the change event when the active editor changes
            const _onDidChange = disposables.add(new Emitter());
            onDidChange = _onDidChange.event;
            disposables.add(this.onDidActiveEditorChange(() => _onDidChange.fire()));
        }
        return { actions, onDidChange };
    }
    //#endregion
    //#region Themable
    updateStyles() {
        const isEmpty = this.isEmpty;
        // Container
        if (isEmpty) {
            this.element.style.backgroundColor = this.getColor(EDITOR_GROUP_EMPTY_BACKGROUND) || '';
        }
        else {
            this.element.style.backgroundColor = '';
        }
        // Title control
        const borderColor = this.getColor(EDITOR_GROUP_HEADER_BORDER) || this.getColor(contrastBorder);
        if (!isEmpty && borderColor) {
            this.titleContainer.classList.add('title-border-bottom');
            this.titleContainer.style.setProperty('--title-border-bottom-color', borderColor);
        }
        else {
            this.titleContainer.classList.remove('title-border-bottom');
            this.titleContainer.style.removeProperty('--title-border-bottom-color');
        }
        const { showTabs } = this.groupsView.partOptions;
        this.titleContainer.style.backgroundColor = this.getColor(showTabs === 'multiple' ? EDITOR_GROUP_HEADER_TABS_BACKGROUND : EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND) || '';
        // Editor container
        this.editorContainer.style.backgroundColor = this.getColor(editorBackground) || '';
    }
    get minimumWidth() { return this.editorPane.minimumWidth; }
    get minimumHeight() { return this.editorPane.minimumHeight; }
    get maximumWidth() { return this.editorPane.maximumWidth; }
    get maximumHeight() { return this.editorPane.maximumHeight; }
    get proportionalLayout() {
        if (!this.lastLayout) {
            return true;
        }
        return !(this.lastLayout.width === this.minimumWidth || this.lastLayout.height === this.minimumHeight);
    }
    layout(width, height, top, left) {
        this.lastLayout = { width, height, top, left };
        this.element.classList.toggle('max-height-478px', height <= 478);
        // Layout the title control first to receive the size it occupies
        const titleControlSize = this.titleControl.layout({
            container: new Dimension(width, height),
            available: new Dimension(width, height - this.editorPane.minimumHeight)
        });
        // Update progress bar location
        this.progressBar.getContainer().style.top = `${Math.max(this.titleHeight.offset - 2, 0)}px`;
        // Pass the container width and remaining height to the editor layout
        const editorHeight = Math.max(0, height - titleControlSize.height);
        this.editorContainer.style.height = `${editorHeight}px`;
        this.editorPane.layout({ width, height: editorHeight, top: top + titleControlSize.height, left });
    }
    relayout() {
        if (this.lastLayout) {
            const { width, height, top, left } = this.lastLayout;
            this.layout(width, height, top, left);
        }
    }
    setBoundarySashes(sashes) {
        this.editorPane.setBoundarySashes(sashes);
    }
    toJSON() {
        return this.model.serialize();
    }
    //#endregion
    dispose() {
        this._disposed = true;
        this._onWillDispose.fire();
        super.dispose();
    }
};
EditorGroupView = EditorGroupView_1 = __decorate([
    __param(6, IInstantiationService),
    __param(7, IContextKeyService),
    __param(8, IThemeService),
    __param(9, ITelemetryService),
    __param(10, IKeybindingService),
    __param(11, IMenuService),
    __param(12, IContextMenuService),
    __param(13, IFileDialogService),
    __param(14, IEditorService),
    __param(15, IFilesConfigurationService),
    __param(16, IUriIdentityService),
    __param(17, ILogService),
    __param(18, IEditorResolverService),
    __param(19, IHostService),
    __param(20, IDialogService),
    __param(21, IFileService)
], EditorGroupView);
export { EditorGroupView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JHcm91cFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sNkJBQTZCLENBQUM7QUFDckMsT0FBTyxFQUFFLGdCQUFnQixFQUEyRSx1QkFBdUIsRUFBRSxzQkFBc0IsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RPLE9BQU8sRUFBZ0osc0JBQXNCLEVBQWdELDBCQUEwQixFQUFFLGdCQUFnQixFQUFFLGtCQUFrQixFQUF1SSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzNkLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSx3QkFBd0IsRUFBRSw4QkFBOEIsRUFBRSx5QkFBeUIsRUFBRSx5QkFBeUIsRUFBRSw4QkFBOEIsRUFBRSwrQkFBK0IsRUFBRSxrQkFBa0IsRUFBRSx1QkFBdUIsRUFBRSxxQ0FBcUMsRUFBRSxrQ0FBa0MsRUFBRSw2QkFBNkIsRUFBRSwrQkFBK0IsRUFBRSw4QkFBOEIsRUFBRSxtQkFBbUIsRUFBRSwyQkFBMkIsRUFBRSw0QkFBNEIsRUFBRSxvQ0FBb0MsRUFBRSxpQ0FBaUMsRUFBRSxxQ0FBcUMsRUFBRSxnQ0FBZ0MsRUFBRSxzREFBc0QsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRW52QixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVB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