/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedError } from '../../../base/common/errors.js';
import * as strings from '../../../base/common/strings.js';
import { CursorCollection } from './cursorCollection.js';
import { CursorState, EditOperationResult } from '../cursorCommon.js';
import { CursorContext } from './cursorContext.js';
import { DeleteOperations } from './cursorDeleteOperations.js';
import { CompositionOutcome, TypeOperations } from './cursorTypeOperations.js';
import { BaseTypeWithAutoClosingCommand } from './cursorTypeEditOperations.js';
import { Range } from '../core/range.js';
import { Selection } from '../core/selection.js';
import { ModelInjectedTextChangedEvent } from '../textModelEvents.js';
import { ViewCursorStateChangedEvent, ViewRevealRangeRequestEvent } from '../viewEvents.js';
import { dispose, Disposable } from '../../../base/common/lifecycle.js';
import { CursorStateChangedEvent } from '../viewModelEventDispatcher.js';
export class CursorsController extends Disposable {
    constructor(model, viewModel, coordinatesConverter, cursorConfig) {
        super();
        this._model = model;
        this._knownModelVersionId = this._model.getVersionId();
        this._viewModel = viewModel;
        this._coordinatesConverter = coordinatesConverter;
        this.context = new CursorContext(this._model, this._viewModel, this._coordinatesConverter, cursorConfig);
        this._cursors = new CursorCollection(this.context);
        this._hasFocus = false;
        this._isHandling = false;
        this._compositionState = null;
        this._columnSelectData = null;
        this._autoClosedActions = [];
        this._prevEditOperationType = 0 /* EditOperationType.Other */;
    }
    dispose() {
        this._cursors.dispose();
        this._autoClosedActions = dispose(this._autoClosedActions);
        super.dispose();
    }
    updateConfiguration(cursorConfig) {
        this.context = new CursorContext(this._model, this._viewModel, this._coordinatesConverter, cursorConfig);
        this._cursors.updateContext(this.context);
    }
    onLineMappingChanged(eventsCollector) {
        if (this._knownModelVersionId !== this._model.getVersionId()) {
            // There are model change events that I didn't yet receive.
            //
            // This can happen when editing the model, and the view model receives the change events first,
            // and the view model emits line mapping changed events, all before the cursor gets a chance to
            // recover from markers.
            //
            // The model change listener above will be called soon and we'll ensure a valid cursor state there.
            return;
        }
        // Ensure valid state
        this.setStates(eventsCollector, 'viewModel', 0 /* CursorChangeReason.NotSet */, this.getCursorStates());
    }
    setHasFocus(hasFocus) {
        this._hasFocus = hasFocus;
    }
    _validateAutoClosedActions() {
        if (this._autoClosedActions.length > 0) {
            const selections = this._cursors.getSelections();
            for (let i = 0; i < this._autoClosedActions.length; i++) {
                const autoClosedAction = this._autoClosedActions[i];
                if (!autoClosedAction.isValid(selections)) {
                    autoClosedAction.dispose();
                    this._autoClosedActions.splice(i, 1);
                    i--;
                }
            }
        }
    }
    // ------ some getters/setters
    getPrimaryCursorState() {
        return this._cursors.getPrimaryCursor();
    }
    getLastAddedCursorIndex() {
        return this._cursors.getLastAddedCursorIndex();
    }
    getCursorStates() {
        return this._cursors.getAll();
    }
    setStates(eventsCollector, source, reason, states) {
        let reachedMaxCursorCount = false;
        const multiCursorLimit = this.context.cursorConfig.multiCursorLimit;
        if (states !== null && states.length > multiCursorLimit) {
            states = states.slice(0, multiCursorLimit);
            reachedMaxCursorCount = true;
        }
        const oldState = CursorModelState.from(this._model, this);
        this._cursors.setStates(states);
        this._cursors.normalize();
        this._columnSelectData = null;
        this._validateAutoClosedActions();
        return this._emitStateChangedIfNecessary(eventsCollector, source, reason, oldState, reachedMaxCursorCount);
    }
    setCursorColumnSelectData(columnSelectData) {
        this._columnSelectData = columnSelectData;
    }
    revealAll(eventsCollector, source, minimalReveal, verticalType, revealHorizontal, scrollType) {
        const viewPositions = this._cursors.getViewPositions();
        let revealViewRange = null;
        let revealViewSelections = null;
        if (viewPositions.length > 1) {
            revealViewSelections = this._cursors.getViewSelections();
        }
        else {
            revealViewRange = Range.fromPositions(viewPositions[0], viewPositions[0]);
        }
        eventsCollector.emitViewEvent(new ViewRevealRangeRequestEvent(source, minimalReveal, revealViewRange, revealViewSelections, verticalType, revealHorizontal, scrollType));
    }
    revealPrimary(eventsCollector, source, minimalReveal, verticalType, revealHorizontal, scrollType) {
        const primaryCursor = this._cursors.getPrimaryCursor();
        const revealViewSelections = [primaryCursor.viewState.selection];
        eventsCollector.emitViewEvent(new ViewRevealRangeRequestEvent(source, minimalReveal, null, revealViewSelections, verticalType, revealHorizontal, scrollType));
    }
    saveState() {
        const result = [];
        const selections = this._cursors.getSelections();
        for (let i = 0, len = selections.length; i < len; i++) {
            const selection = selections[i];
            result.push({
                inSelectionMode: !selection.isEmpty(),
                selectionStart: {
                    lineNumber: selection.selectionStartLineNumber,
                    column: selection.selectionStartColumn,
                },
                position: {
                    lineNumber: selection.positionLineNumber,
                    column: selection.positionColumn,
                }
            });
        }
        return result;
    }
    restoreState(eventsCollector, states) {
        const desiredSelections = [];
        for (let i = 0, len = states.length; i < len; i++) {
            const state = states[i];
            let positionLineNumber = 1;
            let positionColumn = 1;
            // Avoid missing properties on the literal
            if (state.position && state.position.lineNumber) {
                positionLineNumber = state.position.lineNumber;
            }
            if (state.position && state.position.column) {
                positionColumn = state.position.column;
            }
            let selectionStartLineNumber = positionLineNumber;
            let selectionStartColumn = positionColumn;
            // Avoid missing properties on the literal
            if (state.selectionStart && state.selectionStart.lineNumber) {
                selectionStartLineNumber = state.selectionStart.lineNumber;
            }
            if (state.selectionStart && state.selectionStart.column) {
                selectionStartColumn = state.selectionStart.column;
            }
            desiredSelections.push({
                selectionStartLineNumber: selectionStartLineNumber,
                selectionStartColumn: selectionStartColumn,
                positionLineNumber: positionLineNumber,
                positionColumn: positionColumn
            });
        }
        this.setStates(eventsCollector, 'restoreState', 0 /* CursorChangeReason.NotSet */, CursorState.fromModelSelections(desiredSelections));
        this.revealAll(eventsCollector, 'restoreState', false, 0 /* VerticalRevealType.Simple */, true, 1 /* editorCommon.ScrollType.Immediate */);
    }
    onModelContentChanged(eventsCollector, event) {
        if (event instanceof ModelInjectedTextChangedEvent) {
            // If injected texts change, the view positions of all cursors need to be updated.
            if (this._isHandling) {
                // The view positions will be updated when handling finishes
                return;
            }
            // setStates might remove markers, which could trigger a decoration change.
            // If there are injected text decorations for that line, `onModelContentChanged` is emitted again
            // and an endless recursion happens.
            // _isHandling prevents that.
            this._isHandling = true;
            try {
                this.setStates(eventsCollector, 'modelChange', 0 /* CursorChangeReason.NotSet */, this.getCursorStates());
            }
            finally {
                this._isHandling = false;
            }
        }
        else {
            const e = event.rawContentChangedEvent;
            this._knownModelVersionId = e.versionId;
            if (this._isHandling) {
                return;
            }
            const hadFlushEvent = e.containsEvent(1 /* RawContentChangedType.Flush */);
            this._prevEditOperationType = 0 /* EditOperationType.Other */;
            if (hadFlushEvent) {
                // a model.setValue() was called
                this._cursors.dispose();
                this._cursors = new CursorCollection(this.context);
                this._validateAutoClosedActions();
                this._emitStateChangedIfNecessary(eventsCollector, 'model', 1 /* CursorChangeReason.ContentFlush */, null, false);
            }
            else {
                if (this._hasFocus && e.resultingSelection && e.resultingSelection.length > 0) {
                    const cursorState = CursorState.fromModelSelections(e.resultingSelection);
                    if (this.setStates(eventsCollector, 'modelChange', e.isUndoing ? 5 /* CursorChangeReason.Undo */ : e.isRedoing ? 6 /* CursorChangeReason.Redo */ : 2 /* CursorChangeReason.RecoverFromMarkers */, cursorState)) {
                        this.revealAll(eventsCollector, 'modelChange', false, 0 /* VerticalRevealType.Simple */, true, 0 /* editorCommon.ScrollType.Smooth */);
                    }
                }
                else {
                    const selectionsFromMarkers = this._cursors.readSelectionFromMarkers();
                    this.setStates(eventsCollector, 'modelChange', 2 /* CursorChangeReason.RecoverFromMarkers */, CursorState.fromModelSelections(selectionsFromMarkers));
                }
            }
        }
    }
    getSelection() {
        return this._cursors.getPrimaryCursor().modelState.selection;
    }
    getTopMostViewPosition() {
        return this._cursors.getTopMostViewPosition();
    }
    getBottomMostViewPosition() {
        return this._cursors.getBottomMostViewPosition();
    }
    getCursorColumnSelectData() {
        if (this._columnSelectData) {
            return this._columnSelectData;
        }
        const primaryCursor = this._cursors.getPrimaryCursor();
        const viewSelectionStart = primaryCursor.viewState.selectionStart.getStartPosition();
        const viewPosition = primaryCursor.viewState.position;
        return {
            isReal: false,
            fromViewLineNumber: viewSelectionStart.lineNumber,
            fromViewVisualColumn: this.context.cursorConfig.visibleColumnFromColumn(this._viewModel, viewSelectionStart),
            toViewLineNumber: viewPosition.lineNumber,
            toViewVisualColumn: this.context.cursorConfig.visibleColumnFromColumn(this._viewModel, viewPosition),
        };
    }
    getSelections() {
        return this._cursors.getSelections();
    }
    getPosition() {
        return this._cursors.getPrimaryCursor().modelState.position;
    }
    setSelections(eventsCollector, source, selections, reason) {
        this.setStates(eventsCollector, source, reason, CursorState.fromModelSelections(selections));
    }
    getPrevEditOperationType() {
        return this._prevEditOperationType;
    }
    setPrevEditOperationType(type) {
        this._prevEditOperationType = type;
    }
    // ------ auxiliary handling logic
    _pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges) {
        const autoClosedCharactersDeltaDecorations = [];
        const autoClosedEnclosingDeltaDecorations = [];
        for (let i = 0, len = autoClosedCharactersRanges.length; i < len; i++) {
            autoClosedCharactersDeltaDecorations.push({
                range: autoClosedCharactersRanges[i],
                options: {
                    description: 'auto-closed-character',
                    inlineClassName: 'auto-closed-character',
                    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
                }
            });
            autoClosedEnclosingDeltaDecorations.push({
                range: autoClosedEnclosingRanges[i],
                options: {
                    description: 'auto-closed-enclosing',
                    stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
                }
            });
        }
        const autoClosedCharactersDecorations = this._model.deltaDecorations([], autoClosedCharactersDeltaDecorations);
        const autoClosedEnclosingDecorations = this._model.deltaDecorations([], autoClosedEnclosingDeltaDecorations);
        this._autoClosedActions.push(new AutoClosedAction(this._model, autoClosedCharactersDecorations, autoClosedEnclosingDecorations));
    }
    _executeEditOperation(opResult) {
        if (!opResult) {
            // Nothing to execute
            return;
        }
        if (opResult.shouldPushStackElementBefore) {
            this._model.pushStackElement();
        }
        const result = CommandExecutor.executeCommands(this._model, this._cursors.getSelections(), opResult.commands);
        if (result) {
            // The commands were applied correctly
            this._interpretCommandResult(result);
            // Check for auto-closing closed characters
            const autoClosedCharactersRanges = [];
            const autoClosedEnclosingRanges = [];
            for (let i = 0; i < opResult.commands.length; i++) {
                const command = opResult.commands[i];
                if (command instanceof BaseTypeWithAutoClosingCommand && command.enclosingRange && command.closeCharacterRange) {
                    autoClosedCharactersRanges.push(command.closeCharacterRange);
                    autoClosedEnclosingRanges.push(command.enclosingRange);
                }
            }
            if (autoClosedCharactersRanges.length > 0) {
                this._pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges);
            }
            this._prevEditOperationType = opResult.type;
        }
        if (opResult.shouldPushStackElementAfter) {
            this._model.pushStackElement();
        }
    }
    _interpretCommandResult(cursorState) {
        if (!cursorState || cursorState.length === 0) {
            cursorState = this._cursors.readSelectionFromMarkers();
        }
        this._columnSelectData = null;
        this._cursors.setSelections(cursorState);
        this._cursors.normalize();
    }
    // -----------------------------------------------------------------------------------------------------------
    // ----- emitting events
    _emitStateChangedIfNecessary(eventsCollector, source, reason, oldState, reachedMaxCursorCount) {
        const newState = CursorModelState.from(this._model, this);
        if (newState.equals(oldState)) {
            return false;
        }
        const selections = this._cursors.getSelections();
        const viewSelections = this._cursors.getViewSelections();
        // Let the view get the event first.
        eventsCollector.emitViewEvent(new ViewCursorStateChangedEvent(viewSelections, selections, reason));
        // Only after the view has been notified, let the rest of the world know...
        if (!oldState
            || oldState.cursorState.length !== newState.cursorState.length
            || newState.cursorState.some((newCursorState, i) => !newCursorState.modelState.equals(oldState.cursorState[i].modelState))) {
            const oldSelections = oldState ? oldState.cursorState.map(s => s.modelState.selection) : null;
            const oldModelVersionId = oldState ? oldState.modelVersionId : 0;
            eventsCollector.emitOutgoingEvent(new CursorStateChangedEvent(oldSelections, selections, oldModelVersionId, newState.modelVersionId, source || 'keyboard', reason, reachedMaxCursorCount));
        }
        return true;
    }
    // -----------------------------------------------------------------------------------------------------------
    // ----- handlers beyond this point
    _findAutoClosingPairs(edits) {
        if (!edits.length) {
            return null;
        }
        const indices = [];
        for (let i = 0, len = edits.length; i < len; i++) {
            const edit = edits[i];
            if (!edit.text || edit.text.indexOf('\n') >= 0) {
                return null;
            }
            const m = edit.text.match(/([)\]}>'"`])([^)\]}>'"`]*)$/);
            if (!m) {
                return null;
            }
            const closeChar = m[1];
            const autoClosingPairsCandidates = this.context.cursorConfig.autoClosingPairs.autoClosingPairsCloseSingleChar.get(closeChar);
            if (!autoClosingPairsCandidates || autoClosingPairsCandidates.length !== 1) {
                return null;
            }
            const openChar = autoClosingPairsCandidates[0].open;
            const closeCharIndex = edit.text.length - m[2].length - 1;
            const openCharIndex = edit.text.lastIndexOf(openChar, closeCharIndex - 1);
            if (openCharIndex === -1) {
                return null;
            }
            indices.push([openCharIndex, closeCharIndex]);
        }
        return indices;
    }
    executeEdits(eventsCollector, source, edits, cursorStateComputer) {
        let autoClosingIndices = null;
        if (source === 'snippet') {
            autoClosingIndices = this._findAutoClosingPairs(edits);
        }
        if (autoClosingIndices) {
            edits[0]._isTracked = true;
        }
        const autoClosedCharactersRanges = [];
        const autoClosedEnclosingRanges = [];
        const selections = this._model.pushEditOperations(this.getSelections(), edits, (undoEdits) => {
            if (autoClosingIndices) {
                for (let i = 0, len = autoClosingIndices.length; i < len; i++) {
                    const [openCharInnerIndex, closeCharInnerIndex] = autoClosingIndices[i];
                    const undoEdit = undoEdits[i];
                    const lineNumber = undoEdit.range.startLineNumber;
                    const openCharIndex = undoEdit.range.startColumn - 1 + openCharInnerIndex;
                    const closeCharIndex = undoEdit.range.startColumn - 1 + closeCharInnerIndex;
                    autoClosedCharactersRanges.push(new Range(lineNumber, closeCharIndex + 1, lineNumber, closeCharIndex + 2));
                    autoClosedEnclosingRanges.push(new Range(lineNumber, openCharIndex + 1, lineNumber, closeCharIndex + 2));
                }
            }
            const selections = cursorStateComputer(undoEdits);
            if (selections) {
                // Don't recover the selection from markers because
                // we know what it should be.
                this._isHandling = true;
            }
            return selections;
        });
        if (selections) {
            this._isHandling = false;
            this.setSelections(eventsCollector, source, selections, 0 /* CursorChangeReason.NotSet */);
        }
        if (autoClosedCharactersRanges.length > 0) {
            this._pushAutoClosedAction(autoClosedCharactersRanges, autoClosedEnclosingRanges);
        }
    }
    _executeEdit(callback, eventsCollector, source, cursorChangeReason = 0 /* CursorChangeReason.NotSet */) {
        if (this.context.cursorConfig.readOnly) {
            // we cannot edit when read only...
            return;
        }
        const oldState = CursorModelState.from(this._model, this);
        this._cursors.stopTrackingSelections();
        this._isHandling = true;
        try {
            this._cursors.ensureValidState();
            callback();
        }
        catch (err) {
            onUnexpectedError(err);
        }
        this._isHandling = false;
        this._cursors.startTrackingSelections();
        this._validateAutoClosedActions();
        if (this._emitStateChangedIfNecessary(eventsCollector, source, cursorChangeReason, oldState, false)) {
            this.revealAll(eventsCollector, source, false, 0 /* VerticalRevealType.Simple */, true, 0 /* editorCommon.ScrollType.Smooth */);
        }
    }
    getAutoClosedCharacters() {
        return AutoClosedAction.getAllAutoClosedCharacters(this._autoClosedActions);
    }
    startComposition(eventsCollector) {
        this._compositionState = new CompositionState(this._model, this.getSelections());
    }
    endComposition(eventsCollector, source) {
        const compositionOutcome = this._compositionState ? this._compositionState.deduceOutcome(this._model, this.getSelections()) : null;
        this._compositionState = null;
        this._executeEdit(() => {
            if (source === 'keyboard') {
                // composition finishes, let's check if we need to auto complete if necessary.
                this._executeEditOperation(TypeOperations.compositionEndWithInterceptors(this._prevEditOperationType, this.context.cursorConfig, this._model, compositionOutcome, this.getSelections(), this.getAutoClosedCharacters()));
            }
        }, eventsCollector, source);
    }
    type(eventsCollector, text, source) {
        this._executeEdit(() => {
            if (source === 'keyboard') {
                // If this event is coming straight from the keyboard, look for electric characters and enter
                const len = text.length;
                let offset = 0;
                while (offset < len) {
                    const charLength = strings.nextCharLength(text, offset);
                    const chr = text.substr(offset, charLength);
                    // Here we must interpret each typed character individually
                    this._executeEditOperation(TypeOperations.typeWithInterceptors(!!this._compositionState, this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), this.getAutoClosedCharacters(), chr));
                    offset += charLength;
                }
            }
            else {
                this._executeEditOperation(TypeOperations.typeWithoutInterceptors(this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), text));
            }
        }, eventsCollector, source);
    }
    compositionType(eventsCollector, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source) {
        if (text.length === 0 && replacePrevCharCnt === 0 && replaceNextCharCnt === 0) {
            // this edit is a no-op
            if (positionDelta !== 0) {
                // but it still wants to move the cursor
                const newSelections = this.getSelections().map(selection => {
                    const position = selection.getPosition();
                    return new Selection(position.lineNumber, position.column + positionDelta, position.lineNumber, position.column + positionDelta);
                });
                this.setSelections(eventsCollector, source, newSelections, 0 /* CursorChangeReason.NotSet */);
            }
            return;
        }
        this._executeEdit(() => {
            this._executeEditOperation(TypeOperations.compositionType(this._prevEditOperationType, this.context.cursorConfig, this._model, this.getSelections(), text, replacePrevCharCnt, replaceNextCharCnt, positionDelta));
        }, eventsCollector, source);
    }
    paste(eventsCollector, text, pasteOnNewLine, multicursorText, source) {
        this._executeEdit(() => {
            this._executeEditOperation(TypeOperations.paste(this.context.cursorConfig, this._model, this.getSelections(), text, pasteOnNewLine, multicursorText || []));
        }, eventsCollector, source, 4 /* CursorChangeReason.Paste */);
    }
    cut(eventsCollector, source) {
        this._executeEdit(() => {
            this._executeEditOperation(DeleteOperations.cut(this.context.cursorConfig, this._model, this.getSelections()));
        }, eventsCollector, source);
    }
    executeCommand(eventsCollector, command, source) {
        this._executeEdit(() => {
            this._cursors.killSecondaryCursors();
            this._executeEditOperation(new EditOperationResult(0 /* EditOperationType.Other */, [command], {
                shouldPushStackElementBefore: false,
                shouldPushStackElementAfter: false
            }));
        }, eventsCollector, source);
    }
    executeCommands(eventsCollector, commands, source) {
        this._executeEdit(() => {
            this._executeEditOperation(new EditOperationResult(0 /* EditOperationType.Other */, commands, {
                shouldPushStackElementBefore: false,
                shouldPushStackElementAfter: false
            }));
        }, eventsCollector, source);
    }
}
/**
 * A snapshot of the cursor and the model state
 */
class CursorModelState {
    static from(model, cursor) {
        return new CursorModelState(model.getVersionId(), cursor.getCursorStates());
    }
    constructor(modelVersionId, cursorState) {
        this.modelVersionId = modelVersionId;
        this.cursorState = cursorState;
    }
    equals(other) {
        if (!other) {
            return false;
        }
        if (this.modelVersionId !== other.modelVersionId) {
            return false;
        }
        if (this.cursorState.length !== other.cursorState.length) {
            return false;
        }
        for (let i = 0, len = this.cursorState.length; i < len; i++) {
            if (!this.cursorState[i].equals(other.cursorState[i])) {
                return false;
            }
        }
        return true;
    }
}
class AutoClosedAction {
    static getAllAutoClosedCharacters(autoClosedActions) {
        let autoClosedCharacters = [];
        for (const autoClosedAction of autoClosedActions) {
            autoClosedCharacters = autoClosedCharacters.concat(autoClosedAction.getAutoClosedCharactersRanges());
        }
        return autoClosedCharacters;
    }
    constructor(model, autoClosedCharactersDecorations, autoClosedEnclosingDecorations) {
        this._model = model;
        this._autoClosedCharactersDecorations = autoClosedCharactersDecorations;
        this._autoClosedEnclosingDecorations = autoClosedEnclosingDecorations;
    }
    dispose() {
        this._autoClosedCharactersDecorations = this._model.deltaDecorations(this._autoClosedCharactersDecorations, []);
        this._autoClosedEnclosingDecorations = this._model.deltaDecorations(this._autoClosedEnclosingDecorations, []);
    }
    getAutoClosedCharactersRanges() {
        const result = [];
        for (let i = 0; i < this._autoClosedCharactersDecorations.length; i++) {
            const decorationRange = this._model.getDecorationRange(this._autoClosedCharactersDecorations[i]);
            if (decorationRange) {
                result.push(decorationRange);
            }
        }
        return result;
    }
    isValid(selections) {
        const enclosingRanges = [];
        for (let i = 0; i < this._autoClosedEnclosingDecorations.length; i++) {
            const decorationRange = this._model.getDecorationRange(this._autoClosedEnclosingDecorations[i]);
            if (decorationRange) {
                enclosingRanges.push(decorationRange);
                if (decorationRange.startLineNumber !== decorationRange.endLineNumber) {
                    // Stop tracking if the range becomes multiline...
                    return false;
                }
            }
        }
        enclosingRanges.sort(Range.compareRangesUsingStarts);
        selections.sort(Range.compareRangesUsingStarts);
        for (let i = 0; i < selections.length; i++) {
            if (i >= enclosingRanges.length) {
                return false;
            }
            if (!enclosingRanges[i].strictContainsRange(selections[i])) {
                return false;
            }
        }
        return true;
    }
}
export class CommandExecutor {
    static executeCommands(model, selectionsBefore, commands) {
        const ctx = {
            model: model,
            selectionsBefore: selectionsBefore,
            trackedRanges: [],
            trackedRangesDirection: []
        };
        const result = this._innerExecuteCommands(ctx, commands);
        for (let i = 0, len = ctx.trackedRanges.length; i < len; i++) {
            ctx.model._setTrackedRange(ctx.trackedRanges[i], null, 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */);
        }
        return result;
    }
    static _innerExecuteCommands(ctx, commands) {
        if (this._arrayIsEmpty(commands)) {
            return null;
        }
        const commandsData = this._getEditOperations(ctx, commands);
        if (commandsData.operations.length === 0) {
            return null;
        }
        const rawOperations = commandsData.operations;
        const loserCursorsMap = this._getLoserCursorMap(rawOperations);
        if (loserCursorsMap.hasOwnProperty('0')) {
            // These commands are very messed up
            console.warn('Ignoring commands');
            return null;
        }
        // Remove operations belonging to losing cursors
        const filteredOperations = [];
        for (let i = 0, len = rawOperations.length; i < len; i++) {
            if (!loserCursorsMap.hasOwnProperty(rawOperations[i].identifier.major.toString())) {
                filteredOperations.push(rawOperations[i]);
            }
        }
        // TODO@Alex: find a better way to do this.
        // give the hint that edit operations are tracked to the model
        if (commandsData.hadTrackedEditOperation && filteredOperations.length > 0) {
            filteredOperations[0]._isTracked = true;
        }
        let selectionsAfter = ctx.model.pushEditOperations(ctx.selectionsBefore, filteredOperations, (inverseEditOperations) => {
            const groupedInverseEditOperations = [];
            for (let i = 0; i < ctx.selectionsBefore.length; i++) {
                groupedInverseEditOperations[i] = [];
            }
            for (const op of inverseEditOperations) {
                if (!op.identifier) {
                    // perhaps auto whitespace trim edits
                    continue;
                }
                groupedInverseEditOperations[op.identifier.major].push(op);
            }
            const minorBasedSorter = (a, b) => {
                return a.identifier.minor - b.identifier.minor;
            };
            const cursorSelections = [];
            for (let i = 0; i < ctx.selectionsBefore.length; i++) {
                if (groupedInverseEditOperations[i].length > 0) {
                    groupedInverseEditOperations[i].sort(minorBasedSorter);
                    cursorSelections[i] = commands[i].computeCursorState(ctx.model, {
                        getInverseEditOperations: () => {
                            return groupedInverseEditOperations[i];
                        },
                        getTrackedSelection: (id) => {
                            const idx = parseInt(id, 10);
                            const range = ctx.model._getTrackedRange(ctx.trackedRanges[idx]);
                            if (ctx.trackedRangesDirection[idx] === 0 /* SelectionDirection.LTR */) {
                                return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
                            }
                            return new Selection(range.endLineNumber, range.endColumn, range.startLineNumber, range.startColumn);
                        }
                    });
                }
                else {
                    cursorSelections[i] = ctx.selectionsBefore[i];
                }
            }
            return cursorSelections;
        });
        if (!selectionsAfter) {
            selectionsAfter = ctx.selectionsBefore;
        }
        // Extract losing cursors
        const losingCursors = [];
        for (const losingCursorIndex in loserCursorsMap) {
            if (loserCursorsMap.hasOwnProperty(losingCursorIndex)) {
                losingCursors.push(parseInt(losingCursorIndex, 10));
            }
        }
        // Sort losing cursors descending
        losingCursors.sort((a, b) => {
            return b - a;
        });
        // Remove losing cursors
        for (const losingCursor of losingCursors) {
            selectionsAfter.splice(losingCursor, 1);
        }
        return selectionsAfter;
    }
    static _arrayIsEmpty(commands) {
        for (let i = 0, len = commands.length; i < len; i++) {
            if (commands[i]) {
                return false;
            }
        }
        return true;
    }
    static _getEditOperations(ctx, commands) {
        let operations = [];
        let hadTrackedEditOperation = false;
        for (let i = 0, len = commands.length; i < len; i++) {
            const command = commands[i];
            if (command) {
                const r = this._getEditOperationsFromCommand(ctx, i, command);
                operations = operations.concat(r.operations);
                hadTrackedEditOperation = hadTrackedEditOperation || r.hadTrackedEditOperation;
            }
        }
        return {
            operations: operations,
            hadTrackedEditOperation: hadTrackedEditOperation
        };
    }
    static _getEditOperationsFromCommand(ctx, majorIdentifier, command) {
        // This method acts as a transaction, if the command fails
        // everything it has done is ignored
        const operations = [];
        let operationMinor = 0;
        const addEditOperation = (range, text, forceMoveMarkers = false) => {
            if (Range.isEmpty(range) && text === '') {
                // This command wants to add a no-op => no thank you
                return;
            }
            operations.push({
                identifier: {
                    major: majorIdentifier,
                    minor: operationMinor++
                },
                range: range,
                text: text,
                forceMoveMarkers: forceMoveMarkers,
                isAutoWhitespaceEdit: command.insertsAutoWhitespace
            });
        };
        let hadTrackedEditOperation = false;
        const addTrackedEditOperation = (selection, text, forceMoveMarkers) => {
            hadTrackedEditOperation = true;
            addEditOperation(selection, text, forceMoveMarkers);
        };
        const trackSelection = (_selection, trackPreviousOnEmpty) => {
            const selection = Selection.liftSelection(_selection);
            let stickiness;
            if (selection.isEmpty()) {
                if (typeof trackPreviousOnEmpty === 'boolean') {
                    if (trackPreviousOnEmpty) {
                        stickiness = 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
                    }
                    else {
                        stickiness = 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */;
                    }
                }
                else {
                    // Try to lock it with surrounding text
                    const maxLineColumn = ctx.model.getLineMaxColumn(selection.startLineNumber);
                    if (selection.startColumn === maxLineColumn) {
                        stickiness = 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
                    }
                    else {
                        stickiness = 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */;
                    }
                }
            }
            else {
                stickiness = 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
            }
            const l = ctx.trackedRanges.length;
            const id = ctx.model._setTrackedRange(null, selection, stickiness);
            ctx.trackedRanges[l] = id;
            ctx.trackedRangesDirection[l] = selection.getDirection();
            return l.toString();
        };
        const editOperationBuilder = {
            addEditOperation: addEditOperation,
            addTrackedEditOperation: addTrackedEditOperation,
            trackSelection: trackSelection
        };
        try {
            command.getEditOperations(ctx.model, editOperationBuilder);
        }
        catch (e) {
            // TODO@Alex use notification service if this should be user facing
            // e.friendlyMessage = nls.localize('corrupt.commands', "Unexpected exception while executing command.");
            onUnexpectedError(e);
            return {
                operations: [],
                hadTrackedEditOperation: false
            };
        }
        return {
            operations: operations,
            hadTrackedEditOperation: hadTrackedEditOperation
        };
    }
    static _getLoserCursorMap(operations) {
        // This is destructive on the array
        operations = operations.slice(0);
        // Sort operations with last one first
        operations.sort((a, b) => {
            // Note the minus!
            return -(Range.compareRangesUsingEnds(a.range, b.range));
        });
        // Operations can not overlap!
        const loserCursorsMap = {};
        for (let i = 1; i < operations.length; i++) {
            const previousOp = operations[i - 1];
            const currentOp = operations[i];
            if (Range.getStartPosition(previousOp.range).isBefore(Range.getEndPosition(currentOp.range))) {
                let loserMajor;
                if (previousOp.identifier.major > currentOp.identifier.major) {
                    // previousOp loses the battle
                    loserMajor = previousOp.identifier.major;
                }
                else {
                    loserMajor = currentOp.identifier.major;
                }
                loserCursorsMap[loserMajor.toString()] = true;
                for (let j = 0; j < operations.length; j++) {
                    if (operations[j].identifier.major === loserMajor) {
                        operations.splice(j, 1);
                        if (j < i) {
                            i--;
                        }
                        j--;
                    }
                }
                if (i > 0) {
                    i--;
                }
            }
        }
        return loserCursorsMap;
    }
}
class CompositionLineState {
    constructor(text, lineNumber, startSelectionOffset, endSelectionOffset) {
        this.text = text;
        this.lineNumber = lineNumber;
        this.startSelectionOffset = startSelectionOffset;
        this.endSelectionOffset = endSelectionOffset;
    }
}
class CompositionState {
    static _capture(textModel, selections) {
        const result = [];
        for (const selection of selections) {
            if (selection.startLineNumber !== selection.endLineNumber) {
                return null;
            }
            const lineNumber = selection.startLineNumber;
            result.push(new CompositionLineState(textModel.getLineContent(lineNumber), lineNumber, selection.startColumn - 1, selection.endColumn - 1));
        }
        return result;
    }
    constructor(textModel, selections) {
        this._original = CompositionState._capture(textModel, selections);
    }
    /**
     * Returns the inserted text during this composition.
     * If the composition resulted in existing text being changed (i.e. not a pure insertion) it returns null.
     */
    deduceOutcome(textModel, selections) {
        if (!this._original) {
            return null;
        }
        const current = CompositionState._capture(textModel, selections);
        if (!current) {
            return null;
        }
        if (this._original.length !== current.length) {
            return null;
        }
        const result = [];
        for (let i = 0, len = this._original.length; i < len; i++) {
            result.push(CompositionState._deduceOutcome(this._original[i], current[i]));
        }
        return result;
    }
    static _deduceOutcome(original, current) {
        const commonPrefix = Math.min(original.startSelectionOffset, current.startSelectionOffset, strings.commonPrefixLength(original.text, current.text));
        const commonSuffix = Math.min(original.text.length - original.endSelectionOffset, current.text.length - current.endSelectionOffset, strings.commonSuffixLength(original.text, current.text));
        const deletedText = original.text.substring(commonPrefix, original.text.length - commonSuffix);
        const insertedTextStartOffset = commonPrefix;
        const insertedTextEndOffset = current.text.length - commonSuffix;
        const insertedText = current.text.substring(insertedTextStartOffset, insertedTextEndOffset);
        const insertedTextRange = new Range(current.lineNumber, insertedTextStartOffset + 1, current.lineNumber, insertedTextEndOffset + 1);
        return new CompositionOutcome(deletedText, original.startSelectionOffset - commonPrefix, original.endSelectionOffset - commonPrefix, insertedText, current.startSelectionOffset - commonPrefix, current.endSelectionOffset - commonPrefix, insertedTextRange);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jdXJzb3IvY3Vyc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDekQsT0FBTyxFQUF1QixXQUFXLEVBQUUsbUJBQW1CLEVBQWdGLE1BQU0sb0JBQW9CLENBQUM7QUFDekssT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRS9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRSxPQUFPLEVBQUUsS0FBSyxFQUFVLE1BQU0sa0JBQWtCLENBQUM7QUFDakQsT0FBTyxFQUFjLFNBQVMsRUFBc0IsTUFBTSxzQkFBc0IsQ0FBQztBQUdqRixPQUFPLEVBQXlCLDZCQUE2QixFQUFtQyxNQUFNLHVCQUF1QixDQUFDO0FBQzlILE9BQU8sRUFBc0IsMkJBQTJCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNoSCxPQUFPLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhFLE9BQU8sRUFBRSx1QkFBdUIsRUFBNEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVuRyxNQUFNLE9BQU8saUJBQWtCLFNBQVEsVUFBVTtJQWdCaEQs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