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
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ListResizeColumnAction } from './listResizeColumnAction.js';
let ListContext = class ListContext {
    static { this.ID = 'workbench.contrib.listContext'; }
    constructor(contextKeyService) {
        contextKeyService.createKey('listSupportsTypeNavigation', true);
        // @deprecated in favor of listSupportsTypeNavigation
        contextKeyService.createKey('listSupportsKeyboardNavigation', true);
    }
};
ListContext = __decorate([
    __param(0, IContextKeyService)
], ListContext);
export { ListContext };
registerWorkbenchContribution2(ListContext.ID, ListContext, 1 /* WorkbenchPhase.BlockStartup */);
registerAction2(ListResizeColumnAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlzdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbGlzdC9icm93c2VyL2xpc3QuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBMEMsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFOUQsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBVzthQUVQLE9BQUUsR0FBRywrQkFBK0IsQUFBbEMsQ0FBbUM7SUFFckQsWUFDcUIsaUJBQXFDO1FBRXpELGlCQUFpQixDQUFDLFNBQVMsQ0FBVSw0QkFBNEIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV6RSxxREFBcUQ7UUFDckQsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGdDQUFnQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JFLENBQUM7O0FBWFcsV0FBVztJQUtyQixXQUFBLGtCQUFrQixDQUFBO0dBTFIsV0FBVyxDQVl2Qjs7QUFFRCw4QkFBOEIsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLFdBQVcsc0NBQThCLENBQUM7QUFDekYsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUMifQ==