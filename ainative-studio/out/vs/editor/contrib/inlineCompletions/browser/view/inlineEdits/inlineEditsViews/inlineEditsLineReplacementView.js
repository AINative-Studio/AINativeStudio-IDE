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
import { $, getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, autorunDelta, constObservable, derived } from '../../../../../../../base/common/observable.js';
import { editorBackground, scrollbarShadow } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { EditorMouseEvent } from '../../../../../../browser/editorDom.js';
import { Point } from '../../../../../../browser/point.js';
import { Rect } from '../../../../../../browser/rect.js';
import { LineSource, renderLines, RenderOptions } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Range } from '../../../../../../common/core/range.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens } from '../../../../../../common/tokens/lineTokens.js';
import { TokenArray } from '../../../../../../common/tokens/tokenArray.js';
import { InlineDecoration } from '../../../../../../common/viewModel.js';
import { getEditorBlendedColor, getModifiedBorderColor, getOriginalBorderColor, modifiedChangedLineBackgroundColor, originalBackgroundColor } from '../theme.js';
import { getPrefixTrim, mapOutFalsy, rectToProps } from '../utils/utils.js';
let InlineEditsLineReplacementView = class InlineEditsLineReplacementView extends Disposable {
    constructor(_editor, _edit, _tabAction, _languageService, _themeService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._originalBubblesDecorationCollection = this._editor.editor.createDecorationsCollection();
        this._originalBubblesDecorationOptions = {
            description: 'inlineCompletions-original-bubble',
            className: 'inlineCompletions-original-bubble',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */
        };
        this._maxPrefixTrim = this._edit.map(e => e ? getPrefixTrim(e.replacements.flatMap(r => [r.originalRange, r.modifiedRange]), e.originalRange, e.modifiedLines, this._editor.editor) : undefined);
        this._modifiedLineElements = derived(reader => {
            const lines = [];
            let requiredWidth = 0;
            const prefixTrim = this._maxPrefixTrim.read(reader);
            const edit = this._edit.read(reader);
            if (!edit || !prefixTrim) {
                return undefined;
            }
            const maxPrefixTrim = prefixTrim.prefixTrim;
            const modifiedBubbles = rangesToBubbleRanges(edit.replacements.map(r => r.modifiedRange)).map(r => new Range(r.startLineNumber, r.startColumn - maxPrefixTrim, r.endLineNumber, r.endColumn - maxPrefixTrim));
            const textModel = this._editor.model.get();
            const startLineNumber = edit.modifiedRange.startLineNumber;
            for (let i = 0; i < edit.modifiedRange.length; i++) {
                const line = document.createElement('div');
                const lineNumber = startLineNumber + i;
                const modLine = edit.modifiedLines[i].slice(maxPrefixTrim);
                const t = textModel.tokenization.tokenizeLinesAt(lineNumber, [modLine])?.[0];
                let tokens;
                if (t) {
                    tokens = TokenArray.fromLineTokens(t).toLineTokens(modLine, this._languageService.languageIdCodec);
                }
                else {
                    tokens = LineTokens.createEmpty(modLine, this._languageService.languageIdCodec);
                }
                // Inline decorations are broken down into individual spans. To be able to render rounded corners, we need to set the start and end decorations separately.
                const decorations = [];
                for (const modified of modifiedBubbles.filter(b => b.startLineNumber === lineNumber)) {
                    const validatedEndColumn = Math.min(modified.endColumn, modLine.length + 1);
                    decorations.push(new InlineDecoration(new Range(1, modified.startColumn, 1, validatedEndColumn), 'inlineCompletions-modified-bubble', 0 /* InlineDecorationType.Regular */));
                    decorations.push(new InlineDecoration(new Range(1, modified.startColumn, 1, modified.startColumn + 1), 'start', 0 /* InlineDecorationType.Regular */));
                    decorations.push(new InlineDecoration(new Range(1, validatedEndColumn - 1, 1, validatedEndColumn), 'end', 0 /* InlineDecorationType.Regular */));
                }
                // TODO: All lines should be rendered at once for one dom element
                const result = renderLines(new LineSource([tokens]), RenderOptions.fromEditor(this._editor.editor).withSetWidth(false).withScrollBeyondLastColumn(0), decorations, line, true);
                this._editor.getOption(52 /* EditorOption.fontInfo */).read(reader); // update when font info changes
                requiredWidth = Math.max(requiredWidth, result.minWidthInPx);
                lines.push(line);
            }
            return { lines, requiredWidth: requiredWidth };
        });
        this._layout = derived(this, reader => {
            const modifiedLines = this._modifiedLineElements.read(reader);
            const maxPrefixTrim = this._maxPrefixTrim.read(reader);
            const edit = this._edit.read(reader);
            if (!modifiedLines || !maxPrefixTrim || !edit) {
                return undefined;
            }
            const { prefixLeftOffset } = maxPrefixTrim;
            const { requiredWidth } = modifiedLines;
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */).read(reader);
            const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
            const verticalScrollbarWidth = this._editor.layoutInfoVerticalScrollbarWidth.read(reader);
            const scrollLeft = this._editor.scrollLeft.read(reader);
            const scrollTop = this._editor.scrollTop.read(reader);
            const editorLeftOffset = contentLeft - scrollLeft;
            const textModel = this._editor.editor.getModel();
            const originalLineWidths = edit.originalRange.mapToLineArray(line => this._editor.editor.getOffsetForColumn(line, textModel.getLineMaxColumn(line)) - prefixLeftOffset);
            const maxLineWidth = Math.max(...originalLineWidths, requiredWidth);
            const startLineNumber = edit.originalRange.startLineNumber;
            const endLineNumber = edit.originalRange.endLineNumberExclusive - 1;
            const topOfOriginalLines = this._editor.editor.getTopForLineNumber(startLineNumber) - scrollTop;
            const bottomOfOriginalLines = this._editor.editor.getBottomForLineNumber(endLineNumber) - scrollTop;
            // Box Widget positioning
            const originalLinesOverlay = Rect.fromLeftTopWidthHeight(editorLeftOffset + prefixLeftOffset, topOfOriginalLines, maxLineWidth, bottomOfOriginalLines - topOfOriginalLines);
            const modifiedLinesOverlay = Rect.fromLeftTopWidthHeight(originalLinesOverlay.left, originalLinesOverlay.bottom, originalLinesOverlay.width, edit.modifiedRange.length * lineHeight);
            const background = Rect.hull([originalLinesOverlay, modifiedLinesOverlay]);
            const lowerBackground = background.intersectVertical(new OffsetRange(originalLinesOverlay.bottom, Number.MAX_SAFE_INTEGER));
            const lowerText = new Rect(lowerBackground.left, lowerBackground.top, lowerBackground.right, lowerBackground.bottom);
            return {
                originalLinesOverlay,
                modifiedLinesOverlay,
                background,
                lowerBackground,
                lowerText,
                minContentWidthRequired: prefixLeftOffset + maxLineWidth + verticalScrollbarWidth,
            };
        });
        this._viewZoneInfo = derived(reader => {
            const shouldShowViewZone = this._editor.getOption(64 /* EditorOption.inlineSuggest */).map(o => o.edits.allowCodeShifting === 'always').read(reader);
            if (!shouldShowViewZone) {
                return undefined;
            }
            const layout = this._layout.read(reader);
            const edit = this._edit.read(reader);
            if (!layout || !edit) {
                return undefined;
            }
            const viewZoneHeight = layout.lowerBackground.height;
            const viewZoneLineNumber = edit.originalRange.endLineNumberExclusive;
            return { height: viewZoneHeight, lineNumber: viewZoneLineNumber };
        });
        this._div = n.div({
            class: 'line-replacement',
        }, [
            derived(reader => {
                const layout = mapOutFalsy(this._layout).read(reader);
                const modifiedLineElements = this._modifiedLineElements.read(reader);
                if (!layout || !modifiedLineElements) {
                    return [];
                }
                const layoutProps = layout.read(reader);
                const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
                const contentWidth = this._editor.contentWidth.read(reader);
                const contentHeight = this._editor.editor.getContentHeight();
                const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */).read(reader);
                modifiedLineElements.lines.forEach(l => {
                    l.style.width = `${layoutProps.lowerText.width}px`;
                    l.style.height = `${lineHeight}px`;
                    l.style.position = 'relative';
                });
                const modifiedBorderColor = getModifiedBorderColor(this._tabAction).read(reader);
                const originalBorderColor = getOriginalBorderColor(this._tabAction).read(reader);
                return [
                    n.div({
                        style: {
                            position: 'absolute',
                            top: 0,
                            left: contentLeft,
                            width: contentWidth,
                            height: contentHeight,
                            overflow: 'hidden',
                            pointerEvents: 'none',
                        }
                    }, [
                        n.div({
                            class: 'originalOverlayLineReplacement',
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).background.translateX(-contentLeft)),
                                borderRadius: '4px',
                                border: getEditorBlendedColor(originalBorderColor, this._themeService).map(c => `1px solid ${c.toString()}`),
                                pointerEvents: 'none',
                                boxSizing: 'border-box',
                                background: asCssVariable(originalBackgroundColor),
                            }
                        }),
                        n.div({
                            class: 'modifiedOverlayLineReplacement',
                            style: {
                                position: 'absolute',
                                ...rectToProps(reader => layout.read(reader).lowerBackground.translateX(-contentLeft)),
                                borderRadius: '4px',
                                background: asCssVariable(editorBackground),
                                boxShadow: `${asCssVariable(scrollbarShadow)} 0 6px 6px -6px`,
                                border: `1px solid ${asCssVariable(modifiedBorderColor)}`,
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                            },
                            onmousedown: e => {
                                e.preventDefault(); // This prevents that the editor loses focus
                            },
                            onclick: (e) => this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e)),
                        }, [
                            n.div({
                                style: {
                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                    background: asCssVariable(modifiedChangedLineBackgroundColor),
                                },
                            })
                        ]),
                        n.div({
                            class: 'modifiedLinesLineReplacement',
                            style: {
                                position: 'absolute',
                                boxSizing: 'border-box',
                                ...rectToProps(reader => layout.read(reader).lowerText.translateX(-contentLeft)),
                                fontFamily: this._editor.getOption(51 /* EditorOption.fontFamily */),
                                fontSize: this._editor.getOption(54 /* EditorOption.fontSize */),
                                fontWeight: this._editor.getOption(55 /* EditorOption.fontWeight */),
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                borderRadius: '4px',
                                overflow: 'hidden',
                            }
                        }, [...modifiedLineElements.lines]),
                    ])
                ];
            })
        ]).keepUpdated(this._store);
        this.isHovered = this._editor.isTargetHovered((e) => this._isMouseOverWidget(e), this._store);
        // View Zones
        this._previousViewZoneInfo = undefined;
        this._register(toDisposable(() => this._originalBubblesDecorationCollection.clear()));
        this._register(toDisposable(() => this._editor.editor.changeViewZones(accessor => this.removePreviousViewZone(accessor))));
        this._register(autorunDelta(this._viewZoneInfo, ({ lastValue, newValue }) => {
            if (lastValue === newValue || (lastValue?.height === newValue?.height && lastValue?.lineNumber === newValue?.lineNumber)) {
                return;
            }
            this._editor.editor.changeViewZones((changeAccessor) => {
                this.removePreviousViewZone(changeAccessor);
                if (!newValue) {
                    return;
                }
                this.addViewZone(newValue, changeAccessor);
            });
        }));
        this._register(autorun(reader => {
            const edit = this._edit.read(reader);
            const originalBubbles = [];
            if (edit) {
                originalBubbles.push(...rangesToBubbleRanges(edit.replacements.map(r => r.originalRange)));
            }
            this._originalBubblesDecorationCollection.set(originalBubbles.map(r => ({ range: r, options: this._originalBubblesDecorationOptions })));
        }));
        this._register(this._editor.createOverlayWidget({
            domNode: this._div.element,
            minContentWidthInPx: derived(reader => {
                return this._layout.read(reader)?.minContentWidthRequired ?? 0;
            }),
            position: constObservable({ preference: { top: 0, left: 0 } }),
            allowEditorOverflow: false,
        }));
    }
    _isMouseOverWidget(e) {
        const layout = this._layout.get();
        if (!layout || !(e.event instanceof EditorMouseEvent)) {
            return false;
        }
        return layout.lowerBackground.containsPoint(new Point(e.event.relativePos.x, e.event.relativePos.y));
    }
    removePreviousViewZone(changeAccessor) {
        if (!this._previousViewZoneInfo) {
            return;
        }
        changeAccessor.removeZone(this._previousViewZoneInfo.id);
        const cursorLineNumber = this._editor.cursorLineNumber.get();
        if (cursorLineNumber !== null && cursorLineNumber >= this._previousViewZoneInfo.lineNumber) {
            this._editor.editor.setScrollTop(this._editor.scrollTop.get() - this._previousViewZoneInfo.height);
        }
        this._previousViewZoneInfo = undefined;
    }
    addViewZone(viewZoneInfo, changeAccessor) {
        const activeViewZone = changeAccessor.addZone({
            afterLineNumber: viewZoneInfo.lineNumber - 1,
            heightInPx: viewZoneInfo.height, // move computation to layout?
            domNode: $('div'),
        });
        this._previousViewZoneInfo = { height: viewZoneInfo.height, lineNumber: viewZoneInfo.lineNumber, id: activeViewZone };
        const cursorLineNumber = this._editor.cursorLineNumber.get();
        if (cursorLineNumber !== null && cursorLineNumber >= viewZoneInfo.lineNumber) {
            this._editor.editor.setScrollTop(this._editor.scrollTop.get() + viewZoneInfo.height);
        }
    }
};
InlineEditsLineReplacementView = __decorate([
    __param(3, ILanguageService),
    __param(4, IThemeService)
], InlineEditsLineReplacementView);
export { InlineEditsLineReplacementView };
function rangesToBubbleRanges(ranges) {
    const result = [];
    while (ranges.length) {
        let range = ranges.shift();
        if (range.startLineNumber !== range.endLineNumber) {
            ranges.push(new Range(range.startLineNumber + 1, 1, range.endLineNumber, range.endColumn));
            range = new Range(range.startLineNumber, range.startColumn, range.startLineNumber, Number.MAX_SAFE_INTEGER); // TODO: this is not correct
        }
        result.push(range);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNMaW5lUmVwbGFjZW1lbnRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNMaW5lUmVwbGFjZW1lbnRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsTUFBTSxnREFBZ0QsQ0FBQztBQUM5SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDaEgsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUUzRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUUxRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJGQUEyRixDQUFDO0FBR25KLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0sdUNBQXVDLENBQUM7QUFFL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLHNCQUFzQixFQUFFLGtDQUFrQyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ2pLLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXJFLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEsVUFBVTtJQTJPN0QsWUFDa0IsT0FBNkIsRUFDN0IsS0FLSCxFQUNHLFVBQTRDLEVBQzNDLGdCQUFtRCxFQUN0RCxhQUE2QztRQUU1RCxLQUFLLEVBQUUsQ0FBQztRQVhTLFlBQU8sR0FBUCxPQUFPLENBQXNCO1FBQzdCLFVBQUssR0FBTCxLQUFLLENBS1I7UUFDRyxlQUFVLEdBQVYsVUFBVSxDQUFrQztRQUMxQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3JDLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBblA1QyxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWUsQ0FBQyxDQUFDO1FBQ2pFLGVBQVUsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUU1Qix5Q0FBb0MsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ3pGLHNDQUFpQyxHQUE0QjtZQUM3RSxXQUFXLEVBQUUsbUNBQW1DO1lBQ2hELFNBQVMsRUFBRSxtQ0FBbUM7WUFDOUMsVUFBVSw0REFBb0Q7U0FDOUQsQ0FBQztRQUVlLG1CQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFNUwsMEJBQXFCLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ3pELE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNqQixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7WUFFdEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMxQixPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQztZQUM1QyxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLFdBQVcsR0FBRyxhQUFhLEVBQUUsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUM7WUFFOU0sTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFHLENBQUM7WUFDNUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLENBQUM7WUFDM0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzNDLE1BQU0sVUFBVSxHQUFHLGVBQWUsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUUzRCxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzdFLElBQUksTUFBa0IsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDUCxNQUFNLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDcEcsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ2pGLENBQUM7Z0JBRUQsMkpBQTJKO2dCQUMzSixNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLEtBQUssTUFBTSxRQUFRLElBQUksZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEtBQUssVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDdEYsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDNUUsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxFQUFFLG1DQUFtQyx1Q0FBK0IsQ0FBQyxDQUFDO29CQUNySyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyx1Q0FBK0IsQ0FBQyxDQUFDO29CQUMvSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxLQUFLLHVDQUErQixDQUFDLENBQUM7Z0JBQzFJLENBQUM7Z0JBRUQsaUVBQWlFO2dCQUNqRSxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDL0ssSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGdDQUF1QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGdDQUFnQztnQkFFNUYsYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFN0QsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDO1lBRUQsT0FBTyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7UUFHYyxZQUFPLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRTtZQUNqRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDL0MsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUVELE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxHQUFHLGFBQWEsQ0FBQztZQUMzQyxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsYUFBYSxDQUFDO1lBRXhDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDcEUsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RELE1BQU0sZ0JBQWdCLEdBQUcsV0FBVyxHQUFHLFVBQVUsQ0FBQztZQUVsRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUVsRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUM7WUFDeEssTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRXBFLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDO1lBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsc0JBQXNCLEdBQUcsQ0FBQyxDQUFDO1lBQ3BFLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsZUFBZSxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBQ2hHLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsYUFBYSxDQUFDLEdBQUcsU0FBUyxDQUFDO1lBRXBHLHlCQUF5QjtZQUN6QixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FDdkQsZ0JBQWdCLEdBQUcsZ0JBQWdCLEVBQ25DLGtCQUFrQixFQUNsQixZQUFZLEVBQ1oscUJBQXFCLEdBQUcsa0JBQWtCLENBQzFDLENBQUM7WUFDRixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FDdkQsb0JBQW9CLENBQUMsSUFBSSxFQUN6QixvQkFBb0IsQ0FBQyxNQUFNLEVBQzNCLG9CQUFvQixDQUFDLEtBQUssRUFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUN0QyxDQUFDO1lBQ0YsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQztZQUUzRSxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsaUJBQWlCLENBQUMsSUFBSSxXQUFXLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDNUgsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsR0FBRyxFQUFFLGVBQWUsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXJILE9BQU87Z0JBQ04sb0JBQW9CO2dCQUNwQixvQkFBb0I7Z0JBQ3BCLFVBQVU7Z0JBQ1YsZUFBZTtnQkFDZixTQUFTO2dCQUNULHVCQUF1QixFQUFFLGdCQUFnQixHQUFHLFlBQVksR0FBRyxzQkFBc0I7YUFDakYsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRWMsa0JBQWEsR0FBRyxPQUFPLENBQXFELE1BQU0sQ0FBQyxFQUFFO1lBQ3JHLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLHFDQUE0QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEtBQUssUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzVJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN6QixPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN0QixPQUFPLFNBQVMsQ0FBQztZQUNsQixDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUM7WUFDckQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDO1lBQ3JFLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxDQUFDO1FBQ25FLENBQUMsQ0FBQyxDQUFDO1FBRWMsU0FBSSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDN0IsS0FBSyxFQUFFLGtCQUFrQjtTQUN6QixFQUFFO1lBQ0YsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNoQixNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyRSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDdEMsT0FBTyxFQUFFLENBQUM7Z0JBQ1gsQ0FBQztnQkFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUU3RCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsa0NBQXlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNoRixvQkFBb0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLENBQUM7b0JBQ25ELENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsVUFBVSxJQUFJLENBQUM7b0JBQ25DLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQztnQkFDL0IsQ0FBQyxDQUFDLENBQUM7Z0JBRUgsTUFBTSxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqRixNQUFNLG1CQUFtQixHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBRWpGLE9BQU87b0JBQ04sQ0FBQyxDQUFDLEdBQUcsQ0FBQzt3QkFDTCxLQUFLLEVBQUU7NEJBQ04sUUFBUSxFQUFFLFVBQVU7NEJBQ3BCLEdBQUcsRUFBRSxDQUFDOzRCQUNOLElBQUksRUFBRSxXQUFXOzRCQUNqQixLQUFLLEVBQUUsWUFBWTs0QkFDbkIsTUFBTSxFQUFFLGFBQWE7NEJBQ3JCLFFBQVEsRUFBRSxRQUFROzRCQUNsQixhQUFhLEVBQUUsTUFBTTt5QkFDckI7cUJBQ0QsRUFBRTt3QkFDRixDQUFDLENBQUMsR0FBRyxDQUFDOzRCQUNMLEtBQUssRUFBRSxnQ0FBZ0M7NEJBQ3ZDLEtBQUssRUFBRTtnQ0FDTixRQUFRLEVBQUUsVUFBVTtnQ0FDcEIsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQ0FDakYsWUFBWSxFQUFFLEtBQUs7Z0NBRW5CLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQ0FDNUcsYUFBYSxFQUFFLE1BQU07Z0NBQ3JCLFNBQVMsRUFBRSxZQUFZO2dDQUN2QixVQUFVLEVBQUUsYUFBYSxDQUFDLHVCQUF1QixDQUFDOzZCQUNsRDt5QkFDRCxDQUFDO3dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7NEJBQ0wsS0FBSyxFQUFFLGdDQUFnQzs0QkFDdkMsS0FBSyxFQUFFO2dDQUNOLFFBQVEsRUFBRSxVQUFVO2dDQUNwQixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dDQUN0RixZQUFZLEVBQUUsS0FBSztnQ0FDbkIsVUFBVSxFQUFFLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQztnQ0FDM0MsU0FBUyxFQUFFLEdBQUcsYUFBYSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUI7Z0NBQzdELE1BQU0sRUFBRSxhQUFhLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO2dDQUN6RCxTQUFTLEVBQUUsWUFBWTtnQ0FDdkIsUUFBUSxFQUFFLFFBQVE7Z0NBQ2xCLE1BQU0sRUFBRSxTQUFTO2dDQUNqQixhQUFhLEVBQUUsTUFBTTs2QkFDckI7NEJBQ0QsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFO2dDQUNoQixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyw0Q0FBNEM7NEJBQ2pFLENBQUM7NEJBQ0QsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDOUUsRUFBRTs0QkFDRixDQUFDLENBQUMsR0FBRyxDQUFDO2dDQUNMLEtBQUssRUFBRTtvQ0FDTixRQUFRLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNO29DQUNwRSxVQUFVLEVBQUUsYUFBYSxDQUFDLGtDQUFrQyxDQUFDO2lDQUM3RDs2QkFDRCxDQUFDO3lCQUNGLENBQUM7d0JBQ0YsQ0FBQyxDQUFDLEdBQUcsQ0FBQzs0QkFDTCxLQUFLLEVBQUUsOEJBQThCOzRCQUNyQyxLQUFLLEVBQUU7Z0NBQ04sUUFBUSxFQUFFLFVBQVU7Z0NBQ3BCLFNBQVMsRUFBRSxZQUFZO2dDQUN2QixHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dDQUNoRixVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGtDQUF5QjtnQ0FDM0QsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxnQ0FBdUI7Z0NBQ3ZELFVBQVUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsa0NBQXlCO2dDQUMzRCxhQUFhLEVBQUUsTUFBTTtnQ0FDckIsVUFBVSxFQUFFLFFBQVE7Z0NBQ3BCLFlBQVksRUFBRSxLQUFLO2dDQUNuQixRQUFRLEVBQUUsUUFBUTs2QkFDbEI7eUJBQ0QsRUFBRSxDQUFDLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ25DLENBQUM7aUJBQ0YsQ0FBQztZQUNILENBQUMsQ0FBQztTQUNGLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRW5CLGNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQTBEbEcsYUFBYTtRQUNMLDBCQUFxQixHQUFtRSxTQUFTLENBQUM7UUEzQ3pHLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNILElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFO1lBQzNFLElBQUksU0FBUyxLQUFLLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxNQUFNLEtBQUssUUFBUSxFQUFFLE1BQU0sSUFBSSxTQUFTLEVBQUUsVUFBVSxLQUFLLFFBQVEsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUMxSCxPQUFPO1lBQ1IsQ0FBQztZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO2dCQUN0RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFBQyxPQUFPO2dCQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQzVDLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQy9CLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLE1BQU0sZUFBZSxHQUFHLEVBQUUsQ0FBQztZQUMzQixJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUYsQ0FBQztZQUNELElBQUksQ0FBQyxvQ0FBb0MsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO1lBQy9DLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU87WUFDMUIsbUJBQW1CLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNyQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLHVCQUF1QixJQUFJLENBQUMsQ0FBQztZQUNoRSxDQUFDLENBQUM7WUFDRixRQUFRLEVBQUUsZUFBZSxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM5RCxtQkFBbUIsRUFBRSxLQUFLO1NBQzFCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGtCQUFrQixDQUFDLENBQW9CO1FBQzlDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssWUFBWSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7WUFDdkQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RyxDQUFDO0lBS08sc0JBQXNCLENBQUMsY0FBdUM7UUFDckUsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2pDLE9BQU87UUFDUixDQUFDO1FBRUQsY0FBYyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFekQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdELElBQUksZ0JBQWdCLEtBQUssSUFBSSxJQUFJLGdCQUFnQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUM1RixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BHLENBQUM7UUFFRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO0lBQ3hDLENBQUM7SUFFTyxXQUFXLENBQUMsWUFBb0QsRUFBRSxjQUF1QztRQUNoSCxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO1lBQzdDLGVBQWUsRUFBRSxZQUFZLENBQUMsVUFBVSxHQUFHLENBQUM7WUFDNUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsOEJBQThCO1lBQy9ELE9BQU8sRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO1NBQ2pCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQkFBcUIsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQztRQUV0SCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDN0QsSUFBSSxnQkFBZ0IsS0FBSyxJQUFJLElBQUksZ0JBQWdCLElBQUksWUFBWSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzlFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEYsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBblVZLDhCQUE4QjtJQW9QeEMsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGFBQWEsQ0FBQTtHQXJQSCw4QkFBOEIsQ0FtVTFDOztBQUVELFNBQVMsb0JBQW9CLENBQUMsTUFBZTtJQUM1QyxNQUFNLE1BQU0sR0FBWSxFQUFFLENBQUM7SUFDM0IsT0FBTyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDdEIsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRyxDQUFDO1FBQzVCLElBQUksS0FBSyxDQUFDLGVBQWUsS0FBSyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDbkQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUMzRixLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyw0QkFBNEI7UUFDMUksQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDO0FBRWYsQ0FBQyJ9