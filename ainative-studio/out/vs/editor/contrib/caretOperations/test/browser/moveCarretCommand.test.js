/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../common/core/selection.js';
import { MoveCaretCommand } from '../../browser/moveCaretCommand.js';
import { testCommand } from '../../../../test/browser/testCommand.js';
function testMoveCaretLeftCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new MoveCaretCommand(sel, true), expectedLines, expectedSelection);
}
function testMoveCaretRightCommand(lines, selection, expectedLines, expectedSelection) {
    testCommand(lines, null, selection, (accessor, sel) => new MoveCaretCommand(sel, false), expectedLines, expectedSelection);
}
suite('Editor Contrib - Move Caret Command', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('move selection to left', function () {
        testMoveCaretLeftCommand([
            '012345'
        ], new Selection(1, 3, 1, 5), [
            '023145'
        ], new Selection(1, 2, 1, 4));
    });
    test('move selection to right', function () {
        testMoveCaretRightCommand([
            '012345'
        ], new Selection(1, 3, 1, 5), [
            '014235'
        ], new Selection(1, 4, 1, 6));
    });
    test('move selection to left - from first column - no change', function () {
        testMoveCaretLeftCommand([
            '012345'
        ], new Selection(1, 1, 1, 1), [
            '012345'
        ], new Selection(1, 1, 1, 1));
    });
    test('move selection to right - from last column - no change', function () {
        testMoveCaretRightCommand([
            '012345'
        ], new Selection(1, 5, 1, 7), [
            '012345'
        ], new Selection(1, 5, 1, 7));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZUNhcnJldENvbW1hbmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jYXJldE9wZXJhdGlvbnMvdGVzdC9icm93c2VyL21vdmVDYXJyZXRDb21tYW5kLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd0RSxTQUFTLHdCQUF3QixDQUFDLEtBQWUsRUFBRSxTQUFvQixFQUFFLGFBQXVCLEVBQUUsaUJBQTRCO0lBQzdILFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBQzNILENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUFDLEtBQWUsRUFBRSxTQUFvQixFQUFFLGFBQXVCLEVBQUUsaUJBQTRCO0lBQzlILFdBQVcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBQzVILENBQUM7QUFFRCxLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBRWpELHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFO1FBQzlCLHdCQUF3QixDQUN2QjtZQUNDLFFBQVE7U0FDUixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLFFBQVE7U0FDUixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMseUJBQXlCLEVBQUU7UUFDL0IseUJBQXlCLENBQ3hCO1lBQ0MsUUFBUTtTQUNSLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3pCO1lBQ0MsUUFBUTtTQUNSLEVBQ0QsSUFBSSxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3pCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksQ0FBQyx3REFBd0QsRUFBRTtRQUM5RCx3QkFBd0IsQ0FDdkI7WUFDQyxRQUFRO1NBQ1IsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDekI7WUFDQyxRQUFRO1NBQ1IsRUFDRCxJQUFJLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDekIsQ0FBQztJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLHdEQUF3RCxFQUFFO1FBQzlELHlCQUF5QixDQUN4QjtZQUNDLFFBQVE7U0FDUixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUN6QjtZQUNDLFFBQVE7U0FDUixFQUNELElBQUksU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUN6QixDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9