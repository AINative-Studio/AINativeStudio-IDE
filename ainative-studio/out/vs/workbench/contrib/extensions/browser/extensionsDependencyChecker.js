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
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { MenuRegistry, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize } from '../../../../nls.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { Action } from '../../../../base/common/actions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Promises } from '../../../../base/common/async.js';
let ExtensionDependencyChecker = class ExtensionDependencyChecker extends Disposable {
    constructor(extensionService, extensionsWorkbenchService, notificationService, hostService) {
        super();
        this.extensionService = extensionService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.notificationService = notificationService;
        this.hostService = hostService;
        CommandsRegistry.registerCommand('workbench.extensions.installMissingDependencies', () => this.installMissingDependencies());
        MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
            command: {
                id: 'workbench.extensions.installMissingDependencies',
                category: localize('extensions', "Extensions"),
                title: localize('auto install missing deps', "Install Missing Dependencies")
            }
        });
    }
    async getUninstalledMissingDependencies() {
        const allMissingDependencies = await this.getAllMissingDependencies();
        const localExtensions = await this.extensionsWorkbenchService.queryLocal();
        return allMissingDependencies.filter(id => localExtensions.every(l => !areSameExtensions(l.identifier, { id })));
    }
    async getAllMissingDependencies() {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const runningExtensionsIds = this.extensionService.extensions.reduce((result, r) => { result.add(r.identifier.value.toLowerCase()); return result; }, new Set());
        const missingDependencies = new Set();
        for (const extension of this.extensionService.extensions) {
            if (extension.extensionDependencies) {
                extension.extensionDependencies.forEach(dep => {
                    if (!runningExtensionsIds.has(dep.toLowerCase())) {
                        missingDependencies.add(dep);
                    }
                });
            }
        }
        return [...missingDependencies.values()];
    }
    async installMissingDependencies() {
        const missingDependencies = await this.getUninstalledMissingDependencies();
        if (missingDependencies.length) {
            const extensions = await this.extensionsWorkbenchService.getExtensions(missingDependencies.map(id => ({ id })), CancellationToken.None);
            if (extensions.length) {
                await Promises.settled(extensions.map(extension => this.extensionsWorkbenchService.install(extension)));
                this.notificationService.notify({
                    severity: Severity.Info,
                    message: localize('finished installing missing deps', "Finished installing missing dependencies. Please reload the window now."),
                    actions: {
                        primary: [new Action('realod', localize('reload', "Reload Window"), '', true, () => this.hostService.reload())]
                    }
                });
            }
        }
        else {
            this.notificationService.info(localize('no missing deps', "There are no missing dependencies to install."));
        }
    }
};
ExtensionDependencyChecker = __decorate([
    __param(0, IExtensionService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, INotificationService),
    __param(3, IHostService)
], ExtensionDependencyChecker);
export { ExtensionDependencyChecker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0RlcGVuZGVuY3lDaGVja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvYnJvd3Nlci9leHRlbnNpb25zRGVwZW5kZW5jeUNoZWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDcEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDL0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVyRCxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFFekQsWUFDcUMsZ0JBQW1DLEVBQ3pCLDBCQUF1RCxFQUM5RCxtQkFB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