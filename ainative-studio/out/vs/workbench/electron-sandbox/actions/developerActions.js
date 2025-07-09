/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { Action2, MenuId } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IsDevelopmentContext } from '../../../platform/contextkey/common/contextkeys.js';
import { INativeWorkbenchEnvironmentService } from '../../services/environment/electron-sandbox/environmentService.js';
import { URI } from '../../../base/common/uri.js';
import { getActiveWindow } from '../../../base/browser/dom.js';
export class ToggleDevToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.toggleDevTools',
            title: localize2('toggleDevTools', 'Toggle Developer Tools'),
            category: Categories.Developer,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
                when: IsDevelopmentContext,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */ }
            },
            menu: {
                id: MenuId.MenubarHelpMenu,
                group: '5_tools',
                order: 1
            }
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        return nativeHostService.toggleDevTools({ targetWindowId: getActiveWindow().vscodeWindowId });
    }
}
export class ConfigureRuntimeArgumentsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.configureRuntimeArguments',
            title: localize2('configureRuntimeArguments', 'Configure Runtime Arguments'),
            category: Categories.Preferences,
            f1: true
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        await editorService.openEditor({
            resource: environmentService.argvResource,
            options: { pinned: true }
        });
    }
}
export class ReloadWindowWithExtensionsDisabledAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.reloadWindowWithExtensionsDisabled',
            title: localize2('reloadWindowWithExtensionsDisabled', 'Reload with Extensions Disabled'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        return accessor.get(INativeHostService).reload({ disableExtensions: true });
    }
}
export class OpenUserDataFolderAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.revealUserDataFolder',
            title: localize2('revealUserDataFolder', 'Reveal User Data Folder'),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        return nativeHostService.showItemInFolder(URI.file(environmentService.userDataPath).fsPath);
    }
}
export class ShowGPUInfoAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.showGPUInfo',
            title: localize2('showGPUInfo', 'Show GPU Info'),
            category: Categories.Developer,
            f1: true
        });
    }
    run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        nativeHostService.openGPUInfoWindow();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2ZWxvcGVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tc2FuZGJveC9hY3Rpb25zL2RldmVsb3BlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzVDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUV2RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUV2RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUUxRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUN2SCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRS9ELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxPQUFPO0lBRWhEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGlDQUFpQztZQUNyQyxLQUFLLEVBQUUsU0FBUyxDQUFDLGdCQUFnQixFQUFFLHdCQUF3QixDQUFDO1lBQzVELFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUztZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLFVBQVUsRUFBRTtnQkFDWCxNQUFNLEVBQUUsOENBQW9DLEVBQUU7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