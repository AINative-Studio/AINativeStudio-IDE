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
import { $, getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Color } from '../../../../../../../base/common/color.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedObservableWithCache, observableFromEvent } from '../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, asCssVariableWithDefault } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { Rect } from '../../../../../../browser/rect.js';
import { EmbeddedCodeEditorWidget } from '../../../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Position } from '../../../../../../common/core/position.js';
import { Range } from '../../../../../../common/core/range.js';
import { StickyScrollController } from '../../../../../stickyScroll/browser/stickyScrollController.js';
import { InlineCompletionContextKeys } from '../../../controller/inlineCompletionContextKeys.js';
import { getEditorBlendedColor, getModifiedBorderColor, getOriginalBorderColor, modifiedBackgroundColor, originalBackgroundColor } from '../theme.js';
import { PathBuilder, getContentRenderWidth, getOffsetForPos, mapOutFalsy, maxContentWidthInRange } from '../utils/utils.js';
const HORIZONTAL_PADDING = 0;
const VERTICAL_PADDING = 0;
const ENABLE_OVERFLOW = false;
const BORDER_WIDTH = 1;
const WIDGET_SEPARATOR_WIDTH = 1;
const BORDER_RADIUS = 4;
const ORIGINAL_END_PADDING = 20;
const MODIFIED_END_PADDING = 12;
let InlineEditsSideBySideView = class InlineEditsSideBySideView extends Disposable {
    // This is an approximation and should be improved by using the real parameters used bellow
    static fitsInsideViewport(editor, textModel, edit, originalDisplayRange, reader) {
        const editorObs = observableCodeEditor(editor);
        const editorWidth = editorObs.layoutInfoWidth.read(reader);
        const editorContentLeft = editorObs.layoutInfoContentLeft.read(reader);
        const editorVerticalScrollbar = editor.getLayoutInfo().verticalScrollbarWidth;
        const minimapWidth = editorObs.layoutInfoMinimap.read(reader).minimapLeft !== 0 ? editorObs.layoutInfoMinimap.read(reader).minimapWidth : 0;
        const maxOriginalContent = maxContentWidthInRange(editorObs, originalDisplayRange, undefined /* do not reconsider on each layout info change */);
        const maxModifiedContent = edit.lineEdit.newLines.reduce((max, line) => Math.max(max, getContentRenderWidth(line, editor, textModel)), 0);
        const originalPadding = ORIGINAL_END_PADDING; // padding after last line of original editor
        const modifiedPadding = MODIFIED_END_PADDING + 2 * BORDER_WIDTH; // padding after last line of modified editor
        return maxOriginalContent + maxModifiedContent + originalPadding + modifiedPadding < editorWidth - editorContentLeft - editorVerticalScrollbar - minimapWidth;
    }
    constructor(_editor, _edit, _previewTextModel, _uiState, _tabAction, _instantiationService, _themeService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._previewTextModel = _previewTextModel;
        this._uiState = _uiState;
        this._tabAction = _tabAction;
        this._instantiationService = _instantiationService;
        this._themeService = _themeService;
        this._editorObs = observableCodeEditor(this._editor);
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._display = derived(this, reader => !!this._uiState.read(reader) ? 'block' : 'none');
        this.previewRef = n.ref();
        this._editorContainer = n.div({
            class: ['editorContainer'],
            style: { position: 'absolute', overflow: 'hidden', cursor: 'pointer' },
            onmousedown: e => {
                e.preventDefault(); // This prevents that the editor loses focus
            },
            onclick: (e) => {
                this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e));
            }
        }, [
            n.div({ class: 'preview', style: { pointerEvents: 'none' }, ref: this.previewRef }),
        ]).keepUpdated(this._store);
        this.isHovered = this._editorContainer.didMouseMoveDuringHover;
        this.previewEditor = this._register(this._instantiationService.createInstance(EmbeddedCodeEditorWidget, this.previewRef.element, {
            glyphMargin: false,
            lineNumbers: 'off',
            minimap: { enabled: false },
            guides: {
                indentation: false,
                bracketPairs: false,
                bracketPairsHorizontal: false,
                highlightActiveIndentation: false,
            },
            rulers: [],
            padding: { top: 0, bottom: 0 },
            folding: false,
            selectOnLineNumbers: false,
            selectionHighlight: false,
            columnSelection: false,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            revealHorizontalRightPadding: 0,
            bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: false },
            scrollBeyondLastLine: false,
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
                handleMouseWheel: false,
            },
            readOnly: true,
            wordWrap: 'off',
            wordWrapOverride1: 'off',
            wordWrapOverride2: 'off',
        }, {
            contextKeyValues: {
                [InlineCompletionContextKeys.inInlineEditsPreviewEditor.key]: true,
            },
            contributions: [],
        }, this._editor));
        this._previewEditorObs = observableCodeEditor(this.previewEditor);
        this._activeViewZones = [];
        this._updatePreviewEditor = derived(reader => {
            this._editorContainer.readEffect(reader);
            this._previewEditorObs.model.read(reader); // update when the model is set
            // Setting this here explicitly to make sure that the preview editor is
            // visible when needed, we're also checking that these fields are defined
            // because of the auto run initial
            // Before removing these, verify with a non-monospace font family
            this._display.read(reader);
            if (this._nonOverflowView) {
                this._nonOverflowView.element.style.display = this._display.read(reader);
            }
            const uiState = this._uiState.read(reader);
            const edit = this._edit.read(reader);
            if (!uiState || !edit) {
                return;
            }
            const range = edit.originalLineRange;
            const hiddenAreas = [];
            if (range.startLineNumber > 1) {
                hiddenAreas.push(new Range(1, 1, range.startLineNumber - 1, 1));
            }
            if (range.startLineNumber + uiState.newTextLineCount < this._previewTextModel.getLineCount() + 1) {
                hiddenAreas.push(new Range(range.startLineNumber + uiState.newTextLineCount, 1, this._previewTextModel.getLineCount() + 1, 1));
            }
            this.previewEditor.setHiddenAreas(hiddenAreas, undefined, true);
            // TODO: is this the proper way to handle viewzones?
            const previousViewZones = [...this._activeViewZones];
            this._activeViewZones = [];
            const reducedLinesCount = (range.endLineNumberExclusive - range.startLineNumber) - uiState.newTextLineCount;
            this.previewEditor.changeViewZones((changeAccessor) => {
                previousViewZones.forEach(id => changeAccessor.removeZone(id));
                if (reducedLinesCount > 0) {
                    this._activeViewZones.push(changeAccessor.addZone({
                        afterLineNumber: range.startLineNumber + uiState.newTextLineCount - 1,
                        heightInLines: reducedLinesCount,
                        showInHiddenAreas: true,
                        domNode: $('div.diagonal-fill.inline-edits-view-zone'),
                    }));
                }
            });
        });
        this._previewEditorWidth = derived(this, reader => {
            const edit = this._edit.read(reader);
            if (!edit) {
                return 0;
            }
            this._updatePreviewEditor.read(reader);
            return maxContentWidthInRange(this._previewEditorObs, edit.modifiedLineRange, reader);
        });
        this._cursorPosIfTouchesEdit = derived(this, reader => {
            const cursorPos = this._editorObs.cursorPosition.read(reader);
            const edit = this._edit.read(reader);
            if (!edit || !cursorPos) {
                return undefined;
            }
            return edit.modifiedLineRange.contains(cursorPos.lineNumber) ? cursorPos : undefined;
        });
        this._originalStartPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit ? new Position(inlineEdit.originalLineRange.startLineNumber, 1) : null;
        });
        this._originalEndPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit ? new Position(inlineEdit.originalLineRange.endLineNumberExclusive, 1) : null;
        });
        this._originalVerticalStartPosition = this._editorObs.observePosition(this._originalStartPosition, this._store).map(p => p?.y);
        this._originalVerticalEndPosition = this._editorObs.observePosition(this._originalEndPosition, this._store).map(p => p?.y);
        this._originalDisplayRange = this._uiState.map(s => s?.originalDisplayRange);
        this._editorMaxContentWidthInRange = derived(this, reader => {
            const originalDisplayRange = this._originalDisplayRange.read(reader);
            if (!originalDisplayRange) {
                return constObservable(0);
            }
            this._editorObs.versionId.read(reader);
            // Take the max value that we observed.
            // Reset when either the edit changes or the editor text version.
            return derivedObservableWithCache(this, (reader, lastValue) => {
                const maxWidth = maxContentWidthInRange(this._editorObs, originalDisplayRange, reader);
                return Math.max(maxWidth, lastValue ?? 0);
            });
        }).map((v, r) => v.read(r));
        this._previewEditorLayoutInfo = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            if (!inlineEdit) {
                return null;
            }
            const state = this._uiState.read(reader);
            if (!state) {
                return null;
            }
            const range = inlineEdit.originalLineRange;
            const horizontalScrollOffset = this._editorObs.scrollLeft.read(reader);
            const editorContentMaxWidthInRange = this._editorMaxContentWidthInRange.read(reader);
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const previewContentWidth = this._previewEditorWidth.read(reader);
            const editorContentAreaWidth = editorLayout.contentWidth - editorLayout.verticalScrollbarWidth;
            const editorBoundingClientRect = this._editor.getContainerDomNode().getBoundingClientRect();
            const clientContentAreaRight = editorLayout.contentLeft + editorLayout.contentWidth + editorBoundingClientRect.left;
            const remainingWidthRightOfContent = getWindow(this._editor.getContainerDomNode()).innerWidth - clientContentAreaRight;
            const remainingWidthRightOfEditor = getWindow(this._editor.getContainerDomNode()).innerWidth - editorBoundingClientRect.right;
            const desiredMinimumWidth = Math.min(editorLayout.contentWidth * 0.3, previewContentWidth, 100);
            const IN_EDITOR_DISPLACEMENT = 0;
            const maximumAvailableWidth = IN_EDITOR_DISPLACEMENT + remainingWidthRightOfContent;
            const cursorPos = this._cursorPosIfTouchesEdit.read(reader);
            const maxPreviewEditorLeft = Math.max(
            // We're starting from the content area right and moving it left by IN_EDITOR_DISPLACEMENT and also by an amount to ensure some minimum desired width
            editorContentAreaWidth + horizontalScrollOffset - IN_EDITOR_DISPLACEMENT - Math.max(0, desiredMinimumWidth - maximumAvailableWidth), 
            // But we don't want that the moving left ends up covering the cursor, so this will push it to the right again
            Math.min(cursorPos ? getOffsetForPos(this._editorObs, cursorPos, reader) + 50 : 0, editorContentAreaWidth + horizontalScrollOffset));
            const previewEditorLeftInTextArea = Math.min(editorContentMaxWidthInRange + ORIGINAL_END_PADDING, maxPreviewEditorLeft);
            const maxContentWidth = editorContentMaxWidthInRange + ORIGINAL_END_PADDING + previewContentWidth + 70;
            const dist = maxPreviewEditorLeft - previewEditorLeftInTextArea;
            let desiredPreviewEditorScrollLeft;
            let codeRight;
            if (previewEditorLeftInTextArea > horizontalScrollOffset) {
                desiredPreviewEditorScrollLeft = 0;
                codeRight = editorLayout.contentLeft + previewEditorLeftInTextArea - horizontalScrollOffset;
            }
            else {
                desiredPreviewEditorScrollLeft = horizontalScrollOffset - previewEditorLeftInTextArea;
                codeRight = editorLayout.contentLeft;
            }
            const selectionTop = this._originalVerticalStartPosition.read(reader) ?? this._editor.getTopForLineNumber(range.startLineNumber) - this._editorObs.scrollTop.read(reader);
            const selectionBottom = this._originalVerticalEndPosition.read(reader) ?? this._editor.getBottomForLineNumber(range.endLineNumberExclusive - 1) - this._editorObs.scrollTop.read(reader);
            // TODO: const { prefixLeftOffset } = getPrefixTrim(inlineEdit.edit.edits.map(e => e.range), inlineEdit.originalLineRange, [], this._editor);
            const codeLeft = editorLayout.contentLeft - horizontalScrollOffset;
            let codeRect = Rect.fromLeftTopRightBottom(codeLeft, selectionTop, codeRight, selectionBottom);
            const isInsertion = codeRect.height === 0;
            if (!isInsertion) {
                codeRect = codeRect.withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING);
            }
            const editHeight = this._editor.getOption(68 /* EditorOption.lineHeight */) * inlineEdit.modifiedLineRange.length;
            const codeHeight = selectionBottom - selectionTop;
            const previewEditorHeight = Math.max(codeHeight, editHeight);
            const clipped = dist === 0;
            const codeEditDist = 0;
            const previewEditorWidth = Math.min(previewContentWidth + MODIFIED_END_PADDING, remainingWidthRightOfEditor + editorLayout.width - editorLayout.contentLeft - codeEditDist);
            let editRect = Rect.fromLeftTopWidthHeight(codeRect.right + codeEditDist, selectionTop, previewEditorWidth, previewEditorHeight);
            if (!isInsertion) {
                editRect = editRect.withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING).translateX(HORIZONTAL_PADDING + BORDER_WIDTH);
            }
            else {
                // Align top of edit with insertion line
                editRect = editRect.withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING).translateY(VERTICAL_PADDING);
            }
            // debugView(debugLogRects({ codeRect, editRect }, this._editor.getDomNode()!), reader);
            return {
                codeRect,
                editRect,
                codeScrollLeft: horizontalScrollOffset,
                contentLeft: editorLayout.contentLeft,
                isInsertion,
                maxContentWidth,
                shouldShowShadow: clipped,
                desiredPreviewEditorScrollLeft,
                previewEditorWidth,
            };
        });
        this._stickyScrollController = StickyScrollController.get(this._editorObs.editor);
        this._stickyScrollHeight = this._stickyScrollController ? observableFromEvent(this._stickyScrollController.onDidChangeStickyScrollHeight, () => this._stickyScrollController.stickyScrollWidgetHeight) : constObservable(0);
        this._shouldOverflow = derived(reader => {
            if (!ENABLE_OVERFLOW) {
                return false;
            }
            const range = this._edit.read(reader)?.originalLineRange;
            if (!range) {
                return false;
            }
            const stickyScrollHeight = this._stickyScrollHeight.read(reader);
            const top = this._editor.getTopForLineNumber(range.startLineNumber) - this._editorObs.scrollTop.read(reader);
            if (top <= stickyScrollHeight) {
                return false;
            }
            const bottom = this._editor.getTopForLineNumber(range.endLineNumberExclusive) - this._editorObs.scrollTop.read(reader);
            if (bottom >= this._editorObs.layoutInfo.read(reader).height) {
                return false;
            }
            return true;
        });
        this._originalBackgroundColor = observableFromEvent(this, this._themeService.onDidColorThemeChange, () => {
            return this._themeService.getColorTheme().getColor(originalBackgroundColor) ?? Color.transparent;
        });
        this._backgroundSvg = n.svg({
            transform: 'translate(-0.5 -0.5)',
            style: { overflow: 'visible', pointerEvents: 'none', position: 'absolute' },
        }, [
            n.svgElem('path', {
                class: 'rightOfModifiedBackgroundCoverUp',
                d: derived(reader => {
                    const layoutInfo = this._previewEditorLayoutInfo.read(reader);
                    if (!layoutInfo) {
                        return undefined;
                    }
                    const originalBackgroundColor = this._originalBackgroundColor.read(reader);
                    if (originalBackgroundColor.isTransparent()) {
                        return undefined;
                    }
                    return new PathBuilder()
                        .moveTo(layoutInfo.codeRect.getRightTop())
                        .lineTo(layoutInfo.codeRect.getRightTop().deltaX(1000))
                        .lineTo(layoutInfo.codeRect.getRightBottom().deltaX(1000))
                        .lineTo(layoutInfo.codeRect.getRightBottom())
                        .build();
                }),
                style: {
                    fill: asCssVariableWithDefault(editorBackground, 'transparent'),
                }
            }),
        ]).keepUpdated(this._store);
        this._originalOverlay = n.div({
            style: { pointerEvents: 'none', display: this._previewEditorLayoutInfo.map(layoutInfo => layoutInfo?.isInsertion ? 'none' : 'block') },
        }, derived(reader => {
            const layoutInfoObs = mapOutFalsy(this._previewEditorLayoutInfo).read(reader);
            if (!layoutInfoObs) {
                return undefined;
            }
            const borderStyling = getOriginalBorderColor(this._tabAction).map(bc => `${BORDER_WIDTH}px solid ${asCssVariable(bc)}`);
            const borderStylingSeparator = `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`;
            const hasBorderLeft = layoutInfoObs.read(reader).codeScrollLeft !== 0;
            const isModifiedLower = layoutInfoObs.map(layoutInfo => layoutInfo.codeRect.bottom < layoutInfo.editRect.bottom);
            const transitionRectSize = BORDER_RADIUS * 2 + BORDER_WIDTH * 2;
            // Create an overlay which hides the left hand side of the original overlay when it overflows to the left
            // such that there is a smooth transition at the edge of content left
            const overlayHider = layoutInfoObs.map(layoutInfo => Rect.fromLeftTopRightBottom(layoutInfo.contentLeft - BORDER_RADIUS - BORDER_WIDTH, layoutInfo.codeRect.top, layoutInfo.contentLeft, layoutInfo.codeRect.bottom + transitionRectSize)).read(reader);
            const intersectionLine = new OffsetRange(overlayHider.left, Number.MAX_SAFE_INTEGER);
            const overlayRect = layoutInfoObs.map(layoutInfo => layoutInfo.codeRect.intersectHorizontal(intersectionLine));
            const separatorRect = overlayRect.map(overlayRect => overlayRect.withMargin(WIDGET_SEPARATOR_WIDTH, 0, WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH).intersectHorizontal(intersectionLine));
            const transitionRect = overlayRect.map(overlayRect => Rect.fromLeftTopWidthHeight(overlayRect.right - transitionRectSize + BORDER_WIDTH, overlayRect.bottom - BORDER_WIDTH, transitionRectSize, transitionRectSize).intersectHorizontal(intersectionLine));
            return [
                n.div({
                    class: 'originalSeparatorSideBySide',
                    style: {
                        ...separatorRect.read(reader).toStyles(),
                        boxSizing: 'border-box',
                        borderRadius: `${BORDER_RADIUS}px 0 0 ${BORDER_RADIUS}px`,
                        borderTop: borderStylingSeparator,
                        borderBottom: borderStylingSeparator,
                        borderLeft: hasBorderLeft ? 'none' : borderStylingSeparator,
                    }
                }),
                n.div({
                    class: 'originalOverlaySideBySide',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        boxSizing: 'border-box',
                        borderRadius: `${BORDER_RADIUS}px 0 0 ${BORDER_RADIUS}px`,
                        borderTop: borderStyling,
                        borderBottom: borderStyling,
                        borderLeft: hasBorderLeft ? 'none' : borderStyling,
                        backgroundColor: asCssVariable(originalBackgroundColor),
                    }
                }),
                n.div({
                    class: 'originalCornerCutoutSideBySide',
                    style: {
                        pointerEvents: 'none',
                        display: isModifiedLower.map(isLower => isLower ? 'block' : 'none'),
                        ...transitionRect.read(reader).toStyles(),
                    }
                }, [
                    n.div({
                        class: 'originalCornerCutoutBackground',
                        style: {
                            position: 'absolute', top: '0px', left: '0px', width: '100%', height: '100%',
                            backgroundColor: getEditorBlendedColor(originalBackgroundColor, this._themeService).map(c => c.toString()),
                        }
                    }),
                    n.div({
                        class: 'originalCornerCutoutBorder',
                        style: {
                            position: 'absolute', top: '0px', left: '0px', width: '100%', height: '100%',
                            boxSizing: 'border-box',
                            borderTop: borderStyling,
                            borderRight: borderStyling,
                            borderRadius: `0 100% 0 0`,
                            backgroundColor: asCssVariable(editorBackground)
                        }
                    })
                ]),
                n.div({
                    class: 'originalOverlaySideBySideHider',
                    style: {
                        ...overlayHider.toStyles(),
                        backgroundColor: asCssVariable(editorBackground),
                    }
                }),
            ];
        })).keepUpdated(this._store);
        this._modifiedOverlay = n.div({
            style: { pointerEvents: 'none', }
        }, derived(reader => {
            const layoutInfoObs = mapOutFalsy(this._previewEditorLayoutInfo).read(reader);
            if (!layoutInfoObs) {
                return undefined;
            }
            const isModifiedLower = layoutInfoObs.map(layoutInfo => layoutInfo.codeRect.bottom < layoutInfo.editRect.bottom);
            const borderRadius = isModifiedLower.map(isLower => `0 ${BORDER_RADIUS}px ${BORDER_RADIUS}px ${isLower ? BORDER_RADIUS : 0}px`);
            const borderStyling = getEditorBlendedColor(getModifiedBorderColor(this._tabAction), this._themeService).map(c => `1px solid ${c.toString()}`);
            const borderStylingSeparator = `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`;
            const overlayRect = layoutInfoObs.map(layoutInfo => layoutInfo.editRect.withMargin(0, BORDER_WIDTH));
            const separatorRect = overlayRect.map(overlayRect => overlayRect.withMargin(WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH, 0));
            const insertionRect = derived(reader => {
                const overlay = overlayRect.read(reader);
                const layoutinfo = layoutInfoObs.read(reader);
                if (!layoutinfo.isInsertion || layoutinfo.contentLeft >= overlay.left) {
                    return Rect.fromLeftTopWidthHeight(overlay.left, overlay.top, 0, 0);
                }
                return new Rect(layoutinfo.contentLeft, overlay.top, overlay.left, overlay.top + BORDER_WIDTH * 2);
            });
            return [
                n.div({
                    class: 'modifiedInsertionSideBySide',
                    style: {
                        ...insertionRect.read(reader).toStyles(),
                        backgroundColor: getModifiedBorderColor(this._tabAction).map(c => asCssVariable(c)),
                    }
                }),
                n.div({
                    class: 'modifiedSeparatorSideBySide',
                    style: {
                        ...separatorRect.read(reader).toStyles(),
                        borderRadius,
                        borderTop: borderStylingSeparator,
                        borderBottom: borderStylingSeparator,
                        borderRight: borderStylingSeparator,
                        boxSizing: 'border-box',
                    }
                }),
                n.div({
                    class: 'modifiedOverlaySideBySide',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        borderRadius,
                        border: borderStyling,
                        boxSizing: 'border-box',
                        backgroundColor: asCssVariable(modifiedBackgroundColor),
                    }
                })
            ];
        })).keepUpdated(this._store);
        this._nonOverflowView = n.div({
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
            this._backgroundSvg,
            derived(this, reader => this._shouldOverflow.read(reader) ? [] : [this._editorContainer, this._originalOverlay, this._modifiedOverlay]),
        ]).keepUpdated(this._store);
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._nonOverflowView.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derived(reader => {
                const x = this._previewEditorLayoutInfo.read(reader)?.maxContentWidth;
                if (x === undefined) {
                    return 0;
                }
                return x;
            }),
        }));
        this.previewEditor.setModel(this._previewTextModel);
        this._register(autorun(reader => {
            const layoutInfo = this._previewEditorLayoutInfo.read(reader);
            if (!layoutInfo) {
                return;
            }
            const editorRect = layoutInfo.editRect.withMargin(-VERTICAL_PADDING, -HORIZONTAL_PADDING);
            this.previewEditor.layout({ height: editorRect.height, width: layoutInfo.previewEditorWidth + 15 /* Make sure editor does not scroll horizontally */ });
            this._editorContainer.element.style.top = `${editorRect.top}px`;
            this._editorContainer.element.style.left = `${editorRect.left}px`;
            this._editorContainer.element.style.width = `${layoutInfo.previewEditorWidth + HORIZONTAL_PADDING}px`; // Set width to clip view zone
            //this._editorContainer.element.style.borderRadius = `0 ${BORDER_RADIUS}px ${BORDER_RADIUS}px 0`;
        }));
        this._register(autorun(reader => {
            const layoutInfo = this._previewEditorLayoutInfo.read(reader);
            if (!layoutInfo) {
                return;
            }
            this._previewEditorObs.editor.setScrollLeft(layoutInfo.desiredPreviewEditorScrollLeft);
        }));
        this._updatePreviewEditor.recomputeInitiallyAndOnChange(this._store);
    }
};
InlineEditsSideBySideView = __decorate([
    __param(5, IInstantiationService),
    __param(6, IThemeService)
], InlineEditsSideBySideView);
export { InlineEditsSideBySideView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNTaWRlQnlTaWRlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2lubGluZUVkaXRzU2lkZUJ5U2lkZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUF3QixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFLLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQzVHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFM0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDekYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FB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