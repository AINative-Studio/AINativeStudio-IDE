/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function isMenubarMenuItemSubmenu(menuItem) {
    return menuItem.submenu !== undefined;
}
export function isMenubarMenuItemSeparator(menuItem) {
    return menuItem.id === 'vscode.menubar.separator';
}
export function isMenubarMenuItemRecentAction(menuItem) {
    return menuItem.uri !== undefined;
}
export function isMenubarMenuItemAction(menuItem) {
    return !isMenubarMenuItemSubmenu(menuItem) && !isMenubarMenuItemSeparator(menuItem) && !isMenubarMenuItemRecentAction(menuItem);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9tZW51YmFyL2NvbW1vbi9tZW51YmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa0RoRyxNQUFNLFVBQVUsd0JBQXdCLENBQUMsUUFBeUI7SUFDakUsT0FBaUMsUUFBUyxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUM7QUFDbEUsQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxRQUF5QjtJQUNuRSxPQUFtQyxRQUFTLENBQUMsRUFBRSxLQUFLLDBCQUEwQixDQUFDO0FBQ2hGLENBQUM7QUFFRCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsUUFBeUI7SUFDdEUsT0FBc0MsUUFBUyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUM7QUFDbkUsQ0FBQztBQUVELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxRQUF5QjtJQUNoRSxPQUFPLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pJLENBQUMifQ==