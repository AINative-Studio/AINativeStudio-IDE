import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2, MenuId } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { messageOfSelection } from '../common/prompt/prompts.js';
import { IVoidModelService } from '../common/voidModelService.js';
class FilePromptActionService extends Action2 {
    static { this.VOID_COPY_FILE_PROMPT_ID = 'void.copyfileprompt'; }
    constructor() {
        super({
            id: FilePromptActionService.VOID_COPY_FILE_PROMPT_ID,
            title: localize2('voidCopyPrompt', 'Void: Copy Prompt'),
            menu: [{
                    id: MenuId.ExplorerContext,
                    group: '8_void',
                    order: 1,
                }]
        });
    }
    async run(accessor, uri) {
        try {
            const fileService = accessor.get(IFileService);
            const clipboardService = accessor.get(IClipboardService);
            const directoryStrService = accessor.get(IDirectoryStrService);
            const voidModelService = accessor.get(IVoidModelService);
            const stat = await fileService.stat(uri);
            const folderOpts = {
                maxChildren: 1000,
                maxCharsPerFile: 2_000_000,
            };
            let m = 'No contents detected';
            if (stat.isFile) {
                m = await messageOfSelection({
                    type: 'File',
                    uri,
                    language: (await voidModelService.getModelSafe(uri)).model?.getLanguageId() || '',
                    state: { wasAddedAsCurrentFile: false, },
                }, {
                    folderOpts,
                    directoryStrService,
                    fileService,
                });
            }
            if (stat.isDirectory) {
                m = await messageOfSelection({
                    type: 'Folder',
                    uri,
                }, {
                    folderOpts,
                    fileService,
                    directoryStrService,
                });
            }
            await clipboardService.writeText(m);
        }
        catch (error) {
            const notificationService = accessor.get(INotificationService);
            notificationService.error(error + '');
        }
    }
}
registerAction2(FilePromptActionService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2ZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUUvQyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDOUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFJbEUsTUFBTSx1QkFBd0IsU0FBUSxPQUFPO2FBQ3BCLDZCQUF3QixHQUFHLHFCQUFxQixDQUFBO0lBRXhFO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVCQUF1QixDQUFDLHdCQUF3QjtZQUNwRCxLQUFLLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLG1CQUFtQixDQUFDO1lBQ3ZELElBQUksRUFBRSxDQUFDO29CQUNOLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1IsQ0FBQztTQUNGLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBUTtRQUM3QyxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQy9DLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ3hELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBRXhELE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUV4QyxNQUFNLFVBQVUsR0FBRztnQkFDbEIsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLGVBQWUsRUFBRSxTQUFTO2FBQ2pCLENBQUE7WUFFVixJQUFJLENBQUMsR0FBVyxzQkFBc0IsQ0FBQTtZQUN0QyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakIsQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLENBQUM7b0JBQzVCLElBQUksRUFBRSxNQUFNO29CQUNaLEdBQUc7b0JBQ0gsUUFBUSxFQUFFLENBQUMsTUFBTSxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRTtvQkFDakYsS0FBSyxFQUFFLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxHQUFHO2lCQUN4QyxFQUFFO29CQUNGLFVBQVU7b0JBQ1YsbUJBQW1CO29CQUNuQixXQUFXO2lCQUNYLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLENBQUM7b0JBQzVCLElBQUksRUFBRSxRQUFRO29CQUNkLEdBQUc7aUJBQ0gsRUFBRTtvQkFDRixVQUFVO29CQUNWLFdBQVc7b0JBQ1gsbUJBQW1CO2lCQUNuQixDQUFDLENBQUE7WUFDSCxDQUFDO1lBRUQsTUFBTSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFcEMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDOUQsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUN0QyxDQUFDO0lBQ0YsQ0FBQzs7QUFJRixlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQSJ9