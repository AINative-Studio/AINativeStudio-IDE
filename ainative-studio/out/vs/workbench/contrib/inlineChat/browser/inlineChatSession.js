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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFNlc3Npb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdFNlc3Npb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFbEUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQXdCLE1BQU0saURBQWlELENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFrQyxNQUFNLGdEQUFnRCxDQUFDO0FBQzFILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRTFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFL0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBRXBGLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQW9DM0YsTUFBTSxPQUFPLGlCQUFpQjthQUVM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