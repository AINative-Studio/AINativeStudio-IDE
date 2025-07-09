/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getErrorMessage } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { DiskFileSystemProviderClient } from '../../../../platform/files/common/diskFileSystemProviderClient.js';
export const REMOTE_FILE_SYSTEM_CHANNEL_NAME = 'remoteFilesystem';
export class RemoteFileSystemProviderClient extends DiskFileSystemProviderClient {
    static register(remoteAgentService, fileService, logService) {
        const connection = remoteAgentService.getConnection();
        if (!connection) {
            return Disposable.None;
        }
        const disposables = new DisposableStore();
        const environmentPromise = (async () => {
            try {
                const environment = await remoteAgentService.getRawEnvironment();
                if (environment) {
                    // Register remote fsp even before it is asked to activate
                    // because, some features (configuration) wait for its
                    // registration before making fs calls.
                    fileService.registerProvider(Schemas.vscodeRemote, disposables.add(new RemoteFileSystemProviderClient(environment, connection)));
                }
                else {
                    logService.error('Cannot register remote filesystem provider. Remote environment doesnot exist.');
                }
            }
            catch (error) {
                logService.error('Cannot register remote filesystem provider. Error while fetching remote environment.', getErrorMessage(error));
            }
        })();
        disposables.add(fileService.onWillActivateFileSystemProvider(e => {
            if (e.scheme === Schemas.vscodeRemote) {
                e.join(environmentPromise);
            }
        }));
        return disposables;
    }
    constructor(remoteAgentEnvironment, connection) {
        super(connection.getChannel(REMOTE_FILE_SYSTEM_CHANNEL_NAME), { pathCaseSensitive: remoteAgentEnvironment.os === 3 /* OperatingSystem.Linux */ });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlRmlsZVN5c3RlbVByb3ZpZGVyQ2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9vcGV6X2FtaWx5Xy9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9yZW1vdGUvY29tbW9uL3JlbW90ZUZpbGVTeXN0ZW1Qcm92aWRlckNsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHN0QsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFLakgsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsa0JBQWtCLENBQUM7QUFFbEUsTUFBTSxPQUFPLDhCQUErQixTQUFRLDRCQUE0QjtJQUUvRSxNQUFNLENBQUMsUUFBUSxDQUFDLGtCQUF1QyxFQUFFLFdBQXlCLEVBQUUsVUFBdUI7UUFDMUcsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztRQUN4QixDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUUxQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDdEMsSUFBSSxDQUFDO2dCQUNKLE1BQU0sV0FBVyxHQUFHLE1BQU0sa0JBQWtCLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDakUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsMERBQTBEO29CQUMxRCxzREFBc0Q7b0JBQ3RELHVDQUF1QztvQkFDdkMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xJLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxVQUFVLENBQUMsS0FBSyxDQUFDLCtFQUErRSxDQUFDLENBQUM7Z0JBQ25HLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsVUFBVSxDQUFDLEtBQUssQ0FBQyxzRkFBc0YsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNsSSxDQUFDO1FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVMLFdBQVcsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hFLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ3ZDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVKLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxZQUFvQixzQkFBK0MsRUFBRSxVQUFrQztRQUN0RyxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxrQ0FBMEIsRUFBRSxDQUFDLENBQUM7SUFDM0ksQ0FBQztDQUNEIn0=