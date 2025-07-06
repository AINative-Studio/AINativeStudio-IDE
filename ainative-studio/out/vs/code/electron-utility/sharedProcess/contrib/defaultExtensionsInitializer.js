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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdEV4dGVuc2lvbnNJbml0aWFsaXplci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL2NvZGUvZWxlY3Ryb24tdXRpbGl0eS9zaGFyZWRQcm9jZXNzL2NvbnRyaWIvZGVmYXVsdEV4dGVuc2lvbnNJbml0aWFsaXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUNyQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNuRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUN0SSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQXVCLFlBQVksRUFBYSxxQkFBcUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVwRSxNQUFNLDhCQUE4QixHQUFHLGlDQUFpQyxDQUFDO0FBRWxFLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTtJQUMzRCxZQUM2QyxrQkFBNkMsRUFDL0IsMEJBQW1FLEVBQzVHLGNBQStCLEVBQ2pCLFdBQXlCLEVBQzFCLFVBQXVCO1FBRXJELEtBQUssRUFBRSxDQUFDO1FB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