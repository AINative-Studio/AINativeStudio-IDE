/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { URI } from '../../../../base/common/uri.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Schemas } from '../../../../base/common/network.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ExtensionsLocalizedLabel, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
export class OpenExtensionsFolderAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.openExtensionsFolder',
            title: localize2('openExtensionsFolder', 'Open Extensions Folder'),
            category: ExtensionsLocalizedLabel,
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const fileService = accessor.get(IFileService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        const extensionsHome = URI.file(environmentService.extensionsPath);
        const file = await fileService.resolve(extensionsHome);
        let itemToShow;
        if (file.children && file.children.length > 0) {
            itemToShow = file.children[0].resource;
        }
        else {
            itemToShow = extensionsHome;
        }
        if (itemToShow.scheme === Schemas.file) {
            return nativeHostService.showItemInFolder(itemToShow.fsPath);
        }
    }
}
export class CleanUpExtensionsFolderAction extends Action2 {
    constructor() {
        super({
            id: '_workbench.extensions.action.cleanUpExtensionsFolder',
            title: localize2('cleanUpExtensionsFolder', 'Cleanup Extensions Folder'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const extensionManagementService = accessor.get(IExtensionManagementService);
        return extensionManagementService.cleanUp();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2V4dGVuc2lvbnNBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzFILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFekUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDL0ksT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRTFGLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxPQUFPO0lBRXREO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtEQUFrRDtZQUN0RCxLQUFLLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLHdCQUF3QixDQUFDO1lBQ2xFLFFBQVEsRUFBRSx3QkFBd0I7WUFDbEMsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1FBRTVFLE1BQU0sY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbkUsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXZELElBQUksVUFBZSxDQUFDO1FBQ3BCLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDeEMsQ0FBQzthQUFNLENBQUM7WUFDUCxVQUFVLEdBQUcsY0FBYyxDQUFDO1FBQzdCLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3hDLE9BQU8saUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlELENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsT0FBTztJQUV6RDtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxzREFBc0Q7WUFDMUQsS0FBSyxFQUFFLFNBQVMsQ0FBQyx5QkFBeUIsRUFBRSwyQkFBMkIsQ0FBQztZQUN4RSxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLDBCQUEwQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM3RSxPQUFPLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzdDLENBQUM7Q0FDRCJ9