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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY3Vyc29yL2N1cnNvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBdUIsV0FBVyxFQUFFLG1CQUFtQixFQUFnRixNQUFNLG9CQUFvQixDQUFDO0FBQ3pLLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNuRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDL0UsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFL0UsT0FBTyxFQUFFLEtBQUssRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQ2pELE9BQU8sRUFBYyxTQUFTLEVBQXNCLE1BQU0sc0JBQXNCLENBQUM7QUFHakYsT0FBTyxFQUF5Qiw2QkFBNkIsRUFBbUMsTUFBTSx1QkFBdUIsQ0FBQztBQUM5SCxPQUFPLEVBQXNCLDJCQUEyQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDaEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQTRCLE1BQU0sZ0NBQWdDLENBQUM7QUFFbkcsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFVBQVU7SUFnQmhE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