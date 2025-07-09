/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CellKind } from '../../common/notebookCommon.js';
import { withTestNotebook } from './testNotebookEditor.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Event } from '../../../../../base/common/event.js';
suite('CellDecorations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Add and remove a cell decoration', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel) => {
            const cell = viewModel.cellAt(0);
            assert.ok(cell);
            let added = false;
            Event.once(cell.onCellDecorationsChanged)(e => added = !!e.added.find(decoration => decoration.className === 'style1'));
            const decorationIds = cell.deltaCellDecorations([], [{ className: 'style1' }]);
            assert.ok(cell.getCellDecorations().find(dec => dec.className === 'style1'));
            let removed = false;
            Event.once(cell.onCellDecorationsChanged)(e => removed = !!e.removed.find(decoration => decoration.className === 'style1'));
            cell.deltaCellDecorations(decorationIds, []);
            assert.ok(!cell.getCellDecorations().find(dec => dec.className === 'style1'));
            assert.ok(added);
            assert.ok(removed);
        });
    });
    test('Removing one cell decoration should not remove all', async function () {
        await withTestNotebook([
            ['# header a', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel) => {
            const cell = viewModel.cellAt(0);
            assert.ok(cell);
            const decorationIds = cell.deltaCellDecorations([], [{ className: 'style1', outputClassName: 'style1' }]);
            cell.deltaCellDecorations([], [{ className: 'style1' }]);
            let styleRemoved = false;
            let outputStyleRemoved = false;
            Event.once(cell.onCellDecorationsChanged)(e => {
                styleRemoved = !!e.removed.find(decoration => decoration.className === 'style1');
                outputStyleRemoved = !!e.removed.find(decoration => decoration.outputClassName === 'style1');
            });
            // remove the first style added, which should only remove the output class
            cell.deltaCellDecorations(decorationIds, []);
            assert.ok(!cell.getCellDecorations().find(dec => dec.outputClassName === 'style1'));
            assert.ok(cell.getCellDecorations().find(dec => dec.className === 'style1'));
            assert.ok(!styleRemoved);
            assert.ok(outputStyleRemoved);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERlY29yYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NlbGxEZWNvcmF0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVELEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSztRQUM3QyxNQUFNLGdCQUFnQixDQUNyQjtZQUNDLENBQUMsWUFBWSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDbkQsRUFDRCxLQUFLLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVoQixJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDbEIsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFD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