/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../nls.js';
import { isFirefox } from '../../base/browser/browser.js';
import * as types from '../../base/common/types.js';
import { status } from '../../base/browser/ui/aria/aria.js';
import { Command, EditorCommand, registerEditorCommand, UndoCommand, RedoCommand, SelectAllCommand } from './editorExtensions.js';
import { ICodeEditorService } from './services/codeEditorService.js';
import { ColumnSelection } from '../common/cursor/cursorColumnSelection.js';
import { CursorState } from '../common/cursorCommon.js';
import { DeleteOperations } from '../common/cursor/cursorDeleteOperations.js';
import { CursorMove as CursorMove_, CursorMoveCommands } from '../common/cursor/cursorMoveCommands.js';
import { TypeOperations } from '../common/cursor/cursorTypeOperations.js';
import { Position } from '../common/core/position.js';
import { Range } from '../common/core/range.js';
import { EditorContextKeys } from '../common/editorContextKeys.js';
import { ContextKeyExpr } from '../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../platform/keybinding/common/keybindingsRegistry.js';
import { getActiveElement, isEditableElement } from '../../base/browser/dom.js';
import { EnterOperation } from '../common/cursor/cursorTypeEditOperations.js';
const CORE_WEIGHT = 0 /* KeybindingWeight.EditorCore */;
export class CoreEditorCommand extends EditorCommand {
    runEditorCommand(accessor, editor, args) {
        const viewModel = editor._getViewModel();
        if (!viewModel) {
            // the editor has no view => has no cursors
            return;
        }
        this.runCoreEditorCommand(viewModel, args || {});
    }
}
export var EditorScroll_;
(function (EditorScroll_) {
    const isEditorScrollArgs = function (arg) {
        if (!types.isObject(arg)) {
            return false;
        }
        const scrollArg = arg;
        if (!types.isString(scrollArg.to)) {
            return false;
        }
        if (!types.isUndefined(scrollArg.by) && !types.isString(scrollArg.by)) {
            return false;
        }
        if (!types.isUndefined(scrollArg.value) && !types.isNumber(scrollArg.value)) {
            return false;
        }
        if (!types.isUndefined(scrollArg.revealCursor) && !types.isBoolean(scrollArg.revealCursor)) {
            return false;
        }
        return true;
    };
    EditorScroll_.metadata = {
        description: 'Scroll editor in the given direction',
        args: [
            {
                name: 'Editor scroll argument object',
                description: `Property-value pairs that can be passed through this argument:
					* 'to': A mandatory direction value.
						\`\`\`
						'up', 'down'
						\`\`\`
					* 'by': Unit to move. Default is computed based on 'to' value.
						\`\`\`
						'line', 'wrappedLine', 'page', 'halfPage', 'editor'
						\`\`\`
					* 'value': Number of units to move. Default is '1'.
					* 'revealCursor': If 'true' reveals the cursor if it is outside view port.
				`,
                constraint: isEditorScrollArgs,
                schema: {
                    'type': 'object',
                    'required': ['to'],
                    'properties': {
                        'to': {
                            'type': 'string',
                            'enum': ['up', 'down']
                        },
                        'by': {
                            'type': 'string',
                            'enum': ['line', 'wrappedLine', 'page', 'halfPage', 'editor']
                        },
                        'value': {
                            'type': 'number',
                            'default': 1
                        },
                        'revealCursor': {
                            'type': 'boolean',
                        }
                    }
                }
            }
        ]
    };
    /**
     * Directions in the view for editor scroll command.
     */
    EditorScroll_.RawDirection = {
        Up: 'up',
        Right: 'right',
        Down: 'down',
        Left: 'left'
    };
    /**
     * Units for editor scroll 'by' argument
     */
    EditorScroll_.RawUnit = {
        Line: 'line',
        WrappedLine: 'wrappedLine',
        Page: 'page',
        HalfPage: 'halfPage',
        Editor: 'editor',
        Column: 'column'
    };
    function parse(args) {
        let direction;
        switch (args.to) {
            case EditorScroll_.RawDirection.Up:
                direction = 1 /* Direction.Up */;
                break;
            case EditorScroll_.RawDirection.Right:
                direction = 2 /* Direction.Right */;
                break;
            case EditorScroll_.RawDirection.Down:
                direction = 3 /* Direction.Down */;
                break;
            case EditorScroll_.RawDirection.Left:
                direction = 4 /* Direction.Left */;
                break;
            default:
                // Illegal arguments
                return null;
        }
        let unit;
        switch (args.by) {
            case EditorScroll_.RawUnit.Line:
                unit = 1 /* Unit.Line */;
                break;
            case EditorScroll_.RawUnit.WrappedLine:
                unit = 2 /* Unit.WrappedLine */;
                break;
            case EditorScroll_.RawUnit.Page:
                unit = 3 /* Unit.Page */;
                break;
            case EditorScroll_.RawUnit.HalfPage:
                unit = 4 /* Unit.HalfPage */;
                break;
            case EditorScroll_.RawUnit.Editor:
                unit = 5 /* Unit.Editor */;
                break;
            case EditorScroll_.RawUnit.Column:
                unit = 6 /* Unit.Column */;
                break;
            default:
                unit = 2 /* Unit.WrappedLine */;
        }
        const value = Math.floor(args.value || 1);
        const revealCursor = !!args.revealCursor;
        return {
            direction: direction,
            unit: unit,
            value: value,
            revealCursor: revealCursor,
            select: (!!args.select)
        };
    }
    EditorScroll_.parse = parse;
    let Direction;
    (function (Direction) {
        Direction[Direction["Up"] = 1] = "Up";
        Direction[Direction["Right"] = 2] = "Right";
        Direction[Direction["Down"] = 3] = "Down";
        Direction[Direction["Left"] = 4] = "Left";
    })(Direction = EditorScroll_.Direction || (EditorScroll_.Direction = {}));
    let Unit;
    (function (Unit) {
        Unit[Unit["Line"] = 1] = "Line";
        Unit[Unit["WrappedLine"] = 2] = "WrappedLine";
        Unit[Unit["Page"] = 3] = "Page";
        Unit[Unit["HalfPage"] = 4] = "HalfPage";
        Unit[Unit["Editor"] = 5] = "Editor";
        Unit[Unit["Column"] = 6] = "Column";
    })(Unit = EditorScroll_.Unit || (EditorScroll_.Unit = {}));
})(EditorScroll_ || (EditorScroll_ = {}));
export var RevealLine_;
(function (RevealLine_) {
    const isRevealLineArgs = function (arg) {
        if (!types.isObject(arg)) {
            return false;
        }
        const reveaLineArg = arg;
        if (!types.isNumber(reveaLineArg.lineNumber) && !types.isString(reveaLineArg.lineNumber)) {
            return false;
        }
        if (!types.isUndefined(reveaLineArg.at) && !types.isString(reveaLineArg.at)) {
            return false;
        }
        return true;
    };
    RevealLine_.metadata = {
        description: 'Reveal the given line at the given logical position',
        args: [
            {
                name: 'Reveal line argument object',
                description: `Property-value pairs that can be passed through this argument:
					* 'lineNumber': A mandatory line number value.
					* 'at': Logical position at which line has to be revealed.
						\`\`\`
						'top', 'center', 'bottom'
						\`\`\`
				`,
                constraint: isRevealLineArgs,
                schema: {
                    'type': 'object',
                    'required': ['lineNumber'],
                    'properties': {
                        'lineNumber': {
                            'type': ['number', 'string'],
                        },
                        'at': {
                            'type': 'string',
                            'enum': ['top', 'center', 'bottom']
                        }
                    }
                }
            }
        ]
    };
    /**
     * Values for reveal line 'at' argument
     */
    RevealLine_.RawAtArgument = {
        Top: 'top',
        Center: 'center',
        Bottom: 'bottom'
    };
})(RevealLine_ || (RevealLine_ = {}));
class EditorOrNativeTextInputCommand {
    constructor(target) {
        // 1. handle case when focus is in editor.
        target.addImplementation(10000, 'code-editor', (accessor, args) => {
            // Only if editor text focus (i.e. not if editor has widget focus).
            const focusedEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
            if (focusedEditor && focusedEditor.hasTextFocus()) {
                return this._runEditorCommand(accessor, focusedEditor, args);
            }
            return false;
        });
        // 2. handle case when focus is in some other `input` / `textarea`.
        target.addImplementation(1000, 'generic-dom-input-textarea', (accessor, args) => {
            // Only if focused on an element that allows for entering text
            const activeElement = getActiveElement();
            if (activeElement && isEditableElement(activeElement)) {
                this.runDOMCommand(activeElement);
                return true;
            }
            return false;
        });
        // 3. (default) handle case when focus is somewhere else.
        target.addImplementation(0, 'generic-dom', (accessor, args) => {
            // Redirecting to active editor
            const activeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor();
            if (activeEditor) {
                activeEditor.focus();
                return this._runEditorCommand(accessor, activeEditor, args);
            }
            return false;
        });
    }
    _runEditorCommand(accessor, editor, args) {
        const result = this.runEditorCommand(accessor, editor, args);
        if (result) {
            return result;
        }
        return true;
    }
}
export var NavigationCommandRevealType;
(function (NavigationCommandRevealType) {
    /**
     * Do regular revealing.
     */
    NavigationCommandRevealType[NavigationCommandRevealType["Regular"] = 0] = "Regular";
    /**
     * Do only minimal revealing.
     */
    NavigationCommandRevealType[NavigationCommandRevealType["Minimal"] = 1] = "Minimal";
    /**
     * Do not reveal the position.
     */
    NavigationCommandRevealType[NavigationCommandRevealType["None"] = 2] = "None";
})(NavigationCommandRevealType || (NavigationCommandRevealType = {}));
export var CoreNavigationCommands;
(function (CoreNavigationCommands) {
    class BaseMoveToCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            viewModel.model.pushStackElement();
            const cursorStateChanged = viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.moveTo(viewModel, viewModel.getPrimaryCursorState(), this._inSelectionMode, args.position, args.viewPosition)
            ]);
            if (cursorStateChanged && args.revealType !== 2 /* NavigationCommandRevealType.None */) {
                viewModel.revealAllCursors(args.source, true, true);
            }
        }
    }
    CoreNavigationCommands.MoveTo = registerEditorCommand(new BaseMoveToCommand({
        id: '_moveTo',
        inSelectionMode: false,
        precondition: undefined
    }));
    CoreNavigationCommands.MoveToSelect = registerEditorCommand(new BaseMoveToCommand({
        id: '_moveToSelect',
        inSelectionMode: true,
        precondition: undefined
    }));
    class ColumnSelectCommand extends CoreEditorCommand {
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            const result = this._getColumnSelectResult(viewModel, viewModel.getPrimaryCursorState(), viewModel.getCursorColumnSelectData(), args);
            if (result === null) {
                // invalid arguments
                return;
            }
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, result.viewStates.map((viewState) => CursorState.fromViewState(viewState)));
            viewModel.setCursorColumnSelectData({
                isReal: true,
                fromViewLineNumber: result.fromLineNumber,
                fromViewVisualColumn: result.fromVisualColumn,
                toViewLineNumber: result.toLineNumber,
                toViewVisualColumn: result.toVisualColumn
            });
            if (result.reversed) {
                viewModel.revealTopMostCursor(args.source);
            }
            else {
                viewModel.revealBottomMostCursor(args.source);
            }
        }
    }
    CoreNavigationCommands.ColumnSelect = registerEditorCommand(new class extends ColumnSelectCommand {
        constructor() {
            super({
                id: 'columnSelect',
                precondition: undefined
            });
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            if (typeof args.position === 'undefined' || typeof args.viewPosition === 'undefined' || typeof args.mouseColumn === 'undefined') {
                return null;
            }
            // validate `args`
            const validatedPosition = viewModel.model.validatePosition(args.position);
            const validatedViewPosition = viewModel.coordinatesConverter.validateViewPosition(new Position(args.viewPosition.lineNumber, args.viewPosition.column), validatedPosition);
            const fromViewLineNumber = args.doColumnSelect ? prevColumnSelectData.fromViewLineNumber : validatedViewPosition.lineNumber;
            const fromViewVisualColumn = args.doColumnSelect ? prevColumnSelectData.fromViewVisualColumn : args.mouseColumn - 1;
            return ColumnSelection.columnSelect(viewModel.cursorConfig, viewModel, fromViewLineNumber, fromViewVisualColumn, validatedViewPosition.lineNumber, args.mouseColumn - 1);
        }
    });
    CoreNavigationCommands.CursorColumnSelectLeft = registerEditorCommand(new class extends ColumnSelectCommand {
        constructor() {
            super({
                id: 'cursorColumnSelectLeft',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */,
                    linux: { primary: 0 }
                }
            });
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectLeft(viewModel.cursorConfig, viewModel, prevColumnSelectData);
        }
    });
    CoreNavigationCommands.CursorColumnSelectRight = registerEditorCommand(new class extends ColumnSelectCommand {
        constructor() {
            super({
                id: 'cursorColumnSelectRight',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */,
                    linux: { primary: 0 }
                }
            });
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectRight(viewModel.cursorConfig, viewModel, prevColumnSelectData);
        }
    });
    class ColumnSelectUpCommand extends ColumnSelectCommand {
        constructor(opts) {
            super(opts);
            this._isPaged = opts.isPaged;
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectUp(viewModel.cursorConfig, viewModel, prevColumnSelectData, this._isPaged);
        }
    }
    CoreNavigationCommands.CursorColumnSelectUp = registerEditorCommand(new ColumnSelectUpCommand({
        isPaged: false,
        id: 'cursorColumnSelectUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */,
            linux: { primary: 0 }
        }
    }));
    CoreNavigationCommands.CursorColumnSelectPageUp = registerEditorCommand(new ColumnSelectUpCommand({
        isPaged: true,
        id: 'cursorColumnSelectPageUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
            linux: { primary: 0 }
        }
    }));
    class ColumnSelectDownCommand extends ColumnSelectCommand {
        constructor(opts) {
            super(opts);
            this._isPaged = opts.isPaged;
        }
        _getColumnSelectResult(viewModel, primary, prevColumnSelectData, args) {
            return ColumnSelection.columnSelectDown(viewModel.cursorConfig, viewModel, prevColumnSelectData, this._isPaged);
        }
    }
    CoreNavigationCommands.CursorColumnSelectDown = registerEditorCommand(new ColumnSelectDownCommand({
        isPaged: false,
        id: 'cursorColumnSelectDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */,
            linux: { primary: 0 }
        }
    }));
    CoreNavigationCommands.CursorColumnSelectPageDown = registerEditorCommand(new ColumnSelectDownCommand({
        isPaged: true,
        id: 'cursorColumnSelectPageDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
            linux: { primary: 0 }
        }
    }));
    class CursorMoveImpl extends CoreEditorCommand {
        constructor() {
            super({
                id: 'cursorMove',
                precondition: undefined,
                metadata: CursorMove_.metadata
            });
        }
        runCoreEditorCommand(viewModel, args) {
            const parsed = CursorMove_.parse(args);
            if (!parsed) {
                // illegal arguments
                return;
            }
            this._runCursorMove(viewModel, args.source, parsed);
        }
        _runCursorMove(viewModel, source, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(source, 3 /* CursorChangeReason.Explicit */, CursorMoveImpl._move(viewModel, viewModel.getCursorStates(), args));
            viewModel.revealAllCursors(source, true);
        }
        static _move(viewModel, cursors, args) {
            const inSelectionMode = args.select;
            const value = args.value;
            switch (args.direction) {
                case 0 /* CursorMove_.Direction.Left */:
                case 1 /* CursorMove_.Direction.Right */:
                case 2 /* CursorMove_.Direction.Up */:
                case 3 /* CursorMove_.Direction.Down */:
                case 4 /* CursorMove_.Direction.PrevBlankLine */:
                case 5 /* CursorMove_.Direction.NextBlankLine */:
                case 6 /* CursorMove_.Direction.WrappedLineStart */:
                case 7 /* CursorMove_.Direction.WrappedLineFirstNonWhitespaceCharacter */:
                case 8 /* CursorMove_.Direction.WrappedLineColumnCenter */:
                case 9 /* CursorMove_.Direction.WrappedLineEnd */:
                case 10 /* CursorMove_.Direction.WrappedLineLastNonWhitespaceCharacter */:
                    return CursorMoveCommands.simpleMove(viewModel, cursors, args.direction, inSelectionMode, value, args.unit);
                case 11 /* CursorMove_.Direction.ViewPortTop */:
                case 13 /* CursorMove_.Direction.ViewPortBottom */:
                case 12 /* CursorMove_.Direction.ViewPortCenter */:
                case 14 /* CursorMove_.Direction.ViewPortIfOutside */:
                    return CursorMoveCommands.viewportMove(viewModel, cursors, args.direction, inSelectionMode, value);
                default:
                    return null;
            }
        }
    }
    CoreNavigationCommands.CursorMoveImpl = CursorMoveImpl;
    CoreNavigationCommands.CursorMove = registerEditorCommand(new CursorMoveImpl());
    let Constants;
    (function (Constants) {
        Constants[Constants["PAGE_SIZE_MARKER"] = -1] = "PAGE_SIZE_MARKER";
    })(Constants || (Constants = {}));
    class CursorMoveBasedCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._staticArgs = opts.args;
        }
        runCoreEditorCommand(viewModel, dynamicArgs) {
            let args = this._staticArgs;
            if (this._staticArgs.value === -1 /* Constants.PAGE_SIZE_MARKER */) {
                // -1 is a marker for page size
                args = {
                    direction: this._staticArgs.direction,
                    unit: this._staticArgs.unit,
                    select: this._staticArgs.select,
                    value: dynamicArgs.pageSize || viewModel.cursorConfig.pageSize
                };
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(dynamicArgs.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.simpleMove(viewModel, viewModel.getCursorStates(), args.direction, args.select, args.value, args.unit));
            viewModel.revealAllCursors(dynamicArgs.source, true);
        }
    }
    CoreNavigationCommands.CursorLeft = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 0 /* CursorMove_.Direction.Left */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: false,
            value: 1
        },
        id: 'cursorLeft',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 15 /* KeyCode.LeftArrow */,
            mac: { primary: 15 /* KeyCode.LeftArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 32 /* KeyCode.KeyB */] }
        }
    }));
    CoreNavigationCommands.CursorLeftSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 0 /* CursorMove_.Direction.Left */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: true,
            value: 1
        },
        id: 'cursorLeftSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */
        }
    }));
    CoreNavigationCommands.CursorRight = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 1 /* CursorMove_.Direction.Right */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: false,
            value: 1
        },
        id: 'cursorRight',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 17 /* KeyCode.RightArrow */,
            mac: { primary: 17 /* KeyCode.RightArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 36 /* KeyCode.KeyF */] }
        }
    }));
    CoreNavigationCommands.CursorRightSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 1 /* CursorMove_.Direction.Right */,
            unit: 0 /* CursorMove_.Unit.None */,
            select: true,
            value: 1
        },
        id: 'cursorRightSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */
        }
    }));
    CoreNavigationCommands.CursorUp = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: 1
        },
        id: 'cursorUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 16 /* KeyCode.UpArrow */,
            mac: { primary: 16 /* KeyCode.UpArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */] }
        }
    }));
    CoreNavigationCommands.CursorUpSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: 1
        },
        id: 'cursorUpSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */,
            secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */],
            mac: { primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ },
            linux: { primary: 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ }
        }
    }));
    CoreNavigationCommands.CursorPageUp = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: -1 /* Constants.PAGE_SIZE_MARKER */
        },
        id: 'cursorPageUp',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 11 /* KeyCode.PageUp */
        }
    }));
    CoreNavigationCommands.CursorPageUpSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 2 /* CursorMove_.Direction.Up */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: -1 /* Constants.PAGE_SIZE_MARKER */
        },
        id: 'cursorPageUpSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */
        }
    }));
    CoreNavigationCommands.CursorDown = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: 1
        },
        id: 'cursorDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 18 /* KeyCode.DownArrow */,
            mac: { primary: 18 /* KeyCode.DownArrow */, secondary: [256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */] }
        }
    }));
    CoreNavigationCommands.CursorDownSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: 1
        },
        id: 'cursorDownSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */,
            secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */],
            mac: { primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ },
            linux: { primary: 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ }
        }
    }));
    CoreNavigationCommands.CursorPageDown = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: false,
            value: -1 /* Constants.PAGE_SIZE_MARKER */
        },
        id: 'cursorPageDown',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 12 /* KeyCode.PageDown */
        }
    }));
    CoreNavigationCommands.CursorPageDownSelect = registerEditorCommand(new CursorMoveBasedCommand({
        args: {
            direction: 3 /* CursorMove_.Direction.Down */,
            unit: 2 /* CursorMove_.Unit.WrappedLine */,
            select: true,
            value: -1 /* Constants.PAGE_SIZE_MARKER */
        },
        id: 'cursorPageDownSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */
        }
    }));
    CoreNavigationCommands.CreateCursor = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'createCursor',
                precondition: undefined
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            let newState;
            if (args.wholeLine) {
                newState = CursorMoveCommands.line(viewModel, viewModel.getPrimaryCursorState(), false, args.position, args.viewPosition);
            }
            else {
                newState = CursorMoveCommands.moveTo(viewModel, viewModel.getPrimaryCursorState(), false, args.position, args.viewPosition);
            }
            const states = viewModel.getCursorStates();
            // Check if we should remove a cursor (sort of like a toggle)
            if (states.length > 1) {
                const newModelPosition = (newState.modelState ? newState.modelState.position : null);
                const newViewPosition = (newState.viewState ? newState.viewState.position : null);
                for (let i = 0, len = states.length; i < len; i++) {
                    const state = states[i];
                    if (newModelPosition && !state.modelState.selection.containsPosition(newModelPosition)) {
                        continue;
                    }
                    if (newViewPosition && !state.viewState.selection.containsPosition(newViewPosition)) {
                        continue;
                    }
                    // => Remove the cursor
                    states.splice(i, 1);
                    viewModel.model.pushStackElement();
                    viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, states);
                    return;
                }
            }
            // => Add the new cursor
            states.push(newState);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, states);
        }
    });
    CoreNavigationCommands.LastCursorMoveToSelect = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: '_lastCursorMoveToSelect',
                precondition: undefined
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            const lastAddedCursorIndex = viewModel.getLastAddedCursorIndex();
            const states = viewModel.getCursorStates();
            const newStates = states.slice(0);
            newStates[lastAddedCursorIndex] = CursorMoveCommands.moveTo(viewModel, states[lastAddedCursorIndex], true, args.position, args.viewPosition);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, newStates);
        }
    });
    class HomeCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToBeginningOfLine(viewModel, viewModel.getCursorStates(), this._inSelectionMode));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorHome = registerEditorCommand(new HomeCommand({
        inSelectionMode: false,
        id: 'cursorHome',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 14 /* KeyCode.Home */,
            mac: { primary: 14 /* KeyCode.Home */, secondary: [2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */] }
        }
    }));
    CoreNavigationCommands.CursorHomeSelect = registerEditorCommand(new HomeCommand({
        inSelectionMode: true,
        id: 'cursorHomeSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */,
            mac: { primary: 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */, secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */] }
        }
    }));
    class LineStartCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, this._exec(viewModel.getCursorStates()));
            viewModel.revealAllCursors(args.source, true);
        }
        _exec(cursors) {
            const result = [];
            for (let i = 0, len = cursors.length; i < len; i++) {
                const cursor = cursors[i];
                const lineNumber = cursor.modelState.position.lineNumber;
                result[i] = CursorState.fromModelState(cursor.modelState.move(this._inSelectionMode, lineNumber, 1, 0));
            }
            return result;
        }
    }
    CoreNavigationCommands.CursorLineStart = registerEditorCommand(new LineStartCommand({
        inSelectionMode: false,
        id: 'cursorLineStart',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 31 /* KeyCode.KeyA */ }
        }
    }));
    CoreNavigationCommands.CursorLineStartSelect = registerEditorCommand(new LineStartCommand({
        inSelectionMode: true,
        id: 'cursorLineStartSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 31 /* KeyCode.KeyA */ }
        }
    }));
    class EndCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToEndOfLine(viewModel, viewModel.getCursorStates(), this._inSelectionMode, args.sticky || false));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorEnd = registerEditorCommand(new EndCommand({
        inSelectionMode: false,
        id: 'cursorEnd',
        precondition: undefined,
        kbOpts: {
            args: { sticky: false },
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 13 /* KeyCode.End */,
            mac: { primary: 13 /* KeyCode.End */, secondary: [2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */] }
        },
        metadata: {
            description: `Go to End`,
            args: [{
                    name: 'args',
                    schema: {
                        type: 'object',
                        properties: {
                            'sticky': {
                                description: nls.localize('stickydesc', "Stick to the end even when going to longer lines"),
                                type: 'boolean',
                                default: false
                            }
                        }
                    }
                }]
        }
    }));
    CoreNavigationCommands.CursorEndSelect = registerEditorCommand(new EndCommand({
        inSelectionMode: true,
        id: 'cursorEndSelect',
        precondition: undefined,
        kbOpts: {
            args: { sticky: false },
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */,
            mac: { primary: 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */, secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */] }
        },
        metadata: {
            description: `Select to End`,
            args: [{
                    name: 'args',
                    schema: {
                        type: 'object',
                        properties: {
                            'sticky': {
                                description: nls.localize('stickydesc', "Stick to the end even when going to longer lines"),
                                type: 'boolean',
                                default: false
                            }
                        }
                    }
                }]
        }
    }));
    class LineEndCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, this._exec(viewModel, viewModel.getCursorStates()));
            viewModel.revealAllCursors(args.source, true);
        }
        _exec(viewModel, cursors) {
            const result = [];
            for (let i = 0, len = cursors.length; i < len; i++) {
                const cursor = cursors[i];
                const lineNumber = cursor.modelState.position.lineNumber;
                const maxColumn = viewModel.model.getLineMaxColumn(lineNumber);
                result[i] = CursorState.fromModelState(cursor.modelState.move(this._inSelectionMode, lineNumber, maxColumn, 0));
            }
            return result;
        }
    }
    CoreNavigationCommands.CursorLineEnd = registerEditorCommand(new LineEndCommand({
        inSelectionMode: false,
        id: 'cursorLineEnd',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 35 /* KeyCode.KeyE */ }
        }
    }));
    CoreNavigationCommands.CursorLineEndSelect = registerEditorCommand(new LineEndCommand({
        inSelectionMode: true,
        id: 'cursorLineEndSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 0,
            mac: { primary: 256 /* KeyMod.WinCtrl */ | 1024 /* KeyMod.Shift */ | 35 /* KeyCode.KeyE */ }
        }
    }));
    class TopCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToBeginningOfBuffer(viewModel, viewModel.getCursorStates(), this._inSelectionMode));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorTop = registerEditorCommand(new TopCommand({
        inSelectionMode: false,
        id: 'cursorTop',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 14 /* KeyCode.Home */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ }
        }
    }));
    CoreNavigationCommands.CursorTopSelect = registerEditorCommand(new TopCommand({
        inSelectionMode: true,
        id: 'cursorTopSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 14 /* KeyCode.Home */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */ }
        }
    }));
    class BottomCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, CursorMoveCommands.moveToEndOfBuffer(viewModel, viewModel.getCursorStates(), this._inSelectionMode));
            viewModel.revealAllCursors(args.source, true);
        }
    }
    CoreNavigationCommands.CursorBottom = registerEditorCommand(new BottomCommand({
        inSelectionMode: false,
        id: 'cursorBottom',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 13 /* KeyCode.End */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ }
        }
    }));
    CoreNavigationCommands.CursorBottomSelect = registerEditorCommand(new BottomCommand({
        inSelectionMode: true,
        id: 'cursorBottomSelect',
        precondition: undefined,
        kbOpts: {
            weight: CORE_WEIGHT,
            kbExpr: EditorContextKeys.textInputFocus,
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 13 /* KeyCode.End */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */ }
        }
    }));
    class EditorScrollImpl extends CoreEditorCommand {
        constructor() {
            super({
                id: 'editorScroll',
                precondition: undefined,
                metadata: EditorScroll_.metadata
            });
        }
        determineScrollMethod(args) {
            const horizontalUnits = [6 /* EditorScroll_.Unit.Column */];
            const verticalUnits = [
                1 /* EditorScroll_.Unit.Line */,
                2 /* EditorScroll_.Unit.WrappedLine */,
                3 /* EditorScroll_.Unit.Page */,
                4 /* EditorScroll_.Unit.HalfPage */,
                5 /* EditorScroll_.Unit.Editor */,
                6 /* EditorScroll_.Unit.Column */
            ];
            const horizontalDirections = [4 /* EditorScroll_.Direction.Left */, 2 /* EditorScroll_.Direction.Right */];
            const verticalDirections = [1 /* EditorScroll_.Direction.Up */, 3 /* EditorScroll_.Direction.Down */];
            if (horizontalUnits.includes(args.unit) && horizontalDirections.includes(args.direction)) {
                return this._runHorizontalEditorScroll.bind(this);
            }
            if (verticalUnits.includes(args.unit) && verticalDirections.includes(args.direction)) {
                return this._runVerticalEditorScroll.bind(this);
            }
            return null;
        }
        runCoreEditorCommand(viewModel, args) {
            const parsed = EditorScroll_.parse(args);
            if (!parsed) {
                // illegal arguments
                return;
            }
            const runEditorScroll = this.determineScrollMethod(parsed);
            if (!runEditorScroll) {
                // Incompatible unit and direction
                return;
            }
            runEditorScroll(viewModel, args.source, parsed);
        }
        _runVerticalEditorScroll(viewModel, source, args) {
            const desiredScrollTop = this._computeDesiredScrollTop(viewModel, args);
            if (args.revealCursor) {
                // must ensure cursor is in new visible range
                const desiredVisibleViewRange = viewModel.getCompletelyVisibleViewRangeAtScrollTop(desiredScrollTop);
                viewModel.setCursorStates(source, 3 /* CursorChangeReason.Explicit */, [
                    CursorMoveCommands.findPositionInViewportIfOutside(viewModel, viewModel.getPrimaryCursorState(), desiredVisibleViewRange, args.select)
                ]);
            }
            viewModel.viewLayout.setScrollPosition({ scrollTop: desiredScrollTop }, 0 /* ScrollType.Smooth */);
        }
        _computeDesiredScrollTop(viewModel, args) {
            if (args.unit === 1 /* EditorScroll_.Unit.Line */) {
                // scrolling by model lines
                const futureViewport = viewModel.viewLayout.getFutureViewport();
                const visibleViewRange = viewModel.getCompletelyVisibleViewRangeAtScrollTop(futureViewport.top);
                const visibleModelRange = viewModel.coordinatesConverter.convertViewRangeToModelRange(visibleViewRange);
                let desiredTopModelLineNumber;
                if (args.direction === 1 /* EditorScroll_.Direction.Up */) {
                    // must go x model lines up
                    desiredTopModelLineNumber = Math.max(1, visibleModelRange.startLineNumber - args.value);
                }
                else {
                    // must go x model lines down
                    desiredTopModelLineNumber = Math.min(viewModel.model.getLineCount(), visibleModelRange.startLineNumber + args.value);
                }
                const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(new Position(desiredTopModelLineNumber, 1));
                return viewModel.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber);
            }
            if (args.unit === 5 /* EditorScroll_.Unit.Editor */) {
                let desiredTopModelLineNumber = 0;
                if (args.direction === 3 /* EditorScroll_.Direction.Down */) {
                    desiredTopModelLineNumber = viewModel.model.getLineCount() - viewModel.cursorConfig.pageSize;
                }
                return viewModel.viewLayout.getVerticalOffsetForLineNumber(desiredTopModelLineNumber);
            }
            let noOfLines;
            if (args.unit === 3 /* EditorScroll_.Unit.Page */) {
                noOfLines = viewModel.cursorConfig.pageSize * args.value;
            }
            else if (args.unit === 4 /* EditorScroll_.Unit.HalfPage */) {
                noOfLines = Math.round(viewModel.cursorConfig.pageSize / 2) * args.value;
            }
            else {
                noOfLines = args.value;
            }
            const deltaLines = (args.direction === 1 /* EditorScroll_.Direction.Up */ ? -1 : 1) * noOfLines;
            return viewModel.viewLayout.getCurrentScrollTop() + deltaLines * viewModel.cursorConfig.lineHeight;
        }
        _runHorizontalEditorScroll(viewModel, source, args) {
            const desiredScrollLeft = this._computeDesiredScrollLeft(viewModel, args);
            viewModel.viewLayout.setScrollPosition({ scrollLeft: desiredScrollLeft }, 0 /* ScrollType.Smooth */);
        }
        _computeDesiredScrollLeft(viewModel, args) {
            const deltaColumns = (args.direction === 4 /* EditorScroll_.Direction.Left */ ? -1 : 1) * args.value;
            return viewModel.viewLayout.getCurrentScrollLeft() + deltaColumns * viewModel.cursorConfig.typicalHalfwidthCharacterWidth;
        }
    }
    CoreNavigationCommands.EditorScrollImpl = EditorScrollImpl;
    CoreNavigationCommands.EditorScroll = registerEditorCommand(new EditorScrollImpl());
    CoreNavigationCommands.ScrollLineUp = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollLineUp',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 11 /* KeyCode.PageUp */ }
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Up,
                by: EditorScroll_.RawUnit.WrappedLine,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    CoreNavigationCommands.ScrollPageUp = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollPageUp',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 11 /* KeyCode.PageUp */,
                    win: { primary: 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */ },
                    linux: { primary: 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */ }
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Up,
                by: EditorScroll_.RawUnit.Page,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    CoreNavigationCommands.ScrollEditorTop = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollEditorTop',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Up,
                by: EditorScroll_.RawUnit.Editor,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    CoreNavigationCommands.ScrollLineDown = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollLineDown',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 12 /* KeyCode.PageDown */ }
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Down,
                by: EditorScroll_.RawUnit.WrappedLine,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    CoreNavigationCommands.ScrollPageDown = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollPageDown',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 12 /* KeyCode.PageDown */,
                    win: { primary: 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */ },
                    linux: { primary: 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */ }
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Down,
                by: EditorScroll_.RawUnit.Page,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    CoreNavigationCommands.ScrollEditorBottom = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollEditorBottom',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Down,
                by: EditorScroll_.RawUnit.Editor,
                value: 1,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    CoreNavigationCommands.ScrollLeft = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollLeft',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Left,
                by: EditorScroll_.RawUnit.Column,
                value: 2,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    CoreNavigationCommands.ScrollRight = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'scrollRight',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            CoreNavigationCommands.EditorScroll.runCoreEditorCommand(viewModel, {
                to: EditorScroll_.RawDirection.Right,
                by: EditorScroll_.RawUnit.Column,
                value: 2,
                revealCursor: false,
                select: false,
                source: args.source
            });
        }
    });
    class WordCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.word(viewModel, viewModel.getPrimaryCursorState(), this._inSelectionMode, args.position)
            ]);
            if (args.revealType !== 2 /* NavigationCommandRevealType.None */) {
                viewModel.revealAllCursors(args.source, true, true);
            }
        }
    }
    CoreNavigationCommands.WordSelect = registerEditorCommand(new WordCommand({
        inSelectionMode: false,
        id: '_wordSelect',
        precondition: undefined
    }));
    CoreNavigationCommands.WordSelectDrag = registerEditorCommand(new WordCommand({
        inSelectionMode: true,
        id: '_wordSelectDrag',
        precondition: undefined
    }));
    CoreNavigationCommands.LastCursorWordSelect = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'lastCursorWordSelect',
                precondition: undefined
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            const lastAddedCursorIndex = viewModel.getLastAddedCursorIndex();
            const states = viewModel.getCursorStates();
            const newStates = states.slice(0);
            const lastAddedState = states[lastAddedCursorIndex];
            newStates[lastAddedCursorIndex] = CursorMoveCommands.word(viewModel, lastAddedState, lastAddedState.modelState.hasSelection(), args.position);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, newStates);
        }
    });
    class LineCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.line(viewModel, viewModel.getPrimaryCursorState(), this._inSelectionMode, args.position, args.viewPosition)
            ]);
            if (args.revealType !== 2 /* NavigationCommandRevealType.None */) {
                viewModel.revealAllCursors(args.source, false, true);
            }
        }
    }
    CoreNavigationCommands.LineSelect = registerEditorCommand(new LineCommand({
        inSelectionMode: false,
        id: '_lineSelect',
        precondition: undefined
    }));
    CoreNavigationCommands.LineSelectDrag = registerEditorCommand(new LineCommand({
        inSelectionMode: true,
        id: '_lineSelectDrag',
        precondition: undefined
    }));
    class LastCursorLineCommand extends CoreEditorCommand {
        constructor(opts) {
            super(opts);
            this._inSelectionMode = opts.inSelectionMode;
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.position) {
                return;
            }
            const lastAddedCursorIndex = viewModel.getLastAddedCursorIndex();
            const states = viewModel.getCursorStates();
            const newStates = states.slice(0);
            newStates[lastAddedCursorIndex] = CursorMoveCommands.line(viewModel, states[lastAddedCursorIndex], this._inSelectionMode, args.position, args.viewPosition);
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, newStates);
        }
    }
    CoreNavigationCommands.LastCursorLineSelect = registerEditorCommand(new LastCursorLineCommand({
        inSelectionMode: false,
        id: 'lastCursorLineSelect',
        precondition: undefined
    }));
    CoreNavigationCommands.LastCursorLineSelectDrag = registerEditorCommand(new LastCursorLineCommand({
        inSelectionMode: true,
        id: 'lastCursorLineSelectDrag',
        precondition: undefined
    }));
    CoreNavigationCommands.CancelSelection = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'cancelSelection',
                precondition: EditorContextKeys.hasNonEmptySelection,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 9 /* KeyCode.Escape */,
                    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.cancelSelection(viewModel, viewModel.getPrimaryCursorState())
            ]);
            viewModel.revealAllCursors(args.source, true);
        }
    });
    CoreNavigationCommands.RemoveSecondaryCursors = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'removeSecondaryCursors',
                precondition: EditorContextKeys.hasMultipleSelections,
                kbOpts: {
                    weight: CORE_WEIGHT + 1,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 9 /* KeyCode.Escape */,
                    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */]
                }
            });
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                viewModel.getPrimaryCursorState()
            ]);
            viewModel.revealAllCursors(args.source, true);
            status(nls.localize('removedCursor', "Removed secondary cursors"));
        }
    });
    CoreNavigationCommands.RevealLine = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'revealLine',
                precondition: undefined,
                metadata: RevealLine_.metadata
            });
        }
        runCoreEditorCommand(viewModel, args) {
            const revealLineArg = args;
            const lineNumberArg = revealLineArg.lineNumber || 0;
            let lineNumber = typeof lineNumberArg === 'number' ? (lineNumberArg + 1) : (parseInt(lineNumberArg) + 1);
            if (lineNumber < 1) {
                lineNumber = 1;
            }
            const lineCount = viewModel.model.getLineCount();
            if (lineNumber > lineCount) {
                lineNumber = lineCount;
            }
            const range = new Range(lineNumber, 1, lineNumber, viewModel.model.getLineMaxColumn(lineNumber));
            let revealAt = 0 /* VerticalRevealType.Simple */;
            if (revealLineArg.at) {
                switch (revealLineArg.at) {
                    case RevealLine_.RawAtArgument.Top:
                        revealAt = 3 /* VerticalRevealType.Top */;
                        break;
                    case RevealLine_.RawAtArgument.Center:
                        revealAt = 1 /* VerticalRevealType.Center */;
                        break;
                    case RevealLine_.RawAtArgument.Bottom:
                        revealAt = 4 /* VerticalRevealType.Bottom */;
                        break;
                    default:
                        break;
                }
            }
            const viewRange = viewModel.coordinatesConverter.convertModelRangeToViewRange(range);
            viewModel.revealRange(args.source, false, viewRange, revealAt, 0 /* ScrollType.Smooth */);
        }
    });
    CoreNavigationCommands.SelectAll = new class extends EditorOrNativeTextInputCommand {
        constructor() {
            super(SelectAllCommand);
        }
        runDOMCommand(activeElement) {
            if (isFirefox) {
                activeElement.focus();
                activeElement.select();
            }
            activeElement.ownerDocument.execCommand('selectAll');
        }
        runEditorCommand(accessor, editor, args) {
            const viewModel = editor._getViewModel();
            if (!viewModel) {
                // the editor has no view => has no cursors
                return;
            }
            this.runCoreEditorCommand(viewModel, args);
        }
        runCoreEditorCommand(viewModel, args) {
            viewModel.model.pushStackElement();
            viewModel.setCursorStates('keyboard', 3 /* CursorChangeReason.Explicit */, [
                CursorMoveCommands.selectAll(viewModel, viewModel.getPrimaryCursorState())
            ]);
        }
    }();
    CoreNavigationCommands.SetSelection = registerEditorCommand(new class extends CoreEditorCommand {
        constructor() {
            super({
                id: 'setSelection',
                precondition: undefined
            });
        }
        runCoreEditorCommand(viewModel, args) {
            if (!args.selection) {
                return;
            }
            viewModel.model.pushStackElement();
            viewModel.setCursorStates(args.source, 3 /* CursorChangeReason.Explicit */, [
                CursorState.fromModelSelection(args.selection)
            ]);
        }
    });
})(CoreNavigationCommands || (CoreNavigationCommands = {}));
const columnSelectionCondition = ContextKeyExpr.and(EditorContextKeys.textInputFocus, EditorContextKeys.columnSelection);
function registerColumnSelection(id, keybinding) {
    KeybindingsRegistry.registerKeybindingRule({
        id: id,
        primary: keybinding,
        when: columnSelectionCondition,
        weight: CORE_WEIGHT + 1
    });
}
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectLeft.id, 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectRight.id, 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectUp.id, 1024 /* KeyMod.Shift */ | 16 /* KeyCode.UpArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectPageUp.id, 1024 /* KeyMod.Shift */ | 11 /* KeyCode.PageUp */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectDown.id, 1024 /* KeyMod.Shift */ | 18 /* KeyCode.DownArrow */);
registerColumnSelection(CoreNavigationCommands.CursorColumnSelectPageDown.id, 1024 /* KeyMod.Shift */ | 12 /* KeyCode.PageDown */);
function registerCommand(command) {
    command.register();
    return command;
}
export var CoreEditingCommands;
(function (CoreEditingCommands) {
    class CoreEditingCommand extends EditorCommand {
        runEditorCommand(accessor, editor, args) {
            const viewModel = editor._getViewModel();
            if (!viewModel) {
                // the editor has no view => has no cursors
                return;
            }
            this.runCoreEditingCommand(editor, viewModel, args || {});
        }
    }
    CoreEditingCommands.CoreEditingCommand = CoreEditingCommand;
    CoreEditingCommands.LineBreakInsert = registerEditorCommand(new class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'lineBreakInsert',
                precondition: EditorContextKeys.writable,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 0,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 45 /* KeyCode.KeyO */ }
                }
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, EnterOperation.lineBreakInsert(viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map(s => s.modelState.selection)));
        }
    });
    CoreEditingCommands.Outdent = registerEditorCommand(new class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'outdent',
                precondition: EditorContextKeys.writable,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus),
                    primary: 1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */
                }
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, TypeOperations.outdent(viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map(s => s.modelState.selection)));
            editor.pushUndoStop();
        }
    });
    CoreEditingCommands.Tab = registerEditorCommand(new class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'tab',
                precondition: EditorContextKeys.writable,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EditorContextKeys.tabDoesNotMoveFocus),
                    primary: 2 /* KeyCode.Tab */
                }
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, TypeOperations.tab(viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map(s => s.modelState.selection)));
            editor.pushUndoStop();
        }
    });
    CoreEditingCommands.DeleteLeft = registerEditorCommand(new class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'deleteLeft',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 1 /* KeyCode.Backspace */,
                    secondary: [1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */],
                    mac: { primary: 1 /* KeyCode.Backspace */, secondary: [1024 /* KeyMod.Shift */ | 1 /* KeyCode.Backspace */, 256 /* KeyMod.WinCtrl */ | 38 /* KeyCode.KeyH */, 256 /* KeyMod.WinCtrl */ | 1 /* KeyCode.Backspace */] }
                }
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            const [shouldPushStackElementBefore, commands] = DeleteOperations.deleteLeft(viewModel.getPrevEditOperationType(), viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map(s => s.modelState.selection), viewModel.getCursorAutoClosedCharacters());
            if (shouldPushStackElementBefore) {
                editor.pushUndoStop();
            }
            editor.executeCommands(this.id, commands);
            viewModel.setPrevEditOperationType(2 /* EditOperationType.DeletingLeft */);
        }
    });
    CoreEditingCommands.DeleteRight = registerEditorCommand(new class extends CoreEditingCommand {
        constructor() {
            super({
                id: 'deleteRight',
                precondition: undefined,
                kbOpts: {
                    weight: CORE_WEIGHT,
                    kbExpr: EditorContextKeys.textInputFocus,
                    primary: 20 /* KeyCode.Delete */,
                    mac: { primary: 20 /* KeyCode.Delete */, secondary: [256 /* KeyMod.WinCtrl */ | 34 /* KeyCode.KeyD */, 256 /* KeyMod.WinCtrl */ | 20 /* KeyCode.Delete */] }
                }
            });
        }
        runCoreEditingCommand(editor, viewModel, args) {
            const [shouldPushStackElementBefore, commands] = DeleteOperations.deleteRight(viewModel.getPrevEditOperationType(), viewModel.cursorConfig, viewModel.model, viewModel.getCursorStates().map(s => s.modelState.selection));
            if (shouldPushStackElementBefore) {
                editor.pushUndoStop();
            }
            editor.executeCommands(this.id, commands);
            viewModel.setPrevEditOperationType(3 /* EditOperationType.DeletingRight */);
        }
    });
    CoreEditingCommands.Undo = new class extends EditorOrNativeTextInputCommand {
        constructor() {
            super(UndoCommand);
        }
        runDOMCommand(activeElement) {
            activeElement.ownerDocument.execCommand('undo');
        }
        runEditorCommand(accessor, editor, args) {
            if (!editor.hasModel() || editor.getOption(96 /* EditorOption.readOnly */) === true) {
                return;
            }
            return editor.getModel().undo();
        }
    }();
    CoreEditingCommands.Redo = new class extends EditorOrNativeTextInputCommand {
        constructor() {
            super(RedoCommand);
        }
        runDOMCommand(activeElement) {
            activeElement.ownerDocument.execCommand('redo');
        }
        runEditorCommand(accessor, editor, args) {
            if (!editor.hasModel() || editor.getOption(96 /* EditorOption.readOnly */) === true) {
                return;
            }
            return editor.getModel().redo();
        }
    }();
})(CoreEditingCommands || (CoreEditingCommands = {}));
/**
 * A command that will invoke a command on the focused editor.
 */
class EditorHandlerCommand extends Command {
    constructor(id, handlerId, metadata) {
        super({
            id: id,
            precondition: undefined,
            metadata
        });
        this._handlerId = handlerId;
    }
    runCommand(accessor, args) {
        const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!editor) {
            return;
        }
        editor.trigger('keyboard', this._handlerId, args);
    }
}
function registerOverwritableCommand(handlerId, metadata) {
    registerCommand(new EditorHandlerCommand('default:' + handlerId, handlerId));
    registerCommand(new EditorHandlerCommand(handlerId, handlerId, metadata));
}
registerOverwritableCommand("type" /* Handler.Type */, {
    description: `Type`,
    args: [{
            name: 'args',
            schema: {
                'type': 'object',
                'required': ['text'],
                'properties': {
                    'text': {
                        'type': 'string'
                    }
                },
            }
        }]
});
registerOverwritableCommand("replacePreviousChar" /* Handler.ReplacePreviousChar */);
registerOverwritableCommand("compositionType" /* Handler.CompositionType */);
registerOverwritableCommand("compositionStart" /* Handler.CompositionStart */);
registerOverwritableCommand("compositionEnd" /* Handler.CompositionEnd */);
registerOverwritableCommand("paste" /* Handler.Paste */);
registerOverwritableCommand("cut" /* Handler.Cut */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvcmVDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQztBQUNwQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFMUQsT0FBTyxLQUFLLEtBQUssTUFBTSw0QkFBNEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQW1CLHFCQUFxQixFQUFnQixXQUFXLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakssT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBdUIsTUFBTSwyQ0FBMkMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsV0FBVyxFQUE0RCxNQUFNLDJCQUEyQixDQUFDO0FBQ2xILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxVQUFVLElBQUksV0FBVyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzFFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFaEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHbkUsT0FBTyxFQUFFLGNBQWMs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