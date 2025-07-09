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
var EditorGroupModel_1;
import { Event, Emitter } from '../../../base/common/event.js';
import { EditorExtensions, SideBySideEditor, EditorCloseContext } from '../editor.js';
import { EditorInput } from './editorInput.js';
import { SideBySideEditorInput } from './sideBySideEditorInput.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { dispose, Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { coalesce } from '../../../base/common/arrays.js';
const EditorOpenPositioning = {
    LEFT: 'left',
    RIGHT: 'right',
    FIRST: 'first',
    LAST: 'last'
};
export function isSerializedEditorGroupModel(group) {
    const candidate = group;
    return !!(candidate && typeof candidate === 'object' && Array.isArray(candidate.editors) && Array.isArray(candidate.mru));
}
export function isGroupEditorChangeEvent(e) {
    const candidate = e;
    return candidate.editor && candidate.editorIndex !== undefined;
}
export function isGroupEditorOpenEvent(e) {
    const candidate = e;
    return candidate.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */ && candidate.editorIndex !== undefined;
}
export function isGroupEditorMoveEvent(e) {
    const candidate = e;
    return candidate.kind === 7 /* GroupModelChangeKind.EDITOR_MOVE */ && candidate.editorIndex !== undefined && candidate.oldEditorIndex !== undefined;
}
export function isGroupEditorCloseEvent(e) {
    const candidate = e;
    return candidate.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ && candidate.editorIndex !== undefined && candidate.context !== undefined && candidate.sticky !== undefined;
}
let EditorGroupModel = class EditorGroupModel extends Disposable {
    static { EditorGroupModel_1 = this; }
    static { this.IDS = 0; }
    get id() { return this._id; }
    get active() {
        return this.selection[0] ?? null;
    }
    constructor(labelOrSerializedGroup, instantiationService, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        //#region events
        this._onDidModelChange = this._register(new Emitter({ leakWarningThreshold: 500 /* increased for users with hundreds of inputs opened */ }));
        this.onDidModelChange = this._onDidModelChange.event;
        this.editors = [];
        this.mru = [];
        this.editorListeners = new Set();
        this.locked = false;
        this.selection = []; // editors in selected state, first one is active
        this.preview = null; // editor in preview state
        this.sticky = -1; // index of first editor in sticky state
        this.transient = new Set(); // editors in transient state
        if (isSerializedEditorGroupModel(labelOrSerializedGroup)) {
            this._id = this.deserialize(labelOrSerializedGroup);
        }
        else {
            this._id = EditorGroupModel_1.IDS++;
        }
        this.onConfigurationUpdated();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));
    }
    onConfigurationUpdated(e) {
        if (e && !e.affectsConfiguration('workbench.editor.openPositioning') && !e.affectsConfiguration('workbench.editor.focusRecentEditorAfterClose')) {
            return;
        }
        this.editorOpenPositioning = this.configurationService.getValue('workbench.editor.openPositioning');
        this.focusRecentEditorAfterClose = this.configurationService.getValue('workbench.editor.focusRecentEditorAfterClose');
    }
    get count() {
        return this.editors.length;
    }
    get stickyCount() {
        return this.sticky + 1;
    }
    getEditors(order, options) {
        const editors = order === 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */ ? this.mru.slice(0) : this.editors.slice(0);
        if (options?.excludeSticky) {
            // MRU: need to check for index on each
            if (order === 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */) {
                return editors.filter(editor => !this.isSticky(editor));
            }
            // Sequential: simply start after sticky index
            return editors.slice(this.sticky + 1);
        }
        return editors;
    }
    getEditorByIndex(index) {
        return this.editors[index];
    }
    get activeEditor() {
        return this.active;
    }
    isActive(candidate) {
        return this.matches(this.active, candidate);
    }
    get previewEditor() {
        return this.preview;
    }
    openEditor(candidate, options) {
        const makeSticky = options?.sticky || (typeof options?.index === 'number' && this.isSticky(options.index));
        const makePinned = options?.pinned || options?.sticky;
        const makeTransient = !!options?.transient;
        const makeActive = options?.active || !this.activeEditor || (!makePinned && this.preview === this.activeEditor);
        const existingEditorAndIndex = this.findEditor(candidate, options);
        // New editor
        if (!existingEditorAndIndex) {
            const newEditor = candidate;
            const indexOfActive = this.indexOf(this.active);
            // Insert into specific position
            let targetIndex;
            if (options && typeof options.index === 'number') {
                targetIndex = options.index;
            }
            // Insert to the BEGINNING
            else if (this.editorOpenPositioning === EditorOpenPositioning.FIRST) {
                targetIndex = 0;
                // Always make sure targetIndex is after sticky editors
                // unless we are explicitly told to make the editor sticky
                if (!makeSticky && this.isSticky(targetIndex)) {
                    targetIndex = this.sticky + 1;
                }
            }
            // Insert to the END
            else if (this.editorOpenPositioning === EditorOpenPositioning.LAST) {
                targetIndex = this.editors.length;
            }
            // Insert to LEFT or RIGHT of active editor
            else {
                // Insert to the LEFT of active editor
                if (this.editorOpenPositioning === EditorOpenPositioning.LEFT) {
                    if (indexOfActive === 0 || !this.editors.length) {
                        targetIndex = 0; // to the left becoming first editor in list
                    }
                    else {
                        targetIndex = indexOfActive; // to the left of active editor
                    }
                }
                // Insert to the RIGHT of active editor
                else {
                    targetIndex = indexOfActive + 1;
                }
                // Always make sure targetIndex is after sticky editors
                // unless we are explicitly told to make the editor sticky
                if (!makeSticky && this.isSticky(targetIndex)) {
                    targetIndex = this.sticky + 1;
                }
            }
            // If the editor becomes sticky, increment the sticky index and adjust
            // the targetIndex to be at the end of sticky editors unless already.
            if (makeSticky) {
                this.sticky++;
                if (!this.isSticky(targetIndex)) {
                    targetIndex = this.sticky;
                }
            }
            // Insert into our list of editors if pinned or we have no preview editor
            if (makePinned || !this.preview) {
                this.splice(targetIndex, false, newEditor);
            }
            // Handle transient
            if (makeTransient) {
                this.doSetTransient(newEditor, targetIndex, true);
            }
            // Handle preview
            if (!makePinned) {
                // Replace existing preview with this editor if we have a preview
                if (this.preview) {
                    const indexOfPreview = this.indexOf(this.preview);
                    if (targetIndex > indexOfPreview) {
                        targetIndex--; // accomodate for the fact that the preview editor closes
                    }
                    this.replaceEditor(this.preview, newEditor, targetIndex, !makeActive);
                }
                this.preview = newEditor;
            }
            // Listeners
            this.registerEditorListeners(newEditor);
            // Event
            const event = {
                kind: 5 /* GroupModelChangeKind.EDITOR_OPEN */,
                editor: newEditor,
                editorIndex: targetIndex
            };
            this._onDidModelChange.fire(event);
            // Handle active editor / selected editors
            this.setSelection(makeActive ? newEditor : this.activeEditor, options?.inactiveSelection ?? []);
            return {
                editor: newEditor,
                isNew: true
            };
        }
        // Existing editor
        else {
            const [existingEditor, existingEditorIndex] = existingEditorAndIndex;
            // Update transient (existing editors do not turn transient if they were not before)
            this.doSetTransient(existingEditor, existingEditorIndex, makeTransient === false ? false : this.isTransient(existingEditor));
            // Pin it
            if (makePinned) {
                this.doPin(existingEditor, existingEditorIndex);
            }
            // Handle active editor / selected editors
            this.setSelection(makeActive ? existingEditor : this.activeEditor, options?.inactiveSelection ?? []);
            // Respect index
            if (options && typeof options.index === 'number') {
                this.moveEditor(existingEditor, options.index);
            }
            // Stick it (intentionally after the moveEditor call in case
            // the editor was already moved into the sticky range)
            if (makeSticky) {
                this.doStick(existingEditor, this.indexOf(existingEditor));
            }
            return {
                editor: existingEditor,
                isNew: false
            };
        }
    }
    registerEditorListeners(editor) {
        const listeners = new DisposableStore();
        this.editorListeners.add(listeners);
        // Re-emit disposal of editor input as our own event
        listeners.add(Event.once(editor.onWillDispose)(() => {
            const editorIndex = this.editors.indexOf(editor);
            if (editorIndex >= 0) {
                const event = {
                    kind: 15 /* GroupModelChangeKind.EDITOR_WILL_DISPOSE */,
                    editor,
                    editorIndex
                };
                this._onDidModelChange.fire(event);
            }
        }));
        // Re-Emit dirty state changes
        listeners.add(editor.onDidChangeDirty(() => {
            const event = {
                kind: 14 /* GroupModelChangeKind.EDITOR_DIRTY */,
                editor,
                editorIndex: this.editors.indexOf(editor)
            };
            this._onDidModelChange.fire(event);
        }));
        // Re-Emit label changes
        listeners.add(editor.onDidChangeLabel(() => {
            const event = {
                kind: 9 /* GroupModelChangeKind.EDITOR_LABEL */,
                editor,
                editorIndex: this.editors.indexOf(editor)
            };
            this._onDidModelChange.fire(event);
        }));
        // Re-Emit capability changes
        listeners.add(editor.onDidChangeCapabilities(() => {
            const event = {
                kind: 10 /* GroupModelChangeKind.EDITOR_CAPABILITIES */,
                editor,
                editorIndex: this.editors.indexOf(editor)
            };
            this._onDidModelChange.fire(event);
        }));
        // Clean up dispose listeners once the editor gets closed
        listeners.add(this.onDidModelChange(event => {
            if (event.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ && event.editor?.matches(editor)) {
                dispose(listeners);
                this.editorListeners.delete(listeners);
            }
        }));
    }
    replaceEditor(toReplace, replaceWith, replaceIndex, openNext = true) {
        const closeResult = this.doCloseEditor(toReplace, EditorCloseContext.REPLACE, openNext); // optimization to prevent multiple setActive() in one call
        // We want to first add the new editor into our model before emitting the close event because
        // firing the close event can trigger a dispose on the same editor that is now being added.
        // This can lead into opening a disposed editor which is not what we want.
        this.splice(replaceIndex, false, replaceWith);
        if (closeResult) {
            const event = {
                kind: 6 /* GroupModelChangeKind.EDITOR_CLOSE */,
                ...closeResult
            };
            this._onDidModelChange.fire(event);
        }
    }
    closeEditor(candidate, context = EditorCloseContext.UNKNOWN, openNext = true) {
        const closeResult = this.doCloseEditor(candidate, context, openNext);
        if (closeResult) {
            const event = {
                kind: 6 /* GroupModelChangeKind.EDITOR_CLOSE */,
                ...closeResult
            };
            this._onDidModelChange.fire(event);
            return closeResult;
        }
        return undefined;
    }
    doCloseEditor(candidate, context, openNext) {
        const index = this.indexOf(candidate);
        if (index === -1) {
            return undefined; // not found
        }
        const editor = this.editors[index];
        const sticky = this.isSticky(index);
        // Active editor closed
        const isActiveEditor = this.active === editor;
        if (openNext && isActiveEditor) {
            // More than one editor
            if (this.mru.length > 1) {
                let newActive;
                if (this.focusRecentEditorAfterClose) {
                    newActive = this.mru[1]; // active editor is always first in MRU, so pick second editor after as new active
                }
                else {
                    if (index === this.editors.length - 1) {
                        newActive = this.editors[index - 1]; // last editor is closed, pick previous as new active
                    }
                    else {
                        newActive = this.editors[index + 1]; // pick next editor as new active
                    }
                }
                // Select editor as active
                const newInactiveSelectedEditors = this.selection.filter(selected => selected !== editor && selected !== newActive);
                this.doSetSelection(newActive, this.editors.indexOf(newActive), newInactiveSelectedEditors);
            }
            // Last editor closed: clear selection
            else {
                this.doSetSelection(null, undefined, []);
            }
        }
        // Inactive editor closed
        else if (!isActiveEditor) {
            // Remove editor from inactive selection
            if (this.doIsSelected(editor)) {
                const newInactiveSelectedEditors = this.selection.filter(selected => selected !== editor && selected !== this.activeEditor);
                this.doSetSelection(this.activeEditor, this.indexOf(this.activeEditor), newInactiveSelectedEditors);
            }
        }
        // Preview Editor closed
        if (this.preview === editor) {
            this.preview = null;
        }
        // Remove from transient
        this.transient.delete(editor);
        // Remove from arrays
        this.splice(index, true);
        // Event
        return { editor, sticky, editorIndex: index, context };
    }
    moveEditor(candidate, toIndex) {
        // Ensure toIndex is in bounds of our model
        if (toIndex >= this.editors.length) {
            toIndex = this.editors.length - 1;
        }
        else if (toIndex < 0) {
            toIndex = 0;
        }
        const index = this.indexOf(candidate);
        if (index < 0 || toIndex === index) {
            return;
        }
        const editor = this.editors[index];
        const sticky = this.sticky;
        // Adjust sticky index: editor moved out of sticky state into unsticky state
        if (this.isSticky(index) && toIndex > this.sticky) {
            this.sticky--;
        }
        // ...or editor moved into sticky state from unsticky state
        else if (!this.isSticky(index) && toIndex <= this.sticky) {
            this.sticky++;
        }
        // Move
        this.editors.splice(index, 1);
        this.editors.splice(toIndex, 0, editor);
        // Move Event
        const event = {
            kind: 7 /* GroupModelChangeKind.EDITOR_MOVE */,
            editor,
            oldEditorIndex: index,
            editorIndex: toIndex
        };
        this._onDidModelChange.fire(event);
        // Sticky Event (if sticky changed as part of the move)
        if (sticky !== this.sticky) {
            const event = {
                kind: 13 /* GroupModelChangeKind.EDITOR_STICKY */,
                editor,
                editorIndex: toIndex
            };
            this._onDidModelChange.fire(event);
        }
        return editor;
    }
    setActive(candidate) {
        let result = undefined;
        if (!candidate) {
            this.setGroupActive();
        }
        else {
            result = this.setEditorActive(candidate);
        }
        return result;
    }
    setGroupActive() {
        // We do not really keep the `active` state in our model because
        // it has no special meaning to us here. But for consistency
        // we emit a `onDidModelChange` event so that components can
        // react.
        this._onDidModelChange.fire({ kind: 0 /* GroupModelChangeKind.GROUP_ACTIVE */ });
    }
    setEditorActive(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doSetSelection(editor, editorIndex, []);
        return editor;
    }
    get selectedEditors() {
        return this.editors.filter(editor => this.doIsSelected(editor)); // return in sequential order
    }
    isSelected(editorCandidateOrIndex) {
        let editor;
        if (typeof editorCandidateOrIndex === 'number') {
            editor = this.editors[editorCandidateOrIndex];
        }
        else {
            editor = this.findEditor(editorCandidateOrIndex)?.[0];
        }
        return !!editor && this.doIsSelected(editor);
    }
    doIsSelected(editor) {
        return this.selection.includes(editor);
    }
    setSelection(activeSelectedEditorCandidate, inactiveSelectedEditorCandidates) {
        const res = this.findEditor(activeSelectedEditorCandidate);
        if (!res) {
            return; // not found
        }
        const [activeSelectedEditor, activeSelectedEditorIndex] = res;
        const inactiveSelectedEditors = new Set();
        for (const inactiveSelectedEditorCandidate of inactiveSelectedEditorCandidates) {
            const res = this.findEditor(inactiveSelectedEditorCandidate);
            if (!res) {
                return; // not found
            }
            const [inactiveSelectedEditor] = res;
            if (inactiveSelectedEditor === activeSelectedEditor) {
                continue; // already selected
            }
            inactiveSelectedEditors.add(inactiveSelectedEditor);
        }
        this.doSetSelection(activeSelectedEditor, activeSelectedEditorIndex, Array.from(inactiveSelectedEditors));
    }
    doSetSelection(activeSelectedEditor, activeSelectedEditorIndex, inactiveSelectedEditors) {
        const previousActiveEditor = this.activeEditor;
        const previousSelection = this.selection;
        let newSelection;
        if (activeSelectedEditor) {
            newSelection = [activeSelectedEditor, ...inactiveSelectedEditors];
        }
        else {
            newSelection = [];
        }
        // Update selection
        this.selection = newSelection;
        // Update active editor if it has changed
        const activeEditorChanged = activeSelectedEditor && typeof activeSelectedEditorIndex === 'number' && previousActiveEditor !== activeSelectedEditor;
        if (activeEditorChanged) {
            // Bring to front in MRU list
            const mruIndex = this.indexOf(activeSelectedEditor, this.mru);
            this.mru.splice(mruIndex, 1);
            this.mru.unshift(activeSelectedEditor);
            // Event
            const event = {
                kind: 8 /* GroupModelChangeKind.EDITOR_ACTIVE */,
                editor: activeSelectedEditor,
                editorIndex: activeSelectedEditorIndex
            };
            this._onDidModelChange.fire(event);
        }
        // Fire event if the selection has changed
        if (activeEditorChanged ||
            previousSelection.length !== newSelection.length ||
            previousSelection.some(editor => !newSelection.includes(editor))) {
            const event = {
                kind: 4 /* GroupModelChangeKind.EDITORS_SELECTION */
            };
            this._onDidModelChange.fire(event);
        }
    }
    setIndex(index) {
        // We do not really keep the `index` in our model because
        // it has no special meaning to us here. But for consistency
        // we emit a `onDidModelChange` event so that components can
        // react.
        this._onDidModelChange.fire({ kind: 1 /* GroupModelChangeKind.GROUP_INDEX */ });
    }
    setLabel(label) {
        // We do not really keep the `label` in our model because
        // it has no special meaning to us here. But for consistency
        // we emit a `onDidModelChange` event so that components can
        // react.
        this._onDidModelChange.fire({ kind: 2 /* GroupModelChangeKind.GROUP_LABEL */ });
    }
    pin(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doPin(editor, editorIndex);
        return editor;
    }
    doPin(editor, editorIndex) {
        if (this.isPinned(editor)) {
            return; // can only pin a preview editor
        }
        // Clear Transient
        this.setTransient(editor, false);
        // Convert the preview editor to be a pinned editor
        this.preview = null;
        // Event
        const event = {
            kind: 11 /* GroupModelChangeKind.EDITOR_PIN */,
            editor,
            editorIndex
        };
        this._onDidModelChange.fire(event);
    }
    unpin(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doUnpin(editor, editorIndex);
        return editor;
    }
    doUnpin(editor, editorIndex) {
        if (!this.isPinned(editor)) {
            return; // can only unpin a pinned editor
        }
        // Set new
        const oldPreview = this.preview;
        this.preview = editor;
        // Event
        const event = {
            kind: 11 /* GroupModelChangeKind.EDITOR_PIN */,
            editor,
            editorIndex
        };
        this._onDidModelChange.fire(event);
        // Close old preview editor if any
        if (oldPreview) {
            this.closeEditor(oldPreview, EditorCloseContext.UNPIN);
        }
    }
    isPinned(editorCandidateOrIndex) {
        let editor;
        if (typeof editorCandidateOrIndex === 'number') {
            editor = this.editors[editorCandidateOrIndex];
        }
        else {
            editor = editorCandidateOrIndex;
        }
        return !this.matches(this.preview, editor);
    }
    stick(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doStick(editor, editorIndex);
        return editor;
    }
    doStick(editor, editorIndex) {
        if (this.isSticky(editorIndex)) {
            return; // can only stick a non-sticky editor
        }
        // Pin editor
        this.pin(editor);
        // Move editor to be the last sticky editor
        const newEditorIndex = this.sticky + 1;
        this.moveEditor(editor, newEditorIndex);
        // Adjust sticky index
        this.sticky++;
        // Event
        const event = {
            kind: 13 /* GroupModelChangeKind.EDITOR_STICKY */,
            editor,
            editorIndex: newEditorIndex
        };
        this._onDidModelChange.fire(event);
    }
    unstick(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doUnstick(editor, editorIndex);
        return editor;
    }
    doUnstick(editor, editorIndex) {
        if (!this.isSticky(editorIndex)) {
            return; // can only unstick a sticky editor
        }
        // Move editor to be the first non-sticky editor
        const newEditorIndex = this.sticky;
        this.moveEditor(editor, newEditorIndex);
        // Adjust sticky index
        this.sticky--;
        // Event
        const event = {
            kind: 13 /* GroupModelChangeKind.EDITOR_STICKY */,
            editor,
            editorIndex: newEditorIndex
        };
        this._onDidModelChange.fire(event);
    }
    isSticky(candidateOrIndex) {
        if (this.sticky < 0) {
            return false; // no sticky editor
        }
        let index;
        if (typeof candidateOrIndex === 'number') {
            index = candidateOrIndex;
        }
        else {
            index = this.indexOf(candidateOrIndex);
        }
        if (index < 0) {
            return false;
        }
        return index <= this.sticky;
    }
    setTransient(candidate, transient) {
        if (!transient && this.transient.size === 0) {
            return; // no transient editor
        }
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doSetTransient(editor, editorIndex, transient);
        return editor;
    }
    doSetTransient(editor, editorIndex, transient) {
        if (transient) {
            if (this.transient.has(editor)) {
                return;
            }
            this.transient.add(editor);
        }
        else {
            if (!this.transient.has(editor)) {
                return;
            }
            this.transient.delete(editor);
        }
        // Event
        const event = {
            kind: 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */,
            editor,
            editorIndex
        };
        this._onDidModelChange.fire(event);
    }
    isTransient(editorCandidateOrIndex) {
        if (this.transient.size === 0) {
            return false; // no transient editor
        }
        let editor;
        if (typeof editorCandidateOrIndex === 'number') {
            editor = this.editors[editorCandidateOrIndex];
        }
        else {
            editor = this.findEditor(editorCandidateOrIndex)?.[0];
        }
        return !!editor && this.transient.has(editor);
    }
    splice(index, del, editor) {
        const editorToDeleteOrReplace = this.editors[index];
        // Perform on sticky index
        if (del && this.isSticky(index)) {
            this.sticky--;
        }
        // Perform on editors array
        if (editor) {
            this.editors.splice(index, del ? 1 : 0, editor);
        }
        else {
            this.editors.splice(index, del ? 1 : 0);
        }
        // Perform on MRU
        {
            // Add
            if (!del && editor) {
                if (this.mru.length === 0) {
                    // the list of most recent editors is empty
                    // so this editor can only be the most recent
                    this.mru.push(editor);
                }
                else {
                    // we have most recent editors. as such we
                    // put this newly opened editor right after
                    // the current most recent one because it cannot
                    // be the most recently active one unless
                    // it becomes active. but it is still more
                    // active then any other editor in the list.
                    this.mru.splice(1, 0, editor);
                }
            }
            // Remove / Replace
            else {
                const indexInMRU = this.indexOf(editorToDeleteOrReplace, this.mru);
                // Remove
                if (del && !editor) {
                    this.mru.splice(indexInMRU, 1); // remove from MRU
                }
                // Replace
                else if (del && editor) {
                    this.mru.splice(indexInMRU, 1, editor); // replace MRU at location
                }
            }
        }
    }
    indexOf(candidate, editors = this.editors, options) {
        let index = -1;
        if (!candidate) {
            return index;
        }
        for (let i = 0; i < editors.length; i++) {
            const editor = editors[i];
            if (this.matches(editor, candidate, options)) {
                // If we are to support side by side matching, it is possible that
                // a better direct match is found later. As such, we continue finding
                // a matching editor and prefer that match over the side by side one.
                if (options?.supportSideBySide && editor instanceof SideBySideEditorInput && !(candidate instanceof SideBySideEditorInput)) {
                    index = i;
                }
                else {
                    index = i;
                    break;
                }
            }
        }
        return index;
    }
    findEditor(candidate, options) {
        const index = this.indexOf(candidate, this.editors, options);
        if (index === -1) {
            return undefined;
        }
        return [this.editors[index], index];
    }
    isFirst(candidate, editors = this.editors) {
        return this.matches(editors[0], candidate);
    }
    isLast(candidate, editors = this.editors) {
        return this.matches(editors[editors.length - 1], candidate);
    }
    contains(candidate, options) {
        return this.indexOf(candidate, this.editors, options) !== -1;
    }
    matches(editor, candidate, options) {
        if (!editor || !candidate) {
            return false;
        }
        if (options?.supportSideBySide && editor instanceof SideBySideEditorInput && !(candidate instanceof SideBySideEditorInput)) {
            switch (options.supportSideBySide) {
                case SideBySideEditor.ANY:
                    if (this.matches(editor.primary, candidate, options) || this.matches(editor.secondary, candidate, options)) {
                        return true;
                    }
                    break;
                case SideBySideEditor.BOTH:
                    if (this.matches(editor.primary, candidate, options) && this.matches(editor.secondary, candidate, options)) {
                        return true;
                    }
                    break;
            }
        }
        const strictEquals = editor === candidate;
        if (options?.strictEquals) {
            return strictEquals;
        }
        return strictEquals || editor.matches(candidate);
    }
    get isLocked() {
        return this.locked;
    }
    lock(locked) {
        if (this.isLocked !== locked) {
            this.locked = locked;
            this._onDidModelChange.fire({ kind: 3 /* GroupModelChangeKind.GROUP_LOCKED */ });
        }
    }
    clone() {
        const clone = this.instantiationService.createInstance(EditorGroupModel_1, undefined);
        // Copy over group properties
        clone.editors = this.editors.slice(0);
        clone.mru = this.mru.slice(0);
        clone.preview = this.preview;
        clone.selection = this.selection.slice(0);
        clone.sticky = this.sticky;
        // Ensure to register listeners for each editor
        for (const editor of clone.editors) {
            clone.registerEditorListeners(editor);
        }
        return clone;
    }
    serialize() {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        // Serialize all editor inputs so that we can store them.
        // Editors that cannot be serialized need to be ignored
        // from mru, active, preview and sticky if any.
        const serializableEditors = [];
        const serializedEditors = [];
        let serializablePreviewIndex;
        let serializableSticky = this.sticky;
        for (let i = 0; i < this.editors.length; i++) {
            const editor = this.editors[i];
            let canSerializeEditor = false;
            const editorSerializer = registry.getEditorSerializer(editor);
            if (editorSerializer) {
                const value = editorSerializer.canSerialize(editor) ? editorSerializer.serialize(editor) : undefined;
                // Editor can be serialized
                if (typeof value === 'string') {
                    canSerializeEditor = true;
                    serializedEditors.push({ id: editor.typeId, value });
                    serializableEditors.push(editor);
                    if (this.preview === editor) {
                        serializablePreviewIndex = serializableEditors.length - 1;
                    }
                }
                // Editor cannot be serialized
                else {
                    canSerializeEditor = false;
                }
            }
            // Adjust index of sticky editors if the editor cannot be serialized and is pinned
            if (!canSerializeEditor && this.isSticky(i)) {
                serializableSticky--;
            }
        }
        const serializableMru = this.mru.map(editor => this.indexOf(editor, serializableEditors)).filter(i => i >= 0);
        return {
            id: this.id,
            locked: this.locked ? true : undefined,
            editors: serializedEditors,
            mru: serializableMru,
            preview: serializablePreviewIndex,
            sticky: serializableSticky >= 0 ? serializableSticky : undefined
        };
    }
    deserialize(data) {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        if (typeof data.id === 'number') {
            this._id = data.id;
            EditorGroupModel_1.IDS = Math.max(data.id + 1, EditorGroupModel_1.IDS); // make sure our ID generator is always larger
        }
        else {
            this._id = EditorGroupModel_1.IDS++; // backwards compatibility
        }
        if (data.locked) {
            this.locked = true;
        }
        this.editors = coalesce(data.editors.map((e, index) => {
            let editor = undefined;
            const editorSerializer = registry.getEditorSerializer(e.id);
            if (editorSerializer) {
                const deserializedEditor = editorSerializer.deserialize(this.instantiationService, e.value);
                if (deserializedEditor instanceof EditorInput) {
                    editor = deserializedEditor;
                    this.registerEditorListeners(editor);
                }
            }
            if (!editor && typeof data.sticky === 'number' && index <= data.sticky) {
                data.sticky--; // if editor cannot be deserialized but was sticky, we need to decrease sticky index
            }
            return editor;
        }));
        this.mru = coalesce(data.mru.map(i => this.editors[i]));
        this.selection = this.mru.length > 0 ? [this.mru[0]] : [];
        if (typeof data.preview === 'number') {
            this.preview = this.editors[data.preview];
        }
        if (typeof data.sticky === 'number') {
            this.sticky = data.sticky;
        }
        return this._id;
    }
    dispose() {
        dispose(Array.from(this.editorListeners));
        this.editorListeners.clear();
        this.transient.clear();
        super.dispose();
    }
};
EditorGroupModel = EditorGroupModel_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], EditorGroupModel);
export { EditorGroupModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29tbW9uL2VkaXRvci9lZGl0b3JHcm91cE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBeUQsZ0JBQWdCLEVBQXVCLGdCQUFnQixFQUFFLGtCQUFrQixFQUE2QyxNQUFNLGNBQWMsQ0FBQztBQUM3TSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDL0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDbkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUE2QixxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzNILE9BQU8sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFMUQsTUFBTSxxQkFBcUIsR0FBRztJQUM3QixJQUFJLEVBQUUsTUFBTTtJQUNaLEtBQUssRUFBRSxPQUFPO0lBQ2QsS0FBSyxFQUFFLE9BQU87SUFDZCxJQUFJLEVBQUUsTUFBTTtDQUNaLENBQUM7QUErQkYsTUFBTSxVQUFVLDRCQUE0QixDQUFDLEtBQWU7SUFDM0QsTUFBTSxTQUFTLEdBQUcsS0FBZ0QsQ0FBQztJQUVuRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxPQUFPLFNBQVMsS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMzSCxDQUFDO0FBNkNELE1BQU0sVUFBVSx3QkFBd0IsQ0FBQyxDQUF5QjtJQUNqRSxNQUFNLFNBQVMsR0FBRyxDQUEwQixDQUFDO0lBRTdDLE9BQU8sU0FBUyxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQztBQUNoRSxDQUFDO0FBT0QsTUFBTSxVQUFVLHNCQUFzQixDQUFDLENBQXlCO0lBQy9ELE1BQU0sU0FBUyxHQUFHLENBQTBCLENBQUM7SUFFN0MsT0FBTyxTQUFTLENBQUMsSUFBSSw2Q0FBcUMsSUFBSSxTQUFTLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQztBQUNuRyxDQUFDO0FBY0QsTUFBTSxVQUFVLHNCQUFzQixDQUFDLENBQXlCO0lBQy9ELE1BQU0sU0FBUyxHQUFHLENBQTBCLENBQUM7SUFFN0MsT0FBTyxTQUFTLENBQUMsSUFBSSw2Q0FBcUMsSUFBSSxTQUFTLENBQUMsV0FBVyxLQUFLLFNBQVMsSUFBSSxTQUFTLENBQUMsY0FBYyxLQUFLLFNBQVMsQ0FBQztBQUM3SSxDQUFDO0FBcUJELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxDQUF5QjtJQUNoRSxNQUFNLFNBQVMsR0FBRyxDQUEyQixDQUFDO0lBRTlDLE9BQU8sU0FBUyxDQUFDLElBQUksOENBQXNDLElBQUksU0FBUyxDQUFDLFdBQVcsS0FBSyxTQUFTLElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyxTQUFTLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxTQUFTLENBQUM7QUFDekssQ0FBQztBQTJDTSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7O2FBRWhDLFFBQUcsR0FBRyxDQUFDLEFBQUosQ0FBSztJQVV2QixJQUFJLEVBQUUsS0FBc0IsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQVc5QyxJQUFZLE1BQU07UUFDakIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUNsQyxDQUFDO0lBU0QsWUFDQyxzQkFBK0QsRUFDeEMsb0JBQTRELEVBQzVELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQztRQUhnQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQzNDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFqQ3BGLGdCQUFnQjtRQUVDLHNCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQXlCLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLHdEQUF3RCxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hLLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7UUFPakQsWUFBTyxHQUFrQixFQUFFLENBQUM7UUFDNUIsUUFBRyxHQUFrQixFQUFFLENBQUM7UUFFZixvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFDO1FBRXRELFdBQU0sR0FBRyxLQUFLLENBQUM7UUFFZixjQUFTLEdBQWtCLEVBQUUsQ0FBQyxDQUFLLGlEQUFpRDtRQU1wRixZQUFPLEdBQXVCLElBQUksQ0FBQyxDQUFJLDBCQUEwQjtRQUNqRSxXQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBUyx3Q0FBd0M7UUFDcEQsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUMsQ0FBRSw2QkFBNkI7UUFZbEYsSUFBSSw0QkFBNEIsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDckQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsR0FBRyxHQUFHLGtCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ25DLENBQUM7UUFFRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6RyxDQUFDO0lBRU8sc0JBQXNCLENBQUMsQ0FBNkI7UUFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyw4Q0FBOEMsQ0FBQyxFQUFFLENBQUM7WUFDakosT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1FBQ3BHLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLDhDQUE4QyxDQUFDLENBQUM7SUFDdkgsQ0FBQztJQUVELElBQUksS0FBSztRQUNSLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVELFVBQVUsQ0FBQyxLQUFtQixFQUFFLE9BQXFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLEtBQUssOENBQXNDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV4RyxJQUFJLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQztZQUU1Qix1Q0FBdUM7WUFDdkMsSUFBSSxLQUFLLDhDQUFzQyxFQUFFLENBQUM7Z0JBQ2pELE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3pELENBQUM7WUFFRCw4Q0FBOEM7WUFDOUMsT0FBTyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxLQUFhO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxRQUFRLENBQUMsU0FBNEM7UUFDcEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUFzQixFQUFFLE9BQTRCO1FBQzlELE1BQU0sVUFBVSxHQUFHLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQyxPQUFPLE9BQU8sRUFBRSxLQUFLLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDM0csTUFBTSxVQUFVLEdBQUcsT0FBTyxFQUFFLE1BQU0sSUFBSSxPQUFPLEVBQUUsTUFBTSxDQUFDO1FBQ3RELE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDO1FBQzNDLE1BQU0sVUFBVSxHQUFHLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFaEgsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVuRSxhQUFhO1FBQ2IsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0IsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQzVCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRWhELGdDQUFnQztZQUNoQyxJQUFJLFdBQW1CLENBQUM7WUFDeEIsSUFBSSxPQUFPLElBQUksT0FBTyxPQUFPLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNsRCxXQUFXLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUM3QixDQUFDO1lBRUQsMEJBQTBCO2lCQUNyQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckUsV0FBVyxHQUFHLENBQUMsQ0FBQztnQkFFaEIsdURBQXVEO2dCQUN2RCwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUMvQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1lBRUQsb0JBQW9CO2lCQUNmLElBQUksSUFBSSxDQUFDLHFCQUFxQixLQUFLLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwRSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7WUFDbkMsQ0FBQztZQUVELDJDQUEyQztpQkFDdEMsQ0FBQztnQkFFTCxzQ0FBc0M7Z0JBQ3RDLElBQUksSUFBSSxDQUFDLHFCQUFxQixLQUFLLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO29CQUMvRCxJQUFJLGFBQWEsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUNqRCxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsNENBQTRDO29CQUM5RCxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDLCtCQUErQjtvQkFDN0QsQ0FBQztnQkFDRixDQUFDO2dCQUVELHVDQUF1QztxQkFDbEMsQ0FBQztvQkFDTCxXQUFXLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQztnQkFDakMsQ0FBQztnQkFFRCx1REFBdUQ7Z0JBQ3ZELDBEQUEwRDtnQkFDMUQsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQy9DLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztnQkFDL0IsQ0FBQztZQUNGLENBQUM7WUFFRCxzRUFBc0U7WUFDdEUscUVBQXFFO1lBQ3JFLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFFZCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUNqQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztnQkFDM0IsQ0FBQztZQUNGLENBQUM7WUFFRCx5RUFBeUU7WUFDekUsSUFBSSxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztZQUM1QyxDQUFDO1lBRUQsbUJBQW1CO1lBQ25CLElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNuRCxDQUFDO1lBRUQsaUJBQWlCO1lBQ2pCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFFakIsaUVBQWlFO2dCQUNqRSxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDbEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ2xELElBQUksV0FBVyxHQUFHLGNBQWMsRUFBRSxDQUFDO3dCQUNsQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLHlEQUF5RDtvQkFDekUsQ0FBQztvQkFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN2RSxDQUFDO2dCQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDO1lBQzFCLENBQUM7WUFFRCxZQUFZO1lBQ1osSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBRXhDLFFBQVE7WUFDUixNQUFNLEtBQUssR0FBMEI7Z0JBQ3BDLElBQUksMENBQWtDO2dCQUN0QyxNQUFNLEVBQUUsU0FBUztnQkFDakIsV0FBVyxFQUFFLFdBQVc7YUFDeEIsQ0FBQztZQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFbkMsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBRWhHLE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLEtBQUssRUFBRSxJQUFJO2FBQ1gsQ0FBQztRQUNILENBQUM7UUFFRCxrQkFBa0I7YUFDYixDQUFDO1lBQ0wsTUFBTSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxHQUFHLHNCQUFzQixDQUFDO1lBRXJFLG9GQUFvRjtZQUNwRixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUU3SCxTQUFTO1lBQ1QsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztZQUNqRCxDQUFDO1lBRUQsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBRXJHLGdCQUFnQjtZQUNoQixJQUFJLE9BQU8sSUFBSSxPQUFPLE9BQU8sQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNoRCxDQUFDO1lBRUQsNERBQTREO1lBQzVELHNEQUFzRDtZQUN0RCxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDNUQsQ0FBQztZQUVELE9BQU87Z0JBQ04sTUFBTSxFQUFFLGNBQWM7Z0JBQ3RCLEtBQUssRUFBRSxLQUFLO2FBQ1osQ0FBQztRQUNILENBQUM7SUFDRixDQUFDO0lBRU8sdUJBQXVCLENBQUMsTUFBbUI7UUFDbEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVwQyxvREFBb0Q7UUFDcEQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUU7WUFDbkQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakQsSUFBSSxXQUFXLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sS0FBSyxHQUE0QjtvQkFDdEMsSUFBSSxtREFBMEM7b0JBQzlDLE1BQU07b0JBQ04sV0FBVztpQkFDWCxDQUFDO2dCQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSiw4QkFBOEI7UUFDOUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQzFDLE1BQU0sS0FBSyxHQUE0QjtnQkFDdEMsSUFBSSw0Q0FBbUM7Z0JBQ3ZDLE1BQU07Z0JBQ04sV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQzthQUN6QyxDQUFDO1lBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosd0JBQXdCO1FBQ3hCLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtZQUMxQyxNQUFNLEtBQUssR0FBNEI7Z0JBQ3RDLElBQUksMkNBQW1DO2dCQUN2QyxNQUFNO2dCQUNOLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7YUFDekMsQ0FBQztZQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLDZCQUE2QjtRQUM3QixTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUU7WUFDakQsTUFBTSxLQUFLLEdBQTRCO2dCQUN0QyxJQUFJLG1EQUEwQztnQkFDOUMsTUFBTTtnQkFDTixXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO2FBQ3pDLENBQUM7WUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSix5REFBeUQ7UUFDekQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDM0MsSUFBSSxLQUFLLENBQUMsSUFBSSw4Q0FBc0MsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN2RixPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGFBQWEsQ0FBQyxTQUFzQixFQUFFLFdBQXdCLEVBQUUsWUFBb0IsRUFBRSxRQUFRLEdBQUcsSUFBSTtRQUM1RyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQywyREFBMkQ7UUFFcEosNkZBQTZGO1FBQzdGLDJGQUEyRjtRQUMzRiwwRUFBMEU7UUFDMUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTlDLElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsTUFBTSxLQUFLLEdBQTJCO2dCQUNyQyxJQUFJLDJDQUFtQztnQkFDdkMsR0FBRyxXQUFXO2FBQ2QsQ0FBQztZQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsQ0FBQztJQUNGLENBQUM7SUFFRCxXQUFXLENBQUMsU0FBc0IsRUFBRSxPQUFPLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsR0FBRyxJQUFJO1FBQ3hGLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sS0FBSyxHQUEyQjtnQkFDckMsSUFBSSwyQ0FBbUM7Z0JBQ3ZDLEdBQUcsV0FBVzthQUNkLENBQUM7WUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRW5DLE9BQU8sV0FBVyxDQUFDO1FBQ3BCLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRU8sYUFBYSxDQUFDLFNBQXNCLEVBQUUsT0FBMkIsRUFBRSxRQUFpQjtRQUMzRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTyxTQUFTLENBQUMsQ0FBQyxZQUFZO1FBQy9CLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEMsdUJBQXVCO1FBQ3ZCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDO1FBQzlDLElBQUksUUFBUSxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBRWhDLHVCQUF1QjtZQUN2QixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN6QixJQUFJLFNBQXNCLENBQUM7Z0JBQzNCLElBQUksSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7b0JBQ3RDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0ZBQWtGO2dCQUM1RyxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQ3ZDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFEQUFxRDtvQkFDM0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlDQUFpQztvQkFDdkUsQ0FBQztnQkFDRixDQUFDO2dCQUVELDBCQUEwQjtnQkFDMUIsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsS0FBSyxNQUFNLElBQUksUUFBUSxLQUFLLFNBQVMsQ0FBQyxDQUFDO2dCQUNwSCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1lBQzdGLENBQUM7WUFFRCxzQ0FBc0M7aUJBQ2pDLENBQUM7Z0JBQ0wsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzFDLENBQUM7UUFDRixDQUFDO1FBRUQseUJBQXlCO2FBQ3BCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUUxQix3Q0FBd0M7WUFDeEMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEtBQUssTUFBTSxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQzVILElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1lBQ3JHLENBQUM7UUFDRixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUNyQixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlCLHFCQUFxQjtRQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6QixRQUFRO1FBQ1IsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUN4RCxDQUFDO0lBRUQsVUFBVSxDQUFDLFNBQXNCLEVBQUUsT0FBZTtRQUVqRCwyQ0FBMkM7UUFDM0MsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLENBQUM7YUFBTSxJQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QixPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLE9BQU8sS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNwQyxPQUFPO1FBQ1IsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUUzQiw0RUFBNEU7UUFDNUUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2YsQ0FBQztRQUVELDJEQUEyRDthQUN0RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNmLENBQUM7UUFFRCxPQUFPO1FBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFeEMsYUFBYTtRQUNiLE1BQU0sS0FBSyxHQUEwQjtZQUNwQyxJQUFJLDBDQUFrQztZQUN0QyxNQUFNO1lBQ04sY0FBYyxFQUFFLEtBQUs7WUFDckIsV0FBVyxFQUFFLE9BQU87U0FDcEIsQ0FBQztRQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFbkMsdURBQXVEO1FBQ3ZELElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM1QixNQUFNLEtBQUssR0FBNEI7Z0JBQ3RDLElBQUksNkNBQW9DO2dCQUN4QyxNQUFNO2dCQUNOLFdBQVcsRUFBRSxPQUFPO2FBQ3BCLENBQUM7WUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxTQUFTLENBQUMsU0FBa0M7UUFDM0MsSUFBSSxNQUFNLEdBQTRCLFNBQVMsQ0FBQztRQUVoRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLGNBQWM7UUFDckIsZ0VBQWdFO1FBQ2hFLDREQUE0RDtRQUM1RCw0REFBNEQ7UUFDNUQsU0FBUztRQUNULElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLDJDQUFtQyxFQUFFLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRU8sZUFBZSxDQUFDLFNBQXNCO1FBQzdDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLFlBQVk7UUFDckIsQ0FBQztRQUVELE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBRWxDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU3QyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QjtJQUMvRixDQUFDO0lBRUQsVUFBVSxDQUFDLHNCQUE0QztRQUN0RCxJQUFJLE1BQStCLENBQUM7UUFDcEMsSUFBSSxPQUFPLHNCQUFzQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hELE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDL0MsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkQsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFTyxZQUFZLENBQUMsTUFBbUI7UUFDdkMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsWUFBWSxDQUFDLDZCQUEwQyxFQUFFLGdDQUErQztRQUN2RyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDM0QsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLFlBQVk7UUFDckIsQ0FBQztRQUVELE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSx5QkFBeUIsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUU5RCxNQUFNLHVCQUF1QixHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFDdkQsS0FBSyxNQUFNLCtCQUErQixJQUFJLGdDQUFnQyxFQUFFLENBQUM7WUFDaEYsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1lBQzdELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDVixPQUFPLENBQUMsWUFBWTtZQUNyQixDQUFDO1lBRUQsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsR0FBRyxDQUFDO1lBQ3JDLElBQUksc0JBQXNCLEtBQUssb0JBQW9CLEVBQUUsQ0FBQztnQkFDckQsU0FBUyxDQUFDLG1CQUFtQjtZQUM5QixDQUFDO1lBRUQsdUJBQXVCLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDckQsQ0FBQztRQUVELElBQUksQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUseUJBQXlCLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7SUFDM0csQ0FBQztJQUVPLGNBQWMsQ0FBQyxvQkFBd0MsRUFBRSx5QkFBNkMsRUFBRSx1QkFBc0M7UUFDckosTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBQy9DLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUV6QyxJQUFJLFlBQTJCLENBQUM7UUFDaEMsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLFlBQVksR0FBRyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsdUJBQXVCLENBQUMsQ0FBQztRQUNuRSxDQUFDO2FBQU0sQ0FBQztZQUNQLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDbkIsQ0FBQztRQUVELG1CQUFtQjtRQUNuQixJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQztRQUU5Qix5Q0FBeUM7UUFDekMsTUFBTSxtQkFBbUIsR0FBRyxvQkFBb0IsSUFBSSxPQUFPLHlCQUF5QixLQUFLLFFBQVEsSUFBSSxvQkFBb0IsS0FBSyxvQkFBb0IsQ0FBQztRQUNuSixJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFFekIsNkJBQTZCO1lBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlELElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBRXZDLFFBQVE7WUFDUixNQUFNLEtBQUssR0FBNEI7Z0JBQ3RDLElBQUksNENBQW9DO2dCQUN4QyxNQUFNLEVBQUUsb0JBQW9CO2dCQUM1QixXQUFXLEVBQUUseUJBQXlCO2FBQ3RDLENBQUM7WUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFFRCwwQ0FBMEM7UUFDMUMsSUFDQyxtQkFBbUI7WUFDbkIsaUJBQWlCLENBQUMsTUFBTSxLQUFLLFlBQVksQ0FBQyxNQUFNO1lBQ2hELGlCQUFpQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUMvRCxDQUFDO1lBQ0YsTUFBTSxLQUFLLEdBQTJCO2dCQUNyQyxJQUFJLGdEQUF3QzthQUM1QyxDQUFDO1lBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhO1FBQ3JCLHlEQUF5RDtRQUN6RCw0REFBNEQ7UUFDNUQsNERBQTREO1FBQzVELFNBQVM7UUFDVCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSwwQ0FBa0MsRUFBRSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELFFBQVEsQ0FBQyxLQUFhO1FBQ3JCLHlEQUF5RDtRQUN6RCw0REFBNEQ7UUFDNUQsNERBQTREO1FBQzVELFNBQVM7UUFDVCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSwwQ0FBa0MsRUFBRSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELEdBQUcsQ0FBQyxTQUFzQjtRQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU8sQ0FBQyxZQUFZO1FBQ3JCLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUVsQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVoQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBbUIsRUFBRSxXQUFtQjtRQUNyRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsZ0NBQWdDO1FBQ3pDLENBQUM7UUFFRCxrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFakMsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBRXBCLFFBQVE7UUFDUixNQUFNLEtBQUssR0FBNEI7WUFDdEMsSUFBSSwwQ0FBaUM7WUFDckMsTUFBTTtZQUNOLFdBQVc7U0FDWCxDQUFDO1FBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQXNCO1FBQzNCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLFlBQVk7UUFDckIsQ0FBQztRQUVELE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBRWxDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxDLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLE9BQU8sQ0FBQyxNQUFtQixFQUFFLFdBQW1CO1FBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLGlDQUFpQztRQUMxQyxDQUFDO1FBRUQsVUFBVTtRQUNWLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDaEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7UUFFdEIsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUE0QjtZQUN0QyxJQUFJLDBDQUFpQztZQUNyQyxNQUFNO1lBQ04sV0FBVztTQUNYLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRW5DLGtDQUFrQztRQUNsQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3hELENBQUM7SUFDRixDQUFDO0lBRUQsUUFBUSxDQUFDLHNCQUE0QztRQUNwRCxJQUFJLE1BQW1CLENBQUM7UUFDeEIsSUFBSSxPQUFPLHNCQUFzQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hELE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDL0MsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEdBQUcsc0JBQXNCLENBQUM7UUFDakMsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFzQjtRQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU8sQ0FBQyxZQUFZO1FBQ3JCLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUVsQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVsQyxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxPQUFPLENBQUMsTUFBbUIsRUFBRSxXQUFtQjtRQUN2RCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNoQyxPQUFPLENBQUMscUNBQXFDO1FBQzlDLENBQUM7UUFFRCxhQUFhO1FBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVqQiwyQ0FBMkM7UUFDM0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFeEMsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUVkLFFBQVE7UUFDUixNQUFNLEtBQUssR0FBNEI7WUFDdEMsSUFBSSw2Q0FBb0M7WUFDeEMsTUFBTTtZQUNOLFdBQVcsRUFBRSxjQUFjO1NBQzNCLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxPQUFPLENBQUMsU0FBc0I7UUFDN0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsWUFBWTtRQUNyQixDQUFDO1FBRUQsTUFBTSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUM7UUFFbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFcEMsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRU8sU0FBUyxDQUFDLE1BQW1CLEVBQUUsV0FBbUI7UUFDekQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsbUNBQW1DO1FBQzVDLENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNuQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztRQUV4QyxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBRWQsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUE0QjtZQUN0QyxJQUFJLDZDQUFvQztZQUN4QyxNQUFNO1lBQ04sV0FBVyxFQUFFLGNBQWM7U0FDM0IsQ0FBQztRQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxnQkFBc0M7UUFDOUMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sS0FBSyxDQUFDLENBQUMsbUJBQW1CO1FBQ2xDLENBQUM7UUFFRCxJQUFJLEtBQWEsQ0FBQztRQUNsQixJQUFJLE9BQU8sZ0JBQWdCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO1FBQzFCLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN4QyxDQUFDO1FBRUQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxPQUFPLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQzdCLENBQUM7SUFFRCxZQUFZLENBQUMsU0FBc0IsRUFBRSxTQUFrQjtRQUN0RCxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdDLE9BQU8sQ0FBQyxzQkFBc0I7UUFDL0IsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLFlBQVk7UUFDckIsQ0FBQztRQUVELE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBRWxDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVwRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxjQUFjLENBQUMsTUFBbUIsRUFBRSxXQUFtQixFQUFFLFNBQWtCO1FBQ2xGLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLE9BQU87WUFDUixDQUFDO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDakMsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBRUQsUUFBUTtRQUNSLE1BQU0sS0FBSyxHQUE0QjtZQUN0QyxJQUFJLGdEQUF1QztZQUMzQyxNQUFNO1lBQ04sV0FBVztTQUNYLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFFRCxXQUFXLENBQUMsc0JBQTRDO1FBQ3ZELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxLQUFLLENBQUMsQ0FBQyxzQkFBc0I7UUFDckMsQ0FBQztRQUVELElBQUksTUFBK0IsQ0FBQztRQUNwQyxJQUFJLE9BQU8sc0JBQXNCLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDaEQsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUMvQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2RCxDQUFDO1FBRUQsT0FBTyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFTyxNQUFNLENBQUMsS0FBYSxFQUFFLEdBQVksRUFBRSxNQUFvQjtRQUMvRCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEQsMEJBQTBCO1FBQzFCLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZixDQUFDO1FBRUQsMkJBQTJCO1FBQzNCLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNqRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixDQUFDO1lBQ0EsTUFBTTtZQUNOLElBQUksQ0FBQyxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ3BCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzNCLDJDQUEyQztvQkFDM0MsNkNBQTZDO29CQUM3QyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdkIsQ0FBQztxQkFBTSxDQUFDO29CQUNQLDBDQUEwQztvQkFDMUMsMkNBQTJDO29CQUMzQyxnREFBZ0Q7b0JBQ2hELHlDQUF5QztvQkFDekMsMENBQTBDO29CQUMxQyw0Q0FBNEM7b0JBQzVDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQy9CLENBQUM7WUFDRixDQUFDO1lBRUQsbUJBQW1CO2lCQUNkLENBQUM7Z0JBQ0wsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRW5FLFNBQVM7Z0JBQ1QsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCO2dCQUNuRCxDQUFDO2dCQUVELFVBQVU7cUJBQ0wsSUFBSSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQywwQkFBMEI7Z0JBQ25FLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPLENBQUMsU0FBbUQsRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUE2QjtRQUNqSCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNmLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxQixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxrRUFBa0U7Z0JBQ2xFLHFFQUFxRTtnQkFDckUscUVBQXFFO2dCQUNyRSxJQUFJLE9BQU8sRUFBRSxpQkFBaUIsSUFBSSxNQUFNLFlBQVkscUJBQXFCLElBQUksQ0FBQyxDQUFDLFNBQVMsWUFBWSxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7b0JBQzVILEtBQUssR0FBRyxDQUFDLENBQUM7Z0JBQ1gsQ0FBQztxQkFBTSxDQUFDO29CQUNQLEtBQUssR0FBRyxDQUFDLENBQUM7b0JBQ1YsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxVQUFVLENBQUMsU0FBNkIsRUFBRSxPQUE2QjtRQUN0RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdELElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDbEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxPQUFPLENBQUMsU0FBNkIsRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU87UUFDNUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsTUFBTSxDQUFDLFNBQTZCLEVBQUUsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPO1FBQzNELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQsUUFBUSxDQUFDLFNBQTRDLEVBQUUsT0FBNkI7UUFDbkYsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQzlELENBQUM7SUFFTyxPQUFPLENBQUMsTUFBc0MsRUFBRSxTQUFtRCxFQUFFLE9BQTZCO1FBQ3pJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMzQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLE9BQU8sRUFBRSxpQkFBaUIsSUFBSSxNQUFNLFlBQVkscUJBQXFCLElBQUksQ0FBQyxDQUFDLFNBQVMsWUFBWSxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7WUFDNUgsUUFBUSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDbkMsS0FBSyxnQkFBZ0IsQ0FBQyxHQUFHO29CQUN4QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUM1RyxPQUFPLElBQUksQ0FBQztvQkFDYixDQUFDO29CQUNELE1BQU07Z0JBQ1AsS0FBSyxnQkFBZ0IsQ0FBQyxJQUFJO29CQUN6QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUM1RyxPQUFPLElBQUksQ0FBQztvQkFDYixDQUFDO29CQUNELE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFHLE1BQU0sS0FBSyxTQUFTLENBQUM7UUFFMUMsSUFBSSxPQUFPLEVBQUUsWUFBWSxFQUFFLENBQUM7WUFDM0IsT0FBTyxZQUFZLENBQUM7UUFDckIsQ0FBQztRQUVELE9BQU8sWUFBWSxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBRUQsSUFBSSxDQUFDLE1BQWU7UUFDbkIsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1lBRXJCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLDJDQUFtQyxFQUFFLENBQUMsQ0FBQztRQUMxRSxDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUs7UUFDSixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGtCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXBGLDZCQUE2QjtRQUM3QixLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdCLEtBQUssQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBRTNCLCtDQUErQztRQUMvQyxLQUFLLE1BQU0sTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELFNBQVM7UUFDUixNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVyRix5REFBeUQ7UUFDekQsdURBQXVEO1FBQ3ZELCtDQUErQztRQUMvQyxNQUFNLG1CQUFtQixHQUFrQixFQUFFLENBQUM7UUFDOUMsTUFBTSxpQkFBaUIsR0FBNkIsRUFBRSxDQUFDO1FBQ3ZELElBQUksd0JBQTRDLENBQUM7UUFDakQsSUFBSSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBRXJDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDL0IsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7WUFFL0IsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO2dCQUVyRywyQkFBMkI7Z0JBQzNCLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQy9CLGtCQUFrQixHQUFHLElBQUksQ0FBQztvQkFFMUIsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDckQsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUVqQyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7d0JBQzdCLHdCQUF3QixHQUFHLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7b0JBQzNELENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCw4QkFBOEI7cUJBQ3pCLENBQUM7b0JBQ0wsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztZQUVELGtGQUFrRjtZQUNsRixJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxrQkFBa0IsRUFBRSxDQUFDO1lBQ3RCLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTlHLE9BQU87WUFDTixFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDWCxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ3RDLE9BQU8sRUFBRSxpQkFBaUI7WUFDMUIsR0FBRyxFQUFFLGVBQWU7WUFDcEIsT0FBTyxFQUFFLHdCQUF3QjtZQUNqQyxNQUFNLEVBQUUsa0JBQWtCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNoRSxDQUFDO0lBQ0gsQ0FBQztJQUVPLFdBQVcsQ0FBQyxJQUFpQztRQUNwRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF5QixnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVyRixJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQUUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7WUFFbkIsa0JBQWdCLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEVBQUUsa0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyw4Q0FBOEM7UUFDbkgsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsR0FBRyxHQUFHLGtCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsMEJBQTBCO1FBQzlELENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNwQixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDckQsSUFBSSxNQUFNLEdBQTRCLFNBQVMsQ0FBQztZQUVoRCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixNQUFNLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM1RixJQUFJLGtCQUFrQixZQUFZLFdBQVcsRUFBRSxDQUFDO29CQUMvQyxNQUFNLEdBQUcsa0JBQWtCLENBQUM7b0JBQzVCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDeEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsb0ZBQW9GO1lBQ3BHLENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXhELElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRTFELElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUVELElBQUksT0FBTyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMzQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ2pCLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU3QixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXZCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDOztBQWprQ1csZ0JBQWdCO0lBb0MxQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7R0FyQ1gsZ0JBQWdCLENBa2tDNUIifQ==