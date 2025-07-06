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
import { Schemas } from '../../../base/common/network.js';
import { isWeb } from '../../../base/common/platform.js';
import { isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../platform/commands/common/commands.js';
import { IExtensionGalleryService, IExtensionManagementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionManagementCLI } from '../../../platform/extensionManagement/common/extensionManagementCLI.js';
import { getExtensionId } from '../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { ILabelService } from '../../../platform/label/common/label.js';
import { AbstractMessageLogger } from '../../../platform/log/common/log.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IExtensionManagementServerService } from '../../services/extensionManagement/common/extensionManagement.js';
import { IExtensionManifestPropertiesService } from '../../services/extensions/common/extensionManifestPropertiesService.js';
// this class contains the commands that the CLI server is reying on
CommandsRegistry.registerCommand('_remoteCLI.openExternal', function (accessor, uri) {
    const openerService = accessor.get(IOpenerService);
    return openerService.open(isString(uri) ? uri : URI.revive(uri), { openExternal: true, allowTunneling: true });
});
CommandsRegistry.registerCommand('_remoteCLI.windowOpen', function (accessor, toOpen, options) {
    const commandService = accessor.get(ICommandService);
    if (!toOpen.length) {
        return commandService.executeCommand('_files.newWindow', options);
    }
    return commandService.executeCommand('_files.windowOpen', toOpen, options);
});
CommandsRegistry.registerCommand('_remoteCLI.getSystemStatus', function (accessor) {
    const commandService = accessor.get(ICommandService);
    return commandService.executeCommand('_issues.getSystemStatus');
});
CommandsRegistry.registerCommand('_remoteCLI.manageExtensions', async function (accessor, args) {
    const instantiationService = accessor.get(IInstantiationService);
    const extensionManagementServerService = accessor.get(IExtensionManagementServerService);
    const remoteExtensionManagementService = extensionManagementServerService.remoteExtensionManagementServer?.extensionManagementService;
    if (!remoteExtensionManagementService) {
        return;
    }
    const lines = [];
    const logger = new class extends AbstractMessageLogger {
        log(level, message) {
            lines.push(message);
        }
    }();
    const childInstantiationService = instantiationService.createChild(new ServiceCollection([IExtensionManagementService, remoteExtensionManagementService]));
    try {
        const cliService = childInstantiationService.createInstance(RemoteExtensionManagementCLI, logger);
        if (args.list) {
            await cliService.listExtensions(!!args.list.showVersions, args.list.category, undefined);
        }
        else {
            const revive = (inputs) => inputs.map(input => isString(input) ? input : URI.revive(input));
            if (Array.isArray(args.install) && args.install.length) {
                try {
                    await cliService.installExtensions(revive(args.install), [], { isMachineScoped: true }, !!args.force);
                }
                catch (e) {
                    lines.push(e.message);
                }
            }
            if (Array.isArray(args.uninstall) && args.uninstall.length) {
                try {
                    await cliService.uninstallExtensions(revive(args.uninstall), !!args.force, undefined);
                }
                catch (e) {
                    lines.push(e.message);
                }
            }
        }
        return lines.join('\n');
    }
    finally {
        childInstantiationService.dispose();
    }
});
let RemoteExtensionManagementCLI = class RemoteExtensionManagementCLI extends ExtensionManagementCLI {
    constructor(logger, extensionManagementService, extensionGalleryService, labelService, envService, _extensionManifestPropertiesService) {
        super(logger, extensionManagementService, extensionGalleryService);
        this._extensionManifestPropertiesService = _extensionManifestPropertiesService;
        const remoteAuthority = envService.remoteAuthority;
        this._location = remoteAuthority ? labelService.getHostLabel(Schemas.vscodeRemote, remoteAuthority) : undefined;
    }
    get location() {
        return this._location;
    }
    validateExtensionKind(manifest) {
        if (!this._extensionManifestPropertiesService.canExecuteOnWorkspace(manifest)
            // Web extensions installed on remote can be run in web worker extension host
            && !(isWeb && this._extensionManifestPropertiesService.canExecuteOnWeb(manifest))) {
            this.logger.info(localize('cannot be installed', "Cannot install the '{0}' extension because it is declared to not run in this setup.", getExtensionId(manifest.publisher, manifest.name)));
            return false;
        }
        return true;
    }
};
RemoteExtensionManagementCLI = __decorate([
    __param(1, IExtensionManagementService),
    __param(2, IExtensionGalleryService),
    __param(3, ILabelService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IExtensionManifestPropertiesService)
], RemoteExtensionManagementCLI);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENMSUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9kYXJ0aHZhZGVyL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDTElDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDJCQUEyQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUksT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDaEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBRXpHLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSx5REFBeUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHFCQUFxQixFQUFxQixNQUFNLHFDQUFxQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsNEJBQTRCLEVB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