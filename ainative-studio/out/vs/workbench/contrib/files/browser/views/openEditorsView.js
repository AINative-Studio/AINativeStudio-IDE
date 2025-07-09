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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkVkaXRvcnNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL2Jyb3dzZXIvdmlld3Mvb3BlbkVkaXRvcnNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHlCQUF5QixDQUFDO0FBQ2pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUM7QUFDN0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFXLFlBQVksRUFBdUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuSixPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsb0JBQW9CLEVBQStDLE1BQU0sMkRBQTJELENBQUM7QUFDOUksT0FBTyxFQUFFLHFCQUFxQixFQUE2QixNQUFNLCtEQUErRCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBYSxzQkFBc0IsRUFBRSxnQkFBZ0IsRUFBMkMsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVuTCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsc0JBQXNCLEVBQXVCLFVBQVUsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzNILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hJLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVwRixPQUFPLEVBQUUsY0FBYyxFQUFrQixNQUFNLCtCQUErQixDQUFDO0FBQy9FLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsYUFBYSxFQUFlLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsdUJBQXVCLEVBQUUsZ0NBQWdDLEVBQUUsY0FBYyxFQUFFLG1CQUFtQixFQUFFLDRCQUE0QixFQUFFLHdDQUF3QyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDNU8sT0FBTyxFQUFFLGtCQUFrQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXZFLE9BQU8sRUFBb0IsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSx1QkFBdUIsRUFBd0IscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN2SSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUVwRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUN6SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFHakYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTdFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFFVCxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLFFBQVE7O2FBRXBCLGlDQUE0QixHQUFHLENBQUMsQUFBSixDQUFLO2FBQ2pDLHFDQUFnQyxHQUFHLENBQUMsQUFBSixDQUFLO2FBQzdDLE9BQUUsR0FBRyxvQ0FBb0MsQUFBdkMsQ0FBd0M7YUFDMUMsU0FBSSxHQUFxQixHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsY0FBYyxDQUFDLEFBQTdHLENBQThHO0lBYWxJLFlBQ0MsT0FBNEIsRUFDTCxvQkFBMkMsRUFDMUMscUJBQTZDLEVBQ2hELGtCQUF1QyxFQUN0QyxrQkFBeUQsRUFDeEQsb0JBQTJDLEVBQzlDLGlCQUFxQyxFQUNyQyxpQkFBcUMsRUFDMUMsWUFBMkIsRUFDdkIsZ0JBQW9ELEVBQ3hELFlBQTJCLEVBQ3JCLGtCQUF3RCxFQUNqRCx5QkFBc0UsRUFDbEYsYUFBNkIsRUFDL0IsV0FBMEM7UUFFeEQsS0FBSyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0IsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBWmhKLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBc0I7UUFLM0MscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUVqQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ2hDLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBNEI7UUFFbkUsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFwQmpELGlCQUFZLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLGFBQVEsR0FBa0MsRUFBRSxDQUFDO1FBRTdDLG1DQUE4QixHQUFHLEtBQUssQ0FBQztRQXFCOUMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsU0FBUyxHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBRWpGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBRTVCLG9DQUFvQztRQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkcsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqSCxDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtZQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN6QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztnQkFDekIsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ2xFLENBQUMsQ0FBQztRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBVSxDQUFDLENBQUM7UUFDckUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEtBQW1CLEVBQUUsRUFBRTtZQUNoRCxNQUFNLHdCQUF3QixHQUFHLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDM0QsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQztvQkFDOUMsT0FBTztnQkFDUixDQUFDO2dCQUNELElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3pDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO29CQUN6QixPQUFPO2dCQUNSLENBQUM7Z0JBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDaEI7d0JBQ0MsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7d0JBQ3pCLE1BQU07b0JBQ1AsOENBQXNDO29CQUN0Qzt3QkFDQyxJQUFJLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQzs0QkFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ3JDLENBQUM7d0JBQ0QsTUFBTTtvQkFDUCxnREFBdUM7b0JBQ3ZDLGlEQUF3QztvQkFDeEMsdURBQThDO29CQUM5Qyw4Q0FBcUM7b0JBQ3JDO3dCQUNDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDL0QsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7d0JBQ3pCLE1BQU07b0JBQ1AsOENBQXNDO29CQUN0Qyw4Q0FBc0M7b0JBQ3RDO3dCQUNDLGVBQWUsRUFBRSxDQUFDO3dCQUNsQixNQUFNO2dCQUNSLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQztZQUNILGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM1RCxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN4QixlQUFlLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ0osSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDL0QsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLGVBQWUsRUFBRSxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRWtCLGlCQUFpQixDQUFDLFNBQXNCO1FBQzFELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRS9DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7UUFFdEYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzlFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxhQUFhLGFBQWEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1FBRW5GLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFa0IsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFNUIsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDeEMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUUzQyxNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFFM0MsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3JCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFMUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEksSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRTtZQUN2RyxJQUFJLG1CQUFtQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUM7WUFDMUUsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1NBQ3JILEVBQUU7WUFDRixnQkFBZ0IsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLE9BQWtDLEVBQUUsRUFBRSxDQUFDLE9BQU8sWUFBWSxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUM1SSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixjQUFjLEVBQUUsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsa0JBQWtCO1lBQ2hFLHFCQUFxQixFQUFFLElBQUksZ0NBQWdDLEVBQUU7U0FDN0QsQ0FBNkMsQ0FBQztRQUMvQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVoQyxpQ0FBaUM7UUFDakMsSUFBSSxvQkFBb0IsR0FBa0IsRUFBRSxDQUFDO1FBQzdDLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQ3BFLG1EQUFtRDtZQUNuRCxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoQixPQUFPO1lBQ1IsQ0FBQztZQUNELG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3JELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ3hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDaEQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDekIsSUFBSSxjQUFjLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ25CLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLEtBQUssQ0FBQztZQUUxQixJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssY0FBYyxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ3hFLHlEQUF5RDtnQkFDekQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDcEIsSUFBSSxDQUFDLFlBQVksVUFBVSxFQUFFLENBQUM7d0JBQzdCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ25HLENBQUM7Z0JBQ0YsQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7UUFFakMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRWxCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXhFLG1DQUFtQztRQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sWUFBWSxVQUFVLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQ3pILE9BQU87Z0JBQ1IsQ0FBQztnQkFFRCxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUN4RSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUMxQixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2QsT0FBTztZQUNSLENBQUM7aUJBQU0sSUFBSSxPQUFPLFlBQVksVUFBVSxFQUFFLENBQUM7Z0JBQzFDLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3JFLE9BQU8sQ0FBQyx3REFBd0Q7Z0JBQ2pFLENBQUM7Z0JBRUQsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLEdBQUcsRUFBRTtvQkFDL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztnQkFDdEksQ0FBQyxDQUFDLENBQUM7WUFDSixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLEdBQUcsRUFBRTtvQkFDL0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDL0MsSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLENBQUM7d0JBQ3BDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDakIsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUN2RCxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUUsQ0FBRSxDQUFDO1FBQ3hJLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRTtZQUNoRSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxpQkFBaUI7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPO1FBQ1IsQ0FBQztRQUVELG9CQUFvQjtRQUNwQix5QkFBeUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzlELHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFM0QsTUFBTSxtQkFBbUIsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbkYsTUFBTSx5QkFBeUIsR0FBRyw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDL0YsTUFBTSw0QkFBNEIsR0FBRyxnQ0FBZ0MsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDckcsTUFBTSx3Q0FBd0MsR0FBRyx3Q0FBd0MsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFekgsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JGLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzdDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUN4QixtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM1Qix5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQyw0QkFBNEIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUVyQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQzlELElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO2dCQUNuQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3ZDLHlCQUF5QixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUN0Riw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztnQkFDaEUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLENBQUM7WUFDdkMsQ0FBQztpQkFBTSxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsbUJBQW1CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2pELE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3RELElBQUksQ0FBQyxZQUFZLFVBQVUsRUFBRSxDQUFDO29CQUM3QixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ2pDLE9BQU8sUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JHLENBQUM7Z0JBQ0QsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztZQUNILHdDQUF3QyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRVEsS0FBSztRQUNiLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVkLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVrQixVQUFVLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDMUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFZLFVBQVU7UUFDckIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMscUNBQTZCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzFFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2QixDQUFDO1lBQ0QsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6RCxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssY0FBYyxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNySCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDMUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7b0JBQ3hDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO29CQUM1QyxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQztvQkFDOUMsd0NBQXdDO29CQUN4QyxJQUFJLGFBQWEsS0FBSyxTQUFTLElBQUksY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO3dCQUNqRSxPQUFPLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO29CQUNqRixDQUFDO3lCQUFNLElBQUksYUFBYSxLQUFLLFNBQVMsRUFBRSxDQUFDO3dCQUN4QyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUNYLENBQUM7eUJBQU0sSUFBSSxjQUFjLEtBQUssU0FBUyxFQUFFLENBQUM7d0JBQ3pDLE9BQU8sQ0FBQyxDQUFDO29CQUNWLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO3dCQUN6QyxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDO3dCQUMzQyxtQ0FBbUM7d0JBQ25DLElBQUksV0FBVyxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksWUFBWSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs0QkFDbkUsT0FBTyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO3dCQUNwRSxDQUFDOzZCQUFNLElBQUksV0FBVyxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs0QkFDekMsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDWCxDQUFDOzZCQUFNLElBQUksWUFBWSxLQUFLLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQzs0QkFDMUMsT0FBTyxDQUFDLENBQUM7d0JBQ1YsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLE9BQU8sb0JBQW9CLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQzt3QkFDcEUsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztZQUNELElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdEIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxLQUFtQixFQUFFLE1BQXNDO1FBQzNFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLFVBQVUsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEgsQ0FBQztJQUVPLFVBQVUsQ0FBQyxPQUFtQixFQUFFLE9BQTRFO1FBQ25ILElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFzRSx5QkFBeUIsRUFBRSxFQUFFLEVBQUUsRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztZQUUxTCxNQUFNLHFCQUFxQixHQUFHLE9BQU8sQ0FBQyxVQUFVLElBQUksT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLDhEQUE4RDtZQUN6SSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyw2REFBNkQ7WUFDcEgsQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7WUFDM0YsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCLENBQUMsQ0FBbUQ7UUFDNUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNoQixPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFFMUIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQztZQUN2QyxNQUFNLEVBQUUsTUFBTSxDQUFDLGtCQUFrQjtZQUNqQyxpQkFBaUIsRUFBRSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxZQUFZLFVBQVUsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQy9JLGlCQUFpQixFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCO1lBQy9DLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTTtZQUN6QixpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLFlBQVksVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFO1NBQzVLLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyxxQ0FBcUMsQ0FBQyxFQUFjO1FBQzNELElBQUksQ0FBQyw4QkFBOEIsR0FBRyxJQUFJLENBQUM7UUFDM0MsSUFBSSxDQUFDO1lBQ0osRUFBRSxFQUFFLENBQUM7UUFDTixDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsOEJBQThCLEdBQUcsS0FBSyxDQUFDO1FBQzdDLENBQUM7SUFDRixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxDQUFDO1lBQ3ZELE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDN0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkgsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQztvQkFDSixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDaEMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3pCLENBQUM7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDWixvQ0FBb0M7Z0JBQ3JDLENBQUM7Z0JBQ0QsT0FBTztZQUNSLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUIsQ0FBQztJQUVPLHFCQUFxQixDQUFDLEtBQWdDO1FBQzdELElBQUksS0FBSyxDQUFDLG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbkIsQ0FBQztRQUNELGdGQUFnRjtRQUNoRixJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFLENBQUM7WUFDeEgsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7WUFDdEYsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNyQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxDQUFDO1FBQ3ZDLENBQUM7SUFDRixDQUFDO0lBRU8sVUFBVTtRQUNqQiw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsV0FBVyxpQ0FBeUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN2RyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxXQUFXLGlDQUF5QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDO0lBQzdILENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxXQUEwQjtRQUN0RCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sUUFBUSxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QyxJQUFJLFFBQVEsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksMkNBQW1DLENBQUMsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzlKLE9BQU8sQ0FBQyxnRkFBZ0Y7WUFDekYsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDO1FBQ2pELElBQUksS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7YUFDckQsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUcsQ0FBQztJQUVPLHNCQUFzQjtRQUM3QixJQUFJLHFCQUFxQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsaUNBQWlDLENBQUMsQ0FBQztRQUMxRyx3RUFBd0U7UUFDeEUsSUFBSSxPQUFPLHFCQUFxQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9DLHFCQUFxQixHQUFHLGlCQUFlLENBQUMsZ0NBQWdDLENBQUM7UUFDMUUsQ0FBQztRQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxDQUFFLENBQUM7UUFDeEksSUFBSSxjQUFjLENBQUMsc0JBQXNCLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3ZELE9BQU8sTUFBTSxDQUFDLGlCQUFpQixDQUFDO1FBQ2pDLENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUMsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUM7SUFDL0YsQ0FBQztJQUVPLHNCQUFzQjtRQUM3QixJQUFJLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsOEJBQThCLENBQUMsQ0FBQztRQUNwRyxJQUFJLE9BQU8sa0JBQWtCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDNUMsa0JBQWtCLEdBQUcsaUJBQWUsQ0FBQyw0QkFBNEIsQ0FBQztRQUNuRSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRU8sMEJBQTBCLENBQUMsa0JBQWtCLEdBQUcsaUJBQWUsQ0FBQyw0QkFBNEI7UUFDbkcsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNqRixPQUFPLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUM7SUFDdEQsQ0FBQztJQUVELHlCQUF5QixDQUFDLEtBQWE7UUFDdEMsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQztJQUNyQyxDQUFDO0lBRVEsZUFBZTtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ2hDLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzlDLE1BQU0sVUFBVSxHQUFrQixFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBRWpHLE9BQU8sR0FBRyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN6RCxDQUFDOztBQXhlVyxlQUFlO0lBb0J6QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLG9CQUFvQixDQUFBO0lBQ3BCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixZQUFBLGFBQWEsQ0FBQTtJQUNiLFlBQUEsbUJBQW1CLENBQUE7SUFDbkIsWUFBQSwwQkFBMEIsQ0FBQTtJQUMxQixZQUFBLGNBQWMsQ0FBQTtJQUNkLFlBQUEsWUFBWSxDQUFBO0dBakNGLGVBQWUsQ0F5ZTNCOztBQWdCRCxNQUFNLHNCQUF1QixTQUFRLFlBQVk7SUFHdkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFlO1FBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsT0FBTztRQUNSLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNqSSxDQUFDO0NBQ0Q7QUFFRCxNQUFNLG1CQUFtQjthQUVELGdCQUFXLEdBQUcsRUFBRSxDQUFDO0lBRXhDLFNBQVMsQ0FBQyxRQUFtQztRQUM1QyxPQUFPLG1CQUFtQixDQUFDLFdBQVcsQ0FBQztJQUN4QyxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQWtDO1FBQy9DLElBQUksT0FBTyxZQUFZLFVBQVUsRUFBRSxDQUFDO1lBQ25DLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxDQUFDO1FBQzlCLENBQUM7UUFFRCxPQUFPLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztJQUMvQixDQUFDOztBQUdGLE1BQU0sbUJBQW1CO2FBQ1IsT0FBRSxHQUFHLGFBQWEsQ0FBQztJQUVuQyxZQUNTLGlCQUFxQyxFQUNyQyxvQkFBMkM7UUFEM0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBRW5ELE9BQU87SUFDUixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVELGNBQWMsQ0FBQyxTQUFzQjtRQUNwQyxNQUFNLG1CQUFtQixHQUE2QixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFFLG1CQUFtQixDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNyRSxtQkFBbUIsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDaEYsbUJBQW1CLENBQUMsU0FBUyxHQUFHLElBQUksU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXpELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLEVBQUUsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakosTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDM0YsbUJBQW1CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRWpLLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDakksTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekYsbUJBQW1CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRWpLLE9BQU8sbUJBQW1CLENBQUM7SUFDNUIsQ0FBQztJQUVELGFBQWEsQ0FBQyxXQUF5QixFQUFFLE1BQWMsRUFBRSxZQUFzQztRQUM5RixZQUFZLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUN2QyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBQ2xELFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0lBRUQsZUFBZSxDQUFDLFlBQXNDO1FBQ3JELFlBQVksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbEMsQ0FBQzs7QUFHRixNQUFNLGtCQUFrQjthQUNQLE9BQUUsR0FBRyxZQUFZLEFBQWYsQ0FBZ0I7SUFLbEMsWUFDUyxNQUFzQixFQUN0QixvQkFBMkMsRUFDM0MsaUJBQXFDLEVBQ3JDLG9CQUEyQztRQUgzQyxXQUFNLEdBQU4sTUFBTSxDQUFnQjtRQUN0Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQVBuQyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvSCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQVEvSSxPQUFPO0lBQ1IsQ0FBQztJQUVELElBQUksVUFBVTtRQUNiLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxjQUFjLEdBQTRCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEUsY0FBYyxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDckMsY0FBYyxDQUFDLFlBQVksR0FBRyxJQUFJLHNCQUFzQixFQUFFLENBQUM7UUFDM0QsY0FBYyxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDbkcsY0FBYyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVwRCxPQUFPLGNBQWMsQ0FBQztJQUN2QixDQUFDO0lBRUQsYUFBYSxDQUFDLFlBQXdCLEVBQUUsTUFBYyxFQUFFLFlBQXFDO1FBQzVGLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFDbkMsWUFBWSxDQUFDLFlBQVksQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO1FBQ2hELFlBQVksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDekYsWUFBWSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRSxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUM3QixRQUFRLEVBQUUsc0JBQXNCLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JHLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxFQUFFO1lBQ3RCLFdBQVcsRUFBRSxNQUFNLENBQUMsY0FBYywwQkFBa0I7U0FDcEQsRUFBRTtZQUNGLE1BQU0sRUFBRSxZQUFZLENBQUMsU0FBUyxFQUFFO1lBQ2hDLFlBQVksRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDaEYsZUFBZSxFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLEVBQXVCLENBQUMsUUFBUSxDQUFDLFdBQVc7WUFDL0YsS0FBSyxFQUFFLE1BQU0sQ0FBQyxRQUFRLHdCQUFnQjtZQUN0QyxJQUFJLEVBQUUsTUFBTSxDQUFDLE9BQU8sRUFBRTtTQUN0QixDQUFDLENBQUM7UUFDSCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1FBQy9GLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQ3JELElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3ZDLFlBQVksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEMsQ0FBQztZQUNELFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDM0osQ0FBQztJQUNGLENBQUM7SUFFRCxlQUFlLENBQUMsWUFBcUM7UUFDcEQsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLFlBQVksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDckMsQ0FBQzs7QUFHRixNQUFNLHNCQUFzQjtJQUczQixJQUFXLFNBQVMsQ0FBQyxLQUFrRDtRQUN0RSxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztJQUN6QixDQUFDO0lBRUQsWUFDQyxTQUFzRCxFQUM5QyxvQkFBMkMsRUFDM0Msa0JBQXdDO1FBRHhDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUVoRCxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztJQUM3QixDQUFDO0lBRVEsSUFBWSxXQUFXO1FBQy9CLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLGtCQUFrQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDdEcsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUFrQztRQUM1QyxJQUFJLE9BQU8sWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkMsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDZCxPQUFPLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELFlBQVksQ0FBRSxRQUF1QztRQUNwRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUIsT0FBTyxPQUFPLFlBQVksVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBc0IsRUFBRSxhQUF3QjtRQUMzRCxNQUFNLEtBQUssR0FBSSxJQUEyRCxDQUFDLFFBQVEsQ0FBQztRQUNwRixNQUFNLE9BQU8sR0FBd0IsRUFBRSxDQUFDO1FBQ3hDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUMxQixJQUFJLElBQUksWUFBWSxVQUFVLEVBQUUsQ0FBQztvQkFDaEMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDcEIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEIsNkZBQTZGO1lBQzdGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVSxDQUFDLElBQXNCLEVBQUUsY0FBeUMsRUFBRSxZQUFvQixFQUFFLFlBQThDLEVBQUUsYUFBd0I7UUFDM0ssSUFBSSxJQUFJLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEYsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxhQUFhLEVBQUUsQ0FBQztZQUN2QyxJQUFJLElBQUksWUFBWSx1QkFBdUIsRUFBRSxDQUFDO2dCQUM3QyxzQ0FBc0M7Z0JBQ3RDLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLG1DQUFtQztnQkFDbkMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxxQ0FBNkIsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN4RixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksa0JBQWtCLEdBQTJDLFNBQVMsQ0FBQztRQUMzRSxRQUFRLFlBQVksRUFBRSxDQUFDO1lBQ3RCLHNDQUE4QjtZQUM5QjtnQkFDQyxrQkFBa0IsR0FBRyxDQUFDLFlBQVksS0FBSyxDQUFDLElBQUksY0FBYyxZQUFZLGVBQWUsQ0FBQyxDQUFDLENBQUMsNERBQWtDLENBQUMsNkRBQWtDLENBQUM7Z0JBQUMsTUFBTTtZQUN0SyxnREFBd0M7WUFDeEM7Z0JBQ0Msa0JBQWtCLDZEQUFtQyxDQUFDO2dCQUFDLE1BQU07UUFDL0QsQ0FBQztRQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLElBQUkscUNBQTZCLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztJQUNoSSxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQXNCLEVBQUUsYUFBb0QsRUFBRSxZQUFvQixFQUFFLFlBQThDLEVBQUUsYUFBd0I7UUFDaEwsSUFBSSxLQUFLLEdBQUcsYUFBYSxZQUFZLFVBQVUsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzSixJQUFJLGlCQUFpQixHQUFHLGFBQWEsWUFBWSxVQUFVLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFN0gsUUFBUSxZQUFZLEVBQUUsQ0FBQztZQUN0QixzQ0FBOEI7WUFDOUI7Z0JBQ0MsSUFBSSxhQUFhLFlBQVksZUFBZSxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25FLEtBQUssR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ3hELGlCQUFpQixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7Z0JBQ2pDLENBQUM7Z0JBQ0QsTUFBTTtZQUNQLHlDQUFpQztZQUNqQztnQkFDQyxJQUFJLGFBQWEsWUFBWSxVQUFVLEVBQUUsQ0FBQztvQkFDekMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztnQkFDRCxNQUFNO1FBQ1IsQ0FBQztRQUVELElBQUksSUFBSSxZQUFZLHVCQUF1QixFQUFFLENBQUM7WUFDN0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQy9ELElBQUksRUFBRSxDQUFDLEtBQUssS0FBSyxLQUFLLElBQUksaUJBQWlCLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztvQkFDakUsaUJBQWlCLEVBQUUsQ0FBQztnQkFDckIsQ0FBQztnQkFDRCxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDekYsaUJBQWlCLEVBQUUsQ0FBQztZQUNyQixDQUFDO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM5QyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDeEgsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLEtBQVcsQ0FBQztDQUNuQjtBQTFHUztJQUFSLE9BQU87eURBRVA7QUEwR0YsTUFBTSxnQ0FBZ0M7SUFFckMsa0JBQWtCO1FBQ2pCLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFlBQVksQ0FBQyxPQUFrQztRQUM5QyxJQUFJLE9BQU8sWUFBWSxVQUFVLEVBQUUsQ0FBQztZQUNuQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7UUFDMUUsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLHlCQUF5QixHQUFHLDBDQUEwQyxDQUFDO0FBQzdFLGVBQWUsQ0FBQyxLQUFNLFNBQVEsT0FBTztJQUNwQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQ0FBMEM7WUFDOUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLDBDQUEwQyxDQUFDO1lBQzlFLEVBQUUsRUFBRSxJQUFJO1lBQ1IsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSw4Q0FBeUIsMEJBQWlCO2dCQUNuRCxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsZ0RBQTJCLDBCQUFpQixFQUFFO2dCQUM5RCxNQUFNLDZDQUFtQzthQUN6QztZQUNELElBQUksRUFBRSxPQUFPLENBQUMsWUFBWTtZQUMxQixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUNwQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUFFLDJCQUEyQixDQUFDO2dCQUN4RyxLQUFLLEVBQUUsRUFBRTthQUNUO1NBQ0QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDOUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLHNDQUE4QixDQUFDLENBQUMsQ0FBQyxxQ0FBNkIsQ0FBQyxrQ0FBMEIsQ0FBQztRQUNoSixrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN2RCxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEMsQ0FBQztDQUNELENBQUMsQ0FBQztBQUVILFlBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFO0lBQ3JELEtBQUssRUFBRSxRQUFRO0lBQ2YsT0FBTyxFQUFFO1FBQ1IsRUFBRSxFQUFFLHlCQUF5QjtRQUM3QixLQUFLLEVBQUU7WUFDTixHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMscUNBQXFDLEVBQUUsYUFBYSxDQUFDO1lBQ3RFLGFBQWEsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLHNCQUFzQixFQUFFLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUM7U0FDakg7S0FDRDtJQUNELEtBQUssRUFBRSxDQUFDO0NBQ1IsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxLQUFLLEVBQUUsY0FBYztZQUNyQixFQUFFLEVBQUUsSUFBSTtZQUNSLElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztZQUNyQixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUNwQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELEtBQUssRUFBRSxFQUFFO2FBQ1Q7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsc0JBQXNCO1lBQzFCLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxLQUFLO1lBQ2xDLEVBQUUsRUFBRSxLQUFLO1lBQ1QsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQ3RCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQ3BCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDdkQsS0FBSyxFQUFFLEVBQUU7YUFDVDtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRWpFLE1BQU0sUUFBUSxHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQztRQUM3QyxNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsZUFBZSxDQUFDLEtBQU0sU0FBUSxPQUFPO0lBQ3BDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZCQUE2QjtZQUNqQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsRUFBRSx3QkFBd0IsQ0FBQztZQUNqRSxFQUFFLEVBQUUsS0FBSztZQUNULElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztZQUNyQixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUNwQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLGVBQWUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZELEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3JELE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQ25FLENBQUM7Q0FDRCxDQUFDLENBQUMifQ==