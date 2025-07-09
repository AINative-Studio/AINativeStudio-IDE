/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CellFocusMode } from '../../browser/notebookBrowser.js';
import { NotebookCellAnchor } from '../../browser/view/notebookCellAnchor.js';
import { Emitter } from '../../../../../base/common/event.js';
import { CellKind, NotebookCellExecutionState, NotebookSetting } from '../../common/notebookCommon.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('NotebookCellAnchor', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let focusedCell;
    let config;
    let scrollEvent;
    let onDidStopExecution;
    let resizingCell;
    let cellAnchor;
    setup(() => {
        config = new TestConfigurationService();
        scrollEvent = new Emitter();
        onDidStopExecution = new Emitter();
        const executionService = {
            getCellExecution: () => { return { state: NotebookCellExecutionState.Executing }; },
        };
        resizingCell = {
            cellKind: CellKind.Code,
            onDidStopExecution: onDidStopExecution.event
        };
        focusedCell = {
            focusMode: CellFocusMode.Container
        };
        cellAnchor = store.add(new NotebookCellAnchor(executionService, config, scrollEvent.event));
    });
    // for the current implementation the code under test only cares about the focused cell
    // initial setup with focused cell at the bottom of the view
    class MockListView {
        constructor() {
            this.focusedCellTop = 100;
            this.focusedCellHeight = 50;
            this.renderTop = 0;
            this.renderHeight = 150;
        }
        element(_index) { return focusedCell; }
        elementTop(_index) { return this.focusedCellTop; }
        elementHeight(_index) { return this.focusedCellHeight; }
        getScrollTop() { return this.renderTop; }
    }
    test('Basic anchoring', async function () {
        focusedCell.focusMode = CellFocusMode.Editor;
        const listView = new MockListView();
        assert(cellAnchor.shouldAnchor(listView, 1, -10, resizingCell), 'should anchor if cell editor is focused');
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell editor is focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell editor is focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'fullCell');
        focusedCell.focusMode = CellFocusMode.Container;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell is growing');
        focusedCell.focusMode = CellFocusMode.Output;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell is growing');
        assert(!cellAnchor.shouldAnchor(listView, 1, -10, resizingCell), 'should not anchor if not growing and editor not focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should not anchor if scroll on execute is disabled');
    });
    test('Anchor during execution until user scrolls up', async function () {
        const listView = new MockListView();
        const scrollDown = { oldScrollTop: 100, scrollTop: 150 };
        const scrollUp = { oldScrollTop: 200, scrollTop: 150 };
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell));
        scrollEvent.fire(scrollDown);
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should still be anchored after scrolling down');
        scrollEvent.fire(scrollUp);
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should not be anchored after scrolling up');
        focusedCell.focusMode = CellFocusMode.Editor;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should anchor again if the editor is focused');
        focusedCell.focusMode = CellFocusMode.Container;
        onDidStopExecution.fire();
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should anchor for new execution');
    });
    test('Only anchor during when the focused cell will be pushed out of view', async function () {
        const mockListView = new MockListView();
        mockListView.focusedCellTop = 50;
        const listView = mockListView;
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should not anchor if focused cell will still be fully visible after resize');
        focusedCell.focusMode = CellFocusMode.Editor;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should always anchor if the editor is focused');
        // fully visible focused cell would be pushed partially out of view
        assert(cellAnchor.shouldAnchor(listView, 1, 150, resizingCell), 'cell should be anchored if focused cell will be pushed out of view');
        mockListView.focusedCellTop = 110;
        // partially visible focused cell would be pushed further out of view
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should be anchored if focused cell will be pushed out of view');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQW5jaG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rQ2VsbEFuY2hvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxRQUFRLEVBQUUsMEJBQTBCLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFdkcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFJbkcsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUVoQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBQ3hELElBQUksV0FBOEIsQ0FBQztJQUNuQyxJQUFJLE1BQWdDLENBQUM7SUFDckMsSUFBSSxXQUFpQyxDQUFDO0lBQ3RDLElBQUksa0JBQWlDLENBQUM7SUFDdEMsSUFBSSxZQUErQixDQUFDO0lBRXBDLElBQUksVUFBOEIsQ0FBQztJQUVuQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsTUFBTSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQztRQUN4QyxXQUFXLEdBQUcsSUFBSSxPQUFPLEVBQWUsQ0FBQztRQUN6QyxrQkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFDO1FBRXpDLE1BQU0sZ0JBQWdCLEdBQUc7WUFDeEIsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLEdBQUcsT0FBTyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDdEMsQ0FBQztRQUUvQyxZQUFZLEdBQUc7WUFDZCxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDdkIsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsS0FBSztTQUNaLENBQUM7UUFFbEMsV0FBVyxHQUFHO1lBQ2IsU0FBUyxFQUFFLGFBQWEsQ0FBQyxTQUFTO1NBQ2IsQ0FBQztRQUV2QixVQUFVLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLGdCQUFnQixFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUM3RixDQUFDLENBQUMsQ0FBQztJQUVILHVGQUF1RjtJQUN2Riw0REFBNEQ7SUFDNUQsTUFBTSxZQUFZO1FBQWxCO1lBQ0MsbUJBQWMsR0FBRyxHQUFHLENBQUM7WUFDckIsc0JBQWlCLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLGNBQVMsR0FBRyxDQUFDLENBQUM7WUFDZCxpQkFBWSxHQUFHLEdBQUcsQ0FBQztRQUtwQixDQUFDO1FBSkEsT0FBTyxDQUFDLE1BQWMsSUFBSSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDL0MsVUFBVSxDQUFDLE1BQWMsSUFBSSxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQzFELGFBQWEsQ0FBQyxNQUFjLElBQUksT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ2hFLFlBQVksS0FBSyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0tBQ3pDO0lBRUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLEtBQUs7UUFFNUIsV0FBVyxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUksWUFBWSxFQUE2QyxDQUFDO1FBQy9FLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUseUNBQXlDLENBQUMsQ0FBQztRQUMzRyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSx5Q0FBeUMsQ0FBQyxDQUFDO1FBQzFHLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLEVBQUUseUNBQXlDLENBQUMsQ0FBQztRQUUxRyxNQUFNLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzVFLFdBQVcsQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztRQUNoRCxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBQ25HLFdBQVcsQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUM3QyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBRW5HLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSx5REFBeUQsQ0FBQyxDQUFDO1FBRTVILE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEUsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxvREFBb0QsQ0FBQyxDQUFDO0lBQ3ZILENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUs7UUFDMUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxZQUFZLEVBQTZDLENBQUM7UUFDL0UsTUFBTSxVQUFVLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQWlCLENBQUM7UUFDeEUsTUFBTSxRQUFRLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQWlCLENBQUM7UUFFdEUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUUvRCxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzdCLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLG9EQUFvRCxDQUFDLENBQUM7UUFFckgsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMzQixNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLGdEQUFnRCxDQUFDLENBQUM7UUFDbEgsV0FBVyxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLG1EQUFtRCxDQUFDLENBQUM7UUFDcEgsV0FBVyxDQUFDLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO1FBRWhELGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7SUFDeEcsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMscUVBQXFFLEVBQUUsS0FBSztRQUNoRixNQUFNLFlBQVksR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ3hDLFlBQVksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLFlBQXVELENBQUM7UUFFekUsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSw0RUFBNEUsQ0FBQyxDQUFDO1FBQzlJLFdBQVcsQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUM3QyxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxvREFBb0QsQ0FBQyxDQUFDO1FBRXJILG1FQUFtRTtRQUNuRSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsRUFBRSxvRUFBb0UsQ0FBQyxDQUFDO1FBQ3RJLFlBQVksQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDO1FBQ2xDLHFFQUFxRTtRQUNyRSxNQUFNLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLENBQUMsRUFBRSxvRUFBb0UsQ0FBQyxDQUFDO0lBQ3RJLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==