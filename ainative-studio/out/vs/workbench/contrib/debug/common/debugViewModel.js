/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED, CONTEXT_EXPRESSION_SELECTED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG, CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, CONTEXT_LOADED_SCRIPTS_SUPPORTED, CONTEXT_MULTI_SESSION_DEBUG, CONTEXT_RESTART_FRAME_SUPPORTED, CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, CONTEXT_SET_EXPRESSION_SUPPORTED, CONTEXT_SET_VARIABLE_SUPPORTED, CONTEXT_STEP_BACK_SUPPORTED, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED, CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED } from './debug.js';
import { isSessionAttach } from './debugUtils.js';
export class ViewModel {
    constructor(contextKeyService) {
        this.contextKeyService = contextKeyService;
        this.firstSessionStart = true;
        this._onDidFocusSession = new Emitter();
        this._onDidFocusThread = new Emitter();
        this._onDidFocusStackFrame = new Emitter();
        this._onDidSelectExpression = new Emitter();
        this._onDidEvaluateLazyExpression = new Emitter();
        this._onWillUpdateViews = new Emitter();
        this._onDidChangeVisualization = new Emitter();
        this.visualized = new WeakMap();
        this.preferredVisualizers = new Map();
        contextKeyService.bufferChangeEvents(() => {
            this.expressionSelectedContextKey = CONTEXT_EXPRESSION_SELECTED.bindTo(contextKeyService);
            this.loadedScriptsSupportedContextKey = CONTEXT_LOADED_SCRIPTS_SUPPORTED.bindTo(contextKeyService);
            this.stepBackSupportedContextKey = CONTEXT_STEP_BACK_SUPPORTED.bindTo(contextKeyService);
            this.focusedSessionIsAttach = CONTEXT_FOCUSED_SESSION_IS_ATTACH.bindTo(contextKeyService);
            this.focusedSessionIsNoDebug = CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.bindTo(contextKeyService);
            this.restartFrameSupportedContextKey = CONTEXT_RESTART_FRAME_SUPPORTED.bindTo(contextKeyService);
            this.stepIntoTargetsSupported = CONTEXT_STEP_INTO_TARGETS_SUPPORTED.bindTo(contextKeyService);
            this.jumpToCursorSupported = CONTEXT_JUMP_TO_CURSOR_SUPPORTED.bindTo(contextKeyService);
            this.setVariableSupported = CONTEXT_SET_VARIABLE_SUPPORTED.bindTo(contextKeyService);
            this.setDataBreakpointAtByteSupported = CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED.bindTo(contextKeyService);
            this.setExpressionSupported = CONTEXT_SET_EXPRESSION_SUPPORTED.bindTo(contextKeyService);
            this.multiSessionDebug = CONTEXT_MULTI_SESSION_DEBUG.bindTo(contextKeyService);
            this.terminateDebuggeeSupported = CONTEXT_TERMINATE_DEBUGGEE_SUPPORTED.bindTo(contextKeyService);
            this.suspendDebuggeeSupported = CONTEXT_SUSPEND_DEBUGGEE_SUPPORTED.bindTo(contextKeyService);
            this.disassembleRequestSupported = CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED.bindTo(contextKeyService);
            this.focusedStackFrameHasInstructionPointerReference = CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE.bindTo(contextKeyService);
        });
    }
    getId() {
        return 'root';
    }
    get focusedSession() {
        return this._focusedSession;
    }
    get focusedThread() {
        return this._focusedThread;
    }
    get focusedStackFrame() {
        return this._focusedStackFrame;
    }
    setFocus(stackFrame, thread, session, explicit) {
        const shouldEmitForStackFrame = this._focusedStackFrame !== stackFrame;
        const shouldEmitForSession = this._focusedSession !== session;
        const shouldEmitForThread = this._focusedThread !== thread;
        this._focusedStackFrame = stackFrame;
        this._focusedThread = thread;
        this._focusedSession = session;
        this.contextKeyService.bufferChangeEvents(() => {
            this.loadedScriptsSupportedContextKey.set(!!session?.capabilities.supportsLoadedSourcesRequest);
            this.stepBackSupportedContextKey.set(!!session?.capabilities.supportsStepBack);
            this.restartFrameSupportedContextKey.set(!!session?.capabilities.supportsRestartFrame);
            this.stepIntoTargetsSupported.set(!!session?.capabilities.supportsStepInTargetsRequest);
            this.jumpToCursorSupported.set(!!session?.capabilities.supportsGotoTargetsRequest);
            this.setVariableSupported.set(!!session?.capabilities.supportsSetVariable);
            this.setDataBreakpointAtByteSupported.set(!!session?.capabilities.supportsDataBreakpointBytes);
            this.setExpressionSupported.set(!!session?.capabilities.supportsSetExpression);
            this.terminateDebuggeeSupported.set(!!session?.capabilities.supportTerminateDebuggee);
            this.suspendDebuggeeSupported.set(!!session?.capabilities.supportSuspendDebuggee);
            this.disassembleRequestSupported.set(!!session?.capabilities.supportsDisassembleRequest);
            this.focusedStackFrameHasInstructionPointerReference.set(!!stackFrame?.instructionPointerReference);
            const attach = !!session && isSessionAttach(session);
            this.focusedSessionIsAttach.set(attach);
            this.focusedSessionIsNoDebug.set(!!session && !!session.configuration.noDebug);
        });
        if (shouldEmitForSession) {
            this._onDidFocusSession.fire(session);
        }
        // should not call onDidFocusThread if onDidFocusStackFrame is called.
        if (shouldEmitForStackFrame) {
            this._onDidFocusStackFrame.fire({ stackFrame, explicit, session });
        }
        else if (shouldEmitForThread) {
            this._onDidFocusThread.fire({ thread, explicit, session });
        }
    }
    get onDidFocusSession() {
        return this._onDidFocusSession.event;
    }
    get onDidFocusThread() {
        return this._onDidFocusThread.event;
    }
    get onDidFocusStackFrame() {
        return this._onDidFocusStackFrame.event;
    }
    get onDidChangeVisualization() {
        return this._onDidChangeVisualization.event;
    }
    getSelectedExpression() {
        return this.selectedExpression;
    }
    setSelectedExpression(expression, settingWatch) {
        this.selectedExpression = expression ? { expression, settingWatch: settingWatch } : undefined;
        this.expressionSelectedContextKey.set(!!expression);
        this._onDidSelectExpression.fire(this.selectedExpression);
    }
    get onDidSelectExpression() {
        return this._onDidSelectExpression.event;
    }
    get onDidEvaluateLazyExpression() {
        return this._onDidEvaluateLazyExpression.event;
    }
    updateViews() {
        this._onWillUpdateViews.fire();
    }
    get onWillUpdateViews() {
        return this._onWillUpdateViews.event;
    }
    isMultiSessionView() {
        return !!this.multiSessionDebug.get();
    }
    setMultiSessionView(isMultiSessionView) {
        this.multiSessionDebug.set(isMultiSessionView);
    }
    setVisualizedExpression(original, visualized) {
        const current = this.visualized.get(original) || original;
        const key = this.getPreferredVisualizedKey(original);
        if (visualized) {
            this.visualized.set(original, visualized);
            this.preferredVisualizers.set(key, visualized.treeId);
        }
        else {
            this.visualized.delete(original);
            this.preferredVisualizers.delete(key);
        }
        this._onDidChangeVisualization.fire({ original: current, replacement: visualized || original });
    }
    getVisualizedExpression(expression) {
        return this.visualized.get(expression) || this.preferredVisualizers.get(this.getPreferredVisualizedKey(expression));
    }
    async evaluateLazyExpression(expression) {
        await expression.evaluateLazy();
        this._onDidEvaluateLazyExpression.fire(expression);
    }
    getPreferredVisualizedKey(expr) {
        return JSON.stringify([
            expr.name,
            expr.type,
            !!expr.memoryReference,
        ].join('\0'));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdWaWV3TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSwyQkFBMkIsRUFBRSxpQ0FBaUMsRUFBRSxtQ0FBbUMsRUFBRSw2REFBNkQsRUFBRSxnQ0FBZ0MsRUFBRSxnQ0FBZ0MsRUFBRSwyQkFBMkIsRUFBRSwrQkFBK0IsRUFBRSwyQ0FBMkMsRUFBRSxnQ0FBZ0MsRUFBRSw4QkFBOEIsRUFBRSwyQkFBMkIsRUFBRSxtQ0FBbUMsRUFBRSxrQ0FBa0MsRUFBRSxvQ0FBb0MsRUFBc0YsTUFBTSxZQUFZLENBQUM7QUFDeHJCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUVsRCxNQUFNLE9BQU8sU0FBUztJQWtDckIsWUFBb0IsaUJBQXFDO1FBQXJDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFoQ3pELHNCQUFpQixHQUFHLElBQUksQ0FBQztRQU1SLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUE2QixDQUFDO1FBQzlELHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUEwRixDQUFDO1FBQzFILDBCQUFxQixHQUFHLElBQUksT0FBTyxFQUFrRyxDQUFDO1FBQ3RJLDJCQUFzQixHQUFHLElBQUksT0FBTyxFQUFrRSxDQUFDO1FBQ3ZHLGlDQUE0QixHQUFHLElBQUksT0FBTyxFQUF3QixDQUFDO1FBQ25FLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDekMsOEJBQXlCLEdBQUcsSUFBSSxPQUFPLEVBQXVE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