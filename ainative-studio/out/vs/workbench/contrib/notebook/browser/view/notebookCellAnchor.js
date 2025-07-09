/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CellFocusMode } from '../notebookBrowser.js';
import { CellKind, NotebookCellExecutionState, NotebookSetting } from '../../common/notebookCommon.js';
export class NotebookCellAnchor {
    constructor(notebookExecutionStateService, configurationService, scrollEvent) {
        this.notebookExecutionStateService = notebookExecutionStateService;
        this.configurationService = configurationService;
        this.scrollEvent = scrollEvent;
        this.stopAnchoring = false;
    }
    shouldAnchor(cellListView, focusedIndex, heightDelta, executingCellUri) {
        if (cellListView.element(focusedIndex).focusMode === CellFocusMode.Editor) {
            return true;
        }
        if (this.stopAnchoring) {
            return false;
        }
        const newFocusBottom = cellListView.elementTop(focusedIndex) + cellListView.elementHeight(focusedIndex) + heightDelta;
        const viewBottom = cellListView.renderHeight + cellListView.getScrollTop();
        const focusStillVisible = viewBottom > newFocusBottom;
        const allowScrolling = this.configurationService.getValue(NotebookSetting.scrollToRevealCell) !== 'none';
        const growing = heightDelta > 0;
        const autoAnchor = allowScrolling && growing && !focusStillVisible;
        if (autoAnchor) {
            this.watchAchorDuringExecution(executingCellUri);
            return true;
        }
        return false;
    }
    watchAchorDuringExecution(executingCell) {
        // anchor while the cell is executing unless the user scrolls up.
        if (!this.executionWatcher && executingCell.cellKind === CellKind.Code) {
            const executionState = this.notebookExecutionStateService.getCellExecution(executingCell.uri);
            if (executionState && executionState.state === NotebookCellExecutionState.Executing) {
                this.executionWatcher = executingCell.onDidStopExecution(() => {
                    this.executionWatcher?.dispose();
                    this.executionWatcher = undefined;
                    this.scrollWatcher?.dispose();
                    this.stopAnchoring = false;
                });
                this.scrollWatcher = this.scrollEvent((scrollEvent) => {
                    if (scrollEvent.scrollTop < scrollEvent.oldScrollTop) {
                        this.stopAnchoring = true;
                        this.scrollWatcher?.dispose();
                    }
                });
            }
        }
    }
    dispose() {
        this.executionWatcher?.dispose();
        this.scrollWatcher?.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsQW5jaG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9ub3RlYm9va0NlbGxBbmNob3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSx1QkFBdUIsQ0FBQztBQUV0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLDBCQUEwQixFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBU3ZHLE1BQU0sT0FBTyxrQkFBa0I7SUFNOUIsWUFDa0IsNkJBQTZELEVBQzdELG9CQUEyQyxFQUMzQyxXQUErQjtRQUYvQixrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWdDO1FBQzdELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MsZ0JBQVcsR0FBWCxXQUFXLENBQW9CO1FBUHpDLGtCQUFhLEdBQUcsS0FBSyxDQUFDO0lBUTlCLENBQUM7SUFFTSxZQUFZLENBQUMsWUFBc0MsRUFBRSxZQUFvQixFQUFFLFdBQW1CLEVBQUUsZ0JBQWdDO1FBQ3RJLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLEtBQUssYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNFLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsR0FBRyxXQUFXLENBQUM7UUFDdEgsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDM0UsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLEdBQUcsY0FBYyxDQUFDO1FBQ3RELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLGtCQUFrQixDQUFDLEtBQUssTUFBTSxDQUFDO1FBQ3pHLE1BQU0sT0FBTyxHQUFHLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDaEMsTUFBTSxVQUFVLEdBQUcsY0FBYyxJQUFJLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO1FBRW5FLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDakQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU0seUJBQXlCLENBQUMsYUFBNkI7UUFDN0QsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksYUFBYSxDQUFDLFFBQVEsS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDeEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RixJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsS0FBSyxLQUFLLDBCQUEwQixDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNyRixJQUFJLENBQUMsZ0JBQWdCLEdBQUksYUFBbUMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUU7b0JBQ3BGLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDakMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztvQkFDbEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO29CQUNyRCxJQUFJLFdBQVcsQ0FBQyxTQUFTLEdBQUcsV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO3dCQUN0RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQzt3QkFDMUIsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDL0IsQ0FBQztnQkFDRixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUMvQixDQUFDO0NBQ0QifQ==