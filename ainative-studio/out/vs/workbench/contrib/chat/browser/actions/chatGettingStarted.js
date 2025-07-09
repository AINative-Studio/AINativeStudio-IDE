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
var ChatGettingStartedContribution_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { ensureSideBarChatViewSize, showCopilotView } from '../chat.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
let ChatGettingStartedContribution = class ChatGettingStartedContribution extends Disposable {
    static { ChatGettingStartedContribution_1 = this; }
    static { this.ID = 'workbench.contrib.chatGettingStarted'; }
    static { this.hideWelcomeView = 'workbench.chat.hideWelcomeView'; }
    constructor(productService, extensionService, viewsService, extensionManagementService, storageService, viewDescriptorService, layoutService, configurationService, statusbarService) {
        super();
        this.productService = productService;
        this.extensionService = extensionService;
        this.viewsService = viewsService;
        this.extensionManagementService = extensionManagementService;
        this.storageService = storageService;
        this.viewDescriptorService = viewDescriptorService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.statusbarService = statusbarService;
        this.recentlyInstalled = false;
        const defaultChatAgent = this.productService.defaultChatAgent;
        const hideWelcomeView = this.storageService.getBoolean(ChatGettingStartedContribution_1.hideWelcomeView, -1 /* StorageScope.APPLICATION */, false);
        if (!defaultChatAgent || hideWelcomeView) {
            return;
        }
        this.registerListeners(defaultChatAgent);
    }
    registerListeners(defaultChatAgent) {
        this._register(this.extensionManagementService.onDidInstallExtensions(async (result) => {
            for (const e of result) {
                if (ExtensionIdentifier.equals(defaultChatAgent.extensionId, e.identifier.id) && e.operation === 2 /* InstallOperation.Install */) {
                    this.recentlyInstalled = true;
                    return;
                }
            }
        }));
        this._register(this.extensionService.onDidChangeExtensionsStatus(async (event) => {
            for (const ext of event) {
                if (ExtensionIdentifier.equals(defaultChatAgent.extensionId, ext.value)) {
                    const extensionStatus = this.extensionService.getExtensionsStatus();
                    if (extensionStatus[ext.value].activationTimes && this.recentlyInstalled) {
                        this.onDidInstallChat();
                        return;
                    }
                }
            }
        }));
    }
    async onDidInstallChat() {
        // Open Copilot view
        showCopilotView(this.viewsService, this.layoutService);
        const setupFromDialog = this.configurationService.getValue('chat.setupFromDialog');
        if (!setupFromDialog) {
            ensureSideBarChatViewSize(this.viewDescriptorService, this.layoutService, this.viewsService);
        }
        // Only do this once
        this.storageService.store(ChatGettingStartedContribution_1.hideWelcomeView, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this.recentlyInstalled = false;
        // Enable Copilot related UI if previously disabled
        this.statusbarService.updateEntryVisibility('chat.statusBarEntry', true);
        this.configurationService.updateValue('chat.commandCenter.enabled', true);
    }
};
ChatGettingStartedContribution = ChatGettingStartedContribution_1 = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionService),
    __param(2, IViewsService),
    __param(3, IExtensionManagementService),
    __param(4, IStorageService),
    __param(5, IViewDescriptorService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IConfigurationService),
    __param(8, IStatusbarService)
], ChatGettingStartedContribution);
export { ChatGettingStartedContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEdldHRpbmdTdGFydGVkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRHZXR0aW5nU3RhcnRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsMkJBQTJCLEVBQW9CLE1BQU0sMkVBQTJFLENBQUM7QUFDMUksT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUVqSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUVqRixJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLFVBQVU7O2FBQzdDLE9BQUUsR0FBRyxzQ0FBc0MsQUFBekMsQ0FBMEM7YUFHcEMsb0JBQWUsR0FBRyxnQ0FBZ0MsQUFB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