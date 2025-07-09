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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1pvbmVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2Jyb3dzZXIvdmlldy92aWV3Wm9uZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUlyRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHbEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNuQyxPQUFPLEVBQUUsYUFBYSxFQUFFLHNCQUFzQixFQUF3QixNQUFNLHNCQUFzQixDQUFDO0FBQ25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUduRCxNQUFNLE9BQU8sZ0JBQWdCO0lBSzVCLFlBQ2tCLFlBQXlCLEVBQ3pCLFlBQXlCLEVBQ3pCLFlBQXlCO1FBRnpCLGlCQUFZLEdBQVosWUFBWSxDQUFhO1FBQ3pCLGlCQUFZLEdBQVosWUFBWSxDQUFhO1FBQ3pCLGlCQUFZLEdBQVosWUFBWSxDQUFhO1FBUDFCLGlDQUE0QixHQUFHLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdFLGlDQUE0QixHQUFHLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzdFLGlDQUE0QixHQUFHLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBTTFGLENBQUM7SUFFRSxnQkFBZ0IsQ0FDdEIsTUFBZSxFQUNmLFNBQStCLEVBQy9CLE9BS0M7UUFFRCxJQUFJLGdCQUFnQixHQUFHLENB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