/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { getNotebookEditorFromEditorPane } from './notebookBrowser.js';
import { NOTEBOOK_CELL_LIST_FOCUSED } from '../common/notebookContextKeys.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { InputFocusedContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
export class NotebookAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'notebook';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated());
    }
    getProvider(accessor) {
        const editorService = accessor.get(IEditorService);
        return getAccessibleOutputProvider(editorService);
    }
}
export function getAccessibleOutputProvider(editorService) {
    const activePane = editorService.activeEditorPane;
    const notebookEditor = getNotebookEditorFromEditorPane(activePane);
    const notebookViewModel = notebookEditor?.getViewModel();
    const selections = notebookViewModel?.getSelections();
    const notebookDocument = notebookViewModel?.notebookDocument;
    if (!selections || !notebookDocument || !notebookEditor?.textModel) {
        return;
    }
    const viewCell = notebookViewModel.viewCells[selections[0].start];
    const outputContent = getAllOutputsText(notebookDocument, viewCell);
    if (!outputContent) {
        return;
    }
    return new AccessibleContentProvider("notebook" /* AccessibleViewProviderId.Notebook */, { type: "view" /* AccessibleViewType.View */ }, () => { return outputContent; }, () => {
        notebookEditor?.setFocus(selections[0]);
        notebookEditor.focus();
    }, "accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rQWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFnRCx5QkFBeUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXZKLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUd0RixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUN2RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFeEUsTUFBTSxPQUFPLHNCQUFzQjtJQUFuQztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcsVUFBVSxDQUFDO1FBQ2xCLFNBQUksd0NBQTJCO1FBQy9CLFNBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7SUFLakcsQ0FBQztJQUpBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE9BQU8sMkJBQTJCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNEO0FBR0QsTUFBTSxVQUFVLDJCQUEyQixDQUFDLGFBQTZCO0lBQ3hFLE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQztJQUNsRCxNQUFNLGNBQWMsR0FBRywrQkFBK0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuRSxNQUFNLGlCQUFpQixHQUFHLGNBQWMsRUFBRSxZQUFZLEVBQUUsQ0FBQztJQUN6RCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsQ0FBQztJQUN0RCxNQUFNLGdCQUFnQixHQUFHLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDO0lBRTdELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUNwRSxPQUFPO0lBQ1IsQ0FBQztJQUVELE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEUsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFFcEUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3BCLE9BQU87SUFDUixDQUFDO0lBRUQsT0FBTyxJQUFJLHlCQUF5QixxREFFbkMsRUFBRSxJQUFJLHNDQUF5QixFQUFFLEVBQ2pDLEdBQUcsRUFBRSxHQUFHLE9BQU8sYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUMvQixHQUFHLEVBQUU7UUFDSixjQUFjLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QixDQUFDLG9GQUVELENBQUM7QUFDSCxDQUFDIn0=