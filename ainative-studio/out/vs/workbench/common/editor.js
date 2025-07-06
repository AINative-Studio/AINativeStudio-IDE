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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUV4QyxPQUFPLEVBQTJCLGVBQWUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3RGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSXZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBMkQsTUFBTSxzREFBc0QsQ0FBQztBQUV0SixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFJdEUsT0FBTyxFQUFFLFFBQVEsRUFBaUMsTUFBTSxzQ0FBc0MsQ0FBQztBQUcvRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHdkQsT0FBTyxFQUFxQixzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xILE9BQU8sRUFBVyxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLFFBQVEsTUFBTSwrQkFBK0IsQ0FBQztBQUlyRCx5Q0FBeUM7QUFDekMsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUc7SUFDL0IsVUFBVSxFQUFFLGlDQUFpQztJQUM3QyxhQUFhLEVBQUUsK0NBQStDO0NBQzlELENBQUM7QUFFRiwrQ0FBK0M7QUFDL0MsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUc7SUFDekMsRUFBRSxFQUFFLFNBQVM7SUFDYixXQUFXLEVBQUUsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLGFBQWEsQ0FBQztJ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