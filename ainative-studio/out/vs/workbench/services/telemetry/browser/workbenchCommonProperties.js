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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoQ29tbW9uUHJvcGVydGllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZWxlbWV0cnkvYnJvd3Nlci93b3JrYmVuY2hDb21tb25Qcm9wZXJ0aWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0QsT0FBTyxFQUFxQiwwQkFBMEIsRUFBRSx5QkFBeUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM1SixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFNUQ7Ozs7R0FJRztBQUNILFNBQVMsY0FBYyxDQUFDLFNBQWlCO0lBQ3hDLE9BQU8sU0FBUyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBRUQsTUFBTSxVQUFVLGdDQUFnQyxDQUMvQyxjQUErQixFQUMvQixNQUEwQixFQUMxQixPQUEyQixFQUMzQixtQkFBNEIsRUFDNUIsZUFBd0IsRUFDeEIsaUJBQTBCLEVBQzFCLGVBQXlCLEVBQ3pCLDJCQUEwRDtJQUUxRCxNQUFNLE1BQU0sR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0RCxNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsMEJBQTBCLG9DQUE0QixDQUFDO0lBQ25HLE1BQU0sZUFBZSxHQUFHLGNBQWMs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