/*--------------------------------------------------------------------------------------
 *  Copyright 2025 AINative Studio All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { registerSingleton } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IConsistentItemService = createDecorator('ConsistentItemService');
let ConsistentItemService = class ConsistentItemService extends Disposable {
    constructor(_editorService) {
        super();
        this._editorService = _editorService;
        // the items that are attached to each URI, completely independent from current state of editors
        this.consistentItemIdsOfURI = {};
        this.infoOfConsistentItemId = {};
        // current state of items on each editor, and the fns to call to remove them
        this.itemIdsOfEditorId = {};
        this.consistentItemIdOfItemId = {};
        this.disposeFnOfItemId = {};
        this.consistentItemIdPool = 0;
        const removeItemsFromEditor = (editor) => {
            const editorId = editor.getId();
            for (const itemId of this.itemIdsOfEditorId[editorId] ?? [])
                this._removeItemFromEditor(editor, itemId);
        };
        // put items on the editor, based on the consistent items for that URI
        const putItemsOnEditor = (editor, uri) => {
            if (!uri)
                return;
            for (const consistentItemId of this.consistentItemIdsOfURI[uri.fsPath] ?? [])
                this._putItemOnEditor(editor, consistentItemId);
        };
        // when editor switches tabs (models)
        const addTabSwitchListeners = (editor) => {
            this._register(editor.onDidChangeModel(e => {
                removeItemsFromEditor(editor);
                putItemsOnEditor(editor, e.newModelUrl);
            }));
        };
        // when editor is disposed
        const addDisposeListener = (editor) => {
            this._register(editor.onDidDispose(() => {
                // anything on the editor has been disposed already
                for (const itemId of this.itemIdsOfEditorId[editor.getId()] ?? [])
                    delete this.disposeFnOfItemId[itemId];
            }));
        };
        const initializeEditor = (editor) => {
            // if (editor.getModel()?.uri.scheme !== 'file') return // THIS BREAKS THINGS
            addTabSwitchListeners(editor);
            addDisposeListener(editor);
            putItemsOnEditor(editor, editor.getModel()?.uri ?? null);
        };
        // initialize current editors + any new editors
        for (let editor of this._editorService.listCodeEditors())
            initializeEditor(editor);
        this._register(this._editorService.onCodeEditorAdd(editor => { initializeEditor(editor); }));
        // when an editor is deleted, remove its items
        this._register(this._editorService.onCodeEditorRemove(editor => { removeItemsFromEditor(editor); }));
    }
    _putItemOnEditor(editor, consistentItemId) {
        const { fn } = this.infoOfConsistentItemId[consistentItemId];
        // add item
        const dispose = fn(editor);
        const itemId = generateUuid();
        const editorId = editor.getId();
        if (!(editorId in this.itemIdsOfEditorId))
            this.itemIdsOfEditorId[editorId] = new Set();
        this.itemIdsOfEditorId[editorId].add(itemId);
        this.consistentItemIdOfItemId[itemId] = consistentItemId;
        this.disposeFnOfItemId[itemId] = () => {
            // console.log('calling remove for', itemId)
            dispose?.();
        };
    }
    _removeItemFromEditor(editor, itemId) {
        const editorId = editor.getId();
        this.itemIdsOfEditorId[editorId]?.delete(itemId);
        this.disposeFnOfItemId[itemId]?.();
        delete this.disposeFnOfItemId[itemId];
        delete this.consistentItemIdOfItemId[itemId];
    }
    getEditorsOnURI(uri) {
        const editors = this._editorService.listCodeEditors().filter(editor => editor.getModel()?.uri.fsPath === uri.fsPath);
        return editors;
    }
    addConsistentItemToURI({ uri, fn }) {
        const consistentItemId = (this.consistentItemIdPool++) + '';
        if (!(uri.fsPath in this.consistentItemIdsOfURI))
            this.consistentItemIdsOfURI[uri.fsPath] = new Set();
        this.consistentItemIdsOfURI[uri.fsPath].add(consistentItemId);
        this.infoOfConsistentItemId[consistentItemId] = { fn, uri };
        const editors = this.getEditorsOnURI(uri);
        for (const editor of editors)
            this._putItemOnEditor(editor, consistentItemId);
        return consistentItemId;
    }
    removeConsistentItemFromURI(consistentItemId) {
        if (!(consistentItemId in this.infoOfConsistentItemId))
            return;
        const { uri } = this.infoOfConsistentItemId[consistentItemId];
        const editors = this.getEditorsOnURI(uri);
        for (const editor of editors) {
            for (const itemId of this.itemIdsOfEditorId[editor.getId()] ?? []) {
                if (this.consistentItemIdOfItemId[itemId] === consistentItemId)
                    this._removeItemFromEditor(editor, itemId);
            }
        }
        // clear
        this.consistentItemIdsOfURI[uri.fsPath]?.delete(consistentItemId);
        delete this.infoOfConsistentItemId[consistentItemId];
    }
};
ConsistentItemService = __decorate([
    __param(0, ICodeEditorService)
], ConsistentItemService);
export { ConsistentItemService };
registerSingleton(IConsistentItemService, ConsistentItemService, 0 /* InstantiationType.Eager */);
export const IConsistentEditorItemService = createDecorator('ConsistentEditorItemService');
let ConsistentEditorItemService = class ConsistentEditorItemService extends Disposable {
    constructor(_editorService) {
        super();
        this._editorService = _editorService;
        /**
         * For each editorId, we track the set of itemIds that have been "added" to that editor.
         * This does *not* necessarily mean they're currently mounted (the user may have switched models).
         */
        this.itemIdsByEditorId = {};
        /**
         * For each itemId, we store relevant info (the fn to call on the editor, the editorId, the uri, and the current dispose function).
         */
        this.itemInfoById = {};
        //
        // Wire up listeners to watch for new editors, removed editors, etc.
        //
        // Initialize any already-existing editors
        for (const editor of this._editorService.listCodeEditors()) {
            this._initializeEditor(editor);
        }
        // When an editor is added, track it
        this._register(this._editorService.onCodeEditorAdd((editor) => {
            this._initializeEditor(editor);
        }));
        // When an editor is removed, remove all items associated with that editor
        this._register(this._editorService.onCodeEditorRemove((editor) => {
            this._removeAllItemsFromEditor(editor);
        }));
    }
    /**
     * Sets up listeners on the provided editor so that:
     * - If the editor changes models, we remove items and re-mount only if the new model matches.
     * - If the editor is disposed, we do the needed cleanup.
     */
    _initializeEditor(editor) {
        const editorId = editor.getId();
        //
        // Listen for model changes
        //
        this._register(editor.onDidChangeModel((e) => {
            this._removeAllItemsFromEditor(editor);
            if (!e.newModelUrl) {
                return;
            }
            // Re-mount any items that belong to this editor and match the new URI
            const itemsForEditor = this.itemIdsByEditorId[editorId];
            if (itemsForEditor) {
                for (const itemId of itemsForEditor) {
                    const itemInfo = this.itemInfoById[itemId];
                    if (itemInfo && itemInfo.uriFsPath === e.newModelUrl.fsPath) {
                        this._mountItemOnEditor(editor, itemId);
                    }
                }
            }
        }));
        //
        // When the editor is disposed, remove all items from it
        //
        this._register(editor.onDidDispose(() => {
            this._removeAllItemsFromEditor(editor);
        }));
        //
        // If the editor already has a model (e.g. on initial load), try mounting items
        //
        const uri = editor.getModel()?.uri;
        if (!uri) {
            return;
        }
        const itemsForEditor = this.itemIdsByEditorId[editorId];
        if (itemsForEditor) {
            for (const itemId of itemsForEditor) {
                const itemInfo = this.itemInfoById[itemId];
                if (itemInfo && itemInfo.uriFsPath === uri.fsPath) {
                    this._mountItemOnEditor(editor, itemId);
                }
            }
        }
    }
    /**
     * Actually calls the item-creation function `fn(editor)` and saves the resulting disposeFn
     * so we can later clean it up.
     */
    _mountItemOnEditor(editor, itemId) {
        const info = this.itemInfoById[itemId];
        if (!info) {
            return;
        }
        const { fn } = info;
        const disposeFn = fn(editor);
        info.disposeFn = disposeFn;
    }
    /**
     * Removes a single item from an editor (calling its `disposeFn` if present).
     */
    _removeItemFromEditor(editor, itemId) {
        const info = this.itemInfoById[itemId];
        if (info?.disposeFn) {
            info.disposeFn();
            info.disposeFn = undefined;
        }
    }
    /**
     * Removes *all* items from the given editor. Typically called when the editor changes model or is disposed.
     */
    _removeAllItemsFromEditor(editor) {
        const editorId = editor.getId();
        const itemsForEditor = this.itemIdsByEditorId[editorId];
        if (!itemsForEditor) {
            return;
        }
        for (const itemId of itemsForEditor) {
            this._removeItemFromEditor(editor, itemId);
        }
    }
    /**
     * Public API: Adds an item to an *individual* editor (determined by editor ID),
     * but only when that editor is showing the same model (uri.fsPath).
     */
    addToEditor(editor, fn) {
        const uri = editor.getModel()?.uri;
        if (!uri) {
            throw new Error('No URI on the provided editor or in AddItemInputs.');
        }
        const editorId = editor.getId();
        // Create an ID for this item
        const itemId = generateUuid();
        // Record the info
        this.itemInfoById[itemId] = {
            editorId,
            uriFsPath: uri.fsPath,
            fn,
        };
        // Add to the editor's known items
        if (!this.itemIdsByEditorId[editorId]) {
            this.itemIdsByEditorId[editorId] = new Set();
        }
        this.itemIdsByEditorId[editorId].add(itemId);
        // If the editor's current URI matches, mount it now
        if (editor.getModel()?.uri.fsPath === uri.fsPath) {
            this._mountItemOnEditor(editor, itemId);
        }
        return itemId;
    }
    /**
     * Public API: Removes an item from the *specific* editor. We look up which editor
     * had this item and remove it from that editor.
     */
    removeFromEditor(itemId) {
        const info = this.itemInfoById[itemId];
        if (!info) {
            // Nothing to remove
            return;
        }
        const { editorId } = info;
        // Find the editor in question
        const editor = this._editorService.listCodeEditors().find((ed) => ed.getId() === editorId);
        if (editor) {
            // Dispose on that editor
            this._removeItemFromEditor(editor, itemId);
        }
        // Clean up references
        this.itemIdsByEditorId[editorId]?.delete(itemId);
        delete this.itemInfoById[itemId];
    }
};
ConsistentEditorItemService = __decorate([
    __param(0, ICodeEditorService)
], ConsistentEditorItemService);
export { ConsistentEditorItemService };
registerSingleton(IConsistentEditorItemService, ConsistentEditorItemService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc2lzdGVudEl0ZW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9oZWxwZXJTZXJ2aWNlcy9jb25zaXN0ZW50SXRlbVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNqRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBY2hHLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGVBQWUsQ0FBeUIsdUJBQXVCLENBQUMsQ0FBQztBQUVoRyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFlcEQsWUFDcUIsY0FBbUQ7UUFFdkUsS0FBSyxFQUFFLENBQUE7UUFGOEIsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1FBWnhFLGdHQUFnRztRQUMvRSwyQkFBc0IsR0FBNEMsRUFBRSxDQUFBO1FBQ3BFLDJCQUFzQixHQUFrQyxFQUFFLENBQUE7UUFHM0UsNEVBQTRFO1FBQzNELHNCQUFpQixHQUE0QyxFQUFFLENBQUE7UUFDL0QsNkJBQXdCLEdBQTJCLEVBQUUsQ0FBQTtRQUNyRCxzQkFBaUIsR0FBK0IsRUFBRSxDQUFBO1FBbUduRSx5QkFBb0IsR0FBRyxDQUFDLENBQUE7UUExRnZCLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxNQUFtQixFQUFFLEVBQUU7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