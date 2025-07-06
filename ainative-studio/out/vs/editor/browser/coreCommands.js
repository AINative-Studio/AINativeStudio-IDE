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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvY29yZUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sY0FBYyxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUxRCxPQUFPLEtBQUssS0FBSyxNQUFNLDRCQUE0QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBbUIscUJBQXFCLEVBQWdCLFdBQVcsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqSyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZUFBZSxFQUF1QixNQUFNLDJDQUEyQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxXQUFXLEVBQTRELE1BQU0sMkJBQTJCLENBQUM7QUFDbEgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFVBQVUsSUFBSSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDMUUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUVoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUduRSxPQUFPLEVBQUUsY0FBYyxF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