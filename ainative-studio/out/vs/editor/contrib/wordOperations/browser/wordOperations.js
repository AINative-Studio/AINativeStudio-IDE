/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand } from '../../../browser/editorExtensions.js';
import { ReplaceCommand } from '../../../common/commands/replaceCommand.js';
import { EditorOptions } from '../../../common/config/editorOptions.js';
import { CursorState } from '../../../common/cursorCommon.js';
import { WordOperations } from '../../../common/cursor/cursorWordOperations.js';
import { getMapForWordSeparators } from '../../../common/core/wordCharacterClassifier.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import * as nls from '../../../../nls.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IsWindowsContext } from '../../../../platform/contextkey/common/contextkeys.js';
export class MoveWordCommand extends EditorCommand {
    constructor(opts) {
        super(opts);
        this._inSelectionMode = opts.inSelectionMode;
        this._wordNavigationType = opts.wordNavigationType;
    }
    runEditorCommand(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const wordSeparators = getMapForWordSeparators(editor.getOption(136 /* EditorOption.wordSeparators */), editor.getOption(135 /* EditorOption.wordSegmenterLocales */));
        const model = editor.getModel();
        const selections = editor.getSelections();
        const hasMulticursor = selections.length > 1;
        const result = selections.map((sel) => {
            const inPosition = new Position(sel.positionLineNumber, sel.positionColumn);
            const outPosition = this._move(wordSeparators, model, inPosition, this._wordNavigationType, hasMulticursor);
            return this._moveTo(sel, outPosition, this._inSelectionMode);
        });
        model.pushStackElement();
        editor._getViewModel().setCursorStates('moveWordCommand', 3 /* CursorChangeReason.Explicit */, result.map(r => CursorState.fromModelSelection(r)));
        if (result.length === 1) {
            const pos = new Position(result[0].positionLineNumber, result[0].positionColumn);
            editor.revealPosition(pos, 0 /* ScrollType.Smooth */);
        }
    }
    _moveTo(from, to, inSelectionMode) {
        if (inSelectionMode) {
            // move just position
            return new Selection(from.selectionStartLineNumber, from.selectionStartColumn, to.lineNumber, to.column);
        }
        else {
            // move everything
            return new Selection(to.lineNumber, to.column, to.lineNumber, to.column);
        }
    }
}
export class WordLeftCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordOperations.moveWordLeft(wordSeparators, model, position, wordNavigationType, hasMulticursor);
    }
}
export class WordRightCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordOperations.moveWordRight(wordSeparators, model, position, wordNavigationType);
    }
}
export class CursorWordStartLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartLeft',
            precondition: undefined
        });
    }
}
export class CursorWordEndLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndLeft',
            precondition: undefined
        });
    }
}
export class CursorWordLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 1 /* WordNavigationType.WordStartFast */,
            id: 'cursorWordLeft',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 15 /* KeyCode.LeftArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
export class CursorWordStartLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartLeftSelect',
            precondition: undefined
        });
    }
}
export class CursorWordEndLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndLeftSelect',
            precondition: undefined
        });
    }
}
export class CursorWordLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 1 /* WordNavigationType.WordStartFast */,
            id: 'cursorWordLeftSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
// Accessibility navigation commands should only be enabled on windows since they are tuned to what NVDA expects
export class CursorWordAccessibilityLeft extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityLeft',
            precondition: undefined
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class CursorWordAccessibilityLeftSelect extends WordLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityLeftSelect',
            precondition: undefined
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class CursorWordStartRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartRight',
            precondition: undefined
        });
    }
}
export class CursorWordEndRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndRight',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
export class CursorWordRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordRight',
            precondition: undefined
        });
    }
}
export class CursorWordStartRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordStartRightSelect',
            precondition: undefined
        });
    }
}
export class CursorWordEndRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordEndRightSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: ContextKeyExpr.and(EditorContextKeys.textInputFocus, ContextKeyExpr.and(CONTEXT_ACCESSIBILITY_MODE_ENABLED, IsWindowsContext)?.negate()),
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */,
                mac: { primary: 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
export class CursorWordRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordRightSelect',
            precondition: undefined
        });
    }
}
export class CursorWordAccessibilityRight extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityRight',
            precondition: undefined
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class CursorWordAccessibilityRightSelect extends WordRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 3 /* WordNavigationType.WordAccessibility */,
            id: 'cursorWordAccessibilityRightSelect',
            precondition: undefined
        });
    }
    _move(wordCharacterClassifier, model, position, wordNavigationType, hasMulticursor) {
        return super._move(getMapForWordSeparators(EditorOptions.wordSeparators.defaultValue, wordCharacterClassifier.intlSegmenterLocales), model, position, wordNavigationType, hasMulticursor);
    }
}
export class DeleteWordCommand extends EditorCommand {
    constructor(opts) {
        super(opts);
        this._whitespaceHeuristics = opts.whitespaceHeuristics;
        this._wordNavigationType = opts.wordNavigationType;
    }
    runEditorCommand(accessor, editor, args) {
        const languageConfigurationService = accessor.get(ILanguageConfigurationService);
        if (!editor.hasModel()) {
            return;
        }
        const wordSeparators = getMapForWordSeparators(editor.getOption(136 /* EditorOption.wordSeparators */), editor.getOption(135 /* EditorOption.wordSegmenterLocales */));
        const model = editor.getModel();
        const selections = editor.getSelections();
        const autoClosingBrackets = editor.getOption(6 /* EditorOption.autoClosingBrackets */);
        const autoClosingQuotes = editor.getOption(11 /* EditorOption.autoClosingQuotes */);
        const autoClosingPairs = languageConfigurationService.getLanguageConfiguration(model.getLanguageId()).getAutoClosingPairs();
        const viewModel = editor._getViewModel();
        const commands = selections.map((sel) => {
            const deleteRange = this._delete({
                wordSeparators,
                model,
                selection: sel,
                whitespaceHeuristics: this._whitespaceHeuristics,
                autoClosingDelete: editor.getOption(9 /* EditorOption.autoClosingDelete */),
                autoClosingBrackets,
                autoClosingQuotes,
                autoClosingPairs,
                autoClosedCharacters: viewModel.getCursorAutoClosedCharacters(),
            }, this._wordNavigationType);
            return new ReplaceCommand(deleteRange, '');
        });
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
export class DeleteWordLeftCommand extends DeleteWordCommand {
    _delete(ctx, wordNavigationType) {
        const r = WordOperations.deleteWordLeft(ctx, wordNavigationType);
        if (r) {
            return r;
        }
        return new Range(1, 1, 1, 1);
    }
}
export class DeleteWordRightCommand extends DeleteWordCommand {
    _delete(ctx, wordNavigationType) {
        const r = WordOperations.deleteWordRight(ctx, wordNavigationType);
        if (r) {
            return r;
        }
        const lineCount = ctx.model.getLineCount();
        const maxColumn = ctx.model.getLineMaxColumn(lineCount);
        return new Range(lineCount, maxColumn, lineCount, maxColumn);
    }
}
export class DeleteWordStartLeft extends DeleteWordLeftCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordStartLeft',
            precondition: EditorContextKeys.writable
        });
    }
}
export class DeleteWordEndLeft extends DeleteWordLeftCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordEndLeft',
            precondition: EditorContextKeys.writable
        });
    }
}
export class DeleteWordLeft extends DeleteWordLeftCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordLeft',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                mac: { primary: 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
export class DeleteWordStartRight extends DeleteWordRightCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordStartRight',
            precondition: EditorContextKeys.writable
        });
    }
}
export class DeleteWordEndRight extends DeleteWordRightCommand {
    constructor() {
        super({
            whitespaceHeuristics: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordEndRight',
            precondition: EditorContextKeys.writable
        });
    }
}
export class DeleteWordRight extends DeleteWordRightCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordRight',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 20 /* KeyCode.Delete */,
                mac: { primary: 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
export class DeleteInsideWord extends EditorAction {
    constructor() {
        super({
            id: 'deleteInsideWord',
            precondition: EditorContextKeys.writable,
            label: nls.localize2('deleteInsideWord', "Delete Word"),
        });
    }
    run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const wordSeparators = getMapForWordSeparators(editor.getOption(136 /* EditorOption.wordSeparators */), editor.getOption(135 /* EditorOption.wordSegmenterLocales */));
        const model = editor.getModel();
        const selections = editor.getSelections();
        const commands = selections.map((sel) => {
            const deleteRange = WordOperations.deleteInsideWord(wordSeparators, model, sel);
            return new ReplaceCommand(deleteRange, '');
        });
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
registerEditorCommand(new CursorWordStartLeft());
registerEditorCommand(new CursorWordEndLeft());
registerEditorCommand(new CursorWordLeft());
registerEditorCommand(new CursorWordStartLeftSelect());
registerEditorCommand(new CursorWordEndLeftSelect());
registerEditorCommand(new CursorWordLeftSelect());
registerEditorCommand(new CursorWordStartRight());
registerEditorCommand(new CursorWordEndRight());
registerEditorCommand(new CursorWordRight());
registerEditorCommand(new CursorWordStartRightSelect());
registerEditorCommand(new CursorWordEndRightSelect());
registerEditorCommand(new CursorWordRightSelect());
registerEditorCommand(new CursorWordAccessibilityLeft());
registerEditorCommand(new CursorWordAccessibilityLeftSelect());
registerEditorCommand(new CursorWordAccessibilityRight());
registerEditorCommand(new CursorWordAccessibilityRightSelect());
registerEditorCommand(new DeleteWordStartLeft());
registerEditorCommand(new DeleteWordEndLeft());
registerEditorCommand(new DeleteWordLeft());
registerEditorCommand(new DeleteWordStartRight());
registerEditorCommand(new DeleteWordEndRight());
registerEditorCommand(new DeleteWordRight());
registerEditorAction(DeleteInsideWord);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvd29yZE9wZXJhdGlvbnMvYnJvd3Nlci93b3JkT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBbUIsb0JBQW9CLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFDbkssT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzVFLE9BQU8sRUFBZ0IsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRTlELE9BQU8sRUFBeUMsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDdkgsT0FBTyxFQUFFLHVCQUF1QixFQUEyQixNQUFNLGlEQUFpRCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzNHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxnQkFBZ0IsRUFB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