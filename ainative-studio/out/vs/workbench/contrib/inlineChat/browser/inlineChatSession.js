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
var HunkData_1;
import { Emitter, Event } from '../../../../base/common/event.js';
import { CTX_INLINE_CHAT_HAS_STASHED_SESSION } from '../common/inlineChat.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { DetailedLineRangeMapping } from '../../../../editor/common/diff/rangeMapping.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { coalesceInPlace } from '../../../../base/common/arrays.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
export class SessionWholeRange {
    static { this._options = ModelDecorationOptions.register({ description: 'inlineChat/session/wholeRange' }); }
    constructor(_textModel, wholeRange) {
        this._textModel = _textModel;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._decorationIds = [];
        this._decorationIds = _textModel.deltaDecorations([], [{ range: wholeRange, options: SessionWholeRange._options }]);
    }
    dispose() {
        this._onDidChange.dispose();
        if (!this._textModel.isDisposed()) {
            this._textModel.deltaDecorations(this._decorationIds, []);
        }
    }
    fixup(changes) {
        const newDeco = [];
        for (const { modified } of changes) {
            const modifiedRange = this._textModel.validateRange(modified.isEmpty
                ? new Range(modified.startLineNumber, 1, modified.startLineNumber, Number.MAX_SAFE_INTEGER)
                : new Range(modified.startLineNumber, 1, modified.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER));
            newDeco.push({ range: modifiedRange, options: SessionWholeRange._options });
        }
        const [first, ...rest] = this._decorationIds; // first is the original whole range
        const newIds = this._textModel.deltaDecorations(rest, newDeco);
        this._decorationIds = [first].concat(newIds);
        this._onDidChange.fire(this);
    }
    get trackedInitialRange() {
        const [first] = this._decorationIds;
        return this._textModel.getDecorationRange(first) ?? new Range(1, 1, 1, 1);
    }
    get value() {
        let result;
        for (const id of this._decorationIds) {
            const range = this._textModel.getDecorationRange(id);
            if (range) {
                if (!result) {
                    result = range;
                }
                else {
                    result = Range.plusRange(result, range);
                }
            }
        }
        return result;
    }
}
export class Session {
    constructor(headless, 
    /**
     * The URI of the document which is being EditorEdit
     */
    targetUri, 
    /**
     * A copy of the document at the time the session was started
     */
    textModel0, 
    /**
     * The model of the editor
     */
    textModelN, agent, wholeRange, hunkData, chatModel, versionsByRequest) {
        this.headless = headless;
        this.targetUri = targetUri;
        this.textModel0 = textModel0;
        this.textModelN = textModelN;
        this.agent = agent;
        this.wholeRange = wholeRange;
        this.hunkData = hunkData;
        this.chatModel = chatModel;
        this._isUnstashed = false;
        this._startTime = new Date();
        this._versionByRequest = new Map();
        this._teldata = {
            extension: ExtensionIdentifier.toKey(agent.extensionId),
            startTime: this._startTime.toISOString(),
            endTime: this._startTime.toISOString(),
            edits: 0,
            finishedByEdit: false,
            rounds: '',
            undos: '',
            unstashed: 0,
            acceptedHunks: 0,
            discardedHunks: 0,
            responseTypes: ''
        };
        if (versionsByRequest) {
            this._versionByRequest = new Map(versionsByRequest);
        }
    }
    get isUnstashed() {
        return this._isUnstashed;
    }
    markUnstashed() {
        this._teldata.unstashed += 1;
        this._isUnstashed = true;
    }
    markModelVersion(request) {
        this._versionByRequest.set(request.id, this.textModelN.getAlternativeVersionId());
    }
    get versionsByRequest() {
        return Array.from(this._versionByRequest);
    }
    async undoChangesUntil(requestId) {
        const targetAltVersion = this._versionByRequest.get(requestId);
        if (targetAltVersion === undefined) {
            return false;
        }
        // undo till this point
        this.hunkData.ignoreTextModelNChanges = true;
        try {
            while (targetAltVersion < this.textModelN.getAlternativeVersionId() && this.textModelN.canUndo()) {
                await this.textModelN.undo();
            }
        }
        finally {
            this.hunkData.ignoreTextModelNChanges = false;
        }
        return true;
    }
    get hasChangedText() {
        return !this.textModel0.equalsTextBuffer(this.textModelN.getTextBuffer());
    }
    asChangedText(changes) {
        if (changes.length === 0) {
            return undefined;
        }
        let startLine = Number.MAX_VALUE;
        let endLine = Number.MIN_VALUE;
        for (const change of changes) {
            startLine = Math.min(startLine, change.modified.startLineNumber);
            endLine = Math.max(endLine, change.modified.endLineNumberExclusive);
        }
        return this.textModelN.getValueInRange(new Range(startLine, 1, endLine, Number.MAX_VALUE));
    }
    recordExternalEditOccurred(didFinish) {
        this._teldata.edits += 1;
        this._teldata.finishedByEdit = didFinish;
    }
    asTelemetryData() {
        for (const item of this.hunkData.getInfo()) {
            switch (item.getState()) {
                case 1 /* HunkState.Accepted */:
                    this._teldata.acceptedHunks += 1;
                    break;
                case 2 /* HunkState.Rejected */:
                    this._teldata.discardedHunks += 1;
                    break;
            }
        }
        this._teldata.endTime = new Date().toISOString();
        return this._teldata;
    }
}
let StashedSession = class StashedSession {
    constructor(editor, session, _undoCancelEdits, contextKeyService, _sessionService, _logService) {
        this._undoCancelEdits = _undoCancelEdits;
        this._sessionService = _sessionService;
        this._logService = _logService;
        this._ctxHasStashedSession = CTX_INLINE_CHAT_HAS_STASHED_SESSION.bindTo(contextKeyService);
        // keep session for a little bit, only release when user continues to work (type, move cursor, etc.)
        this._session = session;
        this._ctxHasStashedSession.set(true);
        this._listener = Event.once(Event.any(editor.onDidChangeCursorSelection, editor.onDidChangeModelContent, editor.onDidChangeModel, editor.onDidBlurEditorWidget))(() => {
            this._session = undefined;
            this._sessionService.releaseSession(session);
            this._ctxHasStashedSession.reset();
        });
    }
    dispose() {
        this._listener.dispose();
        this._ctxHasStashedSession.reset();
        if (this._session) {
            this._sessionService.releaseSession(this._session);
        }
    }
    unstash() {
        if (!this._session) {
            return undefined;
        }
        this._listener.dispose();
        const result = this._session;
        result.markUnstashed();
        result.hunkData.ignoreTextModelNChanges = true;
        result.textModelN.pushEditOperations(null, this._undoCancelEdits, () => null);
        result.hunkData.ignoreTextModelNChanges = false;
        this._session = undefined;
        this._logService.debug('[IE] Unstashed session');
        return result;
    }
};
StashedSession = __decorate([
    __param(3, IContextKeyService),
    __param(4, IInlineChatSessionService),
    __param(5, ILogService)
], StashedSession);
export { StashedSession };
// ---
function lineRangeAsRange(lineRange, model) {
    return lineRange.isEmpty
        ? new Range(lineRange.startLineNumber, 1, lineRange.startLineNumber, Number.MAX_SAFE_INTEGER)
        : new Range(lineRange.startLineNumber, 1, lineRange.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER);
}
let HunkData = class HunkData {
    static { HunkData_1 = this; }
    static { this._HUNK_TRACKED_RANGE = ModelDecorationOptions.register({
        description: 'inline-chat-hunk-tracked-range',
        stickiness: 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */
    }); }
    static { this._HUNK_THRESHOLD = 8; }
    constructor(_editorWorkerService, _textModel0, _textModelN) {
        this._editorWorkerService = _editorWorkerService;
        this._textModel0 = _textModel0;
        this._textModelN = _textModelN;
        this._store = new DisposableStore();
        this._data = new Map();
        this._ignoreChanges = false;
        this._store.add(_textModelN.onDidChangeContent(e => {
            if (!this._ignoreChanges) {
                this._mirrorChanges(e);
            }
        }));
    }
    dispose() {
        if (!this._textModelN.isDisposed()) {
            this._textModelN.changeDecorations(accessor => {
                for (const { textModelNDecorations } of this._data.values()) {
                    textModelNDecorations.forEach(accessor.removeDecoration, accessor);
                }
            });
        }
        if (!this._textModel0.isDisposed()) {
            this._textModel0.changeDecorations(accessor => {
                for (const { textModel0Decorations } of this._data.values()) {
                    textModel0Decorations.forEach(accessor.removeDecoration, accessor);
                }
            });
        }
        this._data.clear();
        this._store.dispose();
    }
    set ignoreTextModelNChanges(value) {
        this._ignoreChanges = value;
    }
    get ignoreTextModelNChanges() {
        return this._ignoreChanges;
    }
    _mirrorChanges(event) {
        // mirror textModelN changes to textModel0 execept for those that
        // overlap with a hunk
        const hunkRanges = [];
        const ranges0 = [];
        for (const entry of this._data.values()) {
            if (entry.state === 0 /* HunkState.Pending */) {
                // pending means the hunk's changes aren't "sync'd" yet
                for (let i = 1; i < entry.textModelNDecorations.length; i++) {
                    const rangeN = this._textModelN.getDecorationRange(entry.textModelNDecorations[i]);
                    const range0 = this._textModel0.getDecorationRange(entry.textModel0Decorations[i]);
                    if (rangeN && range0) {
                        hunkRanges.push({
                            rangeN, range0,
                            markAccepted: () => entry.state = 1 /* HunkState.Accepted */
                        });
                    }
                }
            }
            else if (entry.state === 1 /* HunkState.Accepted */) {
                // accepted means the hunk's changes are also in textModel0
                for (let i = 1; i < entry.textModel0Decorations.length; i++) {
                    const range = this._textModel0.getDecorationRange(entry.textModel0Decorations[i]);
                    if (range) {
                        ranges0.push(range);
                    }
                }
            }
        }
        hunkRanges.sort((a, b) => Range.compareRangesUsingStarts(a.rangeN, b.rangeN));
        ranges0.sort(Range.compareRangesUsingStarts);
        const edits = [];
        for (const change of event.changes) {
            let isOverlapping = false;
            let pendingChangesLen = 0;
            for (const entry of hunkRanges) {
                if (entry.rangeN.getEndPosition().isBefore(Range.getStartPosition(change.range))) {
                    // pending hunk _before_ this change. When projecting into textModel0 we need to
                    // subtract that. Because diffing is relaxed it might include changes that are not
                    // actual insertions/deletions. Therefore we need to take the length of the original
                    // range into account.
                    pendingChangesLen += this._textModelN.getValueLengthInRange(entry.rangeN);
                    pendingChangesLen -= this._textModel0.getValueLengthInRange(entry.range0);
                }
                else if (Range.areIntersectingOrTouching(entry.rangeN, change.range)) {
                    // an edit overlaps with a (pending) hunk. We take this as a signal
                    // to mark the hunk as accepted and to ignore the edit. The range of the hunk
                    // will be up-to-date because of decorations created for them
                    entry.markAccepted();
                    isOverlapping = true;
                    break;
                }
                else {
                    // hunks past this change aren't relevant
                    break;
                }
            }
            if (isOverlapping) {
                // hunk overlaps, it grew
                continue;
            }
            const offset0 = change.rangeOffset - pendingChangesLen;
            const start0 = this._textModel0.getPositionAt(offset0);
            let acceptedChangesLen = 0;
            for (const range of ranges0) {
                if (range.getEndPosition().isBefore(start0)) {
                    // accepted hunk _before_ this projected change. When projecting into textModel0
                    // we need to add that
                    acceptedChangesLen += this._textModel0.getValueLengthInRange(range);
                }
            }
            const start = this._textModel0.getPositionAt(offset0 + acceptedChangesLen);
            const end = this._textModel0.getPositionAt(offset0 + acceptedChangesLen + change.rangeLength);
            edits.push(EditOperation.replace(Range.fromPositions(start, end), change.text));
        }
        this._textModel0.pushEditOperations(null, edits, () => null);
    }
    async recompute(editState, diff) {
        diff ??= await this._editorWorkerService.computeDiff(this._textModel0.uri, this._textModelN.uri, { ignoreTrimWhitespace: false, maxComputationTimeMs: Number.MAX_SAFE_INTEGER, computeMoves: false }, 'advanced');
        let mergedChanges = [];
        if (diff && diff.changes.length > 0) {
            // merge changes neighboring changes
            mergedChanges = [diff.changes[0]];
            for (let i = 1; i < diff.changes.length; i++) {
                const lastChange = mergedChanges[mergedChanges.length - 1];
                const thisChange = diff.changes[i];
                if (thisChange.modified.startLineNumber - lastChange.modified.endLineNumberExclusive <= HunkData_1._HUNK_THRESHOLD) {
                    mergedChanges[mergedChanges.length - 1] = new DetailedLineRangeMapping(lastChange.original.join(thisChange.original), lastChange.modified.join(thisChange.modified), (lastChange.innerChanges ?? []).concat(thisChange.innerChanges ?? []));
                }
                else {
                    mergedChanges.push(thisChange);
                }
            }
        }
        const hunks = mergedChanges.map(change => new RawHunk(change.original, change.modified, change.innerChanges ?? []));
        editState.applied = hunks.length;
        this._textModelN.changeDecorations(accessorN => {
            this._textModel0.changeDecorations(accessor0 => {
                // clean up old decorations
                for (const { textModelNDecorations, textModel0Decorations } of this._data.values()) {
                    textModelNDecorations.forEach(accessorN.removeDecoration, accessorN);
                    textModel0Decorations.forEach(accessor0.removeDecoration, accessor0);
                }
                this._data.clear();
                // add new decorations
                for (const hunk of hunks) {
                    const textModelNDecorations = [];
                    const textModel0Decorations = [];
                    textModelNDecorations.push(accessorN.addDecoration(lineRangeAsRange(hunk.modified, this._textModelN), HunkData_1._HUNK_TRACKED_RANGE));
                    textModel0Decorations.push(accessor0.addDecoration(lineRangeAsRange(hunk.original, this._textModel0), HunkData_1._HUNK_TRACKED_RANGE));
                    for (const change of hunk.changes) {
                        textModelNDecorations.push(accessorN.addDecoration(change.modifiedRange, HunkData_1._HUNK_TRACKED_RANGE));
                        textModel0Decorations.push(accessor0.addDecoration(change.originalRange, HunkData_1._HUNK_TRACKED_RANGE));
                    }
                    this._data.set(hunk, {
                        editState,
                        textModelNDecorations,
                        textModel0Decorations,
                        state: 0 /* HunkState.Pending */
                    });
                }
            });
        });
    }
    get size() {
        return this._data.size;
    }
    get pending() {
        return Iterable.reduce(this._data.values(), (r, { state }) => r + (state === 0 /* HunkState.Pending */ ? 1 : 0), 0);
    }
    _discardEdits(item) {
        const edits = [];
        const rangesN = item.getRangesN();
        const ranges0 = item.getRanges0();
        for (let i = 1; i < rangesN.length; i++) {
            const modifiedRange = rangesN[i];
            const originalValue = this._textModel0.getValueInRange(ranges0[i]);
            edits.push(EditOperation.replace(modifiedRange, originalValue));
        }
        return edits;
    }
    discardAll() {
        const edits = [];
        for (const item of this.getInfo()) {
            if (item.getState() === 0 /* HunkState.Pending */) {
                edits.push(this._discardEdits(item));
            }
        }
        const undoEdits = [];
        this._textModelN.pushEditOperations(null, edits.flat(), (_undoEdits) => {
            undoEdits.push(_undoEdits);
            return null;
        });
        return undoEdits.flat();
    }
    getInfo() {
        const result = [];
        for (const [hunk, data] of this._data.entries()) {
            const item = {
                getState: () => {
                    return data.state;
                },
                isInsertion: () => {
                    return hunk.original.isEmpty;
                },
                getRangesN: () => {
                    const ranges = data.textModelNDecorations.map(id => this._textModelN.getDecorationRange(id));
                    coalesceInPlace(ranges);
                    return ranges;
                },
                getRanges0: () => {
                    const ranges = data.textModel0Decorations.map(id => this._textModel0.getDecorationRange(id));
                    coalesceInPlace(ranges);
                    return ranges;
                },
                discardChanges: () => {
                    // DISCARD: replace modified range with original value. The modified range is retrieved from a decoration
                    // which was created above so that typing in the editor keeps discard working.
                    if (data.state === 0 /* HunkState.Pending */) {
                        const edits = this._discardEdits(item);
                        this._textModelN.pushEditOperations(null, edits, () => null);
                        data.state = 2 /* HunkState.Rejected */;
                        if (data.editState.applied > 0) {
                            data.editState.applied -= 1;
                        }
                    }
                },
                acceptChanges: () => {
                    // ACCEPT: replace original range with modified value. The modified value is retrieved from the model via
                    // its decoration and the original range is retrieved from the hunk.
                    if (data.state === 0 /* HunkState.Pending */) {
                        const edits = [];
                        const rangesN = item.getRangesN();
                        const ranges0 = item.getRanges0();
                        for (let i = 1; i < ranges0.length; i++) {
                            const originalRange = ranges0[i];
                            const modifiedValue = this._textModelN.getValueInRange(rangesN[i]);
                            edits.push(EditOperation.replace(originalRange, modifiedValue));
                        }
                        this._textModel0.pushEditOperations(null, edits, () => null);
                        data.state = 1 /* HunkState.Accepted */;
                    }
                }
            };
            result.push(item);
        }
        return result;
    }
};
HunkData = HunkData_1 = __decorate([
    __param(0, IEditorWorkerService)
], HunkData);
export { HunkData };
class RawHunk {
    constructor(original, modified, changes) {
        this.original = original;
        this.modified = modified;
        this.changes = changes;
    }
}
export var HunkState;
(function (HunkState) {
    HunkState[HunkState["Pending"] = 0] = "Pending";
    HunkState[HunkState["Accepted"] = 1] = "Accepted";
    HunkState[HunkState["Rejected"] = 2] = "Rejected";
})(HunkState || (HunkState = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvYnJvd3Nlci9pbmxpbmVDaGF0U2Vzc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBd0IsTUFBTSxpREFBaUQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQWtDLE1BQU0sZ0RBQWdELENBQUM7QUFDMUgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUvRCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFFcEYsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBb0MzRixNQUFNLE9BQU8saUJBQWlC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