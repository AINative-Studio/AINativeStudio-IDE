/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorCommand } from '../../../browser/editorExtensions.js';
import { WordPartOperations } from '../../../common/cursor/cursorWordOperations.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { DeleteWordCommand, MoveWordCommand } from '../../wordOperations/browser/wordOperations.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
export class DeleteWordPartLeft extends DeleteWordCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'deleteWordPartLeft',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    _delete(ctx, wordNavigationType) {
        const r = WordPartOperations.deleteWordPartLeft(ctx);
        if (r) {
            return r;
        }
        return new Range(1, 1, 1, 1);
    }
}
export class DeleteWordPartRight extends DeleteWordCommand {
    constructor() {
        super({
            whitespaceHeuristics: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'deleteWordPartRight',
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 20 /* KeyCode.Delete */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    _delete(ctx, wordNavigationType) {
        const r = WordPartOperations.deleteWordPartRight(ctx);
        if (r) {
            return r;
        }
        const lineCount = ctx.model.getLineCount();
        const maxColumn = ctx.model.getLineMaxColumn(lineCount);
        return new Range(lineCount, maxColumn, lineCount, maxColumn);
    }
}
export class WordPartLeftCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordPartOperations.moveWordPartLeft(wordSeparators, model, position, hasMulticursor);
    }
}
export class CursorWordPartLeft extends WordPartLeftCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordPartLeft',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
// Register previous id for compatibility purposes
CommandsRegistry.registerCommandAlias('cursorWordPartStartLeft', 'cursorWordPartLeft');
export class CursorWordPartLeftSelect extends WordPartLeftCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 0 /* WordNavigationType.WordStart */,
            id: 'cursorWordPartLeftSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 15 /* KeyCode.LeftArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
// Register previous id for compatibility purposes
CommandsRegistry.registerCommandAlias('cursorWordPartStartLeftSelect', 'cursorWordPartLeftSelect');
export class WordPartRightCommand extends MoveWordCommand {
    _move(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        return WordPartOperations.moveWordPartRight(wordSeparators, model, position);
    }
}
export class CursorWordPartRight extends WordPartRightCommand {
    constructor() {
        super({
            inSelectionMode: false,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordPartRight',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
export class CursorWordPartRightSelect extends WordPartRightCommand {
    constructor() {
        super({
            inSelectionMode: true,
            wordNavigationType: 2 /* WordNavigationType.WordEnd */,
            id: 'cursorWordPartRightSelect',
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 17 /* KeyCode.RightArrow */ },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
}
registerEditorCommand(new DeleteWordPartLeft());
registerEditorCommand(new DeleteWordPartRight());
registerEditorCommand(new CursorWordPartLeft());
registerEditorCommand(new CursorWordPartLeftSelect());
registerEditorCommand(new CursorWordPartRight());
registerEditorCommand(new CursorWordPartRightSelect());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZFBhcnRPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3dvcmRQYXJ0T3BlcmF0aW9ucy9icm93c2VyL3dvcmRQYXJ0T3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM3RSxPQUFPLEVBQXlDLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFHM0gsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRXpFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUdwRixNQUFNLE9BQU8sa0JBQW1CLFNBQVEsaUJBQWlCO0lBQ3hEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQixrQkFBa0Isc0NBQThCO1lBQ2hELEVBQUUsRUFBRSxvQkFBb0I7WUFDeEIsWUFBWSxFQUFFLGlCQUFpQixDQUFDLFFBQVE7WUFDeEMsTUFBTSxFQUFFO2dCQUNQLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxjQUFjO2dCQUN4QyxPQUFPLEVBQUUsQ0FBQztnQkFDVixHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsK0NBQTJCLDRCQUFvQixFQUFFO2dCQUNqRSxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFUyxPQUFPLENBQUMsR0FBc0IsRUFBRSxrQkFBc0M7UUFDL0UsTUFBTSxDQUFDLEdBQUcs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