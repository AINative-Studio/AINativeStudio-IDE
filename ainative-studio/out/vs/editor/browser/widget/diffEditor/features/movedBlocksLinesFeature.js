/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h } from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Action } from '../../../../../base/common/actions.js';
import { booleanComparator, compareBy, numberComparator, tieBreakComparators } from '../../../../../base/common/arrays.js';
import { findMaxIdx } from '../../../../../base/common/arraysFind.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunHandleChanges, autorunWithStore, constObservable, derived, derivedWithStore, observableFromEvent, observableSignalFromEvent, observableValue, recomputeInitiallyAndOnChange } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { PlaceholderViewZone, ViewZoneOverlayWidget, applyStyle, applyViewZones } from '../utils.js';
import { OffsetRange, OffsetRangeSet } from '../../../../common/core/offsetRange.js';
import { localize } from '../../../../../nls.js';
export class MovedBlocksLinesFeature extends Disposable {
    static { this.movedCodeBlockPadding = 4; }
    constructor(_rootElement, _diffModel, _originalEditorLayoutInfo, _modifiedEditorLayoutInfo, _editors) {
        super();
        this._rootElement = _rootElement;
        this._diffModel = _diffModel;
        this._originalEditorLayoutInfo = _originalEditorLayoutInfo;
        this._modifiedEditorLayoutInfo = _modifiedEditorLayoutInfo;
        this._editors = _editors;
        this._originalScrollTop = observableFromEvent(this, this._editors.original.onDidScrollChange, () => this._editors.original.getScrollTop());
        this._modifiedScrollTop = observableFromEvent(this, this._editors.modified.onDidScrollChange, () => this._editors.modified.getScrollTop());
        this._viewZonesChanged = observableSignalFromEvent('onDidChangeViewZones', this._editors.modified.onDidChangeViewZones);
        this.width = observableValue(this, 0);
        this._modifiedViewZonesChangedSignal = observableSignalFromEvent('modified.onDidChangeViewZones', this._editors.modified.onDidChangeViewZones);
        this._originalViewZonesChangedSignal = observableSignalFromEvent('original.onDidChangeViewZones', this._editors.original.onDidChangeViewZones);
        this._state = derivedWithStore(this, (reader, store) => {
            /** @description state */
            this._element.replaceChildren();
            const model = this._diffModel.read(reader);
            const moves = model?.diff.read(reader)?.movedTexts;
            if (!moves || moves.length === 0) {
                this.width.set(0, undefined);
                return;
            }
            this._viewZonesChanged.read(reader);
            const infoOrig = this._originalEditorLayoutInfo.read(reader);
            const infoMod = this._modifiedEditorLayoutInfo.read(reader);
            if (!infoOrig || !infoMod) {
                this.width.set(0, undefined);
                return;
            }
            this._modifiedViewZonesChangedSignal.read(reader);
            this._originalViewZonesChangedSignal.read(reader);
            const lines = moves.map((move) => {
                function computeLineStart(range, editor) {
                    const t1 = editor.getTopForLineNumber(range.startLineNumber, true);
                    const t2 = editor.getTopForLineNumber(range.endLineNumberExclusive, true);
                    return (t1 + t2) / 2;
                }
                const start = computeLineStart(move.lineRangeMapping.original, this._editors.original);
                const startOffset = this._originalScrollTop.read(reader);
                const end = computeLineStart(move.lineRangeMapping.modified, this._editors.modified);
                const endOffset = this._modifiedScrollTop.read(reader);
                const from = start - startOffset;
                const to = end - endOffset;
                const top = Math.min(start, end);
                const bottom = Math.max(start, end);
                return { range: new OffsetRange(top, bottom), from, to, fromWithoutScroll: start, toWithoutScroll: end, move };
            });
            lines.sort(tieBreakComparators(compareBy(l => l.fromWithoutScroll > l.toWithoutScroll, booleanComparator), compareBy(l => l.fromWithoutScroll > l.toWithoutScroll ? l.fromWithoutScroll : -l.toWithoutScroll, numberComparator)));
            const layout = LinesLayout.compute(lines.map(l => l.range));
            const padding = 10;
            const lineAreaLeft = infoOrig.verticalScrollbarWidth;
            const lineAreaWidth = (layout.getTrackCount() - 1) * 10 + padding * 2;
            const width = lineAreaLeft + lineAreaWidth + (infoMod.contentLeft - MovedBlocksLinesFeature.movedCodeBlockPadding);
            let idx = 0;
            for (const line of lines) {
                const track = layout.getTrack(idx);
                const verticalY = lineAreaLeft + padding + track * 10;
                const arrowHeight = 15;
                const arrowWidth = 15;
                const right = width;
                const rectWidth = infoMod.glyphMarginWidth + infoMod.lineNumbersWidth;
                const rectHeight = 18;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.classList.add('arrow-rectangle');
                rect.setAttribute('x', `${right - rectWidth}`);
                rect.setAttribute('y', `${line.to - rectHeight / 2}`);
                rect.setAttribute('width', `${rectWidth}`);
                rect.setAttribute('height', `${rectHeight}`);
                this._element.appendChild(rect);
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${0} ${line.from} L ${verticalY} ${line.from} L ${verticalY} ${line.to} L ${right - arrowWidth} ${line.to}`);
                path.setAttribute('fill', 'none');
                g.appendChild(path);
                const arrowRight = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                arrowRight.classList.add('arrow');
                store.add(autorun(reader => {
                    path.classList.toggle('currentMove', line.move === model.activeMovedText.read(reader));
                    arrowRight.classList.toggle('currentMove', line.move === model.activeMovedText.read(reader));
                }));
                arrowRight.setAttribute('points', `${right - arrowWidth},${line.to - arrowHeight / 2} ${right},${line.to} ${right - arrowWidth},${line.to + arrowHeight / 2}`);
                g.appendChild(arrowRight);
                this._element.appendChild(g);
                /*
                TODO@hediet
                path.addEventListener('mouseenter', () => {
                    model.setHoveredMovedText(line.move);
                });
                path.addEventListener('mouseleave', () => {
                    model.setHoveredMovedText(undefined);
                });*/
                idx++;
            }
            this.width.set(lineAreaWidth, undefined);
        });
        this._element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._element.setAttribute('class', 'moved-blocks-lines');
        this._rootElement.appendChild(this._element);
        this._register(toDisposable(() => this._element.remove()));
        this._register(autorun(reader => {
            /** @description update moved blocks lines positioning */
            const info = this._originalEditorLayoutInfo.read(reader);
            const info2 = this._modifiedEditorLayoutInfo.read(reader);
            if (!info || !info2) {
                return;
            }
            this._element.style.left = `${info.width - info.verticalScrollbarWidth}px`;
            this._element.style.height = `${info.height}px`;
            this._element.style.width = `${info.verticalScrollbarWidth + info.contentLeft - MovedBlocksLinesFeature.movedCodeBlockPadding + this.width.read(reader)}px`;
        }));
        this._register(recomputeInitiallyAndOnChange(this._state));
        const movedBlockViewZones = derived(reader => {
            const model = this._diffModel.read(reader);
            const d = model?.diff.read(reader);
            if (!d) {
                return [];
            }
            return d.movedTexts.map(move => ({
                move,
                original: new PlaceholderViewZone(constObservable(move.lineRangeMapping.original.startLineNumber - 1), 18),
                modified: new PlaceholderViewZone(constObservable(move.lineRangeMapping.modified.startLineNumber - 1), 18),
            }));
        });
        this._register(applyViewZones(this._editors.original, movedBlockViewZones.map(zones => /** @description movedBlockViewZones.original */ zones.map(z => z.original))));
        this._register(applyViewZones(this._editors.modified, movedBlockViewZones.map(zones => /** @description movedBlockViewZones.modified */ zones.map(z => z.modified))));
        this._register(autorunWithStore((reader, store) => {
            const blocks = movedBlockViewZones.read(reader);
            for (const b of blocks) {
                store.add(new MovedBlockOverlayWidget(this._editors.original, b.original, b.move, 'original', this._diffModel.get()));
                store.add(new MovedBlockOverlayWidget(this._editors.modified, b.modified, b.move, 'modified', this._diffModel.get()));
            }
        }));
        const originalHasFocus = observableSignalFromEvent('original.onDidFocusEditorWidget', e => this._editors.original.onDidFocusEditorWidget(() => setTimeout(() => e(undefined), 0)));
        const modifiedHasFocus = observableSignalFromEvent('modified.onDidFocusEditorWidget', e => this._editors.modified.onDidFocusEditorWidget(() => setTimeout(() => e(undefined), 0)));
        let lastChangedEditor = 'modified';
        this._register(autorunHandleChanges({
            createEmptyChangeSummary: () => undefined,
            handleChange: (ctx, summary) => {
                if (ctx.didChange(originalHasFocus)) {
                    lastChangedEditor = 'original';
                }
                if (ctx.didChange(modifiedHasFocus)) {
                    lastChangedEditor = 'modified';
                }
                return true;
            }
        }, reader => {
            /** @description MovedBlocksLines.setActiveMovedTextFromCursor */
            originalHasFocus.read(reader);
            modifiedHasFocus.read(reader);
            const m = this._diffModel.read(reader);
            if (!m) {
                return;
            }
            const diff = m.diff.read(reader);
            let movedText = undefined;
            if (diff && lastChangedEditor === 'original') {
                const originalPos = this._editors.originalCursor.read(reader);
                if (originalPos) {
                    movedText = diff.movedTexts.find(m => m.lineRangeMapping.original.contains(originalPos.lineNumber));
                }
            }
            if (diff && lastChangedEditor === 'modified') {
                const modifiedPos = this._editors.modifiedCursor.read(reader);
                if (modifiedPos) {
                    movedText = diff.movedTexts.find(m => m.lineRangeMapping.modified.contains(modifiedPos.lineNumber));
                }
            }
            if (movedText !== m.movedTextToCompare.get()) {
                m.movedTextToCompare.set(undefined, undefined);
            }
            m.setActiveMovedText(movedText);
        }));
    }
}
class LinesLayout {
    static compute(lines) {
        const setsPerTrack = [];
        const trackPerLineIdx = [];
        for (const line of lines) {
            let trackIdx = setsPerTrack.findIndex(set => !set.intersectsStrict(line));
            if (trackIdx === -1) {
                const maxTrackCount = 6;
                if (setsPerTrack.length >= maxTrackCount) {
                    trackIdx = findMaxIdx(setsPerTrack, compareBy(set => set.intersectWithRangeLength(line), numberComparator));
                }
                else {
                    trackIdx = setsPerTrack.length;
                    setsPerTrack.push(new OffsetRangeSet());
                }
            }
            setsPerTrack[trackIdx].addRange(line);
            trackPerLineIdx.push(trackIdx);
        }
        return new LinesLayout(setsPerTrack.length, trackPerLineIdx);
    }
    constructor(_trackCount, trackPerLineIdx) {
        this._trackCount = _trackCount;
        this.trackPerLineIdx = trackPerLineIdx;
    }
    getTrack(lineIdx) {
        return this.trackPerLineIdx[lineIdx];
    }
    getTrackCount() {
        return this._trackCount;
    }
}
class MovedBlockOverlayWidget extends ViewZoneOverlayWidget {
    constructor(_editor, _viewZone, _move, _kind, _diffModel) {
        const root = h('div.diff-hidden-lines-widget');
        super(_editor, _viewZone, root.root);
        this._editor = _editor;
        this._move = _move;
        this._kind = _kind;
        this._diffModel = _diffModel;
        this._nodes = h('div.diff-moved-code-block', { style: { marginRight: '4px' } }, [
            h('div.text-content@textContent'),
            h('div.action-bar@actionBar'),
        ]);
        root.root.appendChild(this._nodes.root);
        const editorLayout = observableFromEvent(this._editor.onDidLayoutChange, () => this._editor.getLayoutInfo());
        this._register(applyStyle(this._nodes.root, {
            paddingRight: editorLayout.map(l => l.verticalScrollbarWidth)
        }));
        let text;
        if (_move.changes.length > 0) {
            text = this._kind === 'original' ? localize('codeMovedToWithChanges', 'Code moved with changes to line {0}-{1}', this._move.lineRangeMapping.modified.startLineNumber, this._move.lineRangeMapping.modified.endLineNumberExclusive - 1) : localize('codeMovedFromWithChanges', 'Code moved with changes from line {0}-{1}', this._move.lineRangeMapping.original.startLineNumber, this._move.lineRangeMapping.original.endLineNumberExclusive - 1);
        }
        else {
            text = this._kind === 'original' ? localize('codeMovedTo', 'Code moved to line {0}-{1}', this._move.lineRangeMapping.modified.startLineNumber, this._move.lineRangeMapping.modified.endLineNumberExclusive - 1) : localize('codeMovedFrom', 'Code moved from line {0}-{1}', this._move.lineRangeMapping.original.startLineNumber, this._move.lineRangeMapping.original.endLineNumberExclusive - 1);
        }
        const actionBar = this._register(new ActionBar(this._nodes.actionBar, {
            highlightToggledItems: true,
        }));
        const caption = new Action('', text, '', false);
        actionBar.push(caption, { icon: false, label: true });
        const actionCompare = new Action('', 'Compare', ThemeIcon.asClassName(Codicon.compareChanges), true, () => {
            this._editor.focus();
            this._diffModel.movedTextToCompare.set(this._diffModel.movedTextToCompare.get() === _move ? undefined : this._move, undefined);
        });
        this._register(autorun(reader => {
            const isActive = this._diffModel.movedTextToCompare.read(reader) === _move;
            actionCompare.checked = isActive;
        }));
        actionBar.push(actionCompare, { icon: false, label: true });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZWRCbG9ja3NMaW5lc0ZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZmVhdHVyZXMvbW92ZWRCbG9ja3NMaW5lc0ZlYXR1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRixPQUFPLEVBQWUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcFEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBSXBFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBR3JHLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1B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