/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { ReplaceCommand } from '../../../common/commands/replaceCommand.js';
import { MoveOperations } from '../../../common/cursor/cursorMoveOperations.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
class TransposeLettersAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.transposeLetters',
            label: nls.localize2('transposeLetters.label', "Transpose Letters"),
            precondition: EditorContextKeys.writable,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                mac: {
                    primary: 256 /* KeyMod.WinCtrl */ | 50 /* KeyCode.KeyT */
                },
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const model = editor.getModel();
        const commands = [];
        const selections = editor.getSelections();
        for (const selection of selections) {
            if (!selection.isEmpty()) {
                continue;
            }
            const lineNumber = selection.startLineNumber;
            const column = selection.startColumn;
            const lastColumn = model.getLineMaxColumn(lineNumber);
            if (lineNumber === 1 && (column === 1 || (column === 2 && lastColumn === 2))) {
                // at beginning of file, nothing to do
                continue;
            }
            // handle special case: when at end of line, transpose left two chars
            // otherwise, transpose left and right chars
            const endPosition = (column === lastColumn) ?
                selection.getPosition() :
                MoveOperations.rightPosition(model, selection.getPosition().lineNumber, selection.getPosition().column);
            const middlePosition = MoveOperations.leftPosition(model, endPosition);
            const beginPosition = MoveOperations.leftPosition(model, middlePosition);
            const leftChar = model.getValueInRange(Range.fromPositions(beginPosition, middlePosition));
            const rightChar = model.getValueInRange(Range.fromPositions(middlePosition, endPosition));
            const replaceRange = Range.fromPositions(beginPosition, endPosition);
            commands.push(new ReplaceCommand(replaceRange, rightChar + leftChar));
        }
        if (commands.length > 0) {
            editor.pushUndoStop();
            editor.executeCommands(this.id, commands);
            editor.pushUndoStop();
        }
    }
}
registerEditorAction(TransposeLettersAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNwb3NlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NhcmV0T3BlcmF0aW9ucy9icm93c2VyL3RyYW5zcG9zZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFHMUMsTUFBTSxzQkFBdUIsU0FBUSxZQUFZO0lBRWhEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGdDQUFnQztZQUNwQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsRUFBRSxtQkFBbUIsQ0FBQztZQUNuRSxZQUFZLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtZQUN4QyxNQUFNLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGlCQUFpQixDQUFDLGNBQWM7Z0JBQ3hDLE9BQU8sRUFBRSxDQUFDO2dCQUNWLEdBQUcsRUFBRTtvQkFDSixPQUFPLEVBQUUsZ0RBQTZCO2lCQUN0QztnQkFDRCxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTSxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEMsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUUxQyxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDMUIsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsZUFBZSxDQUFDO1lBQzdDLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUM7WUFFckMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXRELElBQUksVUFBVSxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFVBQVUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlFLHNDQUFzQztnQkFDdEMsU0FBUztZQUNWLENBQUM7WUFFRCxxRUFBcUU7WUFDckUsNENBQTRDO1lBQzVDLE1BQU0sV0FBVyxHQUFHLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQzVDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO2dCQUN6QixjQUFjLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxFQUFFLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUV6RyxNQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztZQUN2RSxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztZQUV6RSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDM0YsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBRTFGLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1lBQ3JFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxjQUFjLENBQUMsWUFBWSxFQUFFLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3RCLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDdkIsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELG9CQUFvQixDQUFDLHNCQUFzQixDQUFDLENBQUMifQ==