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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ2hhdC9icm93c2VyL2lubGluZUNoYXRTZXNzaW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzlFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUF3QixNQUFNLGlEQUFpRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBa0MsTUFBTSxnREFBZ0QsQ0FBQztBQUMxSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVwRixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFvQzNGLE1BQU0sT0FBTyxpQkFBaUI7YUFFTCxhQUFRLEdBQTRCLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxFQUFFLFdBQVcsRUFBRSwrQkFBK0IsRUFBRSxDQUFDLEFBQTdHLENBQThHO0lBTzlJLFlBQTZCLFVBQXNCLEVBQUUsVUFBa0I7UUFBMUMsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUxsQyxpQkFBWSxHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDM0MsZ0JBQVcsR0FBZ0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFFcEQsbUJBQWMsR0FBYSxFQUFFLENBQUM7UUFHckMsSUFBSSxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDckgsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQTRDO1FBQ2pELE1BQU0sT0FBTyxHQUE0QixFQUFFLENBQUM7UUFDNUMsS0FBSyxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDcEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU87Z0JBQ25FLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDM0YsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUV6RyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBQ0QsTUFBTSxDQUFDLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxvQ0FBb0M7UUFDbEYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsSUFBSSxtQkFBbUI7UUFDdEIsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDcEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUixJQUFJLE1BQXlCLENBQUM7UUFDOUIsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNyRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDYixNQUFNLEdBQUcsS0FBSyxDQUFDO2dCQUNoQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN6QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE1BQU8sQ0FBQztJQUNoQixDQUFDOztBQUdGLE1BQU0sT0FBTyxPQUFPO0lBUW5CLFlBQ1UsUUFBaUI7SUFDMUI7O09BRUc7SUFDTSxTQUFjO0lBQ3ZCOztPQUVHO0lBQ00sVUFBc0I7SUFDL0I7O09BRUc7SUFDTSxVQUFzQixFQUN0QixLQUFpQixFQUNqQixVQUE2QixFQUM3QixRQUFrQixFQUNsQixTQUFvQixFQUM3QixpQkFBc0M7UUFqQjdCLGFBQVEsR0FBUixRQUFRLENBQVM7UUFJakIsY0FBUyxHQUFULFNBQVMsQ0FBSztRQUlkLGVBQVUsR0FBVixVQUFVLENBQVk7UUFJdEIsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUN0QixVQUFLLEdBQUwsS0FBSyxDQUFZO1FBQ2pCLGVBQVUsR0FBVixVQUFVLENBQW1CO1FBQzdCLGFBQVEsR0FBUixRQUFRLENBQVU7UUFDbEIsY0FBUyxHQUFULFNBQVMsQ0FBVztRQXZCdEIsaUJBQVksR0FBWSxLQUFLLENBQUM7UUFDckIsZUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFHeEIsc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUF1QjlELElBQUksQ0FBQyxRQUFRLEdBQUc7WUFDZixTQUFTLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7WUFDdkQsU0FBUyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFO1lBQ3hDLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRTtZQUN0QyxLQUFLLEVBQUUsQ0FBQztZQUNSLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLE1BQU0sRUFBRSxFQUFFO1lBQ1YsS0FBSyxFQUFFLEVBQUU7WUFDVCxTQUFTLEVBQUUsQ0FBQztZQUNaLGFBQWEsRUFBRSxDQUFDO1lBQ2hCLGNBQWMsRUFBRSxDQUFDO1lBQ2pCLGFBQWEsRUFBRSxFQUFFO1NBQ2pCLENBQUM7UUFDRixJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDckQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDMUIsQ0FBQztJQUVELGFBQWE7UUFDWixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVUsSUFBSSxDQUFDLENBQUM7UUFDOUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7SUFDMUIsQ0FBQztJQUVELGdCQUFnQixDQUFDLE9BQTBCO1FBQzFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRUQsSUFBSSxpQkFBaUI7UUFDcEIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBaUI7UUFFdkMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQy9ELElBQUksZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDcEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDO1FBQzdDLElBQUksQ0FBQztZQUNKLE9BQU8sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDbEcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlCLENBQUM7UUFDRixDQUFDO2dCQUFTLENBQUM7WUFDVixJQUFJLENBQUMsUUFBUSxDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQztRQUMvQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQW9DO1FBQ2pELElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUNqQyxJQUFJLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQy9CLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7WUFDOUIsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDakUsT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRUQsMEJBQTBCLENBQUMsU0FBa0I7UUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLFNBQVMsQ0FBQztJQUMxQyxDQUFDO0lBRUQsZUFBZTtRQUVkLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQzVDLFFBQVEsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3pCO29CQUNDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQztvQkFDakMsTUFBTTtnQkFDUDtvQkFDQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUM7b0JBQ2xDLE1BQU07WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDakQsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3RCLENBQUM7Q0FDRDtBQUdNLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFNMUIsWUFDQyxNQUFtQixFQUNuQixPQUFnQixFQUNDLGdCQUF1QyxFQUNwQyxpQkFBcUMsRUFDYixlQUEwQyxFQUN4RCxXQUF3QjtRQUhyQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXVCO1FBRVosb0JBQWUsR0FBZixlQUFlLENBQTJCO1FBQ3hELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBRXRELElBQUksQ0FBQyxxQkFBcUIsR0FBRyxtQ0FBbUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUUzRixvR0FBb0c7UUFDcEcsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUM7UUFDeEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUUsTUFBTSxDQUFDLHVCQUF1QixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUNySyxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztZQUMxQixJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM3QyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ25DLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRCxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3pCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDN0IsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5RSxNQUFNLENBQUMsUUFBUSxDQUFDLHVCQUF1QixHQUFHLEtBQUssQ0FBQztRQUNoRCxJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNELENBQUE7QUFoRFksY0FBYztJQVV4QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEseUJBQXlCLENBQUE7SUFDekIsV0FBQSxXQUFXLENBQUE7R0FaRCxjQUFjLENBZ0QxQjs7QUFFRCxNQUFNO0FBRU4sU0FBUyxnQkFBZ0IsQ0FBQyxTQUFvQixFQUFFLEtBQWlCO0lBQ2hFLE9BQU8sU0FBUyxDQUFDLE9BQU87UUFDdkIsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDO1FBQzdGLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUMsRUFBRSxTQUFTLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzNHLENBQUM7QUFFTSxJQUFNLFFBQVEsR0FBZCxNQUFNLFFBQVE7O2FBRUksd0JBQW1CLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDO1FBQzdFLFdBQVcsRUFBRSxnQ0FBZ0M7UUFDN0MsVUFBVSw2REFBcUQ7S0FDL0QsQ0FBQyxBQUh5QyxDQUd4QzthQUVxQixvQkFBZSxHQUFHLENBQUMsQUFBSixDQUFLO0lBTTVDLFlBQ3VCLG9CQUEyRCxFQUNoRSxXQUF1QixFQUN2QixXQUF1QjtRQUZELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDaEUsZ0JBQVcsR0FBWCxXQUFXLENBQVk7UUFDdkIsZ0JBQVcsR0FBWCxXQUFXLENBQVk7UUFQeEIsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFDL0IsVUFBSyxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFDO1FBQ2pELG1CQUFjLEdBQVksS0FBSyxDQUFDO1FBUXZDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNsRCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUMxQixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3hCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzdDLEtBQUssTUFBTSxFQUFFLHFCQUFxQixFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO29CQUM3RCxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNwRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUM3QyxLQUFLLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztvQkFDN0QscUJBQXFCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDcEUsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRUQsSUFBSSx1QkFBdUIsQ0FBQyxLQUFjO1FBQ3pDLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzdCLENBQUM7SUFFRCxJQUFJLHVCQUF1QjtRQUMxQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDNUIsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUFnQztRQUV0RCxpRUFBaUU7UUFDakUsc0JBQXNCO1FBR3RCLE1BQU0sVUFBVSxHQUFvQixFQUFFLENBQUM7UUFFdkMsTUFBTSxPQUFPLEdBQVksRUFBRSxDQUFDO1FBRTVCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBRXpDLElBQUksS0FBSyxDQUFDLEtBQUssOEJBQXNCLEVBQUUsQ0FBQztnQkFDdkMsdURBQXVEO2dCQUN2RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM3RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuRixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuRixJQUFJLE1BQU0sSUFBSSxNQUFNLEVBQUUsQ0FBQzt3QkFDdEIsVUFBVSxDQUFDLElBQUksQ0FBQzs0QkFDZixNQUFNLEVBQUUsTUFBTTs0QkFDZCxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssNkJBQXFCO3lCQUNwRCxDQUFDLENBQUM7b0JBQ0osQ0FBQztnQkFDRixDQUFDO1lBRUYsQ0FBQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxLQUFLLCtCQUF1QixFQUFFLENBQUM7Z0JBQy9DLDJEQUEyRDtnQkFDM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztvQkFDN0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEYsSUFBSSxLQUFLLEVBQUUsQ0FBQzt3QkFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUNyQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM5RSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sS0FBSyxHQUFxQyxFQUFFLENBQUM7UUFFbkQsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFcEMsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1lBRTFCLElBQUksaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1lBRTFCLEtBQUssTUFBTSxLQUFLLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ2xGLGdGQUFnRjtvQkFDaEYsa0ZBQWtGO29CQUNsRixvRkFBb0Y7b0JBQ3BGLHNCQUFzQjtvQkFDdEIsaUJBQWlCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzFFLGlCQUFpQixJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUUzRSxDQUFDO3FCQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3hFLG1FQUFtRTtvQkFDbkUsNkVBQTZFO29CQUM3RSw2REFBNkQ7b0JBQzdELEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDckIsYUFBYSxHQUFHLElBQUksQ0FBQztvQkFDckIsTUFBTTtnQkFFUCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AseUNBQXlDO29CQUN6QyxNQUFNO2dCQUNQLENBQUM7WUFDRixDQUFDO1lBRUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbkIseUJBQXlCO2dCQUN6QixTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUM7WUFDdkQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdkQsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7WUFDM0IsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQzdDLGdGQUFnRjtvQkFDaEYsc0JBQXNCO29CQUN0QixrQkFBa0IsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNyRSxDQUFDO1lBQ0YsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxrQkFBa0IsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDOUYsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLENBQUM7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBa0MsRUFBRSxJQUEyQjtRQUU5RSxJQUFJLEtBQUssTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsb0JBQW9CLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFbE4sSUFBSSxhQUFhLEdBQStCLEVBQUUsQ0FBQztRQUVuRCxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxvQ0FBb0M7WUFDcEMsYUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDM0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLHNCQUFzQixJQUFJLFVBQVEsQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDbEgsYUFBYSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSx3QkFBd0IsQ0FDckUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUM3QyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQzdDLENBQUMsVUFBVSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FDckUsQ0FBQztnQkFDSCxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDaEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEgsU0FBUyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1FBRWpDLElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFFOUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFFOUMsMkJBQTJCO2dCQUMzQixLQUFLLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztvQkFDcEYscUJBQXFCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDckUscUJBQXFCLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDdEUsQ0FBQztnQkFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUVuQixzQkFBc0I7Z0JBQ3RCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7b0JBRTFCLE1BQU0scUJBQXFCLEdBQWEsRUFBRSxDQUFDO29CQUMzQyxNQUFNLHFCQUFxQixHQUFhLEVBQUUsQ0FBQztvQkFFM0MscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztvQkFDckkscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztvQkFFckksS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7d0JBQ25DLHFCQUFxQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsVUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQzt3QkFDeEcscUJBQXFCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxVQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO29CQUN6RyxDQUFDO29CQUVELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTt3QkFDcEIsU0FBUzt3QkFDVCxxQkFBcUI7d0JBQ3JCLHFCQUFxQjt3QkFDckIsS0FBSywyQkFBbUI7cUJBQ3hCLENBQUMsQ0FBQztnQkFDSixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDUCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFJLE9BQU87UUFDVixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLDhCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzdHLENBQUM7SUFFTyxhQUFhLENBQUMsSUFBcUI7UUFDMUMsTUFBTSxLQUFLLEdBQTJCLEVBQUUsQ0FBQztRQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWpDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25FLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsVUFBVTtRQUNULE1BQU0sS0FBSyxHQUE2QixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUNuQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsOEJBQXNCLEVBQUUsQ0FBQztnQkFDM0MsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDdEMsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLFNBQVMsR0FBNEIsRUFBRSxDQUFDO1FBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3RFLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDM0IsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxPQUFPO1FBRU4sTUFBTSxNQUFNLEdBQXNCLEVBQUUsQ0FBQztRQUVyQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2pELE1BQU0sSUFBSSxHQUFvQjtnQkFDN0IsUUFBUSxFQUFFLEdBQUcsRUFBRTtvQkFDZCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7Z0JBQ25CLENBQUM7Z0JBQ0QsV0FBVyxFQUFFLEdBQUcsRUFBRTtvQkFDakIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDOUIsQ0FBQztnQkFDRCxVQUFVLEVBQUUsR0FBRyxFQUFFO29CQUNoQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUM3RixlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3hCLE9BQU8sTUFBTSxDQUFDO2dCQUNmLENBQUM7Z0JBQ0QsVUFBVSxFQUFFLEdBQUcsRUFBRTtvQkFDaEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDN0YsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN4QixPQUFPLE1BQU0sQ0FBQztnQkFDZixDQUFDO2dCQUNELGNBQWMsRUFBRSxHQUFHLEVBQUU7b0JBQ3BCLHlHQUF5RztvQkFDekcsOEVBQThFO29CQUM5RSxJQUFJLElBQUksQ0FBQyxLQUFLLDhCQUFzQixFQUFFLENBQUM7d0JBQ3RDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3ZDLElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDN0QsSUFBSSxDQUFDLEtBQUssNkJBQXFCLENBQUM7d0JBQ2hDLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQzt3QkFDN0IsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsYUFBYSxFQUFFLEdBQUcsRUFBRTtvQkFDbkIseUdBQXlHO29CQUN6RyxvRUFBb0U7b0JBQ3BFLElBQUksSUFBSSxDQUFDLEtBQUssOEJBQXNCLEVBQUUsQ0FBQzt3QkFDdEMsTUFBTSxLQUFLLEdBQTJCLEVBQUUsQ0FBQzt3QkFDekMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUNsQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ2xDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7NEJBQ3pDLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDakMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ25FLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQzt3QkFDakUsQ0FBQzt3QkFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzdELElBQUksQ0FBQyxLQUFLLDZCQUFxQixDQUFDO29CQUNqQyxDQUFDO2dCQUNGLENBQUM7YUFDRCxDQUFDO1lBQ0YsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDOztBQWhUVyxRQUFRO0lBY2xCLFdBQUEsb0JBQW9CLENBQUE7R0FkVixRQUFRLENBaVRwQjs7QUFFRCxNQUFNLE9BQU87SUFDWixZQUNVLFFBQW1CLEVBQ25CLFFBQW1CLEVBQ25CLE9BQXVCO1FBRnZCLGFBQVEsR0FBUixRQUFRLENBQVc7UUFDbkIsYUFBUSxHQUFSLFFBQVEsQ0FBVztRQUNuQixZQUFPLEdBQVAsT0FBTyxDQUFnQjtJQUM3QixDQUFDO0NBQ0w7QUFTRCxNQUFNLENBQU4sSUFBa0IsU0FJakI7QUFKRCxXQUFrQixTQUFTO0lBQzFCLCtDQUFXLENBQUE7SUFDWCxpREFBWSxDQUFBO0lBQ1osaURBQVksQ0FBQTtBQUNiLENBQUMsRUFKaUIsU0FBUyxLQUFULFNBQVMsUUFJMUIifQ==