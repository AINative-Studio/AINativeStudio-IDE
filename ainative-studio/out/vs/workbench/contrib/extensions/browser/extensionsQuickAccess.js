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
var InstallExtensionQuickAccessProvider_1, ManageExtensionsQuickAccessProvider_1;
import { PickerQuickAccessProvider } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { localize } from '../../../../nls.js';
import { IExtensionGalleryService, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
let InstallExtensionQuickAccessProvider = class InstallExtensionQuickAccessProvider extends PickerQuickAccessProvider {
    static { InstallExtensionQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'ext install '; }
    constructor(extensionsWorkbenchService, galleryService, extensionsService, notificationService, logService) {
        super(InstallExtensionQuickAccessProvider_1.PREFIX);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.galleryService = galleryService;
        this.extensionsService = extensionsService;
        this.notificationService = notificationService;
        this.logService = logService;
    }
    _getPicks(filter, disposables, token) {
        // Nothing typed
        if (!filter) {
            return [{
                    label: localize('type', "Type an extension name to install or search.")
                }];
        }
        const genericSearchPickItem = {
            label: localize('searchFor', "Press Enter to search for extension '{0}'.", filter),
            accept: () => this.extensionsWorkbenchService.openSearch(filter)
        };
        // Extension ID typed: try to find it
        if (/\./.test(filter)) {
            return this.getPicksForExtensionId(filter, genericSearchPickItem, token);
        }
        // Extension name typed: offer to search it
        return [genericSearchPickItem];
    }
    async getPicksForExtensionId(filter, fallback, token) {
        try {
            const [galleryExtension] = await this.galleryService.getExtensions([{ id: filter }], token);
            if (token.isCancellationRequested) {
                return []; // return early if canceled
            }
            if (!galleryExtension) {
                return [fallback];
            }
            return [{
                    label: localize('install', "Press Enter to install extension '{0}'.", filter),
                    accept: () => this.installExtension(galleryExtension, filter)
                }];
        }
        catch (error) {
            if (token.isCancellationRequested) {
                return []; // expected error
            }
            this.logService.error(error);
            return [fallback];
        }
    }
    async installExtension(extension, name) {
        try {
            await this.extensionsWorkbenchService.openSearch(`@id:${name}`);
            await this.extensionsService.installFromGallery(extension);
        }
        catch (error) {
            this.notificationService.error(error);
        }
    }
};
InstallExtensionQuickAccessProvider = InstallExtensionQuickAccessProvider_1 = __decorate([
    __param(0, IExtensionsWorkbenchService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionManagementService),
    __param(3, INotificationService),
    __param(4, ILogService)
], InstallExtensionQuickAccessProvider);
export { InstallExtensionQuickAccessProvider };
let ManageExtensionsQuickAccessProvider = class ManageExtensionsQuickAccessProvider extends PickerQuickAccessProvider {
    static { ManageExtensionsQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'ext '; }
    constructor(extensionsWorkbenchService) {
        super(ManageExtensionsQuickAccessProvider_1.PREFIX);
        this.extensionsWorkbenchService = extensionsWorkbenchService;
    }
    _getPicks() {
        return [{
                label: localize('manage', "Press Enter to manage your extensions."),
                accept: () => this.extensionsWorkbenchService.openSearch('')
            }];
    }
};
ManageExtensionsQuickAccessProvider = ManageExtensionsQuickAccessProvider_1 = __decorate([
    __param(0, IExtensionsWorkbenchService)
], ManageExtensionsQuickAccessProvider);
export { ManageExtensionsQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBMEIseUJBQXlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUVqSSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDJCQUEyQixFQUFxQixNQUFNLHdFQUF3RSxDQUFDO0FBQ2xLLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVyRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUUvRCxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFvQyxTQUFRLHlCQUFpRDs7YUFFbEcsV0FBTSxHQUFHLGNBQWMsQUFBakIsQ0FBa0I7SUFFL0IsWUFDK0MsMEJBQXVELEVBQzFELGNBQXdDLEVBQ3JDLGlCQUE4QyxFQUNyRCxtQkFBeUMsRUFDbEQsVUFBdUI7UUFFckQsS0FBSyxDQUFDLHFDQUFtQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBTkosK0JBQTBCLEdBQTFCLDBCQUEwQixDQUE2QjtRQUMxRCxtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUE2QjtRQUNyRCx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBQ2xELGVBQVUsR0FBVixVQUFVLENBQWE7SUFHdEQsQ0FBQztJQUVTLFNBQVMsQ0FB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