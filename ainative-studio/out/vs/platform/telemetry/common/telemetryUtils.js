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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVsZW1ldHJ5VXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL29wZXpfYW1pbHlfL0FJTmF0aXZlU3R1ZGlvLUlERS9haW5hdGl2ZS1zdHVkaW8vc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVsZW1ldHJ5L2NvbW1vbi90ZWxlbWV0cnlVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFLM0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3RFLE9BQU8sRUFBa0ksbUNBQW1DLEVBQUUsd0JBQXdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUVyUDs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjtJQUdqQyxZQUE0QixLQUFRO1FBQVIsVUFBSyxHQUFMLEtBQUssQ0FBRztRQUZwQywwR0FBMEc7UUFDMUYsNEJBQXVCLEdBQUcsSUFBSSxDQUFDO0lBQ1AsQ0FBQztDQUN6QztBQUVELE1BQU0sT0FBTyx5QkFBeUI7SUFBdEM7UUFFVSxtQkFBYywrQkFBdUI7UUFDckMsY0FBUyxHQUFHLHFCQUFxQixDQUFDO1FBQ2xDLGNBQVMsR0FBRyxxQkFBcUIsQ0FBQztRQUNsQyxVQUFLLEdBQUcsaUJBQWlCLENBQUM7UUFDMUIsZ0JBQVcsR0FBRyx1QkFBdUIsQ0FBQztRQUN0QyxxQkFBZ0IsR0FBRyw0QkFBNEIsQ0FBQztRQUNoRCx1QkFBa0IsR0FBRyxLQUFLLENBQUM7SUFNckMsQ0FBQztJQUxBLFNBQVMsS0FBSyxDQUFDO0lB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