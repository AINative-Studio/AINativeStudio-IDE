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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvdGVzdC9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9maWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFL0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBSWxFLE1BQU0sdUJBQXdCLFNBQVEsT0FBTzthQUNwQiw2QkFBd0IsR0FBRyxxQkFBcUIsQ0FBQTtJQUV4RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyx3QkFBd0I7WUFDcEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxtQkFBbUIsQ0FBQztZQUN2RCxJQUFJLEVBQUUsQ0FBQztvQkFDTixFQUFFLEVBQUUsTUFBTSxDQUFDLGVBQWU7b0JBQzFCLEtBQUssRUFBRSxRQUFRO29CQUNmLEtBQUssRUFBRSxDQUFDO2lCQUNSLENBQUM7U0FDRixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQixFQUFFLEdBQVE7UUFDN0MsSUFBSSxDQUFDO1lBQ0osTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUN4RCxNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM5RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtZQUV4RCxNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFeEMsTUFBTSxVQUFVLEdBQUc7Z0JBQ2xCLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixlQUFlLEVBQUUsU0FBUzthQUNqQixDQUFBO1lBRVYsSUFBSSxDQUFDLEdBQVcsc0JBQXNCLENBQUE7WUFDdEMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pCLENBQUMsR0FBRyxNQUFNLGtCQUFrQixDQUFDO29CQUM1QixJQUFJLEVBQUUsTUFBTTtvQkFDWixHQUFHO29CQUNILFFBQVEsRUFBRSxDQUFDLE1BQU0sZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUU7b0JBQ2pGLEtBQUssRUFBRSxFQUFFLHFCQUFxQixFQUFFLEtBQUssR0FBRztpQkFDeEMsRUFBRTtvQkFDRixVQUFVO29CQUNWLG1CQUFtQjtvQkFDbkIsV0FBVztpQkFDWCxDQUFDLENBQUE7WUFDSCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3RCLENBQUMsR0FBRyxNQUFNLGtCQUFrQixDQUFDO29CQUM1QixJQUFJLEVBQUUsUUFBUTtvQkFDZCxHQUFHO2lCQUNILEVBQUU7b0JBQ0YsVUFBVTtvQkFDVixXQUFXO29CQUNYLG1CQUFtQjtpQkFDbkIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztZQUVELE1BQU0sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXBDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlELG1CQUFtQixDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDdEMsQ0FBQztJQUNGLENBQUM7O0FBSUYsZUFBZSxDQUFDLHVCQUF1QixDQUFDLENBQUEifQ==