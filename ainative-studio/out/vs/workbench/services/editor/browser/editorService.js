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
var EditorService_1;
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SideBySideEditor, isEditorInputWithOptions, EditorResourceAccessor, isResourceDiffEditorInput, isResourceEditorInput, isEditorInput, isEditorInputWithOptionsAndGroup, isResourceMergeEditorInput } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { ResourceMap, ResourceSet } from '../../../../base/common/map.js';
import { IFileService, FileChangesEvent } from '../../../../platform/files/common/files.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { SideBySideEditor as SideBySideEditorPane } from '../../../browser/parts/editor/sideBySideEditor.js';
import { IEditorGroupsService, isEditorReplacement } from '../common/editorGroupsService.js';
import { IEditorService, isPreferredGroup } from '../common/editorService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Disposable, dispose, DisposableStore } from '../../../../base/common/lifecycle.js';
import { coalesce, distinct } from '../../../../base/common/arrays.js';
import { isCodeEditor, isDiffEditor, isCompositeEditor } from '../../../../editor/browser/editorBrowser.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { isUndefined } from '../../../../base/common/types.js';
import { EditorsObserver } from '../../../browser/parts/editor/editorsObserver.js';
import { Promises, timeout } from '../../../../base/common/async.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { indexOfPath } from '../../../../base/common/extpath.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IEditorResolverService } from '../common/editorResolverService.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IHostService } from '../../host/browser/host.js';
import { findGroup } from '../common/editorGroupFinder.js';
import { ITextEditorService } from '../../textfile/common/textEditorService.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
let EditorService = EditorService_1 = class EditorService extends Disposable {
    constructor(editorGroupsContainer, editorGroupService, instantiationService, fileService, configurationService, contextService, uriIdentityService, editorResolverService, workspaceTrustRequestService, hostService, textEditorService) {
        super();
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.contextService = contextService;
        this.uriIdentityService = uriIdentityService;
        this.editorResolverService = editorResolverService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.hostService = hostService;
        this.textEditorService = textEditorService;
        //#region events
        this._onDidActiveEditorChange = this._register(new Emitter());
        this.onDidActiveEditorChange = this._onDidActiveEditorChange.event;
        this._onDidVisibleEditorsChange = this._register(new Emitter());
        this.onDidVisibleEditorsChange = this._onDidVisibleEditorsChange.event;
        this._onDidEditorsChange = this._register(new Emitter());
        this.onDidEditorsChange = this._onDidEditorsChange.event;
        this._onWillOpenEditor = this._register(new Emitter());
        this.onWillOpenEditor = this._onWillOpenEditor.event;
        this._onDidCloseEditor = this._register(new Emitter());
        this.onDidCloseEditor = this._onDidCloseEditor.event;
        this._onDidOpenEditorFail = this._register(new Emitter());
        this.onDidOpenEditorFail = this._onDidOpenEditorFail.event;
        this._onDidMostRecentlyActiveEditorsChange = this._register(new Emitter());
        this.onDidMostRecentlyActiveEditorsChange = this._onDidMostRecentlyActiveEditorsChange.event;
        //#region Editor & group event handlers
        this.lastActiveEditor = undefined;
        //#endregion
        //#region Visible Editors Change: Install file watchers for out of workspace resources that became visible
        this.activeOutOfWorkspaceWatchers = new ResourceMap();
        this.closeOnFileDelete = false;
        this.editorGroupsContainer = editorGroupsContainer ?? editorGroupService;
        this.editorsObserver = this._register(this.instantiationService.createInstance(EditorsObserver, this.editorGroupsContainer));
        this.onConfigurationUpdated();
        this.registerListeners();
    }
    createScoped(editorGroupsContainer, disposables) {
        return disposables.add(new EditorService_1(editorGroupsContainer === 'main' ? this.editorGroupService.mainPart : editorGroupsContainer, this.editorGroupService, this.instantiationService, this.fileService, this.configurationService, this.contextService, this.uriIdentityService, this.editorResolverService, this.workspaceTrustRequestService, this.hostService, this.textEditorService));
    }
    registerListeners() {
        // Editor & group changes
        if (this.editorGroupsContainer === this.editorGroupService.mainPart || this.editorGroupsContainer === this.editorGroupService) {
            this.editorGroupService.whenReady.then(() => this.onEditorGroupsReady());
        }
        else {
            this.onEditorGroupsReady();
        }
        this._register(this.editorGroupsContainer.onDidChangeActiveGroup(group => this.handleActiveEditorChange(group)));
        this._register(this.editorGroupsContainer.onDidAddGroup(group => this.registerGroupListeners(group)));
        this._register(this.editorsObserver.onDidMostRecentlyActiveEditorsChange(() => this._onDidMostRecentlyActiveEditorsChange.fire()));
        // Out of workspace file watchers
        this._register(this.onDidVisibleEditorsChange(() => this.handleVisibleEditorsChange()));
        // File changes & operations
        // Note: there is some duplication with the two file event handlers- Since we cannot always rely on the disk events
        // carrying all necessary data in all environments, we also use the file operation events to make sure operations are handled.
        // In any case there is no guarantee if the local event is fired first or the disk one. Thus, code must handle the case
        // that the event ordering is random as well as might not carry all information needed.
        this._register(this.fileService.onDidRunOperation(e => this.onDidRunFileOperation(e)));
        this._register(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));
        // Configuration
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
    }
    onEditorGroupsReady() {
        // Register listeners to each opened group
        for (const group of this.editorGroupsContainer.groups) {
            this.registerGroupListeners(group);
        }
        // Fire initial set of editor events if there is an active editor
        if (this.activeEditor) {
            this.doHandleActiveEditorChangeEvent();
            this._onDidVisibleEditorsChange.fire();
        }
    }
    handleActiveEditorChange(group) {
        if (group !== this.editorGroupsContainer.activeGroup) {
            return; // ignore if not the active group
        }
        if (!this.lastActiveEditor && !group.activeEditor) {
            return; // ignore if we still have no active editor
        }
        this.doHandleActiveEditorChangeEvent();
    }
    doHandleActiveEditorChangeEvent() {
        // Remember as last active
        const activeGroup = this.editorGroupsContainer.activeGroup;
        this.lastActiveEditor = activeGroup.activeEditor ?? undefined;
        // Fire event to outside parties
        this._onDidActiveEditorChange.fire();
    }
    registerGroupListeners(group) {
        const groupDisposables = new DisposableStore();
        groupDisposables.add(group.onDidModelChange(e => {
            this._onDidEditorsChange.fire({ groupId: group.id, event: e });
        }));
        groupDisposables.add(group.onDidActiveEditorChange(() => {
            this.handleActiveEditorChange(group);
            this._onDidVisibleEditorsChange.fire();
        }));
        groupDisposables.add(group.onWillOpenEditor(e => {
            this._onWillOpenEditor.fire(e);
        }));
        groupDisposables.add(group.onDidCloseEditor(e => {
            this._onDidCloseEditor.fire(e);
        }));
        groupDisposables.add(group.onDidOpenEditorFail(editor => {
            this._onDidOpenEditorFail.fire({ editor, groupId: group.id });
        }));
        Event.once(group.onWillDispose)(() => {
            dispose(groupDisposables);
        });
    }
    handleVisibleEditorsChange() {
        const visibleOutOfWorkspaceResources = new ResourceSet();
        for (const editor of this.visibleEditors) {
            const resources = distinct(coalesce([
                EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY }),
                EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.SECONDARY })
            ]), resource => resource.toString());
            for (const resource of resources) {
                if (this.fileService.hasProvider(resource) && !this.contextService.isInsideWorkspace(resource)) {
                    visibleOutOfWorkspaceResources.add(resource);
                }
            }
        }
        // Handle no longer visible out of workspace resources
        for (const resource of this.activeOutOfWorkspaceWatchers.keys()) {
            if (!visibleOutOfWorkspaceResources.has(resource)) {
                dispose(this.activeOutOfWorkspaceWatchers.get(resource));
                this.activeOutOfWorkspaceWatchers.delete(resource);
            }
        }
        // Handle newly visible out of workspace resources
        for (const resource of visibleOutOfWorkspaceResources.keys()) {
            if (!this.activeOutOfWorkspaceWatchers.get(resource)) {
                const disposable = this.fileService.watch(resource);
                this.activeOutOfWorkspaceWatchers.set(resource, disposable);
            }
        }
    }
    //#endregion
    //#region File Changes: Move & Deletes to move or close opend editors
    async onDidRunFileOperation(e) {
        // Handle moves specially when file is opened
        if (e.isOperation(2 /* FileOperation.MOVE */)) {
            this.handleMovedFile(e.resource, e.target.resource);
        }
        // Handle deletes
        if (e.isOperation(1 /* FileOperation.DELETE */) || e.isOperation(2 /* FileOperation.MOVE */)) {
            this.handleDeletedFile(e.resource, false, e.target ? e.target.resource : undefined);
        }
    }
    onDidFilesChange(e) {
        if (e.gotDeleted()) {
            this.handleDeletedFile(e, true);
        }
    }
    async handleMovedFile(source, target) {
        for (const group of this.editorGroupsContainer.groups) {
            const replacements = [];
            for (const editor of group.editors) {
                const resource = editor.resource;
                if (!resource || !this.uriIdentityService.extUri.isEqualOrParent(resource, source)) {
                    continue; // not matching our resource
                }
                // Determine new resulting target resource
                let targetResource;
                if (this.uriIdentityService.extUri.isEqual(source, resource)) {
                    targetResource = target; // file got moved
                }
                else {
                    const index = indexOfPath(resource.path, source.path, this.uriIdentityService.extUri.ignorePathCasing(resource));
                    targetResource = joinPath(target, resource.path.substr(index + source.path.length + 1)); // parent folder got moved
                }
                // Delegate rename() to editor instance
                const moveResult = await editor.rename(group.id, targetResource);
                if (!moveResult) {
                    return; // not target - ignore
                }
                const optionOverrides = {
                    preserveFocus: true,
                    pinned: group.isPinned(editor),
                    sticky: group.isSticky(editor),
                    index: group.getIndexOfEditor(editor),
                    inactive: !group.isActive(editor)
                };
                // Construct a replacement with our extra options mixed in
                if (isEditorInput(moveResult.editor)) {
                    replacements.push({
                        editor,
                        replacement: moveResult.editor,
                        options: {
                            ...moveResult.options,
                            ...optionOverrides
                        }
                    });
                }
                else {
                    replacements.push({
                        editor,
                        replacement: {
                            ...moveResult.editor,
                            options: {
                                ...moveResult.editor.options,
                                ...optionOverrides
                            }
                        }
                    });
                }
            }
            // Apply replacements
            if (replacements.length) {
                this.replaceEditors(replacements, group);
            }
        }
    }
    onConfigurationUpdated(e) {
        if (e && !e.affectsConfiguration('workbench.editor.closeOnFileDelete')) {
            return;
        }
        const configuration = this.configurationService.getValue();
        if (typeof configuration.workbench?.editor?.closeOnFileDelete === 'boolean') {
            this.closeOnFileDelete = configuration.workbench.editor.closeOnFileDelete;
        }
        else {
            this.closeOnFileDelete = false; // default
        }
    }
    handleDeletedFile(arg1, isExternal, movedTo) {
        for (const editor of this.getAllNonDirtyEditors({ includeUntitled: false, supportSideBySide: true })) {
            (async () => {
                const resource = editor.resource;
                if (!resource) {
                    return;
                }
                // Handle deletes in opened editors depending on:
                // - we close any editor when `closeOnFileDelete: true`
                // - we close any editor when the delete occurred from within VSCode
                if (this.closeOnFileDelete || !isExternal) {
                    // Do NOT close any opened editor that matches the resource path (either equal or being parent) of the
                    // resource we move to (movedTo). Otherwise we would close a resource that has been renamed to the same
                    // path but different casing.
                    if (movedTo && this.uriIdentityService.extUri.isEqualOrParent(resource, movedTo)) {
                        return;
                    }
                    let matches = false;
                    if (arg1 instanceof FileChangesEvent) {
                        matches = arg1.contains(resource, 2 /* FileChangeType.DELETED */);
                    }
                    else {
                        matches = this.uriIdentityService.extUri.isEqualOrParent(resource, arg1);
                    }
                    if (!matches) {
                        return;
                    }
                    // We have received reports of users seeing delete events even though the file still
                    // exists (network shares issue: https://github.com/microsoft/vscode/issues/13665).
                    // Since we do not want to close an editor without reason, we have to check if the
                    // file is really gone and not just a faulty file event.
                    // This only applies to external file events, so we need to check for the isExternal
                    // flag.
                    let exists = false;
                    if (isExternal && this.fileService.hasProvider(resource)) {
                        await timeout(100);
                        exists = await this.fileService.exists(resource);
                    }
                    if (!exists && !editor.isDisposed()) {
                        editor.dispose();
                    }
                }
            })();
        }
    }
    getAllNonDirtyEditors(options) {
        const editors = [];
        function conditionallyAddEditor(editor) {
            if (editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) && !options.includeUntitled) {
                return;
            }
            if (editor.isDirty()) {
                return;
            }
            editors.push(editor);
        }
        for (const editor of this.editors) {
            if (options.supportSideBySide && editor instanceof SideBySideEditorInput) {
                conditionallyAddEditor(editor.primary);
                conditionallyAddEditor(editor.secondary);
            }
            else {
                conditionallyAddEditor(editor);
            }
        }
        return editors;
    }
    get activeEditorPane() {
        return this.editorGroupsContainer.activeGroup?.activeEditorPane;
    }
    get activeTextEditorControl() {
        const activeEditorPane = this.activeEditorPane;
        if (activeEditorPane) {
            const activeControl = activeEditorPane.getControl();
            if (isCodeEditor(activeControl) || isDiffEditor(activeControl)) {
                return activeControl;
            }
            if (isCompositeEditor(activeControl) && isCodeEditor(activeControl.activeCodeEditor)) {
                return activeControl.activeCodeEditor;
            }
        }
        return undefined;
    }
    get activeTextEditorLanguageId() {
        let activeCodeEditor = undefined;
        const activeTextEditorControl = this.activeTextEditorControl;
        if (isDiffEditor(activeTextEditorControl)) {
            activeCodeEditor = activeTextEditorControl.getModifiedEditor();
        }
        else {
            activeCodeEditor = activeTextEditorControl;
        }
        return activeCodeEditor?.getModel()?.getLanguageId();
    }
    get count() {
        return this.editorsObserver.count;
    }
    get editors() {
        return this.getEditors(1 /* EditorsOrder.SEQUENTIAL */).map(({ editor }) => editor);
    }
    getEditors(order, options) {
        switch (order) {
            // MRU
            case 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */:
                if (options?.excludeSticky) {
                    return this.editorsObserver.editors.filter(({ groupId, editor }) => !this.editorGroupsContainer.getGroup(groupId)?.isSticky(editor));
                }
                return this.editorsObserver.editors;
            // Sequential
            case 1 /* EditorsOrder.SEQUENTIAL */: {
                const editors = [];
                for (const group of this.editorGroupsContainer.getGroups(2 /* GroupsOrder.GRID_APPEARANCE */)) {
                    editors.push(...group.getEditors(1 /* EditorsOrder.SEQUENTIAL */, options).map(editor => ({ editor, groupId: group.id })));
                }
                return editors;
            }
        }
    }
    get activeEditor() {
        const activeGroup = this.editorGroupsContainer.activeGroup;
        return activeGroup ? activeGroup.activeEditor ?? undefined : undefined;
    }
    get visibleEditorPanes() {
        return coalesce(this.editorGroupsContainer.groups.map(group => group.activeEditorPane));
    }
    get visibleTextEditorControls() {
        return this.doGetVisibleTextEditorControls(this.visibleEditorPanes);
    }
    doGetVisibleTextEditorControls(editorPanes) {
        const visibleTextEditorControls = [];
        for (const editorPane of editorPanes) {
            const controls = [];
            if (editorPane instanceof SideBySideEditorPane) {
                controls.push(editorPane.getPrimaryEditorPane()?.getControl());
                controls.push(editorPane.getSecondaryEditorPane()?.getControl());
            }
            else {
                controls.push(editorPane.getControl());
            }
            for (const control of controls) {
                if (isCodeEditor(control) || isDiffEditor(control)) {
                    visibleTextEditorControls.push(control);
                }
            }
        }
        return visibleTextEditorControls;
    }
    getVisibleTextEditorControls(order) {
        return this.doGetVisibleTextEditorControls(coalesce(this.editorGroupsContainer.getGroups(order === 1 /* EditorsOrder.SEQUENTIAL */ ? 2 /* GroupsOrder.GRID_APPEARANCE */ : 1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */).map(group => group.activeEditorPane)));
    }
    get visibleEditors() {
        return coalesce(this.editorGroupsContainer.groups.map(group => group.activeEditor));
    }
    async openEditor(editor, optionsOrPreferredGroup, preferredGroup) {
        let typedEditor = undefined;
        let options = isEditorInput(editor) ? optionsOrPreferredGroup : editor.options;
        let group = undefined;
        if (isPreferredGroup(optionsOrPreferredGroup)) {
            preferredGroup = optionsOrPreferredGroup;
        }
        // Resolve override unless disabled
        if (!isEditorInput(editor)) {
            const resolvedEditor = await this.editorResolverService.resolveEditor(editor, preferredGroup);
            if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                return; // skip editor if override is aborted
            }
            // We resolved an editor to use
            if (isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                typedEditor = resolvedEditor.editor;
                options = resolvedEditor.options;
                group = resolvedEditor.group;
            }
        }
        // Override is disabled or did not apply: fallback to default
        if (!typedEditor) {
            typedEditor = isEditorInput(editor) ? editor : await this.textEditorService.resolveTextEditor(editor);
        }
        // If group still isn't defined because of a disabled override we resolve it
        if (!group) {
            let activation = undefined;
            const findGroupResult = this.instantiationService.invokeFunction(findGroup, { editor: typedEditor, options }, preferredGroup);
            if (findGroupResult instanceof Promise) {
                ([group, activation] = await findGroupResult);
            }
            else {
                ([group, activation] = findGroupResult);
            }
            // Mixin editor group activation if returned
            if (activation) {
                options = { ...options, activation };
            }
        }
        return group.openEditor(typedEditor, options);
    }
    async openEditors(editors, preferredGroup, options) {
        // Pass all editors to trust service to determine if
        // we should proceed with opening the editors if we
        // are asked to validate trust.
        if (options?.validateTrust) {
            const editorsTrusted = await this.handleWorkspaceTrust(editors);
            if (!editorsTrusted) {
                return [];
            }
        }
        // Find target groups for editors to open
        const mapGroupToTypedEditors = new Map();
        for (const editor of editors) {
            let typedEditor = undefined;
            let group = undefined;
            // Resolve override unless disabled
            if (!isEditorInputWithOptions(editor)) {
                const resolvedEditor = await this.editorResolverService.resolveEditor(editor, preferredGroup);
                if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                    continue; // skip editor if override is aborted
                }
                // We resolved an editor to use
                if (isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                    typedEditor = resolvedEditor;
                    group = resolvedEditor.group;
                }
            }
            // Override is disabled or did not apply: fallback to default
            if (!typedEditor) {
                typedEditor = isEditorInputWithOptions(editor) ? editor : { editor: await this.textEditorService.resolveTextEditor(editor), options: editor.options };
            }
            // If group still isn't defined because of a disabled override we resolve it
            if (!group) {
                const findGroupResult = this.instantiationService.invokeFunction(findGroup, typedEditor, preferredGroup);
                if (findGroupResult instanceof Promise) {
                    ([group] = await findGroupResult);
                }
                else {
                    ([group] = findGroupResult);
                }
            }
            // Update map of groups to editors
            let targetGroupEditors = mapGroupToTypedEditors.get(group);
            if (!targetGroupEditors) {
                targetGroupEditors = [];
                mapGroupToTypedEditors.set(group, targetGroupEditors);
            }
            targetGroupEditors.push(typedEditor);
        }
        // Open in target groups
        const result = [];
        for (const [group, editors] of mapGroupToTypedEditors) {
            result.push(group.openEditors(editors));
        }
        return coalesce(await Promises.settled(result));
    }
    async handleWorkspaceTrust(editors) {
        const { resources, diffMode, mergeMode } = this.extractEditorResources(editors);
        const trustResult = await this.workspaceTrustRequestService.requestOpenFilesTrust(resources);
        switch (trustResult) {
            case 1 /* WorkspaceTrustUriResponse.Open */:
                return true;
            case 2 /* WorkspaceTrustUriResponse.OpenInNewWindow */:
                await this.hostService.openWindow(resources.map(resource => ({ fileUri: resource })), { forceNewWindow: true, diffMode, mergeMode });
                return false;
            case 3 /* WorkspaceTrustUriResponse.Cancel */:
                return false;
        }
    }
    extractEditorResources(editors) {
        const resources = new ResourceSet();
        let diffMode = false;
        let mergeMode = false;
        for (const editor of editors) {
            // Typed Editor
            if (isEditorInputWithOptions(editor)) {
                const resource = EditorResourceAccessor.getOriginalUri(editor.editor, { supportSideBySide: SideBySideEditor.BOTH });
                if (URI.isUri(resource)) {
                    resources.add(resource);
                }
                else if (resource) {
                    if (resource.primary) {
                        resources.add(resource.primary);
                    }
                    if (resource.secondary) {
                        resources.add(resource.secondary);
                    }
                    diffMode = editor.editor instanceof DiffEditorInput;
                }
            }
            // Untyped editor
            else {
                if (isResourceMergeEditorInput(editor)) {
                    if (URI.isUri(editor.input1)) {
                        resources.add(editor.input1.resource);
                    }
                    if (URI.isUri(editor.input2)) {
                        resources.add(editor.input2.resource);
                    }
                    if (URI.isUri(editor.base)) {
                        resources.add(editor.base.resource);
                    }
                    if (URI.isUri(editor.result)) {
                        resources.add(editor.result.resource);
                    }
                    mergeMode = true;
                }
                if (isResourceDiffEditorInput(editor)) {
                    if (URI.isUri(editor.original.resource)) {
                        resources.add(editor.original.resource);
                    }
                    if (URI.isUri(editor.modified.resource)) {
                        resources.add(editor.modified.resource);
                    }
                    diffMode = true;
                }
                else if (isResourceEditorInput(editor)) {
                    resources.add(editor.resource);
                }
            }
        }
        return {
            resources: Array.from(resources.keys()),
            diffMode,
            mergeMode
        };
    }
    //#endregion
    //#region isOpened() / isVisible()
    isOpened(editor) {
        return this.editorsObserver.hasEditor({
            resource: this.uriIdentityService.asCanonicalUri(editor.resource),
            typeId: editor.typeId,
            editorId: editor.editorId
        });
    }
    isVisible(editor) {
        for (const group of this.editorGroupsContainer.groups) {
            if (group.activeEditor?.matches(editor)) {
                return true;
            }
        }
        return false;
    }
    //#endregion
    //#region closeEditor()
    async closeEditor({ editor, groupId }, options) {
        const group = this.editorGroupsContainer.getGroup(groupId);
        await group?.closeEditor(editor, options);
    }
    //#endregion
    //#region closeEditors()
    async closeEditors(editors, options) {
        const mapGroupToEditors = new Map();
        for (const { editor, groupId } of editors) {
            const group = this.editorGroupsContainer.getGroup(groupId);
            if (!group) {
                continue;
            }
            let editors = mapGroupToEditors.get(group);
            if (!editors) {
                editors = [];
                mapGroupToEditors.set(group, editors);
            }
            editors.push(editor);
        }
        for (const [group, editors] of mapGroupToEditors) {
            await group.closeEditors(editors, options);
        }
    }
    findEditors(arg1, options, arg2) {
        const resource = URI.isUri(arg1) ? arg1 : arg1.resource;
        const typeId = URI.isUri(arg1) ? undefined : arg1.typeId;
        // Do a quick check for the resource via the editor observer
        // which is a very efficient way to find an editor by resource.
        // However, we can only do that unless we are asked to find an
        // editor on the secondary side of a side by side editor, because
        // the editor observer provides fast lookups only for primary
        // editors.
        if (options?.supportSideBySide !== SideBySideEditor.ANY && options?.supportSideBySide !== SideBySideEditor.SECONDARY) {
            if (!this.editorsObserver.hasEditors(resource)) {
                if (URI.isUri(arg1) || isUndefined(arg2)) {
                    return [];
                }
                return undefined;
            }
        }
        // Search only in specific group
        if (!isUndefined(arg2)) {
            const targetGroup = typeof arg2 === 'number' ? this.editorGroupsContainer.getGroup(arg2) : arg2;
            // Resource provided: result is an array
            if (URI.isUri(arg1)) {
                if (!targetGroup) {
                    return [];
                }
                return targetGroup.findEditors(resource, options);
            }
            // Editor identifier provided, result is single
            else {
                if (!targetGroup) {
                    return undefined;
                }
                const editors = targetGroup.findEditors(resource, options);
                for (const editor of editors) {
                    if (editor.typeId === typeId) {
                        return editor;
                    }
                }
                return undefined;
            }
        }
        // Search across all groups in MRU order
        else {
            const result = [];
            for (const group of this.editorGroupsContainer.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                const editors = [];
                // Resource provided: result is an array
                if (URI.isUri(arg1)) {
                    editors.push(...this.findEditors(arg1, options, group));
                }
                // Editor identifier provided, result is single
                else {
                    const editor = this.findEditors(arg1, options, group);
                    if (editor) {
                        editors.push(editor);
                    }
                }
                result.push(...editors.map(editor => ({ editor, groupId: group.id })));
            }
            return result;
        }
    }
    async replaceEditors(replacements, group) {
        const targetGroup = typeof group === 'number' ? this.editorGroupsContainer.getGroup(group) : group;
        // Convert all replacements to typed editors unless already
        // typed and handle overrides properly.
        const typedReplacements = [];
        for (const replacement of replacements) {
            let typedReplacement = undefined;
            // Resolve override unless disabled
            if (!isEditorInput(replacement.replacement)) {
                const resolvedEditor = await this.editorResolverService.resolveEditor(replacement.replacement, targetGroup);
                if (resolvedEditor === 1 /* ResolvedStatus.ABORT */) {
                    continue; // skip editor if override is aborted
                }
                // We resolved an editor to use
                if (isEditorInputWithOptionsAndGroup(resolvedEditor)) {
                    typedReplacement = {
                        editor: replacement.editor,
                        replacement: resolvedEditor.editor,
                        options: resolvedEditor.options,
                        forceReplaceDirty: replacement.forceReplaceDirty
                    };
                }
            }
            // Override is disabled or did not apply: fallback to default
            if (!typedReplacement) {
                typedReplacement = {
                    editor: replacement.editor,
                    replacement: isEditorReplacement(replacement) ? replacement.replacement : await this.textEditorService.resolveTextEditor(replacement.replacement),
                    options: isEditorReplacement(replacement) ? replacement.options : replacement.replacement.options,
                    forceReplaceDirty: replacement.forceReplaceDirty
                };
            }
            typedReplacements.push(typedReplacement);
        }
        return targetGroup?.replaceEditors(typedReplacements);
    }
    //#endregion
    //#region save/revert
    async save(editors, options) {
        // Convert to array
        if (!Array.isArray(editors)) {
            editors = [editors];
        }
        // Make sure to not save the same editor multiple times
        // by using the `matches()` method to find duplicates
        const uniqueEditors = this.getUniqueEditors(editors);
        // Split editors up into a bucket that is saved in parallel
        // and sequentially. Unless "Save As", all non-untitled editors
        // can be saved in parallel to speed up the operation. Remaining
        // editors are potentially bringing up some UI and thus run
        // sequentially.
        const editorsToSaveParallel = [];
        const editorsToSaveSequentially = [];
        if (options?.saveAs) {
            editorsToSaveSequentially.push(...uniqueEditors);
        }
        else {
            for (const { groupId, editor } of uniqueEditors) {
                if (editor.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                    editorsToSaveSequentially.push({ groupId, editor });
                }
                else {
                    editorsToSaveParallel.push({ groupId, editor });
                }
            }
        }
        // Editors to save in parallel
        const saveResults = await Promises.settled(editorsToSaveParallel.map(({ groupId, editor }) => {
            // Use save as a hint to pin the editor if used explicitly
            if (options?.reason === 1 /* SaveReason.EXPLICIT */) {
                this.editorGroupsContainer.getGroup(groupId)?.pinEditor(editor);
            }
            // Save
            return editor.save(groupId, options);
        }));
        // Editors to save sequentially
        for (const { groupId, editor } of editorsToSaveSequentially) {
            if (editor.isDisposed()) {
                continue; // might have been disposed from the save already
            }
            // Preserve view state by opening the editor first if the editor
            // is untitled or we "Save As". This also allows the user to review
            // the contents of the editor before making a decision.
            const editorPane = await this.openEditor(editor, groupId);
            const editorOptions = {
                pinned: true,
                viewState: editorPane?.getViewState()
            };
            const result = options?.saveAs ? await editor.saveAs(groupId, options) : await editor.save(groupId, options);
            saveResults.push(result);
            if (!result) {
                break; // failed or cancelled, abort
            }
            // Replace editor preserving viewstate (either across all groups or
            // only selected group) if the resulting editor is different from the
            // current one.
            if (!editor.matches(result)) {
                const targetGroups = editor.hasCapability(4 /* EditorInputCapabilities.Untitled */) ? this.editorGroupsContainer.groups.map(group => group.id) /* untitled replaces across all groups */ : [groupId];
                for (const targetGroup of targetGroups) {
                    if (result instanceof EditorInput) {
                        await this.replaceEditors([{ editor, replacement: result, options: editorOptions }], targetGroup);
                    }
                    else {
                        await this.replaceEditors([{ editor, replacement: { ...result, options: editorOptions } }], targetGroup);
                    }
                }
            }
        }
        return {
            success: saveResults.every(result => !!result),
            editors: coalesce(saveResults)
        };
    }
    saveAll(options) {
        return this.save(this.getAllModifiedEditors(options), options);
    }
    async revert(editors, options) {
        // Convert to array
        if (!Array.isArray(editors)) {
            editors = [editors];
        }
        // Make sure to not revert the same editor multiple times
        // by using the `matches()` method to find duplicates
        const uniqueEditors = this.getUniqueEditors(editors);
        await Promises.settled(uniqueEditors.map(async ({ groupId, editor }) => {
            // Use revert as a hint to pin the editor
            this.editorGroupsContainer.getGroup(groupId)?.pinEditor(editor);
            return editor.revert(groupId, options);
        }));
        return !uniqueEditors.some(({ editor }) => editor.isDirty());
    }
    async revertAll(options) {
        return this.revert(this.getAllModifiedEditors(options), options);
    }
    getAllModifiedEditors(options) {
        const editors = [];
        for (const group of this.editorGroupsContainer.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            for (const editor of group.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
                if (!editor.isModified()) {
                    continue;
                }
                if ((typeof options?.includeUntitled === 'boolean' || !options?.includeUntitled?.includeScratchpad)
                    && editor.hasCapability(512 /* EditorInputCapabilities.Scratchpad */)) {
                    continue;
                }
                if (!options?.includeUntitled && editor.hasCapability(4 /* EditorInputCapabilities.Untitled */)) {
                    continue;
                }
                if (options?.excludeSticky && group.isSticky(editor)) {
                    continue;
                }
                editors.push({ groupId: group.id, editor });
            }
        }
        return editors;
    }
    getUniqueEditors(editors) {
        const uniqueEditors = [];
        for (const { editor, groupId } of editors) {
            if (uniqueEditors.some(uniqueEditor => uniqueEditor.editor.matches(editor))) {
                continue;
            }
            uniqueEditors.push({ editor, groupId });
        }
        return uniqueEditors;
    }
    //#endregion
    dispose() {
        super.dispose();
        // Dispose remaining watchers if any
        this.activeOutOfWorkspaceWatchers.forEach(disposable => dispose(disposable));
        this.activeOutOfWorkspaceWatchers.clear();
    }
};
EditorService = EditorService_1 = __decorate([
    __param(1, IEditorGroupsService),
    __param(2, IInstantiationService),
    __param(3, IFileService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IUriIdentityService),
    __param(7, IEditorResolverService),
    __param(8, IWorkspaceTrustRequestService),
    __param(9, IHostService),
    __param(10, ITextEditorService)
], EditorService);
export { EditorService };
registerSingleton(IEditorService, new SyncDescriptor(EditorService, [undefined], false));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvYnJvd3Nlci9lZGl0b3JTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQW9ILHdCQUF3QixFQUFzSSxzQkFBc0IsRUFBK0MseUJBQXlCLEVBQXVCLHFCQUFxQixFQUFFLGFBQWEsRUFBRSxnQ0FBZ0MsRUFBc0IsMEJBQTBCLEVBQXdDLE1BQU0sMkJBQTJCLENBQUM7QUFDaG1CLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxZQUFZLEVBQXFDLGdCQUFnQixFQUFrQixNQUFNLDRDQUE0QyxDQUFDO0FBQy9JLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixJQUFJLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDN0csT0FBTyxFQUFFLG9CQUFvQixFQUFpRCxtQkFBbUIsRUFBK0MsTUFBTSxrQ0FB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