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
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../../platform/notification/common/notification.js';
import { getInstalledExtensions } from '../../../extensions/common/extensionsUtils.js';
import { IWorkbenchExtensionEnablementService } from '../../../../services/extensionManagement/common/extensionManagement.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { Memento } from '../../../../common/memento.js';
import { distinct } from '../../../../../base/common/arrays.js';
function onExtensionChanged(accessor) {
    const extensionService = accessor.get(IExtensionManagementService);
    const extensionEnablementService = accessor.get(IWorkbenchExtensionEnablementService);
    const onDidInstallExtensions = Event.chain(extensionService.onDidInstallExtensions, $ => $.filter(e => e.some(({ operation }) => operation === 2 /* InstallOperation.Install */))
        .map(e => e.map(({ identifier }) => identifier)));
    return Event.debounce(Event.any(Event.any(onDidInstallExtensions, Event.map(extensionService.onDidUninstallExtension, e => [e.identifier])), Event.map(extensionEnablementService.onEnablementChanged, extensions => extensions.map(e => e.identifier))), (result, identifiers) => {
        result = result || (identifiers.length ? [identifiers[0]] : []);
        for (const identifier of identifiers) {
            if (result.some(l => !areSameExtensions(l, identifier))) {
                result.push(identifier);
            }
        }
        return result;
    });
}
const hasRecommendedKeymapKey = 'hasRecommendedKeymap';
let NotebookKeymapService = class NotebookKeymapService extends Disposable {
    constructor(instantiationService, extensionEnablementService, notificationService, storageService, lifecycleService) {
        super();
        this.instantiationService = instantiationService;
        this.extensionEnablementService = extensionEnablementService;
        this.notificationService = notificationService;
        this.notebookKeymapMemento = new Memento('notebookKeymap', storageService);
        this.notebookKeymap = this.notebookKeymapMemento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this._register(lifecycleService.onDidShutdown(() => this.dispose()));
        this._register(this.instantiationService.invokeFunction(onExtensionChanged)((identifiers => {
            Promise.all(identifiers.map(identifier => this.checkForOtherKeymaps(identifier)))
                .then(undefined, onUnexpectedError);
        })));
    }
    checkForOtherKeymaps(extensionIdentifier) {
        return this.instantiationService.invokeFunction(getInstalledExtensions).then(extensions => {
            const keymaps = extensions.filter(extension => isNotebookKeymapExtension(extension));
            const extension = keymaps.find(extension => areSameExtensions(extension.identifier, extensionIdentifier));
            if (extension && extension.globallyEnabled) {
                // there is already a keymap extension
                this.notebookKeymap[hasRecommendedKeymapKey] = true;
                this.notebookKeymapMemento.saveMemento();
                const otherKeymaps = keymaps.filter(extension => !areSameExtensions(extension.identifier, extensionIdentifier) && extension.globallyEnabled);
                if (otherKeymaps.length) {
                    return this.promptForDisablingOtherKeymaps(extension, otherKeymaps);
                }
            }
            return undefined;
        });
    }
    promptForDisablingOtherKeymaps(newKeymap, oldKeymaps) {
        const onPrompt = (confirmed) => {
            if (confirmed) {
                this.extensionEnablementService.setEnablement(oldKeymaps.map(keymap => keymap.local), 9 /* EnablementState.DisabledGlobally */);
            }
        };
        this.notificationService.prompt(Severity.Info, localize('disableOtherKeymapsConfirmation', "Disable other keymaps ({0}) to avoid conflicts between keybindings?", distinct(oldKeymaps.map(k => k.local.manifest.displayName)).map(name => `'${name}'`).join(', ')), [{
                label: localize('yes', "Yes"),
                run: () => onPrompt(true)
            }, {
                label: localize('no', "No"),
                run: () => onPrompt(false)
            }]);
    }
};
NotebookKeymapService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, INotificationService),
    __param(3, IStorageService),
    __param(4, ILifecycleService)
], NotebookKeymapService);
export { NotebookKeymapService };
export function isNotebookKeymapExtension(extension) {
    if (extension.local.manifest.extensionPack) {
        return false;
    }
    const keywords = extension.local.manifest.keywords;
    if (!keywords) {
        return false;
    }
    return keywords.indexOf('notebook-keymap') !== -1;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXltYXBTZXJ2aWNlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3NlcnZpY2VzL25vdGVib29rS2V5bWFwU2VydmljZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsc0JBQXNCLEVBQW9CLE1BQU0sK0NBQStDLENBQUM7QUFFekcsT0FBTyxFQUFtQixvQ0FBb0MsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQy9JLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBd0IsMkJBQTJCLEVBQW9CLE1BQU0sMkVBQTJFLENBQUM7QUFDaEssT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDbEgsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsT0FBTyxFQUFpQixNQUFNLCtCQUErQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxTQUFTLGtCQUFrQixDQUFDLFFBQTBCO0lBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ25FLE1BQU0sMEJBQTBCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBQ3RGLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUN2RixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMscUNBQTZCLENBQUMsQ0FBQztTQUM5RSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FDakQsQ0FBQztJQUNGLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBaUQsS0FBSyxDQUFDLEdBQUcsQ0FDOUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUMzRyxLQUFLLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUMxRyxFQUFFLENBQUMsTUFBMEMsRUFBRSxXQUFtQyxFQUFFLEVBQUU7UUFDdEYsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7WUFDdEMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN6RCxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxNQUFNLHVCQUF1QixHQUFHLHNCQUFzQixDQUFDO0FBRWhELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQU1wRCxZQUN5QyxvQkFBMkMsRUFDNUIsMEJBQWdFLEVBQ2hGLG1CQUF5QyxFQUMvRCxjQUErQixFQUM3QixnQkFBbUM7UUFFdEQsS0FBSyxFQUFFLENBQUM7UUFOZ0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM1QiwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQXNDO1FBQ2hGLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFNaEYsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsMERBQTBDLENBQUM7UUFFdEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1lBQzFGLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2lCQUMvRSxJQUFJLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztJQUVPLG9CQUFvQixDQUFDLG1CQUF5QztRQUNyRSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDekYsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDckYsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1lBQzFHLElBQUksU0FBUyxJQUFJLFNBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFDNUMsc0NBQXNDO2dCQUN0QyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsSUFBSSxDQUFDO2dCQUNwRCxJQUFJLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQzdJLElBQUksWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUN6QixPQUFPLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ3JFLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sOEJBQThCLENBQUMsU0FBMkIsRUFBRSxVQUE4QjtRQUNqRyxNQUFNLFFBQVEsR0FBRyxDQUFDLFNBQWtCLEVBQUUsRUFBRTtZQUN2QyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsMkNBQW1DLENBQUM7WUFDekgsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUscUVBQXFFLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDalEsQ0FBQztnQkFDQSxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7Z0JBQzdCLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO2FBQ3pCLEVBQUU7Z0JBQ0YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUMzQixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzthQUMxQixDQUFDLENBQ0YsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBM0RZLHFCQUFxQjtJQU8vQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsb0NBQW9DLENBQUE7SUFDcEMsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsaUJBQWlCLENBQUE7R0FYUCxxQkFBcUIsQ0EyRGpDOztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FBQyxTQUEyQjtJQUNwRSxJQUFJLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzVDLE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztJQUNuRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDZixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDIn0=