/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asyncTransaction, transaction } from '../../../../../base/common/observable.js';
import { splitLines } from '../../../../../base/common/strings.js';
import * as nls from '../../../../../nls.js';
import { Action2, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { EditorAction, EditorCommand } from '../../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { Context as SuggestContext } from '../../../suggest/browser/suggest.js';
import { hideInlineCompletionId, inlineSuggestCommitId, jumpToNextInlineEditId, showNextInlineSuggestionActionId, showPreviousInlineSuggestionActionId, toggleShowCollapsedId } from './commandIds.js';
import { InlineCompletionContextKeys } from './inlineCompletionContextKeys.js';
import { InlineCompletionsController } from './inlineCompletionsController.js';
export class ShowNextInlineSuggestionAction extends EditorAction {
    static { this.ID = showNextInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowNextInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showNext', "Show Next Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 94 /* KeyCode.BracketRight */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.next();
    }
}
export class ShowPreviousInlineSuggestionAction extends EditorAction {
    static { this.ID = showPreviousInlineSuggestionActionId; }
    constructor() {
        super({
            id: ShowPreviousInlineSuggestionAction.ID,
            label: nls.localize2('action.inlineSuggest.showPrevious', "Show Previous Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100,
                primary: 512 /* KeyMod.Alt */ | 92 /* KeyCode.BracketLeft */,
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        controller?.model.get()?.previous();
    }
}
export class TriggerInlineSuggestionAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.trigger',
            label: nls.localize2('action.inlineSuggest.trigger', "Trigger Inline Suggestion"),
            precondition: EditorContextKeys.writable
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await asyncTransaction(async (tx) => {
            /** @description triggerExplicitly from command */
            await controller?.model.get()?.triggerExplicitly(tx);
            controller?.playAccessibilitySignal(tx);
        });
    }
}
export class ExplicitTriggerInlineEditAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.triggerInlineEditExplicit',
            label: nls.localize2('action.inlineSuggest.trigger.explicitInlineEdit', "Trigger Next Edit Suggestion"),
            precondition: EditorContextKeys.writable,
        });
    }
    async run(accessor, editor) {
        const notificationService = accessor.get(INotificationService);
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.triggerExplicitly(undefined, true);
        if (!controller?.model.get()?.inlineEditAvailable.get()) {
            notificationService.notify({
                severity: Severity.Info,
                message: nls.localize('noInlineEditAvailable', "No inline edit is available.")
            });
        }
    }
}
export class TriggerInlineEditAction extends EditorCommand {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.triggerInlineEdit',
            precondition: EditorContextKeys.writable,
        });
    }
    async runEditorCommand(accessor, editor, args) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.trigger(undefined, { onlyFetchInlineEdits: true });
    }
}
export class AcceptNextWordOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextWord',
            label: nls.localize2('action.inlineSuggest.acceptNextWord', "Accept Next Word Of Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 2048 /* KeyMod.CtrlCmd */ | 17 /* KeyCode.RightArrow */,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptWord', 'Accept Word'),
                    group: 'primary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextWord(controller.editor);
    }
}
export class AcceptNextLineOfInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextLine',
            label: nls.localize2('action.inlineSuggest.acceptNextLine', "Accept Next Line Of Inline Suggestion"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineSuggestionVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
            },
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('acceptLine', 'Accept Line'),
                    group: 'secondary',
                    order: 2,
                }],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextLine(controller.editor);
    }
}
export class AcceptInlineCompletion extends EditorAction {
    constructor() {
        super({
            id: inlineSuggestCommitId,
            label: nls.localize2('action.inlineSuggest.accept', "Accept Inline Suggestion"),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            menuOpts: [{
                    menuId: MenuId.InlineSuggestionToolbar,
                    title: nls.localize('accept', "Accept"),
                    group: 'primary',
                    order: 2,
                }, {
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('accept', "Accept"),
                    group: 'primary',
                    order: 2,
                }],
            kbOpts: [
                {
                    primary: 2 /* KeyCode.Tab */,
                    weight: 200,
                    kbExpr: ContextKeyExpr.or(ContextKeyExpr.and(InlineCompletionContextKeys.inlineSuggestionVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.inlineSuggestionHasIndentationLessThanTabSize), ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldAcceptInlineEdit)),
                }
            ],
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        if (controller) {
            controller.model.get()?.accept(controller.editor);
            controller.editor.focus();
        }
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: inlineSuggestCommitId,
    weight: 202, // greater than jump
    primary: 2 /* KeyCode.Tab */,
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor)
});
export class JumpToNextInlineEdit extends EditorAction {
    constructor() {
        super({
            id: jumpToNextInlineEditId,
            label: nls.localize2('action.inlineSuggest.jump', "Jump to next inline edit"),
            precondition: InlineCompletionContextKeys.inlineEditVisible,
            menuOpts: [{
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('jump', "Jump"),
                    group: 'primary',
                    order: 1,
                    when: InlineCompletionContextKeys.cursorAtInlineEdit.toNegated(),
                }],
            kbOpts: {
                primary: 2 /* KeyCode.Tab */,
                weight: 201,
                kbExpr: ContextKeyExpr.and(InlineCompletionContextKeys.inlineEditVisible, EditorContextKeys.tabMovesFocus.toNegated(), SuggestContext.Visible.toNegated(), EditorContextKeys.hoverFocused.toNegated(), InlineCompletionContextKeys.tabShouldJumpToInlineEdit),
            }
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        if (controller) {
            controller.jump();
        }
    }
}
export class AcceptNextInlineEditPart extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.acceptNextInlineEditPart',
            label: nls.localize2('action.inlineSuggest.acceptNextInlineEditPart', "Accept Next Inline Edit Part"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineEditVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                kbExpr: ContextKeyExpr.and(EditorContextKeys.writable, InlineCompletionContextKeys.inlineEditVisible),
            },
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.get(editor);
        await controller?.model.get()?.acceptNextInlineEditPart(controller.editor);
    }
}
export class HideInlineCompletion extends EditorAction {
    static { this.ID = hideInlineCompletionId; }
    constructor() {
        super({
            id: HideInlineCompletion.ID,
            label: nls.localize2('action.inlineSuggest.hide', "Hide Inline Suggestion"),
            precondition: ContextKeyExpr.or(InlineCompletionContextKeys.inlineSuggestionVisible, InlineCompletionContextKeys.inlineEditVisible),
            kbOpts: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 90, // same as hiding the suggest widget
                primary: 9 /* KeyCode.Escape */,
            },
            menuOpts: [{
                    menuId: MenuId.InlineEditsActions,
                    title: nls.localize('reject', "Reject"),
                    group: 'primary',
                    order: 3,
                }]
        });
    }
    async run(accessor, editor) {
        const controller = InlineCompletionsController.getInFocusedEditorOrParent(accessor);
        transaction(tx => {
            controller?.model.get()?.stop('explicitCancel', tx);
        });
        controller?.editor.focus();
    }
}
export class ToggleInlineCompletionShowCollapsed extends EditorAction {
    static { this.ID = toggleShowCollapsedId; }
    constructor() {
        super({
            id: ToggleInlineCompletionShowCollapsed.ID,
            label: nls.localize2('action.inlineSuggest.toggleShowCollapsed', "Toggle Inline Suggestions Show Collapsed"),
            precondition: ContextKeyExpr.true(),
        });
    }
    async run(accessor, editor) {
        const configurationService = accessor.get(IConfigurationService);
        const showCollapsed = configurationService.getValue('editor.inlineSuggest.edits.showCollapsed');
        configurationService.updateValue('editor.inlineSuggest.edits.showCollapsed', !showCollapsed);
    }
}
KeybindingsRegistry.registerKeybindingRule({
    id: HideInlineCompletion.ID,
    weight: -1, // very weak
    primary: 9 /* KeyCode.Escape */,
    secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    when: ContextKeyExpr.and(InlineCompletionContextKeys.inInlineEditsPreviewEditor)
});
export class ToggleAlwaysShowInlineSuggestionToolbar extends Action2 {
    static { this.ID = 'editor.action.inlineSuggest.toggleAlwaysShowToolbar'; }
    constructor() {
        super({
            id: ToggleAlwaysShowInlineSuggestionToolbar.ID,
            title: nls.localize('action.inlineSuggest.alwaysShowToolbar', "Always Show Toolbar"),
            f1: false,
            precondition: undefined,
            menu: [{
                    id: MenuId.InlineSuggestionToolbar,
                    group: 'secondary',
                    order: 10,
                }],
            toggled: ContextKeyExpr.equals('config.editor.inlineSuggest.showToolbar', 'always')
        });
    }
    async run(accessor) {
        const configService = accessor.get(IConfigurationService);
        const currentValue = configService.getValue('editor.inlineSuggest.showToolbar');
        const newValue = currentValue === 'always' ? 'onHover' : 'always';
        configService.updateValue('editor.inlineSuggest.showToolbar', newValue);
    }
}
export class DevExtractReproSample extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inlineSuggest.dev.extractRepro',
            label: nls.localize('action.inlineSuggest.dev.extractRepro', "Developer: Extract Inline Suggest State"),
            alias: 'Developer: Inline Suggest Extract Repro',
            precondition: InlineCompletionContextKeys.inlineEditVisible,
        });
    }
    async run(accessor, editor) {
        const clipboardService = accessor.get(IClipboardService);
        const controller = InlineCompletionsController.get(editor);
        const m = controller?.model.get();
        if (!m) {
            return;
        }
        const repro = m.extractReproSample();
        const inlineCompletionLines = splitLines(JSON.stringify({ inlineCompletion: repro.inlineCompletion }, null, 4));
        const json = inlineCompletionLines.map(l => '// ' + l).join('\n');
        const reproStr = `${repro.documentValue}\n\n// <json>\n${json}\n// </json>\n`;
        await clipboardService.writeText(reproStr);
        return { reproCase: reproStr };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy9icm93c2VyL2NvbnRyb2xsZXIvY29tbWFuZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDcEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDakcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBb0IsTUFBTSxrRUFBa0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFFN0csT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQW9CLE1BQU0seUNBQXlDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxjQUFjLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsZ0NBQWdDLEVBQUUsb0NBQW9DLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxp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