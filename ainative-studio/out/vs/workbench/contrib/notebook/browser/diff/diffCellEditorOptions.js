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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkNlbGxFZGl0b3JPcHRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9kaWZmQ2VsbEVkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEc7OztHQUdHO0FBQ0gsTUFBTSxpQ0FBaUMsR0FBRztJQUN6QyxHQUFHLEVBQUUsRUFBRTtJQUNQLE1BQU0sRUFBRSxFQUFFO0NBQ1YsQ0FBQztBQUNGLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsR0FBRyxFQUFFLEVBQUU7SUFDUCxNQUFNLEVBQUUsRUFBRTtDQUNWLENBQUM7QUFFRixNQUFNLFVBQVUsZ0JBQWdCLENBQUMsU0FBaUI7SUFDakQsT0FBTyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUM7QUFDakYsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFtQjtJQUNqRCxPQUFPLEVBQUUsa0JBQWtCO0lBQzNCLG9CQUFvQixFQUFFLEtBQUs7SUFDM0IsU0FBUyxFQUFFO1FBQ1YscUJBQXFCLEVBQUUsRUFBRTtRQUN6QixVQUFVLEVBQUUsTUFBTTtRQUNsQixRQUFRLEVBQUUsTUFBTTtRQUNoQixVQUFVLEVBQUUsSUFBSTtRQUNoQixpQkFBaUIsRUFBRSxLQUFLO1FBQ3hCLG1CQUFtQixFQUFFLEtBQUs7UUFDMUIsdUJBQXVCLEVBQUUsS0FBSztLQUM5QjtJQUNELGdDQUFnQyxFQUFFLElBQUk7SUFDdEMsa0JBQWtCLEVBQUUsQ0FBQztJQUNyQixtQkFBbUIsRUFBRSxLQUFLO0lBQzFCLG1CQUFtQixFQUFFLEtBQUs7SUFDMUIsUUFBUSxFQUFFLEtBQUs7SUFDZixXQUFXLEVBQUUsS0FBSztJQUNsQixXQUFXLEVBQUUsSUFBSTtJQUNqQixvQkFBb0IsRUFBRSxJQUFJO0lBQzFCLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7SUFDM0IsMkJBQTJCLEVBQUUsSUFBSTtJQUNqQyxtQkFBbUIsRUFBRSxNQUFNO0lBQzNCLFFBQVEsRUFBRSxJQUFJO0NBQ2QsQ0FBQztBQUVGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFtQztJQUNyRSxHQUFHLGtCQUFrQjtJQUNyQixXQUFXLEVBQUUsSUFBSTtJQUNqQix1QkFBdUIsRUFBRSxLQUFLO0lBQzlCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsc0JBQXNCLEVBQUUsS0FBSztJQUM3QixRQUFRLEVBQUUsS0FBSztJQUNmLGtCQUFrQixFQUFFLElBQUk7SUFDeEIsbUJBQW1CLEVBQUUsS0FBSztJQUMxQixRQUFRLEVBQUUsS0FBSztJQUNmLFlBQVksRUFBRSxLQUFLO0lBQ25CLGFBQWEsRUFBRSxVQUFVO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsK0JBQStCLEVBQUUsS0FBSztDQUN0QyxDQUFDIn0=