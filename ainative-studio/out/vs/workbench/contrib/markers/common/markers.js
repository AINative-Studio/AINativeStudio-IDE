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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2NvbW1vbi9tYXJrZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRixNQUFNLENBQU4sSUFBa0IsZUFHakI7QUFIRCxXQUFrQixlQUFlO0lBQ2hDLGtDQUFlLENBQUE7SUFDZixnQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhpQixlQUFlLEtBQWYsZUFBZSxRQUdoQztBQUVELE1BQU0sS0FBVyxPQUFPLENBaUJ2QjtBQWpCRCxXQUFpQixPQUFPO0lBQ1YsNEJBQW9CLEdBQUcseUJBQXlCLENBQUM7SUFDakQsdUJBQWUsR0FBRyw4QkFBOEIsQ0FBQztJQUNqRCwrQkFBdUIsR0FBRyx5QkFBeUIsQ0FBQztJQUNwRCw2QkFBcUIsR0FBRyxzQkFBc0IsQ0FBQztJQUMvQyxxQ0FBNkIsR0FBRyw2QkFBNkIsQ0FBQztJQUM5RCxrREFBMEMsR0FBRywrQ0FBK0MsQ0FBQztJQUM3RixrQ0FBMEIsR0FBRyx5Q0FBeUMsQ0FBQztJQUN2RSxpQ0FBeUIsR0FBRyw2QkFBNkIsQ0FBQztJQUMxRCxzQ0FBOEIsR0FBRyxpQ0FBaUMsQ0FBQztJQUNuRSwyQ0FBbUMsR0FBRyxzQ0FBc0MsQ0FBQztJQUM3RSw0Q0FBb0MsR0FBRyx1Q0FBdUMsQ0FBQztJQUMvRSw2QkFBcUIsR0FBRyxzQkFBc0IsQ0FBQztJQUMvQyxrQ0FBMEIsR0FBRyw0QkFBNEIsQ0FBQztJQUMxRCw0QkFBb0IsR0FBRyxxQ0FBcUMsQ0FBQztJQUM3RCw2QkFBcUIsR0FBRyxnQ0FBZ0MsQ0FBQztJQUN6RCxxQ0FBNkIsR0FBRyx1Q0FBdUMsQ0FBQztBQUN0RixDQUFDLEVBakJnQixPQUFPLEtBQVAsT0FBTyxRQWlCdkI7QUFFRCxNQUFNLEtBQVcsa0JBQWtCLENBV2xDO0FBWEQsV0FBaUIsa0JBQWtCO0lBQ3JCLDRDQUF5QixHQUFHLElBQUksYUFBYSxDQUFrQixrQkFBa0Isb0NBQXVCLENBQUM7SUFDekcsa0RBQStCLEdBQUcsSUFBSSxhQUFhLENBQVUsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUYsd0NBQXFCLEdBQUcsSUFBSSxhQUFhLENBQVUsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFFLGtEQUErQixHQUFHLElBQUksYUFBYSxDQUFVLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzNGLG9EQUFpQyxHQUFHLElBQUksYUFBYSxDQUFVLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pHLDZDQUEwQixHQUFHLElBQUksYUFBYSxDQUFVLHdCQUF3QixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3hGLCtDQUE0QixHQUFHLElBQUksYUFBYSxDQUFVLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVGLDJDQUF3QixHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3BGLGlEQUE4QixHQUFHLElBQUksYUFBYSxDQUFVLDRCQUE0QixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pHLG9EQUFpQyxHQUFHLElBQUksYUFBYSxDQUFVLCtCQUErQixFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ3BILENBQUMsRUFYZ0Isa0JBQWtCLEtBQWxCLGtCQUFrQixRQVdsQyJ9