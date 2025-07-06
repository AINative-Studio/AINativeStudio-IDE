/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Do not leave at 12, when at 12 and we have whitespace and only one line,
 * then there's not enough space for the button `Show Whitespace Differences`
 */
const fixedEditorPaddingSingleLineCells = {
    top: 24,
    bottom: 24
};
const fixedEditorPadding = {
    top: 12,
    bottom: 12
};
export function getEditorPadding(lineCount) {
    return lineCount === 1 ? fixedEditorPaddingSingleLineCells : fixedEditorPadding;
}
export const fixedEditorOptions = {
    padding: fixedEditorPadding,
    scrollBeyondLastLine: false,
    scrollbar: {
        verticalScrollbarSize: 14,
        horizontal: 'auto',
        vertical: 'auto',
        useShadows: true,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        alwaysConsumeMouseWheel: false,
    },
    renderLineHighlightOnlyWhenFocus: true,
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    selectOnLineNumbers: false,
    wordWrap: 'off',
    lineNumbers: 'off',
    glyphMargin: true,
    fixedOverflowWidgets: true,
    minimap: { enabled: false },
    renderValidationDecorations: 'on',
    renderLineHighlight: 'none',
    readOnly: true
};
export const fixedDiffEditorOptions = {
    ...fixedEditorOptions,
    glyphMargin: true,
    enableSplitViewResizing: false,
    renderIndicators: true,
    renderMarginRevertIcon: false,
    readOnly: false,
    isInEmbeddedEditor: true,
    renderOverviewRuler: false,
    wordWrap: 'off',
    diffWordWrap: 'off',
    diffAlgorithm: 'advanced',
    renderSideBySide: true,
    useInlineViewWhenSpaceIsLimited: false
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNlbGxFZGl0b3JPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvZGlmZkNlbGxFZGl0b3JPcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHOzs7R0FHRztBQUNILE1BQU0saUNBQWlDLEdBQUc7SUFDekMsR0FBRyxFQUFFLEVBQUU7SUFDUCxNQUFNLEVBQUUsRUFBRTtDQUNWLENBQUM7QUFDRixNQUFNLGtCQUFrQixHQUFHO0lBQzFCLEdBQUcsRUFBRSxFQUFFO0lBQ1AsTUFBTSxFQUFFLEVBQUU7Q0FDVixDQUFDO0FBRUYsTUFBTSxVQUFVLGdCQUFnQixDQUFDLFNBQWlCO0lBQ2pELE9BQU8sU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDO0FBQ2pGLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBbUI7SUFDakQsT0FBTyxFQUFFLGtCQUFrQjtJQUMzQixvQkFBb0IsRUFBRSxLQUFLO0lBQzNCLFNBQVMsRUFBRTtRQUNWLHFCQUFxQixFQUFFLEVBQUU7UUFDekIsVUFBVSxFQUFFLE1BQU07UUFDbEIsUUFBUSxFQUFFLE1BQU07UUFDaEIsVUFBVSxFQUFFLElBQUk7UUFDaEIsaUJBQWlCLEVBQUUsS0FBSztRQUN4QixtQkFBbUIsRUFBRSxLQUFLO1FBQzFCLHVCQUF1QixFQUFFLEtBQUs7S0FDOUI7SUFDRCxnQ0FBZ0MsRUFBRSxJQUFJO0lBQ3RDLGtCQUFrQixFQUFFLENBQUM7SUFDckIsbUJBQW1CLEVBQUUsS0FBSztJQUMxQixtQkFBbUIsRUFBRSxLQUFLO0lBQzFCLFFBQVEsRUFBRSxLQUFLO0lBQ2YsV0FBVyxFQUFFLEtBQUs7SUFDbEIsV0FBVyxFQUFFLElBQUk7SUFDakIsb0JBQW9CLEVBQUUsSUFBSTtJQUMxQixPQUFPLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO0lBQzNCLDJCQUEyQixFQUFFLElBQUk7SUFDakMsbUJBQW1CLEVBQUUsTUFBTTtJQUMzQixRQUFRLEVBQUUsSUFBSTtDQUNkLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBbUM7SUFDckUsR0FBRyxrQkFBa0I7SUFDckIsV0FBVyxFQUFFLElBQUk7SUFDakIsdUJBQXVCLEVBQUUsS0FBSztJQUM5QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLHNCQUFzQixFQUFFLEtBQUs7SUFDN0IsUUFBUSxFQUFFLEtBQUs7SUFDZixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLG1CQUFtQixFQUFFLEtBQUs7SUFDMUIsUUFBUSxFQUFFLEtBQUs7SUFDZixZQUFZLEVBQUUsS0FBSztJQUNuQixhQUFhLEVBQUUsVUFBVTtJQUN6QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLCtCQUErQixFQUFFLEtBQUs7Q0FDdEMsQ0FBQyJ9