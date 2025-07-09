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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { isEqualOrParent, joinPath, relativePath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { EditSessionIdentityMatch, IEditSessionIdentityService } from '../../../../platform/workspace/common/editSessions.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
export const IWorkspaceIdentityService = createDecorator('IWorkspaceIdentityService');
let WorkspaceIdentityService = class WorkspaceIdentityService {
    constructor(workspaceContextService, editSessionIdentityService) {
        this.workspaceContextService = workspaceContextService;
        this.editSessionIdentityService = editSessionIdentityService;
    }
    async getWorkspaceStateFolders(cancellationToken) {
        const workspaceStateFolders = [];
        for (const workspaceFolder of this.workspaceContextService.getWorkspace().folders) {
            const workspaceFolderIdentity = await this.editSessionIdentityService.getEditSessionIdentifier(workspaceFolder, cancellationToken);
            if (!workspaceFolderIdentity) {
                continue;
            }
            workspaceStateFolders.push({ resourceUri: workspaceFolder.uri.toString(), workspaceFolderIdentity });
        }
        return workspaceStateFolders;
    }
    async matches(incomingWorkspaceFolders, cancellationToken) {
        const incomingToCurrentWorkspaceFolderUris = {};
        const incomingIdentitiesToIncomingWorkspaceFolders = {};
        for (const workspaceFolder of incomingWorkspaceFolders) {
            incomingIdentitiesToIncomingWorkspaceFolders[workspaceFolder.workspaceFolderIdentity] = workspaceFolder.resourceUri;
        }
        // Precompute the identities of the current workspace folders
        const currentWorkspaceFoldersToIdentities = new Map();
        for (const workspaceFolder of this.workspaceContextService.getWorkspace().folders) {
            const workspaceFolderIdentity = await this.editSessionIdentityService.getEditSessionIdentifier(workspaceFolder, cancellationToken);
            if (!workspaceFolderIdentity) {
                continue;
            }
            currentWorkspaceFoldersToIdentities.set(workspaceFolder, workspaceFolderIdentity);
        }
        // Match the current workspace folders to the incoming workspace folders
        for (const [currentWorkspaceFolder, currentWorkspaceFolderIdentity] of currentWorkspaceFoldersToIdentities.entries()) {
            // Happy case: identities do not need further disambiguation
            const incomingWorkspaceFolder = incomingIdentitiesToIncomingWorkspaceFolders[currentWorkspaceFolderIdentity];
            if (incomingWorkspaceFolder) {
                // There is an incoming workspace folder with the exact same identity as the current workspace folder
                incomingToCurrentWorkspaceFolderUris[incomingWorkspaceFolder] = currentWorkspaceFolder.uri.toString();
                continue;
            }
            // Unhappy case: compare the identity of the current workspace folder to all incoming workspace folder identities
            let hasCompleteMatch = false;
            for (const [incomingIdentity, incomingFolder] of Object.entries(incomingIdentitiesToIncomingWorkspaceFolders)) {
                if (await this.editSessionIdentityService.provideEditSessionIdentityMatch(currentWorkspaceFolder, currentWorkspaceFolderIdentity, incomingIdentity, cancellationToken) === EditSessionIdentityMatch.Complete) {
                    incomingToCurrentWorkspaceFolderUris[incomingFolder] = currentWorkspaceFolder.uri.toString();
                    hasCompleteMatch = true;
                    break;
                }
            }
            if (hasCompleteMatch) {
                continue;
            }
            return false;
        }
        const convertUri = (uriToConvert) => {
            // Figure out which current folder the incoming URI is a child of
            for (const incomingFolderUriKey of Object.keys(incomingToCurrentWorkspaceFolderUris)) {
                const incomingFolderUri = URI.parse(incomingFolderUriKey);
                if (isEqualOrParent(incomingFolderUri, uriToConvert)) {
                    const currentWorkspaceFolderUri = incomingToCurrentWorkspaceFolderUris[incomingFolderUriKey];
                    // Compute the relative file path section of the uri to convert relative to the folder it came from
                    const relativeFilePath = relativePath(incomingFolderUri, uriToConvert);
                    // Reparent the relative file path under the current workspace folder it belongs to
                    if (relativeFilePath) {
                        return joinPath(URI.parse(currentWorkspaceFolderUri), relativeFilePath);
                    }
                }
            }
            // No conversion was possible; return the original URI
            return uriToConvert;
        };
        // Recursively look for any URIs in the provided object and
        // replace them with the URIs of the current workspace folders
        const uriReplacer = (obj, depth = 0) => {
            if (!obj || depth > 200) {
                return obj;
            }
            if (obj instanceof VSBuffer || obj instanceof Uint8Array) {
                return obj;
            }
            if (URI.isUri(obj)) {
                return convertUri(obj);
            }
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; ++i) {
                    obj[i] = uriReplacer(obj[i], depth + 1);
                }
            }
            else {
                // walk object
                for (const key in obj) {
                    if (Object.hasOwnProperty.call(obj, key)) {
                        obj[key] = uriReplacer(obj[key], depth + 1);
                    }
                }
            }
            return obj;
        };
        return uriReplacer;
    }
};
WorkspaceIdentityService = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IEditSessionIdentityService)
], WorkspaceIdentityService);
export { WorkspaceIdentityService };
registerSingleton(IWorkspaceIdentityService, WorkspaceIdentityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlSWRlbnRpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3Jrc3BhY2VzL2NvbW1vbi93b3Jrc3BhY2VJZGVudGl0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTdELE9BQU8sRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRTdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzlILE9BQU8sRUFBRSx3QkFBd0IsRUFBb0IsTUFBTSxvREFBb0QsQ0FBQztBQUVoSCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQTRCLDJCQUEyQixDQUFDLENBQUM7QUFPMUcsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBd0I7SUFHcEMsWUFDNEMsdUJBQWlELEVBQzlDLDBCQUF1RDtRQUQxRCw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQTBCO1FBQzlDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7SUFDbEcsQ0FBQztJQUVMLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxpQkFBb0M7UUFDbEUsTUFBTSxxQkFBcUIsR0FBNEIsRUFBRSxDQUFDO1FBRTFELEtBQUssTUFBTSxlQUFlLElBQUksSUFB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