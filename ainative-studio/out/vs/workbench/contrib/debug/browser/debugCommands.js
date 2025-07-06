/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { List } from '../../../../base/browser/ui/list/listWidget.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { IListService } from '../../../../platform/list/browser/listService.js';
import { IDebugService, CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_VARIABLES_FOCUSED, EDITOR_CONTRIBUTION_ID, CONTEXT_IN_DEBUG_MODE, CONTEXT_EXPRESSION_SELECTED, CONTEXT_DEBUG_STATE, CONTEXT_JUMP_TO_CURSOR_SUPPORTED, REPL_VIEW_ID, CONTEXT_DEBUGGERS_AVAILABLE, getStateLabel, CONTEXT_BREAKPOINT_INPUT_FOCUSED, CONTEXT_FOCUSED_SESSION_IS_ATTACH, VIEWLET_ID, CONTEXT_DISASSEMBLY_VIEW_FOCUS, CONTEXT_IN_DEBUG_REPL, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, isFrameDeemphasized } from '../common/debug.js';
import { Expression, Variable, Breakpoint, FunctionBreakpoint, DataBreakpoint } from '../common/debugModel.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { MenuRegistry, MenuId, Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { openBreakpointSource } from './breakpointsView.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { InputFocusedContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { ActiveEditorContext, PanelFocusContext, ResourceContextKey } from '../../../common/contextkeys.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { deepClone } from '../../../../base/common/objects.js';
import { isWeb, isWindows } from '../../../../base/common/platform.js';
import { saveAllBeforeDebugStart } from '../common/debugUtils.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { showLoadedScriptMenu } from '../common/loadedScriptsPicker.js';
import { showDebugSessionMenu } from './debugSessionPicker.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export const ADD_CONFIGURATION_ID = 'debug.addConfiguration';
export const TOGGLE_INLINE_BREAKPOINT_ID = 'editor.debug.action.toggleInlineBreakpoint';
export const COPY_STACK_TRACE_ID = 'debug.copyStackTrace';
export const REVERSE_CONTINUE_ID = 'workbench.action.debug.reverseContinue';
export const STEP_BACK_ID = 'workbench.action.debug.stepBack';
export const RESTART_SESSION_ID = 'workbench.action.debug.restart';
export const TERMINATE_THREAD_ID = 'workbench.action.debug.terminateThread';
export const STEP_OVER_ID = 'workbench.action.debug.stepOver';
export const STEP_INTO_ID = 'workbench.action.debug.stepInto';
export const STEP_INTO_TARGET_ID = 'workbench.action.debug.stepIntoTarget';
export const STEP_OUT_ID = 'workbench.action.debug.stepOut';
export const PAUSE_ID = 'workbench.action.debug.pause';
export const DISCONNECT_ID = 'workbench.action.debug.disconnect';
export const DISCONNECT_AND_SUSPEND_ID = 'workbench.action.debug.disconnectAndSuspend';
export const STOP_ID = 'workbench.action.debug.stop';
export const RESTART_FRAME_ID = 'workbench.action.debug.restartFrame';
export const CONTINUE_ID = 'workbench.action.debug.continue';
export const FOCUS_REPL_ID = 'workbench.debug.action.focusRepl';
export const JUMP_TO_CURSOR_ID = 'debug.jumpToCursor';
export const FOCUS_SESSION_ID = 'workbench.action.debug.focusProcess';
export const SELECT_AND_START_ID = 'workbench.action.debug.selectandstart';
export const SELECT_DEBUG_CONSOLE_ID = 'workbench.action.debug.selectDebugConsole';
export const SELECT_DEBUG_SESSION_ID = 'workbench.action.debug.selectDebugSession';
export const DEBUG_CONFIGURE_COMMAND_ID = 'workbench.action.debug.configure';
export const DEBUG_START_COMMAND_ID = 'workbench.action.debug.start';
export const DEBUG_RUN_COMMAND_ID = 'workbench.action.debug.run';
export const EDIT_EXPRESSION_COMMAND_ID = 'debug.renameWatchExpression';
export const COPY_WATCH_EXPRESSION_COMMAND_ID = 'debug.copyWatchExpression';
export const SET_EXPRESSION_COMMAND_ID = 'debug.setWatchExpression';
export const REMOVE_EXPRESSION_COMMAND_ID = 'debug.removeWatchExpression';
export const NEXT_DEBUG_CONSOLE_ID = 'workbench.action.debug.nextConsole';
export const PREV_DEBUG_CONSOLE_ID = 'workbench.action.debug.prevConsole';
export const SHOW_LOADED_SCRIPTS_ID = 'workbench.action.debug.showLoadedScripts';
export const CALLSTACK_TOP_ID = 'workbench.action.debug.callStackTop';
export const CALLSTACK_BOTTOM_ID = 'workbench.action.debug.callStackBottom';
export const CALLSTACK_UP_ID = 'workbench.action.debug.callStackUp';
export const CALLSTACK_DOWN_ID = 'workbench.action.debug.callStackDown';
export const ADD_TO_WATCH_ID = 'debug.addToWatchExpressions';
export const COPY_EVALUATE_PATH_ID = 'debug.copyEvaluatePath';
export const COPY_VALUE_ID = 'workbench.debug.viewlet.action.copyValue';
export const DEBUG_COMMAND_CATEGORY = nls.localize2('debug', 'Debug');
export const RESTART_LABEL = nls.localize2('restartDebug', "Restart");
export const STEP_OVER_LABEL = nls.localize2('stepOverDebug', "Step Over");
export const STEP_INTO_LABEL = nls.localize2('stepIntoDebug', "Step Into");
export const STEP_INTO_TARGET_LABEL = nls.localize2('stepIntoTargetDebug', "Step Into Target");
export const STEP_OUT_LABEL = nls.localize2('stepOutDebug', "Step Out");
export const PAUSE_LABEL = nls.localize2('pauseDebug', "Pause");
export const DISCONNECT_LABEL = nls.localize2('disconnect', "Disconnect");
export const DISCONNECT_AND_SUSPEND_LABEL = nls.localize2('disconnectSuspend', "Disconnect and Suspend");
export const STOP_LABEL = nls.localize2('stop', "Stop");
export const CONTINUE_LABEL = nls.localize2('continueDebug', "Continue");
export const FOCUS_SESSION_LABEL = nls.localize2('focusSession', "Focus Session");
export const SELECT_AND_START_LABEL = nls.localize2('selectAndStartDebugging', "Select and Start Debugging");
export const DEBUG_CONFIGURE_LABEL = nls.localize('openLaunchJson', "Open '{0}'", 'launch.json');
export const DEBUG_START_LABEL = nls.localize2('startDebug', "Start Debugging");
export const DEBUG_RUN_LABEL = nls.localize2('startWithoutDebugging', "Start Without Debugging");
export const NEXT_DEBUG_CONSOLE_LABEL = nls.localize2('nextDebugConsole', "Focus Next Debug Console");
export const PREV_DEBUG_CONSOLE_LABEL = nls.localize2('prevDebugConsole', "Focus Previous Debug Console");
export const OPEN_LOADED_SCRIPTS_LABEL = nls.localize2('openLoadedScript', "Open Loaded Script...");
export const CALLSTACK_TOP_LABEL = nls.localize2('callStackTop', "Navigate to Top of Call Stack");
export const CALLSTACK_BOTTOM_LABEL = nls.localize2('callStackBottom', "Navigate to Bottom of Call Stack");
export const CALLSTACK_UP_LABEL = nls.localize2('callStackUp', "Navigate Up Call Stack");
export const CALLSTACK_DOWN_LABEL = nls.localize2('callStackDown', "Navigate Down Call Stack");
export const COPY_EVALUATE_PATH_LABEL = nls.localize2('copyAsExpression', "Copy as Expression");
export const COPY_VALUE_LABEL = nls.localize2('copyValue', "Copy Value");
export const ADD_TO_WATCH_LABEL = nls.localize2('addToWatchExpressions', "Add to Watch");
export const SELECT_DEBUG_CONSOLE_LABEL = nls.localize2('selectDebugConsole', "Select Debug Console");
export const SELECT_DEBUG_SESSION_LABEL = nls.localize2('selectDebugSession', "Select Debug Session");
export const DEBUG_QUICK_ACCESS_PREFIX = 'debug ';
export const DEBUG_CONSOLE_QUICK_ACCESS_PREFIX = 'debug consoles ';
function isThreadContext(obj) {
    return obj && typeof obj.sessionId === 'string' && typeof obj.threadId === 'string';
}
async function getThreadAndRun(accessor, sessionAndThreadId, run) {
    const debugService = accessor.get(IDebugService);
    let thread;
    if (isThreadContext(sessionAndThreadId)) {
        const session = debugService.getModel().getSession(sessionAndThreadId.sessionId);
        if (session) {
            thread = session.getAllThreads().find(t => t.getId() === sessionAndThreadId.threadId);
        }
    }
    else if (isSessionContext(sessionAndThreadId)) {
        const session = debugService.getModel().getSession(sessionAndThreadId.sessionId);
        if (session) {
            const threads = session.getAllThreads();
            thread = threads.length > 0 ? threads[0] : undefined;
        }
    }
    if (!thread) {
        thread = debugService.getViewModel().focusedThread;
        if (!thread) {
            const focusedSession = debugService.getViewModel().focusedSession;
            const threads = focusedSession ? focusedSession.getAllThreads() : undefined;
            thread = threads && threads.length ? threads[0] : undefined;
        }
    }
    if (thread) {
        await run(thread);
    }
}
function isStackFrameContext(obj) {
    return obj && typeof obj.sessionId === 'string' && typeof obj.threadId === 'string' && typeof obj.frameId === 'string';
}
function getFrame(debugService, context) {
    if (isStackFrameContext(context)) {
        const session = debugService.getModel().getSession(context.sessionId);
        if (session) {
            const thread = session.getAllThreads().find(t => t.getId() === context.threadId);
            if (thread) {
                return thread.getCallStack().find(sf => sf.getId() === context.frameId);
            }
        }
    }
    else {
        return debugService.getViewModel().focusedStackFrame;
    }
    return undefined;
}
function isSessionContext(obj) {
    return obj && typeof obj.sessionId === 'string';
}
async function changeDebugConsoleFocus(accessor, next) {
    const debugService = accessor.get(IDebugService);
    const viewsService = accessor.get(IViewsService);
    const sessions = debugService.getModel().getSessions(true).filter(s => s.hasSeparateRepl());
    let currSession = debugService.getViewModel().focusedSession;
    let nextIndex = 0;
    if (sessions.length > 0 && currSession) {
        while (currSession && !currSession.hasSeparateRepl()) {
            currSession = currSession.parentSession;
        }
        if (currSession) {
            const currIndex = sessions.indexOf(currSession);
            if (next) {
                nextIndex = (currIndex === (sessions.length - 1) ? 0 : (currIndex + 1));
            }
            else {
                nextIndex = (currIndex === 0 ? (sessions.length - 1) : (currIndex - 1));
            }
        }
    }
    await debugService.focusStackFrame(undefined, undefined, sessions[nextIndex], { explicit: true });
    if (!viewsService.isViewVisible(REPL_VIEW_ID)) {
        await viewsService.openView(REPL_VIEW_ID, true);
    }
}
async function navigateCallStack(debugService, down) {
    const frame = debugService.getViewModel().focusedStackFrame;
    if (frame) {
        let callStack = frame.thread.getCallStack();
        let index = callStack.findIndex(elem => elem.frameId === frame.frameId);
        let nextVisibleFrame;
        if (down) {
            if (index >= callStack.length - 1) {
                if (frame.thread.reachedEndOfCallStack) {
                    goToTopOfCallStack(debugService);
                    return;
                }
                else {
                    await debugService.getModel().fetchCallstack(frame.thread, 20);
                    callStack = frame.thread.getCallStack();
                    index = callStack.findIndex(elem => elem.frameId === frame.frameId);
                }
            }
            nextVisibleFrame = findNextVisibleFrame(true, callStack, index);
        }
        else {
            if (index <= 0) {
                goToBottomOfCallStack(debugService);
                return;
            }
            nextVisibleFrame = findNextVisibleFrame(false, callStack, index);
        }
        if (nextVisibleFrame) {
            debugService.focusStackFrame(nextVisibleFrame, undefined, undefined, { preserveFocus: false });
        }
    }
}
async function goToBottomOfCallStack(debugService) {
    const thread = debugService.getViewModel().focusedThread;
    if (thread) {
        await debugService.getModel().fetchCallstack(thread);
        const callStack = thread.getCallStack();
        if (callStack.length > 0) {
            const nextVisibleFrame = findNextVisibleFrame(false, callStack, 0); // must consider the next frame up first, which will be the last frame
            if (nextVisibleFrame) {
                debugService.focusStackFrame(nextVisibleFrame, undefined, undefined, { preserveFocus: false });
            }
        }
    }
}
function goToTopOfCallStack(debugService) {
    const thread = debugService.getViewModel().focusedThread;
    if (thread) {
        debugService.focusStackFrame(thread.getTopStackFrame(), undefined, undefined, { preserveFocus: false });
    }
}
/**
 * Finds next frame that is not skipped by SkipFiles. Skips frame at index and starts searching at next.
 * Must satisfy `0 <= startIndex <= callStack - 1`
 * @param down specifies whether to search downwards if the current file is skipped.
 * @param callStack the call stack to search
 * @param startIndex the index to start the search at
 */
function findNextVisibleFrame(down, callStack, startIndex) {
    if (startIndex >= callStack.length) {
        startIndex = callStack.length - 1;
    }
    else if (startIndex < 0) {
        startIndex = 0;
    }
    let index = startIndex;
    let currFrame;
    do {
        if (down) {
            if (index === callStack.length - 1) {
                index = 0;
            }
            else {
                index++;
            }
        }
        else {
            if (index === 0) {
                index = callStack.length - 1;
            }
            else {
                index--;
            }
        }
        currFrame = callStack[index];
        if (!isFrameDeemphasized(currFrame)) {
            return currFrame;
        }
    } while (index !== startIndex); // end loop when we've just checked the start index, since that should be the last one checked
    return undefined;
}
// These commands are used in call stack context menu, call stack inline actions, command palette, debug toolbar, mac native touch bar
// When the command is exectued in the context of a thread(context menu on a thread, inline call stack action) we pass the thread id
// Otherwise when it is executed "globaly"(using the touch bar, debug toolbar, command palette) we do not pass any id and just take whatever is the focussed thread
// Same for stackFrame commands and session commands.
CommandsRegistry.registerCommand({
    id: COPY_STACK_TRACE_ID,
    handler: async (accessor, _, context) => {
        const textResourcePropertiesService = accessor.get(ITextResourcePropertiesService);
        const clipboardService = accessor.get(IClipboardService);
        const debugService = accessor.get(IDebugService);
        const frame = getFrame(debugService, context);
        if (frame) {
            const eol = textResourcePropertiesService.getEOL(frame.source.uri);
            await clipboardService.writeText(frame.thread.getCallStack().map(sf => sf.toString()).join(eol));
        }
    }
});
CommandsRegistry.registerCommand({
    id: REVERSE_CONTINUE_ID,
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, thread => thread.reverseContinue());
    }
});
CommandsRegistry.registerCommand({
    id: STEP_BACK_ID,
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.stepBack('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.stepBack());
        }
    }
});
CommandsRegistry.registerCommand({
    id: TERMINATE_THREAD_ID,
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, thread => thread.terminate());
    }
});
CommandsRegistry.registerCommand({
    id: JUMP_TO_CURSOR_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        const editorService = accessor.get(IEditorService);
        const activeEditorControl = editorService.activeTextEditorControl;
        const notificationService = accessor.get(INotificationService);
        const quickInputService = accessor.get(IQuickInputService);
        if (stackFrame && isCodeEditor(activeEditorControl) && activeEditorControl.hasModel()) {
            const position = activeEditorControl.getPosition();
            const resource = activeEditorControl.getModel().uri;
            const source = stackFrame.thread.session.getSourceForUri(resource);
            if (source) {
                const response = await stackFrame.thread.session.gotoTargets(source.raw, position.lineNumber, position.column);
                const targets = response?.body.targets;
                if (targets && targets.length) {
                    let id = targets[0].id;
                    if (targets.length > 1) {
                        const picks = targets.map(t => ({ label: t.label, _id: t.id }));
                        const pick = await quickInputService.pick(picks, { placeHolder: nls.localize('chooseLocation', "Choose the specific location") });
                        if (!pick) {
                            return;
                        }
                        id = pick._id;
                    }
                    return await stackFrame.thread.session.goto(stackFrame.thread.threadId, id).catch(e => notificationService.warn(e));
                }
            }
        }
        return notificationService.warn(nls.localize('noExecutableCode', "No executable code is associated at the current cursor position."));
    }
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_TOP_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        goToTopOfCallStack(debugService);
    }
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_BOTTOM_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        await goToBottomOfCallStack(debugService);
    }
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_UP_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        navigateCallStack(debugService, false);
    }
});
CommandsRegistry.registerCommand({
    id: CALLSTACK_DOWN_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        navigateCallStack(debugService, true);
    }
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    command: {
        id: JUMP_TO_CURSOR_ID,
        title: nls.localize('jumpToCursor', "Jump to Cursor"),
        category: DEBUG_COMMAND_CATEGORY
    },
    when: ContextKeyExpr.and(CONTEXT_JUMP_TO_CURSOR_SUPPORTED, EditorContextKeys.editorTextFocus),
    group: 'debug',
    order: 3
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: NEXT_DEBUG_CONSOLE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    when: CONTEXT_IN_DEBUG_REPL,
    primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 94 /* KeyCode.BracketRight */ },
    handler: async (accessor, _, context) => {
        changeDebugConsoleFocus(accessor, true);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: PREV_DEBUG_CONSOLE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
    when: CONTEXT_IN_DEBUG_REPL,
    primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
    mac: { primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 92 /* KeyCode.BracketLeft */ },
    handler: async (accessor, _, context) => {
        changeDebugConsoleFocus(accessor, false);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: RESTART_SESSION_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 2048 /* KeyMod.CtrlCmd */ | 63 /* KeyCode.F5 */,
    when: CONTEXT_IN_DEBUG_MODE,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        const configurationService = accessor.get(IConfigurationService);
        let session;
        if (isSessionContext(context)) {
            session = debugService.getModel().getSession(context.sessionId);
        }
        else {
            session = debugService.getViewModel().focusedSession;
        }
        if (!session) {
            const { launch, name } = debugService.getConfigurationManager().selectedConfiguration;
            await debugService.startDebugging(launch, name, { noDebug: false, startedByUser: true });
        }
        else {
            const showSubSessions = configurationService.getValue('debug').showSubSessionsInToolBar;
            // Stop should be sent to the root parent session
            while (!showSubSessions && session.lifecycleManagedByParent && session.parentSession) {
                session = session.parentSession;
            }
            session.removeReplExpressions();
            await debugService.restartSession(session);
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_OVER_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 68 /* KeyCode.F10 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.next('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.next());
        }
    }
});
// Windows browsers use F11 for full screen, thus use alt+F11 as the default shortcut
const STEP_INTO_KEYBINDING = (isWeb && isWindows) ? (512 /* KeyMod.Alt */ | 69 /* KeyCode.F11 */) : 69 /* KeyCode.F11 */;
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_INTO_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10, // Have a stronger weight to have priority over full screen when debugging
    primary: STEP_INTO_KEYBINDING,
    // Use a more flexible when clause to not allow full screen command to take over when F11 pressed a lot of times
    when: CONTEXT_DEBUG_STATE.notEqualsTo('inactive'),
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.stepIn('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.stepIn());
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_OUT_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 69 /* KeyCode.F11 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    handler: async (accessor, _, context) => {
        const contextKeyService = accessor.get(IContextKeyService);
        if (CONTEXT_DISASSEMBLY_VIEW_FOCUS.getValue(contextKeyService)) {
            await getThreadAndRun(accessor, context, (thread) => thread.stepOut('instruction'));
        }
        else {
            await getThreadAndRun(accessor, context, (thread) => thread.stepOut());
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: PAUSE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 2, // take priority over focus next part while we are debugging
    primary: 64 /* KeyCode.F6 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('running'),
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, thread => thread.pause());
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STEP_INTO_TARGET_ID,
    primary: STEP_INTO_KEYBINDING | 2048 /* KeyMod.CtrlCmd */,
    when: ContextKeyExpr.and(CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped')),
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: async (accessor, _, context) => {
        const quickInputService = accessor.get(IQuickInputService);
        const debugService = accessor.get(IDebugService);
        const session = debugService.getViewModel().focusedSession;
        const frame = debugService.getViewModel().focusedStackFrame;
        if (!frame || !session) {
            return;
        }
        const editor = await accessor.get(IEditorService).openEditor({
            resource: frame.source.uri,
            options: { revealIfOpened: true }
        });
        let codeEditor;
        if (editor) {
            const ctrl = editor?.getControl();
            if (isCodeEditor(ctrl)) {
                codeEditor = ctrl;
            }
        }
        const disposables = new DisposableStore();
        const qp = disposables.add(quickInputService.createQuickPick());
        qp.busy = true;
        qp.show();
        disposables.add(qp.onDidChangeActive(([item]) => {
            if (codeEditor && item && item.target.line !== undefined) {
                codeEditor.revealLineInCenterIfOutsideViewport(item.target.line);
                codeEditor.setSelection({
                    startLineNumber: item.target.line,
                    startColumn: item.target.column || 1,
                    endLineNumber: item.target.endLine || item.target.line,
                    endColumn: item.target.endColumn || item.target.column || 1,
                });
            }
        }));
        disposables.add(qp.onDidAccept(() => {
            if (qp.activeItems.length) {
                session.stepIn(frame.thread.threadId, qp.activeItems[0].target.id);
            }
        }));
        disposables.add(qp.onDidHide(() => disposables.dispose()));
        session.stepInTargets(frame.frameId).then(targets => {
            qp.busy = false;
            if (targets?.length) {
                qp.items = targets?.map(target => ({ target, label: target.label }));
            }
            else {
                qp.placeholder = nls.localize('editor.debug.action.stepIntoTargets.none', "No step targets available");
            }
        });
    }
});
async function stopHandler(accessor, _, context, disconnect, suspend) {
    const debugService = accessor.get(IDebugService);
    let session;
    if (isSessionContext(context)) {
        session = debugService.getModel().getSession(context.sessionId);
    }
    else {
        session = debugService.getViewModel().focusedSession;
    }
    const configurationService = accessor.get(IConfigurationService);
    const showSubSessions = configurationService.getValue('debug').showSubSessionsInToolBar;
    // Stop should be sent to the root parent session
    while (!showSubSessions && session && session.lifecycleManagedByParent && session.parentSession) {
        session = session.parentSession;
    }
    await debugService.stopSession(session, disconnect, suspend);
}
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DISCONNECT_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH, CONTEXT_IN_DEBUG_MODE),
    handler: (accessor, _, context) => stopHandler(accessor, _, context, true)
});
CommandsRegistry.registerCommand({
    id: DISCONNECT_AND_SUSPEND_ID,
    handler: (accessor, _, context) => stopHandler(accessor, _, context, true, true)
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: STOP_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 63 /* KeyCode.F5 */,
    when: ContextKeyExpr.and(CONTEXT_FOCUSED_SESSION_IS_ATTACH.toNegated(), CONTEXT_IN_DEBUG_MODE),
    handler: (accessor, _, context) => stopHandler(accessor, _, context, false)
});
CommandsRegistry.registerCommand({
    id: RESTART_FRAME_ID,
    handler: async (accessor, _, context) => {
        const debugService = accessor.get(IDebugService);
        const notificationService = accessor.get(INotificationService);
        const frame = getFrame(debugService, context);
        if (frame) {
            try {
                await frame.restart();
            }
            catch (e) {
                notificationService.error(e);
            }
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CONTINUE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10, // Use a stronger weight to get priority over start debugging F5 shortcut
    primary: 63 /* KeyCode.F5 */,
    when: CONTEXT_DEBUG_STATE.isEqualTo('stopped'),
    handler: async (accessor, _, context) => {
        await getThreadAndRun(accessor, context, thread => thread.continue());
    }
});
CommandsRegistry.registerCommand({
    id: SHOW_LOADED_SCRIPTS_ID,
    handler: async (accessor) => {
        await showLoadedScriptMenu(accessor);
    }
});
CommandsRegistry.registerCommand({
    id: 'debug.startFromConfig',
    handler: async (accessor, config) => {
        const debugService = accessor.get(IDebugService);
        await debugService.startDebugging(undefined, config);
    }
});
CommandsRegistry.registerCommand({
    id: FOCUS_SESSION_ID,
    handler: async (accessor, session) => {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        const stoppedChildSession = debugService.getModel().getSessions().find(s => s.parentSession === session && s.state === 2 /* State.Stopped */);
        if (stoppedChildSession && session.state !== 2 /* State.Stopped */) {
            session = stoppedChildSession;
        }
        await debugService.focusStackFrame(undefined, undefined, session, { explicit: true });
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        if (stackFrame) {
            await stackFrame.openInEditor(editorService, true);
        }
    }
});
CommandsRegistry.registerCommand({
    id: SELECT_AND_START_ID,
    handler: async (accessor, debugType, debugStartOptions) => {
        const quickInputService = accessor.get(IQuickInputService);
        const debugService = accessor.get(IDebugService);
        if (debugType) {
            const configManager = debugService.getConfigurationManager();
            const dynamicProviders = await configManager.getDynamicProviders();
            for (const provider of dynamicProviders) {
                if (provider.type === debugType) {
                    const pick = await provider.pick();
                    if (pick) {
                        await configManager.selectConfiguration(pick.launch, pick.config.name, pick.config, { type: provider.type });
                        debugService.startDebugging(pick.launch, pick.config, { noDebug: debugStartOptions?.noDebug, startedByUser: true });
                        return;
                    }
                }
            }
        }
        quickInputService.quickAccess.show(DEBUG_QUICK_ACCESS_PREFIX);
    }
});
CommandsRegistry.registerCommand({
    id: SELECT_DEBUG_CONSOLE_ID,
    handler: async (accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.quickAccess.show(DEBUG_CONSOLE_QUICK_ACCESS_PREFIX);
    }
});
CommandsRegistry.registerCommand({
    id: SELECT_DEBUG_SESSION_ID,
    handler: async (accessor) => {
        showDebugSessionMenu(accessor, SELECT_AND_START_ID);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DEBUG_START_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 63 /* KeyCode.F5 */,
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE.isEqualTo('inactive')),
    handler: async (accessor, debugStartOptions) => {
        const debugService = accessor.get(IDebugService);
        await saveAllBeforeDebugStart(accessor.get(IConfigurationService), accessor.get(IEditorService));
        const { launch, name, getConfig } = debugService.getConfigurationManager().selectedConfiguration;
        const config = await getConfig();
        const configOrName = config ? Object.assign(deepClone(config), debugStartOptions?.config) : name;
        await debugService.startDebugging(launch, configOrName, { noDebug: debugStartOptions?.noDebug, startedByUser: true }, false);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DEBUG_RUN_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 2048 /* KeyMod.CtrlCmd */ | 63 /* KeyCode.F5 */,
    mac: { primary: 256 /* KeyMod.WinCtrl */ | 63 /* KeyCode.F5 */ },
    when: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DEBUG_STATE.notEqualsTo(getStateLabel(1 /* State.Initializing */))),
    handler: async (accessor) => {
        const commandService = accessor.get(ICommandService);
        await commandService.executeCommand(DEBUG_START_COMMAND_ID, { noDebug: true });
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.toggleBreakpoint',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_FOCUSED, InputFocusedContext.toNegated()),
    primary: 10 /* KeyCode.Space */,
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const debugService = accessor.get(IDebugService);
        const list = listService.lastFocusedList;
        if (list instanceof List) {
            const focused = list.getFocusedElements();
            if (focused && focused.length) {
                debugService.enableOrDisableBreakpoints(!focused[0].enabled, focused[0]);
            }
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.enableOrDisableBreakpoint',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: undefined,
    when: EditorContextKeys.editorTextFocus,
    handler: (accessor) => {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        const control = editorService.activeTextEditorControl;
        if (isCodeEditor(control)) {
            const model = control.getModel();
            if (model) {
                const position = control.getPosition();
                if (position) {
                    const bps = debugService.getModel().getBreakpoints({ uri: model.uri, lineNumber: position.lineNumber });
                    if (bps.length) {
                        debugService.enableOrDisableBreakpoints(!bps[0].enabled, bps[0]);
                    }
                }
            }
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: EDIT_EXPRESSION_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
    when: CONTEXT_WATCH_EXPRESSIONS_FOCUSED,
    primary: 60 /* KeyCode.F2 */,
    mac: { primary: 3 /* KeyCode.Enter */ },
    handler: (accessor, expression) => {
        const debugService = accessor.get(IDebugService);
        if (!(expression instanceof Expression)) {
            const listService = accessor.get(IListService);
            const focused = listService.lastFocusedList;
            if (focused) {
                const elements = focused.getFocus();
                if (Array.isArray(elements) && elements[0] instanceof Expression) {
                    expression = elements[0];
                }
            }
        }
        if (expression instanceof Expression) {
            debugService.getViewModel().setSelectedExpression(expression, false);
        }
    }
});
CommandsRegistry.registerCommand({
    id: SET_EXPRESSION_COMMAND_ID,
    handler: async (accessor, expression) => {
        const debugService = accessor.get(IDebugService);
        if (expression instanceof Expression || expression instanceof Variable) {
            debugService.getViewModel().setSelectedExpression(expression, true);
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.setVariable',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 5,
    when: CONTEXT_VARIABLES_FOCUSED,
    primary: 60 /* KeyCode.F2 */,
    mac: { primary: 3 /* KeyCode.Enter */ },
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const debugService = accessor.get(IDebugService);
        const focused = listService.lastFocusedList;
        if (focused) {
            const elements = focused.getFocus();
            if (Array.isArray(elements) && elements[0] instanceof Variable) {
                debugService.getViewModel().setSelectedExpression(elements[0], false);
            }
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: REMOVE_EXPRESSION_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(CONTEXT_WATCH_EXPRESSIONS_FOCUSED, CONTEXT_EXPRESSION_SELECTED.toNegated()),
    primary: 20 /* KeyCode.Delete */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
    handler: (accessor, expression) => {
        const debugService = accessor.get(IDebugService);
        if (expression instanceof Expression) {
            debugService.removeWatchExpressions(expression.getId());
            return;
        }
        const listService = accessor.get(IListService);
        const focused = listService.lastFocusedList;
        if (focused) {
            let elements = focused.getFocus();
            if (Array.isArray(elements) && elements[0] instanceof Expression) {
                const selection = focused.getSelection();
                if (selection && selection.indexOf(elements[0]) >= 0) {
                    elements = selection;
                }
                elements.forEach((e) => debugService.removeWatchExpressions(e.getId()));
            }
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.removeBreakpoint',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_BREAKPOINT_INPUT_FOCUSED.toNegated()),
    primary: 20 /* KeyCode.Delete */,
    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */ },
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const debugService = accessor.get(IDebugService);
        const list = listService.lastFocusedList;
        if (list instanceof List) {
            const focused = list.getFocusedElements();
            const element = focused.length ? focused[0] : undefined;
            if (element instanceof Breakpoint) {
                debugService.removeBreakpoints(element.getId());
            }
            else if (element instanceof FunctionBreakpoint) {
                debugService.removeFunctionBreakpoints(element.getId());
            }
            else if (element instanceof DataBreakpoint) {
                debugService.removeDataBreakpoints(element.getId());
            }
        }
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.installAdditionalDebuggers',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: undefined,
    primary: undefined,
    handler: async (accessor, query) => {
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        let searchFor = `@category:debuggers`;
        if (typeof query === 'string') {
            searchFor += ` ${query}`;
        }
        return extensionsWorkbenchService.openSearch(searchFor);
    }
});
registerAction2(class AddConfigurationAction extends Action2 {
    constructor() {
        super({
            id: ADD_CONFIGURATION_ID,
            title: nls.localize2('addConfiguration', "Add Configuration..."),
            category: DEBUG_COMMAND_CATEGORY,
            f1: true,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.regex(ResourceContextKey.Path.key, /\.vscode[/\\]launch\.json$/), ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID))
            }
        });
    }
    async run(accessor, launchUri) {
        const manager = accessor.get(IDebugService).getConfigurationManager();
        const launch = manager.getLaunches().find(l => l.uri.toString() === launchUri) || manager.selectedConfiguration.launch;
        if (launch) {
            const { editor, created } = await launch.openConfigFile({ preserveFocus: false });
            if (editor && !created) {
                const codeEditor = editor.getControl();
                if (codeEditor) {
                    await codeEditor.getContribution(EDITOR_CONTRIBUTION_ID)?.addLaunchConfiguration();
                }
            }
        }
    }
});
const inlineBreakpointHandler = (accessor) => {
    const debugService = accessor.get(IDebugService);
    const editorService = accessor.get(IEditorService);
    const control = editorService.activeTextEditorControl;
    if (isCodeEditor(control)) {
        const position = control.getPosition();
        if (position && control.hasModel() && debugService.canSetBreakpointsIn(control.getModel())) {
            const modelUri = control.getModel().uri;
            const breakpointAlreadySet = debugService.getModel().getBreakpoints({ lineNumber: position.lineNumber, uri: modelUri })
                .some(bp => (bp.sessionAgnosticData.column === position.column || (!bp.column && position.column <= 1)));
            if (!breakpointAlreadySet) {
                debugService.addBreakpoints(modelUri, [{ lineNumber: position.lineNumber, column: position.column > 1 ? position.column : undefined }]);
            }
        }
    }
};
KeybindingsRegistry.registerCommandAndKeybindingRule({
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    primary: 1024 /* KeyMod.Shift */ | 67 /* KeyCode.F9 */,
    when: EditorContextKeys.editorTextFocus,
    id: TOGGLE_INLINE_BREAKPOINT_ID,
    handler: inlineBreakpointHandler
});
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    command: {
        id: TOGGLE_INLINE_BREAKPOINT_ID,
        title: nls.localize('addInlineBreakpoint', "Add Inline Breakpoint"),
        category: DEBUG_COMMAND_CATEGORY
    },
    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, PanelFocusContext.toNegated(), EditorContextKeys.editorTextFocus, ChatContextKeys.inChatSession.toNegated()),
    group: 'debug',
    order: 1
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.openBreakpointToSide',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: CONTEXT_BREAKPOINTS_FOCUSED,
    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
    secondary: [512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */],
    handler: (accessor) => {
        const listService = accessor.get(IListService);
        const list = listService.lastFocusedList;
        if (list instanceof List) {
            const focus = list.getFocusedElements();
            if (focus.length && focus[0] instanceof Breakpoint) {
                return openBreakpointSource(focus[0], true, false, true, accessor.get(IDebugService), accessor.get(IEditorService));
            }
        }
        return undefined;
    }
});
// When there are no debug extensions, open the debug viewlet when F5 is pressed so the user can read the limitations
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'debug.openView',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: CONTEXT_DEBUGGERS_AVAILABLE.toNegated(),
    primary: 63 /* KeyCode.F5 */,
    secondary: [2048 /* KeyMod.CtrlCmd */ | 63 /* KeyCode.F5 */],
    handler: async (accessor) => {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        await paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */, true);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb21tYW5kcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFDdEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQWUsMkJBQTJCLEVBQUUsaUNBQWlDLEVBQUUseUJBQXlCLEVBQUUsc0JBQXNCLEVBQTRCLHFCQUFxQixFQUFFLDJCQUEyQixFQUFnRCxtQkFBbUIsRUFBdUIsZ0NBQWdDLEVBQUUsWUFBWSxFQUFFLDJCQUEyQixFQUFTLGFBQWEsRUFBRSxnQ0FBZ0MsRUFBRSxpQ0FBaUMsRUFBRSxVQUFVLEVBQUUsOEJBQThCLEVBQUUscUJBQXFCLEVBQUUsbUNBQW1DLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5bkIsT0FBTyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBVSxNQUFNLHlCQUF5QixDQUFDO0FBQ3ZILE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BGLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEgs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