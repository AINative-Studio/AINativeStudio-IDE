/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
export function parseExtensionDevOptions(environmentService) {
    // handle extension host lifecycle a bit special when we know we are developing an extension that runs inside
    const isExtensionDevHost = environmentService.isExtensionDevelopment;
    let debugOk = true;
    const extDevLocs = environmentService.extensionDevelopmentLocationURI;
    if (extDevLocs) {
        for (const x of extDevLocs) {
            if (x.scheme !== Schemas.file) {
                debugOk = false;
            }
        }
    }
    const isExtensionDevDebug = debugOk && typeof environmentService.debugExtensionHost.port === 'number';
    const isExtensionDevDebugBrk = debugOk && !!environmentService.debugExtensionHost.break;
    const isExtensionDevTestFromCli = isExtensionDevHost && !!environmentService.extensionTestsLocationURI && !environmentService.debugExtensionHost.debugId;
    return {
        isExtensionDevHost,
        isExtensionDevDebug,
        isExtensionDevDebugBrk,
        isExtensionDevTestFromCli
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRGV2T3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9uRGV2T3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFVN0QsTUFBTSxVQUFVLHdCQUF3QixDQUFDLGtCQUF1QztJQUMvRSw2R0FBNkc7SUFDN0csTUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQztJQUVyRSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUM7SUFDbkIsTUFBTSxVQUFVLEdBQUcsa0JBQWtCLENBQUMsK0JBQStCLENBQUM7SUFDdEUsSUFBSSxVQUFVLEVBQUUsQ0FBQztRQUNoQixLQUFLLE1BQU0sQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQy9CLE9BQU8sR0FBRyxLQUFLLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLElBQUksT0FBTyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDO0lBQ3RHLE1BQU0sc0JBQXNCLEdBQUcsT0FBTyxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUM7SUFDeEYsTUFBTSx5QkFBeUIsR0FBRyxrQkFBa0IsSUFBSSxDQUFDLENBQUMsa0JBQWtCLENBQUMseUJBQXlCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUM7SUFDekosT0FBTztRQUNOLGtCQUFrQjtRQUNsQixtQkFBbUI7UUFDbkIsc0JBQXNCO1FBQ3RCLHlCQUF5QjtLQUN6QixDQUFDO0FBQ0gsQ0FBQyJ9