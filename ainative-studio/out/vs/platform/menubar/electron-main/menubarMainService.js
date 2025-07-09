/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { createDecorator, IInstantiationService } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService } from '../../lifecycle/electron-main/lifecycleMainService.js';
import { ILogService } from '../../log/common/log.js';
import { Menubar } from './menubar.js';
import { Disposable } from '../../../base/common/lifecycle.js';
export const IMenubarMainService = createDecorator('menubarMainService');
let MenubarMainService = class MenubarMainService extends Disposable {
    constructor(instantiationService, lifecycleMainService, logService) {
        super();
        this.instantiationService = instantiationService;
        this.lifecycleMainService = lifecycleMainService;
        this.logService = logService;
        this.menubar = this.installMenuBarAfterWindowOpen();
    }
    async installMenuBarAfterWindowOpen() {
        await this.lifecycleMainService.when(3 /* LifecycleMainPhase.AfterWindowOpen */);
        return this._register(this.instantiationService.createInstance(Menubar));
    }
    async updateMenubar(windowId, menus) {
        this.logService.trace('menubarService#updateMenubar', windowId);
        const menubar = await this.menubar;
        menubar.updateMenu(menus, windowId);
    }
};
MenubarMainService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILifecycleMainService),
    __param(2, ILogService)
], MenubarMainService);
export { MenubarMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudWJhck1haW5TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21lbnViYXIvZWxlY3Ryb24tbWFpbi9tZW51YmFyTWFpblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBc0IsTUFBTSx1REFBdUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUN2QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFL0QsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFDO0FBTXZGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQU1qRCxZQUN5QyxvQkFBMkMsRUFDM0Msb0JBQTJDLEVBQ3JELFVBQXVCO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSmdDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDM0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUNyRCxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBSXJELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLDZCQUE2QixFQUFFLENBQUM7SUFDckQsQ0FBQztJQUVPLEtBQUssQ0FBQyw2QkFBNkI7UUFDMUMsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSw0Q0FBb0MsQ0FBQztRQUV6RSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQWdCLEVBQUUsS0FBbUI7UUFDeEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFaEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7Q0FDRCxDQUFBO0FBNUJZLGtCQUFrQjtJQU81QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxXQUFXLENBQUE7R0FURCxrQkFBa0IsQ0E0QjlCIn0=