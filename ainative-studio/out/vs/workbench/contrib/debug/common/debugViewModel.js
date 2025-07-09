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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdWaWV3TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUscUNBQXFDLEVBQUUsMkJBQTJCLEVBQUUsaUNBQWlDLEVBQUUsbUNBQW1DLEVBQUUsNkRBQTZELEVBQUUsZ0NBQWdDLEVBQUUsZ0NBQWdDLEVBQUUsMkJBQTJCLEVBQUUsK0JBQStCLEVBQUUsMkNBQTJDLEVBQUUsZ0NBQWdDLEVBQUUsOEJBQThCLEVBQUUsMkJBQTJCLEVBQUUsbUNBQW1DLEVBQUUsa0NBQWtDLEVBQUUsb0NBQW9DLEVBQXNGLE1BQU0sWUFBWSxDQUFDO0FBQ3hyQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFbEQsTUFBTSxPQUFPLFNBQVM7SUFrQ3JCLFlBQW9CLGlCQUFxQztRQUFyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBaEN6RCxzQkFBaUIsR0FBRyxJQUFJLENBQUM7UUFNUix1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBNkIsQ0FBQztRQUM5RCxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBMEYsQ0FBQztRQUMxSCwwQkFBcUIsR0FBRyxJQUFJLE9BQU8sRUFBa0csQ0FBQztRQUN0SSwyQkFBc0IsR0FBRyxJQUFJLE9BQU8sRUFBa0UsQ0FBQztRQUN2RyxpQ0FBNEIsR0FBRyxJQUFJLE9BQU8sRUFBd0IsQ0FBQztRQUNuRSx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBQ3pDLDhCQUF5QixHQUFHLElBQUksT0FBTyxFQUF1RCxDQUFDO1FBQy9GLGVBQVUsR0FBRyxJQUFJLE9BQU8sRUFBNEIsQ0FBQztRQUNyRCx5QkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBaUQsQ0FBQztRQW1CaEcsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFO1lBQ3pDLElBQUksQ0FBQyw0QkFBNEIsR0FBRywyQkFBMkIsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUMxRixJQUFJLENBQUMsZ0NBQWdDLEdBQUcsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDbkcsSUFBSSxDQUFDLDJCQUEyQixHQUFHLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pGLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxpQ0FBaUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUMxRixJQUFJLENBQUMsdUJBQXVCLEdBQUcsbUNBQW1DLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDN0YsSUFBSSxDQUFDLCtCQUErQixHQUFHLCtCQUErQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2pHLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxtQ0FBbUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUM5RixJQUFJLENBQUMscUJBQXFCLEdBQUcsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLG9CQUFvQixHQUFHLDhCQUE4QixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3JGLElBQUksQ0FBQyxnQ0FBZ0MsR0FBRywyQ0FBMkMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUM5RyxJQUFJLENBQUMsc0JBQXNCLEdBQUcsZ0NBQWdDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDekYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLDJCQUEyQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQy9FLElBQUksQ0FBQywwQkFBMEIsR0FBRyxvQ0FBb0MsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNqRyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsa0NBQWtDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDN0YsSUFBSSxDQUFDLDJCQUEyQixHQUFHLHFDQUFxQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25HLElBQUksQ0FBQywrQ0FBK0MsR0FBRyw2REFBNkQsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNoSixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLO1FBQ0osT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsSUFBSSxjQUFjO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM3QixDQUFDO0lBRUQsSUFBSSxhQUFhO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBSSxpQkFBaUI7UUFDcEIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUM7SUFDaEMsQ0FBQztJQUVELFFBQVEsQ0FBQyxVQUFtQyxFQUFFLE1BQTJCLEVBQUUsT0FBa0MsRUFBRSxRQUFpQjtRQUMvSCxNQUFNLHVCQUF1QixHQUFHLElBQUksQ0FBQyxrQkFBa0IsS0FBSyxVQUFVLENBQUM7UUFDdkUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsZUFBZSxLQUFLLE9BQU8sQ0FBQztRQUM5RCxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxjQUFjLEtBQUssTUFBTSxDQUFDO1FBRzNELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxVQUFVLENBQUM7UUFDckMsSUFBSSxDQUFDLGNBQWMsR0FBRyxNQUFNLENBQUM7UUFDN0IsSUFBSSxDQUFDLGVBQWUsR0FBRyxPQUFPLENBQUM7UUFFL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRTtZQUM5QyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDaEcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQy9FLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUN2RixJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDeEYsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ25GLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQztZQUMzRSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDL0YsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQy9FLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN0RixJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDbEYsSUFBSSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1lBQ3pGLElBQUksQ0FBQywrQ0FBK0MsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1lBQ3BHLE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxPQUFPLElBQUksZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2hGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELHNFQUFzRTtRQUN0RSxJQUFJLHVCQUF1QixFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNwRSxDQUFDO2FBQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDNUQsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFJLGlCQUFpQjtRQUNwQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7SUFDdEMsQ0FBQztJQUVELElBQUksZ0JBQWdCO1FBQ25CLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBSSxvQkFBb0I7UUFDdkIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUM7SUFDN0MsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztJQUNoQyxDQUFDO0lBRUQscUJBQXFCLENBQUMsVUFBbUMsRUFBRSxZQUFxQjtRQUMvRSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUM5RixJQUFJLENBQUMsNEJBQTRCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFRCxJQUFJLHFCQUFxQjtRQUN4QixPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUM7SUFDMUMsQ0FBQztJQUVELElBQUksMkJBQTJCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQztJQUNoRCxDQUFDO0lBRUQsV0FBVztRQUNWLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNoQyxDQUFDO0lBRUQsSUFBSSxpQkFBaUI7UUFDcEIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3ZDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxrQkFBMkI7UUFDOUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxRQUFxQixFQUFFLFVBQXdEO1FBQ3RHLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQztRQUMxRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckQsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFVBQVUsSUFBSSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ2pHLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxVQUF1QjtRQUM5QyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDckgsQ0FBQztJQUVELEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxVQUFnQztRQUM1RCxNQUFNLFVBQVUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNoQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxJQUFpQjtRQUNsRCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDckIsSUFBSSxDQUFDLElBQUk7WUFDVCxJQUFJLENBQUMsSUFBSTtZQUNULENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZTtTQUN0QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2YsQ0FBQztDQUNEIn0=