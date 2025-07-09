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
import { distinct } from '../../../../base/common/arrays.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { GlyphMarginLane, OverviewRulerLane } from '../../../../editor/common/model.js';
import { localize } from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { debugStackframe, debugStackframeFocused } from './debugIcons.js';
import { IDebugService } from '../common/debug.js';
import './media/callStackEditorContribution.css';
export const topStackFrameColor = registerColor('editor.stackFrameHighlightBackground', { dark: '#ffff0033', light: '#ffff6673', hcDark: '#ffff0033', hcLight: '#ffff6673' }, localize('topStackFrameLineHighlight', 'Background color for the highlight of line at the top stack frame position.'));
export const focusedStackFrameColor = registerColor('editor.focusedStackFrameHighlightBackground', { dark: '#7abd7a4d', light: '#cee7ce73', hcDark: '#7abd7a4d', hcLight: '#cee7ce73' }, localize('focusedStackFrameLineHighlight', 'Background color for the highlight of line at focused stack frame position.'));
const stickiness = 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
// we need a separate decoration for glyph margin, since we do not want it on each line of a multi line statement.
const TOP_STACK_FRAME_MARGIN = {
    description: 'top-stack-frame-margin',
    glyphMarginClassName: ThemeIcon.asClassName(debugStackframe),
    glyphMargin: { position: GlyphMarginLane.Right },
    zIndex: 9999,
    stickiness,
    overviewRuler: {
        position: OverviewRulerLane.Full,
        color: themeColorFromId(topStackFrameColor)
    }
};
const FOCUSED_STACK_FRAME_MARGIN = {
    description: 'focused-stack-frame-margin',
    glyphMarginClassName: ThemeIcon.asClassName(debugStackframeFocused),
    glyphMargin: { position: GlyphMarginLane.Right },
    zIndex: 9999,
    stickiness,
    overviewRuler: {
        position: OverviewRulerLane.Full,
        color: themeColorFromId(focusedStackFrameColor)
    }
};
export const TOP_STACK_FRAME_DECORATION = {
    description: 'top-stack-frame-decoration',
    isWholeLine: true,
    className: 'debug-top-stack-frame-line',
    stickiness
};
export const FOCUSED_STACK_FRAME_DECORATION = {
    description: 'focused-stack-frame-decoration',
    isWholeLine: true,
    className: 'debug-focused-stack-frame-line',
    stickiness
};
export const makeStackFrameColumnDecoration = (noCharactersBefore) => ({
    description: 'top-stack-frame-inline-decoration',
    before: {
        content: '\uEB8B',
        inlineClassName: noCharactersBefore ? 'debug-top-stack-frame-column start-of-line' : 'debug-top-stack-frame-column',
        inlineClassNameAffectsLetterSpacing: true
    },
});
export function createDecorationsForStackFrame(stackFrame, isFocusedSession, noCharactersBefore) {
    // only show decorations for the currently focused thread.
    const result = [];
    const columnUntilEOLRange = new Range(stackFrame.range.startLineNumber, stackFrame.range.startColumn, stackFrame.range.startLineNumber, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    const range = new Range(stackFrame.range.startLineNumber, stackFrame.range.startColumn, stackFrame.range.startLineNumber, stackFrame.range.startColumn + 1);
    // compute how to decorate the editor. Different decorations are used if this is a top stack frame, focused stack frame,
    // an exception or a stack frame that did not change the line number (we only decorate the columns, not the whole line).
    const topStackFrame = stackFrame.thread.getTopStackFrame();
    if (stackFrame.getId() === topStackFrame?.getId()) {
        if (isFocusedSession) {
            result.push({
                options: TOP_STACK_FRAME_MARGIN,
                range
            });
        }
        result.push({
            options: TOP_STACK_FRAME_DECORATION,
            range: columnUntilEOLRange
        });
        if (stackFrame.range.startColumn > 1) {
            result.push({
                options: makeStackFrameColumnDecoration(noCharactersBefore),
                range: columnUntilEOLRange
            });
        }
    }
    else {
        if (isFocusedSession) {
            result.push({
                options: FOCUSED_STACK_FRAME_MARGIN,
                range
            });
        }
        result.push({
            options: FOCUSED_STACK_FRAME_DECORATION,
            range: columnUntilEOLRange
        });
    }
    return result;
}
let CallStackEditorContribution = class CallStackEditorContribution extends Disposable {
    constructor(editor, debugService, uriIdentityService, logService) {
        super();
        this.editor = editor;
        this.debugService = debugService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.decorations = this.editor.createDecorationsCollection();
        const setDecorations = () => this.decorations.set(this.createCallStackDecorations());
        this._register(Event.any(this.debugService.getViewModel().onDidFocusStackFrame, this.debugService.getModel().onDidChangeCallStack)(() => {
            setDecorations();
        }));
        this._register(this.editor.onDidChangeModel(e => {
            if (e.newModelUrl) {
                setDecorations();
            }
        }));
        setDecorations();
    }
    createCallStackDecorations() {
        const editor = this.editor;
        if (!editor.hasModel()) {
            return [];
        }
        const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
        const decorations = [];
        this.debugService.getModel().getSessions().forEach(s => {
            const isSessionFocused = s === focusedStackFrame?.thread.session;
            s.getAllThreads().forEach(t => {
                if (t.stopped) {
                    const callStack = t.getCallStack();
                    const stackFrames = [];
                    if (callStack.length > 0) {
                        // Always decorate top stack frame, and decorate focused stack frame if it is not the top stack frame
                        if (focusedStackFrame && !focusedStackFrame.equals(callStack[0])) {
                            stackFrames.push(focusedStackFrame);
                        }
                        stackFrames.push(callStack[0]);
                    }
                    stackFrames.forEach(candidateStackFrame => {
                        if (candidateStackFrame && this.uriIdentityService.extUri.isEqual(candidateStackFrame.source.uri, editor.getModel()?.uri)) {
                            if (candidateStackFrame.range.startLineNumber > editor.getModel()?.getLineCount() || candidateStackFrame.range.startLineNumber < 1) {
                                this.logService.warn(`CallStackEditorContribution: invalid stack frame line number: ${candidateStackFrame.range.startLineNumber}`);
                                return;
                            }
                            const noCharactersBefore = editor.getModel().getLineFirstNonWhitespaceColumn(candidateStackFrame.range.startLineNumber) >= candidateStackFrame.range.startColumn;
                            decorations.push(...createDecorationsForStackFrame(candidateStackFrame, isSessionFocused, noCharactersBefore));
                        }
                    });
                }
            });
        });
        // Deduplicate same decorations so colors do not stack #109045
        return distinct(decorations, d => `${d.options.className} ${d.options.glyphMarginClassName} ${d.range.startLineNumber} ${d.range.startColumn}`);
    }
    dispose() {
        super.dispose();
        this.decorations.clear();
    }
};
CallStackEditorContribution = __decorate([
    __param(1, IDebugService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], CallStackEditorContribution);
export { CallStackEditorContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrRWRpdG9yQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvY2FsbFN0YWNrRWRpdG9yQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2xFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVoRSxPQUFPLEVBQUUsZUFBZSxFQUFrRCxpQkFBaUIsRUFBMEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoSyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSxvQkFBb0IsQ0FBQztBQUNoRSxPQUFPLHlDQUF5QyxDQUFDO0FBRWpELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixH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