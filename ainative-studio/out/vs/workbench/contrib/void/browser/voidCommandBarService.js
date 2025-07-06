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
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import * as dom from '../../../../base/browser/dom.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Emitter } from '../../../../base/common/event.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { mountVoidCommandBar } from './react/out/void-editor-widgets-tsx/index.js';
import { deepClone } from '../../../../base/common/objects.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { VOID_ACCEPT_DIFF_ACTION_ID, VOID_REJECT_DIFF_ACTION_ID, VOID_GOTO_NEXT_DIFF_ACTION_ID, VOID_GOTO_PREV_DIFF_ACTION_ID, VOID_GOTO_NEXT_URI_ACTION_ID, VOID_GOTO_PREV_URI_ACTION_ID, VOID_ACCEPT_FILE_ACTION_ID, VOID_REJECT_FILE_ACTION_ID, VOID_ACCEPT_ALL_DIFFS_ACTION_ID, VOID_REJECT_ALL_DIFFS_ACTION_ID } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IMetricsService } from '../common/metricsService.js';
import { KeyMod } from '../../../../editor/common/services/editorBaseApi.js';
import { IVoidModelService } from '../common/voidModelService.js';
export const IVoidCommandBarService = createDecorator('VoidCommandBarService');
const defaultState = {
    sortedDiffZoneIds: [],
    sortedDiffIds: [],
    isStreaming: false,
    diffIdx: null,
};
let VoidCommandBarService = class VoidCommandBarService extends Disposable {
    constructor(_instantiationService, _codeEditorService, _modelService, _editCodeService, _voidModelService) {
        super();
        this._instantiationService = _instantiationService;
        this._codeEditorService = _codeEditorService;
        this._modelService = _modelService;
        this._editCodeService = _editCodeService;
        this._voidModelService = _voidModelService;
        // depends on uri -> diffZone -> {streaming, diffs}
        this.stateOfURI = {};
        this.sortedURIs = []; // keys of state (depends on diffZones in the uri)
        this._listenToTheseURIs = new Set(); // uriFsPaths
        // Emits when a URI's stream state changes between idle, streaming, and acceptRejectAll
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        // active URI
        this.activeURI = null;
        this._onDidChangeActiveURI = new Emitter();
        this.onDidChangeActiveURI = this._onDidChangeActiveURI.event;
        const registeredModelURIs = new Set();
        const initializeModel = async (model) => {
            // do not add listeners to the same model twice - important, or will see duplicates
            if (registeredModelURIs.has(model.uri.fsPath))
                return;
            registeredModelURIs.add(model.uri.fsPath);
            this._listenToTheseURIs.add(model.uri);
        };
        // initialize all existing models + initialize when a new model mounts
        this._modelService.getModels().forEach(model => { initializeModel(model); });
        this._register(this._modelService.onModelAdded(model => { initializeModel(model); }));
        // for every new editor, add the floating widget and update active URI
        const disposablesOfEditorId = {};
        const onCodeEditorAdd = (editor) => {
            const id = editor.getId();
            disposablesOfEditorId[id] = [];
            // mount the command bar
            const d1 = this._instantiationService.createInstance(AcceptRejectAllFloatingWidget, { editor });
            disposablesOfEditorId[id].push(d1);
            const d2 = editor.onDidChangeModel((e) => {
                if (e.newModelUrl?.scheme !== 'file')
                    return;
                this.activeURI = e.newModelUrl;
                this._onDidChangeActiveURI.fire({ uri: e.newModelUrl });
            });
            disposablesOfEditorId[id].push(d2);
        };
        const onCodeEditorRemove = (editor) => {
            const id = editor.getId();
            if (disposablesOfEditorId[id]) {
                disposablesOfEditorId[id].forEach(d => d.dispose());
                delete disposablesOfEditorId[id];
            }
        };
        this._register(this._codeEditorService.onCodeEditorAdd((editor) => { onCodeEditorAdd(editor); }));
        this._register(this._codeEditorService.onCodeEditorRemove((editor) => { onCodeEditorRemove(editor); }));
        this._codeEditorService.listCodeEditors().forEach(editor => { onCodeEditorAdd(editor); });
        // state updaters
        this._register(this._editCodeService.onDidAddOrDeleteDiffZones(e => {
            for (const uri of this._listenToTheseURIs) {
                if (e.uri.fsPath !== uri.fsPath)
                    continue;
                // --- sortedURIs: delete if empty, add if not in state yet
                const diffZones = this._getDiffZonesOnURI(uri);
                if (diffZones.length === 0) {
                    this._deleteURIEntryFromState(uri);
                    this._onDidChangeState.fire({ uri });
                    continue; // deleted, so done
                }
                if (!this.sortedURIs.find(uri2 => uri2.fsPath === uri.fsPath)) {
                    this._addURIEntryToState(uri);
                }
                const currState = this.stateOfURI[uri.fsPath];
                if (!currState)
                    continue; // should never happen
                // update state of the diffZones on this URI
                const oldDiffZones = currState.sortedDiffZoneIds;
                const currentDiffZones = this._editCodeService.diffAreasOfURI[uri.fsPath] || []; // a Set
                const { addedDiffZones, deletedDiffZones } = this._getDiffZoneChanges(oldDiffZones, currentDiffZones || []);
                const diffZonesWithoutDeleted = oldDiffZones.filter(olddiffareaid => !deletedDiffZones.has(olddiffareaid));
                // --- new state:
                const newSortedDiffZoneIds = [
                    ...diffZonesWithoutDeleted,
                    ...addedDiffZones,
                ];
                const newSortedDiffIds = this._computeSortedDiffs(newSortedDiffZoneIds);
                const isStreaming = this._isAnyDiffZoneStreaming(currentDiffZones);
                // When diffZones are added/removed, reset the diffIdx to 0 if we have diffs
                const newDiffIdx = newSortedDiffIds.length > 0 ? 0 : null;
                this._setState(uri, {
                    sortedDiffZoneIds: newSortedDiffZoneIds,
                    sortedDiffIds: newSortedDiffIds,
                    isStreaming: isStreaming,
                    diffIdx: newDiffIdx
                });
                this._onDidChangeState.fire({ uri });
            }
        }));
        this._register(this._editCodeService.onDidChangeDiffsInDiffZoneNotStreaming(e => {
            for (const uri of this._listenToTheseURIs) {
                if (e.uri.fsPath !== uri.fsPath)
                    continue;
                // --- sortedURIs: no change
                // --- state:
                // sortedDiffIds gets a change to it, so gets recomputed
                const currState = this.stateOfURI[uri.fsPath];
                if (!currState)
                    continue; // should never happen
                const { sortedDiffZoneIds } = currState;
                const oldSortedDiffIds = currState.sortedDiffIds;
                const newSortedDiffIds = this._computeSortedDiffs(sortedDiffZoneIds);
                // Handle diffIdx adjustment when diffs change
                let newDiffIdx = currState.diffIdx;
                // Check if diffs were removed
                if (oldSortedDiffIds.length > newSortedDiffIds.length && currState.diffIdx !== null) {
                    // If currently selected diff was removed or we have fewer diffs than the current index
                    if (currState.diffIdx >= newSortedDiffIds.length) {
                        // Select the last diff if available, otherwise null
                        newDiffIdx = newSortedDiffIds.length > 0 ? newSortedDiffIds.length - 1 : null;
                    }
                }
                this._setState(uri, {
                    sortedDiffIds: newSortedDiffIds,
                    diffIdx: newDiffIdx
                    // sortedDiffZoneIds, // no change
                    // isStreaming, // no change
                });
                this._onDidChangeState.fire({ uri });
            }
        }));
        this._register(this._editCodeService.onDidChangeStreamingInDiffZone(e => {
            for (const uri of this._listenToTheseURIs) {
                if (e.uri.fsPath !== uri.fsPath)
                    continue;
                // --- sortedURIs: no change
                // --- state:
                const currState = this.stateOfURI[uri.fsPath];
                if (!currState)
                    continue; // should never happen
                const { sortedDiffZoneIds } = currState;
                this._setState(uri, {
                    isStreaming: this._isAnyDiffZoneStreaming(sortedDiffZoneIds),
                    // sortedDiffIds, // no change
                    // sortedDiffZoneIds, // no change
                });
                this._onDidChangeState.fire({ uri });
            }
        }));
    }
    setDiffIdx(uri, newIdx) {
        this._setState(uri, { diffIdx: newIdx });
        this._onDidChangeState.fire({ uri });
    }
    getStreamState(uri) {
        const { isStreaming, sortedDiffZoneIds } = this.stateOfURI[uri.fsPath] ?? {};
        if (isStreaming) {
            return 'streaming';
        }
        if ((sortedDiffZoneIds?.length ?? 0) > 0) {
            return 'idle-has-changes';
        }
        return 'idle-no-changes';
    }
    _computeSortedDiffs(diffareaids) {
        const sortedDiffIds = [];
        for (const diffareaid of diffareaids) {
            const diffZone = this._editCodeService.diffAreaOfId[diffareaid];
            if (!diffZone || diffZone.type !== 'DiffZone') {
                continue;
            }
            // Add all diff ids from this diffzone
            const diffIds = Object.keys(diffZone._diffOfId);
            sortedDiffIds.push(...diffIds);
        }
        return sortedDiffIds;
    }
    _getDiffZoneChanges(oldDiffZones, currentDiffZones) {
        // Find the added or deleted diffZones by comparing diffareaids
        const addedDiffZoneIds = new Set();
        const deletedDiffZoneIds = new Set();
        // Convert the current diffZones to a set of ids for easy lookup
        const currentDiffZoneIdSet = new Set(currentDiffZones);
        // Find deleted diffZones (in old but not in current)
        for (const oldDiffZoneId of oldDiffZones) {
            if (!currentDiffZoneIdSet.has(oldDiffZoneId)) {
                const diffZone = this._editCodeService.diffAreaOfId[oldDiffZoneId];
                if (diffZone && diffZone.type === 'DiffZone') {
                    deletedDiffZoneIds.add(oldDiffZoneId);
                }
            }
        }
        // Find added diffZones (in current but not in old)
        const oldDiffZoneIdSet = new Set(oldDiffZones);
        for (const currentDiffZoneId of currentDiffZones) {
            if (!oldDiffZoneIdSet.has(currentDiffZoneId)) {
                const diffZone = this._editCodeService.diffAreaOfId[currentDiffZoneId];
                if (diffZone && diffZone.type === 'DiffZone') {
                    addedDiffZoneIds.add(currentDiffZoneId);
                }
            }
        }
        return { addedDiffZones: addedDiffZoneIds, deletedDiffZones: deletedDiffZoneIds };
    }
    _isAnyDiffZoneStreaming(diffareaids) {
        for (const diffareaid of diffareaids) {
            const diffZone = this._editCodeService.diffAreaOfId[diffareaid];
            if (!diffZone || diffZone.type !== 'DiffZone') {
                continue;
            }
            if (diffZone._streamState.isStreaming) {
                return true;
            }
        }
        return false;
    }
    _setState(uri, opts) {
        const newState = {
            ...this.stateOfURI[uri.fsPath] ?? deepClone(defaultState),
            ...opts
        };
        // make sure diffIdx is always correct
        if (newState.diffIdx !== null && newState.diffIdx > newState.sortedDiffIds.length) {
            newState.diffIdx = newState.sortedDiffIds.length;
            if (newState.diffIdx <= 0)
                newState.diffIdx = null;
        }
        this.stateOfURI = {
            ...this.stateOfURI,
            [uri.fsPath]: newState
        };
    }
    _addURIEntryToState(uri) {
        // add to sortedURIs
        this.sortedURIs = [
            ...this.sortedURIs,
            uri
        ];
        // add to state
        this.stateOfURI[uri.fsPath] = deepClone(defaultState);
    }
    _deleteURIEntryFromState(uri) {
        // delete this from sortedURIs
        const i = this.sortedURIs.findIndex(uri2 => uri2.fsPath === uri.fsPath);
        if (i === -1)
            return;
        this.sortedURIs = [
            ...this.sortedURIs.slice(0, i),
            ...this.sortedURIs.slice(i + 1, Infinity),
        ];
        // delete from state
        delete this.stateOfURI[uri.fsPath];
    }
    _getDiffZonesOnURI(uri) {
        const diffZones = [...this._editCodeService.diffAreasOfURI[uri.fsPath]?.values() ?? []]
            .map(diffareaid => this._editCodeService.diffAreaOfId[diffareaid])
            .filter(diffArea => !!diffArea && diffArea.type === 'DiffZone');
        return diffZones;
    }
    anyFileIsStreaming() {
        return this.sortedURIs.some(uri => this.getStreamState(uri) === 'streaming');
    }
    getNextDiffIdx(step) {
        // If no active URI, return null
        if (!this.activeURI)
            return null;
        const state = this.stateOfURI[this.activeURI.fsPath];
        if (!state)
            return null;
        const { diffIdx, sortedDiffIds } = state;
        // If no diffs, return null
        if (sortedDiffIds.length === 0)
            return null;
        // Calculate next index with wrapping
        const nextIdx = ((diffIdx ?? 0) + step + sortedDiffIds.length) % sortedDiffIds.length;
        return nextIdx;
    }
    getNextUriIdx(step) {
        // If no URIs with changes, return null
        if (this.sortedURIs.length === 0)
            return null;
        // If no active URI, return first or last based on step
        if (!this.activeURI) {
            return step === 1 ? 0 : this.sortedURIs.length - 1;
        }
        // Find current index
        const currentIdx = this.sortedURIs.findIndex(uri => uri.fsPath === this.activeURI?.fsPath);
        // If not found, return first or last based on step
        if (currentIdx === -1) {
            return step === 1 ? 0 : this.sortedURIs.length - 1;
        }
        // Calculate next index with wrapping
        const nextIdx = (currentIdx + step + this.sortedURIs.length) % this.sortedURIs.length;
        return nextIdx;
    }
    goToDiffIdx(idx) {
        // If null or no active URI, return
        if (idx === null || !this.activeURI)
            return;
        // Get state for the current URI
        const state = this.stateOfURI[this.activeURI.fsPath];
        if (!state)
            return;
        const { sortedDiffIds } = state;
        // Find the diff at the specified index
        const diffid = sortedDiffIds[idx];
        if (diffid === undefined)
            return;
        // Get the diff object
        const diff = this._editCodeService.diffOfId[diffid];
        if (!diff)
            return;
        // Find an active editor to focus
        const editor = this._codeEditorService.getFocusedCodeEditor() ||
            this._codeEditorService.getActiveCodeEditor();
        if (!editor)
            return;
        // Reveal the line in the editor
        editor.revealLineNearTop(diff.startLine - 1, 1 /* ScrollType.Immediate */);
        // Update the current diff index
        this.setDiffIdx(this.activeURI, idx);
    }
    async goToURIIdx(idx) {
        // If null or no URIs, return
        if (idx === null || this.sortedURIs.length === 0)
            return;
        // Get the URI at the specified index
        const nextURI = this.sortedURIs[idx];
        if (!nextURI)
            return;
        // Get the model for this URI
        const { model } = await this._voidModelService.getModelSafe(nextURI);
        if (!model)
            return;
        // Find an editor to use
        const editor = this._codeEditorService.getFocusedCodeEditor() ||
            this._codeEditorService.getActiveCodeEditor();
        if (!editor)
            return;
        // Open the URI in the editor
        await this._codeEditorService.openCodeEditor({ resource: model.uri, options: { revealIfVisible: true } }, editor);
    }
    acceptOrRejectAllFiles(opts) {
        const { behavior } = opts;
        // if anything is streaming, do nothing
        const anyIsStreaming = this.anyFileIsStreaming();
        if (anyIsStreaming)
            return;
        for (const uri of this.sortedURIs) {
            this._editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior, removeCtrlKs: false });
        }
    }
};
VoidCommandBarService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ICodeEditorService),
    __param(2, IModelService),
    __param(3, IEditCodeService),
    __param(4, IVoidModelService)
], VoidCommandBarService);
export { VoidCommandBarService };
registerSingleton(IVoidCommandBarService, VoidCommandBarService, 1 /* InstantiationType.Delayed */); // delayed is needed here :(
let AcceptRejectAllFloatingWidget = class AcceptRejectAllFloatingWidget extends Widget {
    constructor({ editor }, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this._height = 0;
        this.ID = generateUuid();
        this.editor = editor;
        // Create container div
        const { root } = dom.h('div@root');
        // Style the container
        // root.style.backgroundColor = 'rgb(248 113 113)';
        root.style.height = '256px'; // make a fixed size, and all contents go on the bottom right. this fixes annoying VS Code mounting issues
        root.style.width = '100%';
        root.style.flexDirection = 'column';
        root.style.justifyContent = 'flex-end';
        root.style.alignItems = 'flex-end';
        root.style.zIndex = '2';
        root.style.padding = '4px';
        root.style.pointerEvents = 'none';
        root.style.display = 'flex';
        root.style.overflow = 'hidden';
        this._domNode = root;
        editor.addOverlayWidget(this);
        this.instantiationService.invokeFunction(accessor => {
            const uri = editor.getModel()?.uri || null;
            const res = mountVoidCommandBar(root, accessor, { uri, editor });
            if (!res)
                return;
            this._register(toDisposable(() => res.dispose?.()));
            this._register(editor.onWillChangeModel((model) => {
                const uri = model.newModelUrl;
                res.rerender({ uri, editor });
            }));
        });
    }
    getId() {
        return this.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */
        };
    }
    dispose() {
        this.editor.removeOverlayWidget(this);
        super.dispose();
    }
};
AcceptRejectAllFloatingWidget = __decorate([
    __param(1, IInstantiationService)
], AcceptRejectAllFloatingWidget);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_ACCEPT_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidAcceptDiffAction', 'Void: Accept Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 3 /* KeyCode.Enter */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 3 /* KeyCode.Enter */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const editCodeService = accessor.get(IEditCodeService);
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        const commandBarState = commandBarService.stateOfURI[activeURI.fsPath];
        if (!commandBarState)
            return;
        const diffIdx = commandBarState.diffIdx ?? 0;
        const diffid = commandBarState.sortedDiffIds[diffIdx];
        if (!diffid)
            return;
        metricsService.capture('Accept Diff', { diffid, keyboard: true });
        editCodeService.acceptDiff({ diffid: parseInt(diffid) });
        // After accepting the diff, navigate to the next diff
        const nextDiffIdx = commandBarService.getNextDiffIdx(1);
        if (nextDiffIdx !== null) {
            commandBarService.goToDiffIdx(nextDiffIdx);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_REJECT_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidRejectDiffAction', 'Void: Reject Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 1 /* KeyCode.Backspace */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 1 /* KeyCode.Backspace */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const editCodeService = accessor.get(IEditCodeService);
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        const commandBarState = commandBarService.stateOfURI[activeURI.fsPath];
        if (!commandBarState)
            return;
        const diffIdx = commandBarState.diffIdx ?? 0;
        const diffid = commandBarState.sortedDiffIds[diffIdx];
        if (!diffid)
            return;
        metricsService.capture('Reject Diff', { diffid, keyboard: true });
        editCodeService.rejectDiff({ diffid: parseInt(diffid) });
        // After rejecting the diff, navigate to the next diff
        const nextDiffIdx = commandBarService.getNextDiffIdx(1);
        if (nextDiffIdx !== null) {
            commandBarService.goToDiffIdx(nextDiffIdx);
        }
    }
});
// Go to next diff action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_NEXT_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidGoToNextDiffAction', 'Void: Go to Next Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 18 /* KeyCode.DownArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 18 /* KeyCode.DownArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const nextDiffIdx = commandBarService.getNextDiffIdx(1);
        if (nextDiffIdx === null)
            return;
        metricsService.capture('Navigate Diff', { direction: 'next', keyboard: true });
        commandBarService.goToDiffIdx(nextDiffIdx);
    }
});
// Go to previous diff action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_PREV_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidGoToPrevDiffAction', 'Void: Go to Previous Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 16 /* KeyCode.UpArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 16 /* KeyCode.UpArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const prevDiffIdx = commandBarService.getNextDiffIdx(-1);
        if (prevDiffIdx === null)
            return;
        metricsService.capture('Navigate Diff', { direction: 'previous', keyboard: true });
        commandBarService.goToDiffIdx(prevDiffIdx);
    }
});
// Go to next URI action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_NEXT_URI_ACTION_ID,
            f1: true,
            title: localize2('voidGoToNextUriAction', 'Void: Go to Next File with Diffs'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 17 /* KeyCode.RightArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 17 /* KeyCode.RightArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const nextUriIdx = commandBarService.getNextUriIdx(1);
        if (nextUriIdx === null)
            return;
        metricsService.capture('Navigate URI', { direction: 'next', keyboard: true });
        await commandBarService.goToURIIdx(nextUriIdx);
    }
});
// Go to previous URI action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_PREV_URI_ACTION_ID,
            f1: true,
            title: localize2('voidGoToPrevUriAction', 'Void: Go to Previous File with Diffs'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 15 /* KeyCode.LeftArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 15 /* KeyCode.LeftArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const prevUriIdx = commandBarService.getNextUriIdx(-1);
        if (prevUriIdx === null)
            return;
        metricsService.capture('Navigate URI', { direction: 'previous', keyboard: true });
        await commandBarService.goToURIIdx(prevUriIdx);
    }
});
// Accept current file action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_ACCEPT_FILE_ACTION_ID,
            f1: true,
            title: localize2('voidAcceptFileAction', 'Void: Accept All Diffs in Current File'),
            keybinding: {
                primary: KeyMod.Alt | KeyMod.Shift | 3 /* KeyCode.Enter */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const editCodeService = accessor.get(IEditCodeService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        metricsService.capture('Accept File', { keyboard: true });
        editCodeService.acceptOrRejectAllDiffAreas({
            uri: activeURI,
            behavior: 'accept',
            removeCtrlKs: true
        });
    }
});
// Reject current file action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_REJECT_FILE_ACTION_ID,
            f1: true,
            title: localize2('voidRejectFileAction', 'Void: Reject All Diffs in Current File'),
            keybinding: {
                primary: KeyMod.Alt | KeyMod.Shift | 1 /* KeyCode.Backspace */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const editCodeService = accessor.get(IEditCodeService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        metricsService.capture('Reject File', { keyboard: true });
        editCodeService.acceptOrRejectAllDiffAreas({
            uri: activeURI,
            behavior: 'reject',
            removeCtrlKs: true
        });
    }
});
// Accept all diffs in all files action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_ACCEPT_ALL_DIFFS_ACTION_ID,
            f1: true,
            title: localize2('voidAcceptAllDiffsAction', 'Void: Accept All Diffs in All Files'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Shift | 3 /* KeyCode.Enter */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        if (commandBarService.anyFileIsStreaming())
            return;
        metricsService.capture('Accept All Files', { keyboard: true });
        commandBarService.acceptOrRejectAllFiles({ behavior: 'accept' });
    }
});
// Reject all diffs in all files action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_REJECT_ALL_DIFFS_ACTION_ID,
            f1: true,
            title: localize2('voidRejectAllDiffsAction', 'Void: Reject All Diffs in All Files'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Shift | 1 /* KeyCode.Backspace */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            }
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        if (commandBarService.anyFileIsStreaming())
            return;
        metricsService.capture('Reject All Files', { keyboard: true });
        commandBarService.acceptOrRejectAllFiles({ behavior: 'reject' });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZENvbW1hbmRCYXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWRDb21tYW5kQmFyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVwSCxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUVqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixF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