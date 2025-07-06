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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdFdpdGhDaGFuZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRXaXRoQ2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFNeEUsTUFBTSxPQUFPLHFCQUFxQjtJQU1qQyxZQUNpQixZQUEwQixFQUMxQixJQUFjLEVBQ2QsY0FBd0IsRUFDeEIsUUFBNEIsRUFDNUIsZ0JBQXNDO1FBSnRDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQzFCLFNBQUksR0FBSixJQUFJLENBQVU7UUFDZCxtQkFBYyxHQUFkLGNBQWMsQ0FBVTtRQUN4QixhQUFRLEdBQVIsUUFBUSxDQUFvQjtRQUM1QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXNCO1FBVnZDLGFBQVEsR0FBRyxjQUFjLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV2RyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztRQUM1QyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFTckYsQ0FBQztJQUVELE1BQU0sQ0FBQyxLQUE0QjtRQUNsQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUU7WUFDcEUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztZQUM1QixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDO1lBQ2hELElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVE7WUFDaEMsSUFBSSxDQUFDLGdCQUFnQixLQUFLLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQztJQUNuRCxDQUFDO0NBQ0QifQ==