/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../nls.js';
import { assertIsDefined } from '../../base/common/types.js';
import { URI } from '../../base/common/uri.js';
import { Disposable, toDisposable } from '../../base/common/lifecycle.js';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../platform/registry/common/platform.js';
import { FileType } from '../../platform/files/common/files.js';
import { Schemas } from '../../base/common/network.js';
import { createErrorWithActions, isErrorWithActions } from '../../base/common/errorMessage.js';
import { toAction } from '../../base/common/actions.js';
import Severity from '../../base/common/severity.js';
// Static values for editor contributions
export const EditorExtensions = {
    EditorPane: 'workbench.contributions.editors',
    EditorFactory: 'workbench.contributions.editor.inputFactories'
};
// Static information regarding the text editor
export const DEFAULT_EDITOR_ASSOCIATION = {
    id: 'default',
    displayName: localize('promptOpenWith.defaultEditor.displayName', "Text Editor"),
    providerDisplayName: localize('builtinProviderDisplayName', "Built-in")
};
/**
 * Side by side editor id.
 */
export const SIDE_BY_SIDE_EDITOR_ID = 'workbench.editor.sidebysideEditor';
/**
 * Text diff editor id.
 */
export const TEXT_DIFF_EDITOR_ID = 'workbench.editors.textDiffEditor';
/**
 * Binary diff editor id.
 */
export const BINARY_DIFF_EDITOR_ID = 'workbench.editors.binaryResourceDiffEditor';
export var EditorPaneSelectionChangeReason;
(function (EditorPaneSelectionChangeReason) {
    /**
     * The selection was changed as a result of a programmatic
     * method invocation.
     *
     * For a text editor pane, this for example can be a selection
     * being restored from previous view state automatically.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["PROGRAMMATIC"] = 1] = "PROGRAMMATIC";
    /**
     * The selection was changed by the user.
     *
     * This typically means the user changed the selection
     * with mouse or keyboard.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["USER"] = 2] = "USER";
    /**
     * The selection was changed as a result of editing in
     * the editor pane.
     *
     * For a text editor pane, this for example can be typing
     * in the text of the editor pane.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["EDIT"] = 3] = "EDIT";
    /**
     * The selection was changed as a result of a navigation
     * action.
     *
     * For a text editor pane, this for example can be a result
     * of selecting an entry from a text outline view.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["NAVIGATION"] = 4] = "NAVIGATION";
    /**
     * The selection was changed as a result of a jump action
     * from within the editor pane.
     *
     * For a text editor pane, this for example can be a result
     * of invoking "Go to definition" from a symbol.
     */
    EditorPaneSelectionChangeReason[EditorPaneSelectionChangeReason["JUMP"] = 5] = "JUMP";
})(EditorPaneSelectionChangeReason || (EditorPaneSelectionChangeReason = {}));
export var EditorPaneSelectionCompareResult;
(function (EditorPaneSelectionCompareResult) {
    /**
     * The selections are identical.
     */
    EditorPaneSelectionCompareResult[EditorPaneSelectionCompareResult["IDENTICAL"] = 1] = "IDENTICAL";
    /**
     * The selections are similar.
     *
     * For a text editor this can mean that the one
     * selection is in close proximity to the other
     * selection.
     *
     * Upstream clients may decide in this case to
     * not treat the selection different from the
     * previous one because it is not distinct enough.
     */
    EditorPaneSelectionCompareResult[EditorPaneSelectionCompareResult["SIMILAR"] = 2] = "SIMILAR";
    /**
     * The selections are entirely different.
     */
    EditorPaneSelectionCompareResult[EditorPaneSelectionCompareResult["DIFFERENT"] = 3] = "DIFFERENT";
})(EditorPaneSelectionCompareResult || (EditorPaneSelectionCompareResult = {}));
export function isEditorPaneWithSelection(editorPane) {
    const candidate = editorPane;
    return !!candidate && typeof candidate.getSelection === 'function' && !!candidate.onDidChangeSelection;
}
export function isEditorPaneWithScrolling(editorPane) {
    const candidate = editorPane;
    return !!candidate && typeof candidate.getScrollPosition === 'function' && typeof candidate.setScrollPosition === 'function' && !!candidate.onDidChangeScroll;
}
/**
 * Try to retrieve the view state for the editor pane that
 * has the provided editor input opened, if at all.
 *
 * This method will return `undefined` if the editor input
 * is not visible in any of the opened editor panes.
 */
export function findViewStateForEditor(input, group, editorService) {
    for (const editorPane of editorService.visibleEditorPanes) {
        if (editorPane.group.id === group && input.matches(editorPane.input)) {
            return editorPane.getViewState();
        }
    }
    return undefined;
}
export function isResourceEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    return URI.isUri(candidate?.resource);
}
export function isResourceDiffEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    return candidate?.original !== undefined && candidate.modified !== undefined;
}
export function isResourceMultiDiffEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    if (!candidate) {
        return false;
    }
    if (candidate.resources && !Array.isArray(candidate.resources)) {
        return false;
    }
    return !!candidate.resources || !!candidate.multiDiffSource;
}
export function isResourceSideBySideEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    if (isResourceDiffEditorInput(editor)) {
        return false; // make sure to not accidentally match on diff editors
    }
    const candidate = editor;
    return candidate?.primary !== undefined && candidate.secondary !== undefined;
}
export function isUntitledResourceEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    if (!candidate) {
        return false;
    }
    return candidate.resource === undefined || candidate.resource.scheme === Schemas.untitled || candidate.forceUntitled === true;
}
export function isResourceMergeEditorInput(editor) {
    if (isEditorInput(editor)) {
        return false; // make sure to not accidentally match on typed editor inputs
    }
    const candidate = editor;
    return URI.isUri(candidate?.base?.resource) && URI.isUri(candidate?.input1?.resource) && URI.isUri(candidate?.input2?.resource) && URI.isUri(candidate?.result?.resource);
}
export var Verbosity;
(function (Verbosity) {
    Verbosity[Verbosity["SHORT"] = 0] = "SHORT";
    Verbosity[Verbosity["MEDIUM"] = 1] = "MEDIUM";
    Verbosity[Verbosity["LONG"] = 2] = "LONG";
})(Verbosity || (Verbosity = {}));
export var SaveReason;
(function (SaveReason) {
    /**
     * Explicit user gesture.
     */
    SaveReason[SaveReason["EXPLICIT"] = 1] = "EXPLICIT";
    /**
     * Auto save after a timeout.
     */
    SaveReason[SaveReason["AUTO"] = 2] = "AUTO";
    /**
     * Auto save after editor focus change.
     */
    SaveReason[SaveReason["FOCUS_CHANGE"] = 3] = "FOCUS_CHANGE";
    /**
     * Auto save after window change.
     */
    SaveReason[SaveReason["WINDOW_CHANGE"] = 4] = "WINDOW_CHANGE";
})(SaveReason || (SaveReason = {}));
class SaveSourceFactory {
    constructor() {
        this.mapIdToSaveSource = new Map();
    }
    /**
     * Registers a `SaveSource` with an identifier and label
     * to the registry so that it can be used in save operations.
     */
    registerSource(id, label) {
        let sourceDescriptor = this.mapIdToSaveSource.get(id);
        if (!sourceDescriptor) {
            sourceDescriptor = { source: id, label };
            this.mapIdToSaveSource.set(id, sourceDescriptor);
        }
        return sourceDescriptor.source;
    }
    getSourceLabel(source) {
        return this.mapIdToSaveSource.get(source)?.label ?? source;
    }
}
export const SaveSourceRegistry = new SaveSourceFactory();
export var EditorInputCapabilities;
(function (EditorInputCapabilities) {
    /**
     * Signals no specific capability for the input.
     */
    EditorInputCapabilities[EditorInputCapabilities["None"] = 0] = "None";
    /**
     * Signals that the input is readonly.
     */
    EditorInputCapabilities[EditorInputCapabilities["Readonly"] = 2] = "Readonly";
    /**
     * Signals that the input is untitled.
     */
    EditorInputCapabilities[EditorInputCapabilities["Untitled"] = 4] = "Untitled";
    /**
     * Signals that the input can only be shown in one group
     * and not be split into multiple groups.
     */
    EditorInputCapabilities[EditorInputCapabilities["Singleton"] = 8] = "Singleton";
    /**
     * Signals that the input requires workspace trust.
     */
    EditorInputCapabilities[EditorInputCapabilities["RequiresTrust"] = 16] = "RequiresTrust";
    /**
     * Signals that the editor can split into 2 in the same
     * editor group.
     */
    EditorInputCapabilities[EditorInputCapabilities["CanSplitInGroup"] = 32] = "CanSplitInGroup";
    /**
     * Signals that the editor wants its description to be
     * visible when presented to the user. By default, a UI
     * component may decide to hide the description portion
     * for brevity.
     */
    EditorInputCapabilities[EditorInputCapabilities["ForceDescription"] = 64] = "ForceDescription";
    /**
     * Signals that the editor supports dropping into the
     * editor by holding shift.
     */
    EditorInputCapabilities[EditorInputCapabilities["CanDropIntoEditor"] = 128] = "CanDropIntoEditor";
    /**
     * Signals that the editor is composed of multiple editors
     * within.
     */
    EditorInputCapabilities[EditorInputCapabilities["MultipleEditors"] = 256] = "MultipleEditors";
    /**
     * Signals that the editor cannot be in a dirty state
     * and may still have unsaved changes
     */
    EditorInputCapabilities[EditorInputCapabilities["Scratchpad"] = 512] = "Scratchpad";
})(EditorInputCapabilities || (EditorInputCapabilities = {}));
export class AbstractEditorInput extends Disposable {
}
export function isEditorInput(editor) {
    return editor instanceof AbstractEditorInput;
}
function isEditorInputWithPreferredResource(editor) {
    const candidate = editor;
    return URI.isUri(candidate?.preferredResource);
}
export function isSideBySideEditorInput(editor) {
    const candidate = editor;
    return isEditorInput(candidate?.primary) && isEditorInput(candidate?.secondary);
}
export function isDiffEditorInput(editor) {
    const candidate = editor;
    return isEditorInput(candidate?.modified) && isEditorInput(candidate?.original);
}
export function createTooLargeFileError(group, input, options, message, preferencesService) {
    return createEditorOpenError(message, [
        toAction({
            id: 'workbench.action.openLargeFile', label: localize('openLargeFile', "Open Anyway"), run: () => {
                const fileEditorOptions = {
                    ...options,
                    limits: {
                        size: Number.MAX_VALUE
                    }
                };
                group.openEditor(input, fileEditorOptions);
            }
        }),
        toAction({
            id: 'workbench.action.configureEditorLargeFileConfirmation', label: localize('configureEditorLargeFileConfirmation', "Configure Limit"), run: () => {
                return preferencesService.openUserSettings({ query: 'workbench.editorLargeFileConfirmation' });
            }
        }),
    ], {
        forceMessage: true,
        forceSeverity: Severity.Warning
    });
}
export function isEditorInputWithOptions(editor) {
    const candidate = editor;
    return isEditorInput(candidate?.editor);
}
export function isEditorInputWithOptionsAndGroup(editor) {
    const candidate = editor;
    return isEditorInputWithOptions(editor) && candidate?.group !== undefined;
}
export function isEditorIdentifier(identifier) {
    const candidate = identifier;
    return typeof candidate?.groupId === 'number' && isEditorInput(candidate.editor);
}
export function isEditorCommandsContext(context) {
    const candidate = context;
    return typeof candidate?.groupId === 'number';
}
/**
 * More information around why an editor was closed in the model.
 */
export var EditorCloseContext;
(function (EditorCloseContext) {
    /**
     * No specific context for closing (e.g. explicit user gesture).
     */
    EditorCloseContext[EditorCloseContext["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * The editor closed because it was replaced with another editor.
     * This can either happen via explicit replace call or when an
     * editor is in preview mode and another editor opens.
     */
    EditorCloseContext[EditorCloseContext["REPLACE"] = 1] = "REPLACE";
    /**
     * The editor closed as a result of moving it to another group.
     */
    EditorCloseContext[EditorCloseContext["MOVE"] = 2] = "MOVE";
    /**
     * The editor closed because another editor turned into preview
     * and this used to be the preview editor before.
     */
    EditorCloseContext[EditorCloseContext["UNPIN"] = 3] = "UNPIN";
})(EditorCloseContext || (EditorCloseContext = {}));
export var GroupModelChangeKind;
(function (GroupModelChangeKind) {
    /* Group Changes */
    GroupModelChangeKind[GroupModelChangeKind["GROUP_ACTIVE"] = 0] = "GROUP_ACTIVE";
    GroupModelChangeKind[GroupModelChangeKind["GROUP_INDEX"] = 1] = "GROUP_INDEX";
    GroupModelChangeKind[GroupModelChangeKind["GROUP_LABEL"] = 2] = "GROUP_LABEL";
    GroupModelChangeKind[GroupModelChangeKind["GROUP_LOCKED"] = 3] = "GROUP_LOCKED";
    /* Editors Change */
    GroupModelChangeKind[GroupModelChangeKind["EDITORS_SELECTION"] = 4] = "EDITORS_SELECTION";
    /* Editor Changes */
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_OPEN"] = 5] = "EDITOR_OPEN";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_CLOSE"] = 6] = "EDITOR_CLOSE";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_MOVE"] = 7] = "EDITOR_MOVE";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_ACTIVE"] = 8] = "EDITOR_ACTIVE";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_LABEL"] = 9] = "EDITOR_LABEL";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_CAPABILITIES"] = 10] = "EDITOR_CAPABILITIES";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_PIN"] = 11] = "EDITOR_PIN";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_TRANSIENT"] = 12] = "EDITOR_TRANSIENT";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_STICKY"] = 13] = "EDITOR_STICKY";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_DIRTY"] = 14] = "EDITOR_DIRTY";
    GroupModelChangeKind[GroupModelChangeKind["EDITOR_WILL_DISPOSE"] = 15] = "EDITOR_WILL_DISPOSE";
})(GroupModelChangeKind || (GroupModelChangeKind = {}));
export var SideBySideEditor;
(function (SideBySideEditor) {
    SideBySideEditor[SideBySideEditor["PRIMARY"] = 1] = "PRIMARY";
    SideBySideEditor[SideBySideEditor["SECONDARY"] = 2] = "SECONDARY";
    SideBySideEditor[SideBySideEditor["BOTH"] = 3] = "BOTH";
    SideBySideEditor[SideBySideEditor["ANY"] = 4] = "ANY";
})(SideBySideEditor || (SideBySideEditor = {}));
class EditorResourceAccessorImpl {
    getOriginalUri(editor, options) {
        if (!editor) {
            return undefined;
        }
        // Merge editors are handled with `merged` result editor
        if (isResourceMergeEditorInput(editor)) {
            return EditorResourceAccessor.getOriginalUri(editor.result, options);
        }
        // Optionally support side-by-side editors
        if (options?.supportSideBySide) {
            const { primary, secondary } = this.getSideEditors(editor);
            if (primary && secondary) {
                if (options?.supportSideBySide === SideBySideEditor.BOTH) {
                    return {
                        primary: this.getOriginalUri(primary, { filterByScheme: options.filterByScheme }),
                        secondary: this.getOriginalUri(secondary, { filterByScheme: options.filterByScheme })
                    };
                }
                else if (options?.supportSideBySide === SideBySideEditor.ANY) {
                    return this.getOriginalUri(primary, { filterByScheme: options.filterByScheme }) ?? this.getOriginalUri(secondary, { filterByScheme: options.filterByScheme });
                }
                editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? primary : secondary;
            }
        }
        if (isResourceDiffEditorInput(editor) || isResourceMultiDiffEditorInput(editor) || isResourceSideBySideEditorInput(editor) || isResourceMergeEditorInput(editor)) {
            return undefined;
        }
        // Original URI is the `preferredResource` of an editor if any
        const originalResource = isEditorInputWithPreferredResource(editor) ? editor.preferredResource : editor.resource;
        if (!originalResource || !options || !options.filterByScheme) {
            return originalResource;
        }
        return this.filterUri(originalResource, options.filterByScheme);
    }
    getSideEditors(editor) {
        if (isSideBySideEditorInput(editor) || isResourceSideBySideEditorInput(editor)) {
            return { primary: editor.primary, secondary: editor.secondary };
        }
        if (isDiffEditorInput(editor) || isResourceDiffEditorInput(editor)) {
            return { primary: editor.modified, secondary: editor.original };
        }
        return { primary: undefined, secondary: undefined };
    }
    getCanonicalUri(editor, options) {
        if (!editor) {
            return undefined;
        }
        // Merge editors are handled with `merged` result editor
        if (isResourceMergeEditorInput(editor)) {
            return EditorResourceAccessor.getCanonicalUri(editor.result, options);
        }
        // Optionally support side-by-side editors
        if (options?.supportSideBySide) {
            const { primary, secondary } = this.getSideEditors(editor);
            if (primary && secondary) {
                if (options?.supportSideBySide === SideBySideEditor.BOTH) {
                    return {
                        primary: this.getCanonicalUri(primary, { filterByScheme: options.filterByScheme }),
                        secondary: this.getCanonicalUri(secondary, { filterByScheme: options.filterByScheme })
                    };
                }
                else if (options?.supportSideBySide === SideBySideEditor.ANY) {
                    return this.getCanonicalUri(primary, { filterByScheme: options.filterByScheme }) ?? this.getCanonicalUri(secondary, { filterByScheme: options.filterByScheme });
                }
                editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? primary : secondary;
            }
        }
        if (isResourceDiffEditorInput(editor) || isResourceMultiDiffEditorInput(editor) || isResourceSideBySideEditorInput(editor) || isResourceMergeEditorInput(editor)) {
            return undefined;
        }
        // Canonical URI is the `resource` of an editor
        const canonicalResource = editor.resource;
        if (!canonicalResource || !options || !options.filterByScheme) {
            return canonicalResource;
        }
        return this.filterUri(canonicalResource, options.filterByScheme);
    }
    filterUri(resource, filter) {
        // Multiple scheme filter
        if (Array.isArray(filter)) {
            if (filter.some(scheme => resource.scheme === scheme)) {
                return resource;
            }
        }
        // Single scheme filter
        else {
            if (filter === resource.scheme) {
                return resource;
            }
        }
        return undefined;
    }
}
export var EditorCloseMethod;
(function (EditorCloseMethod) {
    EditorCloseMethod[EditorCloseMethod["UNKNOWN"] = 0] = "UNKNOWN";
    EditorCloseMethod[EditorCloseMethod["KEYBOARD"] = 1] = "KEYBOARD";
    EditorCloseMethod[EditorCloseMethod["MOUSE"] = 2] = "MOUSE";
})(EditorCloseMethod || (EditorCloseMethod = {}));
export function preventEditorClose(group, editor, method, configuration) {
    if (!group.isSticky(editor)) {
        return false; // only interested in sticky editors
    }
    switch (configuration.preventPinnedEditorClose) {
        case 'keyboardAndMouse': return method === EditorCloseMethod.MOUSE || method === EditorCloseMethod.KEYBOARD;
        case 'mouse': return method === EditorCloseMethod.MOUSE;
        case 'keyboard': return method === EditorCloseMethod.KEYBOARD;
    }
    return false;
}
export const EditorResourceAccessor = new EditorResourceAccessorImpl();
export var CloseDirection;
(function (CloseDirection) {
    CloseDirection[CloseDirection["LEFT"] = 0] = "LEFT";
    CloseDirection[CloseDirection["RIGHT"] = 1] = "RIGHT";
})(CloseDirection || (CloseDirection = {}));
class EditorFactoryRegistry {
    constructor() {
        this.editorSerializerConstructors = new Map();
        this.editorSerializerInstances = new Map();
    }
    start(accessor) {
        const instantiationService = this.instantiationService = accessor.get(IInstantiationService);
        for (const [key, ctor] of this.editorSerializerConstructors) {
            this.createEditorSerializer(key, ctor, instantiationService);
        }
        this.editorSerializerConstructors.clear();
    }
    createEditorSerializer(editorTypeId, ctor, instantiationService) {
        const instance = instantiationService.createInstance(ctor);
        this.editorSerializerInstances.set(editorTypeId, instance);
    }
    registerFileEditorFactory(factory) {
        if (this.fileEditorFactory) {
            throw new Error('Can only register one file editor factory.');
        }
        this.fileEditorFactory = factory;
    }
    getFileEditorFactory() {
        return assertIsDefined(this.fileEditorFactory);
    }
    registerEditorSerializer(editorTypeId, ctor) {
        if (this.editorSerializerConstructors.has(editorTypeId) || this.editorSerializerInstances.has(editorTypeId)) {
            throw new Error(`A editor serializer with type ID '${editorTypeId}' was already registered.`);
        }
        if (!this.instantiationService) {
            this.editorSerializerConstructors.set(editorTypeId, ctor);
        }
        else {
            this.createEditorSerializer(editorTypeId, ctor, this.instantiationService);
        }
        return toDisposable(() => {
            this.editorSerializerConstructors.delete(editorTypeId);
            this.editorSerializerInstances.delete(editorTypeId);
        });
    }
    getEditorSerializer(arg1) {
        return this.editorSerializerInstances.get(typeof arg1 === 'string' ? arg1 : arg1.typeId);
    }
}
Registry.add(EditorExtensions.EditorFactory, new EditorFactoryRegistry());
export async function pathsToEditors(paths, fileService, logService) {
    if (!paths || !paths.length) {
        return [];
    }
    return await Promise.all(paths.map(async (path) => {
        const resource = URI.revive(path.fileUri);
        if (!resource) {
            logService.info('Cannot resolve the path because it is not valid.', path);
            return undefined;
        }
        const canHandleResource = await fileService.canHandleResource(resource);
        if (!canHandleResource) {
            logService.info('Cannot resolve the path because it cannot be handled', path);
            return undefined;
        }
        let exists = path.exists;
        let type = path.type;
        if (typeof exists !== 'boolean' || typeof type !== 'number') {
            try {
                type = (await fileService.stat(resource)).isDirectory ? FileType.Directory : FileType.Unknown;
                exists = true;
            }
            catch (error) {
                logService.error(error);
                exists = false;
            }
        }
        if (!exists && path.openOnlyIfExists) {
            logService.info('Cannot resolve the path because it does not exist', path);
            return undefined;
        }
        if (type === FileType.Directory) {
            logService.info('Cannot resolve the path because it is a directory', path);
            return undefined;
        }
        const options = {
            ...path.options,
            pinned: true
        };
        if (!exists) {
            return { resource, options, forceUntitled: true };
        }
        return { resource, options };
    }));
}
export var EditorsOrder;
(function (EditorsOrder) {
    /**
     * Editors sorted by most recent activity (most recent active first)
     */
    EditorsOrder[EditorsOrder["MOST_RECENTLY_ACTIVE"] = 0] = "MOST_RECENTLY_ACTIVE";
    /**
     * Editors sorted by sequential order
     */
    EditorsOrder[EditorsOrder["SEQUENTIAL"] = 1] = "SEQUENTIAL";
})(EditorsOrder || (EditorsOrder = {}));
export function isTextEditorViewState(candidate) {
    const viewState = candidate;
    if (!viewState) {
        return false;
    }
    const diffEditorViewState = viewState;
    if (diffEditorViewState.modified) {
        return isTextEditorViewState(diffEditorViewState.modified);
    }
    const codeEditorViewState = viewState;
    return !!(codeEditorViewState.contributionsState && codeEditorViewState.viewState && Array.isArray(codeEditorViewState.cursorState));
}
export function isEditorOpenError(obj) {
    return isErrorWithActions(obj);
}
export function createEditorOpenError(messageOrError, actions, options) {
    const error = createErrorWithActions(messageOrError, actions);
    error.forceMessage = options?.forceMessage;
    error.forceSeverity = options?.forceSeverity;
    error.allowDialog = options?.allowDialog;
    return error;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFFeEMsT0FBTyxFQUEyQixlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN0RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0MsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUl2RixPQUFPLEVBQUUscUJBQXFCLEVBQTJELE1BQU0sc0RBQXNELENBQUM7QUFFdEosT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBSXRFLE9BQU8sRUFBRSxRQUFRLEVBQWlDLE1BQU0sc0NBQXNDLENBQUM7QUFHL0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBR3ZELE9BQU8sRUFBcUIsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNsSCxPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDakUsT0FBTyxRQUFRLE1BQU0sK0JBQStCLENBQUM7QUFJckQseUNBQXlDO0FBQ3pDLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHO0lBQy9CLFVBQVUsRUFBRSxpQ0FBaUM7SUFDN0MsYUFBYSxFQUFFLCtDQUErQztDQUM5RCxDQUFDO0FBRUYsK0NBQStDO0FBQy9DLE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHO0lBQ3pDLEVBQUUsRUFBRSxTQUFTO0lBQ2IsV0FBVyxFQUFFLFFBQVEsQ0FBQywwQ0FBMEMsRUFBRSxhQUFhLENBQUM7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