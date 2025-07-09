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
var HideUnchangedRegionsFeature_1;
import { $, addDisposableListener, getWindow, h, reset } from '../../../../../base/browser/dom.js';
import { renderIcon, renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, derived, derivedDisposable, derivedWithStore, observableValue, transaction } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { isDefined } from '../../../../../base/common/types.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LineRange } from '../../../../common/core/lineRange.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { SymbolKinds } from '../../../../common/languages.js';
import { observableCodeEditor } from '../../../observableCodeEditor.js';
import { PlaceholderViewZone, ViewZoneOverlayWidget, applyObservableDecorations, applyStyle } from '../utils.js';
/**
 * Make sure to add the view zones to the editor!
 */
let HideUnchangedRegionsFeature = class HideUnchangedRegionsFeature extends Disposable {
    static { HideUnchangedRegionsFeature_1 = this; }
    static { this._breadcrumbsSourceFactory = observableValue(HideUnchangedRegionsFeature_1, () => ({
        dispose() {
        },
        getBreadcrumbItems(startRange, reader) {
            return [];
        },
    })); }
    static setBreadcrumbsSourceFactory(factory) {
        this._breadcrumbsSourceFactory.set(factory, undefined);
    }
    get isUpdatingHiddenAreas() { return this._isUpdatingHiddenAreas; }
    constructor(_editors, _diffModel, _options, _instantiationService) {
        super();
        this._editors = _editors;
        this._diffModel = _diffModel;
        this._options = _options;
        this._instantiationService = _instantiationService;
        this._modifiedOutlineSource = derivedDisposable(this, (reader) => {
            const m = this._editors.modifiedModel.read(reader);
            const factory = HideUnchangedRegionsFeature_1._breadcrumbsSourceFactory.read(reader);
            return (!m || !factory) ? undefined : factory(m, this._instantiationService);
        });
        this._isUpdatingHiddenAreas = false;
        this._register(this._editors.original.onDidChangeCursorPosition(e => {
            if (e.reason === 1 /* CursorChangeReason.ContentFlush */) {
                return;
            }
            const m = this._diffModel.get();
            transaction(tx => {
                for (const s of this._editors.original.getSelections() || []) {
                    m?.ensureOriginalLineIsVisible(s.getStartPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                    m?.ensureOriginalLineIsVisible(s.getEndPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                }
            });
        }));
        this._register(this._editors.modified.onDidChangeCursorPosition(e => {
            if (e.reason === 1 /* CursorChangeReason.ContentFlush */) {
                return;
            }
            const m = this._diffModel.get();
            transaction(tx => {
                for (const s of this._editors.modified.getSelections() || []) {
                    m?.ensureModifiedLineIsVisible(s.getStartPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                    m?.ensureModifiedLineIsVisible(s.getEndPosition().lineNumber, 0 /* RevealPreference.FromCloserSide */, tx);
                }
            });
        }));
        const unchangedRegions = this._diffModel.map((m, reader) => {
            const regions = m?.unchangedRegions.read(reader) ?? [];
            if (regions.length === 1 && regions[0].modifiedLineNumber === 1 && regions[0].lineCount === this._editors.modifiedModel.read(reader)?.getLineCount()) {
                return [];
            }
            return regions;
        });
        this.viewZones = derivedWithStore(this, (reader, store) => {
            /** @description view Zones */
            const modifiedOutlineSource = this._modifiedOutlineSource.read(reader);
            if (!modifiedOutlineSource) {
                return { origViewZones: [], modViewZones: [] };
            }
            const origViewZones = [];
            const modViewZones = [];
            const sideBySide = this._options.renderSideBySide.read(reader);
            const compactMode = this._options.compactMode.read(reader);
            const curUnchangedRegions = unchangedRegions.read(reader);
            for (let i = 0; i < curUnchangedRegions.length; i++) {
                const r = curUnchangedRegions[i];
                if (r.shouldHideControls(reader)) {
                    continue;
                }
                if (compactMode && (i === 0 || i === curUnchangedRegions.length - 1)) {
                    continue;
                }
                if (compactMode) {
                    {
                        const d = derived(this, reader => /** @description hiddenOriginalRangeStart */ r.getHiddenOriginalRange(reader).startLineNumber - 1);
                        const origVz = new PlaceholderViewZone(d, 12);
                        origViewZones.push(origVz);
                        store.add(new CompactCollapsedCodeOverlayWidget(this._editors.original, origVz, r, !sideBySide));
                    }
                    {
                        const d = derived(this, reader => /** @description hiddenModifiedRangeStart */ r.getHiddenModifiedRange(reader).startLineNumber - 1);
                        const modViewZone = new PlaceholderViewZone(d, 12);
                        modViewZones.push(modViewZone);
                        store.add(new CompactCollapsedCodeOverlayWidget(this._editors.modified, modViewZone, r));
                    }
                }
                else {
                    {
                        const d = derived(this, reader => /** @description hiddenOriginalRangeStart */ r.getHiddenOriginalRange(reader).startLineNumber - 1);
                        const origVz = new PlaceholderViewZone(d, 24);
                        origViewZones.push(origVz);
                        store.add(new CollapsedCodeOverlayWidget(this._editors.original, origVz, r, r.originalUnchangedRange, !sideBySide, modifiedOutlineSource, l => this._diffModel.get().ensureModifiedLineIsVisible(l, 2 /* RevealPreference.FromBottom */, undefined), this._options));
                    }
                    {
                        const d = derived(this, reader => /** @description hiddenModifiedRangeStart */ r.getHiddenModifiedRange(reader).startLineNumber - 1);
                        const modViewZone = new PlaceholderViewZone(d, 24);
                        modViewZones.push(modViewZone);
                        store.add(new CollapsedCodeOverlayWidget(this._editors.modified, modViewZone, r, r.modifiedUnchangedRange, false, modifiedOutlineSource, l => this._diffModel.get().ensureModifiedLineIsVisible(l, 2 /* RevealPreference.FromBottom */, undefined), this._options));
                    }
                }
            }
            return { origViewZones, modViewZones, };
        });
        const unchangedLinesDecoration = {
            description: 'unchanged lines',
            className: 'diff-unchanged-lines',
            isWholeLine: true,
        };
        const unchangedLinesDecorationShow = {
            description: 'Fold Unchanged',
            glyphMarginHoverMessage: new MarkdownString(undefined, { isTrusted: true, supportThemeIcons: true })
                .appendMarkdown(localize('foldUnchanged', 'Fold Unchanged Region')),
            glyphMarginClassName: 'fold-unchanged ' + ThemeIcon.asClassName(Codicon.fold),
            zIndex: 10001,
        };
        this._register(applyObservableDecorations(this._editors.original, derived(this, reader => {
            /** @description decorations */
            const curUnchangedRegions = unchangedRegions.read(reader);
            const result = curUnchangedRegions.map(r => ({
                range: r.originalUnchangedRange.toInclusiveRange(),
                options: unchangedLinesDecoration,
            }));
            for (const r of curUnchangedRegions) {
                if (r.shouldHideControls(reader)) {
                    result.push({
                        range: Range.fromPositions(new Position(r.originalLineNumber, 1)),
                        options: unchangedLinesDecorationShow,
                    });
                }
            }
            return result;
        })));
        this._register(applyObservableDecorations(this._editors.modified, derived(this, reader => {
            /** @description decorations */
            const curUnchangedRegions = unchangedRegions.read(reader);
            const result = curUnchangedRegions.map(r => ({
                range: r.modifiedUnchangedRange.toInclusiveRange(),
                options: unchangedLinesDecoration,
            }));
            for (const r of curUnchangedRegions) {
                if (r.shouldHideControls(reader)) {
                    result.push({
                        range: LineRange.ofLength(r.modifiedLineNumber, 1).toInclusiveRange(),
                        options: unchangedLinesDecorationShow,
                    });
                }
            }
            return result;
        })));
        this._register(autorun((reader) => {
            /** @description update folded unchanged regions */
            const curUnchangedRegions = unchangedRegions.read(reader);
            this._isUpdatingHiddenAreas = true;
            try {
                this._editors.original.setHiddenAreas(curUnchangedRegions.map(r => r.getHiddenOriginalRange(reader).toInclusiveRange()).filter(isDefined));
                this._editors.modified.setHiddenAreas(curUnchangedRegions.map(r => r.getHiddenModifiedRange(reader).toInclusiveRange()).filter(isDefined));
            }
            finally {
                this._isUpdatingHiddenAreas = false;
            }
        }));
        this._register(this._editors.modified.onMouseUp(event => {
            if (!event.event.rightButton && event.target.position && event.target.element?.className.includes('fold-unchanged')) {
                const lineNumber = event.target.position.lineNumber;
                const model = this._diffModel.get();
                if (!model) {
                    return;
                }
                const region = model.unchangedRegions.get().find(r => r.modifiedUnchangedRange.includes(lineNumber));
                if (!region) {
                    return;
                }
                region.collapseAll(undefined);
                event.event.stopPropagation();
                event.event.preventDefault();
            }
        }));
        this._register(this._editors.original.onMouseUp(event => {
            if (!event.event.rightButton && event.target.position && event.target.element?.className.includes('fold-unchanged')) {
                const lineNumber = event.target.position.lineNumber;
                const model = this._diffModel.get();
                if (!model) {
                    return;
                }
                const region = model.unchangedRegions.get().find(r => r.originalUnchangedRange.includes(lineNumber));
                if (!region) {
                    return;
                }
                region.collapseAll(undefined);
                event.event.stopPropagation();
                event.event.preventDefault();
            }
        }));
    }
};
HideUnchangedRegionsFeature = HideUnchangedRegionsFeature_1 = __decorate([
    __param(3, IInstantiationService)
], HideUnchangedRegionsFeature);
export { HideUnchangedRegionsFeature };
class CompactCollapsedCodeOverlayWidget extends ViewZoneOverlayWidget {
    constructor(editor, _viewZone, _unchangedRegion, _hide = false) {
        const root = h('div.diff-hidden-lines-widget');
        super(editor, _viewZone, root.root);
        this._unchangedRegion = _unchangedRegion;
        this._hide = _hide;
        this._nodes = h('div.diff-hidden-lines-compact', [
            h('div.line-left', []),
            h('div.text@text', []),
            h('div.line-right', [])
        ]);
        root.root.appendChild(this._nodes.root);
        if (this._hide) {
            this._nodes.root.replaceChildren();
        }
        this._register(autorun(reader => {
            /** @description update labels */
            if (!this._hide) {
                const lineCount = this._unchangedRegion.getHiddenModifiedRange(reader).length;
                const linesHiddenText = localize('hiddenLines', '{0} hidden lines', lineCount);
                this._nodes.text.innerText = linesHiddenText;
            }
        }));
    }
}
class CollapsedCodeOverlayWidget extends ViewZoneOverlayWidget {
    constructor(_editor, _viewZone, _unchangedRegion, _unchangedRegionRange, _hide, _modifiedOutlineSource, _revealModifiedHiddenLine, _options) {
        const root = h('div.diff-hidden-lines-widget');
        super(_editor, _viewZone, root.root);
        this._editor = _editor;
        this._unchangedRegion = _unchangedRegion;
        this._unchangedRegionRange = _unchangedRegionRange;
        this._hide = _hide;
        this._modifiedOutlineSource = _modifiedOutlineSource;
        this._revealModifiedHiddenLine = _revealModifiedHiddenLine;
        this._options = _options;
        this._nodes = h('div.diff-hidden-lines', [
            h('div.top@top', { title: localize('diff.hiddenLines.top', 'Click or drag to show more above') }),
            h('div.center@content', { style: { display: 'flex' } }, [
                h('div@first', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: '0' } }, [$('a', { title: localize('showUnchangedRegion', 'Show Unchanged Region'), role: 'button', onclick: () => { this._unchangedRegion.showAll(undefined); } }, ...renderLabelWithIcons('$(unfold)'))]),
                h('div@others', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center' } }),
            ]),
            h('div.bottom@bottom', { title: localize('diff.bottom', 'Click or drag to show more below'), role: 'button' }),
        ]);
        root.root.appendChild(this._nodes.root);
        if (!this._hide) {
            this._register(applyStyle(this._nodes.first, { width: observableCodeEditor(this._editor).layoutInfoContentLeft }));
        }
        else {
            reset(this._nodes.first);
        }
        this._register(autorun(reader => {
            /** @description Update CollapsedCodeOverlayWidget canMove* css classes */
            const isFullyRevealed = this._unchangedRegion.visibleLineCountTop.read(reader) + this._unchangedRegion.visibleLineCountBottom.read(reader) === this._unchangedRegion.lineCount;
            this._nodes.bottom.classList.toggle('canMoveTop', !isFullyRevealed);
            this._nodes.bottom.classList.toggle('canMoveBottom', this._unchangedRegion.visibleLineCountBottom.read(reader) > 0);
            this._nodes.top.classList.toggle('canMoveTop', this._unchangedRegion.visibleLineCountTop.read(reader) > 0);
            this._nodes.top.classList.toggle('canMoveBottom', !isFullyRevealed);
            const isDragged = this._unchangedRegion.isDragged.read(reader);
            const domNode = this._editor.getDomNode();
            if (domNode) {
                domNode.classList.toggle('draggingUnchangedRegion', !!isDragged);
                if (isDragged === 'top') {
                    domNode.classList.toggle('canMoveTop', this._unchangedRegion.visibleLineCountTop.read(reader) > 0);
                    domNode.classList.toggle('canMoveBottom', !isFullyRevealed);
                }
                else if (isDragged === 'bottom') {
                    domNode.classList.toggle('canMoveTop', !isFullyRevealed);
                    domNode.classList.toggle('canMoveBottom', this._unchangedRegion.visibleLineCountBottom.read(reader) > 0);
                }
                else {
                    domNode.classList.toggle('canMoveTop', false);
                    domNode.classList.toggle('canMoveBottom', false);
                }
            }
        }));
        const editor = this._editor;
        this._register(addDisposableListener(this._nodes.top, 'mousedown', e => {
            if (e.button !== 0) {
                return;
            }
            this._nodes.top.classList.toggle('dragging', true);
            this._nodes.root.classList.toggle('dragging', true);
            e.preventDefault();
            const startTop = e.clientY;
            let didMove = false;
            const cur = this._unchangedRegion.visibleLineCountTop.get();
            this._unchangedRegion.isDragged.set('top', undefined);
            const window = getWindow(this._nodes.top);
            const mouseMoveListener = addDisposableListener(window, 'mousemove', e => {
                const currentTop = e.clientY;
                const delta = currentTop - startTop;
                didMove = didMove || Math.abs(delta) > 2;
                const lineDelta = Math.round(delta / editor.getOption(68 /* EditorOption.lineHeight */));
                const newVal = Math.max(0, Math.min(cur + lineDelta, this._unchangedRegion.getMaxVisibleLineCountTop()));
                this._unchangedRegion.visibleLineCountTop.set(newVal, undefined);
            });
            const mouseUpListener = addDisposableListener(window, 'mouseup', e => {
                if (!didMove) {
                    this._unchangedRegion.showMoreAbove(this._options.hideUnchangedRegionsRevealLineCount.get(), undefined);
                }
                this._nodes.top.classList.toggle('dragging', false);
                this._nodes.root.classList.toggle('dragging', false);
                this._unchangedRegion.isDragged.set(undefined, undefined);
                mouseMoveListener.dispose();
                mouseUpListener.dispose();
            });
        }));
        this._register(addDisposableListener(this._nodes.bottom, 'mousedown', e => {
            if (e.button !== 0) {
                return;
            }
            this._nodes.bottom.classList.toggle('dragging', true);
            this._nodes.root.classList.toggle('dragging', true);
            e.preventDefault();
            const startTop = e.clientY;
            let didMove = false;
            const cur = this._unchangedRegion.visibleLineCountBottom.get();
            this._unchangedRegion.isDragged.set('bottom', undefined);
            const window = getWindow(this._nodes.bottom);
            const mouseMoveListener = addDisposableListener(window, 'mousemove', e => {
                const currentTop = e.clientY;
                const delta = currentTop - startTop;
                didMove = didMove || Math.abs(delta) > 2;
                const lineDelta = Math.round(delta / editor.getOption(68 /* EditorOption.lineHeight */));
                const newVal = Math.max(0, Math.min(cur - lineDelta, this._unchangedRegion.getMaxVisibleLineCountBottom()));
                const top = this._unchangedRegionRange.endLineNumberExclusive > editor.getModel().getLineCount()
                    ? editor.getContentHeight()
                    : editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                this._unchangedRegion.visibleLineCountBottom.set(newVal, undefined);
                const top2 = this._unchangedRegionRange.endLineNumberExclusive > editor.getModel().getLineCount()
                    ? editor.getContentHeight()
                    : editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                editor.setScrollTop(editor.getScrollTop() + (top2 - top));
            });
            const mouseUpListener = addDisposableListener(window, 'mouseup', e => {
                this._unchangedRegion.isDragged.set(undefined, undefined);
                if (!didMove) {
                    const top = editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                    this._unchangedRegion.showMoreBelow(this._options.hideUnchangedRegionsRevealLineCount.get(), undefined);
                    const top2 = editor.getTopForLineNumber(this._unchangedRegionRange.endLineNumberExclusive);
                    editor.setScrollTop(editor.getScrollTop() + (top2 - top));
                }
                this._nodes.bottom.classList.toggle('dragging', false);
                this._nodes.root.classList.toggle('dragging', false);
                mouseMoveListener.dispose();
                mouseUpListener.dispose();
            });
        }));
        this._register(autorun(reader => {
            /** @description update labels */
            const children = [];
            if (!this._hide) {
                const lineCount = _unchangedRegion.getHiddenModifiedRange(reader).length;
                const linesHiddenText = localize('hiddenLines', '{0} hidden lines', lineCount);
                const span = $('span', { title: localize('diff.hiddenLines.expandAll', 'Double click to unfold') }, linesHiddenText);
                span.addEventListener('dblclick', e => {
                    if (e.button !== 0) {
                        return;
                    }
                    e.preventDefault();
                    this._unchangedRegion.showAll(undefined);
                });
                children.push(span);
                const range = this._unchangedRegion.getHiddenModifiedRange(reader);
                const items = this._modifiedOutlineSource.getBreadcrumbItems(range, reader);
                if (items.length > 0) {
                    children.push($('span', undefined, '\u00a0\u00a0|\u00a0\u00a0'));
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        const icon = SymbolKinds.toIcon(item.kind);
                        const divItem = h('div.breadcrumb-item', {
                            style: { display: 'flex', alignItems: 'center' },
                        }, [
                            renderIcon(icon),
                            '\u00a0',
                            item.name,
                            ...(i === items.length - 1
                                ? []
                                : [renderIcon(Codicon.chevronRight)])
                        ]).root;
                        children.push(divItem);
                        divItem.onclick = () => {
                            this._revealModifiedHiddenLine(item.startLineNumber);
                        };
                    }
                }
            }
            reset(this._nodes.others, ...children);
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlkZVVuY2hhbmdlZFJlZ2lvbnNGZWF0dXJlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL2ZlYXR1cmVzL2hpZGVVbmNoYW5nZWRSZWdpb25zRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMxRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQXdCLE9BQU8sRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JLLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFD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