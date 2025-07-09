import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED } from '../../notebook/common/notebookContextKeys.js';
export class ReplEditorInputAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'REPL Editor Input';
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate());
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return getAccessibilityHelpProvider(accessor.get(ICodeEditorService), getAccessibilityInputHelpText());
    }
}
function getAccessibilityInputHelpText() {
    return [
        localize('replEditor.inputOverview', 'You are in a REPL Editor Input box which will accept code to be executed in the REPL.'),
        localize('replEditor.execute', 'The Execute command{0} will evaluate the expression in the input box.', '<keybinding:repl.execute>'),
        localize('replEditor.configReadExecution', 'The setting `accessibility.replEditor.readLastExecutionOutput` controls if output will be automatically read when execution completes.'),
        localize('replEditor.autoFocusRepl', 'The setting `accessibility.replEditor.autoFocusReplExecution` controls if focus will automatically move to the REPL after executing code.'),
        localize('replEditor.focusLastItemAdded', 'The Focus Last executed command{0} will move focus to the last executed item in the REPL history.', '<keybinding:repl.focusLastItemExecuted>'),
        localize('replEditor.inputAccessibilityView', 'When you run the Open Accessbility View command{0} from this input box, the output from the last execution will be shown in the accessibility view.', '<keybinding:editor.action.accessibleView>'),
        localize('replEditor.focusReplInput', 'The Focus Input Editor command{0} will bring the focus back to this editor.', '<keybinding:repl.input.focus>'),
    ].join('\n');
}
export class ReplEditorHistoryAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'REPL Editor History';
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED);
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return getAccessibilityHelpProvider(accessor.get(ICodeEditorService), getAccessibilityHistoryHelpText());
    }
}
function getAccessibilityHistoryHelpText() {
    return [
        localize('replEditor.historyOverview', 'You are in a REPL History which is a list of cells that have been executed in the REPL. Each cell has an input, an output, and the cell container.'),
        localize('replEditor.focusCellEditor', 'The Edit Cell command{0} will move focus to the read-only editor for the input of the cell.', '<keybinding:notebook.cell.edit>'),
        localize('replEditor.cellNavigation', 'The Quit Edit command{0} will move focus to the cell container, where the up and down arrows will also move focus between cells in the history.', '<keybinding:notebook.cell.quitEdit>'),
        localize('replEditor.accessibilityView', 'Run the Open Accessbility View command{0} while navigating the history for an accessible view of the item\'s output.', '<keybinding:editor.action.accessibleView>'),
        localize('replEditor.focusInOutput', 'The Focus Output command{0} will set focus on the output when focused on a previously executed item.', '<keybinding:notebook.cell.focusInOutput>'),
        localize('replEditor.focusReplInputFromHistory', 'The Focus Input Editor command{0} will move focus to the REPL input box.', '<keybinding:repl.input.focus>'),
        localize('replEditor.focusLastItemAdded', 'The Focus Last executed command{0} will move focus to the last executed item in the REPL history.', '<keybinding:repl.focusLastItemExecuted>'),
    ].join('\n');
}
function getAccessibilityHelpProvider(editorService, helpText) {
    const activeEditor = editorService.getActiveCodeEditor()
        || editorService.getFocusedCodeEditor();
    if (!activeEditor) {
        return;
    }
    return new AccessibleContentProvider("replEditor" /* AccessibleViewProviderId.ReplEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => activeEditor.focus(), "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlcGxOb3RlYm9vay9icm93c2VyL3JlcGxFZGl0b3JBY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBZ0QseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV2SixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVqSCxNQUFNLE9BQU8sZ0NBQWdDO0lBQTdDO1FBQ1UsYUFBUSxHQUFHLEdBQUcsQ0FBQztRQUNmLFNBQUksR0FBRyxtQkFBbUIsQ0FBQztRQUMzQixTQUFJLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3RGLFNBQUksd0NBQStDO0lBSTdELENBQUM7SUFIQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsT0FBTyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO0lBQ3hHLENBQUM7Q0FDRDtBQUVELFNBQVMsNkJBQTZCO0lBQ3JDLE9BQU87UUFDTixRQUFRLENBQUMsMEJBQTBCLEVBQUUsdUZBQXVGLENBQUM7UUFDN0gsUUFBUSxDQUFDLG9CQUFvQixFQUFFLHVFQUF1RSxFQUFFLDJCQUEyQixDQUFDO1FBQ3BJLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRSx3SUFBd0ksQ0FBQztRQUNwTCxRQUFRLENBQUMsMEJBQTBCLEVBQUUsMklBQTJJLENBQUM7UUFDakwsUUFBUSxDQUFDLCtCQUErQixFQUFFLG1HQUFtRyxFQUFFLHlDQUF5QyxDQUFDO1FBQ3pMLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxxSkFBcUosRUFBRSwyQ0FBMkMsQ0FBQztRQUNqUCxRQUFRLENBQUMsMkJBQTJCLEVBQUUsNkVBQTZFLEVBQUUsK0JBQStCLENBQUM7S0FDckosQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDZCxDQUFDO0FBRUQsTUFBTSxPQUFPLGtDQUFrQztJQUEvQztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcscUJBQXFCLENBQUM7UUFDN0IsU0FBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM3RSxTQUFJLHdDQUErQztJQUk3RCxDQUFDO0lBSEEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLCtCQUErQixFQUFFLENBQUMsQ0FBQztJQUMxRyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLCtCQUErQjtJQUN2QyxPQUFPO1FBQ04sUUFBUSxDQUFDLDRCQUE0QixFQUFFLG9KQUFvSixDQUFDO1FBQzVMLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSw2RkFBNkYsRUFBRSxpQ0FBaUMsQ0FBQztRQUN4SyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsaUpBQWlKLEVBQUUscUNBQXFDLENBQUM7UUFDL04sUUFBUSxDQUFDLDhCQUE4QixFQUFFLHNIQUFzSCxFQUFFLDJDQUEyQyxDQUFDO1FBQzdNLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxzR0FBc0csRUFBRSwwQ0FBMEMsQ0FBQztRQUN4TCxRQUFRLENBQUMsc0NBQXNDLEVBQUUsMEVBQTBFLEVBQUUsK0JBQStCLENBQUM7UUFDN0osUUFBUSxDQUFDLCtCQUErQixFQUFFLG1HQUFtRyxFQUFFLHlDQUF5QyxDQUFDO0tBQ3pMLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsYUFBaUMsRUFBRSxRQUFnQjtJQUN4RixNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsbUJBQW1CLEVBQUU7V0FDcEQsYUFBYSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFFekMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ25CLE9BQU87SUFDUixDQUFDO0lBRUQsT0FBTyxJQUFJLHlCQUF5Qix5REFFbkMsRUFBRSxJQUFJLHNDQUF5QixFQUFFLEVBQ2pDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFDZCxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLHdGQUUxQixDQUFDO0FBQ0gsQ0FBQyJ9