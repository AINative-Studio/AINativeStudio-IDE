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
import { CompareResult, equals } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { autorunHandleChanges, derived, keepObserved, observableValue, transaction, waitForState } from '../../../../../base/common/observable.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../nls.js';
import { IUndoRedoService, UndoRedoGroup } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { LineRange } from './lineRange.js';
import { DocumentLineRangeMap, DocumentRangeMap, LineRangeMapping } from './mapping.js';
import { TextModelDiffs } from './textModelDiffs.js';
import { leftJoin } from '../utils.js';
import { ModifiedBaseRange, ModifiedBaseRangeState, ModifiedBaseRangeStateKind } from './modifiedBaseRange.js';
let MergeEditorModel = class MergeEditorModel extends EditorModel {
    constructor(base, input1, input2, resultTextModel, diffComputer, options, telemetry, languageService, undoRedoService) {
        super();
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.resultTextModel = resultTextModel;
        this.diffComputer = diffComputer;
        this.options = options;
        this.telemetry = telemetry;
        this.languageService = languageService;
        this.undoRedoService = undoRedoService;
        this.input1TextModelDiffs = this._register(new TextModelDiffs(this.base, this.input1.textModel, this.diffComputer));
        this.input2TextModelDiffs = this._register(new TextModelDiffs(this.base, this.input2.textModel, this.diffComputer));
        this.resultTextModelDiffs = this._register(new TextModelDiffs(this.base, this.resultTextModel, this.diffComputer));
        this.modifiedBaseRanges = derived(this, (reader) => {
            const input1Diffs = this.input1TextModelDiffs.diffs.read(reader);
            const input2Diffs = this.input2TextModelDiffs.diffs.read(reader);
            return ModifiedBaseRange.fromDiffs(input1Diffs, input2Diffs, this.base, this.input1.textModel, this.input2.textModel);
        });
        this.modifiedBaseRangeResultStates = derived(this, reader => {
            const map = new Map(this.modifiedBaseRanges.read(reader).map((s) => [
                s, new ModifiedBaseRangeData(s)
            ]));
            return map;
        });
        this.resultSnapshot = this.resultTextModel.createSnapshot();
        this.baseInput1Diffs = this.input1TextModelDiffs.diffs;
        this.baseInput2Diffs = this.input2TextModelDiffs.diffs;
        this.baseResultDiffs = this.resultTextModelDiffs.diffs;
        this.input1ResultMapping = derived(this, reader => {
            return this.getInputResultMapping(this.baseInput1Diffs.read(reader), this.baseResultDiffs.read(reader), this.input1.textModel.getLineCount());
        });
        this.resultInput1Mapping = derived(this, reader => this.input1ResultMapping.read(reader).reverse());
        this.input2ResultMapping = derived(this, reader => {
            return this.getInputResultMapping(this.baseInput2Diffs.read(reader), this.baseResultDiffs.read(reader), this.input2.textModel.getLineCount());
        });
        this.resultInput2Mapping = derived(this, reader => this.input2ResultMapping.read(reader).reverse());
        this.baseResultMapping = derived(this, reader => {
            const map = new DocumentLineRangeMap(this.baseResultDiffs.read(reader), -1);
            return new DocumentLineRangeMap(map.lineRangeMappings.map((m) => m.inputRange.isEmpty || m.outputRange.isEmpty
                ? new LineRangeMapping(
                // We can do this because two adjacent diffs have one line in between.
                m.inputRange.deltaStart(-1), m.outputRange.deltaStart(-1))
                : m), map.inputLineCount);
        });
        this.resultBaseMapping = derived(this, reader => this.baseResultMapping.read(reader).reverse());
        this.diffComputingState = derived(this, reader => {
            const states = [
                this.input1TextModelDiffs,
                this.input2TextModelDiffs,
                this.resultTextModelDiffs,
            ].map((s) => s.state.read(reader));
            if (states.some((s) => s === 1 /* TextModelDiffState.initializing */)) {
                return 1 /* MergeEditorModelState.initializing */;
            }
            if (states.some((s) => s === 3 /* TextModelDiffState.updating */)) {
                return 3 /* MergeEditorModelState.updating */;
            }
            return 2 /* MergeEditorModelState.upToDate */;
        });
        this.inputDiffComputingState = derived(this, reader => {
            const states = [
                this.input1TextModelDiffs,
                this.input2TextModelDiffs,
            ].map((s) => s.state.read(reader));
            if (states.some((s) => s === 1 /* TextModelDiffState.initializing */)) {
                return 1 /* MergeEditorModelState.initializing */;
            }
            if (states.some((s) => s === 3 /* TextModelDiffState.updating */)) {
                return 3 /* MergeEditorModelState.updating */;
            }
            return 2 /* MergeEditorModelState.upToDate */;
        });
        this.isUpToDate = derived(this, reader => this.diffComputingState.read(reader) === 2 /* MergeEditorModelState.upToDate */);
        this.onInitialized = waitForState(this.diffComputingState, state => state === 2 /* MergeEditorModelState.upToDate */).then(() => { });
        this.firstRun = true;
        this.unhandledConflictsCount = derived(this, reader => {
            const map = this.modifiedBaseRangeResultStates.read(reader);
            let unhandledCount = 0;
            for (const [_key, value] of map) {
                if (!value.handled.read(reader)) {
                    unhandledCount++;
                }
            }
            return unhandledCount;
        });
        this.hasUnhandledConflicts = this.unhandledConflictsCount.map(value => /** @description hasUnhandledConflicts */ value > 0);
        this._register(keepObserved(this.modifiedBaseRangeResultStates));
        this._register(keepObserved(this.input1ResultMapping));
        this._register(keepObserved(this.input2ResultMapping));
        const initializePromise = this.initialize();
        this.onInitialized = this.onInitialized.then(async () => {
            await initializePromise;
        });
        initializePromise.then(() => {
            let shouldRecomputeHandledFromAccepted = true;
            this._register(autorunHandleChanges({
                handleChange: (ctx) => {
                    if (ctx.didChange(this.modifiedBaseRangeResultStates)) {
                        shouldRecomputeHandledFromAccepted = true;
                    }
                    return ctx.didChange(this.resultTextModelDiffs.diffs)
                        // Ignore non-text changes as we update the state directly
                        ? ctx.change === 1 /* TextModelDiffChangeReason.textChange */
                        : true;
                },
            }, (reader) => {
                /** @description Merge Editor Model: Recompute State From Result */
                const states = this.modifiedBaseRangeResultStates.read(reader);
                if (!this.isUpToDate.read(reader)) {
                    return;
                }
                const resultDiffs = this.resultTextModelDiffs.diffs.read(reader);
                transaction(tx => {
                    /** @description Merge Editor Model: Recompute State */
                    this.updateBaseRangeAcceptedState(resultDiffs, states, tx);
                    if (shouldRecomputeHandledFromAccepted) {
                        shouldRecomputeHandledFromAccepted = false;
                        for (const [_range, observableState] of states) {
                            const state = observableState.accepted.get();
                            const handled = !(state.kind === ModifiedBaseRangeStateKind.base || state.kind === ModifiedBaseRangeStateKind.unrecognized);
                            observableState.handledInput1.set(handled, tx);
                            observableState.handledInput2.set(handled, tx);
                        }
                    }
                });
            }));
        });
    }
    async initialize() {
        if (this.options.resetResult) {
            await this.reset();
        }
    }
    async reset() {
        await waitForState(this.inputDiffComputingState, state => state === 2 /* MergeEditorModelState.upToDate */);
        const states = this.modifiedBaseRangeResultStates.get();
        transaction(tx => {
            /** @description Set initial state */
            for (const [range, state] of states) {
                let newState;
                let handled = false;
                if (range.input1Diffs.length === 0) {
                    newState = ModifiedBaseRangeState.base.withInputValue(2, true);
                    handled = true;
                }
                else if (range.input2Diffs.length === 0) {
                    newState = ModifiedBaseRangeState.base.withInputValue(1, true);
                    handled = true;
                }
                else if (range.isEqualChange) {
                    newState = ModifiedBaseRangeState.base.withInputValue(1, true);
                    handled = true;
                }
                else {
                    newState = ModifiedBaseRangeState.base;
                    handled = false;
                }
                state.accepted.set(newState, tx);
                state.computedFromDiffing = false;
                state.previousNonDiffingState = undefined;
                state.handledInput1.set(handled, tx);
                state.handledInput2.set(handled, tx);
            }
            this.resultTextModel.pushEditOperations(null, [{
                    range: new Range(1, 1, Number.MAX_SAFE_INTEGER, 1),
                    text: this.computeAutoMergedResult()
                }], () => null);
        });
    }
    computeAutoMergedResult() {
        const baseRanges = this.modifiedBaseRanges.get();
        const baseLines = this.base.getLinesContent();
        const input1Lines = this.input1.textModel.getLinesContent();
        const input2Lines = this.input2.textModel.getLinesContent();
        const resultLines = [];
        function appendLinesToResult(source, lineRange) {
            for (let i = lineRange.startLineNumber; i < lineRange.endLineNumberExclusive; i++) {
                resultLines.push(source[i - 1]);
            }
        }
        let baseStartLineNumber = 1;
        for (const baseRange of baseRanges) {
            appendLinesToResult(baseLines, LineRange.fromLineNumbers(baseStartLineNumber, baseRange.baseRange.startLineNumber));
            baseStartLineNumber = baseRange.baseRange.endLineNumberExclusive;
            if (baseRange.input1Diffs.length === 0) {
                appendLinesToResult(input2Lines, baseRange.input2Range);
            }
            else if (baseRange.input2Diffs.length === 0) {
                appendLinesToResult(input1Lines, baseRange.input1Range);
            }
            else if (baseRange.isEqualChange) {
                appendLinesToResult(input1Lines, baseRange.input1Range);
            }
            else {
                appendLinesToResult(baseLines, baseRange.baseRange);
            }
        }
        appendLinesToResult(baseLines, LineRange.fromLineNumbers(baseStartLineNumber, baseLines.length + 1));
        return resultLines.join(this.resultTextModel.getEOL());
    }
    hasBaseRange(baseRange) {
        return this.modifiedBaseRangeResultStates.get().has(baseRange);
    }
    get isApplyingEditInResult() { return this.resultTextModelDiffs.isApplyingChange; }
    getInputResultMapping(inputLinesDiffs, resultDiffs, inputLineCount) {
        const map = DocumentLineRangeMap.betweenOutputs(inputLinesDiffs, resultDiffs, inputLineCount);
        return new DocumentLineRangeMap(map.lineRangeMappings.map((m) => m.inputRange.isEmpty || m.outputRange.isEmpty
            ? new LineRangeMapping(
            // We can do this because two adjacent diffs have one line in between.
            m.inputRange.deltaStart(-1), m.outputRange.deltaStart(-1))
            : m), map.inputLineCount);
    }
    translateInputRangeToBase(input, range) {
        const baseInputDiffs = input === 1 ? this.baseInput1Diffs.get() : this.baseInput2Diffs.get();
        const map = new DocumentRangeMap(baseInputDiffs.flatMap(d => d.rangeMappings), 0).reverse();
        return map.projectRange(range).outputRange;
    }
    translateBaseRangeToInput(input, range) {
        const baseInputDiffs = input === 1 ? this.baseInput1Diffs.get() : this.baseInput2Diffs.get();
        const map = new DocumentRangeMap(baseInputDiffs.flatMap(d => d.rangeMappings), 0);
        return map.projectRange(range).outputRange;
    }
    getLineRangeInResult(baseRange, reader) {
        return this.resultTextModelDiffs.getResultLineRange(baseRange, reader);
    }
    translateResultRangeToBase(range) {
        const map = new DocumentRangeMap(this.baseResultDiffs.get().flatMap(d => d.rangeMappings), 0).reverse();
        return map.projectRange(range).outputRange;
    }
    translateBaseRangeToResult(range) {
        const map = new DocumentRangeMap(this.baseResultDiffs.get().flatMap(d => d.rangeMappings), 0);
        return map.projectRange(range).outputRange;
    }
    findModifiedBaseRangesInRange(rangeInBase) {
        // TODO use binary search
        return this.modifiedBaseRanges.get().filter(r => r.baseRange.intersects(rangeInBase));
    }
    updateBaseRangeAcceptedState(resultDiffs, states, tx) {
        const baseRangeWithStoreAndTouchingDiffs = leftJoin(states, resultDiffs, (baseRange, diff) => baseRange[0].baseRange.touches(diff.inputRange)
            ? CompareResult.neitherLessOrGreaterThan
            : LineRange.compareByStart(baseRange[0].baseRange, diff.inputRange));
        for (const row of baseRangeWithStoreAndTouchingDiffs) {
            const newState = this.computeState(row.left[0], row.rights);
            const data = row.left[1];
            const oldState = data.accepted.get();
            if (!oldState.equals(newState)) {
                if (!this.firstRun && !data.computedFromDiffing) {
                    // Don't set this on the first run - the first run might be used to restore state.
                    data.computedFromDiffing = true;
                    data.previousNonDiffingState = oldState;
                }
                data.accepted.set(newState, tx);
            }
        }
        if (this.firstRun) {
            this.firstRun = false;
        }
    }
    computeState(baseRange, conflictingDiffs) {
        if (conflictingDiffs.length === 0) {
            return ModifiedBaseRangeState.base;
        }
        const conflictingEdits = conflictingDiffs.map((d) => d.getLineEdit());
        function editsAgreeWithDiffs(diffs) {
            return equals(conflictingEdits, diffs.map((d) => d.getLineEdit()), (a, b) => a.equals(b));
        }
        if (editsAgreeWithDiffs(baseRange.input1Diffs)) {
            return ModifiedBaseRangeState.base.withInputValue(1, true);
        }
        if (editsAgreeWithDiffs(baseRange.input2Diffs)) {
            return ModifiedBaseRangeState.base.withInputValue(2, true);
        }
        const states = [
            ModifiedBaseRangeState.base.withInputValue(1, true).withInputValue(2, true, true),
            ModifiedBaseRangeState.base.withInputValue(2, true).withInputValue(1, true, true),
            ModifiedBaseRangeState.base.withInputValue(1, true).withInputValue(2, true, false),
            ModifiedBaseRangeState.base.withInputValue(2, true).withInputValue(1, true, false),
        ];
        for (const s of states) {
            const { edit } = baseRange.getEditForBase(s);
            if (edit) {
                const resultRange = this.resultTextModelDiffs.getResultLineRange(baseRange.baseRange);
                const existingLines = resultRange.getLines(this.resultTextModel);
                if (equals(edit.newLines, existingLines, (a, b) => a === b)) {
                    return s;
                }
            }
        }
        return ModifiedBaseRangeState.unrecognized;
    }
    getState(baseRange) {
        const existingState = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (!existingState) {
            throw new BugIndicatingError('object must be from this instance');
        }
        return existingState.accepted;
    }
    setState(baseRange, state, _markInputAsHandled, tx, _pushStackElement = false) {
        if (!this.isUpToDate.get()) {
            throw new BugIndicatingError('Cannot set state while updating');
        }
        const existingState = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (!existingState) {
            throw new BugIndicatingError('object must be from this instance');
        }
        const conflictingDiffs = this.resultTextModelDiffs.findTouchingDiffs(baseRange.baseRange);
        const group = new UndoRedoGroup();
        if (conflictingDiffs) {
            this.resultTextModelDiffs.removeDiffs(conflictingDiffs, tx, group);
        }
        const { edit, effectiveState } = baseRange.getEditForBase(state);
        existingState.accepted.set(effectiveState, tx);
        existingState.previousNonDiffingState = undefined;
        existingState.computedFromDiffing = false;
        const input1Handled = existingState.handledInput1.get();
        const input2Handled = existingState.handledInput2.get();
        if (!input1Handled || !input2Handled) {
            this.undoRedoService.pushElement(new MarkAsHandledUndoRedoElement(this.resultTextModel.uri, new WeakRef(this), new WeakRef(existingState), input1Handled, input2Handled), group);
        }
        if (edit) {
            this.resultTextModel.pushStackElement();
            this.resultTextModelDiffs.applyEditRelativeToOriginal(edit, tx, group);
            this.resultTextModel.pushStackElement();
        }
        // always set conflict as handled
        existingState.handledInput1.set(true, tx);
        existingState.handledInput2.set(true, tx);
    }
    resetDirtyConflictsToBase() {
        transaction(tx => {
            /** @description Reset Unknown Base Range States */
            this.resultTextModel.pushStackElement();
            for (const range of this.modifiedBaseRanges.get()) {
                if (this.getState(range).get().kind === ModifiedBaseRangeStateKind.unrecognized) {
                    this.setState(range, ModifiedBaseRangeState.base, false, tx, false);
                }
            }
            this.resultTextModel.pushStackElement();
        });
    }
    isHandled(baseRange) {
        return this.modifiedBaseRangeResultStates.get().get(baseRange).handled;
    }
    isInputHandled(baseRange, inputNumber) {
        const state = this.modifiedBaseRangeResultStates.get().get(baseRange);
        return inputNumber === 1 ? state.handledInput1 : state.handledInput2;
    }
    setInputHandled(baseRange, inputNumber, handled, tx) {
        const state = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (state.handled.get() === handled) {
            return;
        }
        const dataRef = new WeakRef(ModifiedBaseRangeData);
        const modelRef = new WeakRef(this);
        this.undoRedoService.pushElement({
            type: 0 /* UndoRedoElementType.Resource */,
            resource: this.resultTextModel.uri,
            code: 'setInputHandled',
            label: localize('setInputHandled', "Set Input Handled"),
            redo() {
                const model = modelRef.deref();
                const data = dataRef.deref();
                if (model && !model.isDisposed() && data) {
                    transaction(tx => {
                        if (inputNumber === 1) {
                            state.handledInput1.set(handled, tx);
                        }
                        else {
                            state.handledInput2.set(handled, tx);
                        }
                    });
                }
            },
            undo() {
                const model = modelRef.deref();
                const data = dataRef.deref();
                if (model && !model.isDisposed() && data) {
                    transaction(tx => {
                        if (inputNumber === 1) {
                            state.handledInput1.set(!handled, tx);
                        }
                        else {
                            state.handledInput2.set(!handled, tx);
                        }
                    });
                }
            },
        });
        if (inputNumber === 1) {
            state.handledInput1.set(handled, tx);
        }
        else {
            state.handledInput2.set(handled, tx);
        }
    }
    setHandled(baseRange, handled, tx) {
        const state = this.modifiedBaseRangeResultStates.get().get(baseRange);
        if (state.handled.get() === handled) {
            return;
        }
        state.handledInput1.set(handled, tx);
        state.handledInput2.set(handled, tx);
    }
    setLanguageId(languageId, source) {
        const language = this.languageService.createById(languageId);
        this.base.setLanguage(language, source);
        this.input1.textModel.setLanguage(language, source);
        this.input2.textModel.setLanguage(language, source);
        this.resultTextModel.setLanguage(language, source);
    }
    getInitialResultValue() {
        const chunks = [];
        while (true) {
            const chunk = this.resultSnapshot.read();
            if (chunk === null) {
                break;
            }
            chunks.push(chunk);
        }
        return chunks.join();
    }
    async getResultValueWithConflictMarkers() {
        await waitForState(this.diffComputingState, state => state === 2 /* MergeEditorModelState.upToDate */);
        if (this.unhandledConflictsCount.get() === 0) {
            return this.resultTextModel.getValue();
        }
        const resultLines = this.resultTextModel.getLinesContent();
        const input1Lines = this.input1.textModel.getLinesContent();
        const input2Lines = this.input2.textModel.getLinesContent();
        const states = this.modifiedBaseRangeResultStates.get();
        const outputLines = [];
        function appendLinesToResult(source, lineRange) {
            for (let i = lineRange.startLineNumber; i < lineRange.endLineNumberExclusive; i++) {
                outputLines.push(source[i - 1]);
            }
        }
        let resultStartLineNumber = 1;
        for (const [range, state] of states) {
            if (state.handled.get()) {
                continue;
            }
            const resultRange = this.resultTextModelDiffs.getResultLineRange(range.baseRange);
            appendLinesToResult(resultLines, LineRange.fromLineNumbers(resultStartLineNumber, Math.max(resultStartLineNumber, resultRange.startLineNumber)));
            resultStartLineNumber = resultRange.endLineNumberExclusive;
            outputLines.push('<<<<<<<');
            if (state.accepted.get().kind === ModifiedBaseRangeStateKind.unrecognized) {
                // to prevent loss of data, use modified result as "ours"
                appendLinesToResult(resultLines, resultRange);
            }
            else {
                appendLinesToResult(input1Lines, range.input1Range);
            }
            outputLines.push('=======');
            appendLinesToResult(input2Lines, range.input2Range);
            outputLines.push('>>>>>>>');
        }
        appendLinesToResult(resultLines, LineRange.fromLineNumbers(resultStartLineNumber, resultLines.length + 1));
        return outputLines.join('\n');
    }
    get conflictCount() {
        return arrayCount(this.modifiedBaseRanges.get(), r => r.isConflicting);
    }
    get combinableConflictCount() {
        return arrayCount(this.modifiedBaseRanges.get(), r => r.isConflicting && r.canBeCombined);
    }
    get conflictsResolvedWithBase() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting &&
            s.accepted.get().kind === ModifiedBaseRangeStateKind.base);
    }
    get conflictsResolvedWithInput1() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting &&
            s.accepted.get().kind === ModifiedBaseRangeStateKind.input1);
    }
    get conflictsResolvedWithInput2() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting &&
            s.accepted.get().kind === ModifiedBaseRangeStateKind.input2);
    }
    get conflictsResolvedWithSmartCombination() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && state.kind === ModifiedBaseRangeStateKind.both && state.smartCombination;
        });
    }
    get manuallySolvedConflictCountThatEqualNone() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => r.isConflicting &&
            s.accepted.get().kind === ModifiedBaseRangeStateKind.unrecognized);
    }
    get manuallySolvedConflictCountThatEqualSmartCombine() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && s.computedFromDiffing && state.kind === ModifiedBaseRangeStateKind.both && state.smartCombination;
        });
    }
    get manuallySolvedConflictCountThatEqualInput1() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && s.computedFromDiffing && state.kind === ModifiedBaseRangeStateKind.input1;
        });
    }
    get manuallySolvedConflictCountThatEqualInput2() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && s.computedFromDiffing && state.kind === ModifiedBaseRangeStateKind.input2;
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithBase() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && state.kind === ModifiedBaseRangeStateKind.unrecognized && s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.base;
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithInput1() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && state.kind === ModifiedBaseRangeStateKind.unrecognized && s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.input1;
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithInput2() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && state.kind === ModifiedBaseRangeStateKind.unrecognized && s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.input2;
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithBothNonSmart() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && state.kind === ModifiedBaseRangeStateKind.unrecognized && s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.both && !s.previousNonDiffingState?.smartCombination;
        });
    }
    get manuallySolvedConflictCountThatEqualNoneAndStartedWithBothSmart() {
        return arrayCount(this.modifiedBaseRangeResultStates.get().entries(), ([r, s]) => {
            const state = s.accepted.get();
            return r.isConflicting && state.kind === ModifiedBaseRangeStateKind.unrecognized && s.previousNonDiffingState?.kind === ModifiedBaseRangeStateKind.both && s.previousNonDiffingState?.smartCombination;
        });
    }
};
MergeEditorModel = __decorate([
    __param(7, ILanguageService),
    __param(8, IUndoRedoService)
], MergeEditorModel);
export { MergeEditorModel };
function arrayCount(array, predicate) {
    let count = 0;
    for (const value of array) {
        if (predicate(value)) {
            count++;
        }
    }
    return count;
}
class ModifiedBaseRangeData {
    constructor(baseRange) {
        this.baseRange = baseRange;
        this.accepted = observableValue(`BaseRangeState${this.baseRange.baseRange}`, ModifiedBaseRangeState.base);
        this.handledInput1 = observableValue(`BaseRangeHandledState${this.baseRange.baseRange}.Input1`, false);
        this.handledInput2 = observableValue(`BaseRangeHandledState${this.baseRange.baseRange}.Input2`, false);
        this.computedFromDiffing = false;
        this.previousNonDiffingState = undefined;
        this.handled = derived(this, reader => this.handledInput1.read(reader) && this.handledInput2.read(reader));
    }
}
export var MergeEditorModelState;
(function (MergeEditorModelState) {
    MergeEditorModelState[MergeEditorModelState["initializing"] = 1] = "initializing";
    MergeEditorModelState[MergeEditorModelState["upToDate"] = 2] = "upToDate";
    MergeEditorModelState[MergeEditorModelState["updating"] = 3] = "updating";
})(MergeEditorModelState || (MergeEditorModelState = {}));
class MarkAsHandledUndoRedoElement {
    constructor(resource, mergeEditorModelRef, stateRef, input1Handled, input2Handled) {
        this.resource = resource;
        this.mergeEditorModelRef = mergeEditorModelRef;
        this.stateRef = stateRef;
        this.input1Handled = input1Handled;
        this.input2Handled = input2Handled;
        this.code = 'undoMarkAsHandled';
        this.label = localize('undoMarkAsHandled', 'Undo Mark As Handled');
        this.type = 0 /* UndoRedoElementType.Resource */;
    }
    redo() {
        const mergeEditorModel = this.mergeEditorModelRef.deref();
        if (!mergeEditorModel || mergeEditorModel.isDisposed()) {
            return;
        }
        const state = this.stateRef.deref();
        if (!state) {
            return;
        }
        transaction(tx => {
            state.handledInput1.set(true, tx);
            state.handledInput2.set(true, tx);
        });
    }
    undo() {
        const mergeEditorModel = this.mergeEditorModelRef.deref();
        if (!mergeEditorModel || mergeEditorModel.isDisposed()) {
            return;
        }
        const state = this.stateRef.deref();
        if (!state) {
            return;
        }
        transaction(tx => {
            state.handledInput1.set(this.input1Handled, tx);
            state.handledInput2.set(this.input2Handled, tx);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvbW9kZWwvbWVyZ2VFZGl0b3JNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxPQUFPLEVBQTJELFlBQVksRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTVNLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUE0QixnQkFBZ0IsRUFBdUIsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckosT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLEVBQTRCLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ2xILE9BQU8sRUFBNkIsY0FBYyxFQUFzQixNQUFNLHFCQUFxQixDQUFDO0FBRXBHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdkMsT0FBTyxFQUFlLGlCQUFpQixFQUFFLHNC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