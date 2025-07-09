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
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
let CommentMenus = class CommentMenus {
    constructor(menuService) {
        this.menuService = menuService;
    }
    getCommentThreadTitleActions(contextKeyService) {
        return this.getMenu(MenuId.CommentThreadTitle, contextKeyService);
    }
    getCommentThreadActions(contextKeyService) {
        return this.getMenu(MenuId.CommentThreadActions, contextKeyService);
    }
    getCommentEditorActions(contextKeyService) {
        return this.getMenu(MenuId.CommentEditorActions, contextKeyService);
    }
    getCommentThreadAdditionalActions(contextKeyService) {
        return this.getMenu(MenuId.CommentThreadAdditionalActions, contextKeyService, { emitEventsForSubmenuChanges: true });
    }
    getCommentTitleActions(comment, contextKeyService) {
        return this.getMenu(MenuId.CommentTitle, contextKeyService);
    }
    getCommentActions(comment, contextKeyService) {
        return this.getMenu(MenuId.CommentActions, contextKeyService);
    }
    getCommentThreadTitleContextActions(contextKeyService) {
        return this.getActions(MenuId.CommentThreadTitleContext, contextKeyService, { shouldForwardArgs: true });
    }
    getMenu(menuId, contextKeyService, options) {
        return this.menuService.createMenu(menuId, contextKeyService, options);
    }
    getActions(menuId, contextKeyService, options) {
        return this.menuService.getMenuActions(menuId, contextKeyService, options).map((value) => value[1]).flat();
    }
    dispose() {
    }
};
CommentMenus = __decorate([
    __param(0, IMenuService)
], CommentMenus);
export { CommentMenus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE1lbnVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudE1lbnVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBaUQsWUFBWSxFQUFFLE1BQU0sRUFBcUMsTUFBTSxnREFBZ0QsQ0FBQztBQUdqSyxJQUFNLFlBQVksR0FBbEIsTUFBTSxZQUFZO0lBQ3hCLFlBQ2dDLFdBQXlCO1FBQXpCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQ3JELENBQUM7SUFFTCw0QkFBNEIsQ0FBQyxpQkFBcUM7UUFDakUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ25FLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxpQkFBcUM7UUFDNUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxpQkFBcUM7UUFDNUQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxpQ0FBaUMsQ0FBQyxpQkFBcUM7UUFDdEUsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRSxpQkFBaUIsRUFBRSxFQUFFLDJCQUEyQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDdEgsQ0FBQztJQUVELHNCQUFzQixDQUFDLE9BQWdCLEVBQUUsaUJBQXFDO1FBQzdFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVELGlCQUFpQixDQUFDLE9BQWdCLEVBQUUsaUJBQXFDO1FBQ3hFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDL0QsQ0FBQztJQUVELG1DQUFtQyxDQUFDLGlCQUFxQztRQUN4RSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLGlCQUFpQixFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUMxRyxDQUFDO0lBRU8sT0FBTyxDQUFDLE1BQWMsRUFBRSxpQkFBcUMsRUFBRSxPQUE0QjtRQUNsRyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRU8sVUFBVSxDQUFDLE1BQWMsRUFBRSxpQkFBcUMsRUFBRSxPQUE0QjtRQUNyRyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzVHLENBQUM7SUFFRCxPQUFPO0lBRVAsQ0FBQztDQUNELENBQUE7QUE1Q1ksWUFBWTtJQUV0QixXQUFBLFlBQVksQ0FBQTtHQUZGLFlBQVksQ0E0Q3hCIn0=