var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, derivedWithStore, observableValue } from '../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { Rect } from '../../../../../../browser/rect.js';
import { LineSource, renderLines, RenderOptions } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { LineRange } from '../../../../../../common/core/lineRange.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Position } from '../../../../../../common/core/position.js';
import { Range } from '../../../../../../common/core/range.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens } from '../../../../../../common/tokens/lineTokens.js';
import { TokenArray } from '../../../../../../common/tokens/tokenArray.js';
import { InlineDecoration } from '../../../../../../common/viewModel.js';
import { GhostText, GhostTextPart } from '../../../model/ghostText.js';
import { GhostTextView } from '../../ghostText/ghostTextView.js';
import { getModifiedBorderColor, modifiedBackgroundColor } from '../theme.js';
import { getPrefixTrim, mapOutFalsy } from '../utils/utils.js';
const BORDER_WIDTH = 1;
const WIDGET_SEPARATOR_WIDTH = 1;
const BORDER_RADIUS = 4;
let InlineEditsInsertionView = class InlineEditsInsertionView extends Disposable {
    constructor(_editor, _input, _tabAction, instantiationService, _languageService) {
        super();
        this._editor = _editor;
        this._input = _input;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._state = derived(this, reader => {
            const state = this._input.read(reader);
            if (!state) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            if (state.startColumn === 1 && state.lineNumber > 1 && textModel.getLineLength(state.lineNumber) !== 0 && state.text.endsWith(eol) && !state.text.startsWith(eol)) {
                const endOfLineColumn = textModel.getLineLength(state.lineNumber - 1) + 1;
                return { lineNumber: state.lineNumber - 1, column: endOfLineColumn, text: eol + state.text.slice(0, -eol.length) };
            }
            return { lineNumber: state.lineNumber, column: state.startColumn, text: state.text };
        });
        this._trimVertically = derived(this, reader => {
            const text = this._state.read(reader)?.text;
            if (!text || text.trim() === '') {
                return { topOffset: 0, bottomOffset: 0, linesTop: 0, linesBottom: 0 };
            }
            // Adjust for leading/trailing newlines
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            const eol = this._editor.getModel().getEOL();
            let linesTop = 0;
            let linesBottom = 0;
            let i = 0;
            for (; i < text.length && text.startsWith(eol, i); i += eol.length) {
                linesTop += 1;
            }
            for (let j = text.length; j > i && text.endsWith(eol, j); j -= eol.length) {
                linesBottom += 1;
            }
            return { topOffset: linesTop * lineHeight, bottomOffset: linesBottom * lineHeight, linesTop, linesBottom };
        });
        this._maxPrefixTrim = derived(reader => {
            const state = this._state.read(reader);
            if (!state) {
                return { prefixLeftOffset: 0, prefixTrim: 0 };
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const trimVertically = this._trimVertically.read(reader);
            const lines = state.text.split(eol);
            const modifiedLines = lines.slice(trimVertically.linesTop, lines.length - trimVertically.linesBottom);
            if (trimVertically.linesTop === 0) {
                modifiedLines[0] = textModel.getLineContent(state.lineNumber) + modifiedLines[0];
            }
            const originalRange = new LineRange(state.lineNumber, state.lineNumber + (trimVertically.linesTop > 0 ? 0 : 1));
            return getPrefixTrim([], originalRange, modifiedLines, this._editor);
        });
        this._ghostText = derived(reader => {
            const state = this._state.read(reader);
            const prefixTrim = this._maxPrefixTrim.read(reader);
            if (!state) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const modifiedLines = state.text.split(eol);
            const inlineDecorations = modifiedLines.map((line, i) => new InlineDecoration(new Range(i + 1, i === 0 ? 1 : prefixTrim.prefixTrim + 1, i + 1, line.length + 1), 'modified-background', 0 /* InlineDecorationType.Regular */));
            return new GhostText(state.lineNumber, [new GhostTextPart(state.column, state.text, false, inlineDecorations)]);
        });
        this._display = derived(this, reader => !!this._state.read(reader) ? 'block' : 'none');
        this._editorMaxContentWidthInRange = derived(this, reader => {
            const state = this._state.read(reader);
            if (!state) {
                return 0;
            }
            this._editorObs.versionId.read(reader);
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const textBeforeInsertion = state.text.startsWith(eol) ? '' : textModel.getValueInRange(new Range(state.lineNumber, 1, state.lineNumber, state.column));
            const textAfterInsertion = textModel.getValueInRange(new Range(state.lineNumber, state.column, state.lineNumber, textModel.getLineLength(state.lineNumber) + 1));
            const text = textBeforeInsertion + state.text + textAfterInsertion;
            const lines = text.split(eol);
            const renderOptions = RenderOptions.fromEditor(this._editor).withSetWidth(false).withScrollBeyondLastColumn(0);
            const lineWidths = lines.map(line => {
                const t = textModel.tokenization.tokenizeLinesAt(state.lineNumber, [line])?.[0];
                let tokens;
                if (t) {
                    tokens = TokenArray.fromLineTokens(t).toLineTokens(line, this._languageService.languageIdCodec);
                }
                else {
                    tokens = LineTokens.createEmpty(line, this._languageService.languageIdCodec);
                }
                return renderLines(new LineSource([tokens]), renderOptions, [], $('div'), true).minWidthInPx;
            });
            // Take the max value that we observed.
            // Reset when either the edit changes or the editor text version.
            return Math.max(...lineWidths);
        });
        this.startLineOffset = this._trimVertically.map(v => v.topOffset);
        this.originalLines = this._state.map(s => s ?
            new LineRange(s.lineNumber, Math.min(s.lineNumber + 2, this._editor.getModel().getLineCount() + 1)) : undefined);
        this._overlayLayout = derivedWithStore(this, (reader, store) => {
            this._ghostText.read(reader);
            const state = this._state.read(reader);
            if (!state) {
                return null;
            }
            // Update the overlay when the position changes
            this._editorObs.observePosition(observableValue(this, new Position(state.lineNumber, state.column)), store).read(reader);
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const horizontalScrollOffset = this._editorObs.scrollLeft.read(reader);
            const verticalScrollbarWidth = this._editorObs.layoutInfoVerticalScrollbarWidth.read(reader);
            const right = editorLayout.contentLeft + this._editorMaxContentWidthInRange.read(reader) - horizontalScrollOffset;
            const prefixLeftOffset = this._maxPrefixTrim.read(reader).prefixLeftOffset ?? 0 /* fix due to observable bug? */;
            const left = editorLayout.contentLeft + prefixLeftOffset - horizontalScrollOffset;
            if (right <= left) {
                return null;
            }
            const { topOffset: topTrim, bottomOffset: bottomTrim } = this._trimVertically.read(reader);
            const scrollTop = this._editorObs.scrollTop.read(reader);
            const height = this._ghostTextView.height.read(reader) - topTrim - bottomTrim;
            const top = this._editor.getTopForLineNumber(state.lineNumber) - scrollTop + topTrim;
            const bottom = top + height;
            const overlay = new Rect(left, top, right, bottom);
            return {
                overlay,
                startsAtContentLeft: prefixLeftOffset === 0,
                contentLeft: editorLayout.contentLeft,
                minContentWidthRequired: prefixLeftOffset + overlay.width + verticalScrollbarWidth,
            };
        }).recomputeInitiallyAndOnChange(this._store);
        this._modifiedOverlay = n.div({
            style: { pointerEvents: 'none', }
        }, derived(reader => {
            const overlayLayoutObs = mapOutFalsy(this._overlayLayout).read(reader);
            if (!overlayLayoutObs) {
                return undefined;
            }
            // Create an overlay which hides the left hand side of the original overlay when it overflows to the left
            // such that there is a smooth transition at the edge of content left
            const overlayHider = overlayLayoutObs.map(layoutInfo => Rect.fromLeftTopRightBottom(layoutInfo.contentLeft - BORDER_RADIUS - BORDER_WIDTH, layoutInfo.overlay.top, layoutInfo.contentLeft, layoutInfo.overlay.bottom)).read(reader);
            const overlayRect = overlayLayoutObs.map(l => l.overlay.withMargin(0, BORDER_WIDTH, 0, l.startsAtContentLeft ? 0 : BORDER_WIDTH).intersectHorizontal(new OffsetRange(overlayHider.left, Number.MAX_SAFE_INTEGER)));
            const underlayRect = overlayRect.map(rect => rect.withMargin(WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH));
            return [
                n.div({
                    class: 'originalUnderlayInsertion',
                    style: {
                        ...underlayRect.read(reader).toStyles(),
                        borderRadius: BORDER_RADIUS,
                        border: `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`,
                        boxSizing: 'border-box',
                    }
                }),
                n.div({
                    class: 'originalOverlayInsertion',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        borderRadius: BORDER_RADIUS,
                        border: getModifiedBorderColor(this._tabAction).map(bc => `${BORDER_WIDTH}px solid ${asCssVariable(bc)}`),
                        boxSizing: 'border-box',
                        backgroundColor: asCssVariable(modifiedBackgroundColor),
                    }
                }),
                n.div({
                    class: 'originalOverlayHiderInsertion',
                    style: {
                        ...overlayHider.toStyles(),
                        backgroundColor: asCssVariable(editorBackground),
                    }
                })
            ];
        })).keepUpdated(this._store);
        this._view = n.div({
            class: 'inline-edits-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                zIndex: '0',
                display: this._display,
            },
        }, [
            [this._modifiedOverlay],
        ]).keepUpdated(this._store);
        this._editorObs = observableCodeEditor(this._editor);
        this._ghostTextView = this._register(instantiationService.createInstance(GhostTextView, this._editor, {
            ghostText: this._ghostText,
            minReservedLineCount: constObservable(0),
            targetTextModel: this._editorObs.model.map(model => model ?? undefined),
            warning: constObservable(undefined),
        }, observableValue(this, { syntaxHighlightingEnabled: true, extraClasses: ['inline-edit'] }), true, true));
        this.isHovered = this._ghostTextView.isHovered;
        this._register(this._ghostTextView.onDidClick((e) => {
            this._onDidClick.fire(e);
        }));
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._view.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derived(reader => {
                const info = this._overlayLayout.read(reader);
                if (info === null) {
                    return 0;
                }
                return info.minContentWidthRequired;
            }),
        }));
    }
};
InlineEditsInsertionView = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILanguageService)
], InlineEditsInsertionView);
export { InlineEditsInsertionView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNJbnNlcnRpb25WaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2lubGluZUVkaXRzSW5zZXJ0aW9uVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUksT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRXpGLE9BQU8sRUFBd0Isb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkZBQTJGLENBQUM7QUFFbkosT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDckUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUF3QixNQUFNLHVDQUF1QyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRS9ELE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztBQUN2QixNQUFNLHNCQUFzQixHQUFHLENBQUMsQ0FBQztBQUNqQyxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQUM7QUFFakIsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBd0Z2RCxZQUNrQixPQUFvQixFQUNwQixNQUlILEVBQ0csVUFBNEMsRUFDdEMsb0JBQTJDLEVBQ2hELGdCQUFtRDtRQUVyRSxLQUFLLEVBQUUsQ0FBQztRQVZTLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsV0FBTSxHQUFOLE1BQU0sQ0FJVDtRQUNHLGVBQVUsR0FBVixVQUFVLENBQWtDO1FBRTFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUE5RnJELGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZSxDQUFDLENBQUM7UUFDakUsZUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO1FBRTVCLFdBQU0sR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ2hELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFBQyxPQUFPLFNBQVMsQ0FBQztZQUFDLENBQUM7WUFFakMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUMzQyxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFFL0IsSUFBSSxLQUFLLENBQUMsV0FBVyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsSUFBSSxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuSyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNwSCxDQUFDO1lBRUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDdEYsQ0FBQyxDQUFDLENBQUM7UUFFYyxvQkFBZSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUU7WUFDekQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDO1lBQzVDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3ZFLENBQUM7WUFFRCx1Q0FBdUM7WUFDdkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLGtDQUF5QixDQUFDO1lBQ25FLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztZQUVwQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDVixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3BFLFFBQVEsSUFBSSxDQUFDLENBQUM7WUFDZixDQUFDO1lBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDM0UsV0FBVyxJQUFJLENBQUMsQ0FBQztZQUNsQixDQUFDO1lBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEdBQUcsVUFBVSxFQUFFLFlBQVksRUFBRSxXQUFXLEdBQUcsVUFBVSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsQ0FBQztRQUM1RyxDQUFDLENBQUMsQ0FBQztRQUVjLG1CQUFjLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2xELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMvQyxDQUFDO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUMzQyxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFFL0IsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFekQsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEMsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3RHLElBQUksY0FBYyxDQUFDLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsYUFBYSxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRixDQUFDO1lBRUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsY0FBYyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVoSCxPQUFPLGFBQWEsQ0FBQyxFQUFFLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdEUsQ0FBQyxDQUFDLENBQUM7UUFFYyxlQUFVLEdBQUcsT0FBTyxDQUF3QixNQUFNLENBQUMsRUFBRTtZQUNyRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQUMsT0FBTyxTQUFTLENBQUM7WUFBQyxDQUFDO1lBRWpDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUM7WUFDM0MsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQy9CLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRTVDLE1BQU0saUJBQWlCLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksZ0JBQWdCLENBQzVFLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEVBQ2pGLHFCQUFxQix1Q0FFckIsQ0FBQyxDQUFDO1lBRUgsT0FBTyxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqSCxDQUFDLENBQUMsQ0FBQztRQW1EYyxhQUFRLEdBQUcsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVsRixrQ0FBNkIsR0FBRyxPQUFPLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ3ZFLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPLENBQUMsQ0FBQztZQUNWLENBQUM7WUFDRCxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUcsQ0FBQztZQUMzQyxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7WUFFL0IsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDeEosTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakssTUFBTSxJQUFJLEdBQUcsbUJBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksR0FBRyxrQkFBa0IsQ0FBQztZQUNuRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRTlCLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNuQyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNoRixJQUFJLE1BQWtCLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ1AsTUFBTSxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ2pHLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxNQUFNLEdBQUcsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUM5RSxDQUFDO2dCQUVELE9BQU8sV0FBVyxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxhQUFhLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUM7WUFDOUYsQ0FBQyxDQUFDLENBQUM7WUFFSCx1Q0FBdUM7WUFDdkMsaUVBQWlFO1lBQ2pFLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBQ2hDLENBQUMsQ0FBQyxDQUFDO1FBRWEsb0JBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3RCxrQkFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkQsSUFBSSxTQUFTLENBQ1osQ0FBQyxDQUFDLFVBQVUsRUFDWixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQ3ZFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FDYixDQUFDO1FBRWUsbUJBQWMsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDMUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELCtDQUErQztZQUMvQyxJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRXpILE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM3RCxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN2RSxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBRTdGLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQztZQUNsSCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQztZQUNqSCxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsV0FBVyxHQUFHLGdCQUFnQixHQUFHLHNCQUFzQixDQUFDO1lBQ2xGLElBQUksS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNuQixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFM0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxPQUFPLEdBQUcsVUFBVSxDQUFDO1lBQzlFLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLFNBQVMsR0FBRyxPQUFPLENBQUM7WUFDckYsTUFBTSxNQUFNLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQztZQUU1QixNQUFNLE9BQU8sR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUVuRCxPQUFPO2dCQUNOLE9BQU87Z0JBQ1AsbUJBQW1CLEVBQUUsZ0JBQWdCLEtBQUssQ0FBQztnQkFDM0MsV0FBVyxFQUFFLFlBQVksQ0FBQyxXQUFXO2dCQUNyQyx1QkFBdUIsRUFBRSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsS0FBSyxHQUFHLHNCQUFzQjthQUNsRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTdCLHFCQUFnQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDekMsS0FBSyxFQUFFLEVBQUUsYUFBYSxFQUFFLE1BQU0sR0FBRztTQUNqQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNuQixNQUFNLGdCQUFnQixHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUFDLE9BQU8sU0FBUyxDQUFDO1lBQUMsQ0FBQztZQUU1Qyx5R0FBeUc7WUFDekcscUVBQXFFO1lBQ3JFLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FDbEYsVUFBVSxDQUFDLFdBQVcsR0FBRyxhQUFhLEdBQUcsWUFBWSxFQUNyRCxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFDdEIsVUFBVSxDQUFDLFdBQVcsRUFDdEIsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQ3pCLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFaEIsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLG1CQUFtQixDQUFDLElBQUksV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25OLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLENBQUMsQ0FBQztZQUU5RyxPQUFPO2dCQUNOLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsS0FBSyxFQUFFLDJCQUEyQjtvQkFDbEMsS0FBSyxFQUFFO3dCQUNOLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7d0JBQ3ZDLFlBQVksRUFBRSxhQUFhO3dCQUMzQixNQUFNLEVBQUUsR0FBRyxZQUFZLEdBQUcsc0JBQXNCLFlBQVksYUFBYSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7d0JBQzdGLFNBQVMsRUFBRSxZQUFZO3FCQUN2QjtpQkFDRCxDQUFDO2dCQUNGLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ0wsS0FBSyxFQUFFLDBCQUEwQjtvQkFDakMsS0FBSyxFQUFFO3dCQUNOLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUU7d0JBQ3RDLFlBQVksRUFBRSxhQUFhO3dCQUMzQixNQUFNLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsWUFBWSxZQUFZLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO3dCQUN6RyxTQUFTLEVBQUUsWUFBWTt3QkFDdkIsZUFBZSxFQUFFLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztxQkFDdkQ7aUJBQ0QsQ0FBQztnQkFDRixDQUFDLENBQUMsR0FBRyxDQUFDO29CQUNMLEtBQUssRUFBRSwrQkFBK0I7b0JBQ3RDLEtBQUssRUFBRTt3QkFDTixHQUFHLFlBQVksQ0FBQyxRQUFRLEVBQUU7d0JBQzFCLGVBQWUsRUFBRSxhQUFhLENBQUMsZ0JBQWdCLENBQUM7cUJBQ2hEO2lCQUNELENBQUM7YUFDRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRVosVUFBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFDOUIsS0FBSyxFQUFFLG1CQUFtQjtZQUMxQixLQUFLLEVBQUU7Z0JBQ04sUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixHQUFHLEVBQUUsS0FBSztnQkFDVixJQUFJLEVBQUUsS0FBSztnQkFDWCxNQUFNLEVBQUUsR0FBRztnQkFDWCxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVE7YUFDdEI7U0FDRCxFQUFFO1lBQ0YsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7U0FDdkIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUE3SzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXJELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUNyRixJQUFJLENBQUMsT0FBTyxFQUNaO1lBQ0MsU0FBUyxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzFCLG9CQUFvQixFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDeEMsZUFBZSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUM7WUFDdkUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUM7U0FDbkMsRUFDRCxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUseUJBQXlCLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsRUFDekYsSUFBSSxFQUNKLElBQUksQ0FDSixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO1FBRS9DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDO1lBQ2xELE9BQU8sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU87WUFDM0IsUUFBUSxFQUFFLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDL0IsbUJBQW1CLEVBQUUsS0FBSztZQUMxQixtQkFBbUIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQ3JDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QyxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFBQyxPQUFPLENBQUMsQ0FBQztnQkFBQyxDQUFDO2dCQUNoQyxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztZQUNyQyxDQUFDLENBQUM7U0FDRixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0ErSUQsQ0FBQTtBQW5SWSx3QkFBd0I7SUFnR2xDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQkFBZ0IsQ0FBQTtHQWpHTix3QkFBd0IsQ0FtUnBDIn0=