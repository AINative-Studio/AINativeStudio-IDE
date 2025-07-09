/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { shell } from 'electron';
import { localize } from '../../../nls.js';
import { isWindows } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { createFileSystemProviderError, FileSystemProviderErrorCode } from '../common/files.js';
import { basename, normalize } from '../../../base/common/path.js';
import { AbstractDiskFileSystemProviderChannel, AbstractSessionFileWatcher } from '../node/diskFileSystemProviderServer.js';
import { DefaultURITransformer } from '../../../base/common/uriIpc.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
export class DiskFileSystemProviderChannel extends AbstractDiskFileSystemProviderChannel {
    constructor(provider, logService, environmentService) {
        super(provider, logService);
        this.environmentService = environmentService;
    }
    getUriTransformer(ctx) {
        return DefaultURITransformer;
    }
    transformIncoming(uriTransformer, _resource) {
        return URI.revive(_resource);
    }
    //#region Delete: override to support Electron's trash support
    async delete(uriTransformer, _resource, opts) {
        if (!opts.useTrash) {
            return super.delete(uriTransformer, _resource, opts);
        }
        const resource = this.transformIncoming(uriTransformer, _resource);
        const filePath = normalize(resource.fsPath);
        try {
            await shell.trashItem(filePath);
        }
        catch (error) {
            throw createFileSystemProviderError(isWindows ? localize('binFailed', "Failed to move '{0}' to the recycle bin ({1})", basename(filePath), toErrorMessage(error)) : localize('trashFailed', "Failed to move '{0}' to the trash ({1})", basename(filePath), toErrorMessage(error)), FileSystemProviderErrorCode.Unknown);
        }
    }
    //#endregion
    //#region File Watching
    createSessionFileWatcher(uriTransformer, emitter) {
        return new SessionFileWatcher(uriTransformer, emitter, this.logService, this.environmentService);
    }
}
class SessionFileWatcher extends AbstractSessionFileWatcher {
    watch(req, resource, opts) {
        if (opts.recursive) {
            throw createFileSystemProviderError('Recursive file watching is not supported from main process for performance reasons.', FileSystemProviderErrorCode.Unavailable);
        }
        return super.watch(req, resource, opts);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlza0ZpbGVTeXN0ZW1Qcm92aWRlclNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9maWxlcy9lbGVjdHJvbi1tYWluL2Rpc2tGaWxlU3lzdGVtUHJvdmlkZXJTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0MsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFrRCw2QkFBNkIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRWhKLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHbkUsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLDBCQUEwQixFQUF1QixNQUFNLHlDQUF5QyxDQUFDO0FBQ2pKLE9BQU8sRUFBRSxxQkFBcUIsRUFBbUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFdEUsTUFBTSxPQUFPLDZCQUE4QixTQUFRLHFDQUE4QztJQUVoRyxZQUNDLFFBQWdDLEVBQ2hDLFVBQXVCLEVBQ04sa0JBQXVDO1FBRXhELEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFGWCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXFCO0lBR3pELENBQUM7SUFFa0IsaUJBQWlCLENBQUMsR0FBWTtRQUNoRCxPQUFPLHFCQUFxQixDQUFDO0lBQzlCLENBQUM7SUFFa0IsaUJBQWlCLENBQUMsY0FBK0IsRUFBRSxTQUF3QjtRQUM3RixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELDhEQUE4RDtJQUUzQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQStCLEVBQUUsU0FBd0IsRUFBRSxJQUF3QjtRQUNsSCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDO1lBQ0osTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE1BQU0sNkJBQTZCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLCtDQUErQyxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFBRSx5Q0FBeUMsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsMkJBQTJCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDelQsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUFZO0lBRVosdUJBQXVCO0lBRWIsd0JBQXdCLENBQUMsY0FBK0IsRUFBRSxPQUF3QztRQUMzRyxPQUFPLElBQUksa0JBQWtCLENBQUMsY0FBYyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2xHLENBQUM7Q0FJRDtBQUVELE1BQU0sa0JBQW1CLFNBQVEsMEJBQTBCO0lBRWpELEtBQUssQ0FBQyxHQUFXLEVBQUUsUUFBYSxFQUFFLElBQW1CO1FBQzdELElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sNkJBQTZCLENBQUMscUZBQXFGLEVBQUUsMkJBQTJCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDckssQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pDLENBQUM7Q0FDRCJ9