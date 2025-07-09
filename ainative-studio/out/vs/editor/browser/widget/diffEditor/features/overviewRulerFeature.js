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
var OverviewRulerFeature_1;
import { EventType, addDisposableListener, addStandardDisposableListener, h } from '../../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { ScrollbarState } from '../../../../../base/browser/ui/scrollbar/scrollbarState.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableFromEvent, observableSignalFromEvent } from '../../../../../base/common/observable.js';
import { appendRemoveOnDispose } from '../utils.js';
import { Position } from '../../../../common/core/position.js';
import { OverviewRulerZone } from '../../../../common/viewModel/overviewZoneManager.js';
import { defaultInsertColor, defaultRemoveColor, diffInserted, diffOverviewRulerInserted, diffOverviewRulerRemoved, diffRemoved } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
let OverviewRulerFeature = class OverviewRulerFeature extends Disposable {
    static { OverviewRulerFeature_1 = this; }
    static { this.ONE_OVERVIEW_WIDTH = 15; }
    static { this.ENTIRE_DIFF_OVERVIEW_WIDTH = this.ONE_OVERVIEW_WIDTH * 2; }
    constructor(_editors, _rootElement, _diffModel, _rootWidth, _rootHeight, _modifiedEditorLayoutInfo, _themeService) {
        super();
        this._editors = _editors;
        this._rootElement = _rootElement;
        this._diffModel = _diffModel;
        this._rootWidth = _rootWidth;
        this._rootHeight = _rootHeight;
        this._modifiedEditorLayoutInfo = _modifiedEditorLayoutInfo;
        this._themeService = _themeService;
        this.width = OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH;
        const currentColorTheme = observableFromEvent(this._themeService.onDidColorThemeChange, () => this._themeService.getColorTheme());
        const currentColors = derived(reader => {
            /** @description colors */
            const theme = currentColorTheme.read(reader);
            const insertColor = theme.getColor(diffOverviewRulerInserted) || (theme.getColor(diffInserted) || defaultInsertColor).transparent(2);
            const removeColor = theme.getColor(diffOverviewRulerRemoved) || (theme.getColor(diffRemoved) || defaultRemoveColor).transparent(2);
            return { insertColor, removeColor };
        });
        const viewportDomElement = createFastDomNode(document.createElement('div'));
        viewportDomElement.setClassName('diffViewport');
        viewportDomElement.setPosition('absolute');
        const diffOverviewRoot = h('div.diffOverview', {
            style: { position: 'absolute', top: '0px', width: OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH + 'px' }
        }).root;
        this._register(appendRemoveOnDispose(diffOverviewRoot, viewportDomElement.domNode));
        this._register(addStandardDisposableListener(diffOverviewRoot, EventType.POINTER_DOWN, (e) => {
            this._editors.modified.delegateVerticalScrollbarPointerDown(e);
        }));
        this._register(addDisposableListener(diffOverviewRoot, EventType.MOUSE_WHEEL, (e) => {
            this._editors.modified.delegateScrollFromMouseWheelEvent(e);
        }, { passive: false }));
        this._register(appendRemoveOnDispose(this._rootElement, diffOverviewRoot));
        this._register(autorunWithStore((reader, store) => {
            /** @description recreate overview rules when model changes */
            const m = this._diffModel.read(reader);
            const originalOverviewRuler = this._editors.original.createOverviewRuler('original diffOverviewRuler');
            if (originalOverviewRuler) {
                store.add(originalOverviewRuler);
                store.add(appendRemoveOnDispose(diffOverviewRoot, originalOverviewRuler.getDomNode()));
            }
            const modifiedOverviewRuler = this._editors.modified.createOverviewRuler('modified diffOverviewRuler');
            if (modifiedOverviewRuler) {
                store.add(modifiedOverviewRuler);
                store.add(appendRemoveOnDispose(diffOverviewRoot, modifiedOverviewRuler.getDomNode()));
            }
            if (!originalOverviewRuler || !modifiedOverviewRuler) {
                // probably no model
                return;
            }
            const origViewZonesChanged = observableSignalFromEvent('viewZoneChanged', this._editors.original.onDidChangeViewZones);
            const modViewZonesChanged = observableSignalFromEvent('viewZoneChanged', this._editors.modified.onDidChangeViewZones);
            const origHiddenRangesChanged = observableSignalFromEvent('hiddenRangesChanged', this._editors.original.onDidChangeHiddenAreas);
            const modHiddenRangesChanged = observableSignalFromEvent('hiddenRangesChanged', this._editors.modified.onDidChangeHiddenAreas);
            store.add(autorun(reader => {
                /** @description set overview ruler zones */
                origViewZonesChanged.read(reader);
                modViewZonesChanged.read(reader);
                origHiddenRangesChanged.read(reader);
                modHiddenRangesChanged.read(reader);
                const colors = currentColors.read(reader);
                const diff = m?.diff.read(reader)?.mappings;
                function createZones(ranges, color, editor) {
                    const vm = editor._getViewModel();
                    if (!vm) {
                        return [];
                    }
                    return ranges
                        .filter(d => d.length > 0)
                        .map(r => {
                        const start = vm.coordinatesConverter.convertModelPositionToViewPosition(new Position(r.startLineNumber, 1));
                        const end = vm.coordinatesConverter.convertModelPositionToViewPosition(new Position(r.endLineNumberExclusive, 1));
                        // By computing the lineCount, we won't ask the view model later for the bottom vertical position.
                        // (The view model will take into account the alignment viewzones, which will give
                        // modifications and deletetions always the same height.)
                        const lineCount = end.lineNumber - start.lineNumber;
                        return new OverviewRulerZone(start.lineNumber, end.lineNumber, lineCount, color.toString());
                    });
                }
                const originalZones = createZones((diff || []).map(d => d.lineRangeMapping.original), colors.removeColor, this._editors.original);
                const modifiedZones = createZones((diff || []).map(d => d.lineRangeMapping.modified), colors.insertColor, this._editors.modified);
                originalOverviewRuler?.setZones(originalZones);
                modifiedOverviewRuler?.setZones(modifiedZones);
            }));
            store.add(autorun(reader => {
                /** @description layout overview ruler */
                const height = this._rootHeight.read(reader);
                const width = this._rootWidth.read(reader);
                const layoutInfo = this._modifiedEditorLayoutInfo.read(reader);
                if (layoutInfo) {
                    const freeSpace = OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH - 2 * OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH;
                    originalOverviewRuler.setLayout({
                        top: 0,
                        height: height,
                        right: freeSpace + OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH,
                        width: OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH,
                    });
                    modifiedOverviewRuler.setLayout({
                        top: 0,
                        height: height,
                        right: 0,
                        width: OverviewRulerFeature_1.ONE_OVERVIEW_WIDTH,
                    });
                    const scrollTop = this._editors.modifiedScrollTop.read(reader);
                    const scrollHeight = this._editors.modifiedScrollHeight.read(reader);
                    const scrollBarOptions = this._editors.modified.getOption(108 /* EditorOption.scrollbar */);
                    const state = new ScrollbarState(scrollBarOptions.verticalHasArrows ? scrollBarOptions.arrowSize : 0, scrollBarOptions.verticalScrollbarSize, 0, layoutInfo.height, scrollHeight, scrollTop);
                    viewportDomElement.setTop(state.getSliderPosition());
                    viewportDomElement.setHeight(state.getSliderSize());
                }
                else {
                    viewportDomElement.setTop(0);
                    viewportDomElement.setHeight(0);
                }
                diffOverviewRoot.style.height = height + 'px';
                diffOverviewRoot.style.left = (width - OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH) + 'px';
                viewportDomElement.setWidth(OverviewRulerFeature_1.ENTIRE_DIFF_OVERVIEW_WIDTH);
            }));
        }));
    }
};
OverviewRulerFeature = OverviewRulerFeature_1 = __decorate([
    __param(6, IThemeService)
], OverviewRulerFeature);
export { OverviewRulerFeature };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdSdWxlckZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZmVhdHVyZXMvb3ZlcnZpZXdSdWxlckZlYXR1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUscUJBQXFCLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDeEgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQWUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBSTNKLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUdwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBRSxXQUFXLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMvTCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFOUUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVOzthQUMzQix1QkFBa0IsR0FBRyxFQUFFLEFB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