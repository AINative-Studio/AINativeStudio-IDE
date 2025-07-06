/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc2lzdGVudEl0ZW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2hlbHBlclNlcnZpY2VzL2NvbnNpc3RlbnRJdGVtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ2pHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFjaEcsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFDO0FBRWhHLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQWVwRCxZQUNxQixjQUFtRDtRQUV2RSxLQUFLLEVBQUUsQ0FBQTtRQUY4QixtQkFBYyxHQUFkLGNBQWMsQ0FBb0I7UUFaeEUsZ0dBQWdHO1FBQy9FLDJCQUFzQixHQUE0QyxFQUFFLENBQUE7UUFDcEUsMkJBQXNCLEdBQWtDLEVBQUUsQ0FBQTtRQUczRSw0RUFBNEU7UUFDM0Qsc0JBQWlCLEdBQTRDLEVBQUUsQ0FBQTtRQUMvRCw2QkFBd0IsR0FBMkIsRUFBRSxDQUFBO1FBQ3JELHNCQUFpQixHQUErQixFQUFFLENBQUE7UUFtR25FLHlCQUFvQixHQUFHLENBQUMsQ0FBQTtRQTFGdkIsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLE1BQW1CLEVBQUUsRUFBRTtZ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