/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction } from '../../../browser/editorExtensions.js';
import { InsertFinalNewLineCommand } from './insertFinalNewLineCommand.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
export class InsertFinalNewLineAction extends EditorAction {
    static { this.ID = 'editor.action.insertFinalNewLine'; }
    constructor() {
        super({
            id: InsertFinalNewLineAction.ID,
            label: nls.localize2('insertFinalNewLine', "Insert Final New Line"),
            precondition: EditorContextKeys.writable
        });
    }
    run(_accessor, editor, args) {
        const selection = editor.getSelection();
        if (selection === null) {
            return;
        }
        const command = new InsertFinalNewLineCommand(selection);
        editor.pushUndoStop();
        editor.executeCommands(this.id, [command]);
        editor.pushUndoStop();
    }
}
registerEditorAction(InsertFinalNewLineAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zZXJ0RmluYWxOZXdMaW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2luc2VydEZpbmFsTmV3TGluZS9icm93c2VyL2luc2VydEZpbmFsTmV3TGluZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLG9CQUFvQixFQUFvQixNQUFNLHNDQUFzQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFFMUMsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFlBQVk7YUFFbEMsT0FBRSxHQUFHLGtDQUFrQyxDQUFDO0lBRS9EO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdCQUF3QixDQUFDLEVBQUU7WUFDL0IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLEVBQUUsdUJBQXVCLENBQUM7WUFDbkUsWUFBWSxFQUFFLGlCQUFpQixDQUFDLFFBQVE7U0FDeEMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVNLEdBQUcsQ0FBQyxTQUEyQixFQUFFLE1BQW1CLEVBQUUsSUFBUztRQUNyRSxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDeEMsSUFBSSxTQUFTLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDeEIsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXpELE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN2QixDQUFDOztBQUdGLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMifQ==