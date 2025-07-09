/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { compareBy, equals, numberComparator, tieBreakComparators } from '../../../../../base/common/arrays.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { splitLines } from '../../../../../base/common/strings.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { LineRangeEdit, RangeEdit } from './editing.js';
import { DetailedLineRangeMapping, MappingAlignment } from './mapping.js';
import { concatArrays } from '../utils.js';
/**
 * Describes modifications in input 1 and input 2 for a specific range in base.
 *
 * The UI offers a mechanism to either apply all changes from input 1 or input 2 or both.
 *
 * Immutable.
*/
export class ModifiedBaseRange {
    static fromDiffs(diffs1, diffs2, baseTextModel, input1TextModel, input2TextModel) {
        const alignments = MappingAlignment.compute(diffs1, diffs2);
        return alignments.map((a) => new ModifiedBaseRange(a.inputRange, baseTextModel, a.output1Range, input1TextModel, a.output1LineMappings, a.output2Range, input2TextModel, a.output2LineMappings));
    }
    constructor(baseRange, baseTextModel, input1Range, input1TextModel, 
    /**
     * From base to input1
    */
    input1Diffs, input2Range, input2TextModel, 
    /**
     * From base to input2
    */
    input2Diffs) {
        this.baseRange = baseRange;
        this.baseTextModel = baseTextModel;
        this.input1Range = input1Range;
        this.input1TextModel = input1TextModel;
        this.input1Diffs = input1Diffs;
        this.input2Range = input2Range;
        this.input2TextModel = input2TextModel;
        this.input2Diffs = input2Diffs;
        this.input1CombinedDiff = DetailedLineRangeMapping.join(this.input1Diffs);
        this.input2CombinedDiff = DetailedLineRangeMapping.join(this.input2Diffs);
        this.isEqualChange = equals(this.input1Diffs, this.input2Diffs, (a, b) => a.getLineEdit().equals(b.getLineEdit()));
        this.smartInput1LineRangeEdit = null;
        this.smartInput2LineRangeEdit = null;
        this.dumbInput1LineRangeEdit = null;
        this.dumbInput2LineRangeEdit = null;
        if (this.input1Diffs.length === 0 && this.input2Diffs.length === 0) {
            throw new BugIndicatingError('must have at least one diff');
        }
    }
    getInputRange(inputNumber) {
        return inputNumber === 1 ? this.input1Range : this.input2Range;
    }
    getInputCombinedDiff(inputNumber) {
        return inputNumber === 1 ? this.input1CombinedDiff : this.input2CombinedDiff;
    }
    getInputDiffs(inputNumber) {
        return inputNumber === 1 ? this.input1Diffs : this.input2Diffs;
    }
    get isConflicting() {
        return this.input1Diffs.length > 0 && this.input2Diffs.length > 0;
    }
    get canBeCombined() {
        return this.smartCombineInputs(1) !== undefined;
    }
    get isOrderRelevant() {
        const input1 = this.smartCombineInputs(1);
        const input2 = this.smartCombineInputs(2);
        if (!input1 || !input2) {
            return false;
        }
        return !input1.equals(input2);
    }
    getEditForBase(state) {
        const diffs = [];
        if (state.includesInput1 && this.input1CombinedDiff) {
            diffs.push({ diff: this.input1CombinedDiff, inputNumber: 1 });
        }
        if (state.includesInput2 && this.input2CombinedDiff) {
            diffs.push({ diff: this.input2CombinedDiff, inputNumber: 2 });
        }
        if (diffs.length === 0) {
            return { edit: undefined, effectiveState: ModifiedBaseRangeState.base };
        }
        if (diffs.length === 1) {
            return { edit: diffs[0].diff.getLineEdit(), effectiveState: ModifiedBaseRangeState.base.withInputValue(diffs[0].inputNumber, true, false) };
        }
        if (state.kind !== ModifiedBaseRangeStateKind.both) {
            throw new BugIndicatingError();
        }
        const smartCombinedEdit = state.smartCombination ? this.smartCombineInputs(state.firstInput) : this.dumbCombineInputs(state.firstInput);
        if (smartCombinedEdit) {
            return { edit: smartCombinedEdit, effectiveState: state };
        }
        return {
            edit: diffs[getOtherInputNumber(state.firstInput) - 1].diff.getLineEdit(),
            effectiveState: ModifiedBaseRangeState.base.withInputValue(getOtherInputNumber(state.firstInput), true, false),
        };
    }
    smartCombineInputs(firstInput) {
        if (firstInput === 1 && this.smartInput1LineRangeEdit !== null) {
            return this.smartInput1LineRangeEdit;
        }
        else if (firstInput === 2 && this.smartInput2LineRangeEdit !== null) {
            return this.smartInput2LineRangeEdit;
        }
        const combinedDiffs = concatArrays(this.input1Diffs.flatMap((diffs) => diffs.rangeMappings.map((diff) => ({ diff, input: 1 }))), this.input2Diffs.flatMap((diffs) => diffs.rangeMappings.map((diff) => ({ diff, input: 2 })))).sort(tieBreakComparators(compareBy((d) => d.diff.inputRange, Range.compareRangesUsingStarts), compareBy((d) => (d.input === firstInput ? 1 : 2), numberComparator)));
        const sortedEdits = combinedDiffs.map(d => {
            const sourceTextModel = d.input === 1 ? this.input1TextModel : this.input2TextModel;
            return new RangeEdit(d.diff.inputRange, sourceTextModel.getValueInRange(d.diff.outputRange));
        });
        const result = editsToLineRangeEdit(this.baseRange, sortedEdits, this.baseTextModel);
        if (firstInput === 1) {
            this.smartInput1LineRangeEdit = result;
        }
        else {
            this.smartInput2LineRangeEdit = result;
        }
        return result;
    }
    dumbCombineInputs(firstInput) {
        if (firstInput === 1 && this.dumbInput1LineRangeEdit !== null) {
            return this.dumbInput1LineRangeEdit;
        }
        else if (firstInput === 2 && this.dumbInput2LineRangeEdit !== null) {
            return this.dumbInput2LineRangeEdit;
        }
        let input1Lines = this.input1Range.getLines(this.input1TextModel);
        let input2Lines = this.input2Range.getLines(this.input2TextModel);
        if (firstInput === 2) {
            [input1Lines, input2Lines] = [input2Lines, input1Lines];
        }
        const result = new LineRangeEdit(this.baseRange, input1Lines.concat(input2Lines));
        if (firstInput === 1) {
            this.dumbInput1LineRangeEdit = result;
        }
        else {
            this.dumbInput2LineRangeEdit = result;
        }
        return result;
    }
}
function editsToLineRangeEdit(range, sortedEdits, textModel) {
    let text = '';
    const startsLineBefore = range.startLineNumber > 1;
    let currentPosition = startsLineBefore
        ? new Position(range.startLineNumber - 1, textModel.getLineMaxColumn(range.startLineNumber - 1))
        : new Position(range.startLineNumber, 1);
    for (const edit of sortedEdits) {
        const diffStart = edit.range.getStartPosition();
        if (!currentPosition.isBeforeOrEqual(diffStart)) {
            return undefined;
        }
        let originalText = textModel.getValueInRange(Range.fromPositions(currentPosition, diffStart));
        if (diffStart.lineNumber > textModel.getLineCount()) {
            // assert diffStart.lineNumber === textModel.getLineCount() + 1
            // getValueInRange doesn't include this virtual line break, as the document ends the line before.
            // endsLineAfter will be false.
            originalText += '\n';
        }
        text += originalText;
        text += edit.newText;
        currentPosition = edit.range.getEndPosition();
    }
    const endsLineAfter = range.endLineNumberExclusive <= textModel.getLineCount();
    const end = endsLineAfter ? new Position(range.endLineNumberExclusive, 1) : new Position(range.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    const originalText = textModel.getValueInRange(Range.fromPositions(currentPosition, end));
    text += originalText;
    const lines = splitLines(text);
    if (startsLineBefore) {
        if (lines[0] !== '') {
            return undefined;
        }
        lines.shift();
    }
    if (endsLineAfter) {
        if (lines[lines.length - 1] !== '') {
            return undefined;
        }
        lines.pop();
    }
    return new LineRangeEdit(range, lines);
}
export var ModifiedBaseRangeStateKind;
(function (ModifiedBaseRangeStateKind) {
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["base"] = 0] = "base";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["input1"] = 1] = "input1";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["input2"] = 2] = "input2";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["both"] = 3] = "both";
    ModifiedBaseRangeStateKind[ModifiedBaseRangeStateKind["unrecognized"] = 4] = "unrecognized";
})(ModifiedBaseRangeStateKind || (ModifiedBaseRangeStateKind = {}));
export function getOtherInputNumber(inputNumber) {
    return inputNumber === 1 ? 2 : 1;
}
export class AbstractModifiedBaseRangeState {
    constructor() { }
    get includesInput1() { return false; }
    get includesInput2() { return false; }
    includesInput(inputNumber) {
        return inputNumber === 1 ? this.includesInput1 : this.includesInput2;
    }
    isInputIncluded(inputNumber) {
        return inputNumber === 1 ? this.includesInput1 : this.includesInput2;
    }
    toggle(inputNumber) {
        return this.withInputValue(inputNumber, !this.includesInput(inputNumber), true);
    }
    getInput(inputNumber) {
        if (!this.isInputIncluded(inputNumber)) {
            return 0 /* InputState.excluded */;
        }
        return 1 /* InputState.first */;
    }
}
export class ModifiedBaseRangeStateBase extends AbstractModifiedBaseRangeState {
    get kind() { return ModifiedBaseRangeStateKind.base; }
    toString() { return 'base'; }
    swap() { return this; }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (inputNumber === 1) {
            return value ? new ModifiedBaseRangeStateInput1() : this;
        }
        else {
            return value ? new ModifiedBaseRangeStateInput2() : this;
        }
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.base;
    }
}
export class ModifiedBaseRangeStateInput1 extends AbstractModifiedBaseRangeState {
    get kind() { return ModifiedBaseRangeStateKind.input1; }
    get includesInput1() { return true; }
    toString() { return '1✓'; }
    swap() { return new ModifiedBaseRangeStateInput2(); }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (inputNumber === 1) {
            return value ? this : new ModifiedBaseRangeStateBase();
        }
        else {
            return value ? new ModifiedBaseRangeStateBoth(1, smartCombination) : new ModifiedBaseRangeStateInput2();
        }
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.input1;
    }
}
export class ModifiedBaseRangeStateInput2 extends AbstractModifiedBaseRangeState {
    get kind() { return ModifiedBaseRangeStateKind.input2; }
    get includesInput2() { return true; }
    toString() { return '2✓'; }
    swap() { return new ModifiedBaseRangeStateInput1(); }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (inputNumber === 2) {
            return value ? this : new ModifiedBaseRangeStateBase();
        }
        else {
            return value ? new ModifiedBaseRangeStateBoth(2, smartCombination) : new ModifiedBaseRangeStateInput2();
        }
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.input2;
    }
}
export class ModifiedBaseRangeStateBoth extends AbstractModifiedBaseRangeState {
    constructor(firstInput, smartCombination) {
        super();
        this.firstInput = firstInput;
        this.smartCombination = smartCombination;
    }
    get kind() { return ModifiedBaseRangeStateKind.both; }
    get includesInput1() { return true; }
    get includesInput2() { return true; }
    toString() {
        return '2✓';
    }
    swap() { return new ModifiedBaseRangeStateBoth(getOtherInputNumber(this.firstInput), this.smartCombination); }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (value) {
            return this;
        }
        return inputNumber === 1 ? new ModifiedBaseRangeStateInput2() : new ModifiedBaseRangeStateInput1();
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.both && this.firstInput === other.firstInput && this.smartCombination === other.smartCombination;
    }
    getInput(inputNumber) {
        return inputNumber === this.firstInput ? 1 /* InputState.first */ : 2 /* InputState.second */;
    }
}
export class ModifiedBaseRangeStateUnrecognized extends AbstractModifiedBaseRangeState {
    get kind() { return ModifiedBaseRangeStateKind.unrecognized; }
    toString() { return 'unrecognized'; }
    swap() { return this; }
    withInputValue(inputNumber, value, smartCombination = false) {
        if (!value) {
            return this;
        }
        return inputNumber === 1 ? new ModifiedBaseRangeStateInput1() : new ModifiedBaseRangeStateInput2();
    }
    equals(other) {
        return other.kind === ModifiedBaseRangeStateKind.unrecognized;
    }
}
export var ModifiedBaseRangeState;
(function (ModifiedBaseRangeState) {
    ModifiedBaseRangeState.base = new ModifiedBaseRangeStateBase();
    ModifiedBaseRangeState.unrecognized = new ModifiedBaseRangeStateUnrecognized();
})(ModifiedBaseRangeState || (ModifiedBaseRangeState = {}));
export var InputState;
(function (InputState) {
    InputState[InputState["excluded"] = 0] = "excluded";
    InputState[InputState["first"] = 1] = "first";
    InputState[InputState["second"] = 2] = "second";
    InputState[InputState["unrecognized"] = 3] = "unrecognized";
})(InputState || (InputState = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kaWZpZWRCYXNlUmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWVyZ2VFZGl0b3IvYnJvd3Nlci9tb2RlbC9tb2RpZmllZEJhc2VSYW5nZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXhELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTNDOzs7Ozs7RUFNRTtBQUNGLE1BQU0sT0FBTyxpQkFBaUI7SUFDdEIsTUFBTSxDQUFDLFNBQVMsQ0FDdEIsTUFBMkMsRUFDM0MsTUFBMkMsRUFDM0MsYUFBeUIsRUFDekIsZUFBMkIsRUFDM0IsZUFBMkI7UUFFM0IsTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM1RCxPQUFPLFVBQVUsQ0FBQyxHQUFHLENBQ3BCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLGlCQUFpQixDQUMz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