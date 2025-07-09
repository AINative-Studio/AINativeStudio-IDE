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
import { $, addDisposableListener } from '../../../../../../base/browser/dom.js';
import { ArrayQueue } from '../../../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedWithStore, observableFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { assertIsDefined } from '../../../../../../base/common/types.js';
import { applyFontInfo } from '../../../../config/domFontInfo.js';
import { diffDeleteDecoration, diffRemoveIcon } from '../../registrations.contribution.js';
import { DiffMapping } from '../../diffEditorViewModel.js';
import { InlineDiffDeletedCodeMargin } from './inlineDiffDeletedCodeMargin.js';
import { LineSource, RenderOptions, renderLines } from './renderLines.js';
import { animatedObservable, joinCombine } from '../../utils.js';
import { LineRange } from '../../../../../common/core/lineRange.js';
import { Position } from '../../../../../common/core/position.js';
import { InlineDecoration } from '../../../../../common/viewModel.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { Range } from '../../../../../common/core/range.js';
/**
 * Ensures both editors have the same height by aligning unchanged lines.
 * In inline view mode, inserts viewzones to show deleted code from the original text model in the modified code editor.
 * Synchronizes scrolling.
 *
 * Make sure to add the view zones!
 */
let DiffEditorViewZones = class DiffEditorViewZones extends Disposable {
    constructor(_targetWindow, _editors, _diffModel, _options, _diffEditorWidget, _canIgnoreViewZoneUpdateEvent, _origViewZonesToIgnore, _modViewZonesToIgnore, _clipboardService, _contextMenuService) {
        super();
        this._targetWindow = _targetWindow;
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._diffEditorWidget = _diffEditorWidget;
        this._canIgnoreViewZoneUpdateEvent = _canIgnoreViewZoneUpdateEvent;
        this._origViewZonesToIgnore = _origViewZonesToIgnore;
        this._modViewZonesToIgnore = _modViewZonesToIgnore;
        this._clipboardService = _clipboardService;
        this._contextMenuService = _contextMenuService;
        this._originalTopPadding = observableValue(this, 0);
        this._originalScrollOffset = observableValue(this, 0);
        this._originalScrollOffsetAnimated = animatedObservable(this._targetWindow, this._originalScrollOffset, this._store);
        this._modifiedTopPadding = observableValue(this, 0);
        this._modifiedScrollOffset = observableValue(this, 0);
        this._modifiedScrollOffsetAnimated = animatedObservable(this._targetWindow, this._modifiedScrollOffset, this._store);
        const state = observableValue('invalidateAlignmentsState', 0);
        const updateImmediately = this._register(new RunOnceScheduler(() => {
            state.set(state.get() + 1, undefined);
        }, 0));
        this._register(this._editors.original.onDidChangeViewZones((_args) => { if (!this._canIgnoreViewZoneUpdateEvent()) {
            updateImmediately.schedule();
        } }));
        this._register(this._editors.modified.onDidChangeViewZones((_args) => { if (!this._canIgnoreViewZoneUpdateEvent()) {
            updateImmediately.schedule();
        } }));
        this._register(this._editors.original.onDidChangeConfiguration((args) => {
            if (args.hasChanged(152 /* EditorOption.wrappingInfo */) || args.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateImmediately.schedule();
            }
        }));
        this._register(this._editors.modified.onDidChangeConfiguration((args) => {
            if (args.hasChanged(152 /* EditorOption.wrappingInfo */) || args.hasChanged(68 /* EditorOption.lineHeight */)) {
                updateImmediately.schedule();
            }
        }));
        const originalModelTokenizationCompleted = this._diffModel.map(m => m ? observableFromEvent(this, m.model.original.onDidChangeTokens, () => m.model.original.tokenization.backgroundTokenizationState === 2 /* BackgroundTokenizationState.Completed */) : undefined).map((m, reader) => m?.read(reader));
        const alignments = derived((reader) => {
            /** @description alignments */
            const diffModel = this._diffModel.read(reader);
            const diff = diffModel?.diff.read(reader);
            if (!diffModel || !diff) {
                return null;
            }
            state.read(reader);
            const renderSideBySide = this._options.renderSideBySide.read(reader);
            const innerHunkAlignment = renderSideBySide;
            return computeRangeAlignment(this._editors.original, this._editors.modified, diff.mappings, this._origViewZonesToIgnore, this._modViewZonesToIgnore, innerHunkAlignment);
        });
        const alignmentsSyncedMovedText = derived((reader) => {
            /** @description alignmentsSyncedMovedText */
            const syncedMovedText = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            if (!syncedMovedText) {
                return null;
            }
            state.read(reader);
            const mappings = syncedMovedText.changes.map(c => new DiffMapping(c));
            // TODO dont include alignments outside syncedMovedText
            return computeRangeAlignment(this._editors.original, this._editors.modified, mappings, this._origViewZonesToIgnore, this._modViewZonesToIgnore, true);
        });
        function createFakeLinesDiv() {
            const r = document.createElement('div');
            r.className = 'diagonal-fill';
            return r;
        }
        const alignmentViewZonesDisposables = this._register(new DisposableStore());
        this.viewZones = derivedWithStore(this, (reader, store) => {
            alignmentViewZonesDisposables.clear();
            const alignmentsVal = alignments.read(reader) || [];
            const origViewZones = [];
            const modViewZones = [];
            const modifiedTopPaddingVal = this._modifiedTopPadding.read(reader);
            if (modifiedTopPaddingVal > 0) {
                modViewZones.push({
                    afterLineNumber: 0,
                    domNode: document.createElement('div'),
                    heightInPx: modifiedTopPaddingVal,
                    showInHiddenAreas: true,
                    suppressMouseDown: true,
                });
            }
            const originalTopPaddingVal = this._originalTopPadding.read(reader);
            if (originalTopPaddingVal > 0) {
                origViewZones.push({
                    afterLineNumber: 0,
                    domNode: document.createElement('div'),
                    heightInPx: originalTopPaddingVal,
                    showInHiddenAreas: true,
                    suppressMouseDown: true,
                });
            }
            const renderSideBySide = this._options.renderSideBySide.read(reader);
            const deletedCodeLineBreaksComputer = !renderSideBySide ? this._editors.modified._getViewModel()?.createLineBreaksComputer() : undefined;
            if (deletedCodeLineBreaksComputer) {
                const originalModel = this._editors.original.getModel();
                for (const a of alignmentsVal) {
                    if (a.diff) {
                        for (let i = a.originalRange.startLineNumber; i < a.originalRange.endLineNumberExclusive; i++) {
                            // `i` can be out of bound when the diff has not been updated yet.
                            // In this case, we do an early return.
                            // TODO@hediet: Fix this by applying the edit directly to the diff model, so that the diff is always valid.
                            if (i > originalModel.getLineCount()) {
                                return { orig: origViewZones, mod: modViewZones };
                            }
                            deletedCodeLineBreaksComputer?.addRequest(originalModel.getLineContent(i), null, null);
                        }
                    }
                }
            }
            const lineBreakData = deletedCodeLineBreaksComputer?.finalize() ?? [];
            let lineBreakDataIdx = 0;
            const modLineHeight = this._editors.modified.getOption(68 /* EditorOption.lineHeight */);
            const syncedMovedText = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            const mightContainNonBasicASCII = this._editors.original.getModel()?.mightContainNonBasicASCII() ?? false;
            const mightContainRTL = this._editors.original.getModel()?.mightContainRTL() ?? false;
            const renderOptions = RenderOptions.fromEditor(this._editors.modified);
            for (const a of alignmentsVal) {
                if (a.diff && !renderSideBySide && (!this._options.useTrueInlineDiffRendering.read(reader) || !allowsTrueInlineDiffRendering(a.diff))) {
                    if (!a.originalRange.isEmpty) {
                        originalModelTokenizationCompleted.read(reader); // Update view-zones once tokenization completes
                        const deletedCodeDomNode = document.createElement('div');
                        deletedCodeDomNode.classList.add('view-lines', 'line-delete', 'monaco-mouse-cursor-text');
                        const originalModel = this._editors.original.getModel();
                        // `a.originalRange` can be out of bound when the diff has not been updated yet.
                        // In this case, we do an early return.
                        // TODO@hediet: Fix this by applying the edit directly to the diff model, so that the diff is always valid.
                        if (a.originalRange.endLineNumberExclusive - 1 > originalModel.getLineCount()) {
                            return { orig: origViewZones, mod: modViewZones };
                        }
                        const source = new LineSource(a.originalRange.mapToLineArray(l => originalModel.tokenization.getLineTokens(l)), a.originalRange.mapToLineArray(_ => lineBreakData[lineBreakDataIdx++]), mightContainNonBasicASCII, mightContainRTL);
                        const decorations = [];
                        for (const i of a.diff.innerChanges || []) {
                            decorations.push(new InlineDecoration(i.originalRange.delta(-(a.diff.original.startLineNumber - 1)), diffDeleteDecoration.className, 0 /* InlineDecorationType.Regular */));
                        }
                        const result = renderLines(source, renderOptions, decorations, deletedCodeDomNode);
                        const marginDomNode = document.createElement('div');
                        marginDomNode.className = 'inline-deleted-margin-view-zone';
                        applyFontInfo(marginDomNode, renderOptions.fontInfo);
                        if (this._options.renderIndicators.read(reader)) {
                            for (let i = 0; i < result.heightInLines; i++) {
                                const marginElement = document.createElement('div');
                                marginElement.className = `delete-sign ${ThemeIcon.asClassName(diffRemoveIcon)}`;
                                marginElement.setAttribute('style', `position:absolute;top:${i * modLineHeight}px;width:${renderOptions.lineDecorationsWidth}px;height:${modLineHeight}px;right:0;`);
                                marginDomNode.appendChild(marginElement);
                            }
                        }
                        let zoneId = undefined;
                        alignmentViewZonesDisposables.add(new InlineDiffDeletedCodeMargin(() => assertIsDefined(zoneId), marginDomNode, this._editors.modified, a.diff, this._diffEditorWidget, result.viewLineCounts, this._editors.original.getModel(), this._contextMenuService, this._clipboardService));
                        for (let i = 0; i < result.viewLineCounts.length; i++) {
                            const count = result.viewLineCounts[i];
                            // Account for wrapped lines in the (collapsed) original editor (which doesn't wrap lines).
                            if (count > 1) {
                                origViewZones.push({
                                    afterLineNumber: a.originalRange.startLineNumber + i,
                                    domNode: createFakeLinesDiv(),
                                    heightInPx: (count - 1) * modLineHeight,
                                    showInHiddenAreas: true,
                                    suppressMouseDown: true,
                                });
                            }
                        }
                        modViewZones.push({
                            afterLineNumber: a.modifiedRange.startLineNumber - 1,
                            domNode: deletedCodeDomNode,
                            heightInPx: result.heightInLines * modLineHeight,
                            minWidthInPx: result.minWidthInPx,
                            marginDomNode,
                            setZoneId(id) { zoneId = id; },
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                    const marginDomNode = document.createElement('div');
                    marginDomNode.className = 'gutter-delete';
                    origViewZones.push({
                        afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: a.modifiedHeightInPx,
                        marginDomNode,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
                else {
                    const delta = a.modifiedHeightInPx - a.originalHeightInPx;
                    if (delta > 0) {
                        if (syncedMovedText?.lineRangeMapping.original.delta(-1).deltaLength(2).contains(a.originalRange.endLineNumberExclusive - 1)) {
                            continue;
                        }
                        origViewZones.push({
                            afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                            domNode: createFakeLinesDiv(),
                            heightInPx: delta,
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                    else {
                        if (syncedMovedText?.lineRangeMapping.modified.delta(-1).deltaLength(2).contains(a.modifiedRange.endLineNumberExclusive - 1)) {
                            continue;
                        }
                        function createViewZoneMarginArrow() {
                            const arrow = document.createElement('div');
                            arrow.className = 'arrow-revert-change ' + ThemeIcon.asClassName(Codicon.arrowRight);
                            store.add(addDisposableListener(arrow, 'mousedown', e => e.stopPropagation()));
                            store.add(addDisposableListener(arrow, 'click', e => {
                                e.stopPropagation();
                                _diffEditorWidget.revert(a.diff);
                            }));
                            return $('div', {}, arrow);
                        }
                        let marginDomNode = undefined;
                        if (a.diff && a.diff.modified.isEmpty && this._options.shouldRenderOldRevertArrows.read(reader)) {
                            marginDomNode = createViewZoneMarginArrow();
                        }
                        modViewZones.push({
                            afterLineNumber: a.modifiedRange.endLineNumberExclusive - 1,
                            domNode: createFakeLinesDiv(),
                            heightInPx: -delta,
                            marginDomNode,
                            showInHiddenAreas: true,
                            suppressMouseDown: true,
                        });
                    }
                }
            }
            for (const a of alignmentsSyncedMovedText.read(reader) ?? []) {
                if (!syncedMovedText?.lineRangeMapping.original.intersect(a.originalRange)
                    || !syncedMovedText?.lineRangeMapping.modified.intersect(a.modifiedRange)) {
                    // ignore unrelated alignments outside the synced moved text
                    continue;
                }
                const delta = a.modifiedHeightInPx - a.originalHeightInPx;
                if (delta > 0) {
                    origViewZones.push({
                        afterLineNumber: a.originalRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: delta,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
                else {
                    modViewZones.push({
                        afterLineNumber: a.modifiedRange.endLineNumberExclusive - 1,
                        domNode: createFakeLinesDiv(),
                        heightInPx: -delta,
                        showInHiddenAreas: true,
                        suppressMouseDown: true,
                    });
                }
            }
            return { orig: origViewZones, mod: modViewZones };
        });
        let ignoreChange = false;
        this._register(this._editors.original.onDidScrollChange(e => {
            if (e.scrollLeftChanged && !ignoreChange) {
                ignoreChange = true;
                this._editors.modified.setScrollLeft(e.scrollLeft);
                ignoreChange = false;
            }
        }));
        this._register(this._editors.modified.onDidScrollChange(e => {
            if (e.scrollLeftChanged && !ignoreChange) {
                ignoreChange = true;
                this._editors.original.setScrollLeft(e.scrollLeft);
                ignoreChange = false;
            }
        }));
        this._originalScrollTop = observableFromEvent(this._editors.original.onDidScrollChange, () => /** @description original.getScrollTop */ this._editors.original.getScrollTop());
        this._modifiedScrollTop = observableFromEvent(this._editors.modified.onDidScrollChange, () => /** @description modified.getScrollTop */ this._editors.modified.getScrollTop());
        // origExtraHeight + origOffset - origScrollTop = modExtraHeight + modOffset - modScrollTop
        // origScrollTop = origExtraHeight + origOffset - modExtraHeight - modOffset + modScrollTop
        // modScrollTop = modExtraHeight + modOffset - origExtraHeight - origOffset + origScrollTop
        // origOffset - modOffset = heightOfLines(1..Y) - heightOfLines(1..X)
        // origScrollTop >= 0, modScrollTop >= 0
        this._register(autorun(reader => {
            /** @description update scroll modified */
            const newScrollTopModified = this._originalScrollTop.read(reader)
                - (this._originalScrollOffsetAnimated.get() - this._modifiedScrollOffsetAnimated.read(reader))
                - (this._originalTopPadding.get() - this._modifiedTopPadding.read(reader));
            if (newScrollTopModified !== this._editors.modified.getScrollTop()) {
                this._editors.modified.setScrollTop(newScrollTopModified, 1 /* ScrollType.Immediate */);
            }
        }));
        this._register(autorun(reader => {
            /** @description update scroll original */
            const newScrollTopOriginal = this._modifiedScrollTop.read(reader)
                - (this._modifiedScrollOffsetAnimated.get() - this._originalScrollOffsetAnimated.read(reader))
                - (this._modifiedTopPadding.get() - this._originalTopPadding.read(reader));
            if (newScrollTopOriginal !== this._editors.original.getScrollTop()) {
                this._editors.original.setScrollTop(newScrollTopOriginal, 1 /* ScrollType.Immediate */);
            }
        }));
        this._register(autorun(reader => {
            /** @description update editor top offsets */
            const m = this._diffModel.read(reader)?.movedTextToCompare.read(reader);
            let deltaOrigToMod = 0;
            if (m) {
                const trueTopOriginal = this._editors.original.getTopForLineNumber(m.lineRangeMapping.original.startLineNumber, true) - this._originalTopPadding.get();
                const trueTopModified = this._editors.modified.getTopForLineNumber(m.lineRangeMapping.modified.startLineNumber, true) - this._modifiedTopPadding.get();
                deltaOrigToMod = trueTopModified - trueTopOriginal;
            }
            if (deltaOrigToMod > 0) {
                this._modifiedTopPadding.set(0, undefined);
                this._originalTopPadding.set(deltaOrigToMod, undefined);
            }
            else if (deltaOrigToMod < 0) {
                this._modifiedTopPadding.set(-deltaOrigToMod, undefined);
                this._originalTopPadding.set(0, undefined);
            }
            else {
                setTimeout(() => {
                    this._modifiedTopPadding.set(0, undefined);
                    this._originalTopPadding.set(0, undefined);
                }, 400);
            }
            if (this._editors.modified.hasTextFocus()) {
                this._originalScrollOffset.set(this._modifiedScrollOffset.get() - deltaOrigToMod, undefined, true);
            }
            else {
                this._modifiedScrollOffset.set(this._originalScrollOffset.get() + deltaOrigToMod, undefined, true);
            }
        }));
    }
};
DiffEditorViewZones = __decorate([
    __param(8, IClipboardService),
    __param(9, IContextMenuService)
], DiffEditorViewZones);
export { DiffEditorViewZones };
function computeRangeAlignment(originalEditor, modifiedEditor, diffs, originalEditorAlignmentViewZones, modifiedEditorAlignmentViewZones, innerHunkAlignment) {
    const originalLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(originalEditor, originalEditorAlignmentViewZones));
    const modifiedLineHeightOverrides = new ArrayQueue(getAdditionalLineHeights(modifiedEditor, modifiedEditorAlignmentViewZones));
    const origLineHeight = originalEditor.getOption(68 /* EditorOption.lineHeight */);
    const modLineHeight = modifiedEditor.getOption(68 /* EditorOption.lineHeight */);
    const result = [];
    let lastOriginalLineNumber = 0;
    let lastModifiedLineNumber = 0;
    function handleAlignmentsOutsideOfDiffs(untilOriginalLineNumberExclusive, untilModifiedLineNumberExclusive) {
        while (true) {
            let origNext = originalLineHeightOverrides.peek();
            let modNext = modifiedLineHeightOverrides.peek();
            if (origNext && origNext.lineNumber >= untilOriginalLineNumberExclusive) {
                origNext = undefined;
            }
            if (modNext && modNext.lineNumber >= untilModifiedLineNumberExclusive) {
                modNext = undefined;
            }
            if (!origNext && !modNext) {
                break;
            }
            const distOrig = origNext ? origNext.lineNumber - lastOriginalLineNumber : Number.MAX_VALUE;
            const distNext = modNext ? modNext.lineNumber - lastModifiedLineNumber : Number.MAX_VALUE;
            if (distOrig < distNext) {
                originalLineHeightOverrides.dequeue();
                modNext = {
                    lineNumber: origNext.lineNumber - lastOriginalLineNumber + lastModifiedLineNumber,
                    heightInPx: 0,
                };
            }
            else if (distOrig > distNext) {
                modifiedLineHeightOverrides.dequeue();
                origNext = {
                    lineNumber: modNext.lineNumber - lastModifiedLineNumber + lastOriginalLineNumber,
                    heightInPx: 0,
                };
            }
            else {
                originalLineHeightOverrides.dequeue();
                modifiedLineHeightOverrides.dequeue();
            }
            result.push({
                originalRange: LineRange.ofLength(origNext.lineNumber, 1),
                modifiedRange: LineRange.ofLength(modNext.lineNumber, 1),
                originalHeightInPx: origLineHeight + origNext.heightInPx,
                modifiedHeightInPx: modLineHeight + modNext.heightInPx,
                diff: undefined,
            });
        }
    }
    for (const m of diffs) {
        const c = m.lineRangeMapping;
        handleAlignmentsOutsideOfDiffs(c.original.startLineNumber, c.modified.startLineNumber);
        let first = true;
        let lastModLineNumber = c.modified.startLineNumber;
        let lastOrigLineNumber = c.original.startLineNumber;
        function emitAlignment(origLineNumberExclusive, modLineNumberExclusive, forceAlignment = false) {
            if (origLineNumberExclusive < lastOrigLineNumber || modLineNumberExclusive < lastModLineNumber) {
                return;
            }
            if (first) {
                first = false;
            }
            else if (!forceAlignment && (origLineNumberExclusive === lastOrigLineNumber || modLineNumberExclusive === lastModLineNumber)) {
                // This causes a re-alignment of an already aligned line.
                // However, we don't care for the final alignment.
                return;
            }
            const originalRange = new LineRange(lastOrigLineNumber, origLineNumberExclusive);
            const modifiedRange = new LineRange(lastModLineNumber, modLineNumberExclusive);
            if (originalRange.isEmpty && modifiedRange.isEmpty) {
                return;
            }
            const originalAdditionalHeight = originalLineHeightOverrides
                .takeWhile(v => v.lineNumber < origLineNumberExclusive)
                ?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;
            const modifiedAdditionalHeight = modifiedLineHeightOverrides
                .takeWhile(v => v.lineNumber < modLineNumberExclusive)
                ?.reduce((p, c) => p + c.heightInPx, 0) ?? 0;
            result.push({
                originalRange,
                modifiedRange,
                originalHeightInPx: originalRange.length * origLineHeight + originalAdditionalHeight,
                modifiedHeightInPx: modifiedRange.length * modLineHeight + modifiedAdditionalHeight,
                diff: m.lineRangeMapping,
            });
            lastOrigLineNumber = origLineNumberExclusive;
            lastModLineNumber = modLineNumberExclusive;
        }
        if (innerHunkAlignment) {
            for (const i of c.innerChanges || []) {
                if (i.originalRange.startColumn > 1 && i.modifiedRange.startColumn > 1) {
                    // There is some unmodified text on this line before the diff
                    emitAlignment(i.originalRange.startLineNumber, i.modifiedRange.startLineNumber);
                }
                const originalModel = originalEditor.getModel();
                // When the diff is invalid, the ranges might be out of bounds (this should be fixed in the diff model by applying edits directly).
                const maxColumn = i.originalRange.endLineNumber <= originalModel.getLineCount() ? originalModel.getLineMaxColumn(i.originalRange.endLineNumber) : Number.MAX_SAFE_INTEGER;
                if (i.originalRange.endColumn < maxColumn) {
                    // // There is some unmodified text on this line after the diff
                    emitAlignment(i.originalRange.endLineNumber, i.modifiedRange.endLineNumber);
                }
            }
        }
        emitAlignment(c.original.endLineNumberExclusive, c.modified.endLineNumberExclusive, true);
        lastOriginalLineNumber = c.original.endLineNumberExclusive;
        lastModifiedLineNumber = c.modified.endLineNumberExclusive;
    }
    handleAlignmentsOutsideOfDiffs(Number.MAX_VALUE, Number.MAX_VALUE);
    return result;
}
function getAdditionalLineHeights(editor, viewZonesToIgnore) {
    const viewZoneHeights = [];
    const wrappingZoneHeights = [];
    const hasWrapping = editor.getOption(152 /* EditorOption.wrappingInfo */).wrappingColumn !== -1;
    const coordinatesConverter = editor._getViewModel().coordinatesConverter;
    const editorLineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
    if (hasWrapping) {
        for (let i = 1; i <= editor.getModel().getLineCount(); i++) {
            const lineCount = coordinatesConverter.getModelLineViewLineCount(i);
            if (lineCount > 1) {
                wrappingZoneHeights.push({ lineNumber: i, heightInPx: editorLineHeight * (lineCount - 1) });
            }
        }
    }
    for (const w of editor.getWhitespaces()) {
        if (viewZonesToIgnore.has(w.id)) {
            continue;
        }
        const modelLineNumber = w.afterLineNumber === 0 ? 0 : coordinatesConverter.convertViewPositionToModelPosition(new Position(w.afterLineNumber, 1)).lineNumber;
        viewZoneHeights.push({ lineNumber: modelLineNumber, heightInPx: w.height });
    }
    const result = joinCombine(viewZoneHeights, wrappingZoneHeights, v => v.lineNumber, (v1, v2) => ({ lineNumber: v1.lineNumber, heightInPx: v1.heightInPx + v2.heightInPx }));
    return result;
}
export function allowsTrueInlineDiffRendering(mapping) {
    if (!mapping.innerChanges) {
        return false;
    }
    return mapping.innerChanges.every(c => (rangeIsSingleLine(c.modifiedRange) && rangeIsSingleLine(c.originalRange))
        || c.originalRange.equalsRange(new Range(1, 1, 1, 1)));
}
export function rangeIsSingleLine(range) {
    return range.startLineNumber === range.endLineNumber;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvclZpZXdab25lcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2RpZmZFZGl0b3JWaWV3Wm9uZXMvZGlmZkVkaXRvclZpZXdab25lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pGLE9BQU8sRUFBZSxPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3BKLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRixPQUFPLEVBQXVCLFdBQVcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWhGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUs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