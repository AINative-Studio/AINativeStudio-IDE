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
import { isLinux } from '../../../../base/common/platform.js';
import { parse } from '../../../../base/common/jsonc.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IJSONEditingService } from '../../../services/configuration/common/jsonEditing.js';
let EncryptionContribution = class EncryptionContribution {
    constructor(jsonEditingService, environmentService, fileService, storageService) {
        this.jsonEditingService = jsonEditingService;
        this.environmentService = environmentService;
        this.fileService = fileService;
        this.storageService = storageService;
        this.migrateToGnomeLibsecret();
    }
    /**
     * Migrate the user from using the gnome or gnome-keyring password-store to gnome-libsecret.
     * TODO@TylerLeonhardt: This migration can be removed in 3 months or so and then storage
     * can be cleaned up.
     */
    async migrateToGnomeLibsecret() {
        if (!isLinux || this.storageService.getBoolean('encryption.migratedToGnomeLibsecret', -1 /* StorageScope.APPLICATION */, false)) {
            return;
        }
        try {
            const content = await this.fileService.readFile(this.environmentService.argvResource);
            const argv = parse(content.value.toString());
            if (argv['password-store'] === 'gnome' || argv['password-store'] === 'gnome-keyring') {
                this.jsonEditingService.write(this.environmentService.argvResource, [{ path: ['password-store'], value: 'gnome-libsecret' }], true);
            }
            this.storageService.store('encryption.migratedToGnomeLibsecret', true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        }
        catch (error) {
            console.error(error);
        }
    }
};
EncryptionContribution = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IEnvironmentService),
    __param(2, IFileService),
    __param(3, IStorageService)
], EncryptionContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(EncryptionContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jcnlwdGlvbi5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZW5jcnlwdGlvbi9lbGVjdHJvbi1zYW5kYm94L2VuY3J5cHRpb24uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBMkQsVUFBVSxJQUFJLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUksT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFHNUYsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBc0I7SUFDM0IsWUFDdUMsa0JBQXVDLEVBQ3ZDLGtCQUF1QyxFQUM5QyxXQUF5QixFQUN0QixjQUErQjtRQUgzQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO1FBQ3ZDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDOUMsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDdEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBRWpFLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssS0FBSyxDQUFDLHVCQUF1QjtRQUNwQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLHFDQUFxQyxxQ0FBNEIsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4SCxPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQztZQUNKLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3RGLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBZ0MsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQzVFLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssT0FBTyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLGVBQWUsRUFBRSxDQUFDO2dCQUN0RixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNySSxDQUFDO1lBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMscUNBQXFDLEVBQUUsSUFBSSxnRUFBK0MsQ0FBQztRQUN0SCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3RCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTlCSyxzQkFBc0I7SUFFekIsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsWUFBWSxDQUFBO0lBQ1osV0FBQSxlQUFlLENBQUE7R0FMWixzQkFBc0IsQ0E4QjNCO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQUMsc0JBQXNCLG9DQUE0QixDQUFDIn0=