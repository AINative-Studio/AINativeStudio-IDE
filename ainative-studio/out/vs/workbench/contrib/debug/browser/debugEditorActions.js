/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
import { Action } from '../../../../base/common/actions.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import * as nls from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { PanelFocusContext } from '../../../common/contextkeys.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { openBreakpointSource } from './breakpointsView.js';
import { DisassemblyView } from './disassemblyView.js';
import { BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_CALLSTACK_ITEM_TYPE, CONTEXT_DEBUG_STATE, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED, CONTEXT_DISASSEMBLY_VIEW_FOCUS, CONTEXT_EXCEPTION_WIDGET_VISIBLE, CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE, CONTEXT_IN_DEBUG_MODE, CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST, CONTEXT_STEP_INTO_TARGETS_SUPPORTED, EDITOR_CONTRIBUTION_ID, IDebugService, REPL_VIEW_ID, WATCH_VIEW_ID } from '../common/debug.js';
import { getEvaluatableExpressionAtPosition } from '../common/debugUtils.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
class ToggleBreakpointAction extends Action2 {
    constructor() {
        super({
            id: 'editor.debug.action.toggleBreakpoint',
            title: {
                ...nls.localize2('toggleBreakpointAction', "Debug: Toggle Breakpoint"),
                mnemonicTitle: nls.localize({ key: 'miToggleBreakpoint', comment: ['&& denotes a mnemonic'] }, "Toggle &&Breakpoint"),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            keybinding: {
                when: ContextKeyExpr.or(EditorContextKeys.editorTextFocus, CONTEXT_DISASSEMBLY_VIEW_FOCUS),
                primary: 67 /* KeyCode.F9 */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            },
            menu: {
                id: MenuId.MenubarDebugMenu,
                when: CONTEXT_DEBUGGERS_AVAILABLE,
                group: '4_new_breakpoint',
                order: 1
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const debugService = accessor.get(IDebugService);
        const activePane = editorService.activeEditorPane;
        if (activePane instanceof DisassemblyView) {
            const location = activePane.focusedAddressAndOffset;
            if (location) {
                const bps = debugService.getModel().getInstructionBreakpoints();
                const toRemove = bps.find(bp => bp.address === location.address);
                if (toRemove) {
                    debugService.removeInstructionBreakpoints(toRemove.instructionReference, toRemove.offset);
                }
                else {
                    debugService.addInstructionBreakpoint({ instructionReference: location.reference, offset: location.offset, address: location.address, canPersist: false });
                }
            }
            return;
        }
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
        if (editor?.hasModel()) {
            const modelUri = editor.getModel().uri;
            const canSet = debugService.canSetBreakpointsIn(editor.getModel());
            // Does not account for multi line selections, Set to remove multiple cursor on the same line
            const lineNumbers = [...new Set(editor.getSelections().map(s => s.getPosition().lineNumber))];
            await Promise.all(lineNumbers.map(async (line) => {
                const bps = debugService.getModel().getBreakpoints({ lineNumber: line, uri: modelUri });
                if (bps.length) {
                    await Promise.all(bps.map(bp => debugService.removeBreakpoints(bp.getId())));
                }
                else if (canSet) {
                    await debugService.addBreakpoints(modelUri, [{ lineNumber: line }]);
                }
            }));
        }
    }
}
class ConditionalBreakpointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.conditionalBreakpoint',
            label: nls.localize2('conditionalBreakpointEditorAction', "Debug: Add Conditional Breakpoint..."),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menuOpts: {
                menuId: MenuId.MenubarNewBreakpointMenu,
                title: nls.localize({ key: 'miConditionalBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Conditional Breakpoint..."),
                group: '1_breakpoints',
                order: 1,
                when: CONTEXT_DEBUGGERS_AVAILABLE
            }
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        if (position && editor.hasModel() && debugService.canSetBreakpointsIn(editor.getModel())) {
            editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)?.showBreakpointWidget(position.lineNumber, undefined, 0 /* BreakpointWidgetContext.CONDITION */);
        }
    }
}
class LogPointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.addLogPoint',
            label: nls.localize2('logPointEditorAction', "Debug: Add Logpoint..."),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menuOpts: [
                {
                    menuId: MenuId.MenubarNewBreakpointMenu,
                    title: nls.localize({ key: 'miLogPoint', comment: ['&& denotes a mnemonic'] }, "&&Logpoint..."),
                    group: '1_breakpoints',
                    order: 4,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                }
            ]
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        if (position && editor.hasModel() && debugService.canSetBreakpointsIn(editor.getModel())) {
            editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)?.showBreakpointWidget(position.lineNumber, position.column, 2 /* BreakpointWidgetContext.LOG_MESSAGE */);
        }
    }
}
class TriggerByBreakpointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.triggerByBreakpoint',
            label: nls.localize('triggerByBreakpointEditorAction', "Debug: Add Triggered Breakpoint..."),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            alias: 'Debug: Triggered Breakpoint...',
            menuOpts: [
                {
                    menuId: MenuId.MenubarNewBreakpointMenu,
                    title: nls.localize({ key: 'miTriggerByBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Triggered Breakpoint..."),
                    group: '1_breakpoints',
                    order: 4,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                }
            ]
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        if (position && editor.hasModel() && debugService.canSetBreakpointsIn(editor.getModel())) {
            editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)?.showBreakpointWidget(position.lineNumber, position.column, 3 /* BreakpointWidgetContext.TRIGGER_POINT */);
        }
    }
}
class EditBreakpointAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.editBreakpoint',
            label: nls.localize('EditBreakpointEditorAction', "Debug: Edit Breakpoint"),
            alias: 'Debug: Edit Existing Breakpoint',
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menuOpts: {
                menuId: MenuId.MenubarNewBreakpointMenu,
                title: nls.localize({ key: 'miEditBreakpoint', comment: ['&& denotes a mnemonic'] }, "&&Edit Breakpoint"),
                group: '1_breakpoints',
                order: 1,
                when: CONTEXT_DEBUGGERS_AVAILABLE
            }
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const position = editor.getPosition();
        const debugModel = debugService.getModel();
        if (!(editor.hasModel() && position)) {
            return;
        }
        const lineBreakpoints = debugModel.getBreakpoints({ lineNumber: position.lineNumber });
        if (lineBreakpoints.length === 0) {
            return;
        }
        const breakpointDistances = lineBreakpoints.map(b => {
            if (!b.column) {
                return position.column;
            }
            return Math.abs(b.column - position.column);
        });
        const closestBreakpointIndex = breakpointDistances.indexOf(Math.min(...breakpointDistances));
        const closestBreakpoint = lineBreakpoints[closestBreakpointIndex];
        editor.getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)?.showBreakpointWidget(closestBreakpoint.lineNumber, closestBreakpoint.column);
    }
}
class OpenDisassemblyViewAction extends Action2 {
    static { this.ID = 'debug.action.openDisassemblyView'; }
    constructor() {
        super({
            id: OpenDisassemblyViewAction.ID,
            title: {
                ...nls.localize2('openDisassemblyView', "Open Disassembly View"),
                mnemonicTitle: nls.localize({ key: 'miDisassemblyView', comment: ['&& denotes a mnemonic'] }, "&&DisassemblyView"),
            },
            precondition: CONTEXT_FOCUSED_STACK_FRAME_HAS_INSTRUCTION_POINTER_REFERENCE,
            menu: [
                {
                    id: MenuId.EditorContext,
                    group: 'debug',
                    order: 5,
                    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, PanelFocusContext.toNegated(), CONTEXT_DEBUG_STATE.isEqualTo('stopped'), EditorContextKeys.editorTextFocus, CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED, CONTEXT_LANGUAGE_SUPPORTS_DISASSEMBLE_REQUEST)
                },
                {
                    id: MenuId.DebugCallStackContext,
                    group: 'z_commands',
                    order: 50,
                    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('stackFrame'), CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED)
                },
                {
                    id: MenuId.CommandPalette,
                    when: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), CONTEXT_DISASSEMBLE_REQUEST_SUPPORTED)
                }
            ]
        });
    }
    run(accessor) {
        const editorService = accessor.get(IEditorService);
        editorService.openEditor(DisassemblyViewInput.instance, { pinned: true, revealIfOpened: true });
    }
}
class ToggleDisassemblyViewSourceCodeAction extends Action2 {
    static { this.ID = 'debug.action.toggleDisassemblyViewSourceCode'; }
    static { this.configID = 'debug.disassemblyView.showSourceCode'; }
    constructor() {
        super({
            id: ToggleDisassemblyViewSourceCodeAction.ID,
            title: {
                ...nls.localize2('toggleDisassemblyViewSourceCode', "Toggle Source Code in Disassembly View"),
                mnemonicTitle: nls.localize({ key: 'mitogglesource', comment: ['&& denotes a mnemonic'] }, "&&ToggleSource"),
            },
            metadata: {
                description: nls.localize2('toggleDisassemblyViewSourceCodeDescription', 'Shows or hides source code in disassembly')
            },
            f1: true,
        });
    }
    run(accessor, editor, ...args) {
        const configService = accessor.get(IConfigurationService);
        if (configService) {
            const value = configService.getValue('debug').disassemblyView.showSourceCode;
            configService.updateValue(ToggleDisassemblyViewSourceCodeAction.configID, !value);
        }
    }
}
export class RunToCursorAction extends EditorAction {
    static { this.ID = 'editor.debug.action.runToCursor'; }
    static { this.LABEL = nls.localize2('runToCursor', "Run to Cursor"); }
    constructor() {
        super({
            id: RunToCursorAction.ID,
            label: RunToCursorAction.LABEL.value,
            alias: 'Debug: Run to Cursor',
            precondition: ContextKeyExpr.and(CONTEXT_DEBUGGERS_AVAILABLE, PanelFocusContext.toNegated(), ContextKeyExpr.or(EditorContextKeys.editorTextFocus, CONTEXT_DISASSEMBLY_VIEW_FOCUS), ChatContextKeys.inChatSession.negate()),
            contextMenuOpts: {
                group: 'debug',
                order: 2,
                when: CONTEXT_IN_DEBUG_MODE
            }
        });
    }
    async run(accessor, editor) {
        const position = editor.getPosition();
        if (!(editor.hasModel() && position)) {
            return;
        }
        const uri = editor.getModel().uri;
        const debugService = accessor.get(IDebugService);
        const viewModel = debugService.getViewModel();
        const uriIdentityService = accessor.get(IUriIdentityService);
        let column = undefined;
        const focusedStackFrame = viewModel.focusedStackFrame;
        if (focusedStackFrame && uriIdentityService.extUri.isEqual(focusedStackFrame.source.uri, uri) && focusedStackFrame.range.startLineNumber === position.lineNumber) {
            // If the cursor is on a line different than the one the debugger is currently paused on, then send the breakpoint on the line without a column
            // otherwise set it at the precise column #102199
            column = position.column;
        }
        await debugService.runTo(uri, position.lineNumber, column);
    }
}
export class SelectionToReplAction extends EditorAction {
    static { this.ID = 'editor.debug.action.selectionToRepl'; }
    static { this.LABEL = nls.localize2('evaluateInDebugConsole', "Evaluate in Debug Console"); }
    constructor() {
        super({
            id: SelectionToReplAction.ID,
            label: SelectionToReplAction.LABEL.value,
            alias: 'Debug: Evaluate in Console',
            precondition: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus, ChatContextKeys.inChatSession.negate()),
            contextMenuOpts: {
                group: 'debug',
                order: 0
            }
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const viewsService = accessor.get(IViewsService);
        const viewModel = debugService.getViewModel();
        const session = viewModel.focusedSession;
        if (!editor.hasModel() || !session) {
            return;
        }
        const selection = editor.getSelection();
        let text;
        if (selection.isEmpty()) {
            text = editor.getModel().getLineContent(selection.selectionStartLineNumber).trim();
        }
        else {
            text = editor.getModel().getValueInRange(selection);
        }
        const replView = await viewsService.openView(REPL_VIEW_ID, false);
        replView?.sendReplInput(text);
    }
}
export class SelectionToWatchExpressionsAction extends EditorAction {
    static { this.ID = 'editor.debug.action.selectionToWatch'; }
    static { this.LABEL = nls.localize2('addToWatch', "Add to Watch"); }
    constructor() {
        super({
            id: SelectionToWatchExpressionsAction.ID,
            label: SelectionToWatchExpressionsAction.LABEL.value,
            alias: 'Debug: Add to Watch',
            precondition: ContextKeyExpr.and(CONTEXT_IN_DEBUG_MODE, EditorContextKeys.editorTextFocus, ChatContextKeys.inChatSession.negate()),
            contextMenuOpts: {
                group: 'debug',
                order: 1
            }
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const viewsService = accessor.get(IViewsService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        if (!editor.hasModel()) {
            return;
        }
        let expression = undefined;
        const model = editor.getModel();
        const selection = editor.getSelection();
        if (!selection.isEmpty()) {
            expression = model.getValueInRange(selection);
        }
        else {
            const position = editor.getPosition();
            const evaluatableExpression = await getEvaluatableExpressionAtPosition(languageFeaturesService, model, position);
            if (!evaluatableExpression) {
                return;
            }
            expression = evaluatableExpression.matchingExpression;
        }
        if (!expression) {
            return;
        }
        await viewsService.openView(WATCH_VIEW_ID);
        debugService.addWatchExpression(expression);
    }
}
class ShowDebugHoverAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.showDebugHover',
            label: nls.localize2('showDebugHover', "Debug: Show Hover"),
            precondition: CONTEXT_IN_DEBUG_MODE,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */),
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    async run(accessor, editor) {
        const position = editor.getPosition();
        if (!position || !editor.hasModel()) {
            return;
        }
        return editor.getContribution(EDITOR_CONTRIBUTION_ID)?.showHover(position, true);
    }
}
const NO_TARGETS_MESSAGE = nls.localize('editor.debug.action.stepIntoTargets.notAvailable', "Step targets are not available here");
class StepIntoTargetsAction extends EditorAction {
    static { this.ID = 'editor.debug.action.stepIntoTargets'; }
    static { this.LABEL = nls.localize({ key: 'stepIntoTargets', comment: ['Step Into Targets lets the user step into an exact function he or she is interested in.'] }, "Step Into Target"); }
    constructor() {
        super({
            id: StepIntoTargetsAction.ID,
            label: StepIntoTargetsAction.LABEL,
            alias: 'Debug: Step Into Target',
            precondition: ContextKeyExpr.and(CONTEXT_STEP_INTO_TARGETS_SUPPORTED, CONTEXT_IN_DEBUG_MODE, CONTEXT_DEBUG_STATE.isEqualTo('stopped'), EditorContextKeys.editorTextFocus),
            contextMenuOpts: {
                group: 'debug',
                order: 1.5
            }
        });
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const contextMenuService = accessor.get(IContextMenuService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        const session = debugService.getViewModel().focusedSession;
        const frame = debugService.getViewModel().focusedStackFrame;
        const selection = editor.getSelection();
        const targetPosition = selection?.getPosition() || (frame && { lineNumber: frame.range.startLineNumber, column: frame.range.startColumn });
        if (!session || !frame || !editor.hasModel() || !uriIdentityService.extUri.isEqual(editor.getModel().uri, frame.source.uri)) {
            if (targetPosition) {
                MessageController.get(editor)?.showMessage(NO_TARGETS_MESSAGE, targetPosition);
            }
            return;
        }
        const targets = await session.stepInTargets(frame.frameId);
        if (!targets?.length) {
            MessageController.get(editor)?.showMessage(NO_TARGETS_MESSAGE, targetPosition);
            return;
        }
        // If there is a selection, try to find the best target with a position to step into.
        if (selection) {
            const positionalTargets = [];
            for (const target of targets) {
                if (target.line) {
                    positionalTargets.push({
                        start: new Position(target.line, target.column || 1),
                        end: target.endLine ? new Position(target.endLine, target.endColumn || 1) : undefined,
                        target
                    });
                }
            }
            positionalTargets.sort((a, b) => b.start.lineNumber - a.start.lineNumber || b.start.column - a.start.column);
            const needle = selection.getPosition();
            // Try to find a target with a start and end that is around the cursor
            // position. Or, if none, whatever is before the cursor.
            const best = positionalTargets.find(t => t.end && needle.isBefore(t.end) && t.start.isBeforeOrEqual(needle)) || positionalTargets.find(t => t.end === undefined && t.start.isBeforeOrEqual(needle));
            if (best) {
                session.stepIn(frame.thread.threadId, best.target.id);
                return;
            }
        }
        // Otherwise, show a context menu and have the user pick a target
        editor.revealLineInCenterIfOutsideViewport(frame.range.startLineNumber);
        const cursorCoords = editor.getScrolledVisiblePosition(targetPosition);
        const editorCoords = getDomNodePagePosition(editor.getDomNode());
        const x = editorCoords.left + cursorCoords.left;
        const y = editorCoords.top + cursorCoords.top + cursorCoords.height;
        contextMenuService.showContextMenu({
            getAnchor: () => ({ x, y }),
            getActions: () => {
                return targets.map(t => new Action(`stepIntoTarget:${t.id}`, t.label, undefined, true, () => session.stepIn(frame.thread.threadId, t.id)));
            }
        });
    }
}
class GoToBreakpointAction extends EditorAction {
    constructor(isNext, opts) {
        super(opts);
        this.isNext = isNext;
    }
    async run(accessor, editor) {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        const uriIdentityService = accessor.get(IUriIdentityService);
        if (editor.hasModel()) {
            const currentUri = editor.getModel().uri;
            const currentLine = editor.getPosition().lineNumber;
            //Breakpoints returned from `getBreakpoints` are already sorted.
            const allEnabledBreakpoints = debugService.getModel().getBreakpoints({ enabledOnly: true });
            //Try to find breakpoint in current file
            let moveBreakpoint = this.isNext
                ? allEnabledBreakpoints.filter(bp => uriIdentityService.extUri.isEqual(bp.uri, currentUri) && bp.lineNumber > currentLine).shift()
                : allEnabledBreakpoints.filter(bp => uriIdentityService.extUri.isEqual(bp.uri, currentUri) && bp.lineNumber < currentLine).pop();
            //Try to find breakpoints in following files
            if (!moveBreakpoint) {
                moveBreakpoint =
                    this.isNext
                        ? allEnabledBreakpoints.filter(bp => bp.uri.toString() > currentUri.toString()).shift()
                        : allEnabledBreakpoints.filter(bp => bp.uri.toString() < currentUri.toString()).pop();
            }
            //Move to first or last possible breakpoint
            if (!moveBreakpoint && allEnabledBreakpoints.length) {
                moveBreakpoint = this.isNext ? allEnabledBreakpoints[0] : allEnabledBreakpoints[allEnabledBreakpoints.length - 1];
            }
            if (moveBreakpoint) {
                return openBreakpointSource(moveBreakpoint, false, true, false, debugService, editorService);
            }
        }
    }
}
class GoToNextBreakpointAction extends GoToBreakpointAction {
    constructor() {
        super(true, {
            id: 'editor.debug.action.goToNextBreakpoint',
            label: nls.localize2('goToNextBreakpoint', "Debug: Go to Next Breakpoint"),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE
        });
    }
}
class GoToPreviousBreakpointAction extends GoToBreakpointAction {
    constructor() {
        super(false, {
            id: 'editor.debug.action.goToPreviousBreakpoint',
            label: nls.localize2('goToPreviousBreakpoint', "Debug: Go to Previous Breakpoint"),
            precondition: CONTEXT_DEBUGGERS_AVAILABLE
        });
    }
}
class CloseExceptionWidgetAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.debug.action.closeExceptionWidget',
            label: nls.localize2('closeExceptionWidget', "Close Exception Widget"),
            precondition: CONTEXT_EXCEPTION_WIDGET_VISIBLE,
            kbOpts: {
                primary: 9 /* KeyCode.Escape */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    async run(_accessor, editor) {
        const contribution = editor.getContribution(EDITOR_CONTRIBUTION_ID);
        contribution?.closeExceptionWidget();
    }
}
registerAction2(OpenDisassemblyViewAction);
registerAction2(ToggleDisassemblyViewSourceCodeAction);
registerAction2(ToggleBreakpointAction);
registerEditorAction(ConditionalBreakpointAction);
registerEditorAction(LogPointAction);
registerEditorAction(TriggerByBreakpointAction);
registerEditorAction(EditBreakpointAction);
registerEditorAction(RunToCursorAction);
registerEditorAction(StepIntoTargetsAction);
registerEditorAction(SelectionToReplAction);
registerEditorAction(SelectionToWatchExpressionsAction);
registerEditorAction(ShowDebugHoverAction);
registerEditorAction(GoToNextBreakpointAction);
registerEditorAction(GoToPreviousBreakpointAction);
registerEditorAction(CloseExceptionWidgetAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0b3JBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0VkaXRvckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDekUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFFaEYsT0FBTyxFQUFFLFlBQVksRUFBa0Isb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDcEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFHOUYsT0FBTyxFQUFFLG1CQUFtQixF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