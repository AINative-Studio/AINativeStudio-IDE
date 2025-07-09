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
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { IExtensionTipsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionTipsService } from '../../../../platform/extensionManagement/common/extensionTipsService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Schemas } from '../../../../base/common/network.js';
let NativeExtensionTipsService = class NativeExtensionTipsService extends ExtensionTipsService {
    constructor(fileService, productService, sharedProcessService) {
        super(fileService, productService);
        this.channel = sharedProcessService.getChannel('extensionTipsService');
    }
    getConfigBasedTips(folder) {
        if (folder.scheme === Schemas.file) {
            return this.channel.call('getConfigBasedTips', [folder]);
        }
        return super.getConfigBasedTips(folder);
    }
    getImportantExecutableBasedTips() {
        return this.channel.call('getImportantExecutableBasedTips');
    }
    getOtherExecutableBasedTips() {
        return this.channel.call('getOtherExecutableBasedTips');
    }
};
NativeExtensionTipsService = __decorate([
    __param(0, IFileService),
    __param(1, IProductService),
    __param(2, ISharedProcessService)
], NativeExtensionTipsService);
registerSingleton(IExtensionTipsService, NativeExtensionTipsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uVGlwc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbk1hbmFnZW1lbnQvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25UaXBzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFOUYsT0FBTyxFQUFFLHFCQUFxQixFQUEwRCxNQUFNLHdFQUF3RSxDQUFDO0FBRXZLLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQy9HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDeEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTdELElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsb0JBQW9CO0lBSTVELFlBQ2UsV0FBeUIsRUFDdEIsY0FBK0IsRUFDekIsb0JBQTJDO1FBRWxFLEtBQUssQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRVEsa0JBQWtCLENBQUMsTUFBVztRQUN0QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQTZCLG9CQUFvQixFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVRLCtCQUErQjtRQUN2QyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFpQyxpQ0FBaUMsQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFFUSwyQkFBMkI7UUFDbkMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBaUMsNkJBQTZCLENBQUMsQ0FBQztJQUN6RixDQUFDO0NBRUQsQ0FBQTtBQTVCSywwQkFBMEI7SUFLN0IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEscUJBQXFCLENBQUE7R0FQbEIsMEJBQTBCLENBNEIvQjtBQUVELGlCQUFpQixDQUFDLHFCQUFxQixFQUFFLDBCQUEwQixvQ0FBNEIsQ0FBQyJ9