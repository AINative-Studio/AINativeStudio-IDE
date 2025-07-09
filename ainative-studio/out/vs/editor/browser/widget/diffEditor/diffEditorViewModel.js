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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableSignal, observableSignalFromEvent, observableValue, transaction, waitForState } from '../../../../base/common/observable.js';
import { IDiffProviderFactoryService } from './diffProviderFactoryService.js';
import { filterWithPrevious } from './utils.js';
import { readHotReloadableExport } from '../../../../base/common/hotReloadHelpers.js';
import { LineRange, LineRangeSet } from '../../../common/core/lineRange.js';
import { DefaultLinesDiffComputer } from '../../../common/diff/defaultLinesDiffComputer/defaultLinesDiffComputer.js';
import { DetailedLineRangeMapping, LineRangeMapping, RangeMapping } from '../../../common/diff/rangeMapping.js';
import { TextEditInfo } from '../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { combineTextEditInfos } from '../../../common/model/bracketPairsTextModelPart/bracketPairsTree/combineTextEditInfos.js';
import { optimizeSequenceDiffs } from '../../../common/diff/defaultLinesDiffComputer/heuristicSequenceOptimizations.js';
import { isDefined } from '../../../../base/common/types.js';
import { groupAdjacentBy } from '../../../../base/common/arrays.js';
import { softAssert } from '../../../../base/common/assert.js';
let DiffEditorViewModel = class DiffEditorViewModel extends Disposable {
    setActiveMovedText(movedText) {
        this._activeMovedText.set(movedText, undefined);
    }
    setHoveredMovedText(movedText) {
        this._hoveredMovedText.set(movedText, undefined);
    }
    constructor(model, _options, _diffProviderFactoryService) {
        super();
        this.model = model;
        this._options = _options;
        this._diffProviderFactoryService = _diffProviderFactoryService;
        this._isDiffUpToDate = observableValue(this, false);
        this.isDiffUpToDate = this._isDiffUpToDate;
        this._diff = observableValue(this, undefined);
        this.diff = this._diff;
        this._unchangedRegions = observableValue(this, undefined);
        this.unchangedRegions = derived(this, r => {
            if (this._options.hideUnchangedRegions.read(r)) {
                return this._unchangedRegions.read(r)?.regions ?? [];
            }
            else {
                // Reset state
                transaction(tx => {
                    for (const r of this._unchangedRegions.get()?.regions || []) {
                        r.collapseAll(tx);
                    }
                });
                return [];
            }
        });
        this.movedTextToCompare = observableValue(this, undefined);
        this._activeMovedText = observableValue(this, undefined);
        this._hoveredMovedText = observableValue(this, undefined);
        this.activeMovedText = derived(this, r => this.movedTextToCompare.read(r) ?? this._hoveredMovedText.read(r) ?? this._activeMovedText.read(r));
        this._cancellationTokenSource = new CancellationTokenSource();
        this._diffProvider = derived(this, reader => {
            const diffProvider = this._diffProviderFactoryService.createDiffProvider({
                diffAlgorithm: this._options.diffAlgorithm.read(reader)
            });
            const onChangeSignal = observableSignalFromEvent('onDidChange', diffProvider.onDidChange);
            return {
                diffProvider,
                onChangeSignal,
            };
        });
        this._register(toDisposable(() => this._cancellationTokenSource.cancel()));
        const contentChangedSignal = observableSignal('contentChangedSignal');
        const debouncer = this._register(new RunOnceScheduler(() => contentChangedSignal.trigger(undefined), 200));
        this._register(autorun(reader => {
            /** @description collapse touching unchanged ranges */
            const lastUnchangedRegions = this._unchangedRegions.read(reader);
            if (!lastUnchangedRegions || lastUnchangedRegions.regions.some(r => r.isDragged.read(reader))) {
                return;
            }
            const lastUnchangedRegionsOrigRanges = lastUnchangedRegions.originalDecorationIds
                .map(id => model.original.getDecorationRange(id))
                .map(r => r ? LineRange.fromRangeInclusive(r) : undefined);
            const lastUnchangedRegionsModRanges = lastUnchangedRegions.modifiedDecorationIds
                .map(id => model.modified.getDecorationRange(id))
                .map(r => r ? LineRange.fromRangeInclusive(r) : undefined);
            const updatedLastUnchangedRegions = lastUnchangedRegions.regions.map((r, idx) => (!lastUnchangedRegionsOrigRanges[idx] || !lastUnchangedRegionsModRanges[idx]) ? undefined :
                new UnchangedRegion(lastUnchangedRegionsOrigRanges[idx].startLineNumber, lastUnchangedRegionsModRanges[idx].startLineNumber, lastUnchangedRegionsOrigRanges[idx].length, r.visibleLineCountTop.read(reader), r.visibleLineCountBottom.read(reader))).filter(isDefined);
            const newRanges = [];
            let didChange = false;
            for (const touching of groupAdjacentBy(updatedLastUnchangedRegions, (a, b) => a.getHiddenModifiedRange(reader).endLineNumberExclusive === b.getHiddenModifiedRange(reader).startLineNumber)) {
                if (touching.length > 1) {
                    didChange = true;
                    const sumLineCount = touching.reduce((sum, r) => sum + r.lineCount, 0);
                    const r = new UnchangedRegion(touching[0].originalLineNumber, touching[0].modifiedLineNumber, sumLineCount, touching[0].visibleLineCountTop.get(), touching[touching.length - 1].visibleLineCountBottom.get());
                    newRanges.push(r);
                }
                else {
                    newRanges.push(touching[0]);
                }
            }
            if (didChange) {
                const originalDecorationIds = model.original.deltaDecorations(lastUnchangedRegions.originalDecorationIds, newRanges.map(r => ({ range: r.originalUnchangedRange.toInclusiveRange(), options: { description: 'unchanged' } })));
                const modifiedDecorationIds = model.modified.deltaDecorations(lastUnchangedRegions.modifiedDecorationIds, newRanges.map(r => ({ range: r.modifiedUnchangedRange.toInclusiveRange(), options: { description: 'unchanged' } })));
                transaction(tx => {
                    this._unchangedRegions.set({
                        regions: newRanges,
                        originalDecorationIds,
                        modifiedDecorationIds
                    }, tx);
                });
            }
        }));
        const updateUnchangedRegions = (result, tx, reader) => {
            const newUnchangedRegions = UnchangedRegion.fromDiffs(result.changes, model.original.getLineCount(), model.modified.getLineCount(), this._options.hideUnchangedRegionsMinimumLineCount.read(reader), this._options.hideUnchangedRegionsContextLineCount.read(reader));
            // Transfer state from cur state
            let visibleRegions = undefined;
            const lastUnchangedRegions = this._unchangedRegions.get();
            if (lastUnchangedRegions) {
                const lastUnchangedRegionsOrigRanges = lastUnchangedRegions.originalDecorationIds
                    .map(id => model.original.getDecorationRange(id))
                    .map(r => r ? LineRange.fromRangeInclusive(r) : undefined);
                const lastUnchangedRegionsModRanges = lastUnchangedRegions.modifiedDecorationIds
                    .map(id => model.modified.getDecorationRange(id))
                    .map(r => r ? LineRange.fromRangeInclusive(r) : undefined);
                const updatedLastUnchangedRegions = filterWithPrevious(lastUnchangedRegions.regions
                    .map((r, idx) => {
                    if (!lastUnchangedRegionsOrigRanges[idx] || !lastUnchangedRegionsModRanges[idx]) {
                        return undefined;
                    }
                    const length = lastUnchangedRegionsOrigRanges[idx].length;
                    return new UnchangedRegion(lastUnchangedRegionsOrigRanges[idx].startLineNumber, lastUnchangedRegionsModRanges[idx].startLineNumber, length, 
                    // The visible area can shrink by edits -> we have to account for this
                    Math.min(r.visibleLineCountTop.get(), length), Math.min(r.visibleLineCountBottom.get(), length - r.visibleLineCountTop.get()));
                }).filter(isDefined), (cur, prev) => !prev || (cur.modifiedLineNumber >= prev.modifiedLineNumber + prev.lineCount && cur.originalLineNumber >= prev.originalLineNumber + prev.lineCount));
                let hiddenRegions = updatedLastUnchangedRegions.map(r => new LineRangeMapping(r.getHiddenOriginalRange(reader), r.getHiddenModifiedRange(reader)));
                hiddenRegions = LineRangeMapping.clip(hiddenRegions, LineRange.ofLength(1, model.original.getLineCount()), LineRange.ofLength(1, model.modified.getLineCount()));
                visibleRegions = LineRangeMapping.inverse(hiddenRegions, model.original.getLineCount(), model.modified.getLineCount());
            }
            const newUnchangedRegions2 = [];
            if (visibleRegions) {
                for (const r of newUnchangedRegions) {
                    const intersecting = visibleRegions.filter(f => f.original.intersectsStrict(r.originalUnchangedRange) && f.modified.intersectsStrict(r.modifiedUnchangedRange));
                    newUnchangedRegions2.push(...r.setVisibleRanges(intersecting, tx));
                }
            }
            else {
                newUnchangedRegions2.push(...newUnchangedRegions);
            }
            const originalDecorationIds = model.original.deltaDecorations(lastUnchangedRegions?.originalDecorationIds || [], newUnchangedRegions2.map(r => ({ range: r.originalUnchangedRange.toInclusiveRange(), options: { description: 'unchanged' } })));
            const modifiedDecorationIds = model.modified.deltaDecorations(lastUnchangedRegions?.modifiedDecorationIds || [], newUnchangedRegions2.map(r => ({ range: r.modifiedUnchangedRange.toInclusiveRange(), options: { description: 'unchanged' } })));
            this._unchangedRegions.set({
                regions: newUnchangedRegions2,
                originalDecorationIds,
                modifiedDecorationIds
            }, tx);
        };
        this._register(model.modified.onDidChangeContent((e) => {
            const diff = this._diff.get();
            if (diff) {
                const textEdits = TextEditInfo.fromModelContentChanges(e.changes);
                const result = applyModifiedEdits(this._lastDiff, textEdits, model.original, model.modified);
                if (result) {
                    this._lastDiff = result;
                    transaction(tx => {
                        this._diff.set(DiffState.fromDiffResult(this._lastDiff), tx);
                        updateUnchangedRegions(result, tx);
                        const currentSyncedMovedText = this.movedTextToCompare.get();
                        this.movedTextToCompare.set(currentSyncedMovedText ? this._lastDiff.moves.find(m => m.lineRangeMapping.modified.intersect(currentSyncedMovedText.lineRangeMapping.modified)) : undefined, tx);
                    });
                }
            }
            this._isDiffUpToDate.set(false, undefined);
            debouncer.schedule();
        }));
        this._register(model.original.onDidChangeContent((e) => {
            const diff = this._diff.get();
            if (diff) {
                const textEdits = TextEditInfo.fromModelContentChanges(e.changes);
                const result = applyOriginalEdits(this._lastDiff, textEdits, model.original, model.modified);
                if (result) {
                    this._lastDiff = result;
                    transaction(tx => {
                        this._diff.set(DiffState.fromDiffResult(this._lastDiff), tx);
                        updateUnchangedRegions(result, tx);
                        const currentSyncedMovedText = this.movedTextToCompare.get();
                        this.movedTextToCompare.set(currentSyncedMovedText ? this._lastDiff.moves.find(m => m.lineRangeMapping.modified.intersect(currentSyncedMovedText.lineRangeMapping.modified)) : undefined, tx);
                    });
                }
            }
            this._isDiffUpToDate.set(false, undefined);
            debouncer.schedule();
        }));
        this._register(autorunWithStore(async (reader, store) => {
            /** @description compute diff */
            // So that they get recomputed when these settings change
            this._options.hideUnchangedRegionsMinimumLineCount.read(reader);
            this._options.hideUnchangedRegionsContextLineCount.read(reader);
            debouncer.cancel();
            contentChangedSignal.read(reader);
            const documentDiffProvider = this._diffProvider.read(reader);
            documentDiffProvider.onChangeSignal.read(reader);
            readHotReloadableExport(DefaultLinesDiffComputer, reader);
            readHotReloadableExport(optimizeSequenceDiffs, reader);
            this._isDiffUpToDate.set(false, undefined);
            let originalTextEditInfos = [];
            store.add(model.original.onDidChangeContent((e) => {
                const edits = TextEditInfo.fromModelContentChanges(e.changes);
                originalTextEditInfos = combineTextEditInfos(originalTextEditInfos, edits);
            }));
            let modifiedTextEditInfos = [];
            store.add(model.modified.onDidChangeContent((e) => {
                const edits = TextEditInfo.fromModelContentChanges(e.changes);
                modifiedTextEditInfos = combineTextEditInfos(modifiedTextEditInfos, edits);
            }));
            let result = await documentDiffProvider.diffProvider.computeDiff(model.original, model.modified, {
                ignoreTrimWhitespace: this._options.ignoreTrimWhitespace.read(reader),
                maxComputationTimeMs: this._options.maxComputationTimeMs.read(reader),
                computeMoves: this._options.showMoves.read(reader),
            }, this._cancellationTokenSource.token);
            if (this._cancellationTokenSource.token.isCancellationRequested) {
                return;
            }
            if (model.original.isDisposed() || model.modified.isDisposed()) {
                // TODO@hediet fishy?
                return;
            }
            result = normalizeDocumentDiff(result, model.original, model.modified);
            result = applyOriginalEdits(result, originalTextEditInfos, model.original, model.modified) ?? result;
            result = applyModifiedEdits(result, modifiedTextEditInfos, model.original, model.modified) ?? result;
            transaction(tx => {
                /** @description write diff result */
                updateUnchangedRegions(result, tx);
                this._lastDiff = result;
                const state = DiffState.fromDiffResult(result);
                this._diff.set(state, tx);
                this._isDiffUpToDate.set(true, tx);
                const currentSyncedMovedText = this.movedTextToCompare.get();
                this.movedTextToCompare.set(currentSyncedMovedText ? this._lastDiff.moves.find(m => m.lineRangeMapping.modified.intersect(currentSyncedMovedText.lineRangeMapping.modified)) : undefined, tx);
            });
        }));
    }
    ensureModifiedLineIsVisible(lineNumber, preference, tx) {
        if (this.diff.get()?.mappings.length === 0) {
            return;
        }
        const unchangedRegions = this._unchangedRegions.get()?.regions || [];
        for (const r of unchangedRegions) {
            if (r.getHiddenModifiedRange(undefined).contains(lineNumber)) {
                r.showModifiedLine(lineNumber, preference, tx);
                return;
            }
        }
    }
    ensureOriginalLineIsVisible(lineNumber, preference, tx) {
        if (this.diff.get()?.mappings.length === 0) {
            return;
        }
        const unchangedRegions = this._unchangedRegions.get()?.regions || [];
        for (const r of unchangedRegions) {
            if (r.getHiddenOriginalRange(undefined).contains(lineNumber)) {
                r.showOriginalLine(lineNumber, preference, tx);
                return;
            }
        }
    }
    async waitForDiff() {
        await waitForState(this.isDiffUpToDate, s => s);
    }
    serializeState() {
        const regions = this._unchangedRegions.get();
        return {
            collapsedRegions: regions?.regions.map(r => ({ range: r.getHiddenModifiedRange(undefined).serialize() }))
        };
    }
    restoreSerializedState(state) {
        const ranges = state.collapsedRegions?.map(r => LineRange.deserialize(r.range));
        const regions = this._unchangedRegions.get();
        if (!regions || !ranges) {
            return;
        }
        transaction(tx => {
            for (const r of regions.regions) {
                for (const range of ranges) {
                    if (r.modifiedUnchangedRange.intersect(range)) {
                        r.setHiddenModifiedRange(range, tx);
                        break;
                    }
                }
            }
        });
    }
};
DiffEditorViewModel = __decorate([
    __param(2, IDiffProviderFactoryService)
], DiffEditorViewModel);
export { DiffEditorViewModel };
function normalizeDocumentDiff(diff, original, modified) {
    return {
        changes: diff.changes.map(c => new DetailedLineRangeMapping(c.original, c.modified, c.innerChanges ? c.innerChanges.map(i => normalizeRangeMapping(i, original, modified)) : undefined)),
        moves: diff.moves,
        identical: diff.identical,
        quitEarly: diff.quitEarly,
    };
}
function normalizeRangeMapping(rangeMapping, original, modified) {
    let originalRange = rangeMapping.originalRange;
    let modifiedRange = rangeMapping.modifiedRange;
    if (originalRange.startColumn === 1 && modifiedRange.startColumn === 1 &&
        (originalRange.endColumn !== 1 || modifiedRange.endColumn !== 1) &&
        originalRange.endColumn === original.getLineMaxColumn(originalRange.endLineNumber)
        && modifiedRange.endColumn === modified.getLineMaxColumn(modifiedRange.endLineNumber)
        && originalRange.endLineNumber < original.getLineCount()
        && modifiedRange.endLineNumber < modified.getLineCount()) {
        originalRange = originalRange.setEndPosition(originalRange.endLineNumber + 1, 1);
        modifiedRange = modifiedRange.setEndPosition(modifiedRange.endLineNumber + 1, 1);
    }
    return new RangeMapping(originalRange, modifiedRange);
}
export class DiffState {
    static fromDiffResult(result) {
        return new DiffState(result.changes.map(c => new DiffMapping(c)), result.moves || [], result.identical, result.quitEarly);
    }
    constructor(mappings, movedTexts, identical, quitEarly) {
        this.mappings = mappings;
        this.movedTexts = movedTexts;
        this.identical = identical;
        this.quitEarly = quitEarly;
    }
}
export class DiffMapping {
    constructor(lineRangeMapping) {
        this.lineRangeMapping = lineRangeMapping;
        /*
        readonly movedTo: MovedText | undefined,
        readonly movedFrom: MovedText | undefined,

        if (movedTo) {
            assertFn(() =>
                movedTo.lineRangeMapping.modifiedRange.equals(lineRangeMapping.modifiedRange)
                && lineRangeMapping.originalRange.isEmpty
                && !movedFrom
            );
        } else if (movedFrom) {
            assertFn(() =>
                movedFrom.lineRangeMapping.originalRange.equals(lineRangeMapping.originalRange)
                && lineRangeMapping.modifiedRange.isEmpty
                && !movedTo
            );
        }
        */
    }
}
export class UnchangedRegion {
    static fromDiffs(changes, originalLineCount, modifiedLineCount, minHiddenLineCount, minContext) {
        const inversedMappings = DetailedLineRangeMapping.inverse(changes, originalLineCount, modifiedLineCount);
        const result = [];
        for (const mapping of inversedMappings) {
            let origStart = mapping.original.startLineNumber;
            let modStart = mapping.modified.startLineNumber;
            let length = mapping.original.length;
            const atStart = origStart === 1 && modStart === 1;
            const atEnd = origStart + length === originalLineCount + 1 && modStart + length === modifiedLineCount + 1;
            if ((atStart || atEnd) && length >= minContext + minHiddenLineCount) {
                if (atStart && !atEnd) {
                    length -= minContext;
                }
                if (atEnd && !atStart) {
                    origStart += minContext;
                    modStart += minContext;
                    length -= minContext;
                }
                result.push(new UnchangedRegion(origStart, modStart, length, 0, 0));
            }
            else if (length >= minContext * 2 + minHiddenLineCount) {
                origStart += minContext;
                modStart += minContext;
                length -= minContext * 2;
                result.push(new UnchangedRegion(origStart, modStart, length, 0, 0));
            }
        }
        return result;
    }
    get originalUnchangedRange() {
        return LineRange.ofLength(this.originalLineNumber, this.lineCount);
    }
    get modifiedUnchangedRange() {
        return LineRange.ofLength(this.modifiedLineNumber, this.lineCount);
    }
    constructor(originalLineNumber, modifiedLineNumber, lineCount, visibleLineCountTop, visibleLineCountBottom) {
        this.originalLineNumber = originalLineNumber;
        this.modifiedLineNumber = modifiedLineNumber;
        this.lineCount = lineCount;
        this._visibleLineCountTop = observableValue(this, 0);
        this.visibleLineCountTop = this._visibleLineCountTop;
        this._visibleLineCountBottom = observableValue(this, 0);
        this.visibleLineCountBottom = this._visibleLineCountBottom;
        this._shouldHideControls = derived(this, reader => /** @description isVisible */ this.visibleLineCountTop.read(reader) + this.visibleLineCountBottom.read(reader) === this.lineCount && !this.isDragged.read(reader));
        this.isDragged = observableValue(this, undefined);
        const visibleLineCountTop2 = Math.max(Math.min(visibleLineCountTop, this.lineCount), 0);
        const visibleLineCountBottom2 = Math.max(Math.min(visibleLineCountBottom, this.lineCount - visibleLineCountTop), 0);
        softAssert(visibleLineCountTop === visibleLineCountTop2);
        softAssert(visibleLineCountBottom === visibleLineCountBottom2);
        this._visibleLineCountTop.set(visibleLineCountTop2, undefined);
        this._visibleLineCountBottom.set(visibleLineCountBottom2, undefined);
    }
    setVisibleRanges(visibleRanges, tx) {
        const result = [];
        const hiddenModified = new LineRangeSet(visibleRanges.map(r => r.modified)).subtractFrom(this.modifiedUnchangedRange);
        let originalStartLineNumber = this.originalLineNumber;
        let modifiedStartLineNumber = this.modifiedLineNumber;
        const modifiedEndLineNumberEx = this.modifiedLineNumber + this.lineCount;
        if (hiddenModified.ranges.length === 0) {
            this.showAll(tx);
            result.push(this);
        }
        else {
            let i = 0;
            for (const r of hiddenModified.ranges) {
                const isLast = i === hiddenModified.ranges.length - 1;
                i++;
                const length = (isLast ? modifiedEndLineNumberEx : r.endLineNumberExclusive) - modifiedStartLineNumber;
                const newR = new UnchangedRegion(originalStartLineNumber, modifiedStartLineNumber, length, 0, 0);
                newR.setHiddenModifiedRange(r, tx);
                result.push(newR);
                originalStartLineNumber = newR.originalUnchangedRange.endLineNumberExclusive;
                modifiedStartLineNumber = newR.modifiedUnchangedRange.endLineNumberExclusive;
            }
        }
        return result;
    }
    shouldHideControls(reader) {
        return this._shouldHideControls.read(reader);
    }
    getHiddenOriginalRange(reader) {
        return LineRange.ofLength(this.originalLineNumber + this._visibleLineCountTop.read(reader), this.lineCount - this._visibleLineCountTop.read(reader) - this._visibleLineCountBottom.read(reader));
    }
    getHiddenModifiedRange(reader) {
        return LineRange.ofLength(this.modifiedLineNumber + this._visibleLineCountTop.read(reader), this.lineCount - this._visibleLineCountTop.read(reader) - this._visibleLineCountBottom.read(reader));
    }
    setHiddenModifiedRange(range, tx) {
        const visibleLineCountTop = range.startLineNumber - this.modifiedLineNumber;
        const visibleLineCountBottom = (this.modifiedLineNumber + this.lineCount) - range.endLineNumberExclusive;
        this.setState(visibleLineCountTop, visibleLineCountBottom, tx);
    }
    getMaxVisibleLineCountTop() {
        return this.lineCount - this._visibleLineCountBottom.get();
    }
    getMaxVisibleLineCountBottom() {
        return this.lineCount - this._visibleLineCountTop.get();
    }
    showMoreAbove(count = 10, tx) {
        const maxVisibleLineCountTop = this.getMaxVisibleLineCountTop();
        this._visibleLineCountTop.set(Math.min(this._visibleLineCountTop.get() + count, maxVisibleLineCountTop), tx);
    }
    showMoreBelow(count = 10, tx) {
        const maxVisibleLineCountBottom = this.lineCount - this._visibleLineCountTop.get();
        this._visibleLineCountBottom.set(Math.min(this._visibleLineCountBottom.get() + count, maxVisibleLineCountBottom), tx);
    }
    showAll(tx) {
        this._visibleLineCountBottom.set(this.lineCount - this._visibleLineCountTop.get(), tx);
    }
    showModifiedLine(lineNumber, preference, tx) {
        const top = lineNumber + 1 - (this.modifiedLineNumber + this._visibleLineCountTop.get());
        const bottom = (this.modifiedLineNumber - this._visibleLineCountBottom.get() + this.lineCount) - lineNumber;
        if (preference === 0 /* RevealPreference.FromCloserSide */ && top < bottom || preference === 1 /* RevealPreference.FromTop */) {
            this._visibleLineCountTop.set(this._visibleLineCountTop.get() + top, tx);
        }
        else {
            this._visibleLineCountBottom.set(this._visibleLineCountBottom.get() + bottom, tx);
        }
    }
    showOriginalLine(lineNumber, preference, tx) {
        const top = lineNumber - this.originalLineNumber;
        const bottom = (this.originalLineNumber + this.lineCount) - lineNumber;
        if (preference === 0 /* RevealPreference.FromCloserSide */ && top < bottom || preference === 1 /* RevealPreference.FromTop */) {
            this._visibleLineCountTop.set(Math.min(this._visibleLineCountTop.get() + bottom - top, this.getMaxVisibleLineCountTop()), tx);
        }
        else {
            this._visibleLineCountBottom.set(Math.min(this._visibleLineCountBottom.get() + top - bottom, this.getMaxVisibleLineCountBottom()), tx);
        }
    }
    collapseAll(tx) {
        this._visibleLineCountTop.set(0, tx);
        this._visibleLineCountBottom.set(0, tx);
    }
    setState(visibleLineCountTop, visibleLineCountBottom, tx) {
        visibleLineCountTop = Math.max(Math.min(visibleLineCountTop, this.lineCount), 0);
        visibleLineCountBottom = Math.max(Math.min(visibleLineCountBottom, this.lineCount - visibleLineCountTop), 0);
        this._visibleLineCountTop.set(visibleLineCountTop, tx);
        this._visibleLineCountBottom.set(visibleLineCountBottom, tx);
    }
}
export var RevealPreference;
(function (RevealPreference) {
    RevealPreference[RevealPreference["FromCloserSide"] = 0] = "FromCloserSide";
    RevealPreference[RevealPreference["FromTop"] = 1] = "FromTop";
    RevealPreference[RevealPreference["FromBottom"] = 2] = "FromBottom";
})(RevealPreference || (RevealPreference = {}));
function applyOriginalEdits(diff, textEdits, originalTextModel, modifiedTextModel) {
    return undefined;
    /*
    TODO@hediet
    if (textEdits.length === 0) {
        return diff;
    }

    const diff2 = flip(diff);
    const diff3 = applyModifiedEdits(diff2, textEdits, modifiedTextModel, originalTextModel);
    if (!diff3) {
        return undefined;
    }
    return flip(diff3);*/
}
/*
function flip(diff: IDocumentDiff): IDocumentDiff {
    return {
        changes: diff.changes.map(c => c.flip()),
        moves: diff.moves.map(m => m.flip()),
        identical: diff.identical,
        quitEarly: diff.quitEarly,
    };
}
*/
function applyModifiedEdits(diff, textEdits, originalTextModel, modifiedTextModel) {
    return undefined;
    /*
    TODO@hediet
    if (textEdits.length === 0) {
        return diff;
    }
    if (diff.changes.some(c => !c.innerChanges) || diff.moves.length > 0) {
        // TODO support these cases
        return undefined;
    }

    const changes = applyModifiedEditsToLineRangeMappings(diff.changes, textEdits, originalTextModel, modifiedTextModel);

    const moves = diff.moves.map(m => {
        const newModifiedRange = applyEditToLineRange(m.lineRangeMapping.modified, textEdits);
        return newModifiedRange ? new MovedText(
            new SimpleLineRangeMapping(m.lineRangeMapping.original, newModifiedRange),
            applyModifiedEditsToLineRangeMappings(m.changes, textEdits, originalTextModel, modifiedTextModel),
        ) : undefined;
    }).filter(isDefined);

    return {
        identical: false,
        quitEarly: false,
        changes,
        moves,
    };*/
}
/*
function applyEditToLineRange(range: LineRange, textEdits: TextEditInfo[]): LineRange | undefined {
    let rangeStartLineNumber = range.startLineNumber;
    let rangeEndLineNumberEx = range.endLineNumberExclusive;

    for (let i = textEdits.length - 1; i >= 0; i--) {
        const textEdit = textEdits[i];
        const textEditStartLineNumber = lengthGetLineCount(textEdit.startOffset) + 1;
        const textEditEndLineNumber = lengthGetLineCount(textEdit.endOffset) + 1;
        const newLengthLineCount = lengthGetLineCount(textEdit.newLength);
        const delta = newLengthLineCount - (textEditEndLineNumber - textEditStartLineNumber);

        if (textEditEndLineNumber < rangeStartLineNumber) {
            // the text edit is before us
            rangeStartLineNumber += delta;
            rangeEndLineNumberEx += delta;
        } else if (textEditStartLineNumber > rangeEndLineNumberEx) {
            // the text edit is after us
            // NOOP
        } else if (textEditStartLineNumber < rangeStartLineNumber && rangeEndLineNumberEx < textEditEndLineNumber) {
            // the range is fully contained in the text edit
            return undefined;
        } else if (textEditStartLineNumber < rangeStartLineNumber && textEditEndLineNumber <= rangeEndLineNumberEx) {
            // the text edit ends inside our range
            rangeStartLineNumber = textEditEndLineNumber + 1;
            rangeStartLineNumber += delta;
            rangeEndLineNumberEx += delta;
        } else if (rangeStartLineNumber <= textEditStartLineNumber && textEditEndLineNumber < rangeStartLineNumber) {
            // the text edit starts inside our range
            rangeEndLineNumberEx = textEditStartLineNumber;
        } else {
            rangeEndLineNumberEx += delta;
        }
    }

    return new LineRange(rangeStartLineNumber, rangeEndLineNumberEx);
}

function applyModifiedEditsToLineRangeMappings(changes: readonly LineRangeMapping[], textEdits: TextEditInfo[], originalTextModel: ITextModel, modifiedTextModel: ITextModel): LineRangeMapping[] {
    const diffTextEdits = changes.flatMap(c => c.innerChanges!.map(c => new TextEditInfo(
        positionToLength(c.originalRange.getStartPosition()),
        positionToLength(c.originalRange.getEndPosition()),
        lengthOfRange(c.modifiedRange).toLength(),
    )));

    const combined = combineTextEditInfos(diffTextEdits, textEdits);

    let lastOriginalEndOffset = lengthZero;
    let lastModifiedEndOffset = lengthZero;
    const rangeMappings = combined.map(c => {
        const modifiedStartOffset = lengthAdd(lastModifiedEndOffset, lengthDiffNonNegative(lastOriginalEndOffset, c.startOffset));
        lastOriginalEndOffset = c.endOffset;
        lastModifiedEndOffset = lengthAdd(modifiedStartOffset, c.newLength);

        return new RangeMapping(
            Range.fromPositions(lengthToPosition(c.startOffset), lengthToPosition(c.endOffset)),
            Range.fromPositions(lengthToPosition(modifiedStartOffset), lengthToPosition(lastModifiedEndOffset)),
        );
    });

    const newChanges = lineRangeMappingFromRangeMappings(
        rangeMappings,
        originalTextModel.getLinesContent(),
        modifiedTextModel.getLinesContent(),
    );
    return newChanges;
}
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclZpZXdNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9kaWZmRWRpdG9yVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUEyRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDN08sT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ2hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RGLE9BQU8sRUFBd0IsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBR3JILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdoSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEZBQThGLENBQUM7QUFDNUgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEZBQTBGLENBQUM7QUFFaEks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QUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEksQ0FBQztJQUNGLENBQUM7SUFFTSxXQUFXLENBQUMsRUFBNEI7UUFDOUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVNLFFBQVEsQ0FBQyxtQkFBMkIsRUFBRSxzQkFBOEIsRUFBRSxFQUE0QjtRQUN4RyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2pGLHNCQUFzQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLENBQUMsU0FBUyxHQUFHLG1CQUFtQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0csSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLHNCQUFzQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBTixJQUFrQixnQkFJakI7QUFKRCxXQUFrQixnQkFBZ0I7SUFDakMsMkVBQWMsQ0FBQTtJQUNkLDZEQUFPLENBQUE7SUFDUCxtRUFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUppQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBSWpDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxJQUFtQixFQUFFLFNBQXlCLEVBQUUsaUJBQTZCLEVBQUUsaUJBQTZCO0lBQ3ZJLE9BQU8sU0FBUyxDQUFDO0lBQ2pCOzs7Ozs7Ozs7Ozt5QkFXcUI7QUFDdEIsQ0FBQztBQUNEOzs7Ozs7Ozs7RUFTRTtBQUNGLFNBQVMsa0JBQWtCLENBQUMsSUFBbUIsRUFBRSxTQUF5QixFQUFFLGlCQUE2QixFQUFFLGlCQUE2QjtJQUN2SSxPQUFPLFNBQVMsQ0FBQztJQUNqQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztRQXlCSTtBQUNMLENBQUM7QUFDRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQW1FRSJ9