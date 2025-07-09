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
import * as DOM from '../../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { Color } from '../../../../../base/common/color.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { defaultInsertColor, defaultRemoveColor, diffInserted, diffOverviewRulerInserted, diffOverviewRulerRemoved, diffRemoved } from '../../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, Themable } from '../../../../../platform/theme/common/themeService.js';
const MINIMUM_SLIDER_SIZE = 20;
let NotebookDiffOverviewRuler = class NotebookDiffOverviewRuler extends Themable {
    constructor(notebookEditor, width, container, themeService) {
        super(themeService);
        this.notebookEditor = notebookEditor;
        this.width = width;
        this._diffElementViewModels = [];
        this._lanes = 2;
        this._insertColor = null;
        this._removeColor = null;
        this._insertColorHex = null;
        this._removeColorHex = null;
        this._disposables = this._register(new DisposableStore());
        this._renderAnimationFrame = null;
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setPosition('relative');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        container.appendChild(this._domNode.domNode);
        this._overviewViewportDomElement = createFastDomNode(document.createElement('div'));
        this._overviewViewportDomElement.setClassName('diffViewport');
        this._overviewViewportDomElement.setPosition('absolute');
        this._overviewViewportDomElement.setWidth(width);
        container.appendChild(this._overviewViewportDomElement.domNode);
        this._register(PixelRatio.getInstance(DOM.getWindow(this._domNode.domNode)).onDidChange(() => {
            this._scheduleRender();
        }));
        this._register(this.themeService.onDidColorThemeChange(e => {
            const colorChanged = this.applyColors(e);
            if (colorChanged) {
                this._scheduleRender();
            }
        }));
        this.applyColors(this.themeService.getColorTheme());
        this._register(this.notebookEditor.onDidScroll(() => {
            this._renderOverviewViewport();
        }));
        this._register(DOM.addStandardDisposableListener(container, DOM.EventType.POINTER_DOWN, (e) => {
            this.notebookEditor.delegateVerticalScrollbarPointerDown(e);
        }));
    }
    applyColors(theme) {
        const newInsertColor = theme.getColor(diffOverviewRulerInserted) || (theme.getColor(diffInserted) || defaultInsertColor).transparent(2);
        const newRemoveColor = theme.getColor(diffOverviewRulerRemoved) || (theme.getColor(diffRemoved) || defaultRemoveColor).transparent(2);
        const hasChanges = !newInsertColor.equals(this._insertColor) || !newRemoveColor.equals(this._removeColor);
        this._insertColor = newInsertColor;
        this._removeColor = newRemoveColor;
        if (this._insertColor) {
            this._insertColorHex = Color.Format.CSS.formatHexA(this._insertColor);
        }
        if (this._removeColor) {
            this._removeColorHex = Color.Format.CSS.formatHexA(this._removeColor);
        }
        return hasChanges;
    }
    layout() {
        this._layoutNow();
    }
    updateViewModels(elements, eventDispatcher) {
        this._disposables.clear();
        this._diffElementViewModels = elements;
        if (eventDispatcher) {
            this._disposables.add(eventDispatcher.onDidChangeLayout(() => {
                this._scheduleRender();
            }));
            this._disposables.add(eventDispatcher.onDidChangeCellLayout(() => {
                this._scheduleRender();
            }));
        }
        this._scheduleRender();
    }
    _scheduleRender() {
        if (this._renderAnimationFrame === null) {
            this._renderAnimationFrame = DOM.runAtThisOrScheduleAtNextAnimationFrame(DOM.getWindow(this._domNode.domNode), this._onRenderScheduled.bind(this), 16);
        }
    }
    _onRenderScheduled() {
        this._renderAnimationFrame = null;
        this._layoutNow();
    }
    _layoutNow() {
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        const height = layoutInfo.height;
        const contentHeight = this._diffElementViewModels.map(view => view.totalHeight).reduce((a, b) => a + b, 0);
        const ratio = PixelRatio.getInstance(DOM.getWindow(this._domNode.domNode)).value;
        this._domNode.setWidth(this.width);
        this._domNode.setHeight(height);
        this._domNode.domNode.width = this.width * ratio;
        this._domNode.domNode.height = height * ratio;
        const ctx = this._domNode.domNode.getContext('2d');
        ctx.clearRect(0, 0, this.width * ratio, height * ratio);
        this._renderCanvas(ctx, this.width * ratio, height * ratio, contentHeight * ratio, ratio);
        this._renderOverviewViewport();
    }
    _renderOverviewViewport() {
        const layout = this._computeOverviewViewport();
        if (!layout) {
            this._overviewViewportDomElement.setTop(0);
            this._overviewViewportDomElement.setHeight(0);
        }
        else {
            this._overviewViewportDomElement.setTop(layout.top);
            this._overviewViewportDomElement.setHeight(layout.height);
        }
    }
    _computeOverviewViewport() {
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        if (!layoutInfo) {
            return null;
        }
        const scrollTop = this.notebookEditor.getScrollTop();
        const scrollHeight = this.notebookEditor.getScrollHeight();
        const computedAvailableSize = Math.max(0, layoutInfo.height);
        const computedRepresentableSize = Math.max(0, computedAvailableSize - 2 * 0);
        const visibleSize = layoutInfo.height;
        const computedSliderSize = Math.round(Math.max(MINIMUM_SLIDER_SIZE, Math.floor(visibleSize * computedRepresentableSize / scrollHeight)));
        const computedSliderRatio = (computedRepresentableSize - computedSliderSize) / (scrollHeight - visibleSize);
        const computedSliderPosition = Math.round(scrollTop * computedSliderRatio);
        return {
            height: computedSliderSize,
            top: computedSliderPosition
        };
    }
    _renderCanvas(ctx, width, height, scrollHeight, ratio) {
        if (!this._insertColorHex || !this._removeColorHex) {
            // no op when colors are not yet known
            return;
        }
        const laneWidth = width / this._lanes;
        let currentFrom = 0;
        for (let i = 0; i < this._diffElementViewModels.length; i++) {
            const element = this._diffElementViewModels[i];
            const cellHeight = Math.round((element.totalHeight / scrollHeight) * ratio * height);
            switch (element.type) {
                case 'insert':
                    ctx.fillStyle = this._insertColorHex;
                    ctx.fillRect(laneWidth, currentFrom, laneWidth, cellHeight);
                    break;
                case 'delete':
                    ctx.fillStyle = this._removeColorHex;
                    ctx.fillRect(0, currentFrom, laneWidth, cellHeight);
                    break;
                case 'unchanged':
                case 'unchangedMetadata':
                    break;
                case 'modified':
                case 'modifiedMetadata':
                    ctx.fillStyle = this._removeColorHex;
                    ctx.fillRect(0, currentFrom, laneWidth, cellHeight);
                    ctx.fillStyle = this._insertColorHex;
                    ctx.fillRect(laneWidth, currentFrom, laneWidth, cellHeight);
                    break;
            }
            currentFrom += cellHeight;
        }
    }
    dispose() {
        if (this._renderAnimationFrame !== null) {
            this._renderAnimationFrame.dispose();
            this._renderAnimationFrame = null;
        }
        super.dispose();
    }
};
NotebookDiffOverviewRuler = __decorate([
    __param(3, IThemeService)
], NotebookDiffOverviewRuler);
export { NotebookDiffOverviewRuler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmT3ZlcnZpZXdSdWxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvbm90ZWJvb2tEaWZmT3ZlcnZpZXdSdWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxZQUFZLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDL0wsT0FBTyxFQUFlLGFBQWEsRUFBRSxRQUFRLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUs1RyxNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztBQUV4QixJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFFBQVE7SUFldEQsWUFBcUIsY0FBdUMsRUFBVyxLQUFhLEVBQUUsU0FBc0IsRUFBaUIsWUFBMkI7UUFDdkosS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBREEsbUJBQWMsR0FBZCxjQUFjLENBQXlCO1FBQVcsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQVg1RSwyQkFBc0IsR0FBeUMsRUFBRSxDQUFDO1FBQ2xFLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFZ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