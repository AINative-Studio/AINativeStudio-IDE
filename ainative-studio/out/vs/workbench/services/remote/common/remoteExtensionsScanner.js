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
import { IRemoteAgentService } from './remoteAgentService.js';
import { IRemoteExtensionsScannerService, RemoteExtensionsScannerChannelName } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import * as platform from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IActiveLanguagePackService } from '../../localization/common/locale.js';
import { IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
let RemoteExtensionsScannerService = class RemoteExtensionsScannerService {
    constructor(remoteAgentService, environmentService, userDataProfileService, remoteUserDataProfilesService, activeLanguagePackService, extensionManagementService, logService) {
        this.remoteAgentService = remoteAgentService;
        this.environmentService = environmentService;
        this.userDataProfileService = userDataProfileService;
        this.remoteUserDataProfilesService = remoteUserDataProfilesService;
        this.activeLanguagePackService = activeLanguagePackService;
        this.extensionManagementService = extensionManagementService;
        this.logService = logService;
    }
    whenExtensionsReady() {
        return this.withChannel(channel => channel.call('whenExtensionsReady'), { failed: [] });
    }
    async scanExtensions() {
        try {
            const languagePack = await this.activeLanguagePackService.getExtensionIdProvidingCurrentLocale();
            return await this.withChannel(async (channel) => {
                const profileLocation = this.userDataProfileService.currentProfile.isDefault ? undefined : (await this.remoteUserDataProfilesService.getRemoteProfile(this.userDataProfileService.currentProfile)).extensionsResource;
                const scannedExtensions = await channel.call('scanExtensions', [
                    platform.language,
                    profileLocation,
                    this.extensionManagementService.getInstalledWorkspaceExtensionLocations(),
                    this.environmentService.extensionDevelopmentLocationURI,
                    languagePack
                ]);
                scannedExtensions.forEach((extension) => {
                    extension.extensionLocation = URI.revive(extension.extensionLocation);
                });
                return scannedExtensions;
            }, []);
        }
        catch (error) {
            this.logService.error(error);
            return [];
        }
    }
    withChannel(callback, fallback) {
        const connection = this.remoteAgentService.getConnection();
        if (!connection) {
            return Promise.resolve(fallback);
        }
        return connection.withChannel(RemoteExtensionsScannerChannelName, (channel) => callback(channel));
    }
};
RemoteExtensionsScannerService = __decorate([
    __param(0, IRemoteAgentService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IUserDataProfileService),
    __param(3, IRemoteUserDataProfilesService),
    __param(4, IActiveLanguagePackService),
    __param(5, IWorkbenchExtensionManagementService),
    __param(6, ILogService)
], RemoteExtensionsScannerService);
registerSingleton(IRemoteExtensionsScannerService, RemoteExtensionsScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3JlbW90ZS9jb21tb24vcmVtb3RlRXh0ZW5zaW9uc1NjYW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDOUQsT0FBTyxFQUFFLCtCQUErQixFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEosT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUdoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDMUYsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDeEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUkvRyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUE4QjtJQUluQyxZQUN1QyxrQkFBdUMsRUFDOUIsa0JBQWdELEVBQ3JELHNCQUErQyxFQUN4Qyw2QkFBNkQsRUFDakUseUJBQXFELEVBQzNDLDBCQUFnRSxFQUN6RixVQUF1QjtRQU5mLHVCQUFrQixHQUFsQixr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