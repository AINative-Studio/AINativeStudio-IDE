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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFZGl0b3JBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdFZGl0b3JBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFtQixNQUFNLHFDQUFxQyxDQUFDO0FBRWhGLE9BQU8sRUFBRSxZQUFZLEVBQWtCLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDcEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3BHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRzlGLE9BQU8sRUFBRSxtQkFBbUIs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