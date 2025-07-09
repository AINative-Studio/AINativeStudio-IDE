/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { MoveCaretCommand } from './moveCaretCommand.js';
import * as nls from '../../../../nls.js';
class MoveCaretAction extends EditorAction {
    constructor(left, opts) {
        super(opts);
        this.left = left;
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const commands = [];
        const selections = editor.getSelections();
        for (const selection of selections) {
            commands.push(new MoveCaretCommand(selection, this.left));
        }
        editor.pushUndoStop();
        editor.executeCommands(this.id, commands);
        editor.pushUndoStop();
    }
}
class MoveCaretLeftAction extends MoveCaretAction {
    constructor() {
        super(true, {
            id: 'editor.action.moveCarretLeftAction',
            label: nls.localize2('caret.moveLeft', "Move Selected Text Left"),
            precondition: EditorContextKeys.writable
        });
    }
}
class MoveCaretRightAction extends MoveCaretAction {
    constructor() {
        super(false, {
            id: 'editor.action.moveCarretRightAction',
            label: nls.localize2('caret.moveRight', "Move Selected Text Right"),
            precondition: EditorContextKeys.writable
        });
    }
}
registerEditorAction(MoveCaretLeftAction);
registerEditorAction(MoveCaretRightAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FyZXRPcGVyYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NhcmV0T3BlcmF0aW9ucy9icm93c2VyL2NhcmV0T3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFrQixvQkFBb0IsRUFBb0IsTUFBTSxzQ0FBc0MsQ0FBQztBQUU1SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE1BQU0sZUFBZ0IsU0FBUSxZQUFZO0lBSXpDLFlBQVksSUFBYSxFQUFFLElBQW9CO1FBQzlDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVaLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFTSxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUM7UUFDaEMsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRTFDLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDdkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxtQkFBb0IsU0FBUSxlQUFlO0lBQ2hEO1FBQ0MsS0FBSyxDQUFDLElBQUksRUFBRTtZQUNYLEVBQUUsRUFBRSxvQ0FBb0M7WUFDeEMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUseUJBQXlCLENBQUM7WUFDakUsWUFBWSxFQUFFLGlCQUFpQixDQUFDLFFBQVE7U0FDeEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBRUQsTUFBTSxvQkFBcUIsU0FBUSxlQUFlO0lBQ2pEO1FBQ0MsS0FBSyxDQUFDLEtBQUssRUFBRTtZQUNaLEVBQUUsRUFBRSxxQ0FBcUM7WUFDekMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsMEJBQTBCLENBQUM7WUFDbkUsWUFBWSxFQUFFLGlCQUFpQixDQUFDLFFBQVE7U0FDeEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEO0FBRUQsb0JBQW9CLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUMxQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDIn0=