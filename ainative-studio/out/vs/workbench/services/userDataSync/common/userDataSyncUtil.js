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
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IUserDataSyncUtilService, getDefaultIgnoredSettings } from '../../../../platform/userDataSync/common/userDataSync.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { ITextResourcePropertiesService, ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
let UserDataSyncUtilService = class UserDataSyncUtilService {
    constructor(keybindingsService, textModelService, textResourcePropertiesService, textResourceConfigurationService) {
        this.keybindingsService = keybindingsService;
        this.textModelService = textModelService;
        this.textResourcePropertiesService = textResourcePropertiesService;
        this.textResourceConfigurationService = textResourceConfigurationService;
    }
    async resolveDefaultCoreIgnoredSettings() {
        return getDefaultIgnoredSettings(true);
    }
    async resolveUserBindings(userBindings) {
        const keys = {};
        for (const userbinding of userBindings) {
            keys[userbinding] = this.keybindingsService.resolveUserBinding(userbinding).map(part => part.getUserSettingsLabel()).join(' ');
        }
        return keys;
    }
    async resolveFormattingOptions(resource) {
        try {
            const modelReference = await this.textModelService.createModelReference(resource);
            const { insertSpaces, tabSize } = modelReference.object.textEditorModel.getOptions();
            const eol = modelReference.object.textEditorModel.getEOL();
            modelReference.dispose();
            return { eol, insertSpaces, tabSize };
        }
        catch (e) {
        }
        return {
            eol: this.textResourcePropertiesService.getEOL(resource),
            insertSpaces: !!this.textResourceConfigurationService.getValue(resource, 'editor.insertSpaces'),
            tabSize: this.textResourceConfigurationService.getValue(resource, 'editor.tabSize')
        };
    }
};
UserDataSyncUtilService = __decorate([
    __param(0, IKeybindingService),
    __param(1, ITextModelService),
    __param(2, ITextResourcePropertiesService),
    __param(3, ITextResourceConfigurationService)
], UserDataSyncUtilService);
registerSingleton(IUserDataSyncUtilService, UserDataSyncUtilService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNVdGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRS9ILE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUcvRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsOEJBQThCLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUVwSixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQUk1QixZQUNzQyxrQkFBc0MsRUFDdkMsZ0JBQW1DLEVBQ3RCLDZCQUE2RCxFQUMxRCxnQ0FBbUU7UUFIbEYsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUN2QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3RCLGtDQUE2QixHQUE3Qiw2QkFBNkIsQ0FBZ0M7UUFDMUQscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztJQUNwSCxDQUFDO0lBRUwsS0FBSyxDQUFDLGlDQUFpQztRQUN0QyxPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsWUFBc0I7UUFDL0MsTUFBTSxJQUFJLEdBQThCLEVBQUUsQ0FBQztRQUMzQyxLQUFLLE1BQU0sV0FBVyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEksQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxRQUFhO1FBQzNDLElBQUksQ0FBQztZQUNKLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xGLE1BQU0sRUFBRSxZQUFZLEVBQUUsT0FBTyxFQUFFLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckYsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDM0QsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLE9BQU8sRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQ3ZDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU87WUFDTixHQUFHLEVBQUUsSUFBSSxDQUFDLDZCQUE2QixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFDeEQsWUFBWSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxxQkFBcUIsQ0FBQztZQUMvRixPQUFPLEVBQUUsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUM7U0FDbkYsQ0FBQztJQUNILENBQUM7Q0FFRCxDQUFBO0FBdkNLLHVCQUF1QjtJQUsxQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSw4QkFBOEIsQ0FBQTtJQUM5QixXQUFBLGlDQUFpQyxDQUFBO0dBUjlCLHVCQUF1QixDQXVDNUI7QUFFRCxpQkFBaUIsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsb0NBQTRCLENBQUMifQ==