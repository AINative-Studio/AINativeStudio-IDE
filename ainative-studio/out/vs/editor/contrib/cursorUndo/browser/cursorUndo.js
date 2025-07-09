/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
class CursorState {
    constructor(selections) {
        this.selections = selections;
    }
    equals(other) {
        const thisLen = this.selections.length;
        const otherLen = other.selections.length;
        if (thisLen !== otherLen) {
            return false;
        }
        for (let i = 0; i < thisLen; i++) {
            if (!this.selections[i].equalsSelection(other.selections[i])) {
                return false;
            }
        }
        return true;
    }
}
class StackElement {
    constructor(cursorState, scrollTop, scrollLeft) {
        this.cursorState = cursorState;
        this.scrollTop = scrollTop;
        this.scrollLeft = scrollLeft;
    }
}
export class CursorUndoRedoController extends Disposable {
    static { this.ID = 'editor.contrib.cursorUndoRedoController'; }
    static get(editor) {
        return editor.getContribution(CursorUndoRedoController.ID);
    }
    constructor(editor) {
        super();
        this._editor = editor;
        this._isCursorUndoRedo = false;
        this._undoStack = [];
        this._redoStack = [];
        this._register(editor.onDidChangeModel((e) => {
            this._undoStack = [];
            this._redoStack = [];
        }));
        this._register(editor.onDidChangeModelContent((e) => {
            this._undoStack = [];
            this._redoStack = [];
        }));
        this._register(editor.onDidChangeCursorSelection((e) => {
            if (this._isCursorUndoRedo) {
                return;
            }
            if (!e.oldSelections) {
                return;
            }
            if (e.oldModelVersionId !== e.modelVersionId) {
                return;
            }
            const prevState = new CursorState(e.oldSelections);
            const isEqualToLastUndoStack = (this._undoStack.length > 0 && this._undoStack[this._undoStack.length - 1].cursorState.equals(prevState));
            if (!isEqualToLastUndoStack) {
                this._undoStack.push(new StackElement(prevState, editor.getScrollTop(), editor.getScrollLeft()));
                this._redoStack = [];
                if (this._undoStack.length > 50) {
                    // keep the cursor undo stack bounded
                    this._undoStack.shift();
                }
            }
        }));
    }
    cursorUndo() {
        if (!this._editor.hasModel() || this._undoStack.length === 0) {
            return;
        }
        this._redoStack.push(new StackElement(new CursorState(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
        this._applyState(this._undoStack.pop());
    }
    cursorRedo() {
        if (!this._editor.hasModel() || this._redoStack.length === 0) {
            return;
        }
        this._undoStack.push(new StackElement(new CursorState(this._editor.getSelections()), this._editor.getScrollTop(), this._editor.getScrollLeft()));
        this._applyState(this._redoStack.pop());
    }
    _applyState(stackElement) {
        this._isCursorUndoRedo = true;
        this._editor.setSelections(stackElement.cursorState.selections);
        this._editor.setScrollPosition({
            scrollTop: stackElement.scrollTop,
            scrollLeft: stackElement.scrollLeft
        });
        this._isCursorUndoRedo = false;
    }
}
export class CursorUndo extends EditorAction {
    constructor() {
        super({
            id: 'cursorUndo',
            label: nls.localize2('cursor.undo', "Cursor Undo"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 51 /* KeyCode.KeyU */,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor, args) {
        CursorUndoRedoController.get(editor)?.cursorUndo();
    }
}
export class CursorRedo extends EditorAction {
    constructor() {
        super({
            id: 'cursorRedo',
            label: nls.localize2('cursor.redo', "Cursor Redo"),
            precondition: undefined
        });
    }
    run(accessor, editor, args) {
        CursorUndoRedoController.get(editor)?.cursorRedo();
    }
}
registerEditorContribution(CursorUndoRedoController.ID, CursorUndoRedoController, 0 /* EditorContributionInstantiation.Eager */); // eager because it needs to listen to record cursor state ASAP
registerEditorAction(CursorUndo);
registerEditorAction(CursorRedo);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yVW5kby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jdXJzb3JVbmRvL2Jyb3dzZXIvY3Vyc29yVW5kby50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFbEUsT0FBTyxFQUFFLFlBQVksRUFBbUMsb0JBQW9CLEVBQUUsMEJBQTBCLEVBQW9CLE1BQU0sc0NBQXNDLENBQUM7QUFHekssT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUcxQyxNQUFNLFdBQVc7SUFHaEIsWUFBWSxVQUFnQztRQUMzQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUM5QixDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQWtCO1FBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1FBQ3pDLElBQUksT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlELE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNG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