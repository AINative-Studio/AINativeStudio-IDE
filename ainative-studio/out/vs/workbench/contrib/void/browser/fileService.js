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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvZmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWxHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUlsRSxNQUFNLHVCQUF3QixTQUFRLE9BQU87YUFDcEIsNkJBQXdCLEdBQUcscUJBQXFCLENBQUE7SUFFeEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUJBQXVCLENBQUMsd0JBQXdCO1lBQ3BELEtBQUssRUFBRSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUM7WUFDdkQsSUFBSSxFQUFFLENBQUM7b0JBQ04sRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlO29CQUMxQixLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsQ0FBQztpQkFDUixDQUFDO1NBQ0YsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFRO1FBQzdDLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDL0MsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDeEQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFFeEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRXhDLE1BQU0sVUFBVSxHQUFHO2dCQUNsQixXQUFXLEVBQUUsSUFBSTtnQkFDakIsZUFBZSxFQUFFLFNBQVM7YUFDakIsQ0FBQTtZQUVWLElBQUksQ0FBQyxHQUFXLHNCQUFzQixDQUFBO1lBQ3RDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNqQixDQUFDLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztvQkFDNUIsSUFBSSxFQUFFLE1BQU07b0JBQ1osR0FBRztvQkFDSCxRQUFRLEVBQUUsQ0FBQyxNQUFNLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO29CQUNqRixLQUFLLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLEdBQUc7aUJBQ3hDLEVBQUU7b0JBQ0YsVUFBVTtvQkFDVixtQkFBbUI7b0JBQ25CLFdBQVc7aUJBQ1gsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixDQUFDLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQztvQkFDNUIsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsR0FBRztpQkFDSCxFQUFFO29CQUNGLFVBQVU7b0JBQ1YsV0FBVztvQkFDWCxtQkFBbUI7aUJBQ25CLENBQUMsQ0FBQTtZQUNILENBQUM7WUFFRCxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUVwQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM5RCxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDOztBQUlGLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBIn0=