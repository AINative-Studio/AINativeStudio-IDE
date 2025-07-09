/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
registerEditorAction(class FormatDocumentMultipleAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatDocument.none',
            label: nls.localize2('formatDocument.label.multiple', "Format Document"),
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasDocumentFormattingProvider.toNegated()),
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 512 /* KeyMod.Alt */ | 36 /* KeyCode.KeyF */,
                linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */ },
                weight: 100 /* KeybindingWeight.EditorContrib */,
            }
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const commandService = accessor.get(ICommandService);
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const notificationService = accessor.get(INotificationService);
        const dialogService = accessor.get(IDialogService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const model = editor.getModel();
        const formatterCount = languageFeaturesService.documentFormattingEditProvider.all(model).length;
        if (formatterCount > 1) {
            return commandService.executeCommand('editor.action.formatDocument.multiple');
        }
        else if (formatterCount === 1) {
            return commandService.executeCommand('editor.action.formatDocument');
        }
        else if (model.isTooLargeForSyncing()) {
            notificationService.warn(nls.localize('too.large', "This file cannot be formatted because it is too large"));
        }
        else {
            const langName = model.getLanguageId();
            const message = nls.localize('no.provider', "There is no formatter for '{0}' files installed.", langName);
            const { confirmed } = await dialogService.confirm({
                message,
                primaryButton: nls.localize({ key: 'install.formatter', comment: ['&& denotes a mnemonic'] }, "&&Install Formatter...")
            });
            if (confirmed) {
                extensionsWorkbenchService.openSearch(`category:formatters ${langName}`);
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybWF0QWN0aW9uc05vbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZm9ybWF0L2Jyb3dzZXIvZm9ybWF0QWN0aW9uc05vbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBb0IsTUFBTSxnREFBZ0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNuRixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUV0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRWxHLG9CQUFvQixDQUFDLE1BQU0sNEJBQTZCLFNBQVEsWUFBWTtJQUUzRTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtQ0FBbUM7WUFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsK0JBQStCLEVBQUUsaUJBQWlCLENBQUM7WUFDeEUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLGlCQUFpQixDQUFDLDZCQUE2QixDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3pILE1BQU0sRUFBRTtnQkFDUCxNQUFNLEVBQUUsaUJBQWlCLENBQUMsZUFBZTtnQkFDekMsT0FBTyxFQUFFLDhDQUF5Qix3QkFBZTtnQkFDakQsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLG1EQUE2Qix3QkFBZSxFQUFFO2dCQUNoRSxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hCLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNyRCxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3RSxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUMvRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRXZFLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoQyxNQUFNLGNBQWMsR0FBRyx1QkFBdUIsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBRWhHLElBQUksY0FBYyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sY0FBYyxDQUFDLGNBQWMsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO1FBQy9FLENBQUM7YUFBTSxJQUFJLGNBQWMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxPQUFPLGNBQWMsQ0FBQyxjQUFjLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUN0RSxDQUFDO2FBQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSx1REFBdUQsQ0FBQyxDQUFDLENBQUM7UUFDOUcsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDdkMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsa0RBQWtELEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUcsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sYUFBYSxDQUFDLE9BQU8sQ0FBQztnQkFDakQsT0FBTztnQkFDUCxhQUFhLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsd0JBQXdCLENBQUM7YUFDdkgsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZiwwQkFBMEIsQ0FBQyxVQUFVLENBQUMsdUJBQXVCLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDMUUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQyxDQUFDIn0=