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
var GhostTextView_1;
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { renderIcon } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { createHotClass } from '../../../../../../base/common/hotReloadHelpers.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, observableSignalFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import * as strings from '../../../../../../base/common/strings.js';
import { applyFontInfo } from '../../../../../browser/config/domFontInfo.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { EditorFontLigatures } from '../../../../../common/config/editorOptions.js';
import { OffsetEdit, SingleOffsetEdit } from '../../../../../common/core/offsetEdit.js';
import { Position } from '../../../../../common/core/position.js';
import { Range } from '../../../../../common/core/range.js';
import { StringBuilder } from '../../../../../common/core/stringBuilder.js';
import { ILanguageService } from '../../../../../common/languages/language.js';
import { InjectedTextCursorStops } from '../../../../../common/model.js';
import { LineTokens } from '../../../../../common/tokens/lineTokens.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../../../common/viewLayout/viewLineRenderer.js';
import { GhostTextReplacement } from '../../model/ghostText.js';
import { ColumnRange } from '../../utils.js';
import { addDisposableListener, getWindow, isHTMLElement, n } from '../../../../../../base/browser/dom.js';
import './ghostTextView.css';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { CodeEditorWidget } from '../../../../../browser/widget/codeEditor/codeEditorWidget.js';
const USE_SQUIGGLES_FOR_WARNING = true;
const GHOST_TEXT_CLASS_NAME = 'ghost-text';
let GhostTextView = class GhostTextView extends Disposable {
    static { GhostTextView_1 = this; }
    static { this.hot = createHotClass(GhostTextView_1); }
    constructor(_editor, _model, _options, _shouldKeepCursorStable, _isClickable, _languageService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._options = _options;
        this._shouldKeepCursorStable = _shouldKeepCursorStable;
        this._isClickable = _isClickable;
        this._languageService = _languageService;
        this._isDisposed = observableValue(this, false);
        this._editorObs = observableCodeEditor(this._editor);
        this._warningState = derived(reader => {
            const gt = this._model.ghostText.read(reader);
            if (!gt) {
                return undefined;
            }
            const warning = this._model.warning.read(reader);
            if (!warning) {
                return undefined;
            }
            return { lineNumber: gt.lineNumber, position: new Position(gt.lineNumber, gt.parts[0].column), icon: warning.icon };
        });
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._useSyntaxHighlighting = this._options.map(o => o.syntaxHighlightingEnabled);
        this._extraClassNames = derived(this, reader => {
            const extraClasses = [...this._options.read(reader).extraClasses ?? []];
            if (this._useSyntaxHighlighting.read(reader)) {
                extraClasses.push('syntax-highlighted');
            }
            if (USE_SQUIGGLES_FOR_WARNING && this._warningState.read(reader)) {
                extraClasses.push('warning');
            }
            const extraClassNames = extraClasses.map(c => ` ${c}`).join('');
            return extraClassNames;
        });
        this.uiState = derived(this, reader => {
            if (this._isDisposed.read(reader)) {
                return undefined;
            }
            const textModel = this._editorObs.model.read(reader);
            if (textModel !== this._model.targetTextModel.read(reader)) {
                return undefined;
            }
            const ghostText = this._model.ghostText.read(reader);
            if (!ghostText) {
                return undefined;
            }
            const replacedRange = ghostText instanceof GhostTextReplacement ? ghostText.columnRange : undefined;
            const syntaxHighlightingEnabled = this._useSyntaxHighlighting.read(reader);
            const extraClassNames = this._extraClassNames.read(reader);
            const { inlineTexts, additionalLines, hiddenRange } = computeGhostTextViewData(ghostText, textModel, GHOST_TEXT_CLASS_NAME + extraClassNames);
            const currentLine = textModel.getLineContent(ghostText.lineNumber);
            const edit = new OffsetEdit(inlineTexts.map(t => SingleOffsetEdit.insert(t.column - 1, t.text)));
            const tokens = syntaxHighlightingEnabled ? textModel.tokenization.tokenizeLinesAt(ghostText.lineNumber, [edit.apply(currentLine), ...additionalLines.map(l => l.content)]) : undefined;
            const newRanges = edit.getNewTextRanges();
            const inlineTextsWithTokens = inlineTexts.map((t, idx) => ({ ...t, tokens: tokens?.[0]?.getTokensInRange(newRanges[idx]) }));
            const tokenizedAdditionalLines = additionalLines.map((l, idx) => ({
                content: tokens?.[idx + 1] ?? LineTokens.createEmpty(l.content, this._languageService.languageIdCodec),
                decorations: l.decorations,
            }));
            return {
                replacedRange,
                inlineTexts: inlineTextsWithTokens,
                additionalLines: tokenizedAdditionalLines,
                hiddenRange,
                lineNumber: ghostText.lineNumber,
                additionalReservedLineCount: this._model.minReservedLineCount.read(reader),
                targetTextModel: textModel,
                syntaxHighlightingEnabled,
            };
        });
        this.decorations = derived(this, reader => {
            const uiState = this.uiState.read(reader);
            if (!uiState) {
                return [];
            }
            const decorations = [];
            const extraClassNames = this._extraClassNames.read(reader);
            if (uiState.replacedRange) {
                decorations.push({
                    range: uiState.replacedRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'inline-completion-text-to-replace' + extraClassNames, description: 'GhostTextReplacement' }
                });
            }
            if (uiState.hiddenRange) {
                decorations.push({
                    range: uiState.hiddenRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'ghost-text-hidden', description: 'ghost-text-hidden', }
                });
            }
            for (const p of uiState.inlineTexts) {
                decorations.push({
                    range: Range.fromPositions(new Position(uiState.lineNumber, p.column)),
                    options: {
                        description: 'ghost-text-decoration',
                        after: {
                            content: p.text,
                            tokens: p.tokens,
                            inlineClassName: (p.preview ? 'ghost-text-decoration-preview' : 'ghost-text-decoration')
                                + (this._isClickable ? ' clickable' : '')
                                + extraClassNames
                                + p.lineDecorations.map(d => ' ' + d.className).join(' '), // TODO: take the ranges into account for line decorations
                            cursorStops: InjectedTextCursorStops.Left,
                            attachedData: new GhostTextAttachedData(this),
                        },
                        showIfCollapsed: true,
                    }
                });
            }
            return decorations;
        });
        this._additionalLinesWidget = this._register(new AdditionalLinesWidget(this._editor, derived(reader => {
            /** @description lines */
            const uiState = this.uiState.read(reader);
            return uiState ? {
                lineNumber: uiState.lineNumber,
                additionalLines: uiState.additionalLines,
                minReservedLineCount: uiState.additionalReservedLineCount,
                targetTextModel: uiState.targetTextModel,
            } : undefined;
        }), this._shouldKeepCursorStable, this._isClickable));
        this._isInlineTextHovered = this._editorObs.isTargetHovered(p => p.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            p.target.detail.injectedText?.options.attachedData instanceof GhostTextAttachedData &&
            p.target.detail.injectedText.options.attachedData.owner === this, this._store);
        this.isHovered = derived(this, reader => {
            if (this._isDisposed.read(reader)) {
                return false;
            }
            return this._isInlineTextHovered.read(reader) || this._additionalLinesWidget.isHovered.read(reader);
        });
        this.height = derived(this, reader => {
            const lineHeight = this._editorObs.getOption(68 /* EditorOption.lineHeight */).read(reader);
            return lineHeight + (this._additionalLinesWidget.viewZoneHeight.read(reader) ?? 0);
        });
        this._register(toDisposable(() => { this._isDisposed.set(true, undefined); }));
        this._register(this._editorObs.setDecorations(this.decorations));
        if (this._isClickable) {
            this._register(this._additionalLinesWidget.onDidClick((e) => this._onDidClick.fire(e)));
            this._register(this._editor.onMouseUp(e => {
                if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                    return;
                }
                const a = e.target.detail.injectedText?.options.attachedData;
                if (a instanceof GhostTextAttachedData && a.owner === this) {
                    this._onDidClick.fire(e.event);
                }
            }));
        }
        this._register(autorunWithStore((reader, store) => {
            if (USE_SQUIGGLES_FOR_WARNING) {
                return;
            }
            const state = this._warningState.read(reader);
            if (!state) {
                return;
            }
            const lineHeight = this._editorObs.getOption(68 /* EditorOption.lineHeight */);
            store.add(this._editorObs.createContentWidget({
                position: constObservable({
                    position: new Position(state.lineNumber, Number.MAX_SAFE_INTEGER),
                    preference: [0 /* ContentWidgetPositionPreference.EXACT */],
                    positionAffinity: 1 /* PositionAffinity.Right */,
                }),
                allowEditorOverflow: false,
                domNode: n.div({
                    class: 'ghost-text-view-warning-widget',
                    style: {
                        width: lineHeight,
                        height: lineHeight,
                        marginLeft: 4,
                        color: 'orange',
                    },
                    ref: (dom) => {
                        dom.ghostTextViewWarningWidgetData = { range: Range.fromPositions(state.position) };
                    }
                }, [
                    n.div({
                        class: 'ghost-text-view-warning-widget-icon',
                        style: {
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignContent: 'center',
                            alignItems: 'center',
                        }
                    }, [
                        renderIcon((state.icon && 'id' in state.icon) ? state.icon : Codicon.warning),
                    ])
                ]).keepUpdated(store).element,
            }));
        }));
    }
    static getWarningWidgetContext(domNode) {
        const data = domNode.ghostTextViewWarningWidgetData;
        if (data) {
            return data;
        }
        else if (domNode.parentElement) {
            return this.getWarningWidgetContext(domNode.parentElement);
        }
        return undefined;
    }
    ownsViewZone(viewZoneId) {
        return this._additionalLinesWidget.viewZoneId === viewZoneId;
    }
};
GhostTextView = GhostTextView_1 = __decorate([
    __param(5, ILanguageService)
], GhostTextView);
export { GhostTextView };
class GhostTextAttachedData {
    constructor(owner) {
        this.owner = owner;
    }
}
function computeGhostTextViewData(ghostText, textModel, ghostTextClassName) {
    const inlineTexts = [];
    const additionalLines = [];
    function addToAdditionalLines(ghLines, className) {
        if (additionalLines.length > 0) {
            const lastLine = additionalLines[additionalLines.length - 1];
            if (className) {
                lastLine.decorations.push(new LineDecoration(lastLine.content.length + 1, lastLine.content.length + 1 + ghLines[0].line.length, className, 0 /* InlineDecorationType.Regular */));
            }
            lastLine.content += ghLines[0].line;
            ghLines = ghLines.slice(1);
        }
        for (const ghLine of ghLines) {
            additionalLines.push({
                content: ghLine.line,
                decorations: className ? [new LineDecoration(1, ghLine.line.length + 1, className, 0 /* InlineDecorationType.Regular */), ...ghLine.lineDecorations] : [...ghLine.lineDecorations]
            });
        }
    }
    const textBufferLine = textModel.getLineContent(ghostText.lineNumber);
    let hiddenTextStartColumn = undefined;
    let lastIdx = 0;
    for (const part of ghostText.parts) {
        let ghLines = part.lines;
        if (hiddenTextStartColumn === undefined) {
            inlineTexts.push({ column: part.column, text: ghLines[0].line, preview: part.preview, lineDecorations: ghLines[0].lineDecorations });
            ghLines = ghLines.slice(1);
        }
        else {
            addToAdditionalLines([{ line: textBufferLine.substring(lastIdx, part.column - 1), lineDecorations: [] }], undefined);
        }
        if (ghLines.length > 0) {
            addToAdditionalLines(ghLines, ghostTextClassName);
            if (hiddenTextStartColumn === undefined && part.column <= textBufferLine.length) {
                hiddenTextStartColumn = part.column;
            }
        }
        lastIdx = part.column - 1;
    }
    if (hiddenTextStartColumn !== undefined) {
        addToAdditionalLines([{ line: textBufferLine.substring(lastIdx), lineDecorations: [] }], undefined);
    }
    const hiddenRange = hiddenTextStartColumn !== undefined ? new ColumnRange(hiddenTextStartColumn, textBufferLine.length + 1) : undefined;
    return {
        inlineTexts,
        additionalLines,
        hiddenRange,
    };
}
export class AdditionalLinesWidget extends Disposable {
    get viewZoneId() { return this._viewZoneInfo?.viewZoneId; }
    get viewZoneHeight() { return this._viewZoneHeight; }
    constructor(_editor, _lines, _shouldKeepCursorStable, _isClickable) {
        super();
        this._editor = _editor;
        this._lines = _lines;
        this._shouldKeepCursorStable = _shouldKeepCursorStable;
        this._isClickable = _isClickable;
        this._viewZoneHeight = observableValue('viewZoneHeight', undefined);
        this.editorOptionsChanged = observableSignalFromEvent('editorOptionChanged', Event.filter(this._editor.onDidChangeConfiguration, e => e.hasChanged(33 /* EditorOption.disableMonospaceOptimizations */)
            || e.hasChanged(122 /* EditorOption.stopRenderingLineAfter */)
            || e.hasChanged(104 /* EditorOption.renderWhitespace */)
            || e.hasChanged(99 /* EditorOption.renderControlCharacters */)
            || e.hasChanged(53 /* EditorOption.fontLigatures */)
            || e.hasChanged(52 /* EditorOption.fontInfo */)
            || e.hasChanged(68 /* EditorOption.lineHeight */)));
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._viewZoneListener = this._register(new MutableDisposable());
        this.isHovered = observableCodeEditor(this._editor).isTargetHovered(p => isTargetGhostText(p.target.element), this._store);
        this.hasBeenAccepted = false;
        if (this._editor instanceof CodeEditorWidget && this._shouldKeepCursorStable) {
            this._register(this._editor.onBeforeExecuteEdit(e => this.hasBeenAccepted = e.source === 'inlineSuggestion.accept'));
        }
        this._register(autorun(reader => {
            /** @description update view zone */
            const lines = this._lines.read(reader);
            this.editorOptionsChanged.read(reader);
            if (lines) {
                this.hasBeenAccepted = false;
                this.updateLines(lines.lineNumber, lines.additionalLines, lines.minReservedLineCount);
            }
            else {
                this.clear();
            }
        }));
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    clear() {
        this._viewZoneListener.clear();
        this._editor.changeViewZones((changeAccessor) => {
            this.removeActiveViewZone(changeAccessor);
        });
    }
    updateLines(lineNumber, additionalLines, minReservedLineCount) {
        const textModel = this._editor.getModel();
        if (!textModel) {
            return;
        }
        const { tabSize } = textModel.getOptions();
        this._editor.changeViewZones((changeAccessor) => {
            const store = new DisposableStore();
            this.removeActiveViewZone(changeAccessor);
            const heightInLines = Math.max(additionalLines.length, minReservedLineCount);
            if (heightInLines > 0) {
                const domNode = document.createElement('div');
                renderLines(domNode, tabSize, additionalLines, this._editor.getOptions(), this._isClickable);
                if (this._isClickable) {
                    store.add(addDisposableListener(domNode, 'mousedown', (e) => {
                        e.preventDefault(); // This prevents that the editor loses focus
                    }));
                    store.add(addDisposableListener(domNode, 'click', (e) => {
                        if (isTargetGhostText(e.target)) {
                            this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e));
                        }
                    }));
                }
                this.addViewZone(changeAccessor, lineNumber, heightInLines, domNode);
            }
            this._viewZoneListener.value = store;
        });
    }
    addViewZone(changeAccessor, afterLineNumber, heightInLines, domNode) {
        const id = changeAccessor.addZone({
            afterLineNumber: afterLineNumber,
            heightInLines: heightInLines,
            domNode,
            afterColumnAffinity: 1 /* PositionAffinity.Right */,
            onComputedHeight: (height) => {
                this._viewZoneHeight.set(height, undefined); // TODO: can a transaction be used to avoid flickering?
            }
        });
        this.keepCursorStable(afterLineNumber, heightInLines);
        this._viewZoneInfo = { viewZoneId: id, heightInLines, lineNumber: afterLineNumber };
    }
    removeActiveViewZone(changeAccessor) {
        if (this._viewZoneInfo) {
            changeAccessor.removeZone(this._viewZoneInfo.viewZoneId);
            if (!this.hasBeenAccepted) {
                this.keepCursorStable(this._viewZoneInfo.lineNumber, -this._viewZoneInfo.heightInLines);
            }
            this._viewZoneInfo = undefined;
            this._viewZoneHeight.set(undefined, undefined);
        }
    }
    keepCursorStable(lineNumber, heightInLines) {
        if (!this._shouldKeepCursorStable) {
            return;
        }
        const cursorLineNumber = this._editor.getSelection()?.getStartPosition()?.lineNumber;
        if (cursorLineNumber !== undefined && lineNumber < cursorLineNumber) {
            this._editor.setScrollTop(this._editor.getScrollTop() + heightInLines * this._editor.getOption(68 /* EditorOption.lineHeight */));
        }
    }
}
function isTargetGhostText(target) {
    return isHTMLElement(target) && target.classList.contains(GHOST_TEXT_CLASS_NAME);
}
function renderLines(domNode, tabSize, lines, opts, isClickable) {
    const disableMonospaceOptimizations = opts.get(33 /* EditorOption.disableMonospaceOptimizations */);
    const stopRenderingLineAfter = opts.get(122 /* EditorOption.stopRenderingLineAfter */);
    // To avoid visual confusion, we don't want to render visible whitespace
    const renderWhitespace = 'none';
    const renderControlCharacters = opts.get(99 /* EditorOption.renderControlCharacters */);
    const fontLigatures = opts.get(53 /* EditorOption.fontLigatures */);
    const fontInfo = opts.get(52 /* EditorOption.fontInfo */);
    const lineHeight = opts.get(68 /* EditorOption.lineHeight */);
    let classNames = 'suggest-preview-text';
    if (isClickable) {
        classNames += ' clickable';
    }
    const sb = new StringBuilder(10000);
    sb.appendString(`<div class="${classNames}">`);
    for (let i = 0, len = lines.length; i < len; i++) {
        const lineData = lines[i];
        const lineTokens = lineData.content;
        sb.appendString('<div class="view-line');
        sb.appendString('" style="top:');
        sb.appendString(String(i * lineHeight));
        sb.appendString('px;width:1000000px;">');
        const line = lineTokens.getLineContent();
        const isBasicASCII = strings.isBasicASCII(line);
        const containsRTL = strings.containsRTL(line);
        renderViewLine(new RenderLineInput((fontInfo.isMonospace && !disableMonospaceOptimizations), fontInfo.canUseHalfwidthRightwardsArrow, line, false, isBasicASCII, containsRTL, 0, lineTokens, lineData.decorations, tabSize, 0, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures !== EditorFontLigatures.OFF, null), sb);
        sb.appendString('</div>');
    }
    sb.appendString('</div>');
    applyFontInfo(domNode, fontInfo);
    const html = sb.build();
    const trustedhtml = ttPolicy ? ttPolicy.createHTML(html) : html;
    domNode.innerHTML = trustedhtml;
}
export const ttPolicy = createTrustedTypesPolicy('editorGhostText', { createHTML: value => value });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2hvc3RUZXh0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL3ZpZXcvZ2hvc3RUZXh0L2dob3N0VGV4dFZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbkYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUgsT0FBTyxFQUFlLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzNLLE9BQU8sS0FBSyxPQUFPLE1BQU0sMENBQTBDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBd0MsTUFBTSwrQ0FBK0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEYsT0FBTyxFQUFFLFFB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