/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getServiceMachineId } from './serviceMachineId.js';
import { getTelemetryLevel, supportsTelemetry } from '../../telemetry/common/telemetryUtils.js';
export async function resolveMarketplaceHeaders(version, productService, environmentService, configurationService, fileService, storageService, telemetryService) {
    const headers = {
        'X-Market-Client-Id': `VSCode ${version}`,
        'User-Agent': `VSCode ${version} (${productService.nameShort})`
    };
    if (supportsTelemetry(productService, environmentService) && getTelemetryLevel(configurationService) === 3 /* TelemetryLevel.USAGE */) {
        const serviceMachineId = await getServiceMachineId(environmentService, fileService, storageService);
        headers['X-Market-User-Id'] = serviceMachineId;
        // Send machineId as VSCode-SessionId so we can correlate telemetry events across different services
        // machineId can be undefined sometimes (eg: when launching from CLI), so send serviceMachineId instead otherwise
        // Marketplace will reject the request if there is no VSCode-SessionId header
        headers['VSCode-SessionId'] = telemetryService.machineId || serviceMachineId;
    }
    return headers;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2V0cGxhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZXJuYWxTZXJ2aWNlcy9jb21tb24vbWFya2V0cGxhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFLNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFaEcsTUFBTSxDQUFDLEtBQUssVUFBVSx5QkFBeUIsQ0FBQyxPQUFlLEVBQzlELGNBQStCLEVBQy9CLGtCQUF1QyxFQUN2QyxvQkFBMkMsRUFDM0MsV0FBeUIsRUFDekIsY0FBMkMsRUFDM0MsZ0JBQW1DO0lBRW5DLE1BQU0sT0FBTyxHQUFhO1FBQ3pCLG9CQUFvQixFQUFFLFVBQVUsT0FBTyxFQUFFO1FBQ3pDLFlBQVksRUFBRSxVQUFVLE9BQU8sS0FBSyxjQUFjLENBQUMsU0FBUyxHQUFHO0tBQy9ELENBQUM7SUFFRixJQUFJLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLGlDQUF5QixFQUFFLENBQUM7UUFDL0gsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLG1CQUFtQixDQUFDLGtCQUFrQixFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNwRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztRQUMvQyxvR0FBb0c7UUFDcEcsaUhBQWlIO1FBQ2pILDZFQUE2RTtRQUM3RSxPQUFPLENBQUMsa0JBQWtCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLElBQUksZ0JBQWdCLENBQUM7SUFDOUUsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2hCLENBQUMifQ==