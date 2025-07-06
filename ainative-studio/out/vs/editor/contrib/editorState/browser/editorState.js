/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { EditorKeybindingCancellationTokenSource } from './keybindingCancellation.js';
export var CodeEditorStateFlag;
(function (CodeEditorStateFlag) {
    CodeEditorStateFlag[CodeEditorStateFlag["Value"] = 1] = "Value";
    CodeEditorStateFlag[CodeEditorStateFlag["Selection"] = 2] = "Selection";
    CodeEditorStateFlag[CodeEditorStateFlag["Position"] = 4] = "Position";
    CodeEditorStateFlag[CodeEditorStateFlag["Scroll"] = 8] = "Scroll";
})(CodeEditorStateFlag || (CodeEditorStateFlag = {}));
export class EditorState {
    constructor(editor, flags) {
        this.flags = flags;
        if ((this.flags & 1 /* CodeEditorStateFlag.Value */) !== 0) {
            const model = editor.getModel();
            this.modelVersionId = model ? strings.format('{0}#{1}', model.uri.toString(), model.getVersionId()) : null;
        }
        else {
            this.modelVersionId = null;
        }
        if ((this.flags & 4 /* CodeEditorStateFlag.Position */) !== 0) {
            this.position = editor.getPosition();
        }
        else {
            this.position = null;
        }
        if ((this.flags & 2 /* CodeEditorStateFlag.Selection */) !== 0) {
            this.selection = editor.getSelection();
        }
        else {
            this.selection = null;
        }
        if ((this.flags & 8 /* CodeEditorStateFlag.Scroll */) !== 0) {
            this.scrollLeft = editor.getScrollLeft();
            this.scrollTop = editor.getScrollTop();
        }
        else {
            this.scrollLeft = -1;
            this.scrollTop = -1;
        }
    }
    _equals(other) {
        if (!(other instanceof EditorState)) {
            return false;
        }
        const state = other;
        if (this.modelVersionId !== state.modelVersionId) {
            return false;
        }
        if (this.scrollLeft !== state.scrollLeft || this.scrollTop !== state.scrollTop) {
            return false;
        }
        if (!this.position && state.position || this.position && !state.position || this.position && state.position && !this.position.equals(state.position)) {
            return false;
        }
        if (!this.selection && state.selection || this.selection && !state.selection || this.selection && state.selection && !this.selection.equalsRange(state.selection)) {
            return false;
        }
        return true;
    }
    validate(editor) {
        return this._equals(new EditorState(editor, this.flags));
    }
}
/**
 * A cancellation token source that cancels when the editor changes as expressed
 * by the provided flags
 * @param range If provided, changes in position and selection within this range will not trigger cancellation
 */
export class EditorStateCancellationTokenSource extends EditorKeybindingCancellationTokenSource {
    constructor(editor, flags, range, parent) {
        super(editor, parent);
        this._listener = new DisposableStore();
        if (flags & 4 /* CodeEditorStateFlag.Position */) {
            this._listener.add(editor.onDidChangeCursorPosition(e => {
                if (!range || !Range.containsPosition(range, e.position)) {
                    this.cancel();
                }
            }));
        }
        if (flags & 2 /* CodeEditorStateFlag.Selection */) {
            this._listener.add(editor.onDidChangeCursorSelection(e => {
                if (!range || !Range.containsRange(range, e.selection)) {
                    this.cancel();
                }
            }));
        }
        if (flags & 8 /* CodeEditorStateFlag.Scroll */) {
            this._listener.add(editor.onDidScrollChange(_ => this.cancel()));
        }
        if (flags & 1 /* CodeEditorStateFlag.Value */) {
            this._listener.add(editor.onDidChangeModel(_ => this.cancel()));
            this._listener.add(editor.onDidChangeModelContent(_ => this.cancel()));
        }
    }
    dispose() {
        this._listener.dispose();
        super.dispose();
    }
}
/**
 * A cancellation token source that cancels when the provided model changes
 */
export class TextModelCancellationTokenSource extends CancellationTokenSource {
    constructor(model, parent) {
        super(parent);
        this._listener = model.onDidChangeContent(() => this.cancel());
    }
    dispose() {
        this._listener.dispose();
        super.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yU3RhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9lZGl0b3JTdGF0ZS9icm93c2VyL2VkaXRvclN0YXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUM7QUFHOUQsT0FBTyxFQUFFLEtBQUssRUFBVSxNQUFNLCtCQUErQixDQUFDO0FBQzlELE9BQU8sRUFBRSx1QkFBdUIsRUFBcUIsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFcEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdEYsTUFBTSxDQUFOLElBQWtCLG1CQUtqQjtBQUxELFdBQWtCLG1CQUFtQjtJQUNwQywrREFBUyxDQUFBO0lBQ1QsdUVBQWEsQ0FBQTtJQUNiLHFFQUFZLENBQUE7SUFDWixpRUFBVSxDQUFBO0FBQ1gsQ0FBQyxFQUxpQixtQkFBbUIsS0FBbkIsbUJBQW1CLFFBS3BDO0FBRUQsTUFBTSxPQUFPLFdBQVc7SUFVdkIsWUFBWSxNQUFtQixFQUFFLEtBQWE7UUFDN0MsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFFbkIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLG9DQUE0QixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDcEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FB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