/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var MarkersViewMode;
(function (MarkersViewMode) {
    MarkersViewMode["Table"] = "table";
    MarkersViewMode["Tree"] = "tree";
})(MarkersViewMode || (MarkersViewMode = {}));
export var Markers;
(function (Markers) {
    Markers.MARKERS_CONTAINER_ID = 'workbench.panel.markers';
    Markers.MARKERS_VIEW_ID = 'workbench.panel.markers.view';
    Markers.MARKERS_VIEW_STORAGE_ID = 'workbench.panel.markers';
    Markers.MARKER_COPY_ACTION_ID = 'problems.action.copy';
    Markers.MARKER_COPY_MESSAGE_ACTION_ID = 'problems.action.copyMessage';
    Markers.RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID = 'problems.action.copyRelatedInformationMessage';
    Markers.FOCUS_PROBLEMS_FROM_FILTER = 'problems.action.focusProblemsFromFilter';
    Markers.MARKERS_VIEW_FOCUS_FILTER = 'problems.action.focusFilter';
    Markers.MARKERS_VIEW_CLEAR_FILTER_TEXT = 'problems.action.clearFilterText';
    Markers.MARKERS_VIEW_SHOW_MULTILINE_MESSAGE = 'problems.action.showMultilineMessage';
    Markers.MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE = 'problems.action.showSinglelineMessage';
    Markers.MARKER_OPEN_ACTION_ID = 'problems.action.open';
    Markers.MARKER_OPEN_SIDE_ACTION_ID = 'problems.action.openToSide';
    Markers.MARKER_SHOW_PANEL_ID = 'workbench.action.showErrorsWarnings';
    Markers.MARKER_SHOW_QUICK_FIX = 'problems.action.showQuickFixes';
    Markers.TOGGLE_MARKERS_VIEW_ACTION_ID = 'workbench.actions.view.toggleProblems';
})(Markers || (Markers = {}));
export var MarkersContextKeys;
(function (MarkersContextKeys) {
    MarkersContextKeys.MarkersViewModeContextKey = new RawContextKey('problemsViewMode', "tree" /* MarkersViewMode.Tree */);
    MarkersContextKeys.MarkersTreeVisibilityContextKey = new RawContextKey('problemsVisibility', false);
    MarkersContextKeys.MarkerFocusContextKey = new RawContextKey('problemFocus', false);
    MarkersContextKeys.MarkerViewFilterFocusContextKey = new RawContextKey('problemsFilterFocus', false);
    MarkersContextKeys.RelatedInformationFocusContextKey = new RawContextKey('relatedInformationFocus', false);
    MarkersContextKeys.ShowErrorsFilterContextKey = new RawContextKey('problems.filter.errors', true);
    MarkersContextKeys.ShowWarningsFilterContextKey = new RawContextKey('problems.filter.warnings', true);
    MarkersContextKeys.ShowInfoFilterContextKey = new RawContextKey('problems.filter.info', true);
    MarkersContextKeys.ShowActiveFileFilterContextKey = new RawContextKey('problems.filter.activeFile', false);
    MarkersContextKeys.ShowExcludedFilesFilterContextKey = new RawContextKey('problems.filter.excludedFiles', true);
})(MarkersContextKeys || (MarkersContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci90ZXN0L0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9jb21tb24vbWFya2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckYsTUFBTSxDQUFOLElBQWtCLGVBR2pCO0FBSEQsV0FBa0IsZUFBZTtJQUNoQyxrQ0FBZSxDQUFBO0lBQ2YsZ0NBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsZUFBZSxLQUFmLGVBQWUsUUFHaEM7QUFFRCxNQUFNLEtBQVcsT0FBTyxDQWlCdkI7QUFqQkQsV0FBaUIsT0FBTztJQUNWLDRCQUFvQixHQUFHLHlCQUF5QixDQUFDO0lBQ2pELHVCQUFlLEdBQUcsOEJBQThCLENBQUM7SUFDakQsK0JBQXVCLEdBQUcseUJBQXlCLENBQUM7SUFDcEQsNkJBQXFCLEdBQUcsc0JBQXNCLENBQUM7SUFDL0MscUNBQTZCLEdBQUcsNkJBQTZCLENBQUM7SUFDOUQsa0RBQTBDLEdBQUcsK0NBQStDLENBQUM7SUFDN0Ysa0NBQTBCLEdBQUcseUNBQXlDLENBQUM7SUFDdkUsaUNBQXlCLEdBQUcsNkJBQTZCLENBQUM7SUFDMUQsc0NBQThCLEdBQUcsaUNBQWlDLENBQUM7SUFDbkUsMkNBQW1DLEdBQUcsc0NBQXNDLENBQUM7SUFDN0UsNENBQW9DLEdBQUcsdUNBQXVDLENBQUM7SUFDL0UsNkJBQXFCLEdBQUcsc0JBQXNCLENBQUM7SUFDL0Msa0NBQTBCLEdBQUcsNEJBQTRCLENBQUM7SUFDMUQsNEJBQW9CLEdBQUcscUNBQXFDLENBQUM7SUFDN0QsNkJBQXFCLEdBQUcsZ0NBQWdDLENBQUM7SUFDekQscUNBQTZCLEdBQUcsdUNBQXVDLENBQUM7QUFDdEYsQ0FBQyxFQWpCZ0IsT0FBTyxLQUFQLE9BQU8sUUFpQnZCO0FBRUQsTUFBTSxLQUFXLGtCQUFrQixDQVdsQztBQVhELFdBQWlCLGtCQUFrQjtJQUNyQiw0Q0FBeUIsR0FBRyxJQUFJLGFBQWEsQ0FBa0Isa0JBQWtCLG9DQUF1QixDQUFDO0lBQ3pHLGtEQUErQixHQUFHLElBQUksYUFBYSxDQUFVLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFGLHdDQUFxQixHQUFHLElBQUksYUFBYSxDQUFVLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRSxrREFBK0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzRixvREFBaUMsR0FBRyxJQUFJLGFBQWEsQ0FBVSx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqRyw2Q0FBMEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSx3QkFBd0IsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN4RiwrQ0FBNEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSwwQkFBMEIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1RiwyQ0FBd0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxzQkFBc0IsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNwRixpREFBOEIsR0FBRyxJQUFJLGFBQWEsQ0FBVSw0QkFBNEIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNqRyxvREFBaUMsR0FBRyxJQUFJLGFBQWEsQ0FBVSwrQkFBK0IsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNwSCxDQUFDLEVBWGdCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFXbEMifQ==