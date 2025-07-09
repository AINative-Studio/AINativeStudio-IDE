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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3JNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL21vZGVsL21lcmdlRWRpdG9yTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMxRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsT0FBTyxFQUEyRCxZQUFZLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUU1TSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBNEIsZ0JBQWdCLEVBQXVCLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JKLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDM0MsT0FBTyxFQUE0QixvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUNsSCxPQUFPLEVBQTZCLGNBQWMsRUFBc0IsTUFBTSxxQkFBcUIsQ0FBQztBQUVwRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ3ZDLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxz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