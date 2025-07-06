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
var OpenEditorsView_1;
import './media/openeditors.css';
import * as nls from '../../../../../nls.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { ActionRunner } from '../../../../../base/common/actions.js';
import * as dom from '../../../../../base/browser/dom.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { EditorResourceAccessor, SideBySideEditor, preventEditorClose, EditorCloseMethod } from '../../../../common/editor.js';
import { SaveAllInGroupAction, CloseGroupAction } from '../fileActions.js';
import { OpenEditorsFocusedContext, ExplorerFocusedContext, OpenEditor } from '../../common/files.js';
import { CloseAllEditorsAction, CloseEditorAction, UnpinEditorAction } from '../../../../browser/parts/editor/editorActions.js';
import { IContextKeyService, ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { asCssVariable, badgeBackground, badgeForeground, contrastBorder } from '../../../../../platform/theme/common/colorRegistry.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { DisposableMap, dispose } from '../../../../../base/common/lifecycle.js';
import { MenuId, Action2, registerAction2, MenuRegistry } from '../../../../../platform/actions/common/actions.js';
import { OpenEditorsDirtyEditorContext, OpenEditorsGroupContext, OpenEditorsReadonlyEditorContext, SAVE_ALL_LABEL, SAVE_ALL_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID, OpenEditorsSelectedFileOrUntitledContext } from '../fileConstants.js';
import { ResourceContextKey, MultipleEditorGroupsContext } from '../../../../common/contextkeys.js';
import { CodeDataTransfers, containsDragType } from '../../../../../platform/dnd/browser/dnd.js';
import { ResourcesDropHandler, fillEditorsDragData } from '../../../../browser/dnd.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { DataTransfers } from '../../../../../base/browser/dnd.js';
import { memoize } from '../../../../../base/common/decorators.js';
import { ElementsDragAndDropData, NativeDragAndDropData } from '../../../../../base/browser/ui/list/listView.js';
import { IWorkingCopyService } from '../../../../services/workingCopy/common/workingCopyService.js';
import { IFilesConfigurationService } from '../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { compareFileNamesDefault } from '../../../../../base/common/comparers.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { Schemas } from '../../../../../base/common/network.js';
import { extUriIgnorePathCase } from '../../../../../base/common/resources.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { EditorGroupView } from '../../../../browser/parts/editor/editorGroupView.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
const $ = dom.$;
let OpenEditorsView = class OpenEditorsView extends ViewPane {
    static { OpenEditorsView_1 = this; }
    static { this.DEFAULT_VISIBLE_OPEN_EDITORS = 9; }
    static { this.DEFAULT_MIN_VISIBLE_OPEN_EDITORS = 0; }
    static { this.ID = 'workbench.explorer.openEditorsView'; }
    static { this.NAME = nls.localize2({ key: 'openEditors', comment: ['Open is an adjective'] }, "Open Editors"); }
    constructor(options, instantiationService, viewDescriptorService, contextMenuService, editorGroupService, configurationService, keybindingService, contextKeyService, themeService, telemetryService, hoverService, workingCopyService, filesConfigurationService, openerService, fileService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.editorGroupService = editorGroupService;
        this.telemetryService = telemetryService;
        this.workingCopyService = workingCopyService;
        this.filesConfigurationService = filesConfigurationService;
        this.fileService = fileService;
        this.needsRefresh = false;
        this.elements = [];
        this.blockFocusActiveEditorTracking = false;
        this.structuralRefreshDelay = 0;
        this.sortOrder = configurationService.getValue('explorer.openEditors.sortOrder');
        this.registerUpdateEvents();
        // Also handle configuration updates
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationChange(e)));
        // Handle dirty counter
        this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.updateDirtyIndicator(workingCopy)));
    }
    registerUpdateEvents() {
        const updateWholeList = () => {
            if (!this.isBodyVisible() || !this.list) {
                this.needsRefresh = true;
                return;
            }
            this.listRefreshScheduler?.schedule(this.structuralRefreshDelay);
        };
        const groupDisposables = this._register(new DisposableMap());
        const addGroupListener = (group) => {
            const groupModelChangeListener = group.onDidModelChange(e => {
                if (this.listRefreshScheduler?.isScheduled()) {
                    return;
                }
                if (!this.isBodyVisible() || !this.list) {
                    this.needsRefresh = true;
                    return;
                }
                const index = this.getIndex(group, e.editor);
                switch (e.kind) {
                    case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                        this.focusActiveEditor();
                        break;
                    case 1 /* GroupModelChangeKind.GROUP_INDEX */:
                    case 2 /* GroupModelChangeKind.GROUP_LABEL */:
                        if (index >= 0) {
                            this.list.splice(index, 1, [group]);
                        }
                        break;
                    case 14 /* GroupModelChangeKind.EDITOR_DIRTY */:
                    case 13 /* GroupModelChangeKind.EDITOR_STICKY */:
                    case 10 /* GroupModelChangeKind.EDITOR_CAPABILITIES */:
                    case 11 /* GroupModelChangeKind.EDITOR_PIN */:
                    case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                        this.list.splice(index, 1, [new OpenEditor(e.editor, group)]);
                        this.focusActiveEditor();
                        break;
                    case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                    case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                        updateWholeList();
                        break;
                }
            });
            groupDisposables.set(group.id, groupModelChangeListener);
        };
        this.editorGroupService.groups.forEach(g => addGroupListener(g));
        this._register(this.editorGroupService.onDidAddGroup(group => {
            addGroupListener(group);
            updateWholeList();
        }));
        this._register(this.editorGroupService.onDidMoveGroup(() => updateWholeList()));
        this._register(this.editorGroupService.onDidChangeActiveGroup(() => this.focusActiveEditor()));
        this._register(this.editorGroupService.onDidRemoveGroup(group => {
            groupDisposables.deleteAndDispose(group.id);
            updateWholeList();
        }));
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.title);
        const count = dom.append(container, $('.open-editors-dirty-count-container'));
        this.dirtyCountElement = dom.append(count, $('.dirty-count.monaco-count-badge.long'));
        this.dirtyCountElement.style.backgroundColor = asCssVariable(badgeBackground);
        this.dirtyCountElement.style.color = asCssVariable(badgeForeground);
        this.dirtyCountElement.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        this.updateDirtyIndicator();
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('open-editors');
        container.classList.add('show-file-icons');
        const delegate = new OpenEditorsDelegate();
        if (this.list) {
            this.list.dispose();
        }
        if (this.listLabels) {
            this.listLabels.clear();
        }
        this.dnd = new OpenEditorsDragAndDrop(this.sortOrder, this.instantiationService, this.editorGroupService);
        this.listLabels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this.list = this.instantiationService.createInstance(WorkbenchList, 'OpenEditors', container, delegate, [
            new EditorGroupRenderer(this.keybindingService, this.instantiationService),
            new OpenEditorRenderer(this.listLabels, this.instantiationService, this.keybindingService, this.configurationService)
        ], {
            identityProvider: { getId: (element) => element instanceof OpenEditor ? element.getId() : element.id.toString() },
            dnd: this.dnd,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
            accessibilityProvider: new OpenEditorsAccessibilityProvider()
        });
        this._register(this.list);
        this._register(this.listLabels);
        // Register the refresh scheduler
        let labelChangeListeners = [];
        this.listRefreshScheduler = this._register(new RunOnceScheduler(() => {
            // No need to refresh the list if it's not rendered
            if (!this.list) {
                return;
            }
            labelChangeListeners = dispose(labelChangeListeners);
            const previousLength = this.list.length;
            const elements = this.getElements();
            this.list.splice(0, this.list.length, elements);
            this.focusActiveEditor();
            if (previousLength !== this.list.length) {
                this.updateSize();
            }
            this.needsRefresh = false;
            if (this.sortOrder === 'alphabetical' || this.sortOrder === 'fullPath') {
                // We need to resort the list if the editor label changed
                elements.forEach(e => {
                    if (e instanceof OpenEditor) {
                        labelChangeListeners.push(e.editor.onDidChangeLabel(() => this.listRefreshScheduler?.schedule()));
                    }
                });
            }
        }, this.structuralRefreshDelay));
        this.updateSize();
        this.handleContextKeys();
        this._register(this.list.onContextMenu(e => this.onListContextMenu(e)));
        // Open when selecting via keyboard
        this._register(this.list.onMouseMiddleClick(e => {
            if (e && e.element instanceof OpenEditor) {
                if (preventEditorClose(e.element.group, e.element.editor, EditorCloseMethod.MOUSE, this.editorGroupService.partOptions)) {
                    return;
                }
                e.element.group.closeEditor(e.element.editor, { preserveFocus: true });
            }
        }));
        this._register(this.list.onDidOpen(e => {
            const element = e.element;
            if (!element) {
                return;
            }
            else if (element instanceof OpenEditor) {
                if (dom.isMouseEvent(e.browserEvent) && e.browserEvent.button === 1) {
                    return; // middle click already handled above: closes the editor
                }
                this.withActiveEditorFocusTrackingDisabled(() => {
                    this.openEditor(element, { preserveFocus: e.editorOptions.preserveFocus, pinned: e.editorOptions.pinned, sideBySide: e.sideBySide });
                });
            }
            else {
                this.withActiveEditorFocusTrackingDisabled(() => {
                    this.editorGroupService.activateGroup(element);
                    if (!e.editorOptions.preserveFocus) {
                        element.focus();
                    }
                });
            }
        }));
        this.listRefreshScheduler.schedule(0);
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (visible && this.needsRefresh) {
                this.listRefreshScheduler?.schedule(0);
            }
        }));
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        this._register(containerModel.onDidChangeAllViewDescriptors(() => {
            this.updateSize();
        }));
    }
    handleContextKeys() {
        if (!this.list) {
            return;
        }
        // Bind context keys
        OpenEditorsFocusedContext.bindTo(this.list.contextKeyService);
        ExplorerFocusedContext.bindTo(this.list.contextKeyService);
        const groupFocusedContext = OpenEditorsGroupContext.bindTo(this.contextKeyService);
        const dirtyEditorFocusedContext = OpenEditorsDirtyEditorContext.bindTo(this.contextKeyService);
        const readonlyEditorFocusedContext = OpenEditorsReadonlyEditorContext.bindTo(this.contextKeyService);
        const openEditorsSelectedFileOrUntitledContext = OpenEditorsSelectedFileOrUntitledContext.bindTo(this.contextKeyService);
        const resourceContext = this.instantiationService.createInstance(ResourceContextKey);
        this._register(resourceContext);
        this._register(this.list.onDidChangeFocus(e => {
            resourceContext.reset();
            groupFocusedContext.reset();
            dirtyEditorFocusedContext.reset();
            readonlyEditorFocusedContext.reset();
            const element = e.elements.length ? e.elements[0] : undefined;
            if (element instanceof OpenEditor) {
                const resource = element.getResource();
                dirtyEditorFocusedContext.set(element.editor.isDirty() && !element.editor.isSaving());
                readonlyEditorFocusedContext.set(!!element.editor.isReadonly());
                resourceContext.set(resource ?? null);
            }
            else if (!!element) {
                groupFocusedContext.set(true);
            }
        }));
        this._register(this.list.onDidChangeSelection(e => {
            const selectedAreFileOrUntitled = e.elements.every(e => {
                if (e instanceof OpenEditor) {
                    const resource = e.getResource();
                    return resource && (resource.scheme === Schemas.untitled || this.fileService.hasProvider(resource));
                }
                return false;
            });
            openEditorsSelectedFileOrUntitledContext.set(selectedAreFileOrUntitled);
        }));
    }
    focus() {
        super.focus();
        this.list?.domFocus();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.list?.layout(height, width);
    }
    get showGroups() {
        return this.editorGroupService.groups.length > 1;
    }
    getElements() {
        this.elements = [];
        this.editorGroupService.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */).forEach(g => {
            if (this.showGroups) {
                this.elements.push(g);
            }
            let editors = g.editors.map(ei => new OpenEditor(ei, g));
            if (this.sortOrder === 'alphabetical') {
                editors = editors.sort((first, second) => compareFileNamesDefault(first.editor.getName(), second.editor.getName()));
            }
            else if (this.sortOrder === 'fullPath') {
                editors = editors.sort((first, second) => {
                    const firstResource = first.editor.resource;
                    const secondResource = second.editor.resource;
                    //put 'system' editors before everything
                    if (firstResource === undefined && secondResource === undefined) {
                        return compareFileNamesDefault(first.editor.getName(), second.editor.getName());
                    }
                    else if (firstResource === undefined) {
                        return -1;
                    }
                    else if (secondResource === undefined) {
                        return 1;
                    }
                    else {
                        const firstScheme = firstResource.scheme;
                        const secondScheme = secondResource.scheme;
                        //put non-file editors before files
                        if (firstScheme !== Schemas.file && secondScheme !== Schemas.file) {
                            return extUriIgnorePathCase.compare(firstResource, secondResource);
                        }
                        else if (firstScheme !== Schemas.file) {
                            return -1;
                        }
                        else if (secondScheme !== Schemas.file) {
                            return 1;
                        }
                        else {
                            return extUriIgnorePathCase.compare(firstResource, secondResource);
                        }
                    }
                });
            }
            this.elements.push(...editors);
        });
        return this.elements;
    }
    getIndex(group, editor) {
        if (!editor) {
            return this.elements.findIndex(e => !(e instanceof OpenEditor) && e.id === group.id);
        }
        return this.elements.findIndex(e => e instanceof OpenEditor && e.editor === editor && e.group.id === group.id);
    }
    openEditor(element, options) {
        if (element) {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: 'workbench.files.openFile', from: 'openEditors' });
            const preserveActivateGroup = options.sideBySide && options.preserveFocus; // needed for https://github.com/microsoft/vscode/issues/42399
            if (!preserveActivateGroup) {
                this.editorGroupService.activateGroup(element.group); // needed for https://github.com/microsoft/vscode/issues/6672
            }
            const targetGroup = options.sideBySide ? this.editorGroupService.sideGroup : element.group;
            targetGroup.openEditor(element.editor, options);
        }
    }
    onListContextMenu(e) {
        if (!e.element) {
            return;
        }
        const element = e.element;
        this.contextMenuService.showContextMenu({
            menuId: MenuId.OpenEditorsContext,
            menuActionOptions: { shouldForwardArgs: true, arg: element instanceof OpenEditor ? EditorResourceAccessor.getOriginalUri(element.editor) : {} },
            contextKeyService: this.list?.contextKeyService,
            getAnchor: () => e.anchor,
            getActionsContext: () => element instanceof OpenEditor ? { groupId: element.groupId, editorIndex: element.group.getIndexOfEditor(element.editor) } : { groupId: element.id }
        });
    }
    withActiveEditorFocusTrackingDisabled(fn) {
        this.blockFocusActiveEditorTracking = true;
        try {
            fn();
        }
        finally {
            this.blockFocusActiveEditorTracking = false;
        }
    }
    focusActiveEditor() {
        if (!this.list || this.blockFocusActiveEditorTracking) {
            return;
        }
        if (this.list.length && this.editorGroupService.activeGroup) {
            const index = this.getIndex(this.editorGroupService.activeGroup, this.editorGroupService.activeGroup.activeEditor);
            if (index >= 0) {
                try {
                    this.list.setFocus([index]);
                    this.list.setSelection([index]);
                    this.list.reveal(index);
                }
                catch (e) {
                    // noop list updated in the meantime
                }
                return;
            }
        }
        this.list.setFocus([]);
        this.list.setSelection([]);
    }
    onConfigurationChange(event) {
        if (event.affectsConfiguration('explorer.openEditors')) {
            this.updateSize();
        }
        // Trigger a 'repaint' when decoration settings change or the sort order changed
        if (event.affectsConfiguration('explorer.decorations') || event.affectsConfiguration('explorer.openEditors.sortOrder')) {
            this.sortOrder = this.configurationService.getValue('explorer.openEditors.sortOrder');
            if (this.dnd) {
                this.dnd.sortOrder = this.sortOrder;
            }
            this.listRefreshScheduler?.schedule();
        }
    }
    updateSize() {
        // Adjust expanded body size
        this.minimumBodySize = this.orientation === 0 /* Orientation.VERTICAL */ ? this.getMinExpandedBodySize() : 170;
        this.maximumBodySize = this.orientation === 0 /* Orientation.VERTICAL */ ? this.getMaxExpandedBodySize() : Number.POSITIVE_INFINITY;
    }
    updateDirtyIndicator(workingCopy) {
        if (workingCopy) {
            const gotDirty = workingCopy.isDirty();
            if (gotDirty && !(workingCopy.capabilities & 2 /* WorkingCopyCapabilities.Untitled */) && this.filesConfigurationService.hasShortAutoSaveDelay(workingCopy.resource)) {
                return; // do not indicate dirty of working copies that are auto saved after short delay
            }
        }
        const dirty = this.workingCopyService.dirtyCount;
        if (dirty === 0) {
            this.dirtyCountElement.classList.add('hidden');
        }
        else {
            this.dirtyCountElement.textContent = nls.localize('dirtyCounter', "{0} unsaved", dirty);
            this.dirtyCountElement.classList.remove('hidden');
        }
    }
    get elementCount() {
        return this.editorGroupService.groups.map(g => g.count)
            .reduce((first, second) => first + second, this.showGroups ? this.editorGroupService.groups.length : 0);
    }
    getMaxExpandedBodySize() {
        let minVisibleOpenEditors = this.configurationService.getValue('explorer.openEditors.minVisible');
        // If it's not a number setting it to 0 will result in dynamic resizing.
        if (typeof minVisibleOpenEditors !== 'number') {
            minVisibleOpenEditors = OpenEditorsView_1.DEFAULT_MIN_VISIBLE_OPEN_EDITORS;
        }
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        if (containerModel.visibleViewDescriptors.length <= 1) {
            return Number.POSITIVE_INFINITY;
        }
        return (Math.max(this.elementCount, minVisibleOpenEditors)) * OpenEditorsDelegate.ITEM_HEIGHT;
    }
    getMinExpandedBodySize() {
        let visibleOpenEditors = this.configurationService.getValue('explorer.openEditors.visible');
        if (typeof visibleOpenEditors !== 'number') {
            visibleOpenEditors = OpenEditorsView_1.DEFAULT_VISIBLE_OPEN_EDITORS;
        }
        return this.computeMinExpandedBodySize(visibleOpenEditors);
    }
    computeMinExpandedBodySize(visibleOpenEditors = OpenEditorsView_1.DEFAULT_VISIBLE_OPEN_EDITORS) {
        const itemsToShow = Math.min(Math.max(visibleOpenEditors, 1), this.elementCount);
        return itemsToShow * OpenEditorsDelegate.ITEM_HEIGHT;
    }
    setStructuralRefreshDelay(delay) {
        this.structuralRefreshDelay = delay;
    }
    getOptimalWidth() {
        if (!this.list) {
            return super.getOptimalWidth();
        }
        const parentNode = this.list.getHTMLElement();
        const childNodes = [].slice.call(parentNode.querySelectorAll('.open-editor > a'));
        return dom.getLargestChildWidth(parentNode, childNodes);
    }
};
OpenEditorsView = OpenEditorsView_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IViewDescriptorService),
    __param(3, IContextMenuService),
    __param(4, IEditorGroupsService),
    __param(5, IConfigurationService),
    __param(6, IKeybindingService),
    __param(7, IContextKeyService),
    __param(8, IThemeService),
    __param(9, ITelemetryService),
    __param(10, IHoverService),
    __param(11, IWorkingCopyService),
    __param(12, IFilesConfigurationService),
    __param(13, IOpenerService),
    __param(14, IFileService)
], OpenEditorsView);
export { OpenEditorsView };
class OpenEditorActionRunner extends ActionRunner {
    async run(action) {
        if (!this.editor) {
            return;
        }
        return super.run(action, { groupId: this.editor.groupId, editorIndex: this.editor.group.getIndexOfEditor(this.editor.editor) });
    }
}
class OpenEditorsDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(_element) {
        return OpenEditorsDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (element instanceof OpenEditor) {
            return OpenEditorRenderer.ID;
        }
        return EditorGroupRenderer.ID;
    }
}
class EditorGroupRenderer {
    static { this.ID = 'editorgroup'; }
    constructor(keybindingService, instantiationService) {
        this.keybindingService = keybindingService;
        this.instantiationService = instantiationService;
        // noop
    }
    get templateId() {
        return EditorGroupRenderer.ID;
    }
    renderTemplate(container) {
        const editorGroupTemplate = Object.create(null);
        editorGroupTemplate.root = dom.append(container, $('.editor-group'));
        editorGroupTemplate.name = dom.append(editorGroupTemplate.root, $('span.name'));
        editorGroupTemplate.actionBar = new ActionBar(container);
        const saveAllInGroupAction = this.instantiationService.createInstance(SaveAllInGroupAction, SaveAllInGroupAction.ID, SaveAllInGroupAction.LABEL);
        const saveAllInGroupKey = this.keybindingService.lookupKeybinding(saveAllInGroupAction.id);
        editorGroupTemplate.actionBar.push(saveAllInGroupAction, { icon: true, label: false, keybinding: saveAllInGroupKey ? saveAllInGroupKey.getLabel() : undefined });
        const closeGroupAction = this.instantiationService.createInstance(CloseGroupAction, CloseGroupAction.ID, CloseGroupAction.LABEL);
        const closeGroupActionKey = this.keybindingService.lookupKeybinding(closeGroupAction.id);
        editorGroupTemplate.actionBar.push(closeGroupAction, { icon: true, label: false, keybinding: closeGroupActionKey ? closeGroupActionKey.getLabel() : undefined });
        return editorGroupTemplate;
    }
    renderElement(editorGroup, _index, templateData) {
        templateData.editorGroup = editorGroup;
        templateData.name.textContent = editorGroup.label;
        templateData.actionBar.context = { groupId: editorGroup.id };
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
}
class OpenEditorRenderer {
    static { this.ID = 'openeditor'; }
    constructor(labels, instantiationService, keybindingService, configurationService) {
        this.labels = labels;
        this.instantiationService = instantiationService;
        this.keybindingService = keybindingService;
        this.configurationService = configurationService;
        this.closeEditorAction = this.instantiationService.createInstance(CloseEditorAction, CloseEditorAction.ID, CloseEditorAction.LABEL);
        this.unpinEditorAction = this.instantiationService.createInstance(UnpinEditorAction, UnpinEditorAction.ID, UnpinEditorAction.LABEL);
        // noop
    }
    get templateId() {
        return OpenEditorRenderer.ID;
    }
    renderTemplate(container) {
        const editorTemplate = Object.create(null);
        editorTemplate.container = container;
        editorTemplate.actionRunner = new OpenEditorActionRunner();
        editorTemplate.actionBar = new ActionBar(container, { actionRunner: editorTemplate.actionRunner });
        editorTemplate.root = this.labels.create(container);
        return editorTemplate;
    }
    renderElement(openedEditor, _index, templateData) {
        const editor = openedEditor.editor;
        templateData.actionRunner.editor = openedEditor;
        templateData.container.classList.toggle('dirty', editor.isDirty() && !editor.isSaving());
        templateData.container.classList.toggle('sticky', openedEditor.isSticky());
        templateData.root.setResource({
            resource: EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.BOTH }),
            name: editor.getName(),
            description: editor.getDescription(1 /* Verbosity.MEDIUM */)
        }, {
            italic: openedEditor.isPreview(),
            extraClasses: ['open-editor'].concat(openedEditor.editor.getLabelExtraClasses()),
            fileDecorations: this.configurationService.getValue().explorer.decorations,
            title: editor.getTitle(2 /* Verbosity.LONG */),
            icon: editor.getIcon()
        });
        const editorAction = openedEditor.isSticky() ? this.unpinEditorAction : this.closeEditorAction;
        if (!templateData.actionBar.hasAction(editorAction)) {
            if (!templateData.actionBar.isEmpty()) {
                templateData.actionBar.clear();
            }
            templateData.actionBar.push(editorAction, { icon: true, label: false, keybinding: this.keybindingService.lookupKeybinding(editorAction.id)?.getLabel() });
        }
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
        templateData.root.dispose();
        templateData.actionRunner.dispose();
    }
}
class OpenEditorsDragAndDrop {
    set sortOrder(value) {
        this._sortOrder = value;
    }
    constructor(sortOrder, instantiationService, editorGroupService) {
        this.instantiationService = instantiationService;
        this.editorGroupService = editorGroupService;
        this._sortOrder = sortOrder;
    }
    get dropHandler() {
        return this.instantiationService.createInstance(ResourcesDropHandler, { allowWorkspaceOpen: false });
    }
    getDragURI(element) {
        if (element instanceof OpenEditor) {
            const resource = element.getResource();
            if (resource) {
                return resource.toString();
            }
        }
        return null;
    }
    getDragLabel(elements) {
        if (elements.length > 1) {
            return String(elements.length);
        }
        const element = elements[0];
        return element instanceof OpenEditor ? element.editor.getName() : element.label;
    }
    onDragStart(data, originalEvent) {
        const items = data.elements;
        const editors = [];
        if (items) {
            for (const item of items) {
                if (item instanceof OpenEditor) {
                    editors.push(item);
                }
            }
        }
        if (editors.length) {
            // Apply some datatransfer types to allow for dragging the element outside of the application
            this.instantiationService.invokeFunction(fillEditorsDragData, editors, originalEvent);
        }
    }
    onDragOver(data, _targetElement, _targetIndex, targetSector, originalEvent) {
        if (data instanceof NativeDragAndDropData) {
            if (!containsDragType(originalEvent, DataTransfers.FILES, CodeDataTransfers.FILES)) {
                return false;
            }
        }
        if (this._sortOrder !== 'editorOrder') {
            if (data instanceof ElementsDragAndDropData) {
                // No reordering supported when sorted
                return false;
            }
            else {
                // Allow droping files to open them
                return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */ }, feedback: [-1] };
            }
        }
        let dropEffectPosition = undefined;
        switch (targetSector) {
            case 0 /* ListViewTargetSector.TOP */:
            case 1 /* ListViewTargetSector.CENTER_TOP */:
                dropEffectPosition = (_targetIndex === 0 && _targetElement instanceof EditorGroupView) ? "drop-target-after" /* ListDragOverEffectPosition.After */ : "drop-target-before" /* ListDragOverEffectPosition.Before */;
                break;
            case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
            case 3 /* ListViewTargetSector.BOTTOM */:
                dropEffectPosition = "drop-target-after" /* ListDragOverEffectPosition.After */;
                break;
        }
        return { accept: true, effect: { type: 1 /* ListDragOverEffectType.Move */, position: dropEffectPosition }, feedback: [_targetIndex] };
    }
    drop(data, targetElement, _targetIndex, targetSector, originalEvent) {
        let group = targetElement instanceof OpenEditor ? targetElement.group : targetElement || this.editorGroupService.groups[this.editorGroupService.count - 1];
        let targetEditorIndex = targetElement instanceof OpenEditor ? targetElement.group.getIndexOfEditor(targetElement.editor) : 0;
        switch (targetSector) {
            case 0 /* ListViewTargetSector.TOP */:
            case 1 /* ListViewTargetSector.CENTER_TOP */:
                if (targetElement instanceof EditorGroupView && group.index !== 0) {
                    group = this.editorGroupService.groups[group.index - 1];
                    targetEditorIndex = group.count;
                }
                break;
            case 3 /* ListViewTargetSector.BOTTOM */:
            case 2 /* ListViewTargetSector.CENTER_BOTTOM */:
                if (targetElement instanceof OpenEditor) {
                    targetEditorIndex++;
                }
                break;
        }
        if (data instanceof ElementsDragAndDropData) {
            for (const oe of data.elements) {
                const sourceEditorIndex = oe.group.getIndexOfEditor(oe.editor);
                if (oe.group === group && sourceEditorIndex < targetEditorIndex) {
                    targetEditorIndex--;
                }
                oe.group.moveEditor(oe.editor, group, { index: targetEditorIndex, preserveFocus: true });
                targetEditorIndex++;
            }
            this.editorGroupService.activateGroup(group);
        }
        else {
            this.dropHandler.handleDrop(originalEvent, mainWindow, () => group, () => group.focus(), { index: targetEditorIndex });
        }
    }
    dispose() { }
}
__decorate([
    memoize
], OpenEditorsDragAndDrop.prototype, "dropHandler", null);
class OpenEditorsAccessibilityProvider {
    getWidgetAriaLabel() {
        return nls.localize('openEditors', "Open Editors");
    }
    getAriaLabel(element) {
        if (element instanceof OpenEditor) {
            return `${element.editor.getName()}, ${element.editor.getDescription()}`;
        }
        return element.ariaLabel;
    }
}
const toggleEditorGroupLayoutId = 'workbench.action.toggleEditorGroupLayout';
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleEditorGroupLayout',
            title: nls.localize2('flipLayout', "Toggle Vertical/Horizontal Editor Layout"),
            f1: true,
            keybinding: {
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 21 /* KeyCode.Digit0 */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 21 /* KeyCode.Digit0 */ },
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            icon: Codicon.editorLayout,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', OpenEditorsView.ID), MultipleEditorGroupsContext),
                order: 10
            }
        });
    }
    async run(accessor) {
        const editorGroupService = accessor.get(IEditorGroupsService);
        const newOrientation = (editorGroupService.orientation === 1 /* GroupOrientation.VERTICAL */) ? 0 /* GroupOrientation.HORIZONTAL */ : 1 /* GroupOrientation.VERTICAL */;
        editorGroupService.setGroupOrientation(newOrientation);
        editorGroupService.activeGroup.focus();
    }
});
MenuRegistry.appendMenuItem(MenuId.MenubarLayoutMenu, {
    group: '5_flip',
    command: {
        id: toggleEditorGroupLayoutId,
        title: {
            ...nls.localize2('miToggleEditorLayoutWithoutMnemonic', "Flip Layout"),
            mnemonicTitle: nls.localize({ key: 'miToggleEditorLayout', comment: ['&& denotes a mnemonic'] }, "Flip &&Layout")
        }
    },
    order: 1
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.files.saveAll',
            title: SAVE_ALL_LABEL,
            f1: true,
            icon: Codicon.saveAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', OpenEditorsView.ID),
                order: 20
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(SAVE_ALL_COMMAND_ID);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'openEditors.closeAll',
            title: CloseAllEditorsAction.LABEL,
            f1: false,
            icon: Codicon.closeAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', OpenEditorsView.ID),
                order: 30
            }
        });
    }
    async run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        const closeAll = new CloseAllEditorsAction();
        await instantiationService.invokeFunction(accessor => closeAll.run(accessor));
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'openEditors.newUntitledFile',
            title: nls.localize2('newUntitledFile', "New Untitled Text File"),
            f1: false,
            icon: Codicon.newFile,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', OpenEditorsView.ID),
                order: 5
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(NEW_UNTITLED_FILE_COMMAND_ID);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkVkaXRvcnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci92aWV3cy9vcGVuRWRpdG9yc1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8seUJBQXlCLENBQUM7QUFDakMsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQVcsWUFBWSxFQUF1RSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25KLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxvQkFBb0IsRUFBK0MsTUFBTSwyREFBMkQsQ0FBQztBQUM5SSxPQUFPLEVBQUUscUJBQXFCLEVBQTZCLE1BQU0sK0RBQStELENBQUM7QUFDakksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFhLHNCQUFzQixFQUFFLGdCQUFnQixFQUEyQyxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRW5MLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxzQkFBc0IsRUFBdUIsVUFBVSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDM0gsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGlCQUFpQixF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