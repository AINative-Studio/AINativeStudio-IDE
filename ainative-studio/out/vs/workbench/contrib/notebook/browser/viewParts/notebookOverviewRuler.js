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
import { getWindow } from '../../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { IThemeService, Themable } from '../../../../../platform/theme/common/themeService.js';
import { NotebookOverviewRulerLane } from '../notebookBrowser.js';
let NotebookOverviewRuler = class NotebookOverviewRuler extends Themable {
    constructor(notebookEditor, container, themeService) {
        super(themeService);
        this.notebookEditor = notebookEditor;
        this._lanes = 3;
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setPosition('relative');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        container.appendChild(this._domNode.domNode);
        this._register(notebookEditor.onDidChangeDecorations(() => {
            this.layout();
        }));
        this._register(PixelRatio.getInstance(getWindow(this._domNode.domNode)).onDidChange(() => {
            this.layout();
        }));
    }
    layout() {
        const width = 10;
        const layoutInfo = this.notebookEditor.getLayoutInfo();
        const scrollHeight = layoutInfo.scrollHeight;
        const height = layoutInfo.height;
        const ratio = PixelRatio.getInstance(getWindow(this._domNode.domNode)).value;
        this._domNode.setWidth(width);
        this._domNode.setHeight(height);
        this._domNode.domNode.width = width * ratio;
        this._domNode.domNode.height = height * ratio;
        const ctx = this._domNode.domNode.getContext('2d');
        ctx.clearRect(0, 0, width * ratio, height * ratio);
        this._render(ctx, width * ratio, height * ratio, scrollHeight * ratio, ratio);
    }
    _render(ctx, width, height, scrollHeight, ratio) {
        const viewModel = this.notebookEditor.getViewModel();
        const fontInfo = this.notebookEditor.getLayoutInfo().fontInfo;
        const laneWidth = width / this._lanes;
        let currentFrom = 0;
        if (viewModel) {
            for (let i = 0; i < viewModel.viewCells.length; i++) {
                const viewCell = viewModel.viewCells[i];
                const textBuffer = viewCell.textBuffer;
                const decorations = viewCell.getCellDecorations();
                const cellHeight = (viewCell.layoutInfo.totalHeight / scrollHeight) * ratio * height;
                decorations.filter(decoration => decoration.overviewRuler).forEach(decoration => {
                    const overviewRuler = decoration.overviewRuler;
                    const fillStyle = this.getColor(overviewRuler.color) ?? '#000000';
                    const lineHeight = Math.min(fontInfo.lineHeight, (viewCell.layoutInfo.editorHeight / scrollHeight / textBuffer.getLineCount()) * ratio * height);
                    const lineNumbers = overviewRuler.modelRanges.map(range => range.startLineNumber).reduce((previous, current) => {
                        if (previous.length === 0) {
                            previous.push(current);
                        }
                        else {
                            const last = previous[previous.length - 1];
                            if (last !== current) {
                                previous.push(current);
                            }
                        }
                        return previous;
                    }, []);
                    let x = 0;
                    switch (overviewRuler.position) {
                        case NotebookOverviewRulerLane.Left:
                            x = 0;
                            break;
                        case NotebookOverviewRulerLane.Center:
                            x = laneWidth;
                            break;
                        case NotebookOverviewRulerLane.Right:
                            x = laneWidth * 2;
                            break;
                        default:
                            break;
                    }
                    const width = overviewRuler.position === NotebookOverviewRulerLane.Full ? laneWidth * 3 : laneWidth;
                    for (let i = 0; i < lineNumbers.length; i++) {
                        ctx.fillStyle = fillStyle;
                        const lineNumber = lineNumbers[i];
                        const offset = (lineNumber - 1) * lineHeight;
                        ctx.fillRect(x, currentFrom + offset, width, lineHeight);
                    }
                    if (overviewRuler.includeOutput) {
                        ctx.fillStyle = fillStyle;
                        const outputOffset = (viewCell.layoutInfo.editorHeight / scrollHeight) * ratio * height;
                        const decorationHeight = (fontInfo.lineHeight / scrollHeight) * ratio * height;
                        ctx.fillRect(laneWidth, currentFrom + outputOffset, laneWidth, decorationHeight);
                    }
                });
                currentFrom += cellHeight;
            }
            const overviewRulerDecorations = viewModel.getOverviewRulerDecorations();
            for (let i = 0; i < overviewRulerDecorations.length; i++) {
                const decoration = overviewRulerDecorations[i];
                if (!decoration.options.overviewRuler) {
                    continue;
                }
                const viewZoneInfo = this.notebookEditor.getViewZoneLayoutInfo(decoration.viewZoneId);
                if (!viewZoneInfo) {
                    continue;
                }
                const fillStyle = this.getColor(decoration.options.overviewRuler.color) ?? '#000000';
                let x = 0;
                switch (decoration.options.overviewRuler.position) {
                    case NotebookOverviewRulerLane.Left:
                        x = 0;
                        break;
                    case NotebookOverviewRulerLane.Center:
                        x = laneWidth;
                        break;
                    case NotebookOverviewRulerLane.Right:
                        x = laneWidth * 2;
                        break;
                    default:
                        break;
                }
                const width = decoration.options.overviewRuler.position === NotebookOverviewRulerLane.Full ? laneWidth * 3 : laneWidth;
                ctx.fillStyle = fillStyle;
                const viewZoneHeight = (viewZoneInfo.height / scrollHeight) * ratio * height;
                const viewZoneTop = (viewZoneInfo.top / scrollHeight) * ratio * height;
                ctx.fillRect(x, viewZoneTop, width, viewZoneHeight);
            }
        }
    }
};
NotebookOverviewRuler = __decorate([
    __param(2, IThemeService)
], NotebookOverviewRuler);
export { NotebookOverviewRuler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdmVydmlld1J1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rT3ZlcnZpZXdSdWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFlLE1BQU0sNENBQTRDLENBQUM7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0YsT0FBTyxFQUEyQix5QkFBeUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXBGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsUUFBUTtJQUlsRCxZQUFxQixjQUF1QyxFQUFFLFNBQXNCLEVBQWlCLFlBQTJCO1FBQy9ILEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQURBLG1CQUFjLEdBQWQsY0FBYyxDQUF5QjtRQUZwRCxXQUFNLEdBQUcsQ0FBQyxDQUFDO1FBSWxCLElBQUksQ0FBQyxRQUFRLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRW5DLFNB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