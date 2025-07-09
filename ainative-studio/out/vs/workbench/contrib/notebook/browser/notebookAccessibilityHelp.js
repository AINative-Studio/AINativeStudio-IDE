import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_EDITOR_FOCUSED } from '../common/notebookContextKeys.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
export class NotebookAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'notebook';
        this.when = ContextKeyExpr.and(NOTEBOOK_EDITOR_FOCUSED, IS_COMPOSITE_NOTEBOOK.negate());
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const activeEditor = accessor.get(ICodeEditorService).getActiveCodeEditor()
            || accessor.get(ICodeEditorService).getFocusedCodeEditor()
            || accessor.get(IEditorService).activeEditorPane;
        if (!activeEditor) {
            return;
        }
        return getAccessibilityHelpProvider(accessor, activeEditor);
    }
}
function getAccessibilityHelpText() {
    return [
        localize('notebook.overview', 'The notebook view is a collection of code and markdown cells. Code cells can be executed and will produce output directly below the cell.'),
        localize('notebook.cell.edit', 'The Edit Cell command{0} will focus on the cell input.', '<keybinding:notebook.cell.edit>'),
        localize('notebook.cell.quitEdit', 'The Quit Edit command{0} will set focus on the cell container. The default (Escape) key may need to be pressed twice first exit the virtual cursor if active.', '<keybinding:notebook.cell.quitEdit>'),
        localize('notebook.cell.focusInOutput', 'The Focus Output command{0} will set focus in the cell\'s output.', '<keybinding:notebook.cell.focusInOutput>'),
        localize('notebook.focusNextEditor', 'The Focus Next Cell Editor command{0} will set focus in the next cell\'s editor.', '<keybinding:notebook.focusNextEditor>'),
        localize('notebook.focusPreviousEditor', 'The Focus Previous Cell Editor command{0} will set focus in the previous cell\'s editor.', '<keybinding:notebook.focusPreviousEditor>'),
        localize('notebook.cellNavigation', 'The up and down arrows will also move focus between cells while focused on the outer cell container.'),
        localize('notebook.cell.executeAndFocusContainer', 'The Execute Cell command{0} executes the cell that currently has focus.', '<keybinding:notebook.cell.executeAndFocusContainer>'),
        localize('notebook.cell.insertCodeCellBelowAndFocusContainer', 'The Insert Cell Above{0} and Below{1} commands will create new empty code cells.', '<keybinding:notebook.cell.insertCodeCellAbove>', '<keybinding:notebook.cell.insertCodeCellBelow>'),
        localize('notebook.changeCellType', 'The Change Cell to Code/Markdown commands are used to switch between cell types.')
    ].join('\n');
}
function getAccessibilityHelpProvider(accessor, editor) {
    const helpText = getAccessibilityHelpText();
    return new AccessibleContentProvider("notebook" /* AccessibleViewProviderId.Notebook */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => editor.focus(), "accessibility.verbosity.notebook" /* AccessibilityVerbositySettingId.Notebook */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tBY2Nlc3NpYmlsaXR5SGVscC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBZ0QseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV2SixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXRGLE1BQU0sT0FBTyx5QkFBeUI7SUFBdEM7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsU0FBSSxHQUFHLFVBQVUsQ0FBQztRQUNsQixTQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ25GLFNBQUksd0NBQStDO0lBVzdELENBQUM7SUFWQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG1CQUFtQixFQUFFO2VBQ3ZFLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxvQkFBb0IsRUFBRTtlQUN2RCxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO1FBRWxELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sNEJBQTRCLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzdELENBQUM7Q0FDRDtBQUVELFNBQVMsd0JBQXdCO0lBQ2hDLE9BQU87UUFDTixRQUFRLENBQUMsbUJBQW1CLEVBQUUsMklBQTJJLENBQUM7UUFDMUssUUFBUSxDQUFDLG9CQUFvQixFQUFFLHdEQUF3RCxFQUFFLGlDQUFpQyxDQUFDO1FBQzNILFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSwrSkFBK0osRUFBRSxxQ0FBcUMsQ0FBQztRQUMxTyxRQUFRLENBQUMsNkJBQTZCLEVBQUUsbUVBQW1FLEVBQUUsMENBQTBDLENBQUM7UUFDeEosUUFBUSxDQUFDLDBCQUEwQixFQUFFLGtGQUFrRixFQUFFLHVDQUF1QyxDQUFDO1FBQ2pLLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSwwRkFBMEYsRUFBRSwyQ0FBMkMsQ0FBQztRQUNqTCxRQUFRLENBQUMseUJBQXlCLEVBQUUsc0dBQXNHLENBQUM7UUFDM0ksUUFBUSxDQUFDLHdDQUF3QyxFQUFFLHlFQUF5RSxFQUFFLHFEQUFxRCxDQUFDO1FBQ3BMLFFBQVEsQ0FBQyxvREFBb0QsRUFBRSxrRkFBa0YsRUFBRSxnREFBZ0QsRUFBRSxnREFBZ0QsQ0FBQztRQUN0UCxRQUFRLENBQUMseUJBQXlCLEVBQUUsa0ZBQWtGLENBQUM7S0FDdkgsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyw0QkFBNEIsQ0FBQyxRQUEwQixFQUFFLE1BQXdDO0lBQ3pHLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixFQUFFLENBQUM7SUFDNUMsT0FBTyxJQUFJLHlCQUF5QixxREFFbkMsRUFBRSxJQUFJLHNDQUF5QixFQUFFLEVBQ2pDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFDZCxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLG9GQUVwQixDQUFDO0FBQ0gsQ0FBQyJ9