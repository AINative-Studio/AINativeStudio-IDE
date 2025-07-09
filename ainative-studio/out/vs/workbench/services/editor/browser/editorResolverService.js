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
var EditorResolverService_1;
import * as glob from '../../../../base/common/glob.js';
import { distinct, insert } from '../../../../base/common/arrays.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { basename, extname, isEqual } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorActivation, EditorResolution } from '../../../../platform/editor/common/editor.js';
import { DEFAULT_EDITOR_ASSOCIATION, EditorResourceAccessor, isEditorInputWithOptions, isEditorInputWithOptionsAndGroup, isResourceDiffEditorInput, isResourceSideBySideEditorInput, isUntitledResourceEditorInput, isResourceMergeEditorInput, SideBySideEditor, isResourceMultiDiffEditorInput } from '../../../common/editor.js';
import { IEditorGroupsService } from '../common/editorGroupsService.js';
import { Schemas } from '../../../../base/common/network.js';
import { RegisteredEditorPriority, editorsAssociationsSettingId, globMatchesResource, IEditorResolverService, priorityToRank } from '../common/editorResolverService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { localize } from '../../../../nls.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { findGroup } from '../common/editorGroupFinder.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SideBySideEditorInput } from '../../../common/editor/sideBySideEditorInput.js';
import { PauseableEmitter } from '../../../../base/common/event.js';
let EditorResolverService = class EditorResolverService extends Disposable {
    static { EditorResolverService_1 = this; }
    // Constants
    static { this.configureDefaultID = 'promptOpenWith.configureDefault'; }
    static { this.cacheStorageID = 'editorOverrideService.cache'; }
    static { this.conflictingDefaultsStorageID = 'editorOverrideService.conflictingDefaults'; }
    constructor(editorGroupService, instantiationService, configurationService, quickInputService, notificationService, storageService, extensionService, logService) {
        super();
        this.editorGroupService = editorGroupService;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.quickInputService = quickInputService;
        this.notificationService = notificationService;
        this.storageService = storageService;
        this.extensionService = extensionService;
        this.logService = logService;
        // Events
        this._onDidChangeEditorRegistrations = this._register(new PauseableEmitter());
        this.onDidChangeEditorRegistrations = this._onDidChangeEditorRegistrations.event;
        // Data Stores
        this._editors = new Map();
        this._flattenedEditors = new Map();
        this._shouldReFlattenEditors = true;
        // Read in the cache on statup
        this.cache = new Set(JSON.parse(this.storageService.get(EditorResolverService_1.cacheStorageID, 0 /* StorageScope.PROFILE */, JSON.stringify([]))));
        this.storageService.remove(EditorResolverService_1.cacheStorageID, 0 /* StorageScope.PROFILE */);
        this._register(this.storageService.onWillSaveState(() => {
            // We want to store the glob patterns we would activate on, this allows us to know if we need to await the ext host on startup for opening a resource
            this.cacheEditors();
        }));
        // When extensions have registered we no longer need the cache
        this._register(this.extensionService.onDidRegisterExtensions(() => {
            this.cache = undefined;
        }));
    }
    resolveUntypedInputAndGroup(editor, preferredGroup) {
        const untypedEditor = editor;
        // Use the untyped editor to find a group
        const findGroupResult = this.instantiationService.invokeFunction(findGroup, untypedEditor, preferredGroup);
        if (findGroupResult instanceof Promise) {
            return findGroupResult.then(([group, activation]) => [untypedEditor, group, activation]);
        }
        else {
            const [group, activation] = findGroupResult;
            return [untypedEditor, group, activation];
        }
    }
    async resolveEditor(editor, preferredGroup) {
        // Update the flattened editors
        this._flattenedEditors = this._flattenEditorsMap();
        // Special case: side by side editors requires us to
        // independently resolve both sides and then build
        // a side by side editor with the result
        if (isResourceSideBySideEditorInput(editor)) {
            return this.doResolveSideBySideEditor(editor, preferredGroup);
        }
        let resolvedUntypedAndGroup;
        const resolvedUntypedAndGroupResult = this.resolveUntypedInputAndGroup(editor, preferredGroup);
        if (resolvedUntypedAndGroupResult instanceof Promise) {
            resolvedUntypedAndGroup = await resolvedUntypedAndGroupResult;
        }
        else {
            resolvedUntypedAndGroup = resolvedUntypedAndGroupResult;
        }
        if (!resolvedUntypedAndGroup) {
            return 2 /* ResolvedStatus.NONE */;
        }
        // Get the resolved untyped editor, group, and activation
        const [untypedEditor, group, activation] = resolvedUntypedAndGroup;
        if (activation) {
            untypedEditor.options = { ...untypedEditor.options, activation };
        }
        let resource = EditorResourceAccessor.getCanonicalUri(untypedEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        // If it was resolved before we await for the extensions to activate and then proceed with resolution or else the backing extensions won't be registered
        if (this.cache && resource && this.resourceMatchesCache(resource)) {
            await this.extensionService.whenInstalledExtensionsRegistered();
        }
        // Undefined resource -> untilted. Other malformed URI's are unresolvable
        if (resource === undefined) {
            resource = URI.from({ scheme: Schemas.untitled });
        }
        else if (resource.scheme === undefined || resource === null) {
            return 2 /* ResolvedStatus.NONE */;
        }
        if (untypedEditor.options?.override === EditorResolution.PICK) {
            const picked = await this.doPickEditor(untypedEditor);
            // If the picker was cancelled we will stop resolving the editor
            if (!picked) {
                return 1 /* ResolvedStatus.ABORT */;
            }
            // Populate the options with the new ones
            untypedEditor.options = picked;
        }
        // Resolved the editor ID as much as possible, now find a given editor (cast here is ok because we resolve down to a string above)
        let { editor: selectedEditor, conflictingDefault } = this.getEditor(resource, untypedEditor.options?.override);
        // If no editor was found and this was a typed editor or an editor with an explicit override we could not resolve it
        if (!selectedEditor && (untypedEditor.options?.override || isEditorInputWithOptions(editor))) {
            return 2 /* ResolvedStatus.NONE */;
        }
        else if (!selectedEditor) {
            // Simple untyped editors that we could not resolve will be resolved to the default editor
            const resolvedEditor = this.getEditor(resource, DEFAULT_EDITOR_ASSOCIATION.id);
            selectedEditor = resolvedEditor?.editor;
            conflictingDefault = resolvedEditor?.conflictingDefault;
            if (!selectedEditor) {
                return 2 /* ResolvedStatus.NONE */;
            }
        }
        // In the special case of diff editors we do some more work to determine the correct editor for both sides
        if (isResourceDiffEditorInput(untypedEditor) && untypedEditor.options?.override === undefined) {
            let resource2 = EditorResourceAccessor.getCanonicalUri(untypedEditor, { supportSideBySide: SideBySideEditor.SECONDARY });
            if (!resource2) {
                resource2 = URI.from({ scheme: Schemas.untitled });
            }
            const { editor: selectedEditor2 } = this.getEditor(resource2, undefined);
            if (!selectedEditor2 || selectedEditor.editorInfo.id !== selectedEditor2.editorInfo.id) {
                const { editor: selectedDiff, conflictingDefault: conflictingDefaultDiff } = this.getEditor(resource, DEFAULT_EDITOR_ASSOCIATION.id);
                selectedEditor = selectedDiff;
                conflictingDefault = conflictingDefaultDiff;
            }
            if (!selectedEditor) {
                return 2 /* ResolvedStatus.NONE */;
            }
        }
        // If no override we take the selected editor id so that matches works with the isActive check
        untypedEditor.options = { override: selectedEditor.editorInfo.id, ...untypedEditor.options };
        // Check if diff can be created based on prescene of factory function
        if (selectedEditor.editorFactoryObject.createDiffEditorInput === undefined && isResourceDiffEditorInput(untypedEditor)) {
            return 2 /* ResolvedStatus.NONE */;
        }
        const input = await this.doResolveEditor(untypedEditor, group, selectedEditor);
        if (conflictingDefault && input) {
            // Show the conflicting default dialog
            await this.doHandleConflictingDefaults(resource, selectedEditor.editorInfo.label, untypedEditor, input.editor, group);
        }
        if (input) {
            if (input.editor.editorId !== selectedEditor.editorInfo.id) {
                this.logService.warn(`Editor ID Mismatch: ${input.editor.editorId} !== ${selectedEditor.editorInfo.id}. This will cause bugs. Please ensure editorInput.editorId matches the registered id`);
            }
            return { ...input, group };
        }
        return 1 /* ResolvedStatus.ABORT */;
    }
    async doResolveSideBySideEditor(editor, preferredGroup) {
        const primaryResolvedEditor = await this.resolveEditor(editor.primary, preferredGroup);
        if (!isEditorInputWithOptionsAndGroup(primaryResolvedEditor)) {
            return 2 /* ResolvedStatus.NONE */;
        }
        const secondaryResolvedEditor = await this.resolveEditor(editor.secondary, primaryResolvedEditor.group ?? preferredGroup);
        if (!isEditorInputWithOptionsAndGroup(secondaryResolvedEditor)) {
            return 2 /* ResolvedStatus.NONE */;
        }
        return {
            group: primaryResolvedEditor.group ?? secondaryResolvedEditor.group,
            editor: this.instantiationService.createInstance(SideBySideEditorInput, editor.label, editor.description, secondaryResolvedEditor.editor, primaryResolvedEditor.editor),
            options: editor.options
        };
    }
    bufferChangeEvents(callback) {
        this._onDidChangeEditorRegistrations.pause();
        try {
            callback();
        }
        finally {
            this._onDidChangeEditorRegistrations.resume();
        }
    }
    registerEditor(globPattern, editorInfo, options, editorFactoryObject) {
        let registeredEditor = this._editors.get(globPattern);
        if (registeredEditor === undefined) {
            registeredEditor = new Map();
            this._editors.set(globPattern, registeredEditor);
        }
        let editorsWithId = registeredEditor.get(editorInfo.id);
        if (editorsWithId === undefined) {
            editorsWithId = [];
        }
        const remove = insert(editorsWithId, {
            globPattern,
            editorInfo,
            options,
            editorFactoryObject
        });
        registeredEditor.set(editorInfo.id, editorsWithId);
        this._shouldReFlattenEditors = true;
        this._onDidChangeEditorRegistrations.fire();
        return toDisposable(() => {
            remove();
            if (editorsWithId && editorsWithId.length === 0) {
                registeredEditor?.delete(editorInfo.id);
            }
            this._shouldReFlattenEditors = true;
            this._onDidChangeEditorRegistrations.fire();
        });
    }
    getAssociationsForResource(resource) {
        const associations = this.getAllUserAssociations();
        let matchingAssociations = associations.filter(association => association.filenamePattern && globMatchesResource(association.filenamePattern, resource));
        // Sort matching associations based on glob length as a longer glob will be more specific
        matchingAssociations = matchingAssociations.sort((a, b) => (b.filenamePattern?.length ?? 0) - (a.filenamePattern?.length ?? 0));
        const allEditors = this._registeredEditors;
        // Ensure that the settings are valid editors
        return matchingAssociations.filter(association => allEditors.find(c => c.editorInfo.id === association.viewType));
    }
    getAllUserAssociations() {
        const inspectedEditorAssociations = this.configurationService.inspect(editorsAssociationsSettingId) || {};
        const defaultAssociations = inspectedEditorAssociations.defaultValue ?? {};
        const workspaceAssociations = inspectedEditorAssociations.workspaceValue ?? {};
        const userAssociations = inspectedEditorAssociations.userValue ?? {};
        const rawAssociations = { ...workspaceAssociations };
        // We want to apply the default associations and user associations on top of the workspace associations but ignore duplicate keys.
        for (const [key, value] of Object.entries({ ...defaultAssociations, ...userAssociations })) {
            if (rawAssociations[key] === undefined) {
                rawAssociations[key] = value;
            }
        }
        const associations = [];
        for (const [key, value] of Object.entries(rawAssociations)) {
            const association = {
                filenamePattern: key,
                viewType: value
            };
            associations.push(association);
        }
        return associations;
    }
    /**
     * Given the nested nature of the editors map, we merge factories of the same glob and id to make it flat
     * and easier to work with
     */
    _flattenEditorsMap() {
        // If we shouldn't be re-flattening (due to lack of update) then return early
        if (!this._shouldReFlattenEditors) {
            return this._flattenedEditors;
        }
        this._shouldReFlattenEditors = false;
        const editors = new Map();
        for (const [glob, value] of this._editors) {
            const registeredEditors = [];
            for (const editors of value.values()) {
                let registeredEditor = undefined;
                // Merge all editors with the same id and glob pattern together
                for (const editor of editors) {
                    if (!registeredEditor) {
                        registeredEditor = {
                            editorInfo: editor.editorInfo,
                            globPattern: editor.globPattern,
                            options: {},
                            editorFactoryObject: {}
                        };
                    }
                    // Merge options and factories
                    registeredEditor.options = { ...registeredEditor.options, ...editor.options };
                    registeredEditor.editorFactoryObject = { ...registeredEditor.editorFactoryObject, ...editor.editorFactoryObject };
                }
                if (registeredEditor) {
                    registeredEditors.push(registeredEditor);
                }
            }
            editors.set(glob, registeredEditors);
        }
        return editors;
    }
    /**
     * Returns all editors as an array. Possible to contain duplicates
     */
    get _registeredEditors() {
        return Array.from(this._flattenedEditors.values()).flat();
    }
    updateUserAssociations(globPattern, editorID) {
        const newAssociation = { viewType: editorID, filenamePattern: globPattern };
        const currentAssociations = this.getAllUserAssociations();
        const newSettingObject = Object.create(null);
        // Form the new setting object including the newest associations
        for (const association of [...currentAssociations, newAssociation]) {
            if (association.filenamePattern) {
                newSettingObject[association.filenamePattern] = association.viewType;
            }
        }
        this.configurationService.updateValue(editorsAssociationsSettingId, newSettingObject);
    }
    findMatchingEditors(resource) {
        // The user setting should be respected even if the editor doesn't specify that resource in package.json
        const userSettings = this.getAssociationsForResource(resource);
        const matchingEditors = [];
        // Then all glob patterns
        for (const [key, editors] of this._flattenedEditors) {
            for (const editor of editors) {
                const foundInSettings = userSettings.find(setting => setting.viewType === editor.editorInfo.id);
                if ((foundInSettings && editor.editorInfo.priority !== RegisteredEditorPriority.exclusive) || globMatchesResource(key, resource)) {
                    matchingEditors.push(editor);
                }
            }
        }
        // Return the editors sorted by their priority
        return matchingEditors.sort((a, b) => {
            // Very crude if priorities match longer glob wins as longer globs are normally more specific
            if (priorityToRank(b.editorInfo.priority) === priorityToRank(a.editorInfo.priority) && typeof b.globPattern === 'string' && typeof a.globPattern === 'string') {
                return b.globPattern.length - a.globPattern.length;
            }
            return priorityToRank(b.editorInfo.priority) - priorityToRank(a.editorInfo.priority);
        });
    }
    getEditors(resource) {
        this._flattenedEditors = this._flattenEditorsMap();
        // By resource
        if (URI.isUri(resource)) {
            const editors = this.findMatchingEditors(resource);
            if (editors.find(e => e.editorInfo.priority === RegisteredEditorPriority.exclusive)) {
                return [];
            }
            return editors.map(editor => editor.editorInfo);
        }
        // All
        return distinct(this._registeredEditors.map(editor => editor.editorInfo), editor => editor.id);
    }
    /**
     * Given a resource and an editorId selects the best possible editor
     * @returns The editor and whether there was another default which conflicted with it
     */
    getEditor(resource, editorId) {
        const findMatchingEditor = (editors, viewType) => {
            return editors.find((editor) => {
                if (editor.options && editor.options.canSupportResource !== undefined) {
                    return editor.editorInfo.id === viewType && editor.options.canSupportResource(resource);
                }
                return editor.editorInfo.id === viewType;
            });
        };
        if (editorId && editorId !== EditorResolution.EXCLUSIVE_ONLY) {
            // Specific id passed in doesn't have to match the resource, it can be anything
            const registeredEditors = this._registeredEditors;
            return {
                editor: findMatchingEditor(registeredEditors, editorId),
                conflictingDefault: false
            };
        }
        const editors = this.findMatchingEditors(resource);
        const associationsFromSetting = this.getAssociationsForResource(resource);
        // We only want minPriority+ if no user defined setting is found, else we won't resolve an editor
        const minPriority = editorId === EditorResolution.EXCLUSIVE_ONLY ? RegisteredEditorPriority.exclusive : RegisteredEditorPriority.builtin;
        let possibleEditors = editors.filter(editor => priorityToRank(editor.editorInfo.priority) >= priorityToRank(minPriority) && editor.editorInfo.id !== DEFAULT_EDITOR_ASSOCIATION.id);
        if (possibleEditors.length === 0) {
            return {
                editor: associationsFromSetting[0] && minPriority !== RegisteredEditorPriority.exclusive ? findMatchingEditor(editors, associationsFromSetting[0].viewType) : undefined,
                conflictingDefault: false
            };
        }
        // If the editor is exclusive we use that, else use the user setting, else use the built-in+ editor
        const selectedViewType = possibleEditors[0].editorInfo.priority === RegisteredEditorPriority.exclusive ?
            possibleEditors[0].editorInfo.id :
            associationsFromSetting[0]?.viewType || possibleEditors[0].editorInfo.id;
        let conflictingDefault = false;
        // Filter out exclusive before we check for conflicts as exclusive editors cannot be manually chosen
        possibleEditors = possibleEditors.filter(editor => editor.editorInfo.priority !== RegisteredEditorPriority.exclusive);
        if (associationsFromSetting.length === 0 && possibleEditors.length > 1) {
            conflictingDefault = true;
        }
        return {
            editor: findMatchingEditor(editors, selectedViewType),
            conflictingDefault
        };
    }
    async doResolveEditor(editor, group, selectedEditor) {
        let options = editor.options;
        const resource = EditorResourceAccessor.getCanonicalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
        // If no activation option is provided, populate it.
        if (options && typeof options.activation === 'undefined') {
            options = { ...options, activation: options.preserveFocus ? EditorActivation.RESTORE : undefined };
        }
        // If it's a merge editor we trigger the create merge editor input
        if (isResourceMergeEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createMergeEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createMergeEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        // If it's a diff editor we trigger the create diff editor input
        if (isResourceDiffEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createDiffEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createDiffEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        // If it's a diff list editor we trigger the create diff list editor input
        if (isResourceMultiDiffEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createMultiDiffEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createMultiDiffEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        if (isResourceSideBySideEditorInput(editor)) {
            throw new Error(`Untyped side by side editor input not supported here.`);
        }
        if (isUntitledResourceEditorInput(editor)) {
            if (!selectedEditor.editorFactoryObject.createUntitledEditorInput) {
                return;
            }
            const inputWithOptions = await selectedEditor.editorFactoryObject.createUntitledEditorInput(editor, group);
            return { editor: inputWithOptions.editor, options: inputWithOptions.options ?? options };
        }
        // Should no longer have an undefined resource so lets throw an error if that's somehow the case
        if (resource === undefined) {
            throw new Error(`Undefined resource on non untitled editor input.`);
        }
        // If the editor states it can only be opened once per resource we must close all existing ones except one and move the new one into the group
        const singleEditorPerResource = typeof selectedEditor.options?.singlePerResource === 'function' ? selectedEditor.options.singlePerResource() : selectedEditor.options?.singlePerResource;
        if (singleEditorPerResource) {
            const existingEditors = this.findExistingEditorsForResource(resource, selectedEditor.editorInfo.id);
            if (existingEditors.length) {
                const editor = await this.moveExistingEditorForResource(existingEditors, group);
                if (editor) {
                    return { editor, options };
                }
                else {
                    return; // failed to move
                }
            }
        }
        // If no factory is above, return flow back to caller letting them know we could not resolve it
        if (!selectedEditor.editorFactoryObject.createEditorInput) {
            return;
        }
        // Respect options passed back
        const inputWithOptions = await selectedEditor.editorFactoryObject.createEditorInput(editor, group);
        options = inputWithOptions.options ?? options;
        const input = inputWithOptions.editor;
        return { editor: input, options };
    }
    /**
     * Moves the first existing editor for a resource to the target group unless already opened there.
     * Additionally will close any other editors that are open for that resource and viewtype besides the first one found
     * @param resource The resource of the editor
     * @param viewType the viewtype of the editor
     * @param targetGroup The group to move it to
     * @returns The moved editor input or `undefined` if the editor could not be moved
     */
    async moveExistingEditorForResource(existingEditorsForResource, targetGroup) {
        const editorToUse = existingEditorsForResource[0];
        // We should only have one editor but if there are multiple we close the others
        for (const { editor, group } of existingEditorsForResource) {
            if (editor !== editorToUse.editor) {
                const closed = await group.closeEditor(editor);
                if (!closed) {
                    return;
                }
            }
        }
        // Move the editor already opened to the target group
        if (targetGroup.id !== editorToUse.group.id) {
            const moved = editorToUse.group.moveEditor(editorToUse.editor, targetGroup);
            if (!moved) {
                return;
            }
        }
        return editorToUse.editor;
    }
    /**
     * Given a resource and an editorId, returns all editors open for that resource and editorId.
     * @param resource The resource specified
     * @param editorId The editorID
     * @returns A list of editors
     */
    findExistingEditorsForResource(resource, editorId) {
        const out = [];
        const orderedGroups = distinct([
            ...this.editorGroupService.groups,
        ]);
        for (const group of orderedGroups) {
            for (const editor of group.editors) {
                if (isEqual(editor.resource, resource) && editor.editorId === editorId) {
                    out.push({ editor, group });
                }
            }
        }
        return out;
    }
    async doHandleConflictingDefaults(resource, editorName, untypedInput, currentEditor, group) {
        const editors = this.findMatchingEditors(resource);
        const storedChoices = JSON.parse(this.storageService.get(EditorResolverService_1.conflictingDefaultsStorageID, 0 /* StorageScope.PROFILE */, '{}'));
        const globForResource = `*${extname(resource)}`;
        // Writes to the storage service that a choice has been made for the currently installed editors
        const writeCurrentEditorsToStorage = () => {
            storedChoices[globForResource] = [];
            editors.forEach(editor => storedChoices[globForResource].push(editor.editorInfo.id));
            this.storageService.store(EditorResolverService_1.conflictingDefaultsStorageID, JSON.stringify(storedChoices), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        };
        // If the user has already made a choice for this editor we don't want to ask them again
        if (storedChoices[globForResource] && storedChoices[globForResource].find(editorID => editorID === currentEditor.editorId)) {
            return;
        }
        const handle = this.notificationService.prompt(Severity.Warning, localize('editorResolver.conflictingDefaults', 'There are multiple default editors available for the resource.'), [{
                label: localize('editorResolver.configureDefault', 'Configure Default'),
                run: async () => {
                    // Show the picker and tell it to update the setting to whatever the user selected
                    const picked = await this.doPickEditor(untypedInput, true);
                    if (!picked) {
                        return;
                    }
                    untypedInput.options = picked;
                    const replacementEditor = await this.resolveEditor(untypedInput, group);
                    if (replacementEditor === 1 /* ResolvedStatus.ABORT */ || replacementEditor === 2 /* ResolvedStatus.NONE */) {
                        return;
                    }
                    // Replace the current editor with the picked one
                    group.replaceEditors([
                        {
                            editor: currentEditor,
                            replacement: replacementEditor.editor,
                            options: replacementEditor.options ?? picked,
                        }
                    ]);
                }
            },
            {
                label: localize('editorResolver.keepDefault', 'Keep {0}', editorName),
                run: writeCurrentEditorsToStorage
            }
        ]);
        // If the user pressed X we assume they want to keep the current editor as default
        const onCloseListener = handle.onDidClose(() => {
            writeCurrentEditorsToStorage();
            onCloseListener.dispose();
        });
    }
    mapEditorsToQuickPickEntry(resource, showDefaultPicker) {
        const currentEditor = this.editorGroupService.activeGroup.findEditors(resource).at(0);
        // If untitled, we want all registered editors
        let registeredEditors = resource.scheme === Schemas.untitled ? this._registeredEditors.filter(e => e.editorInfo.priority !== RegisteredEditorPriority.exclusive) : this.findMatchingEditors(resource);
        // We don't want duplicate Id entries
        registeredEditors = distinct(registeredEditors, c => c.editorInfo.id);
        const defaultSetting = this.getAssociationsForResource(resource)[0]?.viewType;
        // Not the most efficient way to do this, but we want to ensure the text editor is at the top of the quickpick
        registeredEditors = registeredEditors.sort((a, b) => {
            if (a.editorInfo.id === DEFAULT_EDITOR_ASSOCIATION.id) {
                return -1;
            }
            else if (b.editorInfo.id === DEFAULT_EDITOR_ASSOCIATION.id) {
                return 1;
            }
            else {
                return priorityToRank(b.editorInfo.priority) - priorityToRank(a.editorInfo.priority);
            }
        });
        const quickPickEntries = [];
        const currentlyActiveLabel = localize('promptOpenWith.currentlyActive', "Active");
        const currentDefaultLabel = localize('promptOpenWith.currentDefault', "Default");
        const currentDefaultAndActiveLabel = localize('promptOpenWith.currentDefaultAndActive', "Active and Default");
        // Default order = setting -> highest priority -> text
        let defaultViewType = defaultSetting;
        if (!defaultViewType && registeredEditors.length > 2 && registeredEditors[1]?.editorInfo.priority !== RegisteredEditorPriority.option) {
            defaultViewType = registeredEditors[1]?.editorInfo.id;
        }
        if (!defaultViewType) {
            defaultViewType = DEFAULT_EDITOR_ASSOCIATION.id;
        }
        // Map the editors to quickpick entries
        registeredEditors.forEach(editor => {
            const currentViewType = currentEditor?.editorId ?? DEFAULT_EDITOR_ASSOCIATION.id;
            const isActive = currentEditor ? editor.editorInfo.id === currentViewType : false;
            const isDefault = editor.editorInfo.id === defaultViewType;
            const quickPickEntry = {
                id: editor.editorInfo.id,
                label: editor.editorInfo.label,
                description: isActive && isDefault ? currentDefaultAndActiveLabel : isActive ? currentlyActiveLabel : isDefault ? currentDefaultLabel : undefined,
                detail: editor.editorInfo.detail ?? editor.editorInfo.priority,
            };
            quickPickEntries.push(quickPickEntry);
        });
        if (!showDefaultPicker && extname(resource) !== '') {
            const separator = { type: 'separator' };
            quickPickEntries.push(separator);
            const configureDefaultEntry = {
                id: EditorResolverService_1.configureDefaultID,
                label: localize('promptOpenWith.configureDefault', "Configure default editor for '{0}'...", `*${extname(resource)}`),
            };
            quickPickEntries.push(configureDefaultEntry);
        }
        return quickPickEntries;
    }
    async doPickEditor(editor, showDefaultPicker) {
        let resource = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (resource === undefined) {
            resource = URI.from({ scheme: Schemas.untitled });
        }
        // Get all the editors for the resource as quickpick entries
        const editorPicks = this.mapEditorsToQuickPickEntry(resource, showDefaultPicker);
        // Create the editor picker
        const disposables = new DisposableStore();
        const editorPicker = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        const placeHolderMessage = showDefaultPicker ?
            localize('promptOpenWith.updateDefaultPlaceHolder', "Select new default editor for '{0}'", `*${extname(resource)}`) :
            localize('promptOpenWith.placeHolder', "Select editor for '{0}'", basename(resource));
        editorPicker.placeholder = placeHolderMessage;
        editorPicker.canAcceptInBackground = true;
        editorPicker.items = editorPicks;
        const firstItem = editorPicker.items.find(item => item.type === 'item');
        if (firstItem) {
            editorPicker.selectedItems = [firstItem];
        }
        // Prompt the user to select an editor
        const picked = await new Promise(resolve => {
            disposables.add(editorPicker.onDidAccept(e => {
                let result = undefined;
                if (editorPicker.selectedItems.length === 1) {
                    result = {
                        item: editorPicker.selectedItems[0],
                        keyMods: editorPicker.keyMods,
                        openInBackground: e.inBackground
                    };
                }
                // If asked to always update the setting then update it even if the gear isn't clicked
                if (resource && showDefaultPicker && result?.item.id) {
                    this.updateUserAssociations(`*${extname(resource)}`, result.item.id);
                }
                resolve(result);
            }));
            disposables.add(editorPicker.onDidHide(() => {
                disposables.dispose();
                resolve(undefined);
            }));
            disposables.add(editorPicker.onDidTriggerItemButton(e => {
                // Trigger opening and close picker
                resolve({ item: e.item, openInBackground: false });
                // Persist setting
                if (resource && e.item && e.item.id) {
                    this.updateUserAssociations(`*${extname(resource)}`, e.item.id);
                }
            }));
            editorPicker.show();
        });
        // Close picker
        editorPicker.dispose();
        // If the user picked an editor, look at how the picker was
        // used (e.g. modifier keys, open in background) and create the
        // options and group to use accordingly
        if (picked) {
            // If the user selected to configure default we trigger this picker again and tell it to show the default picker
            if (picked.item.id === EditorResolverService_1.configureDefaultID) {
                return this.doPickEditor(editor, true);
            }
            // Figure out options
            const targetOptions = {
                ...editor.options,
                override: picked.item.id,
                preserveFocus: picked.openInBackground || editor.options?.preserveFocus,
            };
            return targetOptions;
        }
        return undefined;
    }
    cacheEditors() {
        // Create a set to store glob patterns
        const cacheStorage = new Set();
        // Store just the relative pattern pieces without any path info
        for (const [globPattern, contribPoint] of this._flattenedEditors) {
            const nonOptional = !!contribPoint.find(c => c.editorInfo.priority !== RegisteredEditorPriority.option && c.editorInfo.id !== DEFAULT_EDITOR_ASSOCIATION.id);
            // Don't keep a cache of the optional ones as those wouldn't be opened on start anyways
            if (!nonOptional) {
                continue;
            }
            if (glob.isRelativePattern(globPattern)) {
                cacheStorage.add(`${globPattern.pattern}`);
            }
            else {
                cacheStorage.add(globPattern);
            }
        }
        // Also store the users settings as those would have to activate on startup as well
        const userAssociations = this.getAllUserAssociations();
        for (const association of userAssociations) {
            if (association.filenamePattern) {
                cacheStorage.add(association.filenamePattern);
            }
        }
        this.storageService.store(EditorResolverService_1.cacheStorageID, JSON.stringify(Array.from(cacheStorage)), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
    }
    resourceMatchesCache(resource) {
        if (!this.cache) {
            return false;
        }
        for (const cacheEntry of this.cache) {
            if (globMatchesResource(cacheEntry, resource)) {
                return true;
            }
        }
        return false;
    }
};
EditorResolverService = EditorResolverService_1 = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService),
    __param(3, IQuickInputService),
    __param(4, INotificationService),
    __param(5, IStorageService),
    __param(6, IExtensionService),
    __param(7, ILogService)
], EditorResolverService);
export { EditorResolverService };
registerSingleton(IEditorResolverService, EditorResolverService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUmVzb2x2ZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvYnJvd3Nlci9lZGl0b3JSZXNvbHZlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFrQixNQUFNLDhDQUE4QyxDQUFDO0FBQ2xILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxzQkFBc0IsRUFBMEQsd0JBQXdCLEVBQUUsZ0NBQWdDLEVBQUUseUJBQXlCLEVBQUUsK0JBQStCLEVBQUUsNkJBQTZCLEVBQUUsMEJBQTBCLEVBQXVCLGdCQUFnQixFQUFFLDhCQUE4QixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFalosT0FBTyxFQUFnQixvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQXdCLHdCQUF3QixFQUFrRSw0QkFBNEIsRUFBRSxt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