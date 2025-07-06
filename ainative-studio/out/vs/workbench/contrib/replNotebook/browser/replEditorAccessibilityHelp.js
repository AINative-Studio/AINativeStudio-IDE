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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEVkaXRvckFjY2Vzc2liaWxpdHlIZWxwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL3Rlc3QvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZXBsTm90ZWJvb2svYnJvd3Nlci9yZXBsRWRpdG9yQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQWdELHlCQUF5QixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFdkosT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLDBCQUEwQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFakgsTUFBTSxPQUFPLGdDQUFnQztJQUE3QztRQUNVLGFBQVEsR0FBRyxHQUFHLENBQUM7UUFDZixTQUFJLEdBQUcsbUJBQW1CLENBQUM7UUFDM0IsU0FBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsMEJBQTBCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN0RixTQUFJLHdDQUErQztJQUk3RCxDQUFDO0lBSEEsV0FBVyxDQUFDLFFBQTBCO1FBQ3JDLE9BQU8sNEJBQTRCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztJQUN4RyxDQUFDO0NBQ0Q7QUFFRCxTQUFTLDZCQUE2QjtJQUNyQyxPQUFPO1FBQ04sUUFBUSxDQUFDLDBCQUEwQixFQUFFLHVGQUF1RixDQUFDO1FBQzdILFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSx1RUFBdUUsRUFBRSwyQkFBMkIsQ0FBQztRQUNwSSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsd0lBQXdJLENBQUM7UUFDcEwsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDJJQUEySSxDQUFDO1FBQ2pMLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxtR0FBbUcsRUFBRSx5Q0FBeUMsQ0FBQztRQUN6TCxRQUFRLENBQUMsbUNBQW1DLEVBQUUscUpBQXFKLEVBQUUsMkNBQTJDLENBQUM7UUFDalAsUUFBUSxDQUFDLDJCQUEyQixFQUFFLDZFQUE2RSxFQUFFLCtCQUErQixDQUFDO0tBQ3JKLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sT0FBTyxrQ0FBa0M7SUFBL0M7UUFDVSxhQUFRLEdBQUcsR0FBRyxDQUFDO1FBQ2YsU0FBSSxHQUFHLHFCQUFxQixDQUFDO1FBQzdCLFNBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDN0UsU0FBSSx3Q0FBK0M7SUFJN0QsQ0FBQztJQUhBLFdBQVcsQ0FBQyxRQUEwQjtRQUNyQyxPQUFPLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSwrQkFBK0IsRUFBRSxDQUFDLENBQUM7SUFDMUcsQ0FBQztDQUNEO0FBRUQsU0FBUywrQkFBK0I7SUFDdkMsT0FBTztRQUNOLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxvSkFBb0osQ0FBQztRQUM1TCxRQUFRLENBQUMsNEJBQTRCLEVBQUUsNkZBQTZGLEVBQUUsaUNBQWlDLENBQUM7UUFDeEssUUFBUSxDQUFDLDJCQUEyQixFQUFFLGlKQUFpSixFQUFFLHFDQUFxQyxDQUFDO1FBQy9OLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxzSEFBc0gsRUFBRSwyQ0FBMkMsQ0FBQztRQUM3TSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsc0dBQXNHLEVBQUUsMENBQTBDLENBQUM7UUFDeEwsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLDBFQUEwRSxFQUFFLCtCQUErQixDQUFDO1FBQzdKLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxtR0FBbUcsRUFBRSx5Q0FBeUMsQ0FBQztLQUN6TCxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLDRCQUE0QixDQUFDLGFBQWlDLEVBQUUsUUFBZ0I7SUFDeEYsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLG1CQUFtQixFQUFFO1dBQ3BELGFBQWEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBRXpDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNuQixPQUFPO0lBQ1IsQ0FBQztJQUVELE9BQU8sSUFBSSx5QkFBeUIseURBRW5DLEVBQUUsSUFBSSxzQ0FBeUIsRUFBRSxFQUNqQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQ2QsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSx3RkFFMUIsQ0FBQztBQUNILENBQUMifQ==