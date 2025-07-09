/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SingleLineEdit } from '../../../../../common/core/lineEdit.js';
export class InlineEditWithChanges {
    constructor(originalText, edit, cursorPosition, commands, inlineCompletion) {
        this.originalText = originalText;
        this.edit = edit;
        this.cursorPosition = cursorPosition;
        this.commands = commands;
        this.inlineCompletion = inlineCompletion;
        this.lineEdit = SingleLineEdit.fromSingleTextEdit(this.edit.toSingle(this.originalText), this.originalText);
        this.originalLineRange = this.lineEdit.lineRange;
        this.modifiedLineRange = this.lineEdit.toLineEdit().getNewLineRanges()[0];
    }
    equals(other) {
        return this.originalText.getValue() === other.originalText.getValue() &&
            this.edit.equals(other.edit) &&
            this.cursorPosition.equals(other.cursorPosition) &&
            this.commands === other.commands &&
            this.inlineCompletion === other.inlineCompletion;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdFdpdGhDaGFuZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0V2l0aENoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBTXhFLE1BQU0sT0FBTyxxQkFBcUI7SUFNakMsWUFDaUIsWUFBMEIsRUFDMUIsSUFBYyxFQUNkLGNBQXdCLEVBQ3hCLFFBQTRCLEVBQzVCLGdCQUFzQztRQUp0QyxpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUMxQixTQUFJLEdBQUosSUFBSSxDQUFVO1FBQ2QsbUJBQWMsR0FBZCxjQUFjLENBQVU7UUFDeEIsYUFBUSxHQUFSLFFBQVEsQ0FBb0I7UUFDNUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFzQjtRQVZ2QyxhQUFRLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFdkcsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7UUFDNUMsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBU3JGLENBQUM7SUFFRCxNQUFNLENBQUMsS0FBNEI7UUFDbEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO1lBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztZQUNoRCxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUssQ0FBQyxRQUFRO1lBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7SUFDbkQsQ0FBQztDQUNEIn0=