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
import { equals as arraysEqual, binarySearch2 } from '../../../../../base/common/arrays.js';
import { DeferredPromise, Sequencer, SequencerByKey, timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { StringSHA1 } from '../../../../../base/common/hash.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, dispose } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { asyncTransaction, autorun, derived, derivedOpts, derivedWithStore, ObservablePromise, observableValue, transaction } from '../../../../../base/common/observable.js';
import { isEqual, joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { OffsetEdit } from '../../../../../editor/common/core/offsetEdit.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { getMultiDiffSourceUri } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingModifiedDocumentEntry } from './chatEditingModifiedDocumentEntry.js';
import { ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { ChatEditingModifiedNotebookEntry } from './chatEditingModifiedNotebookEntry.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ChatEditingModifiedNotebookDiff } from './notebook/chatEditingModifiedNotebookDiff.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
const STORAGE_CONTENTS_FOLDER = 'contents';
const STORAGE_STATE_FILE = 'state.json';
const POST_EDIT_STOP_ID = 'd19944f6-f46c-4e17-911b-79a8e843c7c0'; // randomly generated
class ThrottledSequencer extends Sequencer {
    constructor(_minDuration, _maxOverallDelay) {
        super();
        this._minDuration = _minDuration;
        this._maxOverallDelay = _maxOverallDelay;
        this._size = 0;
    }
    queue(promiseTask) {
        this._size += 1;
        const noDelay = this._size * this._minDuration > this._maxOverallDelay;
        return super.queue(async () => {
            try {
                const p1 = promiseTask();
                const p2 = noDelay
                    ? Promise.resolve(undefined)
                    : timeout(this._minDuration, CancellationToken.None);
                const [result] = await Promise.all([p1, p2]);
                return result;
            }
            finally {
                this._size -= 1;
            }
        });
    }
}
function getMaxHistoryIndex(history) {
    const lastHistory = history.at(-1);
    return lastHistory ? lastHistory.startIndex + lastHistory.stops.length : 0;
}
function snapshotsEqualForDiff(a, b) {
    if (!a || !b) {
        return a === b;
    }
    return isEqual(a.snapshotUri, b.snapshotUri) && a.current === b.current;
}
function getCurrentAndNextStop(requestId, stopId, history) {
    const snapshotIndex = history.findIndex(s => s.requestId === requestId);
    if (snapshotIndex === -1) {
        return undefined;
    }
    const snapshot = history[snapshotIndex];
    const stopIndex = snapshot.stops.findIndex(s => s.stopId === stopId);
    if (stopIndex === -1) {
        return undefined;
    }
    const current = snapshot.stops[stopIndex].entries;
    const next = stopIndex < snapshot.stops.length - 1
        ? snapshot.stops[stopIndex + 1].entries
        : snapshot.postEdit || history[snapshotIndex + 1]?.stops[0].entries;
    if (!next) {
        return undefined;
    }
    return { current, next };
}
let ChatEditingSession = class ChatEditingSession extends Disposable {
    get entries() {
        this._assertNotDisposed();
        return this._entriesObs;
    }
    get state() {
        return this._state;
    }
    get onDidChange() {
        this._assertNotDisposed();
        return this._onDidChange.event;
    }
    get onDidDispose() {
        this._assertNotDisposed();
        return this._onDidDispose.event;
    }
    constructor(chatSessionId, isGlobalEditingSession, _lookupExternalEntry, _instantiationService, _modelService, _languageService, _textModelService, _bulkEditService, _editorGroupsService, _editorService, _chatService, _notebookService, _editorWorkerService, _configurationService, _accessibilitySignalService) {
        super();
        this.chatSessionId = chatSessionId;
        this.isGlobalEditingSession = isGlobalEditingSession;
        this._lookupExternalEntry = _lookupExternalEntry;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._textModelService = _textModelService;
        this._bulkEditService = _bulkEditService;
        this._editorGroupsService = _editorGroupsService;
        this._editorService = _editorService;
        this._chatService = _chatService;
        this._notebookService = _notebookService;
        this._editorWorkerService = _editorWorkerService;
        this._configurationService = _configurationService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._state = observableValue(this, 0 /* ChatEditingSessionState.Initial */);
        this._linearHistory = observableValue(this, []);
        this._linearHistoryIndex = observableValue(this, 0);
        /**
         * Contains the contents of a file when the AI first began doing edits to it.
         */
        this._initialFileContents = new ResourceMap();
        this._entriesObs = observableValue(this, []);
        this._workingSet = new ResourceMap();
        this.canUndo = derived((r) => {
            if (this.state.read(r) !== 2 /* ChatEditingSessionState.Idle */) {
                return false;
            }
            const linearHistoryIndex = this._linearHistoryIndex.read(r);
            return linearHistoryIndex > 0;
        });
        this.canRedo = derived((r) => {
            if (this.state.read(r) !== 2 /* ChatEditingSessionState.Idle */) {
                return false;
            }
            const linearHistoryIndex = this._linearHistoryIndex.read(r);
            return linearHistoryIndex < getMaxHistoryIndex(this._linearHistory.read(r));
        });
        // public hiddenRequestIds = derived<string[]>((r) => {
        // 	const linearHistory = this._linearHistory.read(r);
        // 	const linearHistoryIndex = this._linearHistoryIndex.read(r);
        // 	return linearHistory.slice(linearHistoryIndex).map(s => s.requestId).filter((r): r is string => !!r);
        // });
        this._onDidChange = this._register(new Emitter());
        this._onDidDispose = new Emitter();
        this._diffsBetweenStops = new Map();
        this._ignoreTrimWhitespaceObservable = observableConfigValue('diffEditor.ignoreTrimWhitespace', true, this._configurationService);
        this._streamingEditLocks = new SequencerByKey();
    }
    async init() {
        const restoredSessionState = await this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionId).restoreState();
        if (restoredSessionState) {
            for (const [uri, content] of restoredSessionState.initialFileContents) {
                this._initialFileContents.set(uri, content);
            }
            await asyncTransaction(async (tx) => {
                this._pendingSnapshot = restoredSessionState.pendingSnapshot;
                await this._restoreSnapshot(restoredSessionState.recentSnapshot, tx, false);
                this._linearHistory.set(restoredSessionState.linearHistory, tx);
                this._linearHistoryIndex.set(restoredSessionState.linearHistoryIndex, tx);
                this._state.set(2 /* ChatEditingSessionState.Idle */, tx);
            });
        }
        else {
            this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
        }
        this._register(autorun(reader => {
            const entries = this.entries.read(reader);
            entries.forEach(entry => {
                entry.state.read(reader);
            });
            this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
        }));
    }
    _getEntry(uri) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
    }
    getEntry(uri) {
        return this._getEntry(uri);
    }
    readEntry(uri, reader) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.read(reader).find(e => isEqual(e.modifiedURI, uri));
    }
    storeState() {
        const storage = this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionId);
        const state = {
            initialFileContents: this._initialFileContents,
            pendingSnapshot: this._pendingSnapshot,
            recentSnapshot: this._createSnapshot(undefined, undefined),
            linearHistoryIndex: this._linearHistoryIndex.get(),
            linearHistory: this._linearHistory.get(),
        };
        return storage.storeState(state);
    }
    _findSnapshot(requestId) {
        return this._linearHistory.get().find(s => s.requestId === requestId);
    }
    _findEditStop(requestId, undoStop) {
        const snapshot = this._findSnapshot(requestId);
        if (!snapshot) {
            return undefined;
        }
        const idx = snapshot.stops.findIndex(s => s.stopId === undoStop);
        return idx === -1 ? undefined : { stop: snapshot.stops[idx], snapshot, historyIndex: snapshot.startIndex + idx };
    }
    _ensurePendingSnapshot() {
        this._pendingSnapshot ??= this._createSnapshot(undefined, undefined);
    }
    /**
     * Gets diff for text entries between stops.
     * @param entriesContent Observable that observes either snapshot entry
     * @param modelUrisObservable Observable that observes only the snapshot URIs.
     */
    _entryDiffBetweenTextStops(entriesContent, modelUrisObservable) {
        const modelRefsPromise = derivedWithStore(this, (reader, store) => {
            const modelUris = modelUrisObservable.read(reader);
            if (!modelUris) {
                return undefined;
            }
            const promise = Promise.all(modelUris.map(u => this._textModelService.createModelReference(u))).then(refs => {
                if (store.isDisposed) {
                    refs.forEach(r => r.dispose());
                }
                else {
                    refs.forEach(r => store.add(r));
                }
                return refs;
            });
            return new ObservablePromise(promise);
        });
        return derived((reader) => {
            const refs = modelRefsPromise.read(reader)?.promiseResult.read(reader)?.data;
            if (!refs) {
                return;
            }
            const entries = entriesContent.read(reader); // trigger re-diffing when contents change
            if (entries?.before && ChatEditingModifiedNotebookEntry.canHandleSnapshot(entries.before)) {
                const diffService = this._instantiationService.createInstance(ChatEditingModifiedNotebookDiff, entries.before, entries.after);
                return new ObservablePromise(diffService.computeDiff());
            }
            const ignoreTrimWhitespace = this._ignoreTrimWhitespaceObservable.read(reader);
            const promise = this._editorWorkerService.computeDiff(refs[0].object.textEditorModel.uri, refs[1].object.textEditorModel.uri, { ignoreTrimWhitespace, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced').then((diff) => {
                const entryDiff = {
                    originalURI: refs[0].object.textEditorModel.uri,
                    modifiedURI: refs[1].object.textEditorModel.uri,
                    identical: !!diff?.identical,
                    quitEarly: !diff || diff.quitEarly,
                    added: 0,
                    removed: 0,
                };
                if (diff) {
                    for (const change of diff.changes) {
                        entryDiff.removed += change.original.endLineNumberExclusive - change.original.startLineNumber;
                        entryDiff.added += change.modified.endLineNumberExclusive - change.modified.startLineNumber;
                    }
                }
                return entryDiff;
            });
            return new ObservablePromise(promise);
        });
    }
    _createDiffBetweenStopsObservable(uri, requestId, stopId) {
        const entries = derivedOpts({
            equalsFn: (a, b) => snapshotsEqualForDiff(a?.before, b?.before) && snapshotsEqualForDiff(a?.after, b?.after),
        }, reader => {
            const stops = getCurrentAndNextStop(requestId, stopId, this._linearHistory.read(reader));
            if (!stops) {
                return undefined;
            }
            const before = stops.current.get(uri);
            const after = stops.next.get(uri);
            if (!before || !after) {
                return undefined;
            }
            return { before, after };
        });
        // Separate observable for model refs to avoid unnecessary disposal
        const modelUrisObservable = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, isEqual) }, reader => {
            const entriesValue = entries.read(reader);
            if (!entriesValue) {
                return undefined;
            }
            return [entriesValue.before.snapshotUri, entriesValue.after.snapshotUri];
        });
        const diff = this._entryDiffBetweenTextStops(entries, modelUrisObservable);
        return derived(reader => {
            return diff.read(reader)?.promiseResult.read(reader)?.data || undefined;
        });
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        const key = `${uri}\0${requestId}\0${stopId}`;
        let observable = this._diffsBetweenStops.get(key);
        if (!observable) {
            observable = this._createDiffBetweenStopsObservable(uri, requestId, stopId);
            this._diffsBetweenStops.set(key, observable);
        }
        return observable;
    }
    createSnapshot(requestId, undoStop) {
        const snapshot = this._createSnapshot(requestId, undoStop);
        for (const [uri, _] of this._workingSet) {
            this._workingSet.set(uri, { state: 5 /* WorkingSetEntryState.Sent */ });
        }
        const linearHistoryPtr = this._linearHistoryIndex.get();
        const newLinearHistory = [];
        for (const entry of this._linearHistory.get()) {
            if (linearHistoryPtr - entry.startIndex < entry.stops.length) {
                newLinearHistory.push({ requestId: entry.requestId, stops: entry.stops.slice(0, linearHistoryPtr - entry.startIndex), startIndex: entry.startIndex, postEdit: undefined });
            }
            else {
                newLinearHistory.push(entry);
            }
        }
        const lastEntry = newLinearHistory.at(-1);
        if (requestId && lastEntry?.requestId === requestId) {
            newLinearHistory[newLinearHistory.length - 1] = { ...lastEntry, stops: [...lastEntry.stops, snapshot], postEdit: undefined };
        }
        else {
            newLinearHistory.push({ requestId, startIndex: lastEntry ? lastEntry.startIndex + lastEntry.stops.length : 0, stops: [snapshot], postEdit: undefined });
        }
        transaction((tx) => {
            const last = newLinearHistory[newLinearHistory.length - 1];
            this._linearHistory.set(newLinearHistory, tx);
            this._linearHistoryIndex.set(last.startIndex + last.stops.length, tx);
        });
    }
    _createSnapshot(requestId, undoStop) {
        const workingSet = new ResourceMap(this._workingSet);
        const entries = new ResourceMap();
        for (const entry of this._entriesObs.get()) {
            entries.set(entry.modifiedURI, entry.createSnapshot(requestId, undoStop));
        }
        return {
            stopId: undoStop,
            workingSet,
            entries,
        };
    }
    getSnapshot(requestId, undoStop, snapshotUri) {
        const entries = undoStop === POST_EDIT_STOP_ID
            ? this._findSnapshot(requestId)?.postEdit
            : this._findEditStop(requestId, undoStop)?.stop.entries;
        return entries && [...entries.values()].find((e) => isEqual(e.snapshotUri, snapshotUri));
    }
    async getSnapshotModel(requestId, undoStop, snapshotUri) {
        const snapshotEntry = this.getSnapshot(requestId, undoStop, snapshotUri);
        if (!snapshotEntry) {
            return null;
        }
        return this._modelService.createModel(snapshotEntry.current, this._languageService.createById(snapshotEntry.languageId), snapshotUri, false);
    }
    getSnapshotUri(requestId, uri, stopId) {
        const stops = getCurrentAndNextStop(requestId, stopId, this._linearHistory.get());
        return stops?.next.get(uri)?.snapshotUri;
    }
    async restoreSnapshot(requestId, stopId) {
        if (requestId !== undefined) {
            const stopRef = this._findEditStop(requestId, stopId);
            if (stopRef) {
                this._ensurePendingSnapshot();
                await asyncTransaction(async (tx) => {
                    this._linearHistoryIndex.set(stopRef.historyIndex, tx);
                    await this._restoreSnapshot(stopRef.stop, tx);
                });
                this._updateRequestHiddenState();
            }
        }
        else {
            const pendingSnapshot = this._pendingSnapshot;
            if (!pendingSnapshot) {
                return; // We don't have a pending snapshot that we can restore
            }
            this._pendingSnapshot = undefined;
            await this._restoreSnapshot(pendingSnapshot, undefined);
        }
    }
    async _restoreSnapshot({ workingSet, entries }, tx, restoreResolvedToDisk = true) {
        this._workingSet = new ResourceMap(workingSet);
        // Reset all the files which are modified in this session state
        // but which are not found in the snapshot
        for (const entry of this._entriesObs.get()) {
            const snapshotEntry = entries.get(entry.modifiedURI);
            if (!snapshotEntry) {
                entry.resetToInitialContent();
                entry.dispose();
            }
        }
        const entriesArr = [];
        // Restore all entries from the snapshot
        for (const snapshotEntry of entries.values()) {
            const entry = await this._getOrCreateModifiedFileEntry(snapshotEntry.resource, snapshotEntry.telemetryInfo);
            const restoreToDisk = snapshotEntry.state === 0 /* WorkingSetEntryState.Modified */ || restoreResolvedToDisk;
            entry.restoreFromSnapshot(snapshotEntry, restoreToDisk);
            entriesArr.push(entry);
        }
        this._entriesObs.set(entriesArr, tx);
    }
    remove(reason, ...uris) {
        this._assertNotDisposed();
        let didRemoveUris = false;
        for (const uri of uris) {
            const entry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
            if (entry) {
                entry.dispose();
                const newEntries = this._entriesObs.get().filter(e => !isEqual(e.modifiedURI, uri));
                this._entriesObs.set(newEntries, undefined);
                didRemoveUris = true;
            }
            const state = this._workingSet.get(uri);
            if (state !== undefined) {
                didRemoveUris = this._workingSet.delete(uri) || didRemoveUris;
            }
        }
        if (!didRemoveUris) {
            return; // noop
        }
        this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
    }
    _assertNotDisposed() {
        if (this._state.get() === 3 /* ChatEditingSessionState.Disposed */) {
            throw new BugIndicatingError(`Cannot access a disposed editing session`);
        }
    }
    async accept(...uris) {
        this._assertNotDisposed();
        await asyncTransaction(async (tx) => {
            if (uris.length === 0) {
                await Promise.all(this._entriesObs.get().map(entry => entry.accept(tx)));
            }
            for (const uri of uris) {
                const entry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
                if (entry) {
                    await entry.accept(tx);
                }
            }
        });
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
        this._onDidChange.fire(1 /* ChatEditingSessionChangeType.Other */);
    }
    async reject(...uris) {
        this._assertNotDisposed();
        await asyncTransaction(async (tx) => {
            if (uris.length === 0) {
                await Promise.all(this._entriesObs.get().map(entry => entry.reject(tx)));
            }
            for (const uri of uris) {
                const entry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
                if (entry) {
                    await entry.reject(tx);
                }
            }
        });
        this._accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
        this._onDidChange.fire(1 /* ChatEditingSessionChangeType.Other */);
    }
    async show() {
        this._assertNotDisposed();
        if (this._editorPane) {
            if (this._editorPane.isVisible()) {
                return;
            }
            else if (this._editorPane.input) {
                await this._editorGroupsService.activeGroup.openEditor(this._editorPane.input, { pinned: true, activation: EditorActivation.ACTIVATE });
                return;
            }
        }
        const input = MultiDiffEditorInput.fromResourceMultiDiffEditorInput({
            multiDiffSource: getMultiDiffSourceUri(this),
            label: localize('multiDiffEditorInput.name', "Suggested Edits")
        }, this._instantiationService);
        this._editorPane = await this._editorGroupsService.activeGroup.openEditor(input, { pinned: true, activation: EditorActivation.ACTIVATE });
    }
    async stop(clearState = false) {
        this._stopPromise ??= Promise.allSettled([this._performStop(), this.storeState()]).then(() => { });
        await this._stopPromise;
        if (clearState) {
            await this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionId).clearState();
        }
    }
    async _performStop() {
        // Close out all open files
        const schemes = [AbstractChatEditingModifiedFileEntry.scheme, ChatEditingTextModelContentProvider.scheme];
        await Promise.allSettled(this._editorGroupsService.groups.flatMap(async (g) => {
            return g.editors.map(async (e) => {
                if ((e instanceof MultiDiffEditorInput && e.initialResources?.some(r => r.originalUri && schemes.indexOf(r.originalUri.scheme) !== -1))
                    || (e instanceof DiffEditorInput && e.original.resource && schemes.indexOf(e.original.resource.scheme) !== -1)) {
                    await g.closeEditor(e);
                }
            });
        }));
    }
    dispose() {
        this._assertNotDisposed();
        this._chatService.cancelCurrentRequestForSession(this.chatSessionId);
        dispose(this._entriesObs.get());
        super.dispose();
        this._state.set(3 /* ChatEditingSessionState.Disposed */, undefined);
        this._onDidDispose.fire();
        this._onDidDispose.dispose();
    }
    get isDisposed() {
        return this._state.get() === 3 /* ChatEditingSessionState.Disposed */;
    }
    startStreamingEdits(resource, responseModel, inUndoStop) {
        const completePromise = new DeferredPromise();
        const startPromise = new DeferredPromise();
        // Sequence all edits made this this resource in this streaming edits instance,
        // and also sequence the resource overall in the rare (currently invalid?) case
        // that edits are made in parallel to the same resource,
        const sequencer = new ThrottledSequencer(15, 1000);
        sequencer.queue(() => startPromise.p);
        this._streamingEditLocks.queue(resource.toString(), async () => {
            if (!this.isDisposed) {
                await this._acceptStreamingEditsStart(responseModel, inUndoStop, resource);
            }
            startPromise.complete();
            return completePromise.p;
        });
        let didComplete = false;
        return {
            pushText: (edits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, false, responseModel);
                    }
                });
            },
            pushNotebookCellText: (cell, edits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(cell, edits, false, responseModel);
                    }
                });
            },
            pushNotebook: edits => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, false, responseModel);
                    }
                });
            },
            complete: () => {
                if (didComplete) {
                    return;
                }
                didComplete = true;
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, [], true, responseModel);
                        await this._resolve(responseModel.requestId, inUndoStop, resource);
                        completePromise.complete();
                    }
                });
            },
        };
    }
    _getHistoryEntryByLinearIndex(index) {
        const history = this._linearHistory.get();
        const searchedIndex = binarySearch2(history.length, (e) => history[e].startIndex - index);
        const entry = history[searchedIndex < 0 ? (~searchedIndex) - 1 : searchedIndex];
        if (!entry || index - entry.startIndex >= entry.stops.length) {
            return undefined;
        }
        return {
            entry,
            stop: entry.stops[index - entry.startIndex]
        };
    }
    async undoInteraction() {
        const newIndex = this._linearHistoryIndex.get() - 1;
        const previousSnapshot = this._getHistoryEntryByLinearIndex(newIndex);
        if (!previousSnapshot) {
            return;
        }
        this._ensurePendingSnapshot();
        await asyncTransaction(async (tx) => {
            await this._restoreSnapshot(previousSnapshot.stop, tx);
            this._linearHistoryIndex.set(newIndex, tx);
        });
        this._updateRequestHiddenState();
    }
    async redoInteraction() {
        const maxIndex = getMaxHistoryIndex(this._linearHistory.get());
        const newIndex = this._linearHistoryIndex.get() + 1;
        if (newIndex > maxIndex) {
            return;
        }
        const nextSnapshot = newIndex === maxIndex ? this._pendingSnapshot : this._getHistoryEntryByLinearIndex(newIndex)?.stop;
        if (!nextSnapshot) {
            return;
        }
        await asyncTransaction(async (tx) => {
            await this._restoreSnapshot(nextSnapshot, tx);
            this._linearHistoryIndex.set(newIndex, tx);
        });
        this._updateRequestHiddenState();
    }
    _updateRequestHiddenState() {
        const history = this._linearHistory.get();
        const index = this._linearHistoryIndex.get();
        const undoRequests = [];
        for (const entry of history) {
            if (!entry.requestId) {
                // ignored
            }
            else if (entry.startIndex >= index) {
                undoRequests.push({ requestId: entry.requestId });
            }
            else if (entry.startIndex + entry.stops.length > index) {
                undoRequests.push({ requestId: entry.requestId, afterUndoStop: entry.stops[index - entry.startIndex].stopId });
            }
        }
        this._chatService.getSession(this.chatSessionId)?.setDisabledRequests(undoRequests);
    }
    async _acceptStreamingEditsStart(responseModel, undoStop, resource) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, this._getTelemetryInfoForModel(responseModel));
        transaction((tx) => {
            this._state.set(1 /* ChatEditingSessionState.StreamingEdits */, tx);
            entry.acceptStreamingEditsStart(responseModel, tx);
            this.ensureEditInUndoStopMatches(responseModel.requestId, undoStop, entry, false, tx);
        });
    }
    /**
     * Ensures the state of the file in the given snapshot matches the current
     * state of the {@param entry}. This is used to handle concurrent file edits.
     *
     * Given the case of two different edits, we will place and undo stop right
     * before we `textEditGroup` in the underlying markdown stream, but at the
     * time those are added the edits haven't been made yet, so both files will
     * simply have the unmodified state.
     *
     * This method is called after each edit, so after the first file finishes
     * being edits, it will update its content in the second undo snapshot such
     * that it can be undone successfully.
     *
     * We ensure that the same file is not concurrently edited via the
     * {@link _streamingEditLocks}, avoiding race conditions.
     *
     * @param next If true, this will edit the snapshot _after_ the undo stop
     */
    ensureEditInUndoStopMatches(requestId, undoStop, entry, next, tx) {
        const history = this._linearHistory.get();
        const snapIndex = history.findIndex(s => s.requestId === requestId);
        if (snapIndex === -1) {
            return;
        }
        const snap = history[snapIndex];
        let stopIndex = snap.stops.findIndex(s => s.stopId === undoStop);
        if (stopIndex === -1) {
            return;
        }
        // special case: put the last change in the pendingSnapshot as needed
        if (next) {
            if (stopIndex === snap.stops.length - 1) {
                const postEdit = new ResourceMap(snap.postEdit || this._createSnapshot(undefined, undefined).entries);
                if (!snap.postEdit || !entry.equalsSnapshot(postEdit.get(entry.modifiedURI))) {
                    postEdit.set(entry.modifiedURI, entry.createSnapshot(requestId, POST_EDIT_STOP_ID));
                    const newHistory = history.slice();
                    newHistory[snapIndex] = { ...snap, postEdit };
                    this._linearHistory.set(newHistory, tx);
                }
                return;
            }
            stopIndex++;
        }
        const stop = snap.stops[stopIndex];
        if (entry.equalsSnapshot(stop.entries.get(entry.modifiedURI))) {
            return;
        }
        const newMap = new ResourceMap(stop.entries);
        newMap.set(entry.modifiedURI, entry.createSnapshot(requestId, stop.stopId));
        const newStop = snap.stops.slice();
        newStop[stopIndex] = { ...stop, entries: newMap };
        const newHistory = history.slice();
        newHistory[snapIndex] = { ...snap, stops: newStop };
        this._linearHistory.set(newHistory, tx);
    }
    async _acceptEdits(resource, textEdits, isLastEdits, responseModel) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, this._getTelemetryInfoForModel(responseModel));
        await entry.acceptAgentEdits(resource, textEdits, isLastEdits, responseModel);
    }
    _getTelemetryInfoForModel(responseModel) {
        // Make these getters because the response result is not available when the file first starts to be edited
        return new class {
            get agentId() { return responseModel.agent?.id; }
            get command() { return responseModel.slashCommand?.name; }
            get sessionId() { return responseModel.session.sessionId; }
            get requestId() { return responseModel.requestId; }
            get result() { return responseModel.result; }
        };
    }
    async _resolve(requestId, undoStop, resource) {
        await asyncTransaction(async (tx) => {
            const hasOtherTasks = Iterable.some(this._streamingEditLocks.keys(), k => k !== resource.toString());
            if (!hasOtherTasks) {
                this._state.set(2 /* ChatEditingSessionState.Idle */, tx);
            }
            const entry = this._getEntry(resource);
            if (!entry) {
                return;
            }
            this.ensureEditInUndoStopMatches(requestId, undoStop, entry, /* next= */ true, tx);
            return entry.acceptStreamingEditsEnd(tx);
        });
        this._onDidChange.fire(1 /* ChatEditingSessionChangeType.Other */);
    }
    /**
     * Retrieves or creates a modified file entry.
     *
     * @returns The modified file entry.
     */
    async _getOrCreateModifiedFileEntry(resource, telemetryInfo) {
        resource = CellUri.parse(resource)?.notebook ?? resource;
        const existingEntry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, resource));
        if (existingEntry) {
            if (telemetryInfo.requestId !== existingEntry.telemetryInfo.requestId) {
                existingEntry.updateTelemetryInfo(telemetryInfo);
            }
            return existingEntry;
        }
        let entry;
        const existingExternalEntry = this._lookupExternalEntry(resource);
        if (existingExternalEntry) {
            entry = existingExternalEntry;
        }
        else {
            const initialContent = this._initialFileContents.get(resource);
            // This gets manually disposed in .dispose() or in .restoreSnapshot()
            entry = await this._createModifiedFileEntry(resource, telemetryInfo, false, initialContent);
            if (!initialContent) {
                this._initialFileContents.set(resource, entry.initialContent);
            }
        }
        // If an entry is deleted e.g. reverting a created file,
        // remove it from the entries and don't show it in the working set anymore
        // so that it can be recreated e.g. through retry
        const listener = entry.onDidDelete(() => {
            const newEntries = this._entriesObs.get().filter(e => !isEqual(e.modifiedURI, entry.modifiedURI));
            this._entriesObs.set(newEntries, undefined);
            this._workingSet.delete(entry.modifiedURI);
            this._editorService.closeEditors(this._editorService.findEditors(entry.modifiedURI));
            if (!existingExternalEntry) {
                // don't dispose entries that are not yours!
                entry.dispose();
            }
            this._store.delete(listener);
            this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
        });
        this._store.add(listener);
        const entriesArr = [...this._entriesObs.get(), entry];
        this._entriesObs.set(entriesArr, undefined);
        this._onDidChange.fire(0 /* ChatEditingSessionChangeType.WorkingSet */);
        return entry;
    }
    async _createModifiedFileEntry(resource, telemetryInfo, mustExist = false, initialContent) {
        const multiDiffEntryDelegate = { collapse: (transaction) => this._collapse(resource, transaction) };
        const chatKind = mustExist ? 0 /* ChatEditKind.Created */ : 1 /* ChatEditKind.Modified */;
        const notebookUri = CellUri.parse(resource)?.notebook || resource;
        try {
            // If a notebook isn't open, then use the old synchronization approach.
            if (this._notebookService.hasSupportedNotebooks(notebookUri) && (this._notebookService.getNotebookTextModel(notebookUri) || ChatEditingModifiedNotebookEntry.canHandleSnapshotContent(initialContent))) {
                return await ChatEditingModifiedNotebookEntry.create(notebookUri, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, this._instantiationService);
            }
            else {
                const ref = await this._textModelService.createModelReference(resource);
                return this._instantiationService.createInstance(ChatEditingModifiedDocumentEntry, ref, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent);
            }
        }
        catch (err) {
            if (mustExist) {
                throw err;
            }
            // this file does not exist yet, create it and try again
            await this._bulkEditService.apply({ edits: [{ newResource: resource }] });
            this._editorService.openEditor({ resource, options: { inactive: true, preserveFocus: true, pinned: true } });
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(resource, multiDiffEntryDelegate, telemetryInfo, 0 /* ChatEditKind.Created */, initialContent, this._instantiationService);
            }
            else {
                return this._createModifiedFileEntry(resource, telemetryInfo, true, initialContent);
            }
        }
    }
    _collapse(resource, transaction) {
        const multiDiffItem = this._editorPane?.findDocumentDiffItem(resource);
        if (multiDiffItem) {
            this._editorPane?.viewModel?.items.get().find((documentDiffItem) => isEqual(documentDiffItem.originalUri, multiDiffItem.originalUri) &&
                isEqual(documentDiffItem.modifiedUri, multiDiffItem.modifiedUri))
                ?.collapsed.set(true, transaction);
        }
    }
};
ChatEditingSession = __decorate([
    __param(3, IInstantiationService),
    __param(4, IModelService),
    __param(5, ILanguageService),
    __param(6, ITextModelService),
    __param(7, IBulkEditService),
    __param(8, IEditorGroupsService),
    __param(9, IEditorService),
    __param(10, IChatService),
    __param(11, INotebookService),
    __param(12, IEditorWorkerService),
    __param(13, IConfigurationService),
    __param(14, IAccessibilitySignalService)
], ChatEditingSession);
export { ChatEditingSession };
let ChatEditingSessionStorage = class ChatEditingSessionStorage {
    constructor(chatSessionId, _fileService, _environmentService, _logService, _workspaceContextService) {
        this.chatSessionId = chatSessionId;
        this._fileService = _fileService;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._workspaceContextService = _workspaceContextService;
    }
    _getStorageLocation() {
        const workspaceId = this._workspaceContextService.getWorkspace().id;
        return joinPath(this._environmentService.workspaceStorageHome, workspaceId, 'chatEditingSessions', this.chatSessionId);
    }
    async restoreState() {
        const storageLocation = this._getStorageLocation();
        const fileContents = new Map();
        const getFileContent = (hash) => {
            let readPromise = fileContents.get(hash);
            if (!readPromise) {
                readPromise = this._fileService.readFile(joinPath(storageLocation, STORAGE_CONTENTS_FOLDER, hash)).then(content => content.value.toString());
                fileContents.set(hash, readPromise);
            }
            return readPromise;
        };
        const deserializeResourceMap = (resourceMap, deserialize, result) => {
            resourceMap.forEach(([resourceURI, value]) => {
                result.set(URI.parse(resourceURI), deserialize(value));
            });
            return result;
        };
        const deserializeSnapshotEntriesDTO = async (dtoEntries) => {
            const entries = new ResourceMap();
            for (const entryDTO of dtoEntries) {
                const entry = await deserializeSnapshotEntry(entryDTO);
                entries.set(entry.resource, entry);
            }
            return entries;
        };
        const deserializeChatEditingStopDTO = async (stopDTO) => {
            const entries = await deserializeSnapshotEntriesDTO(stopDTO.entries);
            const workingSet = deserializeResourceMap(stopDTO.workingSet, (value) => value, new ResourceMap());
            return { stopId: 'stopId' in stopDTO ? stopDTO.stopId : undefined, workingSet, entries };
        };
        const normalizeSnapshotDtos = (snapshot) => {
            if ('stops' in snapshot) {
                return snapshot;
            }
            return { requestId: snapshot.requestId, stops: [{ stopId: undefined, entries: snapshot.entries, workingSet: snapshot.workingSet }], postEdit: undefined };
        };
        const deserializeChatEditingSessionSnapshot = async (startIndex, snapshot) => {
            const stops = await Promise.all(snapshot.stops.map(deserializeChatEditingStopDTO));
            return { startIndex, requestId: snapshot.requestId, stops, postEdit: snapshot.postEdit && await deserializeSnapshotEntriesDTO(snapshot.postEdit) };
        };
        const deserializeSnapshotEntry = async (entry) => {
            return {
                resource: URI.parse(entry.resource),
                languageId: entry.languageId,
                original: await getFileContent(entry.originalHash),
                current: await getFileContent(entry.currentHash),
                originalToCurrentEdit: OffsetEdit.fromJson(entry.originalToCurrentEdit),
                state: entry.state,
                snapshotUri: URI.parse(entry.snapshotUri),
                telemetryInfo: { requestId: entry.telemetryInfo.requestId, agentId: entry.telemetryInfo.agentId, command: entry.telemetryInfo.command, sessionId: this.chatSessionId, result: undefined }
            };
        };
        try {
            const stateFilePath = joinPath(storageLocation, STORAGE_STATE_FILE);
            if (!await this._fileService.exists(stateFilePath)) {
                this._logService.debug(`chatEditingSession: No editing session state found at ${stateFilePath.toString()}`);
                return undefined;
            }
            this._logService.debug(`chatEditingSession: Restoring editing session at ${stateFilePath.toString()}`);
            const stateFileContent = await this._fileService.readFile(stateFilePath);
            const data = JSON.parse(stateFileContent.value.toString());
            if (!COMPATIBLE_STORAGE_VERSIONS.includes(data.version)) {
                return undefined;
            }
            let linearHistoryIndex = 0;
            const linearHistory = await Promise.all(data.linearHistory.map(snapshot => {
                const norm = normalizeSnapshotDtos(snapshot);
                const result = deserializeChatEditingSessionSnapshot(linearHistoryIndex, norm);
                linearHistoryIndex += norm.stops.length;
                return result;
            }));
            const initialFileContents = new ResourceMap();
            for (const fileContentDTO of data.initialFileContents) {
                initialFileContents.set(URI.parse(fileContentDTO[0]), await getFileContent(fileContentDTO[1]));
            }
            const pendingSnapshot = data.pendingSnapshot ? await deserializeChatEditingStopDTO(data.pendingSnapshot) : undefined;
            const recentSnapshot = await deserializeChatEditingStopDTO(data.recentSnapshot);
            return {
                initialFileContents,
                pendingSnapshot,
                recentSnapshot,
                linearHistoryIndex: data.linearHistoryIndex,
                linearHistory
            };
        }
        catch (e) {
            this._logService.error(`Error restoring chat editing session from ${storageLocation.toString()}`, e);
        }
        return undefined;
    }
    async storeState(state) {
        const storageFolder = this._getStorageLocation();
        const contentsFolder = URI.joinPath(storageFolder, STORAGE_CONTENTS_FOLDER);
        // prepare the content folder
        const existingContents = new Set();
        try {
            const stat = await this._fileService.resolve(contentsFolder);
            stat.children?.forEach(child => {
                if (child.isFile) {
                    existingContents.add(child.name);
                }
            });
        }
        catch (e) {
            try {
                // does not exist, create
                await this._fileService.createFolder(contentsFolder);
            }
            catch (e) {
                this._logService.error(`Error creating chat editing session content folder ${contentsFolder.toString()}`, e);
                return;
            }
        }
        const fileContents = new Map();
        const addFileContent = (content) => {
            const shaComputer = new StringSHA1();
            shaComputer.update(content);
            const sha = shaComputer.digest().substring(0, 7);
            fileContents.set(sha, content);
            return sha;
        };
        const serializeResourceMap = (resourceMap, serialize) => {
            return Array.from(resourceMap.entries()).map(([resourceURI, value]) => [resourceURI.toString(), serialize(value)]);
        };
        const serializeChatEditingSessionStop = (stop) => {
            return {
                stopId: stop.stopId,
                workingSet: serializeResourceMap(stop.workingSet, value => value),
                entries: Array.from(stop.entries.values()).map(serializeSnapshotEntry)
            };
        };
        const serializeChatEditingSessionSnapshot = (snapshot) => {
            return {
                requestId: snapshot.requestId,
                stops: snapshot.stops.map(serializeChatEditingSessionStop),
                postEdit: snapshot.postEdit ? Array.from(snapshot.postEdit.values()).map(serializeSnapshotEntry) : undefined
            };
        };
        const serializeSnapshotEntry = (entry) => {
            return {
                resource: entry.resource.toString(),
                languageId: entry.languageId,
                originalHash: addFileContent(entry.original),
                currentHash: addFileContent(entry.current),
                originalToCurrentEdit: entry.originalToCurrentEdit.edits.map(edit => ({ pos: edit.replaceRange.start, len: edit.replaceRange.length, txt: edit.newText })),
                state: entry.state,
                snapshotUri: entry.snapshotUri.toString(),
                telemetryInfo: { requestId: entry.telemetryInfo.requestId, agentId: entry.telemetryInfo.agentId, command: entry.telemetryInfo.command }
            };
        };
        try {
            const data = {
                version: STORAGE_VERSION,
                sessionId: this.chatSessionId,
                linearHistory: state.linearHistory.map(serializeChatEditingSessionSnapshot),
                linearHistoryIndex: state.linearHistoryIndex,
                initialFileContents: serializeResourceMap(state.initialFileContents, value => addFileContent(value)),
                pendingSnapshot: state.pendingSnapshot ? serializeChatEditingSessionStop(state.pendingSnapshot) : undefined,
                recentSnapshot: serializeChatEditingSessionStop(state.recentSnapshot),
            };
            this._logService.debug(`chatEditingSession: Storing editing session at ${storageFolder.toString()}: ${fileContents.size} files`);
            for (const [hash, content] of fileContents) {
                if (!existingContents.has(hash)) {
                    await this._fileService.writeFile(joinPath(contentsFolder, hash), VSBuffer.fromString(content));
                }
            }
            await this._fileService.writeFile(joinPath(storageFolder, STORAGE_STATE_FILE), VSBuffer.fromString(JSON.stringify(data, undefined, 2)));
        }
        catch (e) {
            this._logService.debug(`Error storing chat editing session to ${storageFolder.toString()}`, e);
        }
    }
    async clearState() {
        const storageFolder = this._getStorageLocation();
        if (await this._fileService.exists(storageFolder)) {
            this._logService.debug(`chatEditingSession: Clearing editing session at ${storageFolder.toString()}`);
            try {
                await this._fileService.del(storageFolder, { recursive: true });
            }
            catch (e) {
                this._logService.debug(`Error clearing chat editing session from ${storageFolder.toString()}`, e);
            }
        }
    }
};
ChatEditingSessionStorage = __decorate([
    __param(1, IFileService),
    __param(2, IEnvironmentService),
    __param(3, ILogService),
    __param(4, IWorkspaceContextService)
], ChatEditingSessionStorage);
const COMPATIBLE_STORAGE_VERSIONS = [1, 2];
const STORAGE_VERSION = 2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXNzaW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9jaGF0RWRpdGluZ1Nlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxXQUFXLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBUyxTQUFTLEVBQUUsY0FBYyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQXNDLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNsTixPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxHQUFHLEVBQUUs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