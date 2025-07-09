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
import { dirname, join } from 'path';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { INativeServerExtensionManagementService } from '../../../../platform/extensionManagement/node/extensionManagementService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService, toFileOperationResult } from '../../../../platform/files/common/files.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
const defaultExtensionsInitStatusKey = 'initializing-default-extensions';
let DefaultExtensionsInitializer = class DefaultExtensionsInitializer extends Disposable {
    constructor(environmentService, extensionManagementService, storageService, fileService, logService) {
        super();
        this.environmentService = environmentService;
        this.extensionManagementService = extensionManagementService;
        this.fileService = fileService;
        this.logService = logService;
        if (isWindows && storageService.getBoolean(defaultExtensionsInitStatusKey, -1 /* StorageScope.APPLICATION */, true)) {
            storageService.store(defaultExtensionsInitStatusKey, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.initializeDefaultExtensions().then(() => storageService.store(defaultExtensionsInitStatusKey, false, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */));
        }
    }
    async initializeDefaultExtensions() {
        const extensionsLocation = this.getDefaultExtensionVSIXsLocation();
        let stat;
        try {
            stat = await this.fileService.resolve(extensionsLocation);
            if (!stat.children) {
                this.logService.debug('There are no default extensions to initialize', extensionsLocation.toString());
                return;
            }
        }
        catch (error) {
            if (toFileOperationResult(error) === 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.debug('There are no default extensions to initialize', extensionsLocation.toString());
                return;
            }
            this.logService.error('Error initializing extensions', error);
            return;
        }
        const vsixs = stat.children.filter(child => child.name.toLowerCase().endsWith('.vsix'));
        if (vsixs.length === 0) {
            this.logService.debug('There are no default extensions to initialize', extensionsLocation.toString());
            return;
        }
        this.logService.info('Initializing default extensions', extensionsLocation.toString());
        await Promise.all(vsixs.map(async (vsix) => {
            this.logService.info('Installing default extension', vsix.resource.toString());
            try {
                await this.extensionManagementService.install(vsix.resource, { donotIncludePackAndDependencies: true, keepExisting: false });
                this.logService.info('Default extension installed', vsix.resource.toString());
            }
            catch (error) {
                this.logService.error('Error installing default extension', vsix.resource.toString(), getErrorMessage(error));
            }
        }));
        this.logService.info('Default extensions initialized', extensionsLocation.toString());
    }
    getDefaultExtensionVSIXsLocation() {
        // appRoot = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\resources\app
        // extensionsPath = C:\Users\<name>\AppData\Local\Programs\Microsoft VS Code Insiders\bootstrap\extensions
        return URI.file(join(dirname(dirname(this.environmentService.appRoot)), 'bootstrap', 'extensions'));
    }
};
DefaultExtensionsInitializer = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, INativeServerExtensionManagementService),
    __param(2, IStorageService),
    __param(3, IFileService),
    __param(4, ILogService)
], DefaultExtensionsInitializer);
export { DefaultExtensionsInitializer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdEV4dGVuc2lvbnNJbml0aWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9jb250cmliL2RlZmF1bHRFeHRlbnNpb25zSW5pdGlhbGl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDckMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDbkcsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkVBQTZFLENBQUM7QUFDdEksT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUF1QixZQUFZLEVBQWEscUJBQXFCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNqSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEUsTUFBTSw4QkFBOEIsR0FBRyxpQ0FBaUMsQ0FBQztBQUVsRSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFDM0QsWUFDNkMsa0JBQTZDLEVBQy9CLDBCQUFtRSxFQUM1RyxjQUErQixFQUNqQixXQUF5QixFQUMxQixVQUF1QjtRQUVyRCxLQUFLLEVBQUUsQ0FBQztR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