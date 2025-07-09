/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { Color } from '../../../../base/common/color.js';
import { ViewPart } from '../../view/viewPart.js';
import { Position } from '../../../common/core/position.js';
import { TokenizationRegistry } from '../../../common/languages.js';
import { editorCursorForeground, editorOverviewRulerBorder, editorOverviewRulerBackground, editorMultiCursorSecondaryForeground, editorMultiCursorPrimaryForeground } from '../../../common/core/editorColorRegistry.js';
import { OverviewRulerDecorationsGroup } from '../../../common/viewModel.js';
import { equals } from '../../../../base/common/arrays.js';
class Settings {
    constructor(config, theme) {
        const options = config.options;
        this.lineHeight = options.get(68 /* EditorOption.lineHeight */);
        this.pixelRatio = options.get(149 /* EditorOption.pixelRatio */);
        this.overviewRulerLanes = options.get(87 /* EditorOption.overviewRulerLanes */);
        this.renderBorder = options.get(86 /* EditorOption.overviewRulerBorder */);
        const borderColor = theme.getColor(editorOverviewRulerBorder);
        this.borderColor = borderColor ? borderColor.toString() : null;
        this.hideCursor = options.get(61 /* EditorOption.hideCursorInOverviewRuler */);
        const cursorColorSingle = theme.getColor(editorCursorForeground);
        this.cursorColorSingle = cursorColorSingle ? cursorColorSingle.transparent(0.7).toString() : null;
        const cursorColorPrimary = theme.getColor(editorMultiCursorPrimaryForeground);
        this.cursorColorPrimary = cursorColorPrimary ? cursorColorPrimary.transparent(0.7).toString() : null;
        const cursorColorSecondary = theme.getColor(editorMultiCursorSecondaryForeground);
        this.cursorColorSecondary = cursorColorSecondary ? cursorColorSecondary.transparent(0.7).toString() : null;
        this.themeType = theme.type;
        const minimapOpts = options.get(74 /* EditorOption.minimap */);
        const minimapEnabled = minimapOpts.enabled;
        const minimapSide = minimapOpts.side;
        const themeColor = theme.getColor(editorOverviewRulerBackground);
        const defaultBackground = TokenizationRegistry.getDefaultBackground();
        if (themeColor) {
            this.backgroundColor = themeColor;
        }
        else if (minimapEnabled && minimapSide === 'right') {
            this.backgroundColor = defaultBackground;
        }
        else {
            this.backgroundColor = null;
        }
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        const position = layoutInfo.overviewRuler;
        this.top = position.top;
        this.right = position.right;
        this.domWidth = position.width;
        this.domHeight = position.height;
        if (this.overviewRulerLanes === 0) {
            // overview ruler is off
            this.canvasWidth = 0;
            this.canvasHeight = 0;
        }
        else {
            this.canvasWidth = (this.domWidth * this.pixelRatio) | 0;
            this.canvasHeight = (this.domHeight * this.pixelRatio) | 0;
        }
        const [x, w] = this._initLanes(1, this.canvasWidth, this.overviewRulerLanes);
        this.x = x;
        this.w = w;
    }
    _initLanes(canvasLeftOffset, canvasWidth, laneCount) {
        const remainingWidth = canvasWidth - canvasLeftOffset;
        if (laneCount >= 3) {
            const leftWidth = Math.floor(remainingWidth / 3);
            const rightWidth = Math.floor(remainingWidth / 3);
            const centerWidth = remainingWidth - leftWidth - rightWidth;
            const leftOffset = canvasLeftOffset;
            const centerOffset = leftOffset + leftWidth;
            const rightOffset = leftOffset + leftWidth + centerWidth;
            return [
                [
                    0,
                    leftOffset, // Left
                    centerOffset, // Center
                    leftOffset, // Left | Center
                    rightOffset, // Right
                    leftOffset, // Left | Right
                    centerOffset, // Center | Right
                    leftOffset, // Left | Center | Right
                ], [
                    0,
                    leftWidth, // Left
                    centerWidth, // Center
                    leftWidth + centerWidth, // Left | Center
                    rightWidth, // Right
                    leftWidth + centerWidth + rightWidth, // Left | Right
                    centerWidth + rightWidth, // Center | Right
                    leftWidth + centerWidth + rightWidth, // Left | Center | Right
                ]
            ];
        }
        else if (laneCount === 2) {
            const leftWidth = Math.floor(remainingWidth / 2);
            const rightWidth = remainingWidth - leftWidth;
            const leftOffset = canvasLeftOffset;
            const rightOffset = leftOffset + leftWidth;
            return [
                [
                    0,
                    leftOffset, // Left
                    leftOffset, // Center
                    leftOffset, // Left | Center
                    rightOffset, // Right
                    leftOffset, // Left | Right
                    leftOffset, // Center | Right
                    leftOffset, // Left | Center | Right
                ], [
                    0,
                    leftWidth, // Left
                    leftWidth, // Center
                    leftWidth, // Left | Center
                    rightWidth, // Right
                    leftWidth + rightWidth, // Left | Right
                    leftWidth + rightWidth, // Center | Right
                    leftWidth + rightWidth, // Left | Center | Right
                ]
            ];
        }
        else {
            const offset = canvasLeftOffset;
            const width = remainingWidth;
            return [
                [
                    0,
                    offset, // Left
                    offset, // Center
                    offset, // Left | Center
                    offset, // Right
                    offset, // Left | Right
                    offset, // Center | Right
                    offset, // Left | Center | Right
                ], [
                    0,
                    width, // Left
                    width, // Center
                    width, // Left | Center
                    width, // Right
                    width, // Left | Right
                    width, // Center | Right
                    width, // Left | Center | Right
                ]
            ];
        }
    }
    equals(other) {
        return (this.lineHeight === other.lineHeight
            && this.pixelRatio === other.pixelRatio
            && this.overviewRulerLanes === other.overviewRulerLanes
            && this.renderBorder === other.renderBorder
            && this.borderColor === other.borderColor
            && this.hideCursor === other.hideCursor
            && this.cursorColorSingle === other.cursorColorSingle
            && this.cursorColorPrimary === other.cursorColorPrimary
            && this.cursorColorSecondary === other.cursorColorSecondary
            && this.themeType === other.themeType
            && Color.equals(this.backgroundColor, other.backgroundColor)
            && this.top === other.top
            && this.right === other.right
            && this.domWidth === other.domWidth
            && this.domHeight === other.domHeight
            && this.canvasWidth === other.canvasWidth
            && this.canvasHeight === other.canvasHeight);
    }
}
var Constants;
(function (Constants) {
    Constants[Constants["MIN_DECORATION_HEIGHT"] = 6] = "MIN_DECORATION_HEIGHT";
})(Constants || (Constants = {}));
var OverviewRulerLane;
(function (OverviewRulerLane) {
    OverviewRulerLane[OverviewRulerLane["Left"] = 1] = "Left";
    OverviewRulerLane[OverviewRulerLane["Center"] = 2] = "Center";
    OverviewRulerLane[OverviewRulerLane["Right"] = 4] = "Right";
    OverviewRulerLane[OverviewRulerLane["Full"] = 7] = "Full";
})(OverviewRulerLane || (OverviewRulerLane = {}));
var ShouldRenderValue;
(function (ShouldRenderValue) {
    ShouldRenderValue[ShouldRenderValue["NotNeeded"] = 0] = "NotNeeded";
    ShouldRenderValue[ShouldRenderValue["Maybe"] = 1] = "Maybe";
    ShouldRenderValue[ShouldRenderValue["Needed"] = 2] = "Needed";
})(ShouldRenderValue || (ShouldRenderValue = {}));
export class DecorationsOverviewRuler extends ViewPart {
    constructor(context) {
        super(context);
        this._actualShouldRender = 0 /* ShouldRenderValue.NotNeeded */;
        this._renderedDecorations = [];
        this._renderedCursorPositions = [];
        this._domNode = createFastDomNode(document.createElement('canvas'));
        this._domNode.setClassName('decorationsOverviewRuler');
        this._domNode.setPosition('absolute');
        this._domNode.setLayerHinting(true);
        this._domNode.setContain('strict');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._updateSettings(false);
        this._tokensColorTrackerListener = TokenizationRegistry.onDidChange((e) => {
            if (e.changedColorMap) {
                this._updateSettings(true);
            }
        });
        this._cursorPositions = [{ position: new Position(1, 1), color: this._settings.cursorColorSingle }];
    }
    dispose() {
        super.dispose();
        this._tokensColorTrackerListener.dispose();
    }
    _updateSettings(renderNow) {
        const newSettings = new Settings(this._context.configuration, this._context.theme);
        if (this._settings && this._settings.equals(newSettings)) {
            // nothing to do
            return false;
        }
        this._settings = newSettings;
        this._domNode.setTop(this._settings.top);
        this._domNode.setRight(this._settings.right);
        this._domNode.setWidth(this._settings.domWidth);
        this._domNode.setHeight(this._settings.domHeight);
        this._domNode.domNode.width = this._settings.canvasWidth;
        this._domNode.domNode.height = this._settings.canvasHeight;
        if (renderNow) {
            this._render();
        }
        return true;
    }
    // ---- begin view event handlers
    _markRenderingIsNeeded() {
        this._actualShouldRender = 2 /* ShouldRenderValue.Needed */;
        return true;
    }
    _markRenderingIsMaybeNeeded() {
        this._actualShouldRender = 1 /* ShouldRenderValue.Maybe */;
        return true;
    }
    onConfigurationChanged(e) {
        return this._updateSettings(false) ? this._markRenderingIsNeeded() : false;
    }
    onCursorStateChanged(e) {
        this._cursorPositions = [];
        for (let i = 0, len = e.selections.length; i < len; i++) {
            let color = this._settings.cursorColorSingle;
            if (len > 1) {
                color = i === 0 ? this._settings.cursorColorPrimary : this._settings.cursorColorSecondary;
            }
            this._cursorPositions.push({ position: e.selections[i].getPosition(), color });
        }
        this._cursorPositions.sort((a, b) => Position.compare(a.position, b.position));
        return this._markRenderingIsMaybeNeeded();
    }
    onDecorationsChanged(e) {
        if (e.affectsOverviewRuler) {
            return this._markRenderingIsMaybeNeeded();
        }
        return false;
    }
    onFlushed(e) {
        return this._markRenderingIsNeeded();
    }
    onScrollChanged(e) {
        return e.scrollHeightChanged ? this._markRenderingIsNeeded() : false;
    }
    onZonesChanged(e) {
        return this._markRenderingIsNeeded();
    }
    onThemeChanged(e) {
        return this._updateSettings(false) ? this._markRenderingIsNeeded() : false;
    }
    // ---- end view event handlers
    getDomNode() {
        return this._domNode.domNode;
    }
    prepareRender(ctx) {
        // Nothing to read
    }
    render(editorCtx) {
        this._render();
        this._actualShouldRender = 0 /* ShouldRenderValue.NotNeeded */;
    }
    _render() {
        const backgroundColor = this._settings.backgroundColor;
        if (this._settings.overviewRulerLanes === 0) {
            // overview ruler is off
            this._domNode.setBackgroundColor(backgroundColor ? Color.Format.CSS.formatHexA(backgroundColor) : '');
            this._domNode.setDisplay('none');
            return;
        }
        const decorations = this._context.viewModel.getAllOverviewRulerDecorations(this._context.theme);
        decorations.sort(OverviewRulerDecorationsGroup.compareByRenderingProps);
        if (this._actualShouldRender === 1 /* ShouldRenderValue.Maybe */ && !OverviewRulerDecorationsGroup.equalsArr(this._renderedDecorations, decorations)) {
            this._actualShouldRender = 2 /* ShouldRenderValue.Needed */;
        }
        if (this._actualShouldRender === 1 /* ShouldRenderValue.Maybe */ && !equals(this._renderedCursorPositions, this._cursorPositions, (a, b) => a.position.lineNumber === b.position.lineNumber && a.color === b.color)) {
            this._actualShouldRender = 2 /* ShouldRenderValue.Needed */;
        }
        if (this._actualShouldRender === 1 /* ShouldRenderValue.Maybe */) {
            // both decorations and cursor positions are unchanged, nothing to do
            return;
        }
        this._renderedDecorations = decorations;
        this._renderedCursorPositions = this._cursorPositions;
        this._domNode.setDisplay('block');
        const canvasWidth = this._settings.canvasWidth;
        const canvasHeight = this._settings.canvasHeight;
        const lineHeight = this._settings.lineHeight;
        const viewLayout = this._context.viewLayout;
        const outerHeight = this._context.viewLayout.getScrollHeight();
        const heightRatio = canvasHeight / outerHeight;
        const minDecorationHeight = (6 /* Constants.MIN_DECORATION_HEIGHT */ * this._settings.pixelRatio) | 0;
        const halfMinDecorationHeight = (minDecorationHeight / 2) | 0;
        const canvasCtx = this._domNode.domNode.getContext('2d');
        if (backgroundColor) {
            if (backgroundColor.isOpaque()) {
                // We have a background color which is opaque, we can just paint the entire surface with it
                canvasCtx.fillStyle = Color.Format.CSS.formatHexA(backgroundColor);
                canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
            else {
                // We have a background color which is transparent, we need to first clear the surface and
                // then fill it
                canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                canvasCtx.fillStyle = Color.Format.CSS.formatHexA(backgroundColor);
                canvasCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            }
        }
        else {
            // We don't have a background color
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
        const x = this._settings.x;
        const w = this._settings.w;
        for (const decorationGroup of decorations) {
            const color = decorationGroup.color;
            const decorationGroupData = decorationGroup.data;
            canvasCtx.fillStyle = color;
            let prevLane = 0;
            let prevY1 = 0;
            let prevY2 = 0;
            for (let i = 0, len = decorationGroupData.length / 3; i < len; i++) {
                const lane = decorationGroupData[3 * i];
                const startLineNumber = decorationGroupData[3 * i + 1];
                const endLineNumber = decorationGroupData[3 * i + 2];
                let y1 = (viewLayout.getVerticalOffsetForLineNumber(startLineNumber) * heightRatio) | 0;
                let y2 = ((viewLayout.getVerticalOffsetForLineNumber(endLineNumber) + lineHeight) * heightRatio) | 0;
                const height = y2 - y1;
                if (height < minDecorationHeight) {
                    let yCenter = ((y1 + y2) / 2) | 0;
                    if (yCenter < halfMinDecorationHeight) {
                        yCenter = halfMinDecorationHeight;
                    }
                    else if (yCenter + halfMinDecorationHeight > canvasHeight) {
                        yCenter = canvasHeight - halfMinDecorationHeight;
                    }
                    y1 = yCenter - halfMinDecorationHeight;
                    y2 = yCenter + halfMinDecorationHeight;
                }
                if (y1 > prevY2 + 1 || lane !== prevLane) {
                    // flush prev
                    if (i !== 0) {
                        canvasCtx.fillRect(x[prevLane], prevY1, w[prevLane], prevY2 - prevY1);
                    }
                    prevLane = lane;
                    prevY1 = y1;
                    prevY2 = y2;
                }
                else {
                    // merge into prev
                    if (y2 > prevY2) {
                        prevY2 = y2;
                    }
                }
            }
            canvasCtx.fillRect(x[prevLane], prevY1, w[prevLane], prevY2 - prevY1);
        }
        // Draw cursors
        if (!this._settings.hideCursor) {
            const cursorHeight = (2 * this._settings.pixelRatio) | 0;
            const halfCursorHeight = (cursorHeight / 2) | 0;
            const cursorX = this._settings.x[7 /* OverviewRulerLane.Full */];
            const cursorW = this._settings.w[7 /* OverviewRulerLane.Full */];
            let prevY1 = -100;
            let prevY2 = -100;
            let prevColor = null;
            for (let i = 0, len = this._cursorPositions.length; i < len; i++) {
                const color = this._cursorPositions[i].color;
                if (!color) {
                    continue;
                }
                const cursor = this._cursorPositions[i].position;
                let yCenter = (viewLayout.getVerticalOffsetForLineNumber(cursor.lineNumber) * heightRatio) | 0;
                if (yCenter < halfCursorHeight) {
                    yCenter = halfCursorHeight;
                }
                else if (yCenter + halfCursorHeight > canvasHeight) {
                    yCenter = canvasHeight - halfCursorHeight;
                }
                const y1 = yCenter - halfCursorHeight;
                const y2 = y1 + cursorHeight;
                if (y1 > prevY2 + 1 || color !== prevColor) {
                    // flush prev
                    if (i !== 0 && prevColor) {
                        canvasCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
                    }
                    prevY1 = y1;
                    prevY2 = y2;
                }
                else {
                    // merge into prev
                    if (y2 > prevY2) {
                        prevY2 = y2;
                    }
                }
                prevColor = color;
                canvasCtx.fillStyle = color;
            }
            if (prevColor) {
                canvasCtx.fillRect(cursorX, prevY1, cursorW, prevY2 - prevY1);
            }
        }
        if (this._settings.renderBorder && this._settings.borderColor && this._settings.overviewRulerLanes > 0) {
            canvasCtx.beginPath();
            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = this._settings.borderColor;
            canvasCtx.moveTo(0, 0);
            canvasCtx.lineTo(0, canvasHeight);
            canvasCtx.moveTo(1, 0);
            canvasCtx.lineTo(canvasWidth, 0);
            canvasCtx.stroke();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbnNPdmVydmlld1J1bGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3ZpZXdQYXJ0cy9vdmVydmlld1J1bGVyL2RlY29yYXRpb25zT3ZlcnZpZXdSdWxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN6RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUseUJBQXlCLEVBQUUsNkJBQTZCLEVBQUUsb0NBQW9DLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQU16TixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM3RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFM0QsTUFBTSxRQUFRO0lBMkJiLFlBQVksTUFBNEIsRUFBRSxLQUFrQjtRQUMzRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsa0NBQXlCLENBQUM7UUFDdkQsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQztRQUN2RCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsMENBQWlDLENBQUM7UUFF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