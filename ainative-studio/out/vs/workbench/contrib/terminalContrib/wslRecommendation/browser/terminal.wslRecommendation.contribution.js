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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { localize } from '../../../../../nls.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, NeverShowAgainScope, Severity } from '../../../../../platform/notification/common/notification.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { InstallRecommendedExtensionAction } from '../../../extensions/browser/extensionsActions.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
let TerminalWslRecommendationContribution = class TerminalWslRecommendationContribution extends Disposable {
    static { this.ID = 'terminalWslRecommendation'; }
    constructor(extensionManagementService, instantiationService, notificationService, productService, terminalService) {
        super();
        if (!isWindows) {
            return;
        }
        const exeBasedExtensionTips = productService.exeBasedExtensionTips;
        if (!exeBasedExtensionTips || !exeBasedExtensionTips.wsl) {
            return;
        }
        let listener = terminalService.onDidCreateInstance(async (instance) => {
            async function isExtensionInstalled(id) {
                const extensions = await extensionManagementService.getInstalled();
                return extensions.some(e => e.identifier.id === id);
            }
            if (!instance.shellLaunchConfig.executable || basename(instance.shellLaunchConfig.executable).toLowerCase() !== 'wsl.exe') {
                return;
            }
            listener?.dispose();
            listener = undefined;
            const extId = Object.keys(exeBasedExtensionTips.wsl.recommendations).find(extId => exeBasedExtensionTips.wsl.recommendations[extId].important);
            if (!extId || await isExtensionInstalled(extId)) {
                return;
            }
            notificationService.prompt(Severity.Info, localize('useWslExtension.title', "The '{0}' extension is recommended for opening a terminal in WSL.", exeBasedExtensionTips.wsl.friendlyName), [
                {
                    label: localize('install', 'Install'),
                    run: () => {
                        instantiationService.createInstance(InstallRecommendedExtensionAction, extId).run();
                    }
                }
            ], {
                sticky: true,
                neverShowAgain: { id: 'terminalConfigHelper/launchRecommendationsIgnore', scope: NeverShowAgainScope.APPLICATION },
                onCancel: () => { }
            });
        });
    }
};
TerminalWslRecommendationContribution = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, IInstantiationService),
    __param(2, INotificationService),
    __param(3, IProductService),
    __param(4, ITerminalService)
], TerminalWslRecommendationContribution);
export { TerminalWslRecommendationContribution };
registerWorkbenchContribution2(TerminalWslRecommendationContribution.ID, TerminalWslRecommendationContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwud3NsUmVjb21tZW5kYXRpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi93c2xSZWNvbW1lbmRhdGlvbi9icm93c2VyL3Rlcm1pbmFsLndzbFJlY29tbWVuZGF0aW9uLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFvQixNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNsSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLDhCQUE4QixFQUErQyxNQUFNLHFDQUFxQyxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWxFLElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXNDLFNBQVEsVUFBVTthQUM3RCxPQUFFLEdBQUcsMkJBQTJCLEFBQTlCLENBQStC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