/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import './dnd.css';
import { registerEditorContribution } from '../../../browser/editorExtensions.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { DragAndDropCommand } from './dragAndDropCommand.js';
function hasTriggerModifier(e) {
    if (isMacintosh) {
        return e.altKey;
    }
    else {
        return e.ctrlKey;
    }
}
export class DragAndDropController extends Disposable {
    static { this.ID = 'editor.contrib.dragAndDrop'; }
    static { this.TRIGGER_KEY_VALUE = isMacintosh ? 6 /* KeyCode.Alt */ : 5 /* KeyCode.Ctrl */; }
    static get(editor) {
        return editor.getContribution(DragAndDropController.ID);
    }
    constructor(editor) {
        super();
        this._editor = editor;
        this._dndDecorationIds = this._editor.createDecorationsCollection();
        this._register(this._editor.onMouseDown((e) => this._onEditorMouseDown(e)));
        this._register(this._editor.onMouseUp((e) => this._onEditorMouseUp(e)));
        this._register(this._editor.onMouseDrag((e) => this._onEditorMouseDrag(e)));
        this._register(this._editor.onMouseDrop((e) => this._onEditorMouseDrop(e)));
        this._register(this._editor.onMouseDropCanceled(() => this._onEditorMouseDropCanceled()));
        this._register(this._editor.onKeyDown((e) => this.onEditorKeyDown(e)));
        this._register(this._editor.onKeyUp((e) => this.onEditorKeyUp(e)));
        this._register(this._editor.onDidBlurEditorWidget(() => this.onEditorBlur()));
        this._register(this._editor.onDidBlurEditorText(() => this.onEditorBlur()));
        this._mouseDown = false;
        this._modifierPressed = false;
        this._dragSelection = null;
    }
    onEditorBlur() {
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
        this._modifierPressed = false;
    }
    onEditorKeyDown(e) {
        if (!this._editor.getOption(35 /* EditorOption.dragAndDrop */) || this._editor.getOption(22 /* EditorOption.columnSelection */)) {
            return;
        }
        if (hasTriggerModifier(e)) {
            this._modifierPressed = true;
        }
        if (this._mouseDown && hasTriggerModifier(e)) {
            this._editor.updateOptions({
                mouseStyle: 'copy'
            });
        }
    }
    onEditorKeyUp(e) {
        if (!this._editor.getOption(35 /* EditorOption.dragAndDrop */) || this._editor.getOption(22 /* EditorOption.columnSelection */)) {
            return;
        }
        if (hasTriggerModifier(e)) {
            this._modifierPressed = false;
        }
        if (this._mouseDown && e.keyCode === DragAndDropController.TRIGGER_KEY_VALUE) {
            this._editor.updateOptions({
                mouseStyle: 'default'
            });
        }
    }
    _onEditorMouseDown(mouseEvent) {
        this._mouseDown = true;
    }
    _onEditorMouseUp(mouseEvent) {
        this._mouseDown = false;
        // Whenever users release the mouse, the drag and drop operation should finish and the cursor should revert to text.
        this._editor.updateOptions({
            mouseStyle: 'text'
        });
    }
    _onEditorMouseDrag(mouseEvent) {
        const target = mouseEvent.target;
        if (this._dragSelection === null) {
            const selections = this._editor.getSelections() || [];
            const possibleSelections = selections.filter(selection => target.position && selection.containsPosition(target.position));
            if (possibleSelections.length === 1) {
                this._dragSelection = possibleSelections[0];
            }
            else {
                return;
            }
        }
        if (hasTriggerModifier(mouseEvent.event)) {
            this._editor.updateOptions({
                mouseStyle: 'copy'
            });
        }
        else {
            this._editor.updateOptions({
                mouseStyle: 'default'
            });
        }
        if (target.position) {
            if (this._dragSelection.containsPosition(target.position)) {
                this._removeDecoration();
            }
            else {
                this.showAt(target.position);
            }
        }
    }
    _onEditorMouseDropCanceled() {
        this._editor.updateOptions({
            mouseStyle: 'text'
        });
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
    }
    _onEditorMouseDrop(mouseEvent) {
        if (mouseEvent.target && (this._hitContent(mouseEvent.target) || this._hitMargin(mouseEvent.target)) && mouseEvent.target.position) {
            const newCursorPosition = new Position(mouseEvent.target.position.lineNumber, mouseEvent.target.position.column);
            if (this._dragSelection === null) {
                let newSelections = null;
                if (mouseEvent.event.shiftKey) {
                    const primarySelection = this._editor.getSelection();
                    if (primarySelection) {
                        const { selectionStartLineNumber, selectionStartColumn } = primarySelection;
                        newSelections = [new Selection(selectionStartLineNumber, selectionStartColumn, newCursorPosition.lineNumber, newCursorPosition.column)];
                    }
                }
                else {
                    newSelections = (this._editor.getSelections() || []).map(selection => {
                        if (selection.containsPosition(newCursorPosition)) {
                            return new Selection(newCursorPosition.lineNumber, newCursorPosition.column, newCursorPosition.lineNumber, newCursorPosition.column);
                        }
                        else {
                            return selection;
                        }
                    });
                }
                // Use `mouse` as the source instead of `api` and setting the reason to explicit (to behave like any other mouse operation).
                this._editor.setSelections(newSelections || [], 'mouse', 3 /* CursorChangeReason.Explicit */);
            }
            else if (!this._dragSelection.containsPosition(newCursorPosition) ||
                ((hasTriggerModifier(mouseEvent.event) ||
                    this._modifierPressed) && (this._dragSelection.getEndPosition().equals(newCursorPosition) || this._dragSelection.getStartPosition().equals(newCursorPosition)) // we allow users to paste content beside the selection
                )) {
                this._editor.pushUndoStop();
                this._editor.executeCommand(DragAndDropController.ID, new DragAndDropCommand(this._dragSelection, newCursorPosition, hasTriggerModifier(mouseEvent.event) || this._modifierPressed));
                this._editor.pushUndoStop();
            }
        }
        this._editor.updateOptions({
            mouseStyle: 'text'
        });
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
    }
    static { this._DECORATION_OPTIONS = ModelDecorationOptions.register({
        description: 'dnd-target',
        className: 'dnd-target'
    }); }
    showAt(position) {
        this._dndDecorationIds.set([{
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
                options: DragAndDropController._DECORATION_OPTIONS
            }]);
        this._editor.revealPosition(position, 1 /* ScrollType.Immediate */);
    }
    _removeDecoration() {
        this._dndDecorationIds.clear();
    }
    _hitContent(target) {
        return target.type === 6 /* MouseTargetType.CONTENT_TEXT */ ||
            target.type === 7 /* MouseTargetType.CONTENT_EMPTY */;
    }
    _hitMargin(target) {
        return target.type === 2 /* MouseTargetType.GUTTER_GLYPH_MARGIN */ ||
            target.type === 3 /* MouseTargetType.GUTTER_LINE_NUMBERS */ ||
            target.type === 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */;
    }
    dispose() {
        this._removeDecoration();
        this._dragSelection = null;
        this._mouseDown = false;
        this._modifierPressed = false;
        super.dispose();
    }
}
registerEditorContribution(DragAndDropController.ID, DragAndDropController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2RuZC9icm93c2VyL2RuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xFLE9BQU8sV0FBVyxDQUFDO0FBRW5CLE9BQU8sRUFBbUMsMEJBQTBCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUluSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUU3RCxTQUFTLGtCQUFrQixDQUFDLENBQStCO0lBQzFELElBQUksV0FBVyxFQUFFLENBQUM7UUFDakIsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ2pCLENBQUM7U0FBTSxDQUFDO1FBQ1AsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ2xCLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7YUFFN0IsT0FBRSxHQUFHLDRCQUE0QixDQUFDO2FBT3pDLHNCQUFpQixHQUFHLFdBQVcsQ0FBQyxDQUFDLHFCQUFhLENBQUMscUJBQWEsQ0FBQztJQUU3RSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQzdCLE9BQU8sTUFBTSxDQUFDLGVBQWUsQ0FBd0IscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEYsQ0FBQztJQUVELFlBQVksTUFBbUI7UUFDOUIsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUN0QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ3BFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9GLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFvQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9GLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUEyQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQWlCLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFpQixFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQzlCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFTyxZQUFZO1FBQ25CLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzNCLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7SUFDL0IsQ0FBQztJQUVPLGVBQWUsQ0FBQyxDQUFpQjtRQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLG1DQUEwQixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyx1Q0FBOEIsRUFBRSxDQUFDO1lBQy9HLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFDOUIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzlDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO2dCQUMxQixVQUFVLEVBQUUsTUFBTTthQUNsQixDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVPLGFBQWEsQ0FBQyxDQUFpQjtRQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLG1DQUEwQixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyx1Q0FBOEIsRUFBRSxDQUFDO1lBQy9HLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDL0IsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLHFCQUFxQixDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDOUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7Z0JBQzFCLFVBQVUsRUFBRSxTQUFTO2FBQ3JCLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsVUFBNkI7UUFDdkQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7SUFDeEIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFVBQTZCO1FBQ3JELElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLG9IQUFvSDtRQUNwSCxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztZQUMxQixVQUFVLEVBQUUsTUFBTTtTQUNsQixDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sa0JBQWtCLENBQUMsVUFBNkI7UUFDdkQsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztRQUVqQyxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUM7WUFDdEQsTUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDMUgsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxjQUFjLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU87WUFDUixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksa0JBQWtCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7Z0JBQzFCLFVBQVUsRUFBRSxNQUFNO2FBQ2xCLENBQUMsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7Z0JBQzFCLFVBQVUsRUFBRSxTQUFTO2FBQ3JCLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzNELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTywwQkFBMEI7UUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7WUFDMUIsVUFBVSxFQUFFLE1BQU07U0FDbEIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7SUFDekIsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFVBQW9DO1FBQzlELElBQUksVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwSSxNQUFNLGlCQUFpQixHQUFHLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVqSCxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ2xDLElBQUksYUFBYSxHQUF1QixJQUFJLENBQUM7Z0JBQzdDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDL0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNyRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7d0JBQ3RCLE1BQU0sRUFBRSx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxHQUFHLGdCQUFnQixDQUFDO3dCQUM1RSxhQUFhLEdBQUcsQ0FBQyxJQUFJLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDekksQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsYUFBYSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7d0JBQ3BFLElBQUksU0FBUyxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQzs0QkFDbkQsT0FBTyxJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQzt3QkFDdEksQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLE9BQU8sU0FBUyxDQUFDO3dCQUNsQixDQUFDO29CQUNGLENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUM7Z0JBQ0QsNEhBQTRIO2dCQUN6RyxJQUFJLENBQUMsT0FBUSxDQUFDLGFBQWEsQ0FBQyxhQUFhLElBQUksRUFBRSxFQUFFLE9BQU8sc0NBQThCLENBQUM7WUFDM0csQ0FBQztpQkFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDbEUsQ0FDQyxDQUNDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7b0JBQ3BDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDckIsSUFBSSxDQUNKLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUNsSSxDQUFDLHVEQUF1RDtpQkFDekQsRUFBRSxDQUFDO2dCQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JMLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDN0IsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztZQUMxQixVQUFVLEVBQUUsTUFBTTtTQUNsQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztJQUN6QixDQUFDO2FBRXVCLHdCQUFtQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQztRQUM3RSxXQUFXLEVBQUUsWUFBWTtRQUN6QixTQUFTLEVBQUUsWUFBWTtLQUN2QixDQUFDLENBQUM7SUFFSSxNQUFNLENBQUMsUUFBa0I7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMzQixLQUFLLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQkFDNUYsT0FBTyxFQUFFLHFCQUFxQixDQUFDLG1CQUFtQjthQUNsRCxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsK0JBQXVCLENBQUM7SUFDN0QsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVPLFdBQVcsQ0FBQyxNQUFvQjtRQUN2QyxPQUFPLE1BQU0sQ0FBQyxJQUFJLHlDQUFpQztZQUNsRCxNQUFNLENBQUMsSUFBSSwwQ0FBa0MsQ0FBQztJQUNoRCxDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQW9CO1FBQ3RDLE9BQU8sTUFBTSxDQUFDLElBQUksZ0RBQXdDO1lBQ3pELE1BQU0sQ0FBQyxJQUFJLGdEQUF3QztZQUNuRCxNQUFNLENBQUMsSUFBSSxvREFBNEMsQ0FBQztJQUMxRCxDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQzlCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUNqQixDQUFDOztBQUdGLDBCQUEwQixDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFBRSxxQkFBcUIsaUVBQXlELENBQUMifQ==