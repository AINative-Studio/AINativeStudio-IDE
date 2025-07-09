/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isReplEditorControl } from '../../replNotebook/browser/replEditor.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED } from '../common/notebookContextKeys.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
/**
 * The REPL input is already accessible, so we can show a view for the most recent execution output.
 */
export class ReplEditorAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'replEditorInput';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate());
    }
    getProvider(accessor) {
        const editorService = accessor.get(IEditorService);
        return getAccessibleOutputProvider(editorService);
    }
}
export function getAccessibleOutputProvider(editorService) {
    const editorControl = editorService.activeEditorPane?.getControl();
    if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
        const notebookEditor = editorControl.notebookEditor;
        const viewModel = notebookEditor?.getViewModel();
        if (notebookEditor && viewModel) {
            // last cell of the viewmodel is the last cell history
            const lastCellIndex = viewModel.length - 1;
            if (lastCellIndex >= 0) {
                const cell = viewModel.viewCells[lastCellIndex];
                const outputContent = getAllOutputsText(viewModel.notebookDocument, cell);
                if (outputContent) {
                    return new AccessibleContentProvider("notebook" /* AccessibleViewProviderId.Notebook */, { type: "view" /* AccessibleViewType.View */ }, () => { return outputContent; }, () => {
                        editorControl.activeCodeEditor?.focus();
                    }, "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */);
                }
            }
        }
    }
    return;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvckFjY2Vzc2libGVWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvcmVwbEVkaXRvckFjY2Vzc2libGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBc0IseUJBQXlCLEVBQTRCLE1BQU0sOERBQThELENBQUM7QUFFdkosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVsRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV4RTs7R0FFRztBQUNILE1BQU0sT0FBTyx3QkFBd0I7SUFBckM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsU0FBSSxHQUFHLGlCQUFpQixDQUFDO1FBQ3pCLFNBQUksd0NBQTJCO1FBQy9CLFNBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFLaEcsQ0FBQztJQUpBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE9BQU8sMkJBQTJCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLGFBQTZCO0lBQ3hFLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUVuRSxJQUFJLGFBQWEsSUFBSSxtQkFBbUIsQ0FBQyxhQUFhLENBQUMsSUFBSSxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDekYsTUFBTSxjQUFjLEdBQUcsYUFBYSxDQUFDLGNBQWMsQ0FBQztRQUNwRCxNQUFNLFNBQVMsR0FBRyxjQUFjLEVBQUUsWUFBWSxFQUFFLENBQUM7UUFDakQsSUFBSSxjQUFjLElBQUksU0FBUyxFQUFFLENBQUM7WUFDakMsc0RBQXNEO1lBQ3RELE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQzNDLElBQUksYUFBYSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN4QixNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUNoRCxNQUFNLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRTFFLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ25CLE9BQU8sSUFBSSx5QkFBeUIscURBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsR0FBRyxPQUFPLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFDL0IsR0FBRyxFQUFFO3dCQUNKLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQztvQkFDekMsQ0FBQyx3RkFFRCxDQUFDO2dCQUNILENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxPQUFPO0FBQ1IsQ0FBQyJ9