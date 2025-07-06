/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $ } from '../../../../../base/browser/dom.js';
import { CompareResult } from '../../../../../base/common/arrays.js';
import { LineRange } from '../model/lineRange.js';
import { join } from '../utils.js';
import { ActionsSource, ConflictActionsFactory } from './conflictActions.js';
import { getAlignments } from './lineAlignment.js';
export class ViewZoneComputer {
    constructor(input1Editor, input2Editor, resultEditor) {
        this.input1Editor = input1Editor;
        this.input2Editor = input2Editor;
        this.resultEditor = resultEditor;
        this.conflictActionsFactoryInput1 = new ConflictActionsFactory(this.input1Editor);
        this.conflictActionsFactoryInput2 = new ConflictActionsFactory(this.input2Editor);
        this.conflictActionsFactoryResult = new ConflictActionsFactory(this.resultEditor);
    }
    computeViewZones(reader, viewModel, options) {
        let input1LinesAdded = 0;
        let input2LinesAdded = 0;
        let baseLinesAdded = 0;
        let resultLinesAdded = 0;
        const input1ViewZones = [];
        const input2ViewZones = [];
        const baseViewZones = [];
        const resultViewZones = [];
        const model = viewModel.model;
        const resultDiffs = model.baseResultDiffs.read(reader);
        const baseRangeWithStoreAndTouchingDiffs = join(model.modifiedBaseRanges.read(reader), resultDiffs, (baseRange, diff) => baseRange.baseRange.touches(diff.inputRange)
            ? CompareResult.neitherLessOrGreaterThan
            : LineRange.compareByStart(baseRange.baseRange, diff.inputRange));
        const shouldShowCodeLenses = options.codeLensesVisible;
        const showNonConflictingChanges = options.showNonConflictingChanges;
        let lastModifiedBaseRange = undefined;
        let lastBaseResultDiff = undefined;
        for (const m of baseRangeWithStoreAndTouchingDiffs) {
            if (shouldShowCodeLenses && m.left && (m.left.isConflicting || showNonConflictingChanges || !model.isHandled(m.left).read(reader))) {
                const actions = new ActionsSource(viewModel, m.left);
                if (options.shouldAlignResult || !actions.inputIsEmpty.read(reader)) {
                    input1ViewZones.push(new CommandViewZone(this.conflictActionsFactoryInput1, m.left.input1Range.startLineNumber - 1, actions.itemsInput1));
                    input2ViewZones.push(new CommandViewZone(this.conflictActionsFactoryInput2, m.left.input2Range.startLineNumber - 1, actions.itemsInput2));
                    if (options.shouldAlignBase) {
                        baseViewZones.push(new Placeholder(m.left.baseRange.startLineNumber - 1, 16));
                    }
                }
                const afterLineNumber = m.left.baseRange.startLineNumber + (lastBaseResultDiff?.resultingDeltaFromOriginalToModified ?? 0) - 1;
                resultViewZones.push(new CommandViewZone(this.conflictActionsFactoryResult, afterLineNumber, actions.resultItems));
            }
            const lastResultDiff = m.rights.at(-1);
            if (lastResultDiff) {
                lastBaseResultDiff = lastResultDiff;
            }
            let alignedLines;
            if (m.left) {
                alignedLines = getAlignments(m.left).map(a => ({
                    input1Line: a[0],
                    baseLine: a[1],
                    input2Line: a[2],
                    resultLine: undefined,
                }));
                lastModifiedBaseRange = m.left;
                // This is a total hack.
                alignedLines[alignedLines.length - 1].resultLine =
                    m.left.baseRange.endLineNumberExclusive
                        + (lastBaseResultDiff ? lastBaseResultDiff.resultingDeltaFromOriginalToModified : 0);
            }
            else {
                alignedLines = [{
                        baseLine: lastResultDiff.inputRange.endLineNumberExclusive,
                        input1Line: lastResultDiff.inputRange.endLineNumberExclusive + (lastModifiedBaseRange ? (lastModifiedBaseRange.input1Range.endLineNumberExclusive - lastModifiedBaseRange.baseRange.endLineNumberExclusive) : 0),
                        input2Line: lastResultDiff.inputRange.endLineNumberExclusive + (lastModifiedBaseRange ? (lastModifiedBaseRange.input2Range.endLineNumberExclusive - lastModifiedBaseRange.baseRange.endLineNumberExclusive) : 0),
                        resultLine: lastResultDiff.outputRange.endLineNumberExclusive,
                    }];
            }
            for (const { input1Line, baseLine, input2Line, resultLine } of alignedLines) {
                if (!options.shouldAlignBase && (input1Line === undefined || input2Line === undefined)) {
                    continue;
                }
                const input1Line_ = input1Line !== undefined ? input1Line + input1LinesAdded : -1;
                const input2Line_ = input2Line !== undefined ? input2Line + input2LinesAdded : -1;
                const baseLine_ = baseLine + baseLinesAdded;
                const resultLine_ = resultLine !== undefined ? resultLine + resultLinesAdded : -1;
                const max = Math.max(options.shouldAlignBase ? baseLine_ : 0, input1Line_, input2Line_, options.shouldAlignResult ? resultLine_ : 0);
                if (input1Line !== undefined) {
                    const diffInput1 = max - input1Line_;
                    if (diffInput1 > 0) {
                        input1ViewZones.push(new Spacer(input1Line - 1, diffInput1));
                        input1LinesAdded += diffInput1;
                    }
                }
                if (input2Line !== undefined) {
                    const diffInput2 = max - input2Line_;
                    if (diffInput2 > 0) {
                        input2ViewZones.push(new Spacer(input2Line - 1, diffInput2));
                        input2LinesAdded += diffInput2;
                    }
                }
                if (options.shouldAlignBase) {
                    const diffBase = max - baseLine_;
                    if (diffBase > 0) {
                        baseViewZones.push(new Spacer(baseLine - 1, diffBase));
                        baseLinesAdded += diffBase;
                    }
                }
                if (options.shouldAlignResult && resultLine !== undefined) {
                    const diffResult = max - resultLine_;
                    if (diffResult > 0) {
                        resultViewZones.push(new Spacer(resultLine - 1, diffResult));
                        resultLinesAdded += diffResult;
                    }
                }
            }
        }
        return new MergeEditorViewZones(input1ViewZones, input2ViewZones, baseViewZones, resultViewZones);
    }
}
export class MergeEditorViewZones {
    constructor(input1ViewZones, input2ViewZones, baseViewZones, resultViewZones) {
        this.input1ViewZones = input1ViewZones;
        this.input2ViewZones = input2ViewZones;
        this.baseViewZones = baseViewZones;
        this.resultViewZones = resultViewZones;
    }
}
/**
 * This is an abstract class to create various editor view zones.
*/
export class MergeEditorViewZone {
}
class Spacer extends MergeEditorViewZone {
    constructor(afterLineNumber, heightInLines) {
        super();
        this.afterLineNumber = afterLineNumber;
        this.heightInLines = heightInLines;
    }
    create(viewZoneChangeAccessor, viewZoneIdsToCleanUp, disposableStore) {
        viewZoneIdsToCleanUp.push(viewZoneChangeAccessor.addZone({
            afterLineNumber: this.afterLineNumber,
            heightInLines: this.heightInLines,
            domNode: $('div.diagonal-fill'),
        }));
    }
}
class Placeholder extends MergeEditorViewZone {
    constructor(afterLineNumber, heightPx) {
        super();
        this.afterLineNumber = afterLineNumber;
        this.heightPx = heightPx;
    }
    create(viewZoneChangeAccessor, viewZoneIdsToCleanUp, disposableStore) {
        viewZoneIdsToCleanUp.push(viewZoneChangeAccessor.addZone({
            afterLineNumber: this.afterLineNumber,
            heightInPx: this.heightPx,
            domNode: $('div.conflict-actions-placeholder'),
        }));
    }
}
class CommandViewZone extends MergeEditorViewZone {
    constructor(conflictActionsFactory, lineNumber, items) {
        super();
        this.conflictActionsFactory = conflictActionsFactory;
        this.lineNumber = lineNumber;
        this.items = items;
    }
    create(viewZoneChangeAccessor, viewZoneIdsToCleanUp, disposableStore) {
        disposableStore.add(this.conflictActionsFactory.createWidget(viewZoneChangeAccessor, this.lineNumber, this.items, viewZoneIdsToCleanUp));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1pvbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9icm93c2VyL3ZpZXcvdmlld1pvbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJckUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR2xELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDbkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxzQkFBc0IsRUFBd0IsTUFBTSxzQkFBc0IsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHbkQsTUFBTSxPQUFPLGdCQUFnQjtJQUs1QixZQUNrQixZQUF5QixFQUN6QixZQUF5QixFQUN6QixZQUF5QjtRQUZ6QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUN6QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQUN6QixpQkFBWSxHQUFaLFlBQVksQ0FBYTtRQVAxQixpQ0FBNEIsR0FBRyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RSxpQ0FBNEIsR0FBRyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RSxpQ0FBNEIsR0FBRyxJQUFJLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQU0xRixDQUFDO0lBRUUsZ0JBQWdCLENBQ3RCLE1BQWUsRUFDZixTQUErQixFQUMvQixPQUtDO1FBRUQsSUFBSSxnQkFBZ0IsR0FB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