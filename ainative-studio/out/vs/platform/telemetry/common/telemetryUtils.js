/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { cloneAndChange, safeStringify } from '../../../base/common/objects.js';
import { isObject } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
import { getRemoteName } from '../../remote/common/remoteHosts.js';
import { verifyMicrosoftInternalDomain } from './commonProperties.js';
import { TELEMETRY_CRASH_REPORTER_SETTING_ID, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SETTING_ID } from './telemetry.js';
/**
 * A special class used to denoting a telemetry value which should not be clean.
 * This is because that value is "Trusted" not to contain identifiable information such as paths.
 * NOTE: This is used as an API type as well, and should not be changed.
 */
export class TelemetryTrustedValue {
    constructor(value) {
        this.value = value;
        // This is merely used as an identifier as the instance will be lost during serialization over the exthost
        this.isTrustedTelemetryValue = true;
    }
}
export class NullTelemetryServiceShape {
    constructor() {
        this.telemetryLevel = 0 /* TelemetryLevel.NONE */;
        this.sessionId = 'someValue.sessionId';
        this.machineId = 'someValue.machineId';
        this.sqmId = 'someValue.sqmId';
        this.devDeviceId = 'someValue.devDeviceId';
        this.firstSessionDate = 'someValue.firstSessionDate';
        this.sendErrorTelemetry = false;
    }
    publicLog() { }
    publicLog2() { }
    publicLogError() { }
    publicLogError2() { }
    setExperimentProperty() { }
}
export const NullTelemetryService = new NullTelemetryServiceShape();
export class NullEndpointTelemetryService {
    async publicLog(_endpoint, _eventName, _data) {
        // noop
    }
    async publicLogError(_endpoint, _errorEventName, _data) {
        // noop
    }
}
export const telemetryLogId = 'telemetry';
export const TelemetryLogGroup = { id: telemetryLogId, name: localize('telemetryLogName', "Telemetry") };
export const NullAppender = { log: () => null, flush: () => Promise.resolve(undefined) };
/**
 * Determines whether or not we support logging telemetry.
 * This checks if the product is capable of collecting telemetry but not whether or not it can send it
 * For checking the user setting and what telemetry you can send please check `getTelemetryLevel`.
 * This returns true if `--disable-telemetry` wasn't used, the product.json allows for telemetry, and we're not testing an extension
 * If false telemetry is disabled throughout the product
 * @param productService
 * @param environmentService
 * @returns false - telemetry is completely disabled, true - telemetry is logged locally, but may not be sent
 */
export function supportsTelemetry(productService, environmentService) {
    // If it's OSS and telemetry isn't disabled via the CLI we will allow it for logging only purposes
    if (!environmentService.isBuilt && !environmentService.disableTelemetry) {
        return true;
    }
    return !(environmentService.disableTelemetry || !productService.enableTelemetry);
}
/**
 * Checks to see if we're in logging only mode to debug telemetry.
 * This is if telemetry is enabled and we're in OSS, but no telemetry key is provided so it's not being sent just logged.
 * @param productService
 * @param environmentService
 * @returns True if telemetry is actually disabled and we're only logging for debug purposes
 */
export function isLoggingOnly(productService, environmentService) {
    // If we're testing an extension, log telemetry for debug purposes
    if (environmentService.extensionTestsLocationURI) {
        return true;
    }
    // Logging only mode is only for OSS
    if (environmentService.isBuilt) {
        return false;
    }
    if (environmentService.disableTelemetry) {
        return false;
    }
    if (productService.enableTelemetry && productService.aiConfig?.ariaKey) {
        return false;
    }
    return true;
}
/**
 * Determines how telemetry is handled based on the user's configuration.
 *
 * @param configurationService
 * @returns OFF, ERROR, ON
 */
export function getTelemetryLevel(configurationService) {
    const newConfig = configurationService.getValue(TELEMETRY_SETTING_ID);
    const crashReporterConfig = configurationService.getValue(TELEMETRY_CRASH_REPORTER_SETTING_ID);
    const oldConfig = configurationService.getValue(TELEMETRY_OLD_SETTING_ID);
    // If `telemetry.enableCrashReporter` is false or `telemetry.enableTelemetry' is false, disable telemetry
    if (oldConfig === false || crashReporterConfig === false) {
        return 0 /* TelemetryLevel.NONE */;
    }
    // Maps new telemetry setting to a telemetry level
    switch (newConfig ?? "all" /* TelemetryConfiguration.ON */) {
        case "all" /* TelemetryConfiguration.ON */:
            return 3 /* TelemetryLevel.USAGE */;
        case "error" /* TelemetryConfiguration.ERROR */:
            return 2 /* TelemetryLevel.ERROR */;
        case "crash" /* TelemetryConfiguration.CRASH */:
            return 1 /* TelemetryLevel.CRASH */;
        case "off" /* TelemetryConfiguration.OFF */:
            return 0 /* TelemetryLevel.NONE */;
    }
}
export function validateTelemetryData(data) {
    const properties = {};
    const measurements = {};
    const flat = {};
    flatten(data, flat);
    for (let prop in flat) {
        // enforce property names less than 150 char, take the last 150 char
        prop = prop.length > 150 ? prop.substr(prop.length - 149) : prop;
        const value = flat[prop];
        if (typeof value === 'number') {
            measurements[prop] = value;
        }
        else if (typeof value === 'boolean') {
            measurements[prop] = value ? 1 : 0;
        }
        else if (typeof value === 'string') {
            if (value.length > 8192) {
                console.warn(`Telemetry property: ${prop} has been trimmed to 8192, the original length is ${value.length}`);
            }
            //enforce property value to be less than 8192 char, take the first 8192 char
            // https://docs.microsoft.com/en-us/azure/azure-monitor/app/api-custom-events-metrics#limits
            properties[prop] = value.substring(0, 8191);
        }
        else if (typeof value !== 'undefined' && value !== null) {
            properties[prop] = value;
        }
    }
    return {
        properties,
        measurements
    };
}
const telemetryAllowedAuthorities = new Set(['ssh-remote', 'dev-container', 'attached-container', 'wsl', 'tunnel', 'codespaces', 'amlext']);
export function cleanRemoteAuthority(remoteAuthority) {
    if (!remoteAuthority) {
        return 'none';
    }
    const remoteName = getRemoteName(remoteAuthority);
    return telemetryAllowedAuthorities.has(remoteName) ? remoteName : 'other';
}
function flatten(obj, result, order = 0, prefix) {
    if (!obj) {
        return;
    }
    for (const item of Object.getOwnPropertyNames(obj)) {
        const value = obj[item];
        const index = prefix ? prefix + item : item;
        if (Array.isArray(value)) {
            result[index] = safeStringify(value);
        }
        else if (value instanceof Date) {
            // TODO unsure why this is here and not in _getData
            result[index] = value.toISOString();
        }
        else if (isObject(value)) {
            if (order < 2) {
                flatten(value, result, order + 1, index + '.');
            }
            else {
                result[index] = safeStringify(value);
            }
        }
        else {
            result[index] = value;
        }
    }
}
/**
 * Whether or not this is an internal user
 * @param productService The product service
 * @param configService The config servivce
 * @returns true if internal, false otherwise
 */
export function isInternalTelemetry(productService, configService) {
    const msftInternalDomains = productService.msftInternalDomains || [];
    const internalTesting = configService.getValue('telemetry.internalTesting');
    return verifyMicrosoftInternalDomain(msftInternalDomains) || internalTesting;
}
export function getPiiPathsFromEnvironment(paths) {
    return [paths.appRoot, paths.extensionsPath, paths.userHome.fsPath, paths.tmpDir.fsPath, paths.userDataPath];
}
//#region Telemetry Cleaning
/**
 * Cleans a given stack of possible paths
 * @param stack The stack to sanitize
 * @param cleanupPatterns Cleanup patterns to remove from the stack
 * @returns The cleaned stack
 */
function anonymizeFilePaths(stack, cleanupPatterns) {
    // Fast check to see if it is a file path to avoid doing unnecessary heavy regex work
    if (!stack || (!stack.includes('/') && !stack.includes('\\'))) {
        return stack;
    }
    let updatedStack = stack;
    const cleanUpIndexes = [];
    for (const regexp of cleanupPatterns) {
        while (true) {
            const result = regexp.exec(stack);
            if (!result) {
                break;
            }
            cleanUpIndexes.push([result.index, regexp.lastIndex]);
        }
    }
    const nodeModulesRegex = /^[\\\/]?(node_modules|node_modules\.asar)[\\\/]/;
    const fileRegex = /(file:\/\/)?([a-zA-Z]:(\\\\|\\|\/)|(\\\\|\\|\/))?([\w-\._]+(\\\\|\\|\/))+[\w-\._]*/g;
    let lastIndex = 0;
    updatedStack = '';
    while (true) {
        const result = fileRegex.exec(stack);
        if (!result) {
            break;
        }
        // Check to see if the any cleanupIndexes partially overlap with this match
        const overlappingRange = cleanUpIndexes.some(([start, end]) => result.index < end && start < fileRegex.lastIndex);
        // anoynimize user file paths that do not need to be retained or cleaned up.
        if (!nodeModulesRegex.test(result[0]) && !overlappingRange) {
            updatedStack += stack.substring(lastIndex, result.index) + '<REDACTED: user-file-path>';
            lastIndex = fileRegex.lastIndex;
        }
    }
    if (lastIndex < stack.length) {
        updatedStack += stack.substr(lastIndex);
    }
    return updatedStack;
}
/**
 * Attempts to remove commonly leaked PII
 * @param property The property which will be removed if it contains user data
 * @returns The new value for the property
 */
function removePropertiesWithPossibleUserInfo(property) {
    // If for some reason it is undefined we skip it (this shouldn't be possible);
    if (!property) {
        return property;
    }
    const userDataRegexes = [
        { label: 'Google API Key', regex: /AIza[A-Za-z0-9_\\\-]{35}/ },
        { label: 'Slack Token', regex: /xox[pbar]\-[A-Za-z0-9]/ },
        { label: 'GitHub Token', regex: /(gh[psuro]_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})/ },
        { label: 'Generic Secret', regex: /(key|token|sig|secret|signature|password|passwd|pwd|android:value)[^a-zA-Z0-9]/i },
        { label: 'CLI Credentials', regex: /((login|psexec|(certutil|psexec)\.exe).{1,50}(\s-u(ser(name)?)?\s+.{3,100})?\s-(admin|user|vm|root)?p(ass(word)?)?\s+["']?[^$\-\/\s]|(^|[\s\r\n\\])net(\.exe)?.{1,5}(user\s+|share\s+\/user:| user -? secrets ? set) \s + [^ $\s \/])/ },
        { label: 'Microsoft Entra ID', regex: /eyJ(?:0eXAiOiJKV1Qi|hbGci|[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.)/ },
        { label: 'Email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ }
    ];
    // Check for common user data in the telemetry events
    for (const secretRegex of userDataRegexes) {
        if (secretRegex.regex.test(property)) {
            return `<REDACTED: ${secretRegex.label}>`;
        }
    }
    return property;
}
/**
 * Does a best possible effort to clean a data object from any possible PII.
 * @param data The data object to clean
 * @param paths Any additional patterns that should be removed from the data set
 * @returns A new object with the PII removed
 */
export function cleanData(data, cleanUpPatterns) {
    return cloneAndChange(data, value => {
        // If it's a trusted value it means it's okay to skip cleaning so we don't clean it
        if (value instanceof TelemetryTrustedValue || Object.hasOwnProperty.call(value, 'isTrustedTelemetryValue')) {
            return value.value;
        }
        // We only know how to clean strings
        if (typeof value === 'string') {
            let updatedProperty = value.replaceAll('%20', ' ');
            // First we anonymize any possible file paths
            updatedProperty = anonymizeFilePaths(updatedProperty, cleanUpPatterns);
            // Then we do a simple regex replace with the defined patterns
            for (const regexp of cleanUpPatterns) {
                updatedProperty = updatedProperty.replace(regexp, '');
            }
            // Lastly, remove commonly leaked PII
            updatedProperty = removePropertiesWithPossibleUserInfo(updatedProperty);
            return updatedProperty;
        }
        return undefined;
    });
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL2RhcnRodmFkZXIvQUlOYXRpdmVTdHVkaW8tSURFL2FpbmF0aXZlLXN0dWRpby9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvY29tbW9uL3RlbGVtZXRyeVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUszQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDbkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDdEUsT0FBTyxFQUFrSSxtQ0FBbUMsRUFBRSx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRXJQOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8scUJBQXFCO0lBR2pDLFlBQTRCLEtBQVE7UUFBUixVQUFLLEdBQUwsS0FBSyxDQUFHO1FBRnBDLDBHQUEwRztRQUMxRiw0QkFBdUIsR0FBRyxJQUFJLENBQUM7SUFDUCxDQUFDO0NBQ3pDO0FBRUQsTUFBTSxPQUFPLHlCQUF5QjtJQUF0QztRQUVVLG1CQUFjLCtCQUF1QjtRQUNyQyxjQUFTLEdBQUcscUJBQXFCLENBQUM7UUFDbEMsY0FBUyxHQUFHLHFCQUFxQixDQUFDO1FBQ2xDLFVBQUssR0FBRyxpQkFBaUIsQ0FBQztRQUMxQixnQkFBVyxHQUFHLHVCQUF1QixDQUFDO1FBQ3RDLHFCQUFnQixHQUFHLDRCQUE0QixDQUFDO1FBQ2hELHVCQUFrQixHQUFHLEtBQUssQ0FBQztJQU1yQyxDQUFDO0lBTEEsU0FBUyxLQUFLLENBQUM7SUFD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