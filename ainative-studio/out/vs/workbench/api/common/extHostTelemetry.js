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
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../base/common/event.js';
import { ILoggerService } from '../../../platform/log/common/log.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { UIKind } from '../../services/extensions/common/extensionHostProtocol.js';
import { getRemoteName } from '../../../platform/remote/common/remoteHosts.js';
import { cleanData, cleanRemoteAuthority, TelemetryLogGroup } from '../../../platform/telemetry/common/telemetryUtils.js';
import { mixin } from '../../../base/common/objects.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
let ExtHostTelemetry = class ExtHostTelemetry extends Disposable {
    constructor(isWorker, initData, loggerService) {
        super();
        this.initData = initData;
        this._onDidChangeTelemetryEnabled = this._register(new Emitter());
        this.onDidChangeTelemetryEnabled = this._onDidChangeTelemetryEnabled.event;
        this._onDidChangeTelemetryConfiguration = this._register(new Emitter());
        this.onDidChangeTelemetryConfiguration = this._onDidChangeTelemetryConfiguration.event;
        this._productConfig = { usage: true, error: true };
        this._level = 0 /* TelemetryLevel.NONE */;
        this._inLoggingOnlyMode = false;
        this._telemetryLoggers = new Map();
        this._inLoggingOnlyMode = this.initData.environment.isExtensionTelemetryLoggingOnly;
        const id = initData.remote.isRemote ? 'remoteExtHostTelemetry' : isWorker ? 'workerExtHostTelemetry' : 'extHostTelemetry';
        this._outputLogger = this._register(loggerService.createLogger(id, {
            name: localize('extensionTelemetryLog', "Extension Telemetry{0}", this._inLoggingOnlyMode ? ' (Not Sent)' : ''),
            hidden: true,
            group: TelemetryLogGroup,
        }));
    }
    getTelemetryConfiguration() {
        return this._level === 3 /* TelemetryLevel.USAGE */;
    }
    getTelemetryDetails() {
        return {
            isCrashEnabled: this._level >= 1 /* TelemetryLevel.CRASH */,
            isErrorsEnabled: this._productConfig.error ? this._level >= 2 /* TelemetryLevel.ERROR */ : false,
            isUsageEnabled: this._productConfig.usage ? this._level >= 3 /* TelemetryLevel.USAGE */ : false
        };
    }
    instantiateLogger(extension, sender, options) {
        const telemetryDetails = this.getTelemetryDetails();
        const logger = new ExtHostTelemetryLogger(sender, options, extension, this._outputLogger, this._inLoggingOnlyMode, this.getBuiltInCommonProperties(extension), { isUsageEnabled: telemetryDetails.isUsageEnabled, isErrorsEnabled: telemetryDetails.isErrorsEnabled });
        const loggers = this._telemetryLoggers.get(extension.identifier.value) ?? [];
        this._telemetryLoggers.set(extension.identifier.value, [...loggers, logger]);
        return logger.apiTelemetryLogger;
    }
    $initializeTelemetryLevel(level, supportsTelemetry, productConfig) {
        this._level = level;
        this._productConfig = productConfig ?? { usage: true, error: true };
    }
    getBuiltInCommonProperties(extension) {
        const commonProperties = Object.create(null);
        // TODO @lramos15, does os info like node arch, platform version, etc exist here.
        // Or will first party extensions just mix this in
        commonProperties['common.extname'] = `${extension.publisher}.${extension.name}`;
        commonProperties['common.extversion'] = extension.version;
        commonProperties['common.vscodemachineid'] = this.initData.telemetryInfo.machineId;
        commonProperties['common.vscodesessionid'] = this.initData.telemetryInfo.sessionId;
        commonProperties['common.vscodecommithash'] = this.initData.commit;
        commonProperties['common.sqmid'] = this.initData.telemetryInfo.sqmId;
        commonProperties['common.devDeviceId'] = this.initData.telemetryInfo.devDeviceId;
        commonProperties['common.vscodeversion'] = this.initData.version;
        commonProperties['common.isnewappinstall'] = isNewAppInstall(this.initData.telemetryInfo.firstSessionDate);
        commonProperties['common.product'] = this.initData.environment.appHost;
        switch (this.initData.uiKind) {
            case UIKind.Web:
                commonProperties['common.uikind'] = 'web';
                break;
            case UIKind.Desktop:
                commonProperties['common.uikind'] = 'desktop';
                break;
            default:
                commonProperties['common.uikind'] = 'unknown';
        }
        commonProperties['common.remotename'] = getRemoteName(cleanRemoteAuthority(this.initData.remote.authority));
        return commonProperties;
    }
    $onDidChangeTelemetryLevel(level) {
        this._oldTelemetryEnablement = this.getTelemetryConfiguration();
        this._level = level;
        const telemetryDetails = this.getTelemetryDetails();
        // Remove all disposed loggers
        this._telemetryLoggers.forEach((loggers, key) => {
            const newLoggers = loggers.filter(l => !l.isDisposed);
            if (newLoggers.length === 0) {
                this._telemetryLoggers.delete(key);
            }
            else {
                this._telemetryLoggers.set(key, newLoggers);
            }
        });
        // Loop through all loggers and update their level
        this._telemetryLoggers.forEach(loggers => {
            for (const logger of loggers) {
                logger.updateTelemetryEnablements(telemetryDetails.isUsageEnabled, telemetryDetails.isErrorsEnabled);
            }
        });
        if (this._oldTelemetryEnablement !== this.getTelemetryConfiguration()) {
            this._onDidChangeTelemetryEnabled.fire(this.getTelemetryConfiguration());
        }
        this._onDidChangeTelemetryConfiguration.fire(this.getTelemetryDetails());
    }
    onExtensionError(extension, error) {
        const loggers = this._telemetryLoggers.get(extension.value);
        const nonDisposedLoggers = loggers?.filter(l => !l.isDisposed);
        if (!nonDisposedLoggers) {
            this._telemetryLoggers.delete(extension.value);
            return false;
        }
        let errorEmitted = false;
        for (const logger of nonDisposedLoggers) {
            if (logger.ignoreUnhandledExtHostErrors) {
                continue;
            }
            logger.logError(error);
            errorEmitted = true;
        }
        return errorEmitted;
    }
};
ExtHostTelemetry = __decorate([
    __param(1, IExtHostInitDataService),
    __param(2, ILoggerService)
], ExtHostTelemetry);
export { ExtHostTelemetry };
export class ExtHostTelemetryLogger {
    static validateSender(sender) {
        if (typeof sender !== 'object') {
            throw new TypeError('TelemetrySender argument is invalid');
        }
        if (typeof sender.sendEventData !== 'function') {
            throw new TypeError('TelemetrySender.sendEventData must be a function');
        }
        if (typeof sender.sendErrorData !== 'function') {
            throw new TypeError('TelemetrySender.sendErrorData must be a function');
        }
        if (typeof sender.flush !== 'undefined' && typeof sender.flush !== 'function') {
            throw new TypeError('TelemetrySender.flush must be a function or undefined');
        }
    }
    constructor(sender, options, _extension, _logger, _inLoggingOnlyMode, _commonProperties, telemetryEnablements) {
        this._extension = _extension;
        this._logger = _logger;
        this._inLoggingOnlyMode = _inLoggingOnlyMode;
        this._commonProperties = _commonProperties;
        this._onDidChangeEnableStates = new Emitter();
        this.ignoreUnhandledExtHostErrors = options?.ignoreUnhandledErrors ?? false;
        this._ignoreBuiltinCommonProperties = options?.ignoreBuiltInCommonProperties ?? false;
        this._additionalCommonProperties = options?.additionalCommonProperties;
        this._sender = sender;
        this._telemetryEnablements = { isUsageEnabled: telemetryEnablements.isUsageEnabled, isErrorsEnabled: telemetryEnablements.isErrorsEnabled };
    }
    updateTelemetryEnablements(isUsageEnabled, isErrorsEnabled) {
        if (this._apiObject) {
            this._telemetryEnablements = { isUsageEnabled, isErrorsEnabled };
            this._onDidChangeEnableStates.fire(this._apiObject);
        }
    }
    mixInCommonPropsAndCleanData(data) {
        // Some telemetry modules prefer to break properties and measurmements up
        // We mix common properties into the properties tab.
        let updatedData = 'properties' in data ? (data.properties ?? {}) : data;
        // We don't clean measurements since they are just numbers
        updatedData = cleanData(updatedData, []);
        if (this._additionalCommonProperties) {
            updatedData = mixin(updatedData, this._additionalCommonProperties);
        }
        if (!this._ignoreBuiltinCommonProperties) {
            updatedData = mixin(updatedData, this._commonProperties);
        }
        if ('properties' in data) {
            data.properties = updatedData;
        }
        else {
            data = updatedData;
        }
        return data;
    }
    logEvent(eventName, data) {
        // No sender means likely disposed of, we should no-op
        if (!this._sender) {
            return;
        }
        // If it's a built-in extension (vscode publisher) we don't prefix the publisher and only the ext name
        if (this._extension.publisher === 'vscode') {
            eventName = this._extension.name + '/' + eventName;
        }
        else {
            eventName = this._extension.identifier.value + '/' + eventName;
        }
        data = this.mixInCommonPropsAndCleanData(data || {});
        if (!this._inLoggingOnlyMode) {
            this._sender?.sendEventData(eventName, data);
        }
        this._logger.trace(eventName, data);
    }
    logUsage(eventName, data) {
        if (!this._telemetryEnablements.isUsageEnabled) {
            return;
        }
        this.logEvent(eventName, data);
    }
    logError(eventNameOrException, data) {
        if (!this._telemetryEnablements.isErrorsEnabled || !this._sender) {
            return;
        }
        if (typeof eventNameOrException === 'string') {
            this.logEvent(eventNameOrException, data);
        }
        else {
            const errorData = {
                name: eventNameOrException.name,
                message: eventNameOrException.message,
                stack: eventNameOrException.stack,
                cause: eventNameOrException.cause
            };
            const cleanedErrorData = cleanData(errorData, []);
            // Reconstruct the error object with the cleaned data
            const cleanedError = new Error(cleanedErrorData.message, {
                cause: cleanedErrorData.cause
            });
            cleanedError.stack = cleanedErrorData.stack;
            cleanedError.name = cleanedErrorData.name;
            data = this.mixInCommonPropsAndCleanData(data || {});
            if (!this._inLoggingOnlyMode) {
                this._sender.sendErrorData(cleanedError, data);
            }
            this._logger.trace('exception', data);
        }
    }
    get apiTelemetryLogger() {
        if (!this._apiObject) {
            const that = this;
            const obj = {
                logUsage: that.logUsage.bind(that),
                get isUsageEnabled() {
                    return that._telemetryEnablements.isUsageEnabled;
                },
                get isErrorsEnabled() {
                    return that._telemetryEnablements.isErrorsEnabled;
                },
                logError: that.logError.bind(that),
                dispose: that.dispose.bind(that),
                onDidChangeEnableStates: that._onDidChangeEnableStates.event.bind(that)
            };
            this._apiObject = Object.freeze(obj);
        }
        return this._apiObject;
    }
    get isDisposed() {
        return !this._sender;
    }
    dispose() {
        if (this._sender?.flush) {
            let tempSender = this._sender;
            this._sender = undefined;
            Promise.resolve(tempSender.flush()).then(tempSender = undefined);
            this._apiObject = undefined;
        }
        else {
            this._sender = undefined;
        }
    }
}
export function isNewAppInstall(firstSessionDate) {
    const installAge = Date.now() - new Date(firstSessionDate).getTime();
    return isNaN(installAge) ? false : installAge < 1000 * 60 * 60 * 24; // install age is less than a day
}
export const IExtHostTelemetry = createDecorator('IExtHostTelemetry');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlbGVtZXRyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvZGFydGh2YWRlci9BSU5hdGl2ZVN0dWRpby1JREUvYWluYXRpdmUtc3R1ZGlvL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUcvRCxPQUFPLEVBQVcsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFdEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFcEMsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO0lBaUIvQyxZQUNDLFFBQWlCLEVBQ1EsUUFBa0QsRUFDM0QsYUFBNkI7UUFFN0MsS0FBSyxFQUFFLENBQUM7UUFIa0MsYUFBUSxHQUFSLFFBQVEsQ0FBeUI7UUFmM0QsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7UUFDOUUsZ0NBQTJCLEdBQW1CLElB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