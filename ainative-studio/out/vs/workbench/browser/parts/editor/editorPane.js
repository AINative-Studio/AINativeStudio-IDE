/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Composite } from '../../composite.js';
import { isEditorInput } from '../../../common/editor.js';
import { LRUCache } from '../../../../base/common/map.js';
import { URI } from '../../../../base/common/uri.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS, DEFAULT_EDITOR_MAX_DIMENSIONS } from './editor.js';
import { joinPath, isEqual } from '../../../../base/common/resources.js';
import { indexOfPath } from '../../../../base/common/extpath.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { getWindowById } from '../../../../base/browser/dom.js';
/**
 * The base class of editors in the workbench. Editors register themselves for specific editor inputs.
 * Editors are layed out in the editor part of the workbench in editor groups. Multiple editors can be
 * open at the same time. Each editor has a minimized representation that is good enough to provide some
 * information about the state of the editor data.
 *
 * The workbench will keep an editor alive after it has been created and show/hide it based on
 * user interaction. The lifecycle of a editor goes in the order:
 *
 * - `createEditor()`
 * - `setEditorVisible()`
 * - `layout()`
 * - `setInput()`
 * - `focus()`
 * - `dispose()`: when the editor group the editor is in closes
 *
 * During use of the workbench, a editor will often receive a `clearInput()`, `setEditorVisible()`, `layout()` and
 * `focus()` calls, but only one `create()` and `dispose()` call.
 *
 * This class is only intended to be subclassed and not instantiated.
 */
export class EditorPane extends Composite {
    //#endregion
    static { this.EDITOR_MEMENTOS = new Map(); }
    get minimumWidth() { return DEFAULT_EDITOR_MIN_DIMENSIONS.width; }
    get maximumWidth() { return DEFAULT_EDITOR_MAX_DIMENSIONS.width; }
    get minimumHeight() { return DEFAULT_EDITOR_MIN_DIMENSIONS.height; }
    get maximumHeight() { return DEFAULT_EDITOR_MAX_DIMENSIONS.height; }
    get input() { return this._input; }
    get options() { return this._options; }
    get window() { return getWindowById(this.group.windowId, true).window; }
    /**
     * Should be overridden by editors that have their own ScopedContextKeyService
     */
    get scopedContextKeyService() { return undefined; }
    constructor(id, group, telemetryService, themeService, storageService) {
        super(id, telemetryService, themeService, storageService);
        this.group = group;
        //#region Events
        this.onDidChangeSizeConstraints = Event.None;
        this._onDidChangeControl = this._register(new Emitter());
        this.onDidChangeControl = this._onDidChangeControl.event;
    }
    create(parent) {
        super.create(parent);
        // Create Editor
        this.createEditor(parent);
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Sets the given input with the options to the editor. The input is guaranteed
     * to be different from the previous input that was set using the `input.matches()`
     * method.
     *
     * The provided context gives more information around how the editor was opened.
     *
     * The provided cancellation token should be used to test if the operation
     * was cancelled.
     */
    async setInput(input, options, context, token) {
        this._input = input;
        this._options = options;
    }
    /**
     * Called to indicate to the editor that the input should be cleared and
     * resources associated with the input should be freed.
     *
     * This method can be called based on different contexts, e.g. when opening
     * a different input or different editor control or when closing all editors
     * in a group.
     *
     * To monitor the lifecycle of editor inputs, you should not rely on this
     * method, rather refer to the listeners on `IEditorGroup` via `IEditorGroupsService`.
     */
    clearInput() {
        this._input = undefined;
        this._options = undefined;
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Sets the given options to the editor. Clients should apply the options
     * to the current input.
     */
    setOptions(options) {
        this._options = options;
    }
    setVisible(visible) {
        super.setVisible(visible);
        // Propagate to Editor
        this.setEditorVisible(visible);
    }
    /**
     * Indicates that the editor control got visible or hidden.
     *
     * @param visible the state of visibility of this editor
     */
    setEditorVisible(visible) {
        // Subclasses can implement
    }
    setBoundarySashes(_sashes) {
        // Subclasses can implement
    }
    getEditorMemento(editorGroupService, configurationService, key, limit = 10) {
        const mementoKey = `${this.getId()}${key}`;
        let editorMemento = EditorPane.EDITOR_MEMENTOS.get(mementoKey);
        if (!editorMemento) {
            editorMemento = this._register(new EditorMemento(this.getId(), key, this.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */), limit, editorGroupService, configurationService));
            EditorPane.EDITOR_MEMENTOS.set(mementoKey, editorMemento);
        }
        return editorMemento;
    }
    getViewState() {
        // Subclasses to override
        return undefined;
    }
    saveState() {
        // Save all editor memento for this editor type
        for (const [, editorMemento] of EditorPane.EDITOR_MEMENTOS) {
            if (editorMemento.id === this.getId()) {
                editorMemento.saveState();
            }
        }
        super.saveState();
    }
    dispose() {
        this._input = undefined;
        this._options = undefined;
        super.dispose();
    }
}
export class EditorMemento extends Disposable {
    static { this.SHARED_EDITOR_STATE = -1; } // pick a number < 0 to be outside group id range
    constructor(id, key, memento, limit, editorGroupService, configurationService) {
        super();
        this.id = id;
        this.key = key;
        this.memento = memento;
        this.limit = limit;
        this.editorGroupService = editorGroupService;
        this.configurationService = configurationService;
        this.cleanedUp = false;
        this.shareEditorState = false;
        this.updateConfiguration(undefined);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.updateConfiguration(e)));
    }
    updateConfiguration(e) {
        if (!e || e.affectsConfiguration(undefined, 'workbench.editor.sharedViewState')) {
            this.shareEditorState = this.configurationService.getValue(undefined, 'workbench.editor.sharedViewState') === true;
        }
    }
    saveEditorState(group, resourceOrEditor, state) {
        const resource = this.doGetResource(resourceOrEditor);
        if (!resource || !group) {
            return; // we are not in a good state to save any state for a resource
        }
        const cache = this.doLoad();
        // Ensure mementos for resource map
        let mementosForResource = cache.get(resource.toString());
        if (!mementosForResource) {
            mementosForResource = Object.create(null);
            cache.set(resource.toString(), mementosForResource);
        }
        // Store state for group
        mementosForResource[group.id] = state;
        // Store state as most recent one based on settings
        if (this.shareEditorState) {
            mementosForResource[EditorMemento.SHARED_EDITOR_STATE] = state;
        }
        // Automatically clear when editor input gets disposed if any
        if (isEditorInput(resourceOrEditor)) {
            this.clearEditorStateOnDispose(resource, resourceOrEditor);
        }
    }
    loadEditorState(group, resourceOrEditor) {
        const resource = this.doGetResource(resourceOrEditor);
        if (!resource || !group) {
            return; // we are not in a good state to load any state for a resource
        }
        const cache = this.doLoad();
        const mementosForResource = cache.get(resource.toString());
        if (mementosForResource) {
            const mementoForResourceAndGroup = mementosForResource[group.id];
            // Return state for group if present
            if (mementoForResourceAndGroup) {
                return mementoForResourceAndGroup;
            }
            // Return most recent state based on settings otherwise
            if (this.shareEditorState) {
                return mementosForResource[EditorMemento.SHARED_EDITOR_STATE];
            }
        }
        return undefined;
    }
    clearEditorState(resourceOrEditor, group) {
        if (isEditorInput(resourceOrEditor)) {
            this.editorDisposables?.delete(resourceOrEditor);
        }
        const resource = this.doGetResource(resourceOrEditor);
        if (resource) {
            const cache = this.doLoad();
            // Clear state for group
            if (group) {
                const mementosForResource = cache.get(resource.toString());
                if (mementosForResource) {
                    delete mementosForResource[group.id];
                    if (isEmptyObject(mementosForResource)) {
                        cache.delete(resource.toString());
                    }
                }
            }
            // Clear state across all groups for resource
            else {
                cache.delete(resource.toString());
            }
        }
    }
    clearEditorStateOnDispose(resource, editor) {
        if (!this.editorDisposables) {
            this.editorDisposables = new Map();
        }
        if (!this.editorDisposables.has(editor)) {
            this.editorDisposables.set(editor, Event.once(editor.onWillDispose)(() => {
                this.clearEditorState(resource);
                this.editorDisposables?.delete(editor);
            }));
        }
    }
    moveEditorState(source, target, comparer) {
        const cache = this.doLoad();
        // We need a copy of the keys to not iterate over
        // newly inserted elements.
        const cacheKeys = [...cache.keys()];
        for (const cacheKey of cacheKeys) {
            const resource = URI.parse(cacheKey);
            if (!comparer.isEqualOrParent(resource, source)) {
                continue; // not matching our resource
            }
            // Determine new resulting target resource
            let targetResource;
            if (isEqual(source, resource)) {
                targetResource = target; // file got moved
            }
            else {
                const index = indexOfPath(resource.path, source.path);
                targetResource = joinPath(target, resource.path.substr(index + source.path.length + 1)); // parent folder got moved
            }
            // Don't modify LRU state
            const value = cache.get(cacheKey, 0 /* Touch.None */);
            if (value) {
                cache.delete(cacheKey);
                cache.set(targetResource.toString(), value);
            }
        }
    }
    doGetResource(resourceOrEditor) {
        if (isEditorInput(resourceOrEditor)) {
            return resourceOrEditor.resource;
        }
        return resourceOrEditor;
    }
    doLoad() {
        if (!this.cache) {
            this.cache = new LRUCache(this.limit);
            // Restore from serialized map state
            const rawEditorMemento = this.memento[this.key];
            if (Array.isArray(rawEditorMemento)) {
                this.cache.fromJSON(rawEditorMemento);
            }
        }
        return this.cache;
    }
    saveState() {
        const cache = this.doLoad();
        // Cleanup once during session
        if (!this.cleanedUp) {
            this.cleanUp();
            this.cleanedUp = true;
        }
        this.memento[this.key] = cache.toJSON();
    }
    cleanUp() {
        const cache = this.doLoad();
        // Remove groups from states that no longer exist. Since we modify the
        // cache and its is a LRU cache make a copy to ensure iteration succeeds
        const entries = [...cache.entries()];
        for (const [resource, mapGroupToMementos] of entries) {
            for (const group of Object.keys(mapGroupToMementos)) {
                const groupId = Number(group);
                if (groupId === EditorMemento.SHARED_EDITOR_STATE && this.shareEditorState) {
                    continue; // skip over shared entries if sharing is enabled
                }
                if (!this.editorGroupService.getGroup(groupId)) {
                    delete mapGroupToMementos[groupId];
                    if (isEmptyObject(mapGroupToMementos)) {
                        cache.delete(resource);
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9yUGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFvRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQU81SCxPQUFPLEVBQUUsUUFBUSxFQUFTLE1BQU0sZ0NBQWdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUUzRixPQUFPLEVBQUUsUUFBUSxFQUFXLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFLL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWhFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNILE1BQU0sT0FBZ0IsVUFBVyxTQUFRLFNBQVM7SUFTakQsWUFBWTthQUVZLG9CQUFlLEdBQUcsSUFBSSxHQUFHLEVBQThCLEFBQXhDLENBQXlDO0lBRWhGLElBQUksWUFBWSxLQUFLLE9BQU8sNkJBQTZCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNs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