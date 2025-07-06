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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZENvbW1hbmRCYXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZENvbW1hbmRCYXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRXBILE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsMEJBQTBCLEVBQUUsNkJBQTZCLEVBQUUsNkJB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