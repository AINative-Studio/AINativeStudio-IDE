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
import { localize } from '../../../../nls.js';
import { randomPath } from '../../../../base/common/extpath.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IElevatedFileService } from '../common/elevatedFileService.js';
import { isWindows } from '../../../../base/common/platform.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
let NativeElevatedFileService = class NativeElevatedFileService {
    constructor(nativeHostService, fileService, environmentService, workspaceTrustRequestService, labelService) {
        this.nativeHostService = nativeHostService;
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.labelService = labelService;
    }
    isSupported(resource) {
        // Saving elevated is currently only supported for local
        // files for as long as we have no generic support from
        // the file service
        // (https://github.com/microsoft/vscode/issues/48659)
        return resource.scheme === Schemas.file;
    }
    async writeFileElevated(resource, value, options) {
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: isWindows ? localize('fileNotTrustedMessageWindows', "You are about to save '{0}' as admin.", this.labelService.getUriLabel(resource)) : localize('fileNotTrustedMessagePosix', "You are about to save '{0}' as super user.", this.labelService.getUriLabel(resource)),
        });
        if (!trusted) {
            throw new Error(localize('fileNotTrusted', "Workspace is not trusted."));
        }
        const source = URI.file(randomPath(this.environmentService.userDataPath, 'code-elevated'));
        try {
            // write into a tmp file first
            await this.fileService.writeFile(source, value, options);
            // then sudo prompt copy
            await this.nativeHostService.writeElevated(source, resource, options);
        }
        finally {
            // clean up
            await this.fileService.del(source);
        }
        return this.fileService.resolve(resource, { resolveMetadata: true });
    }
};
NativeElevatedFileService = __decorate([
    __param(0, INativeHostService),
    __param(1, IFileService),
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IWorkspaceTrustRequestService),
    __param(4, ILabelService)
], NativeElevatedFileService);
export { NativeElevatedFileService };
registerSingleton(IElevatedFileService, NativeElevatedFileService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxldmF0ZWRGaWxlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZmlsZXMvZWxlY3Ryb24tc2FuZGJveC9lbGV2YXRlZEZpbGVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsWUFBWSxFQUE0QyxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BILE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN4RyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM5RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3BFLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBSXJDLFlBQ3NDLGlCQUFxQyxFQUMzQyxXQUF5QixFQUNILGtCQUFzRCxFQUMzRCw0QkFBMkQsRUFDM0UsWUFBMkI7UUFKdEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUMzQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNILHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0M7UUFDM0QsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUMzRSxpQkFBWSxHQUFaLFlBQVksQ0FBZTtJQUN4RCxDQUFDO0lBRUwsV0FBVyxDQUFDLFFBQWE7UUFDeEIsd0RBQXdEO1FBQ3hELHVEQUF1RDtRQUN2RCxtQkFBbUI7UUFDbkIscURBQXFEO1FBQ3JELE9BQU8sUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsUUFBYSxFQUFFLEtBQTJELEVBQUUsT0FBMkI7UUFDOUgsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsNEJBQTRCLENBQUMscUJBQXFCLENBQUM7WUFDN0UsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHVDQUF1QyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSw0Q0FBNEMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMvUSxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUM7WUFDSiw4QkFBOEI7WUFDOUIsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRXpELHdCQUF3QjtZQUN4QixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RSxDQUFDO2dCQUFTLENBQUM7WUFFVixXQUFXO1lBQ1gsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDO0NBQ0QsQ0FBQTtBQTNDWSx5QkFBeUI7SUFLbkMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0NBQWtDLENBQUE7SUFDbEMsV0FBQSw2QkFBNkIsQ0FBQTtJQUM3QixXQUFBLGFBQWEsQ0FBQTtHQVRILHlCQUF5QixDQTJDckM7O0FBRUQsaUJBQWlCLENBQUMsb0JBQW9CLEVBQUUseUJBQXlCLG9DQUE0QixDQUFDIn0=