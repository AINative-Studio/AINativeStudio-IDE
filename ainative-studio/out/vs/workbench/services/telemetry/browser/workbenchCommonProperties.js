/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as Platform from '../../../../base/common/platform.js';
import * as uuid from '../../../../base/common/uuid.js';
import { cleanRemoteAuthority } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { mixin } from '../../../../base/common/objects.js';
import { firstSessionDateStorageKey, lastSessionDateStorageKey, machineIdKey } from '../../../../platform/telemetry/common/telemetry.js';
import { Gesture } from '../../../../base/browser/touch.js';
/**
 * General function to help reduce the individuality of user agents
 * @param userAgent userAgent from browser window
 * @returns A simplified user agent with less detail
 */
function cleanUserAgent(userAgent) {
    return userAgent.replace(/(\d+\.\d+)(\.\d+)+/g, '$1');
}
export function resolveWorkbenchCommonProperties(storageService, commit, version, isInternalTelemetry, remoteAuthority, productIdentifier, removeMachineId, resolveAdditionalProperties) {
    const result = Object.create(null);
    const firstSessionDate = storageService.get(firstSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    const lastSessionDate = storageService.get(lastSessionDateStorageKey, -1 /* StorageScope.APPLICATION */);
    let machineId;
    if (!removeMachineId) {
        machineId = storageService.get(machineIdKey, -1 /* StorageScope.APPLICATION */);
        if (!machineId) {
            machineId = uuid.generateUuid();
            storageService.store(machineIdKey, machineId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
    }
    else {
        machineId = `Redacted-${productIdentifier ?? 'web'}`;
    }
    /**
     * Note: In the web, session date information is fetched from browser storage, so these dates are tied to a specific
     * browser and not the machine overall.
     */
    // __GDPR__COMMON__ "common.firstSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.firstSessionDate'] = firstSessionDate;
    // __GDPR__COMMON__ "common.lastSessionDate" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.lastSessionDate'] = lastSessionDate || '';
    // __GDPR__COMMON__ "common.isNewSession" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.isNewSession'] = !lastSessionDate ? '1' : '0';
    // __GDPR__COMMON__ "common.remoteAuthority" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.remoteAuthority'] = cleanRemoteAuthority(remoteAuthority);
    // __GDPR__COMMON__ "common.machineId" : { "endPoint": "MacAddressHash", "classification": "EndUserPseudonymizedInformation", "purpose": "FeatureInsight" }
    result['common.machineId'] = machineId;
    // __GDPR__COMMON__ "sessionID" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['sessionID'] = uuid.generateUuid() + Date.now();
    // __GDPR__COMMON__ "commitHash" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['commitHash'] = commit;
    // __GDPR__COMMON__ "version" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['version'] = version;
    // __GDPR__COMMON__ "common.platform" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.platform'] = Platform.PlatformToString(Platform.platform);
    // __GDPR__COMMON__ "common.product" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" }
    result['common.product'] = productIdentifier ?? 'web';
    // __GDPR__COMMON__ "common.userAgent" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.userAgent'] = Platform.userAgent ? cleanUserAgent(Platform.userAgent) : undefined;
    // __GDPR__COMMON__ "common.isTouchDevice" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
    result['common.isTouchDevice'] = String(Gesture.isTouchDevice());
    if (isInternalTelemetry) {
        // __GDPR__COMMON__ "common.msftInternal" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        result['common.msftInternal'] = isInternalTelemetry;
    }
    // dynamic properties which value differs on each call
    let seq = 0;
    const startTime = Date.now();
    Object.defineProperties(result, {
        // __GDPR__COMMON__ "timestamp" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
        'timestamp': {
            get: () => new Date(),
            enumerable: true
        },
        // __GDPR__COMMON__ "common.timesincesessionstart" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.timesincesessionstart': {
            get: () => Date.now() - startTime,
            enumerable: true
        },
        // __GDPR__COMMON__ "common.sequence" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
        'common.sequence': {
            get: () => seq++,
            enumerable: true
        }
    });
    if (resolveAdditionalProperties) {
        mixin(result, resolveAdditionalProperties());
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvb3Blel9hbWlseV8vQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGVsZW1ldHJ5L2Jyb3dzZXIvd29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNELE9BQU8sRUFBcUIsMEJBQTBCLEVBQUUseUJBQXlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDNUosT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRTVEOzs7O0dBSUc7QUFDSCxTQUFTLGNBQWMsQ0FBQyxTQUFpQjtJQUN4QyxPQUFPLFNBQVMsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDdkQsQ0FBQztBQUVELE1BQU0sVUFBVSxnQ0FBZ0MsQ0FDL0MsY0FBK0IsRUFDL0IsTUFBMEIsRUFDMUIsT0FBMkIsRUFDM0IsbUJBQTRCLEVBQzVCLGVBQXdCLEVBQ3hCLGlCQUEwQixFQUMxQixlQUF5QixFQUN6QiwyQkFBMEQ7SUFFMUQsTUFBTSxNQUFNLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEQsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLDBCQUEwQixvQ0FBNEIsQ0FBQztJQUNuRyxNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLHlCQUF5QixvQ0FBNEIsQ0FBQztJQUVqRyxJQUFJLFNBQTZCLENBQUM7SUFDbEMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3RCLFNBQVMsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLFlBQVksb0NBQTJCLENBQUM7UUFDdkUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDaEMsY0FBYyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsU0FBUyxtRUFBa0QsQ0FBQztRQUNoRyxDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxTQUFTLEdBQUcsWUFBWSxpQkFBaUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUN0RCxDQUFDO0lBR0Q7OztPQUdHO0lBQ0gsbUhBQW1IO0lBQ25ILE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLGdCQUFnQixDQUFDO0lBQ3JELGtIQUFrSDtJQUNsSCxNQUFNLENBQUMsd0JBQXdCLENBQUMsR0FBRyxlQUFlLElBQUksRUFBRSxDQUFDO0lBQ3pELCtHQUErRztJQUMvRyxNQUFNLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFDN0Qsd0hBQXdIO0lBQ3hILE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRXpFLDJKQUEySjtJQUMzSixNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxTQUFTLENBQUM7SUFDdkMscUdBQXFHO0lBQ3JHLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ3ZELDRHQUE0RztJQUM1RyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDO0lBQzlCLG1HQUFtRztJQUNuRyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsT0FBTyxDQUFDO0lBQzVCLDJHQUEyRztJQUMzRyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3pFLGdIQUFnSDtJQUNoSCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxpQkFBaUIsSUFBSSxLQUFLLENBQUM7SUFDdEQsNEdBQTRHO0lBQzVHLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztJQUNqRyxnSEFBZ0g7SUFDaEgsTUFBTSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBRWpFLElBQUksbUJBQW1CLEVBQUUsQ0FBQztRQUN6QixzSUFBc0k7UUFDdEksTUFBTSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsbUJBQW1CLENBQUM7SUFDckQsQ0FBQztJQUVELHNEQUFzRDtJQUN0RCxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDN0IsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRTtRQUMvQixxR0FBcUc7UUFDckcsV0FBVyxFQUFFO1lBQ1osR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFO1lBQ3JCLFVBQVUsRUFBRSxJQUFJO1NBQ2hCO1FBQ0QsK0lBQStJO1FBQy9JLDhCQUE4QixFQUFFO1lBQy9CLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUztZQUNqQyxVQUFVLEVBQUUsSUFBSTtTQUNoQjtRQUNELGtJQUFrSTtRQUNsSSxpQkFBaUIsRUFBRTtZQUNsQixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFO1lBQ2hCLFVBQVUsRUFBRSxJQUFJO1NBQ2hCO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsSUFBSSwyQkFBMkIsRUFBRSxDQUFDO1FBQ2pDLEtBQUssQ0FBQyxNQUFNLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNmLENBQUMifQ==