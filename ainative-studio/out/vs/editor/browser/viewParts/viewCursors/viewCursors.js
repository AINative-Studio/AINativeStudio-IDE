/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './viewCursors.css';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { TimeoutTimer } from '../../../../base/common/async.js';
import { ViewPart } from '../../view/viewPart.js';
import { ViewCursor, CursorPlurality } from './viewCursor.js';
import { TextEditorCursorStyle } from '../../../common/config/editorOptions.js';
import { editorCursorBackground, editorCursorForeground, editorMultiCursorPrimaryForeground, editorMultiCursorPrimaryBackground, editorMultiCursorSecondaryForeground, editorMultiCursorSecondaryBackground } from '../../../common/core/editorColorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { WindowIntervalTimer, getWindow } from '../../../../base/browser/dom.js';
/**
 * View cursors is a view part responsible for rendering the primary cursor and
 * any secondary cursors that are currently active.
 */
export class ViewCursors extends ViewPart {
    static { this.BLINK_INTERVAL = 500; }
    constructor(context) {
        super(context);
        const options = this._context.configuration.options;
        this._readOnly = options.get(96 /* EditorOption.readOnly */);
        this._cursorBlinking = options.get(26 /* EditorOption.cursorBlinking */);
        this._cursorStyle = options.get(147 /* EditorOption.effectiveCursorStyle */);
        this._cursorSmoothCaretAnimation = options.get(27 /* EditorOption.cursorSmoothCaretAnimation */);
        this._experimentalEditContextEnabled = options.get(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
        this._selectionIsEmpty = true;
        this._isComposingInput = false;
        this._isVisible = false;
        this._primaryCursor = new ViewCursor(this._context, CursorPlurality.Single);
        this._secondaryCursors = [];
        this._renderData = [];
        this._domNode = createFastDomNode(document.createElement('div'));
        this._domNode.setAttribute('role', 'presentation');
        this._domNode.setAttribute('aria-hidden', 'true');
        this._updateDomClassName();
        this._domNode.appendChild(this._primaryCursor.getDomNode());
        this._startCursorBlinkAnimation = new TimeoutTimer();
        this._cursorFlatBlinkInterval = new WindowIntervalTimer();
        this._blinkingEnabled = false;
        this._editorHasFocus = false;
        this._updateBlinking();
    }
    dispose() {
        super.dispose();
        this._startCursorBlinkAnimation.dispose();
        this._cursorFlatBlinkInterval.dispose();
    }
    getDomNode() {
        return this._domNode;
    }
    // --- begin event handlers
    onCompositionStart(e) {
        this._isComposingInput = true;
        this._updateBlinking();
        return true;
    }
    onCompositionEnd(e) {
        this._isComposingInput = false;
        this._updateBlinking();
        return true;
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        this._readOnly = options.get(96 /* EditorOption.readOnly */);
        this._cursorBlinking = options.get(26 /* EditorOption.cursorBlinking */);
        this._cursorStyle = options.get(147 /* EditorOption.effectiveCursorStyle */);
        this._cursorSmoothCaretAnimation = options.get(27 /* EditorOption.cursorSmoothCaretAnimation */);
        this._experimentalEditContextEnabled = options.get(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
        this._updateBlinking();
        this._updateDomClassName();
        this._primaryCursor.onConfigurationChanged(e);
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].onConfigurationChanged(e);
        }
        return true;
    }
    _onCursorPositionChanged(position, secondaryPositions, reason) {
        const pauseAnimation = (this._secondaryCursors.length !== secondaryPositions.length
            || (this._cursorSmoothCaretAnimation === 'explicit' && reason !== 3 /* CursorChangeReason.Explicit */));
        this._primaryCursor.setPlurality(secondaryPositions.length ? CursorPlurality.MultiPrimary : CursorPlurality.Single);
        this._primaryCursor.onCursorPositionChanged(position, pauseAnimation);
        this._updateBlinking();
        if (this._secondaryCursors.length < secondaryPositions.length) {
            // Create new cursors
            const addCnt = secondaryPositions.length - this._secondaryCursors.length;
            for (let i = 0; i < addCnt; i++) {
                const newCursor = new ViewCursor(this._context, CursorPlurality.MultiSecondary);
                this._domNode.domNode.insertBefore(newCursor.getDomNode().domNode, this._primaryCursor.getDomNode().domNode.nextSibling);
                this._secondaryCursors.push(newCursor);
            }
        }
        else if (this._secondaryCursors.length > secondaryPositions.length) {
            // Remove some cursors
            const removeCnt = this._secondaryCursors.length - secondaryPositions.length;
            for (let i = 0; i < removeCnt; i++) {
                this._domNode.removeChild(this._secondaryCursors[0].getDomNode());
                this._secondaryCursors.splice(0, 1);
            }
        }
        for (let i = 0; i < secondaryPositions.length; i++) {
            this._secondaryCursors[i].onCursorPositionChanged(secondaryPositions[i], pauseAnimation);
        }
    }
    onCursorStateChanged(e) {
        const positions = [];
        for (let i = 0, len = e.selections.length; i < len; i++) {
            positions[i] = e.selections[i].getPosition();
        }
        this._onCursorPositionChanged(positions[0], positions.slice(1), e.reason);
        const selectionIsEmpty = e.selections[0].isEmpty();
        if (this._selectionIsEmpty !== selectionIsEmpty) {
            this._selectionIsEmpty = selectionIsEmpty;
            this._updateDomClassName();
        }
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onFocusChanged(e) {
        this._editorHasFocus = e.isFocused;
        this._updateBlinking();
        return false;
    }
    onLinesChanged(e) {
        return true;
    }
    onLinesDeleted(e) {
        return true;
    }
    onLinesInserted(e) {
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onTokensChanged(e) {
        const shouldRender = (position) => {
            for (let i = 0, len = e.ranges.length; i < len; i++) {
                if (e.ranges[i].fromLineNumber <= position.lineNumber && position.lineNumber <= e.ranges[i].toLineNumber) {
                    return true;
                }
            }
            return false;
        };
        if (shouldRender(this._primaryCursor.getPosition())) {
            return true;
        }
        for (const secondaryCursor of this._secondaryCursors) {
            if (shouldRender(secondaryCursor.getPosition())) {
                return true;
            }
        }
        return false;
    }
    onZonesChanged(e) {
        return true;
    }
    // --- end event handlers
    // ---- blinking logic
    _getCursorBlinking() {
        // TODO: Remove the following if statement when experimental edit context is made default sole implementation
        if (this._isComposingInput && !this._experimentalEditContextEnabled) {
            // avoid double cursors
            return 0 /* TextEditorCursorBlinkingStyle.Hidden */;
        }
        if (!this._editorHasFocus) {
            return 0 /* TextEditorCursorBlinkingStyle.Hidden */;
        }
        if (this._readOnly) {
            return 5 /* TextEditorCursorBlinkingStyle.Solid */;
        }
        return this._cursorBlinking;
    }
    _updateBlinking() {
        this._startCursorBlinkAnimation.cancel();
        this._cursorFlatBlinkInterval.cancel();
        const blinkingStyle = this._getCursorBlinking();
        // hidden and solid are special as they involve no animations
        const isHidden = (blinkingStyle === 0 /* TextEditorCursorBlinkingStyle.Hidden */);
        const isSolid = (blinkingStyle === 5 /* TextEditorCursorBlinkingStyle.Solid */);
        if (isHidden) {
            this._hide();
        }
        else {
            this._show();
        }
        this._blinkingEnabled = false;
        this._updateDomClassName();
        if (!isHidden && !isSolid) {
            if (blinkingStyle === 1 /* TextEditorCursorBlinkingStyle.Blink */) {
                // flat blinking is handled by JavaScript to save battery life due to Chromium step timing issue https://bugs.chromium.org/p/chromium/issues/detail?id=361587
                this._cursorFlatBlinkInterval.cancelAndSet(() => {
                    if (this._isVisible) {
                        this._hide();
                    }
                    else {
                        this._show();
                    }
                }, ViewCursors.BLINK_INTERVAL, getWindow(this._domNode.domNode));
            }
            else {
                this._startCursorBlinkAnimation.setIfNotSet(() => {
                    this._blinkingEnabled = true;
                    this._updateDomClassName();
                }, ViewCursors.BLINK_INTERVAL);
            }
        }
    }
    // --- end blinking logic
    _updateDomClassName() {
        this._domNode.setClassName(this._getClassName());
    }
    _getClassName() {
        let result = 'cursors-layer';
        if (!this._selectionIsEmpty) {
            result += ' has-selection';
        }
        switch (this._cursorStyle) {
            case TextEditorCursorStyle.Line:
                result += ' cursor-line-style';
                break;
            case TextEditorCursorStyle.Block:
                result += ' cursor-block-style';
                break;
            case TextEditorCursorStyle.Underline:
                result += ' cursor-underline-style';
                break;
            case TextEditorCursorStyle.LineThin:
                result += ' cursor-line-thin-style';
                break;
            case TextEditorCursorStyle.BlockOutline:
                result += ' cursor-block-outline-style';
                break;
            case TextEditorCursorStyle.UnderlineThin:
                result += ' cursor-underline-thin-style';
                break;
            default:
                result += ' cursor-line-style';
        }
        if (this._blinkingEnabled) {
            switch (this._getCursorBlinking()) {
                case 1 /* TextEditorCursorBlinkingStyle.Blink */:
                    result += ' cursor-blink';
                    break;
                case 2 /* TextEditorCursorBlinkingStyle.Smooth */:
                    result += ' cursor-smooth';
                    break;
                case 3 /* TextEditorCursorBlinkingStyle.Phase */:
                    result += ' cursor-phase';
                    break;
                case 4 /* TextEditorCursorBlinkingStyle.Expand */:
                    result += ' cursor-expand';
                    break;
                case 5 /* TextEditorCursorBlinkingStyle.Solid */:
                    result += ' cursor-solid';
                    break;
                default:
                    result += ' cursor-solid';
            }
        }
        else {
            result += ' cursor-solid';
        }
        if (this._cursorSmoothCaretAnimation === 'on' || this._cursorSmoothCaretAnimation === 'explicit') {
            result += ' cursor-smooth-caret-animation';
        }
        return result;
    }
    _show() {
        this._primaryCursor.show();
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].show();
        }
        this._isVisible = true;
    }
    _hide() {
        this._primaryCursor.hide();
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].hide();
        }
        this._isVisible = false;
    }
    // ---- IViewPart implementation
    prepareRender(ctx) {
        this._primaryCursor.prepareRender(ctx);
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            this._secondaryCursors[i].prepareRender(ctx);
        }
    }
    render(ctx) {
        const renderData = [];
        let renderDataLen = 0;
        const primaryRenderData = this._primaryCursor.render(ctx);
        if (primaryRenderData) {
            renderData[renderDataLen++] = primaryRenderData;
        }
        for (let i = 0, len = this._secondaryCursors.length; i < len; i++) {
            const secondaryRenderData = this._secondaryCursors[i].render(ctx);
            if (secondaryRenderData) {
                renderData[renderDataLen++] = secondaryRenderData;
            }
        }
        this._renderData = renderData;
    }
    getLastRenderData() {
        return this._renderData;
    }
}
registerThemingParticipant((theme, collector) => {
    const cursorThemes = [
        { class: '.cursor', foreground: editorCursorForeground, background: editorCursorBackground },
        { class: '.cursor-primary', foreground: editorMultiCursorPrimaryForeground, background: editorMultiCursorPrimaryBackground },
        { class: '.cursor-secondary', foreground: editorMultiCursorSecondaryForeground, background: editorMultiCursorSecondaryBackground },
    ];
    for (const cursorTheme of cursorThemes) {
        const caret = theme.getColor(cursorTheme.foreground);
        if (caret) {
            let caretBackground = theme.getColor(cursorTheme.background);
            if (!caretBackground) {
                caretBackground = caret.opposite();
            }
            collector.addRule(`.monaco-editor .cursors-layer ${cursorTheme.class} { background-color: ${caret}; border-color: ${caret}; color: ${caretBackground}; }`);
            if (isHighContrast(theme.type)) {
                collector.addRule(`.monaco-editor .cursors-layer.has-selection ${cursorTheme.class} { border-left: 1px solid ${caretBackground}; border-right: 1px solid ${caretBackground}; }`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0N1cnNvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvdmlld1BhcnRzL3ZpZXdDdXJzb3JzL3ZpZXdDdXJzb3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sbUJBQW1CLENBQUM7QUFDM0IsT0FBTyxFQUFlLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekYsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDbEQsT0FBTyxFQUF5QixVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDckYsT0FBTyxFQUFpQyxxQkFBcUIsRUFBZ0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUU3SCxPQUFPLEVBQ04sc0JBQXNCLEVBQUUsc0JBQXNCLEVBQzlDLGtDQUFrQyxFQUFFLGtDQUFrQyxFQUN0RSxvQ0FBb0MsRUFBRSxvQ0FBb0MsRUFDMUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUlyRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFNUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRWpGOzs7R0FHRztBQUNILE1BQU0sT0FBTyxXQUFZLFNBQVEsUUFBUTthQUV4QixtQkFBYyxHQUFHLEdBQUcsQ0FBQztJQXdCckMsWUFBWSxPQUFvQjtRQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFZixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxP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