/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
import { USER_MANIFEST_CACHE_FILE } from '../../extensions/common/extensions.js';
import { toFileOperationResult } from '../../files/common/files.js';
export class ExtensionsManifestCache extends Disposable {
    constructor(userDataProfilesService, fileService, uriIdentityService, extensionsManagementService, logService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._register(extensionsManagementService.onDidInstallExtensions(e => this.onDidInstallExtensions(e)));
        this._register(extensionsManagementService.onDidUninstallExtension(e => this.onDidUnInstallExtension(e)));
    }
    onDidInstallExtensions(results) {
        for (const r of results) {
            if (r.local) {
                this.invalidate(r.profileLocation);
            }
        }
    }
    onDidUnInstallExtension(e) {
        if (!e.error) {
            this.invalidate(e.profileLocation);
        }
    }
    async invalidate(extensionsManifestLocation) {
        if (extensionsManifestLocation) {
            for (const profile of this.userDataProfilesService.profiles) {
                if (this.uriIdentityService.extUri.isEqual(profile.extensionsResource, extensionsManifestLocation)) {
                    await this.deleteUserCacheFile(profile);
                }
            }
        }
        else {
            await this.deleteUserCacheFile(this.userDataProfilesService.defaultProfile);
        }
    }
    async deleteUserCacheFile(profile) {
        try {
            await this.fileService.del(this.uriIdentityService.extUri.joinPath(profile.cacheHome, USER_MANIFEST_CACHE_FILE));
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01hbmlmZXN0Q2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9ub2RlL2V4dGVuc2lvbnNNYW5pZmVzdENhY2hlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUcvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQXFDLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFLdkcsTUFBTSxPQUFPLHVCQUF3QixTQUFRLFVBQVU7SUFFdEQsWUFDa0IsdUJBQWlELEVBQ2pELFdBQXlCLEVBQ3pCLGtCQUF1QyxFQUN4RCwyQkFBd0QsRUFDdkMsVUFBdUI7UUFFeEMsS0FBSyxFQUFFLENBQUM7UUFOUyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQ2pELGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ3pCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFFdkMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUd4QyxJQUFJLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4RyxJQUFJLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMzRyxDQUFDO0lBRU8sc0JBQXNCLENBQUMsT0FBMEM7UUFDeEUsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNwQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxDQUE2QjtRQUM1RCxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLDBCQUEyQztRQUMzRCxJQUFJLDBCQUEwQixFQUFFLENBQUM7WUFDaEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzdELElBQUksSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLDBCQUEwQixDQUFDLEVBQUUsQ0FBQztvQkFDcEcsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3pDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDN0UsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsbUJBQW1CLENBQUMsT0FBeUI7UUFDMUQsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUNsSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLHFCQUFxQixDQUFDLEtBQUssQ0FBQywrQ0FBdUMsRUFBRSxDQUFDO2dCQUN6RSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9