/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getErrorMessage } from '../../../../base/common/errors.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { FileSystemProviderErrorCode, IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
/**
 * An extension storage has following
 * 	- State: Stored using storage service with extension id as key and state as value.
 *  - Resources: Stored under a location scoped to the extension.
 */
export async function migrateExtensionStorage(fromExtensionId, toExtensionId, global, instantionService) {
    return instantionService.invokeFunction(async (serviceAccessor) => {
        const environmentService = serviceAccessor.get(IEnvironmentService);
        const userDataProfilesService = serviceAccessor.get(IUserDataProfilesService);
        const extensionStorageService = serviceAccessor.get(IExtensionStorageService);
        const storageService = serviceAccessor.get(IStorageService);
        const uriIdentityService = serviceAccessor.get(IUriIdentityService);
        const fileService = serviceAccessor.get(IFileService);
        const workspaceContextService = serviceAccessor.get(IWorkspaceContextService);
        const logService = serviceAccessor.get(ILogService);
        const storageMigratedKey = `extensionStorage.migrate.${fromExtensionId}-${toExtensionId}`;
        const migrateLowerCaseStorageKey = fromExtensionId.toLowerCase() === toExtensionId.toLowerCase() ? `extension.storage.migrateFromLowerCaseKey.${fromExtensionId.toLowerCase()}` : undefined;
        if (fromExtensionId === toExtensionId) {
            return;
        }
        const getExtensionStorageLocation = (extensionId, global) => {
            if (global) {
                return uriIdentityService.extUri.joinPath(userDataProfilesService.defaultProfile.globalStorageHome, extensionId.toLowerCase() /* Extension id is lower cased for global storage */);
            }
            return uriIdentityService.extUri.joinPath(environmentService.workspaceStorageHome, workspaceContextService.getWorkspace().id, extensionId);
        };
        const storageScope = global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */;
        if (!storageService.getBoolean(storageMigratedKey, storageScope, false) && !(migrateLowerCaseStorageKey && storageService.getBoolean(migrateLowerCaseStorageKey, storageScope, false))) {
            logService.info(`Migrating ${global ? 'global' : 'workspace'} extension storage from ${fromExtensionId} to ${toExtensionId}...`);
            // Migrate state
            const value = extensionStorageService.getExtensionState(fromExtensionId, global);
            if (value) {
                extensionStorageService.setExtensionState(toExtensionId, value, global);
                extensionStorageService.setExtensionState(fromExtensionId, undefined, global);
            }
            // Migrate stored files
            const fromPath = getExtensionStorageLocation(fromExtensionId, global);
            const toPath = getExtensionStorageLocation(toExtensionId, global);
            if (!uriIdentityService.extUri.isEqual(fromPath, toPath)) {
                try {
                    await fileService.move(fromPath, toPath, true);
                }
                catch (error) {
                    if (error.code !== FileSystemProviderErrorCode.FileNotFound) {
                        logService.info(`Error while migrating ${global ? 'global' : 'workspace'} file storage from '${fromExtensionId}' to '${toExtensionId}'`, getErrorMessage(error));
                    }
                }
            }
            logService.info(`Migrated ${global ? 'global' : 'workspace'} extension storage from ${fromExtensionId} to ${toExtensionId}`);
            storageService.store(storageMigratedKey, true, storageScope, 1 /* StorageTarget.MACHINE */);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZU1pZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uU3RvcmFnZU1pZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDL0csT0FBTyxFQUEyQiwyQkFBMkIsRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVoSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUU5Rjs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSx1QkFBdUIsQ0FBQyxlQUF1QixFQUFFLGFBQXFCLEVBQUUsTUFBZSxFQUFFLGlCQUF3QztJQUN0SixPQUFPLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUMsZUFBZSxFQUFDLEVBQUU7UUFDL0QsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDcEUsTUFBTSx1QkFBdUIsR0FBRyxlQUFlLENB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