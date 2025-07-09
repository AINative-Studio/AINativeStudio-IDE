/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Menu, MenuItem } from 'electron';
import { validatedIpcMain } from '../../ipc/electron-main/ipcMain.js';
import { CONTEXT_MENU_CHANNEL, CONTEXT_MENU_CLOSE_CHANNEL } from '../common/contextmenu.js';
export function registerContextMenuListener() {
    validatedIpcMain.on(CONTEXT_MENU_CHANNEL, (event, contextMenuId, items, onClickChannel, options) => {
        const menu = createMenu(event, onClickChannel, items);
        menu.popup({
            x: options ? options.x : undefined,
            y: options ? options.y : undefined,
            positioningItem: options ? options.positioningItem : undefined,
            callback: () => {
                // Workaround for https://github.com/microsoft/vscode/issues/72447
                // It turns out that the menu gets GC'ed if not referenced anymore
                // As such we drag it into this scope so that it is not being GC'ed
                if (menu) {
                    event.sender.send(CONTEXT_MENU_CLOSE_CHANNEL, contextMenuId);
                }
            }
        });
    });
}
function createMenu(event, onClickChannel, items) {
    const menu = new Menu();
    items.forEach(item => {
        let menuitem;
        // Separator
        if (item.type === 'separator') {
            menuitem = new MenuItem({
                type: item.type,
            });
        }
        // Sub Menu
        else if (Array.isArray(item.submenu)) {
            menuitem = new MenuItem({
                submenu: createMenu(event, onClickChannel, item.submenu),
                label: item.label
            });
        }
        // Normal Menu Item
        else {
            menuitem = new MenuItem({
                label: item.label,
                type: item.type,
                accelerator: item.accelerator,
                checked: item.checked,
                enabled: item.enabled,
                visible: item.visible,
                click: (menuItem, win, contextmenuEvent) => event.sender.send(onClickChannel, item.id, contextmenuEvent)
            });
        }
        menu.append(menuitem);
    });
    return menu;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9jb250ZXh0bWVudS9lbGVjdHJvbi1tYWluL2NvbnRleHRtZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZ0IsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsMEJBQTBCLEVBQStDLE1BQU0sMEJBQTBCLENBQUM7QUFFekksTUFBTSxVQUFVLDJCQUEyQjtJQUMxQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxLQUFtQixFQUFFLGFBQXFCLEVBQUUsS0FBcUMsRUFBRSxjQUFzQixFQUFFLE9BQXVCLEVBQUUsRUFBRTtRQUNoTCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV0RCxJQUFJLENBQUMsS0FBSyxDQUFDO1lBQ1YsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNsQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ2xDLGVBQWUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDOUQsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDZCxrRUFBa0U7Z0JBQ2xFLGtFQUFrRTtnQkFDbEUsbUVBQW1FO2dCQUNuRSxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUM5RCxDQUFDO1lBQ0YsQ0FBQztTQUNELENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsVUFBVSxDQUFDLEtBQW1CLEVBQUUsY0FBc0IsRUFBRSxLQUFxQztJQUNyRyxNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDcEIsSUFBSSxRQUFrQixDQUFDO1FBRXZCLFlBQVk7UUFDWixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDL0IsUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDO2dCQUN2QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7YUFDZixDQUFDLENBQUM7UUFDSixDQUFDO1FBRUQsV0FBVzthQUNOLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN0QyxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQ3ZCLE9BQU8sRUFBRSxVQUFVLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO2dCQUN4RCxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7YUFDakIsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELG1CQUFtQjthQUNkLENBQUM7WUFDTCxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUM7Z0JBQ3ZCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztnQkFDN0IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87Z0JBQ3JCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztnQkFDckIsS0FBSyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsZ0JBQWdCLENBQUM7YUFDeEcsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==