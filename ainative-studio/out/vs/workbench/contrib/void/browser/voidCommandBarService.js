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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZENvbW1hbmRCYXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci92b2lkQ29tbWFuZEJhclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFcEgsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFL0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSwwQkFBMEIsRUFBRSw2QkFBNkIsRUFBRSw2QkFBNkIs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